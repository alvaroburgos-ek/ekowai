/**
 * DVS 2225-4 ("Schweißen von Dichtungsbahnen aus Polyethylen (PE)") — REAL save-path
 * execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-dvs2225-4.ts header).
 * The 3 seam-thickness equations (Δd_N1, Δd_N2, f_NA) were verified symbol-by-symbol against
 * the printed §6.2.11 / Anhang Blatt 3+4 formulas — all FAITHFUL. This harness is the
 * EXECUTION half: it PROVES the standard's 18 live BLOCK gates (severity='block' + non-empty
 * condition) by driving each through the REAL enforcement chain against a disposable embedded
 * Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists the
 *                                      ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and a
 * persisted state where it DOES (the F-4 lesson). Nothing is applied to prod here.
 *
 * PRESERVE LIST: DVS-2225-4's enforcing gate layer is do-not-rewrite. This test drives the
 * live conditions VERBATIM; it changes nothing. The two existence-only gates (CR-11, CR-18)
 * are driven exactly as encoded and their semantic under-enforcement is documented (not
 * patched) in the seed header + the wave report.
 *
 * COVERED GATE SHAPES (18 gates, all severity='block'):
 *   - boolean equality `== true` (CR-01, CR-05, CR-06, CR-09, CR-13, CR-16, CR-17)
 *   - numeric range AND-chain (CR-02, CR-03, CR-04, CR-07, CR-08, CR-10, CR-12)
 *   - numeric equality `== 5` / `== 10` (CR-15)
 *   - membership IN {lowercase enum} (CR-14)                : `versagensverhalten IN {gut, ausreichend}`
 *   - existence `IS NOT NULL` AND-chain (CR-11, CR-18)      : reaches definite fail when absent
 *
 * SINGLE-HOME topology: every gate's operands are fields on the gate's OWN worksheet — no
 * cross-worksheet fallback is exercised (verified against prod).
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4 known
 * engine traps present — see the seed-dvs2225-4.ts header for the itemised result. All 18
 * gates reach a definite `fail` in their violating state; there are NO literal-TRUE no-op
 * block gates in DVS-2225-4.
 */
// @vitest-environment node
import './_harness-env-dvs2225-4'; // top-level-await: PG + seedDVS2225_4 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDVS2225_4Harness } from './_harness-env-dvs2225-4';
import { DVS2225_4_GATES } from './seed-dvs2225-4';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getDVS2225_4Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null | Record<string, unknown> | unknown[];

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through the
 *  REAL saveWorksheet. A null value clears the field. */
async function saveSymbols(ws: string, values: Record<string, Val>): Promise<void> {
  const batch: Record<string, { type: string; value: Val }> = {};
  for (const [symbol, value] of Object.entries(values)) {
    const meta = fixture.fieldMeta[`${ws}:${symbol}`];
    if (!meta) throw new Error(`seed gap: no field for ${ws}:${symbol}`);
    batch[meta.fieldId] = { type: meta.dataType, value };
  }
  const res = await saveWorksheet({
    instanceId: fixture.instances[ws],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: batch as any,
  });
  expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
}

type Save = { ws: string; values: Record<string, Val> };
async function applySaves(saves: Save[]): Promise<void> {
  for (const s of saves) await saveSymbols(s.ws, s.values);
}

/** Whether `code` is in the block-gate failing list for worksheet `gateWs` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(gateWs: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[gateWs]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked; persist the
 *  violating saves → blocked (definite fail). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
}

describe('DVS-2225-4 — seed sanity (topology matches the 18 prod block gates)', () => {
  it('seeds all 5 worksheet instances and 18 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'DVS-2225-4-01', 'DVS-2225-4-02', 'DVS-2225-4-03', 'DVS-2225-4-04', 'DVS-2225-4-05',
    ]);
    expect(DVS2225_4_GATES.length).toBe(18);
    expect(DVS2225_4_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DVS-2225-4-01 — Dichtungsbahnen, Verlegung und Nahtkonstruktion', () => {
  it('CR-01  dichtungsbahn_zugelassen == true AND abnahmepruefzeugnis_vorhanden == true', async () => {
    await proveBothWays('DVS-2225-4-01', 'DVS-2225-4-CR-01',
      [{ ws: 'DVS-2225-4-01', values: { dichtungsbahn_zugelassen: true, abnahmepruefzeugnis_vorhanden: true } }],
      // violate: keep zulassung, flip the Abnahmeprüfzeugnis flag → AND collapses to fail
      [{ ws: 'DVS-2225-4-01', values: { abnahmepruefzeugnis_vorhanden: false } }]);
  });
  it('CR-02  d_o >= 2.5 AND d_u >= 2.5 (Mindestdicke §2)', async () => {
    await proveBothWays('DVS-2225-4-01', 'DVS-2225-4-CR-02',
      [{ ws: 'DVS-2225-4-01', values: { d_o: 2.5, d_u: 3.0 } }],
      [{ ws: 'DVS-2225-4-01', values: { d_o: 2.0 } }]); // below 2.5 mm → fail
  });
  it('CR-03  ÜN-Nahtgeometrie AND-chain incl. 5 <= ue_1 < 15 (§3.1/Bild 1)', async () => {
    await proveBothWays('DVS-2225-4-01', 'DVS-2225-4-CR-03',
      [{ ws: 'DVS-2225-4-01', values: { b_N1: 15, b_N2: 16, b_P: 10, ue_1: 8, ue_2: 40 } }],
      // violate the two-sided ue_1 window from above (ue_1 = 15 fails `ue_1 < 15`)
      [{ ws: 'DVS-2225-4-01', values: { ue_1: 15 } }]);
  });
  it('CR-04  b_N >= 30 AND a_versatz <= 5 (Auftragnaht §3.1)', async () => {
    await proveBothWays('DVS-2225-4-01', 'DVS-2225-4-CR-04',
      [{ ws: 'DVS-2225-4-01', values: { b_N: 30, a_versatz: 5 } }],
      [{ ws: 'DVS-2225-4-01', values: { a_versatz: 6 } }]); // Versatz > 5 mm → fail
  });
});

describe('DVS-2225-4-02 — Schweißverfahren und Schweißparameter', () => {
  it('CR-05  schweisser_qualifiziert == true (§4.3.1, DVS 2212-3)', async () => {
    await proveBothWays('DVS-2225-4-02', 'DVS-2225-4-CR-05',
      [{ ws: 'DVS-2225-4-02', values: { schweisser_qualifiziert: true } }],
      [{ ws: 'DVS-2225-4-02', values: { schweisser_qualifiziert: false } }]);
  });
  it('CR-06  kein_niederschlag == true AND umgebungstemperatur >= 5 (§4.3.1)', async () => {
    await proveBothWays('DVS-2225-4-02', 'DVS-2225-4-CR-06',
      [{ ws: 'DVS-2225-4-02', values: { kein_niederschlag: true, umgebungstemperatur: 12 } }],
      [{ ws: 'DVS-2225-4-02', values: { umgebungstemperatur: 3 } }]); // below +5 °C → fail
  });
  it('CR-07  Heizkeil-Parameter im Bereich (§4.3.2, Tab.1)', async () => {
    await proveBothWays('DVS-2225-4-02', 'DVS-2225-4-CR-07',
      [{ ws: 'DVS-2225-4-02', values: { heizkeiltemperatur: 380, spez_fuegekraft: 35, schweissgeschw_hk: 1.5 } }],
      [{ ws: 'DVS-2225-4-02', values: { heizkeiltemperatur: 450 } }]); // above 420 °C → fail
  });
  it('CR-08  Warmgas/Extrudat-Parameter im Bereich (§4.3.3)', async () => {
    await proveBothWays('DVS-2225-4-02', 'DVS-2225-4-CR-08',
      [{ ws: 'DVS-2225-4-02', values: { warmgastemperatur: 260, extrudattemperatur: 210, schweissgeschw_wg: 0.6 } }],
      [{ ws: 'DVS-2225-4-02', values: { extrudattemperatur: 260 } }]); // above 240 °C → fail
  });
});

describe('DVS-2225-4-03 — Schweißmaschinen und Schweißgeräte', () => {
  it('CR-09  parametererfassung_abstand <= 50 AND ce_konformitaet == true (§5.2/§5.1)', async () => {
    await proveBothWays('DVS-2225-4-03', 'DVS-2225-4-CR-09',
      [{ ws: 'DVS-2225-4-03', values: { parametererfassung_abstand: 50, ce_konformitaet: true } }],
      [{ ws: 'DVS-2225-4-03', values: { parametererfassung_abstand: 60 } }]); // interval > 50 cm → fail
  });
});

describe('DVS-2225-4-04 — Baustellenprüfungen der Nähte', () => {
  it('CR-10  Fügeweg 0,40 <= Δd_N1/2 <= 0,80 (§6.2.12)', async () => {
    await proveBothWays('DVS-2225-4-04', 'DVS-2225-4-CR-10',
      [{ ws: 'DVS-2225-4-04', values: { delta_d_N1: 0.60, delta_d_N2: 0.55 } }],
      [{ ws: 'DVS-2225-4-04', values: { delta_d_N1: 0.90 } }]); // above 0,80 mm → fail
  });
  it('CR-11  delta_d_N1 IS NOT NULL AND delta_d_N2 IS NOT NULL (presence — see under-enforcement note)', async () => {
    await proveBothWays('DVS-2225-4-04', 'DVS-2225-4-CR-11',
      [{ ws: 'DVS-2225-4-04', values: { delta_d_N1: 0.6, delta_d_N2: 0.6 } }],
      [{ ws: 'DVS-2225-4-04', values: { delta_d_N1: null } }]); // clear → IS NOT NULL fails
  });
  it('CR-12  Nahtdickenfaktor 1,25 <= f_NA <= 1,75 (§6.2.12, Auftragnaht)', async () => {
    await proveBothWays('DVS-2225-4-04', 'DVS-2225-4-CR-12',
      [{ ws: 'DVS-2225-4-04', values: { f_NA: 1.5 } }],
      [{ ws: 'DVS-2225-4-04', values: { f_NA: 1.8 } }]); // above 1,75 → fail
  });
  it('CR-13  aeussere_beschaffenheit_iO == true (§6.2.5)', async () => {
    await proveBothWays('DVS-2225-4-04', 'DVS-2225-4-CR-13',
      [{ ws: 'DVS-2225-4-04', values: { aeussere_beschaffenheit_iO: true } }],
      [{ ws: 'DVS-2225-4-04', values: { aeussere_beschaffenheit_iO: false } }]);
  });
  it('CR-14  versagensverhalten IN {gut, ausreichend} (§6.3.5, lowercase enum)', async () => {
    await proveBothWays('DVS-2225-4-04', 'DVS-2225-4-CR-14',
      [{ ws: 'DVS-2225-4-04', values: { versagensverhalten: 'gut' } }],
      [{ ws: 'DVS-2225-4-04', values: { versagensverhalten: 'nicht_ausreichend' } }]); // outside set → fail
  });
  it('CR-15  Druckluft: pruefdruck == 5 AND pruefzeit == 10 AND druckabfall <= 0,5 (§6.4.2)', async () => {
    await proveBothWays('DVS-2225-4-04', 'DVS-2225-4-CR-15',
      [{ ws: 'DVS-2225-4-04', values: { druckluft_pruefdruck: 5, druckluft_pruefzeit: 10, druckluft_druckabfall: 0.3 } }],
      [{ ws: 'DVS-2225-4-04', values: { druckluft_druckabfall: 0.7 } }]); // drop > 0,5 bar → fail
  });
  it('CR-16  dichtigkeit_iO == true (§6.4)', async () => {
    await proveBothWays('DVS-2225-4-04', 'DVS-2225-4-CR-16',
      [{ ws: 'DVS-2225-4-04', values: { dichtigkeit_iO: true } }],
      [{ ws: 'DVS-2225-4-04', values: { dichtigkeit_iO: false } }]);
  });
});

describe('DVS-2225-4-05 — Prüfprotokolle und Nachbesserungen', () => {
  it('CR-17  Protokolle vollständig + gegengezeichnet (§6.5)', async () => {
    await proveBothWays('DVS-2225-4-05', 'DVS-2225-4-CR-17',
      [{ ws: 'DVS-2225-4-05', values: { schweissprotokoll_vollstaendig: true, pruefprotokoll_vollstaendig: true, fremdpruefung_gegengezeichnet: true } }],
      [{ ws: 'DVS-2225-4-05', values: { fremdpruefung_gegengezeichnet: false } }]);
  });
  it('CR-18  Nachbesserungs-Maße vorhanden (§7 — presence; see under-enforcement note)', async () => {
    await proveBothWays('DVS-2225-4-05', 'DVS-2225-4-CR-18',
      [{ ws: 'DVS-2225-4-05', values: { nachbesserung_zuschnitt_ueberstand: 10, nachbesserung_streifenbreite: 0.6 } }],
      [{ ws: 'DVS-2225-4-05', values: { nachbesserung_streifenbreite: null } }]); // clear → IS NOT NULL fails
  });
});
