/**
 * DWA-M-820-1 — Plan 3 Task 18 field configs (registers, lookup_fill twins, the
 * three Plan-1 register upgrades, visibility) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts m820_1`.
 *
 * Every `verification_quote` is lifted verbatim (whitespace-normalised) from the
 * transcript `Desktop\Guidelines\DWA-M-820-1\DWA-M_820-1.md`; the line is in the
 * constant's name. Prod facts come from the captured `m820_1.prior.json`
 * (2026-09-18, read-only): 25 worksheets, 120 active fields (39 orphans — the
 * whole of -02, -06 partly, -07, -11 partly, -15, -16 scalars, -19 scalars, -20
 * scalars, -21, -22, -24), section codes A B F J K L M per worksheet (inputs in
 * B, results in F, notes in K), 0 equations, 26 gates (5 with an EMPTY condition:
 * REQ-04 on -01, REQ-11 / -13 / -14 on -10, REQ-24 on -04 — `manual` at runtime).
 * Drivers that reach the worksheets used here (consumer_worksheets, capture):
 * `client_organization_type` → -08 / -09; `estimated_engineering_fee` → -09 / -13;
 * `estimated_construction_cost` → -09 / -22 (NOT -13); `cost_estimate_uncertainty_pct`
 * → -05 / -09; `procurement_procedure` (-10) → -11 / -16 / -17 / -18 / -19;
 * `project_type` → -04 / -05; `liability_insurance_*` (-13) → -22.
 *
 * Already on the mechanism (Plan 1, `20260911120000_selection_configs_DWA_M_820_1.sql`
 * + `SELECTION_CONFIGS`): applicable_legal_bases, exclusion_124_gwb_selected,
 * award_criteria_list, stakeholder_list, alternatives_considered,
 * quality_targets_konzept / _projekt, bewertungskommission_members; risk_register /
 * risk_mitigation_plan are the bespoke editors (m820_1-X-1, untouched). Three of the
 * Plan-1 registers are UPGRADED IN PLACE here (UPDATE entries, column KEYS kept so
 * stored rows survive — 0 stored rows exist for them in prod today, checked
 * read-only): award_criteria_list (+ `ist_preis` badge, required weight, footer),
 * bewertungskommission_members (+ `vorsitz`, footer), stakeholder_list (+ `kategorie`
 * enum over the five §5 parties, footer). Everything else is a `create`.
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/m820_1-STAGED-plan3-rulings.sql):
 *   - re-binding the existing inputs `eu_threshold_value` (consumed by -10, read by
 *     REQ-07) and `required_standstill_days` (consumed by -24) as lookup_fill —
 *     amendment J: twins `eu_threshold_value_anhb23` / `required_standstill_days_gwb`
 *     are created beside the drivers, the re-binds are STAGED (m820_1-E-1 / E-2);
 *   - hiding `price_weight_percent` under `festpreis_used == false` — consumed by -19
 *     AND read by REQ-15 (`price_weight_percent <= 20 OR festpreis_used=true`, not an
 *     IF guard) → refused twice (m820_1-G-1 + C-3); the created `price_weight_calc_pct`
 *     carries the rule instead;
 *   - hiding `publication_date` / `ted_notice_id` (-17) under vgv_f — consumed by -18 /
 *     -24 (producer guard; REQ-18 is already IF-guarded) → m820_1-C-1;
 *   - hiding `procedure_rationale` (-10) for non-Direktvergabe — consumed by -24 →
 *     m820_1-C-2 (with the conditional-required proposal G-6);
 *   - hiding the Bewertungskommission block under vgv_f — refuted by L843 ("Will der
 *     Auftraggeber die Ingenieurleistungen nach Qualitätskriterien vergeben, so muss er
 *     eine Bewertungskommission einsetzen"): the commission is required for every
 *     quality-based award, vgv_f only sharpens the ≥ 2 rule → m820_1-J-4;
 *   - hiding the Konzept / Projekt Bedarfsplanung registers by `project_type` — L465 /
 *     L679 require a Bedarfsplanung for the Konzept AND for every Projekt, a hide rule
 *     would contradict the cue the brief cites → m820_1-J-5 (kept visible);
 *   - `contract_invalidity_code = if(information_letters_sent == false, 1, 0)` — a prod
 *     BOOLEAN is not a formula input (`engineInputValue` → missing), the row would be
 *     `manual_required` forever; REQ-26 already binds both booleans → m820_1-I-1;
 *   - the Tab. D.1 pair sits on M820-22 (where `estimated_construction_cost` IS inherited),
 *     not on M820-13 as the brief placed it (the driver does not reach -13) → the D-pairs
 *     m820_1-D-1 … D-3 and the consumer edit C-4.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';

const STD = 'DWA-M-820-1';

// ---- lifted cue sentences (transcript line in the name) ----
const L555 = String.raw`Die Ungenauigkeit bei den Kostenaufstellungen im Rahmen der Vorplanung kann aufgrund der vorgegebenen geringeren Detailtiefe bei $\pm 25 \%$ oder im Einzelfall noch höher liegen. Dies ist bei Entscheidungen zu berücksichtigen.`;
const L603 = 'Bei jeder Planung gibt es einen Auftraggeber und oftmals mehrere Auftragnehmer. Diese müssen sich als Team verstehen, das sich dem Erfolg des Projekts verpflichtet. Dieses Team arbeitet und plant aber nicht losgelöst, sondern ist in gesetzliche Anforderungen eingebunden. Die Arbeit des Projektteams wirkt auf die Öffentlichkeit. Behörden stellen weitere wesentliche Beteiligte dar. In einer späteren Phase ergänzen ausführende Firmen das Team.';
const L605 = 'Bild 5 veranschaulicht das komplexe Geflecht der Beteiligten. Das erfolgreiche Zusammenspiel der Beteiligten bedarf einer guten Kommunikation und Koordination. Dies garantiert einen reibungslosen Ablauf eines Projekts.';
const L843 = 'Will der Auftraggeber die Ingenieurleistungen nach Qualitätskriterien vergeben, so muss er eine Bewertungskommission einsetzen, weil über diese der Sachverstand zur Beurteilung der angebotenen Qualität geschaffen werden kann. Insbesondere bei VgV-F-Verfahren hat der öffentliche Auftraggeber';
const L844 = 'gemäß § 58 Abs .5 VgV mindestens zwei Personen für die Wertung einzusetzen. Die Bewertungskommission sollte bereits bei der Vorbereitung des Vergabeverfahrens und bei der Festlegung von Eig-nungs- und Zuschlagskriterien und deren Gewichtung eingebunden werden. Die Bewertungskommission sollte überwiegend fachkundig mit einer ungeraden Mitgliederzahl besetzt sein. Alle Mitglieder haben gleiches Stimmrecht.';
const L864 = 'Erreicht oder übersteigt der geschätzte Netto-Gesamtwert den EU-Schwellenwert ist ein VgV-F-Verfahren durchzuführen. Liegt er darunter, hat der Auftraggeber ein Suchverfahren durchzuführen oder er kann in zugelassenen Ausnahmefällen eine Direktvergabe (siehe 8.8) vornehmen.';
const L1000 = 'Nachdem der Auftraggeber aus allen Bewerbungen gemäß seiner Wertung die vorab bekannt gegebene Zahl geeigneter Bewerber ermittelt hat, werden diese zur Abgabe der Erstangebote aufgefordert und mit ihnen Verhandlungsgespräche geführt.';
const L1013 = 'Der Auftraggeber ist verpflichtet, spätestens bei der Aufforderung zur Angebotsabgabe, besser bereits bei der Bekanntmachung, die Zuschlagskriterien und deren Gewichtung anzugeben (§ 127 GWB ).';
const L1025 = 'Die Verhandlungsrunde schließt sich an die Abgabe des Erstangebots an. Weitere Verhandlungsrunden können folgen.';
const L1027 = 'Eine Tagesordnung, aus der sich der Ablauf der Verhandlungsrunde ergibt, ist vom Auftraggeber zu erstellen.';
const L1042 = 'Die Bewertungskommission des Auftraggebers bewertet jedes endgültige Angebot gemäß den Zuschlagskriterien.';
const L1060 = 'Der Auftraggeber trifft eine Entscheidung über die Zuschlagserteilung an denjenigen Bieter, der gemäß den Zuschlagskriterien die höchste Punktzahl erreicht hat.';
const L1064 = 'Der Auftraggeber darf den Vertrag frühestens 15 Kalendertage (bei Versendung auf elektronischem Weg 10 Kalendertage) nach Absendung dieser Informationen schließen (§ 134 Abs. 2 GWB).';
const L1255 = 'Die EU-Schwellenwerte werden von der EU-Kommission alle zwei Jahre geprüft und durch Verordnung festgelegt.';
const L1325 = 'In § 106 GWB ist festgelegt, dass das GWB und in Folge die VgV nur gelten, soweit der geschätzte Auftragswert die EU-Schwellenwerte erreicht oder überschreitet.';
const L1327 = 'Die Höhe der Schwellenwerte wird über eine Verweisung auf die jeweils aktuelle EU-Verordnung bestimmt. Die Schwellenwerte werden von der Europäischen Union alle zwei Jahre festgesetzt. Die EU-Schwellenwerte betragen laut Verordnung (EU) 2019/1828 vom 30.10.2019 ab dem 01.01.2020 für Planungsleistungen von Auftraggebern:';
const L1329 = String.raw`I der obersten oder oberen Bundesbehörden oder vergleichbarer Institutionen $139.000 €$,`;
const L1330 = String.raw`- für alle anderen $214.000 €$.`;
const L1365 = 'Die Aufteilung in Lose regelt § 3 Abs .9 VgV :';
const L1366 = ',,Der [...] Auftraggeber kann bei der Vergabe einzelner Lose von Absatz 7 Satz 3 sowie Absatz 8 abweichen, wenn der geschätzte Nettowert des betreffenden Loses bei Liefer- und Dienstleistungen unter 80000 Euro und bei Bauleistungen unter 1 Million Euro liegt und die Summe der Nettowerte dieser Lose 20 Prozent des Gesamtwertes aller Lose nicht übersteigt."';
const L1368 = String.raw`Soweit also die Teilaufträge insgesamt $20 \%$ des Gesamtauftragswerts und je Teileauftrag 80.000 € nicht überschreiten, können diese nach nationalem Recht vergeben werden.`;
const L1454 = 'Als Deckungssummen für eine Haftpflichtversicherung empfiehlt das für das Bauwesen zuständige Bundesministerium in seinen Vertragsmustern ${ }^{7)}$ im Wesentlichen folgende Beträge, in Abhängigkeit zu den Herstellungskosten (siehe Tabelle D.1).';
const L1462 = 'Tabelle D.1: Deckungssummen für eine Haftpflichtversicherung in Abhängigkeit zu den Herstellungskosten';
const L1464 = String.raw`\hline Geschätzte Baukosten & Deckungssumme für Personenschäden & Deckungssumme für sonstige Schäden \\`;
const L1475 = 'Bei diesen Werten ist zu berücksichtigen, dass die versicherte Summe für Personenschäden gemessen an der heutigen Rechtsprechung zum Schadensersatz sehr niedrig ist. Damit der Planer den eventuell darüber hinaus gehenden Schaden nicht selbst zu tragen hat, sollte dieser im Eigeninteresse höhere Deckungsbeträge mit seiner Versicherung vereinbaren.';
const L1623_ZWEIFACHE = 'Als Mindestjahresumsatz nach § 45 Abs .2 VgV darf der Auftraggeber nicht mehr als das Zweifache des geschätzten Auftragswerts verlangen.';
const L1623_FAKTOR15 = 'Bei großen, langlaufenden Projekten sollte das geforderte Verhältnis Jahresumsatz zu Jahresauftragswert den Faktor 1,5 nicht überschreiten.';
const L1629 = 'Die Höhe der geforderten Versicherungssummen richtet sich nach der Auftragssumme. Anhaltspunkt für die Höhe der geforderten Versicherungssumme kann Tabelle D. 1 in Anhang D geben. Dabei sind für die Festlegung der Höhe auch projektspezifische Risiken abzuschätzen.';
const L1696 = 'Der Auftraggeber kann bei der Vergabe von Ingenieurleistungen auch den Preis werten, muss es jedoch nicht. Wird der Preis gewertet, sollte seine Wertung aber nicht ein so hohes Gewicht erlangen, dass der Preis allein ausschlaggebend für die Vergabeentscheidung wird, weil allein über den Preiswettbewerb keine qualitätsvollen Ingenieurleistungen zu erlangen sind.';
const L1698 = 'Alternative Vorgehensweise: Der Auftraggeber darf nach § 58 Abs. 2 VgV einen Festpreis vorgeben. Die Festpreisvorgabe muss HOAI-konform sein. Der Preis ist in diesem Fall kein Zuschlagskriterium mehr.';
const L1757 = 'Hier muss eine Zusammenfassung der Wertung der Bewerber (üblicherweise in Tabellenform) dargestellt werden. Diese sollte mindestens Folgendes enthalten:';
const L1758_1763 = 'I die Namen der Bewerber, I die Erklärung, ob die Bewerbungen formal in Ordnung sind, I die erreichte Punktzahl, I die Rangfolge der Bewerber nach Wertung und I die Erklärung, wer zur Angebotsphase zugelassen wird.';
const L1774 = 'Hier muss eine Zusammenfassung der Wertung der Bieter (üblicherweise in Tabellenform) dargestellt werden.';
const L1777_1779 = 'I die Namen der Bieter, I die erreichte Punktzahl, I und die Rangfolge der Bieter gemäß der Wertung.';
const L1780 = 'Das Verhandlungsgespräch jeden Bieters muss zusammengefasst und dargestellt werden sowie die Gründe für die einzelne Bepunktung erläutert werden.';
const L1786 = 'Hier müssen der Name des erfolgreichen Bieters und die Gründe für die Auswahl seines Angebots sowie - falls bekannt - der Anteil am Auftrag, den der erfolgreiche Bieter an Dritte weiterzugeben beabsichtigt, genannt werden. Außerdem ist zu begründen, warum die übrigen Angebote der Bieter nicht erfolgreich waren.';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS03 = on('M820-03');
const WS09 = on('M820-09');
const WS13 = on('M820-13');
const WS14 = on('M820-14');
const WS16 = on('M820-16');
const WS18 = on('M820-18');
const WS20 = on('M820-20');
const WS22 = on('M820-22');
const WS23 = on('M820-23');

/** Anh. E.2.2–E.2.8 (L1659 … L1694 headings) — the Plan-1 option strings, kept verbatim (stored rows would carry them). */
export const AWARD_CRITERIA = [
  'Schlüsselpersonal',                                      // L1659 E.2.2
  'Örtliche Bauüberwachung',                                // L1669 E.2.3
  'Organisation der Aufgabenverteilung beim Bieter',        // L1673 E.2.4
  'Darstellung der Projektorganisation',                    // L1680 E.2.5
  'Analyse der Aufgabenstellung durch den Bieter',          // L1684 E.2.6
  'Darstellung der Dokumentation des konkreten Projekts',   // L1690 E.2.7
  'Preis',                                                  // L1694 E.2.8
] as const;
/** The E.2.8 token as it is stored by the Plan-1 enum column — quoted in the badge expr (Task 13b: a quoted RHS is a literal). */
export const PREIS_TOKEN = 'Preis';

/** §5.2–§5.6 (L613 … L654) — the five parties; tokens created here, labels = the printed subsection heads. */
export const STAKEHOLDER_KATEGORIEN = [
  { value: 'auftraggeber', label_de: 'Auftraggeber' },              // L613 §5.2
  { value: 'auftragnehmer', label_de: 'Auftragnehmer' },            // L634 §5.3
  { value: 'ausfuehrende_firmen', label_de: 'Ausführende Firmen' }, // L638 §5.4
  { value: 'behoerden', label_de: 'Behörden' },                     // L644 §5.5
  { value: 'oeffentlichkeit', label_de: 'Öffentlichkeit' },         // L654 §5.6
] as const;
const KATEGORIE_LABELS = Object.fromEntries(STAKEHOLDER_KATEGORIEN.map((k) => [k.value, k.label_de]));

/** § 3 Abs. 9 VgV (L1366): the two printed lot kinds; tokens created here. */
export const LOS_ARTEN = [
  { value: 'dienstleistung', label_de: 'Liefer- und Dienstleistungen (unter 80000 Euro)' },
  { value: 'bau', label_de: 'Bauleistungen (unter 1 Million Euro)' },
] as const;
const LOS_ART_LABELS = Object.fromEntries(LOS_ARTEN.map((k) => [k.value, k.label_de]));

/** Row scope of the `lose` register: the per-lot bound from S3_9_VGV by kind (L1366 "unter" = strict). */
export const LOS_GRENZE_EXPR = "if(art == 'dienstleistung', lookup('S3_9_VGV', 'los_dienstleistung', 'wert'), lookup('S3_9_VGV', 'los_bau', 'wert'))";
export const LOS_UNTER_GRENZE_EXPR = 'if(netto_wert_eur < grenze_eur, 1, 0)';

/** L1698: with a Festpreis the price is no award criterion any more — the created price-weight twin hides. */
const KEIN_FESTPREIS = 'festpreis_used == false';

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- M820-03: the Plan-1 stakeholder register upgraded with the §5 category (keys kept), footer counts ----
  WS03({
    symbol: 'stakeholder_list', widget: 'register',
    ui_config: {
      title: 'Beteiligten-Matrix', subtitle: '§5.1–5.6 · Bild 5 — je Beteiligtem eine Zeile (Kategorie nach §5, Rolle, Verantwortung, Kommunikation)', add_label: '+ Beteiligter', placement: 'bottom',
      columns: [
        { key: 'beteiligter', label: 'Beteiligter', type: 'text', required: true, datalist: STAKEHOLDER_KATEGORIEN.map((k) => k.label_de), placeholder: 'z. B. Auftraggeber' },
        { key: 'kategorie', label: 'Kategorie (§5)', type: 'enum', required: true, options: STAKEHOLDER_KATEGORIEN.map((k) => k.value), option_labels: KATEGORIE_LABELS },
        { key: 'rolle', label: 'Rolle / Funktion', type: 'text' },
        { key: 'verantwortung', label: 'Verantwortung', type: 'text' },
        { key: 'kommunikation', label: 'Kommunikationsweg', type: 'text' },
      ],
      footer: ['stakeholder_count', 'stakeholder_kategorien_abgedeckt'],
      note: `${L603} ${L605}`,
    },
    verification_quote: `${L603} — ${L605}`,
  }),
  WS03({
    symbol: 'stakeholder_count', widget: 'derived', ui_config: null, verification_quote: L605,
    create: { section_code: 'F', label_de: 'Anzahl erfasster Beteiligter', data_type: 'number', unit: null, clause_reference: '§5.1, Bild 5',
      description: 'Plan 3: Ausgabe der Gleichung M820-03-D1 (count_rows über stakeholder_list).' },
  }),
  WS03({
    symbol: 'stakeholder_kategorien_abgedeckt', widget: 'derived', ui_config: null, verification_quote: L603,
    create: { section_code: 'F', label_de: 'Abgedeckte Beteiligten-Kategorien nach §5 (0–5: Auftraggeber, Auftragnehmer, ausführende Firmen, Behörden, Öffentlichkeit)', data_type: 'number', unit: null, clause_reference: '§5.1–5.6',
      description: 'Plan 3: Ausgabe der Gleichung M820-03-D2 (je §5-Kategorie 1, wenn mindestens eine Zeile sie trägt); Vorschlag für REQ-04 (heute leere Bedingung auf M820-01) STAGED (m820_1-G-5).' },
  }),

  // ---- M820-09: threshold twins (Anh. B.2.3), the three codes, the § 3 Abs. 9 VgV constants and the lot register ----
  WS09({
    symbol: 'eu_threshold_value_anhb23', widget: 'lookup_fill', ui_config: { source_label: 'Anh. B.2.3 — Verordnung (EU) 2019/1828, ab 01.01.2020' },
    lookup: { table_code: 'ANHB23', role: 'value', keys: [{ column: 'organisation', from_symbol: 'client_organization_type' }], value: 'schwellenwert_eur' },
    verification_quote: `${L1327} — ${L1329} — ${L1330}`,
    create: { section_code: 'B', label_de: 'EU-Schwellenwert nach Anh. B.2.3 (aus dem Organisationstyp; Stand VO (EU) 2019/1828, ab 01.01.2020)', data_type: 'number', unit: 'EUR', clause_reference: 'Anhang B.2.3 (§ 106 GWB)',
      description: 'Plan 3: Tab.-Zwilling neben dem eingetragenen eu_threshold_value (konsumiert von M820-10, gelesen von REQ-07 — Umbindung STAGED m820_1-E-1); 139.000 € für oberste/obere Bundesbehörden, 214.000 € für alle anderen; die Zuordnung der übrigen Organisationstypen zu "für alle anderen" ist m820_1-J-3; der Wert ist zeitgebunden (alle zwei Jahre neu festgesetzt — m820_1-J-1). Abgleich → eu_threshold_konsistent_code (M820-09-D3).' },
  }),
  WS09({
    symbol: 'eu_threshold_verordnung_anhb23', widget: 'lookup_fill', ui_config: { source_label: 'Anh. B.2.3' },
    lookup: { table_code: 'ANHB23', role: 'value', keys: [{ column: 'organisation', from_symbol: 'client_organization_type' }], value: 'verordnung' },
    verification_quote: `${L1327} — ${L1255}`,
    create: { section_code: 'B', label_de: 'Rechtsgrundlage des EU-Schwellenwerts (Verordnung, wie im Merkblatt gedruckt)', data_type: 'text', unit: null, clause_reference: 'Anhang B.2.3; Anhang B.1.1',
      description: 'Plan 3: die im Merkblatt gedruckte Verordnung zum Schwellenwert (Textzwilling zur Nachvollziehbarkeit der Ausgabe); eine neuere Verordnung ist eine neue Tabellen-Edition, nie eine Änderung aus dem Gedächtnis (m820_1-J-1).' },
  }),
  WS09({
    symbol: 'eu_threshold_konsistent_code', widget: 'derived', ui_config: null, verification_quote: `${L1325} — ${L1327}`,
    create: { section_code: 'F', label_de: 'Eingetragener EU-Schwellenwert = Anh. B.2.3 (1 = ja, 0 = Abweichung)', data_type: 'number', unit: null, clause_reference: 'Anhang B.2.3',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D3 (eu_threshold_value == eu_threshold_value_anhb23); ein Gate auf diesen Wert ist STAGED (m820_1-G-2).' },
  }),
  WS09({
    symbol: 'oberschwellig_code', widget: 'derived', ui_config: null, verification_quote: `${L864} — ${L1325}`,
    create: { section_code: 'F', label_de: 'Oberschwellig nach § 8.6 (1 = Netto-Gesamtwert erreicht oder übersteigt den EU-Schwellenwert, 0 = darunter)', data_type: 'number', unit: null, clause_reference: '§ 8.6; Anhang B.2.3',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D1 (estimated_engineering_fee >= eu_threshold_value); abgeleiteter Zwilling zum manuellen Boolean oberschwellig_check und zum Enum threshold_status — Umstellung von REQ-07 / REQ-08 STAGED (m820_1-G-3, D-4 / D-5).' },
  }),
  WS09({
    symbol: 'cost_estimate_near_threshold_code', widget: 'derived', ui_config: null, verification_quote: L555,
    create: { section_code: 'F', label_de: 'Netto-Gesamtwert innerhalb der Kostenschätzungs-Ungenauigkeit um den Schwellenwert (1 = ja, 0 = nein)', data_type: 'number', unit: null, clause_reference: '§ 4.2; § 8.5',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D2 (|fee − threshold| · 100 / threshold ≤ cost_estimate_uncertainty_pct; die ±25 % sind das gedruckte Beispiel, der Prozentsatz bleibt Eingabe auf M820-04); Zwilling zum manuellen Boolean cost_estimate_near_threshold (m820_1-D-6).' },
  }),
  WS09({
    symbol: 'lot_value_threshold_services_calc', widget: 'derived', ui_config: null, verification_quote: `${L1365} — ${L1366}`,
    create: { section_code: 'B', label_de: 'Grenze je Los — Liefer- und Dienstleistungen (§ 3 Abs. 9 VgV, "unter 80000 Euro")', data_type: 'number', unit: 'EUR', clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D4 (Konstante aus S3_9_VGV, locked); das editierbare lot_value_threshold_services bleibt bis zur Ratifizierung (m820_1-D-7).' },
  }),
  WS09({
    symbol: 'lot_value_threshold_construction_calc', widget: 'derived', ui_config: null, verification_quote: `${L1365} — ${L1366}`,
    create: { section_code: 'B', label_de: 'Grenze je Los — Bauleistungen (§ 3 Abs. 9 VgV, "unter 1 Million Euro")', data_type: 'number', unit: 'EUR', clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D5 (Konstante aus S3_9_VGV, locked); das editierbare lot_value_threshold_construction bleibt bis zur Ratifizierung (m820_1-D-8).' },
  }),
  WS09({
    symbol: 'lot_share_threshold_pct_calc', widget: 'derived', ui_config: null, verification_quote: `${L1366} — ${L1368}`,
    create: { section_code: 'B', label_de: 'Höchstanteil der ausgenommenen Lose am Gesamtwert aller Lose (§ 3 Abs. 9 VgV, 20 Prozent)', data_type: 'number', unit: '%', clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D6 (Konstante aus S3_9_VGV, locked); das editierbare lot_share_threshold_pct bleibt bis zur Ratifizierung (m820_1-D-9).' },
  }),
  WS09({
    symbol: 'eu_threshold_review_interval_years_calc', widget: 'derived', ui_config: null, verification_quote: `${L1255} — ${L1327}`,
    create: { section_code: 'B', label_de: 'Prüfintervall der EU-Schwellenwerte (Anh. B.1.1, "alle zwei Jahre")', data_type: 'number', unit: 'Jahre', clause_reference: 'Anhang B.1.1',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D7 (Konstante aus ANHB11, locked); das editierbare eu_threshold_review_interval_years bleibt bis zur Ratifizierung (m820_1-D-10).' },
  }),
  WS09({
    symbol: 'lose', widget: 'register',
    ui_config: {
      title: 'Lose (Teilaufträge) — Loseausnahme nach § 3 Abs. 9 VgV', subtitle: 'Anhang B.2.4 — je Los Art, geschätzter Nettowert und ob es nach § 3 Abs. 9 VgV national vergeben werden soll; Grenze je Los aus der Tabelle, Anteil der ausgenommenen Lose am Gesamtwert aller Lose', add_label: '+ Los', placement: 'section',
      columns: [
        { key: 'los', label: 'Los / Teilauftrag', type: 'text', required: true },
        { key: 'art', label: 'Art', type: 'enum', required: true, options: LOS_ARTEN.map((a) => a.value), option_labels: LOS_ART_LABELS },
        { key: 'netto_wert_eur', label: 'Geschätzter Nettowert', type: 'number', unit: 'EUR', required: true, min: 0, aria_label: 'geschätzter Nettowert des Loses' },
        { key: 'ausnahme', label: 'Loseausnahme (national vergeben)', type: 'boolean' },
        { key: 'grenze_eur', label: 'Grenze je Los (§ 3 Abs. 9 VgV)', type: 'derived', expr: LOS_GRENZE_EXPR, unit: 'EUR' },
        { key: 'unter_grenze', label: 'unter der Grenze', type: 'derived', expr: LOS_UNTER_GRENZE_EXPR, display: 'badge', value_labels: { '1': 'unter der Losgrenze', '0': 'Losgrenze erreicht oder überschritten' } },
      ],
      footer: ['lose_count', 'lose_gesamt_eur', 'lose_ausnahme_sum_eur', 'lose_ausnahme_anteil_pct', 'lose_ausnahme_max_eur', 'lose_ausnahme_verletzt', 'loseausnahme_code'],
      note: `${L1366} Gesamtwert aller Lose = Σ der eingetragenen Nettowerte (Bezugsgröße des Gesetzestextes, nicht der Netto-Gesamtwert der Ingenieurleistungen — m820_1-J-7); "unter" = strenge Grenze je Los (m820_1-J-6).`,
    },
    verification_quote: `${L1365} — ${L1366} — ${L1368}`,
    create: { section_code: 'B', label_de: 'Lose (Teilaufträge) nach § 3 Abs. 9 VgV', data_type: 'json', unit: null, clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
      description: 'Plan 3: Zeilen je Los (Art, Nettowert, Loseausnahme); Grenze je Los aus S3_9_VGV; Σ / Anteil / Maximum / Verletzungen → lose_* (M820-09-D8 … D13), loseausnahme_code (M820-09-D14) als abgeleiteter Zwilling zum manuellen Boolean loseausnahme_applicable — Umstellung und REQ-24 (heute leere Bedingung auf M820-04) STAGED (m820_1-D-11, G-4).' },
  }),
  WS09({
    symbol: 'lose_count', widget: 'derived', ui_config: null, verification_quote: L1365,
    create: { section_code: 'F', label_de: 'Anzahl erfasster Lose', data_type: 'number', unit: null, clause_reference: 'Anhang B.2.4',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D8 (count_rows über lose).' },
  }),
  WS09({
    symbol: 'lose_gesamt_eur', widget: 'derived', ui_config: null, verification_quote: L1366,
    create: { section_code: 'F', label_de: 'Gesamtwert aller Lose (Σ Nettowerte)', data_type: 'number', unit: 'EUR', clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D9 (sum_rows über lose.netto_wert_eur) — die Bezugsgröße "Gesamtwertes aller Lose" des § 3 Abs. 9 VgV.' },
  }),
  WS09({
    symbol: 'lose_ausnahme_sum_eur', widget: 'derived', ui_config: null, verification_quote: L1366,
    create: { section_code: 'F', label_de: 'Summe der Nettowerte der ausgenommenen Lose', data_type: 'number', unit: 'EUR', clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D10 (Σ über Zeilen mit Loseausnahme).' },
  }),
  WS09({
    symbol: 'lose_ausnahme_anteil_pct', widget: 'derived', ui_config: null, verification_quote: `${L1366} — ${L1368}`,
    create: { section_code: 'F', label_de: 'Anteil der ausgenommenen Lose am Gesamtwert aller Lose (Grenze 20 Prozent)', data_type: 'number', unit: '%', clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D11 (Σ ausgenommen · 100 / Σ alle Lose).' },
  }),
  WS09({
    symbol: 'lose_ausnahme_max_eur', widget: 'derived', ui_config: null, verification_quote: L1366,
    create: { section_code: 'F', label_de: 'Größter Nettowert eines ausgenommenen Loses', data_type: 'number', unit: 'EUR', clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D12 (max_rows über die ausgenommenen Zeilen; 0 ohne Ausnahme).' },
  }),
  WS09({
    symbol: 'lose_ausnahme_verletzt', widget: 'derived', ui_config: null, verification_quote: L1366,
    create: { section_code: 'F', label_de: 'Ausgenommene Lose auf oder über der Losgrenze (Anzahl)', data_type: 'number', unit: null, clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D13 (count_rows über ausgenommene Zeilen, deren Nettowert die Grenze je Los erreicht oder überschreitet).' },
  }),
  WS09({
    symbol: 'loseausnahme_code', widget: 'derived', ui_config: null, verification_quote: `${L1366} — ${L1368}`,
    create: { section_code: 'F', label_de: 'Loseausnahme nach § 3 Abs. 9 VgV eingehalten (1 = jedes ausgenommene Los unter der Grenze UND Anteil ≤ 20 Prozent, 0 = nein)', data_type: 'number', unit: null, clause_reference: 'Anhang B.2.4 (§ 3 Abs. 9 VgV)',
      description: 'Plan 3: Ausgabe der Gleichung M820-09-D14; Zwilling zum manuellen Boolean loseausnahme_applicable (konsumiert von M820-10) — Umstellung und REQ-24 STAGED (m820_1-D-11, G-4). Ohne eingetragene Lose bleibt der Wert offen (kein Phantom-Bestehen).' },
  }),

  // ---- M820-13: the Anh. E.1.4.1 revenue-factor limit beside the typed multiplier ----
  WS13({
    symbol: 'min_annual_revenue_multiplier_max', widget: 'lookup_fill', ui_config: { source_label: 'Anh. E.1.4.1 (§ 45 Abs. 2 VgV / Faktor 1,5)' },
    lookup: { table_code: 'E1_4_1_UMSATZ', role: 'limit', keys: [{ column: 'grossprojekt', from_symbol: 'large_long_project' }], value: 'faktor_max' },
    verification_quote: `${L1623_ZWEIFACHE} — ${L1623_FAKTOR15}`,
    create: { section_code: 'B', label_de: 'Höchstzulässiger Mindestjahresumsatz-Faktor (2 nach § 45 Abs. 2 VgV; 1,5 bei großen, langlaufenden Projekten — "sollte")', data_type: 'number', unit: null, clause_reference: 'Anhang E.1.4.1 (§ 45 Abs. 2 VgV)',
      description: 'Plan 3: Grenzwert aus E1_4_1_UMSATZ zum Boolean large_long_project (der Boolean ist kein Formeleingang — die Tabelle schlüsselt auf den stringifizierten Wert); Prüfung → min_annual_revenue_multiplier_ok (M820-13-D1); die 1,5 ist eine Empfehlung ("sollte", Tabelle anhaltswert — m820_1-O-1), REQ-12 (≤ 2,0) bleibt; das schärfere Gate ist STAGED (m820_1-G-7).' },
  }),
  WS13({
    symbol: 'min_annual_revenue_multiplier_ok', widget: 'derived', ui_config: null, verification_quote: L1623_FAKTOR15,
    create: { section_code: 'B', label_de: 'Geforderter Mindestjahresumsatz-Faktor ≤ Anh. E.1.4.1 (1 = ja, 0 = überschritten)', data_type: 'number', unit: null, clause_reference: 'Anhang E.1.4.1',
      description: 'Plan 3: Ausgabe der Gleichung M820-13-D1 (min_annual_revenue_multiplier <= min_annual_revenue_multiplier_max).' },
  }),

  // ---- M820-14: the Plan-1 award-criteria register upgraded (Preis badge, required weight, footer Σ) ----
  WS14({
    symbol: 'award_criteria_list', widget: 'register',
    ui_config: {
      title: 'Zuschlagskriterien', subtitle: 'Anhang E.2 — Kriterien mit Gewichtung (§ 127 GWB: spätestens mit der Aufforderung zur Angebotsabgabe anzugeben)', add_label: '+ Zuschlagskriterium', placement: 'bottom',
      columns: [
        { key: 'kriterium', label: 'Kriterium', type: 'enum', required: true, options: [...AWARD_CRITERIA] },
        { key: 'gewichtung', label: 'Gewichtung (%)', type: 'number', unit: '%', required: true, min: 0, max: 100, width: 'w-28', aria_label: 'Gewichtung des Kriteriums in Prozent' },
        { key: 'anmerkung', label: 'Anmerkung', type: 'text' },
        { key: 'ist_preis', label: 'Preis', type: 'derived', expr: `if(kriterium == '${PREIS_TOKEN}', 1, 0)`, display: 'badge', value_labels: { '1': 'Preiskriterium (E.2.8)', '0': '' } },
      ],
      footer: ['award_weight_sum_pct', 'price_weight_calc_pct', 'qualitaets_kriterien_count'],
      note: `${L1013} ${L1696} ${L1698} Eine Summe von 100 % nennt das Merkblatt nicht (m820_1-F-1) — die Σ wird nur angezeigt.`,
    },
    verification_quote: `${L1013} — ${L1696} — ${L1698}`,
  }),
  WS14({
    symbol: 'award_weight_sum_pct', widget: 'derived', ui_config: null, verification_quote: L1013,
    create: { section_code: 'F', label_de: 'Σ Gewichtung der Zuschlagskriterien', data_type: 'number', unit: '%', clause_reference: '§ 8.10.3.3 (§ 127 GWB); Anhang E.2',
      description: 'Plan 3: Ausgabe der Gleichung M820-14-D1 (sum_rows über award_criteria_list.gewichtung); eine Soll-Summe druckt das Merkblatt nicht (m820_1-F-1).' },
  }),
  WS14({
    symbol: 'price_weight_calc_pct', widget: 'derived', ui_config: null, visible_when: KEIN_FESTPREIS, verification_quote: `${L1696} — ${L1698}`,
    create: { section_code: 'F', label_de: 'Gewichtung des Preiskriteriums aus dem Register (Σ der Preis-Zeilen)', data_type: 'number', unit: '%', clause_reference: 'Anhang E.2.8',
      description: 'Plan 3: Ausgabe der Gleichung M820-14-D2 (Σ gewichtung der Zeilen mit kriterium = Preis); Zwilling zum manuellen price_weight_percent (konsumiert von M820-19, gelesen von REQ-15) — Umstellung STAGED (m820_1-D-12, G-1); bei Festpreis ausgeblendet (L1698).' },
  }),
  WS14({
    symbol: 'qualitaets_kriterien_count', widget: 'derived', ui_config: null, verification_quote: L1696,
    create: { section_code: 'F', label_de: 'Anzahl qualitativer Zuschlagskriterien (Zeilen ohne Preis)', data_type: 'number', unit: null, clause_reference: 'Anhang E.2',
      description: 'Plan 3: Ausgabe der Gleichung M820-14-D3 (count_rows über Zeilen mit ist_preis = 0); Zwilling zum manuellen qualitaets_kriterien_anzahl auf M820-11 (m820_1-D-13).' },
  }),

  // ---- M820-16: the Plan-1 commission register upgraded (Vorsitz flag, footer) ----
  WS16({
    symbol: 'bewertungskommission_members', widget: 'register',
    ui_config: {
      title: 'Bewertungskommission', subtitle: '§8.4 — überwiegend fachkundig, ungerade Mitgliederzahl, gleiches Stimmrecht; bei VgV-F-Verfahren mindestens zwei Personen', add_label: '+ Mitglied', placement: 'bottom',
      columns: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'funktion', label: 'Funktion / Rolle', type: 'text' },
        { key: 'sachverstand', label: 'Sachverstand', type: 'text' },
        { key: 'stimmberechtigt', label: 'Stimmberechtigt', type: 'boolean' },
        { key: 'vorsitz', label: 'Vorsitz', type: 'boolean' },
      ],
      footer: ['bewertungskommission_size_calc', 'bewertungskommission_vorsitz_count', 'bewertungskommission_stimmberechtigt_count', 'bewertungskommission_ungerade_code'],
      note: `${L843} ${L844}`,
    },
    verification_quote: `${L843} — ${L844}`,
  }),
  WS16({
    symbol: 'bewertungskommission_size_calc', widget: 'derived', ui_config: null, verification_quote: `${L843} — ${L844}`,
    create: { section_code: 'F', label_de: 'Anzahl Mitglieder der Bewertungskommission (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§8.4 (§ 58 Abs. 5 VgV)',
      description: 'Plan 3: Ausgabe der Gleichung M820-16-D1 (count_rows über bewertungskommission_members); Zwilling zum manuellen bewertungskommission_size (gelesen von REQ-09) — Umstellung STAGED (m820_1-D-14, G-8).' },
  }),
  WS16({
    symbol: 'bewertungskommission_vorsitz_count', widget: 'derived', ui_config: null, verification_quote: L844,
    create: { section_code: 'F', label_de: 'Mitglieder mit Vorsitz (Anzahl)', data_type: 'number', unit: null, clause_reference: '§8.4',
      description: 'Plan 3: Ausgabe der Gleichung M820-16-D2 (count_rows über vorsitz = true); Zwilling zum Textfeld bewertungskommission_chairperson (m820_1-D-15).' },
  }),
  WS16({
    symbol: 'bewertungskommission_stimmberechtigt_count', widget: 'derived', ui_config: null, verification_quote: L844,
    create: { section_code: 'F', label_de: 'Stimmberechtigte Mitglieder (Anzahl)', data_type: 'number', unit: null, clause_reference: '§8.4',
      description: 'Plan 3: Ausgabe der Gleichung M820-16-D3 (count_rows über stimmberechtigt = true) — "Alle Mitglieder haben gleiches Stimmrecht".' },
  }),
  WS16({
    symbol: 'bewertungskommission_ungerade_code', widget: 'derived', ui_config: null, verification_quote: L844,
    create: { section_code: 'F', label_de: 'Ungerade Mitgliederzahl (1 = ja, 0 = gerade oder leer) — "sollte"', data_type: 'number', unit: null, clause_reference: '§8.4',
      description: 'Plan 3: Ausgabe der Gleichung M820-16-D4 (Anzahl − 2·floor(Anzahl/2) = 1); Empfehlung ("sollte … mit einer ungeraden Mitgliederzahl besetzt sein"), kein Gate.' },
  }),

  // ---- M820-18: the Bewerber / Bieter register (Anh. F §6 / §8 / §9) and its counts ----
  WS18({
    symbol: 'bewerber', widget: 'register',
    ui_config: {
      title: 'Bewerber und Bieter — Wertungsübersicht (Anhang F, Nr. 6 / 8 / 9)', subtitle: 'je Bewerber eine Zeile: formale Prüfung, §§ 123 / 124 GWB, Eignungspunkte und Rang, Zulassung zur Angebotsphase, Angebotspunkte, endgültiges Angebot, Zuschlag', add_label: '+ Bewerber', placement: 'section',
      columns: [
        { key: 'name', label: 'Name des Bewerbers / Bieters', type: 'text', required: true },
        { key: 'formal_ok', label: 'Bewerbung formal in Ordnung', type: 'boolean' },
        { key: 'p123_ok', label: 'kein Ausschluss § 123 GWB', type: 'boolean' },
        { key: 'p124_ok', label: 'kein Ausschluss § 124 GWB', type: 'boolean' },
        { key: 'eignung_punkte', label: 'Punktzahl Eignung', type: 'number', min: 0, aria_label: 'erreichte Punktzahl in der Eignungswertung' },
        { key: 'rang', label: 'Rang (Eignung)', type: 'number', min: 1, aria_label: 'Rangfolge nach der Eignungswertung' },
        { key: 'shortlisted', label: 'zur Angebotsphase zugelassen', type: 'boolean' },
        { key: 'angebot_punkte', label: 'Punktzahl Angebot', type: 'number', min: 0, aria_label: 'erreichte Punktzahl in der Angebotswertung' },
        { key: 'final_offer', label: 'endgültiges Angebot abgegeben', type: 'boolean' },
        { key: 'winner', label: 'Zuschlag', type: 'boolean' },
      ],
      footer: ['applicant_count_calc', 'shortlisted_count_calc', 'final_offers_count_calc', 'winner_count'],
      note: `${L1757} ${L1758_1763} ${L1774} ${L1777_1779} ${L1060}`,
    },
    verification_quote: `${L1757} — ${L1758_1763} — ${L1774} — ${L1777_1779} — ${L1786}`,
    create: { section_code: 'B', label_de: 'Bewerber und Bieter (Wertungsübersicht nach Anhang F)', data_type: 'json', unit: null, clause_reference: 'Anhang F Nr. 6, 8, 9; § 8.10.2.4; § 8.10.3.6',
      description: 'Plan 3: Zeilen je Bewerber (Name, formale Prüfung, §§ 123/124, Punkte, Rang, Zulassung, endgültiges Angebot, Zuschlag); Ausgaben applicant_count_calc / shortlisted_count_calc / final_offers_count_calc / winner_count (M820-18-D1 … D4) als Zwillinge zu applicant_count, shortlisted_count (M820-18), final_offers_count (M820-19) und winning_bidder (M820-23) — Umstellungen und REQ-19 STAGED (m820_1-D-16 … D-19, G-9).' },
  }),
  WS18({
    symbol: 'applicant_count_calc', widget: 'derived', ui_config: null, verification_quote: `${L1757} — ${L1758_1763}`,
    create: { section_code: 'F', label_de: 'Anzahl Bewerber (aus dem Register)', data_type: 'number', unit: null, clause_reference: 'Anhang F Nr. 6',
      description: 'Plan 3: Ausgabe der Gleichung M820-18-D1 (count_rows über bewerber); Zwilling zu applicant_count (gelesen von REQ-19) — m820_1-D-16 / G-9.' },
  }),
  WS18({
    symbol: 'shortlisted_count_calc', widget: 'derived', ui_config: null, verification_quote: `${L1000} — ${L1758_1763}`,
    create: { section_code: 'F', label_de: 'Zur Angebotsphase zugelassene Bewerber (aus dem Register)', data_type: 'number', unit: null, clause_reference: 'Anhang F Nr. 6; § 8.10.3.1',
      description: 'Plan 3: Ausgabe der Gleichung M820-18-D2 (count_rows über shortlisted = true); Zwilling zu shortlisted_count (gelesen von REQ-19) — m820_1-D-17 / G-9.' },
  }),
  WS18({
    symbol: 'final_offers_count_calc', widget: 'derived', ui_config: null, verification_quote: `${L1042} — ${L1774}`,
    create: { section_code: 'F', label_de: 'Endgültige Angebote (aus dem Register)', data_type: 'number', unit: null, clause_reference: 'Anhang F Nr. 8; § 8.10.3.4',
      description: 'Plan 3: Ausgabe der Gleichung M820-18-D3 (count_rows über final_offer = true); Zwilling zu final_offers_count auf M820-19 (konsumiert von M820-23) — m820_1-D-18.' },
  }),
  WS18({
    symbol: 'winner_count', widget: 'derived', ui_config: null, verification_quote: `${L1060} — ${L1786}`,
    create: { section_code: 'F', label_de: 'Zeilen mit Zuschlag (Anzahl; genau ein erfolgreicher Bieter)', data_type: 'number', unit: null, clause_reference: 'Anhang F Nr. 9; § 8.10.3.6',
      description: 'Plan 3: Ausgabe der Gleichung M820-18-D4 (count_rows über winner = true); Zwilling zum Textfeld winning_bidder auf M820-23 — m820_1-D-19; ein Gate "= 1" ist STAGED (m820_1-G-9).' },
  }),

  // ---- M820-20: the negotiation register (round × bidder) and its aggregates ----
  WS20({
    symbol: 'verhandlungsrunden', widget: 'register',
    ui_config: {
      title: 'Verhandlungsgespräche (Runde × Bieter)', subtitle: '§ 8.10.3.4 / Anhang F Nr. 8 — je Verhandlungsgespräch eine Zeile: Runde, Bieter, Datum, Thema, Ergebnis, Protokoll signiert', add_label: '+ Verhandlungsgespräch', placement: 'section',
      columns: [
        { key: 'runde', label: 'Runde', type: 'number', required: true, min: 1, aria_label: 'Nummer der Verhandlungsrunde' },
        { key: 'bieter', label: 'Bieter', type: 'text', required: true },
        { key: 'datum', label: 'Datum', type: 'date' },
        { key: 'thema', label: 'Hauptthema / Tagesordnung', type: 'text' },
        { key: 'ergebnis', label: 'Ergebnis / Zusammenfassung', type: 'text' },
        { key: 'protokoll_signiert', label: 'Protokoll signiert', type: 'boolean' },
      ],
      footer: ['negotiation_rounds_calc', 'verhandlungsgespraeche_count', 'protokolle_unsigniert_count'],
      note: `${L1025} ${L1027} ${L1780} Anzahl Runden = höchste eingetragene Rundennummer.`,
    },
    verification_quote: `${L1025} — ${L1027} — ${L1780}`,
    create: { section_code: 'B', label_de: 'Verhandlungsgespräche (Runde × Bieter, Anhang F Nr. 8)', data_type: 'json', unit: null, clause_reference: '§ 8.10.3.4; Anhang F Nr. 8',
      description: 'Plan 3: Zeilen je Verhandlungsgespräch; Ausgaben negotiation_rounds_calc (max Runde, M820-20-D1), verhandlungsgespraeche_count (-D2), protokolle_unsigniert_count (-D3) als Zwillinge zum Skalarsatz negotiation_rounds / verhandlung_datum / verhandlung_thema / verhandlung_ergebnis / protokoll_signiert — Umstellungen und REQ-20 STAGED (m820_1-D-20 … D-24, G-10).' },
  }),
  WS20({
    symbol: 'negotiation_rounds_calc', widget: 'derived', ui_config: null, verification_quote: L1025,
    create: { section_code: 'F', label_de: 'Anzahl Verhandlungsrunden (höchste Rundennummer im Register)', data_type: 'number', unit: null, clause_reference: '§ 8.10.3.4',
      description: 'Plan 3: Ausgabe der Gleichung M820-20-D1 (max_rows über runde; ohne Zeile offen); Zwilling zu negotiation_rounds (gelesen von REQ-20) — m820_1-D-20 / G-10.' },
  }),
  WS20({
    symbol: 'verhandlungsgespraeche_count', widget: 'derived', ui_config: null, verification_quote: L1780,
    create: { section_code: 'F', label_de: 'Anzahl dokumentierter Verhandlungsgespräche', data_type: 'number', unit: null, clause_reference: 'Anhang F Nr. 8',
      description: 'Plan 3: Ausgabe der Gleichung M820-20-D2 (count_rows über verhandlungsrunden) — "Das Verhandlungsgespräch jeden Bieters muss zusammengefasst und dargestellt werden".' },
  }),
  WS20({
    symbol: 'protokolle_unsigniert_count', widget: 'derived', ui_config: null, verification_quote: L1780,
    create: { section_code: 'F', label_de: 'Verhandlungsgespräche ohne signiertes Protokoll (Anzahl)', data_type: 'number', unit: null, clause_reference: 'Anhang F Nr. 8',
      description: 'Plan 3: Ausgabe der Gleichung M820-20-D3 (count_rows über protokoll_signiert = false; ein nicht gesetztes Kästchen zählt als nicht signiert).' },
  }),

  // ---- M820-22: Tab. D.1 Anhaltswerte beside the inherited required sums ----
  WS22({
    symbol: 'liability_personen_tabd1', widget: 'derived', ui_config: null, verification_quote: `${L1454} — ${L1462} — ${L1464}`,
    create: { section_code: 'B', label_de: 'Deckungssumme Personenschäden nach Tab. D.1 (Anhaltswert aus den geschätzten Baukosten)', data_type: 'number', unit: 'EUR', clause_reference: 'Anhang D, Tab. D.1; Anhang E.1.4.2',
      description: 'Plan 3: Ausgabe der Gleichung M820-22-D1 (Stufenkette über TABD1 nach estimated_construction_cost; Baukosten über 50 Mio. € haben keine gedruckte Zeile → offen, m820_1-J-2); Anhaltswert (RBBau-Empfehlung, L1454 / L1629) neben dem eingetragenen liability_insurance_personenschaden (M820-13) und haftpflicht_versicherungssumme — m820_1-D-1 … D-3.' },
  }),
  WS22({
    symbol: 'liability_sonstige_tabd1', widget: 'derived', ui_config: null, verification_quote: `${L1454} — ${L1462} — ${L1464}`,
    create: { section_code: 'B', label_de: 'Deckungssumme sonstige Schäden nach Tab. D.1 (Anhaltswert aus den geschätzten Baukosten)', data_type: 'number', unit: 'EUR', clause_reference: 'Anhang D, Tab. D.1; Anhang E.1.4.2',
      description: 'Plan 3: Ausgabe der Gleichung M820-22-D2 (Stufenkette über TABD1; über 50 Mio. € offen — m820_1-J-2); Anhaltswert neben dem eingetragenen liability_insurance_sonstige (M820-13) — m820_1-D-2.' },
  }),
  WS22({
    symbol: 'liability_personen_ok', widget: 'derived', ui_config: null, verification_quote: `${L1629} — ${L1475}`,
    create: { section_code: 'F', label_de: 'Geforderte Deckungssumme Personenschäden ≥ Tab. D.1 (1 = ja, 0 = darunter)', data_type: 'number', unit: null, clause_reference: 'Anhang D, Tab. D.1; Anhang E.1.4.2',
      description: 'Plan 3: Ausgabe der Gleichung M820-22-D3 (liability_insurance_personenschaden ≥ Tab.-D.1-Wert, Kette inline); Vorschlag für REQ-13 (heute leere Bedingung auf M820-10) STAGED (m820_1-G-11) — Anhaltswert, daher warn.' },
  }),
  WS22({
    symbol: 'liability_sonstige_ok', widget: 'derived', ui_config: null, verification_quote: L1629,
    create: { section_code: 'F', label_de: 'Geforderte Deckungssumme sonstige Schäden ≥ Tab. D.1 (1 = ja, 0 = darunter)', data_type: 'number', unit: null, clause_reference: 'Anhang D, Tab. D.1; Anhang E.1.4.2',
      description: 'Plan 3: Ausgabe der Gleichung M820-22-D4 (liability_insurance_sonstige ≥ Tab.-D.1-Wert, Kette inline); Vorschlag für REQ-13 STAGED (m820_1-G-11).' },
  }),

  // ---- M820-23: the § 134 Abs. 2 GWB standstill beside the typed required days ----
  WS23({
    symbol: 'required_standstill_days_gwb', widget: 'lookup_fill', ui_config: { source_label: '§ 134 Abs. 2 GWB (§ 8.10.3.6)' },
    lookup: { table_code: 'S8_10_3_6', role: 'value', keys: [{ column: 'uebermittlung', from_symbol: 'electronic_transmission' }], value: 'frist_tage' },
    verification_quote: L1064,
    create: { section_code: 'B', label_de: 'Wartepflicht nach § 134 Abs. 2 GWB (15 Kalendertage; 10 bei elektronischer Versendung)', data_type: 'number', unit: 'days', clause_reference: '§ 8.10.3.6 (§ 134 Abs. 2 GWB); Anhang B.2.3',
      description: 'Plan 3: Tab.-Zwilling neben dem eingetragenen required_standstill_days (konsumiert von M820-24 — Umbindung STAGED m820_1-E-2); Schlüssel = electronic_transmission (Boolean, stringifiziert). REQ-22 prüft standstill_period_days weiterhin je Zweig.' },
  }),
];

// Section rules: none. Every candidate section (M820-04 / -05 B under project_type, M820-16 B under vgv_f, M820-17 B under vgv_f)
// holds a consumed producer (alternatives_considered, bewertungskommission_members, publication_date …) — and the project_type /
// vgv_f readings are refuted by the guideline's own words (m820_1-J-4 / J-5).
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
