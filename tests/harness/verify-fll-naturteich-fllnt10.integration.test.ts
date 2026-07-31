/**
 * FLL revision · MILESTONE 2 · per-worksheet verification — FLL-Naturteich :: FLLNT-10
 * (Substratfilter – Bemessung / substrate-filter sizing, slow + quick flow).
 *
 * FLLNT-10 owns 3 equations (EQ-01/-02/-03) and 2 block gates (REQ-22, REQ-30),
 * all verbatim from prod. Ground truth is the Appendix 5 worked example in the
 * PDF (Naturteich.txt lines 3977-4010):
 *   Example 1: 600 m²/m³ × 15 m² × 0.7 m = 6300 m²; 6300/50 = 126 m²
 *   Example 2: pool 95 m² → 95 × 50 = 4750 m² required; 4750/600 ≈ 8 m³ (grain 8-16);
 *              4750/1200 ≈ 4 m³ (grain 4-8).
 *
 * This test:
 *   1. seeds the FULL FLL-Naturteich tree via seed-fll-naturteich.ts;
 *   2. persists EQ-inputs via the REAL saveWorksheet, reads them back, and drives
 *      the REAL evaluateFormula for EQ-01, EQ-02, EQ-03 against the worked example;
 *   3. fires REQ-22 and REQ-30 through the REAL evaluateCondition in pass + fail.
 *
 * FINDINGS proven live here:
 *   - EQ-01 is an INEQUALITY-AS-PRODUCER: output_symbol is the boolean
 *     filter_50x_rule_met but rhs() strips the LHS and the engine returns the
 *     numeric threshold (50 × pool surface), never a boolean. The gate REQ-22
 *     (filter_50x_rule_met == true) therefore depends on a value the engine can
 *     never produce → gate is starved unless the engineer hand-sets the boolean.
 *   - EQ-02 references F_filter + h_filter which ARE fields on prod but carry no
 *     section and are NOT in the seeder's field set → chain runs with hand-supplied
 *     values (documented residue: they are unsectioned, non-source-named fields).
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000fa';

// verbatim from prod
const EQ_01 = 'filter_colonized_surface_actual >= 50 * pool_underwater_surface';
const EQ_02 = 'filter_colonized_surface_actual = grain_specific_surface * F_filter * h_filter';
const EQ_03 = 'filter_volume_required = (pool_underwater_surface * 50) / grain_specific_surface';
const REQ_22 = 'filter_50x_rule_met == true';
const REQ_30 = 'aerobic_filtration_confirmed == true';

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

function ws10() {
  return fixture.worksheets['FLLNT-10'];
}
async function numPersisted(symbol: string): Promise<number | null> {
  const [row] = await harness.sql<{ value_number: string | null }[]>`
    SELECT value_number FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws10().fieldIds[symbol]}`;
  return row?.value_number == null ? null : Number(row.value_number);
}

describe('FLLNT-10 — real saveWorksheet + real evaluateFormula + real evaluateCondition', () => {
  it('exposes FLLNT-10 with 3 equations and 2 gates', async () => {
    const sql = harness.sql;
    const ws = ws10();
    expect(ws).toBeTruthy();
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    expect(e).toBe(3);
    expect(c).toBe(2);
  });

  // ── EQ-03 filter_volume_required = (pool_underwater_surface * 50) / grain_specific_surface
  //    PDF Example 2a: (95 * 50) / 600 = 7.916… ≈ 8 m³ ; 2b: /1200 = 3.958… ≈ 4 m³
  it('EQ-03 — persists inputs via real save, evaluator matches PDF worked example (≈8 m³)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateFormula } = await import('@/lib/eval/formula');
    const ws = ws10();
    // pool_underwater_surface lives on FLLNT-06; drive grain_specific_surface here.
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['grain_specific_surface']]: { type: 'number', value: 600 } },
    });
    expect(res.ok).toBe(true);
    expect(await numPersisted('grain_specific_surface')).toBe(600);

    const state = evaluateFormula({
      equationId: 'b722809a-24c4-4c2d-8e8c-ea65a65a7e49',
      formula: EQ_03,
      inputSymbols: ['pool_underwater_surface', 'grain_specific_surface'],
      outputSymbol: 'filter_volume_required',
      inputs: [
        { symbol: 'pool_underwater_surface', value: 95, unit: 'm²' },
        { symbol: 'grain_specific_surface', value: 600, unit: 'm²/m³' },
      ],
    });
    expect(state.kind).toBe('computed');
    if (state.kind === 'computed') {
      expect(state.value).toBeCloseTo(7.9166, 2);
      expect(Math.round(state.value)).toBe(8); // PDF "approx. 8 m³"
    }
    // 2b: grain 4-8 → 1200 m²/m³ → ≈4 m³
    const state2 = evaluateFormula({
      equationId: 'b722809a-24c4-4c2d-8e8c-ea65a65a7e49',
      formula: EQ_03,
      inputSymbols: ['pool_underwater_surface', 'grain_specific_surface'],
      outputSymbol: 'filter_volume_required',
      inputs: [
        { symbol: 'pool_underwater_surface', value: 95, unit: 'm²' },
        { symbol: 'grain_specific_surface', value: 1200, unit: 'm²/m³' },
      ],
    });
    expect(state2.kind).toBe('computed');
    if (state2.kind === 'computed') expect(Math.round(state2.value)).toBe(4);
  });

  // ── EQ-02 filter_colonized_surface_actual = grain_specific_surface * F_filter * h_filter
  //    PDF Example 1: 600 × 15 × 0.7 = 6300 m²
  it('EQ-02 — evaluator matches PDF Example 1 (600×15×0.7 = 6300 m²)', async () => {
    const { evaluateFormula } = await import('@/lib/eval/formula');
    const state = evaluateFormula({
      equationId: 'e56fc10a-de59-4b62-af9b-bbfa6bc012b4',
      formula: EQ_02,
      inputSymbols: ['grain_specific_surface', 'F_filter', 'h_filter'],
      outputSymbol: 'filter_colonized_surface_actual',
      inputs: [
        { symbol: 'grain_specific_surface', value: 600, unit: 'm²/m³' },
        { symbol: 'F_filter', value: 15, unit: 'm²' },
        { symbol: 'h_filter', value: 0.7, unit: 'm' },
      ],
    });
    expect(state.kind).toBe('computed');
    if (state.kind === 'computed') expect(state.value).toBeCloseTo(6300, 6);
  });

  it('EQ-02 — with F_filter/h_filter absent the engine reports manual_required (residue)', async () => {
    const { evaluateFormula } = await import('@/lib/eval/formula');
    const state = evaluateFormula({
      equationId: 'e56fc10a-de59-4b62-af9b-bbfa6bc012b4',
      formula: EQ_02,
      inputSymbols: ['grain_specific_surface', 'F_filter', 'h_filter'],
      outputSymbol: 'filter_colonized_surface_actual',
      inputs: [{ symbol: 'grain_specific_surface', value: 600, unit: 'm²/m³' }],
    });
    expect(state.kind).toBe('manual_required');
    if (state.kind === 'manual_required') {
      expect(state.missing).toContain('F_filter');
      expect(state.missing).toContain('h_filter');
    }
  });

  // ── EQ-01 filter_colonized_surface_actual >= 50 * pool_underwater_surface
  //    output_symbol is boolean filter_50x_rule_met, but rhs() strips the LHS and
  //    returns the numeric threshold. PDF Example 2: 95 × 50 = 4750.
  it('EQ-01 FINDING — inequality-as-producer returns numeric threshold (4750), not boolean', async () => {
    const { evaluateFormula } = await import('@/lib/eval/formula');
    const state = evaluateFormula({
      equationId: '0a875bd8-1e8f-47f2-9a38-62396ea73c70',
      formula: EQ_01,
      inputSymbols: ['pool_underwater_surface'],
      outputSymbol: 'filter_50x_rule_met',
      inputs: [{ symbol: 'pool_underwater_surface', value: 95, unit: 'm²' }],
    });
    expect(state.kind).toBe('computed');
    if (state.kind === 'computed') {
      // The engine returns the RHS threshold, matching the PDF "95 × 50 = 4750 m²",
      // NOT a boolean — proving output_symbol (boolean) can never be produced.
      expect(state.value).toBe(4750);
    }
  });

  // ── REQ-22 (50× rule) — depends on the boolean EQ-01 cannot produce ──────────
  it('REQ-22 PASS/FAIL/PENDING through the real evaluator', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_22, (s) => (s === 'filter_50x_rule_met' ? true : undefined)).kind).toBe('pass');
    expect(evaluateCondition(REQ_22, (s) => (s === 'filter_50x_rule_met' ? false : undefined)).kind).toBe('fail');
    const pending = evaluateCondition(REQ_22, () => undefined);
    expect(pending.kind).toBe('pending');
    if (pending.kind === 'pending') expect(pending.missingSymbols).toContain('filter_50x_rule_met');
  });

  // ── REQ-30 (aerobic filtration mandated) — real save + real evaluator ────────
  it('REQ-30 PASS — aerobic flag true persists and fires pass', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws10();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['aerobic_filtration_confirmed']]: { type: 'boolean', value: true } },
    });
    expect(res.ok).toBe(true);
    const [row] = await harness.sql<{ value_boolean: boolean | null }[]>`
      SELECT value_boolean FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws.fieldIds['aerobic_filtration_confirmed']}`;
    expect(row?.value_boolean).toBe(true);
    expect(evaluateCondition(REQ_30, (s) => (s === 'aerobic_filtration_confirmed' ? true : undefined)).kind).toBe('pass');
  });

  it('REQ-30 FAIL — aerobic flag false fires fail', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_30, (s) => (s === 'aerobic_filtration_confirmed' ? false : undefined)).kind).toBe('fail');
  });
});
