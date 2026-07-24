/**
 * DIN-18130-1 minimal fixture for the STEP-2 pilot-1 map-driven harness.
 *
 * DIN-18130-1 ("Bestimmung des Wasserdurchlaessigkeitsbeiwerts – Teil 1:
 * Laborversuche", 1998-05) is a SELF-CONTAINED lab-method standard: the
 * permeability k = f(measured quantities) via Darcy's law. Unlike DWA-A-138 it
 * has NO server-side materialize topology — its equations are plain arithmetic
 * evaluated by the shared `evaluateFormula` engine, and the derived output
 * round-trips through the REAL `saveWorksheet` as a client write-back.
 *
 * This seed is DRIVEN BY the reasoning map's node list
 * (reasoning-maps/DIN-18130-1): worksheet DIN-18130-1-04 (the `calculation`
 * worksheet) with its eight equation rows Gl.(1)-(4),(6),(7),(8),(9) verbatim
 * from prod (standard 4a53393a-…), plus DIN-18130-1-05 (summary) carrying the
 * k_f/report CRs. Equation formulas + numbers are taken from prod; the harness
 * asserts the computed value against the RENDERED PDF page (SR-3).
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

/** Prod equation rows for DIN-18130-1 (formula strings verbatim from prod). */
export const DIN18130_EQUATIONS = [
  { num: '1', out: 'Q', formula: 'Q = V_w / t', page: 3 },
  { num: '2', out: 'v', formula: 'v = Q / A', page: 3 },
  { num: '3', out: 'i', formula: 'i = h / l', page: 3 },
  { num: '4', out: 'k', formula: 'k = v / i', page: 3 },
  { num: '6', out: 'k_10', formula: 'k_10 = (1.359 / (1 + 0.0337*T + 0.00022*T^2)) * k_T', page: 5 },
  { num: '7', out: 'h', formula: 'h = (h_0 * (gamma_w - gamma_org)) / gamma_w', page: 5 },
  { num: '8', out: 'k', formula: 'k = (Q * l) / (A * h)', page: 16 },
  { num: '9', out: 'k', formula: 'k = (a * l_0) / (A * t) * ln(h_1 / h_2)', page: 16 },
] as const;

/** Verbatim prod compliance conditions for DIN-18130-1 (read-only from prod). */
export const DIN18130_CRS = [
  { code: 'DIN-18130-1-CR-01', cond: 'max_d IS NOT NULL AND A_min IS NOT NULL', sev: 'block' },
  { code: 'DIN-18130-1-CR-02', cond: 'umlaeufigkeit_verhindert == true', sev: 'block' },
  { code: 'DIN-18130-1-CR-03', cond: 'saettigung_aufgebracht == true OR versuchsklasse IN {2,3}', sev: 'block' },
  { code: 'DIN-18130-1-CR-04', cond: 'V_w > 0 AND t > 0', sev: 'block' },
  { code: 'DIN-18130-1-CR-05', cond: 'k_10 > 0', sev: 'block' },
  { code: 'DIN-18130-1-CR-06', cond: 'versuchsbericht_vollstaendig == true AND k_10 > 0', sev: 'block' },
  { code: 'DIN-18130-1-CR-07', cond: 'k_f IS NOT NULL', sev: 'block' },
] as const;

export type Din18130Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  ws04InstanceId: string;
  ws05InstanceId: string;
  ws04TemplateId: string;
  /** field id by symbol on the calc worksheet -04 */
  fields04: Record<string, string>;
  fields05: Record<string, string>;
  /** equation id by equation_number */
  equationIds: Record<string, string>;
};

export async function seedDin18130(
  sql: postgres.Sql,
  userId: string,
): Promise<Din18130Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'din18130-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('DIN18130 Harness Org', ${'din18130-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'DIN18130-PILOT-01', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DIN-18130-1', 'DIN 18130-1', 'harness') RETURNING id`;

  const mkTemplate = async (code: string, title: string) => {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de) VALUES (${std.id}, ${code}, ${title}) RETURNING id`;
    const [s] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_sections (worksheet_template_id, code, title_de) VALUES (${t.id}, ${'S-' + code}, ${'S-' + code}) RETURNING id`;
    const [i] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id) VALUES (${proj.id}, ${t.id}) RETURNING id`;
    return { templateId: t.id, sectionId: s.id, instanceId: i.id };
  };
  const mkField = async (
    templateId: string, sectionId: string, symbol: string, dataType: string, oi: number,
  ) => {
    const [f] = await sql<{ id: string }[]>`
      INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
      VALUES (${templateId}, ${sectionId}, ${symbol}, ${symbol}, ${dataType}, true, ${oi}) RETURNING id`;
    return f.id;
  };
  const mkEquation = async (
    templateId: string, num: string, formula: string, outputSymbol: string,
  ) => {
    const [e] = await sql<{ id: string }[]>`
      INSERT INTO equations (worksheet_template_id, equation_number, formula, output_symbol)
      VALUES (${templateId}, ${num}, ${formula}, ${outputSymbol}) RETURNING id`;
    return e.id;
  };

  // ── DIN-18130-1-04 (calculation): all 8 equations + their input/output fields ──
  const t04 = await mkTemplate('DIN-18130-1-04', 'Auswertung - Berechnung k');
  const fields04: Record<string, string> = {};
  // every symbol appearing in any equation (inputs + outputs), one field each
  const symbols04 = [
    'V_w', 't', 'A', 'h', 'l', 'a', 'l_0', 'h_1', 'h_2', 'T', 'k_T',
    'h_0', 'gamma_w', 'gamma_org', 'alpha', 'Q', 'v', 'i', 'k', 'k_10',
  ];
  let oi = 1;
  for (const sym of symbols04) fields04[sym] = await mkField(t04.templateId, t04.sectionId, sym, 'number', oi++);

  const equationIds: Record<string, string> = {};
  for (const e of DIN18130_EQUATIONS) equationIds[e.num] = await mkEquation(t04.templateId, e.num, e.formula, e.out);

  // ── DIN-18130-1-05 (summary): k_f transfer + report CR fields ──
  const t05 = await mkTemplate('DIN-18130-1-05', 'Ergebnisangabe / Transfer DWA-A-138');
  const fields05: Record<string, string> = {};
  fields05['k_f'] = await mkField(t05.templateId, t05.sectionId, 'k_f', 'number', 1);
  fields05['versuchsbericht_vollstaendig'] = await mkField(t05.templateId, t05.sectionId, 'versuchsbericht_vollstaendig', 'boolean', 2);

  // ── the 7 block CRs, verbatim conditions ──
  const cr05 = new Set(['DIN-18130-1-CR-05', 'DIN-18130-1-CR-06']); // live on -04
  for (const cr of DIN18130_CRS) {
    const onSummary = cr.code === 'DIN-18130-1-CR-07' || cr.code === 'DIN-18130-1-CR-06';
    const tmpl = cr05.has(cr.code) && cr.code === 'DIN-18130-1-CR-05' ? t04.templateId
      : onSummary ? t05.templateId : t04.templateId;
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${tmpl}, ${cr.code}, ${cr.code}, ${cr.cond}, ${cr.sev})`;
  }

  return {
    projectId: proj.id,
    userId,
    standardId: std.id,
    ws04InstanceId: t04.instanceId,
    ws05InstanceId: t05.instanceId,
    ws04TemplateId: t04.templateId,
    fields04,
    fields05,
    equationIds,
  };
}
