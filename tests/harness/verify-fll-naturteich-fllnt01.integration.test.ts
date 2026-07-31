/**
 * FLL revision · MILESTONE 2 · per-worksheet verification — FLL-Naturteich :: FLLNT-01
 * (Projekteinrichtung & Kundenberatung / project setup & customer consultation).
 *
 * FLLNT-01 has NO equations (pure project-setup / scoping worksheet), so there is
 * no computational chain to drive. Its machine-evaluable artifacts are the 4 block
 * gates REQ-01…REQ-04. This test:
 *   1. seeds the FULL FLL-Naturteich tree into a disposable embedded Postgres via
 *      the generic seeder (seed-fll-naturteich.ts);
 *   2. drives REQ-01 (pool_use_type IN {...}) and REQ-02 (consultation_checklist_completed)
 *      through the REAL saveWorksheet (imported, run against the embedded PG) in BOTH
 *      a PASS and a FAIL state, reading the persisted value back and firing the REAL
 *      compliance evaluator (evaluateCondition);
 *   3. fires REQ-03 / REQ-04 through the REAL evaluateCondition in pass + fail + pending
 *      states. NOTE: the seeder does NOT seed the two attest fields
 *      (attest_fllnt_01_req_03 / _04) that exist on prod FLLNT-01 (seeder ships 10 of
 *      the 12 prod fields), so those two gates cannot be driven through saveWorksheet
 *      here — they are fired against a synthetic lookup and the seeder gap is logged
 *      as residue.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f2';

// Conditions verbatim from prod compliance_requirements (FLLNT-01).
const REQ_01 = 'pool_use_type IN {private_single_household,private_multi_household}';
const REQ_02 = 'consultation_checklist_completed == true';
const REQ_03 = 'attest_fllnt_01_req_03 == True';
const REQ_04 = 'attest_fllnt_01_req_04 == True';

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

function ws01() {
  return fixture.worksheets['FLLNT-01'];
}

async function enumPersisted(symbol: string): Promise<string | null> {
  const sql = harness.sql;
  const [row] = await sql<{ value_enum: string | null }[]>`
    SELECT value_enum FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws01().fieldIds[symbol]}`;
  return row?.value_enum ?? null;
}
async function boolPersisted(symbol: string): Promise<boolean | null> {
  const sql = harness.sql;
  const [row] = await sql<{ value_boolean: boolean | null }[]>`
    SELECT value_boolean FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws01().fieldIds[symbol]}`;
  return row?.value_boolean ?? null;
}

describe('FLLNT-01 — real saveWorksheet + real evaluateCondition', () => {
  it('exposes FLLNT-01 with its scope/consultation fields and 0 equations, 4 gates', async () => {
    const sql = harness.sql;
    const ws = ws01();
    expect(ws).toBeTruthy();
    expect(ws.fieldIds['pool_use_type']).toBeTruthy();
    expect(ws.fieldIds['consultation_checklist_completed']).toBeTruthy();
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    expect(e).toBe(0);
    expect(c).toBe(4);
  });

  // ── REQ-01 (scope) through the real save path ──────────────────────────────
  it('REQ-01 PASS — in-scope use type persists and fires pass', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws01();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['pool_use_type']]: { type: 'enum', value: 'private_single_household' } },
    });
    expect(res.ok).toBe(true);
    const v = await enumPersisted('pool_use_type');
    expect(v).toBe('private_single_household');
    const verdict = evaluateCondition(REQ_01, (s) => (s === 'pool_use_type' ? v : undefined));
    expect(verdict.kind).toBe('pass');
  });

  it('REQ-01 FAIL — an out-of-list use type persists and fires fail', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws01();
    // enum column is a free text store at DB level; write a non-member to exercise FAIL.
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['pool_use_type']]: { type: 'enum', value: 'commercial_hotel' } },
    });
    expect(res.ok).toBe(true);
    const v = await enumPersisted('pool_use_type');
    expect(v).toBe('commercial_hotel');
    const verdict = evaluateCondition(REQ_01, (s) => (s === 'pool_use_type' ? v : undefined));
    expect(verdict.kind).toBe('fail');
  });

  it('REQ-01 PENDING — no use type reported pending (not vacuous)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const verdict = evaluateCondition(REQ_01, () => undefined);
    expect(verdict.kind).toBe('pending');
    if (verdict.kind === 'pending') expect(verdict.missingSymbols).toContain('pool_use_type');
  });

  // ── REQ-02 (consultation) through the real save path ───────────────────────
  it('REQ-02 FAIL — consultation not completed persists false and fires fail', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws01();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['consultation_checklist_completed']]: { type: 'boolean', value: false } },
    });
    expect(res.ok).toBe(true);
    const v = await boolPersisted('consultation_checklist_completed');
    expect(v).toBe(false);
    const verdict = evaluateCondition(REQ_02, (s) => (s === 'consultation_checklist_completed' ? v : undefined));
    expect(verdict.kind).toBe('fail');
  });

  it('REQ-02 PASS — consultation completed persists true and fires pass', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws01();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['consultation_checklist_completed']]: { type: 'boolean', value: true } },
    });
    expect(res.ok).toBe(true);
    const v = await boolPersisted('consultation_checklist_completed');
    expect(v).toBe(true);
    const verdict = evaluateCondition(REQ_02, (s) => (s === 'consultation_checklist_completed' ? v : undefined));
    expect(verdict.kind).toBe('pass');
  });

  // ── REQ-03 / REQ-04 (attest gates) — evaluator-only (fields not seeded) ─────
  it('REQ-03 fires pass/fail/pending against the real evaluator', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_03, (s) => (s === 'attest_fllnt_01_req_03' ? true : undefined)).kind).toBe('pass');
    expect(evaluateCondition(REQ_03, (s) => (s === 'attest_fllnt_01_req_03' ? false : undefined)).kind).toBe('fail');
    const pend = evaluateCondition(REQ_03, () => undefined);
    expect(pend.kind).toBe('pending');
    if (pend.kind === 'pending') expect(pend.missingSymbols).toContain('attest_fllnt_01_req_03');
  });

  it('REQ-04 fires pass/fail/pending against the real evaluator', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_04, (s) => (s === 'attest_fllnt_01_req_04' ? true : undefined)).kind).toBe('pass');
    expect(evaluateCondition(REQ_04, (s) => (s === 'attest_fllnt_01_req_04' ? false : undefined)).kind).toBe('fail');
    const pend = evaluateCondition(REQ_04, () => undefined);
    expect(pend.kind).toBe('pending');
    if (pend.kind === 'pending') expect(pend.missingSymbols).toContain('attest_fllnt_01_req_04');
  });
});
