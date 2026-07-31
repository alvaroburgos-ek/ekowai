/**
 * FLL-Naturteich :: FLLNT-15 (Konformitäts-Zusammenfassung / conformity summary)
 * EXHAUSTIVE per-worksheet verification through the REAL saveWorksheet path.
 *
 * FLLNT-15 carries 0 equations and 0 compliance_requirements (confirmed against
 * prod standard c11f0e54-... template a7351d4c-...). It is a WORKFLOW rollup
 * worksheet: six phase gates (phase_1_gate … phase_6_gate) plus one overall
 * verdict (compliance_verdict_overall). Every enum option on these fields carries
 * regulation_reference: "workflow" in prod — i.e. these are Wizard-internal
 * process states, NOT source-attested scalars. The FLL-Naturteich PDF prints no
 * phase-gate table and no overall-verdict scale, so there is nothing here to
 * verify VA-grade against the standard; the worksheet's only exercisable behaviour
 * is that its enum inputs round-trip through the REAL saveWorksheet path.
 *
 * This test:
 *   1. seeds the FULL FLL-Naturteich tree into a disposable embedded Postgres;
 *   2. drives the REAL saveWorksheet on the FLLNT-15 instance to persist a phase
 *      gate enum (pass) and the overall verdict enum (compliant) — exercising the
 *      genuine save/UPSERT path, not a hand-rolled INSERT;
 *   3. reads both values back and asserts they round-trip;
 *   4. asserts there are 0 equations and 0 gates on this template (so there is no
 *      computational chain and no gate to fire — this is the "CR-006 absence"
 *      baseline, recorded as residue not a finding).
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import { seedFllNaturteich, type SeededFllNaturteichFixture } from './seed-fll-naturteich';

const USER_ID = '00000000-0000-4000-8000-000000000f15';

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

describe('FLLNT-15 — real saveWorksheet enum round-trip; 0 equations, 0 gates', () => {
  it('template carries 0 equations and 0 compliance_requirements (workflow rollup)', async () => {
    const sql = harness.sql;
    const ws = fixture.worksheets['FLLNT-15'];
    expect(ws).toBeTruthy();
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    expect(e).toBe(0);
    expect(c).toBe(0);
    // 7 fields: 6 phase gates + overall verdict
    const [{ f }] = await sql<{ f: number }[]>`
      SELECT count(*)::int AS f FROM fields WHERE worksheet_template_id = ${ws.templateId} AND active = true`;
    expect(f).toBe(7);
  });

  it('persists phase_1_gate + compliance_verdict_overall through the REAL saveWorksheet path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.worksheets['FLLNT-15'];
    const gateField = ws.fieldIds['phase_1_gate'];
    const verdictField = ws.fieldIds['compliance_verdict_overall'];
    expect(gateField).toBeTruthy();
    expect(verdictField).toBeTruthy();

    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [gateField]: { type: 'enum', value: 'pass' },
        [verdictField]: { type: 'enum', value: 'compliant' },
      },
    });
    expect(save.ok).toBe(true);

    const [gateRow] = await harness.sql<{ value_enum: string | null }[]>`
      SELECT value_enum FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${gateField}`;
    const [verdictRow] = await harness.sql<{ value_enum: string | null }[]>`
      SELECT value_enum FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${verdictField}`;
    expect(gateRow?.value_enum).toBe('pass');
    expect(verdictRow?.value_enum).toBe('compliant');
  });

  it('overwriting a gate enum round-trips (fail state) — save path is idempotent UPSERT', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.worksheets['FLLNT-15'];
    const gateField = ws.fieldIds['phase_1_gate'];

    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [gateField]: { type: 'enum', value: 'fail' } },
    });
    expect(save.ok).toBe(true);
    const [row] = await harness.sql<{ value_enum: string | null }[]>`
      SELECT value_enum FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${gateField}`;
    expect(row?.value_enum).toBe('fail');
  });
});
