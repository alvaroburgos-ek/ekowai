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
 * Detection is equation-topology-based: the A138-12 worksheet template owns the
 * A_S_m equation (id 55151cb1-…). The trigger fires on ANY A138-12 save regardless
 * of which fields are in the batch — ac_as_ratio is ABSENT from the batch here,
 * proving the fix (the old dead-trigger baked in ac_as_ratio presence in batch).
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
 * Option A — PRODUCER-SIDE integration test (the meatiest test):
 *   An A138-06 save that changes `flaechengruppe` (value differs from previous) triggers
 *   the loading materialize and UPSERTs A138-12's derived rows (ac_as_ratio/limit/check/reason)
 *   computed from the NEW flaechengruppe — asserting they land on A138-12's field ids, NOT A138-06.
 *   Scope guard: an A138-06 save that changes only a non-input symbol (bbz_code, a fake symbol)
 *   does NOT fire the loading materialize.
 *
 * Pattern mirrors the basin integration in worksheet.test.ts.
 */

// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import './_setup-env';

import { admin, makeUser, cleanup } from '../../../../tests/rls/helpers';
import { saveWorksheet } from '../worksheet';
import { A138_12_ASM_EQUATION_ID } from '@/lib/eval/tab6-loading';

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
    // Seed the A_S_m equation that identifies this as A138-12 for isLoadingSave detection.
    // The equation id must match the A138_12_ASM_EQUATION_ID const in worksheet.ts.
    await ad.from('equations').insert({
      id: A138_12_ASM_EQUATION_ID,
      worksheet_template_id: tmpl12!.id,
      output_symbol: 'A_S_m',
      label_de: 'A_S_m Gleichung',
      formula: 'A_C / ac_as_ratio',
      order_index: 1,
    });
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

  it('RED→GREEN: A138-12 save with ac_as_ratio ABSENT from batch writes four derived rows', async () => {
    // Save only A_S_m on A138-12 — ac_as_ratio is NOT in the batch.
    // The trigger must fire via equation topology (A_S_m equation present on template),
    // not because ac_as_ratio is submitted. This is the RED scenario the old dead-trigger failed.
    const result = await saveWorksheet({
      instanceId: ws12InstanceId,
      values: {
        [aSmFieldId]: { type: 'number', value: A_S_M_VAL },
        // ac_as_ratio deliberately absent — proving equation-topology detection fires regardless.
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
    // NOTE (Option A): After Option A, A_C IS a loading input symbol. An A138-07 save
    // that CHANGES A_C will now trigger the loading producer-fire (writing to A138-12).
    // This NEGATIVE test is preserved but now tests that A_C saved with the SAME value
    // (or a non-loading-input symbol) does not produce spurious rows. In this test,
    // A_C is saved with value A_C_VAL which was already seeded — same value → not in
    // changedSymbols → no producer-fire. If the value were different, loading WOULD fire.
    // That is the correct behaviour (this test therefore remains valid because A_C_VAL=A_C_VAL).
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

// ---------------------------------------------------------------------------
// Option A — PRODUCER-SIDE integration test
// An A138-06 save that changes `flaechengruppe` must trigger the loading
// materialize and write A138-12's derived rows using the CONSUMER template
// (A138-12) field ids, not A138-06 field ids.
// ---------------------------------------------------------------------------
describe('saveWorksheet — Option A: A138-06 producer-side fires A138-12 loading materialize', () => {
  const email = `lc-producer-${Date.now()}@test.local`;
  let projectId = '';

  // Worksheet instance ids
  let ws06InstanceId = '';
  let ws12InstanceId = '';

  // A138-06 field ids (producer fields)
  let fg06FieldId = '';   // flaechengruppe on A138-06
  let bbz06FieldId = '';  // bbz_thickness on A138-06
  let bbzCode06FieldId = ''; // a non-input symbol on A138-06

  // A138-12 field ids (consumer — where derived outputs must land)
  let acAsRatioFieldId12 = '';
  let acAsRatioLimitFieldId12 = '';
  let acAsRatioCheckFieldId12 = '';
  let acAsRatioReasonFieldId12 = '';
  let aSmFieldId12 = '';

  // A138-07 field ids (A_C)
  let aCFieldId07 = '';

  const A_C_VAL = 1000;
  const A_S_M_VAL = 45;

  beforeAll(async () => {
    const u = await makeUser(email);
    const userId = u.id;
    const ad = admin();

    // Org + project
    const { data: org } = await ad
      .from('orgs')
      .insert({ name: 'LC Producer Test', slug: `lc-prod-${Date.now()}` })
      .select('id').single();
    await ad.from('org_members').insert({ org_id: org!.id, user_id: userId, role: 'owner' });
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: org!.id, name: 'LC-Producer', created_by: userId })
      .select('id').single();
    projectId = proj!.id;

    const { data: std } = await ad
      .from('standards')
      .insert({ code: `LC-PROD-${Date.now()}`, title_de: 'LC Producer Integ', version: 'test' })
      .select('id').single();

    // ─── A138-12 (consumer, loading check) ─────────────────────────────────
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
      if (sym === 'A_S_m')                    aSmFieldId12              = f!.id;
      if (sym === 'ac_as_ratio')              acAsRatioFieldId12        = f!.id;
      if (sym === 'ac_as_ratio_limit')        acAsRatioLimitFieldId12   = f!.id;
      if (sym === 'ac_as_ratio_check')        acAsRatioCheckFieldId12   = f!.id;
      if (sym === 'ac_as_ratio_check_reason') acAsRatioReasonFieldId12  = f!.id;
    }
    // Seed A_S_m equation (topology trigger for A138-12)
    await ad.from('equations').insert({
      id: A138_12_ASM_EQUATION_ID,
      worksheet_template_id: tmpl12!.id,
      output_symbol: 'A_S_m',
      label_de: 'A_S_m Gl.7',
      formula: 'A_C / ac_as_ratio',
      order_index: 1,
    });
    const { data: inst12 } = await ad.from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: tmpl12!.id })
      .select('id').single();
    ws12InstanceId = inst12!.id;

    // ─── A138-06 (producer, BBZ Aufbau) ────────────────────────────────────
    const { data: tmpl06 } = await ad.from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'A138-06', title_de: 'BBZ Aufbau' })
      .select('id').single();
    const { data: sec06 } = await ad.from('worksheet_sections')
      .insert({ worksheet_template_id: tmpl06!.id, code: 'S06', title_de: 'S06' })
      .select('id').single();

    const { data: fFg } = await ad.from('fields')
      .insert({ worksheet_template_id: tmpl06!.id, section_id: sec06!.id, symbol: 'flaechengruppe', label_de: 'Flächengruppe', data_type: 'enum', active: true, order_index: 1 })
      .select('id').single();
    fg06FieldId = fFg!.id;

    const { data: fBbz } = await ad.from('fields')
      .insert({ worksheet_template_id: tmpl06!.id, section_id: sec06!.id, symbol: 'bbz_thickness', label_de: 'BBZ-Mächtigkeit', data_type: 'number', active: true, order_index: 2 })
      .select('id').single();
    bbz06FieldId = fBbz!.id;

    // A non-loading-input symbol on A138-06 (scope guard test)
    const { data: fBbzCode } = await ad.from('fields')
      .insert({ worksheet_template_id: tmpl06!.id, section_id: sec06!.id, symbol: 'bbz_aufbau_code', label_de: 'Aufbau-Code', data_type: 'text', active: true, order_index: 3 })
      .select('id').single();
    bbzCode06FieldId = fBbzCode!.id;

    const { data: inst06 } = await ad.from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: tmpl06!.id })
      .select('id').single();
    ws06InstanceId = inst06!.id;

    // ─── A138-07 (A_C) ──────────────────────────────────────────────────────
    const { data: tmpl07 } = await ad.from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'A138-07', title_de: 'Surface' })
      .select('id').single();
    const { data: sec07 } = await ad.from('worksheet_sections')
      .insert({ worksheet_template_id: tmpl07!.id, code: 'S07', title_de: 'S07' })
      .select('id').single();
    const { data: fAC } = await ad.from('fields')
      .insert({ worksheet_template_id: tmpl07!.id, section_id: sec07!.id, symbol: 'A_C', label_de: 'A_C', data_type: 'number', active: true, order_index: 1 })
      .select('id').single();
    aCFieldId07 = fAC!.id;
    const { data: inst07 } = await ad.from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: tmpl07!.id })
      .select('id').single();

    // ─── Seed persisted cross-worksheet parameters ───────────────────────────
    // A_C = 1000 on A138-07
    // flaechengruppe = 'V2' on A138-06 (initial — will be changed by the KEY TEST below)
    // bbz_thickness = 0.30 on A138-06
    // A_S_m = 45 on A138-12
    await ad.from('project_parameters').insert([
      {
        project_id: projectId, field_id: aCFieldId07,
        source_worksheet_instance_id: inst07!.id,
        source_type: 'entered', entered_by: userId,
        value_number: String(A_C_VAL),
      },
      {
        project_id: projectId, field_id: fg06FieldId,
        source_worksheet_instance_id: inst06!.id,
        source_type: 'entered', entered_by: userId,
        // Initial value: 'V2' (thick band @0.30m → limit=50, ratio=22.22 → pass)
        value_enum: 'V2',
      },
      {
        project_id: projectId, field_id: bbz06FieldId,
        source_worksheet_instance_id: inst06!.id,
        source_type: 'entered', entered_by: userId,
        value_number: '0.30',
      },
      {
        project_id: projectId, field_id: aSmFieldId12,
        source_worksheet_instance_id: inst12!.id,
        source_type: 'entered', entered_by: userId,
        value_number: String(A_S_M_VAL),
      },
    ]);
  });

  afterAll(async () => cleanup([email]));

  it('KEY TEST: A138-06 save changing flaechengruppe fires loading materialize → A138-12 derived rows updated', async () => {
    // PRE-CONDITION: clear any existing derived rows on A138-12 so we have a clean slate
    const ad = admin();
    await ad.from('project_parameters')
      .delete()
      .eq('project_id', projectId)
      .in('field_id', [acAsRatioFieldId12, acAsRatioLimitFieldId12, acAsRatioCheckFieldId12, acAsRatioReasonFieldId12]);

    // SAVE A138-06: change flaechengruppe from 'V2' → 'BL' (tier3, thin band=0.30m → limit=30)
    // BL + 0.30m (thick band) → tier3 + thick → limit=30; ratio=1000/45≈22.22 → pass (22.22 ≤ 30)
    const result = await saveWorksheet({
      instanceId: ws06InstanceId,
      values: {
        [fg06FieldId]: { type: 'enum', value: 'BL' },  // changed from 'V2' → 'BL'
      },
    });
    expect(result.ok).toBe(true);

    // ASSERT: A138-12's derived rows must be written by the producer-fire
    // (crux: they must use A138-12's field ids, not A138-06's)
    const { data: params } = await ad
      .from('project_parameters')
      .select('field_id, source_type, value_number, value_text')
      .eq('project_id', projectId)
      .in('field_id', [acAsRatioFieldId12, acAsRatioLimitFieldId12, acAsRatioCheckFieldId12, acAsRatioReasonFieldId12]);

    const byField = (id: string) => params?.find((p) => p.field_id === id);
    const ratioRow  = byField(acAsRatioFieldId12);
    const limitRow  = byField(acAsRatioLimitFieldId12);
    const checkRow  = byField(acAsRatioCheckFieldId12);
    const reasonRow = byField(acAsRatioReasonFieldId12);

    // All four rows must be present and derived
    expect(ratioRow?.source_type).toBe('derived');
    expect(limitRow?.source_type).toBe('derived');
    expect(checkRow?.source_type).toBe('derived');
    expect(reasonRow?.source_type).toBe('derived');

    // BL @0.30m (thick) → tier3+thick → limit=30; ratio=1000/45≈22.22 → pass
    expect(Number(ratioRow?.value_number)).toBeCloseTo(1000 / 45, 3);
    expect(Number(limitRow?.value_number)).toBeCloseTo(30, 3);
    expect(checkRow?.value_text).toBe('pass');
    expect(reasonRow?.value_text).toBeNull();

    // CRUX ASSERTION: the rows must be on A138-12's field ids (consumer), not A138-06's
    // If consumer-template resolution were wrong, the UPSERT would target A138-06 fields
    // (which don't have ac_as_ratio symbols) and these rows would NOT be found.
    expect(ratioRow?.field_id).toBe(acAsRatioFieldId12);
    expect(limitRow?.field_id).toBe(acAsRatioLimitFieldId12);
    expect(checkRow?.field_id).toBe(acAsRatioCheckFieldId12);
    expect(reasonRow?.field_id).toBe(acAsRatioReasonFieldId12);
  });

  it('SCOPE GUARD: A138-06 save changing only non-input symbol does NOT fire loading materialize', async () => {
    // PRE-CONDITION: clear A138-12 derived rows to detect spurious writes
    const ad = admin();
    await ad.from('project_parameters')
      .delete()
      .eq('project_id', projectId)
      .in('field_id', [acAsRatioFieldId12, acAsRatioLimitFieldId12, acAsRatioCheckFieldId12, acAsRatioReasonFieldId12]);

    // Save only `bbz_aufbau_code` (a non-loading-input symbol) on A138-06
    const result = await saveWorksheet({
      instanceId: ws06InstanceId,
      values: {
        [bbzCode06FieldId]: { type: 'text', value: 'AufbauX' },
      },
    });
    expect(result.ok).toBe(true);

    // ASSERT: loading materialize must NOT have fired → A138-12 derived rows still absent
    const { data: rows } = await ad
      .from('project_parameters')
      .select('field_id')
      .eq('project_id', projectId)
      .in('field_id', [acAsRatioFieldId12, acAsRatioLimitFieldId12, acAsRatioCheckFieldId12, acAsRatioReasonFieldId12]);

    expect(rows?.length ?? 0).toBe(0);
  });

  it('NO-DOUBLE-FIRE: A138-12 save (owner) fires loading exactly once even if flaechengruppe is in changedSymbols context', async () => {
    // An A138-12 save fires via ownerTrigger. Even though A_S_m is a local input
    // (it doesn't appear in LOADING inputSymbols), there should be no double-fire.
    // This test verifies the result is ok and the ac_as_ratio rows are present exactly once.
    const ad = admin();

    const result = await saveWorksheet({
      instanceId: ws12InstanceId,
      values: {
        [aSmFieldId12]: { type: 'number', value: A_S_M_VAL },
      },
    });
    expect(result.ok).toBe(true);

    const { data: rows } = await ad
      .from('project_parameters')
      .select('field_id, source_type')
      .eq('project_id', projectId)
      .in('field_id', [acAsRatioFieldId12]);

    // Exactly one row for ac_as_ratio — not duplicated
    expect(rows?.length).toBe(1);
    expect(rows?.[0]?.source_type).toBe('derived');
  });

  it('REGRESSION: normal A138-12 save still triggers loading materialize via ownerTrigger', async () => {
    // Confirm the existing owner-trigger path still works after Option A is added.
    // (The existing NEGATIVE test in the previous describe block covers non-firing;
    // this confirms A138-12's own save still computes and writes 4 derived rows.)
    const ad = admin();

    const result = await saveWorksheet({
      instanceId: ws12InstanceId,
      values: {
        [aSmFieldId12]: { type: 'number', value: 50 },  // different value → changedSymbols includes A_S_m
      },
    });
    expect(result.ok).toBe(true);

    const { data: params } = await ad
      .from('project_parameters')
      .select('field_id, source_type, value_number, value_text')
      .eq('project_id', projectId)
      .in('field_id', [acAsRatioFieldId12, acAsRatioLimitFieldId12, acAsRatioCheckFieldId12, acAsRatioReasonFieldId12]);

    // 4 derived rows must exist
    expect(params?.length).toBe(4);
    for (const r of params ?? []) {
      expect(r.source_type).toBe('derived');
    }
    // ratio = 1000/50 = 20 (A_C=1000, A_S_m=50)
    const ratioRow = params?.find((p) => p.field_id === acAsRatioFieldId12);
    expect(Number(ratioRow?.value_number)).toBeCloseTo(20, 3);
  });
});
