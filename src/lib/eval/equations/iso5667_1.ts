/**
 * ISO-5667-1 — Plan 3 Task 28 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts iso5667_1` (NEW equation rows only;
 * `ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING`). Every `verification_quote` is a
 * span of the IN-SESSION `pdftotext -layout` extraction of the standard's own PDF
 * (`regulation-tables-quotes-iso5667_1.ts`; PDF page in each span's doc comment — VA grade under SR-3,
 * 1980 edition throughout, iso5667_1-J-1).
 *
 * SINGLE SOURCE — nothing here re-produces a symbol prod already produces:
 *   - prod equation 1 `s = sqrt( SUM((x_i - x_mean)^2) / (n - 1) )` (id d42f576c…, verified) keeps its
 *     row. `SUM()` is not in the engine's function set, so that row can never compute; the register
 *     form ships under the DISTINCT symbol `s_calc` and the REPLACEMENT of equation 1 is a ruling
 *     (STAGED, iso5667_1-R-2), never an emitted edit.
 *   - prod equation 2 `L = 2 * K * sigma / sqrt(n)` (id db88161d…) and equation 3
 *     `n = (2 * K * sigma / L)^2` (id 8b5fc076…) already COMPUTE through the engine (probed this
 *     session: the printed §16.5 worked example reproduces 61,4656 ≈ 61). The brief's
 *     `n_required_calc = (2 * K * sigma / L) ^ 2` is therefore NOT emitted — it would be a second
 *     equation for a quantity equation 3 already produces (iso5667_1-R-1); `n_hist` below is a
 *     DIFFERENT quantity (how many results are on the sheet, not how many are required).
 *   - `x_mean` and `n` stay engineer inputs; `x_mean_calc` / `n_hist` are register twins and their
 *     retirement is a D-block.
 *
 * `stdev_rows` is the SAMPLE (n − 1) form — probed in this session against the engine, and that is the
 * divisor the standard PRINTS at §16.4 (L822 "n −1"). Gap G-4 therefore does NOT bite here: no silent
 * switch, the printed definition and the engine agree. Edge cases (0 rows ⇒ "Keine vollständigen
 * Zeilen", 1 row ⇒ "mindestens 2 vollständige Zeilen erforderlich") are pinned in
 * `equations-iso5667-1.test.ts` — an empty register is never a phantom pass.
 *
 * Every row here is register-fed and materialises on save on its own worksheet; there is no
 * scalar-only row in this module (amendment D's note does not apply).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-quotes-iso5667_1';

const STD = 'ISO-5667-1';

export const EQUATIONS: EquationEntry[] = [
  // ---- ISO-5667-1-02: the determinand register (§3 / §15.2 / §16) ----
  {
    standard: STD, worksheet: 'ISO-5667-1-02', equation_number: 'ISO-5667-1-02-D1',
    formula: 'determinands_count = count_rows(determinands)',
    input_symbols: ['determinands'], output_symbol: 'determinands_count', output_unit: null,
    clause_reference: '§3',
    description: 'Plan 3: Anzahl der im Parameterverzeichnis erfassten Bestimmungsgrößen („se debe compilar una lista de parámetros de interés“).',
    verification_quote: Q.L749_754,
  },
  {
    standard: STD, worksheet: 'ISO-5667-1-02', equation_number: 'ISO-5667-1-02-D2',
    formula: 'n_programme = max_rows(determinands, n_required)',
    input_symbols: ['determinands'], output_symbol: 'n_programme', output_unit: null,
    clause_reference: '§15.2, §16.5',
    description: 'Plan 3: maßgebende Probenanzahl des Programms = größtes n_required über alle Bestimmungsgrößen; §16.5 bemisst n je Bestimmungsgröße, das Programm muss die anspruchsvollste erfüllen.',
    verification_quote: Q.L871_881,
  },

  // ---- ISO-5667-1-05: the sites register (§8.1) ----
  {
    standard: STD, worksheet: 'ISO-5667-1-05', equation_number: 'ISO-5667-1-05-D1',
    formula: 'sites_count = count_rows(sites_1)',
    input_symbols: ['sites_1'], output_symbol: 'sites_count', output_unit: null,
    clause_reference: '§8.1, §8.2',
    description: 'Plan 3: Anzahl der erfassten Probenahmestellen („la red de muestreo puede tener cualquier forma desde un solo sitio hasta todo un desagüe de río“).',
    verification_quote: Q.L295_302,
  },

  // ---- ISO-5667-1-07: x̄ / n / s from the historical results (§16.4) ----
  {
    standard: STD, worksheet: 'ISO-5667-1-07', equation_number: 'ISO-5667-1-07-D1',
    formula: 'x_mean_calc = mean_rows(historical_results, x_value)',
    input_symbols: ['historical_results'], output_symbol: 'x_mean_calc', output_unit: 'mg/l',
    clause_reference: '§16.4',
    description: 'Plan 3: arithmetisches Mittel x̄ der vorliegenden Einzelergebnisse („las estimaciones de la media aritmética verdadera X … son la media aritmética, X“); Zwilling des Eingabefelds x_mean — Ablösung STAGED (iso5667_1-D-23).',
    verification_quote: Q.L807_810,
  },
  {
    standard: STD, worksheet: 'ISO-5667-1-07', equation_number: 'ISO-5667-1-07-D2',
    formula: 'n_hist = count_rows(historical_results)',
    input_symbols: ['historical_results'], output_symbol: 'n_hist', output_unit: null,
    clause_reference: '§16.4',
    description: 'Plan 3: Anzahl n der vorliegenden Einzelergebnisse („Para cierto número de resultados n, tomados al azar“). NICHT das n der Gl. 3 (erforderliche Probenanzahl) — iso5667_1-R-1.',
    verification_quote: Q.L807_810,
  },
  {
    standard: STD, worksheet: 'ISO-5667-1-07', equation_number: 'ISO-5667-1-07-D3',
    formula: 's_calc = stdev_rows(historical_results, x_value)',
    input_symbols: ['historical_results'], output_symbol: 's_calc', output_unit: 'mg/l',
    clause_reference: '§16.4',
    description: 'Plan 3: Standardabweichung s aus den Einzelergebnissen — Stichprobenform mit dem gedruckten Nenner n − 1 (stdev_rows ist die (n − 1)-Form, in dieser Sitzung an der Engine geprüft). Zwilling der prod-Gleichung 1, deren SUM()-Form die Engine nicht auswertet; die Ersetzung ist STAGED (iso5667_1-R-2).',
    verification_quote: Q.L813_822,
  },

  // ---- ISO-5667-1-08: the flow-measurement register (§19.1) ----
  {
    standard: STD, worksheet: 'ISO-5667-1-08', equation_number: 'ISO-5667-1-08-D1',
    formula: 'flow_measurements_count = count_rows(flow_measurements)',
    input_symbols: ['flow_measurements'], output_symbol: 'flow_measurements_count', output_unit: null,
    clause_reference: '§19.1',
    description: 'Plan 3: Anzahl der erfassten Durchflussmessstellen („Hay tres aspectos del flujo que es necesario medir“). Eine Zählung über method_ok ist NICHT emittiert: eine nicht gedruckte (Aspekt, Verfahren)-Kombination hat keine S21-Zeile, die Zelle bleibt leer und jede Aggregation darüber ginge auf manual_required (iso5667_1-F-1).',
    verification_quote: Q.L941_947,
  },
];

const _module: EquationModule = { EQUATIONS };
export default _module;
