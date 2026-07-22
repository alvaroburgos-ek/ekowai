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
