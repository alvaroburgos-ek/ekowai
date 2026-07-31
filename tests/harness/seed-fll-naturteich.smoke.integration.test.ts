/**
 * Smoke test for the generic FLL-Naturteich full-project seeder.
 *
 * Boots its OWN disposable embedded Postgres (independent of the GAR27
 * _harness-env-fll bootstrap), applies the app schema, and runs
 * seedFllNaturteich end-to-end. Asserts the full standard landed: 15 worksheets,
 * every field + a defaulted project_parameters row, all equations, all
 * compliance requirements. This proves a verify agent can seed the whole
 * standard against the embedded PG without touching prod.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import {
  seedFllNaturteich,
  FLL_NATURTEICH_WORKSHEETS,
  type SeededFllNaturteichFixture,
} from './seed-fll-naturteich';

const USER_ID = '00000000-0000-4000-8000-0000000000f2';

let harness: Harness;
let fixture: SeededFllNaturteichFixture;

beforeAll(async () => {
  harness = await startHarness();
  fixture = await seedFllNaturteich(harness.sql, USER_ID);
}, 120_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

describe('seedFllNaturteich (generic full-project seeder)', () => {
  const expectedFields = FLL_NATURTEICH_WORKSHEETS.reduce((n, w) => n + w.fields.length, 0);
  const expectedEqs = FLL_NATURTEICH_WORKSHEETS.reduce((n, w) => n + w.equations.length, 0);
  const expectedReqs = FLL_NATURTEICH_WORKSHEETS.reduce((n, w) => n + w.compliance.length, 0);

  it('seeds all 15 worksheet templates + instances', async () => {
    expect(FLL_NATURTEICH_WORKSHEETS).toHaveLength(15);
    expect(Object.keys(fixture.worksheets)).toHaveLength(15);

    const [{ count: tmplCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM worksheet_templates WHERE standard_id = ${fixture.standardId}`;
    expect(Number(tmplCount)).toBe(15);

    const [{ count: instCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM worksheet_instances WHERE project_id = ${fixture.projectId}`;
    expect(Number(instCount)).toBe(15);
  });

  it('seeds every field with a defaulted project_parameters row', async () => {
    const [{ count: fieldCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM fields f
      JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
      WHERE wt.standard_id = ${fixture.standardId}`;
    expect(Number(fieldCount)).toBe(expectedFields);

    const [{ count: paramCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM project_parameters WHERE project_id = ${fixture.projectId}`;
    expect(Number(paramCount)).toBe(expectedFields);
  });

  it('seeds all equations and all block-severity compliance requirements', async () => {
    const [{ count: eqCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM equations e
      JOIN worksheet_templates wt ON wt.id = e.worksheet_template_id
      WHERE wt.standard_id = ${fixture.standardId}`;
    expect(Number(eqCount)).toBe(expectedEqs);

    const [{ count: crCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM compliance_requirements cr
      JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
      WHERE wt.standard_id = ${fixture.standardId}`;
    expect(Number(crCount)).toBe(expectedReqs);
  });

  it('attaches the standard to the project', async () => {
    const [{ count }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM project_standards
      WHERE project_id = ${fixture.projectId} AND standard_id = ${fixture.standardId}`;
    expect(Number(count)).toBe(1);
  });

  it('exposes field-id lookups by "WS:symbol" key', () => {
    expect(fixture.fieldIdByKey['FLLNT-06:pool_underwater_surface']).toBeTruthy();
    expect(fixture.fieldIdByKey['FLLNT-10:filter_50x_rule_met']).toBeTruthy();
  });
});
