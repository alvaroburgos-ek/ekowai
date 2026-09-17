/**
 * FLL-Naturteich — Plan 3 Task 8 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts fll_naturteich` (NEW equation
 * rows only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span
 * lifted from the transcript (constants exported by
 * `regulation-tables-seed-fll_naturteich.ts` with their line ranges). Every
 * output is a CREATED field of `field-configs/fll_naturteich.ts`; every row is
 * register-fed (materialised on save by the generic materialiser).
 *
 * Single-source (checked against the 6 prod equation rows read in-session, all
 * `verified_against_standard`): EQ-PUWS `pool_underwater_surface = pool_ground_
 * area_m2 + pool_submerged_wall_area_m2` (FLLNT-06), EQ-01 `filter_colonized_
 * surface_actual >= 50 * pool_underwater_surface`, EQ-02 `filter_colonized_
 * surface_actual = grain_specific_surface * F_filter * h_filter`, EQ-03
 * `filter_volume_required = (pool_underwater_surface * 50) / grain_specific_
 * surface` (FLLNT-10), EQ-04 `overflow_edge_length = 0.01 * swimming_area_m2`,
 * EQ-05 `splash_water_tank_volume >= 150 * pool_underwater_surface` (FLLNT-11).
 * No row below outputs any of those symbols — the register-fed replacements
 * (`pool_underwater_surface_calc`, `filter_colonized_surface_total`,
 * `overflow_edge_length_total`) are NEW symbols; re-pointing the verified rows
 * / gates onto them is fll_naturteich-R-2 / -R-3 / -R-4 / -G-6 (STAGED).
 *
 * Decidability (runtime facts checked through `evaluateFormula` +
 * `prepareRegisterRows` before encoding): `sum_rows` over a register with no
 * complete rows is `manual_required`; a `derived` column that reads a worksheet
 * symbol not in scope (`natural_pool_type` on FLLNT-04 until C-1) is null and
 * makes `count_rows(…, sample_ok == 0)` undecidable — expected and pinned; every
 * other branch is decidable on a complete row (`IS NULL` guards, discriminator
 * branches).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { norm, Q_L1207_1212, Q_L1233_1234, Q_T2_SHARE, Q_T3_SHARE, Q_L1973_1978, Q_T7_BODY, Q_T8_BODY, Q_L2632, Q_L2769_2774, Q_L2784_2787, Q_L2906_2912, Q_L2922_2924, Q_L3049_3050, Q_L3051, Q_L3052, Q_L3053, Q_L3054, Q_L3055, Q_L4067_4070, Q_L4073_4080, Q_L4092_4093, Q_L765_768 } from '../regulation-tables-seed-fll_naturteich';

const STD = 'FLL-Naturteich';

export const EQUATIONS: EquationEntry[] = [
  // ---- FLLNT-06: zones → Σ area, regeneration share, underwater surface, submerged share ----
  {
    standard: STD, worksheet: 'FLLNT-06', equation_number: 'FLLNT-06-D1',
    formula: 'total_pool_area_calc = sum_rows(zonen, area_m2)',
    input_symbols: ['zonen'], output_symbol: 'total_pool_area_calc', output_unit: 'm²',
    clause_reference: '§5, Tab. 1; §8.2',
    description: 'Plan 3: Σ Fläche über alle Zonen-Zeilen (Schwimm-, Regenerations- und Ergänzungsflächen — die prod-Definition von total_pool_area_m2 "sum of zones"); Übernahme als total_pool_area_m2 STAGED (fll_naturteich-R-1).',
    verification_quote: `${norm(Q_L1207_1212)} — ${norm(Q_L765_768)}`,
  },
  {
    standard: STD, worksheet: 'FLLNT-06', equation_number: 'FLLNT-06-D2',
    formula: "regeneration_share_calc = sum_rows(zonen, if(zone == 'regeneration', area_m2, 0)) * 100 / sum_rows(zonen, if(zone IN {'swimming', 'regeneration'}, area_m2, 0))",
    input_symbols: ['zonen'], output_symbol: 'regeneration_share_calc', output_unit: '%',
    clause_reference: '§5, Tab. 1–3',
    description: 'Plan 3: Regenerationsanteil an der Gesamtwasserfläche = Σ Regenerationszonen / Σ (Schwimm- + Regenerationszonen) · 100 (Tab. 2–6 "Regeneration area in % of the total water area"; Ergänzungsflächen gehören nicht zur Wasserfläche, §3 — fll_naturteich-J-4); Vergleich mit dem Tab.-1-Minimum (> 50 % / > 50 % / > 30 %) und REQ-07-Umbindung STAGED (fll_naturteich-G-1).',
    verification_quote: `${norm(Q_L1233_1234)} — ${norm(Q_L1207_1212)}`,
  },
  {
    standard: STD, worksheet: 'FLLNT-06', equation_number: 'FLLNT-06-D3',
    formula: 'pool_underwater_surface_calc = sum_rows(zonen, underwater_m2)',
    input_symbols: ['zonen'], output_symbol: 'pool_underwater_surface_calc', output_unit: 'm²',
    clause_reference: '§10.2.3; App. 5',
    description: 'Plan 3: Σ (Bodenfläche + Wandfläche unter Wasser) über die Zonen-Zeilen (App. 5 Beispiel 2: Ground area 50 m2 + Wall area 45 m2 = Total 95 m2); Ablösung von EQ-PUWS STAGED (fll_naturteich-R-2).',
    verification_quote: `${norm(Q_L2769_2774)} — ${norm(Q_L4073_4080)}`,
  },
  {
    standard: STD, worksheet: 'FLLNT-06', equation_number: 'FLLNT-06-D4',
    formula: "submerged_hydrobot_share_calc = sum_rows(zonen, if(zone == 'regeneration', if(technique == 'hydrobotanical_submergent', area_m2, 0), 0)) * 100 / sum_rows(zonen, if(zone == 'regeneration', area_m2, 0))",
    input_symbols: ['zonen'], output_symbol: 'submerged_hydrobot_share_calc', output_unit: '%',
    clause_reference: '§5, Tab. 2 / Tab. 3',
    description: 'Plan 3: Anteil der Regenerationszonen mit submersem hydrobotanischem System an allen Regenerationszonen (Typ I / II: "therefrom at least half as submerged hydrobotanical system" — TABLE2_SUBMERGED 50 %); ohne Regenerationszeile unentscheidbar (Division durch Null); Gate STAGED (fll_naturteich-G-5).',
    verification_quote: `${norm(Q_T2_SHARE)} — ${norm(Q_T3_SHARE)}`,
  },
  // ---- FLLNT-10: filter / hydrobotanical units → Σ colonizable surface (App. 5), feed-rate violations ----
  {
    standard: STD, worksheet: 'FLLNT-10', equation_number: 'FLLNT-10-D1',
    formula: 'filter_colonized_surface_total = sum_rows(filtereinheiten, colonized_m2)',
    input_symbols: ['filtereinheiten'], output_symbol: 'filter_colonized_surface_total', output_unit: 'm²',
    clause_reference: '§10.2.3; App. 5',
    description: 'Plan 3: Σ besiedelbare Oberfläche über die Einheiten (je Substratfilter-Zeile Tab.-15-Oberfläche · F_filter · Schicht — App. 5 Beispiel 1: 600 m2/m3 x 15 m2 x 0.7 m = 6300 m2; technische Einheiten nach Herstellerangabe; hydrobotanische Zeilen 0); Ablösung von EQ-02 und die 50×-Regel EQ-01 auf Σ ≥ 50 · pool_underwater_surface STAGED (fll_naturteich-R-3 / -G-6).',
    verification_quote: `${norm(Q_L4067_4070)} — ${norm(Q_L4073_4080)} — ${norm(Q_L4092_4093)}`,
  },
  {
    standard: STD, worksheet: 'FLLNT-10', equation_number: 'FLLNT-10-D2',
    formula: 'filter_feed_violations = count_rows(filtereinheiten, feed_ok == 0)',
    input_symbols: ['filtereinheiten'], output_symbol: 'filter_feed_violations', output_unit: null,
    clause_reference: '§10.2.1–10.2.3, Tab. 10–12',
    description: 'Plan 3: Anzahl Einheiten mit Beschickung über Qmax (Tab. 10: 5 · Tab. 11: 5 / 8 m3/(m2 x day)) bzw. unter Qmin (Tab. 12: ≥ 15 m3/(m2 x day)); horizontale Filter ("Individual verification"), technische Einheiten und Zeilen ohne Beschickung zählen nicht; Gate == 0 STAGED (fll_naturteich-G-6).',
    verification_quote: `${norm(Q_L2632)} — ${norm(Q_L2784_2787)}`,
  },
  // ---- FLLNT-11: overflow devices → Σ edge length, tolerance violations ----
  {
    standard: STD, worksheet: 'FLLNT-11', equation_number: 'FLLNT-11-D1',
    formula: 'overflow_edge_length_total = sum_rows(ueberlaufeinrichtungen, edge_length_m)',
    input_symbols: ['ueberlaufeinrichtungen'], output_symbol: 'overflow_edge_length_total', output_unit: 'm',
    clause_reference: '§10.3.1',
    description: 'Plan 3: Σ Überlaufkantenlänge über die Einrichtungen; der Richtwert "1% of the surface area of the swimming area in metres" bleibt EQ-04 (0.01 · swimming_area_m2), dessen Ausgabe heute das Eingabefeld overflow_edge_length ist — Umbenennung der Ausgabe und Gate Σ ≥ Richtwert STAGED (fll_naturteich-R-4).',
    verification_quote: norm(Q_L2906_2912),
  },
  {
    standard: STD, worksheet: 'FLLNT-11', equation_number: 'FLLNT-11-D2',
    formula: 'overflow_tolerance_violations = count_rows(ueberlaufeinrichtungen, tol_ok == 0)',
    input_symbols: ['ueberlaufeinrichtungen'], output_symbol: 'overflow_tolerance_violations', output_unit: null,
    clause_reference: '§10.3.1',
    description: 'Plan 3: Anzahl Überlaufkanten, deren horizontale Abweichung ±2 mm (bis 1 m Kantenlänge: ±1 mm) überschreitet; Zeilen ohne Messwert zählen nicht; Gate == 0 STAGED (fll_naturteich-G-7).',
    verification_quote: norm(Q_L2922_2924),
  },
  // ---- FLLNT-12: plant rows → Σ count ----
  {
    standard: STD, worksheet: 'FLLNT-12', equation_number: 'FLLNT-12-D1',
    formula: 'plant_count_total = sum_rows(plant_species_list, area_m2 * density)',
    input_symbols: ['plant_species_list'], output_symbol: 'plant_count_total', output_unit: 'Stk',
    clause_reference: '§10.4.3',
    description: 'Plan 3: Σ Pflanzfläche · gewählte Dichte über die Pflanzenliste (Richtwerte je Gruppe aus S10_4_3: 6 – 10 / 3 – 5 / 5 – 7 je m², Seerosen nach Art; Topfware P 0.5).',
    verification_quote: `${norm(Q_L3049_3050)} — ${norm(Q_L3051)} ${norm(Q_L3052)} ${norm(Q_L3053)} ${norm(Q_L3054)} — ${norm(Q_L3055)}`,
  },
  // ---- FLLNT-04: water samples vs Tab. 7 / Tab. 8 ----
  {
    standard: STD, worksheet: 'FLLNT-04', equation_number: 'FLLNT-04-D1',
    formula: 'sample_violations = count_rows(wasserproben, sample_ok == 0)',
    input_symbols: ['wasserproben'], output_symbol: 'sample_violations', output_unit: null,
    clause_reference: '§7.1.1, Tab. 7; §7.1.2, Tab. 8',
    description: 'Plan 3: Anzahl vollständiger Wasseranalysen mit mindestens einem abweichenden Richtwert (Füllwasser gegen Tab. 7, Schwimmbereich gegen Tab. 8 — P_total / Orthophosphat nach natural_pool_type, auf FLLNT-04 erst nach fll_naturteich-C-1 entscheidbar); Gate == 0 STAGED (fll_naturteich-G-4).',
    verification_quote: `${norm(Q_T7_BODY)} — ${norm(Q_T8_BODY)} — ${norm(Q_L1973_1978)}`,
  },
  {
    standard: STD, worksheet: 'FLLNT-04', equation_number: 'FLLNT-04-D2',
    formula: 'sample_count = count_rows(wasserproben)',
    input_symbols: ['wasserproben'], output_symbol: 'sample_count', output_unit: null,
    clause_reference: '§7.1.1 / §7.1.2',
    description: 'Plan 3: Anzahl vollständiger Wasseranalysen (Bezugsgröße für sample_violations).',
    verification_quote: norm(Q_L1973_1978),
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
