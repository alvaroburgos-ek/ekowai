import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('report_archives RLS — org-scoped', () => {
  const e1 = `rls-ra-a-${Date.now()}@test.local`;
  const e2 = `rls-ra-b-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('user A cannot read report_archives from org B', async () => {
    const ad = admin();
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo RA');

    const { data: proj, error: projErr } = await ad
      .from('projects')
      .insert({ org_id: orgB, name: 'B', created_by: b.id })
      .select('id')
      .single();
    if (projErr) throw projErr;

    const { data: std, error: stdErr } = await ad
      .from('standards')
      .insert({ code: `RA-${Date.now()}`, title_de: 'T', version: 'Pass3c' })
      .select('id')
      .single();
    if (stdErr) throw stdErr;

    const { data: tmpl, error: tmplErr } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' })
      .select('id')
      .single();
    if (tmplErr) throw tmplErr;

    const { data: inst, error: instErr } = await ad
      .from('worksheet_instances')
      .insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id })
      .select('id')
      .single();
    if (instErr) throw instErr;

    // Insert report_archive scoped to orgB using service role (bypasses RLS)
    // Required NOT NULL: calculation_id (legacy), sha256, file_path, org_id, generated_by
    const { error: archErr } = await ad.from('report_archives').insert({
      org_id: orgB,
      worksheet_instance_id: inst!.id,
      generated_by: b.id,
      file_path: 'placeholder/report.pdf',
      sha256: 'a'.repeat(64),
      calculation_id: '00000000-0000-0000-0000-000000000000',
    });
    if (archErr) throw archErr;

    // User A (foreign org) tries to read org B's archives — should see nothing
    const { data, error } = await a.client
      .from('report_archives')
      .select('*')
      .eq('org_id', orgB);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
