/**
 * FLL-Naturteich :: FLLNT-12 (Pflanzplan / Plants & Planting Plan) verification.
 *
 * Bootstraps a disposable embedded Postgres, points DATABASE_URL at it BEFORE
 * @/lib/db loads (top-level await), seeds the full FLL-Naturteich standard, then:
 *   - drives FLLNT-12 through the REAL saveWorksheet server action and asserts the
 *     6 data-collection fields persist to project_parameters (data_collection
 *     archetype: no equations → the "chain" is field persistence);
 *   - exercises the single block gate REQ-25 (`attest_fllnt_12_req_25 == True`)
 *     through the real compliance evaluator in pass / fail / pending states.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllNaturteich, type SeededFllNaturteichFixture } from './seed-fll-naturteich';

const USER_ID = '00000000-0000-4000-8000-00000000c012';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: SeededFllNaturteichFixture = await seedFllNaturteich(harness.sql, USER_ID);

const { describe, it, expect, afterAll } = await import('vitest');
const { saveWorksheet } = await import('@/lib/actions/worksheet');
const { evaluateCondition } = await import('@/lib/compliance/evaluate');

afterAll(async () => {
  if (harness) await harness.stop();
});

const F = (sym: string) => fixture.fieldIdByKey[`FLLNT-12:${sym}`];

describe('FLLNT-12 saveWorksheet chain (data_collection)', () => {
  it('persists all 6 fields through the real saveWorksheet path', async () => {
    const instanceId = fixture.instanceIdByCode['FLLNT-12'];
    const res = await saveWorksheet({
      instanceId,
      values: {
        [F('plant_species_list')]: { type: 'json', value: { rows: [{ species: 'Iris pseudacorus', zone: 'marsh' }] } },
        [F('pre_maturity_care_provided')]: { type: 'boolean', value: true },
        [F('plant_density_submerged_per_m2')]: { type: 'number', value: 8 },
        [F('plant_density_marsh_small_per_m2')]: { type: 'number', value: 4 },
        [F('plant_density_marsh_medium_per_m2')]: { type: 'number', value: 6 },
        [F('planting_completion_date')]: { type: 'date', value: '2026-05-15' },
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.saved).toBe(6);

    // Read back the persisted values from project_parameters.
    const rows = await harness.sql<{ symbol: string; value_number: string | null; value_boolean: boolean | null; value_date: string | null; value_json: unknown }[]>`
      SELECT f.symbol, pp.value_number, pp.value_boolean, pp.value_date::text AS value_date, pp.value_json
      FROM project_parameters pp
      JOIN fields f ON f.id = pp.field_id
      WHERE pp.project_id = ${fixture.projectId}
        AND f.worksheet_template_id = ${fixture.worksheets['FLLNT-12'].templateId}
      ORDER BY f.symbol`;
    const bySym = Object.fromEntries(rows.map((r) => [r.symbol, r]));
    expect(Number(bySym['plant_density_submerged_per_m2'].value_number)).toBe(8);
    expect(Number(bySym['plant_density_marsh_small_per_m2'].value_number)).toBe(4);
    expect(Number(bySym['plant_density_marsh_medium_per_m2'].value_number)).toBe(6);
    expect(bySym['pre_maturity_care_provided'].value_boolean).toBe(true);
    expect(bySym['planting_completion_date'].value_date).toBe('2026-05-15');
    expect(bySym['plant_species_list'].value_json).toBeTruthy();
  });
});

describe('FLLNT-12 gate REQ-25 (attest_fllnt_12_req_25 == True)', () => {
  const COND = 'attest_fllnt_12_req_25 == True';
  it('PASS state: attest = true', () => {
    const r = evaluateCondition(COND, (s) => (s === 'attest_fllnt_12_req_25' ? true : undefined));
    expect(r.kind).toBe('pass');
  });
  it('FAIL state: attest = false', () => {
    const r = evaluateCondition(COND, (s) => (s === 'attest_fllnt_12_req_25' ? false : undefined));
    expect(r.kind).toBe('fail');
  });
  it('PENDING state: attest missing', () => {
    const r = evaluateCondition(COND, () => undefined);
    expect(r.kind).toBe('pending');
  });
});
