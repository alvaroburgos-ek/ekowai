/**
 * FLL revision · MILESTONE 2 · per-worksheet verification — FLL-GAR-02
 * (Anwendungsbereich & Abgrenzung / Scope & Delimitation).
 *
 * FLL-GAR-02 has NO equations (it is a pure scoping worksheet), so there is no
 * computational chain to drive. Its one machine-evaluable artifact is the block
 * gate REQ-01 (`gewaesser_in_scope == true`, clause Sec.1.1). This test:
 *   1. seeds the FULL FLL-GAR-2023 tree into a disposable embedded Postgres via
 *      the generic seeder (seed-fll-gar.ts);
 *   2. drives the boolean field `gewaesser_in_scope` through the REAL saveWorksheet
 *      (imported, run against the embedded PG) in BOTH a PASS state (true) and a
 *      FAIL state (false);
 *   3. reads the persisted value back and evaluates REQ-01 with the REAL compliance
 *      evaluator (evaluateCondition) to prove the gate FIRES both ways (not vacuous).
 *
 * This mirrors the 138 discipline used by the Q_NOT test: both the persist
 * (saveWorksheet) and the gate evaluation (evaluateCondition) are production code
 * paths — a gate that only "passes" in a unit stub is false confidence.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f2';

// REQ-01 verbatim from prod (compliance_requirements for FLL-GAR-02).
const REQ_01_CONDITION = 'gewaesser_in_scope == true';

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
  const { seedFllGar } = await import('./seed-fll-gar');
  fixture = await seedFllGar(harness.sql, HARNESS_USER_ID);
}, 120_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

async function scopeFlagPersisted(): Promise<boolean | null> {
  const sql = harness.sql;
  const ws = fixture.worksheets['FLL-GAR-02'];
  const [row] = await sql<{ value_boolean: boolean | null }[]>`
    SELECT value_boolean FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws.fields['gewaesser_in_scope']}`;
  return row?.value_boolean ?? null;
}

describe('FLL-GAR-02 scope gate — real saveWorksheet + real evaluateCondition', () => {
  it('exposes FLL-GAR-02 with its 2 scope fields and 0 equations', async () => {
    const sql = harness.sql;
    const ws = fixture.worksheets['FLL-GAR-02'];
    expect(ws).toBeTruthy();
    expect(ws.fields['gewaesser_type']).toBeTruthy();
    expect(ws.fields['gewaesser_in_scope']).toBeTruthy();
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    expect(e).toBe(0);
    expect(c).toBe(1);
  });

  it('FAIL state — out-of-scope (gewaesser_in_scope=false) drives the gate to FAIL through the real save path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = fixture.worksheets['FLL-GAR-02'];

    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fields['gewaesser_in_scope']]: { type: 'boolean', value: false } },
    });
    expect(res.ok).toBe(true);

    const persisted = await scopeFlagPersisted();
    expect(persisted).toBe(false);

    const verdict = evaluateCondition(REQ_01_CONDITION, (sym) =>
      sym === 'gewaesser_in_scope' ? persisted : undefined,
    );
    expect(verdict.kind).toBe('fail');
  });

  it('PASS state — in-scope (gewaesser_in_scope=true) drives the gate to PASS through the real save path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = fixture.worksheets['FLL-GAR-02'];

    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fields['gewaesser_in_scope']]: { type: 'boolean', value: true } },
    });
    expect(res.ok).toBe(true);

    const persisted = await scopeFlagPersisted();
    expect(persisted).toBe(true);

    const verdict = evaluateCondition(REQ_01_CONDITION, (sym) =>
      sym === 'gewaesser_in_scope' ? persisted : undefined,
    );
    expect(verdict.kind).toBe('pass');
  });

  it('PENDING guard — a missing scope flag reports pending (gate is not silently vacuous)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const verdict = evaluateCondition(REQ_01_CONDITION, () => undefined);
    expect(verdict.kind).toBe('pending');
    expect(verdict.missingSymbols).toContain('gewaesser_in_scope');
  });
});
