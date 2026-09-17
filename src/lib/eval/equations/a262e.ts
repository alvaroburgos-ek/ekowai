/**
 * DWA-A-262E — Plan 3 Task 3 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts a262e` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted from
 * the transcript `Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).md` (line in
 * the comment). Text-only derivations ship `imported_unverified` and carry the
 * printed sentence they encode (sign-off class F).
 *
 * Outputs: the register aggregates and the two Tab.-1/§4.2 helpers output
 * CREATED fields (field-configs/a262e.ts); the four "described in the field
 * description but never registered" equations output EXISTING, consumer-free
 * manual fields whose prod description prints the rule (A_Fo_min_VFS_KA
 * "A_Fo_min = EW · A_Fo_spez", Q_GW_taeglich "Q_GW = EW · Q_Grauwasser",
 * A_F_CSB_VFG_KomKA "A_F = B_CSB / f_A_F_CSB", plus A_Fo_spez_GW from the
 * printed "50 %") — single-source: no output symbol has another producer
 * (checked against the 18 prod equations read in-session).
 *
 * Inputs not yet consumed on the output worksheet (the engine reports
 * `manual_required — Fehlende Eingaben` until the STAGED consumer edit lands):
 * `EZ` on A262-10 (a262e-C-2), `A_Fo_spez` on A262-26 and `B_CSB_KomKA` on
 * A262-21, `EZ`/`B_CSB` on A262-24 (a262e-C-6).
 *
 * NOT emitted (STAGED in scripts/verification/a262e-STAGED-plan3-rulings.sql):
 *   - `aufenthaltszeit = V_Vorbehandlung / Q_Tr_h_max` — prod `Q_Tr_h_max`
 *     carries the unit "l/s; m3/h" (read in-session); the h-conversion factor
 *     depends on which one the engineer typed → a262e-F-2;
 *   - `V_F_VFK_KomKA = A_Fu · h_F` — no A_Fu area field on A262-22 → a262e-F-7;
 *   - `A_F_VFKS_total = A_F1 + A_F2` — no stage-area fields on A262-12 → a262e-F-8;
 *   - the Gl. 6 / Gl. 8 switch on `entlastung_typ` (a262e-R-1), the Gl. 11
 *     clamp (a262e-R-2), Gl. 13/14 (a262e-R-3).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';

const STD = 'DWA-A-262E';

const L302 = String.raw`( $\mathrm{BOD}_{5} \leq 40 \mathrm{mg} / \mathrm{l}, \mathrm{COD} \leq 150 \mathrm{mg} / \mathrm{l}$ in randomly collected samples; four out of five samples must be within the limit)`;
const L636 = String.raw`Q_{\mathrm{M}}=f_{\mathrm{S}, \mathrm{QM}} \cdot Q_{\mathrm{S}, \mathrm{~d}, \mathrm{aM}}+Q_{\mathrm{F}} \geq \sum Q_{\mathrm{Dr}, \mathrm{RUB}}(\mathrm{l} / \mathrm{s}) \tag{6}`;
const L646 = String.raw`Q_{M} \geq \sum Q_{\mathrm{Dr}, \mathrm{RU}} \geq \sum Q_{\text {krit }}(\mathrm{l} / \mathrm{s}) \tag{8}`;
const L669 = String.raw`According to Standard DWA-A 272:2014, greywater production can be set at $\geq 75 \mathrm{l} /(\mathrm{P} \cdot \mathrm{d})$.`;
const L793 = 'The specific hydraulic loading requirements of Section 4.3.3 must be verified. Downstream filter areas may not be considered.';
const L804 = String.raw`\hline Specific area per population equivalent, as measured on the upper surface of the filter & $A_{\text {Fo, spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 4$ \\`;
const L875 = String.raw`\hline Specific length of infiltration pipe & $l_{\text {Rieselr }}$ & m/P & $\geq 6$ \\`;
const L876 = String.raw`\hline Length of each infiltration pipe & $L_{\text {Rieselr }}$ & m & $\leq 18$ \\`;
const L937 = String.raw`\hline or average daily specific CSB (COD) areal loading rate over the total filter area, as measured on the upper surface of the filter & $f_{\mathrm{A}, \mathrm{Fo}, \mathrm{CSB}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 20$ \\`;
const L1119 = String.raw`The specific area of a filter for greywater treatment can be dimensioned with $50 \%$ of the specific surface required for a conventional filter treating domestic wastewater.`;
const L614 = 'Table 1: Wastewater specific mass loads per population equivalent in g/(P.d)';

export const EQUATIONS: EquationEntry[] = [
  // ---- A262-10: Filterstufen register aggregates ----
  {
    standard: STD, worksheet: 'A262-10', equation_number: 'A262-10-D1',
    formula: "A_Fo_gesamt = sum_rows(filterstufen, if(stage_role == 'main', area_m2, 0))",
    input_symbols: ['filterstufen'], output_symbol: 'A_Fo_gesamt', output_unit: 'm²',
    clause_reference: '§4.3.1.1',
    description: 'Plan 3: Σ Filterfläche der biologischen Hauptstufen über die Filterstufen-Zeilen; Vorbehandlungs- und Nachreinigungsstufen zählen nicht ("Downstream filter areas may not be considered").',
    verification_quote: L793, // L793 (also L888, L925)
  },
  {
    standard: STD, worksheet: 'A262-10', equation_number: 'A262-10-D2',
    formula: "filterstufen_area_fail = count_rows(filterstufen, stage_role == 'main' AND area_ok == 0)",
    input_symbols: ['filterstufen'], output_symbol: 'filterstufen_area_fail', output_unit: null,
    clause_reference: '§4.3, Tab. 3–14',
    description: 'Plan 3: Anzahl der Hauptstufen-Zeilen mit A_F < EZ · A_spez,min (Tabellenwert je Filtertyp × Anlagengröße × Kanalsystem); Gate == 0 STAGED (a262e-G-8). Bis EZ auf A262-10 übernommen ist (a262e-C-2) bleibt der Wert unentscheidbar.',
    verification_quote: L804, // Tab. 4 row (the m²/P × P check every Tab. 3–14 "Specific area" row implies)
  },
  // ---- A262-06: Σ over the overflow structures (Gl. 6 / Gl. 8) ----
  {
    standard: STD, worksheet: 'A262-06', equation_number: 'A262-06-D1',
    formula: "Q_Dr_RUB_sum = sum_rows(ueberlaufbauwerke, if(type == 'rueb', q_dr, 0))",
    input_symbols: ['ueberlaufbauwerke'], output_symbol: 'Q_Dr_RUB_sum', output_unit: 'l/s',
    clause_reference: '§4.1.2, Gl. 6',
    description: 'Plan 3: Σ Q_Dr,RÜB über die Regenüberlaufbecken-Zeilen (rechte Seite von Gl. 6); der Vergleich Q_M ≥ Σ ist STAGED (a262e-R-1).',
    verification_quote: L636,
  },
  {
    standard: STD, worksheet: 'A262-06', equation_number: 'A262-06-D2',
    formula: "Q_Dr_RU_sum = sum_rows(ueberlaufbauwerke, if(type == 'rue', q_dr, 0))",
    input_symbols: ['ueberlaufbauwerke'], output_symbol: 'Q_Dr_RU_sum', output_unit: 'l/s',
    clause_reference: '§4.1.2, Gl. 8',
    description: 'Plan 3: Σ Q_Dr,RÜ über die Regenüberlauf-Zeilen (Gl. 8); der Vergleich Q_M ≥ Σ Q_Dr,RÜ ≥ Σ Q_krit ist STAGED (a262e-R-1).',
    verification_quote: L646,
  },
  {
    standard: STD, worksheet: 'A262-06', equation_number: 'A262-06-D3',
    formula: "Q_krit_sum = sum_rows(ueberlaufbauwerke, if(type == 'rue', q_krit, 0))",
    input_symbols: ['ueberlaufbauwerke'], output_symbol: 'Q_krit_sum', output_unit: 'l/s',
    clause_reference: '§4.1.2, Gl. 8',
    description: 'Plan 3: Σ Q_krit über die Regenüberlauf-Zeilen (Gl. 8).',
    verification_quote: L646,
  },
  // ---- A262-08: four-out-of-five rule over the sample register ----
  {
    standard: STD, worksheet: 'A262-08', equation_number: 'A262-08-D1',
    formula: 'csb_last5_ok = count_rows(last_rows(ablaufproben, 5), csb <= 150)',
    input_symbols: ['ablaufproben'], output_symbol: 'csb_last5_ok', output_unit: null,
    clause_reference: '§1',
    description: 'Plan 3: Anzahl der letzten fünf vollständigen Proben mit CSB ≤ 150 mg/l (Größenklasse 1, AbwV); Gate ≥ 4 STAGED (a262e-G-9).',
    verification_quote: L302,
  },
  {
    standard: STD, worksheet: 'A262-08', equation_number: 'A262-08-D2',
    formula: 'bsb5_last5_ok = count_rows(last_rows(ablaufproben, 5), bsb5 <= 40)',
    input_symbols: ['ablaufproben'], output_symbol: 'bsb5_last5_ok', output_unit: null,
    clause_reference: '§1',
    description: 'Plan 3: Anzahl der letzten fünf vollständigen Proben mit BSB5 ≤ 40 mg/l; eine Zeile ohne BSB5-Wert macht die Zählung unentscheidbar (kein stiller Fehlwert); Gate ≥ 4 STAGED (a262e-G-9).',
    verification_quote: L302,
  },
  // ---- A262-15: infiltration pipes ----
  {
    standard: STD, worksheet: 'A262-15', equation_number: 'A262-15-D1',
    formula: 'L_Rieselr_sum = sum_rows(rieselrohre, length_m)',
    input_symbols: ['rieselrohre'], output_symbol: 'L_Rieselr_sum', output_unit: 'm',
    clause_reference: '§4.3.1.6, Tab. 8',
    description: 'Plan 3: Σ Rieselrohrlänge über die Zeilen; Gate Σ L ≥ 6 m/P · EZ STAGED (a262e-G-10).',
    verification_quote: L875,
  },
  {
    standard: STD, worksheet: 'A262-15', equation_number: 'A262-15-D2',
    formula: 'rieselrohr_max_len = max_rows(rieselrohre, length_m)',
    input_symbols: ['rieselrohre'], output_symbol: 'rieselrohr_max_len', output_unit: 'm',
    clause_reference: '§4.3.1.6, Tab. 8',
    description: 'Plan 3: längstes Rieselrohr über die Zeilen; Gate ≤ 18 m STAGED (a262e-G-10).',
    verification_quote: L876,
  },
  // ---- described-but-unregistered scalar rules (text-only, class F) ----
  {
    standard: STD, worksheet: 'A262-11', equation_number: 'A262-11-D1',
    formula: 'A_Fo_min_VFS_KA = EZ * A_Fo_spez_VFS_KA',
    input_symbols: ['EZ', 'A_Fo_spez_VFS_KA'], output_symbol: 'A_Fo_min_VFS_KA', output_unit: 'm²',
    clause_reference: '§4.3.1.2, Tab. 4',
    description: 'Plan 3: erforderliche Filterfläche = EZ · spezifische Fläche (m²/P × P; prod-Beschreibung "A_Fo_min = EW · A_Fo_spez"); Übernahme durch die Gleichung eines bislang manuellen Feldes (a262e-F-1).',
    verification_quote: L804,
  },
  {
    standard: STD, worksheet: 'A262-26', equation_number: 'A262-26-D1',
    formula: 'Q_GW_taeglich = EW_Grauwasser * Q_Grauwasser',
    input_symbols: ['EW_Grauwasser', 'Q_Grauwasser'], output_symbol: 'Q_GW_taeglich', output_unit: 'l/d',
    clause_reference: '§4.1.3',
    description: 'Plan 3: täglicher Grauwasseranfall = EW · spezifischer Anfall (prod-Beschreibung "Q_GW = EW · Q_Grauwasser"); Übernahme eines bislang manuellen Feldes (a262e-F-3).',
    verification_quote: L669,
  },
  {
    standard: STD, worksheet: 'A262-26', equation_number: 'A262-26-D2',
    formula: 'A_Fo_spez_GW = 0.5 * A_Fo_spez',
    input_symbols: ['A_Fo_spez'], output_symbol: 'A_Fo_spez_GW', output_unit: 'm²/P',
    clause_reference: '§4.3.5',
    description: 'Plan 3: spezifische Filterfläche Grauwasser = 50 % der konventionellen spezifischen Fläche (0.5 = "50 %" gedruckt); A_Fo_spez wird erst nach a262e-C-6 auf A262-26 übernommen (a262e-F-4).',
    verification_quote: L1119,
  },
  {
    standard: STD, worksheet: 'A262-21', equation_number: 'A262-21-D1',
    formula: 'A_F_CSB_VFG_KomKA = B_CSB_KomKA * 1000 / f_A_F_CSB_VFG_KomKA',
    input_symbols: ['B_CSB_KomKA', 'f_A_F_CSB_VFG_KomKA'], output_symbol: 'A_F_CSB_VFG_KomKA', output_unit: 'm²',
    clause_reference: '§4.3.3.4 (definitional: f_A,F,CSB per Tab. 10 L937 / Tab. 18 L1228)',
    description: 'Plan 3: erforderliche Fläche nach CSB = Fracht / Flächenbelastung (definitorisch — f_A,F,CSB ist die Fracht je Fläche, Tab. 10 L937 / Tab. 18 L1228; Tab. 12 selbst druckt keine f_A,F,CSB-Zeile; prod-Beschreibung "A_F = B_CSB / f_A_F_CSB"; 1000 = kg/d → g/d, die prod-Einheit von B_CSB_KomKA ist kg/d); B_CSB_KomKA wird erst nach a262e-C-6 auf A262-21 übernommen (a262e-F-5).',
    verification_quote: L937,
  },
  {
    standard: STD, worksheet: 'A262-24', equation_number: 'A262-24-D1',
    formula: 'B_CSB_KomKA = EZ * B_CSB / 1000',
    input_symbols: ['EZ', 'B_CSB'], output_symbol: 'B_CSB_KomKA', output_unit: 'kg/d',
    clause_reference: '§4.1.2, Tab. 1',
    description: 'Plan 3: CSB-Tagesfracht = EZ · einwohnerspezifische Fracht (g/(P·d) × P; 1000 = g → kg, prod-Einheit kg/d); EZ und B_CSB werden erst nach a262e-C-6 auf A262-24 übernommen (a262e-F-6).',
    verification_quote: L614,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
