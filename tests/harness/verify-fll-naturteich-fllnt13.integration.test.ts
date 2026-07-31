/**
 * FLL revision · MILESTONE 2 · per-worksheet verification — FLL-Naturteich :: FLLNT-13
 * (Abnahme / acceptance inspection).
 *
 * FLLNT-13 has NO equations (pure acceptance / claims-due-to-defects worksheet), so
 * there is no computational chain to drive. Its machine-evaluable artifacts are the 2
 * block gates REQ-26 and REQ-28. This test:
 *   1. seeds the FULL FLL-Naturteich tree into a disposable embedded Postgres via the
 *      generic seeder (seed-fll-naturteich.ts);
 *   2. drives REQ-26 (`acceptance_passed == true OR defects_noted IS EMPTY`) through the
 *      REAL saveWorksheet (imported, run against the embedded PG) in BOTH a PASS and a
 *      FAIL state, reading the persisted values back and firing the REAL compliance
 *      evaluator (evaluateCondition);
 *   3. fires REQ-28 (`attest_fllnt_13_req_28 == True`) through the REAL evaluateCondition
 *      in pass + fail + pending states. NOTE: prod FLLNT-13 carries the boolean field
 *      `attest_fllnt_13_req_28`, but the generic seeder ships only 4 of the 5 prod
 *      fields and OMITS that attest field, so REQ-28 cannot be driven through
 *      saveWorksheet here — it is fired against a synthetic lookup and the seeder gap is
 *      logged as residue.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f2';

// Conditions verbatim from prod compliance_requirements (FLLNT-13).
const REQ_26 = 'acceptance_passed == true OR defects_noted IS EMPTY';
const REQ_28 = 'attest_fllnt_13_req_28 == True';

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

function ws13() {
  return fixture.worksheets['FLLNT-13'];
}

async function boolPersisted(symbol: string): Promise<boolean | null> {
  const sql = harness.sql;
  const [row] = await sql<{ value_boolean: boolean | null }[]>`
    SELECT value_boolean FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws13().fieldIds[symbol]}`;
  return row?.value_boolean ?? null;
}
async function textPersisted(symbol: string): Promise<string | null> {
  const sql = harness.sql;
  const [row] = await sql<{ value_text: string | null }[]>`
    SELECT value_text FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws13().fieldIds[symbol]}`;
  return row?.value_text ?? null;
}

describe('FLLNT-13 — real saveWorksheet + real evaluateCondition', () => {
  it('exposes FLLNT-13 with its acceptance fields and 0 equations, 2 gates', async () => {
    const sql = harness.sql;
    const ws = ws13();
    expect(ws).toBeTruthy();
    expect(ws.fieldIds['acceptance_passed']).toBeTruthy();
    expect(ws.fieldIds['defects_noted']).toBeTruthy();
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    expect(e).toBe(0);
    expect(c).toBe(2);
  });

  // ── REQ-26 through the real save path ──────────────────────────────────────
  // acceptance_passed == true OR defects_noted IS EMPTY
  it('REQ-26 FAIL — not passed AND defects noted persists and fires fail', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws13();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['acceptance_passed']]: { type: 'boolean', value: false },
        [ws.fieldIds['defects_noted']]: { type: 'text', value: 'Riss in der Dichtungsfolie am Nordrand' },
      },
    });
    expect(res.ok).toBe(true);
    const passed = await boolPersisted('acceptance_passed');
    const defects = await textPersisted('defects_noted');
    expect(passed).toBe(false);
    expect(defects).toBe('Riss in der Dichtungsfolie am Nordrand');
    const verdict = evaluateCondition(REQ_26, (s) =>
      s === 'acceptance_passed' ? passed : s === 'defects_noted' ? defects : undefined,
    );
    expect(verdict.kind).toBe('fail');
  });

  it('REQ-26 PASS via acceptance_passed — passed=true persists and fires pass despite defects text', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws13();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['acceptance_passed']]: { type: 'boolean', value: true },
        [ws.fieldIds['defects_noted']]: { type: 'text', value: 'kleiner Restmangel' },
      },
    });
    expect(res.ok).toBe(true);
    const passed = await boolPersisted('acceptance_passed');
    const defects = await textPersisted('defects_noted');
    expect(passed).toBe(true);
    const verdict = evaluateCondition(REQ_26, (s) =>
      s === 'acceptance_passed' ? passed : s === 'defects_noted' ? defects : undefined,
    );
    expect(verdict.kind).toBe('pass');
  });

  it('REQ-26 PASS via empty defects — passed=false but no defects fires pass (OR branch)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws13();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['acceptance_passed']]: { type: 'boolean', value: false },
        [ws.fieldIds['defects_noted']]: { type: 'text', value: '' },
      },
    });
    expect(res.ok).toBe(true);
    const passed = await boolPersisted('acceptance_passed');
    const defects = await textPersisted('defects_noted');
    expect(passed).toBe(false);
    // empty string persists as '' → IS EMPTY true → OR passes
    const verdict = evaluateCondition(REQ_26, (s) =>
      s === 'acceptance_passed' ? passed : s === 'defects_noted' ? (defects ?? '') : undefined,
    );
    expect(verdict.kind).toBe('pass');
  });

  // ── REQ-28 (attest gate) — evaluator-only (field not seeded) ────────────────
  it('REQ-28 fires pass/fail/pending against the real evaluator', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    expect(evaluateCondition(REQ_28, (s) => (s === 'attest_fllnt_13_req_28' ? true : undefined)).kind).toBe('pass');
    expect(evaluateCondition(REQ_28, (s) => (s === 'attest_fllnt_13_req_28' ? false : undefined)).kind).toBe('fail');
    const pend = evaluateCondition(REQ_28, () => undefined);
    expect(pend.kind).toBe('pending');
    if (pend.kind === 'pending') expect(pend.missingSymbols).toContain('attest_fllnt_13_req_28');
  });
});
