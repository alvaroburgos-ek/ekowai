import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('approval_events transitions — RLS', () => {
  const e1 = `rls-trans-a-${Date.now()}@test.local`;
  const e2 = `rls-trans-b-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('user can INSERT approval_events for their own org worksheet, with correct from/to/actor', async () => {
    const ad = admin();
    const a = await makeUser(e1);
    const orgA = await makeOrg(a.client, a.id, 'Alpha Trans');

    // Service-role seeds project + standard + template + instance
    const { data: proj } = await ad.from('projects').insert({ org_id: orgA, name: 'P', created_by: a.id }).select('id').single();
    const { data: std } = await ad.from('standards').insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates').insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' }).select('id').single();
    const { data: inst } = await ad.from('worksheet_instances').insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id }).select('id').single();

    const { error } = await a.client.from('approval_events').insert({
      worksheet_instance_id: inst!.id,
      event_type: 'submit',
      from_status: 'draft',
      to_status: 'submitted_for_review',
      actor_id: a.id,
      actor_role: 'engineer',
      comment: 'Bitte prüfen',
    });
    expect(error).toBeNull();
  });

  it('user A cannot INSERT approval_events for org B worksheet', async () => {
    const ad = admin();
    const a = await makeUser(`rls-trans-c-${Date.now()}@test.local`);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo Trans');
    const { data: proj } = await ad.from('projects').insert({ org_id: orgB, name: 'P', created_by: b.id }).select('id').single();
    const { data: std } = await ad.from('standards').insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates').insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' }).select('id').single();
    const { data: inst } = await ad.from('worksheet_instances').insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id }).select('id').single();

    const { error } = await a.client.from('approval_events').insert({
      worksheet_instance_id: inst!.id,
      event_type: 'submit',
      from_status: 'draft',
      to_status: 'submitted_for_review',
      actor_id: a.id,
      actor_role: 'engineer',
      comment: 'Bösartig',
    });
    expect(error).not.toBeNull();
  });

  it('user cannot impersonate another actor (actor_id must equal auth.uid)', async () => {
    const ad = admin();
    const a = await makeUser(`rls-trans-d-${Date.now()}@test.local`);
    const b = await makeUser(`rls-trans-e-${Date.now()}@test.local`);
    const orgA = await makeOrg(a.client, a.id, 'Alpha Imperson');
    const { data: proj } = await ad.from('projects').insert({ org_id: orgA, name: 'P', created_by: a.id }).select('id').single();
    const { data: std } = await ad.from('standards').insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates').insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' }).select('id').single();
    const { data: inst } = await ad.from('worksheet_instances').insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id }).select('id').single();

    // User A inserts but claims actor_id = B's id
    const { error } = await a.client.from('approval_events').insert({
      worksheet_instance_id: inst!.id,
      event_type: 'submit',
      from_status: 'draft',
      to_status: 'submitted_for_review',
      actor_id: b.id,             // <-- wrong
      actor_role: 'engineer',
      comment: 'X',
    });
    expect(error).not.toBeNull();
  });
});
