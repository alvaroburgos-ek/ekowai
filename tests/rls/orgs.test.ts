import { describe, it, expect, afterAll } from 'vitest';
import { makeUser, makeOrg, cleanup } from './helpers';

describe('orgs RLS', () => {
  const e1 = `rls-orgs-a-${Date.now()}@test.local`;
  const e2 = `rls-orgs-b-${Date.now()}@test.local`;

  afterAll(async () => cleanup([e1, e2]));

  it('a user cannot read another org they are not a member of', async () => {
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo Büro');

    const { data, error } = await a.client.from('orgs').select('*').eq('id', orgB);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
