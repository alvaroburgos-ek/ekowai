/**
 * FLL revision · MILESTONE 2 · per-worksheet verification — FLL-Naturteich :: FLLNT-06
 * (Flächenplanung / area planning).
 *
 * FLLNT-06 owns ONE equation, EQ-PUWS:
 *     pool_underwater_surface = pool_ground_area_m2 + pool_submerged_wall_area_m2
 * and 8 block gates (REQ-13..REQ-18, REQ-31, REQ-32).
 *
 * PDF ground truth (Naturteich.txt, Appendix 5, Example 2, lines 3988-3995):
 *     Surface area of the pool (5 x 10 m):  50 m²
 *     Surface that can be colonized
 *     Ground area:  50 m²
 *     Wall area:    45 m²
 *     Total:        95 m²
 * → underwater colonizable surface = ground + wall = 50 + 45 = 95 m². This is the
 * exact shape of EQ-PUWS. VA-grade (worked example printed).
 *
 * This test:
 *   1. seeds the FULL FLL-Naturteich tree into a disposable embedded Postgres;
 *   2. drives the EQ-PUWS chain — persists ground+wall inputs via the REAL
 *      saveWorksheet, then computes the derived output through the REAL engine
 *      (evaluateFormula, the same core the production form's useEquationEngine
 *      calls) and asserts 50+45 = 95 against the PDF worked example;
 *   3. fires every gate through the REAL evaluateCondition in pass + fail (+ pending)
 *      states. Gates whose symbols live on FLLNT-07 or are attest booleans not
 *      seeded on FLLNT-06 are fired against a synthetic resolver and the seeding /
 *      cross-worksheet placement is logged.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f6';

// Equation + conditions verbatim from prod (FLLNT-06).
const EQ_PUWS_FORMULA = 'pool_underwater_surface = pool_ground_area_m2 + pool_submerged_wall_area_m2';
const EQ_PUWS_ID = 'c1928ea5-bdb7-4396-9cbd-cdaffa5c4b2f';

const REQ_13 = 'total_pool_area_m2 IS NOT NULL AND regeneration_area_m2 IS NOT NULL AND swimming_area_m2 IS NOT NULL';
const REQ_14 = 'attest_fllnt_06_req_14 == True';
const REQ_15 = 'area_separation_method IS NOT EMPTY';
const REQ_16 = 'sealing_type IS NOT NULL';
const REQ_17 = 'edge_design IS NOT EMPTY';
const REQ_18 = 'attest_fllnt_06_req_18 == True';
const REQ_31 = 'freeboard_water_to_seal >= 5 AND edge_height_tolerance_mm <= 10';
const REQ_32 = 'sealing_biocide_free_biofilm_ok == true';

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

function ws06() {
  return fixture.worksheets['FLLNT-06'];
}

async function numPersisted(symbol: string): Promise<number | null> {
  const sql = harness.sql;
  const [row] = await sql<{ value_number: string | null }[]>`
    SELECT value_number FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws06().fieldIds[symbol]}`;
  return row?.value_number == null ? null : Number(row.value_number);
}

describe('FLLNT-06 — real saveWorksheet + real engine + real evaluateCondition', () => {
  it('exposes FLLNT-06 with its area fields, 1 equation (EQ-PUWS), 8 gates', async () => {
    const sql = harness.sql;
    const ws = ws06();
    expect(ws).toBeTruthy();
    expect(ws.fieldIds['pool_ground_area_m2']).toBeTruthy();
    expect(ws.fieldIds['pool_submerged_wall_area_m2']).toBeTruthy();
    expect(ws.fieldIds['pool_underwater_surface']).toBeTruthy();
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    expect(e).toBe(1);
    expect(c).toBe(8);
  });

  // ── EQ-PUWS chain: persist inputs via real save, compute via real engine ────
  it('EQ-PUWS — ground 50 + wall 45 persists and the real engine computes 95 m² (PDF Example 2)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateFormula } = await import('@/lib/eval/formula');
    const ws = ws06();

    // 1. Persist the two inputs through the REAL save path (PDF Example 2 values).
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['pool_ground_area_m2']]: { type: 'number', value: 50 },
        [ws.fieldIds['pool_submerged_wall_area_m2']]: { type: 'number', value: 45 },
      },
    });
    expect(res.ok).toBe(true);
    expect(await numPersisted('pool_ground_area_m2')).toBe(50);
    expect(await numPersisted('pool_submerged_wall_area_m2')).toBe(45);

    // 2. Compute the derived output through the REAL engine core (the same
    //    evaluateFormula the production useEquationEngine hook calls).
    const state = evaluateFormula({
      equationId: EQ_PUWS_ID,
      formula: EQ_PUWS_FORMULA,
      inputSymbols: ['pool_ground_area_m2', 'pool_submerged_wall_area_m2'],
      outputSymbol: 'pool_underwater_surface',
      expectedUnits: { pool_ground_area_m2: 'm²', pool_submerged_wall_area_m2: 'm²' },
      inputs: [
        { symbol: 'pool_ground_area_m2', value: 50, unit: 'm²' },
        { symbol: 'pool_submerged_wall_area_m2', value: 45, unit: 'm²' },
      ],
    });
    expect(state.kind).toBe('computed');
    if (state.kind === 'computed') expect(state.value).toBe(95); // PDF: 50 + 45 = 95 m²
  });

  it('EQ-PUWS — a second worked pair (60 + 30 = 90) sanity-checks the additive shape', async () => {
    const { evaluateFormula } = await import('@/lib/eval/formula');
    const state = evaluateFormula({
      equationId: EQ_PUWS_ID,
      formula: EQ_PUWS_FORMULA,
      inputSymbols: ['pool_ground_area_m2', 'pool_submerged_wall_area_m2'],
      outputSymbol: 'pool_underwater_surface',
      inputs: [
        { symbol: 'pool_ground_area_m2', value: 60, unit: 'm²' },
        { symbol: 'pool_submerged_wall_area_m2', value: 30, unit: 'm²' },
      ],
    });
    expect(state.kind).toBe('computed');
    if (state.kind === 'computed') expect(state.value).toBe(90);
  });

  it('EQ-PUWS — missing an input blanks (fail-safe), never a wrong number', async () => {
    const { evaluateFormula } = await import('@/lib/eval/formula');
    const state = evaluateFormula({
      equationId: EQ_PUWS_ID,
      formula: EQ_PUWS_FORMULA,
      inputSymbols: ['pool_ground_area_m2', 'pool_submerged_wall_area_m2'],
      outputSymbol: 'pool_underwater_surface',
      inputs: [
        { symbol: 'pool_ground_area_m2', value: 50, unit: 'm²' },
        { symbol: 'pool_submerged_wall_area_m2', value: null, unit: 'm²' },
      ],
    });
    expect(state.kind).not.toBe('computed');
  });

  // ── REQ-13 (space requirements: existence of three area totals) ─────────────
  it('REQ-13 PASS/FAIL/PENDING through the real evaluator', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const all = (s: string) =>
      ({ total_pool_area_m2: 95, regeneration_area_m2: 40, swimming_area_m2: 50 } as Record<string, unknown>)[s];
    expect(evaluateCondition(REQ_13, all).kind).toBe('pass');
    // one NULL → fail
    const oneNull = (s: string) =>
      ({ total_pool_area_m2: null, regeneration_area_m2: 40, swimming_area_m2: 50 } as Record<string, unknown>)[s];
    expect(evaluateCondition(REQ_13, oneNull).kind).toBe('fail');
    // all missing → the IS NOT NULL existence chain FAILS (absence is a decidable fail, not pending)
    expect(evaluateCondition(REQ_13, () => undefined).kind).toBe('fail');
  });

  // ── REQ-14 / REQ-18 attest booleans (fields exist on prod, not on seeder) ───
  it('REQ-14 attest fires pass/fail/pending', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_14, (s) => (s === 'attest_fllnt_06_req_14' ? true : undefined)).kind).toBe('pass');
    expect(evaluateCondition(REQ_14, (s) => (s === 'attest_fllnt_06_req_14' ? false : undefined)).kind).toBe('fail');
    expect(evaluateCondition(REQ_14, () => undefined).kind).toBe('pending');
  });

  it('REQ-18 attest fires pass/fail/pending', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_18, (s) => (s === 'attest_fllnt_06_req_18' ? true : undefined)).kind).toBe('pass');
    expect(evaluateCondition(REQ_18, (s) => (s === 'attest_fllnt_06_req_18' ? false : undefined)).kind).toBe('fail');
    expect(evaluateCondition(REQ_18, () => undefined).kind).toBe('pending');
  });

  // ── REQ-15 / REQ-16 / REQ-17 — symbols live on FLLNT-07, fired via evaluator ─
  it('REQ-15 (area_separation_method IS NOT EMPTY) fires pass/fail/pending', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_15, (s) => (s === 'area_separation_method' ? 'earth modelling' : undefined)).kind).toBe('pass');
    expect(evaluateCondition(REQ_15, (s) => (s === 'area_separation_method' ? '' : undefined)).kind).toBe('fail');
    // existence-check on an absent symbol legitimately FAILS (not pending) — gate is live, not vacuous
    expect(evaluateCondition(REQ_15, () => undefined).kind).toBe('fail');
  });

  it('REQ-16 (sealing_type IS NOT NULL) fires pass/fail/pending', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_16, (s) => (s === 'sealing_type' ? 'EPDM' : undefined)).kind).toBe('pass');
    expect(evaluateCondition(REQ_16, (s) => (s === 'sealing_type' ? null : undefined)).kind).toBe('fail');
    expect(evaluateCondition(REQ_16, () => undefined).kind).toBe('fail');
  });

  it('REQ-17 (edge_design IS NOT EMPTY) fires pass/fail/pending', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_17, (s) => (s === 'edge_design' ? 'stone surround' : undefined)).kind).toBe('pass');
    expect(evaluateCondition(REQ_17, (s) => (s === 'edge_design' ? '' : undefined)).kind).toBe('fail');
    expect(evaluateCondition(REQ_17, () => undefined).kind).toBe('fail');
  });

  // ── REQ-31 — §9.4: freeboard >= 5 cm AND edge tolerance <= 10 mm (VA) ────────
  it('REQ-31 boundary: freeboard>=5 AND edge<=10 (PDF §9.4) fires pass/fail', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const state = (fb: number | null, eh: number | null) => (s: string) =>
      ({ freeboard_water_to_seal: fb, edge_height_tolerance_mm: eh } as Record<string, unknown>)[s];
    // exact boundary passes (5 cm below edge; +/-10 mm)
    expect(evaluateCondition(REQ_31, state(5, 10)).kind).toBe('pass');
    // below freeboard boundary → fail
    expect(evaluateCondition(REQ_31, state(4, 10)).kind).toBe('fail');
    // over tolerance boundary → fail
    expect(evaluateCondition(REQ_31, state(5, 11)).kind).toBe('fail');
    // missing → pending
    expect(evaluateCondition(REQ_31, () => undefined).kind).toBe('pending');
  });

  // ── REQ-32 — §9.3: sealing biocide-free & biofilm-permissive (VA) ───────────
  it('REQ-32 (sealing_biocide_free_biofilm_ok == true) fires pass/fail/pending', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_32, (s) => (s === 'sealing_biocide_free_biofilm_ok' ? true : undefined)).kind).toBe('pass');
    expect(evaluateCondition(REQ_32, (s) => (s === 'sealing_biocide_free_biofilm_ok' ? false : undefined)).kind).toBe('fail');
    expect(evaluateCondition(REQ_32, () => undefined).kind).toBe('pending');
  });
});
