import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('worksheet_instances RLS — org-scoped', () => {
  const e1 = `rls-wi-a-${Date.now()}@test.local`;
  const e2 = `rls-wi-b-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('user A cannot read worksheet_instances from org B', async () => {
    const ad = admin();
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo WI');

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
    await ad.from('worksheet_instances').insert({
      project_id: proj!.id,
      worksheet_template_id: tmpl!.id,
    });

    const { data, error } = await a.client
      .from('worksheet_instances')
      .select('*')
      .eq('project_id', proj!.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
