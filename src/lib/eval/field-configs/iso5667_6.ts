/**
 * ISO-5667-6 — Plan 3 Task 23 field configs (sampling points / heterogeneity samples /
 * travel-time runs / increments registers, the §13.1 report checklist, the Annex-A
 * roughness hint + Chézy fill, the travel-time / continuous / incremental / mixing /
 * bridge / legal-purpose visibility) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts iso5667_6`.
 *
 * Every `verification_quote` is a span of the SPANISH transcript
 * `Desktop\Ciruclar economy, sustanability and water test\ISO 5667-6\ISO-5667-6-2015.txt`
 * (NCh-ISO 5667/6:2015 = ISO 5667-6:2014, INN licence copy; VC grade — no PDF exists),
 * lifted by line range into `regulation-tables-quotes-iso5667_6.ts` (the line range is
 * the constant's name; clause numbers in the comments). Labels are German as prod's
 * are, with the printed Spanish term where it helps. Prod facts come from the captured
 * `iso5667_6.prior.json` (2026-09-18, read-only): section codes are single letters
 * (-02 B "Input Parameters", C "River-System Characteristics"; -03 B "Input Parameters",
 * C "Mixing (vertical / lateral / longitudinal)", D "Non-homogeneous Sites"; -04 A
 * "Purpose / Regulatory Context", B "Input Parameters", K "Notes / Assumptions"; -07 C
 * "Specific-Location Techniques"; -08 B / C "Method / Equipment Rules"; -09 C "Sampling
 * Procedure"; -10 C "Security & Traceability"; -11 C "Analytical Report Items"; -13 B
 * "Input Parameters", C "Mixing-Distance Calculation").
 *
 * Placement rule (a262e trap 1): every rule / fill / register sits on the worksheet
 * where its driver resolves — `travel_time_required` on -04, `sampling_strategy` on -05,
 * `sampling_location_type` on -07 (inherited on -09 only), `sampling_method` on -08
 * (inherited on -09), `sampling_mode` on -09, `legal_purpose_sample` on -10,
 * `mixing_relevant` on -03 (inherited on -13 — the two created -13 fields key on it;
 * the -02 register carries its OWN `mixing_relevant` column per point).
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/iso5667_6-STAGED-plan3-rulings.sql):
 *   - hiding `inlet_velocity` under the continuous method (CR-017 reads it — gate-aware
 *     guard refuses) → iso5667_6-G-1; `travel_time_method` / `travel_time_flows_count`
 *     under `travel_time_required` (CR-009) → G-3; `cycle_coincidence_avoided` under the
 *     systematic strategy (CR-011) → G-4; `increment_total_time` under the incremental
 *     mode (CR-021) → G-5; `bridge_checks_passed` under the bridge type (CR-015) → G-6 —
 *     each block carries the IF-guarded gate rewrite AND the hide as its follow-up;
 *   - the -13 section rules B / C ← `mixing_relevant == true`: the transitive producer
 *     guard refuses them (b / c / g / d → Eq. A.1 l, consumed by -03) → iso5667_6-C-1;
 *   - a `l_mixing_calc` twin of Eq. A.1: the printed formula block loses its radical
 *     (√g vs 2g) → iso5667_6-U-1, nothing emitted; the numeric constant of g is not
 *     printed → iso5667_6-D-2 (owner ruling);
 *   - the retirement of the scalars the registers twin → the D-blocks; the switch of the
 *     prod single-value `report_item` to the created checklist → iso5667_6-D-1.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q } from '../regulation-tables-quotes-iso5667_6';
import { S13_1_ROWS, s131ItemFragments } from '../regulation-tables-seed-iso5667_6';

const STD = 'ISO-5667-6';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS02 = on('ISO-5667-6-02');
const WS03 = on('ISO-5667-6-03');
const WS04 = on('ISO-5667-6-04');
const WS07 = on('ISO-5667-6-07');
const WS08 = on('ISO-5667-6-08');
const WS09 = on('ISO-5667-6-09');
const WS10 = on('ISO-5667-6-10');
const WS11 = on('ISO-5667-6-11');
const WS13 = on('ISO-5667-6-13');

// ---- drivers (prod tokens as captured; booleans are `== true` in the DSL) ----
export const TRAVEL_TIME = 'travel_time_required == true';
export const CONTINUOUS = "sampling_method == 'continuous'";
export const INCREMENTAL = "sampling_mode == 'incremental'";
export const MIXING = 'mixing_relevant == true';
export const VERTICAL = "mixing_dimension == 'vertical'";
export const BRIDGE = "sampling_location_type == 'bridge'";
export const LEGAL = 'legal_purpose_sample == true';
// row-scope drivers of the sampling-point register (column names, same tokens as prod `sampling_location_type`)
export const ROW_BRIDGE = "location_type == 'bridge'";
export const ROW_WADING_OR_BANK = 'location_type IN {in_watercourse_wading, bank}';
export const ROW_UNDER_ICE = "location_type == 'under_ice'";
export const ROW_MIXING = 'mixing_relevant == true';
export const ROW_VERTICAL = "mixing_dimension == 'vertical'";

// ---- printed rules as expressions (single-sourced from the seeded tables) ----
/** §7.1 (L1168–L1169): ≥ 30 cm above the bed AND a similar distance below the surface (S7_1); 0 when either depth is not entered (decidable badge, never a null cell). */
export const DEPTH_OK_EXPR = "if(depth_below_surface_cm IS NULL OR height_above_bed_cm IS NULL, 0, if(depth_below_surface_cm >= lookup('S7_1', 'general', 'depth_below_surface_min_cm') AND height_above_bed_cm >= lookup('S7_1', 'general', 'height_above_bed_min_cm'), 1, 0))";

export const LOCATION_TYPES = ['bridge', 'in_watercourse_wading', 'bank', 'boat', 'under_ice'] as const; // prod sampling_location_type tokens (capture)
export const LOCATION_LABELS: Record<(typeof LOCATION_TYPES)[number], string> = {
  bridge: 'desde puentes (§7.2)',
  in_watercourse_wading: 'en el curso de agua — vadeo (§7.3)',
  bank: 'desde la orilla (§7.4)',
  boat: 'desde embarcaciones (§7.5)',
  under_ice: 'bajo hielo (§7.6)',
};
export const HOMOGENEITY_STATUS = ['homogeneous', 'non_homogeneous', 'untested'] as const; // prod homogeneity_status tokens (capture)
export const MIXING_DIMENSIONS = ['vertical', 'lateral', 'longitudinal'] as const; // prod mixing_dimension tokens (capture)
export const BRIDGE_POSITIONS = ['upstream', 'downstream'] as const; // prod bridge_position tokens (capture)
export const TRAVEL_TIME_METHODS = ['surface_floats', 'tracers', 'discharge_cross_section'] as const; // prod travel_time_method tokens (capture) = the three printed methods (L846–L849)
export const SAMPLING_MODES_INCREMENT = ['direct', 'indirect_dip_flask', 'through_ice', 'surface_film'] as const; // prod sampling_mode tokens minus `incremental` (an increment is taken by one of the other four modes)
/** §5.1.4 (L937–L939): the eleven printed determinants — an OPEN list ("Se deberían incluir otros determinantes …", L939–L940) ⇒ text + datalist, never a closed enum. */
export const HETEROGENEITY_DETERMINANTS = ['pH', 'conductividad', 'cloro', 'amoníaco', 'sólidos en suspensión', 'oxígeno disuelto', 'color', 'hierro', 'clorofila', 'carbono orgánico total', 'demanda bioquímica de oxígeno'] as const;
/** Anexo A EJEMPLO (L2180–L2181): the two printed bed descriptions = ANNEXA keys. */
export const ROUGHNESS_OPTIONS = [
  { value: 'muy_irregular', label_de: 'fondo muy irregular (sehr unregelmäßige Sohle — Beispiel c = 15)', order_index: 0 },
  { value: 'liso', label_de: 'fondo muy liso (sehr glatte Sohle — Beispiel c = 50)', order_index: 1 },
] as const;
/** §13.1 a) – q): value = the printed letter (S13_1 key), label = the printed item text (lifted; fragments asserted at build time). */
export const REPORT_ITEMS = S13_1_ROWS.map((r, i) => ({ value: r.item, label_de: `${r.item}) ${s131ItemFragments(r.item, r.quote).join(' ')}`, order_index: i }));

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- ISO-5667-6-02: sampling points as N instances (§5.1.1 coordinate, §7 location type with the per-type checks, §5.1.2 mixing, §5.1.4 homogeneity, §7.1 depths) ----
  WS02({
    symbol: 'sampling_points_6', widget: 'register',
    ui_config: {
      title: 'Probenahmepunkte (puntos de muestreo, §5.1 / §7)', subtitle: 'Je Probenahmepunkt eine Zeile: Kennung, Referenzkoordinate (§5.1.1), Tiefen, Ortstyp nach §7 mit den zugehörigen Prüfungen (Brücke §7.2, Vadeo/Ufer §7.3–7.4 + §15, Eis §7.6 + §15), Homogenität (§5.1.4), Mischung (§5.1.2), Position ≥ 30 cm über Sohle / unter Oberfläche (§7.1)', add_label: '+ Probenahmepunkt', placement: 'section',
      columns: [
        { key: 'kennung', label: 'Kennung / ID', type: 'text', required: true, aria_label: 'Kennung des Probenahmepunkts' },
        { key: 'coordinate', label: 'Referenzkoordinate', type: 'text', aria_label: 'Coordenada de referencia (ISO 19112)' },
        { key: 'depths', label: 'Probenahmetiefen', type: 'text', aria_label: 'Probenahmetiefen des Punkts' },
        { key: 'location_type', label: 'Ortstyp (§7)', type: 'enum', required: true, options: [...LOCATION_TYPES], option_labels: { ...LOCATION_LABELS }, discriminator: true, aria_label: 'Probenahme-Ortstyp' },
        // §7.2 bridges
        { key: 'bridge_position', label: 'Position am Puente', type: 'enum', options: [...BRIDGE_POSITIONS], option_labels: { upstream: 'aguas arriba del puente (bevorzugt)', downstream: 'aguas abajo del puente' }, visible_when: ROW_BRIDGE, aria_label: 'Aguas arriba o aguas abajo del puente' },
        { key: 'bridge_checks', label: 'Prüfungen a) – d) erfüllt', type: 'boolean', visible_when: ROW_BRIDGE, aria_label: 'Brückenprüfungen a) bis d) erfüllt (§7.2)' },
        // §7.3 wading / §7.4 bank (+ §15)
        { key: 'ppe_high_visibility', label: 'Warnschutz / Schwimmweste', type: 'boolean', visible_when: ROW_WADING_OR_BANK, aria_label: 'Warnschutzkleidung und Schwimmhilfe verwendet (§7.1 / §15)' },
        // §7.6 under ice (+ §15)
        { key: 'ice_safety', label: 'Eissicherheit geprüft', type: 'boolean', visible_when: ROW_UNDER_ICE, aria_label: 'Eisdicke / Tragfähigkeit und Ausbildung geprüft (§7.6 / §15)' },
        // §5.1.4 / §5.1.2
        { key: 'homogeneity_status', label: 'Homogenität (§5.1.4)', type: 'enum', options: [...HOMOGENEITY_STATUS], option_labels: { homogeneous: 'distribuidos homogéneamente', non_homogeneous: 'distribución no homogénea', untested: 'sin pruebas (ungeprüft)' }, aria_label: 'Homogenitätsstatus des Punkts' },
        { key: 'mixing_relevant', label: 'Mischung relevant', type: 'boolean', aria_label: 'Mischung für das Probenahmeregime relevant (§5.1.2)' },
        { key: 'mixing_dimension', label: 'Mischungsdimension', type: 'enum', options: [...MIXING_DIMENSIONS], option_labels: { vertical: 'a) verticalmente', lateral: 'b) lateralmente', longitudinal: 'c) longitudinalmente' }, visible_when: ROW_MIXING, aria_label: 'Mischungsdimension (§5.1.2 a–c)' },
        { key: 'vertical_mixing_distance', label: 'Vertikale Mischdistanz', type: 'number', unit: 'm', min: 0, visible_when: ROW_VERTICAL, aria_label: 'Vertikale Mischdistanz in Metern' },
        // §7.1 position
        { key: 'depth_below_surface_cm', label: 'Tiefe unter Oberfläche', type: 'number', unit: 'cm', min: 0, aria_label: 'Probenahmetiefe unter der Oberfläche in cm' },
        { key: 'height_above_bed_cm', label: 'Höhe über Sohle', type: 'number', unit: 'cm', min: 0, aria_label: 'Höhe über der Gewässersohle in cm' },
        { key: 'depth_ok', label: '§7.1 Position', type: 'derived', expr: DEPTH_OK_EXPR, display: 'badge', value_labels: { '1': '§7.1 ≥ 30 cm über Sohle und unter Oberfläche (Anhaltswert, iso5667_6-J-1)', '0': '§7.1 Position nicht erfüllt oder nicht eingetragen (Anhaltswert, iso5667_6-J-1)' } },
      ],
      footer: ['sampling_point_count_calc', 'points_depth_fail'],
      note: `${Q.L1168_1169} Die Spalten nach dem Ortstyp zeigen nur die Prüfungen des gewählten §7-Abschnitts; die Einzelfelder derselben Angaben auf ISO-5667-6-02 / -03 / -07 bleiben bis zur Ratifizierung (iso5667_6-D-4 … D-16). Die Lesarten „alrededor de 30 cm“ (§7.3–7.5) und „dentro de 30 cm“ (§8.1) sind iso5667_6-J-1.`,
    },
    verification_quote: `${Q.L651_653} — ${Q.L1165_1169}`,
    create: { section_code: 'B', label_de: 'Probenahmepunkte (je Punkt: Kennung, Koordinate, Tiefen, Ortstyp nach §7 mit Prüfungen, Homogenität, Mischung, Position ≥ 30 cm)', data_type: 'json', unit: null, clause_reference: '§5.1.1, §5.1.2, §5.1.4, §7.1–§7.6, §15',
      description: 'Plan 3: Zeilen je Probenahmepunkt mit den §7-Prüfungen je Ortstyp (Brücke: Position / Prüfungen a–d; Vadeo / Ufer: Warnschutz; Eis: Eissicherheit) und dem §7.1-Abstand (≥ 30 cm über Sohle, ≥ 30 cm unter Oberfläche, S7_1); Anzahl → sampling_point_count_calc (ISO-5667-6-02-D1), Zeilen mit nicht erfüllter Position → points_depth_fail (-D2). Die Einzelskalare sampling_point_count / sampling_depths (-02), reference_coordinate / homogeneity_status / mixing_* (-03), sampling_location_type / bridge_* / ppe_high_visibility / sampling_depth_below_surface / height_above_bed (-07) bleiben (iso5667_6-D-4 … D-16); ein Gate auf points_depth_fail ist STAGED (iso5667_6-G-9).' },
  }),
  WS02({
    symbol: 'sampling_point_count_calc', widget: 'derived', ui_config: null, verification_quote: Q.L651_653,
    create: { section_code: 'B', label_de: 'Anzahl Probenahmepunkte (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§5.1.1',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-6-02-D1 (count_rows über sampling_points_6); Zwilling des Eingabefelds sampling_point_count (iso5667_6-D-4).' },
  }),
  WS02({
    symbol: 'points_depth_fail', widget: 'derived', ui_config: null, verification_quote: Q.L1168_1169,
    create: { section_code: 'B', label_de: 'Probenahmepunkte mit nicht erfüllter §7.1-Position (< 30 cm über Sohle / unter Oberfläche oder nicht eingetragen)', data_type: 'number', unit: null, clause_reference: '§7.1',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-6-02-D2 (count_rows über sampling_points_6, depth_ok == 0); ein Gate darauf ist STAGED (iso5667_6-G-9) — CR-016 prüft heute nur den Skalar height_above_bed auf -07.' },
  }),

  // ---- ISO-5667-6-03: mixing visibility (driver on this worksheet) + the §5.1.4 heterogeneity test as rows ----
  WS03({ symbol: 'mixing_dimension', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: MIXING, verification_quote: `${Q.L728_730} — ${Q.L699_706}` }),
  WS03({ symbol: 'vertical_mixing_distance', widget: 'scalar', ui_config: null, visible_when: VERTICAL, verification_quote: Q.L744_749 }),
  WS03({
    symbol: 'heterogeneity_samples', widget: 'register',
    ui_config: {
      title: 'Heterogenitätsproben (§5.1.4)', subtitle: 'Je Probe eine Zeile: Nr., Durchfluss (caudal), Determinante, Messwert — etwa sechs Proben über den Querschnittsteil mit ≈ 90 % des Durchflusses, bei mindestens drei Durchflüssen (Minimum, Modal, Maximum)', add_label: '+ Probe', placement: 'section',
      columns: [
        { key: 'sample_no', label: 'Nr.', type: 'number', required: true, min: 1, aria_label: 'Probennummer' },
        { key: 'flow', label: 'Durchfluss (caudal)', type: 'number', required: true, min: 0, aria_label: 'Durchfluss bei der Probe' },
        { key: 'determinant', label: 'Determinante', type: 'text', datalist: [...HETEROGENEITY_DETERMINANTS], aria_label: 'Geprüfte Determinante' },
        { key: 'value', label: 'Messwert', type: 'number', required: true, aria_label: 'Messwert der Determinante' },
      ],
      footer: ['heterogeneity_samples_count_calc', 'heterogeneity_samples_ok', 'heterogeneity_spread'],
      note: `${Q.L897_899} ${Q.L904_905} Die Zahl der verschiedenen Durchflüsse (≥ 3) ist aus den Zeilen nicht berechenbar — kein distinct in der Ausdruckssprache (iso5667_6-F-1); heterogeneity_test_flows bleibt Handangabe. Die Spannweite (max − min) ist nur je Determinante sinnvoll (iso5667_6-J-3).`,
    },
    verification_quote: `${Q.L883_887} — ${Q.L897_905}`,
    create: { section_code: 'D', label_de: 'Heterogenitätsproben (je Probe: Nr., Durchfluss, Determinante, Messwert; §5.1.4)', data_type: 'json', unit: null, clause_reference: '§5.1.4',
      description: 'Plan 3: Zeilen je Heterogenitätsprobe; Anzahl → heterogeneity_samples_count_calc (ISO-5667-6-03-D1), Vergleich mit den „aproximadamente seis“ (S5_1_4, als ≥ 6 wie CR-008) → heterogeneity_samples_ok (-D2), Spannweite max − min → heterogeneity_spread (-D3). Die Einzelfelder heterogeneity_samples_count / heterogeneity_test_flows / heterogeneity_determinant bleiben (iso5667_6-D-17 … D-19); IF-Guard von CR-008 STAGED (iso5667_6-G-8).' },
  }),
  WS03({
    symbol: 'heterogeneity_samples_count_calc', widget: 'derived', ui_config: null, verification_quote: Q.L897_899,
    create: { section_code: 'D', label_de: 'Anzahl Heterogenitätsproben (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§5.1.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-6-03-D1 (count_rows über heterogeneity_samples); Zwilling des Eingabefelds heterogeneity_samples_count (iso5667_6-D-17).' },
  }),
  WS03({
    symbol: 'heterogeneity_samples_ok', widget: 'derived', ui_config: null, verification_quote: Q.L897_899,
    create: { section_code: 'D', label_de: 'Etwa sechs Proben erreicht (1 = ≥ 6, 0 = weniger)', data_type: 'number', unit: null, clause_reference: '§5.1.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-6-03-D2 — Anzahl der Zeilen ≥ S5_1_4.samples_approx (6; „aproximadamente seis muestras“, iso5667_6-J-2); Gate STAGED (iso5667_6-G-8).' },
  }),
  WS03({
    symbol: 'heterogeneity_spread', widget: 'derived', ui_config: null, verification_quote: Q.L899_903,
    create: { section_code: 'D', label_de: 'Spannweite der Messwerte (max − min) über die Heterogenitätsproben', data_type: 'number', unit: null, clause_reference: '§5.1.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-6-03-D3 (max_rows − min_rows über heterogeneity_samples.value); Hilfsgröße für die statistische Beurteilung („es necesario un análisis estadístico de los resultados“) — nur je Determinante sinnvoll (iso5667_6-J-3); homogeneity_status bleibt die Entscheidung des Ingenieurs.' },
  }),

  // ---- ISO-5667-6-04: travel time (§5.1.3) — runs as rows, the extrapolation twin, visibility under the requirement ----
  WS04({
    symbol: 'travel_time_runs', widget: 'register',
    ui_config: {
      title: 'Fließzeitmessungen (tiempo de viaje, §5.1.3)', subtitle: 'Je Messung eine Zeile: Durchfluss, Methode (flotadores de superficie / trazadores / medición del caudal), Fließzeit — Messungen bei mindestens fünf verschiedenen Durchflüssen', add_label: '+ Messung', placement: 'section',
      columns: [
        { key: 'flow', label: 'Durchfluss (caudal)', type: 'number', required: true, min: 0, aria_label: 'Durchfluss der Fließzeitmessung' },
        { key: 'method', label: 'Methode', type: 'enum', options: [...TRAVEL_TIME_METHODS], option_labels: { surface_floats: 'flotadores de superficie (ISO 748)', tracers: 'trazadores (ISO 9555)', discharge_cross_section: 'medición del caudal con áreas de sección transversal (ISO 748 / ISO 1070)' }, aria_label: 'Methode der Fließzeitmessung' },
        { key: 'travel_time_min', label: 'Fließzeit', type: 'number', unit: 'min', required: true, min: 0, aria_label: 'Gemessene Fließzeit in Minuten' },
      ],
      footer: ['travel_time_flows_count_calc', 'travel_time_flows_ok', 'travel_time_extrapolation_max'],
      note: `${Q.L859_863} Die Einzelfelder travel_time_method / travel_time_flows_count bleiben (iso5667_6-D-20 / D-21); CR-009 liest heute den Skalar — Umstellung STAGED (iso5667_6-G-3).`,
    },
    visible_when: TRAVEL_TIME, // §5.1.3 — the travel-time data are needed only when the programme requires them (prod driver travel_time_required, -04 A)
    verification_quote: `${Q.L846_849} — ${Q.L859_863}`,
    create: { section_code: 'B', label_de: 'Fließzeitmessungen (je Messung: Durchfluss, Methode, Fließzeit; §5.1.3 ≥ 5 Durchflüsse)', data_type: 'json', unit: null, clause_reference: '§5.1.3',
      description: 'Plan 3: Zeilen je Fließzeitmessung; Anzahl → travel_time_flows_count_calc (ISO-5667-6-04-D1), Vergleich mit den fünf des §5.1.3 (S5_1_3.flows_min) → travel_time_flows_ok (-D2), die gedruckte Extrapolationsgrenze 10 % → travel_time_extrapolation_max (-D3). Die Einzelskalare bleiben (iso5667_6-D-20 … D-22); IF-Guard von CR-009 STAGED (iso5667_6-G-3).' },
  }),
  WS04({
    symbol: 'travel_time_flows_count_calc', widget: 'derived', ui_config: null, visible_when: TRAVEL_TIME, verification_quote: Q.L859_863,
    create: { section_code: 'B', label_de: 'Anzahl Fließzeitmessungen (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§5.1.3',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-6-04-D1 (count_rows über travel_time_runs); Zwilling des Eingabefelds travel_time_flows_count (iso5667_6-D-21).' },
  }),
  WS04({
    symbol: 'travel_time_flows_ok', widget: 'derived', ui_config: null, visible_when: TRAVEL_TIME, verification_quote: Q.L859_863,
    create: { section_code: 'B', label_de: 'Mindestens fünf Durchflüsse gemessen (1 = erfüllt, 0 = nicht erfüllt)', data_type: 'number', unit: null, clause_reference: '§5.1.3',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-6-04-D2 — Anzahl der Zeilen ≥ S5_1_3.flows_min (5, „un mínimo de cinco caudales diferentes“); Gate STAGED (iso5667_6-G-3).' },
  }),
  WS04({
    symbol: 'travel_time_extrapolation_max', widget: 'derived', ui_config: null, visible_when: TRAVEL_TIME, verification_quote: Q.L859_863,
    create: { section_code: 'K', label_de: 'Gedruckte Extrapolationsgrenze nach §5.1.3 (10 %)', data_type: 'number', unit: '%', clause_reference: '§5.1.3',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-6-04-D3 (S5_1_3.extrapolation_max_pct = 10) — Zwilling neben dem Eingabefeld travel_time_extrapolation_limit (iso5667_6-D-22); scalar-only, nicht serverseitig materialisiert (iso5667_6-I-1).' },
  }),
  WS04({ symbol: 'travel_time_extrapolation_limit', widget: 'scalar', ui_config: null, visible_when: TRAVEL_TIME, verification_quote: Q.L859_863 }),

  // ---- ISO-5667-6-07: the bridge position is meaningful only for a bridge site (driver on this worksheet; bridge_checks_passed ← CR-015 is G-6) ----
  WS07({ symbol: 'bridge_position', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: BRIDGE, verification_quote: `${Q.L1194_1195} — ${Q.L1210_1212}` }),

  // ---- ISO-5667-6-08: the continuous-system rules (§8.2 / §9.4) show only for the continuous method (inlet_velocity ← CR-017 is G-1) ----
  WS08({ symbol: 'isokinetic_conditions', widget: 'attestation', ui_config: null, visible_when: CONTINUOUS, verification_quote: `${Q.L1402_1404} — ${Q.L1420_1424}` }),
  WS08({ symbol: 'automatic_sampler_mode', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: CONTINUOUS, verification_quote: `${Q.L1531_1535} — ${Q.L1545_1549}` }),

  // ---- ISO-5667-6-09: increments as rows (§10.8) under the incremental mode; the preservative-bottle driver (§10.3 / §10.9) ----
  WS09({
    symbol: 'increments', widget: 'register',
    ui_config: {
      title: 'Inkremente der Probe (muestreo mediante incrementos, §10.8)', subtitle: 'Je Inkrement eine Zeile: Uhrzeit, Modus, Flasche, Konservierungsmittel, Dauer — die Gesamtzeit aller Inkremente soll < 5 min bleiben, wenn keine Änderung der Zusammensetzung bekannt ist', add_label: '+ Inkrement', placement: 'section',
      columns: [
        { key: 'time', label: 'Uhrzeit (HH:MM)', type: 'text', placeholder: '08:05', aria_label: 'Uhrzeit des Inkrements' },
        { key: 'mode', label: 'Modus', type: 'enum', options: [...SAMPLING_MODES_INCREMENT], option_labels: { direct: 'muestreo directo (§10.4)', indirect_dip_flask: 'muestreo indirecto — frasco (§10.5)', through_ice: 'a través de hielo (§10.6)', surface_film: 'películas o capas superficiales (§10.7)' }, aria_label: 'Probenahmemodus des Inkrements' },
        { key: 'bottle', label: 'Flasche / Behälter', type: 'text', aria_label: 'Flasche oder Behälter des Inkrements' },
        { key: 'preservative', label: 'Konservierungsmittel', type: 'boolean', aria_label: 'Konservierungsmittel enthalten oder zugegeben' },
        { key: 'duration_min', label: 'Dauer', type: 'number', unit: 'min', required: true, min: 0, aria_label: 'Dauer des Inkrements in Minuten' },
      ],
      footer: ['increment_total_time_calc', 'increment_time_ok'],
      note: `${Q.L1765_1768} Das Eingabefeld increment_total_time bleibt (iso5667_6-D-23); CR-021 liest heute den Skalar — Umstellung STAGED (iso5667_6-G-5).`,
    },
    visible_when: INCREMENTAL, // §10.8 — increments exist only in the incremental mode (prod driver sampling_mode, -09 C)
    verification_quote: Q.L1765_1768,
    create: { section_code: 'C', label_de: 'Inkremente (je Inkrement: Uhrzeit, Modus, Flasche, Konservierungsmittel, Dauer; §10.8 Gesamtzeit < 5 min)', data_type: 'json', unit: null, clause_reference: '§10.8',
      description: 'Plan 3: Zeilen je Inkrement; Σ Dauer → increment_total_time_calc (ISO-5667-6-09-D1), Vergleich mit den 5 min des §10.8 (S10_8) → increment_time_ok (-D2). Die Einzelskalare increment_total_time / field_preservative_added / sampling_mode bleiben (iso5667_6-D-23 … D-25); IF-Guard von CR-021 STAGED (iso5667_6-G-5).' },
  }),
  WS09({
    symbol: 'increment_total_time_calc', widget: 'derived', ui_config: null, visible_when: INCREMENTAL, verification_quote: Q.L1765_1768,
    create: { section_code: 'C', label_de: 'Gesamtzeit der Inkremente (Σ aus dem Register)', data_type: 'number', unit: 'min', clause_reference: '§10.8',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-6-09-D1 (sum_rows über increments.duration_min); Zwilling des Eingabefelds increment_total_time (iso5667_6-D-23).' },
  }),
  WS09({
    symbol: 'increment_time_ok', widget: 'derived', ui_config: null, visible_when: INCREMENTAL, verification_quote: Q.L1765_1768,
    create: { section_code: 'C', label_de: 'Gesamtzeit der Inkremente unter 5 min (1 = ja, 0 = nein)', data_type: 'number', unit: null, clause_reference: '§10.8',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-6-09-D2 — Σ Dauer < S10_8.total_time_max_min (5, „debería ser menor que 5 min“); Gate STAGED (iso5667_6-G-5).' },
  }),
  WS09({
    symbol: 'bottle_contains_preservative', widget: 'attestation', ui_config: null, verification_quote: `${Q.L1657_1658} — ${Q.L1772_1773}`,
    create: { section_code: 'C', label_de: 'Probenflaschen enthalten bereits Konservierungsmittel (nicht spülen, §10.3 / §10.9)', data_type: 'boolean', unit: null, clause_reference: '§10.3, §10.9',
      description: 'Plan 3: Treiber der §10.3-Regel „las botellas de muestra no se enjuaguen si contienen conservantes“ (der Brief nennt bottle_contains_preservative; im Prod-Bestand gibt es nur field_preservative_added = im Feld zugegeben, §10.9) — das Gate darauf ist STAGED (iso5667_6-G-2, Lesart iso5667_6-J-4).' },
  }),

  // ---- ISO-5667-6-10: the legal-purpose regulations note (§11.3.2) ----
  WS10({
    symbol: 'legal_custody_regulations', widget: 'scalar', ui_config: null, visible_when: LEGAL, verification_quote: `${Q.L1852_1854} — ${Q.L1856_1857}`,
    create: { section_code: 'C', label_de: 'Anzuwendende Regelungen für Proben mit rechtlichem Zweck (reglamentos según jurisdicción, §11.3.2)', data_type: 'text', unit: null, clause_reference: '§11.3.2',
      description: 'Plan 3: Freitext für die je Rechtsordnung anzuwendenden Regelungen („pueden ser mucho más complicados dependiendo del sistema legal“) — nur bei rechtlichem Zweck sichtbar; die Norm druckt keine Liste (der Brief nennt chain_of_custody_*-Felder, die im Prod-Bestand nicht existieren — iso5667_6-O-1).' },
  }),

  // ---- ISO-5667-6-11: the §13.1 report items as a checklist (replaces the single-value enum — D-1) ----
  WS11({
    symbol: 'report_items_6', widget: 'select_many',
    ui_config: {
      title: 'Elemente des Probenahmeberichts (§13.1 a) – q))', subtitle: '„Los asuntos que se podrían considerar para su inclusión son:“ — ankreuzen, was der Bericht enthält', note: `${Q.L1946_1948} Das Einzelfeld report_item (ein Element je Auswahl) bleibt bis zur Ratifizierung (iso5667_6-D-1); ein Vollständigkeits-Gate neben CR-027 ist STAGED (iso5667_6-G-7 — der Materialisierer liest keine Checklisten, iso5667_6-F-2).`,
      groups: [{ label: '§13.1 a) – q)', options: REPORT_ITEMS.map((m) => m.value) }],
    },
    enum_values: REPORT_ITEMS.map((m) => ({ value: m.value, label_de: m.label_de, order_index: m.order_index })),
    verification_quote: `${Q.L1946_1948} — ${Q.L1950}`,
    create: { section_code: 'C', label_de: 'Elemente des Probenahmeberichts (§13.1 a) – q), Mehrfachauswahl)', data_type: 'json', unit: null, clause_reference: '§13.1',
      description: 'Plan 3: Mehrfachauswahl über die siebzehn gedruckten Berichtselemente a) – q) (S13_1); das Einzelfeld report_item bleibt (iso5667_6-D-1); ein Vollständigkeits-Gate neben CR-027 ist STAGED (iso5667_6-G-7).' },
  }),

  // ---- ISO-5667-6-13: Annex A — roughness hint → Chézy example fill (both under mixing_relevant, inherited from -03) ----
  WS13({
    symbol: 'bed_roughness_hint', widget: 'select_one', ui_config: null,
    enum_values: [...ROUGHNESS_OPTIONS],
    visible_when: MIXING, verification_quote: `${Q.L2165} — ${Q.L2179_2183}`,
    create: { section_code: 'B', label_de: 'Sohlenbeschaffenheit nach dem Anexo-A-Beispiel (fondo muy irregular / fondo muy liso)', data_type: 'enum', unit: null, clause_reference: 'Anexo A EJEMPLO',
      description: 'Plan 3: Treiber des Anhaltswerts c_hint (ANNEXA: 15 bei sehr unregelmäßiger, 50 bei sehr glatter Sohle — die beiden gedruckten Extremwerte des Beispiels); der Chézy-Koeffizient c bleibt Eingabe im gedruckten Bereich 15 < c < 50 (SR-2).' },
  }),
  WS13({
    symbol: 'c_hint', widget: 'lookup_fill', ui_config: { source_label: 'Anexo A EJEMPLO (Anhaltswert)' },
    lookup: { table_code: 'ANNEXA', role: 'value', keys: [{ column: 'roughness', from_symbol: 'bed_roughness_hint' }], value: 'c_example' },
    visible_when: MIXING, verification_quote: `${Q.L2165} — ${Q.L2179_2183}`,
    create: { section_code: 'B', label_de: 'Chézy-Koeffizient nach dem Anexo-A-Beispiel (Anhaltswert; c bleibt Eingabe, 15 < c < 50)', data_type: 'number', unit: null, clause_reference: 'Anexo A EJEMPLO',
      description: 'Plan 3: aus der Sohlenbeschaffenheit gefüllt (anhaltswert — „(informativo)“, „se puede calcular aproximadamente“); das Eingabefeld c (Gleichung A.1) bleibt der Wert des Ingenieurs — die Norm druckt einen Bereich, keinen Punkt (SR-2); Ecuación (A.1) selbst wird nicht neu gefasst (iso5667_6-U-1).' },
  }),
];

/**
 * No section rules: the -13 B / C rules under `mixing_relevant == true` are refused by the transitive producer guard
 * (b / c / g / d → Eq. A.1 l, consumed by -03) → STAGED iso5667_6-C-1; every other ISO-5667-6 section either holds a
 * consumed / gate-read field or is field-less (A / J / K on most worksheets — an inert rule).
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
