/**
 * DWA-M 229-1 ("Systeme zur Belüftung und Durchmischung von Belebungsanlagen -
 * Teil 1: Planung, Ausschreibung und Ausführung"; Merkblatt DWA-M 229-1,
 * September 2017, korrigierte Fassung Februar 2021) — REAL save-path execution proof.
 *
 * SOURCE-ABSENT NOTICE: the DWA-M-229-1 source PDF is NOT in the library. This harness
 * proves ENFORCEMENT (gates block both-ways through the real save path); it does NOT
 * verify any threshold against a source, because there is none. Conditions are verbatim
 * from prod; no numeric value is asserted to be "correct".
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the
 * standard's 29 live BLOCK gates (severity='block' + non-empty condition) by driving
 * each through the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists
 *                                      the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and
 * a persisted state where it DOES (the F-4 lesson). Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (29 gates, all severity='block'):
 *   - enum equality (CR-018)                             : `beckenform == 'kreisringbecken'`
 *   - existence IS NOT NULL, 1..4 conjuncts (many)       : `x IS NOT NULL [AND y …]`
 *   - numeric ordering compare (CR-002/012/015/016)      : `x <= / >= literal`
 *   - numeric range AND (CR-001/005/022)                 : `x >= a AND x <= b`
 *   - numeric equality AND (CR-020)                      : `x == 1.5 AND y == 2.5`
 *   - boolean equality (CR-017/027)                      : `flag == true`
 *   - disjunctive w/ boolean (CR-023)                    : `x <= n OR flag == true`
 *   - nested parenthesised AND-of-ORs (CR-013)           : `(a AND b AND c) OR d`
 *
 * CROSS-WORKSHEET FALLBACK proven (single-home topology, conflict-free project-wide
 * fallback): CR-007@03 reads belueftungsart (home 01); CR-021@09 reads OV_h_aM
 * (home 02); CR-024@10 reads schub_Ruehr (home 07); CR-025@10 reads jahreskosten
 * (home 09). Each is driven both ways with the operand entered on ITS home worksheet.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4
 * known engine traps are present, and NO TRUE-condition no-op gate exists — see the
 * header of seed-m229-1.ts for the itemised result. All 29 gates reach a definite
 * `fail` in their violating state.
 *
 * CR-018 R-2 LEAD (re-verified LIVE this session): live condition is
 * `beckenform == 'kreisringbecken'`; the claimed prior fix (…OR daempfungsplanken==true)
 * is ABSENT from prod and `daempfungsplanken` is not an encoded field. The gate enforces
 * mechanically both ways but its logic is inverted vs its title — a JUDGMENT item on the
 * sign-off sheet, not applied (source PDF absent).
 */
// @vitest-environment node
import './_harness-env-m229-1'; // top-level-await: PG + seedM2291 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM2291Harness } from './_harness-env-m229-1';
import { M2291_GATES } from './seed-m229-1';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM2291Harness();

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

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through
 *  the REAL saveWorksheet. A null value clears the field. */
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

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked;
 *  persist the violating saves → blocked (definite fail). */
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

describe('DWA-M-229-1 — seed sanity (topology matches the 29 prod block gates)', () => {
  it('seeds all 10 worksheet instances and 29 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'M2291-01', 'M2291-02', 'M2291-03', 'M2291-04', 'M2291-05',
      'M2291-06', 'M2291-07', 'M2291-08', 'M2291-09', 'M2291-10',
    ]);
    expect(M2291_GATES.length).toBe(29);
    expect(M2291_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DWA-M-229-1 — M2291-01 Anwendungsbereich und Systemwahl (§6.2.3.2)', () => {
  it('CR-018  beckenform == kreisringbecken (enum equality; R-2 inverted-logic lead)', async () => {
    // Mechanically enforces both ways. NOTE (sign-off): the passing state is the
    // BASIN TYPE the requirement is titled about ("Dämpfungsplanken in Kreisringbecken"),
    // so the gate blocks every OTHER basin and never checks a damping-plank field —
    // an inverted-logic judgment item, not applied (source absent).
    await proveBothWays('M2291-01', 'CR-018',
      [{ ws: 'M2291-01', values: { beckenform: 'kreisringbecken' } }],
      [{ ws: 'M2291-01', values: { beckenform: 'rechteckbecken' } }]);
  });
});

describe('DWA-M-229-1 — M2291-02 Bemessungsgrundlagen und Sauerstoffbedarf (§4.3.1)', () => {
  it('CR-003  OV_h_aM/OV_h_max/OV_h_min/OV_h_max_Prog IS NOT NULL (4-conjunct existence)', async () => {
    await proveBothWays('M2291-02', 'CR-003',
      [{ ws: 'M2291-02', values: { OV_h_aM: 100, OV_h_max: 150, OV_h_min: 60, OV_h_max_Prog: 170 } }],
      [{ ws: 'M2291-02', values: { OV_h_max_Prog: null } }]); // 4th conjunct fails
  });
});

describe('DWA-M-229-1 — M2291-03 Einflussparameter und Kennwerte (§4.2-§4.3)', () => {
  it('CR-002  h_BB <= 20 (Geltungsbereich Wassertiefe)', async () => {
    await proveBothWays('M2291-03', 'CR-002',
      [{ ws: 'M2291-03', values: { h_BB: 6 } }],
      [{ ws: 'M2291-03', values: { h_BB: 25 } }]);
  });
  it('CR-004  alpha/alpha_min/alpha_mittel/alpha_max IS NOT NULL (4-conjunct existence)', async () => {
    await proveBothWays('M2291-03', 'CR-004',
      [{ ws: 'M2291-03', values: { alpha: 0.6, alpha_min: 0.5, alpha_mittel: 0.6, alpha_max: 0.7 } }],
      [{ ws: 'M2291-03', values: { alpha_min: null } }]);
  });
  it('CR-005  C_x >= 1 AND C_x <= 2 (range)', async () => {
    await proveBothWays('M2291-03', 'CR-005',
      [{ ws: 'M2291-03', values: { C_x: 1.5 } }],
      [{ ws: 'M2291-03', values: { C_x: 3 } }]); // above upper bound → AND false
  });
  it('CR-006  S_TDS_alpha/f_S_alpha/beta_alpha IS NOT NULL (3-conjunct existence)', async () => {
    await proveBothWays('M2291-03', 'CR-006',
      [{ ws: 'M2291-03', values: { S_TDS_alpha: 1, f_S_alpha: 0.9, beta_alpha: 0.95 } }],
      [{ ws: 'M2291-03', values: { beta_alpha: null } }]);
  });
  it('CR-007  belueftungsart IS NOT NULL AND f_S_alpha IS NOT NULL (cross-worksheet: belueftungsart home M2291-01)', async () => {
    await proveBothWays('M2291-03', 'CR-007',
      [{ ws: 'M2291-01', values: { belueftungsart: 'druckbelueftung' } }, { ws: 'M2291-03', values: { f_S_alpha: 0.9 } }],
      [{ ws: 'M2291-01', values: { belueftungsart: null } }]); // first conjunct fails, resolved via fallback
  });
  it('CR-011  h_D IS NOT NULL (existence)', async () => {
    await proveBothWays('M2291-03', 'CR-011',
      [{ ws: 'M2291-03', values: { h_D: 5 } }],
      [{ ws: 'M2291-03', values: { h_D: null } }]);
  });
  it('CR-012  ET <= 0.5 (Eintauchtiefe)', async () => {
    await proveBothWays('M2291-03', 'CR-012',
      [{ ws: 'M2291-03', values: { ET: 0.3 } }],
      [{ ws: 'M2291-03', values: { ET: 0.8 } }]);
  });
});

describe('DWA-M-229-1 — M2291-05 Drucklufterzeuger, Rohrleitungen und Armaturen (§4.1.2.5 / §4.3.2)', () => {
  it('CR-008  h_geo IS NOT NULL AND p_atm IS NOT NULL (2-conjunct existence)', async () => {
    await proveBothWays('M2291-05', 'CR-008',
      [{ ws: 'M2291-05', values: { h_geo: 650, p_atm: 950 } }],
      [{ ws: 'M2291-05', values: { p_atm: null } }]);
  });
  it('CR-009  delta_p IS NOT NULL (existence)', async () => {
    await proveBothWays('M2291-05', 'CR-009',
      [{ ws: 'M2291-05', values: { delta_p: 200 } }],
      [{ ws: 'M2291-05', values: { delta_p: null } }]);
  });
  it('CR-010  delta_p IS NOT NULL (existence — same operand as CR-009, distinct code)', async () => {
    await proveBothWays('M2291-05', 'CR-010',
      [{ ws: 'M2291-05', values: { delta_p: 200 } }],
      [{ ws: 'M2291-05', values: { delta_p: null } }]);
  });
});

describe('DWA-M-229-1 — M2291-07 Durchmischung / Rührwerke (§5.3-§5.4, §9.1.3.3)', () => {
  it('CR-001  TS_BB >= 2 AND TS_BB <= 5 (Geltungsbereich Feststoffgehalt, range)', async () => {
    await proveBothWays('M2291-07', 'CR-001',
      [{ ws: 'M2291-07', values: { TS_BB: 3.5 } }],
      [{ ws: 'M2291-07', values: { TS_BB: 6 } }]);
  });
  it('CR-013  (ISV>130 AND TS_BB>4 AND v_bodennah>=0.1) OR v_bodennah>=0.25 (nested parenthesised)', async () => {
    await proveBothWays('M2291-07', 'CR-013',
      // pass via the second disjunct (v_bodennah >= 0.25); left disjunct kept definite (not missing)
      [{ ws: 'M2291-07', values: { ISV: 100, TS_BB: 3, v_bodennah: 0.3 } }],
      // violate: both disjuncts definitely false (ISV not >130 → left false; v_bodennah 0.2 < 0.25 → right false)
      [{ ws: 'M2291-07', values: { ISV: 100, TS_BB: 3, v_bodennah: 0.2 } }]);
  });
  it('CR-014  D_Ruehr IS NOT NULL AND abstand_ruehr_beluefter IS NOT NULL (2-conjunct existence)', async () => {
    await proveBothWays('M2291-07', 'CR-014',
      [{ ws: 'M2291-07', values: { D_Ruehr: 2.5, abstand_ruehr_beluefter: 1.2 } }],
      [{ ws: 'M2291-07', values: { abstand_ruehr_beluefter: null } }]);
  });
  it('CR-028  schub_Ruehr IS NOT NULL AND ISV IS NOT NULL (2-conjunct existence)', async () => {
    await proveBothWays('M2291-07', 'CR-028',
      [{ ws: 'M2291-07', values: { schub_Ruehr: 250, ISV: 120 } }],
      [{ ws: 'M2291-07', values: { schub_Ruehr: null } }]);
  });
});

describe('DWA-M-229-1 — M2291-08 Konstruktive Anordnung (§6.2.1 / §6.2.3.2)', () => {
  it('CR-015  abstand_beluefter_achse <= 500', async () => {
    await proveBothWays('M2291-08', 'CR-015',
      [{ ws: 'M2291-08', values: { abstand_beluefter_achse: 300 } }],
      [{ ws: 'M2291-08', values: { abstand_beluefter_achse: 600 } }]);
  });
  it('CR-016  abstand_walzenbeluefter >= 20', async () => {
    await proveBothWays('M2291-08', 'CR-016',
      [{ ws: 'M2291-08', values: { abstand_walzenbeluefter: 30 } }],
      [{ ws: 'M2291-08', values: { abstand_walzenbeluefter: 10 } }]);
  });
  it('CR-017  leitschild_vorhanden == true (boolean equality)', async () => {
    await proveBothWays('M2291-08', 'CR-017',
      [{ ws: 'M2291-08', values: { leitschild_vorhanden: true } }],
      [{ ws: 'M2291-08', values: { leitschild_vorhanden: false } }]);
  });
});

describe('DWA-M-229-1 — M2291-09 Wirtschaftlichkeit (§8.2-§8.4)', () => {
  it('CR-019  nutzungsdauer IS NOT NULL (existence)', async () => {
    await proveBothWays('M2291-09', 'CR-019',
      [{ ws: 'M2291-09', values: { nutzungsdauer: 20 } }],
      [{ ws: 'M2291-09', values: { nutzungsdauer: null } }]);
  });
  it('CR-020  wartungssatz_mt == 1.5 AND wartungssatz_emsr == 2.5 (numeric equality AND)', async () => {
    await proveBothWays('M2291-09', 'CR-020',
      [{ ws: 'M2291-09', values: { wartungssatz_mt: 1.5, wartungssatz_emsr: 2.5 } }],
      [{ ws: 'M2291-09', values: { wartungssatz_mt: 2.0 } }]); // first conjunct fails
  });
  it('CR-021  energiekosten IS NOT NULL AND OV_h_aM IS NOT NULL (cross-worksheet: OV_h_aM home M2291-02)', async () => {
    await proveBothWays('M2291-09', 'CR-021',
      [{ ws: 'M2291-09', values: { energiekosten: 50000 } }, { ws: 'M2291-02', values: { OV_h_aM: 100 } }],
      [{ ws: 'M2291-02', values: { OV_h_aM: null } }]); // second conjunct fails, resolved via fallback
  });
  it('CR-022  realzinssatz >= 2 AND realzinssatz <= 6 (range)', async () => {
    await proveBothWays('M2291-09', 'CR-022',
      [{ ws: 'M2291-09', values: { realzinssatz: 3 } }],
      [{ ws: 'M2291-09', values: { realzinssatz: 8 } }]);
  });
});

describe('DWA-M-229-1 — M2291-10 Ausschreibung, Vergabe, Abnahme (§9.1-§9.3, §4.4)', () => {
  it('CR-023  ausbaugroesse_EW <= 100000 OR garantie_sauerstoffzufuhr == true (disjunctive w/ boolean)', async () => {
    await proveBothWays('M2291-10', 'CR-023',
      [{ ws: 'M2291-10', values: { ausbaugroesse_EW: 50000, garantie_sauerstoffzufuhr: false } }],
      [{ ws: 'M2291-10', values: { ausbaugroesse_EW: 200000, garantie_sauerstoffzufuhr: false } }]); // both disjuncts false
  });
  it('CR-024  garantie_sauerstoffzufuhr IS NOT NULL AND schub_Ruehr IS NOT NULL (cross-worksheet: schub_Ruehr home M2291-07)', async () => {
    await proveBothWays('M2291-10', 'CR-024',
      [{ ws: 'M2291-10', values: { garantie_sauerstoffzufuhr: true } }, { ws: 'M2291-07', values: { schub_Ruehr: 250 } }],
      [{ ws: 'M2291-07', values: { schub_Ruehr: null } }]); // second conjunct fails, resolved via fallback
  });
  it('CR-025  ausschreibungsart IS NOT NULL AND jahreskosten IS NOT NULL (cross-worksheet: jahreskosten home M2291-09)', async () => {
    await proveBothWays('M2291-10', 'CR-025',
      [{ ws: 'M2291-10', values: { ausschreibungsart: 'einzelpositionen' } }, { ws: 'M2291-09', values: { jahreskosten: 120000 } }],
      [{ ws: 'M2291-09', values: { jahreskosten: null } }]); // second conjunct fails, resolved via fallback
  });
  it('CR-026  abnahme_messmedium IS NOT NULL AND doppelmessung IS NOT NULL (2-conjunct existence)', async () => {
    await proveBothWays('M2291-10', 'CR-026',
      [{ ws: 'M2291-10', values: { abnahme_messmedium: 'reinwasser', doppelmessung: true } }],
      [{ ws: 'M2291-10', values: { abnahme_messmedium: null } }]);
  });
  it('CR-027  doppelmessung == true (boolean equality)', async () => {
    await proveBothWays('M2291-10', 'CR-027',
      [{ ws: 'M2291-10', values: { doppelmessung: true } }],
      [{ ws: 'M2291-10', values: { doppelmessung: false } }]);
  });
  it('CR-029  energiezaehler_belueftung IS NOT NULL AND druckueberwachung IS NOT NULL (2-conjunct existence)', async () => {
    await proveBothWays('M2291-10', 'CR-029',
      [{ ws: 'M2291-10', values: { energiezaehler_belueftung: true, druckueberwachung: true } }],
      [{ ws: 'M2291-10', values: { druckueberwachung: null } }]);
  });
});
