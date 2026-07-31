/**
 * FLL-Naturteich :: FLLNT-02 (Standortanalyse & Untergrundverhältnisse)
 * EXHAUSTIVE per-worksheet verification through the REAL saveWorksheet path.
 *
 * FLLNT-02 carries 0 equations and exactly 1 block-severity compliance
 * requirement (REQ-05 `operating_manual_provided == true`), so there is no
 * computational chain to persist a derived value. Instead we:
 *   1. Boot a disposable embedded Postgres and seed the FULL FLL-Naturteich
 *      standard (mirrors prod topology).
 *   2. Drive the REAL saveWorksheet on the FLLNT-02 instance to persist a
 *      boolean input (operating_manual_provided) — exercising the genuine
 *      save/UPSERT path, not a hand-rolled INSERT.
 *   3. Read the value back and evaluate the REQ-05 gate against the REAL
 *      condition evaluator in BOTH a fail state (false) and a pass state (true).
 *
 * This proves the gate is fireable (not vacuous/dead) and that the worksheet's
 * only persisted input round-trips through saveWorksheet.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllNaturteich, type SeededFllNaturteichFixture } from './seed-fll-naturteich';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const USER_ID = '00000000-0000-4000-8000-0000000000f2';

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

describe('FLLNT-02 — real saveWorksheet round-trip + REQ-05 gate', () => {
  it('persists operating_manual_provided through the REAL saveWorksheet path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const instanceId = fixture.instanceIdByCode['FLLNT-02'];
    const omField = fixture.fieldIdByKey['FLLNT-02:operating_manual_provided'];
    expect(instanceId).toBeTruthy();
    expect(omField).toBeTruthy();

    const save = await saveWorksheet({
      instanceId,
      values: { [omField]: { type: 'boolean', value: true } },
    });
    expect(save.ok).toBe(true);

    const [row] = await harness.sql<{ value_boolean: boolean | null }[]>`
      SELECT value_boolean FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${omField}`;
    expect(row?.value_boolean).toBe(true);
  });

  it('REQ-05 gate fires PASS and FAIL against the real evaluator', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const CONDITION = 'operating_manual_provided == true';

    const failState = (sym: string) =>
      sym === 'operating_manual_provided' ? false : undefined;
    const passState = (sym: string) =>
      sym === 'operating_manual_provided' ? true : undefined;

    const fail = evaluateCondition(CONDITION, failState);
    const pass = evaluateCondition(CONDITION, passState);

    expect(fail.kind).toBe('fail');
    expect(pass.kind).toBe('pass');
  });
});
