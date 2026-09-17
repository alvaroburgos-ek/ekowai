/**
 * FLL-Naturteich — Plan 3 Task 8 field configs (registers, the created
 * `substrate_role` select, lookup_fills, visibility) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts fll_naturteich`.
 *
 * Every `verification_quote` is a span lifted verbatim (by line range) from the
 * PRIMARY transcript `Desktop\Supabase data\Guidelines knowledge markdown\
 * FLL-Guidelines natural pool.md` (2nd edition 2017, English translation); the
 * constants are exported by `regulation-tables-seed-fll_naturteich.ts` with
 * their line ranges. Prod facts come from the captured `fll_naturteich.prior.json`
 * (2026-09-17, read-only): 15 worksheets, each with the nine coded sections
 * A B C D F J K L M (fields live in B / C / D / F; 15 of 130 fields are orphans);
 * 6 equations (all `verified_against_standard`); 33 compliance rows. Enum tokens
 * are the captured prod `enum_values` (G-A3: table key strings equal them exactly).
 *
 * Placement decisions (codebase reality over the brief — each in the report §8
 * and on the sign-off sheet):
 *   - `natural_pool_type` (FLLNT-03) is consumed by -06, -09, -10, -11, -12, -14
 *     but NOT by -04 or -05: the Tab.-8 P-limit fills and the swimming-row
 *     checks of `wasserproben` on -04 read it and stay "Schlüssel fehlt" /
 *     `manual_required` until the consumer edit fll_naturteich-C-1; Tab. 9 on
 *     -05 keys on the CREATED `substrate_role` select (no dependency on -03);
 *   - every register and its Σ / count outputs live on the register's own
 *     worksheet (an equation sees a register of its own worksheet only, and a
 *     `create` never sets `consumer_worksheets`); feeding prod's
 *     `total_pool_area_m2` / EQ-PUWS / EQ-01 … EQ-05 is STAGED (R-1 … R-4);
 *   - the Tab.-9 limits are CREATED next to the driver on -05 (`*_tab9`), the
 *     existing measured inputs `filter_substrate_*` (-05, consumed by -10 / -15)
 *     and `filter_grain_size_max` / `filter_kf` (-10) keep their widgets — the
 *     brief's re-bind of consumed inputs to limit carriers is fll_naturteich-E-1
 *     (the a262e-E-3 / fll_gar-E-2 lesson: a fill on an existing input hides
 *     the engineer's value);
 *   - the Tab.-10 limits are CREATED on -09 next to the prod `hydrobot_type`
 *     (`*_tab10`); the existing `hydrobot_*` inputs (consumed by -11 / -15) stay
 *     the engineer's values (REQ-19 compares them to the literals — G-3);
 *   - the register `filtereinheiten` (-10) carries `hydrobot_type` as a plain
 *     ENUM column (prod tokens), not a `lookup_key` on TABLE10: the register
 *     override toggle binds to the FIRST lookup_key column (G-B2 / I-4) and must
 *     follow Tab. 15 (`grain_class`, anhaltswert), not Tab. 10 (locked);
 *   - `plant_species_list` (-12) is the Plan-1 selection register upgraded IN
 *     PLACE (UPDATE entry, same symbol): the Plan-1 column keys `art` / `zone` /
 *     `anzahl` are kept so stored rows survive (m1200_3 trap 6), the typed
 *     §10.4.3 columns are added.
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/fll_naturteich-STAGED-plan3-rulings.sql):
 *   - `visible_when` on consumed producers: -03 `p_binding_required` (consumed
 *     by -10 / -11), -11 `splash_water_tank_volume` (consumed by -15; EQ-05
 *     output) → fll_naturteich-C-2; the B / C / D (/ F) sections of -09 / -10
 *     hold consumed producers (`hydrobot_type`, `hydrobot_feed_rate`,
 *     `filter_flow_type`, `filter_colonized_surface_actual`, …) → the section
 *     rules cover the driver-free sections only (fll_naturteich-C-3);
 *   - the brief's `drainage_*` rule (§9.1): no drainage field exists in prod
 *     (REQ-14 is the attestation `attest_fllnt_06_req_14`) — nothing to hide;
 *   - the derivations of the manual enums `filter_flow_type` / `regeneration_
 *     technique` from the type (fll_naturteich-D-1 / -D-2) and every gate onto
 *     a created output (G-1 … G-7).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import {
  POOL_TYPE_TOKENS, HYDROBOT_TYPE_TOKENS, FLOW_DIRECTION_TOKENS, FLOW_TYPE_TOKENS, SUBSTRATE_ROLE_TOKENS, PLANT_GROUP_TOKENS, UNIT_KIND_TOKENS, ZONE_TOKENS, OVERFLOW_TYPE_TOKENS, SAMPLE_LOCATION_TOKENS, DIRECTION_LABELS, norm,
  Q_L735_738, Q_L765_768, Q_L1078_1081, Q_L1111_1133, Q_L1135_1151, Q_L1153_1171, Q_L1173_1176, Q_L1207_1212, Q_L1214_1220, Q_L1233_1234, Q_T2_SHARE, Q_T3_SHARE, Q_L1559_1560, Q_L1660_1661,
  Q_L1904, Q_T7_BODY, Q_L1938, Q_T8_BODY, Q_L1944_1948, Q_L1960_1961, Q_L1973_1978, Q_L2018_2022, Q_L2028, Q_L2042_2043, Q_L2045_2051, Q_L2053_2058, Q_L2060_2061, Q_L2063, Q_L2064_2065,
  Q_L2285_2286, Q_L2379_2380, Q_L2490_2493, Q_L2580_2582, Q_L2587, Q_L2607, Q_L2608, Q_L2611_2619, Q_L2632, Q_L2653_2654, Q_L2658_2661, Q_L2666, Q_L2695_2699, Q_L2737_2741, Q_L2769_2774, Q_L2784_2787, Q_L2788, Q_L2817_2821, Q_L2859_2862,
  Q_L2872, Q_L2879, Q_L2885_2886, Q_L2903_2904, Q_L2906_2912, Q_L2922_2924, Q_L2930, Q_L2935_2937, Q_L2947_2948, Q_L3049_3050, Q_L3051, Q_L3052, Q_L3053, Q_L3054, Q_L3055, Q_L4067_4070, Q_L4073_4080, Q_L4110, Q_L4111, Q_L4122,
} from '../regulation-tables-seed-fll_naturteich';

const STD = 'FLL-Naturteich';
export { POOL_TYPE_TOKENS, HYDROBOT_TYPE_TOKENS, FLOW_DIRECTION_TOKENS, FLOW_TYPE_TOKENS, SUBSTRATE_ROLE_TOKENS, PLANT_GROUP_TOKENS, UNIT_KIND_TOKENS, ZONE_TOKENS, OVERFLOW_TYPE_TOKENS, SAMPLE_LOCATION_TOKENS };

/** Prod `regeneration_technique` tokens (FLLNT-03, captured) — the `zonen.technique` column reuses them verbatim. */
export const REGENERATION_TECHNIQUE_TOKENS = ['hydrobotanical_submergent', 'hydrobotanical_emersed', 'substrate_filter_slow', 'substrate_filter_quick', 'technical_unit', 'physical_chemical'] as const;

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS03 = on('FLLNT-03');
const WS04 = on('FLLNT-04');
const WS05 = on('FLLNT-05');
const WS06 = on('FLLNT-06');
const WS09 = on('FLLNT-09');
const WS10 = on('FLLNT-10');
const WS11 = on('FLLNT-11');
const WS12 = on('FLLNT-12');

// ---- drivers / conditions (prod tokens) ----
export const TYPES_I_III = "natural_pool_type IN {'type_I', 'type_II', 'type_III'}";   // Tab. 1: Hydrobotanical system in the regeneration-area column of I / II / III (L1135–L1143)
export const TYPES_III_IV = "natural_pool_type IN {'type_III', 'type_IV'}";              // Tab. 1: Substrate filter in the regeneration-area column of III / IV (L1137–L1147)
export const NOT_HORIZONTAL = "filter_flow_direction != 'horizontal'";                    // Tab. 11 / 12: horizontal flow → "Individual verification, no further information"
export const EMERSED = "hydrobot_type == 'emersed'";                                       // Tab. 10: only the emersed column prints a water-column maximum (10 – 50 cm)

// ---- shared label maps ----
export const POOL_TYPE_LABELS: Record<(typeof POOL_TYPE_TOKENS)[number], string> = { type_I: 'Typ I', type_II: 'Typ II', type_III: 'Typ III', type_IV: 'Typ IV', type_V: 'Typ V' };
export const UNIT_KIND_LABELS: Record<(typeof UNIT_KIND_TOKENS)[number], string> = { hydrobotanical: 'Hydrobotanisches System (§10.2.1, Tab. 10)', substrate_filter: 'Substratfilter (§10.2.2 / 10.2.3, Tab. 11 / 12)', technical: 'Technische Einheit (§10.2.4, Herstellerangaben)' };
export const HYDROBOT_LABELS: Record<(typeof HYDROBOT_TYPE_TOKENS)[number], string> = { submergent: 'submergent', emersed: 'Emersed' }; // Tab. 10 column heads (L2600)
export const FLOW_TYPE_LABELS: Record<(typeof FLOW_TYPE_TOKENS)[number], string> = { slow: 'controlled slow flow (Tab. 11)', quick: 'controlled quick flow (Tab. 12)' };
export const ZONE_LABELS: Record<(typeof ZONE_TOKENS)[number], string> = { swimming: 'Schwimmbereich (swimming area)', regeneration: 'Regenerationsbereich (regeneration area — Pflanz-/Filterzone, nicht für Schwimmer zugänglich)', supplementary: 'Ergänzungsfläche (supplementary area — Wege, Liegeflächen; gehört nicht zur Wasserfläche)' };
export const TECHNIQUE_LABELS: Record<(typeof REGENERATION_TECHNIQUE_TOKENS)[number], string> = { hydrobotanical_submergent: 'hydrobotanisch, submergent', hydrobotanical_emersed: 'hydrobotanisch, emers', substrate_filter_slow: 'Substratfilter, langsam durchströmt', substrate_filter_quick: 'Substratfilter, schnell durchströmt', technical_unit: 'technische Einheit', physical_chemical: 'physikalisch/chemisch (nur ergänzend, §10.2.5)' };
export const PLANT_GROUP_LABELS: Record<(typeof PLANT_GROUP_TOKENS)[number], string> = { submerged: 'submerged plants (6 – 10 / m²)', marsh_small: 'half-height to tall marsh and aquatic plants (3 – 5 / m²)', marsh_medium: 'medium height to tall marsh and aquatic plants (5 – 7 / m²)', lilies: 'lilies and lily pads (depending on type)' };
export const SUBSTRATE_ROLE_LABELS: Record<(typeof SUBSTRATE_ROLE_TOKENS)[number], string> = { filter_iii: 'Filter substrate natural pool type III', filter_iv: 'Filter substrate natural pool type IV', plant: 'Plant substrate' }; // Tab. 9 column heads (L2034–L2040, de-hyphenated for display)
const OK = { '1': 'ok', '0': 'überschritten' } as const;
const OK_MIN = { '1': 'ok', '0': 'unterschritten' } as const;

// ---- register row expressions (the printed rule per column; every branch decidable on a complete row) ----
/** Tab. 7 (fill-up water, literal key 'all') vs Tab. 8 (swimming area) per parameter; the two type-split Tab.-8 parameters read TABLE8_P by the worksheet's natural_pool_type. */
const lim = (col: string) => `if(location == 'fill', lookup('TABLE7', 'all', '${col}'), lookup('TABLE8', 'all', '${col}'))`;
const limP = (col: string) => `if(location == 'fill', lookup('TABLE7', 'all', '${col}'), lookup('TABLE8_P', natural_pool_type, '${col}'))`;
/** Fill-water-only parameters (iron, manganese — Tab. 7 only) and the swimming-only nitrite (Tab. 8 only) are 1 on the other location. */
const FILL_ONLY_OK = (p: string, col: string) => `if(location == 'fill', if(${p} <= lookup('TABLE7', 'all', '${col}'), 1, 0), 1)`;
const SWIM_ONLY_OK = (p: string, col: string) => `if(location == 'swimming', if(${p} <= lookup('TABLE8', 'all', '${col}'), 1, 0), 1)`;
const WATER_PARAMS: Array<{ key: string; label: string; unit: string; lim: 'both' | 'both_p' | 'fill' | 'swim'; col: string; dir: 'max' | 'min' }> = [
  { key: 'ammonium', label: 'Ammonium', unit: 'mg/l', lim: 'both', col: 'ammonium_max', dir: 'max' },
  { key: 'iron', label: 'Eisen (Iron)', unit: 'mg/l', lim: 'fill', col: 'iron_max', dir: 'max' },
  { key: 'p_total', label: 'Gesamtphosphor (Ptotal)', unit: 'mg/l', lim: 'both_p', col: 'p_total_max', dir: 'max' },
  { key: 'hardness', label: 'Härte (total alkaline earth)', unit: 'mmol/l', lim: 'both', col: 'hardness_min', dir: 'min' },
  { key: 'conductivity', label: 'Leitfähigkeit bei 20 °C', unit: 'μS/cm', lim: 'both', col: 'conductivity_max', dir: 'max' },
  { key: 'manganese', label: 'Mangan (Manganese)', unit: 'mg/l', lim: 'fill', col: 'manganese_max', dir: 'max' },
  { key: 'nitrate', label: 'Nitrat', unit: 'mg/l', lim: 'both', col: 'nitrate_max', dir: 'max' },
  { key: 'nitrite', label: 'Nitrit', unit: 'mg/l', lim: 'swim', col: 'nitrite_max', dir: 'max' },
  { key: 'orthophosphate', label: 'Orthophosphat (als P)', unit: 'mg/l', lim: 'both_p', col: 'orthophosphate_max', dir: 'max' },
  { key: 'acid_capacity', label: 'Säurekapazität KS 4.3', unit: 'mmol/l', lim: 'both', col: 'acid_capacity_min', dir: 'min' },
];
const okExpr = (p: (typeof WATER_PARAMS)[number]): string => {
  if (p.lim === 'fill') return FILL_ONLY_OK(p.key, p.col);
  if (p.lim === 'swim') return SWIM_ONLY_OK(p.key, p.col);
  const limit = p.lim === 'both_p' ? limP(p.col) : lim(p.col);
  return p.dir === 'max' ? `if(${p.key} <= ${limit}, 1, 0)` : `if(${p.key} >= ${limit}, 1, 0)`;
};
const PH_OK = "if(ph >= if(location == 'fill', lookup('TABLE7', 'all', 'ph_min'), lookup('TABLE8', 'all', 'ph_min')) AND ph <= if(location == 'fill', lookup('TABLE7', 'all', 'ph_max'), lookup('TABLE8', 'all', 'ph_max')), 1, 0)";
export const SAMPLE_OK = `if(${[...WATER_PARAMS.map((p) => `${p.key}_ok == 1`), 'ph_ok == 1'].join(' AND ')}, 1, 0)`;

/** filtereinheiten — Tab. 10 (hydrobotanical, by the prod hydrobot_type token) / Tab. 11 (slow) / Tab. 12 (quick) by the prod flow-direction token; technical units carry no printed limit (manufacturer, L2879). */
export const LAYER_MIN_EXPR = "if(unit_kind == 'hydrobotanical', lookup('TABLE10', hydrobot_type, 'substrate_min_cm'), if(unit_kind == 'substrate_filter', if(flow_type == 'slow', lookup('TABLE11', flow_direction, 'layer_min_cm'), lookup('TABLE12', flow_direction, 'layer_min_cm')), 0))";
export const LAYER_OK_EXPR = "if(unit_kind == 'technical', 1, if(unit_kind == 'substrate_filter' AND flow_direction == 'horizontal', 1, if(unit_kind == 'hydrobotanical', if(layer_cm >= layer_min AND layer_cm <= lookup('TABLE10', hydrobot_type, 'substrate_max_cm'), 1, 0), if(layer_cm >= layer_min, 1, 0))))";
/** EQ-02's printed form (App. 5 Ex. 1, L4078–L4080: 600 m2/m3 x 15 m2 x 0.7 m = 6300 m2) per substrate row; `/ 100` is cm → m (structural); technical units: the manufacturer's colonizable surface; hydrobotanical: 0 (Tab. 10 prints no grain surface). */
export const COLONIZED_EXPR = "if(unit_kind == 'substrate_filter', surface_m2_m3 * area_m2 * layer_cm / 100, if(unit_kind == 'technical', if(colonized_manual_m2 IS NULL, 0, colonized_manual_m2), 0))";
export const FEED_LIMIT_EXPR = "if(unit_kind == 'hydrobotanical', lookup('TABLE10', hydrobot_type, 'feed_rate_qmax'), if(unit_kind == 'substrate_filter', if(flow_type == 'slow', lookup('TABLE11', flow_direction, 'feed_rate_qmax'), lookup('TABLE12', flow_direction, 'feed_rate_qmin')), 0))";
/** Qmax (Tab. 10 / 11) is an upper bound, Qmin (Tab. 12) a lower bound; horizontal / technical rows and rows without a feed rate are not counted (no printed value to compare). */
export const FEED_OK_EXPR = "if(feed_rate IS NULL, 1, if(unit_kind == 'technical', 1, if(unit_kind == 'substrate_filter' AND flow_direction == 'horizontal', 1, if(unit_kind == 'substrate_filter' AND flow_type == 'quick', if(feed_rate >= feed_limit, 1, 0), if(feed_rate <= feed_limit, 1, 0)))))";

/** zonen — underwater surface per row (ground + submerged walls, App. 5 Ex. 2: 50 + 45 = 95 m²); optional cells count 0. */
export const UNDERWATER_EXPR = 'if(ground_area_m2 IS NULL, 0, ground_area_m2) + if(wall_area_m2 IS NULL, 0, wall_area_m2)';

/** Tab.-9 limit fill created on FLLNT-05, keyed on the created `substrate_role` select. */
const tab9Fill = (symbol: string, value: string, label: string, unit: string | null, dataType: 'number' | 'text', quote: string, printed: string): FieldConfigEntry => WS05({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 9' },
  lookup: { table_code: 'TABLE9', role: 'limit', keys: [{ column: 'substrate_role', from_symbol: 'substrate_role' }], value },
  verification_quote: `${norm(Q_L2028)} — ${norm(quote)}`,
  create: { section_code: 'C', label_de: `${label} — Anforderung Tab. 9 (${printed})`, data_type: dataType, unit, clause_reference: '§7.2.3, Tab. 9',
    description: `Plan 3: Grenzwert aus TABLE9 zur gewählten Substratrolle (Filtersubstrat Typ III / Typ IV / Pflanzsubstrat; "no requirement" ⇒ leer); die gemessenen Werte filter_substrate_* / filter_grain_size_max / filter_kf bleiben Eingaben — Umbindung STAGED (fll_naturteich-E-1), Gate STAGED (fll_naturteich-G-2).` },
});
/** Tab.-10 limit fill created on FLLNT-09, keyed on the prod `hydrobot_type` select. */
const tab10Fill = (symbol: string, value: string, label: string, unit: string, quote: string, printed: string, visible_when: string | null = null): FieldConfigEntry => WS09({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 10' },
  lookup: { table_code: 'TABLE10', role: 'limit', keys: [{ column: 'hydrobot_type', from_symbol: 'hydrobot_type' }], value },
  visible_when,
  verification_quote: `${norm(Q_L2587)} — ${norm(quote)}`,
  create: { section_code: 'C', label_de: `${label} — Tab. 10 (${printed})`, data_type: 'number', unit, clause_reference: '§10.2.1, Tab. 10',
    description: `Plan 3: Grenzwert aus TABLE10 zur gewählten Regenerationstechnik (submergent / Emersed); die Eingaben hydrobot_water_column / hydrobot_substrate_thickness / hydrobot_grain_size_max / hydrobot_feed_rate bleiben — REQ-19 vergleicht heute mit den Literalen (fll_naturteich-G-3).` },
});

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- FLLNT-03 (Auswahl Naturteich-Typ): Tab.-1 fills keyed on the own natural_pool_type ----
  WS03({
    symbol: 'regeneration_share_min_pct', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1' },
    lookup: { table_code: 'TABLE1', role: 'limit', keys: [{ column: 'pool_type', from_symbol: 'natural_pool_type' }], value: 'regeneration_share_min_pct' },
    visible_when: TYPES_I_III,
    verification_quote: `${norm(Q_L1207_1212)} — ${norm(Q_L1559_1560)}`,
    create: { section_code: 'C', label_de: 'Mindestanteil Regenerationsfläche an der Gesamtwasserfläche — Tab. 1 (> 50 % Typ I / II · > 30 % Typ III)', data_type: 'number', unit: '%', clause_reference: '§5, Tab. 1',
      description: 'Plan 3: Grenzwert aus TABLE1 zum gewählten Typ; für Typ IV / V druckt Tab. 1 keinen Prozentsatz ("% indication irrelevant, design-related", Tab. 5 / 6) — ausgeblendet; der gemessene Anteil regeneration_area_share bleibt Eingabe, die Zonen-Ableitung regeneration_share_calc liegt auf FLLNT-06 (REQ-07-Umbindung STAGED fll_naturteich-G-1).' },
  }),
  WS03({
    symbol: 'regeneration_share_tab1_text', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1' },
    lookup: { table_code: 'TABLE1', role: 'value', keys: [{ column: 'pool_type', from_symbol: 'natural_pool_type' }], value: 'share_printed' },
    verification_quote: `${norm(Q_L1207_1212)} — ${norm(Q_L1214_1220)}`,
    create: { section_code: 'C', label_de: 'Regenerationsfläche im Verhältnis zur Gesamtfläche — Tab. 1 wie gedruckt', data_type: 'text', unit: null, clause_reference: '§5, Tab. 1',
      description: 'Plan 3: gedruckte Tab.-1-Zelle zum gewählten Typ ("> 50%" / "> 30%" / "information on construction based on design refer to Tab. 5 / Tab. 6").' },
  }),
  WS03({
    symbol: 'flow_tab1_text', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1' },
    lookup: { table_code: 'TABLE1', role: 'value', keys: [{ column: 'pool_type', from_symbol: 'natural_pool_type' }], value: 'flow_printed' },
    verification_quote: norm(Q_L1153_1171),
    create: { section_code: 'C', label_de: 'Durchströmung (Flow) — Tab. 1 wie gedruckt', data_type: 'text', unit: null, clause_reference: '§5, Tab. 1',
      description: 'Plan 3: gedruckte Tab.-1-Zelle "Flow" zum gewählten Typ (natural circulation … quick or slow controlled flow through the technical unit); die Ableitung des manuellen filter_flow_type auf FLLNT-10 ist STAGED (fll_naturteich-D-1).' },
  }),
  WS03({
    symbol: 'filter_operation_tab1_text', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1' },
    lookup: { table_code: 'TABLE1', role: 'value', keys: [{ column: 'pool_type', from_symbol: 'natural_pool_type' }], value: 'filter_operation' },
    verification_quote: norm(Q_L1173_1176),
    create: { section_code: 'C', label_de: 'Filterbetrieb in der Badesaison — Tab. 1 wie gedruckt', data_type: 'text', unit: null, clause_reference: '§5, Tab. 1',
      description: 'Plan 3: gedruckte Tab.-1-Zelle "Filter operation during swimming season" zum gewählten Typ (no filter / no filter, skimmer operation intermittently / intermittent/permanent / permanent / dependent on system).' },
  }),

  // ---- FLLNT-04 (Wasserqualität): dated samples per location with the Tab.-7 / Tab.-8 targets inline; Tab.-8 P limits keyed on the type ----
  WS04({
    symbol: 'wasserproben', widget: 'register',
    ui_config: {
      title: 'Wasseranalysen', subtitle: 'Tab. 7 (Füllwasser) / Tab. 8 (Schwimmbereich) — je Probe Datum, Ort und Parameter; Richtwerte je Zeile, P-Werte im Schwimmbereich nach Typ (I–III: ≤ 0.03 · IV / V: ≤ 0.01 mg/l)', add_label: '+ Probe', placement: 'section',
      columns: [
        { key: 'date', label: 'Datum', type: 'date', required: true },
        { key: 'location', label: 'Ort', type: 'enum', required: true, options: [...SAMPLE_LOCATION_TOKENS], option_labels: { fill: 'Füllwasser (Tab. 7)', swimming: 'Schwimmbereich (Tab. 8)' }, discriminator: true },
        ...WATER_PARAMS.map((p) => ({
          key: p.key, label: p.label, type: 'number' as const, unit: p.unit, required: true, min: 0, aria_label: `${p.label} der Probe`,
          ...(p.lim === 'fill' ? { visible_when: "location == 'fill'" } : p.lim === 'swim' ? { visible_when: "location == 'swimming'" } : {}),
        })),
        { key: 'ph', label: 'pH', type: 'number', unit: '-', required: true, min: 0, max: 14, aria_label: 'pH-Wert der Probe' },
        ...WATER_PARAMS.map((p) => ({ key: `${p.key}_ok`, label: `${p.label} ok`, type: 'derived' as const, expr: okExpr(p), display: 'badge' as const, value_labels: p.dir === 'max' ? OK : OK_MIN })),
        { key: 'ph_ok', label: 'pH ok', type: 'derived', expr: PH_OK, display: 'badge', value_labels: { '1': 'ok', '0': 'außerhalb' } },
        { key: 'sample_ok', label: 'Probe', type: 'derived', expr: SAMPLE_OK, display: 'badge', value_labels: { '1': 'alle Richtwerte eingehalten', '0': 'Richtwert abweichend' } },
      ],
      footer: ['sample_count', 'sample_violations'],
      note: norm(Q_L1973_1978),
    },
    verification_quote: `${norm(Q_L1904)} — ${norm(Q_L1938)} — ${norm(Q_L1973_1978)}`,
    create: { section_code: 'C', label_de: 'Wasseranalysen (Füllwasser / Schwimmbereich — Tab. 7 / Tab. 8 je Probe)', data_type: 'json', unit: null, clause_reference: '§7.1.1, Tab. 7; §7.1.2, Tab. 8',
      description: 'Plan 3: Zeilen je Probe (Datum, Ort, Ammonium, Eisen, P_total, Härte, Leitfähigkeit, Mangan, Nitrat, Nitrit, Orthophosphat, Säurekapazität, pH; Eisen / Mangan nur Füllwasser, Nitrit nur Schwimmbereich); je Zeile Vergleich mit TABLE7 / TABLE8 / TABLE8_P (P-Werte im Schwimmbereich nach natural_pool_type — unentscheidbar bis fll_naturteich-C-1); Anzahl → sample_count (FLLNT-04-D2), Verletzungen → sample_violations (FLLNT-04-D1); die 21 Skalare water_test_* / swimming_test_* bleiben (REQ-09 / REQ-10), Ablösung STAGED (fll_naturteich-G-4).' },
  }),
  WS04({ symbol: 'sample_count', widget: 'derived', ui_config: null, verification_quote: norm(Q_L1973_1978),
    create: { section_code: 'D', label_de: 'Anzahl vollständiger Wasseranalysen', data_type: 'number', unit: null, clause_reference: '§7.1.1 / §7.1.2', description: 'Plan 3: Ausgabe der Gleichung FLLNT-04-D2 (count_rows über wasserproben).' } }),
  WS04({ symbol: 'sample_violations', widget: 'derived', ui_config: null, verification_quote: `${norm(Q_T7_BODY)} — ${norm(Q_T8_BODY)}`,
    create: { section_code: 'D', label_de: 'Anzahl Wasseranalysen mit mindestens einem abweichenden Richtwert (Tab. 7 / Tab. 8)', data_type: 'number', unit: null, clause_reference: '§7.1.1, Tab. 7; §7.1.2, Tab. 8', description: 'Plan 3: Ausgabe der Gleichung FLLNT-04-D1 (count_rows über wasserproben mit sample_ok == 0); Gate == 0 STAGED (fll_naturteich-G-4).' } }),
  WS04({
    symbol: 'swimming_p_total_limit', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 8' },
    lookup: { table_code: 'TABLE8_P', role: 'limit', keys: [{ column: 'pool_type', from_symbol: 'natural_pool_type' }], value: 'p_total_max' },
    verification_quote: `${norm(Q_L1944_1948)} — ${norm(Q_L1973_1978)}`,
    create: { section_code: 'C', label_de: 'Gesamtphosphor im Schwimmbereich — Richtwert Tab. 8 nach Typ (I–III: ≤ 0.03 · IV / V: ≤ 0.01 mg/l)', data_type: 'number', unit: 'mg/l', clause_reference: '§7.1.2, Tab. 8',
      description: 'Plan 3: Grenzwert aus TABLE8_P zum Naturteich-Typ (FLLNT-03) — "Schlüssel fehlt", bis natural_pool_type auf FLLNT-04 vererbt ist (fll_naturteich-C-1); REQ-10 (auf FLLNT-03) trägt die Literale weiter (fll_naturteich-G-4).' },
  }),
  WS04({
    symbol: 'swimming_orthophosphate_limit', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 8' },
    lookup: { table_code: 'TABLE8_P', role: 'limit', keys: [{ column: 'pool_type', from_symbol: 'natural_pool_type' }], value: 'orthophosphate_max' },
    verification_quote: `${norm(Q_L1960_1961)} — ${norm(Q_L1973_1978)}`,
    create: { section_code: 'C', label_de: 'Orthophosphat (als P) im Schwimmbereich — Richtwert Tab. 8 nach Typ (I–III: ≤ 0.03 · IV / V: ≤ 0.01 mg/l)', data_type: 'number', unit: 'mg/l', clause_reference: '§7.1.2, Tab. 8',
      description: 'Plan 3: Grenzwert aus TABLE8_P zum Naturteich-Typ (FLLNT-03) — "Schlüssel fehlt", bis natural_pool_type auf FLLNT-04 vererbt ist (fll_naturteich-C-1).' },
  }),

  // ---- FLLNT-05 (Baustoffe): the created substrate-role select + the six Tab.-9 limits ----
  WS05({
    symbol: 'substrate_role', widget: 'select_one', ui_config: null,
    enum_values: SUBSTRATE_ROLE_TOKENS.map((t, i) => ({ value: t, label_de: SUBSTRATE_ROLE_LABELS[t], order_index: i })), // Tab. 9 column heads L2034–L2040
    verification_quote: `${norm(Q_L2028)} — ${norm(Q_L2042_2043)} — ${norm(Q_L2018_2022)}`,
    create: { section_code: 'C', label_de: 'Substratrolle nach Tab. 9 (Filtersubstrat Typ III / Filtersubstrat Typ IV / Pflanzsubstrat)', data_type: 'enum', unit: null, clause_reference: '§7.2.3, Tab. 9',
      description: 'Plan 3: Treiber der TABLE9-Spalte für die sechs Anforderungswerte (*_tab9); Tab. 9 druckt die drei Spalten als eigene Rollen — der Naturteich-Typ (FLLNT-03) ist auf FLLNT-05 nicht vererbt und legt die Rolle nicht allein fest (Pflanzsubstrat in jedem Typ).' },
  }),
  tab9Fill('grain_size_max_tab9', 'grain_max_mm', 'Empfohlene maximale Korngröße', 'mm', 'number', Q_L2042_2043, '16 / 32 / 8 mm'),
  tab9Fill('oversize_max_tab9', 'oversize_max_pct', 'Überkornanteil, maximal', '% by weight', 'number', Q_L2045_2051, '≤ 15 % / ≤ 15 % / –'),
  tab9Fill('fines_max_tab9', 'fines_max_pct', 'Abschlämmbare Anteile < 0.063 mm, maximal', '% by weight', 'number', Q_L2053_2058, '≤ 2 % / ≤ 0.5 % / –'),
  tab9Fill('kf_min_tab9', 'kf_min', 'Durchlässigkeitsbeiwert, mindestens', 'm/s', 'number', Q_L2060_2061, '≥ 10^-4 / ≥ 10^-3 / –'),
  tab9Fill('frost_resistance_tab9', 'frost_printed', 'Frostbeständigkeit', null, 'text', Q_L2063, 'is mandatory / is mandatory / no requirement'),
  tab9Fill('elutable_p_max_tab9', 'elutable_p_max', 'Eluierbarer Phosphor, maximal', 'mg P/kg', 'number', Q_L2064_2065, '≤ 5 / ≤ 5 / –'),

  // ---- FLLNT-06 (Flächenplanung): zones as rows, Σ areas / share / underwater surface / submerged share ----
  WS06({
    symbol: 'zonen', widget: 'register',
    ui_config: {
      title: 'Teilflächen (Zonen)', subtitle: '§3 / §5 Tab. 1 / §9.2 — je Zone Art, Fläche, Tiefe; Regenerationszonen mit Technik; Boden- und Wandflächen unter Wasser für die 50×-Regel (App. 5)', add_label: '+ Zone', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text', required: true },
        { key: 'zone', label: 'Zone', type: 'enum', required: true, options: [...ZONE_TOKENS], option_labels: ZONE_LABELS, discriminator: true },
        { key: 'area_m2', label: 'Fläche', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'Wasserfläche der Zone' },
        { key: 'depth_m', label: 'Wassertiefe', type: 'number', unit: 'm', min: 0, aria_label: 'Wassertiefe der Zone' },
        { key: 'ground_area_m2', label: 'Bodenfläche unter Wasser', type: 'number', unit: 'm²', min: 0, aria_label: 'Bodenfläche unter Wasser (App. 5)' },
        { key: 'wall_area_m2', label: 'Wandfläche unter Wasser', type: 'number', unit: 'm²', min: 0, aria_label: 'Wandfläche unter Wasser (App. 5)' },
        { key: 'technique', label: 'Regenerationstechnik', type: 'enum', required: true, options: [...REGENERATION_TECHNIQUE_TOKENS], option_labels: TECHNIQUE_LABELS, visible_when: "zone == 'regeneration'" },
        { key: 'underwater_m2', label: 'Unterwasserfläche', type: 'derived', expr: UNDERWATER_EXPR, unit: 'm²' },
      ],
      footer: ['total_pool_area_calc', 'regeneration_share_calc', 'pool_underwater_surface_calc', 'submerged_hydrobot_share_calc'],
      note: norm(Q_L1233_1234),
    },
    verification_quote: `${norm(Q_L735_738)} — ${norm(Q_L765_768)} — ${norm(Q_L2379_2380)} — ${norm(Q_L1233_1234)} — ${norm(Q_L1207_1212)}`,
    create: { section_code: 'C', label_de: 'Teilflächen / Zonen (Schwimm-, Regenerations-, Ergänzungsflächen → Σ, Anteil, Unterwasserfläche)', data_type: 'json', unit: null, clause_reference: '§3; §5, Tab. 1–3; §9.2; App. 5',
      description: 'Plan 3: Zeilen je Zone (Art, Fläche, Tiefe, Boden-/Wandfläche unter Wasser, Regenerationstechnik mit den prod-Token von regeneration_technique); Σ → total_pool_area_calc (FLLNT-06-D1), Regenerationsanteil an der Wasserfläche (Schwimm- + Regenerationsbereich, Tab. 2–6 "of the total water area") → regeneration_share_calc (FLLNT-06-D2), Σ Boden + Wand → pool_underwater_surface_calc (FLLNT-06-D3), submerser Anteil am Regenerationsbereich → submerged_hydrobot_share_calc (FLLNT-06-D4); Ablösung der Skalare swimming_area_m2 / regeneration_area_m2 / supplementary_area_m2 / total_pool_area_m2 und von EQ-PUWS STAGED (fll_naturteich-R-1 / -R-2); Ergänzungsflächen zählen nicht zur Wasserfläche (fll_naturteich-J-4).' },
  }),
  WS06({ symbol: 'total_pool_area_calc', widget: 'derived', ui_config: null, verification_quote: `${norm(Q_L1207_1212)} — ${norm(Q_L765_768)}`,
    create: { section_code: 'D', label_de: 'Σ Fläche aller Zonen (Schwimm- + Regenerations- + Ergänzungsflächen)', data_type: 'number', unit: 'm²', clause_reference: '§5, Tab. 1; §8.2', description: 'Plan 3: Ausgabe der Gleichung FLLNT-06-D1 (sum_rows über zonen) — entspricht der prod-Definition von total_pool_area_m2 ("sum of zones"); Übernahme STAGED (fll_naturteich-R-1).' } }),
  WS06({ symbol: 'regeneration_share_calc', widget: 'derived', ui_config: null, verification_quote: `${norm(Q_L1233_1234)} — ${norm(Q_L1207_1212)}`,
    create: { section_code: 'D', label_de: 'Regenerationsanteil an der Gesamtwasserfläche aus den Zonen (Σ Regeneration / Σ (Schwimm + Regeneration) · 100)', data_type: 'number', unit: '%', clause_reference: '§5, Tab. 1–3 ("Regeneration area in % of the total water area")', description: 'Plan 3: Ausgabe der Gleichung FLLNT-06-D2; Vergleich mit regeneration_share_min_pct (FLLNT-03) und REQ-07-Umbindung STAGED (fll_naturteich-G-1); Ergänzungsflächen nicht im Nenner (fll_naturteich-J-4).' } }),
  WS06({ symbol: 'pool_underwater_surface_calc', widget: 'derived', ui_config: null, verification_quote: `${norm(Q_L2769_2774)} — ${norm(Q_L4073_4080)}`,
    create: { section_code: 'D', label_de: 'Σ Unterwasserfläche aus den Zonen (Boden + Wände unter Wasser, App. 5)', data_type: 'number', unit: 'm²', clause_reference: '§10.2.3; App. 5', description: 'Plan 3: Ausgabe der Gleichung FLLNT-06-D3 (sum_rows über zonen.underwater_m2); Ablösung von EQ-PUWS (pool_underwater_surface = pool_ground_area_m2 + pool_submerged_wall_area_m2) STAGED (fll_naturteich-R-2).' } }),
  WS06({ symbol: 'submerged_hydrobot_share_calc', widget: 'derived', ui_config: null, verification_quote: `${norm(Q_T2_SHARE)} — ${norm(Q_T3_SHARE)}`,
    create: { section_code: 'D', label_de: 'Anteil submerses hydrobotanisches System am Regenerationsbereich (Typ I / II: mindestens die Hälfte, Tab. 2 / 3)', data_type: 'number', unit: '%', clause_reference: '§5, Tab. 2 / Tab. 3', description: 'Plan 3: Ausgabe der Gleichung FLLNT-06-D4 (Σ Regenerationszonen mit technique = hydrobotanical_submergent / Σ Regenerationszonen · 100); Vergleich mit TABLE2_SUBMERGED (50 %) für Typ I / II — Gate STAGED (fll_naturteich-G-5).' } }),

  // ---- FLLNT-09 (Hydrobotanisches System): Tab.-10 limits keyed on the own hydrobot_type ----
  tab10Fill('hydrobot_water_column_min_tab10', 'water_column_min_cm', 'Wassersäule, mindestens', 'cm', Q_L2607, '≥ 80 cm submergent · 10 cm Emersed'),
  tab10Fill('hydrobot_water_column_max_tab10', 'water_column_max_cm', 'Wassersäule, höchstens', 'cm', Q_L2607, 'Emersed: 50 cm', EMERSED),
  tab10Fill('hydrobot_substrate_min_tab10', 'substrate_min_cm', 'Substratschicht, mindestens', 'cm', Q_L2608, '10 cm'),
  tab10Fill('hydrobot_substrate_max_tab10', 'substrate_max_cm', 'Substratschicht, höchstens', 'cm', Q_L2608, '20 cm submergent · 30 cm Emersed'),
  tab10Fill('hydrobot_grain_max_tab10', 'grain_max_mm', 'Korngröße Pflanzsubstrat, maximal', 'mm', Q_L2611_2619, '≤ 8 mm'),
  tab10Fill('hydrobot_feed_qmax_tab10', 'feed_rate_qmax', 'Beschickung Qmax', 'm³/(m²·d)', Q_L2632, '5 m3/(m2 x day)'),

  // ---- FLLNT-10 (Substratfilter): filter / hydrobotanical units as rows; the horizontal-flow rule on two scalars ----
  WS10({
    symbol: 'filtereinheiten', widget: 'register',
    ui_config: {
      title: 'Filter- / Hydrobotanik-Einheiten', subtitle: 'Tab. 10 / 11 / 12 — je Einheit Technik, Fließrichtung, Fläche, Schicht und Kornklasse (Tab. 15); besiedelbare Oberfläche je Zeile (App. 5), Beschickung gegen Qmax / Qmin', add_label: '+ Einheit', placement: 'section',
      columns: [
        { key: 'label', label: 'Einheit', type: 'text', required: true },
        { key: 'unit_kind', label: 'Art', type: 'enum', required: true, options: [...UNIT_KIND_TOKENS], option_labels: UNIT_KIND_LABELS, discriminator: true },
        { key: 'hydrobot_type', label: 'Hydrobotanik-Typ (Tab. 10)', type: 'enum', required: true, options: [...HYDROBOT_TYPE_TOKENS], option_labels: HYDROBOT_LABELS, visible_when: "unit_kind == 'hydrobotanical'" },
        { key: 'flow_type', label: 'Durchströmung', type: 'enum', required: true, options: [...FLOW_TYPE_TOKENS], option_labels: FLOW_TYPE_LABELS, visible_when: "unit_kind == 'substrate_filter'" },
        { key: 'flow_direction', label: 'Fließrichtung', type: 'enum', required: true, options: [...FLOW_DIRECTION_TOKENS], option_labels: DIRECTION_LABELS, visible_when: "unit_kind == 'substrate_filter'" },
        { key: 'area_m2', label: 'F_filter', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'Filterfläche / Querschnitt der Einheit' },
        { key: 'layer_cm', label: 'wirksame Schicht', type: 'number', unit: 'cm', required: true, min: 0, visible_when: "unit_kind != 'technical'", aria_label: 'Dicke der filterwirksamen Schicht bzw. Substratschicht' },
        { key: 'layer_min', label: 'Schicht min (Tab.)', type: 'derived', expr: LAYER_MIN_EXPR, unit: 'cm' },
        { key: 'layer_ok', label: 'Schicht', type: 'derived', expr: LAYER_OK_EXPR, display: 'badge', value_labels: { '1': 'Schichtdicke nach Tab. 10 / 11 / 12', '0': 'Schichtdicke außerhalb Tab. 10 / 11 / 12' } },
        { key: 'grain_class', label: 'Kornklasse (Tab. 15)', type: 'lookup_key', required: true, lookup: { table_code: 'TABLE15' }, visible_when: "unit_kind == 'substrate_filter'" },
        { key: 'surface_m2_m3', label: 'Oberfläche', type: 'lookup_value', unit: 'm²/m³', lookup: { table_code: 'TABLE15', key_column: 'grain_class', value: 'surface_m2_m3' }, visible_when: "unit_kind == 'substrate_filter'" },
        { key: 'surface_override', label: 'Produktwert', type: 'boolean', visible_when: "unit_kind == 'substrate_filter'" },
        { key: 'colonized_manual_m2', label: 'besiedelbare Oberfläche (Hersteller)', type: 'number', unit: 'm²', min: 0, visible_when: "unit_kind == 'technical'", aria_label: 'besiedelbare Oberfläche nach Herstellerangabe' },
        { key: 'colonized_m2', label: 'besiedelbare Oberfläche', type: 'derived', expr: COLONIZED_EXPR, unit: 'm²' },
        { key: 'feed_rate', label: 'Beschickung', type: 'number', unit: 'm³/(m²·d)', min: 0, aria_label: 'Beschickung der Einheit' },
        { key: 'feed_limit', label: 'Beschickung Grenze', type: 'derived', expr: FEED_LIMIT_EXPR, unit: 'm³/(m²·d)' },
        { key: 'feed_ok', label: 'Beschickung', type: 'derived', expr: FEED_OK_EXPR, display: 'badge', value_labels: { '1': 'Beschickung nach Tab. 10 / 11 / 12', '0': 'Beschickung außerhalb Qmax / Qmin' } },
      ],
      override: { flag_key: 'surface_override', applies_to: ['surface_m2_m3'], policy: 'anhaltswert' },
      footer: ['filter_colonized_surface_total', 'filter_feed_violations'],
      note: norm(Q_L4122),
    },
    verification_quote: `${norm(Q_L2587)} — ${norm(Q_L2666)} — ${norm(Q_L2788)} — ${norm(Q_L2769_2774)} — ${norm(Q_L4073_4080)} — ${norm(Q_L4110)} — ${norm(Q_L4111)} — ${norm(Q_L2879)}`,
    create: { section_code: 'C', label_de: 'Filter- / Hydrobotanik-Einheiten (Tab. 10 / 11 / 12 je Einheit, Tab. 15 Kornklasse → besiedelbare Oberfläche)', data_type: 'json', unit: null, clause_reference: '§10.2.1–10.2.4, Tab. 10–12; App. 5, Tab. 15',
      description: 'Plan 3: Zeilen je Einheit (Art als Diskriminator: hydrobotanisch mit prod hydrobot_type-Token / Substratfilter mit prod filter_flow_type- und filter_flow_direction-Token / technische Einheit; Fläche, wirksame Schicht, Kornklasse nach Tab. 15 mit Oberfläche (anhaltswert — Produktwert mit Begründung), Beschickung); je Zeile Schichtminimum, besiedelbare Oberfläche (App. 5 Beispiel 1: 600 · 15 · 0.7 = 6300 m²) und Beschickungsgrenze aus TABLE10 / TABLE11 / TABLE12; Σ → filter_colonized_surface_total (FLLNT-10-D1), Verletzungen → filter_feed_violations (FLLNT-10-D2); Ablösung von EQ-02 / EQ-01 / EQ-03 und der Skalare grain_specific_surface / F_filter / h_filter STAGED (fll_naturteich-R-3 / -G-6).' },
  }),
  WS10({ symbol: 'filter_colonized_surface_total', widget: 'derived', ui_config: null, verification_quote: `${norm(Q_L2769_2774)} — ${norm(Q_L4067_4070)} — ${norm(Q_L4073_4080)}`,
    create: { section_code: 'D', label_de: 'Σ besiedelbare Oberfläche über die Filter-Einheiten (App. 5)', data_type: 'number', unit: 'm²', clause_reference: '§10.2.3; App. 5', description: 'Plan 3: Ausgabe der Gleichung FLLNT-10-D1 (sum_rows über filtereinheiten.colonized_m2); Ablösung von EQ-02 (filter_colonized_surface_actual = grain_specific_surface · F_filter · h_filter) und die 50×-Regel EQ-01 darauf STAGED (fll_naturteich-R-3 / -G-6).' } }),
  WS10({ symbol: 'filter_feed_violations', widget: 'derived', ui_config: null, verification_quote: `${norm(Q_L2632)} — ${norm(Q_L2653_2654)} — ${norm(Q_L2784_2787)}`,
    create: { section_code: 'D', label_de: 'Anzahl Einheiten mit Beschickung außerhalb Qmax (Tab. 10 / 11) bzw. unter Qmin (Tab. 12)', data_type: 'number', unit: null, clause_reference: '§10.2.1–10.2.3, Tab. 10–12', description: 'Plan 3: Ausgabe der Gleichung FLLNT-10-D2 (count_rows über filtereinheiten mit feed_ok == 0; horizontale Filter, technische Einheiten und Zeilen ohne Beschickung zählen nicht); Gate == 0 STAGED (fll_naturteich-G-6).' } }),
  WS10({ symbol: 'filter_water_column', widget: 'scalar', ui_config: null, visible_when: NOT_HORIZONTAL, verification_quote: `${norm(Q_L2695_2699)} — ${norm(Q_L2817_2821)}` }),
  WS10({ symbol: 'filter_kf', widget: 'scalar', ui_config: null, visible_when: NOT_HORIZONTAL, verification_quote: `${norm(Q_L2737_2741)} — ${norm(Q_L2859_2862)}` }),

  // ---- FLLNT-11 (Wasserzirkulation): overflow devices as rows (Σ edge length, ±2 / ±1 mm tolerance) ----
  WS11({
    symbol: 'ueberlaufeinrichtungen', widget: 'register',
    ui_config: {
      title: 'Überlauf- / Ablaufeinrichtungen', subtitle: '§10.3.1 — je Einrichtung Art (starr / flexibel), Überlaufkantenlänge, horizontale Abweichung (±2 mm; bis 1 m Kantenlänge ±1 mm); Richtwert Σ Kantenlänge = 1 % der Schwimmbereichsfläche', add_label: '+ Einrichtung', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text', required: true },
        { key: 'type', label: 'Art', type: 'enum', required: true, options: [...OVERFLOW_TYPE_TOKENS], option_labels: { rigid: 'rigid overflow weir, e.g. gully', flexible: 'flexible overflow weir, e.g. skimmer' } },
        { key: 'edge_length_m', label: 'Überlaufkante', type: 'number', unit: 'm', required: true, min: 0, aria_label: 'Länge der Überlaufkante' },
        { key: 'tolerance_mm', label: 'horizontale Abweichung', type: 'number', unit: 'mm', min: 0, aria_label: 'gemessene horizontale Abweichung der Überlaufkante' },
        { key: 'tol_limit', label: 'zulässig', type: 'derived', expr: 'if(edge_length_m <= 1, 1, 2)', unit: 'mm' },
        { key: 'tol_ok', label: 'Toleranz', type: 'derived', expr: 'if(tolerance_mm IS NULL, 1, if(tolerance_mm <= tol_limit, 1, 0))', display: 'badge', value_labels: { '1': 'innerhalb ±2 / ±1 mm', '0': 'Abweichung über ±2 / ±1 mm' } },
      ],
      footer: ['overflow_edge_length_total', 'overflow_tolerance_violations'],
      note: norm(Q_L2906_2912),
    },
    verification_quote: `${norm(Q_L2903_2904)} — ${norm(Q_L2906_2912)} — ${norm(Q_L2922_2924)}`,
    create: { section_code: 'C', label_de: 'Überlauf- / Ablaufeinrichtungen (Art, Kantenlänge, Toleranz → Σ Kantenlänge)', data_type: 'json', unit: null, clause_reference: '§10.3.1',
      description: 'Plan 3: Zeilen je Einrichtung (starr / flexibel, Kantenlänge, horizontale Abweichung mit der gedruckten Toleranz ±2 mm bzw. ±1 mm bis 1 m); Σ → overflow_edge_length_total (FLLNT-11-D1), Toleranzverletzungen → overflow_tolerance_violations (FLLNT-11-D2); der Richtwert 1 % der Schwimmbereichsfläche bleibt EQ-04 — dessen Ausgabe ist heute zugleich das Eingabefeld overflow_edge_length (fll_naturteich-R-4).' },
  }),
  WS11({ symbol: 'overflow_edge_length_total', widget: 'derived', ui_config: null, verification_quote: norm(Q_L2906_2912),
    create: { section_code: 'D', label_de: 'Σ Überlaufkantenlänge über die Einrichtungen', data_type: 'number', unit: 'm', clause_reference: '§10.3.1', description: 'Plan 3: Ausgabe der Gleichung FLLNT-11-D1 (sum_rows über ueberlaufeinrichtungen.edge_length_m); Vergleich mit dem Richtwert 0.01 · Schwimmbereichsfläche (EQ-04) STAGED (fll_naturteich-R-4).' } }),
  WS11({ symbol: 'overflow_tolerance_violations', widget: 'derived', ui_config: null, verification_quote: norm(Q_L2922_2924),
    create: { section_code: 'D', label_de: 'Anzahl Überlaufkanten mit horizontaler Abweichung über ±2 mm (bis 1 m: ±1 mm)', data_type: 'number', unit: null, clause_reference: '§10.3.1', description: 'Plan 3: Ausgabe der Gleichung FLLNT-11-D2 (count_rows über ueberlaufeinrichtungen mit tol_ok == 0); der Skalar overflow_horizontal_tolerance_mm bleibt (VR-Text), Gate STAGED (fll_naturteich-G-7).' } }),

  // ---- FLLNT-12 (Pflanzplan): the Plan-1 register upgraded in place (keys art / zone / anzahl kept) + Σ plant count ----
  WS12({
    symbol: 'plant_species_list', widget: 'register',
    ui_config: {
      title: 'Pflanzenliste', subtitle: '§10.4.1 / §10.4.3 — je Pflanzenart Gruppe (Richtwert Pflanzen je m², Topfware P 0.5), Pflanzfläche und gewählte Dichte → Stückzahl', add_label: '+ Pflanzenart', placement: 'section',
      columns: [
        { key: 'art', label: 'Pflanzenart', type: 'text', required: true },
        { key: 'zone', label: 'Zone / Beckentyp', type: 'text' },
        { key: 'plant_group', label: 'Pflanzengruppe (§10.4.3)', type: 'lookup_key', required: true, lookup: { table_code: 'S10_4_3' } },
        { key: 'area_m2', label: 'Pflanzfläche', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'Pflanzfläche der Art' },
        { key: 'density_min', label: 'Dichte min (§10.4.3)', type: 'lookup_value', unit: '1/m²', lookup: { table_code: 'S10_4_3', key_column: 'plant_group', value: 'density_min' } },
        { key: 'density_max', label: 'Dichte max (§10.4.3)', type: 'lookup_value', unit: '1/m²', lookup: { table_code: 'S10_4_3', key_column: 'plant_group', value: 'density_max' } },
        { key: 'density', label: 'gewählte Dichte', type: 'number', unit: '1/m²', required: true, min: 0, aria_label: 'gewählte Pflanzdichte je m²' },
        { key: 'in_range', label: 'Richtwert', type: 'derived', expr: "if(plant_group == 'lilies', 1, if(density >= density_min AND density <= density_max, 1, 0))", display: 'badge', value_labels: { '1': 'im Richtwertbereich §10.4.3', '0': 'außerhalb des Richtwerts §10.4.3' } },
        { key: 'count', label: 'Stück', type: 'derived', expr: 'area_m2 * density', unit: 'Stk' },
        { key: 'anzahl', label: 'Bemerkung (Plan-1-Spalte „Anzahl / Bemerkung“)', type: 'text' },
      ],
      footer: ['plant_count_total'],
      note: norm(Q_L3055),
    },
    verification_quote: `${norm(Q_L3049_3050)} — ${norm(Q_L3051)} ${norm(Q_L3052)} ${norm(Q_L3053)} ${norm(Q_L3054)} — ${norm(Q_L3055)}`,
  }),
  WS12({ symbol: 'plant_count_total', widget: 'derived', ui_config: null, verification_quote: `${norm(Q_L3049_3050)} — ${norm(Q_L3055)}`,
    create: { section_code: 'D', label_de: 'Σ Pflanzen (Pflanzfläche · gewählte Dichte) über die Pflanzenliste', data_type: 'number', unit: 'Stk', clause_reference: '§10.4.3', description: 'Plan 3: Ausgabe der Gleichung FLLNT-12-D1 (sum_rows über plant_species_list.area_m2 · density); die drei Dichte-Skalare plant_density_* bleiben (fll_naturteich-X-2).' } }),
];

/**
 * Section rules: Tab. 1's regeneration-area column names the hydrobotanical system for types I / II / III and the
 * substrate filter for III / IV (L1135–L1147); §10.2.1 L2580–L2581 keeps type IV's supplementary hydrobotanical systems
 * out of the dimensioning. The driver `natural_pool_type` IS consumed by FLLNT-09 and -10 (capture), so the rules resolve.
 * Only the sections WITHOUT a consumed producer are ruled (A, F on -09, J, K, L, M) — B / C / D of -09 (hydrobot_type,
 * hydrobot_* inputs, hydrobot_feed_rate) and B / C / D / F of -10 (filter_flow_type, aerobic_filtration_confirmed,
 * filter_feed_rate_*, filter_colonized_surface_actual, filter_volume_required, filter_50x_rule_met) hold symbols other
 * worksheets inherit → fll_naturteich-C-3 (STAGED consumer edits; the emitter refuses them).
 */
const sec = (worksheet: string, section_code: string, visible_when: string, verification_quote: string): SectionVisibilityEntry => ({ standard: STD, worksheet, section_code, visible_when, verification_quote });
const Q_SECTIONS_HB = `${norm(Q_L1135_1151)} — ${norm(Q_L2580_2582)}`;
const Q_SECTIONS_SF = `${norm(Q_L1135_1151)} — ${norm(Q_L1111_1133)}`;
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [
  ...['A', 'F', 'J', 'K', 'L', 'M'].map((s) => sec('FLLNT-09', s, TYPES_I_III, Q_SECTIONS_HB)),
  ...['A', 'J', 'K', 'L', 'M'].map((s) => sec('FLLNT-10', s, TYPES_III_IV, Q_SECTIONS_SF)),
];

/** Cues read for the rules that are NOT emitted (kept here so the module names its own residue; see the sign-off blocks). */
export const WITHHELD_CUES = { p_binding: `${norm(Q_L1111_1133)} — ${norm(Q_L2658_2661)}`, types: norm(Q_L1078_1081), reservoir: `${norm(Q_L2930)} — ${norm(Q_L2935_2937)} — ${norm(Q_L2947_2948)}`, technical_quick: norm(Q_L2872), physical_chemical: norm(Q_L2885_2886), regeneration_area: `${norm(Q_L2285_2286)} — ${norm(Q_L2490_2493)}`, type_iv_v_share: `${norm(Q_L1559_1560)} — ${norm(Q_L1660_1661)}` };

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
