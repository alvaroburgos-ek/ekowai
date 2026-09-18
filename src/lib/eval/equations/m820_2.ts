/**
 * DWA-M-820-2 — Plan 3 Task 19 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts m820_2` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`; prod holds 0 equations for this standard).
 * Every `verification_quote` is lifted from the transcript
 * `Desktop\Guidelines\DWA-M-820-2\DWA-M_820-2.md` (line in the constant name;
 * constants generated mechanically from the transcript lines). No row here
 * outputs a symbol prod already asks for (the typed Auftragswert / the date
 * pair / the booleans keep their fields — every pair is a D- or G-block on the
 * sheet).
 *
 * Engine facts the shapes rest on (probed before the pins through the real
 * `evaluateFormula` / `prepareRegisterRows`, scratch script deleted):
 *   - `sum_rows(reg, kosten_eur)` over a row whose OPTIONAL number cell is empty
 *     is `manual_required` ("Unbekanntes Symbol kosten_eur") — the Σ forms read
 *     `if(x IS NULL, 0, x)` so a Nachtrag without Kostenwirkung and a warranty
 *     row without Mängel count as 0 (din1989_2 trap 5);
 *   - `count_rows(reg, status == 'offen')` with an UNSET enum cell is
 *     `manual_required` ("Fehlende Eingabe für count_rows(): status") — `status`
 *     is REQUIRED on both registers (Plan-1 `change_orders` upgraded in place;
 *     0 stored rows in prod, checked read-only);
 *   - an unset boolean cell reads `false` (`erledigt == false` counts it as open);
 *   - `count_rows` over an EMPTY register is 0 (computed); `sum_rows` is
 *     `manual_required` ("Keine vollständigen Zeilen") — the Σ twins stay open
 *     without rows, the counts read 0;
 *   - date cells are STRINGS: `min_rows(gewaehrleistungen, beginn)` is
 *     `manual_required` ("Operand ist keine Zahl: 2026-03-01") — earliest start /
 *     latest end are NOT encodable (m820_2-F-1, no date functions);
 *   - a text cell left empty (absent or '') is read as '' in row scope and
 *     `IS NULL` treats '' as missing, so `begruendung IS NULL` counts the
 *     decisions without a reason (probed: absent + '' ⇒ 2).
 *
 * Every row is register-fed and lives on its register's worksheet (m277e trap
 * 2) — all 14 outputs are materialised by the save path.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { OFFEN_TOKEN } from '../field-configs/m820_2';

const STD = 'DWA-M-820-2';
const WS06 = '820-2-06';
const WS12 = '820-2-12';
const WS13 = '820-2-13';
const WS16 = '820-2-16';
const WS19 = '820-2-19';
const WS21 = '820-2-21';
const WS24 = '820-2-24';

// ---- lifted quotes (transcript line in the name) ----
const Q_L702 = 'Auf der Grundlage klarer und transparent definierter Projektziele werden Änderungen, verursacht durch Auftraggeber (Bauherren, Betreiber) oder Auftragnehmer, nach einem klar festgelegten Ablauf, beispielweise mithilfe von Formblättern, bearbeitet. Die Auswirkungen auf die Projektziele (beispielsweise Kosten, Termine, Qualitäten und Quantitäten) sind dargestellt.';
const Q_L706 = 'Der Auslöser bzw. Verursacher für die Projektänderung und die Kostenübernahmen werden geklärt und müssen in Textform dokumentiert werden. Auswirkungen auf die Projektziele (Termine, Kosten, Qualitäten, inklusive Planungskosten) sind geklärt und beschrieben. Konsequenzen auf den weiteren Projektverlauf sind bekannt.';
const Q_L708 = 'Projektänderungen werden zügig und zum Projektablauf passend vom Auftraggeber in Textform genehmigt und freigegeben.';
const Q_L1130 = 'Besprechungen werden mindestens mit Tagesordnung, Liste offener Punkte (LOP) und Zeitplanung vorbereitet.';
const Q_L1130_LOP = 'Regelmäßige (Jour fixe) Termine enthalten einen standardisierten Aufbau, der zum Beispiel Tagesordnungspunkte wie Freigabe letztes Protokoll, LOP-Liste, Kosten- und Terminsituation umfasst.';
const Q_L1134 = 'Eine tabellarische Entscheidungsdokumentation wird geführt.';
const Q_L1146 = 'Entscheidungen müssen, einschließlich der Gründe, transparent und nachvollziehbar dokumentiert sein und dauerhaft Bestand haben. Dies führt zu einem stabilen Planungsprozess.';
const Q_L1198 = 'Der Bedarf an Fachplanungen, Gutachten, Rechtsberatung etc. ist intensiv zu recherchieren und realistisch zu ermitteln. Beteiligte Dritte sind möglichst frühzeitig in das Projekt einzubinden und, falls erforderlich, frühzeitig zu beauftragen. Die Anforderungen der Beteiligten sind aktiv einzufordern und in die Planung zu integrieren.';
const Q_L1247 = 'Die für den Projekterfolg erforderliche Aufteilung von Losen und Gewerken wird nach technischen Erfordernissen intensiv durchdacht und transparent begründet.';
const Q_L1374 = 'Die von den Behörden erteilten Auflagen werden vollständig und sorgfältig beachtet.';
const Q_L1380 = 'Eine aktive Nachverfolgung der Auflagen findet statt und hilft dabei, die Erledigung der Auflagen zu den erforderlichen Zeitpunkten nachweisen zu können.';
const Q_L1666 = 'Der Auftraggeber ist sich nicht immer darüber im Klaren, dass er die Bauleistungen abnehmen muss und bei Losen und Gewerken zu unterschiedlichen Zeitpunkten.';
const Q_L1812 = 'Es wird ein Gewährleistungskalender, mit Angabe des Beginns und des Endes der jeweiligen Gewährleistungsfristen, für jeden Auftragnehmer und für jede ausführende Firma geführt.';
const Q_L1832 = 'Mängel werden zeitnah nach dem Auftreten gerügt.';

/** Σ over an OPTIONAL number column: an empty cell counts as 0 (probed — a bare column reference breaks the Σ). */
export const sumOptional = (reg: string, col: string): string => `sum_rows(${reg}, if(${col} IS NULL, 0, ${col}))`;

const row = (worksheet: string, n: string, formula: string, input_symbols: string[], output_unit: string | null, clause_reference: string, description: string, verification_quote: string): EquationEntry => ({
  standard: STD, worksheet, equation_number: n, formula, input_symbols, output_symbol: formula.split(' = ')[0], output_unit, clause_reference, description, verification_quote,
});

export const EQUATIONS: EquationEntry[] = [
  // ---- 820-2-06 (LOP register) ----
  row(WS06, '820-2-06-D1', 'lop_count = count_rows(offene_punkte)', ['offene_punkte'], null, '§ 5.3.1',
    'Plan 3: Anzahl der Zeilen der Liste offener Punkte.', Q_L1130),
  row(WS06, '820-2-06-D2', `lop_open = count_rows(offene_punkte, status == '${OFFEN_TOKEN}')`, ['offene_punkte'], null, '§ 5.3.1',
    'Plan 3: Anzahl offener Punkte (Status offen); Vorschlag für REQ-09 / REQ-15 STAGED (m820_2-G-10).', Q_L1130_LOP),

  // ---- 820-2-12 (Entscheidungsdokumentation) ----
  row(WS12, '820-2-12-D1', 'decisions_count = count_rows(entscheidungen)', ['entscheidungen'], null, '§ 5.3.2',
    'Plan 3: Anzahl dokumentierter Entscheidungen; Vorschlag für REQ-25 (decisions_documented) STAGED (m820_2-G-11).', Q_L1134),
  row(WS12, '820-2-12-D2', 'decisions_ohne_begruendung = count_rows(entscheidungen, begruendung IS NULL)', ['entscheidungen'], null, '§ 5.3.2',
    'Plan 3: Anzahl Entscheidungen ohne dokumentierte Begründung ("einschließlich der Gründe").', Q_L1146),

  // ---- 820-2-13 (Dritte) ----
  row(WS13, '820-2-13-D1', 'third_parties_count = count_rows(dritte)', ['dritte'], null, '§ 5.3.5',
    'Plan 3: Anzahl erfasster Drittleistungen (Fachplanungen, Gutachten, Rechtsberatung); Zusatz-Gate STAGED (m820_2-G-12).', Q_L1198),

  // ---- 820-2-16 (Auflagen) ----
  row(WS16, '820-2-16-D1', 'auflagen_count = count_rows(auflagen)', ['auflagen'], null, '§ 5.4.5',
    'Plan 3: Anzahl erfasster Auflagen.', Q_L1374),
  row(WS16, '820-2-16-D2', 'auflagen_offen = count_rows(auflagen, erledigt == false)', ['auflagen'], null, '§ 5.4.5',
    'Plan 3: Anzahl nicht erledigter Auflagen (ein nicht gesetztes Kästchen zählt als offen); Vorschlag für REQ-37 STAGED (m820_2-G-13).', Q_L1380),

  // ---- 820-2-19 (Vergaben je Los) ----
  row(WS19, '820-2-19-D1', 'lots_count = count_rows(vergaben_los)', ['vergaben_los'], null, '§ 5.3.8; § 5.5',
    'Plan 3: Anzahl vergebener Lose / Gewerke; Vorschlag für REQ-31 STAGED (m820_2-G-14).', Q_L1247),
  row(WS19, '820-2-19-D2', 'final_contract_value_calc = sum_rows(vergaben_los, auftragswert)', ['vergaben_los'], 'EUR', '§ 5.5',
    'Plan 3: Σ der Auftragswerte aller Lose (Zwilling zum eingetragenen final_contract_value — m820_2-D-1); ohne Zeile offen (kein Phantom-Wert).', Q_L1666),

  // ---- 820-2-21 (Bauänderungen / Nachträge — the Plan-1 register upgraded in place) ----
  row(WS21, '820-2-21-D1', 'change_orders_count = count_rows(change_orders)', ['change_orders'], null, '§ 4.3.7; § 5.6.4; Anhang A 4.3',
    'Plan 3: Anzahl Bauänderungen / Nachträge (Statusbericht-Abschnitt 4.3).', Q_L702),
  row(WS21, '820-2-21-D2', `change_orders_sum = ${sumOptional('change_orders', 'kosten_eur')}`, ['change_orders'], 'EUR', '§ 4.3.7; § 5.6.4; Anhang A 4.3',
    'Plan 3: Volumen der Bauänderungen / Nachträge (Σ Kostenwirkung, leere Zellen als 0) — ersetzt die Plan-1 Client-Summe (D-2b-5).', Q_L706),
  row(WS21, '820-2-21-D3', `change_orders_open = count_rows(change_orders, status == '${OFFEN_TOKEN}')`, ['change_orders'], null, '§ 4.3.7',
    'Plan 3: Anzahl offener Bauänderungen / Nachträge (Status offen).', Q_L708),

  // ---- 820-2-24 (Gewährleistungskalender) ----
  row(WS24, '820-2-24-D1', 'warranty_count = count_rows(gewaehrleistungen)', ['gewaehrleistungen'], null, '§ 5.8.2',
    'Plan 3: Anzahl Einträge im Gewährleistungskalender (je Auftragnehmer / ausführender Firma); Vorschlag für REQ-51 STAGED (m820_2-G-15); frühester Beginn / spätestes Ende sind m820_2-F-1.', Q_L1812),
  row(WS24, '820-2-24-D2', `warranty_open_defects = ${sumOptional('gewaehrleistungen', 'maengel_offen')}`, ['gewaehrleistungen'], null, '§ 5.8.3',
    'Plan 3: Σ offener Mängel über alle Auftragnehmer (leere Zellen als 0).', Q_L1832),
];

export const MODULE: EquationModule = { EQUATIONS };
