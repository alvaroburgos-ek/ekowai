import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('project_standards RLS — org-scoped writes', () => {
  const e1 = `rls-ps-a-${Date.now()}@test.local`;
  const e2 = `rls-ps-b-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('user A cannot insert a project_standards row into org B', async () => {
    const ad = admin();
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo PS');

    // Service-role seeds project + standard in org B
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgB, name: 'B', created_by: b.id })
      .select('id')
      .single();
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `RLS-${Date.now()}`, title_de: 'X', version: 'Pass3c' })
      .select('id')
      .single();

    // User A tries to attach the standard to org B's project — should fail RLS
    const { error } = await a.client
      .from('project_standards')
      .insert({ project_id: proj!.id, standard_id: std!.id });
    expect(error).not.toBeNull();
  });

  it('user A can insert into their own project + remove with reason', async () => {
    const ad = admin();
    const a = await makeUser(`rls-ps-own-${Date.now()}@test.local`);
    const orgA = await makeOrg(a.client, a.id, 'Alpha PS');
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgA, name: 'A', created_by: a.id })
      .select('id')
      .single();
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `RLS-OWN-${Date.now()}`, title_de: 'X', version: 'Pass3c' })
      .select('id')
      .single();

    const { error: insErr } = await a.client
      .from('project_standards')
      .insert({ project_id: proj!.id, standard_id: std!.id });
    expect(insErr).toBeNull();

    const { error: updErr } = await a.client
      .from('project_standards')
      .update({ status: 'removed', removal_reason: 'Wrong selection' })
      .eq('project_id', proj!.id)
      .eq('standard_id', std!.id);
    expect(updErr).toBeNull();
  });
});
