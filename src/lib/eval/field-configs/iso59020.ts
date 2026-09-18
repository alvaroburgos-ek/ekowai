/**
 * ISO-59020 — Plan 3 Task 21 field configs (the per-flow X registers for
 * resource inflows / outflows / energy flows with the Annex-A indicator formulae
 * evaluated PER ROW, the Table-3 indicator register with the mandatory flag and
 * the N/A justification per row, the data-source / complementary-method /
 * additional-indicator registers, and the §6.4.2 report note) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts iso59020`.
 *
 * Every `verification_quote` is a span of the English plain-text transcript
 * `Desktop\Ciruclar economy, sustanability and water test\ISO 59020\ISO-59020-Unlocked.txt`
 * (ISO 59020:2024(en); VC grade — the .pdf siblings are NOT sources), lifted by
 * line range into `regulation-tables-quotes-iso59020.ts` (the line range is the
 * constant's name; clause numbers in the comments). Labels are German as prod's
 * are, with the printed English symbol / term. Prod facts come from the captured
 * `iso59020.prior.json` (2026-09-18, read-only): section codes are single
 * letters (-04 C "Measurement Taxonomy", D "Choice of Indicators", E "Indicators &
 * Value / Aggregation"; -05 C … E per A.2.x, F "100% Inflow Balance"; -06 C
 * lifetime, D … F per A.3.x, G "100% Outflow Balance"; -07 C "Renewable Energy
 * (A.4.2)", D–F water, G–H economic; -08 C "Data Acquisition Steps A-E", D
 * "General Data Requirements", E "Documentation"; -09 C … G = §8 steps).
 *
 * Placement rule (a262e trap 1): every register lives on the worksheet whose
 * scalars it twins and whose equations read it (a register-fed equation reads
 * a register of its OWN worksheet only): `inflows` on -05, `outflows` on -06,
 * `energy_flows` on -07, `indicators` / `additional_indicators` on -04,
 * `data_sources` on -08, `complementary_methods` on -09. The one field rule on
 * an inherited driver (`temporal_boundary_note` ← `temporal_boundary_shortened`,
 * consumer_worksheets ["ISO-59020-09"] — resolves on -09) is emitted; the
 * server-side materialiser / approval gate resolve own fields only, so that rule
 * is `pending` (visible) there — iso59020-I-1.
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/iso59020-STAGED-plan3-rulings.sql):
 *   - the -07 energy / water / economic block visibility keyed on the -04
 *     `indicators` register: a rule driven by a register (or by the derived
 *     selection counts) is the multi-select-driver class → iso59020-M-1; the
 *     blocks stay visible; the derived `*_indicators_selected` codes on -04 are
 *     the drivers once C-1 (consumer edit) and G-1 (IF-guards on CR-020 … 025)
 *     are ratified;
 *   - hiding `information_verifiable` (-09) under external use — §8.6.2 prints
 *     NO such condition ("Verifiability of all data documentation is a key
 *     criterion", L1760) and CR-035 reads it → iso59020-J-5, not emitted;
 *   - hiding `aggregation_method` (-04) under a multi-organisation system level —
 *     consumed by -05 / -06 / -07, `system_level` reaches no worksheet
 *     (consumer_worksheets ["ALL"]) and §7.5 is not exclusive ("Aggregation can
 *     also be needed for higher system levels", L1242–L1243) → iso59020-J-6;
 *   - every hide on the -05 / -06 / -07 single-X scalars: consumed by -09 and read
 *     by the block gates CR-011 … CR-020 → their retirement is iso59020-R-1 (with
 *     the consumer edits), never a hide.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q } from '../regulation-tables-quotes-iso59020';

const STD = 'ISO-59020';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS04 = on('ISO-59020-04');
const WS05 = on('ISO-59020-05');
const WS06 = on('ISO-59020-06');
const WS07 = on('ISO-59020-07');
const WS08 = on('ISO-59020-08');
const WS09 = on('ISO-59020-09');

// ---- drivers (prod tokens as captured) ----
/** §6.4.2 (L849–L850): shortened temporal boundaries "should be documented in the assessment report" — prod boolean on -03, inherited on -09. */
export const SHORTENED = 'temporal_boundary_shortened == true';
/** row scope: the A.3.4 traceability switch (L2175) */
export const TRACEABLE = 'traceable_recycling == true';
/** row scope: a declared N/A row needs its explanation (§7.3.1 L1070–L1071, A.1 L1829–L1830) */
export const NOT_APPLICABLE = 'not_applicable == true';

// ---- printed formulae as row expressions (Annex A, one row per flow X) ----
/** Formula (A.1) (L1928–L1931): %REUI(X) = mREUI(X) / mTI(X) ⋅ 100 */
export const PCT_REUI_EXPR = 'm_reui / m_ti * 100';
/** Formula (A.2) (L1952–L1955): %RECI(X) = mRECI(X) / mTI(X) ⋅ 100 */
export const PCT_RECI_EXPR = 'm_reci / m_ti * 100';
/** Formula (A.3) (L1994–L1997): PRENI(X) = mRENI(X) / mTI(X) ⋅ 100 */
export const PCT_RENI_EXPR = 'm_reni / m_ti * 100';
/** A.2.1 (L1853–L1854): "The non-circular (linear) inflow can be calculated by subtracting the circular inflows from 100 %." */
export const PCT_LINEAR_IN_EXPR = '100 - pct_reui - pct_reci - pct_reni';
/** A.1 (L1836): the absolute linear mass documented beside the percentages. */
export const M_LINEAR_IN_EXPR = 'm_ti - m_reui - m_reci - m_reni';
/** A.2.1 (L1850–L1851): the four content types "add up to represent 100 % of the resource inflow" — 1 = the three circular masses fit inside the total. */
export const BALANCED_IN_EXPR = 'if(m_reui + m_reci + m_reni <= m_ti, 1, 0)';
/** Formula (A.5) (L2126–L2129): PREUO(X) = mREUO(X) / mTO(X) ⋅ 100 */
export const PCT_REUO_EXPR = 'm_reuo / m_to * 100';
/** Formula (A.6) (L2178–L2181) with A.3.4 (L2175): "If traceable recyclability data are not available for a specific resource outflow, 0 % should be recorded." */
export const PCT_RECO_EXPR = `if(${TRACEABLE}, m_reco / m_to * 100, 0)`;
/** Formula (A.7) (L2230–L2233): PRENO(X) = mRENO(X) / mTO(X) ⋅ 100 */
export const PCT_RENO_EXPR = 'm_reno / m_to * 100';
/** A.3.1 (L2020–L2021): "The linear (non-circular) outflow can be calculated by subtracting the circular outflows from 100 %." */
export const PCT_LINEAR_OUT_EXPR = '100 - pct_reuo - pct_reco - pct_reno';
export const M_LINEAR_OUT_EXPR = `m_to - m_reuo - if(${TRACEABLE}, m_reco, 0) - m_reno`;
/** A.3.1 (L2022–L2023): circular + non-circular outflows "represent 100 % of the resource outflows" — 1 = the circular masses fit inside the total. */
export const BALANCED_OUT_EXPR = `if(m_reuo + if(${TRACEABLE}, m_reco, 0) + m_reno <= m_to, 1, 0)`;
/** Formula (A.4) (L2101–L2103): RLP(X) = tLP(X) / tIALP(X) — null on rows without the optional lifetime pair. */
export const RLP_EXPR = 't_lp / t_ialp';
/** Formula (A.8) (L2277–L2281): PECONRE(X) = (EIRENE(X) − EORENE(X)) / (EITE(X) − EOTE(X)) ⋅ 100 — the legend reads "in %" (L2284); the block prints "⋅1000" (iso59020-U-2). */
export const PCT_ECONRE_EXPR = '(ei_rene - eo_rene) / (ei_te - eo_te) * 100';
export const NET_ENERGY_EXPR = 'ei_te - eo_te';
/** A.4.2 (L2271–L2272): "A common suitable measurement unit (e.g. MJ, kWh) shall be selected" — 1 = the row's unit equals the worksheet's `energy_unit_common` (unset ⇒ 0). */
export const UNIT_OK_EXPR = 'if(unit == energy_unit_common, 1, 0)';
/** Table 3: 1 = the row's indicator is printed "Mandatory" (read from the seeded TABLE3, never typed). */
export const MANDATORY_FLAG_EXPR = "if(lookup('TABLE3', indicator, 'mandatory_optional') == 'Mandatory', 1, 0)";
/** Table 3: the prod indicator_category token of the row's printed category (TABLE3.category_token, iso59020-J-3) — read by the per-category selection counts (-04-D6 … D10). */
export const CATEGORY_CODE_EXPR = "lookup('TABLE3', indicator, 'category_token')";
/** §7.3.1 (L1068–L1071): a mandatory indicator that is neither selected nor declared not applicable is missing (0). */
export const INDICATOR_OK_EXPR = 'if(mandatory_flag == 1 AND selected == false AND not_applicable == false, 0, 1)';
/** §7.3.1 (L1070–L1071) / A.1 (L1829–L1830): a declared N/A row without its explanation (0). */
export const NA_JUSTIFIED_EXPR = `if(${NOT_APPLICABLE} AND justification IS NULL, 0, 1)`;
/** §7.6.2 (L1340–L1341): "secondary and generic data should be conservatively applied" — 1 = the row is secondary or generic. */
export const CONSERVATIVE_EXPR = "if(origin == 'secondary' OR specificity == 'generic', 1, 0)";

export const ENERGY_UNITS = ['MJ', 'kWh'] as const; // prod energy_unit_common tokens (capture) = the printed "e.g. MJ, kWh" (L2271)
/** prod `data_category` tokens (capture), split into the three printed pairs of §7.6.2 (L1340) — iso59020-J-4 */
export const DATA_ORIGIN = ['primary', 'secondary'] as const;
export const DATA_SCOPE = ['foreground', 'background'] as const;
export const DATA_SPECIFICITY = ['specific', 'generic'] as const;
/** C.2.1 (L3018): "measure and assess social, environmental and economic impacts" */
export const IMPACT_ASPECTS = ['social', 'environmental', 'economic'] as const;
/** Annex C.3 / C.4 / C.5 — the printed list of complementary-method standards (datalist; each designation opens its bullet line). */
export const COMPLEMENTARY_METHODS = [
  'ISO 14001', 'ISO 14051', 'ISO/TS 14071', 'ISO 14040', 'ISO 14044', 'ISO 14067', 'ISO 14046', 'ISO 14045', 'ISO 15686-5', 'ISO/IEC 17029', 'ISO 20915',
  'ISO 14025', 'ISO/TS 14027', 'ISO 20245', 'ISO 20400', 'ISO 26000', 'ISO 37120',
  'Social life cycle assessment (S-LCA)', 'Life cycle sustainability assessment (LCSA)',
] as const;
/** Table B.1 (L2549–L2567) — the printed additional indicators (datalist). */
export const ADDITIONAL_INDICATORS_B1 = [
  'B.3.2 Per cent designed reusability rate of the outflow', 'B.3.3 Per cent designed recyclability rate of the outflow',
  'B.4.2 Per cent energy recovered from residual, non-renewable and non-recoverable resource outflows', 'B.4.3 Energy intensity',
  'B.5.2 Nutrient extraction from discharged water', 'B.5.3 Water intensity',
  'B.6.3 Net value added', 'B.6.4 Value per mass', 'B.6.5 Resource productivity', 'B.6.6 Genuine process indicator',
] as const;

const derivedOut = (ws: (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>) => FieldConfigEntry, section: string, symbol: string, label: string, unit: string | null, clause: string, eq: string, what: string, quote: string, visible_when?: string): FieldConfigEntry =>
  ws({ symbol, widget: 'derived', ui_config: null, ...(visible_when ? { visible_when } : {}), verification_quote: quote,
    create: { section_code: section, label_de: label, data_type: 'number', unit, clause_reference: clause, description: `Plan 3: Ausgabe der Gleichung ${eq} — ${what}` } });

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- ISO-59020-04: the Table-3 indicator register (§7.3.1 / A.1) ----
  WS04({
    symbol: 'indicators', widget: 'register',
    ui_config: {
      title: 'Kern-Zirkularitätsindikatoren nach Tabelle 3 (core circularity indicators, §7.3.1)', subtitle: 'Je Indikator eine Zeile: Auswahl (selected), Nicht-Anwendbarkeit mit Begründung (§7.3.1 / A.1 „explaining why it is not applicable“), Wert; der Verbindlich-/Optional-Status kommt aus Tabelle 3', add_label: '+ Indikator', placement: 'section',
      columns: [
        { key: 'indicator', label: 'Indikator (Tabelle 3)', type: 'lookup_key', required: true, lookup: { table_code: 'TABLE3', group_by: 'category' }, aria_label: 'Kernindikator nach Tabelle 3' },
        { key: 'category', label: 'Kategorie', type: 'lookup_value', lookup: { table_code: 'TABLE3', key_column: 'indicator', value: 'category' } },
        { key: 'mandatory_optional', label: 'Verbindlich / optional', type: 'lookup_value', lookup: { table_code: 'TABLE3', key_column: 'indicator', value: 'mandatory_optional' } },
        { key: 'principle', label: 'Zusatzinformation', type: 'lookup_value', lookup: { table_code: 'TABLE3', key_column: 'indicator', value: 'principle' } },
        { key: 'selected', label: 'ausgewählt', type: 'boolean', aria_label: 'Indikator für die Messung ausgewählt' },
        { key: 'not_applicable', label: 'nicht anwendbar (N/A)', type: 'boolean', aria_label: 'Indikator als nicht anwendbar erklärt' },
        { key: 'justification', label: 'Begründung der Nicht-Anwendbarkeit', type: 'text', visible_when: NOT_APPLICABLE, aria_label: 'Begründung, warum der Indikator nicht anwendbar ist' },
        { key: 'value', label: 'Indikatorwert', type: 'number', aria_label: 'Ermittelter Indikatorwert' },
        { key: 'unit', label: 'Einheit', type: 'text', aria_label: 'Einheit des Indikatorwerts' },
        { key: 'category_code', label: 'Kategorie-Token', type: 'derived', expr: CATEGORY_CODE_EXPR },
        { key: 'mandatory_flag', label: 'verbindlich', type: 'derived', expr: MANDATORY_FLAG_EXPR, display: 'badge', value_labels: { '1': 'Tabelle 3: Mandatory', '0': 'Tabelle 3: Optional' } },
        { key: 'ok', label: 'Status', type: 'derived', expr: INDICATOR_OK_EXPR, display: 'badge', value_labels: { '1': 'erfasst (ausgewählt, N/A oder optional)', '0': 'verbindlicher Indikator weder ausgewählt noch als N/A erklärt' } },
        { key: 'na_justified', label: 'N/A begründet', type: 'derived', expr: NA_JUSTIFIED_EXPR, display: 'badge', value_labels: { '1': '', '0': 'N/A ohne Begründung' } },
      ],
      footer: ['indicators_count', 'mandatory_missing', 'na_unjustified', 'mandatory_core_covered', 'mandatory_core_indicators_included_code'],
      note: `${Q.L1068_1071} Die 13 Zeilen von Tabelle 3 sind von Hand anzulegen (kein Vorbefüllen aus der Tabelle — iso59020-F-1); doppelte Indikatorzeilen werden nicht erkannt (iso59020-F-2). Die Einzelfelder selected_core_indicator / indicator_category / indicator_not_applicable_justified / mandatory_core_indicators_included bleiben (iso59020-D-1 … D-4).`,
    },
    verification_quote: `${Q.L1055_1056} — ${Q.L1068_1071}`,
    create: { section_code: 'D', label_de: 'Indikatorregister nach Tabelle 3 (je Indikator: ausgewählt / nicht anwendbar / Begründung / Wert)', data_type: 'json', unit: null, clause_reference: '§7.3.1, Table 3, A.1',
      description: 'Plan 3: Zeilen je Kernindikator aus Tabelle 3 (TABLE3, 13 Token = prod selected_core_indicator) mit Verbindlich-Flag aus der Tabelle, Auswahl, N/A-Erklärung mit Begründung und Wert; Anzahl → indicators_count (ISO-59020-04-D1), fehlende verbindliche → mandatory_missing (-D2), N/A ohne Begründung → na_unjustified (-D3), erfasste verbindliche → mandatory_core_covered (-D4), Code → mandatory_core_indicators_included_code (-D5), Auswahl je Kategorie → *_indicators_selected (-D6 … -D10). Das Eingabefeld mandatory_core_indicators_included (CR-009) bleibt — Umstellung STAGED (iso59020-G-4 / D-4).' },
  }),
  derivedOut(WS04, 'D', 'indicators_count', 'Anzahl erfasster Indikatorzeilen', null, '§7.3.1, Table 3', 'ISO-59020-04-D1', 'count_rows über indicators.', Q.L1057_1060),
  derivedOut(WS04, 'D', 'mandatory_missing', 'Verbindliche Indikatoren weder ausgewählt noch als N/A erklärt', null, '§7.3.1', 'ISO-59020-04-D2', 'Zeilen mit ok = 0 (Tabelle 3 „Mandatory“, nicht ausgewählt, nicht N/A); Gate STAGED (iso59020-G-4).', Q.L1068_1071),
  derivedOut(WS04, 'D', 'na_unjustified', 'N/A-Erklärungen ohne Begründung', null, '§7.3.1, A.1', 'ISO-59020-04-D3', 'Zeilen mit not_applicable und leerer Begründung („explaining why it is not applicable“); CR-010 (leere Bedingung) → STAGED (iso59020-G-2).', Q.L1827_1831),
  derivedOut(WS04, 'D', 'mandatory_core_covered', 'Erfasste verbindliche Indikatoren (ausgewählt oder begründet N/A)', null, '§7.3.1', 'ISO-59020-04-D4', 'Zeilen mit mandatory_flag = 1 und ok = 1; soll 6 erreichen (die sechs „Mandatory“-Zeilen von Tabelle 3: A.2.2, A.2.3, A.2.4, A.3.3, A.3.4, A.3.5).', Q.L1068_1071),
  derivedOut(WS04, 'D', 'mandatory_core_indicators_included_code', 'Verbindliche Kernindikatoren vollständig einbezogen (1 = ja, 0 = nein)', null, '§7.3.1', 'ISO-59020-04-D5', '1, wenn keine verbindliche Zeile fehlt (mandatory_missing = 0) und alle sechs verbindlichen Indikatoren von Tabelle 3 erfasst sind (iso59020-J-2); Zwilling des Eingabefelds mandatory_core_indicators_included (iso59020-D-4, Gate CR-009 → iso59020-G-4).', Q.L1068_1071),
  derivedOut(WS04, 'D', 'inflow_indicators_selected', 'Ausgewählte Zufluss-Indikatoren (A.2.2 – A.2.4)', null, 'Table 3, A.2', 'ISO-59020-04-D6', 'Zeilen der Kategorie „Resource Inflows“ mit selected; Treiber für ISO-59020-05 nach C-1.', Q.L1081_1148),
  derivedOut(WS04, 'D', 'outflow_indicators_selected', 'Ausgewählte Abfluss-Indikatoren (A.3.2 – A.3.5)', null, 'Table 3, A.3', 'ISO-59020-04-D7', 'Zeilen der Kategorie „Resource outflows“ mit selected; Treiber für ISO-59020-06 nach C-1.', Q.L1081_1148),
  derivedOut(WS04, 'D', 'energy_indicator_selected', 'Ausgewählter Energie-Indikator (A.4.2)', null, 'Table 3, A.4', 'ISO-59020-04-D8', 'Zeilen der Kategorie „Energy“ mit selected; Treiber für den Energieblock von ISO-59020-07 (CR-020) nach C-1 / G-1 (Sichtbarkeit: iso59020-M-1).', Q.L1112_1116),
  derivedOut(WS04, 'D', 'water_indicators_selected', 'Ausgewählte Wasser-Indikatoren (A.5.2 – A.5.4)', null, 'Table 3, A.5', 'ISO-59020-04-D9', 'Zeilen der Kategorie „Water“ mit selected; Treiber für den Wasserblock von ISO-59020-07 (CR-021 … CR-023) nach C-1 / G-1 (iso59020-M-1).', Q.L1131_1141),
  derivedOut(WS04, 'D', 'economic_indicators_selected', 'Ausgewählte Wirtschafts-Indikatoren (A.6.2 – A.6.3)', null, 'Table 3, A.6', 'ISO-59020-04-D10', 'Zeilen der Kategorie „Economic“ mit selected; Treiber für den Wirtschaftsblock von ISO-59020-07 (CR-024 / CR-025) nach C-1 / G-1 (iso59020-M-1).', Q.L1142_1148),
  WS04({
    symbol: 'additional_indicators', widget: 'register',
    ui_config: {
      title: 'Zusätzliche Indikatoren (additional indicators, §7.3.2 / Annex B)', subtitle: 'Je zusätzlichem Indikator eine Zeile — Tabelle B.1 als Vorschlagsliste, eigene Indikatoren frei', add_label: '+ zusätzlicher Indikator', placement: 'section',
      columns: [
        { key: 'name', label: 'Indikator', type: 'text', required: true, datalist: [...ADDITIONAL_INDICATORS_B1], aria_label: 'Bezeichnung des zusätzlichen Indikators' },
        { key: 'definition', label: 'Definition / Berechnung', type: 'text', aria_label: 'Definition oder Berechnungsvorschrift' },
        { key: 'value', label: 'Wert', type: 'number', aria_label: 'Wert des zusätzlichen Indikators' },
        { key: 'unit', label: 'Einheit', type: 'text', aria_label: 'Einheit des zusätzlichen Indikators' },
      ],
      footer: ['additional_indicators_count'],
      note: `${Q.L1077_1079} Das Einzelfeld additional_indicator bleibt (iso59020-D-5).`,
    },
    verification_quote: `${Q.L1077_1079} — ${Q.L1170_1171}`,
    create: { section_code: 'D', label_de: 'Zusätzliche Indikatoren (Annex B / Tabelle B.1; je Indikator: Bezeichnung, Definition, Wert, Einheit)', data_type: 'json', unit: null, clause_reference: '§7.3.1, §7.3.2, Annex B',
      description: 'Plan 3: Zeilen je zusätzlichem Indikator („The core circularity indicators can be supplemented by additional circularity indicators“); Anzahl → additional_indicators_count (ISO-59020-04-D11). Das Textfeld additional_indicator bleibt (iso59020-D-5).' },
  }),
  derivedOut(WS04, 'D', 'additional_indicators_count', 'Anzahl zusätzlicher Indikatoren', null, '§7.3.2, Annex B', 'ISO-59020-04-D11', 'count_rows über additional_indicators.', Q.L1170_1171),

  // ---- ISO-59020-05: resource inflows, one row per inflow X (A.2) ----
  WS05({
    symbol: 'inflows', widget: 'register',
    ui_config: {
      title: 'Ressourcenzuflüsse X (resource inflows, Annex A.2)', subtitle: 'Je Zufluss X eine Zeile: Gesamtmasse mTI(X) und die Massen der drei zirkulären Anteile mREUI / mRECI / mRENI (kg); die Anteile nach Formula (A.1) – (A.3) und der lineare Rest (100 % − zirkulär) werden je Zeile berechnet', add_label: '+ Zufluss', placement: 'section',
      columns: [
        { key: 'label', label: 'Zufluss X', type: 'text', required: true, aria_label: 'Bezeichnung des Zuflusses X' },
        { key: 'm_ti', label: 'mTI(X)', type: 'number', unit: 'kg', required: true, min: 0, aria_label: 'Gesamtmasse Eingangsmaterial des Zuflusses X' },
        { key: 'm_reui', label: 'mREUI(X)', type: 'number', unit: 'kg', required: true, min: 0, aria_label: 'Masse wiederverwendeter Komponenten und Produkte des Zuflusses X' },
        { key: 'm_reci', label: 'mRECI(X)', type: 'number', unit: 'kg', required: true, min: 0, aria_label: 'Masse recycelten Materials des Zuflusses X' },
        { key: 'm_reni', label: 'mRENI(X)', type: 'number', unit: 'kg', required: true, min: 0, aria_label: 'Masse erneuerbaren Materials des Zuflusses X' },
        { key: 'pct_reui', label: '%REUI(X) (A.1)', type: 'derived', expr: PCT_REUI_EXPR },
        { key: 'pct_reci', label: '%RECI(X) (A.2)', type: 'derived', expr: PCT_RECI_EXPR },
        { key: 'pct_reni', label: 'PRENI(X) (A.3)', type: 'derived', expr: PCT_RENI_EXPR },
        { key: 'pct_linear', label: 'linear (%)', type: 'derived', expr: PCT_LINEAR_IN_EXPR },
        { key: 'm_linear', label: 'linear (kg)', type: 'derived', expr: M_LINEAR_IN_EXPR },
        { key: 'balanced', label: '100 %-Bilanz', type: 'derived', expr: BALANCED_IN_EXPR, display: 'badge', value_labels: { '1': 'bilanziert (zirkulär ≤ Gesamt)', '0': 'zirkuläre Massen übersteigen mTI(X)' } },
      ],
      footer: ['inflows_count', 'm_ti_total', 'pct_reui_agg', 'pct_reci_agg', 'pct_reni_agg', 'pct_linear_agg', 'inflows_unbalanced'],
      note: `${Q.L1892_1894} ${Q.L1850_1854} Die Fußzeile aggregiert massengewichtet (Σ Masse des Anteils / Σ mTI — Anhang G.2 EXAMPLE c, iso59020-J-1). Die Einzelfelder mTI_X / mREUI_X / mRECI_X / mRENI_X / pct_linear_inflow bleiben (iso59020-D-6 … D-10); Gleichungen A.1 – A.3 und CR-011 … CR-014 → iso59020-R-1 / G-3.`,
    },
    verification_quote: `${Q.L1892_1894} — ${Q.L1895_1900}`,
    create: { section_code: 'F', label_de: 'Ressourcenzuflüsse X (je Zufluss: mTI, mREUI, mRECI, mRENI; Anteile nach A.1 – A.3, linearer Rest, 100 %-Bilanz)', data_type: 'json', unit: null, clause_reference: 'A.2.1 – A.2.4, Formula (A.1) – (A.3)',
      description: 'Plan 3: Zeilen je Ressourcenzufluss X („Different types of inflow resources … should be measured and recorded separately“) mit den Formeln (A.1) – (A.3) je Zeile und dem linearen Rest (A.2.1: „subtracting the circular inflows from 100 %“); Σ / massengewichtete Anteile → ISO-59020-05-D1 … D11. Die Einzelfelder bleiben (iso59020-D-6 … D-10).' },
  }),
  derivedOut(WS05, 'F', 'inflows_count', 'Anzahl erfasster Zuflüsse X', null, 'A.2.1', 'ISO-59020-05-D1', 'count_rows über inflows.', Q.L1892_1894),
  derivedOut(WS05, 'F', 'm_ti_total', 'Σ mTI(X) — Gesamtmasse aller Zuflüsse', 'kg', 'A.2.1, A.1', 'ISO-59020-05-D2', 'sum_rows über inflows.m_ti („absolute values with units should also be documented“, A.1).', Q.L1835_1837),
  derivedOut(WS05, 'F', 'm_reui_total', 'Σ mREUI(X)', 'kg', 'A.2.2', 'ISO-59020-05-D3', 'sum_rows über inflows.m_reui.', Q.L1926_1938),
  derivedOut(WS05, 'F', 'm_reci_total', 'Σ mRECI(X)', 'kg', 'A.2.3', 'ISO-59020-05-D4', 'sum_rows über inflows.m_reci.', Q.L1950_1962),
  derivedOut(WS05, 'F', 'm_reni_total', 'Σ mRENI(X)', 'kg', 'A.2.4', 'ISO-59020-05-D5', 'sum_rows über inflows.m_reni.', Q.L1992_2004),
  derivedOut(WS05, 'F', 'm_linear_total', 'Σ linearer (nicht-zirkulärer) Zufluss', 'kg', 'A.2.1', 'ISO-59020-05-D6', 'Σ mTI − Σ (mREUI + mRECI + mRENI).', Q.L1850_1854),
  derivedOut(WS05, 'F', 'pct_reui_agg', 'Wiederverwendeter Anteil über alle Zuflüsse (massengewichtet)', '%', 'A.2.2, Annex G.2', 'ISO-59020-05-D7', 'Σ mREUI / Σ mTI · 100 (Anhang G.2 EXAMPLE c — iso59020-J-1).', Q.L3783_3789),
  derivedOut(WS05, 'F', 'pct_reci_agg', 'Recycelter Anteil über alle Zuflüsse (massengewichtet)', '%', 'A.2.3, Annex G.2', 'ISO-59020-05-D8', 'Σ mRECI / Σ mTI · 100 („the mass that is recycled material can be calculated and then aggregated with other similar resources“, A.2.3 — iso59020-J-1).', Q.L1964_1967),
  derivedOut(WS05, 'F', 'pct_reni_agg', 'Erneuerbarer Anteil über alle Zuflüsse (massengewichtet)', '%', 'A.2.4, Annex G.2', 'ISO-59020-05-D9', 'Σ mRENI / Σ mTI · 100 (iso59020-J-1).', Q.L3783_3789),
  derivedOut(WS05, 'F', 'pct_linear_agg', 'Linearer Anteil über alle Zuflüsse (massengewichtet)', '%', 'A.2.1, Annex G.2', 'ISO-59020-05-D10', '100 − Σ (mREUI + mRECI + mRENI) / Σ mTI · 100; Zwilling des Eingabefelds pct_linear_inflow (iso59020-D-10).', Q.L1850_1854),
  derivedOut(WS05, 'F', 'inflows_unbalanced', 'Zuflüsse mit verletzter 100 %-Bilanz', null, 'A.2.1', 'ISO-59020-05-D11', 'Zeilen mit balanced = 0 (zirkuläre Massen > mTI); CR-014 → iso59020-G-3.', Q.L1850_1854),

  // ---- ISO-59020-06: resource outflows, one row per outflow X (A.3) ----
  WS06({
    symbol: 'outflows', widget: 'register',
    ui_config: {
      title: 'Ressourcenabflüsse X (resource outflows, Annex A.3)', subtitle: 'Je Abfluss X eine Zeile: Gesamtmasse mTO(X), wiederverwendete / recycelte / biologisch rezirkulierte Masse (kg), optional Lebensdauer tLP / tIALP (A.3.2); die Anteile nach Formula (A.4) – (A.7) und der lineare Rest werden je Zeile berechnet; ohne rückverfolgbare Recyclingdaten gilt 0 % (A.3.4)', add_label: '+ Abfluss', placement: 'section',
      columns: [
        { key: 'label', label: 'Abfluss X', type: 'text', required: true, aria_label: 'Bezeichnung des Abflusses X' },
        { key: 'm_to', label: 'mTO(X)', type: 'number', unit: 'kg', required: true, min: 0, aria_label: 'Gesamtmasse des Abflusses X' },
        { key: 'm_reuo', label: 'mREUO(X)', type: 'number', unit: 'kg', required: true, min: 0, aria_label: 'Masse des wiederverwendeten Abflusses X' },
        { key: 'traceable_recycling', label: 'Recyclingdaten rückverfolgbar', type: 'boolean', discriminator: true, aria_label: 'Rückverfolgbare Recyclingdaten für den Abfluss X vorhanden (A.3.4)' },
        { key: 'm_reco', label: 'mRECO(X)', type: 'number', unit: 'kg', required: true, min: 0, visible_when: TRACEABLE, aria_label: 'Masse recycelten Materials aus dem Abfluss X' },
        { key: 'm_reno', label: 'mRENO(X)', type: 'number', unit: 'kg', required: true, min: 0, aria_label: 'Masse des Abflusses X in erneuerbarer Rezirkulation' },
        { key: 't_lp', label: 'tLP(X)', type: 'number', unit: 'a', min: 0, aria_label: 'Lebensdauer des Produkts oder Materials X (optional, A.3.2)' },
        { key: 't_ialp', label: 'tIALP(X)', type: 'number', unit: 'a', min: 0, aria_label: 'Branchendurchschnittliche Lebensdauer des Produkts oder Materials X (optional, A.3.2)' },
        { key: 'pct_reuo', label: 'PREUO(X) (A.5)', type: 'derived', expr: PCT_REUO_EXPR },
        { key: 'pct_reco', label: 'PRECO(X) (A.6)', type: 'derived', expr: PCT_RECO_EXPR },
        { key: 'pct_reno', label: 'PRENO(X) (A.7)', type: 'derived', expr: PCT_RENO_EXPR },
        { key: 'pct_linear', label: 'linear (%)', type: 'derived', expr: PCT_LINEAR_OUT_EXPR },
        { key: 'm_linear', label: 'linear (kg)', type: 'derived', expr: M_LINEAR_OUT_EXPR },
        { key: 'rlp', label: 'RLP(X) (A.4)', type: 'derived', expr: RLP_EXPR },
        { key: 'balanced', label: '100 %-Bilanz', type: 'derived', expr: BALANCED_OUT_EXPR, display: 'badge', value_labels: { '1': 'bilanziert (zirkulär ≤ Gesamt)', '0': 'zirkuläre Massen übersteigen mTO(X)' } },
      ],
      footer: ['outflows_count', 'm_to_total', 'pct_reuo_agg', 'pct_reco_agg', 'pct_reno_agg', 'pct_linear_out_agg', 'outflows_unbalanced', 'outflows_untraceable'],
      note: `${Q.L2015_2021} ${Q.L2175} Eine Zeile ohne gesetztes „Recyclingdaten rückverfolgbar“ rechnet mit PRECO(X) = 0 % (iso59020-J-7); RLP(X) bleibt leer ohne die optionalen Lebensdauern (kein Mittelwert über Zeilen — iso59020-J-8). Die Einzelfelder mTO_X / mREUO_X / mRECO_X / mRENO_X / tLP_X / tIALP_X / pct_linear_outflow bleiben (iso59020-D-11 … D-17); Gleichungen A.4 – A.7 und CR-015 … CR-019 → iso59020-R-1 / G-3.`,
    },
    verification_quote: `${Q.L2015_2021} — ${Q.L2022_2026}`,
    create: { section_code: 'G', label_de: 'Ressourcenabflüsse X (je Abfluss: mTO, mREUO, mRECO, mRENO, tLP, tIALP; Anteile nach A.4 – A.7, linearer Rest, 100 %-Bilanz)', data_type: 'json', unit: null, clause_reference: 'A.3.1 – A.3.5, Formula (A.4) – (A.7)',
      description: 'Plan 3: Zeilen je Ressourcenabfluss X („The circularity indicators for each outflow can be calculated and reported individually or they can be aggregated“) mit den Formeln (A.4) – (A.7) je Zeile, dem A.3.4-Schalter für nicht rückverfolgbare Recyclingdaten (0 %) und dem linearen Rest (A.3.1); Σ / massengewichtete Anteile → ISO-59020-06-D1 … D12. Die Einzelfelder bleiben (iso59020-D-11 … D-17).' },
  }),
  derivedOut(WS06, 'G', 'outflows_count', 'Anzahl erfasster Abflüsse X', null, 'A.3.1', 'ISO-59020-06-D1', 'count_rows über outflows.', Q.L2022_2026),
  derivedOut(WS06, 'G', 'm_to_total', 'Σ mTO(X) — Gesamtmasse aller Abflüsse', 'kg', 'A.3.1, A.1', 'ISO-59020-06-D2', 'sum_rows über outflows.m_to.', Q.L1835_1837),
  derivedOut(WS06, 'G', 'm_reuo_total', 'Σ mREUO(X)', 'kg', 'A.3.3', 'ISO-59020-06-D3', 'sum_rows über outflows.m_reuo.', Q.L2140_2146),
  derivedOut(WS06, 'G', 'm_reco_total', 'Σ mRECO(X) (nur rückverfolgbare Zeilen)', 'kg', 'A.3.4', 'ISO-59020-06-D4', 'sum_rows über outflows mit if(traceable_recycling, m_reco, 0).', Q.L2175),
  derivedOut(WS06, 'G', 'm_reno_total', 'Σ mRENO(X)', 'kg', 'A.3.5', 'ISO-59020-06-D5', 'sum_rows über outflows.m_reno.', Q.L2228_2240),
  derivedOut(WS06, 'G', 'm_linear_out_total', 'Σ linearer (nicht-zirkulärer) Abfluss', 'kg', 'A.3.1', 'ISO-59020-06-D6', 'Σ mTO − Σ (mREUO + mRECO + mRENO).', Q.L2015_2021),
  derivedOut(WS06, 'G', 'pct_reuo_agg', 'Wiederverwendeter Anteil über alle Abflüsse (massengewichtet)', '%', 'A.3.3, Annex G.2', 'ISO-59020-06-D7', 'Σ mREUO / Σ mTO · 100 (iso59020-J-1).', Q.L3783_3789),
  derivedOut(WS06, 'G', 'pct_reco_agg', 'Recycelter Anteil über alle Abflüsse (massengewichtet)', '%', 'A.3.4, Annex G.2', 'ISO-59020-06-D8', 'Σ mRECO (rückverfolgbar) / Σ mTO · 100 — Anhang G.2 EXAMPLE c („form a total amount of material recycled … divide the sum with the total amount“, iso59020-J-1).', Q.L3783_3789),
  derivedOut(WS06, 'G', 'pct_reno_agg', 'Biologisch rezirkulierter Anteil über alle Abflüsse (massengewichtet)', '%', 'A.3.5, Annex G.2', 'ISO-59020-06-D9', 'Σ mRENO / Σ mTO · 100 (iso59020-J-1).', Q.L3783_3789),
  derivedOut(WS06, 'G', 'pct_linear_out_agg', 'Linearer Anteil über alle Abflüsse (massengewichtet)', '%', 'A.3.1, Annex G.2', 'ISO-59020-06-D10', '100 − Σ (mREUO + mRECO + mRENO) / Σ mTO · 100; Zwilling des Eingabefelds pct_linear_outflow (iso59020-D-17).', Q.L2015_2021),
  derivedOut(WS06, 'G', 'outflows_unbalanced', 'Abflüsse mit verletzter 100 %-Bilanz', null, 'A.3.1', 'ISO-59020-06-D11', 'Zeilen mit balanced = 0 (zirkuläre Massen > mTO); CR-019 → iso59020-G-3.', Q.L2022_2026),
  derivedOut(WS06, 'G', 'outflows_untraceable', 'Abflüsse ohne rückverfolgbare Recyclingdaten (PRECO = 0 %)', null, 'A.3.4', 'ISO-59020-06-D12', 'Zeilen mit traceable_recycling = false („0 % should be recorded“).', Q.L2175),

  // ---- ISO-59020-07: energy flows, one row per energy flow X (A.4.2) ----
  WS07({
    symbol: 'energy_flows', widget: 'register',
    ui_config: {
      title: 'Energieflüsse X (energy flows, Annex A.4.2)', subtitle: 'Je Energiefluss X eine Zeile: erneuerbarer Zu-/Abfluss EIRENE / EORENE und gesamter Zu-/Abfluss EITE / EOTE in der gemeinsamen Einheit (MJ oder kWh, A.4.2); PECONRE(X) nach Formula (A.8) je Zeile', add_label: '+ Energiefluss', placement: 'section',
      columns: [
        { key: 'label', label: 'Energiefluss X', type: 'text', required: true, aria_label: 'Bezeichnung des Energieflusses X' },
        { key: 'unit', label: 'Einheit', type: 'enum', required: true, options: [...ENERGY_UNITS], aria_label: 'Energieeinheit der Zeile (MJ oder kWh)' },
        { key: 'ei_rene', label: 'EIRENE(X)', type: 'number', required: true, min: 0, aria_label: 'Erneuerbarer Energiezufluss X' },
        { key: 'eo_rene', label: 'EORENE(X)', type: 'number', required: true, min: 0, aria_label: 'Erneuerbarer Energieabfluss X' },
        { key: 'ei_te', label: 'EITE(X)', type: 'number', required: true, min: 0, aria_label: 'Gesamter Energiezufluss X' },
        { key: 'eo_te', label: 'EOTE(X)', type: 'number', required: true, min: 0, aria_label: 'Gesamter Energieabfluss X' },
        { key: 'net_consumed', label: 'netto verbraucht', type: 'derived', expr: NET_ENERGY_EXPR },
        { key: 'pct_econre', label: 'PECONRE(X) (A.8)', type: 'derived', expr: PCT_ECONRE_EXPR },
        { key: 'unit_ok', label: 'Einheit', type: 'derived', expr: UNIT_OK_EXPR, display: 'badge', value_labels: { '1': 'gemeinsame Einheit', '0': 'Einheit ≠ energy_unit_common (oder nicht gewählt)' } },
      ],
      footer: ['energy_flows_count', 'ei_te_total', 'eo_te_total', 'pct_econre_agg', 'energy_unit_mismatch'],
      note: `${Q.L2271_2272} Die Zeile gilt als abweichend, solange die gemeinsame Einheit dieses Arbeitsblatts (energy_unit_common) nicht gewählt ist. Formula (A.8) druckt „⋅1000“, die Legende „in %“ — die Zeile rechnet · 100 (iso59020-U-2). Die Einzelfelder EIRENE_X / EORENE_X / EITE_X / EOTE_X bleiben (iso59020-D-18 … D-21); Gleichung A.8 und CR-020 → iso59020-R-1 / G-1.`,
    },
    verification_quote: `${Q.L2271_2272} — ${Q.L2284_2292}`,
    create: { section_code: 'C', label_de: 'Energieflüsse X (je Fluss: Einheit, EIRENE, EORENE, EITE, EOTE; PECONRE nach A.8)', data_type: 'json', unit: null, clause_reference: 'A.4.2, Formula (A.8)',
      description: 'Plan 3: Zeilen je Energiefluss X mit Formula (A.8) je Zeile und der Einheitsprüfung gegen energy_unit_common („A common suitable measurement unit (e.g. MJ, kWh) shall be selected“); Σ / gewichteter Anteil → ISO-59020-07-D1 … D7. Die Einzelfelder bleiben (iso59020-D-18 … D-21).' },
  }),
  derivedOut(WS07, 'C', 'energy_flows_count', 'Anzahl erfasster Energieflüsse X', null, 'A.4.2', 'ISO-59020-07-D1', 'count_rows über energy_flows.', Q.L2284_2292),
  derivedOut(WS07, 'C', 'ei_rene_total', 'Σ EIRENE(X)', null, 'A.4.2', 'ISO-59020-07-D2', 'sum_rows über energy_flows.ei_rene (Einheit = energy_unit_common).', Q.L2284_2292),
  derivedOut(WS07, 'C', 'eo_rene_total', 'Σ EORENE(X)', null, 'A.4.2', 'ISO-59020-07-D3', 'sum_rows über energy_flows.eo_rene.', Q.L2284_2292),
  derivedOut(WS07, 'C', 'ei_te_total', 'Σ EITE(X)', null, 'A.4.2', 'ISO-59020-07-D4', 'sum_rows über energy_flows.ei_te.', Q.L2284_2292),
  derivedOut(WS07, 'C', 'eo_te_total', 'Σ EOTE(X)', null, 'A.4.2', 'ISO-59020-07-D5', 'sum_rows über energy_flows.eo_te.', Q.L2284_2292),
  derivedOut(WS07, 'C', 'pct_econre_agg', 'Erneuerbarer Anteil der netto verbrauchten Energie über alle Flüsse', '%', 'A.4.2, Annex G.2', 'ISO-59020-07-D6', '(Σ EIRENE − Σ EORENE) / (Σ EITE − Σ EOTE) · 100 — Formula (A.8) über die Summen (iso59020-J-1).', Q.L2275_2292),
  derivedOut(WS07, 'C', 'energy_unit_mismatch', 'Energieflüsse mit abweichender Einheit', null, 'A.4.2', 'ISO-59020-07-D7', 'Zeilen mit unit_ok = 0 (Einheit ≠ energy_unit_common oder keine gemeinsame Einheit gewählt); Gate STAGED (iso59020-G-5).', Q.L2271_2272),

  // ---- ISO-59020-08: elementary components / data sources (§7.6.1.2, §7.6.2) ----
  WS08({
    symbol: 'data_sources', widget: 'register',
    ui_config: {
      title: 'Elementarkomponenten und Datenquellen (§7.6.1.2 Step A, §7.6.2)', subtitle: 'Je Elementarkomponente des Systems eine Zeile mit ihrer Datenquelle, der Einordnung nach §7.6.2 (primär/sekundär, Vordergrund/Hintergrund, spezifisch/generisch), Rückverfolgbarkeit, Dokumentation und Begründung', add_label: '+ Komponente / Datenquelle', placement: 'section',
      columns: [
        { key: 'component', label: 'Elementarkomponente', type: 'text', required: true, aria_label: 'Elementarkomponente des Systems im Fokus' },
        { key: 'source', label: 'Datenquelle', type: 'text', aria_label: 'Datenquelle der Komponente' },
        { key: 'origin', label: 'primär / sekundär', type: 'enum', required: true, options: [...DATA_ORIGIN], option_labels: { primary: 'primary (Primärdaten)', secondary: 'secondary (Sekundärdaten)' }, aria_label: 'Primär- oder Sekundärdaten' },
        { key: 'scope', label: 'Vordergrund / Hintergrund', type: 'enum', required: true, options: [...DATA_SCOPE], option_labels: { foreground: 'foreground', background: 'background' }, aria_label: 'Vordergrund- oder Hintergrunddaten' },
        { key: 'specificity', label: 'spezifisch / generisch', type: 'enum', required: true, options: [...DATA_SPECIFICITY], option_labels: { specific: 'specific', generic: 'generic' }, aria_label: 'Spezifische oder generische Daten' },
        { key: 'traceable', label: 'rückverfolgbar', type: 'boolean', aria_label: 'Daten rückverfolgbar und verifizierbar' },
        { key: 'documented', label: 'dokumentiert', type: 'boolean', aria_label: 'Mit ausreichender Dokumentation geliefert (§7.6.2)' },
        { key: 'justification', label: 'Begründung', type: 'text', aria_label: 'Begründung, wie gut die Kriterien erfüllt sind (§7.6.2)' },
        { key: 'conservative', label: 'konservativ anwenden', type: 'derived', expr: CONSERVATIVE_EXPR, display: 'badge', value_labels: { '1': 'sekundär / generisch — konservativ anwenden, Zirkularität nicht überschätzen', '0': '' } },
      ],
      footer: ['data_sources_count', 'data_sources_untraceable', 'data_sources_secondary', 'data_sources_generic', 'data_sources_background'],
      note: `${Q.L1274_1276} ${Q.L1339_1341} Die Einzelfelder system_breakdown_done / data_category / data_traceability bleiben (iso59020-D-22 … D-24); die drei Einordnungsspalten teilen prod’s Aufzählung data_category in die drei gedruckten Paare (iso59020-J-4).`,
    },
    verification_quote: `${Q.L1274_1276} — ${Q.L1339_1341}`,
    create: { section_code: 'C', label_de: 'Elementarkomponenten und Datenquellen (je Komponente: Quelle, Einordnung nach §7.6.2, Rückverfolgbarkeit, Dokumentation, Begründung)', data_type: 'json', unit: null, clause_reference: '§7.6.1.2, §7.6.2',
      description: 'Plan 3: Zeilen je Elementarkomponente („the system in focus is subdivided into its elementary components … identification of data sources“) mit der §7.6.2-Einordnung; Anzahl → data_sources_count (ISO-59020-08-D1), nicht rückverfolgbar → data_sources_untraceable (-D2), sekundär / generisch / Hintergrund → -D3 … -D5. Die Einzelfelder bleiben (iso59020-D-22 … D-24).' },
  }),
  derivedOut(WS08, 'C', 'data_sources_count', 'Anzahl erfasster Elementarkomponenten / Datenquellen', null, '§7.6.1.2', 'ISO-59020-08-D1', 'count_rows über data_sources.', Q.L1274_1276),
  derivedOut(WS08, 'C', 'data_sources_untraceable', 'Datenquellen ohne Rückverfolgbarkeit', null, '§7.6.2', 'ISO-59020-08-D2', 'Zeilen mit traceable = false („sufficient documentation to enable verification“).', Q.L1342_1345),
  derivedOut(WS08, 'C', 'data_sources_secondary', 'Datenquellen mit Sekundärdaten', null, '§7.6.2', 'ISO-59020-08-D3', 'Zeilen mit origin = secondary („secondary and generic data should be conservatively applied“).', Q.L1339_1341),
  derivedOut(WS08, 'C', 'data_sources_generic', 'Datenquellen mit generischen Daten', null, '§7.6.2', 'ISO-59020-08-D4', 'Zeilen mit specificity = generic.', Q.L1339_1341),
  derivedOut(WS08, 'C', 'data_sources_background', 'Datenquellen mit Hintergrunddaten', null, '§7.6.2', 'ISO-59020-08-D5', 'Zeilen mit scope = background.', Q.L1339_1341),

  // ---- ISO-59020-09: complementary methods (§3.3.7, Annex C) and the §6.4.2 report note ----
  WS09({
    symbol: 'complementary_methods', widget: 'register',
    ui_config: {
      title: 'Komplementäre Methoden (complementary methods, §3.3.7 / Annex C)', subtitle: 'Je angewandter komplementärer Methode eine Zeile — Anhang C.3 / C.4 / C.5 als Vorschlagsliste; Wirkungsaspekt nach C.2.1 (social, environmental, economic)', add_label: '+ Methode', placement: 'section',
      columns: [
        { key: 'method', label: 'Methode / Norm', type: 'text', required: true, datalist: [...COMPLEMENTARY_METHODS], aria_label: 'Komplementäre Methode oder Norm' },
        { key: 'aspect', label: 'Wirkungsaspekt', type: 'enum', options: [...IMPACT_ASPECTS], option_labels: { social: 'social (sozial)', environmental: 'environmental (ökologisch)', economic: 'economic (wirtschaftlich)' }, aria_label: 'Bewerteter Wirkungsaspekt (C.2.1)' },
        { key: 'reference', label: 'Bezug / Ergebnisdokument', type: 'text', aria_label: 'Bezug oder Ergebnisdokument der Methode' },
        { key: 'result', label: 'Ergebnis (Kurzfassung)', type: 'text', aria_label: 'Kurzfassung des Ergebnisses' },
      ],
      footer: ['complementary_methods_count'],
      note: `${Q.L375_378} ${Q.L3018_3019} §3.3.7 druckt keine Beispielliste — die Vorschlagsliste ist die Liste der Normen aus Anhang C.3 / C.4 / C.5 (iso59020-O-1). Das Textfeld complementary_method bleibt (iso59020-D-25).`,
    },
    verification_quote: `${Q.L375_378} — ${Q.L3075_3077}`,
    create: { section_code: 'E', label_de: 'Komplementäre Methoden (Annex C; je Methode: Norm, Wirkungsaspekt, Bezug, Ergebnis)', data_type: 'json', unit: null, clause_reference: '§3.3.7, §7.3.3, Annex C',
      description: 'Plan 3: Zeilen je komplementärer Methode („method, approach or standard that is used together with circularity measurement“); Anzahl → complementary_methods_count (ISO-59020-09-D1). Das Textfeld complementary_method bleibt (iso59020-D-25).' },
  }),
  derivedOut(WS09, 'E', 'complementary_methods_count', 'Anzahl angewandter komplementärer Methoden', null, '§3.3.7, Annex C', 'ISO-59020-09-D1', 'count_rows über complementary_methods.', Q.L3018_3019),
  WS09({
    symbol: 'temporal_boundary_note', widget: 'scalar', ui_config: null, visible_when: SHORTENED, verification_quote: Q.L847_850,
    create: { section_code: 'G', label_de: 'Dokumentation der verkürzten zeitlichen Systemgrenze im Bewertungsbericht (§6.4.2)', data_type: 'text', unit: null, clause_reference: '§6.4.2, §8.6',
      description: 'Plan 3: Freitext, nur sichtbar bei temporal_boundary_shortened („Shorter timescales that do not consider an entire life cycle should be documented in the assessment report“); CR-008 (leere Bedingung auf -03) → STAGED iso59020-G-2 (Gate auf -09 mit IF-Guard).' },
  }),
];

/**
 * No section rules: every ISO-59020 section holds consumed or gate-read fields (-04 C / D / E,
 * -05 C … F, -06 C … G, -07 C … H, -08 C … E, -09 C … G) or is field-less (A / B / J … M — an inert rule).
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
