/**
 * ISO 5667-16 ("Water quality — Sampling — Part 16: Guidance on biotesting of
 * samples"; First edition 1998-10-01, ISO 5667-16:1998(E), ISO/TC 147/SC 6) —
 * minimal fixture for the REAL save-path execution-proof harness.
 *
 * PROOF MANDATE: gate enforcement is claimable ONLY by EXECUTION. This fixture
 * drives the standard's 2 live BLOCK gates through the REAL `saveWorksheet`
 * (values persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition
 * against the saved values). Each gate is demonstrated BOTH ways — a state that
 * PASSES it and a state that VIOLATES it (definite `fail`) — so a gate that
 * fires but never enforces (the F-4 lesson) cannot hide.
 *
 * Topology pulled verbatim from prod (standard 0d88c294-a40c-46d6-af20-ae88e89f1eca,
 * project vadsmshzebefjreqcicl, this session, R-2): 9 worksheet_templates,
 * 2 BLOCK + 33 WARN gates, 2 equations. Conditions + severities are verbatim
 * from prod compliance_requirements; nothing is fixed here.
 *
 * This is a "Guidance on…" ISO part written almost entirely in "should" prose —
 * a HEAVILY ADVISORY standard by design (2 of 35 gates enforce). That is
 * expected: the two enforcing gates are the only two source clauses that read
 * as hard requirements —
 *   - CR-002 normative_references_consulted (WS01) — §2 "Normative references …
 *     constitute provisions of this part of ISO 5667" (ISO 5667-3, ISO 5667-10);
 *   - CR-020 dilution_water_type IN {…} (WS05) — §9.1 "chlorine-free tapwater,
 *     synthetic fresh water or sea water … SHALL be used" — the ONE printed
 *     "shall" in the document.
 *
 * GATE SHAPES (2 block):
 *   - 1 boolean attestation `symbol == true`
 *       CR-002 normative_references_consulted (WS01, §2) — pass true, VIOLATE false.
 *   - 1 enum membership `symbol IN {lowercase enum values}`
 *       CR-020 dilution_water_type IN {chlorine_free_tapwater, synthetic_fresh_water,
 *       natural_sea_water} (WS05, §9.1). The IN members are byte-identical to the
 *       field's own enum values (no Titlecase/lowercase trap). Pass with an
 *       in-set value, VIOLATE with 'deionized_water' — which §9.1 explicitly
 *       forbids ("cannot be carried out using deionized water").
 *
 * There are NO literal-`TRUE` no-op block gates, NO `!= ''` / `== null` /
 * `!= null` block gates, and NO `IF…THEN` block gates in this standard. CR-030
 * (WS07) is an EMPTY-condition gate but it is WARN (evaluates to `manual` →
 * never blocks), so it is not a block-gate no-op.
 *
 * The 33 WARN gates are seeded at their real WARN severity so checkApprovalGate's
 * block-only query correctly EXCLUDES them (proven never to block).
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';

/** The 2 live BLOCK gates + 33 WARN gates, conditions + severities verbatim from prod. */
export const ISO5667_16_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // WS01 — Registrierung & Anwendungsbereich (§1/§2)
  { ws: 'ISO-5667-16-01', code: 'CR-001', cond: 'biotest_type IS NOT NULL AND study_objective IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-16-01', code: 'CR-002', cond: 'normative_references_consulted == true', sev: 'block' },
  // WS02 — Probenahme, Behaelter & Transport (§3/§4)
  { ws: 'ISO-5667-16-02', code: 'CR-003', cond: 'sampling_point_representative == true', sev: 'warn' },
  { ws: 'ISO-5667-16-02', code: 'CR-004', cond: 'vessel_material IN {glass,polyethene,ptfe,other}', sev: 'warn' },
  { ws: 'ISO-5667-16-02', code: 'CR-005', cond: 'sample_volume > 0 AND sample_volume <= 10', sev: 'warn' },
  { ws: 'ISO-5667-16-02', code: 'CR-006', cond: 'container_filling_status IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-16-02', code: 'CR-007', cond: 'transport_protected == true', sev: 'warn' },
  // WS03 — Konservierung, Lagerung & Geraete (§5/§6)
  { ws: 'ISO-5667-16-03', code: 'CR-008', cond: 'storage_temperature >= -18 AND storage_temperature <= 25', sev: 'warn' },
  { ws: 'ISO-5667-16-03', code: 'CR-009', cond: 'ambient_storage_time <= 12', sev: 'warn' },
  { ws: 'ISO-5667-16-03', code: 'CR-010', cond: 'biocidal_preservative_excluded == true', sev: 'warn' },
  { ws: 'ISO-5667-16-03', code: 'CR-011', cond: 'apparatus_material_inert == true', sev: 'warn' },
  { ws: 'ISO-5667-16-03', code: 'CR-012', cond: 'silanization_concentration == 5', sev: 'warn' },
  // WS04 — Probenvorbehandlung & -vorbereitung (§7)
  { ws: 'ISO-5667-16-04', code: 'CR-013', cond: 'preparation_step IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-16-04', code: 'CR-014', cond: 'thawing_temperature <= 25', sev: 'warn' },
  { ws: 'ISO-5667-16-04', code: 'CR-015', cond: 'membrane_pore_size <= 0.2', sev: 'warn' },
  { ws: 'ISO-5667-16-04', code: 'CR-016', cond: 'centrifugation_force >= 3000 AND centrifugation_force <= 6000', sev: 'warn' },
  { ws: 'ISO-5667-16-04', code: 'CR-017', cond: 'ph_adjustment_value >= 6 AND ph_adjustment_value <= 9', sev: 'warn' },
  { ws: 'ISO-5667-16-04', code: 'CR-018', cond: 'emulsifier_concentration <= 100', sev: 'warn' },
  // WS05 — Behandlung waehrend des Tests & Testdesign (§8/§9)
  { ws: 'ISO-5667-16-05', code: 'CR-019', cond: 'ph_controlled_during_test == True', sev: 'warn' },
  { ws: 'ISO-5667-16-05', code: 'CR-020', cond: 'dilution_water_type IN {chlorine_free_tapwater,synthetic_fresh_water,natural_sea_water}', sev: 'block' },
  { ws: 'ISO-5667-16-05', code: 'CR-021', cond: 'reference_substance IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-16-05', code: 'CR-022', cond: 'replicate_count >= 2', sev: 'warn' },
  // WS06 — Testdurchfuehrung & Stoereinfluesse (§10)
  { ws: 'ISO-5667-16-06', code: 'CR-023', cond: 'adsorption_equilibration_time >= 30', sev: 'warn' },
  { ws: 'ISO-5667-16-06', code: 'CR-024', cond: 'removable_ingredient_loss IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-16-06', code: 'CR-025', cond: 'colour_turbidity_correction == True', sev: 'warn' },
  // WS07 — Spezielle biologische Pruefungen (§11)
  { ws: 'ISO-5667-16-07', code: 'CR-026', cond: 'BCF >= 0', sev: 'warn' },
  { ws: 'ISO-5667-16-07', code: 'CR-027', cond: 'CT_50 > 0', sev: 'warn' },
  { ws: 'ISO-5667-16-07', code: 'CR-028', cond: 'degradation_type IS NOT NULL AND degradation_test_method IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-16-07', code: 'CR-029', cond: 'mutation_type IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-16-07', code: 'CR-030', cond: '', sev: 'warn' },
  // WS08 — Auswertung & Ergebnisdarstellung (§12/§13)
  { ws: 'ISO-5667-16-08', code: 'CR-031', cond: 'effect_concentration_metric IS NOT NULL AND statistical_method IS NOT NULL', sev: 'warn' },
  { ws: 'ISO-5667-16-08', code: 'CR-032', cond: 'concentration_response_curve_presented == True', sev: 'warn' },
  { ws: 'ISO-5667-16-08', code: 'CR-033', cond: 'biodegradation_degree >= 0 AND biodegradation_degree <= 100', sev: 'warn' },
  // WS09 — Pruefbericht & Qualitaetssicherung (§14/§15)
  { ws: 'ISO-5667-16-09', code: 'CR-034', cond: 'test_report_complete == true', sev: 'warn' },
  { ws: 'ISO-5667-16-09', code: 'CR-035', cond: 'qa_measures_documented == true AND sop_documented == true', sev: 'warn' },
] as const;

/** The 9 worksheet codes (topology parity with prod). */
export const ISO5667_16_WORKSHEETS: readonly string[] = [
  'ISO-5667-16-01', 'ISO-5667-16-02', 'ISO-5667-16-03', 'ISO-5667-16-04',
  'ISO-5667-16-05', 'ISO-5667-16-06', 'ISO-5667-16-07', 'ISO-5667-16-08',
  'ISO-5667-16-09',
];

/**
 * Fields to seed per HOME worksheet — each driven gate-read symbol on its REAL
 * prod home worksheet (symbol + data_type verbatim from prod). Warn gates whose
 * symbols are not seeded are never evaluated by the block-only approval gate, so
 * they need no field row. The two equation OUTPUT symbols (BCF, CT_50) are NOT
 * seeded here — they are driven through the REAL evaluateFormula directly, and
 * seeding them as saveable fields would collide with saveWorksheet's
 * single-source write guard (a worksheet may not write a value its own
 * equations produce).
 */
export const ISO5667_16_FIELDS: Record<string, Array<{ symbol: string; dataType: string }>> = {
  'ISO-5667-16-01': [
    { symbol: 'normative_references_consulted', dataType: 'boolean' },  // CR-002 block
  ],
  'ISO-5667-16-02': [
    { symbol: 'sample_volume', dataType: 'number' },                    // CR-005 warn spot-check
  ],
  'ISO-5667-16-03': [
    { symbol: 'storage_temperature', dataType: 'number' },              // CR-008 warn spot-check
  ],
  'ISO-5667-16-04': [
    { symbol: 'centrifugation_force', dataType: 'number' },             // CR-016 warn spot-check
  ],
  'ISO-5667-16-05': [
    { symbol: 'dilution_water_type', dataType: 'enum' },                // CR-020 block
  ],
};

/**
 * The 2 prod equations (§11.2 bioaccumulation, doc p.18: Eq.(1) BCF; Eq.(2)
 * CT_50; formula + output + inputs verbatim from prod). Driven through the REAL
 * evaluateFormula — both are dot-decimal division with supported operators — so
 * both COMPUTE. Printed source:
 *   (1)  BCF = c_1/c_2 (= k_1/k_2)
 *   (2)  CT_50 = ln2 / k_2   [prod materialises ln2 as the numeric constant 0.6931]
 */
export const ISO5667_16_EQUATIONS: ReadonlyArray<{
  out: string; formula: string; inputs: string[];
}> = [
  { out: 'BCF', formula: 'BCF = c_1 / c_2', inputs: ['c_1', 'c_2'] },
  { out: 'CT_50', formula: 'CT_50 = 0.6931 / k_2', inputs: ['k_2'] },
] as const;

export type ISO5667_16Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** symbol → field id */
  fields: Record<string, string>;
  /** symbol → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
};

export async function seedISO5667_16(sql: postgres.Sql, userId: string): Promise<ISO5667_16Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso5667-16-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO5667-16 Harness Org', ${'iso5667-16-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO5667-16-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-5667-16', 'ISO 5667-16 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  // Create all 9 worksheet templates + a section + an instance (topology parity).
  let wsOrder = 1;
  for (const ws of ISO5667_16_WORKSHEETS) {
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

    let oi = 1;
    for (const f of ISO5667_16_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fields[f.symbol] = row.id;
      fieldMeta[f.symbol] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the gates (2 block + 33 warn) against their host worksheet templates.
  for (const g of ISO5667_16_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fields, fieldMeta };
}
