import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('project_parameters RLS — org-scoped', () => {
  const e1 = `rls-pp-a-${Date.now()}@test.local`;
  const e2 = `rls-pp-b-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('user A cannot read project_parameters from org B', async () => {
    const ad = admin();
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo PP');

    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgB, name: 'B', created_by: b.id })
      .select('id')
      .single();
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' })
      .select('id')
      .single();
    const { data: tmpl } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' })
      .select('id')
      .single();
    const { data: field } = await ad
      .from('fields')
      .insert({
        worksheet_template_id: tmpl!.id,
        symbol: 'X',
        label_de: 'X',
        data_type: 'number',
      })
      .select('id')
      .single();

    await ad.from('project_parameters').insert({
      project_id: proj!.id,
      field_id: field!.id,
      value_number: 42,
      source_type: 'entered',
      entered_by: b.id,
    });

    const { data, error } = await a.client
      .from('project_parameters')
      .select('*')
      .eq('project_id', proj!.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
