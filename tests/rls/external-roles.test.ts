import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, makeExternal, cleanup } from './helpers';

const ts = Date.now();
// Each created auth user gets a unique email; reusing one email across tests
// (delete+recreate) races against auth's eventual consistency.
const createdEmails: string[] = [];

async function newUser(tag: string) {
  const email = `rls-ext-${tag}-${ts}-${createdEmails.length}@test.local`;
  createdEmails.push(email);
  return makeUser(email);
}

describe('external roles (client/designer) — IP boundary RLS', () => {
  afterAll(async () => cleanup(createdEmails));

  async function seedProjectWithLibrary() {
    const ad = admin();
    const staff = await newUser('staff');
    const org = await makeOrg(staff.client, staff.id, 'IP Boundary Org');
    const { data: proj } = await ad
      .from('projects')
      .insert({ org_id: org, name: 'P', created_by: staff.id })
      .select('id')
      .single();
    const { data: std } = await ad
      .from('standards')
      .insert({ code: `IP-${ts}-${createdEmails.length}`, title_de: 'T', version: 'Pass3c' })
      .select('id')
      .single();
    const { data: tmpl } = await ad
      .from('worksheet_templates')
      .insert({ standard_id: std!.id, code: 'IP-01', title_de: 'W' })
      .select('id')
      .single();
    const { data: field } = await ad
      .from('fields')
      .insert({
        worksheet_template_id: tmpl!.id,
        symbol: 'x',
        label_de: 'Geheime Frage?',
        data_type: 'number',
      })
      .select('id')
      .single();
    await ad
      .from('equations')
      .insert({ worksheet_template_id: tmpl!.id, equation_number: 'Gl1', formula: 'a*b' });
    await ad
      .from('worksheet_instances')
      .insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id });
    await ad.from('project_parameters').insert({
      project_id: proj!.id,
      field_id: field!.id,
      value_number: 42,
      source_type: 'computed',
      entered_by: staff.id,
    });
    return { staff, projectId: proj!.id };
  }

  it('client cannot read fields or equations; staff still can', async () => {
    const { staff, projectId } = await seedProjectWithLibrary();
    const client = await newUser('client');
    await makeExternal(projectId, client.id, 'client', staff.id);

    const cf = await client.client.from('fields').select('id');
    expect(cf.data ?? []).toHaveLength(0);
    const ce = await client.client.from('equations').select('id');
    expect(ce.data ?? []).toHaveLength(0);

    const sf = await staff.client.from('fields').select('id');
    expect((sf.data ?? []).length).toBeGreaterThan(0);
  });

  it('client cannot read project_parameters directly (curated path only)', async () => {
    const { staff, projectId } = await seedProjectWithLibrary();
    const client = await newUser('client');
    await makeExternal(projectId, client.id, 'client', staff.id);
    const pp = await client.client.from('project_parameters').select('id');
    expect(pp.data ?? []).toHaveLength(0);
  });

  it('designer cannot read worksheet_instances or project_parameters', async () => {
    const { staff, projectId } = await seedProjectWithLibrary();
    const designer = await newUser('designer');
    await makeExternal(projectId, designer.id, 'designer', staff.id);
    const wi = await designer.client.from('worksheet_instances').select('id');
    expect(wi.data ?? []).toHaveLength(0);
    const pp = await designer.client.from('project_parameters').select('id');
    expect(pp.data ?? []).toHaveLength(0);
  });

  it('external reads only its own project_members row', async () => {
    const { staff, projectId } = await seedProjectWithLibrary();
    const client = await newUser('self');
    await makeExternal(projectId, client.id, 'client', staff.id);
    const own = await client.client.from('project_members').select('user_id');
    expect((own.data ?? []).every((r) => r.user_id === client.id)).toBe(true);
    expect((own.data ?? []).length).toBe(1);
  });
});
