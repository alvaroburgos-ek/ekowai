/**
 * DWA-M-187 — Plan 3 Task 12 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts m187` (NEW equation rows only;
 * `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted from the
 * transcript `Desktop\Guidelines\DWA-M-187\DWA-M_187_GD.md` (the `Q` spans of the
 * seed module; line in the comment).
 *
 * The Merkblatt prints NO numbered equations of its own (prod's Gl. 1 / Gl. 2 are
 * the §5.5.4 sentences A_F = 1,0 % A_b,a and the b_krit proof, m187-R-1): every
 * row below is a text-described derivation (equation_number `<WS>-D<n>`), each
 * with its F-block on the sheet where the arithmetic is implied rather than
 * printed (unit conversion l/s → m³/d, Σ of printed layer thicknesses, load /
 * area, EBCT · v).
 *
 * Single-source: no row here outputs a symbol prod already produces (A_F and
 * ok_boolean keep their Gl. 1 / Gl. 2 rows; h_FK, q_Dr_RBF, B_CSB, A_F_pro_AEb,
 * A_F_anteil_Aba, logstufen_rueckhalt stay inputs — the twins are `_calc` /
 * `_lagen` / `_sum_` outputs with a D-block per pair). Register-fed rows live on
 * the register's worksheet (M187-09 sorptionsstufen, -13 filterschichten, -14
 * filtersegmente, -16 indikatororganismen, -20 teilfilterbecken, -22
 * klein_rbf_elemente) and are materialised on save; the scalar rows (M187-09-D1
 * h_FK_SS_calc, M187-14-D1 V_segment_soll, M187-20-D4 / -D5, M187-22-D4 / -D5)
 * are computed on hook / report / snapshot / PDF only (amendment D, m187-I-2).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-seed-m187';

const STD = 'DWA-M-187';

export const EQUATIONS: EquationEntry[] = [
  // ---- M187-09 P-Rückhalt Variante c: Sorptionsstufe (§5.1.3.1 c) L497 / L499) ----
  {
    standard: STD, worksheet: 'M187-09', equation_number: 'M187-09-D1',
    formula: 'h_FK_SS_calc = EBCT * v_filter_aufstrom / 60',
    input_symbols: ['EBCT', 'v_filter_aufstrom'], output_symbol: 'h_FK_SS_calc', output_unit: 'm',
    clause_reference: '§5.1.3.1 c)',
    description: 'Plan 3: Mindesthöhe des Filterkörpers der Sorptionsstufe aus Filterkontaktzeit und Filtergeschwindigkeit — EBCT [min] · v [m/h] / 60 = m; 15 min · 5,0 m/h = 1,25 m („Das entspricht einer Mindesthöhe des Filterkörpers von 1,25 m“). Das Eingabefeld h_FK_SS (VR ≥ 1.25) bleibt (m187-D-4); die Beziehung ist als Satz, nicht als Gleichung gedruckt (m187-F-3).',
    verification_quote: Q.L497, // L497 "… Filterkontaktzeiten (EBCT) ≥ 15 min. und maximale Filtergeschwindigkeiten < 5,0 m/h … Das entspricht einer Mindesthöhe des Filterkörpers von 1,25 m."
  },
  {
    standard: STD, worksheet: 'M187-09', equation_number: 'M187-09-D2',
    formula: 'sorptionsstufen_count = count_rows(sorptionsstufen)',
    input_symbols: ['sorptionsstufen'], output_symbol: 'sorptionsstufen_count', output_unit: null,
    clause_reference: '§5.1.3.1 c)',
    description: 'Plan 3: Anzahl der in Reihe geschalteten Sorptionsstufen (vollständige Zeilen); „Reihenschaltung von mindestens zwei Sorptionsstufen empfohlen“ — Gate ≥ 2 STAGED (m187-G-8).',
    verification_quote: Q.L499,
  },
  {
    standard: STD, worksheet: 'M187-09', equation_number: 'M187-09-D3',
    formula: 'ebct_min_stufe = min_rows(sorptionsstufen, ebct_min)',
    input_symbols: ['sorptionsstufen'], output_symbol: 'ebct_min_stufe', output_unit: 'min',
    clause_reference: '§5.1.3.1 c)',
    description: 'Plan 3: kleinste Filterkontaktzeit über die Sorptionsstufen (EBCT ≥ 15 min je Stufe).',
    verification_quote: Q.L497,
  },

  // ---- M187-13 Spurenstoffe Variante b: Bild-3 layer stack (§5.2.3.2 L611–L621) ----
  {
    standard: STD, worksheet: 'M187-13', equation_number: 'M187-13-D1',
    formula: 'h_FK_lagen = sum_rows(filterschichten, if(filterwirksam == true, dicke_ist_cm, 0)) / 100',
    input_symbols: ['filterschichten'], output_symbol: 'h_FK_lagen', output_unit: 'm',
    clause_reference: '§5.2.3.2, Bild 3',
    description: 'Plan 3: Höhe des Filterkörpers als Summe der Filtersandlagen (Bild-3-Lagen 1–3; die Dränagekies-Lage ist h_Drän nach Tab. 2) in m; Bild 3: 10 + 60 + 30 cm = 1,00 m = „Filterschichtstärke von 1 m“ (L601). Das Eingabefeld h_FK bleibt (m187-D-2); Σ ist nicht als Gleichung gedruckt (m187-F-2).',
    verification_quote: Q.B3_SPAN, // L614–L617
  },
  {
    standard: STD, worksheet: 'M187-13', equation_number: 'M187-13-D2',
    formula: 'h_Draen_lagen = sum_rows(filterschichten, if(filterwirksam == false, dicke_ist_cm, 0)) / 100',
    input_symbols: ['filterschichten'], output_symbol: 'h_Draen_lagen', output_unit: 'm',
    clause_reference: '§5.2.3.2, Bild 3; Tab. 2 h_Drän',
    description: 'Plan 3: Schichtdicke des Dränmaterials aus dem Filteraufbau (Bild 3: 25 cm Dränagekies) in m.',
    verification_quote: Q.B3_SPAN,
  },
  {
    standard: STD, worksheet: 'M187-13', equation_number: 'M187-13-D3',
    formula: 'schichten_gak_verletzungen = count_rows(filterschichten, gak_ok == 0)',
    input_symbols: ['filterschichten'], output_symbol: 'schichten_gak_verletzungen', output_unit: null,
    clause_reference: '§5.2.3.2, Bild 3',
    description: 'Plan 3: Lagen, deren geplanter GAK-Volumenanteil außerhalb des in Bild 3 gedruckten Bands liegt (10 % bis 20 % oben, 30 % bis 40 % unten); Empfehlung, kein Gate.',
    verification_quote: Q.L611,
  },

  // ---- M187-14 Spurenstoffe Variante c: Segmente (§5.2.3.1 c) L603) ----
  {
    standard: STD, worksheet: 'M187-14', equation_number: 'M187-14-D1',
    formula: 'V_segment_soll = Q_T_d_aM * 86.4',
    input_symbols: ['Q_T_d_aM'], output_symbol: 'V_segment_soll', output_unit: 'm³',
    clause_reference: '§5.2.3.1 c)',
    description: 'Plan 3: Retentionsvolumen je Segment = mittlerer täglicher Trockenwetterzufluss Q_T,d,aM · 1 d — Q_T,d,aM [l/s] · 86 400 s/d / 1000 l/m³ = · 86,4 m³/d. Die Umrechnung ist nicht gedruckt (m187-F-1).',
    verification_quote: Q.L603, // "Das Retentionsvolumen eines Segments ist auf den mittleren täglichen Trockenwetterzufluss der Kläranlage ( Q_T,d,aM ) zu dimensionieren."
  },
  {
    standard: STD, worksheet: 'M187-14', equation_number: 'M187-14-D2',
    formula: 'segmente_count = count_rows(filtersegmente)',
    input_symbols: ['filtersegmente'], output_symbol: 'segmente_count', output_unit: null,
    clause_reference: '§5.2.3.1 c)',
    description: 'Plan 3: Anzahl der hydraulisch entkoppelten Segmente; „muss der Filter in hydraulisch entkoppelte Segmente aufgeteilt werden“ — Gate ≥ 2 STAGED (m187-G-9); drei Segmente sind Erfahrung (m187-J-3).',
    verification_quote: Q.L603,
  },
  {
    standard: STD, worksheet: 'M187-14', equation_number: 'M187-14-D3',
    formula: 'segmente_unterdimensioniert = count_rows(filtersegmente, v_ok == 0)',
    input_symbols: ['filtersegmente'], output_symbol: 'segmente_unterdimensioniert', output_unit: null,
    clause_reference: '§5.2.3.1 c)',
    description: 'Plan 3: Segmente, deren Retentionsvolumen unter Q_T,d,aM · 86,4 m³ liegt.',
    verification_quote: Q.L603,
  },
  {
    standard: STD, worksheet: 'M187-14', equation_number: 'M187-14-D4',
    formula: 'A_F_segmente = sum_rows(filtersegmente, flaeche_m2)',
    input_symbols: ['filtersegmente'], output_symbol: 'A_F_segmente', output_unit: 'm²',
    clause_reference: '§5.2.3.1 c)',
    description: 'Plan 3: Filterfläche aller Segmente (Σ über die vollständigen Zeilen).',
    verification_quote: Q.L603,
  },

  // ---- M187-16 Mikroorganismen: Indikatororganismen (§5.3.2 L661 / L667, §5.3.3.1 L677) ----
  {
    standard: STD, worksheet: 'M187-16', equation_number: 'M187-16-D1',
    formula: 'log_red_min = min_rows(indikatororganismen, log_red, ablauf > 0)',
    input_symbols: ['indikatororganismen'], output_symbol: 'log_red_min', output_unit: 'log',
    clause_reference: '§5.3.2, §5.3.3.1',
    description: 'Plan 3: kleinster Rückhalt (Log-Stufen = log10(Zulauf / Ablauf)) über die erfassten Indikatororganismen, Zeilen mit Ablauf > 0; Ziel > 1,0 Log-Stufe (> 90 %). Frachtbezogene Wirkungsgradermittlung (§5.3.4.3) ist nicht abgebildet (m187-F-2). Das Eingabefeld logstufen_rueckhalt bleibt (m187-D-7).',
    verification_quote: Q.L667, // "beträgt im Mittel 90 % ( 1,0 Log-Stufe)"
  },
  {
    standard: STD, worksheet: 'M187-16', equation_number: 'M187-16-D2',
    formula: 'organismen_count = count_rows(indikatororganismen)',
    input_symbols: ['indikatororganismen'], output_symbol: 'organismen_count', output_unit: null,
    clause_reference: '§5.3.2',
    description: 'Plan 3: Anzahl der erfassten Indikatororganismen (vollständige Zeilen).',
    verification_quote: Q.L661,
  },

  // ---- M187-20 Hohe organische Belastung: Teilfilterbecken, CSB-Fracht (§5.4.3 L792 / L794) ----
  {
    standard: STD, worksheet: 'M187-20', equation_number: 'M187-20-D1',
    formula: 'A_F_gesamt = sum_rows(teilfilterbecken, flaeche_m2)',
    input_symbols: ['teilfilterbecken'], output_symbol: 'A_F_gesamt', output_unit: 'm²',
    clause_reference: '§5.4.3',
    description: 'Plan 3: Gesamtfilterfläche als Summe der Teilfilterbecken — Bezugsfläche der CSB-Fracht ≤ 20 g CSB/(m²·d) und der 750 m²/ha A_E,b.',
    verification_quote: Q.L792,
  },
  {
    standard: STD, worksheet: 'M187-20', equation_number: 'M187-20-D2',
    formula: 'A_F_aktiv = sum_rows(teilfilterbecken, if(in_betrieb == true, flaeche_m2, 0))',
    input_symbols: ['teilfilterbecken'], output_symbol: 'A_F_aktiv', output_unit: 'm²',
    clause_reference: '§5.4.3',
    description: 'Plan 3: Filterfläche der in Betrieb befindlichen Teilfilterbecken („jeweils drei gleichzeitig in Betrieb und eins hat Betriebspause“).',
    verification_quote: Q.L794,
  },
  {
    standard: STD, worksheet: 'M187-20', equation_number: 'M187-20-D3',
    formula: 'teilfilter_count = count_rows(teilfilterbecken)',
    input_symbols: ['teilfilterbecken'], output_symbol: 'teilfilter_count', output_unit: null,
    clause_reference: '§5.4.3',
    description: 'Plan 3: Anzahl der Teilfilterbecken (vollständige Zeilen). Das Eingabefeld anzahl_teilfilter bleibt (m187-D-5).',
    verification_quote: Q.L794,
  },
  {
    standard: STD, worksheet: 'M187-20', equation_number: 'M187-20-D4',
    formula: "A_F_min_ohne_daten = lookup('S5_4_3_ORG', 'a_f_pro_aeb', 'wert') * A_E_b",
    input_symbols: ['A_E_b'], output_symbol: 'A_F_min_ohne_daten', output_unit: 'm²',
    clause_reference: '§5.4.3',
    description: 'Plan 3: Mindest-Gesamtfilterfläche ohne CSB-Frachtdaten = 750 m²/ha · A_E,b [ha] („Liegen keine Daten vor, muss die Gesamtfilterfläche mindestens 750 m²/ha A_E,b betragen“). Gate A_F_gesamt ≥ A_F_min_ohne_daten (nur ohne Daten) STAGED (m187-G-2); das Produkt ist nicht als Gleichung gedruckt (m187-F-4).',
    verification_quote: Q.L792,
  },
  {
    standard: STD, worksheet: 'M187-20', equation_number: 'M187-20-D5',
    formula: 'B_CSB_calc = CSB_fracht_d / A_F_gesamt',
    input_symbols: ['CSB_fracht_d', 'A_F_gesamt'], output_symbol: 'B_CSB_calc', output_unit: 'g/(m²·d)',
    clause_reference: '§5.4.3',
    description: 'Plan 3: CSB-Filterflächenbelastung = CSB-Fracht [g/d, Jahresdurchschnitt] / Gesamtfilterfläche [m²] („bezogen auf die Gesamtfilterfläche im Jahresdurchschnitt“). Gate B_CSB_calc ≤ 20 (nur mit Daten) STAGED (m187-G-2); der Quotient ist nicht als Gleichung gedruckt (m187-F-4). Das Eingabefeld B_CSB bleibt (m187-C-5).',
    verification_quote: Q.L792,
  },
  {
    standard: STD, worksheet: 'M187-20', equation_number: 'M187-20-D6',
    formula: 'teilfilter_rest = teilfilter_count - 4 * floor(teilfilter_count / 4)',
    input_symbols: ['teilfilter_count'], output_symbol: 'teilfilter_rest', output_unit: null,
    clause_reference: '§5.4.3',
    description: 'Plan 3: Rest der Teilfilterbecken-Anzahl modulo vier — 0 bedeutet „vier (oder ein Vielfaches von vier) gleich große Teilfilterbecken“; Gate == 0 STAGED (m187-G-10).',
    verification_quote: Q.L794,
  },

  // ---- M187-22 Klein-RBF: Einzelelemente (§5.5.4 L964 / L968) + h_FK carbonate toggle (§5.5.3.2.2 L926 / L930) ----
  {
    standard: STD, worksheet: 'M187-22', equation_number: 'M187-22-D1',
    formula: 'A_F_sum_klein = sum_rows(klein_rbf_elemente, a_f_m2)',
    input_symbols: ['klein_rbf_elemente'], output_symbol: 'A_F_sum_klein', output_unit: 'm²',
    clause_reference: '§5.5.4',
    description: 'Plan 3: Bodenfilteroberfläche aller Einzelelemente. Das Eingabefeld A_F (Gl. 1 = 0,01 · A_b_a · 10000) bleibt (m187-D-6).',
    verification_quote: Q.L964,
  },
  {
    standard: STD, worksheet: 'M187-22', equation_number: 'M187-22-D2',
    formula: 'A_b_a_sum_klein = sum_rows(klein_rbf_elemente, a_b_a_m2)',
    input_symbols: ['klein_rbf_elemente'], output_symbol: 'A_b_a_sum_klein', output_unit: 'm²',
    clause_reference: '§5.5.4, §5.5.2',
    description: 'Plan 3: angeschlossene befestigte Fläche aller Einzelelemente in m² (Anwendungsbereich A_b,a < 1 ha = 10 000 m², L859 — Gate STAGED m187-G-6).',
    verification_quote: Q.L964,
  },
  {
    standard: STD, worksheet: 'M187-22', equation_number: 'M187-22-D3',
    formula: 'elemente_unter_1m2 = count_rows(klein_rbf_elemente, a_f_ok == 0)',
    input_symbols: ['klein_rbf_elemente'], output_symbol: 'elemente_unter_1m2', output_unit: null,
    clause_reference: '§5.5.4',
    description: 'Plan 3: Einzelelemente mit A_F < 1,0 m² („sollte … nicht unterschritten werden“ — warn, STAGED m187-G-6).',
    verification_quote: Q.L964,
  },
  {
    standard: STD, worksheet: 'M187-22', equation_number: 'M187-22-D4',
    formula: 'A_F_anteil_calc = A_F_sum_klein * 100 / A_b_a_sum_klein',
    input_symbols: ['A_F_sum_klein', 'A_b_a_sum_klein'], output_symbol: 'A_F_anteil_calc', output_unit: '%',
    clause_reference: '§5.5.4',
    description: 'Plan 3: spezifische Bodenfilteroberfläche Σ A_F / Σ A_b,a in % — Regelwert 1,0 % (= 100 m²/ha); < 1,0 % mit b_krit-Nachweis nach Gl. 2 zulässig (REQ-06 erzwingt == 1.0, m187-G-6). Das Eingabefeld A_F_anteil_Aba bleibt (m187-D-6).',
    verification_quote: Q.L968,
  },
  {
    standard: STD, worksheet: 'M187-22', equation_number: 'M187-22-D5',
    formula: "h_FK_min_klein = if(carbonatschicht_vorhanden == 'ja', lookup('S5_LIMITS_APP', 'klein_rbf', 'h_fk_carbonat_m'), lookup('S5_LIMITS_APP', 'klein_rbf', 'h_fk_min_m'))",
    input_symbols: ['carbonatschicht_vorhanden'], output_symbol: 'h_FK_min_klein', output_unit: 'm',
    clause_reference: '§5.5.3.2.2',
    description: 'Plan 3: Mindesthöhe des Filterkörpers Klein-RBF — 0,25 m (L926), mit Carbonatschicht h_FK,CaCO3 ≥ 0,10 m aus Carbonatbrechsand (80 % CaCO3) auf 0,2 m verringerbar (L930; kein Operator gedruckt, m187-J-4). carbonatschicht_vorhanden ist von M187-21 übergeben. Gate h_FK ≥ h_FK_min_klein STAGED (m187-G-1).',
    verification_quote: Q.L930,
  },
  {
    standard: STD, worksheet: 'M187-22', equation_number: 'M187-22-D6',
    formula: 'elemente_count = count_rows(klein_rbf_elemente)',
    input_symbols: ['klein_rbf_elemente'], output_symbol: 'elemente_count', output_unit: null,
    clause_reference: '§5.5.4',
    description: 'Plan 3: Anzahl der Einzelelemente (vollständige Zeilen).',
    verification_quote: Q.L964,
  },
];

export const MODULE: EquationModule = { EQUATIONS };
