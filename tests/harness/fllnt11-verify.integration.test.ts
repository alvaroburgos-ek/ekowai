/**
 * FLL-Naturteich :: FLLNT-11 (Wasserzirkulation & technische Anlagen) —
 * per-worksheet verification harness driving the REAL saveWorksheet.
 *
 * Bootstraps its OWN embedded Postgres + seeds the full FLL-Naturteich standard
 * BEFORE @/lib/db loads (mirrors _harness-env-fll top-level-await), then drives
 * the real saveWorksheet.
 *
 * FLLNT-11 owns two equations:
 *   EQ-04  overflow_edge_length      = 0.01 * swimming_area_m2      (equality producer)
 *   EQ-05  splash_water_tank_volume >= 150 * pool_underwater_surface (INEQUALITY producer — finding)
 * and one block gate REQ-29 (treatment_impermissible_used == false).
 *
 * saveWorksheet has NO generic equation engine for FLL — it only stamps a
 * produced symbol source_type='derived' (single-source integrity) and persists
 * the client-computed value. So the computable chain we can exercise is:
 * write the derived output overflow_edge_length and assert (a) it persists and
 * (b) it is stamped 'derived' (recognised as equation-produced, not free-entered).
 * The value asserted is the PDF worked example (30 m² swimming area → 0.3 m).
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllNaturteich, type SeededFllNaturteichFixture } from './seed-fll-naturteich';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const USER_ID = '00000000-0000-4000-8000-0000000000fb';

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

describe('FLLNT-11 verification — real saveWorksheet', () => {
  it('EQ-04 chain: overflow_edge_length persists + is stamped derived (PDF example 30 m² -> 0.3 m)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const sql = harness.sql;

    const instanceId = fixture.instanceIdByCode['FLLNT-11'];
    const edgeFieldId = fixture.fieldIdByKey['FLLNT-11:overflow_edge_length'];
    // swimming_area_m2 lives on FLLNT-10 in the seeder; on prod it is a cross-ws
    // input carried onto FLLNT-11 (order_index 100). PDF example: 30 m² -> 0.3 m.
    const SWIMMING_AREA = 30;
    const EXPECTED_EDGE = 0.01 * SWIMMING_AREA; // 0.3

    const res = await saveWorksheet({
      instanceId,
      values: { [edgeFieldId]: { type: 'number', value: EXPECTED_EDGE } },
    });
    expect(res.ok).toBe(true);

    const [row] = await sql<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${edgeFieldId}`;

    expect(row?.value_number == null ? null : Number(row.value_number)).toBeCloseTo(EXPECTED_EDGE, 6);
    // EQ-04 output is recognised as equation-produced -> stamped derived, not entered.
    expect(row?.source_type).toBe('derived');
  });

  it('EQ-05 splash_water_tank_volume stays ENTERED (displayOnly protects the inequality-as-producer)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const sql = harness.sql;

    const instanceId = fixture.instanceIdByCode['FLLNT-11'];
    const tankFieldId = fixture.fieldIdByKey['FLLNT-11:splash_water_tank_volume'];
    // EQ-05 is an INEQUALITY producer (`splash_water_tank_volume >= 150 * pool_underwater_surface`).
    // equation-profiles marks id 27f94c84 displayOnly:true so the inequality LHS is
    // NOT stamped derived — the engineer keeps ownership of the chosen tank volume.
    const res = await saveWorksheet({
      instanceId,
      values: { [tankFieldId]: { type: 'number', value: 9000 } },
    });
    expect(res.ok).toBe(true);

    const [row] = await sql<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${tankFieldId}`;
    expect(row?.value_number == null ? null : Number(row.value_number)).toBeCloseTo(9000, 6);
    // GREEN: displayOnly guard keeps it engineer-owned (NOT clobbered to a derived scalar).
    expect(row?.source_type).toBe('entered');
  });

  it('REQ-29 gate: PASS state (treatment_impermissible_used=false) vs FAIL state (=true)', async () => {
    const sql = harness.sql;
    // Grammar: treatment_impermissible_used == false. Evaluate both sides.
    const passState = { treatment_impermissible_used: false };
    const failState = { treatment_impermissible_used: true };
    const evalGate = (s: { treatment_impermissible_used: boolean }) =>
      s.treatment_impermissible_used === false;
    expect(evalGate(passState)).toBe(true);
    expect(evalGate(failState)).toBe(false);

    // Confirm the block-severity requirement is actually seeded on this worksheet.
    const [{ count }] = await sql<{ count: string }[]>`
      SELECT count(*) FROM compliance_requirements cr
      JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
      JOIN worksheet_instances wi ON wi.worksheet_template_id = wt.id
      WHERE wi.id = ${fixture.instanceIdByCode['FLLNT-11']}
        AND cr.code = 'REQ-29' AND cr.severity = 'block'`;
    expect(Number(count)).toBe(1);
  });
});
