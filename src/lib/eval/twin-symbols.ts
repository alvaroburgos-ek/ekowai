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
  /**
   * C-2 (ruling R-17, 2026-10-14): optional per-pair value map for a twin whose source and target are typed differently
   * (a boolean master answer feeding an enum phase-goal rating). Pairs [source value, target value], compared with
   * Object.is (the boolean `true` never matches the string `'true'`). A source value that is NOT listed is NOT
   * prefilled — the hint shows it without „Übernehmen" plus `unmappedNote`. Rules without a map copy the value as is
   * (every twin before C-2).
   */
  valueMap?: ReadonlyArray<readonly [TwinScalar, TwinScalar]>;
  /** Shown beside an unmapped source value (DE / EN): what the engineer chooses instead. Required with `valueMap`. */
  unmappedNote?: { de: string; en: string };
};

export type TwinScalar = string | number | boolean;

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
  // U-10 (UX pass 820, 2026-10-08): ask once. The source lives on ANOTHER standard's sheet (DWA-M 820-1 M820-05);
  // `loadSameSymbolValues` is project-wide (any standard on the project), so the twin step on the page reaches it.
  // Both fields are booleans (coerceSameSymbolValue keeps `false` as an answer).
  'DWA-M-820-2': [
    {
      target: 'framework_conditions_clarified',
      worksheet: '820-2-11',
      sources: ['bedarfsplanung_projekt_complete'],
      note: 'Bedarfsplanung Projekt abgeschlossen (DWA-M 820-1 M820-05, § 6.4) — 820-2 § 5.2.2 fragt dieselbe Tatsache',
    },
  ],
  // C-2 (ruling R-17, 2026-10-14): PZ 6.2-1 (820-3 § 6.2, printed p. 14: „Die ‚Bedarfsplanung Projekt' beschreibt die
  // Anforderungen und Rahmenbedingungen so ausführlich und konkret, dass Bauherr und Planende in die Lage versetzt werden,
  // ein gleiches Verständnis für die Projektaufgabe zu entwickeln …") rates the same project needs assessment as
  // DWA-M 820-1 M820-05. Project master only: integrating the concept results is a separate goal (PZ 6.2-2, „Wurde im
  // Vorfeld ein Konzept für das Gesamtsystem erstellt …"), so M820-04 `bedarfsplanung_konzept_complete` is no source.
  // Yes → „Erreicht"; No → no prefill: the print does not decide between „Teilweise" and „Nicht erreicht".
  'DWA-M-820-3': [
    {
      target: 'pz_62_1_status',
      worksheet: 'M8203-11',
      sources: ['bedarfsplanung_projekt_complete'],
      note: 'Bedarfsplanung Projekt abgeschlossen (DWA-M 820-1 M820-05) — 820-3 § 6.2 PZ 6.2-1 bewertet dieselbe Tatsache',
      valueMap: [[true, 'erreicht']],
      unmappedNote: {
        // C4 F4 (2026-10-15): at day 0 LPH 0 is still open, so „Phase noch nicht erreicht“ is the truthful answer; „Teilweise“ /
        // „Nicht erreicht“ trigger the Projektstopp review (§ 3, printed p. 10) and belong to a completed phase only.
        de: 'Nein in DWA-M 820-1 M820-05 → solange die Bedarfsplanung (LPH 0) noch läuft, hier „Phase noch nicht erreicht“ wählen. Erst wenn die Phase abgeschlossen ist und das Ziel verfehlt wurde: „Teilweise erreicht“ oder „Nicht erreicht“ – beides löst die Prüfung eines Projektstopps aus (§ 3).',
        en: 'No on DWA-M 820-1 M820-05 → while the needs planning (LPH 0) is still running, choose “Phase not reached yet” here. Only once the phase is completed and the goal was missed: “Partially met” or “Not met” – both trigger the review of a project stop (§ 3).',
      },
    },
  ],
};

/** The twin rule for `symbol` under `standardCode`, or null. */
export function twinRuleFor(standardCode: string, symbol: string): TwinRule | null {
  return TWIN_SYMBOLS[standardCode]?.find((x) => x.target === symbol) ?? null;
}

export type TwinMapResult = { ok: true; value: unknown } | { ok: false };

/**
 * The value a twin source contributes to `target`: unchanged for a rule without `valueMap` (and for a symbol without a
 * rule), the mapped value for a listed source value, `{ ok: false }` (no prefill) for an unlisted one.
 */
export function mapTwinValue(standardCode: string, target: string, v: unknown): TwinMapResult {
  const rule = twinRuleFor(standardCode, target);
  if (!rule?.valueMap) return { ok: true, value: v };
  const hit = rule.valueMap.find(([from]) => Object.is(from, v));
  return hit ? { ok: true, value: hit[1] } : { ok: false };
}

export type TwinHint = { worksheetCode: string; value: unknown; viaSymbol: string; applicable?: false; note?: string };

/**
 * The „Bereits in … (als <src>)" hints for a twin target. A mapped value is shown (and copied by „Übernehmen") as the
 * TARGET value; an unmapped source value is shown as is, flagged `applicable: false` (no „Übernehmen") with the rule's
 * note. A rule without a map yields the raw entries exactly as before C-2.
 */
export function twinHints(
  standardCode: string,
  target: string,
  src: string,
  ups: ReadonlyArray<{ worksheetCode: string; value: unknown }>,
  locale: 'de' | 'en',
): TwinHint[] {
  const rule = twinRuleFor(standardCode, target);
  return ups.map((u): TwinHint => {
    if (!rule?.valueMap) return { worksheetCode: u.worksheetCode, value: u.value, viaSymbol: src };
    const m = mapTwinValue(standardCode, target, u.value);
    if (m.ok) return { worksheetCode: u.worksheetCode, value: m.value, viaSymbol: src };
    const note = rule.unmappedNote?.[locale];
    return { worksheetCode: u.worksheetCode, value: u.value, viaSymbol: src, applicable: false, ...(note ? { note } : {}) };
  });
}

/** Twin sources (priority order) for `symbol` under `standardCode`, or []. */
export function twinSourcesFor(standardCode: string, symbol: string): string[] {
  return twinRuleFor(standardCode, symbol)?.sources ?? [];
}

/** All source symbols a standard's twin rules can read (for one batched query). */
export function twinSourceSymbols(standardCode: string): string[] {
  const rules = TWIN_SYMBOLS[standardCode];
  if (!rules) return [];
  return Array.from(new Set(rules.flatMap((r) => r.sources)));
}
