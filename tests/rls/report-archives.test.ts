import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('report_archives RLS', () => {
  const e1 = `rls-arch-a-${Date.now()}@test.local`;
  const e2 = `rls-arch-b-${Date.now()}@test.local`;

  afterAll(async () => cleanup([e1, e2]));

  it('a user cannot read report_archives from a foreign org', async () => {
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo Archives');

    const ad = admin();

    // Build a calculation in org B (need project + calc to satisfy FKs)
    const { data: project } = await ad
      .from('projects')
      .insert({
        org_id: orgB,
        name: 'B-Project-Arch',
        created_by: b.id,
      })
      .select('id')
      .single();

    const { data: calc } = await ad
      .from('calculations')
      .insert({
        project_id: project!.id,
        org_id: orgB,
        regulation_code: 'DWA-A-201',
        regulation_version: 'v3.1',
        worksheet_id: 'A201-01',
        name: 'B Archive Calc',
        inputs: {},
        results: {},
        created_by: b.id,
      })
      .select('id')
      .single();

    const { data: approval } = await ad
      .from('approvals')
      .insert({
        calculation_id: calc!.id,
        org_id: orgB,
        action: 'approved',
      })
      .select('id')
      .single();

    // Service-role inserts the archive (production code path uses admin client too)
    const { error: archErr } = await ad.from('report_archives').insert({
      calculation_id: calc!.id,
      approval_id: approval!.id,
      org_id: orgB,
      file_path: `${orgB}/${calc!.id}/${approval!.id}.pdf`,
      sha256: 'd'.repeat(64),
      generated_by: b.id,
    });
    if (archErr) throw archErr;

    // User A (foreign org) tries to read — should see nothing
    const { data, error } = await a.client
      .from('report_archives')
      .select('*')
      .eq('calculation_id', calc!.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('an authenticated org member with anon key cannot insert report_archives directly', async () => {
    const c = await makeUser(`rls-arch-c-${Date.now()}@test.local`);
    const orgC = await makeOrg(c.client, c.id, 'Charlie Arch');

    // No insert policy on report_archives means anon-key inserts are denied,
    // even when the user is a member of the target org.
    const { error } = await c.client.from('report_archives').insert({
      calculation_id: '00000000-0000-0000-0000-000000000000',
      approval_id: '00000000-0000-0000-0000-000000000000',
      org_id: orgC,
      file_path: 'fake',
      sha256: 'x'.repeat(64),
      generated_by: c.id,
    });
    expect(error).not.toBeNull(); // RLS should deny

    await cleanup([`rls-arch-c-${Date.now()}@test.local`]);
  });
});
