/**
 * Twin symbols — the same physical quantity that a standard's worksheets ask
 * for again under ANOTHER symbol (summary / "final" / "calculated" copies).
 *
 * The same-symbol inheritance already prefills a field when an upstream
 * worksheet holds a value under the SAME symbol. Twins extend that to the
 * re-typed copies: when the target is empty and one of its twin sources has
 * an unambiguous value in the project, the form prefills it (render-only,
 * badge "Vorbefüllt ← <worksheet> · <symbol>") and offers "Übernehmen" /
 * "Alle Vorbefüllungen übernehmen" to persist it. Nothing is computed here:
 * a twin is only ever a copy of a value the engineer (or the engine) already
 * produced upstream.
 *
 * Sources are listed in priority order — the first source with a value in
 * the project wins. Only exact-same-quantity pairs belong here (the units and
 * enum tokens must match); "similar" quantities do not.
 *
 * Evidence for the DWA-A-138-1 list: the first real run (project
 * TEST-A138-BESS-Mulde, 2026-09-19) typed A_C = 162,2 three times, V = 17
 * four times, q_S,AC = 10,2 three times, T_n = 10 three times.
 */
export type TwinRule = {
  /** Field symbol on the consuming worksheet. */
  target: string;
  /** Worksheet code of the target (documentation; the lookup is by symbol). */
  worksheet: string;
  /** Source symbols in priority order (any worksheet of the same project). */
  sources: string[];
  /** Why they are the same quantity (clause). */
  note: string;
};

export const TWIN_SYMBOLS: Record<string, TwinRule[]> = {
  'DWA-A-138-1': [
    // A_C — Gl. 2 result on A138-07, copied on 14 and 24.
    { target: 'A_C_calculated', worksheet: 'A138-14', sources: ['A_C'], note: 'Bemessungswert A_C nach Gl. 2 (A138-07)' },
    { target: 'A_C_final', worksheet: 'A138-24', sources: ['A_C', 'A_C_calculated'], note: 'Bemessungswert A_C nach Gl. 2 (A138-07)' },
    // k_i — Gl. 5 result on A138-11.
    { target: 'k_i_calculated', worksheet: 'A138-14', sources: ['k_i'], note: 'Bemessungsrelevante Infiltrationsrate nach Gl. 5 (A138-11)' },
    // k_f — A138-05 report value re-typed on A138-11.
    { target: 'a138_k_f_min', worksheet: 'A138-11', sources: ['k_f'], note: 'Minimaler k_f des Gutachtens (A138-05)' },
    { target: 'a138_k_f_design', worksheet: 'A138-11', sources: ['k_f', 'a138_k_f_min'], note: 'Bemessungs-k_f = minimaler k_f (§5.3.3.6, sichere Seite)' },
    // Q_S — Gl. 4 result on A138-12.
    { target: 'Q_S_calculated', worksheet: 'A138-14', sources: ['Q_S'], note: 'Versickerungsleistung nach Gl. 4 (A138-12)' },
    { target: 'Q_S_final', worksheet: 'A138-24', sources: ['Q_S', 'Q_S_calculated'], note: 'Versickerungsleistung nach Gl. 4 (A138-12)' },
    // V_VA — Gl. 8 result on A138-13 (max over D).
    { target: 'a138_V_Sp_erforderlich', worksheet: 'A138-13', sources: ['V_VA'], note: 'Erforderliches Speichervolumen nach Gl. 8 (A138-13)' },
    { target: 'V_VA_calculated', worksheet: 'A138-14', sources: ['V_VA', 'a138_V_Sp_erforderlich'], note: 'Erforderliches Speichervolumen nach Gl. 8 (A138-13)' },
    { target: 'V_VA_final', worksheet: 'A138-24', sources: ['V_VA', 'V_VA_calculated', 'a138_V_Sp_erforderlich'], note: 'Erforderliches Speichervolumen nach Gl. 8 (A138-13)' },
    // q_S,AC — Gl. 9 result on A138-13.
    { target: 'q_S_AC_final', worksheet: 'A138-24', sources: ['q_S_AC'], note: 'Spezifische Versickerungsleistung nach Gl. 9 (A138-13)' },
    { target: 'qsac_value_verified', worksheet: 'A138-25', sources: ['q_S_AC', 'q_S_AC_final'], note: 'Spezifische Versickerungsleistung nach Gl. 9 (A138-13)' },
    // Governing duration and rain — the Gl.-8 iteration on A138-13.
    { target: 'D_optimal_min', worksheet: 'A138-14', sources: ['D_min'], note: 'Maßgebende Dauerstufe der Iteration (A138-13)' },
    { target: 'r_D_n_optimal', worksheet: 'A138-14', sources: ['r_D_n'], note: 'Regenspende bei maßgebender Dauerstufe (A138-13)' },
    // Return period — n / T_n chosen on A138-08 (Tab. 8), re-typed on 04 and 24.
    { target: 'a138_jaehrlichkeit_T', worksheet: 'A138-04', sources: ['T_n'], note: 'Statistische Wiederkehrzeit T_n (A138-08, Tab. 8)' },
    { target: 'kostra_design_T_n', worksheet: 'A138-24', sources: ['T_n', 'a138_jaehrlichkeit_T'], note: 'Statistische Wiederkehrzeit T_n (A138-08, Tab. 8)' },
    // Design frequency of the facility = project design frequency n (A138-08).
    { target: 'n_M_Bemessung', worksheet: 'A138-17', sources: ['n'], note: 'Bemessungshäufigkeit n nach Tab. 8 (A138-08)' },
    { target: 'n_R_Bemessung', worksheet: 'A138-18', sources: ['n'], note: 'Bemessungshäufigkeit n nach Tab. 8 (A138-08)' },
    // Overrained area of the facility — entered on A138-10, repeated on the swale sheet.
    { target: 'A_VA_Mulde', worksheet: 'A138-17', sources: ['A_VA'], note: 'Überregnete Fläche der Versickerungsanlage (A138-10)' },
    // Enums with identical tokens.
    { target: 'design_basis_final', worksheet: 'A138-24', sources: ['design_method'], note: 'Bemessungsverfahren (A138-01, §5.3.3.2/3)' },
    { target: 'facility_type_final', worksheet: 'A138-24', sources: ['facility_type_selected'], note: 'Gewählter Anlagentyp (A138-15, Bild 7)' },
    // Flood-proof trigger — decided on A138-07, re-asked on A138-24.
    { target: 'flood_check_required_final', worksheet: 'A138-24', sources: ['flood_check_trigger'], note: 'Überflutungsnachweis erforderlich (A138-07, §5.3.4.1)' },
  ],
};

/** Twin sources (priority order) for `symbol` under `standardCode`, or []. */
export function twinSourcesFor(standardCode: string, symbol: string): string[] {
  const rules = TWIN_SYMBOLS[standardCode];
  if (!rules) return [];
  const r = rules.find((x) => x.target === symbol);
  return r ? r.sources : [];
}

/** All source symbols a standard's twin rules can read (for one batched query). */
export function twinSourceSymbols(standardCode: string): string[] {
  const rules = TWIN_SYMBOLS[standardCode];
  if (!rules) return [];
  return Array.from(new Set(rules.flatMap((r) => r.sources)));
}
