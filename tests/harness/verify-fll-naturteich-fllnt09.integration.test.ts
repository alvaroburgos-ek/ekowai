/**
 * FLL revision · MILESTONE 2 · per-worksheet verification — FLL-Naturteich :: FLLNT-09
 * (Hydrobotanisches System – Bemessung / hydrobotanical system sizing).
 *
 * FLLNT-09 has 0 equations and 7 block gates on prod:
 *   REQ-08 (P-binding stage for slow filter), REQ-19 (hydrobotanical Tab.10),
 *   REQ-20 (substrate filter slow Tab.11), REQ-21 (substrate filter quick Tab.12),
 *   REQ-23 (water circulation attestation §10.3), REQ-24 (phys/chem supplementary
 *   only §10.2.5), REQ-33 (overflow weir splash-water 150 l/m² §10.3.1).
 *
 * Several gates consume symbols that physically live on sibling worksheets
 * (filter_flow_type/filter_* on FLLNT-10, regeneration_technique on FLLNT-03,
 * rigid_overflow_used/pool_underwater_surface on FLLNT-11/-06). The verify here
 * exercises each gate's condition grammar through the REAL evaluateCondition in a
 * pass + fail (+ pending where meaningful) state, and round-trips the 5 local
 * FLLNT-09 fields through the REAL saveWorksheet path.
 *
 * Conditions are verbatim from prod compliance_requirements (FLLNT-09).
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f9';

// ── conditions verbatim from prod (FLLNT-09) ────────────────────────────────
const REQ_08 = "if filter_flow_type == 'slow' then p_binding_required == true";
const REQ_19 = 'hydrobot_grain_size_max <= 8 AND hydrobot_feed_rate <= 5 AND (IF hydrobot_type == submergent THEN (hydrobot_water_column >= 80 AND hydrobot_substrate_thickness >= 10 AND hydrobot_substrate_thickness <= 20)) AND (IF hydrobot_type == emersed THEN (hydrobot_water_column >= 10 AND hydrobot_water_column <= 50 AND hydrobot_substrate_thickness >= 10 AND hydrobot_substrate_thickness <= 30))';
const REQ_20 = '(IF filter_flow_direction IN {vertical_continuous_overflow, vertical_no_overflow} THEN (filter_layer_thickness >= 40 AND filter_grain_size_max <= 16 AND filter_substrate_oversize_pct <= 15 AND filter_substrate_elutriated_pct <= 2 AND filter_frost_resistance == true AND filter_layer_tolerance_pct <= 10 AND filter_kf >= 0.0001)) AND (IF filter_flow_direction == vertical_continuous_overflow THEN (filter_water_column >= 10 AND filter_feed_rate_slow_qmax <= 5)) AND (IF filter_flow_direction == vertical_no_overflow THEN filter_feed_rate_slow_qmax <= 8)';
const REQ_21 = 'IF filter_flow_direction IN {vertical_continuous_overflow,vertical_no_overflow} THEN (filter_layer_thickness >= 50 AND filter_grain_size_max <= 32 AND filter_substrate_oversize_pct <= 15 AND filter_substrate_elutriated_pct <= 0.5 AND filter_frost_resistance == true AND filter_layer_tolerance_pct <= 10 AND filter_kf >= 0.001 AND filter_feed_rate_quick_qmin >= 15)';
const REQ_23 = 'attest_fllnt_09_req_23 == True';
const REQ_24 = 'IF physical_chemical_used == true THEN NOT (regeneration_technique IN {physical_chemical})';
const REQ_33 = 'IF rigid_overflow_used == true THEN splash_water_tank_volume >= 150 * pool_underwater_surface';

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

function ws09() {
  return fixture.worksheets['FLLNT-09'];
}
async function numPersisted(symbol: string): Promise<string | null> {
  const [row] = await harness.sql<{ value_number: string | null }[]>`
    SELECT value_number FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws09().fieldIds[symbol]}`;
  return row?.value_number ?? null;
}
async function enumPersisted(symbol: string): Promise<string | null> {
  const [row] = await harness.sql<{ value_enum: string | null }[]>`
    SELECT value_enum FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws09().fieldIds[symbol]}`;
  return row?.value_enum ?? null;
}

describe('FLLNT-09 — real saveWorksheet + real evaluateCondition (0 eq, 7 gates)', () => {
  it('exposes FLLNT-09 with 0 equations and 7 gates', async () => {
    const sql = harness.sql;
    const ws = ws09();
    expect(ws).toBeTruthy();
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    expect(e).toBe(0);
    expect(c).toBe(7);
  });

  // ── local field persistence through the REAL save path ────────────────────
  it('hydrobot_type enum persists (submergent) via saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = ws09();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['hydrobot_type']]: { type: 'enum', value: 'submergent' } },
    });
    expect(res.ok).toBe(true);
    expect(await enumPersisted('hydrobot_type')).toBe('submergent');
  });

  it('hydrobot number fields persist (water column 90, substrate 15, grain 8, feed 5)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = ws09();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['hydrobot_water_column']]: { type: 'number', value: 90 },
        [ws.fieldIds['hydrobot_substrate_thickness']]: { type: 'number', value: 15 },
        [ws.fieldIds['hydrobot_grain_size_max']]: { type: 'number', value: 8 },
        [ws.fieldIds['hydrobot_feed_rate']]: { type: 'number', value: 5 },
      },
    });
    expect(res.ok).toBe(true);
    expect(Number(await numPersisted('hydrobot_water_column'))).toBe(90);
    expect(Number(await numPersisted('hydrobot_substrate_thickness'))).toBe(15);
    expect(Number(await numPersisted('hydrobot_grain_size_max'))).toBe(8);
    expect(Number(await numPersisted('hydrobot_feed_rate'))).toBe(5);
  });

  // ── REQ-19 hydrobotanical Tab.10 ──────────────────────────────────────────
  it('REQ-19 PASS submergent — grain 8, feed 5, column 90, substrate 15 (Tab.10)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const good: Record<string, number | string> = {
      hydrobot_grain_size_max: 8, hydrobot_feed_rate: 5, hydrobot_type: 'submergent',
      hydrobot_water_column: 90, hydrobot_substrate_thickness: 15,
    };
    expect(evaluateCondition(REQ_19, (s) => good[s]).kind).toBe('pass');
  });

  it('REQ-19 FAIL submergent — column 70 < 80 fails (Tab.10 ≥80cm)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const bad: Record<string, number | string> = {
      hydrobot_grain_size_max: 8, hydrobot_feed_rate: 5, hydrobot_type: 'submergent',
      hydrobot_water_column: 70, hydrobot_substrate_thickness: 15,
    };
    expect(evaluateCondition(REQ_19, (s) => bad[s]).kind).toBe('fail');
  });

  it('REQ-19 PASS emersed — column 30 in [10,50], substrate 25 in [10,30]', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const good: Record<string, number | string> = {
      hydrobot_grain_size_max: 6, hydrobot_feed_rate: 4, hydrobot_type: 'emersed',
      hydrobot_water_column: 30, hydrobot_substrate_thickness: 25,
    };
    expect(evaluateCondition(REQ_19, (s) => good[s]).kind).toBe('pass');
  });

  it('REQ-19 FAIL — grain 10 > 8 fails (Tab.10 ≤8mm)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const bad: Record<string, number | string> = {
      hydrobot_grain_size_max: 10, hydrobot_feed_rate: 5, hydrobot_type: 'submergent',
      hydrobot_water_column: 90, hydrobot_substrate_thickness: 15,
    };
    expect(evaluateCondition(REQ_19, (s) => bad[s]).kind).toBe('fail');
  });

  it('REQ-19 PENDING — no inputs reported pending (not vacuous)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const v = evaluateCondition(REQ_19, () => undefined);
    expect(v.kind).toBe('pending');
  });

  // ── REQ-20 substrate filter slow Tab.11 ───────────────────────────────────
  it('REQ-20 PASS continuous overflow — all Tab.11 limits met', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const good: Record<string, number | string | boolean> = {
      filter_flow_direction: 'vertical_continuous_overflow',
      filter_layer_thickness: 45, filter_grain_size_max: 16, filter_substrate_oversize_pct: 10,
      filter_substrate_elutriated_pct: 2, filter_frost_resistance: true, filter_layer_tolerance_pct: 10,
      filter_kf: 0.0002, filter_water_column: 12, filter_feed_rate_slow_qmax: 5,
    };
    expect(evaluateCondition(REQ_20, (s) => good[s]).kind).toBe('pass');
  });

  it('REQ-20 FAIL continuous overflow — Qmax 6 > 5 fails (Tab.11)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const bad: Record<string, number | string | boolean> = {
      filter_flow_direction: 'vertical_continuous_overflow',
      filter_layer_thickness: 45, filter_grain_size_max: 16, filter_substrate_oversize_pct: 10,
      filter_substrate_elutriated_pct: 2, filter_frost_resistance: true, filter_layer_tolerance_pct: 10,
      filter_kf: 0.0002, filter_water_column: 12, filter_feed_rate_slow_qmax: 6,
    };
    expect(evaluateCondition(REQ_20, (s) => bad[s]).kind).toBe('fail');
  });

  it('REQ-20 vacuous PASS horizontal — guard false, gate does not constrain (coverage gap)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    // horizontal is not in either guard set → all three guards vacuously pass.
    expect(evaluateCondition(REQ_20, (s) => (s === 'filter_flow_direction' ? 'horizontal' : undefined)).kind).toBe('pass');
  });

  // ── REQ-21 substrate filter quick Tab.12 ──────────────────────────────────
  it('REQ-21 PASS — all Tab.12 quick-flow limits met', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const good: Record<string, number | string | boolean> = {
      filter_flow_direction: 'vertical_no_overflow',
      filter_layer_thickness: 55, filter_grain_size_max: 32, filter_substrate_oversize_pct: 10,
      filter_substrate_elutriated_pct: 0.5, filter_frost_resistance: true, filter_layer_tolerance_pct: 10,
      filter_kf: 0.001, filter_feed_rate_quick_qmin: 15,
    };
    expect(evaluateCondition(REQ_21, (s) => good[s]).kind).toBe('pass');
  });

  it('REQ-21 FAIL — Qmin 12 < 15 fails (Tab.12 §10.2.3 Qmin≥15)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const bad: Record<string, number | string | boolean> = {
      filter_flow_direction: 'vertical_continuous_overflow',
      filter_layer_thickness: 55, filter_grain_size_max: 32, filter_substrate_oversize_pct: 10,
      filter_substrate_elutriated_pct: 0.5, filter_frost_resistance: true, filter_layer_tolerance_pct: 10,
      filter_kf: 0.001, filter_feed_rate_quick_qmin: 12,
    };
    expect(evaluateCondition(REQ_21, (s) => bad[s]).kind).toBe('fail');
  });

  // ── REQ-08 P-binding for slow filter ──────────────────────────────────────
  it('REQ-08 PASS — slow flow WITH p-binding required', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) =>
      s === 'filter_flow_type' ? 'slow' : s === 'p_binding_required' ? true : undefined;
    expect(evaluateCondition(REQ_08, lk).kind).toBe('pass');
  });

  it('REQ-08 FAIL — slow flow WITHOUT p-binding', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) =>
      s === 'filter_flow_type' ? 'slow' : s === 'p_binding_required' ? false : undefined;
    expect(evaluateCondition(REQ_08, lk).kind).toBe('fail');
  });

  it('REQ-08 vacuous PASS — quick flow, guard false', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) => (s === 'filter_flow_type' ? 'quick' : undefined);
    expect(evaluateCondition(REQ_08, lk).kind).toBe('pass');
  });

  // ── REQ-24 phys/chem supplementary only ───────────────────────────────────
  it('REQ-24 PASS — phys/chem used but regeneration_technique is biological', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) =>
      s === 'physical_chemical_used' ? true : s === 'regeneration_technique' ? 'substrate_filter_slow' : undefined;
    expect(evaluateCondition(REQ_24, lk).kind).toBe('pass');
  });

  it('REQ-24 FAIL — phys/chem used AND it IS the primary regeneration technique', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) =>
      s === 'physical_chemical_used' ? true : s === 'regeneration_technique' ? 'physical_chemical' : undefined;
    expect(evaluateCondition(REQ_24, lk).kind).toBe('fail');
  });

  it('REQ-24 vacuous PASS — phys/chem not used', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) => (s === 'physical_chemical_used' ? false : undefined);
    expect(evaluateCondition(REQ_24, lk).kind).toBe('pass');
  });

  // ── REQ-33 splash-water 150 l/m² ──────────────────────────────────────────
  it('REQ-33 PASS — rigid overflow, tank 3000 l >= 150 * 20 m²', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) =>
      s === 'rigid_overflow_used' ? true : s === 'splash_water_tank_volume' ? 3000 : s === 'pool_underwater_surface' ? 20 : undefined;
    expect(evaluateCondition(REQ_33, lk).kind).toBe('pass');
  });

  it('REQ-33 FAIL — rigid overflow, tank 2000 l < 150 * 20 m² (=3000)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) =>
      s === 'rigid_overflow_used' ? true : s === 'splash_water_tank_volume' ? 2000 : s === 'pool_underwater_surface' ? 20 : undefined;
    expect(evaluateCondition(REQ_33, lk).kind).toBe('fail');
  });

  it('REQ-33 vacuous PASS — no rigid overflow, guard false', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const lk = (s: string) => (s === 'rigid_overflow_used' ? false : undefined);
    expect(evaluateCondition(REQ_33, lk).kind).toBe('pass');
  });

  // ── REQ-23 water circulation attestation ──────────────────────────────────
  it('REQ-23 PASS — attestation true', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_23, (s) => (s === 'attest_fllnt_09_req_23' ? true : undefined)).kind).toBe('pass');
  });

  it('REQ-23 FAIL — attestation false', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_23, (s) => (s === 'attest_fllnt_09_req_23' ? false : undefined)).kind).toBe('fail');
  });
});
