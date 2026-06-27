import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('project_collaborators RLS — external parties are IP-locked', () => {
  const eng = `rls-pc-eng-${Date.now()}@test.local`;
  const cli = `rls-pc-cli-${Date.now()}@test.local`;
  afterAll(async () => cleanup([eng, cli]));

  it('a collaborator cannot read fields/equations, nor project_parameters; reads only its own row', async () => {
    const ad = admin();
    const e = await makeUser(eng);
    const orgId = await makeOrg(e.client, e.id, 'PC Org');
    const c = await makeUser(cli); // NOT an org member -> external

    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgId, name: 'PC-P', created_by: e.id })
      .select('id')
      .single();
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `PC-${Date.now()}`, title_de: 'T', version: 'Pass3c' })
      .select('id')
      .single();
    const { data: tmpl } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'PC-01', title_de: 'W' })
      .select('id')
      .single();
    const { data: field } = await ad
      .from('fields')
      .insert({ worksheet_template_id: tmpl!.id, symbol: 'X', label_de: 'Frage', data_type: 'number' })
      .select('id')
      .single();
    await ad
      .from('equations')
      .insert({ worksheet_template_id: tmpl!.id, equation_number: '1', formula: 'X = 1', output_symbol: 'X' });
    await ad.from('project_parameters').insert({
      project_id: proj!.id,
      field_id: field!.id,
      value_number: 7,
      source_type: 'entered',
      entered_by: e.id,
    });
    await ad.from('project_collaborators').insert({
      project_id: proj!.id,
      user_id: c.id,
      role: 'client',
      invited_by: e.id,
    });

    // IP Layer 2: no question text, no formulas.
    const fields = await c.client.from('fields').select('*').eq('id', field!.id);
    expect(fields.data ?? []).toEqual([]);

    const eqs = await c.client.from('equations').select('*').eq('worksheet_template_id', tmpl!.id);
    expect(eqs.data ?? []).toEqual([]);

    // Default-deny on project data in this sub-project.
    const pp = await c.client.from('project_parameters').select('*').eq('project_id', proj!.id);
    expect(pp.data ?? []).toEqual([]);

    // May read only its own collaborator row.
    const own = await c.client.from('project_collaborators').select('*').eq('user_id', c.id);
    expect(own.data?.length).toBe(1);

    await ad.from('projects').delete().eq('id', proj!.id);
    await ad.from('standards').delete().eq('id', std!.id);
  });
});
