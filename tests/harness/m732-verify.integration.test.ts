/**
 * DWA-M-732 (Abwasser aus Brauereien, Weißdruck Sept 2010 / korr. Fassung Aug
 * 2022) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 14 live BLOCK gates (non-empty condition) by driving it
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
 * NOT block, and a persisted state where it DOES (the F-4 lesson). Conditions
 * verbatim from prod; nothing is fixed here.
 *
 * COVERED GATE SHAPES:
 *   - existence + enum!=  + CROSS-WORKSHEET number   CR-M732-01 (M732-03; ausstoss_jahr on M732-01)
 *   - boolean == True (attestation)                  CR-M732-06/09/10/11/12/14
 *   - numeric range (literal-LHS + ident-RHS)        CR-M732-02 (pH 6,5..10,0)
 *   - numeric ordering                               CR-M732-03 (T<35), CR-M732-07 (elim>=50)
 *   - arithmetic operands + nested AND/OR            CR-M732-04 (Nährsalz Tab.13)
 *   - multi-term AND (Direkteinleiter Tab.14)        CR-M732-05
 *   - two-sided design range                         CR-M732-08 (B_TS 0,05..0,08)
 *   - guarded string/number OR + arithmetic RHS      CR-M732-15 (TA-Lärm 400/250/150, Nacht -15)
 */
// @vitest-environment node
import './_harness-env-m732'; // top-level-await: PG + seedM732 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM732Harness } from './_harness-env-m732';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM732Harness();

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

/** Persist a symbol→value map to worksheet `ws` through the REAL saveWorksheet,
 *  resolving each symbol against ITS home worksheet (`ws:symbol` key). A null
 *  value clears the field — used to VIOLATE existence gates. */
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

/** Whether `code` is in the block-gate failing list for worksheet `ws` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked;
 *  persist the violating saves → blocked (definite fail). Saves may span
 *  multiple worksheets (cross-worksheet fallback gates). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code} SHOULD block in violating state`).toBe(true);
}

describe('DWA-M-732 — M732-03 Betriebsklassifikation (applicability + attestation)', () => {
  it('CR-M732-01  betriebsklasse IS NOT NULL AND <> gasthausbrauerei AND ausstoss_jahr >= 50000 (cross-ws)', async () => {
    // ausstoss_jahr lives on M732-01 → resolved via the project-wide fallback.
    await proveBothWays('M732-03', 'CR-M732-01',
      [
        { ws: 'M732-03', values: { betriebsklasse: 'mittelstaendische_brauerei' } },
        { ws: 'M732-01', values: { ausstoss_jahr: 100000 } },
      ],
      // drop annual output below 50 000 hl → applicability fails → gate blocks
      [{ ws: 'M732-01', values: { ausstoss_jahr: 30000 } }]);
  });
  it('CR-M732-01  ALSO blocks when betriebsklasse == gasthausbrauerei (enum != violated)', async () => {
    await saveSymbols('M732-01', { ausstoss_jahr: 100000 });
    await saveSymbols('M732-03', { betriebsklasse: 'grossbrauerei' });
    expect(await gateBlocks('M732-03', 'CR-M732-01')).toBe(false);
    await saveSymbols('M732-03', { betriebsklasse: 'gasthausbrauerei' });
    expect(await gateBlocks('M732-03', 'CR-M732-01')).toBe(true);
  });
  it('CR-M732-12  attest_m732_03_cr_m732_12 == True (Brauwasser-Trinkwasserqualität)', async () => {
    await proveBothWays('M732-03', 'CR-M732-12',
      [{ ws: 'M732-03', values: { attest_m732_03_cr_m732_12: true } }],
      [{ ws: 'M732-03', values: { attest_m732_03_cr_m732_12: false } }]);
  });
});

describe('DWA-M-732 — M732-08 Abwasseranfall/Konzentration/Frachten', () => {
  it('CR-M732-02  6.5 <= pH_wert AND pH_wert <= 10.0 (Indirekteinleiter, §7.3)', async () => {
    await proveBothWays('M732-08', 'CR-M732-02',
      [{ ws: 'M732-08', values: { pH_wert: 7 } }],
      [{ ws: 'M732-08', values: { pH_wert: 11 } }]); // above 10,0 → block
  });
  it('CR-M732-02  ALSO blocks below the lower bound (pH 5 < 6,5)', async () => {
    await saveSymbols('M732-08', { pH_wert: 7 });
    expect(await gateBlocks('M732-08', 'CR-M732-02')).toBe(false);
    await saveSymbols('M732-08', { pH_wert: 5 });
    expect(await gateBlocks('M732-08', 'CR-M732-02')).toBe(true);
  });
  it('CR-M732-03  T_abwasser < 35 (§7.3)', async () => {
    await proveBothWays('M732-08', 'CR-M732-03',
      [{ ws: 'M732-08', values: { T_abwasser: 30 } }],
      [{ ws: 'M732-08', values: { T_abwasser: 40 } }]);
  });
  it('CR-M732-04  Nährsalz Tab.13 — EW-branched NH4+NH3 limit AND P_ges <= 50', async () => {
    // Stay on the EW <= 5000 branch (limit 100) so the arithmetic sum controls.
    await proveBothWays('M732-08', 'CR-M732-04',
      [{ ws: 'M732-08', values: { EW: 3000, NH4_N: 60, NH3_N: 30, P_ges: 40 } }], // sum 90 <= 100
      [{ ws: 'M732-08', values: { NH4_N: 90 } }]); // sum 120 > 100 (EW<=5000) → block
  });
  it('CR-M732-04  large plant uses the > 5000 EW branch (limit 200)', async () => {
    await saveSymbols('M732-08', { EW: 8000, NH4_N: 120, NH3_N: 60, P_ges: 40 }); // sum 180 <= 200
    expect(await gateBlocks('M732-08', 'CR-M732-04')).toBe(false);
    await saveSymbols('M732-08', { NH4_N: 180 }); // sum 240 > 200 → block
    expect(await gateBlocks('M732-08', 'CR-M732-04')).toBe(true);
  });
  it('CR-M732-05  Direkteinleiter Tab.14 (Anh.11 AbwV) — CSB/BSB5/NH4/Nges/Pges limits', async () => {
    await proveBothWays('M732-08', 'CR-M732-05',
      [{ ws: 'M732-08', values: { CSB_durchmischt: 100, BSB5_durchmischt: 20, NH4_N: 8, N_ges: 15, P_ges: 1.5 } }],
      [{ ws: 'M732-08', values: { CSB_durchmischt: 150 } }]); // 150 > 110 → block
  });
});

describe('DWA-M-732 — M732-11 Chemisch-physikalische Vorbehandlung', () => {
  it('CR-M732-07  BSB5_elim_grad >= 50 (M+A-Becken, §7.4.1.3)', async () => {
    await proveBothWays('M732-11', 'CR-M732-07',
      [{ ws: 'M732-11', values: { BSB5_elim_grad: 60 } }],
      [{ ws: 'M732-11', values: { BSB5_elim_grad: 40 } }]);
  });
  it('CR-M732-06  attest_m732_11_cr_m732_06 == True (Vorabscheidung Anaerobreaktor)', async () => {
    await proveBothWays('M732-11', 'CR-M732-06',
      [{ ws: 'M732-11', values: { attest_m732_11_cr_m732_06: true } }],
      [{ ws: 'M732-11', values: { attest_m732_11_cr_m732_06: false } }]);
  });
  it('CR-M732-09  attest_m732_11_cr_m732_09 == True (Sicherheitsorganisation)', async () => {
    await proveBothWays('M732-11', 'CR-M732-09',
      [{ ws: 'M732-11', values: { attest_m732_11_cr_m732_09: true } }],
      [{ ws: 'M732-11', values: { attest_m732_11_cr_m732_09: false } }]);
  });
  it('CR-M732-10  attest_m732_11_cr_m732_10 == True (Abluftbehandlung anaerobe Vorstufe)', async () => {
    await proveBothWays('M732-11', 'CR-M732-10',
      [{ ws: 'M732-11', values: { attest_m732_11_cr_m732_10: true } }],
      [{ ws: 'M732-11', values: { attest_m732_11_cr_m732_10: false } }]);
  });
});

describe('DWA-M-732 — M732-12 Aerobe biologische Behandlung', () => {
  it('CR-M732-08  B_TS_BSB >= 0.05 AND B_TS_BSB <= 0.08 (Schlammbelastung, §7.4.2.2.1)', async () => {
    await proveBothWays('M732-12', 'CR-M732-08',
      [{ ws: 'M732-12', values: { B_TS_BSB: 0.06 } }],
      [{ ws: 'M732-12', values: { B_TS_BSB: 0.1 } }]); // above 0,08 → block
  });
  it('CR-M732-08  ALSO blocks below the lower bound (0,02 < 0,05)', async () => {
    await saveSymbols('M732-12', { B_TS_BSB: 0.06 });
    expect(await gateBlocks('M732-12', 'CR-M732-08')).toBe(false);
    await saveSymbols('M732-12', { B_TS_BSB: 0.02 });
    expect(await gateBlocks('M732-12', 'CR-M732-08')).toBe(true);
  });
});

describe('DWA-M-732 — M732-15 Beispielanlage Neutralisation (Olfaktometrie + TA-Lärm)', () => {
  it('CR-M732-14  attest_m732_15_cr_m732_14 == True (Olfaktometrie DIN EN 13725)', async () => {
    await proveBothWays('M732-15', 'CR-M732-14',
      [{ ws: 'M732-15', values: { attest_m732_15_cr_m732_14: true } }],
      [{ ws: 'M732-15', values: { attest_m732_15_cr_m732_14: false } }]);
  });
  it('CR-M732-15  TA-Lärm Mindestabstände — WR 400 m distance clause (§8.5)', async () => {
    // Reines Wohngebiet at 100 dB(A): the 400 m distance controls. nachtzeit null → night clause vacuous.
    await proveBothWays('M732-15', 'CR-M732-15',
      [{ ws: 'M732-15', values: { gebiet: 'WR', schallpegel: 100, abstand_wr: 400, nachtzeit: null } }],
      [{ ws: 'M732-15', values: { abstand_wr: 300 } }]); // 300 < 400 at 100 dB(A) in WR → block
  });
  it('CR-M732-15  Nacht clause — immissionsrichtwert_nacht <= tag - 15 (arithmetic RHS)', async () => {
    // Keep the distance clauses satisfied (WR at 400 m); drive the night sub-clause.
    await saveSymbols('M732-15', { gebiet: 'WR', schallpegel: 100, abstand_wr: 400, nachtzeit: 'nacht', immissionsrichtwert_tag: 55, immissionsrichtwert_nacht: 40 });
    expect(await gateBlocks('M732-15', 'CR-M732-15')).toBe(false); // 40 <= 55-15=40 → pass
    await saveSymbols('M732-15', { immissionsrichtwert_nacht: 45 });
    expect(await gateBlocks('M732-15', 'CR-M732-15')).toBe(true); // 45 > 40 → block
  });
});

describe('DWA-M-732 — M732-21 Weitere Emissionen: Abfälle', () => {
  it('CR-M732-11  attest_m732_21_cr_m732_11 == True (Klärschlamm/Bioabfall)', async () => {
    await proveBothWays('M732-21', 'CR-M732-11',
      [{ ws: 'M732-21', values: { attest_m732_21_cr_m732_11: true } }],
      [{ ws: 'M732-21', values: { attest_m732_21_cr_m732_11: false } }]);
  });
});
