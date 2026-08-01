/**
 * DWA-A-262E (constructed wetlands / Pflanzenkläranlagen) — REAL save-path
 * execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 52 live BLOCK gates by driving it through the REAL
 * enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts) — local field
 * symbols plus the conflict-free project-wide fallback. A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block,
 * and a persisted state where it DOES (the F-4 lesson — gates that fire but never
 * enforce are invisible to static reading). Conditions verbatim from prod;
 * nothing is fixed here.
 *
 * IF/THEN CONFIRMATION (E-D11): REQ-20/20b/33/34/35/36/17/18a and the greywater
 * REQ-12 are driven with their GUARD TRUE both ways — proving the consequent
 * genuinely enforces — and a guard-false vacuous-pass state is shown for the
 * REQ-20 / REQ-33 class. This confirms the WRITTEN-NOT-APPLIED P-6c rewrite is
 * UNNECESSARY: IF/THEN enforces as-is.
 *
 * FLAG ITEMS (both settled in the final describe block):
 *   - REQ-13 `B_d_TKN <= B_A_TKN_zul` (WARN): shown NOT in the block set, and the
 *     engine's ordering-op acompare path is driven directly both ways → it
 *     enforces (the ES-1 "always-pass" flag is stale).
 *   - REQ-06 `f_S_QM >= 6 AND f_S_QM <= 9` (WARN): parseable + enforcing, NOT a
 *     malformed block gate (the "A262-06:6" flag is stale).
 */
// @vitest-environment node
import './_harness-env-a262e'; // top-level-await: PG + seedA262 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA262Harness } from './_harness-env-a262e';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA262Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string;

/** Persist a symbol→value map through the REAL saveWorksheet, partitioned by
 *  each symbol's home worksheet. Value `type` is the field's real data_type. */
async function saveSymbols(values: Record<string, Val>): Promise<void> {
  const byWs = new Map<string, Record<string, { type: string; value: Val }>>();
  for (const [symbol, value] of Object.entries(values)) {
    const meta = fixture.fieldMeta[symbol];
    if (!meta) throw new Error(`seed gap: no field for symbol ${symbol}`);
    const batch = byWs.get(meta.ws) ?? {};
    batch[meta.fieldId] = { type: meta.dataType, value };
    byWs.set(meta.ws, batch);
  }
  for (const [ws, batch] of byWs) {
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

/** Assert a gate is proven ENFORCING both ways through the real save path. */
async function proveBothWays(
  ws: string,
  code: string,
  passState: Record<string, Val>,
  violateState: Record<string, Val>,
): Promise<void> {
  await saveSymbols(passState);
  expect(await gateBlocks(ws, code), `${code} should NOT block in passing state`).toBe(false);
  await saveSymbols(violateState);
  expect(await gateBlocks(ws, code), `${code} SHOULD block in violating state`).toBe(true);
}

describe('DWA-A-262E — A262-01/02 intake gates', () => {
  it('A262-01 REQ-02a  wastewater_significantly_different == False', async () => {
    await proveBothWays('A262-01', 'REQ-02a',
      { wastewater_significantly_different: false },
      { wastewater_significantly_different: true });
  });
  it('A262-01 REQ-22  climate_zone != "permafrost"', async () => {
    await proveBothWays('A262-01', 'REQ-22',
      { climate_zone: 'temperate' },
      { climate_zone: 'permafrost' });
  });
  it('A262-02 REQ-01  system_size_category IN {small_wwts, municipal_wwtp}', async () => {
    await proveBothWays('A262-02', 'REQ-01',
      { system_size_category: 'small_wwts' },
      { system_size_category: 'industrial' });
  });
});

describe('DWA-A-262E — A262-05 hydraulic-design gates', () => {
  it('A262-05 REQ-03  x_Q_max == 8', async () => {
    await proveBothWays('A262-05', 'REQ-03', { x_Q_max: 8 }, { x_Q_max: 6 });
  });
  it('A262-05 REQ-05  m_multiplier >= 1', async () => {
    await proveBothWays('A262-05', 'REQ-05', { m_multiplier: 1.5 }, { m_multiplier: 0.5 });
  });
});

describe('DWA-A-262E — A262-07 pretreatment gates', () => {
  it('A262-07 REQ-08  pretreatment_selected != none', async () => {
    await proveBothWays('A262-07', 'REQ-08',
      { pretreatment_selected: 'mechanical' },
      { pretreatment_selected: 'none' });
  });
  it('A262-07 REQ-30  aufenthaltszeit >= 2', async () => {
    await proveBothWays('A262-07', 'REQ-30', { aufenthaltszeit: 3 }, { aufenthaltszeit: 1 });
  });
});

describe('DWA-A-262E — A262-08 effluent gates (incl. IF/THEN nitrification, both ways + vacuous)', () => {
  it('A262-08 REQ-19eff-a  effluent_BOD5_mg_l <= 40', async () => {
    await proveBothWays('A262-08', 'REQ-19eff-a', { effluent_BOD5_mg_l: 20 }, { effluent_BOD5_mg_l: 50 });
  });
  it('A262-08 REQ-19eff-b  effluent_COD_mg_l <= 150', async () => {
    await proveBothWays('A262-08', 'REQ-19eff-b', { effluent_COD_mg_l: 100 }, { effluent_COD_mg_l: 200 });
  });
  it('A262-08 REQ-20  IF nitrification_required THEN effluent_S_NH4_mg_l <= 10  (guard TRUE, both ways)', async () => {
    await proveBothWays('A262-08', 'REQ-20',
      { nitrification_required: true, effluent_S_NH4_mg_l: 8 },
      { nitrification_required: true, effluent_S_NH4_mg_l: 15 });
  });
  it('A262-08 REQ-20  guard FALSE → vacuous pass even with high NH4 (IF/THEN vacuous-pass proven)', async () => {
    await saveSymbols({ nitrification_required: false, effluent_S_NH4_mg_l: 99 });
    expect(await gateBlocks('A262-08', 'REQ-20')).toBe(false);
  });
  it('A262-08 REQ-20b  IF nitrification_required THEN effluent_temperature_C >= 12  (guard TRUE, both ways)', async () => {
    await proveBothWays('A262-08', 'REQ-20b',
      { nitrification_required: true, effluent_temperature_C: 14 },
      { nitrification_required: true, effluent_temperature_C: 10 });
  });
});

describe('DWA-A-262E — A262-10 raw-wastewater-filter gates (attest + IF/THEN filter_type, both ways + vacuous)', () => {
  it('A262-10 REQ-09  attest_a262_10_req_09 == True', async () => {
    await proveBothWays('A262-10', 'REQ-09',
      { attest_a262_10_req_09: true },
      { attest_a262_10_req_09: false });
  });
  it('A262-10 REQ-33  IF filter_type==raw_wastewater_filter THEN f_A_F_CSB <= 100  (guard TRUE, both ways)', async () => {
    await proveBothWays('A262-10', 'REQ-33',
      { filter_type: 'raw_wastewater_filter', f_A_F_CSB: 80 },
      { filter_type: 'raw_wastewater_filter', f_A_F_CSB: 120 });
  });
  it('A262-10 REQ-33  guard FALSE → vacuous pass even with f_A_F_CSB high (IF/THEN vacuous-pass proven)', async () => {
    await saveSymbols({ filter_type: 'planted_vertical_filter', f_A_F_CSB: 999 });
    expect(await gateBlocks('A262-10', 'REQ-33')).toBe(false);
  });
  it('A262-10 REQ-34  IF filter_type==raw_wastewater_filter THEN q_F_T <= 250  (guard TRUE, both ways)', async () => {
    await proveBothWays('A262-10', 'REQ-34',
      { filter_type: 'raw_wastewater_filter', q_F_T: 200 },
      { filter_type: 'raw_wastewater_filter', q_F_T: 300 });
  });
  it('A262-10 REQ-35  IF filter_type==raw_wastewater_filter THEN q_Beschickung_Fo >= 10  (guard TRUE, both ways)', async () => {
    await proveBothWays('A262-10', 'REQ-35',
      { filter_type: 'raw_wastewater_filter', q_Beschickung_Fo: 12 },
      { filter_type: 'raw_wastewater_filter', q_Beschickung_Fo: 5 });
  });
  it('A262-10 REQ-36  IF filter_type==raw THEN h_Beschickung_Fo >= 20 AND <= 50  (guard TRUE, both ways)', async () => {
    await proveBothWays('A262-10', 'REQ-36',
      { filter_type: 'raw_wastewater_filter', h_Beschickung_Fo: 35 },
      { filter_type: 'raw_wastewater_filter', h_Beschickung_Fo: 60 });
  });
});

describe('DWA-A-262E — A262-11/12/13/14 VFS/VFKS/VFG/VFK filter-area gates', () => {
  it('A262-11 REQ-40  A_Fo_spez_VFS_KA >= 4', async () => {
    await proveBothWays('A262-11', 'REQ-40', { A_Fo_spez_VFS_KA: 5 }, { A_Fo_spez_VFS_KA: 2 });
  });
  it('A262-11 REQ-41  A_Fo_min_VFS_KA >= 16', async () => {
    await proveBothWays('A262-11', 'REQ-41', { A_Fo_min_VFS_KA: 20 }, { A_Fo_min_VFS_KA: 10 });
  });
  it('A262-12 REQ-50  A_Fo1_spez >= 1', async () => {
    await proveBothWays('A262-12', 'REQ-50', { A_Fo1_spez: 2 }, { A_Fo1_spez: 0.5 });
  });
  it('A262-12 REQ-51  A_Fo2_spez >= 1', async () => {
    await proveBothWays('A262-12', 'REQ-51', { A_Fo2_spez: 2 }, { A_Fo2_spez: 0.5 });
  });
  it('A262-13 REQ-60  A_Fo_spez_VFG_KA >= 1', async () => {
    await proveBothWays('A262-13', 'REQ-60', { A_Fo_spez_VFG_KA: 2 }, { A_Fo_spez_VFG_KA: 0.5 });
  });
  it('A262-13 REQ-61  A_Fo_min_VFG_KA >= 4', async () => {
    await proveBothWays('A262-13', 'REQ-61', { A_Fo_min_VFG_KA: 5 }, { A_Fo_min_VFG_KA: 2 });
  });
  it('A262-14 REQ-70  A_Fu_spez >= 1', async () => {
    await proveBothWays('A262-14', 'REQ-70', { A_Fu_spez: 2 }, { A_Fu_spez: 0.5 });
  });
  it('A262-14 REQ-71  A_Fu_min >= 4', async () => {
    await proveBothWays('A262-14', 'REQ-71', { A_Fu_min: 5 }, { A_Fu_min: 2 });
  });
});

describe('DWA-A-262E — A262-15/16 Rieselrohr + horizontal-flow gates', () => {
  it('A262-15 REQ-81  l_Rieselr >= 6', async () => {
    await proveBothWays('A262-15', 'REQ-81', { l_Rieselr: 8 }, { l_Rieselr: 4 });
  });
  it('A262-15 REQ-82  L_Rieselr <= 18', async () => {
    await proveBothWays('A262-15', 'REQ-82', { L_Rieselr: 12 }, { L_Rieselr: 20 });
  });
  it('A262-15 REQ-83  B_FGR >= 0.5', async () => {
    await proveBothWays('A262-15', 'REQ-83', { B_FGR: 0.8 }, { B_FGR: 0.3 });
  });
  it('A262-15 REQ-84  h_Beschickung_Fu >= 20', async () => {
    await proveBothWays('A262-15', 'REQ-84', { h_Beschickung_Fu: 25 }, { h_Beschickung_Fu: 10 });
  });
  it('A262-16 REQ-90  A_F_spez_HFK_KA >= 1', async () => {
    await proveBothWays('A262-16', 'REQ-90', { A_F_spez_HFK_KA: 2 }, { A_F_spez_HFK_KA: 0.5 });
  });
  it('A262-16 REQ-91  f_A_ANF_CSB <= 200', async () => {
    await proveBothWays('A262-16', 'REQ-91', { f_A_ANF_CSB: 150 }, { f_A_ANF_CSB: 250 });
  });
  it('A262-16 REQ-92  L_HF_min >= 2', async () => {
    await proveBothWays('A262-16', 'REQ-92', { L_HF_min: 3 }, { L_HF_min: 1 });
  });
});

describe('DWA-A-262E — A262-18/19/20 kommunale-KA (KomKA) gates', () => {
  it('A262-18 REQ-10  attest_a262_18_req_10 == True', async () => {
    await proveBothWays('A262-18', 'REQ-10',
      { attest_a262_18_req_10: true }, { attest_a262_18_req_10: false });
  });
  it('A262-18 REQ-103  f_A_F_CSB_KomKA_in <= 20', async () => {
    await proveBothWays('A262-18', 'REQ-103', { f_A_F_CSB_KomKA_in: 15 }, { f_A_F_CSB_KomKA_in: 25 });
  });
  it('A262-18 REQ-104  q_F_T_KomKA_in <= 80', async () => {
    await proveBothWays('A262-18', 'REQ-104', { q_F_T_KomKA_in: 60 }, { q_F_T_KomKA_in: 100 });
  });
  it('A262-19 REQ-101  f_A_F_CSB_Betrieb <= 27', async () => {
    await proveBothWays('A262-19', 'REQ-101', { f_A_F_CSB_Betrieb: 20 }, { f_A_F_CSB_Betrieb: 30 });
  });
  it('A262-19 REQ-102  t_Sicker_min_aM >= 6', async () => {
    await proveBothWays('A262-19', 'REQ-102', { t_Sicker_min_aM: 8 }, { t_Sicker_min_aM: 4 });
  });
  it('A262-20 REQ-110  A_Fo1_spez_KomKA >= 1', async () => {
    await proveBothWays('A262-20', 'REQ-110', { A_Fo1_spez_KomKA: 2 }, { A_Fo1_spez_KomKA: 0.5 });
  });
  it('A262-20 REQ-111  A_Fo2_spez_KomKA >= 1', async () => {
    await proveBothWays('A262-20', 'REQ-111', { A_Fo2_spez_KomKA: 2 }, { A_Fo2_spez_KomKA: 0.5 });
  });
  it('A262-20 REQ-112  f_A_F01_CSB <= 80', async () => {
    await proveBothWays('A262-20', 'REQ-112', { f_A_F01_CSB: 60 }, { f_A_F01_CSB: 100 });
  });
});

describe('DWA-A-262E — A262-22/23 VFK-KomKA + operation gates', () => {
  it('A262-22 REQ-130  A_Fu_spez_VFK_KomKA >= 1', async () => {
    await proveBothWays('A262-22', 'REQ-130', { A_Fu_spez_VFK_KomKA: 2 }, { A_Fu_spez_VFK_KomKA: 0.5 });
  });
  it('A262-22 REQ-131  f_V_CSB_VFK_KomKA <= 100', async () => {
    await proveBothWays('A262-22', 'REQ-131', { f_V_CSB_VFK_KomKA: 80 }, { f_V_CSB_VFK_KomKA: 120 });
  });
  it('A262-23 REQ-141  q_F_T_Betrieb <= 240', async () => {
    await proveBothWays('A262-23', 'REQ-141', { q_F_T_Betrieb: 200 }, { q_F_T_Betrieb: 300 });
  });
  it('A262-23 REQ-142  q_AWF_aM <= 500', async () => {
    await proveBothWays('A262-23', 'REQ-142', { q_AWF_aM: 400 }, { q_AWF_aM: 600 });
  });
});

describe('DWA-A-262E — A262-25 regeneration + greywater gates (REQ-12 = cross-worksheet IF/THEN)', () => {
  it('A262-25 REQ-11  f_red >= 0.5', async () => {
    await proveBothWays('A262-25', 'REQ-11', { f_red: 0.8 }, { f_red: 0.3 });
  });
  it('A262-25 REQ-11b  t_Reg <= 6', async () => {
    await proveBothWays('A262-25', 'REQ-11b', { t_Reg: 4 }, { t_Reg: 8 });
  });
  it('A262-25 REQ-12  if wastewater_type==greywater_only then w_s_d >= 75  (guard TRUE, both ways; wastewater_type←A262-02, w_s_d←A262-04 via project-wide fallback)', async () => {
    await proveBothWays('A262-25', 'REQ-12',
      { wastewater_type: 'greywater_only', w_s_d: 80 },
      { wastewater_type: 'greywater_only', w_s_d: 70 });
  });
  it('A262-25 REQ-12  guard FALSE (mixed wastewater) → vacuous pass even with w_s_d < 75', async () => {
    await saveSymbols({ wastewater_type: 'domestic_mixed', w_s_d: 10 });
    expect(await gateBlocks('A262-25', 'REQ-12')).toBe(false);
  });
});

describe('DWA-A-262E — A262-26/27 greywater-daily + filter-under gates', () => {
  it('A262-26 REQ-02c  Q_GW_taeglich >= 75', async () => {
    await proveBothWays('A262-26', 'REQ-02c', { Q_GW_taeglich: 90 }, { Q_GW_taeglich: 50 });
  });
  it('A262-27 REQ-150  f_A_Fu_CSB <= 16', async () => {
    await proveBothWays('A262-27', 'REQ-150', { f_A_Fu_CSB: 12 }, { f_A_Fu_CSB: 20 });
  });
});

describe('DWA-A-262E — A262-29 lining safety gates (IF/THEN lining_type, both ways + vacuous)', () => {
  it('A262-29 REQ-15  fines_fraction <= 2', async () => {
    await proveBothWays('A262-29', 'REQ-15', { fines_fraction: 1 }, { fines_fraction: 3 });
  });
  it('A262-29 REQ-17  IF lining_type IN {mineral_seal_clay, unsealed_subsoil} THEN k_f_subsoil_m_s <= 1e-8  (guard TRUE via mineral_seal_clay, both ways)', async () => {
    await proveBothWays('A262-29', 'REQ-17',
      { lining_type: 'mineral_seal_clay', k_f_subsoil_m_s: 1e-9 },
      { lining_type: 'mineral_seal_clay', k_f_subsoil_m_s: 1e-7 });
  });
  it('A262-29 REQ-17  guard FALSE (geomembrane) → vacuous pass even with high k_f', async () => {
    await saveSymbols({ lining_type: 'geomembrane', k_f_subsoil_m_s: 1e-3 });
    expect(await gateBlocks('A262-29', 'REQ-17')).toBe(false);
  });
  it('A262-29 REQ-18a  IF lining_type == geomembrane THEN geomembrane_thickness_mm >= 1.5  (guard TRUE, both ways)', async () => {
    await proveBothWays('A262-29', 'REQ-18a',
      { lining_type: 'geomembrane', geomembrane_thickness_mm: 2 },
      { lining_type: 'geomembrane', geomembrane_thickness_mm: 1 });
  });
});

describe('DWA-A-262E — A262-32 O&M gate', () => {
  it('A262-32 REQ-21  maintenance_plan_documented == True', async () => {
    await proveBothWays('A262-32', 'REQ-21',
      { maintenance_plan_documented: true },
      { maintenance_plan_documented: false });
  });
});

describe('DWA-A-262E — FLAG-ITEM settlement (REQ-13 ES-1, A262-06:6)', () => {
  it('REQ-13 is a WARN gate → NEVER appears in the approval-gate block set, even when B_d_TKN > B_A_TKN_zul', async () => {
    await saveSymbols({ B_d_TKN: 100, B_A_TKN_zul: 10 }); // a would-be violation
    const result = await checkApprovalGate(fixture.instances['A262-25']);
    // REQ-13 is severity=warn → checkApprovalGate only loads severity=block rows.
    expect(result.failingBlockConditions.some((c) => c.code === 'REQ-13')).toBe(false);
  });

  it('REQ-13 engine check: `B_d_TKN <= B_A_TKN_zul` (ordering-op, bare-symbol RHS) ENFORCES both ways via acompare — the ES-1 "always-pass" flag is STALE', () => {
    const lookup = (m: Record<string, Val>) => (s: string) => m[s];
    // Passing: 5 <= 10 → pass
    expect(evaluateCondition('B_d_TKN <= B_A_TKN_zul', lookup({ B_d_TKN: 5, B_A_TKN_zul: 10 })).kind).toBe('pass');
    // Violating: 100 <= 10 → fail (NOT a spurious pass)
    expect(evaluateCondition('B_d_TKN <= B_A_TKN_zul', lookup({ B_d_TKN: 100, B_A_TKN_zul: 10 })).kind).toBe('fail');
    // RHS unfilled → pending (resolves via lookup, does NOT stringify to a false fail)
    expect(evaluateCondition('B_d_TKN <= B_A_TKN_zul', lookup({ B_d_TKN: 5 })).kind).toBe('pending');
  });

  it('REQ-06 engine check: `f_S_QM >= 6 AND f_S_QM <= 9` parses + ENFORCES (NOT manual/malformed) — the "A262-06:6 malformed" flag is STALE', () => {
    const lookup = (v: number) => (s: string) => (s === 'f_S_QM' ? v : undefined);
    expect(evaluateCondition('f_S_QM >= 6 AND f_S_QM <= 9', lookup(7)).kind).toBe('pass');  // in range
    expect(evaluateCondition('f_S_QM >= 6 AND f_S_QM <= 9', lookup(10)).kind).toBe('fail'); // above range
    expect(evaluateCondition('f_S_QM >= 6 AND f_S_QM <= 9', lookup(4)).kind).toBe('fail');  // below range
  });
});
