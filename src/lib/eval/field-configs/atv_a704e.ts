/**
 * ATV-A-704E — Plan 3 Task 27 field configs (the IQC-Card registers: single
 * determinations → mean / greatest deviation, dilution and standard-addition
 * trials, equivalency and parallel measurements, the QS-measure and Prüfmittel
 * registers, the personnel record and the deviation log, plus the operating-method
 * list) as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts atv_a704e`.
 *
 * **NO TRANSCRIPT (the gravest constraint of this task).** The only source on disk,
 * `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ATV A 704E\
 * ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf`, is a 37-page SCAN with no
 * text layer (`pdftotext -layout` → 37 bytes, one form feed per page, 0 non-whitespace
 * characters — the command and its raw output are in the task report, amendment O).
 * Every `verification_quote` below is therefore a cell of the read-only prod capture
 * `atv_a704e.text.prior.json` (`node scripts/verification/capture-text.mjs ATV-A-704E
 * atv_a704e`), copied by the generator into `atv_a704e-quotes.ts` and cited as
 * **`prod verification_quote (EV, unverified — no transcript)`**. NOTHING in this file
 * is a verbatim quote OF THE STANDARD; every IGC-Card value those cells contain is a
 * sign-off item (`atv_a704e-U-1 … U-6`) and NO regulation table is seeded (tables 0,
 * no seed builder, no seed migration).
 *
 * Prod facts come from the captured `atv_a704e.prior.json` (2026-09-24, read-only):
 * 12 worksheets, 91 active fields (21 `attest_*` booleans — the brief's "23" is refuted
 * by the capture, `atv_a704e-O-2`), 101 coded sections with
 * single-letter codes (-01 D "Abbreviated Terms"; -08 E "Internal Specifications
 * (IGC-Card 2)"; -09 C "Multiple Determinations", D "Dilution Plausibility", E
 * "Standard Addition"; -10 C "Equivalency Measurements", D "Parallel Analyses"; -11 C
 * "Monitoring Frequencies"; -12 C "Personnel Record", D "Deviations & Measures"),
 * 6 equations (EQ-01 … EQ-06, all `verified_against_standard`), 30 gates (3 with an
 * EMPTY condition — CR-028 / CR-029 / CR-030 — which never refuse a rule).
 * Every register enum column copies prod's `value` + `label_de` byte-for-byte
 * (owner ruling D-1, pinned).
 *
 * Emitted rules on EXISTING fields: THREE — `precipitation_influence` and
 * `storage_temperature` (-06) ← `sampling_method == 'automatic'`, `photometer_check_done`
 * (-11) ← `testing_equipment == 'photometer'` (all consumer-free, no gate reads them).
 * Every other brief target is REFUSED by the emitter's guards and routed to STAGED
 * (`scripts/verification/atv_a704e-STAGED-plan3-rulings.sql`):
 *   - `heating_device_deviation` (-11) ← thermoblock: CR-026 reads it → **G-1**;
 *   - `pipette_tested_volume` / `pipette_deviation_pct` (-11) ← pipettes: CR-025 reads
 *     both → **G-3**;
 *   - the -09 C / -10 C / -10 D section rules (§4.4): CR-019 / CR-022 / CR-023 read the
 *     deviations those sections hold (and the EQ-02 / EQ-05 / EQ-06 inputs reach them)
 *     → **G-2**;
 *   - `parallel_analysis_performed` (-05) ← `application_mode == 'parallel_to_reference'`:
 *     the producer guard refuses (consumed by -10) → **C-1**;
 *   - the -09 D / E section rules: their printed driver `blank_and_standard_controlled`
 *     (-05, "check of plausibility by dilution and standard addition") is NOT inherited
 *     on -09 → **C-2** (the emitter ACCEPTS them — pinned, so the withholding is a
 *     recorded judgment, not a guard artefact).
 *
 * NOT emitted (sign-off): the per-row deviation-from-the-mean column (a row expression
 * cannot reference an aggregate of its own register — `atv_a704e-F-1`; the worksheet-level
 * `max_dev_pct_calc` carries it); the printed IQC-Card 3 column-9 metric is a GREATEST
 * SPREAD ÷ mean while stored EQ-02 is a single value's deviation from the mean
 * (`atv_a704e-J-1`, prod's own `source_quote` flags the divergence); the brief's separate
 * `nominal_value` column on `vergleichsmessungen` (`atv_a704e-J-2`).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { PROD_ENUM, Q } from './atv_a704e-quotes';

const STD = 'ATV-A-704E';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS01 = on('ATV-A-704E-01');
const WS06 = on('ATV-A-704E-06');
const WS08 = on('ATV-A-704E-08');
const WS09 = on('ATV-A-704E-09');
const WS10 = on('ATV-A-704E-10');
const WS11 = on('ATV-A-704E-11');
const WS12 = on('ATV-A-704E-12');

// ---- prod enum tokens as captured 2026-09-24 (value + label_de byte-for-byte — owner ruling D-1; pinned against the prior) ----
/** prod `parameter_name` (-01, §2.2 abbreviation list) — 9 analytical parameters. */
export const PARAMETERS = PROD_ENUM['ATV-A-704E-01 parameter_name'];
/** prod `application_mode` (-03, §4.1) — parallel to reference / single substitute / self-monitoring. */
export const APPLICATION_MODES = PROD_ENUM['ATV-A-704E-03 application_mode'];
/** prod `qa_measure` (-08, IQC-Card 2 Sheet 1) — the nine quality-assurance measures. */
export const QA_MEASURES = PROD_ENUM['ATV-A-704E-08 qa_measure'];
/** prod `testing_equipment` (-11, IQC-Card 9) — the sixteen monitored items. */
export const EQUIPMENT = PROD_ENUM['ATV-A-704E-11 testing_equipment'];
/** prod `monitoring_interval` (-11, IQC-Card 9) — annually … every two weeks. */
export const INTERVALS = PROD_ENUM['ATV-A-704E-11 monitoring_interval'];
/** prod `deviation_iqc_card_ref` (-12, IQC-Card 11) — the eleven IQC-Cards. */
export const IQC_CARDS = PROD_ENUM['ATV-A-704E-12 deviation_iqc_card_ref'];

const opts = (xs: ReadonlyArray<{ value: string; label_de: string }>) => xs.map((x) => x.value);
const labels = (xs: ReadonlyArray<{ value: string; label_de: string }>) => Object.fromEntries(xs.map((x) => [x.value, x.label_de]));

// ---- drivers (quoted enum tokens — Task 13 string-literal rule; booleans `== true`) ----
/** -06 `sampling_method` token `automatic` (IQC-Card 8 sampling log) — EMITTED on precipitation_influence / storage_temperature. */
export const AUTOMATIC_SAMPLING = "sampling_method == 'automatic'";
/** -11 `testing_equipment` token `photometer` (IQC-Card 9) — EMITTED on photometer_check_done (no gate reads it on -11). */
export const PHOTOMETER = "testing_equipment == 'photometer'";
/** -05 boolean, inherited on -09 (consumer_worksheets ["ATV-A-704E-09"]) — EMITTED on the created -09 C register + outputs. */
export const MULTI = 'multiple_determination_performed == true';
/** -05 booleans, both inherited on -10 — EMITTED on the created -10 register + outputs. */
export const EQ_OR_PAR = 'equivalency_check_performed == true OR parallel_analysis_performed == true';

// ---- drivers the guards REFUSE or whose driver is not inherited (kept as data for the STAGED blocks + the refusal pins; never emitted) ----
/** STAGED G-1: CR-026 (`heating_device_deviation <= 3`) reads the symbol this rule would hide. */
export const THERMOBLOCK = "testing_equipment == 'heating_device_thermoblock'";
/** STAGED G-3: CR-025 reads `pipette_tested_volume` AND `pipette_deviation_pct`. */
export const PIPETTES = "testing_equipment == 'piston_stroke_pipettes'";
/** STAGED C-1: `parallel_analysis_performed` (-05) is consumed by -10 — the producer guard refuses the hide. */
export const PARALLEL_MODE = "application_mode == 'parallel_to_reference'";
/** STAGED C-2: the §4.4 plausibility driver (-05) is consumed by -07 only — it never reaches -09. */
export const PLAUSIBILITY = 'blank_and_standard_controlled == true';

// ---- row-scope drivers inside `pruefmittel` (the row's own discriminator, never a worksheet symbol) ----
export const ROW_PIPETTE = "equipment == 'piston_stroke_pipettes'";
export const ROW_THERMOBLOCK = "equipment == 'heating_device_thermoblock'";
export const ROW_PHOTOMETER = "equipment == 'photometer'";

// ---- row expressions: the stored EQ-03 / EQ-04 / EQ-05 / EQ-06 math, re-expressed over rows (EV — no source can attest them) ----
/** EQ-03 as stored: `calculated_value = (total_volume / sample_volume) * measured_value_diluted_sample`. */
export const DILUTION_CALC_EXPR = 'total_volume_ml / sample_volume_ml * measured_diluted';
/** The IQC-Card 5 Sheet 1 comparison of the calculated value against the measured value of the original sample, in %. */
export const DILUTION_DEV_EXPR = '(calculated - reference) / reference * 100';
/** EQ-04 as stored: `NSS = (volume_sample * measured_value_original_sample + volume_standard * concentration_standard) / (volume_sample + volume_standard)`. */
export const NSS_EXPR = '(sample_volume_ml * measured_original + standard_volume_ml * standard_concentration) / (sample_volume_ml + standard_volume_ml)';
/** The IQC-Card 5 Sheet 3 comparison of the spiked measurement against the nominal value, in %. */
export const SPIKE_DEV_EXPR = '(measured_spiked - nss_nominal) / nss_nominal * 100';
/** EQ-05 / EQ-06 as stored (identical shape; the row's `reference_value` is the nominal value for an equivalency row and the reference-method value for a parallel row). */
export const COMPARISON_DEV_EXPR = '(operating_value - reference_value) / reference_value * 100';

const EV = ' [prod verification_quote — EV, unverified: ATV-A-704E has NO transcript (scanned PDF without text layer); jeder gedruckte IGC-Karten-Wert ist ein Freigabepunkt atv_a704e-U-1 … U-6]';

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ================= ATV-A-704E-01 — Betriebsmethoden (one row per parameter × operating method) =================
  WS01({
    symbol: 'betriebsmethoden', widget: 'register',
    ui_config: {
      title: 'Betriebsmethoden je Parameter', subtitle: '§4.1 / §4.2 — je Parameter und Anwendungsart eine Zeile: erwarteter Konzentrationsbereich, Abdeckung des Validierungsbereichs, Eignung', add_label: '+ Betriebsmethode', placement: 'section',
      columns: [
        { key: 'parameter', label: 'Parameter', type: 'enum', options: opts(PARAMETERS), option_labels: labels(PARAMETERS), required: true, discriminator: true, aria_label: 'Analytischer Parameter (§2.2 Abkürzungsverzeichnis)' },
        { key: 'application_mode', label: 'Anwendungsart', type: 'enum', options: opts(APPLICATION_MODES), option_labels: labels(APPLICATION_MODES), aria_label: 'Anwendungsart der Betriebsmethode (§4.1)' },
        { key: 'expected_range', label: 'Erwarteter Konzentrationsbereich', type: 'text', aria_label: 'Erwarteter Konzentrationsbereich der Probe (§4.2)' },
        { key: 'validation_coverage_pct', label: 'Abdeckung Validierungsbereich', type: 'number', unit: '%', min: 0, max: 100, aria_label: 'Anteil des Messbereichs, der durch die Validierung abgedeckt ist, in Prozent (§4.2)' },
        { key: 'suitable', label: 'Methode geeignet', type: 'boolean', aria_label: 'Betriebsmethode für diesen Anwendungsfall als geeignet bewertet (§4.2)' },
      ],
      note: `Je Parameter × Anwendungsart eine Zeile — eine Kläranlage betreibt mehrere Betriebsmethoden, prod hält je Feld genau einen Wert (parameter_name auf -01, application_mode / expected_concentration_range / validation_range_coverage_pct / method_selected_suitable auf -03). Die Einzelfelder bleiben bis zur Ratifizierung (atv_a704e-D-38 … D-42). Das 20–80-%-Fenster des Messbereichs (§4.2) ist NICHT als Tabelle hinterlegt — ohne Transkript ist der gedruckte Satz nicht zitierbar (atv_a704e-U-6); der Text der prod-Zelle lautet: ${Q.EXPECTED_RANGE}${EV}`,
    },
    verification_quote: `${Q.PARAMETER_NAME} — ${Q.APPLICATION_MODE}${EV}`,
    create: { section_code: 'D', label_de: 'Betriebsmethoden (je Parameter: Anwendungsart, erwarteter Bereich, Validierungsabdeckung, Eignung)', data_type: 'json', unit: null, clause_reference: '§2.2, §4.1, §4.2',
      description: 'Plan 3: Zeilen je Parameter × Betriebsmethode (prod hält je Feld einen Wert: parameter_name -01, application_mode / expected_concentration_range / validation_range_coverage_pct / method_selected_suitable -03); die Einzelfelder bleiben (atv_a704e-D-38 … D-42). Keine Tabelle hinterlegt — ohne Transkript ist kein gedruckter Wert zitierbar (atv_a704e-U-4 Referenzmethoden, U-6 20–80-%-Fenster).' },
  }),

  // ================= ATV-A-704E-06 — sampling conditionals (the two EMITTED rules on existing fields) =================
  WS06({
    symbol: 'precipitation_influence', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: AUTOMATIC_SAMPLING,
    verification_quote: `${Q.SAMPLING_METHOD} — ${Q.PRECIPITATION}${EV}`,
  }),
  WS06({
    symbol: 'storage_temperature', widget: 'scalar', ui_config: null, visible_when: AUTOMATIC_SAMPLING,
    verification_quote: `${Q.SAMPLING_METHOD} — ${Q.STORAGE_TEMPERATURE}${EV}`,
  }),

  // ================= ATV-A-704E-08 — the QS-measure register (IQC-Card 2 Sheet 1) =================
  WS08({
    symbol: 'qs_massnahmen', widget: 'register',
    ui_config: {
      title: 'QS-Maßnahmen (IQC-Karte 2, Blatt 1)', subtitle: 'je Qualitätssicherungsmaßnahme eine Zeile: Mindesthäufigkeit, Qualitätsziel, Anzahl durchgeführter Maßnahmen', add_label: '+ QS-Maßnahme', placement: 'section',
      columns: [
        { key: 'measure', label: 'QS-Maßnahme', type: 'enum', options: opts(QA_MEASURES), option_labels: labels(QA_MEASURES), required: true, discriminator: true, aria_label: 'Qualitätssicherungsmaßnahme nach IQC-Karte 2 Blatt 1' },
        { key: 'frequency', label: 'Mindesthäufigkeit', type: 'text', aria_label: 'Vom Betrieb festgelegte Mindesthäufigkeit der Maßnahme' },
        { key: 'target_pct', label: 'Qualitätsziel', type: 'number', unit: '%', min: 0, aria_label: 'Qualitätsziel als maximal zulässige Abweichung in Prozent' },
        { key: 'performed_count', label: 'Durchgeführt', type: 'number', min: 0, aria_label: 'Anzahl der im Berichtszeitraum durchgeführten Maßnahmen (Übersichtskarte, IQC-Karte 1)' },
      ],
      footer: ['qa_measures_count'],
      note: `Je Maßnahme eine Zeile, damit alle neun QS-Maßnahmen einer Anlage nebeneinander stehen (prod hält qa_measure / qa_minimum_frequency / qa_quality_target_pct / survey_measure_count je genau einmal — atv_a704e-D-22 … D-25). **Häufigkeit und Qualitätsziel sind Ingenieureingaben**, keine hinterlegte Tabelle: die gedruckten Empfehlungen der IQC-Karte 2 Blatt 1 sind ohne Transkript nicht zitierbar (atv_a704e-U-1). Zur Einordnung der Text der prod-Zellen: ${Q.QA_FREQUENCY} | ${Q.QA_TARGET}${EV}`,
    },
    verification_quote: `${Q.QA_MEASURE} — ${Q.QA_TARGET}${EV}`,
    create: { section_code: 'E', label_de: 'QS-Maßnahmen (je Maßnahme: Mindesthäufigkeit, Qualitätsziel %, Anzahl durchgeführt)', data_type: 'json', unit: null, clause_reference: 'Annex A, IQC-Card 2 Sheet 1',
      description: 'Plan 3: Zeilen je Qualitätssicherungsmaßnahme der IQC-Karte 2 Blatt 1 (prod hält nur eine Maßnahme darstellbar); Anzahl → qa_measures_count (ATV-A-704E-08-D1). Häufigkeit und Qualitätsziel werden eingegeben, bis atv_a704e-U-1 die gedruckte Tabelle liefert (kein Transkript — der gescannte PDF hat keine Textebene); die Einzelfelder bleiben (atv_a704e-D-22 … D-25).' },
  }),
  WS08({
    symbol: 'qa_measures_count', widget: 'derived', ui_config: null, verification_quote: `${Q.QA_MEASURE}${EV}`,
    create: { section_code: 'E', label_de: 'Anzahl erfasster QS-Maßnahmen (aus dem Register)', data_type: 'number', unit: null, clause_reference: 'Annex A, IQC-Card 2 Sheet 1',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-08-D1 (count_rows über qs_massnahmen; leeres Register ⇒ 0, nie ein Phantom-Pass); Grundlage des STAGED Gate-Vorschlags zu CR-020 / CR-021 / CR-024 (atv_a704e-G-4).' },
  }),

  // ================= ATV-A-704E-09 C — the single determinations (IQC-Card 3) =================
  WS09({
    symbol: 'einzelbestimmungen', widget: 'register', visible_when: MULTI,
    ui_config: {
      title: 'Mehrfachbestimmung (IQC-Karte 3)', subtitle: 'je Einzelbestimmung eine Zeile — Mittelwert, Anzahl und größte Abweichung werden aus den Zeilen berechnet', add_label: '+ Einzelwert', placement: 'section',
      columns: [
        { key: 'parameter', label: 'Parameter', type: 'enum', options: opts(PARAMETERS), option_labels: labels(PARAMETERS), required: true, discriminator: true, aria_label: 'Analytischer Parameter der Mehrfachbestimmung (IQC-Karte 3 Spalte 4)' },
        { key: 'date', label: 'Datum', type: 'date', required: true, aria_label: 'Datum der Bestimmung (IQC-Karte 3 Spalte 1)' },
        { key: 'single_result', label: 'Einzelergebnis', type: 'number', required: true, aria_label: 'Einzelner Messwert der Mehrfachbestimmung (IQC-Karte 3 Spalten 4 bis 6)' },
        { key: 'unit', label: 'Einheit', type: 'text', placeholder: 'mg/l', aria_label: 'Einheit des Messwertes (IQC-Karte 3 druckt mg/l)' },
      ],
      footer: ['n_determinations_calc', 'mean_value_calc', 'max_dev_pct_calc'],
      note: `Je Einzelbestimmung eine Zeile; prod hält single_result_i genau einmal (atv_a704e-D-1). Anzahl → n_determinations_calc, Mittelwert → mean_value_calc (die gespeicherte EQ-01-Mathematik über die Zeilen), größte Abweichung vom Mittelwert in % → max_dev_pct_calc (die gespeicherte EQ-02-Mathematik, über alle Zeilen maximiert). **Eine Abweichungsspalte JE ZEILE ist im Rechenwerk nicht ausdrückbar** — ein Zeilenausdruck kann kein Aggregat seines eigenen Registers lesen (atv_a704e-F-1). Ein leeres Register liefert nie eine Phantom-0: die Mittelwert- und Abweichungszeilen sind dann „manuell erforderlich“. Achtung (atv_a704e-J-1): die prod-Zelle beschreibt die gedruckte Spalte 9 als „greatest difference of the single measured values divided by the mean value“ — eine größte SPANNWEITE, nicht die Abweichung eines Einzelwertes; gespeichert ist EQ-02 als Einzelwert-Abweichung. Text der prod-Zelle: ${Q.DEVIATION_SINGLE}${EV}`,
    },
    verification_quote: `${Q.SINGLE_RESULT} — ${Q.MEAN_VALUE}${EV}`,
    create: { section_code: 'C', label_de: 'Mehrfachbestimmung — Einzelwerte (je Zeile: Parameter, Datum, Einzelergebnis, Einheit)', data_type: 'json', unit: null, clause_reference: 'IGC-Card 3',
      description: 'Plan 3: Zeilen je Einzelbestimmung der Mehrfachbestimmung (IQC-Karte 3 Spalten 4–6); Anzahl → n_determinations_calc (ATV-A-704E-09-D1), Mittelwert → mean_value_calc (-D2, EQ-01-Mathematik über die Zeilen), größte Abweichung vom Mittelwert → max_dev_pct_calc (-D3, EQ-02-Mathematik maximiert). Sichtbar nur, wenn multiple_determination_performed angekreuzt ist (§4.4). Die Einzelfelder single_result_i / n_determinations / mean_value / deviation_single_pct bleiben (atv_a704e-D-1 … D-5); EQ-01 … EQ-06 bleiben unverändert (atv_a704e-R-1).' },
  }),
  WS09({
    symbol: 'n_determinations_calc', widget: 'derived', ui_config: null, visible_when: MULTI, verification_quote: `${Q.N_DETERMINATIONS}${EV}`,
    create: { section_code: 'C', label_de: 'Anzahl Einzelbestimmungen (aus dem Register)', data_type: 'number', unit: null, clause_reference: 'IGC-Card 3',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-09-D1 (count_rows über einzelbestimmungen; leeres Register ⇒ 0); Zwilling des Zahlenfelds n_determinations (atv_a704e-D-2).' },
  }),
  WS09({
    symbol: 'mean_value_calc', widget: 'derived', ui_config: null, visible_when: MULTI, verification_quote: `${Q.MEAN_VALUE}${EV}`,
    create: { section_code: 'C', label_de: 'Mittelwert der Einzelbestimmungen (aus dem Register)', data_type: 'number', unit: 'mg/l', clause_reference: 'IGC-Card 3',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-09-D2 (mean_rows über einzelbestimmungen.single_result) — dieselbe Mathematik wie die gespeicherte EQ-01 (mean_value = SUM(single_result_i) / n_determinations), nur über die Zeilen; prod EQ-01 bleibt unverändert (atv_a704e-R-1), das Zahlenfeld mean_value bleibt (atv_a704e-D-3). Leeres Register ⇒ manuell erforderlich, nie 0.' },
  }),
  WS09({
    symbol: 'max_dev_pct_calc', widget: 'derived', ui_config: null, visible_when: MULTI, verification_quote: `${Q.DEVIATION_SINGLE}${EV}`,
    create: { section_code: 'C', label_de: 'Größte Abweichung eines Einzelwertes vom Mittelwert (aus dem Register)', data_type: 'number', unit: '%', clause_reference: 'IGC-Card 3',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-09-D3 — die gespeicherte EQ-02-Mathematik (100 * (single_result_i − mean_value) / mean_value), über alle Zeilen maximiert (max(max − Mittelwert, Mittelwert − min) * 100 / Mittelwert). Eine Abweichungsspalte je Zeile ist nicht ausdrückbar (atv_a704e-F-1); die gedruckte Spalte 9 der IQC-Karte 3 beschreibt eine größte SPANNWEITE ÷ Mittelwert — die Abweichung von der gespeicherten Formel ist atv_a704e-J-1. Grundlage des STAGED Gate-Vorschlags zu CR-019 (atv_a704e-G-2).' },
  }),

  // ================= ATV-A-704E-09 D — the dilution trials (IQC-Card 5 Sheet 1, EQ-03 over rows) =================
  WS09({
    symbol: 'verduennungsversuche', widget: 'register',
    ui_config: {
      title: 'Verdünnungsversuche (IQC-Karte 5, Blatt 1)', subtitle: 'je Verdünnungsversuch eine Zeile — Verdünnungsfaktor, berechneter Wert und Abweichung vom Messwert der Originalprobe werden je Zeile berechnet', add_label: '+ Verdünnungsversuch', placement: 'section',
      columns: [
        { key: 'parameter', label: 'Parameter', type: 'enum', options: opts(PARAMETERS), option_labels: labels(PARAMETERS), aria_label: 'Analytischer Parameter des Verdünnungsversuchs' },
        { key: 'date', label: 'Datum', type: 'date', aria_label: 'Datum des Verdünnungsversuchs' },
        { key: 'sample_volume_ml', label: 'Probenvolumen', type: 'number', unit: 'ml', required: true, aria_label: 'Probenvolumen vor der Verdünnung (IQC-Karte 5 Blatt 1, Nenner des Verdünnungsfaktors)' },
        { key: 'total_volume_ml', label: 'Gesamtvolumen', type: 'number', unit: 'ml', required: true, aria_label: 'Gesamtvolumen nach der Verdünnung (IQC-Karte 5 Blatt 1, Zähler des Verdünnungsfaktors)' },
        { key: 'measured_diluted', label: 'Messwert verdünnte Probe', type: 'number', required: true, aria_label: 'Messwert der verdünnten Probe (IQC-Karte 5 Blatt 1 Spalte 5)' },
        { key: 'calculated', label: 'Berechneter Wert', type: 'derived', expr: DILUTION_CALC_EXPR },
        { key: 'reference', label: 'Messwert Originalprobe', type: 'number', required: true, aria_label: 'Messwert der Originalprobe (IQC-Karte 5 Blatt 1 Spalte 3) — Vergleichswert' },
        { key: 'dev_pct', label: 'Abweichung', type: 'derived', expr: DILUTION_DEV_EXPR },
      ],
      footer: ['dilution_max_dev'],
      note: `Je Versuch eine Zeile; der berechnete Wert ist die gespeicherte EQ-03-Mathematik (Gesamtvolumen / Probenvolumen × Messwert verdünnte Probe), die Abweichung der prozentuale Vergleich mit dem Messwert der Originalprobe. Der Messwert der Originalprobe ist PFLICHT, damit jede vollständige Zeile eine berechenbare Abweichung hat (sonst wäre die Maximumsbildung „manuell erforderlich“). Die zulässige Abweichung steht in der internen Vorgabe (IQC-Karte 2) — sie ist hier keine hinterlegte Tabelle (atv_a704e-U-1). Text der prod-Zelle: ${Q.CALCULATED_VALUE}${EV}`,
    },
    verification_quote: `${Q.SAMPLE_VOLUME} — ${Q.CALCULATED_VALUE}${EV}`,
    create: { section_code: 'D', label_de: 'Verdünnungsversuche (je Zeile: Probenvolumen, Gesamtvolumen, Messwert verdünnt → berechneter Wert, Abweichung)', data_type: 'json', unit: null, clause_reference: 'IGC-Card 5, Sheet 1',
      description: 'Plan 3: Zeilen je Verdünnungsversuch (IQC-Karte 5 Blatt 1); der berechnete Wert je Zeile ist die gespeicherte EQ-03-Mathematik, die Abweichung der Vergleich mit dem Messwert der Originalprobe; größte Abweichung → dilution_max_dev (ATV-A-704E-09-D4). Die Einzelfelder sample_volume / total_volume / measured_value_diluted_sample / calculated_value / measured_value_original_sample bleiben (atv_a704e-D-6 … D-10); EQ-03 bleibt unverändert (atv_a704e-R-1).' },
  }),
  WS09({
    symbol: 'dilution_max_dev', widget: 'derived', ui_config: null, verification_quote: `${Q.CALCULATED_VALUE}${EV}`,
    create: { section_code: 'D', label_de: 'Größte Abweichung der Verdünnungsversuche (aus dem Register)', data_type: 'number', unit: '%', clause_reference: 'IGC-Card 5, Sheet 1',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-09-D4 (max_rows über verduennungsversuche, |Abweichung|); leeres Register ⇒ manuell erforderlich, nie 0. Grundlage des STAGED Gate-Vorschlags zur Plausibilitätsprüfung (atv_a704e-G-5).' },
  }),

  // ================= ATV-A-704E-09 E — the standard-addition trials (IQC-Card 5 Sheet 3, EQ-04 over rows) =================
  WS09({
    symbol: 'aufstockungsversuche', widget: 'register',
    ui_config: {
      title: 'Aufstockungsversuche / Standardaddition (IQC-Karte 5, Blatt 3)', subtitle: 'je Aufstockung eine Zeile — Sollwert der aufgestockten Probe (NSS) und Abweichung des Messwertes werden je Zeile berechnet', add_label: '+ Aufstockungsversuch', placement: 'section',
      columns: [
        { key: 'parameter', label: 'Parameter', type: 'enum', options: opts(PARAMETERS), option_labels: labels(PARAMETERS), aria_label: 'Analytischer Parameter der Standardaddition' },
        { key: 'date', label: 'Datum', type: 'date', aria_label: 'Datum der Standardaddition' },
        { key: 'sample_volume_ml', label: 'Volumen Probe', type: 'number', unit: 'ml', required: true, aria_label: 'Volumen der Probe in der Standardaddition (IQC-Karte 5 Blatt 3 Spalte 4)' },
        { key: 'standard_volume_ml', label: 'Volumen Standard', type: 'number', unit: 'ml', required: true, aria_label: 'Volumen der zugesetzten Standardlösung (IQC-Karte 5 Blatt 3 Spalte 5)' },
        { key: 'standard_concentration', label: 'Konzentration Standard', type: 'number', required: true, aria_label: 'Konzentration der zugesetzten Standardlösung (IQC-Karte 5 Blatt 3 Spalte 6)' },
        { key: 'measured_original', label: 'Messwert Originalprobe', type: 'number', required: true, aria_label: 'Messwert der Originalprobe (IQC-Karte 5 Blatt 3 Spalte 3)' },
        { key: 'measured_spiked', label: 'Messwert aufgestockte Probe', type: 'number', required: true, aria_label: 'Messwert der aufgestockten Probe (IQC-Karte 5 Blatt 3 Spalte 9)' },
        { key: 'nss_nominal', label: 'Sollwert aufgestockte Probe (NSS)', type: 'derived', expr: NSS_EXPR },
        { key: 'dev_pct', label: 'Abweichung', type: 'derived', expr: SPIKE_DEV_EXPR },
      ],
      footer: ['spike_max_dev'],
      note: `Je Aufstockung eine Zeile; der Sollwert NSS ist die gespeicherte EQ-04-Mathematik, die Abweichung der prozentuale Vergleich des Messwertes der aufgestockten Probe mit dem Sollwert. Die zulässige Toleranz steht in der internen Vorgabe (IQC-Karte 2) — hier keine hinterlegte Tabelle (atv_a704e-U-1). Achtung X-2: prod führt dieselbe physikalische Größe zweimal — sample_volume (Blatt 1) und volume_sample (Blatt 3); die beiden Register halten sie getrennt, wie die beiden Blätter es drucken. Text der prod-Zelle: ${Q.NSS}${EV}`,
    },
    verification_quote: `${Q.NSS} — ${Q.MEASURED_SPIKED}${EV}`,
    create: { section_code: 'E', label_de: 'Aufstockungsversuche (je Zeile: Volumina, Standardkonzentration, Messwerte → NSS, Abweichung)', data_type: 'json', unit: null, clause_reference: 'IGC-Card 5, Sheet 3',
      description: 'Plan 3: Zeilen je Standardaddition (IQC-Karte 5 Blatt 3); NSS je Zeile ist die gespeicherte EQ-04-Mathematik, die Abweichung der Vergleich des Messwertes der aufgestockten Probe mit NSS; größte Abweichung → spike_max_dev (ATV-A-704E-09-D5). Die Einzelfelder volume_sample / volume_standard / concentration_standard / measured_value_original_sample / measured_value_spiked_sample / NSS bleiben (atv_a704e-D-11 … D-16); EQ-04 bleibt unverändert (atv_a704e-R-1).' },
  }),
  WS09({
    symbol: 'spike_max_dev', widget: 'derived', ui_config: null, verification_quote: `${Q.MEASURED_SPIKED}${EV}`,
    create: { section_code: 'E', label_de: 'Größte Abweichung der Aufstockungsversuche (aus dem Register)', data_type: 'number', unit: '%', clause_reference: 'IGC-Card 5, Sheet 3',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-09-D5 (max_rows über aufstockungsversuche, |Abweichung|); leeres Register ⇒ manuell erforderlich, nie 0. Grundlage des STAGED Gate-Vorschlags zur Plausibilitätsprüfung (atv_a704e-G-5).' },
  }),

  // ================= ATV-A-704E-10 — equivalency and parallel measurements (IQC-Card 6 / 7, EQ-05 / EQ-06 over rows) =================
  WS10({
    symbol: 'vergleichsmessungen', widget: 'register', visible_when: EQ_OR_PAR,
    ui_config: {
      title: 'Vergleichsmessungen (IQC-Karte 6 Gleichwertigkeit / IQC-Karte 7 Parallelanalysen)', subtitle: 'je Vergleichsmessung eine Zeile — Art der Messung als Zeilentyp; die prozentuale Abweichung wird je Zeile berechnet', add_label: '+ Vergleichsmessung', placement: 'section',
      columns: [
        { key: 'kind', label: 'Art', type: 'enum', options: ['equivalency', 'parallel'], option_labels: { equivalency: 'Gleichwertigkeitsmessung (IQC-Karte 6)', parallel: 'Parallelanalyse zur Referenzmethode (IQC-Karte 7)' }, required: true, discriminator: true, aria_label: 'Art der Vergleichsmessung (Gleichwertigkeit oder Parallelanalyse)' },
        { key: 'parameter', label: 'Parameter', type: 'enum', options: opts(PARAMETERS), option_labels: labels(PARAMETERS), aria_label: 'Analytischer Parameter der Vergleichsmessung (IQC-Karte 6 Spalte 4)' },
        { key: 'date', label: 'Datum', type: 'date', aria_label: 'Datum der Vergleichsmessung (IQC-Karte 6 Spalte 1)' },
        { key: 'operating_value', label: 'Messwert Betriebsverfahren', type: 'number', required: true, aria_label: 'Messwert des Betriebsverfahrens, meist Mittelwert (IQC-Karte 6 Spalte 5 / IQC-Karte 7 Spalte 8)' },
        { key: 'reference_value', label: 'Soll- bzw. Referenzwert', type: 'number', required: true, aria_label: 'Sollwert der Gleichwertigkeitsmessung (IQC-Karte 6 Spalte 6) bzw. Messwert der Referenzmethode (IQC-Karte 7 Spalte 7)' },
        { key: 'dev_pct', label: 'Abweichung', type: 'derived', expr: COMPARISON_DEV_EXPR },
      ],
      footer: ['equivalency_max_dev', 'parallel_max_dev'],
      note: `Ein Register mit Zeilentyp statt zweier Register: die gespeicherten EQ-05 und EQ-06 haben dieselbe Form — (Messwert Betriebsverfahren − Bezugswert) / Bezugswert × 100 —, nur der Nenner heißt bei der Gleichwertigkeit „Sollwert“ (IQC-Karte 6 Spalte 6) und bei der Parallelanalyse „Messwert der Referenzmethode“ (IQC-Karte 7 Spalte 7); beide stehen in der Spalte „Soll- bzw. Referenzwert“. Eine ZWEITE Spalte „nominal_value“ wäre ein zweiter Nenner, den die Abweichung nicht liest — deshalb nicht angelegt (atv_a704e-J-2). Größte Abweichung je Art → equivalency_max_dev / parallel_max_dev; fehlt eine Art ganz, ist das Maximum „manuell erforderlich“, nie 0. Text der prod-Zellen: ${Q.DEV_EQUIVALENCY} | ${Q.DEV_PARALLEL}${EV}`,
    },
    verification_quote: `${Q.MEASURED_OPERATING} — ${Q.MEASURED_REFERENCE}${EV}`,
    create: { section_code: 'C', label_de: 'Vergleichsmessungen (je Zeile: Art, Parameter, Datum, Messwert Betriebsverfahren, Soll-/Referenzwert → Abweichung)', data_type: 'json', unit: null, clause_reference: 'IGC-Card 6, IGC-Card 7',
      description: 'Plan 3: Zeilen je Gleichwertigkeitsmessung (IQC-Karte 6) bzw. Parallelanalyse (IQC-Karte 7) mit der Art als Zeilentyp; die Abweichung je Zeile ist die gespeicherte EQ-05- / EQ-06-Mathematik (identische Form, unterschiedlicher Bezugswert); größte Abweichung je Art → equivalency_max_dev (ATV-A-704E-10-D1) / parallel_max_dev (-D2). Sichtbar, wenn Gleichwertigkeits- oder Parallelmessungen durchgeführt werden (§4.4). Die Einzelfelder measured_value_operating / nominal_value_reference / measured_value_reference / deviation_equivalency_pct / deviation_parallel_pct bleiben (atv_a704e-D-17 … D-21); EQ-05 / EQ-06 bleiben unverändert (atv_a704e-R-1).' },
  }),
  WS10({
    symbol: 'equivalency_max_dev', widget: 'derived', ui_config: null, visible_when: EQ_OR_PAR, verification_quote: `${Q.DEV_EQUIVALENCY}${EV}`,
    create: { section_code: 'C', label_de: 'Größte Abweichung der Gleichwertigkeitsmessungen (aus dem Register)', data_type: 'number', unit: '%', clause_reference: 'IGC-Card 6',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-10-D1 (max_rows über vergleichsmessungen, |Abweichung|, nur Zeilen der Art Gleichwertigkeit); ohne solche Zeile „manuell erforderlich“, nie 0. Grundlage des STAGED Gate-Vorschlags zu CR-022 (atv_a704e-G-2).' },
  }),
  WS10({
    symbol: 'parallel_max_dev', widget: 'derived', ui_config: null, visible_when: EQ_OR_PAR, verification_quote: `${Q.DEV_PARALLEL}${EV}`,
    create: { section_code: 'D', label_de: 'Größte Abweichung der Parallelanalysen (aus dem Register)', data_type: 'number', unit: '%', clause_reference: 'IGC-Card 7',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-10-D2 (max_rows über vergleichsmessungen, |Abweichung|, nur Zeilen der Art Parallelanalyse); ohne solche Zeile „manuell erforderlich“, nie 0. Grundlage des STAGED Gate-Vorschlags zu CR-023 (atv_a704e-G-2).' },
  }),

  // ================= ATV-A-704E-11 — the Prüfmittel register (IQC-Card 9) + the ONE emitted -11 rule =================
  WS11({
    symbol: 'pruefmittel', widget: 'register',
    ui_config: {
      title: 'Prüfmittelüberwachung (IQC-Karte 9)', subtitle: 'je Prüfmittel eine Zeile: Überwachungsintervall, letzte Prüfung, Ergebnis; die Toleranzfelder erscheinen je nach Prüfmittel', add_label: '+ Prüfmittel', placement: 'section',
      columns: [
        { key: 'equipment', label: 'Prüfmittel', type: 'enum', options: opts(EQUIPMENT), option_labels: labels(EQUIPMENT), required: true, discriminator: true, aria_label: 'Überwachtes Prüfmittel (IQC-Karte 9)' },
        { key: 'interval', label: 'Überwachungsintervall', type: 'enum', options: opts(INTERVALS), option_labels: labels(INTERVALS), aria_label: 'Überwachungsintervall des Prüfmittels (IQC-Karte 9)' },
        { key: 'last_check', label: 'Letzte Prüfung', type: 'date', aria_label: 'Datum der letzten Prüfung des Prüfmittels' },
        { key: 'result', label: 'Ergebnis', type: 'text', aria_label: 'Ergebnis der Prüfmittelüberwachung' },
        { key: 'pipette_volume_ml', label: 'Geprüftes Pipettenvolumen', type: 'number', unit: 'ml', visible_when: ROW_PIPETTE, aria_label: 'Geprüftes Volumen der Kolbenhubpipette (IQC-Karte 9 Blatt 3)' },
        { key: 'pipette_dev_pct', label: 'Abweichung Pipette', type: 'number', unit: '%', visible_when: ROW_PIPETTE, aria_label: 'Gemessene Abweichung der Kolbenhubpipette in Prozent (IQC-Karte 9 Blatt 3)' },
        { key: 'heating_dev_c', label: 'Abweichung Heizgerät/Thermoblock', type: 'number', unit: '°C', visible_when: ROW_THERMOBLOCK, aria_label: 'Gemessene Temperaturabweichung des Heizgeräts bzw. Thermoblocks in Grad Celsius (IQC-Karte 9)' },
        { key: 'photometer_check', label: 'Photometerprüfung erfolgt', type: 'boolean', visible_when: ROW_PHOTOMETER, aria_label: 'Photometer mit dem Testlösungssatz des Herstellers geprüft (IQC-Karte 9)' },
      ],
      footer: ['pruefmittel_count', 'pipette_dev_max'],
      note: `Je Prüfmittel eine Zeile — prod hält testing_equipment / monitoring_interval / die drei Toleranzfelder je genau einmal (atv_a704e-D-26 … D-31), sodass heute nur EIN Gerät dokumentierbar ist. **Intervall und Toleranzgrenzen sind Eingaben**, keine hinterlegte Tabelle: die gedruckte Intervalltabelle der IQC-Karte 9 und die Volumen-/Toleranztabelle von Blatt 3 sind ohne Transkript nicht zitierbar (atv_a704e-U-2 / U-3). Text der prod-Zellen: ${Q.MONITORING_INTERVAL} | ${Q.PIPETTE_DEVIATION}${EV}`,
    },
    verification_quote: `${Q.TESTING_EQUIPMENT} — ${Q.MONITORING_INTERVAL}${EV}`,
    create: { section_code: 'C', label_de: 'Prüfmittel (je Zeile: Prüfmittel, Intervall, letzte Prüfung, Ergebnis, gerätespezifische Toleranz)', data_type: 'json', unit: null, clause_reference: 'Annex A, IQC-Card 9',
      description: 'Plan 3: Zeilen je überwachtem Prüfmittel (IQC-Karte 9); die Toleranzspalten erscheinen je nach Zeilentyp (Pipette, Heizgerät/Thermoblock, Photometer); Anzahl → pruefmittel_count (ATV-A-704E-11-D1), größte Pipettenabweichung → pipette_dev_max (-D2). Intervalle und Toleranzen werden eingegeben, bis atv_a704e-U-2 / U-3 die gedruckten Tabellen liefern (kein Transkript); die Einzelfelder bleiben (atv_a704e-D-26 … D-31), CR-025 / CR-026 lesen sie weiterhin (atv_a704e-G-1 / G-3).' },
  }),
  WS11({
    symbol: 'pruefmittel_count', widget: 'derived', ui_config: null, verification_quote: `${Q.TESTING_EQUIPMENT}${EV}`,
    create: { section_code: 'C', label_de: 'Anzahl überwachter Prüfmittel (aus dem Register)', data_type: 'number', unit: null, clause_reference: 'Annex A, IQC-Card 9',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-11-D1 (count_rows über pruefmittel; leeres Register ⇒ 0, nie ein Phantom-Pass); Grundlage des STAGED Gate-Vorschlags zu CR-024 (atv_a704e-G-4).' },
  }),
  WS11({
    symbol: 'pipette_dev_max', widget: 'derived', ui_config: null, verification_quote: `${Q.PIPETTE_DEVIATION}${EV}`,
    create: { section_code: 'C', label_de: 'Größte Pipettenabweichung (aus dem Register)', data_type: 'number', unit: '%', clause_reference: 'Annex A, IQC-Card 9',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-11-D2 (max_rows über pruefmittel.pipette_dev_pct, nur Zeilen mit dem Prüfmittel Kolbenhubpipette); ohne Pipettenzeile „manuell erforderlich“, nie 0. Die volumenabhängige Grenze (2 % / 1 %) bleibt in CR-025 auf den Einzelfeldern — die Umstellung auf das Register ist STAGED (atv_a704e-G-3), die gedruckte Volumentabelle fehlt bis atv_a704e-U-3.' },
  }),
  WS11({
    symbol: 'photometer_check_done', widget: 'attestation', ui_config: null, visible_when: PHOTOMETER,
    verification_quote: `${Q.TESTING_EQUIPMENT} — ${Q.PHOTOMETER_CHECK}${EV}`,
  }),

  // ================= ATV-A-704E-12 — personnel record (IQC-Card 10) and deviation log (IQC-Card 11) =================
  WS12({
    symbol: 'mitarbeiter', widget: 'register',
    ui_config: {
      title: 'Personalnachweis Betriebsanalytik (IQC-Karte 10)', subtitle: 'je Mitarbeiterin/Mitarbeiter eine Zeile: Qualifikation, Einweisung, Schulungsnachweis', add_label: '+ Mitarbeiter', placement: 'section',
      columns: [
        { key: 'name', label: 'Name', type: 'text', required: true, aria_label: 'Name der Mitarbeiterin bzw. des Mitarbeiters (IQC-Karte 10 Blatt 1)' },
        { key: 'qualification', label: 'Qualifikation', type: 'text', aria_label: 'Qualifikation, in der Regel durch eine einschlägige Berufsausbildung belegt (IQC-Karte 10 Blatt 1)' },
        { key: 'instruction_date', label: 'Datum der Einweisung', type: 'date', aria_label: 'Datum der Grundeinweisung bzw. der letzten Schulung (IQC-Karte 10 Blatt 2 Spalte 2)' },
        { key: 'training_record', label: 'Einweisungs-/Schulungsnachweis', type: 'text', aria_label: 'Veranstaltung: Thema und Veranstalter (IQC-Karte 10 Blatt 2 Spalte 1)' },
      ],
      footer: ['mitarbeiter_count'],
      note: `Je Person eine Zeile — prod hält employee_qualification und instruction_training_record je genau einmal (atv_a704e-D-32 / D-33), sodass heute nur eine Person dokumentierbar ist. Text der prod-Zellen: ${Q.EMPLOYEE_QUALIFICATION} | ${Q.INSTRUCTION_RECORD}${EV}`,
    },
    verification_quote: `${Q.EMPLOYEE_QUALIFICATION} — ${Q.INSTRUCTION_RECORD}${EV}`,
    create: { section_code: 'C', label_de: 'Personalnachweis (je Person: Name, Qualifikation, Einweisungsdatum, Schulungsnachweis)', data_type: 'json', unit: null, clause_reference: 'Annex A, IQC-Card 10',
      description: 'Plan 3: Zeilen je Mitarbeiterin/Mitarbeiter (IQC-Karte 10 Blätter 1 und 2); Anzahl → mitarbeiter_count (ATV-A-704E-12-D2). Die Einzelfelder employee_qualification / instruction_training_record bleiben (atv_a704e-D-32 / D-33); CR-018 liest heute die Attestierung (atv_a704e-G-6).' },
  }),
  WS12({
    symbol: 'mitarbeiter_count', widget: 'derived', ui_config: null, verification_quote: `${Q.EMPLOYEE_QUALIFICATION}${EV}`,
    create: { section_code: 'C', label_de: 'Anzahl dokumentierter Mitarbeiter (aus dem Register)', data_type: 'number', unit: null, clause_reference: 'Annex A, IQC-Card 10',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-12-D2 (count_rows über mitarbeiter; leeres Register ⇒ 0, nie ein Phantom-Pass); Grundlage des STAGED Gate-Vorschlags zu CR-018 (atv_a704e-G-6).' },
  }),
  WS12({
    symbol: 'abweichungen', widget: 'register',
    ui_config: {
      title: 'Abweichungen und Maßnahmen (IQC-Karte 11)', subtitle: 'je Abweichung eine Zeile: Merkmal, betroffene IQC-Karte, Ursache, Maßnahme, Ergebnis', add_label: '+ Abweichung', placement: 'section',
      columns: [
        { key: 'date', label: 'Datum', type: 'date', aria_label: 'Datum der Abweichung (IQC-Karte 11 Spalte 1)' },
        { key: 'feature', label: 'Auffälliges Merkmal', type: 'text', required: true, aria_label: 'Art des auffälligen Merkmals (IQC-Karte 11 Spalte 3)' },
        { key: 'iqc_card_ref', label: 'Dokumentiert in IQC-Karte', type: 'enum', options: opts(IQC_CARDS), option_labels: labels(IQC_CARDS), aria_label: 'IQC-Karte, in der die Abweichung dokumentiert ist (IQC-Karte 11 Spalte 4)' },
        { key: 'cause', label: 'Ursache', type: 'text', aria_label: 'Ermittelte Ursache der Abweichung (IQC-Karte 11 Spalte 5)' },
        { key: 'measure', label: 'Maßnahme', type: 'text', aria_label: 'Eingeleitete Maßnahme (IQC-Karte 11 Spalte 6)' },
        { key: 'result', label: 'Ergebnis der Maßnahme', type: 'text', aria_label: 'Ergebnis der eingeleiteten Maßnahme (IQC-Karte 11 Spalte 8)' },
      ],
      footer: ['abweichungen_count'],
      note: `Je Abweichung eine Zeile — prod hält deviation_feature / deviation_cause / deviation_measure / deviation_iqc_card_ref je genau einmal (atv_a704e-D-34 … D-37), sodass heute nur EINE Abweichung dokumentierbar ist; ein Abweichungsprotokoll braucht viele. Text der prod-Zelle: ${Q.DEVIATION_FEATURE}${EV}`,
    },
    verification_quote: `${Q.DEVIATION_FEATURE} — ${Q.DEVIATION_MEASURE}${EV}`,
    create: { section_code: 'D', label_de: 'Abweichungsprotokoll (je Zeile: Datum, Merkmal, IQC-Karte, Ursache, Maßnahme, Ergebnis)', data_type: 'json', unit: null, clause_reference: 'Annex A, IQC-Card 11',
      description: 'Plan 3: Zeilen je Abweichung (IQC-Karte 11 Spalten 1–9); Anzahl → abweichungen_count (ATV-A-704E-12-D1). Die Einzelfelder deviation_feature / deviation_cause / deviation_measure / deviation_iqc_card_ref bleiben (atv_a704e-D-34 … D-37); CR-028 (leere Bedingung) ist der STAGED Gate-Vorschlag atv_a704e-G-7.' },
  }),
  WS12({
    symbol: 'abweichungen_count', widget: 'derived', ui_config: null, verification_quote: `${Q.DEVIATION_FEATURE}${EV}`,
    create: { section_code: 'D', label_de: 'Anzahl protokollierter Abweichungen (aus dem Register)', data_type: 'number', unit: null, clause_reference: 'Annex A, IQC-Card 11',
      description: 'Plan 3: Ausgabe der Gleichung ATV-A-704E-12-D1 (count_rows über abweichungen; leeres Register ⇒ 0). Eine 0 bedeutet „keine Abweichung protokolliert“, nicht „keine Abweichung aufgetreten“ — CR-028 hat heute eine LEERE Bedingung (atv_a704e-G-7).' },
  }),
];

/**
 * No section rules are emitted. The five the brief asks for are kept as DATA for the STAGED blocks and for the
 * refusal / acceptance pins in `field-configs-atv_a704e.test.ts`:
 *   - -09 C / -10 C / -10 D ← the §4.4 booleans: REFUSED by the gate-aware guard (CR-019 / CR-022 / CR-023 read the
 *     deviations those sections hold, and EQ-02 / EQ-05 / EQ-06 carry their inputs into the same gates) → G-2;
 *   - -09 D / -09 E ← `blank_and_standard_controlled`: ACCEPTED by the emitter but WITHHELD — the driver (-05) is
 *     consumed by -07 only and never reaches -09, so the rule would be `pending` forever → C-2 (consumer edit + rule
 *     in one staged transaction), the vsme / iso14046 convention.
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** The five §4.4 section rules, as data for the STAGED blocks G-2 / C-2 and the guard pins (never emitted). */
export const STAGED_SECTION_RULES: Array<{ worksheet: string; section_code: string; visible_when: string; block: string }> = [
  { worksheet: 'ATV-A-704E-09', section_code: 'C', visible_when: MULTI, block: 'atv_a704e-G-2' },
  { worksheet: 'ATV-A-704E-09', section_code: 'D', visible_when: PLAUSIBILITY, block: 'atv_a704e-C-2' },
  { worksheet: 'ATV-A-704E-09', section_code: 'E', visible_when: PLAUSIBILITY, block: 'atv_a704e-C-2' },
  { worksheet: 'ATV-A-704E-10', section_code: 'C', visible_when: 'equivalency_check_performed == true', block: 'atv_a704e-G-2' },
  { worksheet: 'ATV-A-704E-10', section_code: 'D', visible_when: 'parallel_analysis_performed == true', block: 'atv_a704e-G-2' },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
