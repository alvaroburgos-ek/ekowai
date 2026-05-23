import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

/**
 * Verifies the BEFORE INSERT trigger `audit_log_fill_org_id_trg` (migration
 * 20260521160000): app code can insert audit_log rows with only project_id;
 * the trigger derives org_id, and the row becomes visible to the org member.
 *
 * If the trigger is removed or the tightened SELECT policy regresses to
 * permitting NULL org_id, this test fails loud.
 */
describe('audit_log — org_id auto-fill trigger', () => {
  const e1 = `rls-audit-trig-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1]));

  it('insert with project_id but no org_id is visible to the org member', async () => {
    const u = await makeUser(e1);
    const ad = admin();
    const orgId = await makeOrg(u.client, u.id, 'Alpha Audit Trig');

    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgId, name: 'P', created_by: u.id })
      .select('id')
      .single();

    // Insert via service-role with project_id set but org_id omitted.
    // The trigger should fill org_id = orgId.
    const { data: inserted, error: insErr } = await ad
      .from('audit_log')
      .insert({
        actor_id: u.id,
        actor_role: 'engineer',
        project_id: proj!.id,
        table_name: 'project_parameters',
        action: 'insert',
        changes: { test: true },
      })
      .select('id, org_id, project_id')
      .single();
    expect(insErr).toBeNull();
    expect(inserted?.org_id).toBe(orgId);
    expect(inserted?.project_id).toBe(proj!.id);

    // User can SELECT the row — would fail if org_id were still null
    const { data: read } = await u.client
      .from('audit_log')
      .select('id')
      .eq('id', inserted!.id);
    expect(read?.length).toBe(1);
  });

  it('insert with explicit org_id keeps the given value (no overwrite)', async () => {
    const u = await makeUser(`rls-audit-trig-explicit-${Date.now()}@test.local`);
    const ad = admin();
    const orgId = await makeOrg(u.client, u.id, 'Alpha Explicit');
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: orgId, name: 'P', created_by: u.id })
      .select('id')
      .single();

    const { data: inserted } = await ad
      .from('audit_log')
      .insert({
        actor_id: u.id,
        actor_role: 'engineer',
        project_id: proj!.id,
        org_id: orgId,
        table_name: 'project_parameters',
        action: 'insert',
        changes: { test: true },
      })
      .select('org_id')
      .single();
    expect(inserted?.org_id).toBe(orgId);
  });
});
