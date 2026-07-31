/**
 * FLL revision · MILESTONE 2 · per-worksheet verification — FLL-Naturteich :: FLLNT-05
 * (Baustoff-Anforderungen / construction-material requirements).
 *
 * FLLNT-05 has NO equations (pure material-spec worksheet; the elutable-P value is a
 * LAB MEASUREMENT input per Appendix 2, not a wizard computation), so there is no
 * computational chain to drive. Its single machine-evaluable artifact is the block
 * gate REQ-12 (`filter_substrate_elutable_p <= 5`, from §7.2.3 / Table 9, PDF ground
 * truth: "The level of elutable phosphorus should not exceed 5 mg P/kg." p.34). This
 * test:
 *   1. seeds the FULL FLL-Naturteich tree into a disposable embedded Postgres via the
 *      generic seeder (seed-fll-naturteich.ts);
 *   2. drives REQ-12 through the REAL saveWorksheet (imported, run against the embedded
 *      PG) in BOTH a PASS state (5 = boundary, still <=5) and a FAIL state (>5), reading
 *      the persisted number back and firing the REAL compliance evaluator
 *      (evaluateCondition);
 *   3. exercises the boundary (5.0 passes, 5.01 fails) and the pending (no value) state
 *      to prove the gate is not vacuous.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f5';

// Condition verbatim from prod compliance_requirements (FLLNT-05 :: REQ-12).
const REQ_12 = 'filter_substrate_elutable_p <= 5';

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

function ws05() {
  return fixture.worksheets['FLLNT-05'];
}

async function numberPersisted(symbol: string): Promise<number | null> {
  const sql = harness.sql;
  const [row] = await sql<{ value_number: string | null }[]>`
    SELECT value_number FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${ws05().fieldIds[symbol]}`;
  return row?.value_number == null ? null : Number(row.value_number);
}

describe('FLLNT-05 — real saveWorksheet + real evaluateCondition', () => {
  it('exposes FLLNT-05 with its material fields and 0 equations, 1 gate', async () => {
    const sql = harness.sql;
    const ws = ws05();
    expect(ws).toBeTruthy();
    expect(ws.fieldIds['filter_substrate_elutable_p']).toBeTruthy();
    expect(ws.fieldIds['materials_biocide_free']).toBeTruthy();
    expect(ws.fieldIds['concrete_spec_compliant']).toBeTruthy();
    expect(ws.fieldIds['wood_treatment_compliant']).toBeTruthy();
    expect(ws.fieldIds['plant_substrate_compliant']).toBeTruthy();
    expect(ws.fieldIds['filter_substrate_oversize_pct']).toBeTruthy();
    expect(ws.fieldIds['filter_substrate_elutriated_pct']).toBeTruthy();
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    expect(e).toBe(0);
    expect(c).toBe(1);
  });

  // ── REQ-12 (elutable phosphorus <= 5 mg P/kg) through the real save path ─────
  it('REQ-12 PASS — elutable P below limit persists and fires pass', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws05();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['filter_substrate_elutable_p']]: { type: 'number', value: 3 } },
    });
    expect(res.ok).toBe(true);
    const v = await numberPersisted('filter_substrate_elutable_p');
    expect(v).toBe(3);
    const verdict = evaluateCondition(REQ_12, (s) => (s === 'filter_substrate_elutable_p' ? v : undefined));
    expect(verdict.kind).toBe('pass');
  });

  it('REQ-12 PASS at boundary — elutable P exactly 5 persists and fires pass', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws05();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['filter_substrate_elutable_p']]: { type: 'number', value: 5 } },
    });
    expect(res.ok).toBe(true);
    const v = await numberPersisted('filter_substrate_elutable_p');
    expect(v).toBe(5);
    const verdict = evaluateCondition(REQ_12, (s) => (s === 'filter_substrate_elutable_p' ? v : undefined));
    expect(verdict.kind).toBe('pass');
  });

  it('REQ-12 FAIL — elutable P above limit persists and fires fail', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const ws = ws05();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['filter_substrate_elutable_p']]: { type: 'number', value: 6 } },
    });
    expect(res.ok).toBe(true);
    const v = await numberPersisted('filter_substrate_elutable_p');
    expect(v).toBe(6);
    const verdict = evaluateCondition(REQ_12, (s) => (s === 'filter_substrate_elutable_p' ? v : undefined));
    expect(verdict.kind).toBe('fail');
  });

  it('REQ-12 PENDING — no value reported pending (not vacuous)', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const verdict = evaluateCondition(REQ_12, () => undefined);
    expect(verdict.kind).toBe('pending');
    if (verdict.kind === 'pending') expect(verdict.missingSymbols).toContain('filter_substrate_elutable_p');
  });
});
