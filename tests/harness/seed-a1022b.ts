/**
 * DWA-A-102-2/BWK-A 3-2 ("Emissionsbezogene Bewertungen und Regelungen",
 * Dez 2020 / korr. Aug 2022) — CURRENT-PROD fixture for the REAL save-path
 * gate-execution-proof + engine symbol-verify harness.
 *
 * WHY a SECOND seed (seed-a1022b) alongside the committed seed-a1022.ts:
 * the committed seed + a1022-verify test encode an OLDER prod snapshot — Max()
 * with a `;` separator, a two-sided Gl.18 string, and the F-4 var-vs-var bug
 * (bare-ident RHS under `>=` silently never enforced). LIVE prod (standard
 * b52680be-…, re-pulled this session) has MOVED ON:
 *   - Max()/Min() are now stored COMMA-separated → arithmetic.ts supports them.
 *   - Gl.18 is now a clean single-sided `(107-70)/(C_e_CSB-70)*100`.
 *   - evaluate.ts now routes an ORDERING op with a bare-ident RHS through the
 *     numeric `acompare` path (the F-4 fix) → V_s>=V_S_min etc. ENFORCE.
 * Re-running the committed a1022-verify against today's code would FAIL on the
 * stale assertions. This file is written from a live re-pull so it does not
 * clobber the committed harness and reflects what prod actually serves.
 *
 * 62 equation formulas + 12 live BLOCK compliance conditions are VERBATIM from
 * prod. Fields are seeded on their REAL prod home worksheets (data_type verbatim)
 * so `checkApprovalGate`'s local + conflict-free project-wide fallback resolves
 * cross-worksheet gates exactly as prod does. Every asserted numeric value is
 * checked against a verbatim source page/line (SR-3); NO prod credentials,
 * disposable embedded PG.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/**
 * All 62 prod equations (formula strings VERBATIM from prod, this session).
 *  cls:
 *   pure       — arithmetic, engine-executable, VA
 *   pure-NR    — arithmetic OK but chain roots in h_Na → KOSTRA-DWD (external) → NR
 *   minmax     — comma-form min/max (now engine-supported) → VA
 *   pow        — uses ^ power → VA
 *   ln         — uses ln() (now engine-supported); source = Zusatzdatei regression fit
 *   rel        — relational (`<=`/`>=`); rhs() strips LHS → pure RHS → VA
 *   identity   — degenerate: rhs() reduces it to a bare symbol (recorded, harmless)
 *   sum        — Sum() aggregate → engine FAILS LOUD (manual_required), never fabricates
 */
export const A1022B_EQUATIONS: ReadonlyArray<{
  num: string; out: string; formula: string; cls: string; srcLine: string;
}> = [
  { num: '1', out: 'A_b_a', formula: 'A_b_a = A_E_k_b - A_E_k_b_na', cls: 'pure', srcLine: 'Gl.(1) §4.2' },
  { num: '2', out: 'V_R_aM', formula: 'V_R_aM = h_Na * A_b_a * psi_aM * 10', cls: 'pure-NR', srcLine: 'Gl.(2) §4.3 (h_Na=KOSTRA-DWD)' },
  { num: 'B.4', out: 'Q_M', formula: 'Q_M = f_S_QM * Q_S_aM + Q_F', cls: 'pure', srcLine: 'Gl.(B.4) §B.3.2.3.1' },
  { num: 'B.5', out: 'Q_M', formula: 'Sum(Q_M_i) <= Q_M', cls: 'identity', srcLine: 'Gl.(B.5) §B.3.2.3.3' },
  { num: 'B.6', out: 'Q_R_Tr', formula: 'Q_R_Tr = Q_S_h_max_Tr', cls: 'identity', srcLine: 'Gl.(B.6) §B.3.2.4' },
  { num: '3', out: 'B_R_a_AFS63_i', formula: 'B_R_a_AFS63_i = A_b_a_i * b_R_a_AFS63_i', cls: 'pure', srcLine: 'Gl.(3) §5.2.3.2' },
  { num: '4', out: 'B_R_a_AFS63', formula: 'B_R_a_AFS63 = Sum(B_R_a_AFS63_i)', cls: 'sum', srcLine: 'Gl.(4) §5.2.3.2' },
  { num: '5', out: 'b_R_a_AFS63', formula: 'b_R_a_AFS63 = B_R_a_AFS63 / A_b_a', cls: 'pure', srcLine: 'Gl.(5) §5.2.3.2' },
  { num: '6', out: 'eta_erf', formula: 'max(0, 1 - b_R_e_zul_AFS63 / b_R_a_AFS63) * 100', cls: 'minmax', srcLine: 'Gl.(6) md L1081 Max(0;1-...)' },
  { num: '7', out: 'B_R_e_AFS63_i', formula: 'B_R_e_AFS63_i = A_b_a_i * (1 - eta_i) * b_R_a_AFS63_i', cls: 'pure', srcLine: 'Gl.(7) §5.2.3.2' },
  { num: '8', out: 'B_R_e_AFS63', formula: 'B_R_e_AFS63 = (1 - eta_ges) * B_R_a_AFS63', cls: 'pure', srcLine: 'Gl.(8) §5.2.3.2' },
  { num: 'B.1', out: 'Q_R_krit', formula: 'Q_R_krit = r_krit * A_b_a * f_D', cls: 'pure', srcLine: 'Gl.(B.1) §B.1.3' },
  { num: 'B.2', out: 'Q_Bem_Tr', formula: 'Q_Bem_Tr = Q_R_krit + Q_F', cls: 'pure', srcLine: 'Gl.(B.2) §B.2.1' },
  { num: '9', out: 'q_A_b', formula: 'q_A_b = q_A_max * 15 / r_krit', cls: 'pure', srcLine: 'Gl.(9) md L1257' },
  { num: 'B.3', out: 'q_A_Bem', formula: 'q_A_Bem = 3.6 * Q_Bem_Tr / A_sed', cls: 'pure', srcLine: 'Gl.(B.3) §B.2.2' },
  { num: 'REG-Bild4', out: 'q_A_Bem', formula: 'q_A_Bem = -8.333 * ln(eta_ges) - 1.6629', cls: 'ln', srcLine: 'Zusatzdatei md L634 (Bild 4 fit)' },
  { num: '10', out: 'A_RKB', formula: 'A_RKB = 3.6 * Q_Bem_Tr / q_A_Bem', cls: 'pure', srcLine: 'Gl.(10) §6.2.3' },
  { num: '11', out: 'V_RKB', formula: 'V_RKB = A_RKB * h_RKB', cls: 'pure', srcLine: 'Gl.(11) §6.2.4' },
  { num: '12', out: 'A_eff', formula: 'A_eff = 3.6 * Q_Bem_Tr / q_A_max', cls: 'pure', srcLine: 'Gl.(12) §6.3' },
  { num: 'B.7', out: 'Q_R_Dr', formula: 'Q_R_Dr = Q_M - Q_T_aM - Q_R_Tr', cls: 'pure', srcLine: 'Gl.(B.7) §B.3.3.1' },
  { num: 'B.8', out: 'q_R_Dr', formula: 'q_R_Dr = Q_R_Dr / A_b_a', cls: 'pure', srcLine: 'Gl.(B.8) §B.3.3.2' },
  { num: 'B.9', out: 'q_T_aM', formula: 'q_T_aM = Q_T_aM / A_b_a', cls: 'pure', srcLine: 'Gl.(B.9) md L1585 (Tab.6 r22)' },
  { num: 'B.10', out: 'a_f', formula: 'max(0.885, 0.50 + 50 / (t_f + 100))', cls: 'minmax', srcLine: 'Gl.(B.10) md L2573-74' },
  { num: 'T6.a_f', out: 'a_f', formula: 'a_f = max(0.5 + 50 / (t_f + 100), 0.885)', cls: 'minmax', srcLine: 'Tab.6 md L1586' },
  { num: 'B.11', out: 'Q_R_e', formula: 'Q_R_e = V_e_MWUe / (D_e * 3.6) + Q_R_Dr', cls: 'pure', srcLine: 'Gl.(B.11) §B.3.3.5' },
  { num: 'B.12', out: 'Q_R_e', formula: 'Q_R_e = a_f * (3.0 * A_b_a * f_D + 3.2 * Q_R_Dr)', cls: 'pure', srcLine: 'Gl.(B.12) md L1587 (Tab.6 r24)' },
  { num: 'B.13', out: 'm', formula: 'm = (Q_R_e + Q_R_Tr) / Q_T_aM', cls: 'pure', srcLine: 'Gl.(B.13) §B.3.3.6' },
  { num: '24', out: 'm', formula: 'm = (Q_R_e + Q_R_Tr) / Q_T_aM', cls: 'pure', srcLine: 'Gl.(24) §7.3.4.2' },
  { num: 'B.15a', out: 'a_c_CSB', formula: 'max(1, C_T_aM_CSB / 600)', cls: 'minmax', srcLine: 'Gl.(B.15) §B.3.3.8' },
  { num: 'B.15b', out: 'a_c_CSB', formula: 'max(1, C_T_aM_CSB / 600)', cls: 'minmax', srcLine: 'Gl.(B.15) §B.3.3.8' },
  { num: 'B.16', out: 'a_h', formula: 'min(max(h_Na / 800 - 1, -0.25), 0.25)', cls: 'minmax', srcLine: 'Gl.(B.16) md L2640' },
  { num: 'B.17', out: 'd_I', formula: 'd_I = Sum(d_i * I_S_i * l_i) / Sum(l_i)', cls: 'sum', srcLine: 'Gl.(B.17) §B.3.3.10' },
  { num: 'B.18', out: 'd_I', formula: 'd_I = 0.001 * (1 + 2 * (NG_m - 1))', cls: 'pure', srcLine: 'Gl.(B.18) §B.3.3.10' },
  { num: 'B.19', out: 'x_a', formula: 'x_a = 24 * Q_T_aM / Q_T_h_max', cls: 'pure', srcLine: 'Gl.(B.19) §B.3.3.10' },
  { num: 'B.20', out: 'tau', formula: 'tau = 430 * (q_T_aM / f_D)^0.45 * (d_I)', cls: 'pow', srcLine: 'Gl.(B.20) md L2677' },
  { num: 'B.21', out: 'a_a', formula: 'max(0, (24 / x_a)^2 * (2 - tau) / 10)', cls: 'minmax-pow', srcLine: 'Gl.(B.21) md L2678' },
  { num: 'B.14', out: 'C_b_CSB', formula: 'C_b_CSB = 600 * (a_c_CSB + a_h + a_a)', cls: 'pure', srcLine: 'Gl.(B.14) md L1595 (Tab. r32)' },
  { num: '21a', out: 'a_R_AFS63', formula: 'min(max(b_R_a_AFS63 / 478, 1.0), 1.20)', cls: 'minmax', srcLine: 'Gl.(21) md L1537-38' },
  { num: '21b', out: 'a_R_AFS63', formula: 'min(max(b_R_a_AFS63 / 478, 1.0), 1.20)', cls: 'minmax', srcLine: 'Gl.(21) md L1537-38' },
  { num: 'B.22', out: 'b_R_a_AFS63', formula: 'b_R_a_AFS63 = (p_I * 280 + p_II * 530 + p_III * 760) / 100', cls: 'pure', srcLine: 'Gl.(B.22) md L1596 (Tab. r33)' },
  { num: 'B.23a', out: 'a_R_AFS63', formula: 'min(max(b_R_a_AFS63 / 478, 1.0), 1.20)', cls: 'minmax', srcLine: 'Gl.(B.23) §B.3.3.12' },
  { num: 'B.23b', out: 'a_R_AFS63', formula: 'min(max(b_R_a_AFS63 / 478, 1.0), 1.20)', cls: 'minmax', srcLine: 'Gl.(B.23) §B.3.3.12' },
  { num: '19', out: 'C_e_CSB', formula: 'C_e_CSB = (C_R_CSB * m + C_b_CSB) / (m + 1)', cls: 'pure', srcLine: 'Gl.(19) §7.3.2.2' },
  { num: '20', out: 'C_e_CSB', formula: 'C_e_CSB = (C_R_CSB * a_R_AFS63 * m + C_b_CSB) / (m + 1)', cls: 'pure', srcLine: 'Gl.(20) md L1598 (Tab. r35)' },
  { num: 'B.24', out: 'C_e_CSB', formula: 'C_e_CSB = (C_R_CSB * a_R_AFS63 * m + C_b_CSB) / (m + 1)', cls: 'pure', srcLine: 'Gl.(B.24) §B.3.3.13' },
  { num: '13', out: 'e_0', formula: 'e_0 = V_e_MWUe / V_R_aM * 100', cls: 'pure', srcLine: 'Gl.(13) §7.3.2.2' },
  { num: '14', out: 'B_R_e', formula: '(V_R_aM * e_0 * C_e + V_R_aM * (100 - e_0) * C_KA) / 100', cls: 'pure', srcLine: 'Gl.(14) §7.3.2.2' },
  { num: '15', out: 'e_0', formula: 'e_0 <= (B_R_e_zul - V_R_aM * C_KA) / (V_R_aM * C_e - V_R_aM * C_KA) * 100', cls: 'rel', srcLine: 'Gl.(15) §7.3.2.2' },
  { num: '16', out: 'B_R_e_zul_CSB', formula: 'B_R_e_zul_CSB = V_R_aM * C_R_CSB', cls: 'pure-NR', srcLine: 'Gl.(16) §7.3.2.2 (inherits h_Na NR)' },
  { num: '17', out: 'e_0', formula: 'e_0 <= (C_R_CSB - C_KA_CSB) / (C_e_CSB - C_KA_CSB) * 100', cls: 'rel', srcLine: 'Gl.(17) md L1599 (Tab. r36)' },
  { num: '18', out: 'e_0', formula: '(107 - 70) / (C_e_CSB - 70) * 100', cls: 'pure', srcLine: 'Gl.(18) §7.3.2.2 (C_R=107,C_KA=70)' },
  { num: 'T6.H1', out: 'H1', formula: 'H1 = (4000 + 25 * q_R_Dr / f_D) / (0.551 + q_R_Dr / f_D)', cls: 'pure', srcLine: 'Tab.6 md L1600' },
  { num: 'T6.H2', out: 'H2', formula: 'H2 = (36.8 + 13.5 * q_R_Dr / f_D) / (0.5 + q_R_Dr / f_D)', cls: 'pure', srcLine: 'Tab.6 md L1601' },
  { num: 'T6.V', out: 'V', formula: 'V = V_s * A_b_a * f_D', cls: 'pure', srcLine: 'Tab.6' },
  { num: 'T6.Vs', out: 'V_s', formula: 'V_s = max(H1 / (e_0 + 6) - H2, V_S_min)', cls: 'minmax', srcLine: 'Tab.6' },
  { num: '25a', out: 'r_krit', formula: 'max(7.5, 15 * 120 / (t_f + 120))', cls: 'minmax', srcLine: 'Gl.(25) §7.3.4.5' },
  { num: '25b', out: 'r_krit', formula: 'max(7.5, 15 * 120 / (t_f + 120))', cls: 'minmax', srcLine: 'Gl.(25) §7.3.4.5' },
  { num: '26', out: 'Q_Dr', formula: 'Q_Dr >= Q_T_aM + Q_R_krit + Sum(Q_Dr_i)', cls: 'sum', srcLine: 'Gl.(26) §7.3.4.5' },
  { num: '27', out: 'm_Rue', formula: 'm_Rue = (Q_Dr - Q_T_aM) / Q_T_aM', cls: 'pure', srcLine: 'Gl.(27) §7.3.4.5' },
  { num: '28', out: 'Q_Dr', formula: 'Q_Dr >= (m_Rue + 1) * Q_T_aM', cls: 'rel', srcLine: 'Gl.(28) §7.3.4.5' },
  { num: '22', out: 'm', formula: 'max(7, (C_T_aM_CSB - 180) / 60)', cls: 'minmax', srcLine: 'Gl.(22/23) md L1668' },
  { num: '23', out: 'm', formula: 'max(7, (C_T_aM_CSB - 180) / 60)', cls: 'minmax', srcLine: 'Gl.(22/23) md L1668' },
];

/** The 12 live BLOCK gates (severity='block', non-empty condition), by HOST
 *  worksheet. Conditions VERBATIM from prod compliance_requirements. */
export const A1022B_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  { ws: 'A1022-01', code: 'REQ-28', cond: "regulation_edition == 'Dez 2020, korr. Aug 2022'", sev: 'block' },
  { ws: 'A1022-02', code: 'REQ-03', cond: 'balance_area_size > 0', sev: 'block' },
  { ws: 'A1022-04', code: 'REQ-06', cond: 'A_b_a_I > 0 AND A_b_a_II > 0 AND A_b_a_III > 0', sev: 'block' },
  { ws: 'A1022-04', code: 'REQ-07', cond: 'IF misch_active == True THEN (A_b_a_I > 0 AND A_b_a_II > 0 AND A_b_a_III > 0)', sev: 'block' },
  { ws: 'A1022-05', code: 'REQ-04', cond: 'A_b_a_I + A_b_a_II + A_b_a_III == A_b_a', sev: 'block' },
  { ws: 'A1022-09', code: 'REQ-08', cond: 'f_D > 0 AND f_D <= 1', sev: 'block' },
  { ws: 'A1022-10', code: 'REQ-11', cond: 'IF trenn_active == True THEN (A_RKB > 0 AND V_RKB > 0)', sev: 'block' },
  { ws: 'A1022-26', code: 'REQ-15', cond: 'a_R_AFS63 >= 1.0 AND a_R_AFS63 <= 1.20', sev: 'block' },
  { ws: 'A1022-30', code: 'REQ-17', cond: 'V_s >= V_S_min', sev: 'block' },
  { ws: 'A1022-30', code: 'REQ-23', cond: 'V_s >= 5', sev: 'block' },
  { ws: 'A1022-34', code: 'REQ-22', cond: 'eta_ges >= eta_erf', sev: 'block' },
  { ws: 'A1022-34', code: 'REQ-24', cond: 'm >= m_min_required', sev: 'block' },
];

/** Fields seeded per worksheet — each gate symbol on its REAL prod home
 *  (data_type verbatim). `m` is deliberately MULTI-HOMED (A1022-23/33/36) and
 *  V_S_min on (A1022-29/30) exactly as prod, so the REQ-24 fallback-collision
 *  can be reproduced. */
export const A1022B_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'A1022-01': [{ symbol: 'regulation_edition', dataType: 'text' }],
  'A1022-02': [{ symbol: 'balance_area_size', dataType: 'number' }],
  'A1022-03': [
    { symbol: 'misch_active', dataType: 'boolean' },
    { symbol: 'trenn_active', dataType: 'boolean' },
  ],
  'A1022-04': [
    { symbol: 'A_b_a_I', dataType: 'number' },
    { symbol: 'A_b_a_II', dataType: 'number' },
    { symbol: 'A_b_a_III', dataType: 'number' },
  ],
  'A1022-05': [{ symbol: 'A_b_a', dataType: 'number' }],
  'A1022-09': [{ symbol: 'f_D', dataType: 'number' }],
  'A1022-10': [], // host of REQ-11; reads trenn_active/A_RKB/V_RKB via fallback
  'A1022-11': [{ symbol: 'eta_erf', dataType: 'number' }],
  'A1022-17': [{ symbol: 'eta_ges', dataType: 'number' }],
  'A1022-18': [
    { symbol: 'A_RKB', dataType: 'number' },
    { symbol: 'V_RKB', dataType: 'number' },
  ],
  'A1022-26': [{ symbol: 'a_R_AFS63', dataType: 'number' }],
  'A1022-29': [{ symbol: 'V_S_min', dataType: 'number' }],
  'A1022-30': [
    { symbol: 'V_s', dataType: 'number' },
    { symbol: 'V_S_min', dataType: 'number' },
  ],
  'A1022-23': [{ symbol: 'm', dataType: 'number' }],
  'A1022-33': [{ symbol: 'm', dataType: 'number' }],
  'A1022-34': [], // host of REQ-22/REQ-24; reads eta_ges/eta_erf/m/m_min_required via fallback
  'A1022-36': [
    { symbol: 'm', dataType: 'number' },
    { symbol: 'm_min_required', dataType: 'number' },
  ],
};

export type A1022BFixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** worksheet code → (symbol → { fieldId, dataType }) — per-ws to handle multi-homed symbols */
  fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>>;
};

export async function seedA1022b(sql: postgres.Sql, userId: string): Promise<A1022BFixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a1022b-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A1022B Harness Org', ${'a1022b-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A1022-PROOF-B', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-102-2', 'DWA-A 102-2 (harness-b)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>> = {};
  const templateByWs: Record<string, string> = {};

  for (const [ws, wsFields] of Object.entries(A1022B_FIELDS)) {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de)
      VALUES (${std.id}, ${ws}, ${ws + ' (harness)'}) RETURNING id`;
    templateByWs[ws] = t.id;
    const [sec] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_sections (worksheet_template_id, code, title_de)
      VALUES (${t.id}, ${'S-' + ws}, ${'S-' + ws}) RETURNING id`;
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id)
      VALUES (${proj.id}, ${t.id}) RETURNING id`;
    instances[ws] = inst.id;

    fieldByWs[ws] = {};
    let oi = 1;
    for (const f of wsFields) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fieldByWs[ws][f.symbol] = { fieldId: row.id, dataType: f.dataType };
    }
  }

  for (const g of A1022B_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldByWs };
}
