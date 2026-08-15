/**
 * Per-facility fixtures for the Milestone-1 fan-out real-save-path harness.
 *
 * Each seeder stands up (in a fresh project inside the shared harness PG) exactly
 * the worksheets + fields + equations + params a given facility's volume
 * materialize + A138-23 summary need, mirroring the prod topology so the REAL
 * saveWorksheet drives the same producer/step-6b/chain-fire path.
 *
 * Facilities: flaeche(16), rigole(18), mre(19), schacht(21), becken(22).
 * MRS(20) is EXCLUDED (ratification block) and has no seeder.
 *
 * Source-verified equation ids (must match equation-profiles.ts):
 */
import type postgres from 'postgres';

const GL7_A138_12 = '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac'; // A_S,m direct owner (ASM_GL7)
const GL17_A138_18 = '8afdb49a-7bb1-4f07-a64e-43009b8b6be1'; // Rigole geometry A_S,m (Gl.17)
const GL19_A138_18 = '58c0c298-ca72-4bb6-ab05-0b298114523e'; // V_R required (displayOnly)
const GL28_A138_19 = '570a63ed-08c4-4324-9ee7-0408816bba3f'; // V_MR required (displayOnly)
const GL35_A138_21 = 'bfaf30f2-26e6-4373-9642-23429805afa2'; // V_S required (displayOnly)
const GL41_A138_22 = '433f7700-90cb-410d-8103-7b72f53db8fa'; // V_B Gl.41 (displayOnly)

/** The V_R producer equations on A138-18 (client write-back candidates). */
export const A138_18_V_R_EQUATIONS = [GL19_A138_18] as const;
export const A138_19_V_MR_EQUATIONS = [GL28_A138_19] as const;
export const A138_21_V_S_EQUATIONS = [GL35_A138_21] as const;
export const A138_22_V_B_EQUATIONS = [GL41_A138_22] as const;

/** KOSTRA-shaped rainfall rows (governing D varies by facility geometry). */
export const RAIN_ROWS = [
  { D_min: 5, r_D_n: 250 },
  { D_min: 10, r_D_n: 180 },
  { D_min: 60, r_D_n: 58 },
  { D_min: 360, r_D_n: 16 },
  { D_min: 720, r_D_n: 9 },
  { D_min: 1440, r_D_n: 5.8 },
];

export type FacilityFixture = {
  projectId: string;
  facilityInstanceId: string;
  ws23InstanceId: string;
  // facility volume field on the facility worksheet
  volumeFieldId: string;
  // A138-23 summary output field ids
  f_dimensioned: string;
  f_volume: string;
  f_footprint: string;
  f_complete: string;
  f_recommended: string;
  f_reasons: string;
  // per-facility "nudge" field id (a volume-driving input we re-save)
  nudgeFieldId: string;
  nudgeValue: number;
};

type Ctx = {
  sql: postgres.Sql;
  userId: string;
  orgId: string;
  standardId: string;
};

/** Base handle: profile + org. Each facility gets its OWN standard (via freshStandard)
 *  because worksheet_templates has UNIQUE(standard_id, code) — reusing one standard
 *  across facilities that share worksheet codes (A138-12/23/…) collides. */
export type Base = { sql: postgres.Sql; userId: string; orgId: string };

export async function seedFacilityBase(sql: postgres.Sql, userId: string): Promise<Base> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'harness@test.local')
            ON CONFLICT (id) DO NOTHING`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('Harness Org', ${'harness-' + Date.now() + '-' + Math.random()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  return { sql, userId, orgId: org.id };
}

/** Fresh standard (unique code per facility) → a per-facility Ctx. */
async function freshCtx(base: Base): Promise<Ctx> {
  const code = 'DWA-A-138-1-' + Math.random().toString(36).slice(2, 8);
  const [std] = await base.sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES (${code}, 'DWA-A 138-1', ${'h-' + Math.random()}) RETURNING id`;
  return { sql: base.sql, userId: base.userId, orgId: base.orgId, standardId: std.id };
}

// ── low-level builders ──────────────────────────────────────────────────────
async function mkProject(ctx: Ctx, name: string): Promise<string> {
  const [p] = await ctx.sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${ctx.orgId}, ${name}, ${ctx.userId}) RETURNING id`;
  return p.id;
}
async function mkTemplate(ctx: Ctx, code: string): Promise<{ templateId: string; sectionId: string }> {
  const [t] = await ctx.sql<{ id: string }[]>`
    INSERT INTO worksheet_templates (standard_id, code, title_de) VALUES (${ctx.standardId}, ${code}, ${code}) RETURNING id`;
  const [s] = await ctx.sql<{ id: string }[]>`
    INSERT INTO worksheet_sections (worksheet_template_id, code, title_de) VALUES (${t.id}, ${'S-' + code}, ${'S-' + code}) RETURNING id`;
  return { templateId: t.id, sectionId: s.id };
}
async function mkInstance(ctx: Ctx, projectId: string, templateId: string): Promise<string> {
  const [i] = await ctx.sql<{ id: string }[]>`
    INSERT INTO worksheet_instances (project_id, worksheet_template_id) VALUES (${projectId}, ${templateId}) RETURNING id`;
  return i.id;
}
async function mkField(ctx: Ctx, templateId: string, sectionId: string, symbol: string, dataType: string, oi: number): Promise<string> {
  const [f] = await ctx.sql<{ id: string }[]>`
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
    VALUES (${templateId}, ${sectionId}, ${symbol}, ${symbol}, ${dataType}, true, ${oi}) RETURNING id`;
  return f.id;
}
async function mkEquation(ctx: Ctx, templateId: string, id: string, num: string, formula: string, outputSymbol: string): Promise<void> {
  await ctx.sql`INSERT INTO equations (id, worksheet_template_id, equation_number, formula, output_symbol)
                VALUES (${id}, ${templateId}, ${num}, ${formula}, ${outputSymbol})`;
}
async function insParam(ctx: Ctx, projectId: string, fieldId: string, instanceId: string, cols: Record<string, unknown>): Promise<void> {
  await ctx.sql`INSERT INTO project_parameters ${ctx.sql({
    project_id: projectId, field_id: fieldId, source_worksheet_instance_id: instanceId,
    entered_by: ctx.userId, source_type: 'entered', ...cols,
  })}`;
}

/** Seed the A138-23 summary worksheet + its output fields (shared shape). */
async function mkSummary(ctx: Ctx, projectId: string) {
  const t23 = await mkTemplate(ctx, 'A138-23');
  const inst = await mkInstance(ctx, projectId, t23.templateId);
  const f = {
    f_dimensioned: await mkField(ctx, t23.templateId, t23.sectionId, 'facility_type_dimensioned', 'text', 1),
    f_volume: await mkField(ctx, t23.templateId, t23.sectionId, 'facility_specific_volume_m3', 'number', 2),
    f_footprint: await mkField(ctx, t23.templateId, t23.sectionId, 'facility_footprint_m2', 'number', 3),
    f_meets_qsac: await mkField(ctx, t23.templateId, t23.sectionId, 'facility_meets_qsac', 'boolean', 4),
    f_complete: await mkField(ctx, t23.templateId, t23.sectionId, 'facility_specific_dimensioning_complete', 'boolean', 5),
    f_date: await mkField(ctx, t23.templateId, t23.sectionId, 'facility_design_completion_date', 'date', 6),
    f_recommended: await mkField(ctx, t23.templateId, t23.sectionId, 'recommended_phase_4_gate', 'enum', 7),
    f_reasons: await mkField(ctx, t23.templateId, t23.sectionId, 'phase_4_recommendation_reasons', 'text', 8),
    f_gate: await mkField(ctx, t23.templateId, t23.sectionId, 'phase_4_gate_result', 'enum', 9),
  };
  await insParam(ctx, projectId, f.f_gate, inst, { value_enum: 'FAIL' });
  return { instanceId: inst, ...f };
}

/** A138-15 facility selector + A138-07 A_C + A138-04 rainfall carrier. */
async function mkSupport(ctx: Ctx, projectId: string, facility: string, A_C: number) {
  const t04 = await mkTemplate(ctx, 'A138-04');
  const i04 = await mkInstance(ctx, projectId, t04.templateId);
  const rdn = await mkField(ctx, t04.templateId, t04.sectionId, 'r_D_n_table', 'json', 1);
  await insParam(ctx, projectId, rdn, i04, { value_json: ctx.sql.json({ rows: RAIN_ROWS }) });

  const t07 = await mkTemplate(ctx, 'A138-07');
  const i07 = await mkInstance(ctx, projectId, t07.templateId);
  const acF = await mkField(ctx, t07.templateId, t07.sectionId, 'A_C', 'number', 1);
  await insParam(ctx, projectId, acF, i07, { value_number: String(A_C) });

  const t15 = await mkTemplate(ctx, 'A138-15');
  const i15 = await mkInstance(ctx, projectId, t15.templateId);
  const ftF = await mkField(ctx, t15.templateId, t15.sectionId, 'facility_type_selected', 'enum', 1);
  await insParam(ctx, projectId, ftF, i15, { value_enum: facility });
  return {};
}

// ── FLÄCHE (A138-16) — no volume; REQ-31 Gl.13 feasibility gate ──────────────
export async function seedFlaeche(base: Base, opts: { feasible: boolean }): Promise<FacilityFixture> {
  const ctx = await freshCtx(base);
  const projectId = await mkProject(ctx, 'HS-FLAECHE');
  const summary = await mkSummary(ctx, projectId);
  await mkSupport(ctx, projectId, 'flaeche', 1000);

  const t16 = await mkTemplate(ctx, 'A138-16');
  const i16 = await mkInstance(ctx, projectId, t16.templateId);
  // Dimensioned footprint (the summary maps flaeche footprint → a138_A_s_dim).
  const aDim = await mkField(ctx, t16.templateId, t16.sectionId, 'a138_A_s_dim', 'number', 1);
  const rDnUsed = await mkField(ctx, t16.templateId, t16.sectionId, 'r_D_n_used', 'number', 2);
  const kiF = await mkField(ctx, t16.templateId, t16.sectionId, 'k_i', 'number', 3);
  const qsac = await mkField(ctx, t16.templateId, t16.sectionId, 'q_S_AC', 'number', 4);

  await insParam(ctx, projectId, aDim, i16, { value_number: '200' });
  await insParam(ctx, projectId, rDnUsed, i16, { value_number: '100' });
  // feasible: k_i=1e-4 > 100·1e-7=1e-5 ; infeasible: k_i=5e-7 ≤ 1e-5.
  await insParam(ctx, projectId, kiF, i16, { value_number: opts.feasible ? '1e-4' : '5e-7' });
  await insParam(ctx, projectId, qsac, i16, { value_number: '3' }); // meetsQsac

  return {
    projectId, facilityInstanceId: i16, ws23InstanceId: summary.instanceId,
    volumeFieldId: '', // no volume for flaeche
    f_dimensioned: summary.f_dimensioned, f_volume: summary.f_volume, f_footprint: summary.f_footprint,
    f_complete: summary.f_complete, f_recommended: summary.f_recommended, f_reasons: summary.f_reasons,
    nudgeFieldId: aDim, nudgeValue: 200,
  };
}

// ── RIGOLE (A138-18) — V_R = b_R·h_R·L_R·s_R (Gl.20; s_R via Gl.21) ──────────
export async function seedRigole(base: Base): Promise<FacilityFixture & { expectedVR: number }> {
  const ctx = await freshCtx(base);
  const projectId = await mkProject(ctx, 'HS-RIGOLE');
  const summary = await mkSummary(ctx, projectId);
  await mkSupport(ctx, projectId, 'rigole', 1000);

  // A138-12 A_S,m owner (method=geometry → the asm producer fires on a rigole geometry save).
  const t12 = await mkTemplate(ctx, 'A138-12');
  const i12 = await mkInstance(ctx, projectId, t12.templateId);
  const methodF = await mkField(ctx, t12.templateId, t12.sectionId, 'a_s_m_determination_method', 'enum', 1);
  await mkField(ctx, t12.templateId, t12.sectionId, 'A_S_m', 'number', 2);
  await mkField(ctx, t12.templateId, t12.sectionId, 'A_S_min', 'number', 3);
  await mkField(ctx, t12.templateId, t12.sectionId, 'A_S_max', 'number', 4);
  await mkEquation(ctx, t12.templateId, GL7_A138_12, 'Gl.7', '(A_S_min + A_S_max) / 2', 'A_S_m');
  await insParam(ctx, projectId, methodF, i12, { value_enum: 'geometry' });

  const t18 = await mkTemplate(ctx, 'A138-18');
  const i18 = await mkInstance(ctx, projectId, t18.templateId);
  const bR = await mkField(ctx, t18.templateId, t18.sectionId, 'b_R', 'number', 1);
  const hR = await mkField(ctx, t18.templateId, t18.sectionId, 'h_R', 'number', 2);
  const lR = await mkField(ctx, t18.templateId, t18.sectionId, 'L_R', 'number', 3);
  const sF = await mkField(ctx, t18.templateId, t18.sectionId, 's_F', 'number', 4);
  const azF = await mkField(ctx, t18.templateId, t18.sectionId, 'az', 'number', 5);
  const vR = await mkField(ctx, t18.templateId, t18.sectionId, 'V_R', 'number', 6);
  const qsac = await mkField(ctx, t18.templateId, t18.sectionId, 'q_S_AC', 'number', 7);
  await mkEquation(ctx, t18.templateId, GL17_A138_18, 'Gl.17', '(b_R + h_R) * L_R + b_R * h_R', 'A_S_m');
  await mkEquation(ctx, t18.templateId, GL19_A138_18, 'Gl.19', 'A_C*r_D_n*b_R*h_R*L_R*k_i*Q_Dr*D*f_Z', 'V_R');

  // b_R=0.5, h_R=1.0, L_R=20, s_F=0.35, az=0 → s_R = s_F = 0.35 → V_R = 0.5·1·20·0.35 = 3.5.
  await insParam(ctx, projectId, bR, i18, { value_number: '0.5' });
  await insParam(ctx, projectId, hR, i18, { value_number: '1.0' });
  await insParam(ctx, projectId, lR, i18, { value_number: '20' });
  await insParam(ctx, projectId, sF, i18, { value_number: '0.35' });
  await insParam(ctx, projectId, azF, i18, { value_number: '0' });
  await insParam(ctx, projectId, qsac, i18, { value_number: '3' });

  return {
    projectId, facilityInstanceId: i18, ws23InstanceId: summary.instanceId,
    volumeFieldId: vR,
    f_dimensioned: summary.f_dimensioned, f_volume: summary.f_volume, f_footprint: summary.f_footprint,
    f_complete: summary.f_complete, f_recommended: summary.f_recommended, f_reasons: summary.f_reasons,
    nudgeFieldId: bR, nudgeValue: 0.5,
    expectedVR: 0.5 * 1.0 * 20 * 0.35,
  };
}

// ── RIGOLE REQ-32 (Gl.25) block case: L_VS·q_VS < r_5(n)·A_C·10⁻⁴ ───────────
export async function seedRigoleReq32Fail(base: Base): Promise<FacilityFixture> {
  const ctx = await freshCtx(base);
  const projectId = await mkProject(ctx, 'HS-RIGOLE-REQ32');
  const summary = await mkSummary(ctx, projectId);
  await mkSupport(ctx, projectId, 'rigole', 1000);

  const t18 = await mkTemplate(ctx, 'A138-18');
  const i18 = await mkInstance(ctx, projectId, t18.templateId);
  // Provide a materialized V_R + footprint so the summary is complete, then a
  // FAILING Vollsickerrohr: L_VS·q_VS = 1·0.2 = 0.2 < r_5(n)·A_C·1e-4 = 200·1000·1e-4 = 20.
  const vR = await mkField(ctx, t18.templateId, t18.sectionId, 'V_R', 'number', 1);
  const lVs = await mkField(ctx, t18.templateId, t18.sectionId, 'L_VS', 'number', 2);
  const qVs = await mkField(ctx, t18.templateId, t18.sectionId, 'q_VS', 'number', 3);
  const r5n = await mkField(ctx, t18.templateId, t18.sectionId, 'r_5_n', 'number', 4);
  const qsac = await mkField(ctx, t18.templateId, t18.sectionId, 'q_S_AC', 'number', 5);
  await insParam(ctx, projectId, vR, i18, { value_number: '3.5' });
  await insParam(ctx, projectId, lVs, i18, { value_number: '1' });
  await insParam(ctx, projectId, qVs, i18, { value_number: '0.2' });
  await insParam(ctx, projectId, r5n, i18, { value_number: '200' });
  await insParam(ctx, projectId, qsac, i18, { value_number: '3' });
  // footprint A_S_m inherited via A138-12.
  const t12 = await mkTemplate(ctx, 'A138-12');
  const i12 = await mkInstance(ctx, projectId, t12.templateId);
  const aSm = await mkField(ctx, t12.templateId, t12.sectionId, 'A_S_m', 'number', 1);
  await insParam(ctx, projectId, aSm, i12, { value_number: '45' });

  return {
    projectId, facilityInstanceId: i18, ws23InstanceId: summary.instanceId, volumeFieldId: vR,
    f_dimensioned: summary.f_dimensioned, f_volume: summary.f_volume, f_footprint: summary.f_footprint,
    f_complete: summary.f_complete, f_recommended: summary.f_recommended, f_reasons: summary.f_reasons,
    nudgeFieldId: lVs, nudgeValue: 1,
  };
}

// ── SCHACHT REQ-33 (Gl.38) block case: Typ B, A_S,FS·k_f,FS < A_S,Schacht·k_i ─
export async function seedSchachtReq33Fail(base: Base): Promise<FacilityFixture> {
  const ctx = await freshCtx(base);
  const projectId = await mkProject(ctx, 'HS-SCHACHT-REQ33');
  const summary = await mkSummary(ctx, projectId);
  await mkSupport(ctx, projectId, 'schacht', 500);

  const t12 = await mkTemplate(ctx, 'A138-12');
  const i12 = await mkInstance(ctx, projectId, t12.templateId);
  const kiF = await mkField(ctx, t12.templateId, t12.sectionId, 'k_i', 'number', 1);
  await insParam(ctx, projectId, kiF, i12, { value_number: '1e-5' });

  const t21 = await mkTemplate(ctx, 'A138-21');
  const i21 = await mkInstance(ctx, projectId, t21.templateId);
  const vS = await mkField(ctx, t21.templateId, t21.sectionId, 'V_S', 'number', 1);
  const aSchacht = await mkField(ctx, t21.templateId, t21.sectionId, 'A_S_Schacht', 'number', 2);
  const shaftType = await mkField(ctx, t21.templateId, t21.sectionId, 'shaft_type', 'enum', 3);
  const aSFs = await mkField(ctx, t21.templateId, t21.sectionId, 'A_S_FS', 'number', 4);
  const kfFs = await mkField(ctx, t21.templateId, t21.sectionId, 'k_f_FS', 'number', 5);
  const dInnen = await mkField(ctx, t21.templateId, t21.sectionId, 'd_S_innen', 'number', 6);
  const qsac = await mkField(ctx, t21.templateId, t21.sectionId, 'q_S_AC', 'number', 7);
  // V_S + footprint present → complete; Typ B filter FAILS: 1·1e-7 = 1e-7 < 5·1e-5 = 5e-5.
  await insParam(ctx, projectId, vS, i21, { value_number: '2.0' });
  await insParam(ctx, projectId, aSchacht, i21, { value_number: '5' });
  await insParam(ctx, projectId, shaftType, i21, { value_enum: 'typ_b' });
  await insParam(ctx, projectId, aSFs, i21, { value_number: '1' });
  await insParam(ctx, projectId, kfFs, i21, { value_number: '1e-7' });
  await insParam(ctx, projectId, qsac, i21, { value_number: '3' });

  return {
    projectId, facilityInstanceId: i21, ws23InstanceId: summary.instanceId, volumeFieldId: vS,
    f_dimensioned: summary.f_dimensioned, f_volume: summary.f_volume, f_footprint: summary.f_footprint,
    f_complete: summary.f_complete, f_recommended: summary.f_recommended, f_reasons: summary.f_reasons,
    nudgeFieldId: dInnen, nudgeValue: 1.0,
  };
}

// ── MRE (A138-19) — V_MR = persisted V_M + persisted V_R (Gl.26) ────────────
export async function seedMre(base: Base): Promise<FacilityFixture & { expectedVMR: number }> {
  const ctx = await freshCtx(base);
  const projectId = await mkProject(ctx, 'HS-MRE');
  const summary = await mkSummary(ctx, projectId);
  await mkSupport(ctx, projectId, 'mre', 1000);

  // Persisted component volumes live on A138-17 (V_M) and A138-18 (V_R).
  const t17 = await mkTemplate(ctx, 'A138-17');
  const i17 = await mkInstance(ctx, projectId, t17.templateId);
  const vM = await mkField(ctx, t17.templateId, t17.sectionId, 'V_M', 'number', 1);
  await insParam(ctx, projectId, vM, i17, { value_number: '12.5' });

  const t18 = await mkTemplate(ctx, 'A138-18');
  const i18 = await mkInstance(ctx, projectId, t18.templateId);
  const vR = await mkField(ctx, t18.templateId, t18.sectionId, 'V_R', 'number', 1);
  await insParam(ctx, projectId, vR, i18, { value_number: '3.5' });

  const t19 = await mkTemplate(ctx, 'A138-19');
  const i19 = await mkInstance(ctx, projectId, t19.templateId);
  const vMR = await mkField(ctx, t19.templateId, t19.sectionId, 'V_MR', 'number', 1);
  const vMmre = await mkField(ctx, t19.templateId, t19.sectionId, 'V_M_MRE', 'number', 2);
  const aSm = await mkField(ctx, t19.templateId, t19.sectionId, 'A_S_m', 'number', 3);
  const qsac = await mkField(ctx, t19.templateId, t19.sectionId, 'q_S_AC', 'number', 4);
  await mkEquation(ctx, t19.templateId, GL28_A138_19, 'Gl.28', 'A_C*A_VA*r_D_n*b_R*h_R*L_R*k_i*D*f_Z', 'V_MR');
  // footprint A_S_m inherited (summary reads A_S_m).
  await insParam(ctx, projectId, aSm, i19, { value_number: '45' });
  await insParam(ctx, projectId, qsac, i19, { value_number: '3' });

  return {
    projectId, facilityInstanceId: i19, ws23InstanceId: summary.instanceId,
    volumeFieldId: vMR,
    f_dimensioned: summary.f_dimensioned, f_volume: summary.f_volume, f_footprint: summary.f_footprint,
    f_complete: summary.f_complete, f_recommended: summary.f_recommended, f_reasons: summary.f_reasons,
    nudgeFieldId: vMmre, nudgeValue: 1,
    expectedVMR: 12.5 + 3.5,
  };
}

// ── SCHACHT (A138-21) — V_S = π·d_i²/4·h_S (Gl.36; h_S swept Gl.37) ──────────
export async function seedSchacht(base: Base): Promise<FacilityFixture & { expectedVS: number }> {
  const ctx = await freshCtx(base);
  const projectId = await mkProject(ctx, 'HS-SCHACHT');
  const summary = await mkSummary(ctx, projectId);
  await mkSupport(ctx, projectId, 'schacht', 500);

  // k_i + f_Z inherit from A138-12 (co-located with the standard). Seed them there.
  const t12 = await mkTemplate(ctx, 'A138-12');
  const i12 = await mkInstance(ctx, projectId, t12.templateId);
  const kiF = await mkField(ctx, t12.templateId, t12.sectionId, 'k_i', 'number', 1);
  const fZF = await mkField(ctx, t12.templateId, t12.sectionId, 'f_Z', 'number', 2);
  await insParam(ctx, projectId, kiF, i12, { value_number: '1e-5' });
  await insParam(ctx, projectId, fZF, i12, { value_number: '1.2' });

  const t21 = await mkTemplate(ctx, 'A138-21');
  const i21 = await mkInstance(ctx, projectId, t21.templateId);
  const vS = await mkField(ctx, t21.templateId, t21.sectionId, 'V_S', 'number', 1);
  const dInnen = await mkField(ctx, t21.templateId, t21.sectionId, 'd_S_innen', 'number', 2);
  const dAussen = await mkField(ctx, t21.templateId, t21.sectionId, 'd_S_aussen', 'number', 3);
  const aSchacht = await mkField(ctx, t21.templateId, t21.sectionId, 'A_S_Schacht', 'number', 4);
  const shaftType = await mkField(ctx, t21.templateId, t21.sectionId, 'shaft_type', 'enum', 5);
  const qsac = await mkField(ctx, t21.templateId, t21.sectionId, 'q_S_AC', 'number', 6);
  await mkEquation(ctx, t21.templateId, GL35_A138_21, 'Gl.35', 'A_C*r_D_n*A_S*k_i*D*f_Z', 'V_S');
  await insParam(ctx, projectId, dInnen, i21, { value_number: '1.0' });
  await insParam(ctx, projectId, dAussen, i21, { value_number: '1.1' });
  await insParam(ctx, projectId, aSchacht, i21, { value_number: '5' }); // footprint (Gl.34, entered)
  await insParam(ctx, projectId, shaftType, i21, { value_enum: 'typ_a' }); // Typ A → REQ-33 N/A
  await insParam(ctx, projectId, qsac, i21, { value_number: '3' });

  // Governing h_S = max over rows of Gl.37. Compute expected in-test.
  const A_C = 500, d_a = 1.1, d_i = 1.0, k_i = 1e-5, f_Z = 1.2;
  const hOf = (D: number, r_D: number) => {
    const num = A_C * 1e-7 * r_D - (Math.PI * d_a ** 2) / 4 * k_i;
    const den = (Math.PI * d_i ** 2) / (4 * D * 60 * f_Z) + (d_a * Math.PI * k_i) / 2;
    return num / den;
  };
  const hGov = Math.max(...RAIN_ROWS.map((r) => hOf(r.D_min, r.r_D_n)));
  const expectedVS = (Math.PI * d_i ** 2) / 4 * hGov;

  return {
    projectId, facilityInstanceId: i21, ws23InstanceId: summary.instanceId,
    volumeFieldId: vS,
    f_dimensioned: summary.f_dimensioned, f_volume: summary.f_volume, f_footprint: summary.f_footprint,
    f_complete: summary.f_complete, f_recommended: summary.f_recommended, f_reasons: summary.f_reasons,
    nudgeFieldId: dInnen, nudgeValue: 1.0,
    expectedVS,
  };
}

// ── BECKEN (A138-22) — V_B via Gl.41 governing sweep ────────────────────────
export async function seedBecken(base: Base): Promise<FacilityFixture & { expectedVB: number }> {
  const ctx = await freshCtx(base);
  const projectId = await mkProject(ctx, 'HS-BECKEN');
  const summary = await mkSummary(ctx, projectId);
  await mkSupport(ctx, projectId, 'becken', 2000);

  // A_S_m + k_i + f_Z inherit from A138-12.
  const t12 = await mkTemplate(ctx, 'A138-12');
  const i12 = await mkInstance(ctx, projectId, t12.templateId);
  const aSmF = await mkField(ctx, t12.templateId, t12.sectionId, 'A_S_m', 'number', 1);
  const kiF = await mkField(ctx, t12.templateId, t12.sectionId, 'k_i', 'number', 2);
  const fZF = await mkField(ctx, t12.templateId, t12.sectionId, 'f_Z', 'number', 3);
  await insParam(ctx, projectId, aSmF, i12, { value_number: '50' });
  await insParam(ctx, projectId, kiF, i12, { value_number: '1e-5' });
  await insParam(ctx, projectId, fZF, i12, { value_number: '1.2' });

  const t22 = await mkTemplate(ctx, 'A138-22');
  const i22 = await mkInstance(ctx, projectId, t22.templateId);
  const vB = await mkField(ctx, t22.templateId, t22.sectionId, 'V_B', 'number', 1);
  const aVa = await mkField(ctx, t22.templateId, t22.sectionId, 'A_VA_Becken', 'number', 2);
  const hB = await mkField(ctx, t22.templateId, t22.sectionId, 'h_B', 'number', 3);
  const qsac = await mkField(ctx, t22.templateId, t22.sectionId, 'q_S_AC', 'number', 4);
  await mkEquation(ctx, t22.templateId, GL41_A138_22, 'Gl.41', 'A_C*A_VA*r_D_n*A_S_m*k_i*Q_Dr*D*f_Z*f_A', 'V_B');
  await insParam(ctx, projectId, aVa, i22, { value_number: '100' });
  await insParam(ctx, projectId, hB, i22, { value_number: '0.5' });
  await insParam(ctx, projectId, qsac, i22, { value_number: '3' });

  // Expected: governing over rows of Gl.41 (Q_Dr=0, f_A=1).
  const A_C = 2000, A_VA = 100, A_S_m = 50, k_i = 1e-5, f_Z = 1.2, Q_Dr = 0, f_A = 1;
  const vOf = (D: number, r_D: number) =>
    ((A_C + A_VA) * 1e-7 * r_D - A_S_m * k_i - Q_Dr * 1e-3) * D * 60 * f_Z * f_A;
  const expectedVB = Math.max(...RAIN_ROWS.map((r) => vOf(r.D_min, r.r_D_n)));

  return {
    projectId, facilityInstanceId: i22, ws23InstanceId: summary.instanceId,
    volumeFieldId: vB,
    f_dimensioned: summary.f_dimensioned, f_volume: summary.f_volume, f_footprint: summary.f_footprint,
    f_complete: summary.f_complete, f_recommended: summary.f_recommended, f_reasons: summary.f_reasons,
    nudgeFieldId: aVa, nudgeValue: 100,
    expectedVB,
  };
}
