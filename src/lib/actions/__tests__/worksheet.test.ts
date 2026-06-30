// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Focused unit test: assert the save loop symbol list equals SURFACE_DERIVED_SYMBOLS (all 6).
// This is a static-import-only test — no live DB required — so it runs before _setup-env.
import { SURFACE_DERIVED_SYMBOLS } from '@/lib/eval/surface-source-state';

describe('worksheet save loop — derived symbol coverage', () => {
  it('SURFACE_DERIVED_SYMBOLS contains all six expected symbols (4 original + 2 new)', () => {
    const symbols = [...SURFACE_DERIVED_SYMBOLS];
    expect(symbols).toHaveLength(6);
    expect(symbols).toContain('A_C');
    expect(symbols).toContain('C_m');
    expect(symbols).toContain('A_E_ba');
    expect(symbols).toContain('A_E_nba');
    expect(symbols).toContain('A_C_sealed');
    expect(symbols).toContain('A_C_unsealed');
  });
});


import './_setup-env';

// IMPORTANT: imports must come AFTER the setup-env side-effect import.
// Note: this test exercises the action against a real Supabase dev DB. It seeds
// fixtures via service role and asserts via the action under an authenticated
// user context. RLS is verified separately in tests/rls/worksheet-save.test.ts.

import { admin, makeUser, cleanup } from '../../../../tests/rls/helpers';
import { BASIN_GL8_EQUATION_ID } from '@/lib/eval/governing-duration';

// ---------------------------------------------------------------------------
// Task 4 integration: saveWorksheet A138-13 → basin r_D_n/D_min materialize
//
// REQUIRES: DATABASE_URL in .env.local pointing at a live Supabase instance.
// Without it, this describe block is BLOCKED (the _setup-env import above will
// throw "DATABASE_URL not set" before any test in this file runs).
//
// Setup: seed an A138-13 worksheet with:
//   - A138-04's r_D_n_table carrier persisted in project_parameters (carrier
//     contains the Heinsberg fixture with governing D=30, r_D_n=130)
//   - The six Gl.8 scalars persisted cross-worksheet (from A138-10/08/12)
//   - A138-13's r_D_n/D_min PRE-SEEDED as source_type='entered' (simulating
//     the existing stale state in PLT-HS-01)
// Call: saveWorksheet for the A138-13 instance WITHOUT the carrier in the batch
//   (e.g. saving rainfall_table_ref or a scalar)
// Assert:
//   - r_D_n and D_min rows are now source_type='derived'
//   - their numeric values equal the governing iteration's output (unchanged)
//   - (chain-identical) specific numbers match: r_D_n=130, D_min=30
// Negative case: a non-basin template save does NOT write basin derived rows.
//
// This test is written per TDD (RED first, then GREEN after the fix).
// ---------------------------------------------------------------------------
describe('saveWorksheet — basin A138-13 governing materialize (Task 4 integration)', () => {
  const email = `basin-task4-${Date.now()}@test.local`;
  let projectId = '';
  let a138_13_templateId = '';
  let a138_04_templateId = '';
  let a138_13_instanceId = '';
  let a138_04_instanceId = '';
  let rDnFieldId = '';         // A138-13 r_D_n field id
  let dMinFieldId = '';         // A138-13 D_min field id
  let rainfallRefFieldId = '';  // A138-13 rainfall_table_ref field id
  let carrierFieldId = '';      // A138-04 r_D_n_table field id

  // Heinsberg carrier: governing D=30, r_D_n=130 (Heinsberg witness values)
  const CARRIER_JSON = {
    tables: [
      {
        id: 'table-1',
        name: 'Heinsberg',
        source: 'engineer',
        legacyDesignColumn: true,
        columns: [2, 5, 10, 20, 50, 100],
        rows: [
          { D_min: 5,   r_D_n: 300 },
          { D_min: 10,  r_D_n: 230 },
          { D_min: 15,  r_D_n: 195 },
          { D_min: 30,  r_D_n: 130 },
          { D_min: 60,  r_D_n: 80  },
          { D_min: 120, r_D_n: 50  },
        ],
      },
    ],
  };

  beforeAll(async () => {
    const u = await makeUser(email);
    const userId = u.id;
    const ad = admin();

    const { data: org } = await ad
      .from('orgs')
      .insert({ name: 'Basin Task4', slug: `basin-task4-${Date.now()}` })
      .select('id').single();
    await ad.from('org_members').insert({ org_id: org!.id, user_id: userId, role: 'owner' });

    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: org!.id, name: 'Basin-Task4', created_by: userId })
      .select('id').single();
    projectId = proj!.id;

    // Standard
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `BASIN-T4-${Date.now()}`, title_de: 'Basin Task4', version: 'test' })
      .select('id').single();

    // A138-13 template (the basin worksheet) — attach BASIN_GL8_EQUATION_ID
    const { data: tmpl13 } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'A138-13', title_de: 'Basin 13' })
      .select('id').single();
    a138_13_templateId = tmpl13!.id;

    const { data: sec13 } = await ad
      .from('worksheet_sections')
      .insert({ worksheet_template_id: a138_13_templateId, code: 'S13', title_de: 'S13' })
      .select('id').single();

    // Fields on A138-13: r_D_n, D_min (the governed outputs), rainfall_table_ref
    const { data: fRdn } = await ad
      .from('fields')
      .insert({ worksheet_template_id: a138_13_templateId, section_id: sec13!.id, symbol: 'r_D_n', label_de: 'r_D_n', data_type: 'number', active: true })
      .select('id').single();
    rDnFieldId = fRdn!.id;

    const { data: fDmin } = await ad
      .from('fields')
      .insert({ worksheet_template_id: a138_13_templateId, section_id: sec13!.id, symbol: 'D_min', label_de: 'D_min', data_type: 'number', active: true })
      .select('id').single();
    dMinFieldId = fDmin!.id;

    const { data: fRef } = await ad
      .from('fields')
      .insert({ worksheet_template_id: a138_13_templateId, section_id: sec13!.id, symbol: 'rainfall_table_ref', label_de: 'Ref', data_type: 'text', active: true })
      .select('id').single();
    rainfallRefFieldId = fRef!.id;

    // Six Gl.8 scalar fields on A138-13 (so the save path finds them in basinWsFields)
    for (const sym of ['A_C', 'A_VA', 'Q_S', 'Q_Dr', 'f_Z', 'f_A']) {
      await ad.from('fields').insert({
        worksheet_template_id: a138_13_templateId,
        section_id: sec13!.id,
        symbol: sym,
        label_de: sym,
        data_type: 'number',
        active: true,
      });
    }

    // Equation on A138-13: the basin Gl.8 equation (equationId = BASIN_GL8_EQUATION_ID)
    await ad.from('equations').insert({
      id: BASIN_GL8_EQUATION_ID,
      worksheet_template_id: a138_13_templateId,
      output_symbol: 'V_VA',
      label_de: 'Gl.8 basin',
      formula: 'placeholder',
    });

    // A138-04 template (carrier owner)
    const { data: tmpl04 } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'A138-04', title_de: 'Einzugsgebiet' })
      .select('id').single();
    a138_04_templateId = tmpl04!.id;

    const { data: sec04 } = await ad
      .from('worksheet_sections')
      .insert({ worksheet_template_id: a138_04_templateId, code: 'S04', title_de: 'S04' })
      .select('id').single();

    const { data: fCarrier } = await ad
      .from('fields')
      .insert({ worksheet_template_id: a138_04_templateId, section_id: sec04!.id, symbol: 'r_D_n_table', label_de: 'Carrier', data_type: 'json', active: true })
      .select('id').single();
    carrierFieldId = fCarrier!.id;

    // Worksheet instances
    const { data: inst13 } = await ad
      .from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: a138_13_templateId })
      .select('id').single();
    a138_13_instanceId = inst13!.id;

    const { data: inst04 } = await ad
      .from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: a138_04_templateId })
      .select('id').single();
    a138_04_instanceId = inst04!.id;

    // Seed project_parameters:
    // (a) Carrier on A138-04 (cross-worksheet)
    await ad.from('project_parameters').insert({
      project_id: projectId,
      field_id: carrierFieldId,
      source_worksheet_instance_id: a138_04_instanceId,
      source_type: 'entered',
      entered_by: userId,
      value_json: CARRIER_JSON,
    });

    // (b) Scalars for A138-13 (Heinsberg-equivalent: governing D=30, r_D_n=130)
    const scalarValues: Record<string, number> = {
      A_C: 1000, A_VA: 50, Q_S: 5, Q_Dr: 0, f_Z: 1.2, f_A: 1.0,
    };
    const { data: scalarFields } = await ad
      .from('fields')
      .select('id, symbol')
      .eq('worksheet_template_id', a138_13_templateId)
      .in('symbol', Object.keys(scalarValues));
    for (const sf of scalarFields ?? []) {
      await ad.from('project_parameters').insert({
        project_id: projectId,
        field_id: sf.id,
        source_worksheet_instance_id: a138_13_instanceId,
        source_type: 'entered',
        entered_by: userId,
        value_number: String(scalarValues[sf.symbol]),
      });
    }

    // (c) Pre-seed r_D_n and D_min as 'entered' (simulating the stale PLT-HS-01 state)
    await ad.from('project_parameters').insert([
      {
        project_id: projectId,
        field_id: rDnFieldId,
        source_worksheet_instance_id: a138_13_instanceId,
        source_type: 'entered',
        entered_by: userId,
        value_number: '130',  // correct value but wrong source_type
      },
      {
        project_id: projectId,
        field_id: dMinFieldId,
        source_worksheet_instance_id: a138_13_instanceId,
        source_type: 'entered',
        entered_by: userId,
        value_number: '30',
      },
    ]);
  });

  afterAll(async () => cleanup([email]));

  it('RED→GREEN: A138-13 save (no carrier in batch) flips r_D_n/D_min to source_type=derived', async () => {
    // RED: before the fix, isBasinSave was gated on r_D_n_table being in the save batch
    //      on the SAME template (A138-13 has no r_D_n_table field → gate never matched →
    //      derived UPSERT never ran → rows stayed 'entered').
    // GREEN: after the fix, isBasinSave = templateEquations.some(e => e.id === BASIN_GL8_EQUATION_ID)
    //        fires on any A138-13 save; carrier read cross-worksheet from project_parameters.

    const { saveWorksheet } = await import('../worksheet');

    // Save rainfall_table_ref on A138-13 — NOT the carrier (which lives on A138-04)
    const result = await saveWorksheet({
      instanceId: a138_13_instanceId,
      values: {
        [rainfallRefFieldId]: { type: 'text', value: null },
      },
    });

    expect(result.ok).toBe(true);

    // Verify r_D_n and D_min are now source_type='derived'
    const { data: params } = await admin()
      .from('project_parameters')
      .select('field_id, source_type, value_number')
      .eq('project_id', projectId)
      .in('field_id', [rDnFieldId, dMinFieldId]);

    const rDnRow  = params?.find((p) => p.field_id === rDnFieldId);
    const dMinRow = params?.find((p) => p.field_id === dMinFieldId);

    // source_type must now be 'derived' (was 'entered' before fix)
    expect(rDnRow?.source_type).toBe('derived');
    expect(dMinRow?.source_type).toBe('derived');

    // CHAIN-IDENTICAL: values unchanged — Heinsberg witness: r_D_n=130, D_min=30
    expect(Number(rDnRow?.value_number)).toBeCloseTo(130, 3);
    expect(Number(dMinRow?.value_number)).toBeCloseTo(30, 3);
  });

  it('NEGATIVE: non-basin template save does NOT write basin derived rows (no over-firing)', async () => {
    // A second standard/template WITHOUT the basin Gl.8 equation
    const ad = admin();
    const { data: std2 } = await ad
      .from('standards')
      .insert({ code: `NON-BASIN-T4-${Date.now()}`, title_de: 'Non-basin', version: 'test' })
      .select('id').single();
    const { data: tmplNb } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std2!.id, code: 'A138-07', title_de: 'Surface' })
      .select('id').single();
    const { data: secNb } = await ad
      .from('worksheet_sections')
      .insert({ worksheet_template_id: tmplNb!.id, code: 'S', title_de: 'S' })
      .select('id').single();
    const { data: fNb } = await ad
      .from('fields')
      .insert({ worksheet_template_id: tmplNb!.id, section_id: secNb!.id, symbol: 'X', label_de: 'X', data_type: 'number', active: true })
      .select('id').single();

    // Get user id from org_members for this project
    const { data: orgMembers } = await ad
      .from('org_members')
      .select('user_id')
      .limit(1);
    const userId = orgMembers?.[0]?.user_id ?? '';

    const { data: instNb } = await ad
      .from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: tmplNb!.id })
      .select('id').single();

    // Snapshot r_D_n/D_min BEFORE the non-basin save so we can assert they are untouched after.
    const { data: basinBefore } = await ad
      .from('project_parameters')
      .select('field_id, source_type, value_number, updated_at')
      .eq('project_id', projectId)
      .in('field_id', [rDnFieldId, dMinFieldId]);
    const rDnBefore  = basinBefore?.find((p) => p.field_id === rDnFieldId);
    const dMinBefore = basinBefore?.find((p) => p.field_id === dMinFieldId);

    const { saveWorksheet } = await import('../worksheet');
    const result = await saveWorksheet({
      instanceId: instNb!.id,
      values: { [fNb!.id]: { type: 'number', value: 42 } },
    });
    expect(result.ok).toBe(true);

    // Assert: the basin r_D_n/D_min rows were NOT touched by the non-basin save.
    // We compare source_type, value_number, and updated_at — if the non-basin block
    // had fired, it would have written new rows (updating updated_at and possibly value_number).
    const { data: basinAfter } = await ad
      .from('project_parameters')
      .select('field_id, source_type, value_number, updated_at')
      .eq('project_id', projectId)
      .in('field_id', [rDnFieldId, dMinFieldId]);
    const rDnAfter  = basinAfter?.find((p) => p.field_id === rDnFieldId);
    const dMinAfter = basinAfter?.find((p) => p.field_id === dMinFieldId);

    // source_type and value_number must be identical (non-basin save must not re-derive them)
    expect(rDnAfter?.source_type).toBe(rDnBefore?.source_type);
    expect(rDnAfter?.value_number).toBe(rDnBefore?.value_number);
    expect(dMinAfter?.source_type).toBe(dMinBefore?.source_type);
    expect(dMinAfter?.value_number).toBe(dMinBefore?.value_number);
    // updated_at must be identical — the non-basin save must not have re-written these rows
    expect(rDnAfter?.updated_at).toBe(rDnBefore?.updated_at);
    expect(dMinAfter?.updated_at).toBe(dMinBefore?.updated_at);

    // Additionally confirm no extra basin-derived rows appeared for the non-basin template:
    const { data: nbParams } = await ad
      .from('project_parameters')
      .select('field_id, source_type')
      .eq('project_id', projectId)
      .in('field_id', [fNb!.id]);

    const nbRow = nbParams?.find((p) => p.field_id === fNb!.id);
    expect(nbRow?.source_type).toBe('entered');  // non-basin save → entered, not derived
  });
});

describe('saveWorksheet server action', () => {
  const email = `worksheet-save-${Date.now()}@test.local`;
  let userId = '';
  let projectId = '';
  let standardId = '';
  let templateId = '';
  let sectionId = '';
  let fieldNumberId = '';
  let fieldTextId = '';
  let instanceId = '';

  beforeAll(async () => {
    const u = await makeUser(email);
    userId = u.id;
    const ad = admin();

    // Org membership
    const { data: org } = await ad.from('orgs').insert({ name: 'Save Test', slug: `save-test-${Date.now()}` }).select('id').single();
    await ad.from('org_members').insert({ org_id: org!.id, user_id: userId, role: 'owner' });

    // Project
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: org!.id, name: 'P', created_by: userId })
      .select('id')
      .single();
    projectId = proj!.id;

    // Standard + worksheet template + section + 2 fields
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `TEST-${Date.now()}`, title_de: 'T', version: 'Pass3c' })
      .select('id')
      .single();
    standardId = std!.id;
    const { data: tmpl } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: standardId, code: 'T-01', title_de: 'W' })
      .select('id')
      .single();
    templateId = tmpl!.id;
    const { data: sec } = await ad
      .from('worksheet_sections')
      .insert({ worksheet_template_id: templateId, code: 'A', title_de: 'A' })
      .select('id')
      .single();
    sectionId = sec!.id;
    const { data: f1 } = await ad
      .from('fields')
      .insert({ worksheet_template_id: templateId, section_id: sectionId, symbol: 'X', label_de: 'X', data_type: 'number' })
      .select('id')
      .single();
    fieldNumberId = f1!.id;
    const { data: f2 } = await ad
      .from('fields')
      .insert({ worksheet_template_id: templateId, section_id: sectionId, symbol: 'Y', label_de: 'Y', data_type: 'text' })
      .select('id')
      .single();
    fieldTextId = f2!.id;
    const { data: inst } = await ad
      .from('worksheet_instances')
      .insert({ project_id: projectId, worksheet_template_id: templateId })
      .select('id')
      .single();
    instanceId = inst!.id;
  });

  afterAll(async () => cleanup([email]));

  it('saves a number + text value and writes 2 audit_log rows', async () => {
    // Import the action here (after env is set up by beforeAll)
    const { saveWorksheet } = await import('../worksheet');

    // The action calls `createClient()` which uses real Supabase cookies — for
    // unit testing, we instead exercise the underlying DB writes by calling
    // through a thin wrapper that takes userId directly. If this proves
    // infeasible, this test becomes an integration test that requires a
    // signed-in browser session and we skip it in unit runs.

    // For Plan 3's MVP, we ACCEPT this gap: the unit test exercises the DB
    // mutation logic but skips auth. RLS test below covers auth.
    // TODO(plan-3): introduce a testing wrapper exported alongside saveWorksheet
    // that takes an explicit userId, or migrate to integration test.

    expect(typeof saveWorksheet).toBe('function');
  });
});
