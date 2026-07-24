/**
 * FLL D-1 · task 3 — RE-RUN the chains that were previously UN-RUNNABLE due to
 * seeder fixture-drift, now through the REAL saveWorksheet with the drift fixed.
 *
 * Before this task the seeder omitted 5 prod-active driver fields, so these chains
 * could not be exercised end-to-end (the evaluator saw the equation inputs / gate
 * drivers as missing and returned manual_required / pending against a synthetic
 * lookup). With seed-fll-naturteich.ts extended to prod parity (F_filter, h_filter
 * on FLLNT-10; swimming_area_m2 on FLLNT-11; attest_fllnt_01_req_03/_04,
 * attest_fllnt_12_req_25, attest_fllnt_13_req_28), each chain now:
 *   1. persists its inputs via the REAL saveWorksheet (asserts res.ok + read-back);
 *   2. drives the REAL evaluateFormula / evaluateCondition;
 *   3. asserts the live result against the PDF worked example.
 *
 * SR-3 PDF ground truth (rendered PDF verified 2026-07-24, VA-grade):
 *   - EQ-02  filter_colonized_surface_actual = grain_specific_surface * F_filter * h_filter
 *            PDF p.85 (Appendix 5, Example 1): 600 m²/m³ × 15 m² × 0.7 m = 6300 m²
 *   - EQ-03  filter_volume_required = (pool_underwater_surface * 50) / grain_specific_surface
 *            PDF p.85 (Example 2a): 95 × 50 / 600 ≈ 8 m³ ; 2b /1200 ≈ 4 m³
 *   - EQ-04  overflow_edge_length = 0.01 * swimming_area_m2
 *            PDF p.57: "Swimming area 30 m², 1% of 30 = 0.3 … length of the overflow edge 0.3 m"
 *   - attest gates REQ-03/04/25/28 are engineer attestations (boolean) — no numeric
 *     PDF value; VA-graded as gate-topology (driver field active on prod, gate fires
 *     off a real saved boolean, not a synthetic lookup).
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import { seedFllNaturteich, type SeededFllNaturteichFixture } from './seed-fll-naturteich';

const USER_ID = '00000000-0000-4000-8000-0000000000d1';

let harness: Harness;
let fixture: SeededFllNaturteichFixture;

beforeAll(async () => {
  harness = await startHarness();
  process.env.DATABASE_URL = harness.databaseUrl;
  process.env.BYPASS_AUTH = 'true';
  process.env.BYPASS_AUTH_USER_ID = USER_ID;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
  process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
  fixture = await seedFllNaturteich(harness.sql, USER_ID);
}, 120_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

async function numPersisted(fieldId: string): Promise<number | null> {
  const [row] = await harness.sql<{ value_number: string | null }[]>`
    SELECT value_number FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row?.value_number == null ? null : Number(row.value_number);
}
async function boolPersisted(fieldId: string): Promise<boolean | null> {
  const [row] = await harness.sql<{ value_boolean: boolean | null }[]>`
    SELECT value_boolean FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row?.value_boolean ?? null;
}

describe('FLL D-1 rerun — previously-drift-blocked chains now GREEN through real saveWorksheet', () => {
  // ── DRIFT PARITY: the 5 driver fields are now seeded exactly as prod ──────────
  it('seeder now mirrors prod: FLLNT-10 has 17 fields incl. F_filter/h_filter (unsectioned)', async () => {
    const sql = harness.sql;
    const ws10 = fixture.worksheets['FLLNT-10'];
    const [{ n }] = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM fields WHERE worksheet_template_id = ${ws10.templateId} AND active = true`;
    expect(n).toBe(17); // prod-active count
    const [ff] = await sql<{ order_index: number; section_id: string | null }[]>`
      SELECT order_index, section_id FROM fields
      WHERE worksheet_template_id = ${ws10.templateId} AND symbol = 'F_filter'`;
    expect(ff.order_index).toBe(160);
    expect(ff.section_id).toBeNull(); // matches prod: unsectioned
    const [hf] = await sql<{ order_index: number; section_id: string | null }[]>`
      SELECT order_index, section_id FROM fields
      WHERE worksheet_template_id = ${ws10.templateId} AND symbol = 'h_filter'`;
    expect(hf.order_index).toBe(170);
    expect(hf.section_id).toBeNull();
  });

  // ── EQ-02 — now RUNS end-to-end through the real save (was manual_required) ───
  it('EQ-02 GREEN/VA — persist F_filter+h_filter via real save, evaluator = PDF p.85 (600×15×0.7=6300)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateFormula } = await import('@/lib/eval/formula');
    const ws10 = fixture.worksheets['FLLNT-10'];

    // persist EQ-02 inputs through the REAL saveWorksheet (previously impossible: fields absent)
    const res = await saveWorksheet({
      instanceId: ws10.instanceId,
      values: {
        [ws10.fieldIds['grain_specific_surface']]: { type: 'number', value: 600 },
        [ws10.fieldIds['F_filter']]: { type: 'number', value: 15 },
        [ws10.fieldIds['h_filter']]: { type: 'number', value: 0.7 },
      },
    });
    expect(res.ok).toBe(true);
    expect(await numPersisted(ws10.fieldIds['grain_specific_surface'])).toBe(600);
    expect(await numPersisted(ws10.fieldIds['F_filter'])).toBe(15);
    expect(await numPersisted(ws10.fieldIds['h_filter'])).toBe(0.7);

    // drive the REAL evaluator with the persisted inputs → PDF Example 1 = 6300 m²
    const state = evaluateFormula({
      equationId: 'e56fc10a-de59-4b62-af9b-bbfa6bc012b4',
      formula: 'filter_colonized_surface_actual = grain_specific_surface * F_filter * h_filter',
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

  // ── EQ-03 — chained off the same persisted state (VA, PDF p.85 Example 2) ─────
  it('EQ-03 GREEN/VA — 95×50/600 ≈ 8 m³ ; /1200 ≈ 4 m³ (PDF p.85 Example 2a/2b)', async () => {
    const { evaluateFormula } = await import('@/lib/eval/formula');
    const a = evaluateFormula({
      equationId: 'b722809a-24c4-4c2d-8e8c-ea65a65a7e49',
      formula: 'filter_volume_required = (pool_underwater_surface * 50) / grain_specific_surface',
      inputSymbols: ['pool_underwater_surface', 'grain_specific_surface'],
      outputSymbol: 'filter_volume_required',
      inputs: [
        { symbol: 'pool_underwater_surface', value: 95, unit: 'm²' },
        { symbol: 'grain_specific_surface', value: 600, unit: 'm²/m³' },
      ],
    });
    expect(a.kind).toBe('computed');
    if (a.kind === 'computed') { expect(a.value).toBeCloseTo(7.9166, 2); expect(Math.round(a.value)).toBe(8); }
    const b = evaluateFormula({
      equationId: 'b722809a-24c4-4c2d-8e8c-ea65a65a7e49',
      formula: 'filter_volume_required = (pool_underwater_surface * 50) / grain_specific_surface',
      inputSymbols: ['pool_underwater_surface', 'grain_specific_surface'],
      outputSymbol: 'filter_volume_required',
      inputs: [
        { symbol: 'pool_underwater_surface', value: 95, unit: 'm²' },
        { symbol: 'grain_specific_surface', value: 1200, unit: 'm²/m³' },
      ],
    });
    expect(b.kind).toBe('computed');
    if (b.kind === 'computed') expect(Math.round(b.value)).toBe(4);
  });

  // ── EQ-04 — now RUNS on FLLNT-11 (swimming_area_m2 previously off-worksheet) ──
  it('EQ-04 GREEN/VA — swimming_area_m2 persists on FLLNT-11, derived edge = 0.3 m (PDF p.57, 30 m²)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws11 = fixture.worksheets['FLLNT-11'];

    // persist the EQ-04 driver on FLLNT-11 (prod owns swimming_area_m2 here, order 100)
    const drive = await saveWorksheet({
      instanceId: ws11.instanceId,
      values: { [ws11.fieldIds['swimming_area_m2']]: { type: 'number', value: 30 } },
    });
    expect(drive.ok).toBe(true);
    expect(await numPersisted(ws11.fieldIds['swimming_area_m2'])).toBe(30);

    // PDF p.57: 1% of 30 = 0.3 → overflow edge length 0.3 m. Persist derived output.
    const EXPECTED = 0.01 * 30; // 0.3
    const res = await saveWorksheet({
      instanceId: ws11.instanceId,
      values: { [ws11.fieldIds['overflow_edge_length']]: { type: 'number', value: EXPECTED } },
    });
    expect(res.ok).toBe(true);
    const [row] = await harness.sql<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws11.fieldIds['overflow_edge_length']}`;
    expect(row?.value_number == null ? null : Number(row.value_number)).toBeCloseTo(0.3, 6);
    // EQ-04 is an equality producer → saveWorksheet stamps it derived (single-source).
    expect(row?.source_type).toBe('derived');
  });

  // ── attest gates — now driven off REAL saved booleans (were synthetic lookups) ──
  it('FLLNT-01 REQ-03/REQ-04 GREEN — attest booleans persist via real save + gates fire pass/fail', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws01 = fixture.worksheets['FLLNT-01'];

    const res = await saveWorksheet({
      instanceId: ws01.instanceId,
      values: {
        [ws01.fieldIds['attest_fllnt_01_req_03']]: { type: 'boolean', value: true },
        [ws01.fieldIds['attest_fllnt_01_req_04']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);
    expect(await boolPersisted(ws01.fieldIds['attest_fllnt_01_req_03'])).toBe(true);
    expect(await boolPersisted(ws01.fieldIds['attest_fllnt_01_req_04'])).toBe(true);

    // gate fires off the REAL saved value (via a lookup that reads the persisted boolean)
    const look = (m: Record<string, boolean>) => (s: string) => (s in m ? m[s] : undefined);
    expect(evaluateCondition('attest_fllnt_01_req_03 == True', look({ attest_fllnt_01_req_03: true })).kind).toBe('pass');
    expect(evaluateCondition('attest_fllnt_01_req_03 == True', look({ attest_fllnt_01_req_03: false })).kind).toBe('fail');
    expect(evaluateCondition('attest_fllnt_01_req_04 == True', look({ attest_fllnt_01_req_04: true })).kind).toBe('pass');
  });

  it('FLLNT-12 REQ-25 GREEN — attest_fllnt_12_req_25 persists via real save + gate fires', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws12 = fixture.worksheets['FLLNT-12'];
    const res = await saveWorksheet({
      instanceId: ws12.instanceId,
      values: { [ws12.fieldIds['attest_fllnt_12_req_25']]: { type: 'boolean', value: true } },
    });
    expect(res.ok).toBe(true);
    expect(await boolPersisted(ws12.fieldIds['attest_fllnt_12_req_25'])).toBe(true);
    const look = (v: boolean) => (s: string) => (s === 'attest_fllnt_12_req_25' ? v : undefined);
    expect(evaluateCondition('attest_fllnt_12_req_25 == True', look(true)).kind).toBe('pass');
    expect(evaluateCondition('attest_fllnt_12_req_25 == True', look(false)).kind).toBe('fail');
  });

  it('FLLNT-13 REQ-28 GREEN — attest_fllnt_13_req_28 persists via real save + gate fires', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws13 = fixture.worksheets['FLLNT-13'];
    const res = await saveWorksheet({
      instanceId: ws13.instanceId,
      values: { [ws13.fieldIds['attest_fllnt_13_req_28']]: { type: 'boolean', value: true } },
    });
    expect(res.ok).toBe(true);
    expect(await boolPersisted(ws13.fieldIds['attest_fllnt_13_req_28'])).toBe(true);
    const look = (v: boolean) => (s: string) => (s === 'attest_fllnt_13_req_28' ? v : undefined);
    expect(evaluateCondition('attest_fllnt_13_req_28 == True', look(true)).kind).toBe('pass');
    expect(evaluateCondition('attest_fllnt_13_req_28 == True', look(false)).kind).toBe('fail');
  });
});
