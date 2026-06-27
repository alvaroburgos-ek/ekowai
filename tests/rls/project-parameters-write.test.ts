import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, cleanup } from './helpers';

describe('project_parameters RLS — only engineer+ may write', () => {
  const v = `rls-ppw-${Date.now()}@test.local`;
  afterAll(async () => cleanup([v]));

  it('a viewer org member cannot INSERT project_parameters', async () => {
    const ad = admin();
    const u = await makeUser(v);
    const { data: org } = await ad
      .from('orgs')
      .insert({ name: 'VW', slug: `vw-${Date.now()}` })
      .select('id')
      .single();
    await ad.from('org_members').insert({ org_id: org!.id, user_id: u.id, role: 'viewer' });
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: org!.id, name: 'VW-P', created_by: u.id })
      .select('id')
      .single();
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `VW-${Date.now()}`, title_de: 'T', version: 'Pass3c' })
      .select('id')
      .single();
    const { data: tmpl } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'VW-01', title_de: 'W' })
      .select('id')
      .single();
    const { data: field } = await ad
      .from('fields')
      .insert({ worksheet_template_id: tmpl!.id, symbol: 'Y', label_de: 'Y', data_type: 'number' })
      .select('id')
      .single();

    const { error } = await u.client.from('project_parameters').insert({
      project_id: proj!.id,
      field_id: field!.id,
      value_number: 1,
      source_type: 'entered',
      entered_by: u.id,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/row-level security|permission denied/i);

    await ad.from('projects').delete().eq('id', proj!.id);
    await ad.from('standards').delete().eq('id', std!.id);
  });
});
