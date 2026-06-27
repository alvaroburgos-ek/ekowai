import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';
import { createClient } from '@supabase/supabase-js';

describe('standards library RLS — read-only for authenticated', () => {
  const e1 = `rls-std-${Date.now()}@test.local`;
  const e2 = `rls-std-ins-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('internal org member can SELECT from standards', async () => {
    const u = await makeUser(e1);
    await makeOrg(u.client, u.id, 'Std Reader'); // library reads now require org membership
    const ad = admin();

    // Seed one standard via service-role
    const code = `TEST-${Date.now()}`;
    await ad.from('standards').insert({
      code,
      title_de: 'Test Standard',
      version: 'Pass3c',
    });

    const { data, error } = await u.client.from('standards').select('*').eq('code', code);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].title_de).toBe('Test Standard');

    await ad.from('standards').delete().eq('code', code);
  });

  it('authenticated user cannot INSERT into standards', async () => {
    const u = await makeUser(e2);

    const { error } = await u.client.from('standards').insert({
      code: `BAD-${Date.now()}`,
      title_de: 'Should fail',
      version: 'Pass3c',
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/row-level security|permission denied|schema cache/i);
  });

  it('anonymous (no JWT) cannot SELECT from standards', async () => {
    const anon = createClient(
      process.env.CI_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.CI_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data, error } = await anon.from('standards').select('*').limit(1);
    if (!error) expect(data).toEqual([]);
  });
});
