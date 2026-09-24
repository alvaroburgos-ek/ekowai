/**
 * ATV-A-704E — Plan 3 Task 27 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts atv_a704e` (NEW equation rows
 * only; `ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING`).
 *
 * **Every `verification_quote` is `null`** — and that is the point of this task's
 * first controller resolution. ATV-A-704E has NO TRANSCRIPT (the 37-page PDF is a
 * scan without a text layer; `pdftotext -layout` returns 37 bytes of form feeds, raw
 * output in the report). The math below is the math of the STORED prod equations
 * EQ-01 … EQ-06 (`verified_against_standard`, captured read-only 2026-09-24),
 * re-expressed over register rows — but the stored rows are themselves grade EV for
 * this plan, so no source can attest the re-expression. Each row therefore ships with
 * `verification_quote: null` rather than a quote that cannot be cited.
 *
 * **Which rows carry an `atv_a704e-U-*` pointer, and which carry none** (corrected in fix
 * round 1 — the earlier blanket claim was wrong): `-08-D1` → `U-1` (IQC-Card 2 Sheet 1
 * frequencies / quality targets), `-09-D1 … D5` → `U-1` (the plausibility targets their
 * maxima are compared against), `-10-D1 / D2` → `U-1`, `-11-D1` → `U-2` (IQC-Card 9
 * intervals), `-11-D2` → `U-3` (IQC-Card 9 Sheet 3 pipette tolerances). `-12-D1`
 * (`abweichungen_count`) and `-12-D2` (`mitarbeiter_count`) name NO U-entry, deliberately:
 * they are STRUCTURAL counts of a deviation log and a personnel list, and IQC-Card 10 /
 * IQC-Card 11 print FORMS, not tables of values — there is no printed source a U-block
 * could ask for, so their descriptions say "kein Transkript" without a pointer.
 *
 * Nothing here replaces a prod equation: EQ-01 … EQ-06
 * keep their rows and their outputs (`mean_value`, `deviation_single_pct`,
 * `calculated_value`, `NSS`, `deviation_equivalency_pct`, `deviation_parallel_pct`);
 * making those outputs derived is STAGED (`atv_a704e-R-1`, archive pattern).
 *
 * Mapping to the stored formulas (all `EV`, from `atv_a704e-quotes.ts` `PROD_EQUATION`):
 *   EQ-01 `mean_value = SUM(single_result_i) / n_determinations`        → -09-D2 `mean_rows(…)`
 *   EQ-02 `deviation_single_pct = 100 * (single_result_i − mean_value) / mean_value`
 *                                                                        → -09-D3, maximised over the rows
 *                                                                          (a per-ROW column is impossible — F-1)
 *   EQ-03 `calculated_value = (total_volume / sample_volume) * measured_value_diluted_sample`
 *                                                                        → the `calculated` row column (-09 D)
 *   EQ-04 `NSS = (volume_sample · … + volume_standard · …) / (volume_sample + volume_standard)`
 *                                                                        → the `nss_nominal` row column (-09 E)
 *   EQ-05 / EQ-06 `100 * (measured_value_operating − <reference>) / <reference>`
 *                                                                        → the `dev_pct` row column (-10)
 * The only figures inside a formula are the printed `× 100` of the percentage forms
 * (stored in EQ-02 / EQ-05 / EQ-06 themselves) — no threshold, no tolerance, no
 * interval is typed anywhere: every printed IGC-Card value is a sign-off item
 * (`atv_a704e-U-1 … U-6`), and NO regulation table is seeded.
 *
 * Empty-register behaviour (pinned): `count_rows` reads 0 (computed); `mean_rows` /
 * `max_rows` / `min_rows` over an empty register — and every FILTERED aggregate whose
 * condition no row satisfies — read `manual_required` ("Keine vollständigen Zeilen"),
 * never a phantom 0. That is why the two per-kind maxima and the pipette maximum use
 * the trailing row condition instead of the brief's `if(…, …, 0)` form, which reads a
 * false 0 % deviation when no row of that kind exists (probed both ways in-session).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';

const STD = 'ATV-A-704E';

/** Row-condition tokens (prod enum values; quoted literals — Task 13 string-literal rule). */
export const KIND_EQUIVALENCY = "kind == 'equivalency'";
export const KIND_PARALLEL = "kind == 'parallel'";
export const ROW_PIPETTE = "equipment == 'piston_stroke_pipettes'";

export const EQUATIONS: EquationEntry[] = [
  {
    standard: STD, worksheet: 'ATV-A-704E-08', equation_number: 'ATV-A-704E-08-D1',
    formula: 'qa_measures_count = count_rows(qs_massnahmen)',
    input_symbols: ['qs_massnahmen'], output_symbol: 'qa_measures_count', output_unit: null,
    clause_reference: 'Annex A, IQC-Card 2 Sheet 1',
    description: 'Plan 3: Anzahl der vollständigen Zeilen des Registers qs_massnahmen (je QS-Maßnahme der IQC-Karte 2 Blatt 1 eine Zeile); leeres Register ⇒ 0 (berechnet), nie ein Phantom-Pass. Grundlage des STAGED Gate-Vorschlags atv_a704e-G-4. verification_quote NULL: ohne Transkript kann keine Quelle die Zeilenzählung belegen (atv_a704e-U-1).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-09', equation_number: 'ATV-A-704E-09-D1',
    formula: 'n_determinations_calc = count_rows(einzelbestimmungen)',
    input_symbols: ['einzelbestimmungen'], output_symbol: 'n_determinations_calc', output_unit: null,
    clause_reference: 'IGC-Card 3',
    description: 'Plan 3: Anzahl der Einzelbestimmungen aus den Zeilen des Registers einzelbestimmungen — der Nenner, den die gespeicherte EQ-01 als getipptes Feld n_determinations liest; leeres Register ⇒ 0. Das Zahlenfeld n_determinations bleibt (atv_a704e-D-2). verification_quote NULL (kein Transkript — atv_a704e-U-1).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-09', equation_number: 'ATV-A-704E-09-D2',
    formula: 'mean_value_calc = mean_rows(einzelbestimmungen, single_result)',
    input_symbols: ['einzelbestimmungen'], output_symbol: 'mean_value_calc', output_unit: 'mg/l',
    clause_reference: 'IGC-Card 3',
    description: 'Plan 3: Mittelwert der Einzelergebnisse aus den Registerzeilen — dieselbe Mathematik wie die gespeicherte EQ-01 (mean_value = SUM(single_result_i) / n_determinations), nur über die Zeilen statt über ein einzelnes Feld; prod EQ-01 bleibt unverändert (atv_a704e-R-1). Leeres Register ⇒ manuell erforderlich, nie 0. verification_quote NULL (kein Transkript — atv_a704e-U-1).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-09', equation_number: 'ATV-A-704E-09-D3',
    formula: 'max_dev_pct_calc = max(max_rows(einzelbestimmungen, single_result) - mean_rows(einzelbestimmungen, single_result), mean_rows(einzelbestimmungen, single_result) - min_rows(einzelbestimmungen, single_result)) * 100 / mean_rows(einzelbestimmungen, single_result)',
    input_symbols: ['einzelbestimmungen'], output_symbol: 'max_dev_pct_calc', output_unit: '%',
    clause_reference: 'IGC-Card 3',
    description: 'Plan 3: größte Abweichung eines Einzelwertes vom Mittelwert in Prozent — die Mathematik der gespeicherten EQ-02 (100 * (single_result_i − mean_value) / mean_value), über alle Zeilen maximiert (der größere der beiden Abstände max − Mittelwert und Mittelwert − min). Der Mittelwert ist INLINE wiederholt, nie auf -09-D2 verkettet (der Materialisierer liest Skalare aus den gespeicherten Werten). Eine Abweichungsspalte JE ZEILE ist nicht ausdrückbar: ein Zeilenausdruck kann kein Aggregat seines eigenen Registers lesen (atv_a704e-F-1). Die gedruckte Spalte 9 der IQC-Karte 3 beschreibt nach der prod-Zelle eine größte SPANNWEITE ÷ Mittelwert — Abweichung zur gespeicherten Formel: atv_a704e-J-1. Leeres Register ⇒ manuell erforderlich. verification_quote NULL (kein Transkript — atv_a704e-U-1).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-09', equation_number: 'ATV-A-704E-09-D4',
    formula: 'dilution_max_dev = max_rows(verduennungsversuche, abs(dev_pct))',
    input_symbols: ['verduennungsversuche'], output_symbol: 'dilution_max_dev', output_unit: '%',
    clause_reference: 'IGC-Card 5, Sheet 1',
    description: 'Plan 3: größte Betragsabweichung der Verdünnungsversuche — je Zeile ist der berechnete Wert die gespeicherte EQ-03-Mathematik ((Gesamtvolumen / Probenvolumen) × Messwert verdünnte Probe) und die Abweichung der prozentuale Vergleich mit dem Messwert der Originalprobe; prod EQ-03 bleibt unverändert (atv_a704e-R-1). Leeres Register ⇒ manuell erforderlich, nie 0. verification_quote NULL (kein Transkript — atv_a704e-U-1).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-09', equation_number: 'ATV-A-704E-09-D5',
    formula: 'spike_max_dev = max_rows(aufstockungsversuche, abs(dev_pct))',
    input_symbols: ['aufstockungsversuche'], output_symbol: 'spike_max_dev', output_unit: '%',
    clause_reference: 'IGC-Card 5, Sheet 3',
    description: 'Plan 3: größte Betragsabweichung der Aufstockungsversuche — je Zeile ist der Sollwert NSS die gespeicherte EQ-04-Mathematik und die Abweichung der prozentuale Vergleich des Messwertes der aufgestockten Probe mit NSS; prod EQ-04 bleibt unverändert (atv_a704e-R-1). Leeres Register ⇒ manuell erforderlich, nie 0. verification_quote NULL (kein Transkript — atv_a704e-U-1).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-10', equation_number: 'ATV-A-704E-10-D1',
    formula: `equivalency_max_dev = max_rows(vergleichsmessungen, abs(dev_pct), ${KIND_EQUIVALENCY})`,
    input_symbols: ['vergleichsmessungen'], output_symbol: 'equivalency_max_dev', output_unit: '%',
    clause_reference: 'IGC-Card 6',
    description: 'Plan 3: größte Betragsabweichung der Gleichwertigkeitsmessungen (Zeilen der Art equivalency) — je Zeile die gespeicherte EQ-05-Mathematik (100 * (Messwert Betriebsverfahren − Sollwert) / Sollwert); prod EQ-05 bleibt unverändert (atv_a704e-R-1). Ohne Zeile dieser Art „manuell erforderlich“, nie 0 (die if(…, …, 0)-Form läse hier eine falsche 0 % — in-session beide Formen geprüft). Grundlage des STAGED Gate-Vorschlags zu CR-022 (atv_a704e-G-2). verification_quote NULL (kein Transkript — atv_a704e-U-1).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-10', equation_number: 'ATV-A-704E-10-D2',
    formula: `parallel_max_dev = max_rows(vergleichsmessungen, abs(dev_pct), ${KIND_PARALLEL})`,
    input_symbols: ['vergleichsmessungen'], output_symbol: 'parallel_max_dev', output_unit: '%',
    clause_reference: 'IGC-Card 7',
    description: 'Plan 3: größte Betragsabweichung der Parallelanalysen (Zeilen der Art parallel) — je Zeile die gespeicherte EQ-06-Mathematik (100 * (Messwert Betriebsverfahren − Messwert Referenzmethode) / Messwert Referenzmethode); prod EQ-06 bleibt unverändert (atv_a704e-R-1). Ohne Zeile dieser Art „manuell erforderlich“, nie 0. Grundlage des STAGED Gate-Vorschlags zu CR-023 (atv_a704e-G-2). verification_quote NULL (kein Transkript — atv_a704e-U-1).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-11', equation_number: 'ATV-A-704E-11-D1',
    formula: 'pruefmittel_count = count_rows(pruefmittel)',
    input_symbols: ['pruefmittel'], output_symbol: 'pruefmittel_count', output_unit: null,
    clause_reference: 'Annex A, IQC-Card 9',
    description: 'Plan 3: Anzahl der überwachten Prüfmittel aus den Registerzeilen (IQC-Karte 9); leeres Register ⇒ 0, nie ein Phantom-Pass. Grundlage des STAGED Gate-Vorschlags zu CR-024 (atv_a704e-G-4). verification_quote NULL (kein Transkript — atv_a704e-U-2).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-11', equation_number: 'ATV-A-704E-11-D2',
    formula: `pipette_dev_max = max_rows(pruefmittel, pipette_dev_pct, ${ROW_PIPETTE})`,
    input_symbols: ['pruefmittel'], output_symbol: 'pipette_dev_max', output_unit: '%',
    clause_reference: 'Annex A, IQC-Card 9',
    description: 'Plan 3: größte gemessene Pipettenabweichung über alle Zeilen mit dem Prüfmittel Kolbenhubpipette; ohne solche Zeile „manuell erforderlich“, nie 0. Die volumenabhängige Grenze (CR-025 liest heute die Einzelfelder pipette_tested_volume / pipette_deviation_pct) bleibt unverändert — die Umstellung auf das Register ist STAGED (atv_a704e-G-3) und braucht die gedruckte Volumen-/Toleranztabelle (atv_a704e-U-3). verification_quote NULL (kein Transkript).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-12', equation_number: 'ATV-A-704E-12-D1',
    formula: 'abweichungen_count = count_rows(abweichungen)',
    input_symbols: ['abweichungen'], output_symbol: 'abweichungen_count', output_unit: null,
    clause_reference: 'Annex A, IQC-Card 11',
    description: 'Plan 3: Anzahl der protokollierten Abweichungen (IQC-Karte 11); leeres Register ⇒ 0 — das bedeutet „keine Abweichung protokolliert“, nicht „keine Abweichung aufgetreten“ (CR-028 hat heute eine leere Bedingung: atv_a704e-G-7). verification_quote NULL (kein Transkript).',
    verification_quote: null,
  },
  {
    standard: STD, worksheet: 'ATV-A-704E-12', equation_number: 'ATV-A-704E-12-D2',
    formula: 'mitarbeiter_count = count_rows(mitarbeiter)',
    input_symbols: ['mitarbeiter'], output_symbol: 'mitarbeiter_count', output_unit: null,
    clause_reference: 'Annex A, IQC-Card 10',
    description: 'Plan 3: Anzahl der im Personalnachweis dokumentierten Mitarbeiterinnen und Mitarbeiter (IQC-Karte 10); leeres Register ⇒ 0, nie ein Phantom-Pass. Grundlage des STAGED Gate-Vorschlags zu CR-018 (atv_a704e-G-6). verification_quote NULL (kein Transkript).',
    verification_quote: null,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
