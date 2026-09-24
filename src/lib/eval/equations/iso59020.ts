/**
 * ISO-59020 — Plan 3 Task 21 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts iso59020` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span of the
 * English plain-text transcript (`regulation-tables-quotes-iso59020.ts`, line
 * range in the name; VC grade).
 *
 * Single-source: no row here outputs a symbol prod already produces — the 13
 * prod equations A.1 … A.13 (`pct_REUI_X` … `IRII`, one flow X each, consumed by
 * -09) keep their verified rows; the registers of `field-configs/iso59020.ts`
 * reproduce Formula (A.1) … (A.8) PER ROW (row-scope exprs, not equations), and
 * the rows below are counts, Σ masses / energies and the per-row badge counts.
 * Every aggregate is INLINED over the register (never chained on another new
 * output — the save-path materialiser would lag one save, m1200_2 trap 2). No
 * figure is typed into a formula: the -04-D5 code names the six "Mandatory"
 * rows of Table 3 by their prod tokens (source-settled by L1085–L1111).
 *
 * All 38 rows are register-fed and materialise on save (their inputs are the
 * register carriers of their own worksheet); none is scalar-only.
 *
 * NOT emitted (STAGED in scripts/verification/iso59020-STAGED-plan3-rulings.sql):
 *   - the nine cross-X Σ/Σ aggregates (pct_reui_agg / pct_reci_agg /
 *     pct_reni_agg / pct_linear_agg on -05, pct_reuo_agg / pct_reco_agg /
 *     pct_reno_agg / pct_linear_out_agg on -06, pct_econre_agg on -07): Annex G.2
 *     prints EXAMPLE b) (average) and EXAMPLE c) (sum-then-divide) as options,
 *     not a rule — the choice is iso59020-J-1 (fix round 1, controller ruling);
 *     their exact intended forms are recorded in J-1 for a mechanical re-emit;
 *   - the retirement of A.1 … A.8 (single-X) in favour of the per-row versions,
 *     with the -09 consumer edits and the CR-011 … CR-020 rewrites → iso59020-R-1;
 *   - a mean of RLP(X) over the outflow rows — no printed aggregation rule for a
 *     ratio (iso59020-J-8).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-quotes-iso59020';

const STD = 'ISO-59020';
type Spec = { n: string; out: string; rhs: string; unit: string | null; clause: string; what: string; quote: string };
const rows = (ws: string, reg: string, specs: Spec[]): EquationEntry[] =>
  specs.map((s) => ({
    standard: STD, worksheet: ws, equation_number: `${ws}-${s.n}`,
    formula: `${s.out} = ${s.rhs}`, input_symbols: [reg], output_symbol: s.out, output_unit: s.unit,
    clause_reference: s.clause, description: `Plan 3: ${s.what}`, verification_quote: s.quote,
  }));

/** A.3.4 (L2175): the recycled mass of a row counts only with traceable recyclability data — else 0 %. */
const RECO_ROW = 'if(traceable_recycling == true, m_reco, 0)';
/** The six "Mandatory" rows of Table 3 (L1085–L1111), as the prod `selected_core_indicator` tokens = the TABLE3 keys. */
export const MANDATORY_TOKENS = ['A.2.2_reused_content_inflow', 'A.2.3_recycled_content_inflow', 'A.2.4_renewable_content_inflow', 'A.3.3_reused_from_outflow', 'A.3.4_recycled_from_outflow', 'A.3.5_biological_recirculation'] as const;
/**
 * Per-token form (fix round 1): every Mandatory indicator present EXACTLY ONCE as selected or justified N/A — a duplicate or a
 * missing row fails (closes F-2 for the mandatory rows). UNPARENTHESISED inside the formula: the equations emitter's legacy
 * eligibility check (`engine-eligibility.ts` CALL regex) read `AND (` as a call named AND and refused; `==` binds tighter than
 * AND, so the meaning is the same. (Plan 3 final wave C item 1 retired that refusal — a keyword before a parenthesised group is
 * no longer a CALL; this form is kept byte-stable, and new work may parenthesise.) The STAGED G-4 gate text carries the parenthesised clauses (conditions are not subject to that check).
 */
export const MANDATORY_ALL_ONCE = MANDATORY_TOKENS.map((t) => `count_rows(indicators, indicator == '${t}' AND ok == 1) == 1`).join(' AND ');
/** §A.4.2 precondition of every energy Σ (fix round 1, controller ruling). */
const ENERGY_PRE = 'nur sinnvoll bei energy_unit_mismatch == 0 (§A.4.2 gemeinsame Einheit, L2271–L2272 — Gate STAGED iso59020-G-6)';

export const EQUATIONS: EquationEntry[] = [
  // ---- ISO-59020-04: the Table-3 indicator register (§7.3.1 / A.1) ----
  ...rows('ISO-59020-04', 'indicators', [
    { n: 'D1', out: 'indicators_count', rhs: 'count_rows(indicators)', unit: null, clause: '§7.3.1, Table 3', what: 'Anzahl der erfassten Indikatorzeilen (Tabelle 3 druckt 13 Kernindikatoren).', quote: Q.L1057_1060 },
    { n: 'D2', out: 'mandatory_missing', rhs: 'count_rows(indicators, ok == 0)', unit: null, clause: '§7.3.1', what: 'verbindliche Indikatoren (Tabelle 3 „Mandatory“), die weder ausgewählt noch als nicht anwendbar erklärt sind („shall be quantified and fully balanced with the use of the mandatory indicators“); Gate CR-009 → iso59020-G-4.', quote: Q.L1068_1071 },
    { n: 'D3', out: 'na_unjustified', rhs: 'count_rows(indicators, na_justified == 0)', unit: null, clause: '§7.3.1, A.1', what: 'als nicht anwendbar erklärte Zeilen ohne Begründung („the organization should explain why“ / „explaining why it is not applicable“); CR-010 → iso59020-G-2.', quote: Q.L1827_1831 },
    { n: 'D4', out: 'mandatory_core_covered', rhs: 'count_rows(indicators, mandatory_flag == 1 AND ok == 1)', unit: null, clause: '§7.3.1, Table 3', what: 'erfasste verbindliche Indikatoren (ausgewählt oder begründet nicht anwendbar) — soll die sechs „Mandatory“-Zeilen von Tabelle 3 erreichen (A.2.2, A.2.3, A.2.4, A.3.3, A.3.4, A.3.5).', quote: Q.L1081_1148 },
    { n: 'D5', out: 'mandatory_core_indicators_included_code', rhs: `if(${MANDATORY_ALL_ONCE}, 1, 0)`, unit: null, clause: '§7.3.1, Table 3', what: '1, wenn jeder der sechs verbindlichen Indikatoren von Tabelle 3 (A.2.2, A.2.3, A.2.4, A.3.3, A.3.4, A.3.5 — L1085–L1111) GENAU EINMAL als ausgewählt oder begründet nicht anwendbar erfasst ist (eine fehlende oder doppelte Zeile ⇒ 0; iso59020-J-2); Zwilling des Eingabefelds mandatory_core_indicators_included (iso59020-D-4 / G-4).', quote: Q.L1068_1071 },
    { n: 'D6', out: 'inflow_indicators_selected', rhs: "count_rows(indicators, category_code == 'resource_inflow' AND selected == true)", unit: null, clause: 'Table 3, A.2', what: 'ausgewählte Zeilen der Kategorie „Resource Inflows“ (A.2.2 – A.2.4).', quote: Q.L1085_1087 },
    { n: 'D7', out: 'outflow_indicators_selected', rhs: "count_rows(indicators, category_code == 'resource_outflow' AND selected == true)", unit: null, clause: 'Table 3, A.3', what: 'ausgewählte Zeilen der Kategorie „Resource outflows“ (A.3.2 – A.3.5).', quote: Q.L1100_1103 },
    { n: 'D8', out: 'energy_indicator_selected', rhs: "count_rows(indicators, category_code == 'energy' AND selected == true)", unit: null, clause: 'Table 3, A.4', what: 'ausgewählte Zeilen der Kategorie „Energy“ (A.4.2) — Treiber für CR-020 / den Energieblock von -07 nach iso59020-C-1 / G-1 / M-1.', quote: Q.L1112_1116 },
    { n: 'D9', out: 'water_indicators_selected', rhs: "count_rows(indicators, category_code == 'water' AND selected == true)", unit: null, clause: 'Table 3, A.5', what: 'ausgewählte Zeilen der Kategorie „Water“ (A.5.2 – A.5.4) — Treiber für CR-021 … CR-023 nach iso59020-C-1 / G-1 / M-1.', quote: Q.L1131_1141 },
    { n: 'D10', out: 'economic_indicators_selected', rhs: "count_rows(indicators, category_code == 'economic' AND selected == true)", unit: null, clause: 'Table 3, A.6', what: 'ausgewählte Zeilen der Kategorie „Economic“ (A.6.2 – A.6.3) — Treiber für CR-024 / CR-025 nach iso59020-C-1 / G-1 / M-1.', quote: Q.L1142_1148 },
  ]),
  ...rows('ISO-59020-04', 'additional_indicators', [
    { n: 'D11', out: 'additional_indicators_count', rhs: 'count_rows(additional_indicators)', unit: null, clause: '§7.3.2, Annex B', what: 'Anzahl der zusätzlichen Indikatoren („supplemented by the additional indicators or recommendations addressed in Annex B“).', quote: Q.L1170_1171 },
  ]),

  // ---- ISO-59020-05: resource inflows (A.2), one row per inflow X ----
  ...rows('ISO-59020-05', 'inflows', [
    { n: 'D1', out: 'inflows_count', rhs: 'count_rows(inflows)', unit: null, clause: 'A.2.1', what: 'Anzahl der erfassten Zuflüsse X („the “X” in inflow (X) represents a specific resource inflow“).', quote: Q.L1892_1894 },
    { n: 'D2', out: 'm_ti_total', rhs: 'sum_rows(inflows, m_ti)', unit: 'kg', clause: 'A.2.1, A.1', what: 'Σ mTI(X) über alle Zuflüsse („absolute values with units should also be documented“).', quote: Q.L1835_1837 },
    { n: 'D3', out: 'm_reui_total', rhs: 'sum_rows(inflows, m_reui)', unit: 'kg', clause: 'A.2.2', what: 'Σ mREUI(X) („the mass of reused components and products of an inflow (X)“).', quote: Q.L1926_1938 },
    { n: 'D4', out: 'm_reci_total', rhs: 'sum_rows(inflows, m_reci)', unit: 'kg', clause: 'A.2.3', what: 'Σ mRECI(X) („the mass of recycled material of an inflow (X)“).', quote: Q.L1950_1962 },
    { n: 'D5', out: 'm_reni_total', rhs: 'sum_rows(inflows, m_reni)', unit: 'kg', clause: 'A.2.4', what: 'Σ mRENI(X) („the mass of renewable material of an inflow (X)“).', quote: Q.L1992_2004 },
    { n: 'D6', out: 'm_linear_total', rhs: 'sum_rows(inflows, m_linear)', unit: 'kg', clause: 'A.2.1', what: 'Σ des linearen (nicht-zirkulären) Zuflusses je Zeile (mTI − mREUI − mRECI − mRENI).', quote: Q.L1850_1854 },
    { n: 'D7', out: 'inflows_unbalanced', rhs: 'count_rows(inflows, balanced == 0)', unit: null, clause: 'A.2.1', what: 'Zuflüsse, deren zirkuläre Massen die Gesamtmasse übersteigen („add up to represent 100 % of the resource inflow“); CR-014 → iso59020-G-3.', quote: Q.L1850_1854 },
  ]),

  // ---- ISO-59020-06: resource outflows (A.3), one row per outflow X ----
  ...rows('ISO-59020-06', 'outflows', [
    { n: 'D1', out: 'outflows_count', rhs: 'count_rows(outflows)', unit: null, clause: 'A.3.1', what: 'Anzahl der erfassten Abflüsse X.', quote: Q.L2022_2026 },
    { n: 'D2', out: 'm_to_total', rhs: 'sum_rows(outflows, m_to)', unit: 'kg', clause: 'A.3.1, A.1', what: 'Σ mTO(X) über alle Abflüsse.', quote: Q.L1835_1837 },
    { n: 'D3', out: 'm_reuo_total', rhs: 'sum_rows(outflows, m_reuo)', unit: 'kg', clause: 'A.3.3', what: 'Σ mREUO(X) („the mass of outflow (X) that is reused“).', quote: Q.L2140_2146 },
    { n: 'D4', out: 'm_reco_total', rhs: `sum_rows(outflows, ${RECO_ROW})`, unit: 'kg', clause: 'A.3.4', what: 'Σ mRECO(X) der Zeilen mit rückverfolgbaren Recyclingdaten (sonst 0 — „0 % should be recorded“).', quote: Q.L2175 },
    { n: 'D5', out: 'm_reno_total', rhs: 'sum_rows(outflows, m_reno)', unit: 'kg', clause: 'A.3.5', what: 'Σ mRENO(X) („the mass of outflow (X) that is renewable recirculation“).', quote: Q.L2228_2240 },
    { n: 'D6', out: 'm_linear_out_total', rhs: 'sum_rows(outflows, m_linear)', unit: 'kg', clause: 'A.3.1', what: 'Σ des linearen (nicht-zirkulären) Abflusses je Zeile („The remaining outflows are considered as linear“).', quote: Q.L2015_2021 },
    { n: 'D7', out: 'outflows_unbalanced', rhs: 'count_rows(outflows, balanced == 0)', unit: null, clause: 'A.3.1', what: 'Abflüsse, deren zirkuläre Massen die Gesamtmasse übersteigen („represent 100 % of the resource outflows“); CR-019 → iso59020-G-3.', quote: Q.L2022_2026 },
    { n: 'D8', out: 'outflows_untraceable', rhs: 'count_rows(outflows, traceable_recycling == false)', unit: null, clause: 'A.3.4', what: 'Abflüsse ohne rückverfolgbare Recyclingdaten (PRECO(X) = 0 % nach A.3.4; ein nicht gesetztes Kästchen zählt als „keine Daten“, iso59020-J-7).', quote: Q.L2175 },
  ]),

  // ---- ISO-59020-07: energy flows (A.4.2), one row per energy flow X ----
  ...rows('ISO-59020-07', 'energy_flows', [
    { n: 'D1', out: 'energy_flows_count', rhs: 'count_rows(energy_flows)', unit: null, clause: 'A.4.2', what: 'Anzahl der erfassten Energieflüsse X.', quote: Q.L2284_2292 },
    { n: 'D2', out: 'ei_rene_total', rhs: 'sum_rows(energy_flows, ei_rene)', unit: null, clause: 'A.4.2', what: `Σ EIRENE(X) („the renewable energy (X) inflow, in MJ (or in kWh)“) — in der gemeinsamen Einheit energy_unit_common; ${ENERGY_PRE}.`, quote: Q.L2284_2292 },
    { n: 'D3', out: 'eo_rene_total', rhs: 'sum_rows(energy_flows, eo_rene)', unit: null, clause: 'A.4.2', what: `Σ EORENE(X) („the renewable energy (X) outflow“); ${ENERGY_PRE}.`, quote: Q.L2284_2292 },
    { n: 'D4', out: 'ei_te_total', rhs: 'sum_rows(energy_flows, ei_te)', unit: null, clause: 'A.4.2', what: `Σ EITE(X) („the total energy (X) inflow“); ${ENERGY_PRE}.`, quote: Q.L2284_2292 },
    { n: 'D5', out: 'eo_te_total', rhs: 'sum_rows(energy_flows, eo_te)', unit: null, clause: 'A.4.2', what: `Σ EOTE(X) („the total energy (X) outflow“); ${ENERGY_PRE}.`, quote: Q.L2284_2292 },
    { n: 'D6', out: 'energy_unit_mismatch', rhs: 'count_rows(energy_flows, unit_ok == 0)', unit: null, clause: 'A.4.2', what: 'Energieflüsse, deren Einheit nicht die gemeinsame Einheit ist oder solange keine gemeinsame Einheit gewählt ist („A common suitable measurement unit (e.g. MJ, kWh) shall be selected“); Gates STAGED (iso59020-G-5 block / G-6 warn).', quote: Q.L2271_2272 },
  ]),

  // ---- ISO-59020-08: data sources (§7.6.1.2 / §7.6.2) ----
  ...rows('ISO-59020-08', 'data_sources', [
    { n: 'D1', out: 'data_sources_count', rhs: 'count_rows(data_sources)', unit: null, clause: '§7.6.1.2', what: 'Anzahl der erfassten Elementarkomponenten / Datenquellen (Step A).', quote: Q.L1274_1276 },
    { n: 'D2', out: 'data_sources_untraceable', rhs: 'count_rows(data_sources, traceable == false)', unit: null, clause: '§7.6.2', what: 'Datenquellen ohne Rückverfolgbarkeit („sufficient documentation to enable verification“).', quote: Q.L1342_1345 },
    { n: 'D3', out: 'data_sources_secondary', rhs: "count_rows(data_sources, origin == 'secondary')", unit: null, clause: '§7.6.2', what: 'Datenquellen mit Sekundärdaten („secondary and generic data should be conservatively applied and not overstate the circularity“).', quote: Q.L1339_1341 },
    { n: 'D4', out: 'data_sources_generic', rhs: "count_rows(data_sources, specificity == 'generic')", unit: null, clause: '§7.6.2', what: 'Datenquellen mit generischen Daten.', quote: Q.L1339_1341 },
    { n: 'D5', out: 'data_sources_background', rhs: "count_rows(data_sources, scope == 'background')", unit: null, clause: '§7.6.2', what: 'Datenquellen mit Hintergrunddaten.', quote: Q.L1339_1341 },
  ]),

  // ---- ISO-59020-09: complementary methods (§3.3.7 / Annex C) ----
  ...rows('ISO-59020-09', 'complementary_methods', [
    { n: 'D1', out: 'complementary_methods_count', rhs: 'count_rows(complementary_methods)', unit: null, clause: '§3.3.7, Annex C', what: 'Anzahl der angewandten komplementären Methoden.', quote: Q.L3018_3019 },
  ]),
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
