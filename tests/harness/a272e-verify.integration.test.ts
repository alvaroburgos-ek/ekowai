/**
 * DWA-A-272E (Principles for the Planning and Implementation of New Alternative
 * Sanitation Systems (NASS); English Edition, 1st edition, Hennef 2019) —
 * REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES each
 * of the standard's 20 live BLOCK gates (non-empty condition) by driving it through
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
 * COVERED GATE SHAPES:
 *   - multi-conjunct existence + boolean   COMP-01 (IS NOT EMPTY / IS NOT NULL / == true)
 *   - single numeric limit                  COMP-02 (favourable_conditions_count>=1)
 *   - membership IN {…} (lowercase enum)    COMP-03 (material_flow_class), COMP-04/-15 (system_group)
 *   - boolean/attestation equality (== True) COMP-24, COMP-25, COMP-18
 *   - AND-chained boolean equality          COMP-08 (four legal flags), COMP-34 (two baseline flags)
 *   - numeric band                          COMP-11 (T_plan 10..100)
 *   - OR-disjunction boolean                COMP-27 (sensitivity OR scenario)
 *   - single boolean equality               COMP-28..33 (stakeholder_*), COMP-13
 *   - bare-symbol enum RHS equality         COMP-35 (compliance_decision == approved)
 *
 * IN-SET CASE CHECK: COMP-03/-04/-15 use lowercase membership sets that match the
 * prod enum `value`s exactly (material_flow_class {service_water,…}; system_group
 * {one_material_flow,…,two_material_flows_UDT,…}). No Titlecase-vs-lowercase
 * always-false trap here — the passing case below proves membership actually resolves
 * true, which an always-false gate could never do.
 */
// @vitest-environment node
import './_harness-env-a272e'; // top-level-await: PG + seedA272E BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA272EHarness } from './_harness-env-a272e';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA272EHarness();

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
 *  resolving each symbol against ITS home worksheet (`ws:symbol` key). A null value
 *  clears the field. */
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

describe('DWA-A-272E — A272E-01 Projektregistrierung (scope clarification)', () => {
  it('COMP-01  name/client/location NOT EMPTY AND building_use_type/E_population NOT NULL AND rationale==true', async () => {
    await proveBothWays('A272E-01', 'COMP-01',
      [{ ws: 'A272E-01', values: { project_name: 'Neubaugebiet Musterstadt', client_name: 'Stadtwerke Muster', project_location: 'Muster, NRW', building_use_type: 'residential_permanent', E_population: 250, rationale_documented: true } }],
      // rationale flipped false → last conjunct definite-false → whole AND fails
      [{ ws: 'A272E-01', values: { rationale_documented: false } }]);
  });
});

describe('DWA-A-272E — A272E-03 NASS-Anwendbarkeits-Screening (§5.1 / Table 4)', () => {
  it('COMP-02  favourable_conditions_count >= 1', async () => {
    await proveBothWays('A272E-03', 'COMP-02',
      [{ ws: 'A272E-03', values: { favourable_conditions_count: 3 } }],
      [{ ws: 'A272E-03', values: { favourable_conditions_count: 0 } }]);
  });
});

describe('DWA-A-272E — A272E-04 Terminologie + Legal screening (§3 / §8)', () => {
  it('COMP-03  material_flow_class IN {lowercase §3 set} — membership resolves (no case trap)', async () => {
    await proveBothWays('A272E-04', 'COMP-03',
      [{ ws: 'A272E-04', values: { material_flow_class: 'greywater' } }],
      [{ ws: 'A272E-04', values: { material_flow_class: 'not_a_material_flow' } }]);
  });
  it('COMP-24  attest_a272e_04_comp_24 == True (BioAbfV screening)', async () => {
    await proveBothWays('A272E-04', 'COMP-24',
      [{ ws: 'A272E-04', values: { attest_a272e_04_comp_24: true } }],
      [{ ws: 'A272E-04', values: { attest_a272e_04_comp_24: false } }]);
  });
  it('COMP-25  attest_a272e_04_comp_25 == True (DüngG/DüV screening)', async () => {
    await proveBothWays('A272E-04', 'COMP-25',
      [{ ws: 'A272E-04', values: { attest_a272e_04_comp_25: true } }],
      [{ ws: 'A272E-04', values: { attest_a272e_04_comp_25: false } }]);
  });
});

describe('DWA-A-272E — A272E-05 Auswahl der Systemgruppe (§4.2 / Table 1)', () => {
  it('COMP-04  system_group IN {lowercase §4.2 set} — membership resolves', async () => {
    await proveBothWays('A272E-05', 'COMP-04',
      [{ ws: 'A272E-05', values: { system_group: 'two_material_flows_greyblack' } }],
      [{ ws: 'A272E-05', values: { system_group: 'not_a_group' } }]);
  });
  it('COMP-15  system_group IN {…} (duplicate condition — both enforce); UDT branch passes', async () => {
    await proveBothWays('A272E-05', 'COMP-15',
      [{ ws: 'A272E-05', values: { system_group: 'three_material_flows_UDDT' } }],
      [{ ws: 'A272E-05', values: { system_group: 'not_a_group' } }]);
  });
});

describe('DWA-A-272E — A272E-09 Rechtsrahmen-Bewertung (§8)', () => {
  it('COMP-08  legal_WHG_ok AND legal_KrWG_ok AND legal_TrinkwV_ok AND legal_DuengG_ok', async () => {
    await proveBothWays('A272E-09', 'COMP-08',
      [{ ws: 'A272E-09', values: { legal_WHG_ok: true, legal_KrWG_ok: true, legal_TrinkwV_ok: true, legal_DuengG_ok: true } }],
      // clear one conjunct to false → AND definite-false
      [{ ws: 'A272E-09', values: { legal_DuengG_ok: false } }]);
  });
});

describe('DWA-A-272E — A272E-11 Auswahl der Behandlungstechnologie (§5.2)', () => {
  it('COMP-18  attest_a272e_11_comp_18 == True', async () => {
    await proveBothWays('A272E-11', 'COMP-18',
      [{ ws: 'A272E-11', values: { attest_a272e_11_comp_18: true } }],
      [{ ws: 'A272E-11', values: { attest_a272e_11_comp_18: false } }]);
  });
});

describe('DWA-A-272E — A272E-12 Auswirkungen auf bestehende Infrastruktur (§9.1(3)-(4))', () => {
  it('COMP-34  baseline_quantitative_expansion AND baseline_qualitative_differentiation', async () => {
    await proveBothWays('A272E-12', 'COMP-34',
      [{ ws: 'A272E-12', values: { baseline_quantitative_expansion_documented: true, baseline_qualitative_differentiation_documented: true } }],
      [{ ws: 'A272E-12', values: { baseline_qualitative_differentiation_documented: false } }]);
  });
});

describe('DWA-A-272E — A272E-13 Definition der Bewertungskriterien (§7.3)', () => {
  it('COMP-11  T_plan >= 10 AND T_plan <= 100 (numeric band); ALSO blocks above 100', async () => {
    await proveBothWays('A272E-13', 'COMP-11',
      [{ ws: 'A272E-13', values: { T_plan: 30 } }],
      [{ ws: 'A272E-13', values: { T_plan: 5 } }]);
  });
  it('COMP-11  ALSO blocks the upper-bound violation (T_plan = 120 > 100)', async () => {
    await saveSymbols('A272E-13', { T_plan: 50 });
    expect(await gateBlocks('A272E-13', 'COMP-11')).toBe(false);
    await saveSymbols('A272E-13', { T_plan: 120 });
    expect(await gateBlocks('A272E-13', 'COMP-11')).toBe(true);
  });
  it('COMP-27  sensitivity_analysis_done == true OR scenario_analysis_done == true', async () => {
    await proveBothWays('A272E-13', 'COMP-27',
      [{ ws: 'A272E-13', values: { sensitivity_analysis_done: true, scenario_analysis_done: false } }],
      [{ ws: 'A272E-13', values: { sensitivity_analysis_done: false, scenario_analysis_done: false } }]);
  });
  it('COMP-27  ALSO passes via the scenario disjunct alone', async () => {
    await saveSymbols('A272E-13', { sensitivity_analysis_done: false, scenario_analysis_done: true });
    expect(await gateBlocks('A272E-13', 'COMP-27')).toBe(false);
    await saveSymbols('A272E-13', { scenario_analysis_done: false });
    expect(await gateBlocks('A272E-13', 'COMP-27')).toBe(true);
  });
});

describe('DWA-A-272E — A272E-15 Stakeholder-Integration (§9.2.2 … §9.2.7)', () => {
  const stakeholders: Array<{ code: string; symbol: string }> = [
    { code: 'COMP-28', symbol: 'stakeholder_urban' },
    { code: 'COMP-29', symbol: 'stakeholder_architecture' },
    { code: 'COMP-30', symbol: 'stakeholder_water' },
    { code: 'COMP-31', symbol: 'stakeholder_waste' },
    { code: 'COMP-32', symbol: 'stakeholder_agri' },
    { code: 'COMP-33', symbol: 'stakeholder_energy' },
  ];
  for (const { code, symbol } of stakeholders) {
    it(`${code}  ${symbol} == true`, async () => {
      await proveBothWays('A272E-15', code,
        [{ ws: 'A272E-15', values: { [symbol]: true } }],
        [{ ws: 'A272E-15', values: { [symbol]: false } }]);
    });
  }
});

describe('DWA-A-272E — A272E-18 Compliance- und Entscheidungs-Zusammenfassung (§9.1(8) / §10)', () => {
  it('COMP-13  monitoring_program_defined == true', async () => {
    await proveBothWays('A272E-18', 'COMP-13',
      [{ ws: 'A272E-18', values: { monitoring_program_defined: true } }],
      [{ ws: 'A272E-18', values: { monitoring_program_defined: false } }]);
  });
  it('COMP-35  compliance_decision == approved (bare-symbol enum RHS)', async () => {
    await proveBothWays('A272E-18', 'COMP-35',
      [{ ws: 'A272E-18', values: { compliance_decision: 'approved' } }],
      [{ ws: 'A272E-18', values: { compliance_decision: 'rejected' } }]);
  });
});
