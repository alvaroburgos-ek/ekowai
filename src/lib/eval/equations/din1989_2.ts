/**
 * DIN-1989-2 — Plan 3 Task 17 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts din1989_2` (NEW equation
 * rows only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted
 * from the transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-1989-2\DIN-1989-2.md`
 * (line in the comment). No row here outputs a symbol prod already produces
 * (V_Rueck_A / V_Rueck_B / eta_hydr / V_Pruef_leist / eta_hyd_bel / V_Pruef_trenn /
 * eta_Rueck_AB / eta_Verw / eta_C keep their verified rows Gl. 1 … 9).
 *
 * Engine facts the shapes rest on (probed before the pins, see the test):
 *   - the save-path materialiser resolves scalar inputs from the worksheet's OWN
 *     fields only (`materialize-derived.ts` `symbolLookup` over `templateFields`);
 *     an inherited driver such as `filtertyp` on -03 is unresolvable there — so the
 *     Gl. 7 / 8 / 9 twins are three register-only rows (D13 … D15) and the
 *     "Gl. 7 vs Gl. 8/9" switch lives in `visible_when` (field configs) and in the
 *     STAGED gate rewrite (din1989_2-G-4), never in a formula input;
 *   - a register-fed twin is never chained on another NEW output (Task 16 trap 2):
 *     the Σ terms are repeated inline in D13 … D17;
 *   - `masse_verwurf_g` is optional (Typ C only) — `if(x IS NULL, 0, x)` keeps the
 *     Σ decidable on Typ-A / -B rows.
 *
 * NOT emitted (STAGED in scripts/verification/din1989_2-STAGED-plan3-rulings.sql):
 *   - retiring Gl. 1 / 2 (write Q × 25 / Q × 2 into the typed inputs V_Rueck_A / V_Rueck_B)
 *     → din1989_2-R-1; Gl. 4 / 6 likewise → din1989_2-R-3;
 *   - re-pointing Gl. 7 / 8 / 9 to the register sums → din1989_2-R-2;
 *   - re-pointing Gl. 3 / 5 to the register (which step is "the" η is din1989_2-J-2) → din1989_2-R-4.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { SUM_SOLL, SUM_SPEICHER, SUM_VERWURF } from '../field-configs/din1989_2';

const STD = 'DIN-1989-2';
const WS01 = 'DIN-1989-2-01';
const WS02 = 'DIN-1989-2-02';
const WS03 = 'DIN-1989-2-03';

/** Gl. 7 (L642): η_Rück = (Σ ges.Festst − Σ Sp.verunr) / Σ ges.Festst. */
export const ETA_RUECK_EXPR = `(${SUM_SOLL} - ${SUM_SPEICHER}) / ${SUM_SOLL}`;
/** Gl. 8 (L662): η_Verw = Σ Verw / Σ ges.Festst. */
export const ETA_VERW_EXPR = `${SUM_VERWURF} / ${SUM_SOLL}`;
/** Gl. 9 (L671): η_C = 0,5 (Σ ges.Festst − Σ Sp.verunr + Σ Verw) / Σ ges.Festst. */
export const ETA_C_EXPR = `0.5 * (${SUM_SOLL} - ${SUM_SPEICHER} + ${SUM_VERWURF}) / ${SUM_SOLL}`;

export const EQUATIONS: EquationEntry[] = [
  // ---- -01 ----
  {
    standard: STD, worksheet: WS01, equation_number: 'DIN-1989-2-01-D1',
    formula: 'filtertyp_konsistent_code = if(filtertyp == filtertyp_tab1, 1, 0)',
    input_symbols: ['filtertyp', 'filtertyp_tab1'], output_symbol: 'filtertyp_konsistent_code', output_unit: null,
    clause_reference: '§5.3.1, Tab. 1',
    description: 'Plan 3: 1 wenn der gewählte Filtertyp der Tab.-1-Zuordnung (funktionsprinzip × sedimentationsvolumen) entspricht, sonst 0; Gate STAGED (din1989_2-G-5).',
    verification_quote: 'Aufgrund der unterschiedlichen Funktionsprinzipien sind Filter den in Tabelle 1 aufgeführten Typen zuzuordnen.', // L263
  },
  // ---- -02 ----
  {
    standard: STD, worksheet: WS02, equation_number: 'DIN-1989-2-02-D1',
    formula: 'v_rueck_a_min = Q * 25',
    input_symbols: ['Q'], output_symbol: 'v_rueck_a_min', output_unit: 'l',
    clause_reference: '§5.3.2, Gl. 1',
    description: 'Plan 3: erforderliches Einstauvolumen Typ A = Q × 25 s (Gl. 1) als eigenes Feld; V_Rueck_A bleibt die eingetragene Ist-Größe (CR-03 vergleicht beide); Ablösung der Gl. 1 STAGED (din1989_2-R-1).',
    verification_quote: String.raw`V_{\text {Rück }}=Q \times 25 \tag{1}`, // L284 (legend L289–L291: Liter; Q in l/s; 25 Dauer in Sekunden)
  },
  {
    standard: STD, worksheet: WS02, equation_number: 'DIN-1989-2-02-D2',
    formula: 'v_rueck_b_min = Q * 2',
    input_symbols: ['Q'], output_symbol: 'v_rueck_b_min', output_unit: 'l',
    clause_reference: '§5.3.3, Gl. 2',
    description: 'Plan 3: erforderliches Volumen der herausnehmbaren Behältnisse Typ B = Q × 2 s (Gl. 2); V_Rueck_B bleibt die Ist-Größe; Ablösung der Gl. 2 STAGED (din1989_2-R-1).',
    verification_quote: String.raw`V_{\text {Rück }}=Q \times 2 \tag{2}`, // L320
  },
  {
    standard: STD, worksheet: WS02, equation_number: 'DIN-1989-2-02-D3',
    formula: 'behaeltnis_volumen_sum = sum_rows(behaeltnisse, volumen_l)',
    input_symbols: ['behaeltnisse'], output_symbol: 'behaeltnis_volumen_sum', output_unit: 'l',
    clause_reference: '§5.3.3, Gl. 2',
    description: 'Plan 3: Σ Volumen der herausnehmbaren Behältnisse (Zeilen des Registers behaeltnisse) — die Größe, die Gl. 2 mit Q × 2 vergleicht.',
    verification_quote: String.raw`Das Volumen der herausnehmbaren Behältnisse $V_{\text {Rück }}$ muss mindestens betragen:`, // L317
  },
  {
    standard: STD, worksheet: WS02, equation_number: 'DIN-1989-2-02-D4',
    formula: 'behaeltnis_masse_max = max_rows(behaeltnisse, masse_gefuellt_kg)',
    input_symbols: ['behaeltnisse'], output_symbol: 'behaeltnis_masse_max', output_unit: 'kg',
    clause_reference: '§5.3.3',
    description: 'Plan 3: größte Masse eines gefüllten Behältnisses über alle Zeilen (jedes Behältnis muss ≤ 20 kg bleiben); Umstellung von CR-05 STAGED (din1989_2-G-2).',
    verification_quote: 'Die Masse eines planmäßig herausnehmbaren Behältnisses darf im gefüllten Zustand 20 kg nicht überschreiten.', // L311
  },
  {
    standard: STD, worksheet: WS02, equation_number: 'DIN-1989-2-02-D5',
    formula: 'behaeltnis_grifftiefe_max = max_rows(behaeltnisse, grifftiefe_cm, grifftiefe_cm IS NOT NULL)',
    input_symbols: ['behaeltnisse'], output_symbol: 'behaeltnis_grifftiefe_max', output_unit: 'cm',
    clause_reference: '§5.3.3',
    description: 'Plan 3: größte eingetragene Tiefe GOK bis Entnahmeelement (Erdeinbau; Zeilen ohne Eintrag zählen nicht — ohne jeden Eintrag bleibt der Wert offen); Umstellung von CR-06 STAGED (din1989_2-G-2).',
    verification_quote: 'Bei Erdeinbau darf zwischen Geländeoberkante (Schachtabdeckung) und Entnahmeelement (z. B. Haltegriff) eine Tiefe von 60 cm nicht überschritten werden.', // L313
  },
  // ---- -03 ----
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D1',
    formula: 'v_pruef_leist_min = Q_Zu_max * 90',
    input_symbols: ['Q_Zu_max'], output_symbol: 'v_pruef_leist_min', output_unit: 'l',
    clause_reference: '§6.4.6, Gl. 4',
    description: 'Plan 3: Mindestvolumen des Vorlagebehälters für die Leistungsfähigkeitsprüfung = Q_Zu,max × 90 s (Gl. 4 druckt "≥"); V_Pruef_leist bleibt das Ist-Volumen; Ablösung der Gl. 4 STAGED (din1989_2-R-3).',
    verification_quote: String.raw`V_{\text {Prüf }} \geq Q_{\mathrm{Zu}, \max } \times 90 \tag{4}`, // L522 (legend L527–L529: Liter; l/s; 90 Dauer in Sekunden)
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D2',
    formula: 'v_pruef_trenn_min = Q_Zu_max * 180',
    input_symbols: ['Q_Zu_max'], output_symbol: 'v_pruef_trenn_min', output_unit: 'l',
    clause_reference: '§6.5.1, Gl. 6',
    description: 'Plan 3: Mindestvolumen des Vorlagebehälters für die Trennwirkungsprüfung = Q_Zu,max × 180 s (Gl. 6 druckt "≥"); V_Pruef_trenn bleibt das Ist-Volumen; Ablösung der Gl. 6 STAGED (din1989_2-R-3).',
    verification_quote: String.raw`V_{\text {Prüf }} \geq Q_{\text {Zu,max }} \times 180 \tag{6}`, // L615 (legend L620–L623)
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D3',
    formula: 'v_pruef_leist_ok = if(V_Pruef_leist >= Q_Zu_max * 90, 1, 0)',
    input_symbols: ['V_Pruef_leist', 'Q_Zu_max'], output_symbol: 'v_pruef_leist_ok', output_unit: null,
    clause_reference: '§6.4.6, Gl. 4',
    description: 'Plan 3: die gedruckte Ungleichung Gl. 4 als Prüfung (1 = erfüllt); Gate STAGED (din1989_2-G-6).',
    verification_quote: String.raw`V_{\text {Prüf }} \geq Q_{\mathrm{Zu}, \max } \times 90 \tag{4}`, // L522
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D4',
    formula: 'v_pruef_trenn_ok = if(V_Pruef_trenn >= Q_Zu_max * 180, 1, 0)',
    input_symbols: ['V_Pruef_trenn', 'Q_Zu_max'], output_symbol: 'v_pruef_trenn_ok', output_unit: null,
    clause_reference: '§6.5.1, Gl. 6',
    description: 'Plan 3: die gedruckte Ungleichung Gl. 6 als Prüfung (1 = erfüllt); Gate STAGED (din1989_2-G-6).',
    verification_quote: String.raw`V_{\text {Prüf }} \geq Q_{\text {Zu,max }} \times 180 \tag{6}`, // L615
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D5',
    formula: 'prueflaeufe_count = count_rows(prueflaeufe)',
    input_symbols: ['prueflaeufe'], output_symbol: 'prueflaeufe_count', output_unit: null,
    clause_reference: '§6.4.5, Tab. 2',
    description: 'Plan 3: Anzahl der erfassten Prüfläufe (Tab. 2 druckt sieben Stufen; unbelastet und dauerbelastet je einmal — Vollständigkeit ist eine Sichtprüfung, kein Gate).',
    verification_quote: 'Tabelle 2 - Prüfzeiten für Volumenströme', // L483
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D6',
    formula: "eta_hydr_unbel_p100 = min_rows(prueflaeufe, eta_row, belastet == false AND stufe == 'p100')",
    input_symbols: ['prueflaeufe'], output_symbol: 'eta_hydr_unbel_p100', output_unit: null,
    clause_reference: '§5.4.2, §6.4.5, Gl. 3',
    description: 'Plan 3: η_hydr des unbelasteten Systems in der Zeile Stufe 100 % Q_Zu,max (Bezugsgröße Q_max nach §5.4.2; bei mehreren Zeilen der kleinste Wert); welche Stufe der dokumentierte Wert ist, nennt der Text nicht (din1989_2-J-2); Zwilling zu Gl. 3 / eta_hydr_unbel_doku.',
    verification_quote: String.raw`\eta_{\mathrm{hydr}}=\frac{Q_{\mathrm{Zu}}-Q_{\mathrm{Ab}}}{Q_{\mathrm{Zu}}} \tag{3}`, // L509
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D7',
    formula: "eta_hydr_bel_p100 = min_rows(prueflaeufe, eta_row, belastet == true AND stufe == 'p100')",
    input_symbols: ['prueflaeufe'], output_symbol: 'eta_hydr_bel_p100', output_unit: null,
    clause_reference: '§5.4.3, §6.4.6, Gl. 5',
    description: 'Plan 3: η_hyd,bel des dauerbelasteten Systems in der Zeile Stufe 100 % Q_Zu,max (nach 100 Zyklen, Volumenströme und Dauer nach 6.4.5); Zwilling zu Gl. 5 / eta_hydr_bel_doku (din1989_2-J-2).',
    verification_quote: String.raw`\eta_{\text {hyd,bel }}=\frac{Q_{\mathrm{Zu}}-Q_{\mathrm{Ab}}}{Q_{\mathrm{Zu}}} \tag{5}`, // L540
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D8',
    formula: 'eta_hydr_unbel_min = min_rows(prueflaeufe, eta_row, belastet == false)',
    input_symbols: ['prueflaeufe'], output_symbol: 'eta_hydr_unbel_min', output_unit: null,
    clause_reference: '§6.4.5, Gl. 3, Anhang E',
    description: 'Plan 3: kleinster η_hydr über alle unbelasteten Prüfläufe (die sichere Seite der η-Kurve nach Bild E.1; din1989_2-J-2).',
    verification_quote: String.raw`e) des hydraulischen Wirkungsgrades (Darstellung in Diagrammform nach Bild E.1) — \eta_{\mathrm{hydr}}=\frac{Q_{\mathrm{Zu}}-Q_{\mathrm{Ab}}}{Q_{\mathrm{Zu}}} \tag{3}`, // L916 — L509 (Gl. 3, the η the minimum aggregates)
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D9',
    formula: 'eta_hydr_bel_min = min_rows(prueflaeufe, eta_row, belastet == true)',
    input_symbols: ['prueflaeufe'], output_symbol: 'eta_hydr_bel_min', output_unit: null,
    clause_reference: '§6.4.6, Gl. 5, Anhang E',
    description: 'Plan 3: kleinster η_hyd,bel über alle dauerbelasteten Prüfläufe (Bild E.1; din1989_2-J-2).',
    verification_quote: String.raw`2) am dauerbelasteten System (siehe 6.4.6) — \eta_{\text {hyd,bel }}=\frac{Q_{\mathrm{Zu}}-Q_{\mathrm{Ab}}}{Q_{\mathrm{Zu}}} \tag{5}`, // L918 — L540 (Gl. 5)
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D10',
    formula: `m_ges_festst_calc = ${SUM_SOLL}`,
    input_symbols: ['pruefstoffe'], output_symbol: 'm_ges_festst_calc', output_unit: 'g',
    clause_reference: '§6.5.1, Tab. 3, Gl. 7',
    description: 'Plan 3: Σ zugegebene Prüfstoffe = Σ (Konzentration nach Tab. 3 × Prüfmedium) über die Register-Zeilen (bei allen drei Prüfstoffen 0,50 g/l × V); Zwilling zum Skalar m_ges_festst (din1989_2-D-10, R-2).',
    verification_quote: 'Die Menge, Masse und Konzentration des einzelnen Prüfstoffes je 1000 Liter Prüfmedium muss Tabelle 3 entsprechen.', // L530
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D11',
    formula: `m_sp_verunr_calc = ${SUM_SPEICHER}`,
    input_symbols: ['pruefstoffe'], output_symbol: 'm_sp_verunr_calc', output_unit: 'g',
    clause_reference: '§6.5.2, Gl. 7',
    description: 'Plan 3: Σ der im Speicher gefundenen Prüfstoffmassen (Σ Sp.verunr) über die Register-Zeilen; Zwilling zum Skalar m_sp_verunr (din1989_2-D-11, R-2).',
    verification_quote: String.raw`$\Sigma_{\text {Sp.verunr }} \quad$ Summe der ermittelten Masseanteile, die in den Speicher eindringt.`, // L649
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D12',
    formula: `m_verw_calc = ${SUM_VERWURF}`,
    input_symbols: ['pruefstoffe'], output_symbol: 'm_verw_calc', output_unit: 'g',
    clause_reference: '§6.5.2, §6.5.3.2, Gl. 8',
    description: 'Plan 3: Σ der im Verwurf (Abflussleitung) gefundenen Prüfstoffmassen (Σ Verw, Typ C); leere Zellen zählen 0; Zwilling zum Skalar m_verw (din1989_2-D-12, R-2).',
    verification_quote: String.raw`$\Sigma_{\text {Verw }}$ & Summe der in die Abflussleitung eingedrungenen festen Stoffe.`, // L683
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D13',
    formula: `eta_rueck_calc = ${ETA_RUECK_EXPR}`,
    input_symbols: ['pruefstoffe'], output_symbol: 'eta_rueck_calc', output_unit: null,
    clause_reference: '§6.5.3.1, Gl. 7',
    description: 'Plan 3: Gl. 7 über das Register pruefstoffe (Σ-Terme inline) — die Filtertrennwirkung der Typen A / B und der Speicher-Anteil η_Rück der Typ-C-Bilanz; Zwilling zu eta_Rueck_AB (din1989_2-R-2).',
    verification_quote: String.raw`\eta_{\text {Rück,A,B }}=\frac{\sum_{\text {ges.Festst }}-\sum_{\text {Sp.verunr }}}{\sum_{\text {ges.Festst }}} \tag{7}`, // L642
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D14',
    formula: `eta_verw_calc = ${ETA_VERW_EXPR}`,
    input_symbols: ['pruefstoffe'], output_symbol: 'eta_verw_calc', output_unit: null,
    clause_reference: '§6.5.3.2, Gl. 8',
    description: 'Plan 3: Gl. 8 über das Register pruefstoffe (Typ C: Wirksamkeit des Verwurfes); Zwilling zu eta_Verw (din1989_2-R-2).',
    verification_quote: String.raw`\eta_{\text {Verw }}=\frac{\sum_{\text {Verw }}}{\sum_{\text {ges.Festst }}} \tag{8}`, // L662
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D15',
    formula: `eta_c_calc = ${ETA_C_EXPR}`,
    input_symbols: ['pruefstoffe'], output_symbol: 'eta_c_calc', output_unit: null,
    clause_reference: '§6.5.3.2, Gl. 9',
    description: 'Plan 3: Gl. 9 über das Register pruefstoffe (arithmetisches Mittel aus η_Rück und η_Verw, Typ C); Zwilling zu eta_C (din1989_2-R-2).',
    verification_quote: String.raw`\eta_{\mathrm{C}}=0,5\left(\eta_{\text {Rück }}+\eta_{\text {Verw }}\right)=0,5 \frac{\Sigma_{\text {ges.Festst }}-\Sigma_{\text {Sp. veruur }}+\Sigma_{\text {Verw }}}{\Sigma_{\text {ges.Festst }}} \tag{9}`, // L671
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D16',
    formula: `filtertrennwirkung_code_ab = if(${ETA_RUECK_EXPR} >= 0.7, 1, 0)`,
    input_symbols: ['pruefstoffe'], output_symbol: 'filtertrennwirkung_code_ab', output_unit: null,
    clause_reference: '§5.5, §6.5.3.1',
    description: 'Plan 3: Nachweis der Filtertrennwirkung für Typ A / B (η_Rück nach Gl. 7 ≥ 0,7); abgeleiteter Zwilling zum manuellen Boolean filtertrennwirkung_nachgewiesen (CR-08) — Umstellung STAGED (din1989_2-D-2, G-4).',
    verification_quote: 'Hinsichtlich der Abtrennung von Fremdstoffen müssen diese Filter einen Wirkungsgrad von mindestens 0,7 erreichen (siehe 6.5.3).', // L386
  },
  {
    standard: STD, worksheet: WS03, equation_number: 'DIN-1989-2-03-D17',
    formula: `filtertrennwirkung_code_c = if(${ETA_C_EXPR} >= 0.7, 1, 0)`,
    input_symbols: ['pruefstoffe'], output_symbol: 'filtertrennwirkung_code_c', output_unit: null,
    clause_reference: '§5.5, §6.5.3.2',
    description: 'Plan 3: Nachweis der Filtertrennwirkung für Typ C (η_C nach Gl. 9 ≥ 0,7); Zwilling zu filtertrennwirkung_nachgewiesen für Typ C (din1989_2-D-2, G-4).',
    verification_quote: 'Hinsichtlich der Abtrennung von Fremdstoffen müssen diese Filter einen Wirkungsgrad von mindestens 0,7 erreichen (siehe 6.5.3).', // L386
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
