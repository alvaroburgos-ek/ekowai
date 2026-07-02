/**
 * Task B1-T3 integration test: saveWorksheet A138-12 → Tab.6 loading-check materialize.
 *
 * REQUIRES: DATABASE_URL in .env.local pointing at a live Supabase instance.
 * Without it, the _setup-env import throws "DATABASE_URL not set" before any test runs.
 *
 * Setup: seeds A138-06/07/12 worksheet templates + fields, persists cross-worksheet
 * inputs via project_parameters:
 *   - A_C=1000 (from A138-07)
 *   - flaechengruppe='V2' (from A138-06, stored as value_enum)
 *   - bbz_thickness=0.30 (from A138-06)
 *   - A_S_m=45 (local to A138-12, included in save batch)
 *
 * Save: triggers saveWorksheet on A138-12 with {A_S_m, ac_as_ratio} (ac_as_ratio in
 *   batch is the detection signal).
 *
 * Asserts four derived rows on A138-12:
 *   ac_as_ratio        ≈ 22.222 (1000/45), source_type='derived'
 *   ac_as_ratio_limit  = 50 (V2 @0.30m thick band), source_type='derived'
 *   ac_as_ratio_check  = 'pass', source_type='derived'
 *   ac_as_ratio_check_reason = null (evaluated result has no reason), source_type='derived'
 *
 * Negative case: a non-A138-12 template save (A138-07/A_C) does NOT write loading-check
 * derived rows to A138-12.
 *
 * Pattern mirrors the basin integration in worksheet.test.ts.
 */

// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import './_setup-env';

import { admin, makeUser, cleanup } from '../../../../tests/rls/helpers';
import { saveWorksheet } from '../worksheet';

describe('saveWorksheet — A138-12 Tab.6 loading-check materialize (integration)', () => {
  const email = `lc-task3-integ-${Date.now()}@test.local`;
  let projectId = '';

  // A138-12 (loading check worksheet)
  let ws12InstanceId = '';
  let ws07InstanceId = '';
  let aSmFieldId = '';
  let acAsRatioFieldId = '';
  let acAsRatioLimitFieldId = '';
  let acAsRatioCheckFieldId = '';
  let acAsRatioReasonFieldId = '';
  let aCFieldId = '';

  // Test parameters: A_C=1000, A_S_m=45, V2 @0.30m → ratio≈22.22, limit=50, pass
  const A_C_VAL = 1000;
  const A_S_M_VAL = 45;
  const EXPECTED_RATIO = A_C_VAL / A_S_M_VAL;
  const EXPECTED_LIMIT = 50;
  const EXPECTED_CHECK = 'pass';

  beforeAll(async () => {
    const u = await makeUser(email);
    const userId = u.id;
    const ad = admin();

    // Org + project
    const { data: org } = await ad
      .from('orgs')
      .insert({ name: 'LC Task3 Integ', slug: `lc-t3-integ-${Date.now()}` })
      .select('id').single();
    await ad.from('org_members').insert({ org_id: org!.id, user_id: userId, role: 'owner' });
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: org!.id, name: 'LC-Task3-Integ', created_by: userId })
      .select('id').single();
    projectId = proj!.id;

    // Standard
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `LC-T3I-${Date.now()}`, title_de: 'LC Task3 Integ', version: 'test' })
      .select('id').single();

    // ---------- A138-12 template ----------
    const { data: tmpl12 } = await ad.from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'A138-12', title_de: 'BBZ Loading' })
      .select('id').single();
    const { data: sec12 } = await ad.from('worksheet_sections')
      .insert({ worksheet_template_id: tmpl12!.id, code: 'S12', title_de: 'S12' })
      .select('id').single();

    for (const [sym, dt, oi] of [
      ['A_S_m',                   'number', 1],
      ['ac_as_ratio',             'number', 2],
      ['ac_as_ratio_limit',       'number', 3],
      ['ac_as_ratio_check',       'text',   4],
      ['ac_as_ratio_check_reason','text',   5],
    ] as const) {
      const { data: f } = await ad.from('fields')
        .insert({
          worksheet_template_id: tmpl12!.id,
          section_id: sec12!.id,
          symbol: sym,
          label_de: sym,
          data_type: dt,
          active: true,
          order_index: oi,
        })
        .select('id').single();
      if (sym === 'A_S_m')                    aSmFieldId              = f!.id;
      if (sym === 'ac_as_ratio')              acAsRatioFieldId        = f!.id;
      if (sym === 'ac_as_ratio_limit')        acAsRatioLimitFieldId   = f!.id;
      if (sym === 'ac_as_ratio_check')        acAsRatioCheckFieldId   = f!.id;
      if (sym === 'ac_as_ratio_check_reason') acAsRatioReasonFieldId  = f!.id;
    }
    const { data: inst12 } = await ad.from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: tmpl12!.id })
      .select('id').single();
    ws12InstanceId = inst12!.id;

    // ---------- A138-06 template (flaechengruppe + bbz_thickness) ----------
    const { data: tmpl06 } = await ad.from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'A138-06', title_de: 'BBZ Aufbau' })
      .select('id').single();
    const { data: sec06 } = await ad.from('worksheet_sections')
      .insert({ worksheet_template_id: tmpl06!.id, code: 'S06', title_de: 'S06' })
      .select('id').single();
    const { data: fFg } = await ad.from('fields')
      .insert({ worksheet_template_id: tmpl06!.id, section_id: sec06!.id, symbol: 'flaechengruppe', label_de: 'Flächengruppe', data_type: 'enum', active: true, order_index: 1 })
      .select('id').single();
    const { data: fBbz } = await ad.from('fields')
      .insert({ worksheet_template_id: tmpl06!.id, section_id: sec06!.id, symbol: 'bbz_thickness', label_de: 'BBZ-Mächtigkeit', data_type: 'number', active: true, order_index: 2 })
      .select('id').single();
    const { data: inst06 } = await ad.from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: tmpl06!.id })
      .select('id').single();

    // ---------- A138-07 template (A_C) ----------
    const { data: tmpl07 } = await ad.from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'A138-07', title_de: 'Surface' })
      .select('id').single();
    const { data: sec07 } = await ad.from('worksheet_sections')
      .insert({ worksheet_template_id: tmpl07!.id, code: 'S07', title_de: 'S07' })
      .select('id').single();
    const { data: fAC } = await ad.from('fields')
      .insert({ worksheet_template_id: tmpl07!.id, section_id: sec07!.id, symbol: 'A_C', label_de: 'A_C', data_type: 'number', active: true, order_index: 1 })
      .select('id').single();
    aCFieldId = fAC!.id;
    const { data: inst07 } = await ad.from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: tmpl07!.id })
      .select('id').single();
    ws07InstanceId = inst07!.id;

    // ---------- Seed cross-worksheet project_parameters ----------
    await ad.from('project_parameters').insert([
      {
        project_id: projectId, field_id: aCFieldId,
        source_worksheet_instance_id: inst07!.id,
        source_type: 'entered', entered_by: userId,
        value_number: String(A_C_VAL),
      },
      {
        project_id: projectId, field_id: fFg!.id,
        source_worksheet_instance_id: inst06!.id,
        source_type: 'entered', entered_by: userId,
        value_enum: 'V2',
      },
      {
        project_id: projectId, field_id: fBbz!.id,
        source_worksheet_instance_id: inst06!.id,
        source_type: 'entered', entered_by: userId,
        value_number: '0.30',
      },
    ]);
  });

  afterAll(async () => cleanup([email]));

  it('RED→GREEN: A138-12 save (with ac_as_ratio in batch) writes four derived rows', async () => {
    // Save A_S_m + ac_as_ratio on A138-12. Including ac_as_ratio triggers loadingPresence.
    const result = await saveWorksheet({
      instanceId: ws12InstanceId,
      values: {
        [aSmFieldId]:       { type: 'number', value: A_S_M_VAL },
        // ac_as_ratio is a 'number' field (data_type persisted by migration);
        // null here — the materialize overwrites it with the computed value.
        [acAsRatioFieldId]: { type: 'number', value: null },
      },
    });
    expect(result.ok).toBe(true);

    const { data: params } = await admin()
      .from('project_parameters')
      .select('field_id, source_type, value_number, value_text')
      .eq('project_id', projectId)
      .in('field_id', [acAsRatioFieldId, acAsRatioLimitFieldId, acAsRatioCheckFieldId, acAsRatioReasonFieldId]);

    const byField = (id: string) => params?.find((p) => p.field_id === id);
    const ratioRow  = byField(acAsRatioFieldId);
    const limitRow  = byField(acAsRatioLimitFieldId);
    const checkRow  = byField(acAsRatioCheckFieldId);
    const reasonRow = byField(acAsRatioReasonFieldId);

    // All four rows must be derived
    expect(ratioRow?.source_type).toBe('derived');
    expect(limitRow?.source_type).toBe('derived');
    expect(checkRow?.source_type).toBe('derived');
    expect(reasonRow?.source_type).toBe('derived');

    // Numeric: ratio ≈ 22.222, limit = 50
    expect(Number(ratioRow?.value_number)).toBeCloseTo(EXPECTED_RATIO, 3);
    expect(Number(limitRow?.value_number)).toBeCloseTo(EXPECTED_LIMIT, 3);

    // Text: check = 'pass', reason = null (evaluated, pass/fail have no reason)
    expect(checkRow?.value_text).toBe(EXPECTED_CHECK);
    expect(reasonRow?.value_text).toBeNull();
  });

  it('NEGATIVE: A138-07 save does NOT write A138-12 loading-check derived rows', async () => {
    const ad = admin();
    // Delete any rows written by the previous test so we can detect spurious writes
    await ad.from('project_parameters')
      .delete()
      .eq('project_id', projectId)
      .in('field_id', [acAsRatioCheckFieldId, acAsRatioReasonFieldId]);

    // Save A_C on A138-07 — should NOT touch A138-12 derived rows
    const result = await saveWorksheet({
      instanceId: ws07InstanceId,
      values: {
        [aCFieldId]: { type: 'number', value: A_C_VAL },
      },
    });
    expect(result.ok).toBe(true);

    const { data: rows } = await ad
      .from('project_parameters')
      .select('field_id')
      .eq('project_id', projectId)
      .eq('field_id', acAsRatioCheckFieldId);

    expect(rows?.length ?? 0).toBe(0);
  });
});
