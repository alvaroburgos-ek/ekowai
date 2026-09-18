/**
 * DWA-M-205 — Plan 3 Task 11 field configs (Leitorganismus target register fed by
 * Tabelle 1 / 2 / 3, the sample / channel / module / generator / chlorination
 * registers, Tab. 4 / §3.3 / §4.1.2.3 / §4.3.3.2 / §4.3.3.4 fills, visibility) as
 * DATA for `scripts/regulation-tables/emit-field-configs-sql.ts m205`.
 *
 * Every `verification_quote` is lifted verbatim from the transcript
 * `Desktop\Guidelines\DWA-M-205\DWA-M_205.md` (the `Q` spans of the seed module,
 * line in the key). Prod facts come from the captured `m205.prior.json`
 * (2026-09-18, read-only): every worksheet carries the same nine flat sections
 * A Zweck · B Eingangsgrößen / Inputs · C Arbeitsblatt-spezifische Bearbeitung ·
 * D Ergebnisse · F · J · K · L · M — fields live in B and D only (108 of 237 are
 * orphans). Registers are created in C, their outputs in D, fills / selects in B.
 *
 * Placement rules applied:
 *   - `leitorganismen` sits on M205-10, the worksheet that inherits
 *     `eg_badegewaesser_richtlinie`, `gewaesserklasse`, `eignungsklasse_bewaesserung`
 *     from M205-02 and holds the Ablauf scalars + the 14 Tab.-2 gates (CR-03/04/05/
 *     14/15/16/17 + `-2`); the Tab.-2 key is therefore prod's combined
 *     `gewaesserklasse` token (the brief's `gewaessertyp` × `guetekategorie` exist on
 *     M205-04 only, consumer-free — not in scope on -10).
 *   - a `lookup_fill` sits on the worksheet of its KEY symbol (a262e trap 1); the
 *     Tab.-4 lamp figures are TEXT twins beside `strahlertyp` on M205-05 (the
 *     printed cells are ranges — SR-2 forbids filling a number with a bound,
 *     m205-R-4; the existing numeric inputs stay manufacturer data);
 *     `spez_energie_ozon` is consumed on -07 / -19 → twin `spez_energie_ozon_tab`
 *     beside `ozon_einsatzgas` on M205-17 (E-2 rule; EQ-05 rewrite m205-R-1).
 *   - `verfahren` (M205-09) has NO consumers and every field-bearing section of
 *     M205-10 … -23 holds a consumed producer → no section rule is emitted
 *     (m205-C-1 / C-2); the Tab.-3 rule on -05 reads `behandlungsziel` (M205-03,
 *     consumer-free) → `pending` (visible) until m205-C-3.
 *
 * NOT here (each a sign-off block; STAGED SQL in scripts/verification/m205-STAGED-plan3-rulings.sql):
 *   the 14-gate rewrite onto the register (G-1), the `verfahren` guards (G-2), CR-20 by
 *   nutzung (G-3), the `-2` duplicates (G-4), CR-07 by zielband (G-5), CR-31 by
 *   Standzeit (G-6, a visibility rule there would neutralise a block gate), CR-21 by
 *   bromid (G-7), hiding any consumed field (C-4), retiring the Ablauf scalars (D-1),
 *   EQ-04 / EQ-05 replacements (R-2 / R-1), the range-check "equations" (R-3).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q, S3_3_BEWIRTSCHAFTUNG, TAB2_PARAMETER } from '../regulation-tables-seed-m205';

const STD = 'DWA-M-205';
const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS04 = on('M205-04');
const WS05 = on('M205-05');
const WS10 = on('M205-10');
const WS11 = on('M205-11');
const WS14 = on('M205-14');
const WS17 = on('M205-17');
const WS18 = on('M205-18');
const WS21 = on('M205-21');
const WS24 = on('M205-24');

// L360: "Als Beurteilungsparameter (Leitorganismen) dienen Fäkalstreptokokken und Escherichia coli." (inside the §3.3 paragraph)
const L360 = 'Entsprechend definiert die DIN 19650 vier Eignungsklassen in Abhängigkeit von der Nutzung der Bewässerungsfläche (Gewächshaus- und Freilandkulturen, Sportplätze, Grünanlagen u. Ä.). Die Anforderungen an die hygienische Qualität des Bewässerungswassers sind umso strenger, je höher die mit der Nutzung verbundene Wahrscheinlichkeit einer Verbreitung von Krankheitserregern ist. Als Beurteilungsparameter (Leitorganismen) dienen Fäkalstreptokokken und Escherichia coli.';

export const ALT = "eg_badegewaesser_richtlinie == 'alt'";
export const NEU = "eg_badegewaesser_richtlinie == 'neu'";
export const BEWAESSERUNG = "behandlungsziel == 'bewaesserung'";
export const THERMISCH = "verbrennung_typ == 'thermisch'";
export const KATALYTISCH = "verbrennung_typ == 'katalytisch'";
export const CLO2 = "chlormittel_typ == 'chlordioxid'";
export const NICHT_CLO2 = "chlormittel_typ != 'chlordioxid'";

// ---- leitorganismen row expressions (G-13: gewaesserklasse / eignungsklasse_bewaesserung are worksheet symbols inherited on M205-10) ----
export const LIMIT_T2_EXPR = "lookup('TABELLE2', gewaesserklasse, parameter_t2, 'limit_cfu_100ml')";
export const PCT_T2_EXPR = "lookup('TABELLE2', gewaesserklasse, parameter_t2, 'percentile_pct')";
export const METHODE_T2_EXPR = "lookup('TABELLE2', gewaesserklasse, parameter_t2, 'methode')";
export const LIMIT_T3_EXPR = "if(parameter_t3 == 'fkstrep', lookup('TABELLE3', eignungsklasse_bewaesserung, 'fkstrep_max'), if(parameter_t3 == 'e_coli', lookup('TABELLE3', eignungsklasse_bewaesserung, 'e_coli_max'), lookup('TABELLE3', eignungsklasse_bewaesserung, 'toc_max')))";
export const TEXT_T3_EXPR = "if(parameter_t3 == 'fkstrep', lookup('TABELLE3', eignungsklasse_bewaesserung, 'fkstrep_text'), if(parameter_t3 == 'e_coli', lookup('TABELLE3', eignungsklasse_bewaesserung, 'e_coli_text'), lookup('TABELLE3', eignungsklasse_bewaesserung, 'toc_text')))";
export const LIMIT_EXPR = "if(quelle == 't1', if(wert_typ == 'g', g_wert_t1, i_wert_t1), if(quelle == 't2', limit_t2, if(quelle == 't3', limit_t3, limit_behoerde)))";
export const PERZENTIL_EXPR = "if(quelle == 't1', if(wert_typ == 'g', g_pct_t1, i_pct_t1), if(quelle == 't2', pct_t2, perzentil_behoerde))";
export const OK_EXPR = 'if(messwert <= limit, 1, 0)';

const T1_CAPTION = 'Tabelle 1: Mikrobiologische Qualitätsanforderungen an Badegewässer nach der Richtlinie 76/160/EWG'; // L297
const T2_CAPTION = 'Tabelle 2: Mikrobiologische Qualitätsanforderungen an Badegewässer nach der Richtlinie 2006/7/EG'; // L317
const T3_CAPTION = 'Tabelle 3: Eignungsklassen und Anwendungsbereiche von Bewässerungswasser gemäß der „Empfehlungen für die Untersuchung und Bewertung von Wasser zur Bewässerung von gärtnerischen und landwirtschaftlichen Fruchtarten in Thüringen"'; // L364
const T4_CAPTION = 'Tabelle 4: Merkmale und Eigenschaften von Niederdruck- und Mitteldruck-UV-Strahlern'; // L526

/** Tab. 4 text fills on M205-05 (beside `strahlertyp`): existing numeric input → created text twin showing the printed cell. */
const TAB4_FILLS = [
  { symbol: 'strahler_quecksilberdampfdruck_tab4', value: 'hg_druck_hpa', label: 'Quecksilberdampfdruck nach Tabelle 4 (hPa)', row: 'Quecksilberdampfdruck & hPa & ca. 0,01 & 1.000-10.000', existing: 'strahler_quecksilberdampfdruck' },
  { symbol: 'strahler_wellenlaenge_tab4', value: 'wellenlaenge_nm', label: 'Wellenlänge im UV-C-Bereich nach Tabelle 4 (nm)', row: 'Wellenlänge im UV-C-Bereich & nm & 254 nm', existing: 'strahler_wellenlaenge' },
  { symbol: 'strahler_leistungsdichte_tab4', value: 'leistungsdichte_w_cm', label: 'Typische Leistungsdichte bezogen auf die Lichtbogenlänge nach Tabelle 4 (W/cm)', row: 'Typische Leistungsdichte bezogen auf die Lichtbogenlänge', existing: 'strahler_leistungsdichte' },
  { symbol: 'uvc_anteil_tab4', value: 'uvc_anteil_pct', label: 'UV-C-Leistung (254 nm) bezogen auf die eingespeiste elektr. Leistung nach Tabelle 4 (%)', row: 'ca. 20-35 & ca. 8-15', existing: 'uvc_anteil' },
  { symbol: 'strahler_oberflaechentemperatur_tab4', value: 'oberflaechentemp_c', label: 'Oberflächentemperatur Strahler nach Tabelle 4 (°C)', row: 'Oberflächentemperatur Strahler', existing: 'strahler_oberflaechentemperatur' },
  { symbol: 'strahler_nutzungsdauer_tab4', value: 'nutzungsdauer_h', label: 'Mittlere Nutzungsdauer nach Tabelle 4 (h)', row: 'Mittlere Nutzungsdauer & h & 8.000-16.000 & 4.000-12.000', existing: 'strahler_nutzungsdauer' },
] as const;
export const TAB4_FILL_SYMBOLS = TAB4_FILLS.map((f) => f.symbol);
for (const f of TAB4_FILLS) if (!Q.T4_SPAN.includes(f.row)) throw new Error(`Tab. 4 fill ${f.symbol}: row fragment not in the printed span`);

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- M205-04 EG-Badegewässerrichtlinie: Tab.-1 parameters only under the old directive, Tab.-2 selectors only under the new one ----
  ...(['gesamtcoliforme', 'faekalcoliforme', 'strep_faecalis'] as const).map((symbol) => WS04({ symbol, widget: 'scalar', ui_config: null, visible_when: ALT, verification_quote: Q.L343 })),
  ...(['gewaessertyp', 'guetekategorie'] as const).map((symbol) => WS04({ symbol, widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: NEU, verification_quote: Q.L341 })),

  // ---- M205-05 Bewässerung: §3.3 log-reduction recommendation, Tab.-3 parameters, Tab.-4 lamp figures ----
  WS05({
    symbol: 'bewirtschaftung', widget: 'select_one', ui_config: null,
    enum_values: S3_3_BEWIRTSCHAFTUNG.map((b, i) => ({ value: b.value, label_de: b.label_de, order_index: i })), // L354
    verification_quote: Q.L354,
    create: { section_code: 'B', label_de: 'Bewirtschaftung der Bewässerungsfläche (WHO §3.3: arbeitsintensiv / hoch mechanisiert; bei uneingeschränkter Nutzung ohne Einfluss)', data_type: 'enum', unit: null, clause_reference: '§3.3',
      description: 'Plan 3: zweiter Schlüssel der §3.3-Empfehlung neben nutzung — eingeschränkte Nutzung: 4 Log-Stufen bei arbeitsintensiver, 3 Log-Stufen bei hoch mechanisierter Bewirtschaftung; uneingeschränkte Nutzung: 6 bis 7 Log-Stufen (beide Zeilen gleich). Füllt log_reduktion_empfehlung; das Gate log_reduktion ≥ Empfehlung (CR-20) ist STAGED (m205-G-3).' },
  }),
  WS05({
    symbol: 'log_reduktion_empfehlung', widget: 'lookup_fill', ui_config: { source_label: '§3.3 (WHO)' },
    lookup: { table_code: 'S3_3_LOGRED', role: 'limit', keys: [{ column: 'nutzung', from_symbol: 'nutzung' }, { column: 'bewirtschaftung', from_symbol: 'bewirtschaftung' }], value: 'empfehlung' },
    verification_quote: Q.L354,
    create: { section_code: 'B', label_de: 'Empfohlene Keimreduzierung nach §3.3 (Log-Stufen, aus Nutzung und Bewirtschaftung)', data_type: 'text', unit: null, clause_reference: '§3.3',
      description: 'Plan 3: die gedruckte Empfehlung als Text (6 bis 7 / 4 / 3 Log-Stufen) — als Bereich nicht automatisch auf einen Wert gesetzt (SR-2); die Zahlen log_min / log_max stehen in S3_3_LOGRED für das STAGED Gate (m205-G-3).' },
  }),
  ...(['fkstrep', 'toc'] as const).map((symbol) => WS05({ symbol, widget: 'scalar', ui_config: null, visible_when: BEWAESSERUNG, verification_quote: `${L360} — ${T3_CAPTION}` })), // pending until m205-C-3 (behandlungsziel is consumer-free on M205-03)
  ...TAB4_FILLS.map((f) => WS05({
    symbol: f.symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 4 (figawa)' },
    lookup: { table_code: 'TABELLE4', role: 'value', keys: [{ column: 'strahlertyp', from_symbol: 'strahlertyp' }], value: f.value },
    verification_quote: `${T4_CAPTION} — ${f.row}`,
    create: { section_code: 'B', label_de: f.label, data_type: 'text', unit: null, clause_reference: '§4.1.3.1, Tab. 4',
      description: `Plan 3: der gedruckte Tab.-4-Wert (Bereich) für den gewählten Strahlertyp als Text; das Eingabefeld ${f.existing} bleibt die Herstellerangabe (Bereiche werden nicht auf einen Wert gesetzt, SR-2 — m205-R-4); Bereichsprüfung STAGED (m205-G-9).` },
  })),

  // ---- M205-10 UV-Bemessung: the Leitorganismus target register (Tab. 1 / 2 / 3 / Behörde) + the §4.1.2.3 dose band ----
  WS10({
    symbol: 'leitorganismen', widget: 'register',
    ui_config: {
      title: 'Leitorganismen / Zielwerte', subtitle: 'Tabelle 1 / 2 / 3 oder behördliche Vorgabe — je Organismus Zielwert, Perzentil und Ablaufwert', add_label: '+ Organismus', placement: 'section',
      columns: [
        { key: 'quelle', label: 'Zieltabelle', type: 'enum', options: ['t1', 't2', 't3', 'behoerde'], option_labels: { t1: 'Tab. 1 (76/160/EWG, alt)', t2: 'Tab. 2 (2006/7/EG, neu)', t3: 'Tab. 3 (Bewässerung, TLL 2003)', behoerde: 'behördliche Vorgabe (§2.1)' }, required: true, discriminator: true },
        // Tab. 1 — the printed row (G-Wert / I-Wert with percentile) + the engineer's choice which of the two columns is the target (m205-J-1)
        { key: 'parameter_t1', label: 'Parameter (Tab. 1)', type: 'lookup_key', lookup: { table_code: 'TABELLE1' }, required: true, visible_when: "quelle == 't1'" },
        { key: 'g_wert_t1', label: 'Leitwert (G)', type: 'lookup_value', lookup: { table_code: 'TABELLE1', key_column: 'parameter_t1', value: 'g_wert' }, visible_when: "quelle == 't1'" },
        { key: 'g_pct_t1', label: 'G-Perzentil %', type: 'lookup_value', lookup: { table_code: 'TABELLE1', key_column: 'parameter_t1', value: 'g_pct' }, visible_when: "quelle == 't1'" },
        { key: 'i_wert_t1', label: 'Grenzwert (I)', type: 'lookup_value', lookup: { table_code: 'TABELLE1', key_column: 'parameter_t1', value: 'i_wert' }, visible_when: "quelle == 't1'" },
        { key: 'i_pct_t1', label: 'I-Perzentil %', type: 'lookup_value', lookup: { table_code: 'TABELLE1', key_column: 'parameter_t1', value: 'i_pct' }, visible_when: "quelle == 't1'" },
        { key: 'wert_typ', label: 'Zielwert = Leitwert (G) oder Grenzwert (I)', type: 'enum', options: ['g', 'i'], option_labels: { g: 'Leitwert (G-Wert)', i: 'Grenzwert (I-Wert)' }, required: true, visible_when: "quelle == 't1'" },
        // Tab. 2 — limit + percentile from the inherited Gewässerklasse (M205-02 → M205-10) and the row's parameter
        { key: 'parameter_t2', label: 'Parameter (Tab. 2)', type: 'enum', options: TAB2_PARAMETER.map((p) => p.value), option_labels: Object.fromEntries(TAB2_PARAMETER.map((p) => [p.value, p.label_de])), required: true, visible_when: "quelle == 't2'" },
        { key: 'limit_t2', label: 'Grenzwert Tab. 2 (cfu/100 ml)', type: 'derived', expr: LIMIT_T2_EXPR, visible_when: "quelle == 't2'" },
        { key: 'pct_t2', label: 'Perzentil Tab. 2 %', type: 'derived', expr: PCT_T2_EXPR, visible_when: "quelle == 't2'" },
        { key: 'methode_t2', label: 'Referenzanalysemethode', type: 'derived', expr: METHODE_T2_EXPR, visible_when: "quelle == 't2'" },
        // Tab. 3 — upper bound of the inherited Eignungsklasse (M205-02 → M205-10); "nicht nachweisbar" / "> 400" carry no number (m205-J-4)
        { key: 'parameter_t3', label: 'Parameter (Tab. 3)', type: 'enum', options: ['fkstrep', 'e_coli', 'toc'], option_labels: { fkstrep: 'Fäkalstreptokokken KBE/100 ml', e_coli: 'Escherichia coli KBE/100 ml', toc: 'TOC mg/l' }, required: true, visible_when: "quelle == 't3'" },
        { key: 'limit_t3', label: 'Obergrenze Tab. 3', type: 'derived', expr: LIMIT_T3_EXPR, visible_when: "quelle == 't3'" },
        { key: 'text_t3', label: 'Tab. 3 (gedruckt)', type: 'derived', expr: TEXT_T3_EXPR, visible_when: "quelle == 't3'" },
        // Behörde — §2.1: the authority sets the target
        { key: 'organismus_behoerde', label: 'Leitorganismus (Behörde)', type: 'text', required: true, visible_when: "quelle == 'behoerde'" },
        { key: 'limit_behoerde', label: 'behördlicher Zielwert', type: 'number', required: true, min: 0, visible_when: "quelle == 'behoerde'" },
        { key: 'perzentil_behoerde', label: 'Perzentil % (Behörde)', type: 'number', min: 0, max: 100, visible_when: "quelle == 'behoerde'" },
        { key: 'limit', label: 'Zielwert', type: 'derived', expr: LIMIT_EXPR },
        { key: 'perzentil', label: 'Perzentil %', type: 'derived', expr: PERZENTIL_EXPR },
        { key: 'messwert', label: 'Ablaufwert', type: 'number', required: true, min: 0, aria_label: 'Konzentration im Ablauf der Desinfektionsanlage' },
        { key: 'ok', label: 'eingehalten', type: 'derived', expr: OK_EXPR, display: 'badge', value_labels: { '1': 'eingehalten', '0': 'überschritten' } },
      ],
      footer: ['leitorganismen_count', 'leitorganismen_verletzungen'],
      note: `${Q.L228} ${Q.L232} Perzentil-Einhaltung über eine Probenreihe ist nicht abgebildet (m205-F-1) — der Ablaufwert ist der zu bewertende Wert je Organismus.`,
    },
    verification_quote: `${Q.L228} — ${Q.L232} — ${T1_CAPTION} — ${T2_CAPTION} — ${T3_CAPTION}`,
    create: { section_code: 'C', label_de: 'Leitorganismen / Zielwerte (je Organismus: Zieltabelle, Zielwert, Perzentil, Ablaufwert)', data_type: 'json', unit: null, clause_reference: '§2.1, §3.2, §3.3, Tab. 1, Tab. 2, Tab. 3',
      description: 'Plan 3: eine Zeile je Leitorganismus — Zielwert aus Tab. 1 (Parameterzeile, G- oder I-Wert), Tab. 2 (Gewässerklasse × Parameter), Tab. 3 (Eignungsklasse × Parameter) oder behördlich; Zähler → leitorganismen_count / leitorganismen_verletzungen (M205-10-D1 / -D2). Ersatz der 14 Einzelgates CR-03/04/05/14/15/16/17 (+ -2) und der Ablaufskalare ist STAGED (m205-G-1 / D-1).' },
  }),
  WS10({
    symbol: 'leitorganismen_count', widget: 'derived', ui_config: null, verification_quote: Q.L228,
    create: { section_code: 'D', label_de: 'Anzahl der erfassten Leitorganismen', data_type: 'number', unit: null, clause_reference: '§2.1',
      description: 'Plan 3: Ausgabe der Gleichung M205-10-D2 (count_rows über leitorganismen).' },
  }),
  WS10({
    symbol: 'leitorganismen_verletzungen', widget: 'derived', ui_config: null, verification_quote: `${Q.L228} — ${Q.L224}`,
    create: { section_code: 'D', label_de: 'Leitorganismen mit überschrittenem Zielwert (Anzahl)', data_type: 'number', unit: null, clause_reference: '§2.1, Tab. 1, Tab. 2, Tab. 3',
      description: 'Plan 3: Ausgabe der Gleichung M205-10-D1 (count_rows über leitorganismen mit ok == 0); 0 = jeder erfasste Zielwert eingehalten. Ein Gate == 0 als Ersatz der 14 Tab.-2-Einzelgates ist STAGED (m205-G-1).' },
  }),
  WS10({
    symbol: 'uv_dosis_min', widget: 'lookup_fill', ui_config: { source_label: '§4.1.2.3' },
    lookup: { table_code: 'S4_1_2_3', role: 'limit', keys: [{ column: 'zielband', from_symbol: 'uv_dosis_zielband' }], value: 'dosis_min_j_m2' },
    verification_quote: `${Q.L488} — ${Q.L490}`,
    create: { section_code: 'B', label_de: 'UV-Mindestbestrahlung nach §4.1.2.3 für das Zielband (untere Grenze)', data_type: 'number', unit: 'J/m²', clause_reference: '§4.1.2.3',
      description: 'Plan 3: 300 J/m² (Mindestbestrahlung, 76/160/EWG) bzw. 400 J/m² (Unterschreitung der Leitwerte um eine Zehnerpotenz) aus dem Zielband; für tab2_ausgezeichnet druckt der Text keine Dosis (m205-E-2). Gate uv_dosis ≥ uv_dosis_min anstelle des Verbunds 300–700 (CR-07) ist STAGED (m205-G-5).' },
  }),
  WS10({
    symbol: 'uv_dosis_max', widget: 'lookup_fill', ui_config: { source_label: '§4.1.2.3' },
    lookup: { table_code: 'S4_1_2_3', role: 'limit', keys: [{ column: 'zielband', from_symbol: 'uv_dosis_zielband' }], value: 'dosis_max_j_m2' },
    verification_quote: `${Q.L488} — ${Q.L490}`,
    create: { section_code: 'B', label_de: 'UV-Bestrahlung nach §4.1.2.3 für das Zielband (obere Grenze der Schwankungsbreite, im Einzelfall)', data_type: 'number', unit: 'J/m²', clause_reference: '§4.1.2.3',
      description: 'Plan 3: 450 J/m² bzw. 700 J/m² ("im Einzelfall bis zu 700 J/m²"; die reguläre Obergrenze 600 J/m² steht in S4_1_2_3.dosis_max_regel_j_m2) — Orientierung, kein Gate.' },
  }),

  // ---- M205-11 UV-Bau: parallel channels / banks (§4.1.3.2 L548, §4.1.3.3 L590–L591) ----
  WS11({
    symbol: 'bestrahlungsgerinne', widget: 'register',
    ui_config: {
      title: 'Bestrahlungsgerinne / Banks', subtitle: '§4.1.3.2 — je Gerinne Bemessungsdurchfluss, UV-Sensoren, Zu-/Abschaltbarkeit', add_label: '+ Gerinne', placement: 'section',
      columns: [
        { key: 'label', label: 'Gerinne / Bank', type: 'text', required: true },
        { key: 'q_m3_h', label: 'Q', type: 'number', unit: 'm³/h', required: true, min: 0, aria_label: 'Bemessungsdurchfluss des Gerinnes' },
        { key: 'sensoren', label: 'UV-Sensoren', type: 'number', required: true, min: 1, aria_label: 'Anzahl UV-Sensoren je Bank' },
        { key: 'zuschaltbar', label: 'durchflussabhängig zu-/abgeschaltet', type: 'boolean' },
        // L590–L591: "mindestens ein UV-Sensor" je Bank; "mindestens zwei UV-Sensoren" when spaces are switched with the flow
        { key: 'sensoren_min', label: 'Sensoren mind.', type: 'derived', expr: 'if(zuschaltbar == true, 2, 1)' },
        { key: 'sensoren_ok', label: 'Sensoren ausreichend', type: 'derived', expr: 'if(sensoren >= sensoren_min, 1, 0)', display: 'badge', value_labels: { '1': 'ja', '0': 'nein' } },
      ],
      footer: ['gerinne_count', 'durchfluss_gerinne_sum', 'gerinne_sensor_verletzungen'],
      note: `${Q.L548} ${Q.L590}`,
    },
    verification_quote: `${Q.L548} — ${Q.L590}`,
    create: { section_code: 'C', label_de: 'Bestrahlungsgerinne / Banks (je Gerinne Q, UV-Sensoren, Zuschaltbarkeit)', data_type: 'json', unit: null, clause_reference: '§4.1.3.2, §4.1.3.3',
      description: 'Plan 3: Zeilen je Gerinne; Σ Q → durchfluss_gerinne_sum (M205-11-D1), Anzahl → gerinne_count (-D2), Sensorregel je Bank → gerinne_sensor_verletzungen (-D3). Der Abgleich Σ Q ≥ durchfluss_max und „> 1000 m³/h ⇒ mehrere Gerinne“ (CR-28) ist STAGED (m205-G-8; durchfluss_max ist auf M205-11 nicht verfügbar).' },
  }),
  WS11({ symbol: 'durchfluss_gerinne_sum', widget: 'derived', ui_config: null, verification_quote: Q.L548,
    create: { section_code: 'D', label_de: 'Summe der Gerinne-Durchflüsse', data_type: 'number', unit: 'm³/h', clause_reference: '§4.1.3.2', description: 'Plan 3: Ausgabe der Gleichung M205-11-D1 (sum_rows über bestrahlungsgerinne.q_m3_h).' } }),
  WS11({ symbol: 'gerinne_count', widget: 'derived', ui_config: null, verification_quote: Q.L548,
    create: { section_code: 'D', label_de: 'Anzahl der Bestrahlungsgerinne', data_type: 'number', unit: null, clause_reference: '§4.1.3.2', description: 'Plan 3: Ausgabe der Gleichung M205-11-D2 (count_rows über bestrahlungsgerinne); bei Durchflüssen über 1000 m³/h ist die Aufteilung auf parallele Gerinne zweckmäßig (Gate STAGED, m205-G-8).' } }),
  WS11({ symbol: 'gerinne_sensor_verletzungen', widget: 'derived', ui_config: null, verification_quote: Q.L590,
    create: { section_code: 'D', label_de: 'Gerinne mit zu wenigen UV-Sensoren (Anzahl)', data_type: 'number', unit: null, clause_reference: '§4.1.3.3', description: 'Plan 3: Ausgabe der Gleichung M205-11-D3 (count_rows über bestrahlungsgerinne mit sensoren_ok == 0): mindestens ein Sensor je Bank, mindestens zwei bei durchflussabhängig zu-/abgeschalteten Bestrahlungsräumen.' } }),

  // ---- M205-14 Membran: modules (§4.2.3.1 L748 / L750, Tab. 5) ----
  WS14({
    symbol: 'membranmodule', widget: 'register',
    ui_config: {
      title: 'Membranmodule / Filtrationseinheiten', subtitle: '§4.2.3.1 / Tab. 5 — je Einheit Verfahren, Porenweite, Membranfläche, Netto-Permeatfluss, Transmembrandruck', add_label: '+ Modul', placement: 'section',
      columns: [
        { key: 'label', label: 'Einheit', type: 'text', required: true },
        { key: 'verfahren', label: 'Verfahren', type: 'enum', options: ['mikrofiltration', 'ultrafiltration'], option_labels: { mikrofiltration: 'Mikrofiltration (MF)', ultrafiltration: 'Ultrafiltration (UF)' }, required: true },
        { key: 'porenweite_um', label: 'Porenweite', type: 'number', unit: 'µm', min: 0 },
        { key: 'flaeche_m2', label: 'Membranfläche', type: 'number', unit: 'm²', required: true, min: 0 },
        { key: 'netto_flux', label: 'Netto-Permeatfluss', type: 'number', unit: 'l/(m²·h)', required: true, min: 0 },
        { key: 'tmd', label: 'Transmembrandruck', type: 'number', unit: 'bar', min: 0 },
        { key: 'permeat_m3_h', label: 'Netto-Permeat', type: 'derived', expr: 'flaeche_m2 * netto_flux / 1000' },
      ],
      footer: ['membranflaeche_sum', 'permeat_design'],
      note: `${Q.L748} ${Q.L726}`,
    },
    verification_quote: `${Q.L748} — ${Q.L726}`,
    create: { section_code: 'C', label_de: 'Membranmodule / Filtrationseinheiten (je Einheit Fläche, Netto-Permeatfluss, Druck)', data_type: 'json', unit: null, clause_reference: '§4.2.2, §4.2.3.1, Tab. 5',
      description: 'Plan 3: Zeilen je Filtrationseinheit; Σ Fläche → membranflaeche_sum (M205-14-D1), Σ Fläche × Netto-Fluss → permeat_design in m³/h (-D2). Der Abgleich mit durchfluss_max (M205-08 → M205-14) ist STAGED (m205-G-10).' },
  }),
  WS14({ symbol: 'membranflaeche_sum', widget: 'derived', ui_config: null, verification_quote: Q.L748,
    create: { section_code: 'D', label_de: 'Gesamtmembranfläche', data_type: 'number', unit: 'm²', clause_reference: '§4.2.3.1, Tab. 5', description: 'Plan 3: Ausgabe der Gleichung M205-14-D1 (sum_rows über membranmodule.flaeche_m2); Tab. 5: 300 / 6.720 / 630 m².' } }),
  WS14({ symbol: 'permeat_design', widget: 'derived', ui_config: null, verification_quote: Q.L748,
    create: { section_code: 'D', label_de: 'Netto-Permeatvolumenstrom (Auslegung, Σ Fläche × Netto-Permeatfluss)', data_type: 'number', unit: 'm³/h', clause_reference: '§4.2.3.1, Tab. 5', description: 'Plan 3: Ausgabe der Gleichung M205-14-D2 (sum_rows über membranmodule, flaeche_m2 · netto_flux / 1000); Tab. 5 Straubing: 300 m² · 50 l/(m²·h) = 15 m³/h (168 m³/d bei 11,2 h Betrieb — Betriebszeit nicht gedruckt).' } }),

  // ---- M205-17 Ozon-Bemessung: generators, demand, ct target, energy factor (§4.3.2, §4.3.3.2, §4.3.3.3, §4.3.6) ----
  WS17({
    symbol: 'ozongeneratoren', widget: 'register',
    ui_config: {
      title: 'Ozongeneratoren', subtitle: '§4.3.3.2 — je Erzeuger Ozonleistung, Spannung, Frequenz', add_label: '+ Generator', placement: 'section',
      columns: [
        { key: 'label', label: 'Generator', type: 'text', required: true },
        { key: 'kapazitaet_kg_h', label: 'Ozonleistung', type: 'number', unit: 'kg/h', required: true, min: 0 },
        { key: 'spannung_kv', label: 'Spannung', type: 'number', unit: 'kV', min: 0 },
        { key: 'frequenz_hz', label: 'Frequenz', type: 'number', unit: 'Hz', min: 0 },
      ],
      footer: ['ozon_kapazitaet_sum'],
      note: Q.L899,
    },
    verification_quote: Q.L899,
    create: { section_code: 'C', label_de: 'Ozongeneratoren (je Erzeuger Ozonleistung kg/h, Spannung, Frequenz)', data_type: 'json', unit: null, clause_reference: '§4.3.3.2',
      description: 'Plan 3: Zeilen je Ozonerzeuger; Σ Ozonleistung → ozon_kapazitaet_sum (M205-17-D4); Abgleich mit ozonbedarf_kg_h ist STAGED (m205-G-11). Anlagen über 1 kg/h: ca. 10 kV, ca. 600 Hz (Orientierung).' },
  }),
  WS17({ symbol: 'ozon_kapazitaet_sum', widget: 'derived', ui_config: null, verification_quote: Q.L899,
    create: { section_code: 'D', label_de: 'Installierte Ozonleistung (Σ Generatoren)', data_type: 'number', unit: 'kg/h', clause_reference: '§4.3.3.2', description: 'Plan 3: Ausgabe der Gleichung M205-17-D4 (sum_rows über ozongeneratoren.kapazitaet_kg_h).' } }),
  WS17({ symbol: 'ozon_pro_doc_calc', widget: 'derived', ui_config: null, verification_quote: `${Q.L920} — ${Q.L947}`,
    create: { section_code: 'D', label_de: 'Spezifische Ozondosis je DOC (berechnet: Ozonkonzentration / DOC)', data_type: 'number', unit: 'mg O3/mg DOC', clause_reference: '§4.3.3.3, §4.3.6', description: 'Plan 3: Ausgabe der Gleichung M205-17-D1 (ozon_konz / doc, DOC aus M205-08); Orientierung 0,5–1 mg O3/mg DOC, Bromatminimierung < 0,8 mg/mg. Das Eingabefeld ozon_pro_doc und EQ-04 bleiben — Umstellung STAGED (m205-R-2).' } }),
  WS17({ symbol: 'ozonbedarf_kg_h', widget: 'derived', ui_config: null, verification_quote: `${Q.L920} — ${Q.L899}`,
    create: { section_code: 'D', label_de: 'Ozonbedarf (Ozonkonzentration × maximaler Zufluss)', data_type: 'number', unit: 'kg/h', clause_reference: '§4.3.3.2, §4.3.3.3', description: 'Plan 3: Ausgabe der Gleichung M205-17-D2 (ozon_konz [mg/l] · durchfluss_max [m³/h] / 1000; durchfluss_max aus M205-08).' } }),
  WS17({ symbol: 'o2_bedarf_kg_h', widget: 'derived', ui_config: null, verification_quote: Q.L899,
    create: { section_code: 'D', label_de: 'Sauerstoffbedarf der Ozonerzeugung (etwa 10 kg O2 je kg O3, Reinsauerstoff)', data_type: 'number', unit: 'kg/h', clause_reference: '§4.3.3.2', description: 'Plan 3: Ausgabe der Gleichung M205-17-D3 (ozonbedarf_kg_h · S4_3_3_2.o2_pro_o3_kg für das Einsatzgas); für Luft druckt der Text keinen Sauerstofffaktor — kein Wert.' } }),
  WS17({
    symbol: 'ct_ecoli_basis', widget: 'scalar', ui_config: null, verification_quote: Q.L868,
    create: { section_code: 'B', label_de: 'ct-Wert für Escherichia coli (Basis, 99 % Reduktion; aus Vorversuchen / DVGW W 225)', data_type: 'number', unit: 'mg·min/l', clause_reference: '§4.3.2',
      description: 'Plan 3: Eingabe des experimentell bestimmten ct-Werts für E. coli; ct_ziel (M205-17-D5) multipliziert ihn für Cryptosporidien-Oozysten mit 500 („um ca. das Fünfhundertfache“).' },
  }),
  WS17({ symbol: 'ct_ziel', widget: 'derived', ui_config: null, verification_quote: Q.L868,
    create: { section_code: 'D', label_de: 'ct-Zielwert für den Zielorganismus (Cryptosporidien: 500 × E. coli)', data_type: 'number', unit: 'mg·min/l', clause_reference: '§4.3.2', description: 'Plan 3: Ausgabe der Gleichung M205-17-D5 — if(ct_wert_zielorganismus == cryptosporidien, ct_ecoli_basis · 500, ct_ecoli_basis); Abgleich ct_wert ≥ ct_ziel ist STAGED (m205-G-12).' } }),
  WS17({
    symbol: 'spez_energie_ozon_tab', widget: 'lookup_fill', ui_config: { source_label: '§4.3.3.2' },
    lookup: { table_code: 'S4_3_3_2', role: 'value', keys: [{ column: 'einsatzgas', from_symbol: 'ozon_einsatzgas' }], value: 'spez_energie_kwh_kg' },
    verification_quote: Q.L899,
    create: { section_code: 'B', label_de: 'Spezifischer Energieverbrauch der Ozonerzeugung nach Einsatzgas (§4.3.3.2)', data_type: 'number', unit: 'kWh/kg O3', clause_reference: '§4.3.3.2',
      description: 'Plan 3: etwa 10 kWh/kg Ozon aus Reinsauerstoff, bei Luft ca. 60 % mehr (16 kWh/kg — Rechenwert aus dem Text, m205-J-3); das Eingabefeld spez_energie_ozon (M205-07 / -19, EQ-05 = 10) bleibt — Umstellung STAGED (m205-R-1 / E-3).' },
  }),

  // ---- M205-18 Restozonentfernung (§4.3.3.4 L931): thermisch 350 °C / ≥ 2 s vs katalytisch 60–80 °C ----
  WS18({
    symbol: 'temperatur_ozonentfernung_min', widget: 'lookup_fill', ui_config: { source_label: '§4.3.3.4' },
    lookup: { table_code: 'S4_3_3_4', role: 'limit', keys: [{ column: 'verbrennung_typ', from_symbol: 'verbrennung_typ' }], value: 'temp_min_c' },
    verification_quote: Q.L931,
    create: { section_code: 'B', label_de: 'Mindesttemperatur der Restozonentfernung nach §4.3.3.4 (thermisch 350 °C / katalytisch 60 °C)', data_type: 'number', unit: '°C', clause_reference: '§4.3.3.4',
      description: 'Plan 3: aus dem Vernichtungsverfahren gefüllt (locked); CR-26 prüft heute „≥ 350 OR katalytisch“ — Gate temperatur_ozonentfernung ≥ Mindesttemperatur je Verfahren ist STAGED (m205-G-13).' },
  }),
  WS18({
    symbol: 'temperatur_ozonentfernung_max', widget: 'lookup_fill', ui_config: { source_label: '§4.3.3.4' },
    lookup: { table_code: 'S4_3_3_4', role: 'limit', keys: [{ column: 'verbrennung_typ', from_symbol: 'verbrennung_typ' }], value: 'temp_max_c' },
    visible_when: KATALYTISCH, // only the catalytic row prints an upper temperature
    verification_quote: Q.L931,
    create: { section_code: 'B', label_de: 'Höchsttemperatur der katalytischen Restozonentfernung nach §4.3.3.4 (80 °C)', data_type: 'number', unit: '°C', clause_reference: '§4.3.3.4',
      description: 'Plan 3: „katalytisch (bei 60 °C bis 80 °C)“ — obere Grenze; für die thermische Vernichtung ist keine Obergrenze gedruckt (Feld ausgeblendet).' },
  }),
  WS18({
    symbol: 'verbrennung_haltezeit_min', widget: 'lookup_fill', ui_config: { source_label: '§4.3.3.4' },
    lookup: { table_code: 'S4_3_3_4', role: 'limit', keys: [{ column: 'verbrennung_typ', from_symbol: 'verbrennung_typ' }], value: 'haltezeit_min_s' },
    visible_when: THERMISCH,
    verification_quote: Q.L931,
    create: { section_code: 'B', label_de: 'Mindest-Haltezeit der thermischen Restozonentfernung nach §4.3.3.4 (2 s)', data_type: 'number', unit: 's', clause_reference: '§4.3.3.4',
      description: 'Plan 3: „Erhitzen auf 350 °C über mindestens 2 Sekunden“; Gate verbrennung_haltezeit_s ≥ 2 s bei thermischer Vernichtung ist STAGED (m205-G-13).' },
  }),
  WS18({ symbol: 'verbrennung_haltezeit_s', widget: 'scalar', ui_config: null, visible_when: THERMISCH, verification_quote: Q.L931 }),

  // ---- M205-21 Chlorung (§4.4.2): agents register + agent-specific inputs ----
  WS21({
    symbol: 'chlorungsmittel', widget: 'register',
    ui_config: {
      title: 'Chlorungsmittel', subtitle: '§4.4.2 — je eingesetztem Mittel Dosis, Kontaktzeit und Restchlor gegen die gedruckten Bereiche', add_label: '+ Mittel', placement: 'section',
      columns: [
        { key: 'mittel', label: 'Mittel', type: 'enum', options: ['chlorgas', 'natriumhypochlorit', 'chlordioxid'], option_labels: { chlorgas: 'Chlorgas (Cl₂)', natriumhypochlorit: 'Natriumhypochlorit (NaOCl)', chlordioxid: 'Chlordioxid (ClO₂)' }, required: true, discriminator: true },
        { key: 'dosis', label: 'Dosis', type: 'number', required: true, min: 0, aria_label: 'Dosis (mg/l freies Chlor bzw. g/m³ Chlordioxid)' },
        { key: 'dosis_unit', label: 'Einheit', type: 'derived', expr: "lookup('S4_4_2', mittel, 'dosis_unit')" },
        { key: 'dosis_min', label: 'Dosis min (§4.4.2)', type: 'derived', expr: "lookup('S4_4_2', mittel, 'dosis_min')" },
        { key: 'dosis_max', label: 'Dosis max (§4.4.2)', type: 'derived', expr: "lookup('S4_4_2', mittel, 'dosis_max')" },
        { key: 'dosis_ok', label: 'Dosis im Bereich', type: 'derived', expr: 'if(dosis >= dosis_min AND dosis <= dosis_max, 1, 0)', display: 'badge', value_labels: { '1': 'ja', '0': 'nein' } },
        { key: 'kontaktzeit_ist', label: 'Kontaktzeit', type: 'number', unit: 'min', min: 0 },
        { key: 'kontaktzeit_text', label: 'Kontaktzeit (§4.4.2)', type: 'derived', expr: "lookup('S4_4_2', mittel, 'kontaktzeit_text')" },
        { key: 'restchlor', label: 'Restchlor (freies Chlor)', type: 'number', unit: 'mg/l', min: 0, visible_when: "mittel != 'chlordioxid'" },
      ],
      footer: ['chlordosis_verletzungen'],
      note: `${Q.L973} ${Q.L984}`,
    },
    verification_quote: `${Q.L973} — ${Q.L984}`,
    create: { section_code: 'C', label_de: 'Chlorungsmittel (je Mittel Dosis, Kontaktzeit, Restchlor gegen §4.4.2)', data_type: 'json', unit: null, clause_reference: '§4.4.2',
      description: 'Plan 3: Zeilen je eingesetztem Chlorungsmittel mit den gedruckten Bereichen (Chlorgas / Hypochlorit 1–20 mg/l freies Chlor, 15–30 min; Chlordioxid 5–10 g/m³, sandfiltriert 1–5 g/m³, wenige Minuten); Zähler → chlordosis_verletzungen (M205-21-D1). Die Einzelskalare bleiben; Umstellung der Gates CR-11/22/23/24 ist STAGED (m205-G-2).' },
  }),
  WS21({ symbol: 'chlordosis_verletzungen', widget: 'derived', ui_config: null, verification_quote: `${Q.L973} — ${Q.L984}`,
    create: { section_code: 'D', label_de: 'Chlorungsmittel mit Dosis außerhalb des §4.4.2-Bereichs (Anzahl)', data_type: 'number', unit: null, clause_reference: '§4.4.2', description: 'Plan 3: Ausgabe der Gleichung M205-21-D1 (count_rows über chlorungsmittel mit dosis_ok == 0).' } }),
  WS21({ symbol: 'clo2_konzentration', widget: 'scalar', ui_config: null, visible_when: CLO2, verification_quote: Q.L984 }),
  ...(['chlor_kontaktzeit', 'chlor_ph', 'restchlor_betrieb'] as const).map((symbol) => WS21({ symbol, widget: 'scalar', ui_config: null, visible_when: NICHT_CLO2, verification_quote: `${Q.L973} — ${Q.L981_982}` })),

  // ---- M205-24 Betrieb: microbiological samples before / after the stage → log reduction (§2.1 L224, §4.1.4.2 L640) ----
  WS24({
    symbol: 'proben_desinfektion', widget: 'register',
    ui_config: {
      title: 'Mikrobiologische Proben (Zulauf / Ablauf der Desinfektionsstufe)', subtitle: '§2.1 / §4.1.4.2 — je Probe Datum, Organismus, Konzentration vor und nach der Desinfektion → Log-Reduktion', add_label: '+ Probe', placement: 'section',
      columns: [
        { key: 'datum', label: 'Datum', type: 'date', required: true },
        { key: 'organismus', label: 'Leitorganismus', type: 'text', required: true, datalist: ['Escherichia coli', 'Intestinale Enterokokken', 'Gesamtcoliforme Bakterien', 'Fäkalcoliforme Bakterien', 'Fäkalstreptokokken', 'Salmonellen', 'Darmviren'] },
        { key: 'c_in', label: 'c vor Desinfektion', type: 'number', required: true, min: 0, aria_label: 'Konzentration im Zulauf unmittelbar vor der Desinfektionsanlage' },
        { key: 'c_out', label: 'c nach Desinfektion', type: 'number', required: true, min: 0, aria_label: 'Konzentration nach der Desinfektionsanlage' },
        { key: 'log_red', label: 'Log-Reduktion', type: 'derived', expr: 'log10(c_in / c_out)' },
        { key: 'limit', label: 'Zielwert', type: 'number', min: 0 },
        { key: 'ok', label: 'Zielwert eingehalten', type: 'derived', expr: 'if(c_out <= limit, 1, 0)', display: 'badge', value_labels: { '1': 'ja', '0': 'nein' } },
      ],
      footer: ['proben_count', 'log_reduktion_mean', 'log_reduktion_min'],
      note: `${Q.L224} c nach Desinfektion = 0 („nicht nachweisbar“) ist als Log-Reduktion nicht definiert — die Nachweisgrenze eintragen. ${Q.L640}`,
    },
    verification_quote: `${Q.L224} — ${Q.L640}`,
    create: { section_code: 'C', label_de: 'Mikrobiologische Proben vor / nach der Desinfektionsstufe (je Probe c_in, c_out → Log-Reduktion)', data_type: 'json', unit: null, clause_reference: '§2.1, §4.1.4.2',
      description: 'Plan 3: Zeilen je Probe; Mittel / Minimum der Log-Reduktion → log_reduktion_mean / log_reduktion_min (M205-24-D1 / -D2), Anzahl → proben_count (-D3). Die Perzentil-Einhaltungsregel (Tab. 1 / 2) ist nicht gedruckt (m205-F-1); das Eingabefeld log_reduktion (M205-10 / -25, CR-20) bleibt (m205-G-3).' },
  }),
  WS24({ symbol: 'proben_count', widget: 'derived', ui_config: null, verification_quote: Q.L640,
    create: { section_code: 'D', label_de: 'Anzahl der mikrobiologischen Proben', data_type: 'number', unit: null, clause_reference: '§4.1.4.2', description: 'Plan 3: Ausgabe der Gleichung M205-24-D3 (count_rows über proben_desinfektion); monatliche Nachweise sind in der Regel ausreichend.' } }),
  WS24({ symbol: 'log_reduktion_mean', widget: 'derived', ui_config: null, verification_quote: Q.L224,
    create: { section_code: 'D', label_de: 'Log-Reduktion (Mittel der Proben)', data_type: 'number', unit: 'log10', clause_reference: '§2.1', description: 'Plan 3: Ausgabe der Gleichung M205-24-D1 (mean_rows über proben_desinfektion.log_red, Proben mit c_out > 0); die statistische Einhaltungsregel ist Sache der Behörde (§2.1, m205-F-1).' } }),
  WS24({ symbol: 'log_reduktion_min', widget: 'derived', ui_config: null, verification_quote: Q.L224,
    create: { section_code: 'D', label_de: 'Log-Reduktion (Minimum der Proben)', data_type: 'number', unit: 'log10', clause_reference: '§2.1', description: 'Plan 3: Ausgabe der Gleichung M205-24-D2 (min_rows über proben_desinfektion.log_red, Proben mit c_out > 0).' } }),
];

/**
 * No section rules: `verfahren` (M205-09) has no consumer and every field-bearing section B / D of M205-10 … -23 holds a
 * consumed producer (strahlertyp, uv_dosis, gerinne_abdeckung_lichtdicht, brutto_permeatfluss, ozon_aufenthaltszeit,
 * verbrennung_typ, clo2_dosis, kontaktzeit_pes, h2o2_dosis, …) — the transitive guard refuses each; the field-free
 * sections A / C / F / J / K / L / M would be inert rules. Both are m205-C-1 / C-2 (STAGED with the consumer edits).
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
