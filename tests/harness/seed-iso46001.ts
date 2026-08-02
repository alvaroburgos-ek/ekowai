/**
 * ISO 46001:2019 ("Water efficiency management systems — Requirements with
 * guidance for use", First edition 2019-07) — CURRENT-PROD fixture for the REAL
 * save-path gate-execution-proof harness.
 *
 * PROVENANCE NOTE (R-2, read honestly): the Supabase MCP was NOT connected in the
 * acting session, so this topology could not be re-pulled live from prod. It is
 * reconstructed from the on-disk encoding snapshot
 *   C:\Users\Ekowai\Desktop\Guidelines\_site_audit\ISO-46001\_db_encoding.json
 * (2026-06-23) PLUS the two migration deltas already APPLIED to prod on 2026-07-28:
 *   - 20260728140000_iso46001_c1_fix.sql  → Eq C.1 formula = 'Win = WD + R1 + R2 + R3'
 *   - 20260728254000_mishome_iso_46001.sql → CR-037, CR-038 re-homed ISO-46001-06 → -08
 * The June-23 count (10 ws · 35 block · 5 warn · 4 equations) matches the topology
 * the campaign brief states for current prod exactly. The harness proves ENGINE
 * BEHAVIOUR on these verbatim strings (the execution ground truth); a byte-for-byte
 * confirmation that the strings match live prod is the MCP-blocked cross-check.
 *
 * This is a REQUIREMENTS (Annex-SL HLS) management-system standard. Its enforcement
 * surface is BOTH the compliance layer (40 gates) and a 4-equation Annex-C water-
 * balance/recycling block. The 35 BLOCK gates split into:
 *   - 33 boolean attestation/flag gates `flag == true` / `attest == True`
 *   - 2 numeric non-negativity gates `indicator >= 0` (CR-017, CR-018) — degenerate
 *     (any non-negative input passes; null → pending) but reach a DEFINITE fail on a
 *     negative value, so drivable both ways.
 *
 * FIVE cross-worksheet BLOCK gates are homed on a worksheet whose read field lives
 * on ANOTHER worksheet; they resolve through checkApprovalGate's conflict-free
 * project-wide fallback (buildFallbackValues / makeGateLookup) and therefore DO
 * enforce — proven both ways in the verify test:
 *   - CR-005 leadership_commitment (home -01, field -02)
 *   - CR-017 water_efficiency_indicator (home -03, field -04)
 *   - CR-018 baseline_water_efficiency_indicator (home -03, field -04)
 *   - CR-027 design_consideration (home -06, field -07)
 *   - CR-029 maintenance_inspection (home -06, field -07)
 *   NB: Wave-11 (claude-fable-5, 2026-07-28) assessed CR-005 as "a real F-4 dead
 *   block gate that never blocks" (worksheet-local lookup) — an ASSESSED, not
 *   executed, claim. The fallback path (committed, exercised by the iso14019-1 /
 *   iso14046 harnesses) contradicts it; the verify test EXECUTES CR-005 both ways.
 *
 * The 5 WARN gates (CR-040/036/039 = literal 'manual'; CR-037 Win==Wout; CR-038
 * recycling >= 0) are severity='warn' → structurally excluded from the approval-gate
 * block query, so they can never block. CR-037's `Win == Wout` additionally hits the
 * bare-identifier-RHS equality trap (RHS 'Wout' → string literal → always fail); it
 * is warn, so no enforcement is lost, but the balance check never truly runs. Both
 * are judgment items on the sign-off sheet, NOT fixed here.
 *
 * The 4 Annex-C equations are driven through the REAL evaluateFormula:
 *   C.1  Win  = WD + R1 + R2 + R3                       (post-migration; input side of Formula C.2, p.34)
 *   C.2b Wout = O1 + O2 + O3 + O4                        (Formula C.2, p.34)
 *   C.3  plant_recycling_rate   = (Rp + Rnp) / (Rp + Rnp + WD) * 100   (Formula C.3, p.35)
 *   C.5  process_recycling_rate = Rp / (Wp + Rpp) * 100  (Formula C.5, p.35)
 * All four use dot/integer literals — NO comma-decimal parse trap. Nothing applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type FType = 'boolean' | 'text' | 'number' | 'enum' | 'date';

/** All 40 prod compliance gates (35 block + 5 warn), conditions + severities +
 *  HOME worksheet VERBATIM from the reconstructed prod state (post-migration).
 *  Nothing is fixed here. */
export const ISO46001_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // ── ws-01 (§4 context / §5 leadership) — 7 block + 1 warn ──
  { ws: 'ISO-46001-01', code: 'CR-001', sev: 'block', cond: 'attest_iso_46001_01_cr_001 == True' },
  { ws: 'ISO-46001-01', code: 'CR-002', sev: 'block', cond: 'attest_iso_46001_01_cr_002 == True' },
  { ws: 'ISO-46001-01', code: 'CR-003', sev: 'block', cond: 'attest_iso_46001_01_cr_003 == True' },
  { ws: 'ISO-46001-01', code: 'CR-004', sev: 'block', cond: 'wems_established == true' },
  { ws: 'ISO-46001-01', code: 'CR-005', sev: 'block', cond: 'leadership_commitment == true' }, // field on -02 (cross-ws)
  { ws: 'ISO-46001-01', code: 'CR-006', sev: 'block', cond: 'attest_iso_46001_01_cr_006 == True' },
  { ws: 'ISO-46001-01', code: 'CR-007', sev: 'block', cond: 'attest_iso_46001_01_cr_007 == True' },
  { ws: 'ISO-46001-01', code: 'CR-040', sev: 'warn', cond: 'manual' },
  // ── ws-03 (§6 planning / objectives / indicators) — 13 block ──
  { ws: 'ISO-46001-03', code: 'CR-008', sev: 'block', cond: 'attest_iso_46001_03_cr_008 == True' },
  { ws: 'ISO-46001-03', code: 'CR-009', sev: 'block', cond: 'attest_iso_46001_03_cr_009 == True' },
  { ws: 'ISO-46001-03', code: 'CR-010', sev: 'block', cond: 'attest_iso_46001_03_cr_010 == True' },
  { ws: 'ISO-46001-03', code: 'CR-011', sev: 'block', cond: 'planning_process_documented == true' },
  { ws: 'ISO-46001-03', code: 'CR-012', sev: 'block', cond: 'attest_iso_46001_03_cr_012 == True' },
  { ws: 'ISO-46001-03', code: 'CR-013', sev: 'block', cond: 'attest_iso_46001_03_cr_013 == True' },
  { ws: 'ISO-46001-03', code: 'CR-014', sev: 'block', cond: 'attest_iso_46001_03_cr_014 == True' },
  { ws: 'ISO-46001-03', code: 'CR-015', sev: 'block', cond: 'attest_iso_46001_03_cr_015 == True' },
  { ws: 'ISO-46001-03', code: 'CR-016', sev: 'block', cond: 'attest_iso_46001_03_cr_016 == True' },
  { ws: 'ISO-46001-03', code: 'CR-017', sev: 'block', cond: 'water_efficiency_indicator >= 0' }, // field on -04 (cross-ws)
  { ws: 'ISO-46001-03', code: 'CR-018', sev: 'block', cond: 'baseline_water_efficiency_indicator >= 0' }, // field on -04 (cross-ws)
  { ws: 'ISO-46001-03', code: 'CR-019', sev: 'block', cond: 'attest_iso_46001_03_cr_019 == True' },
  { ws: 'ISO-46001-03', code: 'CR-020', sev: 'block', cond: 'attest_iso_46001_03_cr_020 == True' },
  // ── ws-06 (§7 support / §8 operation) — 9 block ──
  { ws: 'ISO-46001-06', code: 'CR-021', sev: 'block', cond: 'resources_provided == true' },
  { ws: 'ISO-46001-06', code: 'CR-022', sev: 'block', cond: 'attest_iso_46001_06_cr_022 == True' },
  { ws: 'ISO-46001-06', code: 'CR-023', sev: 'block', cond: 'awareness == true' },
  { ws: 'ISO-46001-06', code: 'CR-024', sev: 'block', cond: 'attest_iso_46001_06_cr_024 == True' },
  { ws: 'ISO-46001-06', code: 'CR-025', sev: 'block', cond: 'attest_iso_46001_06_cr_025 == True' },
  { ws: 'ISO-46001-06', code: 'CR-026', sev: 'block', cond: 'attest_iso_46001_06_cr_026 == True' },
  { ws: 'ISO-46001-06', code: 'CR-027', sev: 'block', cond: 'design_consideration == true' }, // field on -07 (cross-ws)
  { ws: 'ISO-46001-06', code: 'CR-028', sev: 'block', cond: 'attest_iso_46001_06_cr_028 == True' },
  { ws: 'ISO-46001-06', code: 'CR-029', sev: 'block', cond: 'maintenance_inspection == true' }, // field on -07 (cross-ws)
  // ── ws-08 (Annex-C water balance & recycling) — 2 warn (re-homed from -06) ──
  { ws: 'ISO-46001-08', code: 'CR-037', sev: 'warn', cond: 'Win == Wout' },
  { ws: 'ISO-46001-08', code: 'CR-038', sev: 'warn', cond: 'plant_recycling_rate >= 0 AND process_recycling_rate >= 0' },
  // ── ws-09 (§9 performance evaluation) — 4 block + 2 warn ──
  { ws: 'ISO-46001-09', code: 'CR-030', sev: 'block', cond: 'attest_iso_46001_09_cr_030 == True' },
  { ws: 'ISO-46001-09', code: 'CR-031', sev: 'block', cond: 'compliance_evaluation == true' },
  { ws: 'ISO-46001-09', code: 'CR-032', sev: 'block', cond: 'attest_iso_46001_09_cr_032 == True' },
  { ws: 'ISO-46001-09', code: 'CR-033', sev: 'block', cond: 'management_review == true' },
  { ws: 'ISO-46001-09', code: 'CR-036', sev: 'warn', cond: 'manual' },
  { ws: 'ISO-46001-09', code: 'CR-039', sev: 'warn', cond: 'manual' },
  // ── ws-10 (§10 improvement) — 2 block ──
  { ws: 'ISO-46001-10', code: 'CR-034', sev: 'block', cond: 'attest_iso_46001_10_cr_034 == True' },
  { ws: 'ISO-46001-10', code: 'CR-035', sev: 'block', cond: 'continual_improvement == true' },
];

/** The 4 Annex-C equations, verbatim from prod (C.1 post-migration). Driven through
 *  the REAL evaluateFormula in the verify test (template-agnostic). */
export const ISO46001_EQUATIONS = [
  { num: 'C.1', out: 'Win', homeWs: 'ISO-46001-08', formula: 'Win = WD + R1 + R2 + R3' },
  { num: 'C.2b', out: 'Wout', homeWs: 'ISO-46001-08', formula: 'Wout = O1 + O2 + O3 + O4' },
  { num: 'C.3', out: 'plant_recycling_rate', homeWs: 'ISO-46001-08', formula: 'plant_recycling_rate = (Rp + Rnp) / (Rp + Rnp + WD) * 100' },
  { num: 'C.5', out: 'process_recycling_rate', homeWs: 'ISO-46001-08', formula: 'process_recycling_rate = Rp / (Wp + Rpp) * 100' },
] as const;

/** The 10 worksheet codes (topology parity with prod). */
export const ISO46001_WORKSHEETS: readonly string[] = [
  'ISO-46001-01', 'ISO-46001-02', 'ISO-46001-03', 'ISO-46001-04', 'ISO-46001-05',
  'ISO-46001-06', 'ISO-46001-07', 'ISO-46001-08', 'ISO-46001-09', 'ISO-46001-10',
];

/** Fields seeded per HOME worksheet — every BLOCK gate read symbol on its home
 *  worksheet, the cross-worksheet read fields on their real home worksheet, PLUS the
 *  four warn-gate read fields on -08. Only fields a driven gate reads are seeded. */
export const ISO46001_FIELDS: Record<string, Array<{ symbol: string; dataType: FType }>> = {
  'ISO-46001-01': [
    { symbol: 'attest_iso_46001_01_cr_001', dataType: 'boolean' }, // CR-001
    { symbol: 'attest_iso_46001_01_cr_002', dataType: 'boolean' }, // CR-002
    { symbol: 'attest_iso_46001_01_cr_003', dataType: 'boolean' }, // CR-003
    { symbol: 'wems_established', dataType: 'boolean' },           // CR-004
    { symbol: 'attest_iso_46001_01_cr_006', dataType: 'boolean' }, // CR-006
    { symbol: 'attest_iso_46001_01_cr_007', dataType: 'boolean' }, // CR-007
  ],
  'ISO-46001-02': [
    { symbol: 'leadership_commitment', dataType: 'boolean' },      // CR-005 (gate on -01, cross-ws)
  ],
  'ISO-46001-03': [
    { symbol: 'attest_iso_46001_03_cr_008', dataType: 'boolean' }, // CR-008
    { symbol: 'attest_iso_46001_03_cr_009', dataType: 'boolean' }, // CR-009
    { symbol: 'attest_iso_46001_03_cr_010', dataType: 'boolean' }, // CR-010
    { symbol: 'planning_process_documented', dataType: 'boolean' },// CR-011
    { symbol: 'attest_iso_46001_03_cr_012', dataType: 'boolean' }, // CR-012
    { symbol: 'attest_iso_46001_03_cr_013', dataType: 'boolean' }, // CR-013
    { symbol: 'attest_iso_46001_03_cr_014', dataType: 'boolean' }, // CR-014
    { symbol: 'attest_iso_46001_03_cr_015', dataType: 'boolean' }, // CR-015
    { symbol: 'attest_iso_46001_03_cr_016', dataType: 'boolean' }, // CR-016
    { symbol: 'attest_iso_46001_03_cr_019', dataType: 'boolean' }, // CR-019
    { symbol: 'attest_iso_46001_03_cr_020', dataType: 'boolean' }, // CR-020
  ],
  'ISO-46001-04': [
    { symbol: 'water_efficiency_indicator', dataType: 'number' },          // CR-017 (gate on -03, cross-ws)
    { symbol: 'baseline_water_efficiency_indicator', dataType: 'number' }, // CR-018 (gate on -03, cross-ws)
  ],
  'ISO-46001-05': [], // no gates / no cross-ws read fields — seeded for topology parity
  'ISO-46001-06': [
    { symbol: 'resources_provided', dataType: 'boolean' },         // CR-021
    { symbol: 'attest_iso_46001_06_cr_022', dataType: 'boolean' }, // CR-022
    { symbol: 'awareness', dataType: 'boolean' },                  // CR-023
    { symbol: 'attest_iso_46001_06_cr_024', dataType: 'boolean' }, // CR-024
    { symbol: 'attest_iso_46001_06_cr_025', dataType: 'boolean' }, // CR-025
    { symbol: 'attest_iso_46001_06_cr_026', dataType: 'boolean' }, // CR-026
    { symbol: 'attest_iso_46001_06_cr_028', dataType: 'boolean' }, // CR-028
  ],
  'ISO-46001-07': [
    { symbol: 'design_consideration', dataType: 'boolean' },       // CR-027 (gate on -06, cross-ws)
    { symbol: 'maintenance_inspection', dataType: 'boolean' },     // CR-029 (gate on -06, cross-ws)
  ],
  'ISO-46001-08': [
    { symbol: 'Win', dataType: 'number' },                         // CR-037 warn read
    { symbol: 'Wout', dataType: 'number' },                        // CR-037 warn read
    { symbol: 'plant_recycling_rate', dataType: 'number' },        // CR-038 warn read
    { symbol: 'process_recycling_rate', dataType: 'number' },      // CR-038 warn read
  ],
  'ISO-46001-09': [
    { symbol: 'attest_iso_46001_09_cr_030', dataType: 'boolean' }, // CR-030
    { symbol: 'compliance_evaluation', dataType: 'boolean' },      // CR-031
    { symbol: 'attest_iso_46001_09_cr_032', dataType: 'boolean' }, // CR-032
    { symbol: 'management_review', dataType: 'boolean' },          // CR-033
  ],
  'ISO-46001-10': [
    { symbol: 'attest_iso_46001_10_cr_034', dataType: 'boolean' }, // CR-034
    { symbol: 'continual_improvement', dataType: 'boolean' },      // CR-035
  ],
};

export type ISO46001Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** worksheet code → (symbol → { fieldId, dataType }) */
  fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>>;
  /** equation number → equation id */
  equationIds: Record<string, string>;
};

export async function seedISO46001(sql: postgres.Sql, userId: string): Promise<ISO46001Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso46001-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO46001 Harness Org', ${'iso46001-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO46001-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-46001', 'ISO 46001 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>> = {};
  const templateByWs: Record<string, string> = {};

  let wsOrder = 1;
  for (const ws of ISO46001_WORKSHEETS) {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de, order_index)
      VALUES (${std.id}, ${ws}, ${ws + ' (harness)'}, ${wsOrder++}) RETURNING id`;
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
    for (const f of ISO46001_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fieldByWs[ws][f.symbol] = { fieldId: row.id, dataType: f.dataType };
    }
  }

  for (const g of ISO46001_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const equationIds: Record<string, string> = {};
  for (const e of ISO46001_EQUATIONS) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO equations (worksheet_template_id, equation_number, formula, output_symbol)
      VALUES (${templateByWs[e.homeWs]}, ${e.num}, ${e.formula}, ${e.out}) RETURNING id`;
    equationIds[e.num] = row.id;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldByWs, equationIds };
}
