/**
 * Smoke test for the GENERIC full-project FLL-GAR-2023 seeder (seed-fll-gar.ts).
 *
 * Boots a disposable embedded Postgres, applies the app schema, and asserts the
 * seeder replays the ENTIRE FLL-GAR-2023 tree (all 29 worksheets + every section,
 * field, equation, compliance requirement) and seeds one instance per worksheet
 * plus a default project_parameter per field — WITHOUT throwing. This is the
 * import + seed smoke run required by the task; it does NOT drive saveWorksheet
 * (a verify agent does that separately).
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000fa';

let harness: Harness;
let fixture: SeededFllGarFixture;

beforeAll(async () => {
  harness = await startHarness();
  fixture = await seedFllGar(harness.sql, HARNESS_USER_ID);
}, 120_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

describe('seed-fll-gar — generic full-project FLL-GAR-2023 fixture', () => {
  it('seeds without throwing and reports the full 29-worksheet tree', () => {
    expect(fixture.counts.worksheets).toBe(29);
    expect(fixture.counts.fields).toBe(175);
    expect(fixture.counts.parameters).toBe(fixture.counts.fields); // one default per field
    expect(Object.keys(fixture.worksheets)).toHaveLength(29);
  });

  it('persisted 29 worksheet_instances for the project', async () => {
    const sql = harness.sql;
    const [{ n }] = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM worksheet_instances WHERE project_id = ${fixture.projectId}`;
    expect(n).toBe(29);
  });

  it('persisted every field + a project_parameter for each', async () => {
    const sql = harness.sql;
    const [{ f }] = await sql<{ f: number }[]>`
      SELECT count(*)::int AS f FROM fields WHERE worksheet_template_id IN
        (SELECT id FROM worksheet_templates WHERE standard_id = ${fixture.standardId})`;
    const [{ p }] = await sql<{ p: number }[]>`
      SELECT count(*)::int AS p FROM project_parameters WHERE project_id = ${fixture.projectId}`;
    expect(f).toBe(175);
    expect(p).toBe(175);
  });

  it('exposes GAR-27 (Q_NOT Notüberlauf) with its equation-consumed fields', () => {
    const ws = fixture.worksheets['FLL-GAR-27'];
    expect(ws).toBeTruthy();
    expect(ws.instanceId).toBeTruthy();
    for (const sym of ['A', 'C', 'r_5_100', 'r_5_5', 'Q_NOT']) {
      expect(ws.fields[sym]).toBeTruthy();
    }
  });

  it('replayed the 4 equations + 30 compliance requirements verbatim', async () => {
    const sql = harness.sql;
    const tmplIds = sql`SELECT id FROM worksheet_templates WHERE standard_id = ${fixture.standardId}`;
    const [{ e }] = await sql<{ e: number }[]>`
      SELECT count(*)::int AS e FROM equations WHERE worksheet_template_id IN (${tmplIds})`;
    const [{ c }] = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM compliance_requirements WHERE worksheet_template_id IN (${tmplIds})`;
    expect(e).toBe(4);
    expect(c).toBe(30);
  });
});
