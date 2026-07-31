/**
 * FLL revision · MILESTONE 2 · per-worksheet verification — FLL-Naturteich :: FLLNT-03
 * (Auswahl Naturteich-Typ I–V / natural-pool type selection).
 *
 * FLLNT-03 has NO equations. Its machine-evaluable artifacts are the 5 block gates
 * REQ-06, REQ-07, REQ-09, REQ-10, REQ-11 (verbatim from prod). This test:
 *   1. seeds the FULL FLL-Naturteich tree via seed-fll-naturteich.ts;
 *   2. drives REQ-06 (natural_pool_type IN {...}) through the REAL saveWorksheet in
 *      PASS + FAIL + PENDING, reading the persisted enum back and firing the REAL
 *      evaluateCondition;
 *   3. drives REQ-07 through the REAL evaluator across the Type-I/II branch AND the
 *      Type-III branch — proving the operator-precedence DEAD-BRANCH finding;
 *   4. fires REQ-09 / REQ-10 / REQ-11 (cross-worksheet gates whose symbols live on
 *      FLLNT-04/-05) through the REAL evaluator in pass + fail states.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f3';

// Conditions verbatim from prod compliance_requirements (FLLNT-03).
const REQ_06 = 'natural_pool_type IN {type_I,type_II,type_III,type_IV,type_V}';
const REQ_07 = 'IF natural_pool_type IN {type_I, type_II} THEN regeneration_area_share > 50 AND IF natural_pool_type == type_III THEN regeneration_area_share > 30';
const REQ_09 = 'water_test_ammonium <= 0.5 AND water_test_iron <= 0.2 AND water_test_p_total <= 0.03 AND water_test_hardness >= 1.0 AND water_test_conductivity <= 1000 AND water_test_manganese <= 0.05 AND water_test_nitrate <= 50.0 AND water_test_orthophosphate <= 0.01 AND water_test_ph >= 6.0 AND water_test_ph <= 9.0 AND water_test_acid_capacity_ks43 >= 2';
const REQ_10 = 'swimming_test_ammonium <= 0.3 AND swimming_test_hardness >= 1.0 AND swimming_test_conductivity <= 1000 AND swimming_test_nitrate <= 30.0 AND swimming_test_nitrite <= 0.01 AND swimming_test_ph >= 7.0 AND swimming_test_ph <= 9.0 AND swimming_test_acid_capacity_ks43 >= 2 AND (IF natural_pool_type IN {type_I,type_II,type_III} THEN (swimming_test_p_total <= 0.03 AND swimming_test_orthophosphate <= 0.03)) AND (IF natural_pool_type IN {type_IV,type_V} THEN (swimming_test_p_total <= 0.01 AND swimming_test_orthophosphate <= 0.01))';
const REQ_11 = 'concrete_spec_compliant == true AND wood_treatment_compliant == true AND materials_biocide_free == true AND plant_substrate_compliant == true';

let harness: Harness;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fixture: any;

beforeAll(async () => {
  harness = await startHarness();
  process.env.DATABASE_URL = harness.databaseUrl;
  process.env.BYPASS_AUTH = 'true';
  process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
  process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
  const { seedFllNaturteich } = await import('./seed-fll-naturteich');
  fixture = await seedFllNaturteich(harness.sql, HARNESS_USER_ID);
}, 120_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

function ws03() {
  return fixture.worksheets['FLLNT-03'];
}
async function enumPersisted(symbol: string): Promise<string | null> {
  const [row] = await harness.sql<{ value_enum: string | null }[]>`
    SELECT value_enum FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws03().fieldIds[symbol]}`;
  return row?.value_enum ?? null;
}

describe('FLLNT-03 — real saveWorksheet + real evaluateCondition', () => {
  it('exposes FLLNT-03 with 0 equations and 5 gates', async () => {
    const sql = harness.sql;
    const ws = ws03();
    expect(ws).toBeTruthy();
    expect(ws.fieldIds['natural_pool_type']).toBeTruthy();
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    expect(e).toBe(0);
    expect(c).toBe(5);
  });

  // ── REQ-06 through the real save path ─────────────────────────────────────
  it('REQ-06 PASS — a valid pool type persists and fires pass', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws03();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['natural_pool_type']]: { type: 'enum', value: 'type_III' } },
    });
    expect(res.ok).toBe(true);
    const v = await enumPersisted('natural_pool_type');
    expect(v).toBe('type_III');
    expect(evaluateCondition(REQ_06, (s) => (s === 'natural_pool_type' ? v : undefined)).kind).toBe('pass');
  });

  it('REQ-06 FAIL — an out-of-list pool type persists and fires fail', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws03();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['natural_pool_type']]: { type: 'enum', value: 'type_VI' } },
    });
    expect(res.ok).toBe(true);
    const v = await enumPersisted('natural_pool_type');
    expect(v).toBe('type_VI');
    expect(evaluateCondition(REQ_06, (s) => (s === 'natural_pool_type' ? v : undefined)).kind).toBe('fail');
  });

  it('REQ-06 PENDING — no pool type reported pending (not vacuous)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const verdict = evaluateCondition(REQ_06, () => undefined);
    expect(verdict.kind).toBe('pending');
    if (verdict.kind === 'pending') expect(verdict.missingSymbols).toContain('natural_pool_type');
  });

  // ── REQ-07 — Type I/II branch is live; Type-III branch is DEAD ─────────────
  it('REQ-07 Type-I/II branch PASS — share 60 > 50 passes', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) =>
      s === 'natural_pool_type' ? 'type_I' : s === 'regeneration_area_share' ? 60 : undefined;
    expect(evaluateCondition(REQ_07, lk).kind).toBe('pass');
  });

  it('REQ-07 Type-I/II branch FAIL — share 40 <= 50 fails', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) =>
      s === 'natural_pool_type' ? 'type_II' : s === 'regeneration_area_share' ? 40 : undefined;
    expect(evaluateCondition(REQ_07, lk).kind).toBe('fail');
  });

  it('REQ-07 Type-III DEAD BRANCH — share 10 (< 30, should FAIL) but gate PASSES', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    // PDF Tab.1: Type III must have regeneration area > 30% of total. share=10 must
    // therefore FAIL the source rule. Because of operator precedence the Type-III
    // guard is nested inside the (false) Type-I/II guard, so it is never evaluated
    // and the gate returns PASS. This is the FINDING.
    const lk = (s: string) =>
      s === 'natural_pool_type' ? 'type_III' : s === 'regeneration_area_share' ? 10 : undefined;
    const verdict = evaluateCondition(REQ_07, lk);
    // Document the buggy live behaviour (PASS despite a source violation):
    expect(verdict.kind).toBe('pass');
  });

  it('REQ-07 Type-IV/V — no share rule applies; gate vacuously passes', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) =>
      s === 'natural_pool_type' ? 'type_IV' : s === 'regeneration_area_share' ? 0 : undefined;
    expect(evaluateCondition(REQ_07, lk).kind).toBe('pass');
  });

  // ── REQ-09 (Tab. 7 fill-up water) ─────────────────────────────────────────
  it('REQ-09 PASS — all fill-up water params within Tab. 7 limits', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const good: Record<string, number> = {
      water_test_ammonium: 0.4, water_test_iron: 0.1, water_test_p_total: 0.02,
      water_test_hardness: 1.5, water_test_conductivity: 800, water_test_manganese: 0.04,
      water_test_nitrate: 40, water_test_orthophosphate: 0.005, water_test_ph: 7.5,
      water_test_acid_capacity_ks43: 3,
    };
    expect(evaluateCondition(REQ_09, (s) => good[s]).kind).toBe('pass');
  });

  it('REQ-09 FAIL — ammonium 0.9 > 0.5 fails', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const bad: Record<string, number> = {
      water_test_ammonium: 0.9, water_test_iron: 0.1, water_test_p_total: 0.02,
      water_test_hardness: 1.5, water_test_conductivity: 800, water_test_manganese: 0.04,
      water_test_nitrate: 40, water_test_orthophosphate: 0.005, water_test_ph: 7.5,
      water_test_acid_capacity_ks43: 3,
    };
    expect(evaluateCondition(REQ_09, (s) => bad[s]).kind).toBe('fail');
  });

  // ── REQ-10 (Tab. 8 swimming-area water; type-dependent P thresholds) ───────
  it('REQ-10 PASS Type-III — P total 0.02 <= 0.03 passes', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const good: Record<string, number | string> = {
      natural_pool_type: 'type_III',
      swimming_test_ammonium: 0.2, swimming_test_hardness: 1.5, swimming_test_conductivity: 800,
      swimming_test_nitrate: 20, swimming_test_nitrite: 0.005, swimming_test_ph: 8.0,
      swimming_test_acid_capacity_ks43: 3, swimming_test_p_total: 0.02, swimming_test_orthophosphate: 0.02,
    };
    expect(evaluateCondition(REQ_10, (s) => good[s]).kind).toBe('pass');
  });

  it('REQ-10 FAIL Type-IV — P total 0.02 > 0.01 fails (stricter type-IV/V branch)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const bad: Record<string, number | string> = {
      natural_pool_type: 'type_IV',
      swimming_test_ammonium: 0.2, swimming_test_hardness: 1.5, swimming_test_conductivity: 800,
      swimming_test_nitrate: 20, swimming_test_nitrite: 0.005, swimming_test_ph: 8.0,
      swimming_test_acid_capacity_ks43: 3, swimming_test_p_total: 0.02, swimming_test_orthophosphate: 0.005,
    };
    expect(evaluateCondition(REQ_10, (s) => bad[s]).kind).toBe('fail');
  });

  // ── REQ-11 (§7.2 material requirements) ───────────────────────────────────
  it('REQ-11 PASS — all four material flags true', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) =>
      ['concrete_spec_compliant', 'wood_treatment_compliant', 'materials_biocide_free', 'plant_substrate_compliant'].includes(s)
        ? true : undefined;
    expect(evaluateCondition(REQ_11, lk).kind).toBe('pass');
  });

  it('REQ-11 FAIL — biocide-free flag false fails', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) => {
      if (s === 'materials_biocide_free') return false;
      return ['concrete_spec_compliant', 'wood_treatment_compliant', 'plant_substrate_compliant'].includes(s)
        ? true : undefined;
    };
    expect(evaluateCondition(REQ_11, lk).kind).toBe('fail');
  });
});
