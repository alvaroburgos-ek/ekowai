/**
 * DIN-276 — Plan 3 Task 13 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts din276` (NEW equation rows only;
 * `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted from the
 * transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-276\DIN-276.md` (the `Q` spans
 * of the seed module; line in the comment).
 *
 * The standard prints NO numbered equations: the totals are defined in words
 * (§3.11 "sum of cost groups 100 to 800", §3.12 "sum of cost groups 300 and 400",
 * §3.13 "ratio of costs to a reference unit", §4.4.2 "compared with previous cost
 * determinations") — every row below is a text-described derivation
 * (`<WS>-D<n>`, F-blocks din276-F-1 … F-3).
 *
 * Single-source: no row outputs a symbol prod already produces (the 48 KG roll-ups,
 * IDENT-01 GK_total, IDENT-02 building_costs, IDENT-03 cost_parameter, IDENT-04
 * deviation_amount keep their rows); every output is a CREATED `_calc` / `_sum` /
 * `_count` / `_from_rows` twin with a D-block per pair. Register-fed rows live on
 * the register's worksheet and are materialised on save; the scalar chains
 * (DIN-276-18-D9 / D10, DIN-276-24-D1 … D4) compute on hook / report / snapshot /
 * PDF only (amendment D, din276-I-2).
 */
import type { EquationEntry } from '../field-configs/types';
import { Q, STAGE_TOKENS, SONDERKOSTEN_ART, T1_ROWS } from '../regulation-tables-seed-din276';
import { KG_WORKSHEETS, secondLevelOf, kgRegisterSymbol, kgSumSymbol, kgCountSymbol, kgFremdSymbol, kgAbwSymbol, kg2SumSymbol } from '../field-configs/din276';

const STD = 'DIN-276';
const eq = (worksheet: string, n: number, formula: string, input_symbols: string[], output_unit: string | null, clause_reference: string, description: string, verification_quote: string): EquationEntry => ({
  standard: STD, worksheet, equation_number: `${worksheet}-D${n}`, formula, input_symbols, output_symbol: formula.split('=')[0].trim(), output_unit, clause_reference, description, verification_quote,
});

function kgEquations(k: (typeof KG_WORKSHEETS)[number]): EquationEntry[] {
  const reg = kgRegisterSymbol(k.n);
  const level2 = secondLevelOf(k.kg1);
  return [
    eq(k.ws, 1, `${kgSumSymbol(k.n)} = if(count_rows(${reg}, im_kg == 1) > 0, sum_rows(${reg}, kosten_eur, im_kg == 1), 0)`, [reg], 'EUR', '§5.4 Table 1, §3.11',
      `Plan 3: Σ der Kosten aller Positionen der ${k.kg1} im Register (Zeilen anderer Kostengruppen ausgeschlossen; 0 ohne Zeilen). Zwilling zu kg_${k.kg1.slice(3)}_total (din276-D-3); Σ ist als Satz, nicht als Gleichung gedruckt (din276-F-2).`, Q.L163),
    eq(k.ws, 2, `${kgCountSymbol(k.n)} = count_rows(${reg}, im_kg == 1)`, [reg], null, '§5.4 Table 1', `Plan 3: Anzahl der Positionen der ${k.kg1} im Register.`, Q.L457),
    eq(k.ws, 3, `${kgFremdSymbol(k.n)} = count_rows(${reg}, im_kg == 0)`, [reg], null, '§5.4 Table 1', `Plan 3: Positionen im Register, deren Tab.-1-Zeile nicht zur ${k.kg1} gehört (werden in keiner Summe gezählt).`, Q.L457),
    eq(k.ws, 4, `${kgAbwSymbol(k.n)} = count_rows(${reg}, abw == 1)`, [reg], null, '§3.13', 'Plan 3: Positionen, deren getippte Kosten von Menge · Kostenkennwert abweichen (nur Zeilen mit beiden Eingaben).', Q.L175),
    ...level2.map((l, i) => eq(k.ws, 5 + i, `${kg2SumSymbol(l.code)} = if(count_rows(${reg}, ebene2 == 'KG ${l.code}') > 0, sum_rows(${reg}, kosten_eur, ebene2 == 'KG ${l.code}'), 0)`, [reg], 'EUR', `§5.4 Table 1 (KG ${l.code})`,
      `Plan 3: Σ der Positionen der KG ${l.code} ${l.designation} und ihrer Untergruppen im Register (0 ohne Zeilen). Zwilling zu kg_${l.code}${T1_ROWS.some((r) => r.level === 3 && r.kg2 === l.kg2) ? '_total' : ''} (din276-D-3).`, T1_ROWS.find((r) => r.code === l.code)!.span)),
  ];
}

export const EQUATIONS: EquationEntry[] = [
  // ---- DIN-276-04 Flurstücke → GF (Tab. 2 KG 100) ----
  eq('DIN-276-04', 1, 'grundstuecksflaeche_GF_calc = sum_rows(flurstuecke, flaeche_m2)', ['flurstuecke'], 'm²', '§6.2 Table 2 (KG 100)', 'Plan 3: Grundstücksfläche GF als Σ der Flurstücksflächen („Plot area (GF) — Total plot area according to DIN 277-1“). Das Eingabefeld grundstuecksflaeche_GF bleibt (din276-D-7).', Q.L1022),
  eq('DIN-276-04', 2, 'flurstuecke_count = count_rows(flurstuecke)', ['flurstuecke'], null, '§6.2 Table 2 (KG 100)', 'Plan 3: Anzahl der Flurstücke.', Q.L1022),

  // ---- DIN-276-07 Kennwert-Quellen (§4.2.7) ----
  eq('DIN-276-07', 1, 'kennwert_quellen_count = count_rows(kennwert_quellen)', ['kennwert_quellen'], null, '§4.2.7', 'Plan 3: Anzahl der angegebenen Kostenkennwert-Quellen („the sources of the cost parameters used must be stated“); Gate ≥ 1 ist STAGED (din276-G-3).', Q.L235),

  // ---- DIN-276-08 Sonderkosten (§4.2.10–4.2.14) ----
  ...SONDERKOSTEN_ART.map((art, i) => eq('DIN-276-08', i + 1, `sonderkosten_${art}_sum = if(count_rows(sonderkosten, art == '${art}') > 0, sum_rows(sonderkosten, betrag, art == '${art}'), 0)`, ['sonderkosten'], 'EUR', `§4.2.${10 + i}`,
    `Plan 3: Σ der Sonderkosten-Zeilen der Art „${art}“ (0 ohne Zeilen). Zwilling zum getippten Einzelwert auf DIN-276-08 (din276-D-4); REQ-${10 + i} auf die Summe ist STAGED (din276-G-2).`, [Q.L247, Q.L251, Q.L255, Q.L259, Q.L263][i])),
  eq('DIN-276-08', 6, 'sonderkosten_nicht_separat = count_rows(sonderkosten, separat_ausgewiesen == false)', ['sonderkosten'], null, '§4.2.10–4.2.14', 'Plan 3: Sonderkosten-Zeilen ohne „separat ausgewiesen“ („… but recognised separately“); Gate == 0 ist STAGED (din276-G-2).', Q.L251),

  // ---- DIN-276-09 … -16: KG-item registers ----
  ...KG_WORKSHEETS.flatMap(kgEquations),

  // ---- DIN-276-18: stage × KG matrix (§4.3.2–4.3.7, §4.4.2) ----
  ...STAGE_TOKENS.map((t, i) => eq('DIN-276-18', i + 1, `${['KR', 'KSch', 'KBer', 'KA', 'KF'][i]}_gesamt_calc = sum_rows(kostenstufen_matrix, if(stufe == '${t}', gesamt, 0))`, ['kostenstufen_matrix'], 'EUR', `§4.3.${2 + (i === 4 ? 3 : i)}, §3.11`,
    `Plan 3: Σ KG 100–800 der Stufe „${t}“ aus der Matrix (0, wenn die Stufe keine Zeile hat; mehrere Zeilen derselben Stufe werden addiert). Zwilling zum getippten ${['KR', 'KSch', 'KBer', 'KA', 'KF'][i]}_gesamt („Σ KG 100-800“, din276-D-1).`, [Q.L296, Q.L310, Q.L322, Q.L339, Q.L370][i])),
  eq('DIN-276-18', 6, 'stufen_count = count_rows(kostenstufen_matrix)', ['kostenstufen_matrix'], null, '§4.4.2', 'Plan 3: Anzahl der vollständig erfassten Kostenermittlungsstufen.', Q.L380),
  eq('DIN-276-18', 7, 'stufe_aktuell_gesamt = sum_rows(last_rows(kostenstufen_matrix, 1), gesamt)', ['kostenstufen_matrix'], 'EUR', '§4.4.2', 'Plan 3: Σ KG 100–800 der letzten vollständigen Matrixzeile (= aktuelle Kostenermittlung; Eingabereihenfolge, din276-F-1). Zwilling zu current_stage_total / KK_kosten_aktuell (DIN-276-26; din276-D-2 / C-3).', Q.L380),
  eq('DIN-276-18', 8, 'stufe_vorher_gesamt = sum_rows(last_rows(kostenstufen_matrix, 2), gesamt, count_rows(kostenstufen_matrix) >= 2) - sum_rows(last_rows(kostenstufen_matrix, 1), gesamt)', ['kostenstufen_matrix'], 'EUR', '§4.4.2', 'Plan 3: Σ KG 100–800 der vorletzten vollständigen Matrixzeile (Σ der letzten zwei minus die letzte; mit weniger als zwei Zeilen nicht berechenbar — nie 0). Zwilling zu previous_stage_total / KK_kosten_vorher (din276-D-2 / C-3).', Q.L380),
  eq('DIN-276-18', 9, 'stufen_abweichung = stufe_aktuell_gesamt - stufe_vorher_gesamt', ['stufe_aktuell_gesamt', 'stufe_vorher_gesamt'], 'EUR', '§4.4.2, §4.4.3', 'Plan 3: Abweichung der aktuellen von der vorherigen Kostenermittlung. Zwilling zu deviation_amount (IDENT-04, DIN-276-26, über getippte Eingaben — din276-E-1) / KK_delta_abs; die Beziehung ist als Satz gedruckt (din276-F-3).', Q.L386),
  eq('DIN-276-18', 10, 'stufen_abweichung_pct = stufen_abweichung * 100 / stufe_vorher_gesamt', ['stufen_abweichung', 'stufe_vorher_gesamt'], '%', '§4.4.2, §4.4.3', 'Plan 3: Abweichung in % der vorherigen Kostenermittlung. Zwilling zu deviation_percentage (DIN-276-27) / KK_delta_pct (din276-D-2).', Q.L386),
  eq('DIN-276-18', 11, 'bauwerk_aktuell = sum_rows(last_rows(kostenstufen_matrix, 1), bauwerk)', ['kostenstufen_matrix'], 'EUR', '§3.12', 'Plan 3: Bauwerkskosten (KG 300 + 400) der aktuellen Kostenermittlung aus der Matrix („Costs resulting from the sum of cost groups 300 and 400“).', Q.L169),

  // ---- DIN-276-21: award units (§4.3.5 / §4.3.6) ----
  eq('DIN-276-21', 1, 'KA_kostenstand_calc = sum_rows(vergabeeinheiten, aktuell)', ['vergabeeinheiten'], 'EUR', '§4.3.6', 'Plan 3: Σ der Vergabeeinheiten zum jeweils gewählten Kostenstand (Angebot / Auftrag / Rechnung je Zeile) — „compiling the costs on the basis of the current cost status (offer, order or invoice)“.', Q.L346),
  eq('DIN-276-21', 2, 'vergabeeinheiten_count = count_rows(vergabeeinheiten)', ['vergabeeinheiten'], null, '§4.3.5', 'Plan 3: Anzahl der Vergabeeinheiten.', Q.L341),
  ...(['angebot', 'auftrag', 'rechnung'] as const).map((s, i) => eq('DIN-276-21', 3 + i, `KA_${['angebote', 'auftraege', 'rechnungen'][i]}_count = count_rows(vergabeeinheiten, status == '${s}')`, ['vergabeeinheiten'], null, '§4.3.6', `Plan 3: Vergabeeinheiten mit Kostenstand „${s}“.${i === 0 ? ' Zwilling zu KA_angebote_eingegangen (din276-D-5).' : ''}`, Q.L346)),

  // ---- DIN-276-24: Kennwerte (§3.13; Tab. 2) ----
  eq('DIN-276-24', 1, 'KKW_bauwerk_eur_m2_BGF = building_costs / gross_floor_area_BGF', ['building_costs', 'gross_floor_area_BGF'], 'EUR/m²', '§3.13, §6.2 Table 2 (KG 300 / 400)', 'Plan 3: Kennwert Bauwerkskosten je m² BGF — „Value that represents the ratio of costs to a reference unit“; Tab. 2: KG 300 / 400 → Gross floor area (GFA). Beide Eingänge sind auf DIN-276-24 vererbt (Capture).', Q.L175),
  eq('DIN-276-24', 2, 'KKW_bauwerk_eur_m3_BRI = building_costs / gross_volume_BRI', ['building_costs', 'gross_volume_BRI'], 'EUR/m³', '§3.13', 'Plan 3: Kennwert Bauwerkskosten je m³ BRI (BRI ist keine Tab.-2-Bezugseinheit — Zwilling zum getippten KKW_analyse_eur_m3_BRI, din276-D-9).', Q.L175),
  eq('DIN-276-24', 3, 'GK_kennwert_BGF_calc = GK_total / gross_floor_area_BGF', ['GK_total', 'gross_floor_area_BGF'], 'EUR/m²', '§3.13, §3.11', 'Plan 3: Kennwert Gesamtkosten je m² BGF; GK_total (DIN-276-23) erreicht DIN-276-24 erst nach dem Konsumenten-Edit din276-C-5. Zwilling zu GK_kennwert_BGF / cost_parameter_per_BGF / KKW_analyse_eur_m2_BGF (din276-D-9).', Q.L175),
  eq('DIN-276-24', 4, 'KKW_analyse_kg300_anteil_calc = kg_300_total * 100 / GK_total', ['kg_300_total', 'GK_total'], '%', '§3.11', 'Plan 3: Anteil der KG 300 an den Gesamtkosten in %; beide Eingänge erreichen DIN-276-24 erst nach din276-C-5. Zwilling zum getippten KKW_analyse_kg300_anteil (din276-D-9).', Q.L163),

  // ---- DIN-276-27: deviations (§4.4.3) ----
  eq('DIN-276-27', 1, 'abweichungen_sum = sum_rows(abweichungen, betrag)', ['abweichungen'], 'EUR', '§4.4.3', 'Plan 3: Σ der dokumentierten Abweichungen je Kostengruppe.', Q.L386),
  eq('DIN-276-27', 2, 'abweichungen_count = count_rows(abweichungen)', ['abweichungen'], null, '§4.4.3', 'Plan 3: Anzahl der dokumentierten Abweichungen.', Q.L386),
];

