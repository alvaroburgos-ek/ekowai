import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('approval_events RLS — INSERT+SELECT only, no UPDATE, no DELETE', () => {
  const e1 = `rls-appe-${Date.now()}@test.local`;
  const e2 = `rls-appe-empty-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('UPDATE on approval_events is rejected even by service role due to missing policy (anon path)', async () => {
    const u = await makeUser(e1);
    const ad = admin();
    const orgId = await makeOrg(u.client, u.id, 'Alpha Approval Test');

    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgId, name: 'P', created_by: u.id })
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

    const { data: inst } = await ad
      .from('worksheet_instances')
      .insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id })
      .select('id')
      .single();

    const { data: evt, error: insErr } = await u.client
      .from('approval_events')
      .insert({
        worksheet_instance_id: inst!.id,
        event_type: 'submit',
        from_status: 'draft',
        to_status: 'submitted_for_review',
        actor_id: u.id,
        actor_role: 'engineer',
        comment: 'initial submit',
      })
      .select('id')
      .single();
    expect(insErr).toBeNull();
    expect(evt).toBeDefined();

    const { error: updErr } = await u.client
      .from('approval_events')
      .update({ comment: 'tampered' })
      .eq('id', evt!.id);
    expect(updErr).not.toBeNull();

    const { error: delErr } = await u.client
      .from('approval_events')
      .delete()
      .eq('id', evt!.id);
    expect(delErr).not.toBeNull();

    const { data: read } = await u.client
      .from('approval_events')
      .select('comment')
      .eq('id', evt!.id);
    expect(read?.[0]?.comment).toBe('initial submit');
  });

  it('INSERT with empty comment is rejected by CHECK constraint', async () => {
    const u = await makeUser(e2);
    const ad = admin();
    const orgId = await makeOrg(u.client, u.id, 'Beta No-Comment');
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgId, name: 'P', created_by: u.id })
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
    const { data: inst } = await ad
      .from('worksheet_instances')
      .insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id })
      .select('id')
      .single();

    const { error } = await u.client.from('approval_events').insert({
      worksheet_instance_id: inst!.id,
      event_type: 'submit',
      from_status: 'draft',
      to_status: 'submitted_for_review',
      actor_id: u.id,
      actor_role: 'engineer',
      comment: '   ',
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/check|constraint/i);
  });
});
