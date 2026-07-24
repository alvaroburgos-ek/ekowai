/**
 * DWA-A-102-2 minimal fixture for the STEP-2 pilot-2 map-driven harness.
 *
 * DWA-A-102-2/BWK-A 3-2 ("Emissionsbezogene Bewertungen und Regelungen",
 * Dez 2020 / korr. Aug 2022) is the COMPLEX / stress-test standard: 36
 * worksheets, 62 equations, 30 CRs, cross-referencing KOSTRA-DWD-2020 (h_Na),
 * DWA-A 118 and DWA-A 138. Like DIN-18130-1 it has NO server-side materialize
 * topology — its arithmetic runs through the shared `evaluateFormula` engine and
 * derived outputs round-trip through the REAL `saveWorksheet` as client
 * write-backs.
 *
 * This seed is DRIVEN BY the reasoning map (reasoning-maps/DWA-A-102-2). The map
 * classifies each of the 62 equation nodes:
 *   - 40 PURE-arithmetic → engine-executable (the harness runs these);
 *   - 22 ENGINE-GAP (ln / Sum / piecewise-if / `Max(;)`-separator) → the harness
 *     asserts the engine FAILS LOUD (never fabricates), an instructive result;
 *   - 6 chains root in h_Na → KOSTRA-DWD (external, in_library:false) → cap NR:
 *     the harness proves the ARITHMETIC but records the value is not source-VA.
 * Formula strings + CR conditions are verbatim from prod (std b52680be-…); every
 * asserted value is checked against a verbatim PDF page (SR-3).
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 */
import type postgres from 'postgres';

/** Prod equation rows the harness drives (formula strings verbatim from prod). */
export const A1022_EQUATIONS = [
  // ── PURE-arithmetic, VA (no external root) ──
  { num: '1', out: 'A_b_a', formula: 'A_b_a = A_E_k_b - A_E_k_b_na', page: 28, cls: 'pure-VA' },
  { num: '5', out: 'b_R_a_AFS63', formula: 'b_R_a_AFS63 = B_R_a_AFS63 / A_b_a', page: 34, cls: 'pure-VA' },
  { num: '8', out: 'B_R_e_AFS63', formula: 'B_R_e_AFS63 = (1 - eta_ges) * B_R_a_AFS63', page: 35, cls: 'pure-VA' },
  { num: '9', out: 'q_A_b', formula: 'q_A_b = q_A_max * 15 / r_krit', page: 41, cls: 'pure-VA' },
  { num: '10', out: 'A_RKB', formula: 'A_RKB = 3.6 * Q_Bem_Tr / q_A_Bem', page: 42, cls: 'pure-VA' },
  { num: '11', out: 'V_RKB', formula: 'V_RKB = A_RKB * h_RKB', page: 42, cls: 'pure-VA' },
  { num: '12', out: 'A_eff', formula: 'A_eff = 3.6 * Q_Bem_Tr / q_A_max', page: 43, cls: 'pure-VA' },
  { num: '19', out: 'C_e_CSB', formula: 'C_e_CSB = (C_R_CSB * m + C_b_CSB) / (m + 1)', page: 49, cls: 'pure-VA' },
  { num: '27', out: 'm_Rue', formula: 'm_Rue = (Q_Dr - Q_T_aM) / Q_T_aM', page: 55, cls: 'pure-VA' },
  { num: 'B.1', out: 'Q_R_krit', formula: 'Q_R_krit = r_krit * A_b_a * f_D', page: 79, cls: 'pure-VA' },
  { num: 'B.2', out: 'Q_Bem_Tr', formula: 'Q_Bem_Tr = Q_R_krit + Q_F', page: 79, cls: 'pure-VA' },
  { num: 'B.7', out: 'Q_R_Dr', formula: 'Q_R_Dr = Q_M - Q_T_aM - Q_R_Tr', page: 87, cls: 'pure-VA' },
  { num: 'B.14', out: 'C_b_CSB', formula: 'C_b_CSB = 600 * (a_c_CSB + a_h + a_a)', page: 88, cls: 'pure-VA' },
  { num: 'B.20', out: 'tau', formula: 'tau = 430 * (q_T_aM / f_D)^0.45 * (d_I)', page: 90, cls: 'pure-VA-pow' },
  { num: 'B.21', out: 'a_a', formula: 'a_a = (24 / x_a)^2 * (2 - tau) / 10', page: 90, cls: 'pure-VA-pow' },
  { num: 'B.22', out: 'b_R_a_AFS63', formula: 'b_R_a_AFS63 = (p_I * 280 + p_II * 530 + p_III * 760) / 100', page: 90, cls: 'pure-VA' },
  { num: 'T6.H1', out: 'H1', formula: 'H1 = (4000 + 25 * q_R_Dr / f_D) / (0.551 + q_R_Dr / f_D)', page: 51, cls: 'pure-VA' },
  { num: 'T6.V', out: 'V', formula: 'V = V_s * A_b_a * f_D', page: 51, cls: 'pure-VA' },
  // ── relational, RHS pure → engine rhs() strips LHS, VA ──
  { num: '18', out: 'e_0', formula: 'e_0 <= (107 - 70) / (C_e_CSB - 70) * 100 = 3700 / (C_e_CSB - 70)', page: 49, cls: 'gap-twosided' },
  { num: '28', out: 'Q_Dr', formula: 'Q_Dr >= (m_Rue + 1) * Q_T_aM', page: 55, cls: 'relational-VA' },
  // ── NR: arithmetic sound but chain roots in h_Na → KOSTRA-DWD (external) ──
  { num: '2', out: 'V_R_aM', formula: 'V_R_aM = h_Na * A_b_a * psi_aM * 10', page: 29, cls: 'pure-NR-hNa' },
  { num: '16', out: 'B_R_e_zul_CSB', formula: 'B_R_e_zul_CSB = V_R_aM * C_R_CSB', page: 49, cls: 'pure-NR-hNa' },
  // ── ENGINE-GAP: ln ──
  { num: 'REG-Bild4', out: 'q_A_Bem', formula: 'q_A_Bem = -8.333 * ln(eta_ges) - 1.6629', page: 41, cls: 'gap-ln' },
  // ── ENGINE-GAP: Sum() ──
  { num: '4', out: 'B_R_a_AFS63', formula: 'B_R_a_AFS63 = Sum(B_R_a_AFS63_i)', page: 34, cls: 'gap-sum' },
  { num: 'B.17', out: 'd_I', formula: 'd_I = Sum(d_i * I_S_i * l_i) / Sum(l_i)', page: 89, cls: 'gap-sum' },
  // ── ENGINE-GAP: Max(a; b) semicolon separator (NEW class exposed at complexity scale) ──
  { num: '6', out: 'eta_erf', formula: 'eta_erf = Max(0; 1 - b_R_e_zul_AFS63 / b_R_a_AFS63)', page: 34, cls: 'gap-semicolon' },
  { num: 'T6.Vs', out: 'V_s', formula: 'V_s = Max(H1 / (e_0 + 6) - H2; V_S_min)', page: 51, cls: 'gap-semicolon' },
] as const;

/** Verbatim prod compliance conditions the harness fires (read-only from prod). */
export const A1022_CRS = [
  { code: 'REQ-03', cond: 'balance_area_size > 0', sev: 'block' },
  { code: 'REQ-04', cond: 'A_b_a_I + A_b_a_II + A_b_a_III == A_b_a', sev: 'block' },
  { code: 'REQ-06', cond: 'A_b_a_I > 0 AND A_b_a_II > 0 AND A_b_a_III > 0', sev: 'block' },
  { code: 'REQ-08', cond: 'f_D > 0 AND f_D <= 1', sev: 'block' },
  { code: 'REQ-15', cond: 'a_R_AFS63 >= 1.0 AND a_R_AFS63 <= 1.20', sev: 'block' },
  { code: 'REQ-17', cond: 'V_s >= V_S_min', sev: 'block' },
  { code: 'REQ-22', cond: 'eta_ges >= eta_erf', sev: 'block' },
  { code: 'REQ-23', cond: 'V_s >= 5', sev: 'block' },
] as const;

export type A1022Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  calcInstanceId: string;
  calcTemplateId: string;
  fields: Record<string, string>;
  equationIds: Record<string, string>;
};

export async function seedA1022(sql: postgres.Sql, userId: string): Promise<A1022Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a1022-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A1022 Harness Org', ${'a1022-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A1022-PILOT-02', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-102-2', 'DWA-A 102-2', 'harness') RETURNING id`;

  const [t] = await sql<{ id: string }[]>`
    INSERT INTO worksheet_templates (standard_id, code, title_de) VALUES (${std.id}, 'A1022-CALC', 'Berechnung (harness)') RETURNING id`;
  const [sec] = await sql<{ id: string }[]>`
    INSERT INTO worksheet_sections (worksheet_template_id, code, title_de) VALUES (${t.id}, 'S-CALC', 'S-CALC') RETURNING id`;
  const [inst] = await sql<{ id: string }[]>`
    INSERT INTO worksheet_instances (project_id, worksheet_template_id) VALUES (${proj.id}, ${t.id}) RETURNING id`;

  // every symbol appearing in any harnessed equation (inputs + outputs), one field each
  const symbols = Array.from(
    new Set(
      A1022_EQUATIONS.flatMap((e) => {
        const rhs = e.formula.replace(/^[^=]*=/, '');
        const ids = rhs.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
        return [e.out, ...ids.filter((s) => !['Sum', 'Max', 'Min', 'ln'].includes(s))];
      }),
    ),
  );
  const fields: Record<string, string> = {};
  let oi = 1;
  for (const sym of symbols) {
    const [f] = await sql<{ id: string }[]>`
      INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
      VALUES (${t.id}, ${sec.id}, ${sym}, ${sym}, 'number', true, ${oi++}) RETURNING id`;
    fields[sym] = f.id;
  }

  const equationIds: Record<string, string> = {};
  for (const e of A1022_EQUATIONS) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO equations (worksheet_template_id, equation_number, formula, output_symbol)
      VALUES (${t.id}, ${e.num}, ${e.formula}, ${e.out}) RETURNING id`;
    equationIds[e.num] = row.id;
  }

  for (const cr of A1022_CRS) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${t.id}, ${cr.code}, ${cr.code}, ${cr.cond}, ${cr.sev})`;
  }

  return {
    projectId: proj.id,
    userId,
    standardId: std.id,
    calcInstanceId: inst.id,
    calcTemplateId: t.id,
    fields,
    equationIds,
  };
}
