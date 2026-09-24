/**
 * ISO-5667-1 — Plan 3 Task 28 field configs (the historical-results / sites / determinands /
 * flow-measurement registers, the §16.4 K fill twin, and the situation- / aspect- / programme-driven
 * visibility) as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts iso5667_1`.
 *
 * SR-3 / VA: every `verification_quote` is a span of the IN-SESSION `pdftotext -layout` extraction of
 * the standard's own PDF (NTC-ISO 5667-1:1995, the Colombian adoption of ISO 5667/1:1980), lifted by
 * line range into `regulation-tables-quotes-iso5667_1.ts`; the span's doc comment names the PDF page.
 * Every quote is from the 1980 EDITION (iso5667_1-J-1). Labels are German as prod's are, with the
 * printed Spanish term where it helps.
 *
 * Prod facts come from the captured `iso5667_1.prior.json` (read-only, 2026-09-24): section codes are
 * single letters (-02 B "Inputs"-style, D variability; -04 C flow character, D pipe/volatiles/weather;
 * -05 A situation, B groundwater, C cooling, D manhole, E sludge/composite, F sampler/flow-proportional;
 * -06 C programme type, D abnormal/composite; -07 B x_i/x_mean/sigma, C K/L/n/s/confidence_level;
 * -08 C direction/velocity/discharge, E method/mode). All 41 sections carry `visible_when IS NULL`
 * today and this task adds no SECTION rule (the standard prints no whole-worksheet applicability).
 *
 * REGISTER COLUMN KEYS: amendment P — no column is keyed `id` (it collides with the row identity that
 * `prepareRegisterRows` reads from `r.id`); the row label column is `kennung` everywhere.
 *
 * `K` is NOT re-bound (amendment J). The §16.4 table is `locked`, and the `lookup_fill` widget hides
 * its input entirely under a locked policy (`canOverride` requires `policy !== 'locked'`), so a
 * re-bind would make prod's REQUIRED `K` untypeable whenever `confidence_level` is unset
 * (state `keys_missing` ⇒ no fill, no input). The fail-safe shape is the amendment's own prescription:
 * a TWIN fill `K_table` is CREATED beside the driver, `K` stays typeable and untouched, and the
 * re-bind is STAGED (iso5667_1-E-1, `widget IS NULL`-guarded UPDATE + archive rollback).
 *
 * What is deliberately NOT emitted (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/iso5667_1-STAGED-plan3-rulings.sql):
 *   - hiding `pipe_nominal_bore` (CR-012 block) and `isokinetic_sampling` (CR-013 warn) under the
 *     flow character / a suspended-solids driver — the gate-aware guard refuses both → iso5667_1-G-1;
 *   - hiding `groundwater_purged` / `sampling_depth` (CR-016 block), `sludge_pipe_diameter` (CR-017
 *     block), `flow_proportional_sampling` (CR-019 warn) and `automatic_sampler_protection` (CR-018
 *     warn) under `water_situation_type` → iso5667_1-G-2;
 *   - hiding `abnormal_frequency_increase` (CR-022 warn) under the created `abnormal_conditions`
 *     → iso5667_1-G-3;
 *   - hiding `target_statistic` under `programme_type` — `target_statistic` is consumed by -07
 *     (producer guard) → iso5667_1-C-1;
 *   - a `cyclic` token on `variability_profile` (§16.5 prints cyclic variations; prod's enum has only
 *     stable / slow / wide_rapid and D-1 forbids overwriting a non-null enum) → iso5667_1-D-1;
 *   - the retirement of the -05 situation scalars and the -07 x_mean / n / s scalars in favour of the
 *     registers → the D-class blocks iso5667_1-D-2 … D-23 (one per register column ↔ prod scalar pair, amendment K).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q } from '../regulation-tables-quotes-iso5667_1';
import { ISO5667_1_EDITION } from '../regulation-tables-seed-iso5667_1';

const STD = 'ISO-5667-1';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS02 = on('ISO-5667-1-02');
const WS04 = on('ISO-5667-1-04');
const WS05 = on('ISO-5667-1-05');
const WS06 = on('ISO-5667-1-06');
const WS07 = on('ISO-5667-1-07');
const WS08 = on('ISO-5667-1-08');

// ---- prod enum tokens, copied VERBATIM from the captured prior (D-1: never a second list) ----
/** -05 `water_situation_type` — the 16 prod tokens, in prod order. */
export const WATER_SITUATION_TOKENS = [
  'precipitation', 'estuary_coastal_sea', 'river_stream', 'canal', 'reservoir_lake', 'groundwater',
  'sediment', 'drinking_water', 'bathing_water', 'industrial_supply', 'boiler_system', 'cooling_system',
  'commercial_effluent', 'wastewater', 'wastewater_sludge', 'stormwater',
] as const;
/** -05 `cooling_system_type` — §10.2.4's three printed types. */
export const COOLING_TOKENS = ['open_evaporative', 'once_through', 'closed_circuit'] as const;
/** -02 `variability_profile` — prod's three tokens (NO `cyclic`: iso5667_1-D-1). */
export const VARIABILITY_TOKENS = ['stable', 'slow', 'wide_rapid'] as const;
/** -06 `target_statistic` — §15.2's three printed statistics. */
export const TARGET_STATISTIC_TOKENS = ['arithmetic_mean', 'median', 'standard_deviation'] as const;
/** -04 `flow_character` — prod's three tokens (NO `heterogeneous`: the brief's premise, refuted by grep). */
export const FLOW_CHARACTER_TOKENS = ['turbulent_well_mixed', 'laminar_pipe', 'reverse_flow'] as const;
/** -08 `flow_aspect` — §19.1's three printed aspects; the S21 `aspect` key tokens. */
export const FLOW_ASPECT_TOKENS = ['direction', 'velocity', 'discharge'] as const;
/** -08 `flow_measurement_method` — prod's 15 tokens; the S21 `method` key tokens. */
export const FLOW_METHOD_TOKENS = [
  'drogue', 'float_trawl', 'chemical_tracer', 'microbiological_tracer', 'radioactive_tracer',
  'current_meter', 'ultrasonic', 'electromagnetic', 'pneumatic', 'weir_level', 'venturi',
  'orifice_plate', 'pumping_rate', 'dilution_gauging', 'mechanical',
] as const;
/** -08 `flow_measurement_mode` — §21.1's two printed modes. */
export const FLOW_MODE_TOKENS = ['discrete', 'continuous'] as const;
/** -06 `programme_type` — §15's three printed programme types (prod tokens). */
export const PROGRAMME_TYPE_TOKENS = ['quality_control', 'quality_characterization', 'pollution_source_investigation'] as const;

// ---- drivers (prod tokens as captured) ----
export const QUALITY_CONTROL = "programme_type == 'quality_control'";
export const QUALITY_CHARACTERIZATION = "programme_type == 'quality_characterization'";
export const WIDE_RAPID = "variability_profile == 'wide_rapid'";
export const VOLATILE = 'determinand_volatile == true';
export const COOLING = "water_situation_type == 'cooling_system'";
export const COMMERCIAL_EFFLUENT = "water_situation_type == 'commercial_effluent'";
export const WASTEWATER = "water_situation_type == 'wastewater'";
export const RIVER_STREAM = "water_situation_type == 'river_stream'";
export const ASPECT_DIRECTION = "flow_aspect == 'direction'";
export const ASPECT_VELOCITY_OR_DISCHARGE = "flow_aspect IN {'velocity', 'discharge'}";
export const ASPECT_DISCHARGE = "flow_aspect == 'discharge'";

// ---- printed rules as expressions (single-sourced from the seeded tables; no figure typed) ----
/** §12.1.2: the sampling conduit of a sludge pipe must be at least 50 mm (S12_1_2). */
export const SLUDGE_PIPE_OK_EXPR = "if(sludge_pipe_dn_mm >= lookup('S12_1_2', 'sludge_pipe', 'min_diameter_mm'), 1, 0)";
/** §21: 1 when the (aspect, method) pair IS printed; BLANK when the pair has no S21 row (iso5667_1-F-1). */
export const METHOD_OK_EXPR = "if(lookup('S21', aspect, method, 'valid') == 1, 1, 0)";

const opt = (values: readonly string[]) => [...values];

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // =========================================================================
  // ISO-5667-1-02 — Festlegung der Ziele: the determinand register + the §16.5 sampling-time note
  // =========================================================================
  WS02({
    symbol: 'determinands', widget: 'register',
    create: {
      section_code: 'B', label_de: 'Parameterverzeichnis (Bestimmungsgrößen)', data_type: 'json',
      clause_reference: '§3, §15.2, §16',
      description: 'Plan 3: eine Zeile je Bestimmungsgröße mit Variabilitätsprofil, Ziel, Zielstatistik und erforderlicher Probenanzahl — ersetzt die Freitext-Parameterliste (Ablösung STAGED, iso5667_1-D-2 … D-4).',
    },
    ui_config: {
      title: 'Parameterverzeichnis (§3 / §15.2)',
      subtitle: '§3: „se debe compilar una lista de parámetros de interés“ — je Bestimmungsgröße Variabilität, Ziel und Zielstatistik.',
      add_label: '+ Bestimmungsgröße',
      columns: [
        { key: 'kennung', label: 'Kennung', type: 'text', required: true, width: '8rem', aria_label: 'Kennung der Bestimmungsgröße' },
        { key: 'parameter', label: 'Bestimmungsgröße', type: 'text', required: true, aria_label: 'Bezeichnung der Bestimmungsgröße' },
        {
          key: 'variability', label: 'Variabilitätsprofil', type: 'enum', options: opt(VARIABILITY_TOKENS), discriminator: true,
          option_labels: { stable: 'stabil (estable)', slow: 'langsam veränderlich (lentos y no muy marcados)', wide_rapid: 'weit und schnell veränderlich (variaciones amplias y rápidas)' },
          aria_label: 'Variabilitätsprofil der Bestimmungsgröße (§5.1)',
        },
        { key: 'objective', label: 'Ziel', type: 'text', aria_label: 'Ziel der Bestimmung (§4.2)' },
        {
          key: 'target_statistic', label: 'Zielstatistik', type: 'enum', options: opt(TARGET_STATISTIC_TOKENS),
          option_labels: { arithmetic_mean: 'arithmetisches Mittel (la media aritmética)', median: 'Median (la mediana)', standard_deviation: 'Standardabweichung (la desviación estándar)' },
          aria_label: 'Zielstatistik nach §15.2',
        },
        { key: 'sampling_times_relevant', label: 'Probenahmezeitpunkte relevant', type: 'boolean', visible_when: "variability == 'wide_rapid'", aria_label: 'Probenahmezeitpunkte statistisch relevant (§16.5)' },
        { key: 'n_required', label: 'n erforderlich', type: 'number', min: 0, aria_label: 'Erforderliche Probenanzahl n für diese Bestimmungsgröße' },
      ],
      footer: ['determinands_count', 'n_programme'],
    },
    verification_quote: Q.L749_754,
  }),
  WS02({
    symbol: 'determinands_count', widget: 'derived',
    create: { section_code: 'B', label_de: 'Anzahl Bestimmungsgrößen', data_type: 'number', clause_reference: '§3', description: 'Plan 3: Anzahl der im Parameterverzeichnis erfassten Bestimmungsgrößen (ISO-5667-1-02-D1).' },
    verification_quote: Q.L749_754,
  }),
  WS02({
    symbol: 'n_programme', widget: 'derived',
    create: { section_code: 'B', label_de: 'Maßgebende Probenanzahl n des Programms', data_type: 'number', clause_reference: '§16', description: 'Plan 3: größtes n_required über alle Bestimmungsgrößen — die Bestimmungsgröße mit dem höchsten Probenbedarf bestimmt das Programm (ISO-5667-1-02-D2).' },
    verification_quote: Q.L871_881,
  }),

  // =========================================================================
  // ISO-5667-1-04 — Besondere Probenahme-Erwägungen: the §8.10 volatiles driver
  // =========================================================================
  WS04({
    symbol: 'determinand_volatile', widget: 'attestation', ui_config: null,
    create: {
      section_code: 'D', label_de: 'Flüchtige Verbindungen zu bestimmen (§8.10)', data_type: 'boolean',
      clause_reference: '§8.10',
      description: 'Plan 3: Treiber für die §8.10-Vorgabe (minimale Saugkraft, gefüllte Leitung, Vorlauf verwerfen) — nur dann ist die Vorgabe überhaupt anwendbar.',
    },
    verification_quote: Q.L350_354,
  }),
  WS04({
    symbol: 'volatiles_minimal_suction', widget: 'attestation',
    visible_when: VOLATILE,
    verification_quote: Q.L350_354,
  }),

  // =========================================================================
  // ISO-5667-1-05 — Probenahmesituationen & Standortwahl: the sites register + the situation rules
  // =========================================================================
  WS05({
    symbol: 'sites_1', widget: 'register',
    create: {
      section_code: 'A', label_de: 'Probenahmestellen (Situationstyp je Stelle)', data_type: 'json',
      clause_reference: '§8.1, §9, §10, §11, §12, §13',
      description: 'Plan 3: eine Zeile je Probenahmestelle — §8.1 „la red de muestreo puede tener cualquier forma desde un solo sitio hasta todo un desagüe de río“; je Zeile greifen die situationsspezifischen Prüfungen aus §9 bis §13 (Ablösung der Einzel-Skalare STAGED, iso5667_1-D-5 … D-16).',
    },
    ui_config: {
      title: 'Probenahmestellen (§8.1 / §9 – §13)',
      subtitle: 'Je Stelle der Gewässersituationstyp; die situationsspezifischen Spalten erscheinen nach der Wahl.',
      add_label: '+ Probenahmestelle',
      columns: [
        { key: 'kennung', label: 'Kennung / ID', type: 'text', required: true, width: '9rem', aria_label: 'Kennung der Probenahmestelle' },
        {
          key: 'situation_type', label: 'Gewässersituationstyp', type: 'enum', required: true, discriminator: true, options: opt(WATER_SITUATION_TOKENS),
          option_labels: {
            precipitation: 'Niederschlag (§9.1)', estuary_coastal_sea: 'Ästuar / Küste / Meer (§9.2)', river_stream: 'Fluss / Bach (§9.3)',
            canal: 'Kanal (§9.4)', reservoir_lake: 'Speicher / See (§9.5)', groundwater: 'Grundwasser (§9.6)', sediment: 'Sediment (§9.7)',
            drinking_water: 'Trinkwasser (§9.8)', bathing_water: 'Badegewässer (§9.9)', industrial_supply: 'Industrielle Versorgung (§10.1)',
            boiler_system: 'Kesselanlage (§10.2)', cooling_system: 'Kühlsystem (§10.2.4)', commercial_effluent: 'Gewerbliches Abwasser (§11)',
            wastewater: 'Abwasser (§12)', wastewater_sludge: 'Klärschlamm (§12.1.2)', stormwater: 'Regen-/Mischwasserentlastung (§13)',
          },
          aria_label: 'Gewässersituationstyp der Probenahmestelle',
        },
        { key: 'location_identified', label: 'Stelle identifiziert', type: 'boolean', aria_label: 'Probenahmestelle nach §8.2 eindeutig identifiziert' },
        {
          key: 'flow_character', label: 'Strömungscharakter', type: 'enum', options: opt(FLOW_CHARACTER_TOKENS),
          option_labels: { turbulent_well_mixed: 'turbulent, gut durchmischt (§8.3)', laminar_pipe: 'laminar / Rohrströmung (§8.3)', reverse_flow: '„flujo inverso“ (§8.4)' },
          aria_label: 'Strömungscharakter an der Probenahmestelle (§8.3)',
        },
        { key: 'weather', label: 'Witterung', type: 'text', aria_label: 'Witterungsbedingungen bei der Probenahme (§8.13)' },
        { key: 'depth_below_ground_m', label: 'Entnahmetiefe u. GOK (m)', type: 'number', unit: 'm', min: 0, visible_when: "situation_type == 'groundwater'", aria_label: 'Entnahmetiefe unter Geländeoberkante in m (§9.6.2)' },
        { key: 'well_purged', label: 'Brunnen abgepumpt', type: 'boolean', visible_when: "situation_type == 'groundwater'", aria_label: 'Brunnen vor der Probenahme abgepumpt (§9.6.2)' },
        { key: 'upstream_downstream', label: 'Ober-/unterstrom beprobt', type: 'boolean', visible_when: "situation_type == 'river_stream'", aria_label: 'Probenahme ober- und unterstrom der Einleitung (§9.3.2)' },
        {
          key: 'cooling_type', label: 'Kühlsystemtyp', type: 'enum', options: opt(COOLING_TOKENS), visible_when: "situation_type == 'cooling_system'",
          option_labels: { open_evaporative: 'Offene Verdunstung (Evaporación abierta)', once_through: 'Durchlauf (Un solo paso)', closed_circuit: 'Geschlossener Kreislauf (Circuito cerrado)' },
          aria_label: 'Kühlsystemtyp nach §10.2.4',
        },
        { key: 'manhole_no_entry', label: 'Schacht ohne Einstieg beprobbar', type: 'boolean', visible_when: "situation_type == 'commercial_effluent'", aria_label: 'Inspektionsschacht so ausgebildet, dass ohne Einstieg beprobt werden kann (§11.1)' },
        { key: 'composite_multipoint', label: 'Misch-/Mehrpunktprobe', type: 'boolean', visible_when: "situation_type == 'wastewater'", aria_label: 'Zwei bis drei Routineproben an verschiedenen Punkten gemischt (§12.1.1)' },
        { key: 'sludge_pipe_dn_mm', label: 'Schlammleitung DN (mm)', type: 'number', unit: 'mm', min: 0, visible_when: "situation_type == 'wastewater_sludge'", aria_label: 'Durchmesser der Schlamm-Probenahmeleitung in mm (§12.1.2)' },
        { key: 'sludge_pipe_ok', label: '§12.1.2', type: 'derived', expr: SLUDGE_PIPE_OK_EXPR, display: 'badge', visible_when: "situation_type == 'wastewater_sludge'", value_labels: { '1': '§12.1.2 ≥ 50 mm erfüllt', '0': '§12.1.2 unter 50 mm oder nicht eingetragen' } },
        { key: 'flow_proportional', label: 'Durchflussproportional', type: 'boolean', visible_when: "situation_type == 'stormwater'", aria_label: 'Durchflussproportionale Probenahme vorgesehen (§13)' },
      ],
      footer: ['sites_count'],
    },
    verification_quote: Q.L295_302,
  }),
  WS05({
    symbol: 'sites_count', widget: 'derived',
    create: { section_code: 'A', label_de: 'Anzahl Probenahmestellen', data_type: 'number', clause_reference: '§8.1', description: 'Plan 3: Anzahl der erfassten Probenahmestellen (ISO-5667-1-05-D1).' },
    verification_quote: Q.L295_302,
  }),
  // the three situation scalars no gate and no consumer touches — emittable today
  WS05({ symbol: 'cooling_system_type', widget: 'select_one', enum_values: 'keep_prod', visible_when: COOLING, verification_quote: Q.L590_599 }),
  WS05({ symbol: 'manhole_sampled_without_entry', widget: 'attestation', visible_when: COMMERCIAL_EFFLUENT, verification_quote: Q.L624_626 }),
  WS05({ symbol: 'composite_multipoint_sample', widget: 'attestation', visible_when: WASTEWATER, verification_quote: Q.L656_664 }),
  WS05({ symbol: 'upstream_downstream_sampling', widget: 'attestation', visible_when: RIVER_STREAM, verification_quote: Q.L422_424 }),

  // =========================================================================
  // ISO-5667-1-06 — Programmtyp & Zeitpunkt: the §15 programme switch
  // =========================================================================
  WS06({ symbol: 'control_limits', widget: 'scalar', visible_when: QUALITY_CONTROL, verification_quote: Q.L735_739 }),
  WS06({
    symbol: 'sampling_time_note', widget: 'scalar',
    visible_when: WIDE_RAPID,
    create: {
      section_code: 'D', label_de: 'Probenahmezeitpunkte bei ausgeprägter Variabilität (§16.5)', data_type: 'text',
      clause_reference: '§16.5',
      description: 'Plan 3: Begründung der gewählten Probenahmezeitpunkte, wenn das Variabilitätsprofil weite und schnelle Schwankungen ausweist — §16.5: „Si ocurren variaciones cíclicas, los tiempos de muestreo son importantes“. Der Treiber variability_profile kennt heute keinen Token „cyclic“ (iso5667_1-D-1).',
    },
    verification_quote: Q.L859_869,
  }),
  WS06({
    symbol: 'abnormal_conditions', widget: 'attestation', ui_config: null,
    create: {
      section_code: 'D', label_de: 'Anormale Bedingungen (§17)', data_type: 'boolean',
      clause_reference: '§17',
      description: 'Plan 3: Treiber für die §17-Frequenzerhöhung (Anfahren einer Prozessanlage, Hochwasser, Algenblüte). Die Sichtbarkeitsregel auf abnormal_frequency_increase ist STAGED (CR-022 liest das Symbol — iso5667_1-G-3).',
    },
    verification_quote: Q.L908_912,
  }),

  // =========================================================================
  // ISO-5667-1-07 — Statistische Probenahmehäufigkeit: the historical-results register + the K twin
  // =========================================================================
  WS07({
    symbol: 'historical_results', widget: 'register',
    create: {
      section_code: 'B', label_de: 'Vorliegende Einzelergebnisse x_i', data_type: 'json',
      clause_reference: '§16.4',
      description: 'Plan 3: eine Zeile je Einzelergebnis x_i aus der Vorerkundung — §16.4: „Para cierto número de resultados n, tomados al azar, las estimaciones … son la media aritmética, X, y s respectivamente“. Ersetzt die skalare Einzelwerteingabe x_i (Ablösung STAGED, iso5667_1-D-17).',
    },
    ui_config: {
      title: 'Einzelergebnisse x_i (§16.4)',
      subtitle: '§16.4: x̄, n und s werden aus diesen Zeilen berechnet; s ist die Stichproben-Standardabweichung mit dem gedruckten Nenner n − 1.',
      add_label: '+ Einzelergebnis',
      columns: [
        { key: 'kennung', label: 'Probe', type: 'text', width: '8rem', aria_label: 'Kennung der Einzelprobe' },
        { key: 'datum', label: 'Datum', type: 'date', width: '10rem', aria_label: 'Datum der Probenahme' },
        { key: 'x_value', label: 'x_i', type: 'number', required: true, unit: 'mg/l', aria_label: 'Einzelergebnis x_i in mg/l' },
      ],
      sum_column: { key: 'x_value', label: 'Σ x_i', unit: 'mg/l' },
      footer: ['n_hist', 'x_mean_calc', 's_calc'],
    },
    verification_quote: Q.L807_810,
  }),
  WS07({
    symbol: 'K_table', widget: 'lookup_fill',
    lookup: { table_code: 'S16_4_K', edition: ISO5667_1_EDITION, role: 'value', keys: [{ column: 'confidence_level', from_symbol: 'confidence_level' }], value: 'k' },
    ui_config: { source_label: '§16.4-Tabelle' },
    create: {
      section_code: 'C', label_de: 'Faktor K laut §16.4-Tabelle', data_type: 'number',
      clause_reference: '§16.4',
      description: 'Plan 3: K aus der gedruckten §16.4-Tabelle zum gewählten Vertrauensniveau (locked). Zwilling neben dem bestehenden Pflichtfeld K — die Umstellung von K selbst auf lookup_fill ist STAGED (iso5667_1-E-1), weil eine locked-Tabelle das Eingabefeld ausblendet und K ohne gewähltes Vertrauensniveau sonst weder gefüllt noch tippbar wäre.',
    },
    verification_quote: Q.L837_840,
  }),
  WS07({ symbol: 'confidence_level', widget: 'select_one', enum_values: 'keep_prod', verification_quote: Q.L799_805 }),
  WS07({
    symbol: 'x_mean_calc', widget: 'derived',
    create: { section_code: 'B', label_de: 'Arithmetisches Mittel x̄ (aus Einzelergebnissen)', data_type: 'number', unit: 'mg/l', clause_reference: '§16.4', description: 'Plan 3: x̄ aus dem Register historical_results (ISO-5667-1-07-D1); Zwilling des Eingabefelds x_mean — Ablösung STAGED (iso5667_1-D-23).' },
    verification_quote: Q.L807_810,
  }),
  WS07({
    symbol: 'n_hist', widget: 'derived',
    create: { section_code: 'B', label_de: 'Anzahl vorliegender Einzelergebnisse n', data_type: 'number', clause_reference: '§16.4', description: 'Plan 3: Anzahl der Zeilen in historical_results (ISO-5667-1-07-D2); NICHT das n aus Gl. 3 (erforderliche Probenanzahl) — iso5667_1-R-1.' },
    verification_quote: Q.L807_810,
  }),
  WS07({
    symbol: 's_calc', widget: 'derived',
    create: { section_code: 'B', label_de: 'Standardabweichung s (Stichprobe, n − 1)', data_type: 'number', unit: 'mg/l', clause_reference: '§16.4', description: 'Plan 3: s = stdev_rows(historical_results, x_value) — die Stichprobenform mit dem gedruckten Nenner n − 1 (ISO-5667-1-07-D3). Zwilling der prod-Gleichung 1, deren SUM()-Form die Engine nicht auswerten kann; die Ersetzung ist STAGED (iso5667_1-R-2).' },
    verification_quote: Q.L813_822,
  }),

  // =========================================================================
  // ISO-5667-1-08 — Durchflussmessung: the §19 aspect switch + the §21 method register
  // =========================================================================
  WS08({ symbol: 'flow_direction', widget: 'select_one', enum_values: 'keep_prod', visible_when: ASPECT_DIRECTION, verification_quote: Q.L949_954 }),
  WS08({ symbol: 'flow_velocity', widget: 'scalar', visible_when: ASPECT_VELOCITY_OR_DISCHARGE, verification_quote: Q.L963_972 }),
  WS08({ symbol: 'discharge_rate', widget: 'scalar', visible_when: ASPECT_DISCHARGE, verification_quote: Q.L974_978 }),
  WS08({
    symbol: 'flow_measurements', widget: 'register',
    create: {
      section_code: 'E', label_de: 'Durchflussmessungen je Messstelle', data_type: 'json',
      clause_reference: '§19.1, §21',
      description: 'Plan 3: eine Zeile je Messstelle mit Strömungsaspekt und gewähltem Verfahren; die Spalte §21 prüft gegen den gedruckten Verfahrenskatalog S21 (Ablösung der Skalare flow_measurement_method / flow_measurement_mode / flow_velocity / discharge_rate / flow_aspect STAGED, iso5667_1-D-18 … D-22).',
    },
    ui_config: {
      title: 'Durchflussmessungen (§19.1 / §21)',
      subtitle: '§19.1: „Hay tres aspectos del flujo que es necesario medir“ — Richtung, Geschwindigkeit, Abfluss; §21 listet je Aspekt die verfügbaren Verfahren.',
      add_label: '+ Messstelle',
      columns: [
        { key: 'kennung', label: 'Messstelle', type: 'text', required: true, width: '9rem', aria_label: 'Kennung der Durchflussmessstelle' },
        {
          key: 'aspect', label: 'Strömungsaspekt', type: 'enum', required: true, discriminator: true, options: opt(FLOW_ASPECT_TOKENS),
          option_labels: { direction: 'Richtung (Dirección del flujo)', velocity: 'Geschwindigkeit (Velocidad del flujo)', discharge: 'Abfluss (Tasa de flujo)' },
          aria_label: 'Zu messender Strömungsaspekt (§19.1)',
        },
        {
          key: 'method', label: 'Verfahren', type: 'enum', required: true, options: opt(FLOW_METHOD_TOKENS), sort_by_label: true,
          option_labels: {
            drogue: 'Dragas (Schleppkörper) — §21.2 a)', float_trawl: 'Flotadores y barcos con redes rastreras — §21.2 b)',
            chemical_tracer: 'Trazas químicas (incl. tinturas) — §21.2 c)', microbiological_tracer: 'Trazadores microbiológicos — §21.2 d)',
            radioactive_tracer: 'Trazadores radiactivos — §21.2 e)', current_meter: 'Medidores de la corriente — §21.3 a)',
            ultrasonic: 'Técnicas ultrasónicas — §21.3 b) / §21.4 d) 4)', electromagnetic: 'Técnicas electromagnéticas — §21.3 c) / §21.4 d) 4)',
            pneumatic: 'Técnicas neumáticas — §21.3 d)', weir_level: 'Wasserstand über Einengung (Wehr) — §21.4 c)',
            venturi: 'Venturi-Düse — §21.4 d) 1)', orifice_plate: 'Blende (placa de orificio) — §21.4 d) 2)',
            pumping_rate: 'Pumpenförderstrom × Dauer — §21.4 d) 3)', dilution_gauging: 'Calibrador de dilución — §21.4 e)',
            mechanical: 'Medios mecánicos directos — §21.4 b)',
          },
          aria_label: 'Durchflussmessverfahren nach §21',
        },
        { key: 'method_ok', label: '§21', type: 'derived', expr: METHOD_OK_EXPR, display: 'badge', value_labels: { '1': '§21: Verfahren für diesen Aspekt gedruckt', '0': '§21: Verfahren für diesen Aspekt nicht gedruckt' } },
        {
          key: 'mode', label: 'Messmodus', type: 'enum', options: opt(FLOW_MODE_TOKENS),
          option_labels: { discrete: 'diskret (discretas — Flotadores, Direktanzeige)', continuous: 'kontinuierlich (continuas — Durchflussmesser)' },
          aria_label: 'Messmodus nach §21.1',
        },
        { key: 'velocity_measured', label: 'v (m/s)', type: 'number', unit: 'm/s', visible_when: "aspect IN {'velocity', 'discharge'}", aria_label: 'Gemessene Strömungsgeschwindigkeit in m/s' },
        { key: 'discharge_measured', label: 'Q (m³/s)', type: 'number', unit: 'm3/s', visible_when: "aspect == 'discharge'", aria_label: 'Gemessener Abfluss in m³/s' },
      ],
      footer: ['flow_measurements_count'],
    },
    verification_quote: Q.L941_947,
  }),
  WS08({
    symbol: 'flow_measurements_count', widget: 'derived',
    create: { section_code: 'E', label_de: 'Anzahl Durchflussmessstellen', data_type: 'number', clause_reference: '§19.1', description: 'Plan 3: Anzahl der erfassten Durchflussmessstellen (ISO-5667-1-08-D1).' },
    verification_quote: Q.L941_947,
  }),
];

/** The standard prints no whole-worksheet applicability rule — no section rule is emitted. */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

const _module: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
export default _module;
