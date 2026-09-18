/**
 * DWA-M-187 — Plan 3 Task 12 field configs (the `sonderanwendung` / variant
 * limit fills, the Bild-3 layer register, the segment / Teilfilterbecken /
 * Sorptionsstufen / Klein-RBF element / Indikatororganismen registers, the
 * "Daten vorhanden?" switch, the Stoffstromtrennung attestation, visibility) as
 * DATA for `scripts/regulation-tables/emit-field-configs-sql.ts m187`.
 *
 * Every `verification_quote` is lifted verbatim from the transcript
 * `Desktop\Guidelines\DWA-M-187\DWA-M_187_GD.md` (the `Q` spans of the seed
 * module, line in the key). Prod facts come from the captured `m187.prior.json`
 * (2026-09-18, read-only): every worksheet carries the same nine flat sections
 * A Zweck und Kontext · B Eingangsdaten · C Arbeitsblattspezifischer Teil ·
 * D Ergebnisse / Berechnete Werte · F · J · K · L · M — fields live in B and D only
 * (75 of 139 are orphans). Registers are created in C, their outputs in D,
 * fills / selects / attestations in B.
 *
 * Placement rules applied (a fill sits on the worksheet of its KEY symbol, a262e trap 1):
 *   - `sonderanwendung` (M187-01) is inherited on M187-06 / -11 / -16 / -20 / -22 ONLY
 *     (capture) — so the branch switch reaches five worksheets; every other
 *     worksheet needs the consumer edit m187-C-1 first (STAGED).
 *   - `verfahrensvariante_p` lives on M187-05 (→ -07 / -08 / -09) and on M187-06
 *     (→ -07 / -08 / -09): the P fills sit on M187-06 (its own copy + inherited
 *     `sonderanwendung`), the P-c register on M187-09 (inherited driver + EBCT /
 *     v_filter_aufstrom own).
 *   - `verfahrensvariante_spurenstoffe` lives on M187-11 (→ -12 … -15) and M187-06:
 *     the Spurenstoff fills sit on M187-11 (q_Dr_RBF is inherited there from -12),
 *     the Bild-3 register on M187-13 (the GAK scalars' home), the segment register
 *     on M187-14 (Q_T_d_aM own).
 *   - Mikroorganismen fills sit on M187-16 (inherited `sonderanwendung`, `q_Dr_RBF`
 *     from -12, `h_FK` from -08); the UV fill on M187-18 beside `uv_eingesetzt`.
 *   - Prod marks almost every existing field as consumed — mostly by its OWN
 *     worksheet (`consumer_worksheets = ['<own code>']`, an import artefact,
 *     m187-X-3) — so a `visible_when` UPDATE is possible on the few consumer-free
 *     inputs only (M187-07 `pufferschicht_carbonatbrechsand` / `betriebsdauer_jahre`,
 *     M187-09 `anzahl_sorptionsstufen`); every other branch rule is on CREATED
 *     fields, and every section rule is refused (consumed producers in every
 *     field-bearing B / D section) → m187-C-2 (STAGED).
 *
 * NOT here (each a sign-off block; STAGED SQL in scripts/verification/m187-STAGED-plan3-rulings.sql):
 *   the variant gates replacing REQ-02 / -03 / -04 (G-1), REQ-05's either/or (G-2), the
 *   Stoffstromtrennung gate (G-3), Gehölze / Schilf (G-4), Teileinstau (G-5), REQ-06 vs
 *   Gl. 2 (G-6), the UV gate (G-7), hiding any consumed field (C-3 … C-5), Gl. 1 / Gl. 2
 *   on M187-09 (R-1), the register ↔ scalar pairs (D-1 … D-7).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q, TAB3_KRITERIEN } from '../regulation-tables-seed-m187';

const STD = 'DWA-M-187';
const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS06 = on('M187-06');
const WS07 = on('M187-07');
const WS09 = on('M187-09');
const WS11 = on('M187-11');
const WS13 = on('M187-13');
const WS14 = on('M187-14');
const WS16 = on('M187-16');
const WS18 = on('M187-18');
const WS19 = on('M187-19');
const WS20 = on('M187-20');
const WS22 = on('M187-22');

// ---- drivers (prod enum tokens, capture 2026-09-18) ----
export const P_A = "verfahrensvariante_p == 'faellung_filterzulauf'";
export const P_B = "verfahrensvariante_p == 'melioration_filtermaterial'";
export const P_C = "verfahrensvariante_p == 'nachgeschaltete_sorptionsstufe'";
export const SPUR_BC = 'verfahrensvariante_spurenstoffe IN {gak, mitbehandlung_ka}';
export const SPUR_NOT_D = "verfahrensvariante_spurenstoffe != 'nachgeschaltete_stufe'";
export const SPUR_C = "verfahrensvariante_spurenstoffe == 'mitbehandlung_ka'";
export const MIKRO = "sonderanwendung == 'mikroorganismen'";
export const UV_JA = "uv_eingesetzt == 'ja'";
export const CSB_HOCH = 'CSB_konzentration > 3000';
export const DATEN_JA = "daten_vorhanden == 'ja'";
export const DATEN_NEIN = "daten_vorhanden == 'nein'";

// ---- register row expressions ----
/** Bild 3: a layer with a printed GAK band is ok inside it; layers without a band (rows 2 / 4) are ok by construction. */
export const GAK_OK_EXPR = 'if(gak_min IS NULL, 1, if(gak_vol_pct >= gak_min AND gak_vol_pct <= gak_max, 1, 0))';
/** §5.1.3.1 c) L497: EBCT ≥ 15 min and v < 5,0 m/h ⇒ h_FK,SS = EBCT · v / 60 ("Das entspricht einer Mindesthöhe des Filterkörpers von 1,25 m"). */
export const H_FK_SS_ROW_EXPR = 'ebct_min * v_filter_auf / 60';
export const EBCT_OK_EXPR = "if(ebct_min >= lookup('S5_1_3_1_P', 'nachgeschaltete_sorptionsstufe', 'ebct_min_min', 'wert'), 1, 0)";
export const V_AUF_OK_EXPR = "if(v_filter_auf < lookup('S5_1_3_1_P', 'nachgeschaltete_sorptionsstufe', 'v_filter_auf_max', 'wert'), 1, 0)";
/** §5.2.3.1 c) L603: the segment retention volume is sized on Q_T,d,aM (l/s → m³/d: · 86,4) — Q_T_d_aM is a worksheet symbol on M187-14 (G-13). */
export const V_SOLL_ROW_EXPR = 'Q_T_d_aM * 86.4';
export const V_OK_EXPR = 'if(retentionsvolumen_m3 >= v_soll_m3, 1, 0)';
/** §5.4.3 L794: 6 l/(m²·min) and 20 l/m² "bezogen auf die jeweils beschickte Filterfläche" — per Teilfilterbecken. */
export const FOERDER_MIN_EXPR = "flaeche_m2 * lookup('S5_4_3_ORG', 'foerderleistung', 'wert')";
export const BESCHICKUNG_SOLL_EXPR = "flaeche_m2 * lookup('S5_4_3_ORG', 'beschickung_pro_ereignis', 'wert')";
/** §5.5.4 L964: A_F / A_b,a in % per element; "A_F ≥ 1,0 m² nicht unterschritten werden" (sollte). */
export const ANTEIL_EXPR = 'a_f_m2 * 100 / a_b_a_m2';
export const A_F_ELEMENT_OK_EXPR = "if(a_f_m2 >= lookup('S5_5_KLEIN', 'a_f_element_min_m2', 'wert'), 1, 0)";
/** §5.3.2 L667: "im Mittel 90 % (1,0 Log-Stufe)" — Log-Stufen = log10(Zulauf / Ablauf). */
export const LOG_RED_EXPR = 'log10(zulauf / ablauf)';
/** §5.3.3.1 L677: "Um einen Indikatororganismenrückhalt > 1,0 Log-Stufe (> 90 %) zu erreichen" — the printed target per row. */
export const LOG_OK_EXPR = 'if(log_red > 1.0, 1, 0)';

const B3_CAPTION = 'Bild 3: Empfohlener Filteraufbau für Filter zur Spurenstoffelimination'; // L621
for (const c of [B3_CAPTION]) if (!Q.L621.includes(c)) throw new Error(`caption fragment not in the printed span: ${c}`);

/** Tab. 3 text fills on M187-06 (beside `verfahrensvariante_p`): the printed qualitative cell of the chosen variant. */
export const TAB3_FILL_SYMBOLS = TAB3_KRITERIEN.map((k) => `tab3_${k.col}`);

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- M187-06 P-Rückhalt Übersicht: the b) h_FK limit + Tab. 3 per variant (sonderanwendung + verfahrensvariante_p in scope) ----
  WS06({
    symbol: 'h_FK_min_p', widget: 'lookup_fill', ui_config: { source_label: '§5.1.3.2 b)' },
    lookup: { table_code: 'S5_LIMITS_P', role: 'limit', keys: [{ column: 'variante_p', from_symbol: 'verfahrensvariante_p' }], value: 'h_fk_min_m' },
    visible_when: P_B, // a) / c) print "keine Änderungen zu Arbeitsblatt DWA-A 178:2019" (L488 / L496) — no own limit, the fill would show "—"
    verification_quote: `${Q.L514} — ${Q.L488}`,
    create: { section_code: 'B', label_de: 'Mindesthöhe des Filterkörpers nach §5.1.3.2 b) Melioration (h_FK ≥ 1,00 m)', data_type: 'number', unit: 'm', clause_reference: '§5.1.3.2 b)',
      description: 'Plan 3: aus S5_LIMITS_P für die gewählte Verfahrensvariante gefüllt (nur b) druckt eine eigene Höhe; a) / c): keine Änderungen zu DWA-A 178). Gate h_FK ≥ h_FK_min_p anstelle des unbedingten REQ-02 (h_FK >= 1.0 auf M187-05) ist STAGED (m187-G-1).' },
  }),
  ...TAB3_KRITERIEN.map((k) => WS06({
    symbol: `tab3_${k.col}`, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 3' },
    lookup: { table_code: 'TABELLE3', role: 'value', keys: [{ column: 'variante_p', from_symbol: 'verfahrensvariante_p' }], value: k.col },
    verification_quote: `${Q.T3_L467} — ${Q.L568}`,
    create: { section_code: 'B', label_de: `Tab. 3 — ${k.label_de}`, data_type: 'text', unit: null, clause_reference: '§5.1.2, Tab. 3',
      description: `Plan 3: die gedruckte Tab.-3-Zelle „${k.label_de}“ der gewählten Verfahrensvariante (qualitativ, Anwendungsgrenzen nach §5.1.5).` },
  })),

  // ---- M187-07 P-Rückhalt Variante a: the two consumer-free a)-only inputs (L505 Pufferschicht, L554 Dosierstart) ----
  WS07({ symbol: 'pufferschicht_carbonatbrechsand', widget: 'scalar', ui_config: null, visible_when: P_A, verification_quote: Q.L505 }),
  WS07({ symbol: 'betriebsdauer_jahre', widget: 'scalar', ui_config: null, visible_when: P_A, verification_quote: Q.L554 }),

  // ---- M187-09 P-Rückhalt Variante c: Sorptionsstufen in Reihe (§5.1.3.1 c) L497 / L499) ----
  WS09({ symbol: 'anzahl_sorptionsstufen', widget: 'scalar', ui_config: null, visible_when: P_C, verification_quote: Q.L499 }),
  WS09({
    symbol: 'sorptionsstufen', widget: 'register',
    ui_config: {
      title: 'Sorptionsstufen (Reihenschaltung)', subtitle: '§5.1.3.1 c) — je Stufe EBCT, Filtergeschwindigkeiten und die daraus folgende Filterkörperhöhe', add_label: '+ Sorptionsstufe', placement: 'section',
      columns: [
        { key: 'stufe', label: 'Stufe', type: 'number', required: true, min: 1 },
        { key: 'ebct_min', label: 'EBCT', type: 'number', unit: 'min', required: true, min: 0, aria_label: 'Filterkontaktzeit (Empty Bed Contact Time) der Stufe' },
        { key: 'v_filter_auf', label: 'v Aufstrom', type: 'number', unit: 'm/h', required: true, min: 0, aria_label: 'maximale Filtergeschwindigkeit im Aufstrombetrieb' },
        { key: 'v_filter_ab', label: 'v Abstrom', type: 'number', unit: 'm/h', min: 0, aria_label: 'Filtergeschwindigkeit im Abstrombetrieb' },
        { key: 'h_fk_ss', label: 'h_FK,SS = EBCT · v / 60', type: 'derived', expr: H_FK_SS_ROW_EXPR },
        { key: 'ebct_ok', label: 'EBCT ≥ 15 min', type: 'derived', expr: EBCT_OK_EXPR, display: 'badge', value_labels: { '1': 'ja', '0': 'nein' } },
        { key: 'v_ok', label: 'v < 5,0 m/h', type: 'derived', expr: V_AUF_OK_EXPR, display: 'badge', value_labels: { '1': 'ja', '0': 'nein' } },
      ],
      footer: ['sorptionsstufen_count', 'ebct_min_stufe'],
      note: `${Q.L497} ${Q.L499} Die Einzelwerte EBCT / v_filter_aufstrom / v_filter_abstrom / h_FK_SS / anzahl_sorptionsstufen dieses Arbeitsblatts bleiben bis m187-D-3 / D-4.`,
    },
    visible_when: P_C,
    verification_quote: `${Q.L497} — ${Q.L499}`,
    create: { section_code: 'C', label_de: 'Sorptionsstufen in Reihe (je Stufe EBCT, v Aufstrom / Abstrom → h_FK,SS)', data_type: 'json', unit: null, clause_reference: '§5.1.3.1 c)',
      description: 'Plan 3: Zeilen je Sorptionsstufe; Anzahl → sorptionsstufen_count (M187-09-D2), kleinste EBCT → ebct_min_stufe (-D3); je Zeile h_FK,SS = EBCT · v / 60 (15 min · 5,0 m/h = 1,25 m, L497). Die Einzelskalare EBCT / v_filter_* / h_FK_SS (an M187-06 übergeben) und anzahl_sorptionsstufen sind Ablösekandidaten (m187-D-3 / D-4).' },
  }),
  WS09({ symbol: 'sorptionsstufen_count', widget: 'derived', ui_config: null, visible_when: P_C, verification_quote: Q.L499,
    create: { section_code: 'D', label_de: 'Anzahl der Sorptionsstufen (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§5.1.3.1 c)', description: 'Plan 3: Ausgabe der Gleichung M187-09-D2 (count_rows über sorptionsstufen); „Reihenschaltung von mindestens zwei Sorptionsstufen empfohlen“ (L499) — Gate ≥ 2 ist STAGED (m187-G-8).' } }),
  WS09({ symbol: 'ebct_min_stufe', widget: 'derived', ui_config: null, visible_when: P_C, verification_quote: Q.L497,
    create: { section_code: 'D', label_de: 'kleinste Filterkontaktzeit EBCT einer Stufe', data_type: 'number', unit: 'min', clause_reference: '§5.1.3.1 c)', description: 'Plan 3: Ausgabe der Gleichung M187-09-D3 (min_rows über sorptionsstufen.ebct_min).' } }),
  WS09({ symbol: 'h_FK_SS_calc', widget: 'derived', ui_config: null, visible_when: P_C, verification_quote: Q.L497,
    create: { section_code: 'D', label_de: 'Mindesthöhe des Filterkörpers der Sorptionsstufe aus EBCT und Filtergeschwindigkeit (berechnet)', data_type: 'number', unit: 'm', clause_reference: '§5.1.3.1 c)', description: 'Plan 3: Ausgabe der Gleichung M187-09-D1 (EBCT · v_filter_aufstrom / 60; 15 min · 5,0 m/h = 1,25 m — „Das entspricht einer Mindesthöhe des Filterkörpers von 1,25 m“, L497). Das Eingabefeld h_FK_SS (VR ≥ 1.25) bleibt (m187-D-4).' } }),

  // ---- M187-11 Spurenstoffe Übersicht: the per-variant limits (verfahrensvariante_spurenstoffe own, q_Dr_RBF inherited from -12) ----
  WS11({
    symbol: 'h_FK_min_spur', widget: 'lookup_fill', ui_config: { source_label: '§5.2.3.1' },
    lookup: { table_code: 'S5_LIMITS_SPUR', role: 'limit', keys: [{ column: 'variante_spur', from_symbol: 'verfahrensvariante_spurenstoffe' }], value: 'h_fk_min_m' },
    visible_when: SPUR_BC, // only b) "Filterschichtstärke von 1 m" (L601) and c) "h_FK ≥ 1 m" (L603) print a height
    verification_quote: `${Q.L601} — ${Q.L603}`,
    create: { section_code: 'B', label_de: 'Filterkörperhöhe nach §5.2.3.1 für die Verfahrensvariante (b: 1 m; c: h_FK ≥ 1 m)', data_type: 'number', unit: 'm', clause_reference: '§5.2.3.1 b) / c)',
      description: 'Plan 3: aus S5_LIMITS_SPUR gefüllt; a) / d) drucken keine Höhe (Feld ausgeblendet). Gate h_FK ≥ h_FK_min_spur anstelle des unbedingten REQ-04-Anteils „h_FK >= 1.0“ (M187-06 / -07) ist STAGED (m187-G-1).' },
  }),
  WS11({
    symbol: 'q_Dr_RBF_limit_spur', widget: 'lookup_fill', ui_config: { source_label: '§5.2.3.1' },
    lookup: { table_code: 'S5_LIMITS_SPUR', role: 'limit', keys: [{ column: 'variante_spur', from_symbol: 'verfahrensvariante_spurenstoffe' }], value: 'q_dr_rbf' },
    visible_when: SPUR_NOT_D, // d) "können bisher keine allgemein gültigen Bemessungsvorgaben empfohlen werden" (L605)
    verification_quote: `${Q.L599} — ${Q.L601} — ${Q.L603}`,
    create: { section_code: 'B', label_de: 'Drosselabflussspende nach §5.2.3.1 für die Verfahrensvariante (a: auf 0,01; b / c: ≤ 0,03 l/(s·m²))', data_type: 'number', unit: 'l/(s·m²)', clause_reference: '§5.2.3.1',
      description: 'Plan 3: aus S5_LIMITS_SPUR gefüllt (a) „Begrenzung … auf 0,01“ ohne gedruckten Operator, m187-J-2; b) / c) „≤ 0,03“). Gates q_Dr_RBF ≤ q_Dr_RBF_limit_spur anstelle der sich widersprechenden REQ-03 (≤ 0,03) / REQ-04 (== 0,01) sind STAGED (m187-G-1).' },
  }),
  WS11({
    symbol: 'q_Dr_RBF_vorgabe_spur', widget: 'lookup_fill', ui_config: { source_label: '§5.2.3.1' },
    lookup: { table_code: 'S5_LIMITS_SPUR', role: 'value', keys: [{ column: 'variante_spur', from_symbol: 'verfahrensvariante_spurenstoffe' }], value: 'q_dr_text' },
    visible_when: SPUR_NOT_D,
    verification_quote: `${Q.L599} — ${Q.L601} — ${Q.L603}`,
    create: { section_code: 'B', label_de: 'Drosselabflussspende — gedruckte Vorgabe (§5.2.3.1, Wortlaut)', data_type: 'text', unit: null, clause_reference: '§5.2.3.1',
      description: 'Plan 3: der gedruckte Satzteil zur Drosselabflussspende der gewählten Verfahrensvariante (zeigt den Operator „auf“ bzw. „≤“ so, wie er gedruckt ist).' },
  }),

  // ---- M187-13 Spurenstoffe Variante b (GAK): the Bild-3 layer stack (also the c) filter build-up, L621) ----
  WS13({
    symbol: 'filterschichten', widget: 'register',
    ui_config: {
      title: 'Filteraufbau nach Bild 3 (Filterschichten)', subtitle: 'Bild 3 — je Lage Soll-Stärke, GAK-Volumenanteil und CaCO3-Massenanteil; die Ist-Stärken summieren sich zu h_FK', add_label: '+ Lage', placement: 'section',
      columns: [
        { key: 'lage', label: 'Lage (Bild 3)', type: 'lookup_key', lookup: { table_code: 'BILD3' }, required: true },
        { key: 'material', label: 'Material', type: 'lookup_value', lookup: { table_code: 'BILD3', key_column: 'lage', value: 'material' } },
        { key: 'dicke_soll_cm', label: 'Stärke Bild 3', type: 'lookup_value', lookup: { table_code: 'BILD3', key_column: 'lage', value: 'dicke_cm' } },
        { key: 'dicke_ist_cm', label: 'Stärke geplant', type: 'number', unit: 'cm', required: true, min: 0, aria_label: 'geplante Schichtstärke in cm' },
        { key: 'gak_min', label: 'GAK min', type: 'lookup_value', lookup: { table_code: 'BILD3', key_column: 'lage', value: 'gak_vol_min_pct' } },
        { key: 'gak_max', label: 'GAK max', type: 'lookup_value', lookup: { table_code: 'BILD3', key_column: 'lage', value: 'gak_vol_max_pct' } },
        { key: 'gak_vol_pct', label: 'GAK-Volumenanteil geplant', type: 'number', unit: '%', min: 0, max: 100 },
        { key: 'caco3_soll_pct', label: 'CaCO3 Bild 3', type: 'lookup_value', lookup: { table_code: 'BILD3', key_column: 'lage', value: 'caco3_massenanteil_pct' } },
        { key: 'caco3_pct', label: 'CaCO3-Massenanteil geplant', type: 'number', unit: '%', min: 0, max: 100 },
        { key: 'filterwirksam', label: 'Filterkörper', type: 'lookup_value', lookup: { table_code: 'BILD3', key_column: 'lage', value: 'filterwirksam' } },
        { key: 'gak_ok', label: 'GAK im Bild-3-Band', type: 'derived', expr: GAK_OK_EXPR, display: 'badge', value_labels: { '1': 'ja', '0': 'nein' } },
      ],
      footer: ['h_FK_lagen', 'h_Draen_lagen', 'schichten_gak_verletzungen'],
      note: `${Q.L611} Lagen von oben nach unten: 10 cm Filtersand / Meliorationsschicht (GAK 10 % bis 20 %), 60 cm Filtersand, 30 cm Filtersand (GAK 30 % bis 40 %), 25 cm Dränagekies; 20 % CaCO3-Massenanteil dem gesamten Filtersand beimischen. h_FK = Σ der Filtersandlagen (1,00 m = 10 + 60 + 30 cm), h_Drän = Dränagekies. Die Einzelwerte GAK_volumenanteil_oben / _unten / CaCO3_massenanteil_GAK und h_FK bleiben bis m187-D-1 / D-2.`,
    },
    visible_when: SPUR_BC,
    verification_quote: `${Q.L611} — ${Q.B3_SPAN}`,
    create: { section_code: 'C', label_de: 'Filteraufbau nach Bild 3 (je Lage Stärke, GAK-Volumenanteil, CaCO3-Massenanteil)', data_type: 'json', unit: null, clause_reference: '§5.2.3.2, Bild 3',
      description: 'Plan 3: Zeilen je Filterschicht (Bild-3-Lage als Zeilenschlüssel); Σ Filtersandlagen → h_FK_lagen (M187-13-D1), Dränagekies → h_Draen_lagen (-D2), Lagen außerhalb des GAK-Bands → schichten_gak_verletzungen (-D3). Die Einzelskalare GAK_volumenanteil_oben / _unten / CaCO3_massenanteil_GAK (an M187-11 übergeben) und h_FK sind Ablösekandidaten (m187-D-1 / D-2).' },
  }),
  WS13({ symbol: 'h_FK_lagen', widget: 'derived', ui_config: null, visible_when: SPUR_BC, verification_quote: `${Q.B3_SPAN} — ${Q.L601}`,
    create: { section_code: 'D', label_de: 'Höhe des Filterkörpers aus den Filtersandlagen (Σ Bild-3-Lagen ohne Dränagekies)', data_type: 'number', unit: 'm', clause_reference: '§5.2.3.2, Bild 3', description: 'Plan 3: Ausgabe der Gleichung M187-13-D1 (sum_rows über filterschichten, Lagen mit filterwirksam = true, / 100); Bild 3: 10 + 60 + 30 cm = 1,00 m = „Filterschichtstärke von 1 m“ (L601). Das Eingabefeld h_FK bleibt (m187-D-2).' } }),
  WS13({ symbol: 'h_Draen_lagen', widget: 'derived', ui_config: null, visible_when: SPUR_BC, verification_quote: `${Q.B3_SPAN} — ${Q.L382}`,
    create: { section_code: 'D', label_de: 'Schichtdicke des Dränmaterials aus dem Filteraufbau (Dränagekies)', data_type: 'number', unit: 'm', clause_reference: '§5.2.3.2, Bild 3; Tab. 2 h_Drän', description: 'Plan 3: Ausgabe der Gleichung M187-13-D2 (sum_rows über filterschichten, Lagen mit filterwirksam = false, / 100); Bild 3: 25 cm Dränagekies.' } }),
  WS13({ symbol: 'schichten_gak_verletzungen', widget: 'derived', ui_config: null, visible_when: SPUR_BC, verification_quote: Q.B3_SPAN,
    create: { section_code: 'D', label_de: 'Lagen mit GAK-Volumenanteil außerhalb des Bild-3-Bands (Anzahl)', data_type: 'number', unit: null, clause_reference: '§5.2.3.2, Bild 3', description: 'Plan 3: Ausgabe der Gleichung M187-13-D3 (count_rows über filterschichten mit gak_ok == 0); Bild 3 ist eine Empfehlung („Empfohlener Filteraufbau“) — kein Gate.' } }),

  // ---- M187-14 Spurenstoffe Variante c (RBFplus): hydraulisch entkoppelte Segmente (§5.2.3.1 c) L603, §5.2.4.1 L631) ----
  WS14({
    symbol: 'filtersegmente', widget: 'register',
    ui_config: {
      title: 'Filtersegmente (hydraulisch entkoppelt)', subtitle: '§5.2.3.1 c) — je Segment Fläche, Retentionsvolumen und Beschickungstag; Retentionsvolumen ≥ Q_T,d,aM · 1 d', add_label: '+ Segment', placement: 'section',
      columns: [
        { key: 'label', label: 'Segment', type: 'text', required: true },
        { key: 'flaeche_m2', label: 'Fläche', type: 'number', unit: 'm²', required: true, min: 0 },
        { key: 'retentionsvolumen_m3', label: 'Retentionsvolumen', type: 'number', unit: 'm³', required: true, min: 0 },
        { key: 'beschickungstag', label: 'Beschickungstag (Rotation)', type: 'text', datalist: ['Tag 1', 'Tag 2', 'Tag 3'] },
        { key: 'v_soll_m3', label: 'Soll = Q_T,d,aM · 86,4', type: 'derived', expr: V_SOLL_ROW_EXPR },
        { key: 'v_ok', label: 'Volumen ausreichend', type: 'derived', expr: V_OK_EXPR, display: 'badge', value_labels: { '1': 'ja', '0': 'nein' } },
      ],
      footer: ['segmente_count', 'V_segment_soll', 'segmente_unterdimensioniert', 'A_F_segmente'],
      note: `${Q.L603} ${Q.L631} Q_T,d,aM in l/s · 86,4 = m³/d (Umrechnung, keine gedruckte Gleichung — m187-F-1).`,
    },
    visible_when: SPUR_C,
    verification_quote: `${Q.L603} — ${Q.L631}`,
    create: { section_code: 'C', label_de: 'Filtersegmente (je Segment Fläche, Retentionsvolumen, Beschickungstag)', data_type: 'json', unit: null, clause_reference: '§5.2.3.1 c), §5.2.4.1',
      description: 'Plan 3: Zeilen je hydraulisch entkoppeltem Segment; Anzahl → segmente_count (M187-14-D2), Segmente mit Retentionsvolumen < Q_T,d,aM · 86,4 → segmente_unterdimensioniert (-D3), Σ Fläche → A_F_segmente (-D4). „Positive Erfahrungen liegen bei einer Aufteilung auf drei Segmente vor“ ist Erfahrung, kein Mindestwert (m187-J-3).' },
  }),
  WS14({ symbol: 'V_segment_soll', widget: 'derived', ui_config: null, visible_when: SPUR_C, verification_quote: Q.L603,
    create: { section_code: 'D', label_de: 'Retentionsvolumen je Segment (Soll = mittlerer täglicher Trockenwetterzufluss Q_T,d,aM · 1 d)', data_type: 'number', unit: 'm³', clause_reference: '§5.2.3.1 c)', description: 'Plan 3: Ausgabe der Gleichung M187-14-D1 (Q_T_d_aM [l/s] · 86,4 = m³/d); „Das Retentionsvolumen eines Segments ist auf den mittleren täglichen Trockenwetterzufluss der Kläranlage (Q_T,d,aM) zu dimensionieren.“ — Umrechnung l/s → m³/d, keine gedruckte Gleichung (m187-F-1).' } }),
  WS14({ symbol: 'segmente_count', widget: 'derived', ui_config: null, visible_when: SPUR_C, verification_quote: Q.L603,
    create: { section_code: 'D', label_de: 'Anzahl der Filtersegmente', data_type: 'number', unit: null, clause_reference: '§5.2.3.1 c)', description: 'Plan 3: Ausgabe der Gleichung M187-14-D2 (count_rows über filtersegmente); „muss der Filter in hydraulisch entkoppelte Segmente aufgeteilt werden“ — Gate ≥ 2 ist STAGED (m187-G-9).' } }),
  WS14({ symbol: 'segmente_unterdimensioniert', widget: 'derived', ui_config: null, visible_when: SPUR_C, verification_quote: Q.L603,
    create: { section_code: 'D', label_de: 'Segmente mit Retentionsvolumen unter Q_T,d,aM · 1 d (Anzahl)', data_type: 'number', unit: null, clause_reference: '§5.2.3.1 c)', description: 'Plan 3: Ausgabe der Gleichung M187-14-D3 (count_rows über filtersegmente mit v_ok == 0).' } }),
  WS14({ symbol: 'A_F_segmente', widget: 'derived', ui_config: null, visible_when: SPUR_C, verification_quote: Q.L603,
    create: { section_code: 'D', label_de: 'Filterfläche aller Segmente (Σ)', data_type: 'number', unit: 'm²', clause_reference: '§5.2.3.1 c)', description: 'Plan 3: Ausgabe der Gleichung M187-14-D4 (sum_rows über filtersegmente.flaeche_m2); der Filterflächenbedarf nach AFS63-Fracht (Mischwasser + Trockenwetterablauf) bleibt die DWA-A 178-Bemessung.' } }),

  // ---- M187-16 Mikroorganismen: the §5.3.3.1 limits (sonderanwendung, q_Dr_RBF, h_FK inherited) + Indikatororganismen ----
  WS16({
    symbol: 'q_Dr_RBF_limit_mikro', widget: 'lookup_fill', ui_config: { source_label: '§5.3.3.1' },
    lookup: { table_code: 'S5_LIMITS_APP', role: 'limit', keys: [{ column: 'sonderanwendung', from_symbol: 'sonderanwendung' }], value: 'q_dr_rbf' },
    visible_when: MIKRO,
    verification_quote: Q.L675,
    create: { section_code: 'B', label_de: 'Drosselabflussspende bei Volleinstau nach §5.3.3.1 (q_Dr,RBF = 0,01 l/(s·m²))', data_type: 'number', unit: 'l/(s·m²)', clause_reference: '§5.3.3.1',
      description: 'Plan 3: aus S5_LIMITS_APP für sonderanwendung = mikroorganismen gefüllt (locked, „ist … sicherzustellen“); Gate q_Dr_RBF == q_Dr_RBF_limit_mikro anstelle des auf M187-06 / -07 unbedingt feuernden REQ-04 ist STAGED (m187-G-1).' },
  }),
  WS16({
    symbol: 'h_FK_min_mikro', widget: 'lookup_fill', ui_config: { source_label: '§5.3.3.1' },
    lookup: { table_code: 'S5_LIMITS_APP', role: 'limit', keys: [{ column: 'sonderanwendung', from_symbol: 'sonderanwendung' }], value: 'h_fk_min_m' },
    visible_when: MIKRO,
    verification_quote: Q.L677,
    create: { section_code: 'B', label_de: 'Höhe des Filterkörpers nach §5.3.3.1 für > 1,0 Log-Stufe Rückhalt (h_FK ≥ 1,0 m, sollte)', data_type: 'number', unit: 'm', clause_reference: '§5.3.3.1',
      description: 'Plan 3: aus S5_LIMITS_APP gefüllt; „sollte die Höhe des Filterkörpers h_FK ≥ 1,0 m betragen“ — die Tabelle ist locked, anhaltswert für diese Zeile ist vorgeschlagen (m187-O-2); Gate h_FK ≥ h_FK_min_mikro (warn) ist STAGED (m187-G-1).' },
  }),
  WS16({
    symbol: 'indikatororganismen', widget: 'register',
    ui_config: {
      title: 'Indikatororganismen (Zulauf / Ablauf → Log-Stufen)', subtitle: '§5.3.2 / §5.3.4.3 — je Organismus Einheit, Zulauf- und Ablaufkonzentration; Rückhalt in Log-Stufen', add_label: '+ Organismus', placement: 'section',
      columns: [
        { key: 'organismus', label: 'Indikatororganismus', type: 'enum', options: ['e_coli', 'enterokokken', 'coliphagen'], option_labels: { e_coli: 'E. coli', enterokokken: 'intestinale Enterokokken', coliphagen: 'somatische Coliphagen' }, required: true },
        { key: 'einheit', label: 'Einheit', type: 'enum', options: ['kbe', 'mpn', 'pbe'], option_labels: { kbe: 'KBE/100 ml', mpn: 'MPN/100 ml', pbe: 'PBE/100 ml' }, required: true },
        { key: 'zulauf', label: 'Zulauf', type: 'number', required: true, min: 0, aria_label: 'Konzentration im Filterzulauf (Anzahl/100 ml)' },
        { key: 'ablauf', label: 'Ablauf', type: 'number', required: true, min: 0, aria_label: 'Konzentration im Filterablauf (Anzahl/100 ml)' },
        { key: 'log_red', label: 'Rückhalt (Log-Stufen)', type: 'derived', expr: LOG_RED_EXPR },
        { key: 'ok', label: '> 1,0 Log-Stufe', type: 'derived', expr: LOG_OK_EXPR, display: 'badge', value_labels: { '1': 'ja', '0': 'nein' } },
      ],
      footer: ['organismen_count', 'log_red_min'],
      note: `${Q.L661} ${Q.L667} Ablauf = 0 („nicht nachweisbar“) ist als Log-Stufe nicht definiert — die Nachweisgrenze eintragen; die Wirkungsgradermittlung ist frachtbezogen (§5.3.4.3, L727) und hier je Probe konzentrationsbezogen (m187-F-2). Die Einzelwerte KBE / MPN / PBE / logstufen_rueckhalt bleiben bis m187-D-7.`,
    },
    visible_when: MIKRO,
    verification_quote: `${Q.L661} — ${Q.L667} — ${Q.L677}`,
    create: { section_code: 'C', label_de: 'Indikatororganismen (je Organismus Einheit, Zulauf, Ablauf → Log-Stufen)', data_type: 'json', unit: null, clause_reference: '§5.3.2, §5.3.3.1, §5.3.4.3',
      description: 'Plan 3: Zeilen je Indikatororganismus (E. coli, intestinale Enterokokken, somatische Coliphagen; KBE / MPN / PBE); Rückhalt = log10(Zulauf / Ablauf); Minimum → log_red_min (M187-16-D1), Anzahl → organismen_count (-D2). Die Einzelskalare KBE / MPN / PBE / logstufen_rueckhalt sind Ablösekandidaten (m187-D-7).' },
  }),
  WS16({ symbol: 'log_red_min', widget: 'derived', ui_config: null, visible_when: MIKRO, verification_quote: `${Q.L667} — ${Q.L677}`,
    create: { section_code: 'D', label_de: 'Rückhalt an Indikatororganismen (Minimum über die Organismen, Log-Stufen)', data_type: 'number', unit: 'log', clause_reference: '§5.3.2, §5.3.3.1', description: 'Plan 3: Ausgabe der Gleichung M187-16-D1 (min_rows über indikatororganismen.log_red, Zeilen mit ablauf > 0); Ziel > 1,0 Log-Stufe (> 90 %) bei h_FK ≥ 1,0 m (L677). Das Eingabefeld logstufen_rueckhalt (VR > 1.0) bleibt (m187-D-7).' } }),
  WS16({ symbol: 'organismen_count', widget: 'derived', ui_config: null, visible_when: MIKRO, verification_quote: Q.L661,
    create: { section_code: 'D', label_de: 'Anzahl der erfassten Indikatororganismen', data_type: 'number', unit: null, clause_reference: '§5.3.2', description: 'Plan 3: Ausgabe der Gleichung M187-16-D2 (count_rows über indikatororganismen).' } }),

  // ---- M187-18 UV-Nachbehandlung: the §5.3.3.5 minimum dose beside `uv_eingesetzt` (UV_dosis itself is consumed by -16 → m187-C-4) ----
  WS18({
    symbol: 'UV_dosis_min', widget: 'lookup_fill', ui_config: { source_label: '§5.3.3.5' },
    lookup: { table_code: 'S5_3_3_5_UV', role: 'limit', keys: [{ column: 'uv_eingesetzt', from_symbol: 'uv_eingesetzt' }], value: 'uv_dosis_min_j_m2' },
    visible_when: UV_JA,
    verification_quote: Q.L703,
    create: { section_code: 'B', label_de: 'UV-Mindestdosis nach §5.3.3.5 (200 J/m², sollte nicht unterschritten werden)', data_type: 'number', unit: 'J/m²', clause_reference: '§5.3.3.5',
      description: 'Plan 3: aus S5_3_3_5_UV gefüllt, wenn eine UV-Nachbehandlung eingesetzt wird (anhaltswert: „sollte … nicht unterschritten werden“). Gate IF uv_eingesetzt == ja THEN UV_dosis ≥ UV_dosis_min ist STAGED (m187-G-7); das Ausblenden von UV_dosis ist m187-C-4.' },
  }),

  // ---- M187-19 Hohe organische Belastung — Vorstufe: Stoffstromtrennung ab CSB > 3.000 mg/l (§5.4.2.2.2 L765) ----
  WS19({
    symbol: 'stoffstromtrennung', widget: 'attestation', ui_config: null,
    visible_when: CSB_HOCH,
    verification_quote: Q.L765,
    create: { section_code: 'B', label_de: 'Abflüsse der Lagerflächen von denen der Verkehrsflächen getrennt (CSB-Konzentration > 3.000 mg/l, §5.4.2.2.2)', data_type: 'boolean', unit: null, clause_reference: '§5.4.2.2.2',
      description: 'Plan 3: „Bei häufiger auftretenden CSB-Konzentrationen von > 3.000 mg/l müssen die Abflüsse der Lagerflächen von denen der Verkehrsflächen getrennt werden“ — sichtbar ab CSB_konzentration > 3000; Gate IF CSB_konzentration > 3000 THEN stoffstromtrennung == true (+ sickerwasser_in_rbf == false, unbedingt) ist STAGED (m187-G-3). Das Eingabefeld CSB_grenze_trennung (VR > 3000) ist eine Konstante als Eingabe (m187-D-8).' },
  }),

  // ---- M187-20 Hohe organische Belastung — RBF: the "Daten vorhanden?" switch (L792), Teilfilterbecken (L794) ----
  WS20({
    symbol: 'daten_vorhanden', widget: 'select_one', ui_config: null,
    enum_values: [{ value: 'ja', label_de: 'ja — CSB-Frachtdaten liegen vor (Bemessung über B_CSB ≤ 20 g/(m²·d))', order_index: 0 }, { value: 'nein', label_de: 'nein — keine Daten (Gesamtfilterfläche ≥ 750 m²/ha A_E,b)', order_index: 1 }], // L792
    verification_quote: Q.L792,
    create: { section_code: 'B', label_de: 'Liegen CSB-Frachtdaten für die Bemessung vor? (§5.4.3)', data_type: 'enum', unit: null, clause_reference: '§5.4.3',
      description: 'Plan 3: Weiche des §5.4.3 — mit Daten: CSB-Fracht ≤ 20 g CSB/(m²·d) bezogen auf die Gesamtfilterfläche; „Liegen keine Daten vor, muss die Gesamtfilterfläche mindestens 750 m²/ha A_E,b betragen.“ REQ-05 verlangt heute beides zugleich — Ersatz durch IF daten_vorhanden THEN … ist STAGED (m187-G-2).' },
  }),
  WS20({
    symbol: 'CSB_fracht_d', widget: 'scalar', ui_config: null, visible_when: DATEN_JA, verification_quote: Q.L792,
    create: { section_code: 'B', label_de: 'CSB-Fracht auf den RBF im Jahresdurchschnitt', data_type: 'number', unit: 'g CSB/d', clause_reference: '§5.4.3',
      description: 'Plan 3: mittlere tägliche CSB-Fracht (Jahresdurchschnitt) auf die Gesamtfilterfläche — Eingabe für B_CSB_calc (M187-20-D5).' },
  }),
  WS20({
    symbol: 'teilfilterbecken', widget: 'register',
    ui_config: {
      title: 'Teilfilterbecken', subtitle: '§5.4.3 — vier (oder ein Vielfaches von vier) gleich große Teilfilterbecken; je Becken Fläche und Betriebszustand', add_label: '+ Teilfilterbecken', placement: 'section',
      columns: [
        { key: 'label', label: 'Teilfilterbecken', type: 'text', required: true },
        { key: 'flaeche_m2', label: 'Fläche', type: 'number', unit: 'm²', required: true, min: 0 },
        { key: 'in_betrieb', label: 'in Betrieb (nicht in Betriebspause)', type: 'boolean' },
        { key: 'foerder_min_l_min', label: 'Förderleistung mind. (6 l/(m²·min))', type: 'derived', expr: FOERDER_MIN_EXPR },
        { key: 'beschickung_soll_l', label: 'Beschickung je Ereignis (20 l/m²)', type: 'derived', expr: BESCHICKUNG_SOLL_EXPR },
      ],
      footer: ['teilfilter_count', 'teilfilter_rest', 'A_F_gesamt', 'A_F_aktiv'],
      note: `${Q.L794} Förderleistung und Beschickungsmenge sind „bezogen auf die jeweils beschickte Filterfläche“ — je Teilfilterbecken berechnet. Das Eingabefeld anzahl_teilfilter bleibt bis m187-D-5.`,
    },
    verification_quote: Q.L794,
    create: { section_code: 'C', label_de: 'Teilfilterbecken (je Becken Fläche, in Betrieb / Betriebspause)', data_type: 'json', unit: null, clause_reference: '§5.4.3',
      description: 'Plan 3: Zeilen je Teilfilterbecken; Anzahl → teilfilter_count (M187-20-D3), Rest zu Vielfachem von vier → teilfilter_rest (-D6), Σ Fläche → A_F_gesamt (-D1), Σ in Betrieb → A_F_aktiv (-D2); je Zeile Förderleistung ≥ 6 l/(m²·min) · Fläche und 20 l/m² · Fläche. Das Eingabefeld anzahl_teilfilter ist Ablösekandidat (m187-D-5); Gate teilfilter_rest == 0 ist STAGED (m187-G-10).' },
  }),
  WS20({ symbol: 'A_F_gesamt', widget: 'derived', ui_config: null, verification_quote: Q.L792,
    create: { section_code: 'D', label_de: 'Gesamtfilterfläche (Σ Teilfilterbecken)', data_type: 'number', unit: 'm²', clause_reference: '§5.4.3', description: 'Plan 3: Ausgabe der Gleichung M187-20-D1 (sum_rows über teilfilterbecken.flaeche_m2); Bezugsfläche der CSB-Fracht ≤ 20 g/(m²·d) und des Mindestwerts 750 m²/ha A_E,b.' } }),
  WS20({ symbol: 'A_F_aktiv', widget: 'derived', ui_config: null, verification_quote: Q.L794,
    create: { section_code: 'D', label_de: 'Filterfläche der in Betrieb befindlichen Teilfilterbecken (Σ)', data_type: 'number', unit: 'm²', clause_reference: '§5.4.3', description: 'Plan 3: Ausgabe der Gleichung M187-20-D2 (sum_rows über teilfilterbecken mit in_betrieb = true); „jeweils drei gleichzeitig in Betrieb und eins hat Betriebspause“.' } }),
  WS20({ symbol: 'teilfilter_count', widget: 'derived', ui_config: null, verification_quote: Q.L794,
    create: { section_code: 'D', label_de: 'Anzahl der Teilfilterbecken (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§5.4.3', description: 'Plan 3: Ausgabe der Gleichung M187-20-D3 (count_rows über teilfilterbecken). Das Eingabefeld anzahl_teilfilter bleibt (m187-D-5).' } }),
  WS20({ symbol: 'teilfilter_rest', widget: 'derived', ui_config: null, verification_quote: Q.L794,
    create: { section_code: 'D', label_de: 'Rest der Teilfilterbecken-Anzahl zum Vielfachen von vier (0 = vier oder ein Vielfaches von vier)', data_type: 'number', unit: null, clause_reference: '§5.4.3', description: 'Plan 3: Ausgabe der Gleichung M187-20-D6 (teilfilter_count − 4 · floor(teilfilter_count / 4)); Gate == 0 ist STAGED (m187-G-10).' } }),
  WS20({ symbol: 'A_F_min_ohne_daten', widget: 'derived', ui_config: null, visible_when: DATEN_NEIN, verification_quote: Q.L792,
    create: { section_code: 'D', label_de: 'Mindest-Gesamtfilterfläche ohne Daten (750 m²/ha · A_E,b)', data_type: 'number', unit: 'm²', clause_reference: '§5.4.3', description: 'Plan 3: Ausgabe der Gleichung M187-20-D4 (lookup S5_4_3_ORG a_f_pro_aeb · A_E_b); nur ohne CSB-Frachtdaten. Gate A_F_gesamt ≥ A_F_min_ohne_daten ist STAGED (m187-G-2). Das Eingabefeld A_F_pro_AEb (VR ≥ 750) bleibt (m187-C-5).' } }),
  WS20({ symbol: 'B_CSB_calc', widget: 'derived', ui_config: null, visible_when: DATEN_JA, verification_quote: Q.L792,
    create: { section_code: 'D', label_de: 'CSB-Filterflächenbelastung (berechnet: CSB-Fracht / Gesamtfilterfläche)', data_type: 'number', unit: 'g/(m²·d)', clause_reference: '§5.4.3', description: 'Plan 3: Ausgabe der Gleichung M187-20-D5 (CSB_fracht_d / A_F_gesamt) — „bezogen auf die Gesamtfilterfläche im Jahresdurchschnitt“; nur mit CSB-Frachtdaten. Gate B_CSB_calc ≤ 20 ist STAGED (m187-G-2). Das Eingabefeld B_CSB (VR ≤ 20) bleibt (m187-C-5).' } }),

  // ---- M187-22 Klein-RBF Bemessung: elements (§5.5.4 L964 / L968) + the carbonate toggle on h_FK (L926 / L930) ----
  WS22({
    symbol: 'klein_rbf_elemente', widget: 'register',
    ui_config: {
      title: 'Klein-RBF Einzelelemente', subtitle: '§5.5.4 — je Element angeschlossene befestigte Fläche A_b,a und Bodenfilteroberfläche A_F (≥ 1,0 m²); A_F = 1,0 % A_b,a', add_label: '+ Einzelelement', placement: 'section',
      columns: [
        { key: 'label', label: 'Element', type: 'text', required: true },
        { key: 'a_b_a_m2', label: 'A_b,a', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'angeschlossene befestigte Fläche des Elements in m²' },
        { key: 'a_f_m2', label: 'A_F', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'Bodenfilteroberfläche des Elements in m²' },
        { key: 'anteil_pct', label: 'A_F / A_b,a', type: 'derived', expr: ANTEIL_EXPR },
        { key: 'a_f_ok', label: 'A_F ≥ 1,0 m²', type: 'derived', expr: A_F_ELEMENT_OK_EXPR, display: 'badge', value_labels: { '1': 'ja', '0': 'nein' } },
        { key: 'h_rr', label: 'h_RR', type: 'number', unit: 'm', min: 0, aria_label: 'nutzbare Einstauhöhe des Elements' },
        { key: 'h_rbf', label: 'h_RBF', type: 'number', unit: 'm', min: 0, aria_label: 'Einbautiefe des Elements' },
      ],
      footer: ['elemente_count', 'A_b_a_sum_klein', 'A_F_sum_klein', 'A_F_anteil_calc', 'elemente_unter_1m2'],
      note: `${Q.L964} ${Q.L968} Die Einzelwerte A_b_a / A_F / A_F_anteil_Aba (Gl. 1) und h_RR / h_RBF bleiben bis m187-D-6.`,
    },
    verification_quote: `${Q.L964} — ${Q.L968}`,
    create: { section_code: 'C', label_de: 'Klein-RBF Einzelelemente (je Element A_b,a, A_F, h_RR, h_RBF)', data_type: 'json', unit: null, clause_reference: '§5.5.4',
      description: 'Plan 3: Zeilen je Einzelelement (auch Verbundsystem); Σ A_F → A_F_sum_klein (M187-22-D1), Σ A_b,a → A_b_a_sum_klein (-D2), Elemente mit A_F < 1,0 m² → elemente_unter_1m2 (-D3), A_F / A_b,a in % → A_F_anteil_calc (-D4), Anzahl → elemente_count (-D6). Die Einzelskalare A_b_a / A_F (Gl. 1) / A_F_anteil_Aba / h_RR / h_RBF sind Ablösekandidaten (m187-D-6); A_F < 1,0 % mit Gl.-2-Nachweis statt REQ-06 „== 1.0“ ist STAGED (m187-G-6).' },
  }),
  WS22({ symbol: 'A_F_sum_klein', widget: 'derived', ui_config: null, verification_quote: Q.L964,
    create: { section_code: 'D', label_de: 'Bodenfilteroberfläche aller Einzelelemente (Σ A_F)', data_type: 'number', unit: 'm²', clause_reference: '§5.5.4', description: 'Plan 3: Ausgabe der Gleichung M187-22-D1 (sum_rows über klein_rbf_elemente.a_f_m2).' } }),
  WS22({ symbol: 'A_b_a_sum_klein', widget: 'derived', ui_config: null, verification_quote: Q.L964,
    create: { section_code: 'D', label_de: 'angeschlossene befestigte Fläche aller Einzelelemente (Σ A_b,a)', data_type: 'number', unit: 'm²', clause_reference: '§5.5.4', description: 'Plan 3: Ausgabe der Gleichung M187-22-D2 (sum_rows über klein_rbf_elemente.a_b_a_m2); Anwendungsbereich A_b,a < 1 ha (L859) — Gate STAGED (m187-G-6).' } }),
  WS22({ symbol: 'elemente_unter_1m2', widget: 'derived', ui_config: null, verification_quote: Q.L964,
    create: { section_code: 'D', label_de: 'Einzelelemente mit A_F < 1,0 m² (Anzahl)', data_type: 'number', unit: null, clause_reference: '§5.5.4', description: 'Plan 3: Ausgabe der Gleichung M187-22-D3 (count_rows über klein_rbf_elemente mit a_f_ok == 0); „sollte … A_F ≥ 1,0 m² nicht unterschritten werden“ (sollte → warn, STAGED m187-G-6).' } }),
  WS22({ symbol: 'A_F_anteil_calc', widget: 'derived', ui_config: null, verification_quote: `${Q.L964} — ${Q.L968}`,
    create: { section_code: 'D', label_de: 'spezifische Bodenfilteroberfläche (Σ A_F / Σ A_b,a, berechnet)', data_type: 'number', unit: '%', clause_reference: '§5.5.4', description: 'Plan 3: Ausgabe der Gleichung M187-22-D4 (A_F_sum_klein · 100 / A_b_a_sum_klein); Regelwert 1,0 % (= 100 m²/ha); „auch geringere spezifische Filterflächen von A_F < 1,0 % … möglich“ mit b_krit-Nachweis (Gl. 2) — REQ-06 erzwingt heute == 1.0 (m187-G-6). Das Eingabefeld A_F_anteil_Aba bleibt (m187-D-6).' } }),
  WS22({ symbol: 'elemente_count', widget: 'derived', ui_config: null, verification_quote: Q.L964,
    create: { section_code: 'D', label_de: 'Anzahl der Einzelelemente', data_type: 'number', unit: null, clause_reference: '§5.5.4', description: 'Plan 3: Ausgabe der Gleichung M187-22-D6 (count_rows über klein_rbf_elemente).' } }),
  WS22({ symbol: 'h_FK_min_klein', widget: 'derived', ui_config: null, verification_quote: `${Q.L926} — ${Q.L930}`,
    create: { section_code: 'D', label_de: 'Mindesthöhe des Filterkörpers Klein-RBF (0,25 m; mit Carbonatschicht h_FK,CaCO3 ≥ 0,10 m: 0,2 m)', data_type: 'number', unit: 'm', clause_reference: '§5.5.3.2.2', description: 'Plan 3: Ausgabe der Gleichung M187-22-D5 — if(carbonatschicht_vorhanden == ja, 0,2, 0,25) aus S5_LIMITS_APP (klein_rbf: h_fk_carbonat_m / h_fk_min_m); „In diesem Fall kann die Filterstärke auf h_FK 0,2 m verringert werden.“ (L930, ohne gedruckten Operator — m187-J-4). Gate h_FK ≥ h_FK_min_klein anstelle des unbedingten REQ-02 ist STAGED (m187-G-1); h_FK_CaCO3 / CaCO3_massenanteil_carbo sind an M187-22 übergeben — ihr Ausblenden ist m187-C-3.' } }),
];

/**
 * No section rules: `sonderanwendung` (M187-01) is inherited on M187-06 / -11 / -16 / -20 / -22 only (capture) and every
 * field-bearing section B / D of every worksheet holds a consumed producer (prod marks 125 of 139 fields as consumed, mostly by
 * their own worksheet — m187-X-3) — the transitive guard refuses each; the field-free sections A / C / F / J / K / L / M would be
 * inert rules. The five branch section rules and the consumer edit are m187-C-1 / C-2 (STAGED).
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
