/**
 * Smoke test for the generic FLL-TP-RHIZOM-2023 full-project seeder.
 *
 * Boots its OWN disposable embedded Postgres (independent of the GAR27
 * _harness-env-fll bootstrap), applies the app schema, and runs seedFllRhizom
 * end-to-end. Asserts the full standard landed: 21 worksheets, every active field
 * + a defaulted project_parameters row, all equations, all compliance
 * requirements. This proves a verify agent can seed the whole standard against
 * the embedded PG (REAL saveWorksheet path reachable) without touching prod.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import {
  seedFllRhizom,
  loadRhizomManifest,
  type SeededRhizomFixture,
} from './seed-fll-rhizom';

const USER_ID = '00000000-0000-4000-8000-0000000000f3';

let harness: Harness;
let fixture: SeededRhizomFixture;

const manifest = loadRhizomManifest();
const expectedFields = manifest.worksheets.reduce((n, w) => n + (w.fields?.length ?? 0), 0);
const expectedEqs = manifest.worksheets.reduce((n, w) => n + (w.equations?.length ?? 0), 0);
const expectedReqs = manifest.worksheets.reduce((n, w) => n + (w.compliance?.length ?? 0), 0);

beforeAll(async () => {
  harness = await startHarness();
  fixture = await seedFllRhizom(harness.sql, USER_ID);
}, 120_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

describe('seedFllRhizom (generic full-project seeder)', () => {
  it('seeds all 21 worksheet templates + instances', async () => {
    expect(manifest.worksheets).toHaveLength(21);
    expect(fixture.worksheets).toHaveLength(21);

    const [{ count: tmplCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM worksheet_templates WHERE standard_id = ${fixture.standardId}`;
    expect(Number(tmplCount)).toBe(21);

    const [{ count: instCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM worksheet_instances WHERE project_id = ${fixture.projectId}`;
    expect(Number(instCount)).toBe(21);
  });

  it('seeds every active field with a defaulted project_parameters row', async () => {
    const [{ count: fieldCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM fields f
      JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
      WHERE wt.standard_id = ${fixture.standardId}`;
    expect(Number(fieldCount)).toBe(expectedFields);
    expect(fixture.counts.fields).toBe(expectedFields);

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

  it('exposes per-worksheet field-id + instance lookups for the verify driver', () => {
    // FLLTP-RHZ-13 (6-month growth) carries the only equations — its inputs must
    // be addressable so a verify agent can drive the P_avg/K_avg/ratio chain.
    const ws13 = fixture.byCode['FLLTP-RHZ-13'];
    expect(ws13).toBeTruthy();
    expect(ws13.instanceId).toBeTruthy();
    expect(ws13.fieldIds['P_1']).toBeTruthy();
    expect(ws13.fieldIds['dichte_relativ_prozent']).toBeTruthy();
    expect(ws13.fieldTypes['P_1']).toBe('number');

    // A section-less field (whole worksheet has NULL section_id in prod) is still
    // seeded + addressable.
    const ws21 = fixture.byCode['FLLTP-RHZ-21'];
    expect(ws21.fieldIds['final_rhizom_conformity']).toBeTruthy();
    expect(ws21.fieldTypes['final_rhizom_conformity']).toBe('enum');
  });
});
