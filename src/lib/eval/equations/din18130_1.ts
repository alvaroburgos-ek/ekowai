/**
 * DIN-18130-1 — Plan 3 Task 10 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts din18130_1` (NEW equation
 * rows only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted
 * from the transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-18130-1\DIN-18130-1.md`
 * (line in the comment).
 *
 * Single-source: no row here outputs a symbol prod already produces (Q, v, i, k,
 * k_10, h keep their verified equations). The register-fed rows live on the
 * register's worksheet (-03 `ablesungen`, -04 `versuche`); the scalar rows
 * (alpha_calc, k_10_calc, bereich_code) are not server-materialised (amendment D).
 *
 * NOT emitted (STAGED in scripts/verification/din18130_1-STAGED-plan3-rulings.sql):
 *   - `k_switch = if(gefaelle_typ == 'konstant', Q·l/(A·h), a·l_0/(A·t)·ln(h_1/h_2))`
 *     replacing the three prod rows that all write `k` (Gl. 4 / 8 / 9) → din18130_1-R-1;
 *   - Gl. 6 reading `k_T_mean` (from -03) instead of the hand-typed `k_T`, and
 *     without the redundant `alpha` input → din18130_1-R-2 / D-1;
 *   - `k_f = k_10` on -05 (an existing required manual input with gate CR-07) → R-3 / X-1.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';

const STD = 'DIN-18130-1';

export const EQUATIONS: EquationEntry[] = [
  {
    standard: STD, worksheet: 'DIN-18130-1-03', equation_number: 'DIN-18130-1-03-D1',
    formula: 'k_T_mean = mean_rows(ablesungen, k_row)',
    input_symbols: ['ablesungen'], output_symbol: 'k_T_mean', output_unit: 'm/s',
    clause_reference: '§7.1.4.4, §8.1, §8.2',
    description: 'Plan 3: k_T = Mittel der je Ablesung berechneten k-Werte (Gl. 8 mit Q = V_w/t bzw. Gl. 9 je Zeile); welche Ablesungen eingehen (alle vollständigen Zeilen) ist din18130_1-J-1; Umstellung von Gl. 6 STAGED (din18130_1-R-2).',
    verification_quote: String.raw`& \qquad k_{\mathrm{T}}=\frac{V_{\mathrm{w}} \cdot l}{A \cdot h \cdot t} \\`, // L1334 (Tab. 11)
  },
  {
    standard: STD, worksheet: 'DIN-18130-1-03', equation_number: 'DIN-18130-1-03-D2',
    formula: 'alpha_calc = 1.359 / (1 + 0.0337 * T + 0.00022 * T^2)',
    input_symbols: ['T'], output_symbol: 'alpha_calc', output_unit: null,
    clause_reference: '§5.7, Gl. 6',
    description: 'Plan 3: Korrekturbeiwert α nach Gl. 6 (Poiseuille) aus der Wassertemperatur T; reproduziert Tab. 2 (1,158 / 1,000 / 0,874 / 0,771 / 0,686) und die Beispiele (0,7485 für T = 21,25 °C, 0,762 für T = 20,5 °C); Ablösung des Eingabefelds alpha STAGED (din18130_1-D-1).',
    verification_quote: String.raw`k_{10}=\frac{1,359}{1+0,0337 \cdot T+0,00022 \cdot T^{2}} k_{\mathrm{T}}=\alpha \cdot k_{\mathrm{T}} \tag{6}`, // L305
  },
  {
    standard: STD, worksheet: 'DIN-18130-1-03', equation_number: 'DIN-18130-1-03-D3',
    formula: 'k_10_calc = k_T_mean * alpha_calc',
    input_symbols: ['k_T_mean', 'alpha_calc'], output_symbol: 'k_10_calc', output_unit: 'm/s',
    clause_reference: '§5.7, Gl. 6, §8.4',
    description: 'Plan 3: k_10 = α · k_T mit k_T als Mittel der Ablesungen und α aus T dieses Arbeitsblatts (Tab. 10/11: „α für T = 0,5 × (…)“ — eine Temperatur je Versuch; die Zeilen zeigen zusätzlich α und k_10 je Ablesung, din18130_1-J-3); Übergabe an -04 / -05 STAGED (din18130_1-R-2 / R-3).',
    verification_quote: String.raw`\hline \multicolumn{6}{|l|}{Durchlässigkeitsbeiwert $k_{10}=3,48 \times 10^{-10} \mathrm{~m} / \mathrm{s}$} \\`, // L1357 (Tab. 11: mean of 3,66 / 3,43 / 3,35)
  },
  {
    standard: STD, worksheet: 'DIN-18130-1-03', equation_number: 'DIN-18130-1-03-D4',
    formula: "i_max_calc = max_rows(ablesungen, if(gefaelle_typ == 'konstant', h_row / l, h_1 / l_0))",
    input_symbols: ['ablesungen', 'gefaelle_typ', 'l', 'l_0'], output_symbol: 'i_max_calc', output_unit: null,
    clause_reference: '§8.4, Gl. 3',
    description: 'Plan 3: größtes hydraulisches Gefälle über die Ablesungen (Gl. 3 i = h/l; bei veränderlichem Gefälle h_1/l_0 zu Beginn der Ablesung); Beispiel 9.1 druckt max. i = 33 (h_1 = 0,655 m, l_0 = 0,01985 m).',
    verification_quote: 'Bei Versuchen mit veränderlichem hydraulischen Gefälle ist dessen Bereich (größtes und kleinstes hydraulisches Gefälle) anzugeben.', // L832
  },
  {
    standard: STD, worksheet: 'DIN-18130-1-03', equation_number: 'DIN-18130-1-03-D5',
    formula: "i_min_calc = min_rows(ablesungen, if(gefaelle_typ == 'konstant', h_row / l, h_2 / l_0))",
    input_symbols: ['ablesungen', 'gefaelle_typ', 'l', 'l_0'], output_symbol: 'i_min_calc', output_unit: null,
    clause_reference: '§8.4, Gl. 3',
    description: 'Plan 3: kleinstes hydraulisches Gefälle über die Ablesungen (bei veränderlichem Gefälle h_2/l_0 am Ende der Ablesung); Beispiel 9.1 druckt min. i = 25 bzw. 27 (h_2 = 0,503 / 0,534 m).',
    verification_quote: String.raw`Grenzfälle: $\quad \max . i=33$; min. $i=25$ bzw. 27`, // L918
  },
  {
    standard: STD, worksheet: 'DIN-18130-1-04', equation_number: 'DIN-18130-1-04-D1',
    formula: 'k_10_runs_mean = mean_rows(versuche, k_10_run)',
    input_symbols: ['versuche'], output_symbol: 'k_10_runs_mean', output_unit: 'm/s',
    clause_reference: '§8.3, §9.3, Tab. 10',
    description: 'Plan 3: Durchlässigkeitsbeiwert als Mittel der k_10 der einzelnen Versuche (Tab. 10: 3,84 / 3,74 / 3,74 → 3,77·10⁻⁹ m/s).',
    verification_quote: String.raw`\hline \multicolumn{5}{|l|}{Durchlässigkeitsbeiwert $k_{10}=3,77 \times 10^{-9} \mathrm{~m} / \mathrm{s}$} \\`, // L1133
  },
  {
    standard: STD, worksheet: 'DIN-18130-1-04', equation_number: 'DIN-18130-1-04-D2',
    formula: 'versuche_count = count_rows(versuche)',
    input_symbols: ['versuche'], output_symbol: 'versuche_count', output_unit: null,
    clause_reference: '§5.3',
    description: 'Plan 3: Anzahl der erfassten Durchströmungsversuche; §5.3 verlangt mindestens drei bei Prüfung des Dichteeinflusses (Gate STAGED, din18130_1-G-5).',
    verification_quote: 'Ist der Einfluß der Dichte auf die Durchlässigkeit zu prüfen, dann sind mindestens drei Durchströmungsversuche mit jeweils unterschiedlichen Porenzahlen des Probekörpers auszuführen (siehe 8.3).', // L246
  },
  {
    standard: STD, worksheet: 'DIN-18130-1-04', equation_number: 'DIN-18130-1-04-D3',
    formula: 'bereich_code = if(k_10 < 1e-8, 1, if(k_10 <= 1e-6, 2, if(k_10 <= 1e-4, 3, if(k_10 <= 1e-2, 4, 5))))',
    input_symbols: ['k_10'], output_symbol: 'bereich_code', output_unit: null,
    clause_reference: '§3.7, Tab. 1',
    description: 'Plan 3: Durchlässigkeitsbereich nach Tab. 1 aus k_10 — 1 „unter 10⁻⁸“ · 2 „10⁻⁸ bis 10⁻⁶“ · 3 „über 10⁻⁶ bis 10⁻⁴“ · 4 „über 10⁻⁴ bis 10⁻²“ · 5 „über 10⁻²“ (Grenzen einschließlich am oberen Ende der Zeile, wie gedruckt); Ersatz der Handauswahl STAGED (din18130_1-D-2).',
    verification_quote: String.raw`\hline unter $10^{-8}$ & sehr schwach durchlässig \\ \hline $10^{-8}$ bis $10^{-6}$ & schwach durchlässig \\ \hline über $10^{-6}$ bis $10^{-4}$ & durchlässig \\ \hline über $10^{-4}$ bis $10^{-2}$ & stark durchlässig \\ \hline über $10^{-2}$ & sehr stark durchlässig \\`, // L205–L209
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
