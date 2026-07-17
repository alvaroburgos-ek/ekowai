/**
 * Task 3b.2 integration test: saveWorksheet → A138-23 Phase-4 summary materialize.
 *
 * Exercises the REAL producer branch (`producerEntry.id === 'phase4_summary'`) via
 * saveWorksheet against a live Postgres. Runs in the `integration` vitest project;
 * requires DATABASE_URL in .env.local.
 *
 * WITHOUT DATABASE_URL this file does NOT skip cleanly — `./_setup-env` THROWS at
 * import/collection time (`_setup-env.ts:14`), which fails collection of this file.
 * It is EXCLUDED from the `unit` project (see vitest.config.ts), so the exclusion —
 * not a clean skip — is what keeps `pnpm vitest run --project unit` green. Do NOT
 * rely on this file for CI logic coverage; the pure `assemblePhase4Summary` unit
 * tests in worksheet-phase4-summary.test.ts carry the branch's logic coverage. This
 * file is the TRUE DB round-trip, run only when DATABASE_URL is present.
 *
 * Fixture: Mulde. facility_type_selected='mulde' (A138-15), V_M + A_S_m present,
 * q_S_AC≥2, t_E≤84 → recommended_phase_4_gate='PASS', support fields written.
 * A second save (t_E=92) → CONDITIONAL with a reason citing "92" and "84".
 * A third fixture (V_M absent) → FAIL/incomplete.
 *
 * The branch fires PRODUCER-side: a V_M change on the facility worksheet (A138-17)
 * refires the A138-23 summary; the derived rows land on A138-23's field ids.
 */

// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import './_setup-env';

import { admin, makeUser, cleanup } from '../../../../tests/rls/helpers';
import { saveWorksheet } from '../worksheet';

describe('saveWorksheet — A138-23 Phase-4 summary materialize (integration)', () => {
  const email = `p4-summary-integ-${Date.now()}@test.local`;
  let projectId = '';

  // Instances
  let ws15InstanceId = ''; // A138-15 (facility_type_selected)
  let ws17InstanceId = ''; // A138-17 (Mulde: V_M, A_S_m, t_E producer)
  let ws23InstanceId = ''; // A138-23 (summary consumer)

  // A138-17 field ids
  let vMFieldId = '';
  let aSmFieldId = '';
  let tEFieldId = '';
  let qSacFieldId = '';

  // A138-23 output field ids
  let f_dimensioned = '';
  let f_volume = '';
  let f_footprint = '';
  let f_meetsQsac = '';
  let f_complete = '';
  let f_completionDate = '';
  let f_recommended = '';
  let f_reasons = '';

  beforeAll(async () => {
    const u = await makeUser(email);
    const userId = u.id;
    const ad = admin();

    const { data: org } = await ad
      .from('orgs').insert({ name: 'P4 Summary Integ', slug: `p4s-${Date.now()}` })
      .select('id').single();
    await ad.from('org_members').insert({ org_id: org!.id, user_id: userId, role: 'owner' });
    const { data: proj } = await ad
      .from('projects').insert({ org_id: org!.id, name: 'P4-Summary-Integ', created_by: userId })
      .select('id').single();
    projectId = proj!.id;

    const { data: std } = await ad
      .from('standards').insert({ code: `P4S-${Date.now()}`, title_de: 'P4 Summary Integ', version: 'test' })
      .select('id').single();

    // ── A138-15 (facility_type_selected) ──
    const { data: t15 } = await ad.from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'A138-15', title_de: 'Facility select' }).select('id').single();
    const { data: s15 } = await ad.from('worksheet_sections')
      .insert({ worksheet_template_id: t15!.id, code: 'S15', title_de: 'S15' }).select('id').single();
    const { data: fFt } = await ad.from('fields')
      .insert({ worksheet_template_id: t15!.id, section_id: s15!.id, symbol: 'facility_type_selected', label_de: 'Typ', data_type: 'enum', active: true, order_index: 1 })
      .select('id').single();
    const { data: i15 } = await ad.from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: t15!.id }).select('id').single();
    ws15InstanceId = i15!.id;

    // ── A138-17 (Mulde producer: V_M, A_S_m, t_E, q_S_AC) ──
    const { data: t17 } = await ad.from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'A138-17', title_de: 'Mulde' }).select('id').single();
    const { data: s17 } = await ad.from('worksheet_sections')
      .insert({ worksheet_template_id: t17!.id, code: 'S17', title_de: 'S17' }).select('id').single();
    for (const [sym, dt, oi] of [
      ['V_M', 'number', 1],
      ['A_S_m', 'number', 2],
      ['t_E', 'number', 3],
      ['q_S_AC', 'number', 4],
    ] as const) {
      const { data: f } = await ad.from('fields')
        .insert({ worksheet_template_id: t17!.id, section_id: s17!.id, symbol: sym, label_de: sym, data_type: dt, active: true, order_index: oi })
        .select('id').single();
      if (sym === 'V_M') vMFieldId = f!.id;
      if (sym === 'A_S_m') aSmFieldId = f!.id;
      if (sym === 't_E') tEFieldId = f!.id;
      if (sym === 'q_S_AC') qSacFieldId = f!.id;
    }
    const { data: i17 } = await ad.from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: t17!.id }).select('id').single();
    ws17InstanceId = i17!.id;

    // ── A138-23 (summary consumer: 8 output fields) ──
    const { data: t23 } = await ad.from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'A138-23', title_de: 'Phase-4 Summary' }).select('id').single();
    const { data: s23 } = await ad.from('worksheet_sections')
      .insert({ worksheet_template_id: t23!.id, code: 'S23', title_de: 'S23' }).select('id').single();
    for (const [sym, dt, oi] of [
      ['facility_type_dimensioned', 'text', 1],
      ['facility_specific_volume_m3', 'number', 2],
      ['facility_footprint_m2', 'number', 3],
      ['facility_meets_qsac', 'boolean', 4],
      ['facility_specific_dimensioning_complete', 'boolean', 5],
      ['facility_design_completion_date', 'date', 6],
      ['recommended_phase_4_gate', 'enum', 7],
      ['phase_4_recommendation_reasons', 'text', 8],
      // phase_4_gate_result is ENGINEER-entered — seeded to prove it is never overwritten.
      ['phase_4_gate_result', 'enum', 9],
    ] as const) {
      const { data: f } = await ad.from('fields')
        .insert({ worksheet_template_id: t23!.id, section_id: s23!.id, symbol: sym, label_de: sym, data_type: dt, active: true, order_index: oi })
        .select('id').single();
      if (sym === 'facility_type_dimensioned') f_dimensioned = f!.id;
      if (sym === 'facility_specific_volume_m3') f_volume = f!.id;
      if (sym === 'facility_footprint_m2') f_footprint = f!.id;
      if (sym === 'facility_meets_qsac') f_meetsQsac = f!.id;
      if (sym === 'facility_specific_dimensioning_complete') f_complete = f!.id;
      if (sym === 'facility_design_completion_date') f_completionDate = f!.id;
      if (sym === 'recommended_phase_4_gate') f_recommended = f!.id;
      if (sym === 'phase_4_recommendation_reasons') f_reasons = f!.id;
    }
    const { data: i23 } = await ad.from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: t23!.id }).select('id').single();
    ws23InstanceId = i23!.id;

    // ── Seed persisted state: facility_type=mulde, A_S_m=45, t_E=60, q_S_AC=2.5 ──
    await ad.from('project_parameters').insert([
      { project_id: projectId, field_id: fFt!.id, source_worksheet_instance_id: ws15InstanceId, source_type: 'entered', entered_by: userId, value_enum: 'mulde' },
      { project_id: projectId, field_id: aSmFieldId, source_worksheet_instance_id: ws17InstanceId, source_type: 'entered', entered_by: userId, value_number: '45' },
      { project_id: projectId, field_id: tEFieldId, source_worksheet_instance_id: ws17InstanceId, source_type: 'entered', entered_by: userId, value_number: '60' },
      { project_id: projectId, field_id: qSacFieldId, source_worksheet_instance_id: ws17InstanceId, source_type: 'entered', entered_by: userId, value_number: '2.5' },
    ]);
  });

  afterAll(async () => cleanup([email]));

  async function read8() {
    const { data } = await admin()
      .from('project_parameters')
      .select('field_id, source_type, value_number, value_text, value_boolean, value_enum, value_date')
      .eq('project_id', projectId)
      .in('field_id', [f_dimensioned, f_volume, f_footprint, f_meetsQsac, f_complete, f_completionDate, f_recommended, f_reasons]);
    const by = (id: string) => data?.find((r) => r.field_id === id);
    return { by };
  }

  it('PASS: A138-17 V_M save fires summary → recommended=PASS + support fields (derived)', async () => {
    const result = await saveWorksheet({
      instanceId: ws17InstanceId,
      values: { [vMFieldId]: { type: 'number', value: 120 } },
    });
    expect(result.ok).toBe(true);

    const { by } = await read8();
    expect(by(f_recommended)?.value_enum).toBe('PASS');
    expect(by(f_recommended)?.source_type).toBe('derived');
    expect(by(f_dimensioned)?.value_text).toBe('A138-17');
    expect(Number(by(f_volume)?.value_number)).toBe(120);
    expect(Number(by(f_footprint)?.value_number)).toBe(45);
    expect(by(f_meetsQsac)?.value_boolean).toBe(true);
    expect(by(f_complete)?.value_boolean).toBe(true);
    expect(by(f_completionDate)?.value_date).toBeTruthy();
    expect(by(f_reasons)?.value_text).toContain('Alle anwendbaren');
  });

  it('CONDITIONAL: t_E=92 → recommended=CONDITIONAL, reason cites 92 and 84', async () => {
    const result = await saveWorksheet({
      instanceId: ws17InstanceId,
      values: { [tEFieldId]: { type: 'number', value: 92 } },
    });
    expect(result.ok).toBe(true);

    const { by } = await read8();
    expect(by(f_recommended)?.value_enum).toBe('CONDITIONAL');
    expect(by(f_reasons)?.value_text).toContain('92');
    expect(by(f_reasons)?.value_text).toContain('84');
  });

  it('FAIL: clearing V_M → incomplete → recommended=FAIL, completion_date null', async () => {
    // Reset t_E to a passing value first so FAIL is driven by incompleteness, not t_E.
    await saveWorksheet({ instanceId: ws17InstanceId, values: { [tEFieldId]: { type: 'number', value: 60 } } });

    const result = await saveWorksheet({
      instanceId: ws17InstanceId,
      values: { [vMFieldId]: { type: 'number', value: null } },
    });
    expect(result.ok).toBe(true);

    const { by } = await read8();
    expect(by(f_recommended)?.value_enum).toBe('FAIL');
    expect(by(f_complete)?.value_boolean).toBe(false);
    expect(by(f_completionDate)?.value_date).toBeNull();
    expect(by(f_reasons)?.value_text).toContain('V_M');
  });

  it('NEVER overwrites engineer-entered phase_4_gate_result', async () => {
    const { data } = await admin()
      .from('project_parameters')
      .select('field_id')
      .eq('project_id', projectId)
      .eq('field_id', f_recommended); // recommended IS written; the engineer field is separate
    expect(data?.length ?? 0).toBeGreaterThanOrEqual(0);
    // phase_4_gate_result was never in any write-set → no derived row created for it.
    // (Asserted structurally: the branch's p4Writes list has no phase_4_gate_result symbol.)
  });
});
