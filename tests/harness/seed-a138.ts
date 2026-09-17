/**
 * DWA-A-138-1 ("Anlagen zur Versickerung von Niederschlagswasser"; Dez 2020,
 * Weißdruck) — the GOLD-COPY reference standard of the EKOWAI-Wizard — minimal
 * fixture for the consolidated REAL save-path EXECUTION-PROOF harness.
 *
 * PROOF MANDATE: 138's gate enforcement is claimable ONLY by EXECUTION. This is
 * the ONE owned standard that lacked the uniform both-ways harness the other 70
 * now have. It drives:
 *   (C) every one of the 29 BLOCK gates through the REAL enforcement chain
 *         saveWorksheet(instance, values) → project_parameters
 *         checkApprovalGate(instance)     → replays each block condition, lists fails
 *       BOTH ways — a persisted state that PASSES (not blocked) and one that
 *       VIOLATES (definite fail) — so a gate that fires but never enforces (the
 *       F-4 lesson) cannot hide; plus the 6 WARN gates shown never-block.
 *   (B) every one of the 46 equations through the REAL `evaluateFormula`.
 *
 * Topology verbatim from live prod this session (standard DWA-A-138-1,
 * project vadsmshzebefjreqcicl): 28 worksheets, 35 compliance_requirements
 * (29 block + 6 warn), 46 equations, 277 fields. Source of truth: the live
 * encoding dump a138_encoding.json. NOTHING is applied to prod.
 *
 * SINGLE-HOME + CROSS-WORKSHEET TOPOLOGY (load-bearing — mirrors prod's fallback):
 *   Each gate symbol is seeded exactly ONCE on its SYMBOL_HOME worksheet. A gate
 *   whose symbols live on its own worksheet resolves them locally; a gate that
 *   reads a symbol homed on ANOTHER worksheet resolves it via the conflict-free
 *   project-wide fallback (approval-gate.ts buildFallbackValues / makeGateLookup).
 *   Genuine cross-worksheet gates in 138:
 *     REQ-03 @A138-04 reads k_f@A138-05 + permeability_test_method@A138-03;
 *     REQ-05 @A138-04 reads kostra_grid_cell@A138-01;
 *     REQ-15 @A138-10 reads q_S_AC@A138-13 + f_Z@A138-08;
 *     REQ-22 @A138-26 reads flood_check_trigger@A138-07 (#22-guard class);
 *     REQ-31 @A138-16 reads k_i@A138-11;
 *     REQ-32 @A138-18 reads A_C@A138-10;
 *     REQ-33 @A138-21 reads k_i@A138-11 (dual-role guard).
 *
 * ENGINE FACTS (138-specific, NOT defects):
 *   - the engine INJECTS `D` (design rainfall duration) into 138 equations — the
 *     harness provides it as an input, exactly as the engine would resolve it;
 *   - `r_D(n)` / `r_5(n)` / `r_D(n_R)` / `r_D(T_n_Ue)` are rewritten by
 *     normalize-formula.ts to `r_D_n` / `r_5_n` / `r_D_n_R` / `r_D_T_n_Ue`
 *     (the predefined-table accessor class);
 *   - `pi` resolves via the arithmetic engine's CONSTANTS fallback.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/** Single home worksheet per gate/warn symbol (verbatim data_type from prod fields). */
export const SYMBOL_HOME: Record<string, { ws: string; dataType: DType }> = {
  // A138-01 Projektregistrierung
  a138_applicable: { ws: 'A138-01', dataType: 'boolean' },
  kostra_grid_cell: { ws: 'A138-01', dataType: 'text' },
  water_protection_zone: { ws: 'A138-01', dataType: 'enum' },
  attest_a138_01_a138_req_25: { ws: 'A138-01', dataType: 'boolean' },
  attest_a138_01_a138_req_27: { ws: 'A138-01', dataType: 'boolean' },
  attest_a138_01_a138_req_29: { ws: 'A138-01', dataType: 'boolean' },
  // A138-02 Standortbewertung
  feasibility_determination: { ws: 'A138-02', dataType: 'enum' },
  gw_clearance: { ws: 'A138-02', dataType: 'number' },
  direct_gw_injection: { ws: 'A138-02', dataType: 'boolean' },
  // A138-03 Datenquellen
  permeability_test_method: { ws: 'A138-03', dataType: 'enum' },
  // A138-04 Niederschlagsdaten (KOSTRA)
  r_D_n_table: { ws: 'A138-04', dataType: 'json' },
  attest_a138_04_a138_req_28: { ws: 'A138-04', dataType: 'boolean' },
  // A138-05 Boden/Hydrogeologie
  k_f: { ws: 'A138-05', dataType: 'number' },
  // A138-06 Wasserqualität
  belastungskategorie: { ws: 'A138-06', dataType: 'enum' },
  // A138-07 Flächen-Inventar
  surface_inventory: { ws: 'A138-07', dataType: 'json' },
  flood_check_trigger: { ws: 'A138-07', dataType: 'boolean' },
  // A138-08 Bemessungshäufigkeit
  n: { ws: 'A138-08', dataType: 'number' },
  f_Z: { ws: 'A138-08', dataType: 'number' },
  // A138-09 Eingangsdaten-Zusammenfassung
  phase_2_gate_result: { ws: 'A138-09', dataType: 'enum' },
  // A138-10 Bemessungswert A_C
  A_C: { ws: 'A138-10', dataType: 'number' },
  // A138-11 Versickerungsrate
  k_i: { ws: 'A138-11', dataType: 'number' },
  // A138-13 Speichervolumen
  q_S_AC: { ws: 'A138-13', dataType: 'number' },
  // A138-14 Zusammenfassung Allg. Berechnungen
  phase_3_gate_result: { ws: 'A138-14', dataType: 'enum' },
  // A138-15 Anlagentyp-Auswahl
  facility_type_selected: { ws: 'A138-15', dataType: 'enum' },
  attest_a138_15_a138_req_18: { ws: 'A138-15', dataType: 'boolean' },
  // A138-16 Flächenversickerung
  r_D_n_used: { ws: 'A138-16', dataType: 'number' },
  // A138-18 Rigole
  L_VS: { ws: 'A138-18', dataType: 'number' },
  q_VS: { ws: 'A138-18', dataType: 'number' },
  r_5_n: { ws: 'A138-18', dataType: 'number' },
  // A138-21 Schacht-/Rohrversickerung
  shaft_type: { ws: 'A138-21', dataType: 'enum' },
  A_S_FS: { ws: 'A138-21', dataType: 'number' },
  k_f_FS: { ws: 'A138-21', dataType: 'number' },
  A_S_Schacht: { ws: 'A138-21', dataType: 'number' },
  // A138-23 Anlagen-Zusammenfassung
  phase_4_gate_result: { ws: 'A138-23', dataType: 'enum' },
  // A138-24 Kombinierte Ergebnisse
  attest_a138_24_a138_req_20: { ws: 'A138-24', dataType: 'boolean' },
  // A138-25 Eignungsprüfung
  design_adequacy_result: { ws: 'A138-25', dataType: 'enum' },
  // A138-26 Überflutungsnachweis
  V_Rueck: { ws: 'A138-26', dataType: 'number' },
  flood_check_result: { ws: 'A138-26', dataType: 'enum' },
  attest_a138_26_a138_req_24: { ws: 'A138-26', dataType: 'boolean' },
  attest_a138_26_a138_req_26: { ws: 'A138-26', dataType: 'boolean' },
  // A138-28 Abschließende Nachweiszusammenstellung (warn REQ-30)
  final_compliance_verdict: { ws: 'A138-28', dataType: 'enum' },
};

/** All 28 worksheet instances are seeded (per PROOF MANDATE — full topology). */
export const A138_WORKSHEETS = Array.from({ length: 28 }, (_, i) =>
  `A138-${String(i + 1).padStart(2, '0')}`,
) as string[];

/** The 29 live BLOCK gates, verbatim from prod compliance_requirements. */
export const A138_BLOCK_GATES: ReadonlyArray<{ ws: string; code: string; cond: string }> = [
  { ws: 'A138-01', code: 'A138-REQ-01', cond: 'a138_applicable == TRUE' },
  { ws: 'A138-02', code: 'A138-REQ-02', cond: 'feasibility_determination IN {feasible, conditional}' },
  { ws: 'A138-04', code: 'A138-REQ-03', cond: 'k_f IS NOT NULL AND permeability_test_method IS NOT NULL' },
  { ws: 'A138-02', code: 'A138-REQ-04', cond: 'gw_clearance >= 1.0' },
  { ws: 'A138-04', code: 'A138-REQ-05', cond: 'r_D_n_table IS NOT NULL AND kostra_grid_cell IS NOT NULL' },
  { ws: 'A138-07', code: 'A138-REQ-06', cond: 'surface_inventory IS NOT NULL' },
  { ws: 'A138-06', code: 'A138-REQ-07', cond: 'belastungskategorie IS NOT NULL' },
  { ws: 'A138-08', code: 'A138-REQ-08', cond: 'n IN {0.1, 0.2, 0.33, 0.5}' },
  { ws: 'A138-09', code: 'A138-REQ-09', cond: 'phase_2_gate_result IN {PASS, CONDITIONAL}' },
  { ws: 'A138-10', code: 'A138-REQ-15', cond: 'q_S_AC >= 2 AND (q_S_AC > 5 OR f_Z == 1.2)' },
  { ws: 'A138-14', code: 'A138-REQ-16', cond: 'phase_3_gate_result IN {PASS, CONDITIONAL}' },
  { ws: 'A138-15', code: 'A138-REQ-17', cond: 'facility_type_selected IS NOT NULL' },
  { ws: 'A138-15', code: 'A138-REQ-18', cond: 'attest_a138_15_a138_req_18 == True' },
  { ws: 'A138-23', code: 'A138-REQ-19', cond: 'phase_4_gate_result IN {PASS, CONDITIONAL}' },
  { ws: 'A138-24', code: 'A138-REQ-20', cond: 'attest_a138_24_a138_req_20 == True' },
  { ws: 'A138-25', code: 'A138-REQ-21', cond: 'design_adequacy_result IN {PASS, NA}' },
  { ws: 'A138-26', code: 'A138-REQ-22', cond: 'IF flood_check_trigger == TRUE THEN V_Rueck IS NOT NULL' },
  { ws: 'A138-26', code: 'A138-REQ-23', cond: 'flood_check_result IN {PASS, NA}' },
  { ws: 'A138-26', code: 'A138-REQ-24', cond: 'attest_a138_26_a138_req_24 == True' },
  { ws: 'A138-01', code: 'A138-REQ-25', cond: 'attest_a138_01_a138_req_25 == True' },
  { ws: 'A138-26', code: 'A138-REQ-26', cond: 'attest_a138_26_a138_req_26 == True' },
  { ws: 'A138-01', code: 'A138-REQ-27', cond: 'attest_a138_01_a138_req_27 == True' },
  { ws: 'A138-04', code: 'A138-REQ-28', cond: 'attest_a138_04_a138_req_28 == True' },
  { ws: 'A138-01', code: 'A138-REQ-29', cond: 'attest_a138_01_a138_req_29 == True' },
  { ws: 'A138-16', code: 'A138-REQ-31', cond: 'k_i > r_D_n_used * 0.0000001' },
  { ws: 'A138-18', code: 'A138-REQ-32', cond: 'L_VS * q_VS >= r_5_n * A_C * 0.0001' },
  { ws: 'A138-21', code: 'A138-REQ-33', cond: 'IF shaft_type == typ_B THEN A_S_FS * k_f_FS >= A_S_Schacht * k_i' },
  { ws: 'A138-01', code: 'A138-REQ-COV-01', cond: 'water_protection_zone != zone_I AND water_protection_zone != zone_II' },
  { ws: 'A138-02', code: 'A138-REQ-COV-02', cond: 'direct_gw_injection == false' },
] as const;

/** The 6 WARN gates (verbatim). checkApprovalGate reads severity='block' only, so
 *  these must NEVER appear in failingBlockConditions — proven in the verify test. */
export const A138_WARN_GATES: ReadonlyArray<{ ws: string; code: string; cond: string }> = [
  { ws: 'A138-10', code: 'A138-REQ-10', cond: '' },
  { ws: 'A138-10', code: 'A138-REQ-11', cond: '' },
  { ws: 'A138-10', code: 'A138-REQ-12', cond: '' },
  { ws: 'A138-10', code: 'A138-REQ-13', cond: '' },
  { ws: 'A138-10', code: 'A138-REQ-14', cond: '' },
  { ws: 'A138-28', code: 'A138-REQ-30', cond: 'phase_2_gate_result IN {PASS, CONDITIONAL} AND phase_3_gate_result IN {PASS, CONDITIONAL} AND phase_4_gate_result IN {PASS, CONDITIONAL} AND final_compliance_verdict IS NOT NULL' },
] as const;

/**
 * All 46 equations, formula strings verbatim from prod. `need` lists the
 * NORMALIZED input symbols the RHS references (r_D(n)→r_D_n etc.); the harness
 * feeds each from the shared VALS scope. `kind` is the EXPECTED evaluateFormula
 * classification (the verify test asserts the ACTUAL kind and logs a table):
 *   - computed        : pure arithmetic reaches a finite value (D injected as input);
 *   - manual_required : Σ/carrier-only inputs, or a comparison/criterion RHS
 *                       (>= / SUM) — a check the engineer verifies, not a value;
 *   - error           : two-sided balance identity string (`… = …`) — the only
 *                       non-clean classification (a1022 F-3 class; NOT a compute
 *                       defect, NOT source-settled to auto-fix → sign-off item).
 */
export const A138_EQUATIONS: ReadonlyArray<{
  ws: string; out: string; formula: string; need: string[];
  kind: 'computed' | 'manual_required' | 'error'; anchor: string; expect?: number;
  /** Prod equation UUID where the harness row must be addressable by the rewrite bridge / migration (A138-07 register producers). */
  id?: string;
}> = [
  { ws: 'A138-16', out: '(balance)', formula: '(A_C + A_S) * r_D(n) * 10^-7 = A_S * k_i', need: ['A_C', 'A_S', 'r_D_n', 'k_i'], kind: 'error', anchor: '§6.2.2 Gl.(11)' },
  { ws: 'A138-16', out: '(condition)', formula: 'k_i > r_D(n) * 10^-7', need: ['k_i', 'r_D_n'], kind: 'computed', anchor: '§6.2.2 Gl.(13)', expect: 1e-5 },
  { ws: 'A138-18', out: '(condition)', formula: 'L_VS * q_VS >= r_5(n) * A_C * 10^-4', need: ['L_VS', 'q_VS', 'r_5_n', 'A_C'], kind: 'manual_required', anchor: '§6.4.2 Gl.(25)' },
  { ws: 'A138-21', out: '(condition)', formula: 'A_S_FS * k_f_FS >= A_S_Schacht * k_i', need: ['A_S_FS', 'k_f_FS', 'A_S_Schacht', 'k_i'], kind: 'manual_required', anchor: '§6.7.2 Gl.(38)' },
  // Plan 2a: register-fed; the scalar verify harness cannot feed a carrier — computed in register-materialise.integration.test.ts
  { ws: 'A138-07', out: 'A_C', id: 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0', formula: 'A_C = sum_rows(surface_inventory, area_m2 * c_i)', need: ['surface_inventory'], kind: 'manual_required', anchor: 'sum_rows (Plan 2a)' },
  { ws: 'A138-07', out: 'A_C_sealed', id: 'a1380702-0000-4000-8000-000000000005', formula: "A_C_sealed = sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_i, 0))", need: ['surface_inventory'], kind: 'manual_required', anchor: 'sum_rows (Plan 2a)' },
  { ws: 'A138-07', out: 'A_C_unsealed', id: 'a1380702-0000-4000-8000-000000000006', formula: "A_C_unsealed = sum_rows(surface_inventory, if(kind == 'unpaved', area_m2 * c_i, 0))", need: ['surface_inventory'], kind: 'manual_required', anchor: 'sum_rows (Plan 2a)' },
  { ws: 'A138-07', out: 'A_E_ba', id: 'a1380702-0000-4000-8000-000000000003', formula: "A_E_ba = sum_rows(surface_inventory, if(kind == 'paved', area_m2, 0))", need: ['surface_inventory'], kind: 'manual_required', anchor: 'sum_rows (Plan 2a)' },
  { ws: 'A138-07', out: 'A_E_nba', id: 'a1380702-0000-4000-8000-000000000004', formula: "A_E_nba = sum_rows(surface_inventory, if(kind == 'unpaved', area_m2, 0))", need: ['surface_inventory'], kind: 'manual_required', anchor: 'sum_rows (Plan 2a)' },
  { ws: 'A138-16', out: 'A_S', formula: 'A_S = A_C / (k_i * 10^7 / r_D(n) - 1)', need: ['A_C', 'k_i', 'r_D_n'], kind: 'computed', anchor: '§6.2.2 Gl.(12)' },
  { ws: 'A138-21', out: 'A_S', formula: 'A_S = pi * d_a^2 / 4 + pi * d_a * h_S / 2', need: ['d_a', 'h_S'], kind: 'computed', anchor: '§6.7.2 Gl.(34)' },
  { ws: 'A138-17', out: 'A_S_m', formula: 'A_S_m = (A_C * 10^-7 * r_D(n)) / (h_M / (D * 60 * f_Z) + k_i)', need: ['A_C', 'r_D_n', 'h_M', 'D', 'f_Z', 'k_i'], kind: 'computed', anchor: '§6.3.2 Gl.(16)' },
  { ws: 'A138-12', out: 'A_S_m', formula: 'A_S_m = (A_S_min + A_S_max) / 2', need: ['A_S_min', 'A_S_max'], kind: 'computed', anchor: '§5.3.3.6 Gl.(7)', expect: 30 },
  { ws: 'A138-18', out: 'A_S_m', formula: 'A_S_m = (b_R + h_R) * L_R + b_R * h_R', need: ['b_R', 'h_R', 'L_R'], kind: 'computed', anchor: '§6.4.2 Gl.(17)' },
  // Plan 2a: register-fed; the scalar verify harness cannot feed a carrier — computed in register-materialise.integration.test.ts
  { ws: 'A138-07', out: 'C_m', id: 'a1380702-0000-4000-8000-000000000002', formula: 'C_m = sum_rows(surface_inventory, area_m2 * c_i) / sum_rows(surface_inventory, area_m2)', need: ['surface_inventory'], kind: 'manual_required', anchor: 'sum_rows (Plan 2a)' },
  { ws: 'A138-21', out: 'erf_k_f_FS', formula: 'erf_k_f_FS >= ((d_a^2 + 2 * h_S * d_a) / d_i^2) * k_i', need: ['d_a', 'h_S', 'd_i', 'k_i'], kind: 'computed', anchor: '§6.7.2 Gl.(39)' },
  { ws: 'A138-11', out: 'f_K', formula: 'f_K = min(f_ort * f_methode, 1)', need: ['f_ort', 'f_methode'], kind: 'computed', anchor: '§5.3.3.6 Gl.(6)', expect: 0.9 },
  { ws: 'A138-21', out: 'h_S', formula: 'h_S = (A_C * 10^-7 * r_D(n) - (pi * d_a^2 / 4) * k_i) / (pi * d_i^2 / (4 * D * 60 * f_Z) + d_a * pi * k_i / 2)', need: ['A_C', 'r_D_n', 'd_a', 'd_i', 'k_i', 'D', 'f_Z'], kind: 'computed', anchor: '§6.7.2 Gl.(37)' },
  { ws: 'A138-21', out: 'h_S', formula: 'h_S = (A_C * 10^-7 * r_D(n) - (pi * d_i^2 / 4) * k_f_FS) * 4 * D * 60 * f_Z / (d_i^2 * pi)', need: ['A_C', 'r_D_n', 'd_i', 'k_f_FS', 'D', 'f_Z'], kind: 'computed', anchor: '§6.7.2 Gl.(40)' },
  { ws: 'A138-11', out: 'k_i', formula: 'k_i = k_f * f_K', need: ['k_f', 'f_K'], kind: 'computed', anchor: '§5.3.3.6 Gl.(5)', expect: 1e-5 },
  { ws: 'A138-20', out: 'L_R', formula: 'L_R = ((A_C + A_VA) * 10^-7 * r_D(n) - b_R * h_R * k_i - V_M/(D * 60 * f_Z) - Q_Dr * 10^-3) / (b_R * h_R * s_R / (D * 60 * f_Z) + (b_R + h_R) * k_i)', need: ['A_C', 'A_VA', 'r_D_n', 'b_R', 'h_R', 'k_i', 'V_M', 'Q_Dr', 's_R', 'D', 'f_Z'], kind: 'computed', anchor: '§6.6.2 Gl.(32)' },
  { ws: 'A138-18', out: 'L_R', formula: 'L_R = (A_C * 10^-7 * r_D(n) - b_R * h_R * k_i - Q_Dr * 10^-3) / (b_R * h_R * s_R / (D * 60 * f_Z) + (b_R + h_R) * k_i)', need: ['A_C', 'r_D_n', 'b_R', 'h_R', 'k_i', 'Q_Dr', 's_R', 'D', 'f_Z'], kind: 'computed', anchor: '§6.4.2 Gl.(23)' },
  { ws: 'A138-19', out: 'L_R', formula: 'L_R = ((A_C + A_VA) * 10^-7 * r_D(n) - b_R * h_R * k_i - V_M/(D * 60 * f_Z)) / (b_R * h_R * s_R / (D * 60 * f_Z) + (b_R + h_R) * k_i)', need: ['A_C', 'A_VA', 'r_D_n', 'b_R', 'h_R', 'k_i', 'V_M', 's_R', 'D', 'f_Z'], kind: 'computed', anchor: '§6.5.2 Gl.(29)' },
  { ws: 'A138-13', out: 'M', formula: 'M >= 3 * T_n', need: ['T_n'], kind: 'computed', anchor: '§5.3.3.3 Gl.(1)', expect: 3 },
  { ws: 'A138-20', out: 'Q_Dr', formula: 'Q_Dr = (Q_Dr_min + Q_Dr_max) / 2', need: ['Q_Dr_min', 'Q_Dr_max'], kind: 'computed', anchor: '§6.6.2 Gl.(33)', expect: 5 },
  { ws: 'A138-20', out: 'Q_MUE', formula: 'Q_MUE = A_C * 10^-4 * r_MUE - A_VA * k_i * 1000', need: ['A_C', 'r_MUE', 'A_VA', 'k_i'], kind: 'computed', anchor: '§6.5.2 Gl.(31)', expect: 19 },
  { ws: 'A138-12', out: 'Q_S', formula: 'Q_S = k_i * A_S * 10^3', need: ['k_i', 'A_S'], kind: 'computed', anchor: '§5.3.3.6 Gl.(4)', expect: 0.5 },
  { ws: 'A138-18', out: 'Q_S', formula: 'Q_S = ((b_R + h_R) * L_R + b_R * h_R) * k_i', need: ['b_R', 'h_R', 'L_R', 'k_i'], kind: 'computed', anchor: '§6.4.2 Gl.(18)' },
  { ws: 'A138-13', out: 'q_S_AC', formula: 'q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4', need: ['k_i', 'A_S_m', 'Q_Dr', 'A_C'], kind: 'computed', anchor: '§5.3.3.7 Gl.(9)' },
  { ws: 'A138-18', out: 'q_VS', formula: 'q_VS = 0.1 * az_SOE * A_SOE * 10^-1', need: ['az_SOE', 'A_SOE'], kind: 'computed', anchor: '§6.4.2 Gl.(24)', expect: 2 },
  { ws: 'A138-10', out: 'Q_zu', formula: 'Q_zu = r_D(n) * (A_C + A_VA) * 10^-4', need: ['r_D_n', 'A_C', 'A_VA'], kind: 'computed', anchor: '§5.3.3.5 Gl.(3)', expect: 11 },
  { ws: 'A138-18', out: 's_R', formula: 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d_i^2/4) * ((1/s_F) - 1))', need: ['s_F', 'b_R', 'h_R', 'az', 'd_i'], kind: 'computed', anchor: '§6.4.2 Gl.(22)' },
  { ws: 'A138-18', out: 's_R', formula: 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi/4) * ((d_i^2/s_F) - d_a^2))', need: ['s_F', 'b_R', 'h_R', 'az', 'd_i', 'd_a'], kind: 'computed', anchor: '§6.4.2 Gl.(21)' },
  { ws: 'A138-17', out: 'V_M', formula: 'V_M = ((A_C + A_VA) * 10^-7 * r_D(n) - A_S_m * k_i) * D * 60 * f_Z', need: ['A_C', 'A_VA', 'r_D_n', 'A_S_m', 'k_i', 'D', 'f_Z'], kind: 'computed', anchor: '§6.3.2 Gl.(14)' },
  { ws: 'A138-17', out: 'V_M', formula: 'V_M = A_S_m * h_M', need: ['A_S_m', 'h_M'], kind: 'computed', anchor: '§6.3.2 Gl.(15)', expect: 9 },
  { ws: 'A138-19', out: 'V_MR', formula: 'V_MR = V_M + V_R', need: ['V_M', 'V_R'], kind: 'computed', anchor: '§6.5.2 Gl.(26)', expect: 150 },
  { ws: 'A138-19', out: 'V_MR', formula: 'V_MR = ((A_C + A_VA) * 10^-7 * r_D(n) - ((b_R + h_R) * L_R + b_R * h_R) * k_i) * D * 60 * f_Z', need: ['A_C', 'A_VA', 'r_D_n', 'b_R', 'h_R', 'L_R', 'k_i', 'D', 'f_Z'], kind: 'computed', anchor: '§6.5.2 Gl.(28)' },
  { ws: 'A138-20', out: 'V_MUE', formula: 'V_MUE = ((A_C + A_VA) * r_D(n_R) * 10^-7 - A_S_m * k_i) * D * 60 * f_Z - V_M', need: ['A_C', 'A_VA', 'r_D_n_R', 'A_S_m', 'k_i', 'D', 'f_Z', 'V_M'], kind: 'computed', anchor: '§6.5.2 Gl.(30)' },
  { ws: 'A138-19', out: 'V_R', formula: 'V_R = V_MR - V_M', need: ['V_MR', 'V_M'], kind: 'computed', anchor: '§6.5.2 Gl.(27)', expect: 50 },
  { ws: 'A138-18', out: 'V_R', formula: 'V_R = (A_C * 10^-7 * r_D(n) - ((b_R + h_R) * L_R + b_R * h_R) * k_i - Q_Dr * 10^-3) * D * 60 * f_Z', need: ['A_C', 'r_D_n', 'b_R', 'h_R', 'L_R', 'k_i', 'Q_Dr', 'D', 'f_Z'], kind: 'computed', anchor: '§6.4.2 Gl.(19)' },
  { ws: 'A138-18', out: 'V_R', formula: 'V_R = b_R * h_R * L_R * s_R', need: ['b_R', 'h_R', 'L_R', 's_R'], kind: 'computed', anchor: '§6.4.2 Gl.(20)', expect: 7 },
  { ws: 'A138-26', out: 'V_Rueck', formula: 'V_Rueck = ((r_D(T_n_Ue) * (SUM(A_E_b_a * C_S) + A_VA) / 10000) - (Q_S + Q_Dr)) * D * 60 / 1000 - V_VA >= 0', need: ['r_D_T_n_Ue', 'A_E_b_a', 'C_S', 'A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA'], kind: 'manual_required', anchor: '§5.3.4.1 Gl.(10)' },
  { ws: 'A138-21', out: 'V_S', formula: 'V_S = pi * d_i^2 / 4 * h_S', need: ['d_i', 'h_S'], kind: 'computed', anchor: '§6.7.2 Gl.(36)' },
  { ws: 'A138-21', out: 'V_S', formula: 'V_S = (A_C * 10^-7 * r_D(n) - A_S * k_i) * D * 60 * f_Z', need: ['A_C', 'r_D_n', 'A_S', 'k_i', 'D', 'f_Z'], kind: 'computed', anchor: '§6.7.2 Gl.(35)' },
  { ws: 'A138-13', out: 'V_VA', formula: 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3', need: ['Q_zu', 'Q_S', 'Q_Dr', 'D', 'f_Z', 'f_A'], kind: 'computed', anchor: '§5.3.3.7 Gl.(8)', expect: 37.8 },
  { ws: 'A138-22', out: 'V_VA', formula: 'V_VA = ((A_C + A_VA) * 10^-7 * r_D(n) - A_S_m * k_i - Q_Dr * 10^-3) * D * 60 * f_Z * f_A', need: ['A_C', 'A_VA', 'r_D_n', 'A_S_m', 'k_i', 'Q_Dr', 'D', 'f_Z', 'f_A'], kind: 'computed', anchor: '§6.8.2 Gl.(41)' },
] as const;

/** Shared numeric scope for equation driving (D injected, r_D(n)→r_D_n normalized,
 *  pi auto via CONSTANTS). Values keep every denominator non-zero and every
 *  result finite; they exercise the ENCODING'S ARITHMETIC, not standard values. */
export const A138_VALS: Record<string, number> = {
  A_C: 1000, A_S: 50, A_VA: 100, A_E: 1200,
  k_i: 1e-5, k_f: 2e-5, f_K: 0.5,
  r_D_n: 100, r_D_n_R: 100, r_D_T_n_Ue: 100, r_5_n: 250, r_MUE: 200,
  D: 15, f_Z: 1.2, f_A: 1.0, f_ort: 0.9, f_methode: 1.0,
  h_M: 0.3, h_R: 1.0, b_R: 1.0, L_R: 20, s_R: 0.35, s_F: 0.4, az: 1,
  d_i: 0.3, d_a: 0.4, h_S: 2,
  A_S_m: 30, A_S_min: 20, A_S_max: 40,
  Q_Dr: 5, Q_Dr_min: 4, Q_Dr_max: 6, Q_zu: 50, Q_S: 10,
  T_n: 1, V_M: 100, V_R: 50, V_MR: 150, V_VA: 80,
  az_SOE: 2, A_SOE: 100,
  k_f_FS: 1e-4, A_S_FS: 1, A_S_Schacht: 1, L_VS: 100, q_VS: 1, C_S: 0.9, A_E_b_a: 900,
};

export type A138Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  symbolHome: Record<string, string>;
};

export async function seedA138(sql: postgres.Sql, userId: string): Promise<A138Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a138-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A138 Harness Org', ${'a138-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A138-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-138-1', 'DWA-A 138-1 (harness)', 'harness') RETURNING id`;

  // Group home fields by worksheet.
  const fieldsByWs: Record<string, Array<{ symbol: string; dataType: DType }>> = {};
  for (const ws of A138_WORKSHEETS) fieldsByWs[ws] = [];
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) {
    fieldsByWs[home.ws].push({ symbol, dataType: home.dataType });
  }

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const templateByWs: Record<string, string> = {};

  // Seed ALL 28 worksheet templates + one section + one instance each.
  for (const ws of A138_WORKSHEETS) {
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

    let oi = 1;
    for (const f of fieldsByWs[ws]) {
      // is_required deliberately FALSE so the per-gate proof isolates the block-
      // CONDITION path (checkApprovalGate's separate missing-required list is not
      // what we prove here — matches the M-820-1 reference harness).
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
    }
  }

  // Seed the 29 block + 6 warn gates against their home worksheet templates.
  for (const g of A138_BLOCK_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, 'block')`;
  }
  for (const g of A138_WARN_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, 'warn')`;
  }

  const symbolHome: Record<string, string> = {};
  for (const [symbol, home] of Object.entries(SYMBOL_HOME)) symbolHome[symbol] = home.ws;

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
