import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('audit_log RLS — INSERT+SELECT only', () => {
  const e1 = `rls-audit-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1]));

  it('user can INSERT and SELECT but cannot UPDATE or DELETE own audit rows', async () => {
    const u = await makeUser(e1);
    const orgId = await makeOrg(u.client, u.id, 'Alpha Audit Test');

    const { data: row, error: insErr } = await u.client
      .from('audit_log')
      .insert({
        actor_id: u.id,
        actor_role: 'engineer',
        org_id: orgId,
        table_name: 'standards',
        action: 'insert',
        changes: { after: { code: 'X' } },
      })
      .select('id')
      .single();
    expect(insErr).toBeNull();

    const { error: updErr } = await u.client
      .from('audit_log')
      .update({ action: 'update' })
      .eq('id', row!.id);
    expect(updErr).not.toBeNull();

    const { error: delErr } = await u.client
      .from('audit_log')
      .delete()
      .eq('id', row!.id);
    expect(delErr).not.toBeNull();
  });

  it('user cannot SELECT audit rows from a foreign org', async () => {
    const ad = admin();
    const u1 = await makeUser(`rls-audit-a-${Date.now()}@test.local`);
    const u2 = await makeUser(`rls-audit-b-${Date.now()}@test.local`);
    const org2 = await makeOrg(u2.client, u2.id, 'Bravo Audit');

    await ad.from('audit_log').insert({
      actor_id: u2.id,
      actor_role: 'engineer',
      org_id: org2,
      table_name: 'standards',
      action: 'insert',
      changes: { after: { code: 'Y' } },
    });

    const { data, error } = await u1.client
      .from('audit_log')
      .select('*')
      .eq('org_id', org2);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
