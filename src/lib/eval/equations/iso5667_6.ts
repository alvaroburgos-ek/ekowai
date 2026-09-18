/**
 * ISO-5667-6 — Plan 3 Task 23 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts iso5667_6` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span of the
 * SPANISH transcript (`regulation-tables-quotes-iso5667_6.ts`, line range in the
 * name; VC grade).
 *
 * Single-source: no row here outputs a symbol prod already produces — Eq. A.1
 * (`l = 0,13 · b² · c · (0,7·c + 2·g) / (g·d)`, imported_unverified) and Eq. 2
 * (`sampling_depth_below_surface = preferred_subsurface_depth`, verified) keep their
 * rows: A.1 is NOT rewritten (the printed block loses its radical — iso5667_6-U-1),
 * Eq. 2's retirement is a proposal (iso5667_6-D-3). Every printed threshold is read
 * by `lookup()` from the seeded sentence tables — no figure is typed into a formula.
 *
 * Register-fed rows live on their register's worksheet and materialise on save;
 * the one scalar-only row (ISO-5667-6-04-D3, a zero-input constant twin) is computed
 * on the hook / report / snapshot / PDF only (amendment D, iso5667_6-I-1).
 *
 * NOT emitted (STAGED in scripts/verification/iso5667_6-STAGED-plan3-rulings.sql):
 *   - `heterogeneity_flows_count` (the number of DISTINCT flows among the rows) — no
 *     `distinct` in the function set → iso5667_6-F-1;
 *   - `l_mixing_calc` (Annex A) — iso5667_6-U-1 (√g vs 2g) until the owner rules.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-quotes-iso5667_6';

const STD = 'ISO-5667-6';

export const EQUATIONS: EquationEntry[] = [
  // ---- ISO-5667-6-02: sampling points (§5.1.1 / §7) ----
  {
    standard: STD, worksheet: 'ISO-5667-6-02', equation_number: 'ISO-5667-6-02-D1',
    formula: 'sampling_point_count_calc = count_rows(sampling_points_6)',
    input_symbols: ['sampling_points_6'], output_symbol: 'sampling_point_count_calc', output_unit: null,
    clause_reference: '§5.1.1',
    description: 'Plan 3: Anzahl der erfassten Probenahmepunkte (Zwilling des Eingabefelds sampling_point_count — Ablösung STAGED, iso5667_6-D-4).',
    verification_quote: Q.L651_653,
  },
  {
    standard: STD, worksheet: 'ISO-5667-6-02', equation_number: 'ISO-5667-6-02-D2',
    formula: 'points_depth_fail = count_rows(sampling_points_6, depth_ok == 0)',
    input_symbols: ['sampling_points_6'], output_symbol: 'points_depth_fail', output_unit: null,
    clause_reference: '§7.1',
    description: 'Plan 3: Zeilen, deren §7.1-Position nicht erfüllt ist — weniger als 30 cm über der Sohle oder unter der Oberfläche (S7_1) oder nicht eingetragen (Badge 0). Gate STAGED (iso5667_6-G-9).',
    verification_quote: Q.L1168_1169,
  },

  // ---- ISO-5667-6-03: heterogeneity test (§5.1.4) ----
  {
    standard: STD, worksheet: 'ISO-5667-6-03', equation_number: 'ISO-5667-6-03-D1',
    formula: 'heterogeneity_samples_count_calc = count_rows(heterogeneity_samples)',
    input_symbols: ['heterogeneity_samples'], output_symbol: 'heterogeneity_samples_count_calc', output_unit: null,
    clause_reference: '§5.1.4',
    description: 'Plan 3: Anzahl der erfassten Heterogenitätsproben (Zwilling des Eingabefelds heterogeneity_samples_count — Ablösung STAGED, iso5667_6-D-17).',
    verification_quote: Q.L897_899,
  },
  {
    standard: STD, worksheet: 'ISO-5667-6-03', equation_number: 'ISO-5667-6-03-D2',
    formula: "heterogeneity_samples_ok = if(count_rows(heterogeneity_samples) >= lookup('S5_1_4', 'heterogeneity', 'samples_approx'), 1, 0)",
    input_symbols: ['heterogeneity_samples'], output_symbol: 'heterogeneity_samples_ok', output_unit: null,
    clause_reference: '§5.1.4',
    description: 'Plan 3: 1, wenn mindestens sechs Proben erfasst sind (S5_1_4.samples_approx, „aproximadamente seis muestras“ — als ≥ 6 gelesen wie CR-008, iso5667_6-J-2), sonst 0; die Zahl der verschiedenen Durchflüsse (≥ 3) bleibt Handangabe (iso5667_6-F-1).',
    verification_quote: Q.L897_899,
  },
  {
    standard: STD, worksheet: 'ISO-5667-6-03', equation_number: 'ISO-5667-6-03-D3',
    formula: 'heterogeneity_spread = max_rows(heterogeneity_samples, value) - min_rows(heterogeneity_samples, value)',
    input_symbols: ['heterogeneity_samples'], output_symbol: 'heterogeneity_spread', output_unit: null,
    clause_reference: '§5.1.4',
    description: 'Plan 3: Spannweite (max − min) der Messwerte über die vollständigen Zeilen — Hilfsgröße für die statistische Beurteilung der Heterogenität; nur je Determinante sinnvoll (iso5667_6-J-3); leeres Register ⇒ manuell.',
    verification_quote: Q.L899_903,
  },

  // ---- ISO-5667-6-04: travel time (§5.1.3) ----
  {
    standard: STD, worksheet: 'ISO-5667-6-04', equation_number: 'ISO-5667-6-04-D1',
    formula: 'travel_time_flows_count_calc = count_rows(travel_time_runs)',
    input_symbols: ['travel_time_runs'], output_symbol: 'travel_time_flows_count_calc', output_unit: null,
    clause_reference: '§5.1.3',
    description: 'Plan 3: Anzahl der erfassten Fließzeitmessungen (Zwilling des Eingabefelds travel_time_flows_count — Ablösung STAGED, iso5667_6-D-21); CR-009 liest heute den Skalar (iso5667_6-G-3).',
    verification_quote: Q.L859_863,
  },
  {
    standard: STD, worksheet: 'ISO-5667-6-04', equation_number: 'ISO-5667-6-04-D2',
    formula: "travel_time_flows_ok = if(count_rows(travel_time_runs) >= lookup('S5_1_3', 'travel_time', 'flows_min'), 1, 0)",
    input_symbols: ['travel_time_runs'], output_symbol: 'travel_time_flows_ok', output_unit: null,
    clause_reference: '§5.1.3',
    description: 'Plan 3: 1, wenn Messungen bei mindestens fünf Durchflüssen erfasst sind (S5_1_3.flows_min, „un mínimo de cinco caudales diferentes“), sonst 0; Gate STAGED (iso5667_6-G-3).',
    verification_quote: Q.L859_863,
  },
  {
    standard: STD, worksheet: 'ISO-5667-6-04', equation_number: 'ISO-5667-6-04-D3',
    formula: "travel_time_extrapolation_max = lookup('S5_1_3', 'travel_time', 'extrapolation_max_pct')",
    input_symbols: [], output_symbol: 'travel_time_extrapolation_max', output_unit: '%',
    clause_reference: '§5.1.3',
    description: 'Plan 3: die gedruckte Extrapolationsgrenze (10 % eines Durchfluss-Messwerts) als Zwilling neben dem Eingabefeld travel_time_extrapolation_limit (iso5667_6-D-22); scalar-only (iso5667_6-I-1).',
    verification_quote: Q.L859_863,
  },

  // ---- ISO-5667-6-09: increments (§10.8) ----
  {
    standard: STD, worksheet: 'ISO-5667-6-09', equation_number: 'ISO-5667-6-09-D1',
    formula: 'increment_total_time_calc = sum_rows(increments, duration_min)',
    input_symbols: ['increments'], output_symbol: 'increment_total_time_calc', output_unit: 'min',
    clause_reference: '§10.8',
    description: 'Plan 3: Gesamtzeit aller Inkremente (Σ Dauer über die vollständigen Zeilen; Zwilling des Eingabefelds increment_total_time — Ablösung STAGED, iso5667_6-D-23); leeres Register ⇒ manuell.',
    verification_quote: Q.L1765_1768,
  },
  {
    standard: STD, worksheet: 'ISO-5667-6-09', equation_number: 'ISO-5667-6-09-D2',
    formula: "increment_time_ok = if(sum_rows(increments, duration_min) < lookup('S10_8', 'incremental', 'total_time_max_min'), 1, 0)",
    input_symbols: ['increments'], output_symbol: 'increment_time_ok', output_unit: null,
    clause_reference: '§10.8',
    description: 'Plan 3: 1, wenn die Gesamtzeit der Inkremente unter den 5 min des §10.8 liegt (S10_8.total_time_max_min, „debería ser menor que 5 min“ — strikt wie CR-021), sonst 0; leeres Register ⇒ manuell (nie ein Phantom-Pass); Gate STAGED (iso5667_6-G-5).',
    verification_quote: Q.L1765_1768,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
