import { describe, it, expect, afterAll } from 'vitest';
import { makeUser, makeOrg, admin, cleanup } from './helpers';

describe('calculations RLS', () => {
  const e1 = `rls-calc-a-${Date.now()}@test.local`;
  const e2 = `rls-calc-b-${Date.now()}@test.local`;

  afterAll(async () => cleanup([e1, e2]));

  it("user A cannot read user B's calculation", async () => {
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo');

    const { data: project } = await b.client
      .from('projects')
      .insert({ org_id: orgB, name: 'P', created_by: b.id })
      .select('id')
      .single();

    const { data: calc, error: cerr } = await b.client
      .from('calculations')
      .insert({
        project_id: project!.id,
        org_id: orgB,
        regulation_code: 'DWA-A-201',
        regulation_version: 'v3.2',
        worksheet_id: 'A201-08',
        name: 'Test',
        inputs: {},
        results: {},
        created_by: b.id,
      })
      .select('id')
      .single();
    expect(cerr).toBeNull();

    const { data: visible } = await a.client.from('calculations').select('*').eq('id', calc!.id);
    expect(visible).toEqual([]);
  });

  it('trigger rejects mismatched org_id on insert', async () => {
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgA = await makeOrg(a.client, a.id, 'Alpha');
    const orgB = await makeOrg(b.client, b.id, 'Bravo');

    const { data: projectA } = await admin()
      .from('projects')
      .insert({ org_id: orgA, name: 'P', created_by: a.id })
      .select('id')
      .single();

    const { error } = await admin()
      .from('calculations')
      .insert({
        project_id: projectA!.id,
        org_id: orgB, // wrong!
        regulation_code: 'DWA-A-201',
        regulation_version: 'v3.2',
        worksheet_id: 'A201-08',
        name: 'Test',
        inputs: {},
        results: {},
        created_by: a.id,
      });
    expect(error?.message).toMatch(/org_id must match/);
  });
});
