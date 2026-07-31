/**
 * FLL-Naturteich :: FLLNT-14 (Instandhaltung & Betrieb / Maintenance & operation)
 * EXHAUSTIVE per-worksheet verification through the REAL saveWorksheet path.
 *
 * FLLNT-14 carries 0 equations and exactly 1 block-severity compliance
 * requirement (REQ-27 `maintenance_contract_in_place == true`), so there is no
 * computational chain to persist a derived value. Instead we:
 *   1. Boot a disposable embedded Postgres and seed the FULL FLL-Naturteich
 *      standard (mirrors prod topology).
 *   2. Drive the REAL saveWorksheet on the FLLNT-14 instance to persist a
 *      boolean input (maintenance_contract_in_place) — exercising the genuine
 *      save/UPSERT path, not a hand-rolled INSERT.
 *   3. Read the value back and evaluate the REQ-27 gate against the REAL
 *      condition evaluator in a FAIL state (false), a PASS state (true) and a
 *      PENDING state (missing) — proving the gate is fireable, not vacuous/dead.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllNaturteich, type SeededFllNaturteichFixture } from './seed-fll-naturteich';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const USER_ID = '00000000-0000-4000-8000-0000000000e4';

let harness: Harness;
let fixture: SeededFllNaturteichFixture;

beforeAll(async () => {
  harness = await startHarness();
  // Point @/lib/db at the harness BEFORE it is dynamically imported below.
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

describe('FLLNT-14 — real saveWorksheet round-trip + REQ-27 gate', () => {
  it('exposes FLLNT-14 with its 3 maintenance fields and 0 equations', async () => {
    const ws = fixture.worksheets['FLLNT-14'];
    expect(ws).toBeTruthy();
    expect(fixture.fieldIdByKey['FLLNT-14:maintenance_contract_in_place']).toBeTruthy();
    expect(fixture.fieldIdByKey['FLLNT-14:inspection_frequency']).toBeTruthy();
    expect(fixture.fieldIdByKey['FLLNT-14:repair_provisions']).toBeTruthy();

    const eqs = await harness.sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    expect(eqs[0].n).toBe(0);
  });

  it('persists maintenance_contract_in_place through the REAL saveWorksheet path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const instanceId = fixture.instanceIdByCode['FLLNT-14'];
    const mcField = fixture.fieldIdByKey['FLLNT-14:maintenance_contract_in_place'];
    expect(instanceId).toBeTruthy();
    expect(mcField).toBeTruthy();

    const save = await saveWorksheet({
      instanceId,
      values: { [mcField]: { type: 'boolean', value: true } },
    });
    expect(save.ok).toBe(true);

    const [row] = await harness.sql<{ value_boolean: boolean | null }[]>`
      SELECT value_boolean FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${mcField}`;
    expect(row?.value_boolean).toBe(true);
  });

  it('also round-trips the two text inputs (inspection_frequency, repair_provisions)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const instanceId = fixture.instanceIdByCode['FLLNT-14'];
    const insField = fixture.fieldIdByKey['FLLNT-14:inspection_frequency'];
    const repField = fixture.fieldIdByKey['FLLNT-14:repair_provisions'];

    const save = await saveWorksheet({
      instanceId,
      values: {
        [insField]: { type: 'text', value: 'annually' },
        [repField]: { type: 'text', value: 'replace filter materials as needed' },
      },
    });
    expect(save.ok).toBe(true);

    const rows = await harness.sql<{ field_id: string; value_text: string | null }[]>`
      SELECT field_id, value_text FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id IN (${insField}, ${repField})`;
    const byId = Object.fromEntries(rows.map((r) => [r.field_id, r.value_text]));
    expect(byId[insField]).toBe('annually');
    expect(byId[repField]).toBe('replace filter materials as needed');
  });

  it('REQ-27 gate fires PASS, FAIL and PENDING against the real evaluator', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const CONDITION = 'maintenance_contract_in_place == true';

    const failState = (sym: string) =>
      sym === 'maintenance_contract_in_place' ? false : undefined;
    const passState = (sym: string) =>
      sym === 'maintenance_contract_in_place' ? true : undefined;
    const pendingState = (_sym: string) => undefined;

    const fail = evaluateCondition(CONDITION, failState);
    const pass = evaluateCondition(CONDITION, passState);
    const pending = evaluateCondition(CONDITION, pendingState);

    expect(fail.kind).toBe('fail');
    expect(pass.kind).toBe('pass');
    expect(pending.kind).toBe('pending');
    if (pending.kind === 'pending') {
      expect(pending.missingSymbols).toContain('maintenance_contract_in_place');
    }
  });
});
