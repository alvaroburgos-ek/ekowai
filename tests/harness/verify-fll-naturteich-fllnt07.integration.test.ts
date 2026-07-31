/**
 * FLL revision · MILESTONE 2 · per-worksheet verification — FLL-Naturteich :: FLLNT-07
 * (Bau- & Konstruktionsanforderungen / building & construction requirements).
 *
 * FLLNT-07 has NO equations (0) and NO compliance_requirements (0) on prod — it is a
 * pure data-capture worksheet whose fields (sealing_type, freeboard, edge tolerance,
 * ground covering …) are CONSUMED by the gates on the sibling worksheet FLLNT-06
 * (REQ-31 freeboard_water_to_seal >= 5 AND edge_height_tolerance_mm <= 10; REQ-32
 * sealing_biocide_free_biofilm_ok == true). There is therefore no computational chain
 * and no local gate to fire on THIS worksheet.
 *
 * What is still verifiable end-to-end is that the 9 fields drive the REAL saveWorksheet
 * path and persist correctly across all their data types (text/number/enum/boolean).
 * This test seeds the full FLL-Naturteich tree into a disposable embedded Postgres and
 * round-trips every FLLNT-07 field through saveWorksheet, reading the persisted value
 * back — a "persistence smoke chain" standing in for the (absent) equation chains.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f2';

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

function ws07() {
  return fixture.worksheets['FLLNT-07'];
}

async function persisted(symbol: string) {
  const sql = harness.sql;
  const [row] = await sql<
    { value_text: string | null; value_number: string | null; value_enum: string | null; value_boolean: boolean | null }[]
  >`SELECT value_text, value_number, value_enum, value_boolean
      FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws07().fieldIds[symbol]}`;
  return row;
}

describe('FLLNT-07 — real saveWorksheet persistence smoke (0 eq, 0 gates)', () => {
  it('exposes FLLNT-07 with 9 fields, 0 equations, 0 compliance requirements', async () => {
    const sql = harness.sql;
    const ws = ws07();
    expect(ws).toBeTruthy();
    const [{ f }] = await sql<{ f: number }[]>`
      SELECT count(*)::int AS f FROM fields WHERE worksheet_template_id = ${ws.templateId} AND active`;
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    expect(f).toBe(9);
    expect(e).toBe(0);
    expect(c).toBe(0);
  });

  it('number fields persist (freeboard 5 cm, edge tol 10 mm, excavation 1.2 m)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = ws07();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['freeboard_water_to_seal']]: { type: 'number', value: 5 },
        [ws.fieldIds['edge_height_tolerance_mm']]: { type: 'number', value: 10 },
        [ws.fieldIds['excavation_depth']]: { type: 'number', value: 1.2 },
      },
    });
    expect(res.ok).toBe(true);
    expect(Number((await persisted('freeboard_water_to_seal'))?.value_number)).toBe(5);
    expect(Number((await persisted('edge_height_tolerance_mm'))?.value_number)).toBe(10);
    expect(Number((await persisted('excavation_depth'))?.value_number)).toBe(1.2);
  });

  it('enum fields persist (sealing_type=EPDM, ground_covering_type=gravel)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = ws07();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['sealing_type']]: { type: 'enum', value: 'EPDM' },
        [ws.fieldIds['ground_covering_type']]: { type: 'enum', value: 'gravel' },
      },
    });
    expect(res.ok).toBe(true);
    expect((await persisted('sealing_type'))?.value_enum).toBe('EPDM');
    expect((await persisted('ground_covering_type'))?.value_enum).toBe('gravel');
  });

  it('boolean field persists (sealing_biocide_free_biofilm_ok=true)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = ws07();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['sealing_biocide_free_biofilm_ok']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);
    expect((await persisted('sealing_biocide_free_biofilm_ok'))?.value_boolean).toBe(true);
  });

  it('text fields persist (area_separation_method, edge_design, entry_exit_provision)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = ws07();
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['area_separation_method']]: { type: 'text', value: 'inundated barrier (concrete)' },
        [ws.fieldIds['edge_design']]: { type: 'text', value: 'capillary block with hard-wearing surround' },
        [ws.fieldIds['entry_exit_provision']]: { type: 'text', value: 'one non-slip ladder' },
      },
    });
    expect(res.ok).toBe(true);
    expect((await persisted('area_separation_method'))?.value_text).toBe('inundated barrier (concrete)');
    expect((await persisted('edge_design'))?.value_text).toBe('capillary block with hard-wearing surround');
    expect((await persisted('entry_exit_provision'))?.value_text).toBe('one non-slip ladder');
  });
});
