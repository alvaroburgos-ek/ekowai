/**
 * DWA-M-205 (Merkblatt DWA-M 205 — Desinfektion von biologisch gereinigtem
 * Abwasser; Weißdruck, März 2013, Fachliche Aktualitätsprüfung 2019) — REAL
 * save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES each
 * of the standard's 70 live BLOCK gates (non-empty condition) by driving it through
 * the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists
 *                                      the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and
 * a persisted state where it DOES (the F-4 lesson). Conditions verbatim from prod;
 * nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (all live in prod):
 *   - boolean existence:            `flag == True` / `flag == False`
 *   - single/multi numeric limit:   `afs <= 20`, `ph_chlorung >= 6 AND ph_chlorung <= 8`
 *   - scientific-notation limit:    `daly_wert <= 1e-6`
 *   - membership (numeric + enum):  `eignungsklasse_bewaesserung IN {1,2,3,4}`,
 *                                   `ip_schutzart IN {IP54,…}`, `vorsiebung IN {ja,nein}`
 *   - OR alternatives:              `durchfluss_max <= 1000 OR mehrstrassige_anlage == True`,
 *                                   `temperatur_ozonentfernung >= 350 OR katalytisch == True`
 *   - CROSS-WORKSHEET FALLBACK:     the ~21 M205-10 gates whose symbols live on
 *                                   M205-03/05/06/07/08/11/18 (single-home topology)
 *   - DUPLICATE CODES driven BOTH:  CR-06/-2, CR-13/-2, CR-23/-2, the CR-03-2…CR-20-2
 *                                   family, and the ES-1 pair REQ-M205-ES1-11/-11-2
 *   - ES-1 disposition gates:       REQ-M205-ES1-11 (restchlor_betrieb>=0.2, BLOCK) driven
 *                                   both ways; REQ-M205-ES1-04 (ozon_pro_doc<0.8, WARN)
 *                                   proven to NOT block even when violated
 */
// @vitest-environment node
import './_harness-env-m205'; // top-level-await: PG + seedM205 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM205Harness } from './_harness-env-m205';
import { M205_GATES } from './seed-m205';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM205Harness();

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
  // Group by home worksheet so each saveWorksheet call targets one instance.
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

/** Prove a BLOCK gate ENFORCING both ways: persist the passing values → NOT blocked;
 *  persist the violating values → blocked (definite fail). */
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
 * The per-gate pass/violate value maps. Every key is a prod symbol routed to its
 * home worksheet by saveVals. Thresholds chosen strictly inside / outside the
 * verbatim source bands (see the equation table in the wave report).
 */
type Drive = { pass: Record<string, Val>; violate: Record<string, Val> };
const DRIVE: Record<string, Drive> = {
  // M205-01
  'CR-01': { pass: { biologische_vorbehandlung: true }, violate: { biologische_vorbehandlung: false } },
  // M205-02
  'CR-02': { pass: { behoerdliche_freigabe: true }, violate: { behoerdliche_freigabe: false } },
  'CR-18': { pass: { eignungsklasse_bewaesserung: '2' }, violate: { eignungsklasse_bewaesserung: '5' } },
  'CR-19': { pass: { daly_wert: 1e-7 }, violate: { daly_wert: 1e-5 } },
  // M205-03
  'CR-06': { pass: { afs: 10 }, violate: { afs: 25 } },
  'CR-06-2': { pass: { afs: 10 }, violate: { afs: 25 } },
  'CR-28': { pass: { durchfluss_max: 500, mehrstrassige_anlage: false }, violate: { durchfluss_max: 1500, mehrstrassige_anlage: false } },
  // M205-05
  'CR-07': { pass: { uv_dosis: 500 }, violate: { uv_dosis: 800 } },
  'CR-29': { pass: { ip_schutzart: 'IP65' }, violate: { ip_schutzart: 'IP20' } },
  // M205-06
  'CR-34': { pass: { afs: 10, vorsiebung_erforderlich: 'ja' }, violate: { afs: 10, vorsiebung_erforderlich: 'unbekannt' } },
  // M205-07
  'CR-08': { pass: { restozon_abluft: 0.01 }, violate: { restozon_abluft: 0.05 } },
  'CR-09': { pass: { ozon_konz: 5 }, violate: { ozon_konz: 15 } },
  'CR-10': { pass: { ozon_aufenthaltszeit: 8 }, violate: { ozon_aufenthaltszeit: 3 } },
  'CR-21': { pass: { ozon_pro_doc: 0.5 }, violate: { ozon_pro_doc: 1.0 } },
  'CR-31': { pass: { wiederverkeimungsbeurteilung: true }, violate: { wiederverkeimungsbeurteilung: false } },
  'CR-31-2': { pass: { wiederverkeimungsbeurteilung: true }, violate: { wiederverkeimungsbeurteilung: false } },
  'CR-32': { pass: { gefaehrdungsbeurteilung_biostoffv: true, betriebsanweisung_biostoffv: true }, violate: { gefaehrdungsbeurteilung_biostoffv: false, betriebsanweisung_biostoffv: true } },
  'CR-32-2': { pass: { gefaehrdungsbeurteilung_biostoffv: true, betriebsanweisung_biostoffv: true }, violate: { gefaehrdungsbeurteilung_biostoffv: false, betriebsanweisung_biostoffv: true } },
  // M205-08
  'CR-11': { pass: { ph_chlorung: 7 }, violate: { ph_chlorung: 9 } },
  'CR-12': { pass: { restchlor: 0.002 }, violate: { restchlor: 0.01 } },
  'CR-22': { pass: { entchlorungsstufe: true }, violate: { entchlorungsstufe: false } },
  'CR-23': { pass: { restchlor_betrieb: 0.3 }, violate: { restchlor_betrieb: 0.1 } },
  'CR-23-2': { pass: { restchlor_betrieb: 0.3 }, violate: { restchlor_betrieb: 0.1 } },
  'CR-24': { pass: { kontaktzeit_chlor: 20 }, violate: { kontaktzeit_chlor: 40 } },
  'REQ-M205-ES1-11': { pass: { restchlor_betrieb: 0.3 }, violate: { restchlor_betrieb: 0.1 } },
  'REQ-M205-ES1-11-2': { pass: { restchlor_betrieb: 0.3 }, violate: { restchlor_betrieb: 0.1 } },
  // M205-09
  'CR-13': { pass: { monatlicher_nachweis: true }, violate: { monatlicher_nachweis: false } },
  'CR-13-2': { pass: { monatlicher_nachweis: true }, violate: { monatlicher_nachweis: false } },
  'CR-27': { pass: { kalibrierintervall_sensor: 6, reinigungsintervall_sensor: 4 }, violate: { kalibrierintervall_sensor: 8, reinigungsintervall_sensor: 4 } },
  'CR-27-2': { pass: { kalibrierintervall_sensor: 6, reinigungsintervall_sensor: 4 }, violate: { kalibrierintervall_sensor: 8, reinigungsintervall_sensor: 4 } },
  'CR-30': { pass: { chlorung_routine: false }, violate: { chlorung_routine: true } },
  'CR-30-2': { pass: { chlorung_routine: false }, violate: { chlorung_routine: true } },
  // M205-10 (e_coli / entero / log_reduktion local; the rest fallback)
  'CR-03': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 600, enterokokken_ablauf: 50 } },
  'CR-03-2': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 600, enterokokken_ablauf: 50 } },
  'CR-04': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 300, enterokokken_ablauf: 50 } },
  'CR-04-2': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 300, enterokokken_ablauf: 50 } },
  'CR-05': { pass: { e_coli_ablauf: 0, enterokokken_ablauf: 0 }, violate: { e_coli_ablauf: 1, enterokokken_ablauf: 0 } },
  'CR-05-2': { pass: { e_coli_ablauf: 0, enterokokken_ablauf: 0 }, violate: { e_coli_ablauf: 1, enterokokken_ablauf: 0 } },
  'CR-14': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 1100, enterokokken_ablauf: 50 } },
  'CR-14-2': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 1100, enterokokken_ablauf: 50 } },
  'CR-15': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 950, enterokokken_ablauf: 50 } },
  'CR-15-2': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 950, enterokokken_ablauf: 50 } },
  'CR-16': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 600, enterokokken_ablauf: 50 } },
  'CR-16-2': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 600, enterokokken_ablauf: 50 } },
  'CR-17': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 100, enterokokken_ablauf: 190 } },
  'CR-17-2': { pass: { e_coli_ablauf: 100, enterokokken_ablauf: 50 }, violate: { e_coli_ablauf: 100, enterokokken_ablauf: 190 } },
  'CR-20': { pass: { log_reduktion: 4 }, violate: { log_reduktion: 2 } },
  'CR-20-2': { pass: { log_reduktion: 4 }, violate: { log_reduktion: 2 } },
  'CR-26': { pass: { temperatur_ozonentfernung: 400, katalytisch: false }, violate: { temperatur_ozonentfernung: 300, katalytisch: false } },
  // M205-12
  'CR-33': { pass: { hg_strahler_sonderentsorgung: true }, violate: { hg_strahler_sonderentsorgung: false } },
  'CR-33-2': { pass: { hg_strahler_sonderentsorgung: true }, violate: { hg_strahler_sonderentsorgung: false } },
  // M205-14
  'CR-25': { pass: { pilotierung: true }, violate: { pilotierung: false } },
  'CR-25-2': { pass: { pilotierung: true }, violate: { pilotierung: false } },
  // M205-17
  'CR-35': { pass: { reaktor_gasdicht: true }, violate: { reaktor_gasdicht: false } },
  'CR-35-2': { pass: { reaktor_gasdicht: true }, violate: { reaktor_gasdicht: false } },
  // M205-22
  'CR-36': { pass: { bgv_b4_konformitaet: true, sicherheitsdatenblatt_pes: true }, violate: { bgv_b4_konformitaet: false, sicherheitsdatenblatt_pes: true } },
  'CR-36-2': { pass: { bgv_b4_konformitaet: true, sicherheitsdatenblatt_pes: true }, violate: { bgv_b4_konformitaet: false, sicherheitsdatenblatt_pes: true } },
};

// The M205-10 gates whose codes ALSO exist on their origin worksheet need per-worksheet
// DRIVE maps because DRIVE is keyed by code. These share the code with the origin gate
// and use the SAME symbols/thresholds (fallback resolution on M205-10). Keyed by
// `${code}@${ws}` where a code appears on more than one worksheet with the same symbols.
const DRIVE_M10: Record<string, Drive> = {
  'CR-07': { pass: { uv_dosis: 500 }, violate: { uv_dosis: 800 } },
  'CR-08': { pass: { restozon_abluft: 0.01 }, violate: { restozon_abluft: 0.05 } },
  'CR-09': { pass: { ozon_konz: 5 }, violate: { ozon_konz: 15 } },
  'CR-10': { pass: { ozon_aufenthaltszeit: 8 }, violate: { ozon_aufenthaltszeit: 3 } },
  'CR-11': { pass: { ph_chlorung: 7 }, violate: { ph_chlorung: 9 } },
  'CR-12': { pass: { restchlor: 0.002 }, violate: { restchlor: 0.01 } },
  'CR-21': { pass: { ozon_pro_doc: 0.5 }, violate: { ozon_pro_doc: 1.0 } },
  'CR-22': { pass: { entchlorungsstufe: true }, violate: { entchlorungsstufe: false } },
  'CR-24': { pass: { kontaktzeit_chlor: 20 }, violate: { kontaktzeit_chlor: 40 } },
  'CR-28': { pass: { durchfluss_max: 500, mehrstrassige_anlage: false }, violate: { durchfluss_max: 1500, mehrstrassige_anlage: false } },
  'CR-29': { pass: { ip_schutzart: 'IP65' }, violate: { ip_schutzart: 'IP20' } },
  'CR-34': { pass: { afs: 10, vorsiebung_erforderlich: 'ja' }, violate: { afs: 10, vorsiebung_erforderlich: 'unbekannt' } },
};

// Codes that appear on BOTH an origin worksheet AND M205-10 with identical symbols.
const SHARED_WITH_M10 = new Set(Object.keys(DRIVE_M10));

const BLOCK_GATES = M205_GATES.filter((g) => g.sev === 'block');
const WARN_GATES = M205_GATES.filter((g) => g.sev === 'warn');

describe('DWA-M-205 — every live BLOCK gate enforces both ways (REAL save path)', () => {
  for (const g of BLOCK_GATES) {
    it(`${g.code}@${g.ws}  ${g.cond}`, async () => {
      // For a code hosted on both an origin ws and M205-10, use the M205-10 map when
      // driving the M205-10 instance (fallback resolution); otherwise the code map.
      const drive = g.ws === 'M205-10' && SHARED_WITH_M10.has(g.code)
        ? DRIVE_M10[g.code]
        : DRIVE[g.code];
      expect(drive, `no DRIVE map for ${g.code}@${g.ws}`).toBeTruthy();
      await proveBothWays(g.ws, g.code, drive.pass, drive.violate);
    });
  }
});

describe('DWA-M-205 — ES-1 WARN gates fire but do NOT block (severity=warn)', () => {
  for (const g of WARN_GATES) {
    it(`${g.code}@${g.ws}  ${g.cond}  never appears in failingBlockConditions`, async () => {
      // Persist a state that VIOLATES the underlying condition (ozon_pro_doc >= 0.8);
      // a warn gate must NOT block approval (checkApprovalGate reads severity='block' only).
      await saveVals({ ozon_pro_doc: 1.0 });
      expect(await gateBlocks(g.ws, g.code), `${g.code} is warn → must never block`).toBe(false);
      // And the companion BLOCK gate on the SAME condition (CR-21) DOES block the same state,
      // proving the warn/block split is real and not a dead gate.
      expect(await gateBlocks('M205-07', 'CR-21'), 'CR-21 block twin enforces the same condition').toBe(true);
    });
  }
});

describe('DWA-M-205 — named ES-1 restchlor block gate (owner lead)', () => {
  it('REQ-M205-ES1-11 restchlor_betrieb >= 0.2 blocks an under-dosed effluent, passes ≥0.2', async () => {
    await proveBothWays('M205-08', 'REQ-M205-ES1-11', { restchlor_betrieb: 0.3 }, { restchlor_betrieb: 0.1 });
  });
  it('REQ-M205-ES1-11-2 (duplicate code) enforces identically', async () => {
    await proveBothWays('M205-08', 'REQ-M205-ES1-11-2', { restchlor_betrieb: 0.3 }, { restchlor_betrieb: 0.1 });
  });
  it('the ES-1 displayOnly bands do NOT collision-blank: restchlor_betrieb persists exactly as saved', async () => {
    await saveVals({ restchlor_betrieb: 0.25 });
    const [row] = await harness.sql<{ value_number: string | null }[]>`
      SELECT pp.value_number FROM project_parameters pp
      JOIN fields f ON f.id = pp.field_id
      WHERE pp.project_id = ${fixture.projectId} AND f.symbol = 'restchlor_betrieb'`;
    expect(Number(row.value_number)).toBe(0.25);
  });
});

describe('DWA-M-205 — cross-worksheet fallback resolves M205-10 gates', () => {
  it('CR-09@M205-10 reads ozon_konz from its M205-07 home via project-wide fallback', async () => {
    // Seed the value ONLY on M205-07 (its single home) and drive the gate on M205-10.
    await saveVals({ ozon_konz: 5 });
    expect(await gateBlocks('M205-10', 'CR-09'), 'in-band via fallback → not blocked').toBe(false);
    await saveVals({ ozon_konz: 15 });
    expect(await gateBlocks('M205-10', 'CR-09'), 'out-of-band via fallback → blocked').toBe(true);
  });
});
