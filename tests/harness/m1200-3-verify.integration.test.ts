/**
 * DWA-M 1200-3 (Merkblatt DWA-M 1200-3 — Wasserwiederverwendung Teil 3;
 * GELBDRUCK / Entwurf, Juli 2025) — REAL save-path execution proof.
 *
 * GELBDRUCK NOTE: this standard is a draft. The harness RUNS (execution is the
 * only honest proof of enforcement), but findings are PROVISIONAL and no prod
 * fix is drafted for a deferred health gate. Conditions are verbatim from prod;
 * nothing is applied to prod.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 8 live BLOCK gates (non-empty condition) by driving it
 * through the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is
 * proven ENFORCING only when shown BOTH ways: a persisted state where it does
 * NOT block, and a persisted state where it DOES (the F-4 lesson).
 *
 * COVERED GATE SHAPES (all live in prod):
 *   - enum string equality:          `wasserquelle_typ == 'kommunal_haeuslich'`
 *   - OR-of-equalities + IN group:   CR-06 speichertyp / gueteklasse
 *   - numeric + boolean AND-group:   CR-17-2 volumenverlust_pct / druckabfall / abschaltung
 *   - arithmetic RHS (division):     CR-18-2 `schwermetall_fracht_pa <= bbodschv_anlage1_tab3 / 3`
 *   - boolean attestation:           CR-10 `attest_… == True` (×2, distinct symbols/worksheets)
 *   - NOT(IN) OR boolean:            CR-14 desinfektion_methode / abstand
 *   - CROSS-WORKSHEET FALLBACK:      CR-06 reads gueteklasse from M12003-01;
 *                                    CR-14 reads both symbols from M12003-05/-07
 *
 * TWO PROVISIONAL DEFECTS demonstrated (Gelbdruck — flagged, NOT fixed):
 *   - CR-06 compares `speichertyp == 'geschlossen'` / `== 'offen'`, but the
 *     field's declared enum has NO such value (only *_ortsfest_kurz/lang +
 *     transportbehaelter). The only reachable pass is `transportbehaelter`; a
 *     legitimately CLOSED storage BLOCKS. Proven in the DEFECT describe below.
 *   - CR-14's IN set {'Chlorung','H2O2','PES'} uses Titlecase literals but the
 *     desinfektion_methode enum values are lowercase (chlorung/h2o2/pes).
 *     `equals()` is case-sensitive → the membership NEVER matches a real value →
 *     NOT(false) OR … is ALWAYS true → the gate NEVER blocks a chlorination
 *     facility that lacks the required surface-water distance. Proven below.
 */
// @vitest-environment node
import './_harness-env-m1200-3'; // top-level-await: PG + seedM12003 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM12003Harness } from './_harness-env-m1200-3';
import { M12003_GATES, gateKey } from './seed-m1200-3';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM12003Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null;

/** Persist a symbol→value map by routing each symbol to ITS home worksheet
 *  (single-home topology), through the REAL saveWorksheet. */
async function saveVals(values: Record<string, Val>): Promise<void> {
  const byWs: Record<string, Record<string, { fieldId: string; type: string; value: Val }>> = {};
  for (const [symbol, value] of Object.entries(values)) {
    const home = fixture.symbolHome[symbol];
    if (!home) throw new Error(`no SYMBOL_HOME for ${symbol}`);
    const meta = fixture.fieldMeta[`${home}:${symbol}`];
    if (!meta) throw new Error(`seed gap: no field for ${home}:${symbol}`);
    (byWs[home] ??= {})[symbol] = { fieldId: meta.fieldId, type: meta.dataType, value };
  }
  for (const [ws, syms] of Object.entries(byWs)) {
    const batch: Record<string, { type: string; value: Val }> = {};
    for (const s of Object.values(syms)) batch[s.fieldId] = { type: s.type, value: s.value };
    const res = await saveWorksheet({
      instanceId: fixture.instances[ws],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values: batch as any,
    });
    expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
  }
}

/** Whether `code` is in the block-gate failing list for worksheet `ws` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a BLOCK gate ENFORCING both ways: persist the passing values → NOT
 *  blocked; persist the violating values → blocked (definite fail). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passVals: Record<string, Val>,
  violateVals: Record<string, Val>,
): Promise<void> {
  await saveVals(passVals);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await saveVals(violateVals);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
}

/**
 * Per-gate pass/violate value maps, keyed by `${code}@${ws}` (code alone
 * collides: CR-06/-2 + the two CR-10 rows). Thresholds chosen strictly inside /
 * outside the verbatim source bands.
 *
 * CR-06/-2 note: the only reachable PASS is speichertyp='transportbehaelter'
 * (the 'geschlossen'/'offen' literals are not in the enum — see DEFECT describe).
 * CR-14 note: PASS/VIOLATE use the Titlecase 'Chlorung' literal so the IN set
 * actually matches, mechanically proving the gate CAN enforce both ways; the
 * separate DEFECT describe proves the real lowercase enum value defeats it.
 */
const DRIVE: Record<string, { pass: Record<string, Val>; violate: Record<string, Val> }> = {
  'CR-01@M12003-01': {
    pass: { wasserquelle_typ: 'kommunal_haeuslich' },
    violate: { wasserquelle_typ: 'industriell_gewerblich' },
  },
  'CR-06@M12003-05': {
    pass: { speichertyp: 'transportbehaelter', gueteklasse: 'D' },
    violate: { speichertyp: 'geschlossen_ortsfest_kurz', gueteklasse: 'A' },
  },
  'CR-06-2@M12003-05': {
    pass: { speichertyp: 'transportbehaelter', gueteklasse: 'D' },
    violate: { speichertyp: 'geschlossen_ortsfest_kurz', gueteklasse: 'A' },
  },
  'CR-17-2@M12003-05': {
    pass: { volumenverlust_pct: 0.5, druckabfall_unbeabsichtigt: false, abschaltung_automatisch: false },
    violate: { volumenverlust_pct: 2, druckabfall_unbeabsichtigt: false, abschaltung_automatisch: false },
  },
  'CR-18-2@M12003-05': {
    pass: { schwermetall_fracht_pa: 10, bbodschv_anlage1_tab3: 90 },   // 10 <= 90/3 = 30
    violate: { schwermetall_fracht_pa: 40, bbodschv_anlage1_tab3: 90 }, // 40 <= 30 → false
  },
  'CR-10@M12003-06': {
    pass: { attest_m12003_06_cr_10: true },
    violate: { attest_m12003_06_cr_10: false },
  },
  'CR-14@M12003-08': {
    pass: { desinfektion_methode: 'Chlorung', abstand_oberflaechengewaesser_eingehalten: true },
    violate: { desinfektion_methode: 'Chlorung', abstand_oberflaechengewaesser_eingehalten: false },
  },
  'CR-10@M12003-19': {
    pass: { attest_m12003_19_cr_10: true },
    violate: { attest_m12003_19_cr_10: false },
  },
};

const BLOCK_GATES = M12003_GATES.filter((g) => g.sev === 'block');

describe('DWA-M 1200-3 — every live BLOCK gate enforces both ways (REAL save path)', () => {
  for (const g of BLOCK_GATES) {
    const key = gateKey(g.ws, g.code);
    it(`${key}  ${g.cond}`, async () => {
      const drive = DRIVE[key];
      expect(drive, `no DRIVE map for ${key}`).toBeTruthy();
      await proveBothWays(g.ws, g.code, drive.pass, drive.violate);
    });
  }
});

describe('DWA-M 1200-3 — cross-worksheet fallback resolves gate symbols off the gate worksheet', () => {
  it('CR-06@M12003-05 resolves gueteklasse from its M12003-01 home via project-wide fallback', async () => {
    // Force the MIDDLE disjunct (`speichertyp == 'offen' AND gueteklasse IN {...}`)
    // — the only path that reads gueteklasse. gueteklasse is NOT a field on
    // M12003-05; it lives on M12003-01 and must resolve via fallback.
    // (Uses the 'offen' literal to isolate the fallback read; that literal is
    // itself unreachable via the real enum — see the DEFECT describe.)
    await saveVals({ speichertyp: 'offen', gueteklasse: 'D' });
    expect(await gateBlocks('M12003-05', 'CR-06'), 'offen + gueteklasse D via fallback → middle disjunct true → not blocked').toBe(false);
    await saveVals({ speichertyp: 'offen', gueteklasse: 'A' });
    expect(await gateBlocks('M12003-05', 'CR-06'), 'offen + gueteklasse A (not in {C,C-1,C-2,D}) → all disjuncts false → blocked').toBe(true);
  });

  it('CR-14@M12003-08 resolves desinfektion_methode (M12003-07) AND abstand (M12003-05) via fallback', async () => {
    // Neither symbol is a field on M12003-08; both resolve project-wide.
    await saveVals({ desinfektion_methode: 'Chlorung', abstand_oberflaechengewaesser_eingehalten: true });
    expect(await gateBlocks('M12003-08', 'CR-14'), 'IN matches (Titlecase) but abstand=true → not blocked').toBe(false);
    await saveVals({ desinfektion_methode: 'Chlorung', abstand_oberflaechengewaesser_eingehalten: false });
    expect(await gateBlocks('M12003-08', 'CR-14'), 'IN matches (Titlecase) + abstand=false → blocked').toBe(true);
  });
});

describe('DWA-M 1200-3 — PROVISIONAL DEFECTS (Gelbdruck: demonstrated, NOT fixed)', () => {
  it('DEFECT CR-06: a legitimately CLOSED storage blocks because the enum has no plain "geschlossen"', async () => {
    // The declared speichertyp enum values are geschlossen_ortsfest_kurz/lang,
    // offen_ortsfest_kurz/lang, transportbehaelter. The gate literal 'geschlossen'
    // matches NONE of them. So a real closed storage is treated as non-compliant.
    await saveVals({ speichertyp: 'geschlossen_ortsfest_kurz', gueteklasse: 'D' });
    expect(
      await gateBlocks('M12003-05', 'CR-06'),
      'closed storage (real enum value) BLOCKS — the "geschlossen" literal is unreachable',
    ).toBe(true);
    // And the ONLY reachable pass is transportbehaelter:
    await saveVals({ speichertyp: 'transportbehaelter', gueteklasse: 'D' });
    expect(await gateBlocks('M12003-05', 'CR-06'), 'transportbehaelter is the only reachable pass').toBe(false);
  });

  it('DEFECT CR-14: a chlorination facility with the REAL lowercase enum value is NEVER blocked (case-mismatch)', async () => {
    // desinfektion_methode enum value is 'chlorung' (lowercase); the gate IN set is
    // {'Chlorung','H2O2','PES'}. equals() is case-sensitive → membership is false →
    // NOT(false) OR (abstand==true) is ALWAYS true even when abstand is false.
    await saveVals({ desinfektion_methode: 'chlorung', abstand_oberflaechengewaesser_eingehalten: false });
    expect(
      await gateBlocks('M12003-08', 'CR-14'),
      'real lowercase "chlorung" defeats the Titlecase IN set → gate never enforces the distance requirement',
    ).toBe(false);
  });
});
