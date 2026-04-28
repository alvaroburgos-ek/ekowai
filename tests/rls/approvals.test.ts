import { describe, it, expect, afterAll } from 'vitest';
import { makeUser, makeOrg, cleanup } from './helpers';

describe('approvals RLS + triggers', () => {
  const e1 = `rls-app-a-${Date.now()}@test.local`;
  const e2 = `rls-app-b-${Date.now()}@test.local`;

  afterAll(async () => cleanup([e1, e2]));

  it('approval insert flips calculations.status (sync trigger)', async () => {
    const a = await makeUser(e1);
    const orgA = await makeOrg(a.client, a.id, 'Alpha');

    const { data: project } = await a.client
      .from('projects')
      .insert({ org_id: orgA, name: 'P', created_by: a.id })
      .select('id')
      .single();
    const { data: calc } = await a.client
      .from('calculations')
      .insert({
        project_id: project!.id,
        org_id: orgA,
        regulation_code: 'DWA-A-201',
        regulation_version: 'v3.2',
        worksheet_id: 'A201-08',
        name: 't',
        inputs: {},
        results: {},
        created_by: a.id,
      })
      .select('id')
      .single();

    await a.client.from('approvals').insert({
      calculation_id: calc!.id,
      org_id: orgA,
      action: 'submitted',
    });

    const { data: refreshed } = await a.client
      .from('calculations')
      .select('status')
      .eq('id', calc!.id)
      .single();
    expect(refreshed!.status).toBe('submitted');
  });

  it('approvals are append-only (no UPDATE policy)', async () => {
    const a = await makeUser(e1);
    const orgA = await makeOrg(a.client, a.id, 'Alpha');

    const { data: project } = await a.client
      .from('projects')
      .insert({ org_id: orgA, name: 'P', created_by: a.id })
      .select('id')
      .single();
    const { data: calc } = await a.client
      .from('calculations')
      .insert({
        project_id: project!.id,
        org_id: orgA,
        regulation_code: 'DWA-A-201',
        regulation_version: 'v3.2',
        worksheet_id: 'A201-08',
        name: 't',
        inputs: {},
        results: {},
        created_by: a.id,
      })
      .select('id')
      .single();

    const { data: approval } = await a.client
      .from('approvals')
      .insert({ calculation_id: calc!.id, org_id: orgA, action: 'submitted' })
      .select('id')
      .single();

    const { error } = await a.client
      .from('approvals')
      .update({ comment: 'tampered' })
      .eq('id', approval!.id);
    const { data: after } = await a.client
      .from('approvals')
      .select('comment')
      .eq('id', approval!.id)
      .single();
    expect(after?.comment).toBeNull();
    expect(error).toBeNull();
  });
});
