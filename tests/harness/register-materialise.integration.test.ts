// @vitest-environment node
/**
 * Plan 2a Task 8 — the generic register materialiser through the REAL saveWorksheet.
 *
 * Drives an A138-07 `surface_inventory` carrier save against the embedded-Postgres
 * harness (no prod, no Docker) and reads the six register-fed outputs back from
 * project_parameters: values + source_type='derived' after a complete carrier,
 * null (cleared, still 'derived') after an empty one. This is the execution proof
 * that the surface block's behaviour survived the move into the generic block.
 */
import './_harness-env';
import { describe, it, expect, afterAll } from 'vitest';
import { getHarness } from './_harness-env';

const { harness, fixture } = getHarness();
const sql = harness.sql;
afterAll(async () => { await harness.stop(); });

describe('Plan 2a — register-fed equations materialise through the REAL saveWorksheet (embedded Postgres)', () => {
  it('saving a surface_inventory carrier on A138-07 writes the six derived rows; an empty carrier clears them to null', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const rows = [
      { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ];
    const r1 = await saveWorksheet({ instanceId: fixture.ws07InstanceId, values: { [fixture.surfaceInventoryFieldId]: { type: 'json', value: { rows } } } });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    // the save result carries the six derived rows for the client-side apply
    expect(r1.derived.map((d) => d.fieldId).sort()).toEqual(Object.values(fixture.a138_07).sort());
    expect(r1.warnings).toEqual([]);

    const read = async (fieldId: string) => (await sql<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`)[0];
    const aC = await read(fixture.a138_07.A_C);
    expect(aC.source_type).toBe('derived');
    expect(Number(aC.value_number)).toBeCloseTo(4826.43, 2);
    expect(Number((await read(fixture.a138_07.C_m)).value_number)).toBeCloseTo(0.9, 6);
    expect(Number((await read(fixture.a138_07.A_E_ba)).value_number)).toBeCloseTo(5362.7, 4);
    expect(Number((await read(fixture.a138_07.A_E_nba)).value_number)).toBe(0);
    expect(Number((await read(fixture.a138_07.A_C_sealed)).value_number)).toBeCloseTo(4826.43, 2);
    expect(Number((await read(fixture.a138_07.A_C_unsealed)).value_number)).toBe(0);
    // the carrier itself persisted as the engineer's entered value
    const [carrier] = await sql<{ source_type: string; value_json: { rows: unknown[] } }[]>`
      SELECT source_type, value_json FROM project_parameters WHERE project_id = ${fixture.projectId} AND field_id = ${fixture.surfaceInventoryFieldId}`;
    expect(carrier.source_type).toBe('entered');
    expect(carrier.value_json.rows).toHaveLength(2);

    const r2 = await saveWorksheet({ instanceId: fixture.ws07InstanceId, values: { [fixture.surfaceInventoryFieldId]: { type: 'json', value: { rows: [] } } } });
    expect(r2.ok).toBe(true);
    for (const fieldId of Object.values(fixture.a138_07)) {
      const row = await read(fieldId);
      expect(row.value_number).toBeNull();
      expect(row.source_type).toBe('derived');
    }
  });
});

describe('Plan 3 final wave B (defect 1) — the save path resolves INHERITED fields (embedded Postgres)', () => {
  const read = async (fieldId: string) => (await sql<{ value_number: string | null; source_type: string }[]>`
    SELECT value_number, source_type FROM project_parameters WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`)[0];

  it('a register-fed equation naming an INHERITED scalar computes on save (was persisted as null)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const r = await saveWorksheet({
      instanceId: fixture.ws91InstanceId,
      values: { [fixture.inhRegisterFieldId]: { type: 'json', value: { rows: [
        { id: '1', betrag: 4 },
        { id: '2', betrag: 6 },
      ] } } },
    });
    expect(r.ok).toBe(true);
    // own-register sum — computed before AND after the fix (the control)
    expect(Number((await read(fixture.inhSumFieldId)).value_number)).toBeCloseTo(10, 9);
    // the inherited factor (3, produced on A138-90) — null before the fix
    const scaled = await read(fixture.inhScaledFieldId);
    expect(scaled.source_type).toBe('derived');
    expect(Number(scaled.value_number)).toBeCloseTo(30, 9);
  });

  it('a `visible_when` whose driver is INHERITED now hides server-side: the hidden register clears its outputs to null', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // flip the inherited driver on A138-90 (300 > 200) ⇒ the -91 register hides
    await sql`UPDATE project_parameters SET value_number = 300
               WHERE project_id = ${fixture.projectId} AND field_id = ${fixture.inhGateFieldId}`;
    const r = await saveWorksheet({
      instanceId: fixture.ws91InstanceId,
      values: { [fixture.inhRegisterFieldId]: { type: 'json', value: { rows: [
        { id: '1', betrag: 4 },
        { id: '2', betrag: 6 },
      ] } } },
    });
    expect(r.ok).toBe(true);
    // both outputs cleared — the hidden carrier yields no rows ⇒ manual_required ⇒ null
    expect((await read(fixture.inhSumFieldId)).value_number).toBeNull();
    expect((await read(fixture.inhScaledFieldId)).value_number).toBeNull();
    // restore for any later case in this file
    await sql`UPDATE project_parameters SET value_number = 100
               WHERE project_id = ${fixture.projectId} AND field_id = ${fixture.inhGateFieldId}`;
  });
});
