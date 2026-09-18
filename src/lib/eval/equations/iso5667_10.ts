/**
 * ISO-5667-10 — Plan 3 Task 20 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts iso5667_10` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span of the
 * SPANISH transcript (`regulation-tables-quotes-iso5667_10.ts`, line range in the
 * name; VC grade).
 *
 * Single-source: no row here outputs a symbol prod already produces — equations 1 / 2
 * (`sampling_day_k` / `sampling_week_k` = A + 365·k/n resp. A + 52·k/n) and 3
 * (`V_n = V_final · (M3_n / M3_total)`) keep their verified rows; the register rows
 * of `probenahmetermine` / `flaschen_ctcv` reproduce the same printed forms PER ROW
 * (row-scope exprs, not equations). Every printed threshold is read by `lookup()`
 * from the seeded sentence tables — no figure is typed into a formula except the
 * "unas 25" band boundary of §4.3.2 (the printed sentence, iso5667_10-J-1).
 *
 * Register-fed rows live on their register's worksheet and materialise on save;
 * the scalar-only rows (ISO-5667-10-03-D1 … D3, -05-D1 / D2, -06-D4, -08-D1) are
 * computed on the hook / report / snapshot / PDF only (amendment D).
 *
 * NOT emitted (STAGED in scripts/verification/iso5667_10-STAGED-plan3-rulings.sql):
 *   - a -06 twin `unit_volume_min_calc` keyed on the -07 `pump_technology` (not
 *     inherited on -06 today — needs iso5667_10-C-2 first) → part of iso5667_10-G-5;
 *   - the retirement of the scalar triple k / sampling_day_k / sampling_week_k and of
 *     M3_n / V_n / qualified_grab_count in favour of the registers → D-blocks.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-quotes-iso5667_10';

const STD = 'ISO-5667-10';
/** §4.3.2: 365 (Fórmula 1, n above about 25) or 52 (Fórmula 2, n below about 25). */
const PERIOD = "lookup('S4_3_2', if(number_of_samples > 25, 'gt25', 'lt25'), 'period_length')";

export const EQUATIONS: EquationEntry[] = [
  // ---- ISO-5667-10-01: qualified grab sample (§3.4) ----
  {
    standard: STD, worksheet: 'ISO-5667-10-01', equation_number: 'ISO-5667-10-01-D1',
    formula: 'qualified_grab_count_calc = count_rows(stichproben_qualifiziert)',
    input_symbols: ['stichproben_qualifiziert'], output_symbol: 'qualified_grab_count_calc', output_unit: null,
    clause_reference: '§3.4',
    description: 'Plan 3: Anzahl der erfassten Einzel-Stichproben der qualifizierten Stichprobe (Zwilling des Eingabefelds qualified_grab_count — Ablösung STAGED, iso5667_10-D-1).',
    verification_quote: Q.L305_307,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-01', equation_number: 'ISO-5667-10-01-D2',
    formula: "qualified_grab_count_ok = if(count_rows(stichproben_qualifiziert) >= lookup('S3_4', 'qualified_grab', 'min_grabs'), 1, 0)",
    input_symbols: ['stichproben_qualifiziert'], output_symbol: 'qualified_grab_count_ok', output_unit: null,
    clause_reference: '§3.4',
    description: 'Plan 3: 1, wenn mindestens fünf Stichproben erfasst sind (S3_4.min_grabs, „al menos cinco muestras puntuales“), sonst 0; Zeitfenster ≤ 2 h und Abstand ≥ 2 min bleiben Handangaben (iso5667_10-F-2).',
    verification_quote: Q.L305_307,
  },

  // ---- ISO-5667-10-02: sampling points (§4.2 / §5) ----
  {
    standard: STD, worksheet: 'ISO-5667-10-02', equation_number: 'ISO-5667-10-02-D1',
    formula: 'stellen_count = count_rows(probenahmestellen)',
    input_symbols: ['probenahmestellen'], output_symbol: 'stellen_count', output_unit: null,
    clause_reference: '§4.2',
    description: 'Plan 3: Anzahl der dokumentierten Probenahmestellen („Cada punto de muestreo debe documentarse“).',
    verification_quote: Q.L386_388,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-02', equation_number: 'ISO-5667-10-02-D2',
    formula: 'stellen_site_fail = count_rows(probenahmestellen, restriction_ok == 0 OR depth_ok == 0 OR runoff_ok == 0)',
    input_symbols: ['probenahmestellen'], output_symbol: 'stellen_site_fail', output_unit: null,
    clause_reference: '§5.1, §5.4',
    description: 'Plan 3: Zeilen, deren §5-Prüfung nicht erfüllt ist — Kanal: Abstand < 3 × D oder Tiefe außerhalb 1/3 … 1/2 (S5_SITE); Kühlsystem: Vorlauf < 30 s; andere Standorttypen zählen nie (Badges 1). Gate STAGED (iso5667_10-G-6).',
    verification_quote: `${Q.L555_557} — ${Q.L705_706}`,
  },

  // ---- ISO-5667-10-03: Fórmula (1) / (2) schedule (§4.3.2) ----
  {
    standard: STD, worksheet: 'ISO-5667-10-03', equation_number: 'ISO-5667-10-03-D1',
    formula: `period_length_calc = ${PERIOD}`,
    input_symbols: ['number_of_samples'], output_symbol: 'period_length_calc', output_unit: null,
    clause_reference: '§4.3.2',
    description: 'Plan 3: Periodenlänge der anzuwendenden Formel — 365 (Tage, Fórmula 1) bei n > ~25, 52 (Wochen, Fórmula 2) bei n < ~25; n = 25 genau fällt auf Fórmula 2 (iso5667_10-J-1).',
    verification_quote: Q.L478_479,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-03', equation_number: 'ISO-5667-10-03-D2',
    formula: `A_min_calc = 0 - ${PERIOD} / number_of_samples`,
    input_symbols: ['number_of_samples'], output_symbol: 'A_min_calc', output_unit: null,
    clause_reference: '§4.3.2',
    description: 'Plan 3: untere Grenze des Intervalls der Zufallszahl A — „entre – 365/n y 0“ (Fórmula 1) bzw. „entre – 52/n y 0“ (Fórmula 2); die Ziehung von A bleibt Sache des Ingenieurs (SR-2).',
    verification_quote: `${Q.L488_489} — ${Q.L499_500}`,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-03', equation_number: 'ISO-5667-10-03-D3',
    formula: `A_in_range = if(A >= 0 - ${PERIOD} / number_of_samples AND A <= 0, 1, 0)`,
    input_symbols: ['A', 'number_of_samples'], output_symbol: 'A_in_range', output_unit: null,
    clause_reference: '§4.3.2',
    description: 'Plan 3: 1, wenn die eingetragene Zufallszahl A im gedruckten Intervall (−365/n bzw. −52/n … 0) liegt, sonst 0; Gate STAGED (iso5667_10-G-9).',
    verification_quote: `${Q.L488_489} — ${Q.L499_500}`,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-03', equation_number: 'ISO-5667-10-03-D4',
    formula: 'termine_count = count_rows(probenahmetermine)',
    input_symbols: ['probenahmetermine'], output_symbol: 'termine_count', output_unit: null,
    clause_reference: '§4.3.2',
    description: 'Plan 3: Anzahl der angelegten Termine k (soll = number_of_samples; Fórmula 1 / 2 laufen bis A + 365·n/n bzw. A + 52·n/n); Gate STAGED (iso5667_10-G-9).',
    verification_quote: `${Q.L483_485} — ${Q.L494_496}`,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-03', equation_number: 'ISO-5667-10-03-D5',
    formula: 'termine_done = count_rows(probenahmetermine, done == true)',
    input_symbols: ['probenahmetermine'], output_symbol: 'termine_done', output_unit: null,
    clause_reference: '§4.3.2',
    description: 'Plan 3: Anzahl der als durchgeführt markierten Termine (Kontrolle gegen systematische Auslassungen, L505–L508).',
    verification_quote: Q.L505_508,
  },

  // ---- ISO-5667-10-05: CTCV precondition (§7.2.2.4) ----
  {
    standard: STD, worksheet: 'ISO-5667-10-05', equation_number: 'ISO-5667-10-05-D1',
    formula: "ctcv_cv_max = lookup('S7_2_2_4', 'ctcv', 'cv_max_pct')",
    input_symbols: [], output_symbol: 'ctcv_cv_max', output_unit: '%',
    clause_reference: '§7.2.2.4',
    description: 'Plan 3: der gedruckte Variationskoeffizient (20 % im Mittel), bis zu dem die zeitproportionale Mischprobe CTCV anwendbar ist — als Zwilling neben der Eingabe flow_cv_pct.',
    verification_quote: Q.L1026_1028,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-05', equation_number: 'ISO-5667-10-05-D2',
    formula: "ctcv_applicable = if(flow_cv_pct <= lookup('S7_2_2_4', 'ctcv', 'cv_max_pct'), 1, 0)",
    input_symbols: ['flow_cv_pct'], output_symbol: 'ctcv_applicable', output_unit: null,
    clause_reference: '§7.2.2.4',
    description: 'Plan 3: 1, wenn der Variationskoeffizient des Momentandurchflusses ≤ 20 % ist („el caudal instantáneo del efluente varía poco en el tiempo“), sonst 0 — Anhaltswert („puede aplicarse … por ejemplo“), kein Gate.',
    verification_quote: Q.L1026_1028,
  },

  // ---- ISO-5667-10-06: Fórmula (3) bottles, tube-bore velocity limit ----
  {
    standard: STD, worksheet: 'ISO-5667-10-06', equation_number: 'ISO-5667-10-06-D1',
    formula: 'v_n_sum = sum_rows(flaschen_ctcv, v_n)',
    input_symbols: ['flaschen_ctcv'], output_symbol: 'v_n_sum', output_unit: 'ml',
    clause_reference: '§7.2.2.3, Fórmula (3)',
    description: 'Plan 3: Σ Vn über die Flaschen (Vn = Vfinal · (M3n / M3total) je Zeile) — soll Vfinal ergeben; die prod-Gleichung 3 (ein V_n aus einem M3_n) bleibt.',
    verification_quote: Q.L1013_1023,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-06', equation_number: 'ISO-5667-10-06-D2',
    formula: 'm3_n_sum = sum_rows(flaschen_ctcv, m3_n)',
    input_symbols: ['flaschen_ctcv'], output_symbol: 'm3_n_sum', output_unit: 'm³',
    clause_reference: '§7.2.2.3, Fórmula (3)',
    description: 'Plan 3: Σ M3n über die Flaschen — soll M3total („volumen total descargado“) ergeben.',
    verification_quote: Q.L1017_1023,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-06', equation_number: 'ISO-5667-10-06-D3',
    formula: 'flaschen_count = count_rows(flaschen_ctcv)',
    input_symbols: ['flaschen_ctcv'], output_symbol: 'flaschen_count', output_unit: null,
    clause_reference: '§7.2.2.3, §11.1',
    description: 'Plan 3: Anzahl der Einzelflaschen (die Zahl der Elementarproben, die §11.1 im Bericht verlangt).',
    verification_quote: Q.L1717,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-06', equation_number: 'ISO-5667-10-06-D4',
    formula: "suction_velocity_min = lookup('S7_2_2_1_TUBE', if(tube_internal_diameter >= lookup('S7_2_2_1_TUBE', 'ge12', 'bore_min_mm'), 'ge12', 'ge9'), 'min_velocity_m_s')",
    input_symbols: ['tube_internal_diameter'], output_symbol: 'suction_velocity_min', output_unit: 'm/s',
    clause_reference: '§7.2.2.1',
    description: 'Plan 3: Mindest-Ansauggeschwindigkeit nach dem Innendurchmesser — 0,5 m/s („no debe ser inferior a 0,5 m/s“), ab 12 mm 0,3 m/s (NOTA 1, „se ha demostrado que … es aceptable“); CR-017 prüft fest 0,5 — Umstellung STAGED (iso5667_10-G-4).',
    verification_quote: `${Q.L922_923} — ${Q.L928_930}`,
  },

  // ---- ISO-5667-10-07: samplers ----
  {
    standard: STD, worksheet: 'ISO-5667-10-07', equation_number: 'ISO-5667-10-07-D1',
    formula: 'geraete_count = count_rows(probenahmegeraete)',
    input_symbols: ['probenahmegeraete'], output_symbol: 'geraete_count', output_unit: null,
    clause_reference: '§8.2',
    description: 'Plan 3: Anzahl der erfassten Probenahmegeräte.',
    verification_quote: Q.L1304_1305,
  },
  {
    standard: STD, worksheet: 'ISO-5667-10-07', equation_number: 'ISO-5667-10-07-D2',
    formula: 'geraete_unit_volume_fail = count_rows(probenahmegeraete, unit_volume_ok == 0)',
    input_symbols: ['probenahmegeraete'], output_symbol: 'geraete_unit_volume_fail', output_unit: null,
    clause_reference: '§7.2.2.1',
    description: 'Plan 3: Geräte, deren Einheitsvolumen unter dem gedruckten Minimum der Pumpentechnologie liegt (S7_2_2_1_PUMP: 50 ml Vakuumpumpe, 25 ml Inline-Kolben) oder nicht eingetragen ist; Technologien ohne gedrucktes Minimum zählen nie (iso5667_10-E-1). Gate STAGED (iso5667_10-G-5).',
    verification_quote: Q.L934_937,
  },

  // ---- ISO-5667-10-08: homogeniser by collected volume (§9.1) ----
  {
    standard: STD, worksheet: 'ISO-5667-10-08', equation_number: 'ISO-5667-10-08-D1',
    formula: "homogenizer_mechanical_required = if(collected_volume > lookup('S9_1', 'gt5', 'threshold_l'), 1, 0)",
    input_symbols: ['collected_volume'], output_symbol: 'homogenizer_mechanical_required', output_unit: null,
    clause_reference: '§9.1',
    description: 'Plan 3: 1 bei gesammeltem Volumen > 5 l („los homogeneizadores … con agitador magnético o mecánico deberían utilizarse“), 0 bei ≤ 5 l („puede aplicarse el método de laboratorio“); Gate auf homogenizer_type STAGED (iso5667_10-G-2).',
    verification_quote: `${Q.L1474_1477} — ${Q.L1486_1487}`,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
