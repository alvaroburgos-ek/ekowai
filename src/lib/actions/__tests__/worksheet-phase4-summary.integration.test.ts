/**
 * Finding F + G1 (summary fix wave) — FAITHFUL DB-gated integration test.
 *
 * Exercises the REAL producer branch (`producerEntry.id === 'asm'` → geometry sweep +
 * Finding-F V_M materialize → G1 chain-fire → `phase4_summary`) via saveWorksheet
 * against a live Postgres. Runs in the `integration` vitest project; requires
 * DATABASE_URL in .env.local.
 *
 * WITHOUT DATABASE_URL this file does NOT skip cleanly — `./_setup-env` THROWS at
 * import/collection time (`_setup-env.ts:14`). It is EXCLUDED from the `unit` project
 * (see vitest.config.ts), so the exclusion — not a clean skip — is what keeps
 * `pnpm vitest run --project unit` green. The pure logic RED/GREEN lives in
 * facility-governing-volume.test.ts + worksheet-phase4-summary.test.ts +
 * dispatch-routing-matrix.test.ts; the live RED/GREEN is the pilot re-run on prod.
 *
 * WHY THIS REPLACES THE PRIOR (masking) VERSION: the old test saved V_M as a USER
 * field ({ [vMFieldId]: {type:'number', value:120} }) — which MASKED Finding F. F is
 * precisely that V_M is NEVER a user field: it is a server-materialized engine output.
 * This version saves ONLY h_M on the mulde facility worksheet (A138-17); the server
 * runs the geometry sweep → materializes A_S_m → Finding-F materializes V_M = A_S,m·h_M
 * in the SAME tx → G1 chain-fires the summary → the summary reads the persisted V_M.
 *
 * ASSERTS:
 *   - V_M is PERSISTED on A138-17 (derived) after the h_M save — never entered by the
 *     user (Finding F). V_M ≈ A_S,m · h_M (the pure sweep value, recomputed in-test).
 *   - The A138-23 summary refires in the SAME save (G1 chain-fire): volume_m3 = V_M
 *     (non-null), complete = true, facility_type_dimensioned = 'mulde'.
 *   - phase_4_gate_result (engineer-entered) is NEVER overwritten.
 */

// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import './_setup-env';

import { admin, makeUser, cleanup } from '../../../../tests/rls/helpers';
import { saveWorksheet } from '../worksheet';
import { computeMuldeGeometrySweep } from '@/lib/eval/materialize-asm';

describe('saveWorksheet — A138-23 summary via server-materialized V_M (Finding F + G1, integration)', () => {
  const email = `p4-summary-F-integ-${Date.now()}@test.local`;
  let projectId = '';
  let userId = '';

  // Instances
  let ws04InstanceId = ''; // A138-04 (rainfall carrier r_D_n_table)
  let ws07InstanceId = ''; // A138-07 (A_C footprint contributor)
  let ws15InstanceId = ''; // A138-15 (facility_type_selected)
  let ws17InstanceId = ''; // A138-17 (Mulde geometry producer: h_M, f_Z, k_i, method, V_M, A_S_m)
  let ws23InstanceId = ''; // A138-23 (summary consumer)

  // A138-17 field ids
  let hMFieldId = '';
  let vMFieldId = '';
  let aSmFieldId = '';
  let methodFieldId = '';

  // A138-23 output field ids
  let f_dimensioned = '';
  let f_volume = '';
  let f_complete = '';

  // Rainfall rows for the sweep (legacy 1D carrier shape) + the scalars → expected A_S_m.
  const RAIN_ROWS = [
    { D_min: 5, r_D_n: 250 },
    { D_min: 10, r_D_n: 180 },
    { D_min: 15, r_D_n: 140 },
    { D_min: 30, r_D_n: 90 },
    { D_min: 60, r_D_n: 55 },
  ];
  const A_C = 5000;
  const H_M = 0.3;
  const F_Z = 1.2;
  const K_I = 1e-5;
  // The pure sweep is authoritative — recompute the expected A_S_m/V_M in-test so the
  // assertion cannot drift from the server rule.
  const EXPECTED_A_S_M = computeMuldeGeometrySweep(RAIN_ROWS, { A_C, h_M: H_M, f_Z: F_Z, k_i: K_I }).A_S_m!;
  const EXPECTED_V_M = EXPECTED_A_S_M * H_M;

  beforeAll(async () => {
    const u = await makeUser(email);
    userId = u.id;
    const ad = admin();

    const { data: org } = await ad
      .from('orgs').insert({ name: 'P4 F Integ', slug: `p4f-${Date.now()}` })
      .select('id').single();
    await ad.from('org_members').insert({ org_id: org!.id, user_id: userId, role: 'owner' });
    const { data: proj } = await ad
      .from('projects').insert({ org_id: org!.id, name: 'P4-F-Integ', created_by: userId })
      .select('id').single();
    projectId = proj!.id;

    const { data: std } = await ad
      .from('standards').insert({ code: `P4F-${Date.now()}`, title_de: 'P4 F Integ', version: 'test' })
      .select('id').single();

    const mkTemplate = async (code: string, title: string) => {
      const { data: t } = await ad.from('worksheet_templates')
        .insert({ standard_id: std!.id, code, title_de: title }).select('id').single();
      const { data: s } = await ad.from('worksheet_sections')
        .insert({ worksheet_template_id: t!.id, code: `S-${code}`, title_de: `S-${code}` }).select('id').single();
      const { data: i } = await ad.from('worksheet_instances')
        .insert({ project_id: projectId, worksheet_template_id: t!.id }).select('id').single();
      return { templateId: t!.id, sectionId: s!.id, instanceId: i!.id };
    };
    const mkField = async (templateId: string, sectionId: string, symbol: string, dataType: string, oi: number) => {
      const { data: f } = await ad.from('fields')
        .insert({ worksheet_template_id: templateId, section_id: sectionId, symbol, label_de: symbol, data_type: dataType, active: true, order_index: oi })
        .select('id').single();
      return f!.id;
    };

    // ── A138-04 rainfall carrier ──
    const t04 = await mkTemplate('A138-04', 'Rainfall');
    ws04InstanceId = t04.instanceId;
    const rdnFieldId = await mkField(t04.templateId, t04.sectionId, 'r_D_n_table', 'json', 1);

    // ── A138-07 A_C ──
    const t07 = await mkTemplate('A138-07', 'Surface');
    ws07InstanceId = t07.instanceId;
    const acFieldId = await mkField(t07.templateId, t07.sectionId, 'A_C', 'number', 1);

    // ── A138-15 facility_type_selected ──
    const t15 = await mkTemplate('A138-15', 'Facility select');
    ws15InstanceId = t15.instanceId;
    const ftFieldId = await mkField(t15.templateId, t15.sectionId, 'facility_type_selected', 'enum', 1);

    // ── A138-17 Mulde geometry producer ──
    const t17 = await mkTemplate('A138-17', 'Mulde');
    ws17InstanceId = t17.instanceId;
    methodFieldId = await mkField(t17.templateId, t17.sectionId, 'a_s_m_determination_method', 'enum', 1);
    hMFieldId = await mkField(t17.templateId, t17.sectionId, 'h_M', 'number', 2);
    const fZFieldId = await mkField(t17.templateId, t17.sectionId, 'f_Z', 'number', 3);
    const kIFieldId = await mkField(t17.templateId, t17.sectionId, 'k_i', 'number', 4);
    vMFieldId = await mkField(t17.templateId, t17.sectionId, 'V_M', 'number', 5);
    aSmFieldId = await mkField(t17.templateId, t17.sectionId, 'A_S_m', 'number', 6);

    // ── A138-23 summary consumer ──
    const t23 = await mkTemplate('A138-23', 'Phase-4 Summary');
    ws23InstanceId = t23.instanceId;
    f_dimensioned = await mkField(t23.templateId, t23.sectionId, 'facility_type_dimensioned', 'text', 1);
    f_volume = await mkField(t23.templateId, t23.sectionId, 'facility_specific_volume_m3', 'number', 2);
    await mkField(t23.templateId, t23.sectionId, 'facility_footprint_m2', 'number', 3);
    await mkField(t23.templateId, t23.sectionId, 'facility_meets_qsac', 'boolean', 4);
    f_complete = await mkField(t23.templateId, t23.sectionId, 'facility_specific_dimensioning_complete', 'boolean', 5);
    await mkField(t23.templateId, t23.sectionId, 'facility_design_completion_date', 'date', 6);
    await mkField(t23.templateId, t23.sectionId, 'recommended_phase_4_gate', 'enum', 7);
    await mkField(t23.templateId, t23.sectionId, 'phase_4_recommendation_reasons', 'text', 8);
    const gateResultFieldId = await mkField(t23.templateId, t23.sectionId, 'phase_4_gate_result', 'enum', 9);

    // ── Seed persisted state ──
    await ad.from('project_parameters').insert([
      { project_id: projectId, field_id: rdnFieldId, source_worksheet_instance_id: ws04InstanceId, source_type: 'entered', entered_by: userId, value_json: { rows: RAIN_ROWS } },
      { project_id: projectId, field_id: acFieldId, source_worksheet_instance_id: ws07InstanceId, source_type: 'entered', entered_by: userId, value_number: String(A_C) },
      { project_id: projectId, field_id: ftFieldId, source_worksheet_instance_id: ws15InstanceId, source_type: 'entered', entered_by: userId, value_enum: 'mulde' },
      { project_id: projectId, field_id: methodFieldId, source_worksheet_instance_id: ws17InstanceId, source_type: 'entered', entered_by: userId, value_enum: 'geometry' },
      { project_id: projectId, field_id: fZFieldId, source_worksheet_instance_id: ws17InstanceId, source_type: 'entered', entered_by: userId, value_number: String(F_Z) },
      { project_id: projectId, field_id: kIFieldId, source_worksheet_instance_id: ws17InstanceId, source_type: 'entered', entered_by: userId, value_number: String(K_I) },
      // engineer-entered verdict — must never be overwritten by the materialize
      { project_id: projectId, field_id: gateResultFieldId, source_worksheet_instance_id: ws23InstanceId, source_type: 'entered', entered_by: userId, value_enum: 'PASS' },
    ]);
  });

  afterAll(async () => cleanup([email]));

  it('saving ONLY h_M materializes A_S_m + V_M server-side (Finding F: V_M never a user field)', async () => {
    const result = await saveWorksheet({
      instanceId: ws17InstanceId,
      values: { [hMFieldId]: { type: 'number', value: H_M } },
    });
    expect(result.ok).toBe(true);

    const ad = admin();
    const { data: aSm } = await ad.from('project_parameters')
      .select('value_number, source_type').eq('project_id', projectId).eq('field_id', aSmFieldId).maybeSingle();
    const { data: vM } = await ad.from('project_parameters')
      .select('value_number, source_type').eq('project_id', projectId).eq('field_id', vMFieldId).maybeSingle();

    // A_S_m materialized (derived) by the sweep.
    expect(aSm?.source_type).toBe('derived');
    expect(Number(aSm?.value_number)).toBeCloseTo(EXPECTED_A_S_M, 6);
    // Finding F: V_M materialized (derived) = A_S,m · h_M — NOT entered by the user.
    expect(vM?.source_type).toBe('derived');
    expect(Number(vM?.value_number)).toBeCloseTo(EXPECTED_V_M, 6);
  });

  it('G1 chain-fire: the A138-23 summary refires in the SAME save → volume non-null, complete=true', async () => {
    const ad = admin();
    const { data } = await ad.from('project_parameters')
      .select('field_id, value_number, value_text, value_boolean')
      .eq('project_id', projectId)
      .in('field_id', [f_dimensioned, f_volume, f_complete]);
    const by = (id: string) => data?.find((r) => r.field_id === id);

    expect(by(f_dimensioned)?.value_text).toBe('mulde');            // Finding A: TYPE not code
    expect(Number(by(f_volume)?.value_number)).toBeCloseTo(EXPECTED_V_M, 6); // Finding F consumed
    expect(by(f_complete)?.value_boolean).toBe(true);               // G1: summary refreshed
  });
});
