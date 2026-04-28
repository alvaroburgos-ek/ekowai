import { describe, it, expect, afterAll } from 'vitest';
import { makeUser, makeOrg, cleanup } from './helpers';

describe('projects RLS', () => {
  const e1 = `rls-proj-a-${Date.now()}@test.local`;
  const e2 = `rls-proj-b-${Date.now()}@test.local`;

  afterAll(async () => cleanup([e1, e2]));

  it("user A cannot see user B's project", async () => {
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo');

    const { data: created, error: cerr } = await b.client
      .from('projects')
      .insert({ org_id: orgB, name: 'Secret KA', created_by: b.id })
      .select('id')
      .single();
    expect(cerr).toBeNull();

    const { data: visibleToA } = await a.client
      .from('projects')
      .select('*')
      .eq('id', created!.id);
    expect(visibleToA).toEqual([]);
  });
});
