/**
 * DWA-A-178 — Plan 3 Task 14 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts a178` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted from the
 * transcript `Desktop\Guidelines\DWA-A-178\DWA-A_178.md` (the `Q` spans of the
 * seed module, line in the key).
 *
 * Single-source: no row here outputs a symbol prod already produces (B_RBF_zu,
 * A_F, Q_Dr_RBF, C_RBFA_zu, b_F, B_RBFA_ab, eta_RBF_hyd, eta_F, b_F_im_bereich,
 * emission_eingehalten keep their verified rows — Gl. 1–13). Every register-fed
 * row lives on its register's worksheet (-04 `teilflaechen_178`, -13
 * `frachtpfade`, -18 `iterationen` / `betriebsbefunde`); the scalar rows
 * (-07 D1…D3, -10 D1, -11 D1, -13 D2) are not server-materialised (amendment D).
 * Existing inputs are bound by their prod symbols (A_E_b_a on -10, V_RR / V_FK
 * are created inputs on -11, C_RBFA_zu / eta_VS / A_F on -13) — never a second
 * producer of a quantity an input already carries (amendment K).
 *
 * NOT emitted (STAGED in scripts/verification/a178-STAGED-plan3-rulings.sql):
 *   - Gl. 2 / Gl. 3 on A178-09 re-pointed to B_RBF_zu_calc (one equation over
 *     rows instead of two rows writing B_RBF_zu with a phantom `SUM_over_i`)
 *     → a178-R-1;
 *   - Gl. 5 / 6 / 7 on A178-13 (three rows writing b_F, first wins) replaced by
 *     b_F_calc → a178-R-2; the η_F circularity (Tab. 1 input vs Gl. 13 output)
 *     → a178-R-3; B_RBFA_ab = B_RBF_ab_calc + B_VS (B_VS not inherited on -13)
 *     → a178-R-4.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-seed-a178';

const STD = 'DWA-A-178';

export const EQUATIONS: EquationEntry[] = [
  // ---- A178-04: Teilflächen (Gl. 2 / Gl. 3) ----
  {
    standard: STD, worksheet: 'A178-04', equation_number: 'A178-04-D1',
    formula: 'A_E_b_a_calc = sum_rows(teilflaechen_178, a_e_b_a_i)',
    input_symbols: ['teilflaechen_178'], output_symbol: 'A_E_b_a_calc', output_unit: 'ha',
    clause_reference: '§6.2.2.1, Gl. (2)',
    description: 'Plan 3: A_E,b,a = Summe aller befestigten, angeschlossenen Teilflächen A_E,b,a,i des Registers (Gl. 2 / 3 summieren über i); Ablösung der Handeingabe A_E_b_a STAGED (a178-D-1).',
    verification_quote: Q.L915, // "Summe aller befestigten, angeschlossenen Flächen im Einzugsgebiet der Retentionsbodenfilteranlage"
  },
  {
    standard: STD, worksheet: 'A178-04', equation_number: 'A178-04-D2',
    formula: 'B_RBF_zu_calc = sum_rows(teilflaechen_178, b_row)',
    input_symbols: ['teilflaechen_178'], output_symbol: 'B_RBF_zu_calc', output_unit: 'kg/a',
    clause_reference: '§6.2.2.1, Gl. (2), Gl. (3)',
    description: 'Plan 3: B_RBF,zu = Σ (A_E,b,a,i · b_R,a) im Trenn-/Straßensystem (Gl. 2) bzw. Σ (A_E,b,a,i · b_R,a · e_0) im Mischsystem (Gl. 3, e_0 in % → /100) — die Zeile b_row schaltet über den vererbten system_type; Umstellung der Gl. 2 / 3 auf A178-09 und Übergabe an A178-10 STAGED (a178-R-1 / C-5).',
    verification_quote: `${Q.L723} — ${Q.L730}`,
  },
  {
    standard: STD, worksheet: 'A178-04', equation_number: 'A178-04-D3',
    formula: 'teilflaechen_count = count_rows(teilflaechen_178)',
    input_symbols: ['teilflaechen_178'], output_symbol: 'teilflaechen_count', output_unit: null,
    clause_reference: '§6.2.2.1, Gl. (2)',
    description: 'Plan 3: Anzahl der erfassten Teilflächen i (0 bei leerem Register).',
    verification_quote: Q.L737, // "befestigte, angeschlossene Teilflächen im Einzugsgebiet der Retentionsbodenfilteranlage"
  },

  // ---- A178-07: printed twins of the typed design parameters ----
  {
    standard: STD, worksheet: 'A178-07', equation_number: 'A178-07-D1',
    formula: "b_krit_tab = lookup('S6_LIMITS', 'b_krit', 'wert')",
    input_symbols: [], output_symbol: 'b_krit_tab', output_unit: 'kg/(m²·a)',
    clause_reference: '§6.2.2.1, Gl. (9)',
    description: 'Plan 3: b_krit = 7 kg/(m²·a) (§6.2.2.1 "festgesetzt"), als Zwilling neben dem Eingabefeld b_krit (a178-D-10); REQ-19 prüft den Literalwert 7 statt b_krit (a178-G-2).',
    verification_quote: Q.L689,
  },
  {
    standard: STD, worksheet: 'A178-07', equation_number: 'A178-07-D2',
    formula: "q_Dr_RBF_vorgabe = lookup('S6_2_ANHALT', 'q_dr_rbf_vorbemessung', 'wert')",
    input_symbols: [], output_symbol: 'q_Dr_RBF_vorgabe', output_unit: 'l/(s·m²)',
    clause_reference: '§6.1.4.10, §6.2.2.1',
    description: 'Plan 3: q_Dr,RBF = 0,05 l/(s·m²) — "kann … angesetzt werden" für die Berechnung des Drosselabflusses (Gl. 4) und Obergrenze bei Volleinstau (§6.1.4.10); für die Nachweisrechnung muss die Kennlinie des Drosselorgans angesetzt werden; Zwilling neben dem Eingabefeld q_Dr_RBF (a178-D-11).',
    verification_quote: Q.L767,
  },
  {
    standard: STD, worksheet: 'A178-07', equation_number: 'A178-07-D3',
    formula: "v_spez_grobstoff_min = lookup('S6_LIMITS', 'v_spez_min', 'wert')",
    input_symbols: [], output_symbol: 'v_spez_grobstoff_min', output_unit: 'm³/ha',
    clause_reference: '§6.2.1.2',
    description: 'Plan 3: erforderliches spezifisches Sammelvolumen des Grobstoffrückhalts 0,5 m³/ha A_E,b,a (Trennsystem; Straßenentwässerung außerhalb von Wasserschutzgebieten wie Trennsystem, §6.2.1.3); Zwilling neben dem Eingabefeld v_spez_grobstoff.',
    verification_quote: Q.L677,
  },

  // ---- A178-10: Straße simplification ----
  {
    standard: STD, worksheet: 'A178-10', equation_number: 'A178-10-D1',
    formula: "A_F_strasse = lookup('S6_2_RECHENWERTE', 'a_f_strasse_m2_ha', 'wert') * A_E_b_a",
    input_symbols: ['A_E_b_a'], output_symbol: 'A_F_strasse', output_unit: 'm²',
    clause_reference: '§6.2.2.2',
    description: 'Plan 3: A_F = 100 m²/ha · A_E,b,a — die vereinfachte Bemessung für Straßenabflüsse, wenn keine spezifischen Behandlungsziele formuliert wurden (spezifische_ziele_formuliert auf A178-02); in Worten gedruckt (a178-F-4); Gate A_F ≥ A_F_strasse STAGED (a178-G-4).',
    verification_quote: Q.L782,
  },

  // ---- A178-11: V_RBF = V_RR + 15 % · V_FK ----
  {
    standard: STD, worksheet: 'A178-11', equation_number: 'A178-11-D1',
    formula: "V_RBF_calc = V_RR + lookup('S6_2_RECHENWERTE', 'porenvolumen_pct', 'wert') / 100 * V_FK",
    input_symbols: ['V_RR', 'V_FK'], output_symbol: 'V_RBF_calc', output_unit: 'm³',
    clause_reference: '§6.2.2.1 Schritt 4',
    description: 'Plan 3: nutzbares Retentionsvolumen = Volumen des Retentionsraums + nutzbares Porenvolumen des Filterkörpers, pauschal 15 % des Filterkörpervolumens (in Worten gedruckt, a178-F-3); das Eingabefeld V_RBF bleibt — Ablösung STAGED (a178-D-8).',
    verification_quote: Q.L775,
  },

  // ---- A178-13: Frachtpfade (Gl. 5 / 6 / 7), C_RBF,zu, B_RBF,ab ----
  {
    standard: STD, worksheet: 'A178-13', equation_number: 'A178-13-D1',
    formula: 'b_F_calc = sum_rows(frachtpfade, vq_m3 * eta_tab1) * C_RBFA_zu * (1 - eta_VS) / (A_F * 1000)',
    input_symbols: ['frachtpfade', 'C_RBFA_zu', 'eta_VS', 'A_F'], output_symbol: 'b_F_calc', output_unit: 'kg/(m²·a)',
    clause_reference: '§6.2.2.3, Gl. (5), Gl. (6), Gl. (7)',
    description: 'Plan 3: b_F = Σ (VQ_k · η_k) · C_RBFA,zu · (1 − η_VS) / (A_F · 1.000) über die erfassten Abflusspfade — mit nur dem Drosselabfluss = Gl. 5 (Fangfilterbecken), + Filterbeckenüberlauf = Gl. 6 (Durchlauffilterbecken), + RRL-Drossel = Gl. 7; η_k aus Tab. 1 (locked); Umstellung der drei Gleichungszeilen STAGED (a178-R-2).',
    verification_quote: `${Q.L815} — ${Q.L822} — ${Q.L829}`,
  },
  {
    standard: STD, worksheet: 'A178-13', equation_number: 'A178-13-D2',
    formula: 'C_RBF_zu_calc = C_RBFA_zu * (1 - eta_VS)',
    input_symbols: ['C_RBFA_zu', 'eta_VS'], output_symbol: 'C_RBF_zu_calc', output_unit: 'mg/l',
    clause_reference: '§6.2.2.3 b), Gl. (5)–(7)',
    description: 'Plan 3: Zulaufkonzentration zum Retentionsbodenfilterbecken = C_RBFA,zu (Gl. 8) abgemindert um die Wirksamkeit der Vorstufe — mit η_VS = 0 gleich C_RBFA,zu; der Faktor (1 − η_VS) ist in Gl. (5) bis (7) gedruckt, die Abminderung selbst nur in Worten (a178-F-1); das Eingabefeld C_RBF_zu auf A178-12 bleibt (a178-D-6).',
    verification_quote: Q.L975,
  },
  {
    standard: STD, worksheet: 'A178-13', equation_number: 'A178-13-D3',
    formula: 'B_RBF_ab_calc = sum_rows(frachtpfade, b_ab)',
    input_symbols: ['frachtpfade'], output_symbol: 'B_RBF_ab_calc', output_unit: 'kg/a',
    clause_reference: '§6.2.2.3 b), Gl. (11)',
    description: 'Plan 3: Frachtaustrag aus dem Retentionsbodenfilterbecken = Summe aus Restfracht filtriert, Entlastung über den Filterbeckenüberlauf und, wenn vorhanden, aus der Regenrückhaltelamelle (zu Gl. 13 beschrieben) — je Pfad VQ · C_RBFA,zu · (1 − η_VS) · (1 − η) / 1.000 (Pfadform in Worten, a178-F-2); die Eingabefelder auf A178-14 bleiben (a178-D-7), B_RBFA,ab = Σ + B_VS STAGED (a178-R-4).',
    verification_quote: Q.L967_970,
  },
  {
    standard: STD, worksheet: 'A178-13', equation_number: 'A178-13-D4',
    formula: 'frachtpfade_unzulaessig = count_rows(frachtpfade, zulaessig == 0)',
    input_symbols: ['frachtpfade'], output_symbol: 'frachtpfade_unzulaessig', output_unit: null,
    clause_reference: '§6.2.2.3, Gl. (5)–(7)',
    description: 'Plan 3: Pfade, die nicht zur Anlagenkonfiguration passen (Filterbeckenüberlauf bei Fangfilterbecken, RRL-Drossel ohne Regenrückhaltelamelle — aus becken_typ / rrl_vorhanden); Gate „= 0“ STAGED (a178-G-5).',
    verification_quote: `${Q.L819} — ${Q.L826}`,
  },

  // ---- A178-18: Iterationen + Betriebsbefunde ----
  {
    standard: STD, worksheet: 'A178-18', equation_number: 'A178-18-D1',
    formula: 'iteration_count_calc = count_rows(iterationen)',
    input_symbols: ['iterationen'], output_symbol: 'iteration_count_calc', output_unit: null,
    clause_reference: '§6.2.2.4',
    description: 'Plan 3: Anzahl der Iterationsschritte des Registers (0 bei leerem Register); das Eingabefeld iteration_count bleibt (a178-D-9).',
    verification_quote: Q.L983,
  },
  {
    standard: STD, worksheet: 'A178-18', equation_number: 'A178-18-D2',
    formula: 'A_F_last = sum_rows(last_rows(iterationen, 1), a_f)',
    input_symbols: ['iterationen'], output_symbol: 'A_F_last', output_unit: 'm²',
    clause_reference: '§6.2.2.4',
    description: 'Plan 3: A_F des letzten vollständigen Iterationsschritts (Eingabereihenfolge); leeres Register → nicht berechenbar; das Eingabefeld A_F_iterated bleibt (a178-D-9).',
    verification_quote: Q.L983,
  },
  {
    standard: STD, worksheet: 'A178-18', equation_number: 'A178-18-D3',
    formula: 'b_F_last = sum_rows(last_rows(iterationen, 1), b_f)',
    input_symbols: ['iterationen'], output_symbol: 'b_F_last', output_unit: 'kg/(m²·a)',
    clause_reference: '§6.2.2.4',
    description: 'Plan 3: b_F des letzten vollständigen Iterationsschritts; das Eingabefeld b_F_iterated bleibt (a178-D-9).',
    verification_quote: Q.L983,
  },
  {
    standard: STD, worksheet: 'A178-18', equation_number: 'A178-18-D4',
    formula: 'iterationen_konvergiert = count_rows(iterationen, konvergiert == true)',
    input_symbols: ['iterationen'], output_symbol: 'iterationen_konvergiert', output_unit: null,
    clause_reference: '§6.2.2.4',
    description: 'Plan 3: Anzahl der Schritte, in denen alle Vorgaben und Nachweise erfüllt sind (ein leeres Boolean zählt als nein); REQ-24 liest weiterhin convergence_achieved (a178-D-9).',
    verification_quote: Q.L983,
  },
  {
    standard: STD, worksheet: 'A178-18', equation_number: 'A178-18-D5',
    formula: 'befunde_count = count_rows(betriebsbefunde)',
    input_symbols: ['betriebsbefunde'], output_symbol: 'befunde_count', output_unit: null,
    clause_reference: '§8.3.1, Tab. 2',
    description: 'Plan 3: Anzahl der erfassten Betriebsbefunde der Sichtkontrolle.',
    verification_quote: Q.L1078,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
