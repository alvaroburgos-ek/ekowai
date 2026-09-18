/**
 * DWA-M-820-1 — Plan 3 Task 18 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts m820_1` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`; prod holds 0 equations for this standard).
 * Every `verification_quote` is lifted from the transcript
 * `Desktop\Guidelines\DWA-M-820-1\DWA-M_820-1.md` (line in the comment). No row
 * here outputs a symbol prod already asks for (the typed threshold / counts /
 * sums / booleans keep their fields — every pair is a D-block on the sheet).
 *
 * Engine facts the shapes rest on (probed before the pins through the real
 * `evaluateFormula` / `prepareRegisterRows` on the TS fallback tables):
 *   - a prod BOOLEAN is not a formula input (`engineInputValue` → missing): the
 *     § 134 GWB days and the Anh. E.1.4.1 factor are `lookup_fill` twins keyed on
 *     the stringified boolean (field configs), never `if(flag == true, …)` rows;
 *   - an enum reaches `lookup('ANHB23', client_organization_type, …)` as its token
 *     string (amendment D); a zero-input `lookup('S3_9_VGV', 'los_bau', 'wert')`
 *     computes (a178 trap 4);
 *   - `if()` short-circuits: the Tab. D.1 chain's last branch is a deliberate
 *     `lookup('TABD1', 'gt50', …)` miss — costs above 50 Mio. € have no printed row
 *     and read `manual_required` ("keine Zeile … [gt50]"), never a guessed figure;
 *   - `sum_rows` / `max_rows` over an EMPTY register are `manual_required`,
 *     `count_rows` is 0 — so `loseausnahme_code` stays open without lots (no
 *     phantom pass) while the counts read 0;
 *   - an unset boolean cell reads `false` in a row condition (`winner == true`,
 *     `protokoll_signiert == false`);
 *   - a Plan-1 register row with an EMPTY weight breaks `sum_rows(…, gewichtung)`
 *     ("Unbekanntes Symbol") — the upgraded config makes `gewichtung` required
 *     (0 stored rows in prod today); likewise `kategorie` on stakeholder_list;
 *   - no twin is chained on another NEW output: the Tab. D.1 `_ok` codes repeat
 *     the chain inline (Task 16 trap 2).
 *
 * Placement (m277e trap 2): every register-fed row lives on its register's
 * worksheet; the Tab. D.1 pair lives on M820-22 because `estimated_construction_cost`
 * is inherited there and NOT on M820-13 (capture) — the -13 inputs are inherited
 * on -22 too, so the `_ok` codes compare both.
 *
 * NOT emitted (sign-off): `contract_invalidity_code` over the boolean
 * `information_letters_sent` (m820_1-I-1); every switch of a prod gate onto a
 * created code (m820_1-G-1 … G-11, STAGED).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { PREIS_TOKEN } from '../field-configs/m820_1';

const STD = 'DWA-M-820-1';
const WS03 = 'M820-03';
const WS09 = 'M820-09';
const WS13 = 'M820-13';
const WS14 = 'M820-14';
const WS16 = 'M820-16';
const WS18 = 'M820-18';
const WS20 = 'M820-20';
const WS22 = 'M820-22';

// ---- lifted quotes (transcript line in the name) ----
const Q_L465 = 'Besonderer Wert wird in diesem Merkblatt auf die Unterscheidung zwischen dem Konzept und den Projekten gelegt (Bild 1).';
const Q_L555 = String.raw`Die Ungenauigkeit bei den Kostenaufstellungen im Rahmen der Vorplanung kann aufgrund der vorgegebenen geringeren Detailtiefe bei $\pm 25 \%$ oder im Einzelfall noch höher liegen. Dies ist bei Entscheidungen zu berücksichtigen.`;
const Q_L603 = 'Bei jeder Planung gibt es einen Auftraggeber und oftmals mehrere Auftragnehmer. Diese müssen sich als Team verstehen, das sich dem Erfolg des Projekts verpflichtet. Dieses Team arbeitet und plant aber nicht losgelöst, sondern ist in gesetzliche Anforderungen eingebunden. Die Arbeit des Projektteams wirkt auf die Öffentlichkeit. Behörden stellen weitere wesentliche Beteiligte dar. In einer späteren Phase ergänzen ausführende Firmen das Team.';
const Q_L605 = 'Bild 5 veranschaulicht das komplexe Geflecht der Beteiligten. Das erfolgreiche Zusammenspiel der Beteiligten bedarf einer guten Kommunikation und Koordination.';
const Q_L843 = 'Will der Auftraggeber die Ingenieurleistungen nach Qualitätskriterien vergeben, so muss er eine Bewertungskommission einsetzen, weil über diese der Sachverstand zur Beurteilung der angebotenen Qualität geschaffen werden kann. Insbesondere bei VgV-F-Verfahren hat der öffentliche Auftraggeber';
const Q_L844_ZWEI = 'gemäß § 58 Abs .5 VgV mindestens zwei Personen für die Wertung einzusetzen.';
const Q_L844_UNGERADE = 'Die Bewertungskommission sollte überwiegend fachkundig mit einer ungeraden Mitgliederzahl besetzt sein. Alle Mitglieder haben gleiches Stimmrecht.';
const Q_L864 = 'Erreicht oder übersteigt der geschätzte Netto-Gesamtwert den EU-Schwellenwert ist ein VgV-F-Verfahren durchzuführen. Liegt er darunter, hat der Auftraggeber ein Suchverfahren durchzuführen oder er kann in zugelassenen Ausnahmefällen eine Direktvergabe (siehe 8.8) vornehmen.';
const Q_L1000 = 'Nachdem der Auftraggeber aus allen Bewerbungen gemäß seiner Wertung die vorab bekannt gegebene Zahl geeigneter Bewerber ermittelt hat, werden diese zur Abgabe der Erstangebote aufgefordert und mit ihnen Verhandlungsgespräche geführt.';
const Q_L1013 = 'Der Auftraggeber ist verpflichtet, spätestens bei der Aufforderung zur Angebotsabgabe, besser bereits bei der Bekanntmachung, die Zuschlagskriterien und deren Gewichtung anzugeben (§ 127 GWB ).';
const Q_L1025 = 'Die Verhandlungsrunde schließt sich an die Abgabe des Erstangebots an. Weitere Verhandlungsrunden können folgen.';
const Q_L1042 = 'Die Bewertungskommission des Auftraggebers bewertet jedes endgültige Angebot gemäß den Zuschlagskriterien.';
const Q_L1060 = 'Der Auftraggeber trifft eine Entscheidung über die Zuschlagserteilung an denjenigen Bieter, der gemäß den Zuschlagskriterien die höchste Punktzahl erreicht hat.';
const Q_L1255 = 'Die EU-Schwellenwerte werden von der EU-Kommission alle zwei Jahre geprüft und durch Verordnung festgelegt.';
const Q_L1325 = 'In § 106 GWB ist festgelegt, dass das GWB und in Folge die VgV nur gelten, soweit der geschätzte Auftragswert die EU-Schwellenwerte erreicht oder überschreitet.';
const Q_L1327 = 'Die Höhe der Schwellenwerte wird über eine Verweisung auf die jeweils aktuelle EU-Verordnung bestimmt. Die Schwellenwerte werden von der Europäischen Union alle zwei Jahre festgesetzt. Die EU-Schwellenwerte betragen laut Verordnung (EU) 2019/1828 vom 30.10.2019 ab dem 01.01.2020 für Planungsleistungen von Auftraggebern:';
const Q_L1366 = ',,Der [...] Auftraggeber kann bei der Vergabe einzelner Lose von Absatz 7 Satz 3 sowie Absatz 8 abweichen, wenn der geschätzte Nettowert des betreffenden Loses bei Liefer- und Dienstleistungen unter 80000 Euro und bei Bauleistungen unter 1 Million Euro liegt und die Summe der Nettowerte dieser Lose 20 Prozent des Gesamtwertes aller Lose nicht übersteigt."';
const Q_L1368 = String.raw`Soweit also die Teilaufträge insgesamt $20 \%$ des Gesamtauftragswerts und je Teileauftrag 80.000 € nicht überschreiten, können diese nach nationalem Recht vergeben werden.`;
const Q_L1454 = 'Als Deckungssummen für eine Haftpflichtversicherung empfiehlt das für das Bauwesen zuständige Bundesministerium in seinen Vertragsmustern ${ }^{7)}$ im Wesentlichen folgende Beträge, in Abhängigkeit zu den Herstellungskosten (siehe Tabelle D.1).';
const Q_L1464 = String.raw`\hline Geschätzte Baukosten & Deckungssumme für Personenschäden & Deckungssumme für sonstige Schäden \\`;
const Q_L1623_FAKTOR15 = 'Bei großen, langlaufenden Projekten sollte das geforderte Verhältnis Jahresumsatz zu Jahresauftragswert den Faktor 1,5 nicht überschreiten.';
const Q_L1629 = 'Anhaltspunkt für die Höhe der geforderten Versicherungssumme kann Tabelle D. 1 in Anhang D geben. Dabei sind für die Festlegung der Höhe auch projektspezifische Risiken abzuschätzen.';
const Q_L1696 = 'Der Auftraggeber kann bei der Vergabe von Ingenieurleistungen auch den Preis werten, muss es jedoch nicht.';
const Q_L1698 = 'Der Preis ist in diesem Fall kein Zuschlagskriterium mehr.';
const Q_L1757 = 'Hier muss eine Zusammenfassung der Wertung der Bewerber (üblicherweise in Tabellenform) dargestellt werden. Diese sollte mindestens Folgendes enthalten:';
const Q_L1763 = 'I die Erklärung, wer zur Angebotsphase zugelassen wird.';
const Q_L1774 = 'Hier muss eine Zusammenfassung der Wertung der Bieter (üblicherweise in Tabellenform) dargestellt werden.';
const Q_L1780 = 'Das Verhandlungsgespräch jeden Bieters muss zusammengefasst und dargestellt werden sowie die Gründe für die einzelne Bepunktung erläutert werden.';
const Q_L1786 = 'Hier müssen der Name des erfolgreichen Bieters und die Gründe für die Auswahl seines Angebots sowie - falls bekannt - der Anteil am Auftrag, den der erfolgreiche Bieter an Dritte weiterzugeben beabsichtigt, genannt werden.';

/** Tab. D.1 band chain: every bound and every sum read from TABD1 (no number typed; 1000000 = Mio. € → EUR). The last
 * branch reads the non-existent `gt50` row on purpose — no printed row above 50 Mio. € (m820_1-J-2). */
const B = (band: string, col: string) => `lookup('TABD1', '${band}', '${col}')`;
const bandStep = (band: string, col: string, inner: string) => `if(estimated_construction_cost <= ${B(band, 'baukosten_max_mio')} * 1000000, ${B(band, col)} * 1000000, ${inner})`;
export const tabD1Chain = (col: 'personen_mio' | 'sonstige_mio'): string =>
  bandStep('le0_5', col, bandStep('le1_5', col, bandStep('le4', col, bandStep('le10', col, bandStep('le25', col, bandStep('le50', col, `${B('gt50', col)} * 1000000`))))));

/** § 3 Abs. 9 VgV pieces of the lot code (repeated inline — never chained on a new output). */
export const LOSE_AUSNAHME_SUM = 'sum_rows(lose, if(ausnahme == true, netto_wert_eur, 0))';
export const LOSE_GESAMT = 'sum_rows(lose, netto_wert_eur)';
export const LOSE_VERLETZT = 'count_rows(lose, ausnahme == true AND unter_grenze == 0)';
export const LOSE_ANTEIL_MAX = "lookup('S3_9_VGV', 'anteil_pct', 'wert')";

/** §5 categories (the created `kategorie` enum tokens of stakeholder_list). */
const KAT = ['auftraggeber', 'auftragnehmer', 'ausfuehrende_firmen', 'behoerden', 'oeffentlichkeit'] as const;
export const STAKEHOLDER_KATEGORIEN_EXPR = KAT.map((k) => `if(count_rows(stakeholder_list, kategorie == '${k}') >= 1, 1, 0)`).join(' + ');

const row = (worksheet: string, n: string, formula: string, input_symbols: string[], output_unit: string | null, clause_reference: string, description: string, verification_quote: string): EquationEntry => ({
  standard: STD, worksheet, equation_number: n, formula, input_symbols, output_symbol: formula.split(' = ')[0], output_unit, clause_reference, description, verification_quote,
});

export const EQUATIONS: EquationEntry[] = [
  // ---- M820-03 (stakeholder register) ----
  row(WS03, 'M820-03-D1', 'stakeholder_count = count_rows(stakeholder_list)', ['stakeholder_list'], null, '§5.1, Bild 5',
    'Plan 3: Anzahl der Zeilen der Beteiligten-Matrix.', Q_L605),
  row(WS03, 'M820-03-D2', `stakeholder_kategorien_abgedeckt = ${STAKEHOLDER_KATEGORIEN_EXPR}`, ['stakeholder_list'], null, '§5.1–5.6',
    'Plan 3: Anzahl der §5-Kategorien (Auftraggeber, Auftragnehmer, ausführende Firmen, Behörden, Öffentlichkeit), die mindestens eine Zeile tragen (0–5); Vorschlag für REQ-04 STAGED (m820_1-G-5).', Q_L603),

  // ---- M820-09 (Schwellenwertbestimmung) ----
  row(WS09, 'M820-09-D1', 'oberschwellig_code = if(estimated_engineering_fee >= eu_threshold_value, 1, 0)', ['estimated_engineering_fee', 'eu_threshold_value'], null, '§ 8.6; Anhang B.2.3 (§ 106 GWB)',
    'Plan 3: 1 wenn der geschätzte Netto-Gesamtwert den EU-Schwellenwert erreicht oder übersteigt (§ 8.6 "Erreicht oder übersteigt"), sonst 0; Zwilling zu oberschwellig_check / threshold_status — REQ-07 / REQ-08 STAGED (m820_1-G-3).', `${Q_L864} — ${Q_L1325}`),
  row(WS09, 'M820-09-D2', 'cost_estimate_near_threshold_code = if(abs(estimated_engineering_fee - eu_threshold_value) * 100 / eu_threshold_value <= cost_estimate_uncertainty_pct, 1, 0)', ['estimated_engineering_fee', 'eu_threshold_value', 'cost_estimate_uncertainty_pct'], null, '§ 4.2; § 8.5',
    'Plan 3: 1 wenn |Netto-Gesamtwert − Schwellenwert| · 100 / Schwellenwert ≤ Ungenauigkeit der Kostenschätzung (%, M820-04 — die ±25 % sind das gedruckte Beispiel, der Wert bleibt Eingabe); Zwilling zu cost_estimate_near_threshold (m820_1-D-6).', Q_L555),
  row(WS09, 'M820-09-D3', 'eu_threshold_konsistent_code = if(eu_threshold_value == eu_threshold_value_anhb23, 1, 0)', ['eu_threshold_value', 'eu_threshold_value_anhb23'], null, 'Anhang B.2.3',
    'Plan 3: 1 wenn der eingetragene EU-Schwellenwert dem Anh.-B.2.3-Wert zum Organisationstyp entspricht, sonst 0; Gate STAGED (m820_1-G-2).', `${Q_L1327} — ${Q_L1255}`),
  row(WS09, 'M820-09-D4', "lot_value_threshold_services_calc = lookup('S3_9_VGV', 'los_dienstleistung', 'wert')", [], 'EUR', 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
    'Plan 3: die gedruckte Losgrenze für Liefer- und Dienstleistungen (80000 Euro, "unter") als locked Konstante; Zwilling zum editierbaren lot_value_threshold_services (m820_1-D-7).', Q_L1366),
  row(WS09, 'M820-09-D5', "lot_value_threshold_construction_calc = lookup('S3_9_VGV', 'los_bau', 'wert')", [], 'EUR', 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
    'Plan 3: die gedruckte Losgrenze für Bauleistungen (1 Million Euro, "unter") als locked Konstante; Zwilling zu lot_value_threshold_construction (m820_1-D-8).', Q_L1366),
  row(WS09, 'M820-09-D6', "lot_share_threshold_pct_calc = lookup('S3_9_VGV', 'anteil_pct', 'wert')", [], '%', 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
    'Plan 3: der gedruckte Höchstanteil der ausgenommenen Lose (20 Prozent, "nicht übersteigt") als locked Konstante; Zwilling zu lot_share_threshold_pct (m820_1-D-9).', `${Q_L1366} — ${Q_L1368}`),
  row(WS09, 'M820-09-D7', "eu_threshold_review_interval_years_calc = lookup('ANHB11', 'pruefintervall_jahre', 'wert')", [], 'Jahre', 'Anhang B.1.1',
    'Plan 3: das gedruckte Prüfintervall der EU-Schwellenwerte (alle zwei Jahre) als locked Konstante; Zwilling zu eu_threshold_review_interval_years (m820_1-D-10).', `${Q_L1255} — ${Q_L1327}`),
  row(WS09, 'M820-09-D8', 'lose_count = count_rows(lose)', ['lose'], null, 'Anhang B.2.4',
    'Plan 3: Anzahl der erfassten Lose.', Q_L1366),
  row(WS09, 'M820-09-D9', `lose_gesamt_eur = ${LOSE_GESAMT}`, ['lose'], 'EUR', 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
    'Plan 3: Gesamtwert aller Lose = Σ der eingetragenen Nettowerte (Bezugsgröße des § 3 Abs. 9 VgV; nicht der Netto-Gesamtwert der Ingenieurleistungen — m820_1-J-7).', Q_L1366),
  row(WS09, 'M820-09-D10', `lose_ausnahme_sum_eur = ${LOSE_AUSNAHME_SUM}`, ['lose'], 'EUR', 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
    'Plan 3: Summe der Nettowerte der Lose mit Loseausnahme (nicht gesetzte Kästchen zählen 0).', Q_L1366),
  row(WS09, 'M820-09-D11', `lose_ausnahme_anteil_pct = ${LOSE_AUSNAHME_SUM} * 100 / ${LOSE_GESAMT}`, ['lose'], '%', 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
    'Plan 3: Anteil der ausgenommenen Lose am Gesamtwert aller Lose in Prozent (Grenze 20 Prozent, "nicht übersteigt").', `${Q_L1366} — ${Q_L1368}`),
  row(WS09, 'M820-09-D12', 'lose_ausnahme_max_eur = max_rows(lose, if(ausnahme == true, netto_wert_eur, 0))', ['lose'], 'EUR', 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
    'Plan 3: größter Nettowert eines ausgenommenen Loses (0 ohne Ausnahme); die Grenze je Los steht in der Zeile (grenze_eur, nach Art).', Q_L1366),
  row(WS09, 'M820-09-D13', `lose_ausnahme_verletzt = ${LOSE_VERLETZT}`, ['lose'], null, 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
    'Plan 3: Anzahl der ausgenommenen Lose, deren Nettowert die Grenze je Los ("unter 80000 Euro" / "unter 1 Million Euro") erreicht oder überschreitet — strenge Grenze nach dem Gesetzestext (m820_1-J-6).', Q_L1366),
  row(WS09, 'M820-09-D14', `loseausnahme_code = if(${LOSE_VERLETZT} == 0 AND ${LOSE_AUSNAHME_SUM} * 100 / ${LOSE_GESAMT} <= ${LOSE_ANTEIL_MAX}, 1, 0)`, ['lose'], null, 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
    'Plan 3: 1 wenn jedes ausgenommene Los unter seiner Grenze liegt UND die Summe der ausgenommenen Lose höchstens 20 Prozent des Gesamtwertes aller Lose beträgt, sonst 0; ohne Lose offen; Zwilling zu loseausnahme_applicable — REQ-24 STAGED (m820_1-G-4, D-11).', `${Q_L1366} — ${Q_L1368}`),

  // ---- M820-13 (Eignungskriterien) ----
  row(WS13, 'M820-13-D1', 'min_annual_revenue_multiplier_ok = if(min_annual_revenue_multiplier <= min_annual_revenue_multiplier_max, 1, 0)', ['min_annual_revenue_multiplier', 'min_annual_revenue_multiplier_max'], null, 'Anhang E.1.4.1 (§ 45 Abs. 2 VgV)',
    'Plan 3: 1 wenn der geforderte Mindestjahresumsatz-Faktor den Anh.-E.1.4.1-Grenzwert (2 bzw. 1,5 bei großen, langlaufenden Projekten) nicht überschreitet; das schärfere Gate ist STAGED (m820_1-G-7), REQ-12 (≤ 2,0) bleibt.', Q_L1623_FAKTOR15),

  // ---- M820-14 (award criteria register) ----
  row(WS14, 'M820-14-D1', 'award_weight_sum_pct = sum_rows(award_criteria_list, gewichtung)', ['award_criteria_list'], '%', '§ 8.10.3.3 (§ 127 GWB); Anhang E.2',
    'Plan 3: Σ der Gewichtungen aller Zuschlagskriterien; eine Soll-Summe druckt das Merkblatt nicht (m820_1-F-1).', Q_L1013),
  row(WS14, 'M820-14-D2', 'price_weight_calc_pct = sum_rows(award_criteria_list, if(ist_preis == 1, gewichtung, 0))', ['award_criteria_list'], '%', 'Anhang E.2.8',
    'Plan 3: Gewichtung des Preiskriteriums = Σ der Preis-Zeilen (0 ohne Preiskriterium); Zwilling zu price_weight_percent (REQ-15) — m820_1-D-12 / G-1.', `${Q_L1696} — ${Q_L1698}`),
  row(WS14, 'M820-14-D3', 'qualitaets_kriterien_count = count_rows(award_criteria_list, ist_preis == 0)', ['award_criteria_list'], null, 'Anhang E.2',
    'Plan 3: Anzahl der qualitativen (Nicht-Preis-)Zuschlagskriterien; Zwilling zu qualitaets_kriterien_anzahl (M820-11) — m820_1-D-13.', Q_L1696),

  // ---- M820-16 (commission register) ----
  row(WS16, 'M820-16-D1', 'bewertungskommission_size_calc = count_rows(bewertungskommission_members)', ['bewertungskommission_members'], null, '§8.4 (§ 58 Abs. 5 VgV)',
    'Plan 3: Anzahl der Mitglieder der Bewertungskommission; Zwilling zu bewertungskommission_size (REQ-09 "mindestens zwei Personen" bei VgV-F) — m820_1-D-14 / G-8.', `${Q_L843} — ${Q_L844_ZWEI}`),
  row(WS16, 'M820-16-D2', 'bewertungskommission_vorsitz_count = count_rows(bewertungskommission_members, vorsitz == true)', ['bewertungskommission_members'], null, '§8.4',
    'Plan 3: Anzahl der Mitglieder mit Vorsitz; Zwilling zum Textfeld bewertungskommission_chairperson — m820_1-D-15.', Q_L844_UNGERADE),
  row(WS16, 'M820-16-D3', 'bewertungskommission_stimmberechtigt_count = count_rows(bewertungskommission_members, stimmberechtigt == true)', ['bewertungskommission_members'], null, '§8.4',
    'Plan 3: Anzahl der stimmberechtigten Mitglieder ("Alle Mitglieder haben gleiches Stimmrecht").', Q_L844_UNGERADE),
  row(WS16, 'M820-16-D4', 'bewertungskommission_ungerade_code = if(count_rows(bewertungskommission_members) - 2 * floor(count_rows(bewertungskommission_members) / 2) == 1, 1, 0)', ['bewertungskommission_members'], null, '§8.4',
    'Plan 3: 1 bei ungerader Mitgliederzahl, 0 bei gerader oder leerer Kommission — Empfehlung ("sollte"), kein Gate.', Q_L844_UNGERADE),

  // ---- M820-18 (Bewerber register) ----
  row(WS18, 'M820-18-D1', 'applicant_count_calc = count_rows(bewerber)', ['bewerber'], null, 'Anhang F Nr. 6',
    'Plan 3: Anzahl der Bewerber (Zeilen der Wertungsübersicht); Zwilling zu applicant_count (REQ-19) — m820_1-D-16 / G-9.', Q_L1757),
  row(WS18, 'M820-18-D2', 'shortlisted_count_calc = count_rows(bewerber, shortlisted == true)', ['bewerber'], null, 'Anhang F Nr. 6; § 8.10.3.1',
    'Plan 3: Anzahl der zur Angebotsphase zugelassenen Bewerber; Zwilling zu shortlisted_count (REQ-19) — m820_1-D-17 / G-9.', `${Q_L1763} — ${Q_L1000}`),
  row(WS18, 'M820-18-D3', 'final_offers_count_calc = count_rows(bewerber, final_offer == true)', ['bewerber'], null, 'Anhang F Nr. 8; § 8.10.3.4',
    'Plan 3: Anzahl der endgültigen Angebote; Zwilling zu final_offers_count (M820-19, konsumiert von M820-23) — m820_1-D-18.', `${Q_L1042} — ${Q_L1774}`),
  row(WS18, 'M820-18-D4', 'winner_count = count_rows(bewerber, winner == true)', ['bewerber'], null, 'Anhang F Nr. 9; § 8.10.3.6',
    'Plan 3: Anzahl der Zeilen mit Zuschlag (genau ein erfolgreicher Bieter); Zwilling zum Textfeld winning_bidder (M820-23) — m820_1-D-19; Gate "= 1" STAGED (m820_1-G-9).', `${Q_L1060} — ${Q_L1786}`),

  // ---- M820-20 (negotiation register) ----
  row(WS20, 'M820-20-D1', 'negotiation_rounds_calc = max_rows(verhandlungsrunden, runde)', ['verhandlungsrunden'], null, '§ 8.10.3.4',
    'Plan 3: Anzahl der Verhandlungsrunden = höchste eingetragene Rundennummer (ohne Zeile offen); Zwilling zu negotiation_rounds (REQ-20 ≥ 1) — m820_1-D-20 / G-10.', Q_L1025),
  row(WS20, 'M820-20-D2', 'verhandlungsgespraeche_count = count_rows(verhandlungsrunden)', ['verhandlungsrunden'], null, 'Anhang F Nr. 8',
    'Plan 3: Anzahl der dokumentierten Verhandlungsgespräche (Runde × Bieter).', Q_L1780),
  row(WS20, 'M820-20-D3', 'protokolle_unsigniert_count = count_rows(verhandlungsrunden, protokoll_signiert == false)', ['verhandlungsrunden'], null, 'Anhang F Nr. 8',
    'Plan 3: Anzahl der Verhandlungsgespräche ohne signiertes Protokoll (ein nicht gesetztes Kästchen zählt als nicht signiert); Zwilling zum Boolean protokoll_signiert — m820_1-D-24.', Q_L1780),

  // ---- M820-22 (Tab. D.1) ----
  row(WS22, 'M820-22-D1', `liability_personen_tabd1 = ${tabD1Chain('personen_mio')}`, ['estimated_construction_cost'], 'EUR', 'Anhang D, Tab. D.1; Anhang E.1.4.2',
    'Plan 3: Deckungssumme Personenschäden nach Tab. D.1 zur Baukostenstufe (jede Stufe und jeder Betrag aus TABD1; über 50 Mio. € keine gedruckte Zeile → offen, m820_1-J-2); Anhaltswert (RBBau-Empfehlung) — Zwilling zu liability_insurance_personenschaden / haftpflicht_versicherungssumme (m820_1-D-1 / D-3).', `${Q_L1454} — ${Q_L1464}`),
  row(WS22, 'M820-22-D2', `liability_sonstige_tabd1 = ${tabD1Chain('sonstige_mio')}`, ['estimated_construction_cost'], 'EUR', 'Anhang D, Tab. D.1; Anhang E.1.4.2',
    'Plan 3: Deckungssumme sonstige Schäden nach Tab. D.1 zur Baukostenstufe (über 50 Mio. € offen, m820_1-J-2); Zwilling zu liability_insurance_sonstige (m820_1-D-2).', `${Q_L1454} — ${Q_L1464}`),
  row(WS22, 'M820-22-D3', `liability_personen_ok = if(liability_insurance_personenschaden >= ${tabD1Chain('personen_mio')}, 1, 0)`, ['liability_insurance_personenschaden', 'estimated_construction_cost'], null, 'Anhang D, Tab. D.1; Anhang E.1.4.2',
    'Plan 3: 1 wenn die geforderte Deckungssumme Personenschäden den Tab.-D.1-Anhaltswert erreicht (Kette inline, nie auf eine neue Ausgabe verkettet); Vorschlag für REQ-13 STAGED (m820_1-G-11, warn).', Q_L1629),
  row(WS22, 'M820-22-D4', `liability_sonstige_ok = if(liability_insurance_sonstige >= ${tabD1Chain('sonstige_mio')}, 1, 0)`, ['liability_insurance_sonstige', 'estimated_construction_cost'], null, 'Anhang D, Tab. D.1; Anhang E.1.4.2',
    'Plan 3: 1 wenn die geforderte Deckungssumme sonstige Schäden den Tab.-D.1-Anhaltswert erreicht (Kette inline); Vorschlag für REQ-13 STAGED (m820_1-G-11, warn).', Q_L1629),
];

// Q_L465 is the Konzept / Projekt distinction the brief keyed visibility on — kept visible (m820_1-J-5); exported for the test's cue pin.
export const KONZEPT_PROJEKT_CUE = Q_L465;
// The Preis token the badge expr quotes (Task 13b: quoted ⇒ literal).
export const PREIS_LITERAL = PREIS_TOKEN;

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
