/**
 * What-if cases harness fixture: the anonymised C4-shaped A 138 chain (src/lib/scenarios/__fixtures__/c4-a138-chain.ts)
 * as real rows — templates in phase order, fields with consumer_worksheets / visible_when / enum_values, equations
 * (prod UUIDs where aggregators / profiles key on them), REQ-15 on A138-10. Values are NOT seeded here: the test saves
 * them through the REAL saveWorksheet so the record's derived values come from the real save path.
 */
import type postgres from 'postgres';
import { FIXTURE_SHEETS } from '@/lib/scenarios/__fixtures__/c4-a138-chain';

export type ScenarioHarnessFixture = {
  projectId: string; userId: string; standardId: string;
  instances: Record<string, string>;
  fieldIds: Record<string, string>;
};

export async function seedScenarios(sql: postgres.Sql, userId: string): Promise<ScenarioHarnessFixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'scenarios-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('Scenario Harness Org', ${'scn-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'TEST-SCN-C4', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-138-1', 'DWA-A 138-1 (harness)', 'harness') RETURNING id`;
  const instances: Record<string, string> = {};
  const fieldIds: Record<string, string> = {};
  for (const s of FIXTURE_SHEETS) {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de, phase, order_index)
      VALUES (${std.id}, ${s.code}, ${s.code}, ${s.phase}, ${s.order}) RETURNING id`;
    const [sec] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_sections (worksheet_template_id, code, title_de) VALUES (${t.id}, ${'S-' + s.code}, ${'S-' + s.code}) RETURNING id`;
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id) VALUES (${proj.id}, ${t.id}) RETURNING id`;
    instances[s.code] = inst.id;
    let oi = 1;
    for (const f of s.fields) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, unit, active, is_required, order_index,
                            consumer_worksheets, visible_when, enum_values)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, ${f.unit ?? null}, true, false, ${oi++},
                ${f.consumers ? sql.array(f.consumers) : null}, ${f.visibleWhen ?? null},
                ${f.enumValues ? sql.json(f.enumValues.map((v) => ({ value: v, label_de: v, label_en: v }))) : null})
        RETURNING id`;
      fieldIds[`${s.code}:${f.symbol}`] = row.id;
    }
    for (const e of s.equations) {
      await sql`
        INSERT INTO equations (id, worksheet_template_id, equation_number, formula, output_symbol, input_symbols)
        VALUES (${e.id}, ${t.id}, ${e.number}, ${e.formula}, ${e.output}, ${sql.array(e.inputs)})`;
    }
    for (const c of s.compliance) {
      await sql`
        INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
        VALUES (${t.id}, ${c.code}, ${c.code}, ${c.condition}, ${c.severity})`;
    }
  }
  return { projectId: proj.id, userId, standardId: std.id, instances, fieldIds };
}
