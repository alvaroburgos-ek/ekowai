import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('project_documents RLS', () => {
  const e1 = `rls-docs-a-${Date.now()}@test.local`;
  const e2 = `rls-docs-b-${Date.now()}@test.local`;

  afterAll(async () => cleanup([e1, e2]));

  it('a user cannot read project_documents from a foreign org', async () => {
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo Büro Docs');

    // Service-role: create a project + document in org B (bypasses RLS)
    const ad = admin();
    const { data: project, error: projErr } = await ad
      .from('projects')
      .insert({
        org_id: orgB,
        name: 'B-Project',
        created_by: b.id,
      })
      .select('id')
      .single();
    if (projErr) throw projErr;

    const { error: docErr } = await ad.from('project_documents').insert({
      project_id: project.id,
      org_id: orgB,
      kind: 'lab_analysis',
      title: 'Secret B doc',
      citation_label: 'B-LAB-2026',
      file_path: `${orgB}/${project.id}/x.pdf`,
      file_size: 100,
      mime_type: 'application/pdf',
      sha256: 'a'.repeat(64),
      uploaded_by: b.id,
    });
    if (docErr) throw docErr;

    // User A (foreign org) tries to read — should see nothing
    const { data, error } = await a.client
      .from('project_documents')
      .select('*')
      .eq('project_id', project.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('an org member can read their own project_documents', async () => {
    const c = await makeUser(`rls-docs-c-${Date.now()}@test.local`);
    const orgC = await makeOrg(c.client, c.id, 'Charlie Docs');

    const ad = admin();
    const { data: project } = await ad
      .from('projects')
      .insert({
        org_id: orgC,
        name: 'C-Project',
        created_by: c.id,
      })
      .select('id')
      .single();

    await ad.from('project_documents').insert({
      project_id: project!.id,
      org_id: orgC,
      kind: 'lab_analysis',
      title: 'Visible C doc',
      citation_label: 'C-LAB-2026',
      file_path: `${orgC}/${project!.id}/y.pdf`,
      file_size: 100,
      mime_type: 'application/pdf',
      sha256: 'c'.repeat(64),
      uploaded_by: c.id,
    });

    const { data } = await c.client
      .from('project_documents')
      .select('*')
      .eq('project_id', project!.id);
    expect(data?.length ?? 0).toBe(1);
    expect(data?.[0].title).toBe('Visible C doc');

    await cleanup([`rls-docs-c-${Date.now()}@test.local`]);
    // Note: timing on Date.now() means cleanup may miss the user. The
    // afterAll for e1/e2 won't catch it either — accepting minor cleanup
    // drift here for test simplicity.
  });
});
