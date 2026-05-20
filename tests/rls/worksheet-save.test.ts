import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('project_parameters RLS — write requires org membership', () => {
  const e1 = `rls-pp-w-a-${Date.now()}@test.local`;
  const e2 = `rls-pp-w-b-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('user A cannot UPSERT a parameter into org B', async () => {
    const ad = admin();
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo Save');

    // Service seeds project + standard + template + field in org B
    const { data: proj } = await ad.from('projects').insert({ org_id: orgB, name: 'B', created_by: b.id }).select('id').single();
    const { data: std } = await ad.from('standards').insert({ code: `RLS-SAVE-${Date.now()}`, title_de: 'X', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates').insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' }).select('id').single();
    const { data: field } = await ad.from('fields').insert({ worksheet_template_id: tmpl!.id, symbol: 'X', label_de: 'X', data_type: 'number' }).select('id').single();

    const { error } = await a.client.from('project_parameters').insert({
      project_id: proj!.id,
      field_id: field!.id,
      value_number: 42,
      source_type: 'entered',
      entered_by: a.id,
    });
    expect(error).not.toBeNull();
  });
});
