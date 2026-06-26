/**
 * Production formula-engine whitelist — single source of truth.
 *
 * Both the runtime worksheet form (`useEquationEngine` via worksheet-form.tsx)
 * and the PDF report-generation path (`loadProjectReportData` →
 * ComputedSection) read this set. Any equation whose key
 * `${worksheetCode}:${equationNumber}` is present here is evaluated
 * through `evaluateFormula`; equations NOT in the set are silently
 * ignored by the engine.
 *
 * Keys are stable strings of the form `Axxx-NN:M` so they read 1:1 with
 * source-clause numbering (worksheet code + Gleichung number).
 */
export const FORMULA_ENGINE_WHITELIST: ReadonlySet<string> = new Set<string>([
  // ====================================================================
  // Original wiring — batch-0/1
  // ====================================================================
  'A138-07:2',   // A_C = Σ(A_E·C_i) from surface_inventory (producer)
  'A138-07:2c',  // C_m
  'A138-07:2d',  // A_E_ba (Σ befestigt area)
  'A138-07:2e',  // A_E_nba (Σ unbefestigt area)
  'A138-07:2f',  // A_C_sealed (reduced area, befestigt)
  'A138-07:2g',  // A_C_unsealed (reduced area, unbefestigt)
  'A138-13:8',
  'A138-18:21',

  // ====================================================================
  // §6.x.y batch
  // ====================================================================
  'A138-12:4',
  'A138-12:7',
  'A138-16:11',
  'A138-16:12',
  'A138-17:16',
  'A138-18:17',
  // 'A138-18:18' — Q_S Rigole, m³/s (Pile-6 SQL adds field). Source §6.4.2
  // L1778 confirms the standard genuinely uses m³/s (×10³ omitted vs Gl. 4).
  'A138-18:18',

  // ====================================================================
  // Batch-2: Mulde + Rigole Speichervolumen (Gl. 14, 15, 19, 20, 22, 23)
  // ====================================================================
  'A138-17:14', // V_M required (primary)
  'A138-17:15', // V_M geometric (displayOnly)
  'A138-18:19', // V_R required (primary)
  'A138-18:20', // V_R geometric (displayOnly)
  'A138-18:22', // s_R thin-wall (displayOnly)
  'A138-18:23', // L_R required (displayOnly)

  // ====================================================================
  // Batch-3: §6.4.2 Rigole rest + §6.5.2 MRE + §6.6.2 MRS + §6.7.2 Schacht + §6.8.2 Becken
  // ====================================================================
  'A138-18:24', // q_VS Versickerrohr Wasseraustritt
  'A138-18:25', // condition L_VS·q_VS ≥ r_5(n)·A_C·10⁻⁴
  'A138-19:26', // V_MR = V_M + V_R (displayOnly)
  'A138-19:27', // V_R = V_MR − V_M (displayOnly)
  'A138-19:28', // V_MR required MRE (primary)
  'A138-19:29', // L_R required MRE (displayOnly)
  'A138-20:30', // V_MUE Muldenüberlauf-Volumen
  'A138-20:31', // Q_MUE Muldenüberlauf-Abfluss
  'A138-20:32', // L_R MRS (displayOnly)
  'A138-20:33', // Q_Dr mean
  'A138-21:34', // A_S Schacht
  'A138-21:35', // V_S required (primary)
  'A138-21:36', // V_S geometric (displayOnly)
  'A138-21:37', // h_S required (primary)
  'A138-21:38', // condition Filterleistung
  'A138-21:39', // erf_k_f_FS minimum
  'A138-21:40', // h_S filter form (displayOnly)
  'A138-22:41', // V_VA Becken
  'A138-26:10', // V_Rück flood-check (Pile-5 carrier sub_areas_A138_26)
]);

/** Equation key format `Axxx-NN:M` (worksheet code + Gleichung number). */
export const ENGINE_WHITELIST_KEY_RE = /^A\d{3}-\d{2}:\d+[a-z]?$/;

/** Convenience constructor — worksheet code + equation number → key. */
export function whitelistKey(worksheetCode: string, equationNumber: string): string {
  return `${worksheetCode}:${equationNumber}`;
}
