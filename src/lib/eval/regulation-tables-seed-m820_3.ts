/**
 * DWA-M-820-3 regulation-table seed builders (Plan 3 Task 9, 2026-09-18).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-3\DWA-M_820-3.md`
 * (1297 lines; the ten Qualitätselement catalogues Anhang A.1–A.4 / B.1–B.6 at
 * L687–L1190). The item spans were lifted MECHANICALLY by line range (a throwaway
 * parser in the scratchpad: row = the printed `\hline <Nr.> & <Kriterium> &
 * <Hinweise> \\` line incl. its nested `\begin{tabular}{l}…\end{tabular}` cells;
 * the group headings `\hline & \multicolumn{2}{|l|}{<Gruppe>} \\` become
 * `group_label`); the cell values are cut from the span and asserted inside it
 * at build time (`inSpan`). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts m820_3 "<transcript>"`.
 * Emitted as `20260917100900_regulation_tables_seed_m820_3.sql` (no earlier
 * DWA-M-820-3 table seed exists — nothing superseded).
 *
 * Edition: the title page prints "Februar 2026" (L13, L23) and the imprint
 * "© DWA, 1. Auflage, Hennef 2026" (L51); prod `standards.version` = 'Februar 2026'
 * (read-only 2026-09-18) → edition token `'2026'`.
 *
 * Printed item counts (asserted in the seed test): A.1 15 · A.2 8 · A.3 12 ·
 * A.4 3 · B.1 15 · B.2 40 · B.3 50 · B.4 34 · B.5 10 · B.6 6 = 193 rows (38 in
 * Anhang A, 155 in Anhang B — the prod `qeNN_items_total` VR strings and the
 * M8203-22 / -23 descriptions "15+8+12+3=38" / "15+40+50+34+10+6=155" agree; the
 * brief's / inventory's "174 printed items" is an arithmetic slip — report §8).
 *
 * Keys: `nr` = the printed Nr. as token `n1` … (A.4: the Nr. cells of the
 * Ökonomie and Sozioökonomie rows are printed EMPTY — `\multirow{2}{*}{}`
 * L752 / L757 — only "2" is printed for Ökologie L754; the two rows are keyed by
 * their printed position, sign-off m820_3-U-1, table `imported_unverified`).
 * Values: `kriterium` / `hinweise` (the printed cell texts, OCR quirks kept
 * verbatim — "..In Scope")", "Automatisie-rungs-", "Außerund", "lausführendes",
 * "Werkund", "Pla-nungs-", "Inverkehrbringerl" — never de-hyphenated by guess),
 * `nr_num` (the printed number, for the B.2 / B.3 split-range counts).
 * A.3: the Hinweise cell "Kurzbeschreibungen zur Identifikation von Projekten
 * aus dem Konzept" is printed ONCE as `\multirow[t]{12}{*}` (L732) spanning all
 * twelve rows — stored on every row (LaTeX-explicit; observation in the report).
 * A.4: each category's Hinweise lines (2 / 3 / 2 printed lines) are joined with
 * " · " into one cell; "$\mathrm{CO}_{2}$" is stored as "CO2".
 *
 * Override policy `anhaltswert` on every catalogue — cue L67 (Vorwort, repeated
 * L1247 / L1291): "Dabei stellen die angegebenen Qualitätselemente nur eine
 * projektübergeordnete Auswahl an Kriterien dar, die im Anwendungsfall
 * projektspezifisch ausgewählt und ergänzt werden müssen." + §1 L194 "Die in
 * Anhang A und B angegebenen Qualitätselemente stellen eine Auswahl an Kriterien
 * für die Projektabwicklung dar."
 */
import type { RegulationTable, RegulationRow } from './regulation-tables';

const STD = 'DWA-M-820-3';
export const M820_3_EDITION = '2026';
const ED = M820_3_EDITION;

/** Whitespace-collapse (the verifier's rule). */
export const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
/** The printed span with its LaTeX cell wrappers removed, for the build-time cell assertion. */
const flat = (s: string): string => norm(s.split('\\begin{tabular}{l}').join(' ').split('\\end{tabular}').join(' ').split('\\\\').join(' ').split('$\\mathrm{CO}_{2}$').join('CO2'));
function inSpan(value: string, span: string, where: string): string {
  if (value !== '' && !flat(span).includes(norm(value))) throw new Error(`m820_3 seed: cell not inside its printed span (${where}): ${value}`);
  return value;
}

export type QeItem = { nr: string; nr_num: number; /** the Nr. as PRINTED ('' when the cell is empty — QE_A4 rows 1 / 3, m820_3-U-1) */ nr_printed: string; group: string | null; kriterium: string; hinweise: string; quote: string; lines: string };
export type QeCatalogue = { code: string; title_de: string; clause_reference: string; lines: string; worksheets: string; verification_status: 'md_verified' | 'imported_unverified'; /** the printed heading line (section* / caption) + its line number */ heading: string; heading_line: string; items: readonly QeItem[] };

// ---- cue spans (verbatim, one transcript line each) ----
/** Vorwort — the override cue ("projektspezifisch ausgewählt und ergänzt") (L67). */
export const Q_L67 = "Der neu erarbeitete Teil 3 bietet, ergänzend zu Teil 1 und Teil 2, weitere Handreichungen für die praktische Umsetzung in Projekten hin zu einer guten Qualität. Die Hinweise, die in Bezug zu einer besseren Qualität gegeben werden, sind gegliedert nach den in Teil 1 und Teil 2 bereits verwendeten Phasen. Das Erreichen der Phasenziele kann mit den in Teil 3 in den Anhängen jeweils hinterlegten Qualitätselementen überprüft werden. Dabei stellen die angegebenen Qualitätselemente nur eine projektübergeordnete Auswahl an Kriterien dar, die im Anwendungsfall projektspezifisch ausgewählt und ergänzt werden müssen.";
/** §1 Anwendungsbereich — gliederung nach Leistungsphasen; Anhang A / B = Auswahl an Kriterien (L194). */
export const Q_L194 = "Der vorliegende Teil 3 der Merkblattreihe DWA-M 820 „Qualität von Ingenieurleistungen optimieren“ ergänzt die Ausführungen der Teile 1 und 2 und gibt Handreichungen für die praktische Umsetzung. Die Hinweise sind gegliedert nach den in Teil 1 und Teil 2 bereits verwendeten Leistungsphasen. Das Erreichen der Phasenziele kann mit den in Teil 3 hinterlegten Qualitätselementen überprüft werden. Die in Anhang A und B angegebenen Qualitätselemente stellen eine Auswahl an Kriterien für die Projektabwicklung dar.";
/** §1 — the four sectors (Wasserwirtschaft, Wasserbau, Abwasser, Abfall) (L196). */
export const Q_L196 = "Das Merkblatt richtet sich an Auftraggeber und Auftragnehmer (beauftragte Ingenieurbüros) für planerische Arbeiten bei der Herstellung von Anlagen in den Bereichen Wasserwirtschaft, Wasserbau, Abwasser und Abfall.";
/** Anwendungshinweis 1 (L200). */
export const Q_L200 = "I Im konkreten Projekt werden aus den Qualitätselementen die projektspezifischen Anforderungen und Aufgabenlisten, inklusive Zuständigkeiten, vom Anwendenden entwickelt und in Arbeitsunterlagen (beispielsweise Checklisten) dokumentiert.";
/** Anwendungshinweis 2 (L202). */
export const Q_L202 = "1 Es wird darauf hingewiesen, dass die bereitgestellten Qualitätselemente einzelne Anhaltspunkte für die Projektabwicklung darstellen. Eine Vervollständigung an den jeweiligen Projektaufgaben wird im Projektteam durchgeführt.";
/** Anwendungshinweis 3 (L204). */
export const Q_L204 = "I Die Qualitätselemente unterstützen die Bearbeitenden dabei, die Leistungen, die zum Projekterfolg beitragen, auch im Austausch innerhalb des Projektteams, zu identifizieren und systematisch abzuarbeiten.";
/** Anwendungshinweis 4 (L206). */
export const Q_L206 = "1 Die vollständige Ablaufstruktur für Projekte aller Art ergibt sich aus der eigenverantwortlichen Anwendung und projektspezifischen Anpassung der im Merkblatt vorgelegten Hinweise.";
/** §3 — Projektstopp sentence (L307). */
export const Q_L307 = "Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich. Im Rahmen einer Risikoanalyse muss bewertet werden, ob und wie das Projekt fortgeführt werden kann.";
/** §4 — Bild 1 reference (structured process: Konzept für das Gesamtsystem → Projekte) (L313). */
export const Q_L313 = "Ein wichtiges Diagramm, das den vorgeschlagenen grundsätzlichen Ablauf wiedergibt, ist Bild 1 aus dem Merkblatt DWA-M 820-1:2020, das ausdrücklich nochmals erwähnt und folgend abgebildet ist. Ein strukturierter Planungsprozess, der mit dem Konzept für das Gesamtsystem beginnt und daraus einzelne Projekte ableitet, gibt eine verlässliche und gut funktionierende Struktur, um bedarfsorientiert zu arbeiten.";
/** §4 — "Die Aufteilung in „Konzept für das Gesamtsystem“ und „Projekte“ ist dabei eine elementare Grundlage." (L321). */
export const Q_L321 = "Die Aufteilung in „Konzept für das Gesamtsystem“ und „Projekte“ ist dabei eine elementare Grundlage. Die grundsätzlichen strategischen Überlegungen, die auch die größten Einsparungen im Lebenszyklus des Gesamtsystems bringen können, werden im „Konzept für das Gesamtsystem“ erarbeitet. Hier werden alle zusammenwirkenden Anlagenteile (beispielsweise Kläranlagen, Kanäle,";
/** §6.1 — "Auf der Grundlage des Konzepts für das Gesamtsystem wurden erforderliche Projekte identifiziert (siehe 5.4). …" (L398). */
export const Q_L398 = "Auf der Grundlage des Konzepts für das Gesamtsystem wurden erforderliche Projekte identifiziert (siehe 5.4). Diese werden im Folgenden einzeln betrachtet und umgesetzt.";
/** §6.7 — loop back to the Konzept (Bild 1) (L550). */
export const Q_L550 = "Es wird geprüft, ob das Konzept zum Gesamtsystem vollständig umgesetzt ist (siehe Bild 1). Falls nicht, wird das nächste Projekt initiiert.";
/** §7.2.2 Ziele — "Die BIM-Projektdefinition ist abgeschlossen." (L591). */
export const Q_L591 = "I Die BIM-Projektdefinition ist abgeschlossen.";

// ---------------------------------------------------------------------------
// A. 1 QE 5.2: Bedarfsplanung Konzept — L687–L711 (15 printed items; worksheet M8203-07)
// ---------------------------------------------------------------------------
export const QE_A1_ITEMS: readonly QeItem[] = [
  { nr: "n1", nr_num: 1, nr_printed: "1", group: null, kriterium: "Ist-Zustand und Zielsetzung formulieren", hinweise: "Aussagen zu Technik, Ökonomie, Ökologie und Termine", lines: "L689",
    quote: "\\hline 1 & Ist-Zustand und Zielsetzung formulieren & Aussagen zu Technik, Ökonomie, Ökologie und Termine \\\\" },
  { nr: "n2", nr_num: 2, nr_printed: "2", group: null, kriterium: "Rahmenbedingungen beschreiben (z. B. Bauleitplanung, Landschaft, Artenschutz, Boden, Nachhaltigkeit), Anlass aufzeigen, Genehmigungssituation", hinweise: "Vorhandene Genehmigungen, Liegenschaftsvereinbarung siehe auch Anhang A. 4 ., QE 5.5 - Matrix Nachhaltigkeit\"", lines: "L690",
    quote: "\\hline 2 & Rahmenbedingungen beschreiben (z. B. Bauleitplanung, Landschaft, Artenschutz, Boden, Nachhaltigkeit), Anlass aufzeigen, Genehmigungssituation & Vorhandene Genehmigungen, Liegenschaftsvereinbarung siehe auch Anhang A. 4 ., QE 5.5 - Matrix Nachhaltigkeit\" \\\\" },
  { nr: "n3", nr_num: 3, nr_printed: "3", group: null, kriterium: "Prognoseentwicklung/Stadtentwicklung (Einzugsgebiet, Wassermengen Klimaveränderung etc.), Prognosezeitraum", hinweise: "Übergreifende Abstimmung", lines: "L691",
    quote: "\\hline 3 & Prognoseentwicklung/Stadtentwicklung (Einzugsgebiet, Wassermengen Klimaveränderung etc.), Prognosezeitraum & Übergreifende Abstimmung \\\\" },
  { nr: "n4", nr_num: 4, nr_printed: "4", group: null, kriterium: "Anforderungen der Aufsichtsbehörden, Entwicklung von technischen Anforderungen", hinweise: "Behördenabstimmung", lines: "L692",
    quote: "\\hline 4 & Anforderungen der Aufsichtsbehörden, Entwicklung von technischen Anforderungen & Behördenabstimmung \\\\" },
  { nr: "n5", nr_num: 5, nr_printed: "5", group: null, kriterium: "Untersuchungsbereich/Schnittstellen definieren", hinweise: "Übersichtsplan, Systemskizze", lines: "L693",
    quote: "\\hline 5 & Untersuchungsbereich/Schnittstellen definieren & Übersichtsplan, Systemskizze \\\\" },
  { nr: "n6", nr_num: 6, nr_printed: "6", group: null, kriterium: "Zur Verfügung stehende Unterlagen und Daten (Bestand, Betriebsdaten) definieren (Formate, Qualität, Aktualität etc.), vorliegende Untersuchungen, Belastungsgrößen", hinweise: "Liste zur Verfügung stehender Unterlagen, Metadaten", lines: "L694",
    quote: "\\hline 6 & Zur Verfügung stehende Unterlagen und Daten (Bestand, Betriebsdaten) definieren (Formate, Qualität, Aktualität etc.), vorliegende Untersuchungen, Belastungsgrößen & Liste zur Verfügung stehender Unterlagen, Metadaten \\\\" },
  { nr: "n7", nr_num: 7, nr_printed: "7", group: null, kriterium: "Werkzeuge (Berechnungsmethoden, Softwareeinsatz, Verfahren)", hinweise: "Listen der einzusetzenden Software inkl. Versionen", lines: "L695",
    quote: "\\hline 7 & Werkzeuge (Berechnungsmethoden, Softwareeinsatz, Verfahren) & Listen der einzusetzenden Software inkl. Versionen \\\\" },
  { nr: "n8", nr_num: 8, nr_printed: "8", group: null, kriterium: "Bearbeitungstiefe", hinweise: "", lines: "L696",
    quote: "\\hline 8 & Bearbeitungstiefe & \\\\" },
  { nr: "n9", nr_num: 9, nr_printed: "9", group: null, kriterium: "Konzeptbezogene Organisation AG, Zuständigkeiten, beteiligte Fachplaner", hinweise: "Organigramm, Projektorganisation, Projektbeteiligtenliste", lines: "L697",
    quote: "\\hline 9 & Konzeptbezogene Organisation AG, Zuständigkeiten, beteiligte Fachplaner & Organigramm, Projektorganisation, Projektbeteiligtenliste \\\\" },
  { nr: "n10", nr_num: 10, nr_printed: "10", group: null, kriterium: "Wie werden mögliche Lösungen bewertet und Entscheidungen getroffen? Vorbereitung von Entscheidungen (Kostenrahmen, Wirtschaftlichkeitsbetrachtungen, Lebenszykluskosten, Nutzwertanalysen etc.)", hinweise: "Dokumentenbedarfsliste, Schema Prozessablauf, Funktionenmatrix", lines: "L698–L701",
    quote: "\\hline 10 & \\begin{tabular}{l}\nWie werden mögliche Lösungen bewertet und Entscheidungen getroffen? \\\\\nVorbereitung von Entscheidungen (Kostenrahmen, Wirtschaftlichkeitsbetrachtungen, Lebenszykluskosten, Nutzwertanalysen etc.)\n\\end{tabular} & Dokumentenbedarfsliste, Schema Prozessablauf, Funktionenmatrix \\\\" },
  { nr: "n11", nr_num: 11, nr_printed: "11", group: null, kriterium: "Definition von Projekten, Genehmigungsanforderungen und Prioritätenlisten, Terminrahmen", hinweise: "Rahmenterminplan", lines: "L702",
    quote: "\\hline 11 & Definition von Projekten, Genehmigungsanforderungen und Prioritätenlisten, Terminrahmen & Rahmenterminplan \\\\" },
  { nr: "n12", nr_num: 12, nr_printed: "12", group: null, kriterium: "Aufbereitung / Übergabe von Ergebnissen", hinweise: "Dokumentenbedarfsliste", lines: "L703",
    quote: "\\hline 12 & Aufbereitung / Übergabe von Ergebnissen & Dokumentenbedarfsliste \\\\" },
  { nr: "n13", nr_num: 13, nr_printed: "13", group: null, kriterium: "Prüfungs- und Freigabeprozesse", hinweise: "Berücksichtigung in Rahmenterminplan, Schema Prozessablauf", lines: "L704–L707",
    quote: "\\hline 13 & Prüfungs- und Freigabeprozesse & \\begin{tabular}{l}\nBerücksichtigung in Rahmenterminplan, \\\\\nSchema Prozessablauf\n\\end{tabular} \\\\" },
  { nr: "n14", nr_num: 14, nr_printed: "14", group: null, kriterium: "Kommunikation, Abstimmungsprozesse", hinweise: "Form, Häufigkeit, Werkzeuge", lines: "L708",
    quote: "\\hline 14 & Kommunikation, Abstimmungsprozesse & Form, Häufigkeit, Werkzeuge \\\\" },
  { nr: "n15", nr_num: 15, nr_printed: "15", group: null, kriterium: "Anwendung DIN 18205", hinweise: "Checklisten", lines: "L709",
    quote: "\\hline 15 & Anwendung DIN 18205 & Checklisten \\\\" },
];

// ---------------------------------------------------------------------------
// A. 2 QE 5.3: Konzept Gesamtsystem — L715–L726 (8 printed items; worksheet M8203-08)
// ---------------------------------------------------------------------------
export const QE_A2_ITEMS: readonly QeItem[] = [
  { nr: "n1", nr_num: 1, nr_printed: "1", group: null, kriterium: "Zielstellung formulieren, Verifizierung vor dem Hintergrund behördlicher und technischer Anforderungen und Prognoseentwicklung", hinweise: "Konkretisierung der Bedarfsplanung", lines: "L717",
    quote: "\\hline 1 & Zielstellung formulieren, Verifizierung vor dem Hintergrund behördlicher und technischer Anforderungen und Prognoseentwicklung & Konkretisierung der Bedarfsplanung \\\\" },
  { nr: "n2", nr_num: 2, nr_printed: "2", group: null, kriterium: "Unterziele formulieren", hinweise: "", lines: "L718",
    quote: "\\hline 2 & Unterziele formulieren & \\\\" },
  { nr: "n3", nr_num: 3, nr_printed: "3", group: null, kriterium: "Darstellung des IST-Systems, qualitätsgesicherte Bestandsdaten", hinweise: "Quellen, Metadaten", lines: "L719",
    quote: "\\hline 3 & Darstellung des IST-Systems, qualitätsgesicherte Bestandsdaten & Quellen, Metadaten \\\\" },
  { nr: "n4", nr_num: 4, nr_printed: "4", group: null, kriterium: "Verständnis der wasserwirtschaftlichen Zusammenhänge", hinweise: "Systembeschreibung, System-(Fließ-)Schemata", lines: "L720",
    quote: "\\hline 4 & Verständnis der wasserwirtschaftlichen Zusammenhänge & Systembeschreibung, System-(Fließ-)Schemata \\\\" },
  { nr: "n5", nr_num: 5, nr_printed: "5", group: null, kriterium: "Darstellung von Flächenverfügbarkeiten", hinweise: "Karten mit Eigentumsverhältnissen", lines: "L721",
    quote: "\\hline 5 & Darstellung von Flächenverfügbarkeiten & Karten mit Eigentumsverhältnissen \\\\" },
  { nr: "n6", nr_num: 6, nr_printed: "6", group: null, kriterium: "Entwicklung von realisierbaren Maßnahmen, Untersuchung von Alternativen nach grundsätzlich verschiedenen Anforderungen, Synergieeffekte und Schnittstellen", hinweise: "", lines: "L722",
    quote: "\\hline 6 & Entwicklung von realisierbaren Maßnahmen, Untersuchung von Alternativen nach grundsätzlich verschiedenen Anforderungen, Synergieeffekte und Schnittstellen & \\\\" },
  { nr: "n7", nr_num: 7, nr_printed: "7", group: null, kriterium: "Bewertung der Maßnahmen und Erstellung einer Prioritätenliste", hinweise: "Bewertungsmatrix (im Planungsteam abgestimmt und freigegeben)", lines: "L723",
    quote: "\\hline 7 & Bewertung der Maßnahmen und Erstellung einer Prioritätenliste & Bewertungsmatrix (im Planungsteam abgestimmt und freigegeben) \\\\" },
  { nr: "n8", nr_num: 8, nr_printed: "8", group: null, kriterium: "Klärung von Subventionen/Fördermitteln/Finanzierungen", hinweise: "", lines: "L724",
    quote: "\\hline 8 & Klärung von Subventionen/Fördermitteln/Finanzierungen & \\\\" },
];

// ---------------------------------------------------------------------------
// A. 3 QE 5.4: Identifikation von Projekten — L730–L745 (12 printed items; worksheet M8203-09)
// ---------------------------------------------------------------------------
export const QE_A3_ITEMS: readonly QeItem[] = [
  { nr: "n1", nr_num: 1, nr_printed: "1", group: null, kriterium: "Projektauftrag (als Basis für die Bedarfsplanung des Projekts)", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L732",
    quote: "\\hline 1 & Projektauftrag (als Basis für die Bedarfsplanung des Projekts) & \\multirow[t]{12}{*}{Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept} \\\\" },
  { nr: "n2", nr_num: 2, nr_printed: "2", group: null, kriterium: "Hintergrund, Veranlassung", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L733",
    quote: "\\hline 2 & Hintergrund, Veranlassung & \\\\" },
  { nr: "n3", nr_num: 3, nr_printed: "3", group: null, kriterium: "Problembeschreibung", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L734",
    quote: "\\hline 3 & Problembeschreibung & \\\\" },
  { nr: "n4", nr_num: 4, nr_printed: "4", group: null, kriterium: "Ziele", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L735",
    quote: "\\hline 4 & Ziele & \\\\" },
  { nr: "n5", nr_num: 5, nr_printed: "5", group: null, kriterium: "Dringlichkeit", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L736",
    quote: "\\hline 5 & Dringlichkeit & \\\\" },
  { nr: "n6", nr_num: 6, nr_printed: "6", group: null, kriterium: "im Projektumgriff (..In Scope\") / Schnittstellen", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L737",
    quote: "\\hline 6 & im Projektumgriff (..In Scope\") / Schnittstellen & \\\\" },
  { nr: "n7", nr_num: 7, nr_printed: "7", group: null, kriterium: "nicht im Projektumgriff (..Out of Scope\")", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L738",
    quote: "\\hline 7 & nicht im Projektumgriff (..Out of Scope\") & \\\\" },
  { nr: "n8", nr_num: 8, nr_printed: "8", group: null, kriterium: "Besonderheiten", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L739",
    quote: "\\hline 8 & Besonderheiten & \\\\" },
  { nr: "n9", nr_num: 9, nr_printed: "9", group: null, kriterium: "Budget", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L740",
    quote: "\\hline 9 & Budget & \\\\" },
  { nr: "n10", nr_num: 10, nr_printed: "10", group: null, kriterium: "Vorläufiger Rahmenterminplan", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L741",
    quote: "\\hline 10 & Vorläufiger Rahmenterminplan & \\\\" },
  { nr: "n11", nr_num: 11, nr_printed: "11", group: null, kriterium: "Projektleitung/Kümmerer", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L742",
    quote: "\\hline 11 & Projektleitung/Kümmerer & \\\\" },
  { nr: "n12", nr_num: 12, nr_printed: "12", group: null, kriterium: "Ressourcen (Personal etc.)", hinweise: "Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept", lines: "L743",
    quote: "\\hline 12 & Ressourcen (Personal etc.) & \\\\" },
];

// ---------------------------------------------------------------------------
// A. 4 QE 5.5: Matrix Nachhaltigkeit — L750–L760 (3 printed items; worksheet M8203-10)
// ---------------------------------------------------------------------------
export const QE_A4_ITEMS: readonly QeItem[] = [
  { nr: "n1", nr_num: 1, nr_printed: "", group: null, kriterium: "Ökonomie/Wirtschaftlichkeit", hinweise: "Minimierung der Lebenszykluskosten im Konzept/Projekt · Datenverwendung über den Lebenszyklus der Bauwerke", lines: "L752–L753", // Nr. cell printed EMPTY (m820_3-U-1) — positional
    quote: "\\hline \\multirow{2}{*}{} & \\multirow[t]{2}{*}{Ökonomie/Wirtschaftlichkeit} & Minimierung der Lebenszykluskosten im Konzept/Projekt \\\\\n\\hline & & Datenverwendung über den Lebenszyklus der Bauwerke \\\\" },
  { nr: "n2", nr_num: 2, nr_printed: "2", group: null, kriterium: "Ökologie/Umwelt", hinweise: "Minimierung der ökologischen Auswirkungen ( CO2, Klimabilanz etc.) · Ökologische Eingriffe, Ausgleichsmaßnahmen · Artenschutz", lines: "L754–L756",
    quote: "\\hline \\multirow[t]{3}{*}{2} & \\multirow[t]{3}{*}{Ökologie/Umwelt} & Minimierung der ökologischen Auswirkungen ( $\\mathrm{CO}_{2}$, Klimabilanz etc.) \\\\\n\\hline & & Ökologische Eingriffe, Ausgleichsmaßnahmen \\\\\n\\hline & & Artenschutz \\\\" },
  { nr: "n3", nr_num: 3, nr_printed: "", group: null, kriterium: "Sozioökonomie/Gesellschaft", hinweise: "Wirkung auf Gesellschaft · Lärm, Verkehr", lines: "L757–L758", // Nr. cell printed EMPTY (m820_3-U-1) — positional
    quote: "\\hline \\multirow{2}{*}{} & \\multirow[t]{2}{*}{Sozioökonomie/Gesellschaft} & Wirkung auf Gesellschaft \\\\\n\\hline & & Lärm, Verkehr \\\\" },
];

// ---------------------------------------------------------------------------
// B. 1 QE 6.2: Bedarfsplanung Projekt — L767–L795 (15 printed items; worksheet M8203-11)
// ---------------------------------------------------------------------------
export const QE_B1_ITEMS: readonly QeItem[] = [
  { nr: "n1", nr_num: 1, nr_printed: "1", group: null, kriterium: "Projektbeschreibung, Rahmenbedingungen, Festlegung von Qualitäts-, Umwelt- und Nachhaltigkeitszielen", hinweise: "Berücksichtigung QE 5.4 Identifikation Projekte; Projekthandbuch", lines: "L769",
    quote: "\\hline 1 & Projektbeschreibung, Rahmenbedingungen, Festlegung von Qualitäts-, Umwelt- und Nachhaltigkeitszielen & Berücksichtigung QE 5.4 Identifikation Projekte; Projekthandbuch \\\\" },
  { nr: "n2", nr_num: 2, nr_printed: "2", group: null, kriterium: "Genehmigungssituation, Anforderungen der Aufsichtsbehörden, Zielsetzung", hinweise: "Vorhandene Genehmigungen, Behördenabstimmung", lines: "L770",
    quote: "\\hline 2 & Genehmigungssituation, Anforderungen der Aufsichtsbehörden, Zielsetzung & Vorhandene Genehmigungen, Behördenabstimmung \\\\" },
  { nr: "n3", nr_num: 3, nr_printed: "3", group: null, kriterium: "Abgrenzbare Funktionsbereiche, Leistungspakete definieren", hinweise: "Auch zur Festlegung von Schnittstellen, zunächst unabhängig von Honorarordnungen, Bedarf an Leistungen feststellen", lines: "L771",
    quote: "\\hline 3 & Abgrenzbare Funktionsbereiche, Leistungspakete definieren & Auch zur Festlegung von Schnittstellen, zunächst unabhängig von Honorarordnungen, Bedarf an Leistungen feststellen \\\\" },
  { nr: "n4", nr_num: 4, nr_printed: "4", group: null, kriterium: "Beschreibung der Grundleistungen / besondere Leistungen, Leistungen des AG definieren, Vergabeeinheiten festlegen", hinweise: "Grundlagen sind Strukturen, bspw. der HOAI, des AHO", lines: "L772",
    quote: "\\hline 4 & Beschreibung der Grundleistungen / besondere Leistungen, Leistungen des AG definieren, Vergabeeinheiten festlegen & Grundlagen sind Strukturen, bspw. der HOAI, des AHO \\\\" },
  { nr: "n5", nr_num: 5, nr_printed: "5", group: null, kriterium: "Vorhandene Grundlagen (Bestandspläne etc.) bewerten (Qualität, Verwendbarkeit)", hinweise: "Liste zur Verfügung stehender Unterlagen, Metadaten", lines: "L773",
    quote: "\\hline 5 & Vorhandene Grundlagen (Bestandspläne etc.) bewerten (Qualität, Verwendbarkeit) & Liste zur Verfügung stehender Unterlagen, Metadaten \\\\" },
  { nr: "n6", nr_num: 6, nr_printed: "6", group: null, kriterium: "Zu erarbeitende Grundlagen festlegen (Vermessung, Bestandspläne etc.) inklusive Zeitbedarf", hinweise: "Rahmenterminplan, Leistungserbringende", lines: "L774",
    quote: "\\hline 6 & Zu erarbeitende Grundlagen festlegen (Vermessung, Bestandspläne etc.) inklusive Zeitbedarf & Rahmenterminplan, Leistungserbringende \\\\" },
  { nr: "n7", nr_num: 7, nr_printed: "7", group: null, kriterium: "Untersuchung von Alternativen nach grundsätzlich verschiedenen Anforderungen", hinweise: "In Abgrenzung zur Vorplanung (Varianten = Alternativen nach grundsätzlich gleichen Anforderungen)", lines: "L775",
    quote: "\\hline 7 & Untersuchung von Alternativen nach grundsätzlich verschiedenen Anforderungen & In Abgrenzung zur Vorplanung (Varianten = Alternativen nach grundsätzlich gleichen Anforderungen) \\\\" },
  { nr: "n8", nr_num: 8, nr_printed: "8", group: null, kriterium: "Kostenrahmen, Rahmenterminplan", hinweise: "Kostenschärfe auf zweiter Ebene der Kostengruppen nach DIN 276, Rahmenterminplan", lines: "L776",
    quote: "\\hline 8 & Kostenrahmen, Rahmenterminplan & Kostenschärfe auf zweiter Ebene der Kostengruppen nach DIN 276, Rahmenterminplan \\\\" },
  { nr: "n9", nr_num: 9, nr_printed: "9", group: null, kriterium: "Finanzierung, Fördermittel", hinweise: "Bedarfsgenehmigung durch Finanzierungsstelle", lines: "L777",
    quote: "\\hline 9 & Finanzierung, Fördermittel & Bedarfsgenehmigung durch Finanzierungsstelle \\\\" },
  { nr: "n10", nr_num: 10, nr_printed: "10", group: null, kriterium: "Organisation AG, beteiligte Stellen, Entscheidungswege, Entscheidungs- und Freigabeprozesse, Weisungsbefugnisse", hinweise: "Organigramm, Projektorganisation, Projektbeteiligtenliste, Schema Prozessablauf, Funktionenmatrix", lines: "L785",
    quote: "\\hline 10 & Organisation AG, beteiligte Stellen, Entscheidungswege, Entscheidungs- und Freigabeprozesse, Weisungsbefugnisse & Organigramm, Projektorganisation, Projektbeteiligtenliste, Schema Prozessablauf, Funktionenmatrix \\\\" },
  { nr: "n11", nr_num: 11, nr_printed: "11", group: null, kriterium: "Kommunikationskonzept (Form, Wege, Häufigkeit)", hinweise: "Form und Häufigkeit (Definition im Projekthandbuch)", lines: "L786",
    quote: "\\hline 11 & Kommunikationskonzept (Form, Wege, Häufigkeit) & Form und Häufigkeit (Definition im Projekthandbuch) \\\\" },
  { nr: "n12", nr_num: 12, nr_printed: "12", group: null, kriterium: "Festlegung der Planungsmethodik und der Planungswerkzeuge", hinweise: "2D / 3D / BIM, eDMS", lines: "L787",
    quote: "\\hline 12 & Festlegung der Planungsmethodik und der Planungswerkzeuge & 2D / 3D / BIM, eDMS \\\\" },
  { nr: "n13", nr_num: 13, nr_printed: "13", group: null, kriterium: "Datenaustauch, Struktur", hinweise: "Listen der einzusetzenden Software inkl. Versionen, Datenaustauschplattform mit Ablagestruktur", lines: "L788–L791",
    quote: "\\hline 13 & Datenaustauch, Struktur & \\begin{tabular}{l}\nListen der einzusetzenden Software inkl. Versionen, \\\\\nDatenaustauschplattform mit Ablagestruktur\n\\end{tabular} \\\\" },
  { nr: "n14", nr_num: 14, nr_printed: "14", group: null, kriterium: "Darstellung der Ergebnisse (Berichtsform, Plandarstellungen, Anzahl von Ausfertigungen, Formate, CAD-/Modellierungs-Vorgaben etc.)", hinweise: "Dokumentenbedarfsliste, Pflichtenheft CAD/Schemata/Modelle, Liste der einzusetzenden Software inkl. Versionen (Definition im Projekthandbuch)", lines: "L792",
    quote: "\\hline 14 & Darstellung der Ergebnisse (Berichtsform, Plandarstellungen, Anzahl von Ausfertigungen, Formate, CAD-/Modellierungs-Vorgaben etc.) & Dokumentenbedarfsliste, Pflichtenheft CAD/Schemata/Modelle, Liste der einzusetzenden Software inkl. Versionen (Definition im Projekthandbuch) \\\\" },
  { nr: "n15", nr_num: 15, nr_printed: "15", group: null, kriterium: "Anwendung DIN 18205 - Bedarfsplanung", hinweise: "Checklisten", lines: "L793",
    quote: "\\hline 15 & Anwendung DIN 18205 - Bedarfsplanung & Checklisten \\\\" },
];

// ---------------------------------------------------------------------------
// B. 2 QE 6.3: Planung — L799–L882 (40 printed items; worksheet M8203-12 / M8203-13)
// ---------------------------------------------------------------------------
export const QE_B2_ITEMS: readonly QeItem[] = [
  { nr: "n1", nr_num: 1, nr_printed: "1", group: "Grundlagenermittlung", kriterium: "Projektorganisation ist finalisiert, alle Stakeholder sind bekannt", hinweise: "", lines: "L802",
    quote: "\\hline 1 & Projektorganisation ist finalisiert, alle Stakeholder sind bekannt & \\\\" },
  { nr: "n2", nr_num: 2, nr_printed: "2", group: "Grundlagenermittlung", kriterium: "Dokumentenbedarfsliste für das gesamte Projekt, wird begonnen und während der Planung fortgeführt", hinweise: "Übergabeformate der Dokumente sind geklärt, bspw. PDF, Papier, DWG, shapefile, Koordinatensystem (UTM/Gauß-Krüger), Bezugssystem (Amsterdam/Kronstadt)", lines: "L803",
    quote: "\\hline 2 & Dokumentenbedarfsliste für das gesamte Projekt, wird begonnen und während der Planung fortgeführt & Übergabeformate der Dokumente sind geklärt, bspw. PDF, Papier, DWG, shapefile, Koordinatensystem (UTM/Gauß-Krüger), Bezugssystem (Amsterdam/Kronstadt) \\\\" },
  { nr: "n3", nr_num: 3, nr_printed: "3", group: "Grundlagenermittlung", kriterium: "Pflichtenhefte sind vom AG übergeben worden und akzeptiert", hinweise: "Formatvorlagen sind nach Auftraggebervorgaben festgelegt und abgestimmt. Zuweisungen Farben, Maßeinheiten oder Kürzel sind erfolgt", lines: "L804",
    quote: "\\hline 3 & Pflichtenhefte sind vom AG übergeben worden und akzeptiert & Formatvorlagen sind nach Auftraggebervorgaben festgelegt und abgestimmt. Zuweisungen Farben, Maßeinheiten oder Kürzel sind erfolgt \\\\" },
  { nr: "n4", nr_num: 4, nr_printed: "4", group: "Grundlagenermittlung", kriterium: "Projekthandbuch (Regelungen für die Projektabwicklung) ist erstellt und verabschiedet", hinweise: "", lines: "L805",
    quote: "\\hline 4 & Projekthandbuch (Regelungen für die Projektabwicklung) ist erstellt und verabschiedet & \\\\" },
  { nr: "n5", nr_num: 5, nr_printed: "5", group: "Grundlagenermittlung", kriterium: "Fachlich Beteiligte sind frühzeitig vertraglich gebunden. Die Schnittstellen sind geklärt, die Aufgaben festgelegt", hinweise: "u. a. Brandschutz, Schadstoffsanierung, Landschafts-/Artenschutz, Ex-Schutz", lines: "L806",
    quote: "\\hline 5 & Fachlich Beteiligte sind frühzeitig vertraglich gebunden. Die Schnittstellen sind geklärt, die Aufgaben festgelegt & u. a. Brandschutz, Schadstoffsanierung, Landschafts-/Artenschutz, Ex-Schutz \\\\" },
  { nr: "n6", nr_num: 6, nr_printed: "6", group: "Grundlagenermittlung", kriterium: "Analysen von Studien und hydraulischen Berechnungen sind erfolgt", hinweise: "", lines: "L807",
    quote: "\\hline 6 & Analysen von Studien und hydraulischen Berechnungen sind erfolgt & \\\\" },
  { nr: "n7", nr_num: 7, nr_printed: "7", group: "Grundlagenermittlung", kriterium: "Die Bedarfsplanung liegt vor, wird analysiert und verstanden", hinweise: "Vorgaben und ggf. Studien des AG sind eingearbeitet", lines: "L808",
    quote: "\\hline 7 & Die Bedarfsplanung liegt vor, wird analysiert und verstanden & Vorgaben und ggf. Studien des AG sind eingearbeitet \\\\" },
  { nr: "n8", nr_num: 8, nr_printed: "8", group: "Grundlagenermittlung", kriterium: "Der Grobablauf für das Projekt ist vorbereitet und wird bei Bedarf gemeinsam mit dem AG fortgeschrieben", hinweise: "Die Terminschiene berücksichtigt auch zeitliche Vorgaben durch Behörden, Verfügbarkeit von Budgets sowie die Auslastung des Ingenieurbüros und aller Projektbeteiligten (Ressourcenplanung)", lines: "L817",
    quote: "\\hline 8 & Der Grobablauf für das Projekt ist vorbereitet und wird bei Bedarf gemeinsam mit dem AG fortgeschrieben & Die Terminschiene berücksichtigt auch zeitliche Vorgaben durch Behörden, Verfügbarkeit von Budgets sowie die Auslastung des Ingenieurbüros und aller Projektbeteiligten (Ressourcenplanung) \\\\" },
  { nr: "n9", nr_num: 9, nr_printed: "9", group: "Grundlagenermittlung", kriterium: "Lastfälle und Ziele sind geklärt", hinweise: "", lines: "L818",
    quote: "\\hline 9 & Lastfälle und Ziele sind geklärt & \\\\" },
  { nr: "n10", nr_num: 10, nr_printed: "10", group: "Grundlagenermittlung", kriterium: "Konsistente Bestandsdaten sind verfügbar", hinweise: "", lines: "L819",
    quote: "\\hline 10 & Konsistente Bestandsdaten sind verfügbar & \\\\" },
  { nr: "n11", nr_num: 11, nr_printed: "11", group: "Grundlagenermittlung", kriterium: "Bauen im Bestand: Besonderheiten des Bestands sind berücksichtigt", hinweise: "Risikoanalysen, Untersuchungsumfang festlegen, Absichern relevanter Aspekte für die Planung und Ausführung, Qualität Bestandsdaten", lines: "L820",
    quote: "\\hline 11 & Bauen im Bestand: Besonderheiten des Bestands sind berücksichtigt & Risikoanalysen, Untersuchungsumfang festlegen, Absichern relevanter Aspekte für die Planung und Ausführung, Qualität Bestandsdaten \\\\" },
  { nr: "n12", nr_num: 12, nr_printed: "12", group: "Grundlagenermittlung", kriterium: "Ermitteln der Planungsrandbedingungen", hinweise: "bspw. Denkmalschutz, Bauleitplanung, Geologie, Grundstücksverhältnisse, Nachbarbebauung, Schutzzonen, Kampfmittel, Altlasten, Schadstoffe etc.", lines: "L821",
    quote: "\\hline 12 & Ermitteln der Planungsrandbedingungen & bspw. Denkmalschutz, Bauleitplanung, Geologie, Grundstücksverhältnisse, Nachbarbebauung, Schutzzonen, Kampfmittel, Altlasten, Schadstoffe etc. \\\\" },
  { nr: "n13", nr_num: 13, nr_printed: "13", group: "Grundlagenermittlung", kriterium: "Leistungsphase wird abgeschlossen und durch AG genehmigt", hinweise: "Bericht zur Grundlagenermittlung", lines: "L822",
    quote: "\\hline 13 & Leistungsphase wird abgeschlossen und durch AG genehmigt & Bericht zur Grundlagenermittlung \\\\" },
  { nr: "n14", nr_num: 14, nr_printed: "14", group: "Vorplanung", kriterium: "Bestand ist umfassend bekannt und erfasst", hinweise: "Noch zu ergänzende Bestandsdaten werden nacherfasst und ergänzt", lines: "L824",
    quote: "\\hline 14 & Bestand ist umfassend bekannt und erfasst & Noch zu ergänzende Bestandsdaten werden nacherfasst und ergänzt \\\\" },
  { nr: "n15", nr_num: 15, nr_printed: "15", group: "Vorplanung", kriterium: "Finale Festlegung der Bemessungsgrößen", hinweise: "Dynamische, zeitabhängige Größen, Bezugszeitraum wird festgelegt", lines: "L825",
    quote: "\\hline 15 & Finale Festlegung der Bemessungsgrößen & Dynamische, zeitabhängige Größen, Bezugszeitraum wird festgelegt \\\\" },
  { nr: "n16", nr_num: 16, nr_printed: "16", group: "Vorplanung", kriterium: "Lösungsansätze (nach grundsätzlich gleichen Anforderungen) umfassend untersucht", hinweise: "Erwartungsabgleich zwischen Planer und AG", lines: "L826",
    quote: "\\hline 16 & Lösungsansätze (nach grundsätzlich gleichen Anforderungen) umfassend untersucht & Erwartungsabgleich zwischen Planer und AG \\\\" },
  { nr: "n17", nr_num: 17, nr_printed: "17", group: "Vorplanung", kriterium: "Zielführende Varianten identifizieren und bewerten", hinweise: "Ausschlusskriterien, mehrere machbare Varianten", lines: "L827",
    quote: "\\hline 17 & Zielführende Varianten identifizieren und bewerten & Ausschlusskriterien, mehrere machbare Varianten \\\\" },
  { nr: "n18", nr_num: 18, nr_printed: "18", group: "Vorplanung", kriterium: "Vorzugsvariante erfüllt alle Anforderungen", hinweise: "Bewertungskriterien zur Identifikation der Vorzugsvariante wurden abgestimmt; die Akzeptanz der Öffentlichkeit oder die Öffentlichkeitsarbeit kann ein Kriterium sein", lines: "L828",
    quote: "\\hline 18 & Vorzugsvariante erfüllt alle Anforderungen & Bewertungskriterien zur Identifikation der Vorzugsvariante wurden abgestimmt; die Akzeptanz der Öffentlichkeit oder die Öffentlichkeitsarbeit kann ein Kriterium sein \\\\" },
  { nr: "n19", nr_num: 19, nr_printed: "19", group: "Vorplanung", kriterium: "Dokumentation der Entscheidungsfindung ist aktuell geführt", hinweise: "Bei einem Wechsel von Projektbeteiligten besteht Entscheidungssicherheit zur reibungslosen Fortführung", lines: "L829",
    quote: "\\hline 19 & Dokumentation der Entscheidungsfindung ist aktuell geführt & Bei einem Wechsel von Projektbeteiligten besteht Entscheidungssicherheit zur reibungslosen Fortführung \\\\" },
  { nr: "n20", nr_num: 20, nr_printed: "20", group: "Vorplanung", kriterium: "Flächenverfügbarkeiten, inkl. temporärer Inanspruchnahme für Baustelleneinrichtung etc. sind geklärt", hinweise: "Für Vorzugsvariante geklärt; inkl. Durchleitungsrechte", lines: "L830",
    quote: "\\hline 20 & Flächenverfügbarkeiten, inkl. temporärer Inanspruchnahme für Baustelleneinrichtung etc. sind geklärt & Für Vorzugsvariante geklärt; inkl. Durchleitungsrechte \\\\" },
  { nr: "n21", nr_num: 21, nr_printed: "21", group: "Vorplanung", kriterium: "Leistungsphase wird abgeschlossen und durch AG genehmigt", hinweise: "Bericht zur Vorplanung, inkl. Erläuterung und Freigabe", lines: "L831",
    quote: "\\hline 21 & Leistungsphase wird abgeschlossen und durch AG genehmigt & Bericht zur Vorplanung, inkl. Erläuterung und Freigabe \\\\" },
  { nr: "n22", nr_num: 22, nr_printed: "22", group: "Entwurfsplanung", kriterium: "Schnittstelle zwischen EMSR, Automatisie-rungs- und Maschinentechnik geklärt", hinweise: "", lines: "L833",
    quote: "\\hline 22 & Schnittstelle zwischen EMSR, Automatisie-rungs- und Maschinentechnik geklärt & \\\\" },
  { nr: "n23", nr_num: 23, nr_printed: "23", group: "Entwurfsplanung", kriterium: "Kostenberechnung", hinweise: "Kosten müssen abgestimmt sein, Berücksichtigung Kostenträger, Fördermittel, Verrechnung mit Abwasserabgabe Die Kosten sind ausreichend detailliert, um alle berücksichtigten Elemente erkennen zu können. Kostengliederung nach DIN 276 ist berücksichtigt", lines: "L843–L846",
    quote: "\\hline 23 & Kostenberechnung & \\begin{tabular}{l}\nKosten müssen abgestimmt sein, Berücksichtigung Kostenträger, Fördermittel, Verrechnung mit Abwasserabgabe \\\\\nDie Kosten sind ausreichend detailliert, um alle berücksichtigten Elemente erkennen zu können. Kostengliederung nach DIN 276 ist berücksichtigt\n\\end{tabular} \\\\" },
  { nr: "n24", nr_num: 24, nr_printed: "24", group: "Entwurfsplanung", kriterium: "Bauzeiten- und Kostenplan", hinweise: "Wesentliche Bauphasen, Verkehrslenkung, Provisorien, Berücksichtigung von Ressourcen", lines: "L847",
    quote: "\\hline 24 & Bauzeiten- und Kostenplan & Wesentliche Bauphasen, Verkehrslenkung, Provisorien, Berücksichtigung von Ressourcen \\\\" },
  { nr: "n25", nr_num: 25, nr_printed: "25", group: "Entwurfsplanung", kriterium: "Betriebliche Aspekte, Provisorien, Außerund Inbetriebnahmen sind berücksichtigt und geplant Einflüsse auf Bauzeiten- und Kostenplan sind eingearbeitet", hinweise: "Bauzustände, Zwischenzustände, Wasserhaltung etc.", lines: "L848–L851",
    quote: "\\hline 25 & \\begin{tabular}{l}\nBetriebliche Aspekte, Provisorien, Außerund Inbetriebnahmen sind berücksichtigt und geplant \\\\\nEinflüsse auf Bauzeiten- und Kostenplan sind eingearbeitet\n\\end{tabular} & Bauzustände, Zwischenzustände, Wasserhaltung etc. \\\\" },
  { nr: "n26", nr_num: 26, nr_printed: "26", group: "Entwurfsplanung", kriterium: "Betriebliche Zwischenzustände sind geplant", hinweise: "Es ist geklärt, wer welche Leistungen übernimmt (bspw. inwieweit wirkt der Betrieb mit, welche Leistungen werden ausgeschrieben etc.)", lines: "L852",
    quote: "\\hline 26 & Betriebliche Zwischenzustände sind geplant & Es ist geklärt, wer welche Leistungen übernimmt (bspw. inwieweit wirkt der Betrieb mit, welche Leistungen werden ausgeschrieben etc.) \\\\" },
  { nr: "n27", nr_num: 27, nr_printed: "27", group: "Entwurfsplanung", kriterium: "Entscheidungsdokumentation", hinweise: "Entscheidungen vom AG werden begründet und transparent dargestellt", lines: "L853",
    quote: "\\hline 27 & Entscheidungsdokumentation & Entscheidungen vom AG werden begründet und transparent dargestellt \\\\" },
  { nr: "n28", nr_num: 28, nr_printed: "28", group: "Entwurfsplanung", kriterium: "Entwurfsplanung ist genehmigungsfähig und baubar", hinweise: "Die Ausführungsplanung detailliert die Entwurfsplanung, ändert diese jedoch nicht mehr", lines: "L854",
    quote: "\\hline 28 & Entwurfsplanung ist genehmigungsfähig und baubar & Die Ausführungsplanung detailliert die Entwurfsplanung, ändert diese jedoch nicht mehr \\\\" },
  { nr: "n29", nr_num: 29, nr_printed: "29", group: "Entwurfsplanung", kriterium: "Entwurfsplanung ist genehmigungsfähig und baubar", hinweise: "Nach Bedarf werden einzelne Zwischenstände und in jedem Fall die Planungsergebnisse mit allen Beteiligten (auch genehmigende Stellen) besprochen", lines: "L855",
    quote: "\\hline 29 & Entwurfsplanung ist genehmigungsfähig und baubar & Nach Bedarf werden einzelne Zwischenstände und in jedem Fall die Planungsergebnisse mit allen Beteiligten (auch genehmigende Stellen) besprochen \\\\" },
  { nr: "n30", nr_num: 30, nr_printed: "30", group: "Entwurfsplanung", kriterium: "Budget für das Gesamtprojekt und die jährlichen Mittelbedarfsplanungen werden freigegeben", hinweise: "Verpflichtungsermächtigung, Jahresplanungen", lines: "L856",
    quote: "\\hline 30 & Budget für das Gesamtprojekt und die jährlichen Mittelbedarfsplanungen werden freigegeben & Verpflichtungsermächtigung, Jahresplanungen \\\\" },
  { nr: "n31", nr_num: 31, nr_printed: "31", group: "Entwurfsplanung", kriterium: "Wesentliche Aspekte, die kostenrelevant sind, sind enthalten", hinweise: "bspw. Materialien, Abmessungen, baulogistische Anforderungen (Baustraßen etc.), betriebliche Anforderungen an die Erreichbarkeit, die Zuwegung und die Bedienbarkeit von Anlagen sind geklärt", lines: "L857",
    quote: "\\hline 31 & Wesentliche Aspekte, die kostenrelevant sind, sind enthalten & bspw. Materialien, Abmessungen, baulogistische Anforderungen (Baustraßen etc.), betriebliche Anforderungen an die Erreichbarkeit, die Zuwegung und die Bedienbarkeit von Anlagen sind geklärt \\\\" },
  { nr: "n32", nr_num: 32, nr_printed: "32", group: "Entwurfsplanung", kriterium: "SiGeKo ist im Projekt und arbeitet im Entwurf zu", hinweise: "Bauphasen, gemeinsame Nutzung von Baubehelfen", lines: "L858",
    quote: "\\hline 32 & SiGeKo ist im Projekt und arbeitet im Entwurf zu & Bauphasen, gemeinsame Nutzung von Baubehelfen \\\\" },
  { nr: "n33", nr_num: 33, nr_printed: "33", group: "Entwurfsplanung", kriterium: "Das Änderungsmanagement ist aufgesetzt und wird konsequent genutzt", hinweise: "", lines: "L859",
    quote: "\\hline 33 & Das Änderungsmanagement ist aufgesetzt und wird konsequent genutzt & \\\\" },
  { nr: "n34", nr_num: 34, nr_printed: "34", group: "Entwurfsplanung", kriterium: "Leistungsphase wird abgeschlossen und durch AG genehmigt", hinweise: "Bericht zur Entwurfsplanung; die Freigabe der Entwurfsplanung wird auch vom Betrieb getragen", lines: "L860",
    quote: "\\hline 34 & Leistungsphase wird abgeschlossen und durch AG genehmigt & Bericht zur Entwurfsplanung; die Freigabe der Entwurfsplanung wird auch vom Betrieb getragen \\\\" },
  { nr: "n35", nr_num: 35, nr_printed: "35", group: "Entwurfsplanung", kriterium: "Konzept für eine Öffentlichkeitsarbeit ist erstellt und wird konsequent verfolgt", hinweise: "Abhängig von den Maßnahmen und der Art der Beeinflussung der Öffentlichkeit", lines: "L861",
    quote: "\\hline 35 & Konzept für eine Öffentlichkeitsarbeit ist erstellt und wird konsequent verfolgt & Abhängig von den Maßnahmen und der Art der Beeinflussung der Öffentlichkeit \\\\" },
  { nr: "n36", nr_num: 36, nr_printed: "36", group: "Genehmigungsplanung (inkl. Genehmigungsverfahren)", kriterium: "Vorabinformation der Behörden über den vorgesehenen Umfang", hinweise: "Schriftliche Form oder Präsentation, je nach Projektgröße und Maßnahmenumfang Die Form kann mit den Behörden besprochen werden Form der Öffentlichkeitsarbeit vorbesprechen", lines: "L872–L875",
    quote: "\\hline 36 & Vorabinformation der Behörden über den vorgesehenen Umfang & \\begin{tabular}{l}\nSchriftliche Form oder Präsentation, je nach Projektgröße und Maßnahmenumfang Die Form kann mit den Behörden besprochen werden \\\\\nForm der Öffentlichkeitsarbeit vorbesprechen\n\\end{tabular} \\\\" },
  { nr: "n37", nr_num: 37, nr_printed: "37", group: "Genehmigungsplanung (inkl. Genehmigungsverfahren)", kriterium: "Anforderungen aus der Genehmigung in Form von Auflagen und Nebenbestimmungen werden eingearbeitet", hinweise: "Die Anforderungen der Behörden an Konzepte, Berichte, Logistikkonzept; Materialanlieferung und entsorgung, Beeinträchtigungen durch Baustellenverkehr etc. wurden planerisch berücksichtigt und eingearbeitet", lines: "L876",
    quote: "\\hline 37 & Anforderungen aus der Genehmigung in Form von Auflagen und Nebenbestimmungen werden eingearbeitet & Die Anforderungen der Behörden an Konzepte, Berichte, Logistikkonzept; Materialanlieferung und entsorgung, Beeinträchtigungen durch Baustellenverkehr etc. wurden planerisch berücksichtigt und eingearbeitet \\\\" },
  { nr: "n38", nr_num: 38, nr_printed: "38", group: "Genehmigungsplanung (inkl. Genehmigungsverfahren)", kriterium: "Die Genehmigungsplanung ist erst dann abgeschlossen, wenn alle Anforderungen in die Entwurfsplanung, einschließlich Fortschreibung der Kostenberechnung, eingearbeitet sind. Freigabe durch AG ist erteilt", hinweise: "Berücksichtigung von Auflagen aus Genehmigungsbescheiden", lines: "L877",
    quote: "\\hline 38 & Die Genehmigungsplanung ist erst dann abgeschlossen, wenn alle Anforderungen in die Entwurfsplanung, einschließlich Fortschreibung der Kostenberechnung, eingearbeitet sind. Freigabe durch AG ist erteilt & Berücksichtigung von Auflagen aus Genehmigungsbescheiden \\\\" },
  { nr: "n39", nr_num: 39, nr_printed: "39", group: "Genehmigungsplanung (inkl. Genehmigungsverfahren)", kriterium: "Risiko der Wiederholungsleistung ist abgeschätzt worden, falls parallel zum Genehmigungsverfahren die Ausführungsplanung begonnen wird. Der Umgang damit ist vereinbart", hinweise: "", lines: "L878",
    quote: "\\hline 39 & Risiko der Wiederholungsleistung ist abgeschätzt worden, falls parallel zum Genehmigungsverfahren die Ausführungsplanung begonnen wird. Der Umgang damit ist vereinbart & \\\\" },
  { nr: "n40", nr_num: 40, nr_printed: "40", group: "Genehmigungsplanung (inkl. Genehmigungsverfahren)", kriterium: "Eventuelle Einsprüche zum Genehmigungsbescheid sind geklärt", hinweise: "Klageverfahren, betroffene Bürger, Behörden etc.", lines: "L879",
    quote: "\\hline 40 & Eventuelle Einsprüche zum Genehmigungsbescheid sind geklärt & Klageverfahren, betroffene Bürger, Behörden etc. \\\\" },
];

// ---------------------------------------------------------------------------
// B. 3 QE 6.4: Ausführungsvorbereitung — L886–L1020 (50 printed items; worksheet M8203-14 / M8203-15)
// ---------------------------------------------------------------------------
export const QE_B3_ITEMS: readonly QeItem[] = [
  { nr: "n1", nr_num: 1, nr_printed: "1", group: "Ausführungsplanung", kriterium: "Entwurfs- und Genehmigungsplanung haben die notwendigen Freigaben erhalten und weisen die notwendigen Qualitäten auf", hinweise: "Es werden keine Entwurfsplanungsaufgaben und keine Auflagen aus der Genehmigung in die Ausführungsplanung verschoben", lines: "L890",
    quote: "\\hline 1 & Entwurfs- und Genehmigungsplanung haben die notwendigen Freigaben erhalten und weisen die notwendigen Qualitäten auf & Es werden keine Entwurfsplanungsaufgaben und keine Auflagen aus der Genehmigung in die Ausführungsplanung verschoben \\\\" },
  { nr: "n2", nr_num: 2, nr_printed: "2", group: "Ausführungsplanung", kriterium: "Materialien sind eindeutig festgelegt. Anforderungen an Maschinen- und Verfahrenstechnik sind produktneutral formuliert", hinweise: "", lines: "L891",
    quote: "\\hline 2 & Materialien sind eindeutig festgelegt. Anforderungen an Maschinen- und Verfahrenstechnik sind produktneutral formuliert & \\\\" },
  { nr: "n3", nr_num: 3, nr_printed: "3", group: "Ausführungsplanung", kriterium: "Einbindung SiGeKo in die Ausführungplanung", hinweise: "Erschwernisse bei der Ausführung, Leitungen, Flächenbedarf (Anforderung Arbeits- und Gesundheitsschutz), Baustellenordnung, Gefährdungsbeurteilung", lines: "L892",
    quote: "\\hline 3 & Einbindung SiGeKo in die Ausführungplanung & Erschwernisse bei der Ausführung, Leitungen, Flächenbedarf (Anforderung Arbeits- und Gesundheitsschutz), Baustellenordnung, Gefährdungsbeurteilung \\\\" },
  { nr: "n4", nr_num: 4, nr_printed: "4", group: "Ausführungsplanung", kriterium: "Bauablaufplanung, inkl. Berücksichtigung der Bau- und Betriebszustände wird aufgestellt. Daraus resultierende Anforderungen an die Ausführungsplanung sind implementiert", hinweise: "Erschwernisse, Provisorien, Einhausungen berücksichtigt, evtl. Maßnahmen vorab", lines: "L902",
    quote: "\\hline 4 & Bauablaufplanung, inkl. Berücksichtigung der Bau- und Betriebszustände wird aufgestellt. Daraus resultierende Anforderungen an die Ausführungsplanung sind implementiert & Erschwernisse, Provisorien, Einhausungen berücksichtigt, evtl. Maßnahmen vorab \\\\" },
  { nr: "n5", nr_num: 5, nr_printed: "5", group: "Ausführungsplanung", kriterium: "Verkehrslenkungskonzept, inkl. ÖPNV etc. ist erarbeitet und fließt ein", hinweise: "Übergeordnetes Konzept ist erstellt Zuwegung ist mit der Verkehrsbehörde abgestimmt", lines: "L903–L906",
    quote: "\\hline 5 & Verkehrslenkungskonzept, inkl. ÖPNV etc. ist erarbeitet und fließt ein & \\begin{tabular}{l}\nÜbergeordnetes Konzept ist erstellt \\\\\nZuwegung ist mit der Verkehrsbehörde abgestimmt\n\\end{tabular} \\\\" },
  { nr: "n6", nr_num: 6, nr_printed: "6", group: "Ausführungsplanung", kriterium: "Baulogistik, Erschließung, Energieverfügbarkeit, An- und Abtransporte etc. sind geplant", hinweise: "Baustellenlogistikkonzept", lines: "L907",
    quote: "\\hline 6 & Baulogistik, Erschließung, Energieverfügbarkeit, An- und Abtransporte etc. sind geplant & Baustellenlogistikkonzept \\\\" },
  { nr: "n7", nr_num: 7, nr_printed: "7", group: "Ausführungsplanung", kriterium: "Alle Fachplanungen sowie Planungen Dritter (bspw. für parallele Straßenbaumaßnahmen, für überlagernde parallele Projekte auf dem Betriebsgelände) sind auf dem aktuellen Stand und in die Ausführungsplanung integriert", hinweise: "Sicherstellen, dass alle parallelen Planungen für weitere Projekte, die Schnittstellen aufweisen, aufeinander abgestimmt sind Freigegebene Schnittstellenliste ist vorhanden", lines: "L908–L911",
    quote: "\\hline 7 & Alle Fachplanungen sowie Planungen Dritter (bspw. für parallele Straßenbaumaßnahmen, für überlagernde parallele Projekte auf dem Betriebsgelände) sind auf dem aktuellen Stand und in die Ausführungsplanung integriert & \\begin{tabular}{l}\nSicherstellen, dass alle parallelen Planungen für weitere Projekte, die Schnittstellen aufweisen, aufeinander abgestimmt sind \\\\\nFreigegebene Schnittstellenliste ist vorhanden\n\\end{tabular} \\\\" },
  { nr: "n8", nr_num: 8, nr_printed: "8", group: "Ausführungsplanung", kriterium: "Vergabepakete/Vergabeeinheiten für die Ausführung werden nach den Projektanforderungen gebildet oder bei Änderungen fortgeschrieben", hinweise: "bspw. EU-weite Ausschreibung, Lose", lines: "L912",
    quote: "\\hline 8 & Vergabepakete/Vergabeeinheiten für die Ausführung werden nach den Projektanforderungen gebildet oder bei Änderungen fortgeschrieben & bspw. EU-weite Ausschreibung, Lose \\\\" },
  { nr: "n9", nr_num: 9, nr_printed: "9", group: "Ausführungsplanung", kriterium: "Vollständigkeit der Ausführungsplanung, Anweisungen an die Ausführenden sind klar, leicht auffindbar, ggf. mit Verweisen auf Begleittext versehen", hinweise: "Plan und Text besser verknüpfen; Verweis auf besondere Texte, um Textfelder im Plan zu vermeiden Empfehlung: Bericht zur Ausführungsplanung", lines: "L913–L916",
    quote: "\\hline 9 & Vollständigkeit der Ausführungsplanung, Anweisungen an die Ausführenden sind klar, leicht auffindbar, ggf. mit Verweisen auf Begleittext versehen & \\begin{tabular}{l}\nPlan und Text besser verknüpfen; Verweis auf besondere Texte, um Textfelder im Plan zu vermeiden \\\\\nEmpfehlung: Bericht zur Ausführungsplanung\n\\end{tabular} \\\\" },
  { nr: "n10", nr_num: 10, nr_printed: "10", group: "Ausführungsplanung", kriterium: "Vorauslaufende Arbeiten (bspw. Straßen, Kanal, Leitungsumlegungen, Kampfmittelräumung etc.) sind identifiziert und in die Planung eingearbeitet Die Zuständigkeit der Abwicklung ist geklärt", hinweise: "Kampfmittelbeseitigungskonzept, vorlaufende Rodung, Umlegung von Sparten etc. Häufig gibt es hier verschiedene Zuständigkeiten, die rechtzeitig angesprochen werden müssen", lines: "L917–L920",
    quote: "\\hline 10 & Vorauslaufende Arbeiten (bspw. Straßen, Kanal, Leitungsumlegungen, Kampfmittelräumung etc.) sind identifiziert und in die Planung eingearbeitet Die Zuständigkeit der Abwicklung ist geklärt & \\begin{tabular}{l}\nKampfmittelbeseitigungskonzept, vorlaufende Rodung, Umlegung von Sparten etc. \\\\\nHäufig gibt es hier verschiedene Zuständigkeiten, die rechtzeitig angesprochen werden müssen\n\\end{tabular} \\\\" },
  { nr: "n11", nr_num: 11, nr_printed: "11", group: "Ausführungsplanung", kriterium: "Prüfung Planunterlagen auf Übereinstimmung mit den Normvorgaben und den auftraggeberspezifischen Richtlinien", hinweise: "", lines: "L921",
    quote: "\\hline 11 & Prüfung Planunterlagen auf Übereinstimmung mit den Normvorgaben und den auftraggeberspezifischen Richtlinien & \\\\" },
  { nr: "n12", nr_num: 12, nr_printed: "12", group: "Ausführungsplanung", kriterium: "Kontinuierliches Fortschreiben der Kostenberechnung auf der Grundlage des aktuellen Stands der Ausführungsplanung Überprüfen der Haushaltsansätze und der Budgets", hinweise: "Veränderungen werden erfasst Budgetabgleich ist möglich Eventuell vorgesehene Eigenleistungen, die zu Fremdleistungen werden, sind berücksichtigt etc.", lines: "L922–L926",
    quote: "\\hline 12 & Kontinuierliches Fortschreiben der Kostenberechnung auf der Grundlage des aktuellen Stands der Ausführungsplanung Überprüfen der Haushaltsansätze und der Budgets & \\begin{tabular}{l}\nVeränderungen werden erfasst \\\\\nBudgetabgleich ist möglich \\\\\nEventuell vorgesehene Eigenleistungen, die zu Fremdleistungen werden, sind berücksichtigt etc.\n\\end{tabular} \\\\" },
  { nr: "n13", nr_num: 13, nr_printed: "13", group: "Ausführungsplanung", kriterium: "Kontinuierliches Fortschreiben der Terminpläne, um Veränderungen einzuarbeiten", hinweise: "Auch die vorlaufenden Arbeiten sind berücksichtigt; Zeitfenster für Artenschutzmaßnahmen sind eingearbeitet", lines: "L927",
    quote: "\\hline 13 & Kontinuierliches Fortschreiben der Terminpläne, um Veränderungen einzuarbeiten & Auch die vorlaufenden Arbeiten sind berücksichtigt; Zeitfenster für Artenschutzmaßnahmen sind eingearbeitet \\\\" },
  { nr: "n14", nr_num: 14, nr_printed: "14", group: "Ausführungsplanung", kriterium: "Freigabeprozess ist implementiert und wird formal durchlaufen Die Ausführungsplanung ist damit bauherrenseitig anerkannt und freigegeben", hinweise: "Reduzierung von Änderungen", lines: "L928–L931",
    quote: "\\hline 14 & \\begin{tabular}{l}\nFreigabeprozess ist implementiert und wird formal durchlaufen \\\\\nDie Ausführungsplanung ist damit bauherrenseitig anerkannt und freigegeben\n\\end{tabular} & Reduzierung von Änderungen \\\\" },
  { nr: "n15", nr_num: 15, nr_printed: "15", group: "Ausführungsplanung", kriterium: "Die Inbetriebnahme, der Testbetrieb, die Zustandsfeststellungen sowie die Abnahmezeitpunkte, inkl. Gewährleistungsfristen für die verschiedenen Gewerke sind geplant Verantwortlichkeiten sind bestimmt Gegebenenfalls erforderliche Bereitschaftsdienste sind festgelegt Die Verantwortung für die Inbetriebnahmephase lausführendes Unternehmen oder Betrieb) ist festgelegt", hinweise: "Werden Betriebsmittel und Hilfsstoffe für die Inbetriebnahme erforderlich, ist geklärt, ob diese in Eigenleistung durch den Bauherrn/Betrieb oder über die Ausschreibung von den ausführenden Unternehmen beigestellt werden Die im Rahmen der Inbetriebnahme zu erfüllenden Kriterien sind festgelegt und werden überwacht", lines: "L941–L947",
    quote: "\\hline 15 & \\begin{tabular}{l}\nDie Inbetriebnahme, der Testbetrieb, die Zustandsfeststellungen sowie die Abnahmezeitpunkte, inkl. Gewährleistungsfristen für die verschiedenen Gewerke sind geplant Verantwortlichkeiten sind bestimmt Gegebenenfalls erforderliche Bereitschaftsdienste sind festgelegt \\\\\nDie Verantwortung für die Inbetriebnahmephase lausführendes Unternehmen oder Betrieb) ist festgelegt\n\\end{tabular} & \\begin{tabular}{l}\nWerden Betriebsmittel und Hilfsstoffe für die Inbetriebnahme erforderlich, ist geklärt, ob diese in Eigenleistung durch den Bauherrn/Betrieb oder über die Ausschreibung von den ausführenden Unternehmen beigestellt werden \\\\\nDie im Rahmen der Inbetriebnahme zu erfüllenden Kriterien sind festgelegt und werden überwacht\n\\end{tabular} \\\\" },
  { nr: "n16", nr_num: 16, nr_printed: "16", group: "Ausführungsplanung", kriterium: "Die Ressourcenplanung für die Inbetriebnahme (inkl. Qualifikationen) seitens der ausführenden Unternehmen wird vorbereitet und ist weitere Grundlage für die Ausschreibung", hinweise: "Die Ausarbeitung des Inbetriebnahmeorganigramms wird vom Bauherrn im Rahmen der Ausführung, rechtzeitig vor Inbetriebnahme, festgelegt", lines: "L948",
    quote: "\\hline 16 & Die Ressourcenplanung für die Inbetriebnahme (inkl. Qualifikationen) seitens der ausführenden Unternehmen wird vorbereitet und ist weitere Grundlage für die Ausschreibung & Die Ausarbeitung des Inbetriebnahmeorganigramms wird vom Bauherrn im Rahmen der Ausführung, rechtzeitig vor Inbetriebnahme, festgelegt \\\\" },
  { nr: "n17", nr_num: 17, nr_printed: "17", group: "Ausführungsplanung", kriterium: "Wartungsverträge werden soweit erforderlich identifiziert und ggf. als separate Verträge ausgeschrieben", hinweise: "Ob die Ausschreibung mit den Ausführungsleistungen erfolgt oder später ausgeschrieben wird, ist zu klären; hierzu kann der Betrieb wertvolle Beiträge leisten", lines: "L949",
    quote: "\\hline 17 & Wartungsverträge werden soweit erforderlich identifiziert und ggf. als separate Verträge ausgeschrieben & Ob die Ausschreibung mit den Ausführungsleistungen erfolgt oder später ausgeschrieben wird, ist zu klären; hierzu kann der Betrieb wertvolle Beiträge leisten \\\\" },
  { nr: "n18", nr_num: 18, nr_printed: "18", group: "Vorbereiten der Vergabe", kriterium: "Vergabeeinheitsstruktur und Vergabekriterien (Eignungs- und Zuschlagskriterien) sind zu Beginn LPH 6 festgelegt", hinweise: "", lines: "L951",
    quote: "\\hline 18 & Vergabeeinheitsstruktur und Vergabekriterien (Eignungs- und Zuschlagskriterien) sind zu Beginn LPH 6 festgelegt & \\\\" },
  { nr: "n19", nr_num: 19, nr_printed: "19", group: "Vorbereiten der Vergabe", kriterium: "Vergabebudgets sind gebildet", hinweise: "Grundlage: i. d. R. bepreiste Leistungsverzeichnisse", lines: "L952",
    quote: "\\hline 19 & Vergabebudgets sind gebildet & Grundlage: i. d. R. bepreiste Leistungsverzeichnisse \\\\" },
  { nr: "n20", nr_num: 20, nr_printed: "20", group: "Vorbereiten der Vergabe", kriterium: "Vergabearten werden den aktuellen Vergaberegeln und den Projektanforderungen entsprechend festgelegt", hinweise: "", lines: "L953",
    quote: "\\hline 20 & Vergabearten werden den aktuellen Vergaberegeln und den Projektanforderungen entsprechend festgelegt & \\\\" },
  { nr: "n21", nr_num: 21, nr_printed: "21", group: "Vorbereiten der Vergabe", kriterium: "Der Vergabeterminplan ist sorgfältig erstellt und abgestimmt, auch mit den Entscheidungsgremienterminen", hinweise: "", lines: "L954",
    quote: "\\hline 21 & Der Vergabeterminplan ist sorgfältig erstellt und abgestimmt, auch mit den Entscheidungsgremienterminen & \\\\" },
  { nr: "n22", nr_num: 22, nr_printed: "22", group: "Vorbereiten der Vergabe", kriterium: "Eignungskriterien werden transparent und passend zu den Projektanforderungen festgelegt", hinweise: "", lines: "L955",
    quote: "\\hline 22 & Eignungskriterien werden transparent und passend zu den Projektanforderungen festgelegt & \\\\" },
  { nr: "n23", nr_num: 23, nr_printed: "23", group: "Vorbereiten der Vergabe", kriterium: "Ob und ggf. in welchen Bereichen Nebenangebote zugelassen werden können, ist im Vorfeld zu klären und in den Vergabeunterlagen festgelegt", hinweise: "", lines: "L956",
    quote: "\\hline 23 & Ob und ggf. in welchen Bereichen Nebenangebote zugelassen werden können, ist im Vorfeld zu klären und in den Vergabeunterlagen festgelegt & \\\\" },
  { nr: "n24", nr_num: 24, nr_printed: "24", group: "Vorbereiten der Vergabe", kriterium: "Im Bauvertrag wird geregelt, wer die erforderlichen Anpassungen der Ausführungsplanung anhand der Werk- und Montagepläne vornimmt", hinweise: "Klarstellung im LV, ggf. Schnittstelle festlegen und regeln", lines: "L957",
    quote: "\\hline 24 & Im Bauvertrag wird geregelt, wer die erforderlichen Anpassungen der Ausführungsplanung anhand der Werk- und Montagepläne vornimmt & Klarstellung im LV, ggf. Schnittstelle festlegen und regeln \\\\" },
  { nr: "n25", nr_num: 25, nr_printed: "25", group: "Vorbereiten der Vergabe", kriterium: "Hinweis auf Erschwernisse bei der Ausführung sind im LV enthalten", hinweise: "Kalkulationsrelevante Informationen sind dem Bieter bekannt", lines: "L958",
    quote: "\\hline 25 & Hinweis auf Erschwernisse bei der Ausführung sind im LV enthalten & Kalkulationsrelevante Informationen sind dem Bieter bekannt \\\\" },
  { nr: "n26", nr_num: 26, nr_printed: "26", group: "Vorbereiten der Vergabe", kriterium: "Einbindung SiGeKo in die Ausschreibungsunterlagen", hinweise: "", lines: "L959",
    quote: "\\hline 26 & Einbindung SiGeKo in die Ausschreibungsunterlagen & \\\\" },
  { nr: "n27", nr_num: 27, nr_printed: "27", group: "Vorbereiten der Vergabe", kriterium: "Die Transparenz der Ausschreibungsunterlagen ist gegeben Die Vergabekriterien sind eindeutig und nachvollziehbar", hinweise: "", lines: "L969–L972",
    quote: "\\hline 27 & \\begin{tabular}{l}\nDie Transparenz der Ausschreibungsunterlagen ist gegeben \\\\\nDie Vergabekriterien sind eindeutig und nachvollziehbar\n\\end{tabular} & \\\\" },
  { nr: "n28", nr_num: 28, nr_printed: "28", group: "Vorbereiten der Vergabe", kriterium: "Anforderung Produktsicherheitsgesetz beachten. (ProdSG, Gesetz über die Bereitstellung von Produkten auf dem Markt)", hinweise: "bspw. CE-Kennzeichnung, Inverkehrbringung ist geregelt, Zuständigkeiten für die Konformitätserklärung sind klar", lines: "L973",
    quote: "\\hline 28 & Anforderung Produktsicherheitsgesetz beachten. (ProdSG, Gesetz über die Bereitstellung von Produkten auf dem Markt) & bspw. CE-Kennzeichnung, Inverkehrbringung ist geregelt, Zuständigkeiten für die Konformitätserklärung sind klar \\\\" },
  { nr: "n29", nr_num: 29, nr_printed: "29", group: "Vorbereiten der Vergabe", kriterium: "Bauzwischenszenarien sind überprüft (Provisorienplanung, Bauhilfsmaßnahmen, Einhausungen etc.) und in den Ausschreibungsunterlagen enthalten", hinweise: "Die Schnittstellen werden final geprüft, die Ausschreibungsinhalte sind aktuell und umsetzbar Bei Auftraggeberleistungen sind die Ressourcen gesichert", lines: "L974–L977",
    quote: "\\hline 29 & Bauzwischenszenarien sind überprüft (Provisorienplanung, Bauhilfsmaßnahmen, Einhausungen etc.) und in den Ausschreibungsunterlagen enthalten & \\begin{tabular}{l}\nDie Schnittstellen werden final geprüft, die Ausschreibungsinhalte sind aktuell und umsetzbar \\\\\nBei Auftraggeberleistungen sind die Ressourcen gesichert\n\\end{tabular} \\\\" },
  { nr: "n30", nr_num: 30, nr_printed: "30", group: "Vorbereiten der Vergabe", kriterium: "Anforderungen zu Umlegungen von Straßen, Wegen, Änderungen der Verkehrsführung etc. sind im LV formuliert", hinweise: "Der Abschnitt 0 der VOB/C gibt hierzu weitere Hinweise", lines: "L978",
    quote: "\\hline 30 & Anforderungen zu Umlegungen von Straßen, Wegen, Änderungen der Verkehrsführung etc. sind im LV formuliert & Der Abschnitt 0 der VOB/C gibt hierzu weitere Hinweise \\\\" },
  { nr: "n31", nr_num: 31, nr_printed: "31", group: "Vorbereiten der Vergabe", kriterium: "Die Leistungen sind umfassend und kalkulierbar beschrieben, die Randbedingungen sind genannt; der bauvertragliche Terminplan ist realistisch und enthält ggf. Freiheitsgrade, je nach Projektnotwendigkeiten", hinweise: "", lines: "L979",
    quote: "\\hline 31 & Die Leistungen sind umfassend und kalkulierbar beschrieben, die Randbedingungen sind genannt; der bauvertragliche Terminplan ist realistisch und enthält ggf. Freiheitsgrade, je nach Projektnotwendigkeiten & \\\\" },
  { nr: "n32", nr_num: 32, nr_printed: "32", group: "Vorbereiten der Vergabe", kriterium: "Leitfabrikate, Standards, die in den Ausschreibungen eingesetzt werden, sind bewusst und den Anforderungen entsprechend festgelegt", hinweise: "In besonders zu begründenden Fällen", lines: "L980",
    quote: "\\hline 32 & Leitfabrikate, Standards, die in den Ausschreibungen eingesetzt werden, sind bewusst und den Anforderungen entsprechend festgelegt & In besonders zu begründenden Fällen \\\\" },
  { nr: "n33", nr_num: 33, nr_printed: "33", group: "Vorbereiten der Vergabe", kriterium: "Leistungen, die aus Qualitätssicherungsplänen herrühren, sind ausgeschrieben, insbesondere bei risikobehafteten Maßnahmen", hinweise: "bspw. Bodenproben, Tragfähigkeitsprüfungen, Schweißnahtprüfung, Dichtheitsprüfungen etc.", lines: "L981",
    quote: "\\hline 33 & Leistungen, die aus Qualitätssicherungsplänen herrühren, sind ausgeschrieben, insbesondere bei risikobehafteten Maßnahmen & bspw. Bodenproben, Tragfähigkeitsprüfungen, Schweißnahtprüfung, Dichtheitsprüfungen etc. \\\\" },
  { nr: "n34", nr_num: 34, nr_printed: "34", group: "Vorbereiten der Vergabe", kriterium: "Inbetriebnahmen, Probebetriebe etc. sind geplant und ausgeschrieben", hinweise: "Schnittstellen der Gewerke, Probebetriebsphasen", lines: "L982",
    quote: "\\hline 34 & Inbetriebnahmen, Probebetriebe etc. sind geplant und ausgeschrieben & Schnittstellen der Gewerke, Probebetriebsphasen \\\\" },
  { nr: "n35", nr_num: 35, nr_printed: "35", group: "Vorbereiten der Vergabe", kriterium: "Prüfpflichtige Aggregate (bspw. Kompressoren mit TÜV-Prüfung) sind identifiziert Die Prüfungsleistung ist Bestandteil der Ausschreibung", hinweise: "", lines: "L983–L986",
    quote: "\\hline 35 & \\begin{tabular}{l}\nPrüfpflichtige Aggregate (bspw. Kompressoren mit TÜV-Prüfung) sind identifiziert \\\\\nDie Prüfungsleistung ist Bestandteil der Ausschreibung\n\\end{tabular} & \\\\" },
  { nr: "n36", nr_num: 36, nr_printed: "36", group: "Vorbereiten der Vergabe", kriterium: "Inbetriebnahme- und Abnahmezeitpunkte der jeweiligen Leistung sind auf die Inbetriebnahmeterminplanung angepasst und entsprechend ausgeschrieben", hinweise: "Zeitpunkt der Lieferung der Anlagentechnik, Abnahme erst nach Einbau und Testbetrieb", lines: "L987",
    quote: "\\hline 36 & Inbetriebnahme- und Abnahmezeitpunkte der jeweiligen Leistung sind auf die Inbetriebnahmeterminplanung angepasst und entsprechend ausgeschrieben & Zeitpunkt der Lieferung der Anlagentechnik, Abnahme erst nach Einbau und Testbetrieb \\\\" },
  { nr: "n37", nr_num: 37, nr_printed: "37", group: "Vorbereiten der Vergabe", kriterium: "Es liegt eine umfassende, passend zu den Gegebenheiten und zum Bauvorhaben bedarfsorientierte Baustellenordnung vor Die Verhaltensregeln sind transparent und verständlich beschrieben", hinweise: "Falls dies kalkulationsrelevant ist", lines: "L988–L991",
    quote: "\\hline 37 & \\begin{tabular}{l}\nEs liegt eine umfassende, passend zu den Gegebenheiten und zum Bauvorhaben bedarfsorientierte Baustellenordnung vor \\\\\nDie Verhaltensregeln sind transparent und verständlich beschrieben\n\\end{tabular} & Falls dies kalkulationsrelevant ist \\\\" },
  { nr: "n38", nr_num: 38, nr_printed: "38", group: "Vorbereiten der Vergabe", kriterium: "Der Umfang und die Form der Dokumentation sind auf die auszuführenden Maßnahmen abzustimmen (Verhältnismäßigkeit wahren)", hinweise: "Es sollte darauf geachtet werden, dass die Dokumentationsanforderungen nicht dazu dienen, Versäumnisse der Vergangenheit auszugleichen", lines: "L1001",
    quote: "\\hline 38 & Der Umfang und die Form der Dokumentation sind auf die auszuführenden Maßnahmen abzustimmen (Verhältnismäßigkeit wahren) & Es sollte darauf geachtet werden, dass die Dokumentationsanforderungen nicht dazu dienen, Versäumnisse der Vergangenheit auszugleichen \\\\" },
  { nr: "n39", nr_num: 39, nr_printed: "39", group: "Vorbereiten der Vergabe", kriterium: "Die Umfänge der Bestandsdokumentation und der Bestandspläne der ausgeführten Baumaßnahmen sind sinnvoll geplant Die für das jeweils ausführende Unternehmen relevanten Teile sind in die Bauausschreibung übernommen", hinweise: "Eventuell können auch Leistungen Dritter bei der Bestandserfassung (..As built\") sinnvoll sein (Vermessung, 3D-Scan etc.); darauf ist in der Ausschreibung entsprechend einzugehen.", lines: "L1002–L1005",
    quote: "\\hline 39 & \\begin{tabular}{l}\nDie Umfänge der Bestandsdokumentation und der Bestandspläne der ausgeführten Baumaßnahmen sind sinnvoll geplant \\\\\nDie für das jeweils ausführende Unternehmen relevanten Teile sind in die Bauausschreibung übernommen\n\\end{tabular} & Eventuell können auch Leistungen Dritter bei der Bestandserfassung (..As built\") sinnvoll sein (Vermessung, 3D-Scan etc.); darauf ist in der Ausschreibung entsprechend einzugehen. \\\\" },
  { nr: "n40", nr_num: 40, nr_printed: "40", group: "Mitwirken bei der Vergabe", kriterium: "Bauverträge sind vor Beginn der Ausschreibung (LPH 7) vollständig vorbereitet", hinweise: "AG-interne Fachbereiche sind beteiligt und haben zugeliefert", lines: "L1007",
    quote: "\\hline 40 & Bauverträge sind vor Beginn der Ausschreibung (LPH 7) vollständig vorbereitet & AG-interne Fachbereiche sind beteiligt und haben zugeliefert \\\\" },
  { nr: "n41", nr_num: 41, nr_printed: "41", group: "Mitwirken bei der Vergabe", kriterium: "Zügige Beantwortung von Bieterfragen ist sichergestellt", hinweise: "", lines: "L1008",
    quote: "\\hline 41 & Zügige Beantwortung von Bieterfragen ist sichergestellt & \\\\" },
  { nr: "n42", nr_num: 42, nr_printed: "42", group: "Mitwirken bei der Vergabe", kriterium: "Eignungskriterien werden sorgfältig geprüft Nicht geeignete Bieter werden ausgeschlossen", hinweise: "Der Preis ist für diesen Schritt regelmäßig nicht relevant", lines: "L1009",
    quote: "\\hline 42 & Eignungskriterien werden sorgfältig geprüft Nicht geeignete Bieter werden ausgeschlossen & Der Preis ist für diesen Schritt regelmäßig nicht relevant \\\\" },
  { nr: "n43", nr_num: 43, nr_printed: "43", group: "Mitwirken bei der Vergabe", kriterium: "Die vom Bieter angebotenen Produkte entsprechen dem ausgeschriebenen Qualitätsstandard", hinweise: "Prüfen der Gleichwertigkeit oder der Erfüllung der Anforderungen an die Produkte", lines: "L1010",
    quote: "\\hline 43 & Die vom Bieter angebotenen Produkte entsprechen dem ausgeschriebenen Qualitätsstandard & Prüfen der Gleichwertigkeit oder der Erfüllung der Anforderungen an die Produkte \\\\" },
  { nr: "n44", nr_num: 44, nr_printed: "44", group: "Mitwirken bei der Vergabe", kriterium: "Formale Prüfung der Angebote; falls nicht bestanden → Ausschluss", hinweise: "", lines: "L1011",
    quote: "\\hline 44 & Formale Prüfung der Angebote; falls nicht bestanden → Ausschluss & \\\\" },
  { nr: "n45", nr_num: 45, nr_printed: "45", group: "Mitwirken bei der Vergabe", kriterium: "Sachliche, fachtechnische, rechnerische Prüfung wird durchgeführt und dokumentiert; beide Seiten (Planer und AG) unterschreiben", hinweise: "Gegebenenfalls Aufklärungsgespräche führen", lines: "L1012",
    quote: "\\hline 45 & Sachliche, fachtechnische, rechnerische Prüfung wird durchgeführt und dokumentiert; beide Seiten (Planer und AG) unterschreiben & Gegebenenfalls Aufklärungsgespräche führen \\\\" },
  { nr: "n46", nr_num: 46, nr_printed: "46", group: "Mitwirken bei der Vergabe", kriterium: "Prüfung und Wertung von Nebenangeboten und Alternativvorschlägen", hinweise: "", lines: "L1013",
    quote: "\\hline 46 & Prüfung und Wertung von Nebenangeboten und Alternativvorschlägen & \\\\" },
  { nr: "n47", nr_num: 47, nr_printed: "47", group: "Mitwirken bei der Vergabe", kriterium: "Vergabevorschlag erarbeiten und AG vorlegen", hinweise: "", lines: "L1014",
    quote: "\\hline 47 & Vergabevorschlag erarbeiten und AG vorlegen & \\\\" },
  { nr: "n48", nr_num: 48, nr_printed: "48", group: "Mitwirken bei der Vergabe", kriterium: "AG trifft die Zuschlagsentscheidung Nichtberücksichtigungsmitteilung wird an die Bieter versandt", hinweise: "", lines: "L1015",
    quote: "\\hline 48 & AG trifft die Zuschlagsentscheidung Nichtberücksichtigungsmitteilung wird an die Bieter versandt & \\\\" },
  { nr: "n49", nr_num: 49, nr_printed: "49", group: "Mitwirken bei der Vergabe", kriterium: "Bindefrist bei der Vergabe berücksichtigen; ggf. rechtzeitig verlängern", hinweise: "Das Risiko einer Verlängerung ist jedoch, dass einzelne Bieter dem nicht zustimmen und sie dann an das Angebot nicht mehr gebunden sind", lines: "L1016",
    quote: "\\hline 49 & Bindefrist bei der Vergabe berücksichtigen; ggf. rechtzeitig verlängern & Das Risiko einer Verlängerung ist jedoch, dass einzelne Bieter dem nicht zustimmen und sie dann an das Angebot nicht mehr gebunden sind \\\\" },
  { nr: "n50", nr_num: 50, nr_printed: "50", group: "Mitwirken bei der Vergabe", kriterium: "Zuschlag erteilen", hinweise: "Auf rechtlich wirksamen Vertragsabschluss achten!", lines: "L1017",
    quote: "\\hline 50 & Zuschlag erteilen & Auf rechtlich wirksamen Vertragsabschluss achten! \\\\" },
];

// ---------------------------------------------------------------------------
// B. 4 QE 6.5: Ausführung — L1024–L1134 (34 printed items; worksheet M8203-16)
// ---------------------------------------------------------------------------
export const QE_B4_ITEMS: readonly QeItem[] = [
  { nr: "n1", nr_num: 1, nr_printed: "1", group: null, kriterium: "Bürgerinformation findet zeitgerecht statt", hinweise: "", lines: "L1027",
    quote: "\\hline 1 & Bürgerinformation findet zeitgerecht statt & \\\\" },
  { nr: "n2", nr_num: 2, nr_printed: "2", group: null, kriterium: "Verkehrslenkung wird in Zusammenarbeit mit den zuständigen Ämtern geklärt", hinweise: "Im Startgespräch berücksichtigen", lines: "L1028",
    quote: "\\hline 2 & Verkehrslenkung wird in Zusammenarbeit mit den zuständigen Ämtern geklärt & Im Startgespräch berücksichtigen \\\\" },
  { nr: "n3", nr_num: 3, nr_printed: "3", group: null, kriterium: "Anlagen Dritter, bspw. Leitungen sind umzulegen oder zu schützen", hinweise: "Erforderliche Maßnahmen sind geklärt und werden umgesetzt", lines: "L1029",
    quote: "\\hline 3 & Anlagen Dritter, bspw. Leitungen sind umzulegen oder zu schützen & Erforderliche Maßnahmen sind geklärt und werden umgesetzt \\\\" },
  { nr: "n4", nr_num: 4, nr_printed: "4", group: null, kriterium: "Beteiligung Dritter an den Projektschnittstellen", hinweise: "", lines: "L1030",
    quote: "\\hline 4 & Beteiligung Dritter an den Projektschnittstellen & \\\\" },
  { nr: "n5", nr_num: 5, nr_printed: "5", group: null, kriterium: "Boden-, Naturdenkmale, Artenschutzmaßnahmen, Pflanzen- und Baumschutzmaßnahmen", hinweise: "Ansprechpartner sind bekannt Die ausgeschriebenen Maßnahmen werden koordiniert und in Abstimmung mit Behörden und Firmen umgesetzt", lines: "L1031–L1034",
    quote: "\\hline 5 & Boden-, Naturdenkmale, Artenschutzmaßnahmen, Pflanzen- und Baumschutzmaßnahmen & \\begin{tabular}{l}\nAnsprechpartner sind bekannt \\\\\nDie ausgeschriebenen Maßnahmen werden koordiniert und in Abstimmung mit Behörden und Firmen umgesetzt\n\\end{tabular} \\\\" },
  { nr: "n6", nr_num: 6, nr_printed: "6", group: null, kriterium: "Zu Beginn der Maßnahme gibt es ein umfassendes Startgespräch mit den operativ Beteiligten (Bauherr, Betrieb, Bauüberwachung, Bauleitung, Poliere, Arbeitskräfte) Baustelleneinführungsgespräch, Vorbereitung, alle Punkte werden angesprochen", hinweise: "Sicherheitsunterweisung, Kommunikation, Befugnisse, Einweisungen, Aufmaße, Pläne etc.", lines: "L1035–L1038",
    quote: "\\hline 6 & \\begin{tabular}{l}\nZu Beginn der Maßnahme gibt es ein umfassendes Startgespräch mit den operativ Beteiligten (Bauherr, Betrieb, Bauüberwachung, Bauleitung, Poliere, Arbeitskräfte) \\\\\nBaustelleneinführungsgespräch, Vorbereitung, alle Punkte werden angesprochen\n\\end{tabular} & Sicherheitsunterweisung, Kommunikation, Befugnisse, Einweisungen, Aufmaße, Pläne etc. \\\\" },
  { nr: "n7", nr_num: 7, nr_printed: "7", group: null, kriterium: "Separate Einweisung, inkl. Sicherheitsunterweisung für jedes einzelne ausführende Unternehmen Der Hauptauftragnehmer bindet die Nachunternehmenden mit ein", hinweise: "Die Gespräche sind detailliert vorbereitet, werden durchgeführt und ggf. gegen Unterschrift dokumentiert", lines: "L1039–L1042",
    quote: "\\hline 7 & \\begin{tabular}{l}\nSeparate Einweisung, inkl. Sicherheitsunterweisung für jedes einzelne ausführende Unternehmen \\\\\nDer Hauptauftragnehmer bindet die Nachunternehmenden mit ein\n\\end{tabular} & Die Gespräche sind detailliert vorbereitet, werden durchgeführt und ggf. gegen Unterschrift dokumentiert \\\\" },
  { nr: "n8", nr_num: 8, nr_printed: "8", group: null, kriterium: "Umgang mit Gefahrstoffen wird geschult", hinweise: "Ausführliche Dokumentationen zu den Gefahrstoffen werden vor der Anwendung eingefordert und vorgelegt Beispielsweise sind in besonders schutzbedürftigen Bereichen besondere Einweisungen erforderlich", lines: "L1043–L1046",
    quote: "\\hline 8 & Umgang mit Gefahrstoffen wird geschult & \\begin{tabular}{l}\nAusführliche Dokumentationen zu den Gefahrstoffen werden vor der Anwendung eingefordert und vorgelegt \\\\\nBeispielsweise sind in besonders schutzbedürftigen Bereichen besondere Einweisungen erforderlich\n\\end{tabular} \\\\" },
  { nr: "n9", nr_num: 9, nr_printed: "9", group: null, kriterium: "Die Auflagen des Genehmigungsbescheids sind bekannt und werden berücksichtigt", hinweise: "", lines: "L1047",
    quote: "\\hline 9 & Die Auflagen des Genehmigungsbescheids sind bekannt und werden berücksichtigt & \\\\" },
  { nr: "n10", nr_num: 10, nr_printed: "10", group: null, kriterium: "Kampfmittelfreiheit ist vor Ausführungsbeginn hergestellt, die erforderlichen Freigaben liegen vor", hinweise: "Die Umsetzung der Maßnahmen und die Freigaben sind sorgfältig zu überwachen", lines: "L1048",
    quote: "\\hline 10 & Kampfmittelfreiheit ist vor Ausführungsbeginn hergestellt, die erforderlichen Freigaben liegen vor & Die Umsetzung der Maßnahmen und die Freigaben sind sorgfältig zu überwachen \\\\" },
  { nr: "n11", nr_num: 11, nr_printed: "11", group: null, kriterium: "Altlasten, Schadstoffe in Bauwerken etc. sind bekannt Der fachgerechte Umgang damit und der Entsorgungsweg ist vorab geklärt Zurückgestellte Untersuchungen werden zeitgerecht nachgeholt", hinweise: "Gegebenenfalls Untersuchungsumfang erweitern, falls dies in bestimmten Bereichen nicht durchgeführt worden sein sollte; insbesondere in nicht zugänglichen Bereichen", lines: "L1049–L1053",
    quote: "\\hline 11 & \\begin{tabular}{l}\nAltlasten, Schadstoffe in Bauwerken etc. sind bekannt \\\\\nDer fachgerechte Umgang damit und der Entsorgungsweg ist vorab geklärt \\\\\nZurückgestellte Untersuchungen werden zeitgerecht nachgeholt\n\\end{tabular} & Gegebenenfalls Untersuchungsumfang erweitern, falls dies in bestimmten Bereichen nicht durchgeführt worden sein sollte; insbesondere in nicht zugänglichen Bereichen \\\\" },
  { nr: "n12", nr_num: 12, nr_printed: "12", group: null, kriterium: "Zur Ausführung freigegebene Planunterlagen liegen vor und werden von den ausführenden Unternehmen als Grundlage für die Ausführung akzeptiert Das System „Änderungsmanagement\" ist eingeführt und bekannt", hinweise: "Bedenkenanmeldungen ausführender Unternehmen werden zeitnah und konsequent behandelt Gegebenenfalls sollte ein Baustopp gemeinsam vereinbart werden, um eine Entscheidung vor der Ausführung zu treffen", lines: "L1063–L1069",
    quote: "\\hline 12 & \\begin{tabular}{l}\nZur Ausführung freigegebene Planunterlagen liegen vor und werden von den ausführenden Unternehmen als Grundlage für die Ausführung akzeptiert \\\\\nDas System „Änderungsmanagement\" ist eingeführt und bekannt\n\\end{tabular} & \\begin{tabular}{l}\nBedenkenanmeldungen ausführender Unternehmen werden zeitnah und konsequent behandelt \\\\\nGegebenenfalls sollte ein Baustopp gemeinsam vereinbart werden, um eine Entscheidung vor der Ausführung zu treffen\n\\end{tabular} \\\\" },
  { nr: "n13", nr_num: 13, nr_printed: "13", group: null, kriterium: "Von Bauunternehmen vorzulegende Unterlagen, wie Baustelleneinrichtungspläne, Werkund Montageplanung, Betonierabschnittsplanung etc. wurden vorgelegt und freigegeben", hinweise: "Bei Vortrieb auch Rohrverlegepläne, Schachtmasken etc. Fertigteilpläne werden rechtzeitig vorgelegt und auf Übereinstimmung mit der Ausführungsplanung überprüft", lines: "L1070",
    quote: "\\hline 13 & Von Bauunternehmen vorzulegende Unterlagen, wie Baustelleneinrichtungspläne, Werkund Montageplanung, Betonierabschnittsplanung etc. wurden vorgelegt und freigegeben & Bei Vortrieb auch Rohrverlegepläne, Schachtmasken etc. Fertigteilpläne werden rechtzeitig vorgelegt und auf Übereinstimmung mit der Ausführungsplanung überprüft \\\\" },
  { nr: "n14", nr_num: 14, nr_printed: "14", group: null, kriterium: "Freigabefristen sind mit realistischer Dauer vereinbart", hinweise: "", lines: "L1071",
    quote: "\\hline 14 & Freigabefristen sind mit realistischer Dauer vereinbart & \\\\" },
  { nr: "n15", nr_num: 15, nr_printed: "15", group: null, kriterium: "Abrechnungs- und Vertragsmodalitäten werden berücksichtigt (bspw. besondere Formulare des Auftraggebers)", hinweise: "", lines: "L1072",
    quote: "\\hline 15 & Abrechnungs- und Vertragsmodalitäten werden berücksichtigt (bspw. besondere Formulare des Auftraggebers) & \\\\" },
  { nr: "n16", nr_num: 16, nr_printed: "16", group: null, kriterium: "Regelungen zur Leistungs- und Aufmaßfeststellung, und damit zur Abrechnung, sind geklärt", hinweise: "Falls Vorauszahlungen vereinbart werden, sind Vorauszahlungsbürgschaften vorzulegen", lines: "L1073",
    quote: "\\hline 16 & Regelungen zur Leistungs- und Aufmaßfeststellung, und damit zur Abrechnung, sind geklärt & Falls Vorauszahlungen vereinbart werden, sind Vorauszahlungsbürgschaften vorzulegen \\\\" },
  { nr: "n17", nr_num: 17, nr_printed: "17", group: null, kriterium: "Bautagebücher (Bauüberwachung) und Bautagesberichte (Unternehmen) werden jeweils zeitnah vorgelegt oder angefordert", hinweise: "Umfang und Form sind vorab abzustimmen", lines: "L1074",
    quote: "\\hline 17 & Bautagebücher (Bauüberwachung) und Bautagesberichte (Unternehmen) werden jeweils zeitnah vorgelegt oder angefordert & Umfang und Form sind vorab abzustimmen \\\\" },
  { nr: "n18", nr_num: 18, nr_printed: "18", group: null, kriterium: "Lieferungen und Transporte von Schüttgütern, Bauteilen, Materialien und Anlagetechnik werden angemeldet Die Lagerplätze sind vorab definiert und werden eingehalten Eingangsüberwachung der gelieferten Bauteile und Materialien findet statt", hinweise: "Baulogistik", lines: "L1075–L1079",
    quote: "\\hline 18 & \\begin{tabular}{l}\nLieferungen und Transporte von Schüttgütern, Bauteilen, Materialien und Anlagetechnik werden angemeldet \\\\\nDie Lagerplätze sind vorab definiert und werden eingehalten \\\\\nEingangsüberwachung der gelieferten Bauteile und Materialien findet statt\n\\end{tabular} & Baulogistik \\\\" },
  { nr: "n19", nr_num: 19, nr_printed: "19", group: null, kriterium: "Zwischenfeststellungen gemäß § 4 Abs. 10 VOB/B: Bauteile, die verdeckt werden, sind festzustellen. Bspw. Bewehrungsüberdeckungen, vorgehängte Fassaden etc. Zwischenstände sind zu dokumentieren", hinweise: "Es ist festzulegen, zu welchen Bauständen diese Zwischenfeststellungen erfolgen müssen; idealerweise erfolgen die Festlegungen im Terminplan", lines: "L1080",
    quote: "\\hline 19 & Zwischenfeststellungen gemäß § 4 Abs. 10 VOB/B: Bauteile, die verdeckt werden, sind festzustellen. Bspw. Bewehrungsüberdeckungen, vorgehängte Fassaden etc. Zwischenstände sind zu dokumentieren & Es ist festzulegen, zu welchen Bauständen diese Zwischenfeststellungen erfolgen müssen; idealerweise erfolgen die Festlegungen im Terminplan \\\\" },
  { nr: "n20", nr_num: 20, nr_printed: "20", group: null, kriterium: "Maßnahmen zur Zustandsfeststellung vor provisorischer oder temporärer Nutzung fertiggestellter Bauteile werden vereinbart Es ist geklärt, wer die Kosten für die Reparatur während der Nutzung beschädigter Bauteile übernimmt", hinweise: "Die Abnahme erfolgt erst nach Abschluss der gesamten Ausführungsleistungen und ggf. der Inbetriebnahme; abhängig vom festgelegten Inbetriebnahmeplan", lines: "L1081–L1084",
    quote: "\\hline 20 & \\begin{tabular}{l}\nMaßnahmen zur Zustandsfeststellung vor provisorischer oder temporärer Nutzung fertiggestellter Bauteile werden vereinbart \\\\\nEs ist geklärt, wer die Kosten für die Reparatur während der Nutzung beschädigter Bauteile übernimmt\n\\end{tabular} & Die Abnahme erfolgt erst nach Abschluss der gesamten Ausführungsleistungen und ggf. der Inbetriebnahme; abhängig vom festgelegten Inbetriebnahmeplan \\\\" },
  { nr: "n21", nr_num: 21, nr_printed: "21", group: null, kriterium: "Eine bedarfsgerechte Anwesenheit der Bauüberwachung vor Ort ist im Vorfeld festgelegt und wird eingehalten Die Honorierung ist geklärt", hinweise: "Ist Gegenstand der Ausschreibung der Pla-nungs- und Bauüberwachungsleistungen Die Betreuungsintensität hängt von den beauftragten Unternehmen und den Randbedingungen ab", lines: "L1085–L1091",
    quote: "\\hline 21 & \\begin{tabular}{l}\nEine bedarfsgerechte Anwesenheit der Bauüberwachung vor Ort ist im Vorfeld festgelegt und wird eingehalten \\\\\nDie Honorierung ist geklärt\n\\end{tabular} & \\begin{tabular}{l}\nIst Gegenstand der Ausschreibung der Pla-nungs- und Bauüberwachungsleistungen \\\\\nDie Betreuungsintensität hängt von den beauftragten Unternehmen und den Randbedingungen ab\n\\end{tabular} \\\\" },
  { nr: "n22", nr_num: 22, nr_printed: "22", group: null, kriterium: "Bei kleineren Maßnahmen können auch unangekündigte Vor-Ort-Termine von Bauüberwachung und ggf. SiGeKo sinnvoll sein", hinweise: "Falls der Überwachungsaufwand nicht sehr groß ist, kann sich das anbieten", lines: "L1101",
    quote: "\\hline 22 & Bei kleineren Maßnahmen können auch unangekündigte Vor-Ort-Termine von Bauüberwachung und ggf. SiGeKo sinnvoll sein & Falls der Überwachungsaufwand nicht sehr groß ist, kann sich das anbieten \\\\" },
  { nr: "n23", nr_num: 23, nr_printed: "23", group: null, kriterium: "Es liegt eine umfassende, an die Gegebenheiten und an das Bauvorhaben angepasste, bedarfsorientierte Baustellenordnung vor Die Verhaltensregeln sind transparent und verständlich beschrieben Die Einhaltung wird überwacht", hinweise: "Baustelleneinführungsgespräch etc.", lines: "L1102–L1105",
    quote: "\\hline 23 & \\begin{tabular}{l}\nEs liegt eine umfassende, an die Gegebenheiten und an das Bauvorhaben angepasste, bedarfsorientierte Baustellenordnung vor Die Verhaltensregeln sind transparent und verständlich beschrieben \\\\\nDie Einhaltung wird überwacht\n\\end{tabular} & Baustelleneinführungsgespräch etc. \\\\" },
  { nr: "n24", nr_num: 24, nr_printed: "24", group: null, kriterium: "Der Qualitätssicherungsplan wird von der Bauüberwachung konsequent umgesetzt", hinweise: "u. a. Betonüberwachung, Prüfpunkte während der Ausführung und vieles mehr", lines: "L1106",
    quote: "\\hline 24 & Der Qualitätssicherungsplan wird von der Bauüberwachung konsequent umgesetzt & u. a. Betonüberwachung, Prüfpunkte während der Ausführung und vieles mehr \\\\" },
  { nr: "n25", nr_num: 25, nr_printed: "25", group: null, kriterium: "Die Projektbeteiligten dokumentieren und kennzeichnen aktuelle notwendige Provisorien, welche nach der Bauausführung entfernt werden: Fotodokumentation, beschreibende Ergänzung etc.", hinweise: "", lines: "L1107",
    quote: "\\hline 25 & Die Projektbeteiligten dokumentieren und kennzeichnen aktuelle notwendige Provisorien, welche nach der Bauausführung entfernt werden: Fotodokumentation, beschreibende Ergänzung etc. & \\\\" },
  { nr: "n26", nr_num: 26, nr_printed: "26", group: null, kriterium: "Die Besprechungsarten und die Besprechungsregelungen sind festgelegt Gegebenenfalls kann der Bauherr in interner Runde mit dem Betrieb kommunizieren", hinweise: "", lines: "L1108",
    quote: "\\hline 26 & Die Besprechungsarten und die Besprechungsregelungen sind festgelegt Gegebenenfalls kann der Bauherr in interner Runde mit dem Betrieb kommunizieren & \\\\" },
  { nr: "n27", nr_num: 27, nr_printed: "27", group: null, kriterium: "Baubesprechungen werden regelmäßig abgehalten und protokolliert Die Kommunikation der Ergebnisse ist sichergestellt (Firmen- und Bauherrenorganisation, inkl. Planungsbeteiligter)", hinweise: "", lines: "L1109–L1112",
    quote: "\\hline 27 & \\begin{tabular}{l}\nBaubesprechungen werden regelmäßig abgehalten und protokolliert \\\\\nDie Kommunikation der Ergebnisse ist sichergestellt (Firmen- und Bauherrenorganisation, inkl. Planungsbeteiligter)\n\\end{tabular} & \\\\" },
  { nr: "n28", nr_num: 28, nr_printed: "28", group: null, kriterium: "Es erfolgte eine durchgängige und stets aktuelle Überprüfung des bereits vertraglich vereinbarten Bauzeitenplans auf erforderliche Änderungen", hinweise: "", lines: "L1113",
    quote: "\\hline 28 & Es erfolgte eine durchgängige und stets aktuelle Überprüfung des bereits vertraglich vereinbarten Bauzeitenplans auf erforderliche Änderungen & \\\\" },
  { nr: "n29", nr_num: 29, nr_printed: "29", group: null, kriterium: "Befugnisse der Projektbeteiligten auf Auftraggeberseite sind geklärt und im Projekt bekannt", hinweise: "Im Projekthandbuch festgelegt Es muss bspw. geklärt sein, wer auftraggeberseitig Anordnungen zur Ausführung geben darf; diese führen in der Regel zu Nachträgen oder zu Vertragsänderungen; die Wertgrenzen sind geklärt", lines: "L1114–L1117",
    quote: "\\hline 29 & Befugnisse der Projektbeteiligten auf Auftraggeberseite sind geklärt und im Projekt bekannt & \\begin{tabular}{l}\nIm Projekthandbuch festgelegt \\\\\nEs muss bspw. geklärt sein, wer auftraggeberseitig Anordnungen zur Ausführung geben darf; diese führen in der Regel zu Nachträgen oder zu Vertragsänderungen; die Wertgrenzen sind geklärt\n\\end{tabular} \\\\" },
  { nr: "n30", nr_num: 30, nr_printed: "30", group: null, kriterium: "Es ist geklärt, wer auf der Seite der ausführenden Unternehmen Anordnungen des Auftraggebers empfangen darf", hinweise: "", lines: "L1118",
    quote: "\\hline 30 & Es ist geklärt, wer auf der Seite der ausführenden Unternehmen Anordnungen des Auftraggebers empfangen darf & \\\\" },
  { nr: "n31", nr_num: 31, nr_printed: "31", group: null, kriterium: "Das Projekthandbuch wird an die jeweils aktuellen Gegebenheiten angepasst und aktuell gehalten", hinweise: "", lines: "L1119",
    quote: "\\hline 31 & Das Projekthandbuch wird an die jeweils aktuellen Gegebenheiten angepasst und aktuell gehalten & \\\\" },
  { nr: "n32", nr_num: 32, nr_printed: "32", group: null, kriterium: "Das Vervollständigen der Ausführungsplanung erfolgt während der Objektausführung", hinweise: "Werk- und Montagepläne der Firmen werden angefordert, überprüft und in die Ausführungsplanung integriert Sonstige Änderungen werden ins Änderungsmanagement aufgenommen und dort behandelt", lines: "L1129",
    quote: "\\hline 32 & Das Vervollständigen der Ausführungsplanung erfolgt während der Objektausführung & Werk- und Montagepläne der Firmen werden angefordert, überprüft und in die Ausführungsplanung integriert Sonstige Änderungen werden ins Änderungsmanagement aufgenommen und dort behandelt \\\\" },
  { nr: "n33", nr_num: 33, nr_printed: "33", group: null, kriterium: "Abnahmen und damit verbunden die Übergabe der Dokumentation sind strikt geregelt Die Zeitpunkte für die Abnahmen sind in der Inbetriebnahmeplanung enthalten", hinweise: "Dokumentation als wesentliche Grundlage für abnahmereife Leistungen", lines: "L1130",
    quote: "\\hline 33 & Abnahmen und damit verbunden die Übergabe der Dokumentation sind strikt geregelt Die Zeitpunkte für die Abnahmen sind in der Inbetriebnahmeplanung enthalten & Dokumentation als wesentliche Grundlage für abnahmereife Leistungen \\\\" },
  { nr: "n34", nr_num: 34, nr_printed: "34", group: null, kriterium: "Anforderungen des Produktsicherheitsgesetzes (ProdSG) (Umsetzung der Maschinenrichtlinie, Richtlinie 2006/42/EG), im Hinblick auf vollständige/unvollständige Maschinen sind geklärt Sicherheitsanforderungen (CE-Konformität mehrerer Aggregate: Bauherr ist Inverkehrbringerl Risikoanalyse, Dokumentation, Betriebsanweisung liegen vor, bevor die Anlage in Betrieb geht Haftung als Inverkehrbringer beachten", hinweise: "Die Betriebsanweisung wird vom Betreiber erstellt. Er kann sich hierzu Dritter bedienen", lines: "L1131",
    quote: "\\hline 34 & Anforderungen des Produktsicherheitsgesetzes (ProdSG) (Umsetzung der Maschinenrichtlinie, Richtlinie 2006/42/EG), im Hinblick auf vollständige/unvollständige Maschinen sind geklärt Sicherheitsanforderungen (CE-Konformität mehrerer Aggregate: Bauherr ist Inverkehrbringerl Risikoanalyse, Dokumentation, Betriebsanweisung liegen vor, bevor die Anlage in Betrieb geht Haftung als Inverkehrbringer beachten & Die Betriebsanweisung wird vom Betreiber erstellt. Er kann sich hierzu Dritter bedienen \\\\" },
];

// ---------------------------------------------------------------------------
// B. 5 QE 6.6: Inbetriebnahme, Testbetrieb, Abnahme — L1138–L1167 (10 printed items; worksheet M8203-17)
// ---------------------------------------------------------------------------
export const QE_B5_ITEMS: readonly QeItem[] = [
  { nr: "n1", nr_num: 1, nr_printed: "1", group: null, kriterium: "Wasserwirtschaftliche Abnahmen vor Inbetriebnahme", hinweise: "Mit Genehmigungsbehörden klären, abhängig von Anlage, Behörde etc.", lines: "L1141",
    quote: "\\hline 1 & Wasserwirtschaftliche Abnahmen vor Inbetriebnahme & Mit Genehmigungsbehörden klären, abhängig von Anlage, Behörde etc. \\\\" },
  { nr: "n2", nr_num: 2, nr_printed: "2", group: null, kriterium: "Grundlage für dieses Phase ist die detaillierte Inbetriebnahmeplanung, die auch die Abnahmezeitpunkte geregelt hat", hinweise: "Betriebsphasen, Inbetriebnahmen, Außerbetriebnahmen, Abstimmung auf Anlagenbestand etc.", lines: "L1142",
    quote: "\\hline 2 & Grundlage für dieses Phase ist die detaillierte Inbetriebnahmeplanung, die auch die Abnahmezeitpunkte geregelt hat & Betriebsphasen, Inbetriebnahmen, Außerbetriebnahmen, Abstimmung auf Anlagenbestand etc. \\\\" },
  { nr: "n3", nr_num: 3, nr_printed: "3", group: null, kriterium: "Die Ausarbeitung des Inbetriebnahmeorganigramms erfolgt durch den Bauherrn im Rahmen der Ausführung, rechtzeitig vor Inbetriebnahme", hinweise: "", lines: "L1143",
    quote: "\\hline 3 & Die Ausarbeitung des Inbetriebnahmeorganigramms erfolgt durch den Bauherrn im Rahmen der Ausführung, rechtzeitig vor Inbetriebnahme & \\\\" },
  { nr: "n4", nr_num: 4, nr_printed: "4", group: null, kriterium: "Es fanden Vorbegehungen und Vorkontrollen (z. B. Montagekontrollen) der Anlagen statt Eine Aufklärung über den Gefahren- und Haftungsübergang vom Errichter bzw. Hersteller zum Nutzer bzw. Betreiber hat stattgefunden", hinweise: "", lines: "L1144",
    quote: "\\hline 4 & Es fanden Vorbegehungen und Vorkontrollen (z. B. Montagekontrollen) der Anlagen statt Eine Aufklärung über den Gefahren- und Haftungsübergang vom Errichter bzw. Hersteller zum Nutzer bzw. Betreiber hat stattgefunden & \\\\" },
  { nr: "n5", nr_num: 5, nr_printed: "5", group: null, kriterium: "Es wurden Probe- und Testbetriebe (z. B. auch sog. Kalttests und Tests mit Medium) vereinbart, dokumentiert und erfolgreich abgeschlossen Vertraglich vereinbarte Zielgrößen und Leistungsgrenzen wurden eingehalten", hinweise: "Im Einzelfall kann die Hinzunahme eines von beiden Seiten anerkannten Sachverständigenbüros sinnvoll sein", lines: "L1145",
    quote: "\\hline 5 & Es wurden Probe- und Testbetriebe (z. B. auch sog. Kalttests und Tests mit Medium) vereinbart, dokumentiert und erfolgreich abgeschlossen Vertraglich vereinbarte Zielgrößen und Leistungsgrenzen wurden eingehalten & Im Einzelfall kann die Hinzunahme eines von beiden Seiten anerkannten Sachverständigenbüros sinnvoll sein \\\\" },
  { nr: "n6", nr_num: 6, nr_printed: "6", group: null, kriterium: "Die Probe- und Testbetriebe werden von den ausführenden Unternehmen verantwortlich durchgeführt; der Betrieb begleitet", hinweise: "Wird die betriebsbereite Anlage gefahren, sind die Befugnisse und Eingriffsmöglichkeiten zwischen AG (Betrieb) und ausführendem Unternehmen geklärt und dokumentiert", lines: "L1155",
    quote: "\\hline 6 & Die Probe- und Testbetriebe werden von den ausführenden Unternehmen verantwortlich durchgeführt; der Betrieb begleitet & Wird die betriebsbereite Anlage gefahren, sind die Befugnisse und Eingriffsmöglichkeiten zwischen AG (Betrieb) und ausführendem Unternehmen geklärt und dokumentiert \\\\" },
  { nr: "n7", nr_num: 7, nr_printed: "7", group: null, kriterium: "Einweisungen und Schulungen durch den Hersteller ermöglichen dem Betrieb, die Anlagen zu übernehmen", hinweise: "Die Schulungen können in verschiedenen Stufen vor oder nach der Abnahme erfolgen", lines: "L1156",
    quote: "\\hline 7 & Einweisungen und Schulungen durch den Hersteller ermöglichen dem Betrieb, die Anlagen zu übernehmen & Die Schulungen können in verschiedenen Stufen vor oder nach der Abnahme erfolgen \\\\" },
  { nr: "n8", nr_num: 8, nr_printed: "8", group: null, kriterium: "Die Abnahmen werden durchgeführt", hinweise: "Die Zeitpunkte der Abnahme der einzelnen Gewerke sind geplant und auf die Inbetriebnahmeszenarien abgestimmt", lines: "L1157",
    quote: "\\hline 8 & Die Abnahmen werden durchgeführt & Die Zeitpunkte der Abnahme der einzelnen Gewerke sind geplant und auf die Inbetriebnahmeszenarien abgestimmt \\\\" },
  { nr: "n9", nr_num: 9, nr_printed: "9", group: null, kriterium: "Damit verbunden liegt ein Wartungs- und Instandhaltungsplan für Bauwerke und Anlageneinheiten vor Das Ersatzteilmanagement hat die Ergänzungen der neuen Anlagenteile aufgenommen", hinweise: "Ein separater Wartungsvertrag ist zu empfehlen. Dieser wird i. d. R. vom Betrieb beauftragt Während der Gewährleistungsfristen darf die Wartung nur vom Anlagenerrichter durchgeführt werden", lines: "L1158–L1161",
    quote: "\\hline 9 & \\begin{tabular}{l}\nDamit verbunden liegt ein Wartungs- und Instandhaltungsplan für Bauwerke und Anlageneinheiten vor \\\\\nDas Ersatzteilmanagement hat die Ergänzungen der neuen Anlagenteile aufgenommen\n\\end{tabular} & Ein separater Wartungsvertrag ist zu empfehlen. Dieser wird i. d. R. vom Betrieb beauftragt Während der Gewährleistungsfristen darf die Wartung nur vom Anlagenerrichter durchgeführt werden \\\\" },
  { nr: "n10", nr_num: 10, nr_printed: "10", group: null, kriterium: "Ausblick auf die Betriebsphase für verfahrenstechnische Optimierungen", hinweise: "Erkenntnisse aus der Inbetriebnahme / aus dem Probebetrieb münden in verfahrenstechnischen Optimierungen und Optimierungen der Automatisierungstechnik Betriebsanweisungen sind fortzuschreiben", lines: "L1162–L1165",
    quote: "\\hline 10 & Ausblick auf die Betriebsphase für verfahrenstechnische Optimierungen & \\begin{tabular}{l}\nErkenntnisse aus der Inbetriebnahme / aus dem Probebetrieb münden in verfahrenstechnischen Optimierungen und Optimierungen der Automatisierungstechnik \\\\\nBetriebsanweisungen sind fortzuschreiben\n\\end{tabular} \\\\" },
];

// ---------------------------------------------------------------------------
// B. 6 QE 6.7: Projektabschluss — L1172–L1190 (6 printed items; worksheet M8203-18)
// ---------------------------------------------------------------------------
export const QE_B6_ITEMS: readonly QeItem[] = [
  { nr: "n1", nr_num: 1, nr_printed: "1", group: null, kriterium: "As-built-Modell wird erstellt Datenübergabe erfolgt an den Betrieb zur Weiternutzung Der Betrieb führt den digitalen Bestand im Idealfall mit digitalen Wartungsplänen fort", hinweise: "Ergänzungen siehe 7.2", lines: "L1174",
    quote: "\\hline 1 & As-built-Modell wird erstellt Datenübergabe erfolgt an den Betrieb zur Weiternutzung Der Betrieb führt den digitalen Bestand im Idealfall mit digitalen Wartungsplänen fort & Ergänzungen siehe 7.2 \\\\" },
  { nr: "n2", nr_num: 2, nr_printed: "2", group: null, kriterium: "Daten und Unterlagen des kompletten Projekts werden systematisch zusammengestellt und archiviert", hinweise: "Eine Grundlage ist die laufend geführte Dokumentenbedarfsliste Der Maßstab ist, dass in ein paar Jahren einzelne Dokumente gezielt gefunden werden können", lines: "L1175",
    quote: "\\hline 2 & Daten und Unterlagen des kompletten Projekts werden systematisch zusammengestellt und archiviert & Eine Grundlage ist die laufend geführte Dokumentenbedarfsliste Der Maßstab ist, dass in ein paar Jahren einzelne Dokumente gezielt gefunden werden können \\\\" },
  { nr: "n3", nr_num: 3, nr_printed: "3", group: null, kriterium: "Es wird empfohlen, die Gewährleistungsverfolgung nach der Inbetriebnahme nicht mehr im Projektteam zu belassen, sondern an betriebliche Abteilungen zu übergeben Ist der Planer für die LPH 9 beauftragt, werden die Zuständigkeiten auf beiden Seiten klar geregelt (bspw. Einsetzen eines Gewährleistungsbeauftragten auf Seiten des Bauherrn)", hinweise: "", lines: "L1176",
    quote: "\\hline 3 & Es wird empfohlen, die Gewährleistungsverfolgung nach der Inbetriebnahme nicht mehr im Projektteam zu belassen, sondern an betriebliche Abteilungen zu übergeben Ist der Planer für die LPH 9 beauftragt, werden die Zuständigkeiten auf beiden Seiten klar geregelt (bspw. Einsetzen eines Gewährleistungsbeauftragten auf Seiten des Bauherrn) & \\\\" },
  { nr: "n4", nr_num: 4, nr_printed: "4", group: null, kriterium: "Projektabschlussgespräche, Bewertungen des Projekts, Reviews, Erkennen von Optimierungspotenzialen werden auf der Grundlage einer ausgearbeiteten Checkliste durchgeführt Schlüssige Dokumentation sowie eine Maßnahmenliste für Verbesserungspotenziale werden in diesem Zuge erarbeitet, bereitgestellt und in der Folgezeit umgesetzt", hinweise: "Gegebenenfalls ist eine Unterteilung in interne Gespräche und Gespräche zusammen mit Externen sinnvoll", lines: "L1184",
    quote: "\\hline 4 & Projektabschlussgespräche, Bewertungen des Projekts, Reviews, Erkennen von Optimierungspotenzialen werden auf der Grundlage einer ausgearbeiteten Checkliste durchgeführt Schlüssige Dokumentation sowie eine Maßnahmenliste für Verbesserungspotenziale werden in diesem Zuge erarbeitet, bereitgestellt und in der Folgezeit umgesetzt & Gegebenenfalls ist eine Unterteilung in interne Gespräche und Gespräche zusammen mit Externen sinnvoll \\\\" },
  { nr: "n5", nr_num: 5, nr_printed: "5", group: null, kriterium: "Kaufmännischer und finanzieller Abschluss der Projekte erfolgt, bevor die Buchhaltung die Aktivierung durchführen kann Es findet ein Kostenabschluss des Projekts statt", hinweise: "", lines: "L1185–L1188",
    quote: "\\hline 5 & \\begin{tabular}{l}\nKaufmännischer und finanzieller Abschluss der Projekte erfolgt, bevor die Buchhaltung die Aktivierung durchführen kann \\\\\nEs findet ein Kostenabschluss des Projekts statt\n\\end{tabular} & \\\\" },
  { nr: "n6", nr_num: 6, nr_printed: "6", group: null, kriterium: "Die Inhalte der Dokumentenbedarfsliste werden abgearbeitet, zusammengestellt und übergeben", hinweise: "", lines: "L1189",
    quote: "\\hline 6 & Die Inhalte der Dokumentenbedarfsliste werden abgearbeitet, zusammengestellt und übergeben & \\\\" },
];

export const QE_CATALOGUES: readonly QeCatalogue[] = [
  { code: "QE_A1", title_de: "A. 1 QE 5.2: Bedarfsplanung Konzept", clause_reference: "Anhang A.1 (QE 5.2)", lines: "L687–L711", worksheets: "M8203-07", verification_status: "md_verified", heading: "\\section*{A. 1 QE 5.2: Bedarfsplanung Konzept}", heading_line: "L685", items: QE_A1_ITEMS },
  { code: "QE_A2", title_de: "A. 2 QE 5.3: Konzept Gesamtsystem", clause_reference: "Anhang A.2 (QE 5.3)", lines: "L715–L726", worksheets: "M8203-08", verification_status: "md_verified", heading: "\\section*{A. 2 QE 5.3: Konzept Gesamtsystem}", heading_line: "L713", items: QE_A2_ITEMS },
  { code: "QE_A3", title_de: "A. 3 QE 5.4: Identifikation von Projekten", clause_reference: "Anhang A.3 (QE 5.4)", lines: "L730–L745", worksheets: "M8203-09", verification_status: "md_verified", heading: "\\section*{A. 3 QE 5.4: Identifikation von Projekten}", heading_line: "L728", items: QE_A3_ITEMS },
  { code: "QE_A4", title_de: "A. 4 QE 5.5: Matrix Nachhaltigkeit", clause_reference: "Anhang A.4 (QE 5.5)", lines: "L750–L760", worksheets: "M8203-10", verification_status: "imported_unverified", heading: "\\caption{A. 4 QE 5.5: Matrix Nachhaltigkeit}", heading_line: "L749", items: QE_A4_ITEMS },
  { code: "QE_B1", title_de: "B. 1 QE 6.2: Bedarfsplanung Projekt", clause_reference: "Anhang B.1 (QE 6.2)", lines: "L767–L795", worksheets: "M8203-11", verification_status: "md_verified", heading: "\\section*{B. 1 QE 6.2: Bedarfsplanung Projekt}", heading_line: "L765", items: QE_B1_ITEMS },
  { code: "QE_B2", title_de: "B. 2 QE 6.3: Planung", clause_reference: "Anhang B.2 (QE 6.3)", lines: "L799–L882", worksheets: "M8203-12 / M8203-13", verification_status: "md_verified", heading: "\\section*{B. 2 QE 6.3: Planung}", heading_line: "L797", items: QE_B2_ITEMS },
  { code: "QE_B3", title_de: "B. 3 QE 6.4: Ausführungsvorbereitung", clause_reference: "Anhang B.3 (QE 6.4)", lines: "L886–L1020", worksheets: "M8203-14 / M8203-15", verification_status: "md_verified", heading: "\\caption{B. 3 QE 6.4: Ausführungsvorbereitung}", heading_line: "L886", items: QE_B3_ITEMS },
  { code: "QE_B4", title_de: "B. 4 QE 6.5: Ausführung", clause_reference: "Anhang B.4 (QE 6.5)", lines: "L1024–L1134", worksheets: "M8203-16", verification_status: "md_verified", heading: "\\caption{B. 4 QE 6.5: Ausführung}", heading_line: "L1024", items: QE_B4_ITEMS },
  { code: "QE_B5", title_de: "B. 5 QE 6.6: Inbetriebnahme, Testbetrieb, Abnahme", clause_reference: "Anhang B.5 (QE 6.6)", lines: "L1138–L1167", worksheets: "M8203-17", verification_status: "md_verified", heading: "\\caption{B. 5 QE 6.6: Inbetriebnahme, Testbetrieb, Abnahme}", heading_line: "L1138", items: QE_B5_ITEMS },
  { code: "QE_B6", title_de: "B. 6 QE 6.7: Projektabschluss", clause_reference: "Anhang B.6 (QE 6.7)", lines: "L1172–L1190", worksheets: "M8203-18", verification_status: "md_verified", heading: "\\section*{B. 6 QE 6.7: Projektabschluss}", heading_line: "L1170", items: QE_B6_ITEMS },
];

/** Composed override cue: the last sentence of Vorwort L67 + the last sentence of §1 L194 (both asserted inside their spans). */
export const QE_OVERRIDE_QUOTE = `${inSpan('Dabei stellen die angegebenen Qualitätselemente nur eine projektübergeordnete Auswahl an Kriterien dar, die im Anwendungsfall projektspezifisch ausgewählt und ergänzt werden müssen.', Q_L67, 'L67')} — ${inSpan('Die in Anhang A und B angegebenen Qualitätselemente stellen eine Auswahl an Kriterien für die Projektabwicklung dar.', Q_L194, 'L194')}`;

export function qeCatalogueAsTable(cat: QeCatalogue): RegulationTable {
  const rows: RegulationRow[] = cat.items.map((it, i) => ({
    row_key: it.nr, keys: { nr: it.nr }, group_label: it.group, label_de: `${it.nr_printed === '' ? '' : `${it.nr_num} · `}${inSpan(it.kriterium, it.quote, `${cat.code} ${it.nr} kriterium`)}`, order_index: i, // no synthesized Nr. where the cell is printed empty (U-1)
    values: { kriterium: it.kriterium, hinweise: cat.code === 'QE_A3' ? it.hinweise : cat.code === 'QE_A4' ? it.hinweise.split(' · ').map((h) => inSpan(h, it.quote, `${cat.code} ${it.nr} hinweise`)).join(' · ') : inSpan(it.hinweise, it.quote, `${cat.code} ${it.nr} hinweise`), nr_num: it.nr_num },
    verbatim_quote: it.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: cat.code, title_de: cat.title_de, clause_reference: cat.clause_reference, page_ref: null,
    key_columns: ['nr'], value_columns: [{ name: 'kriterium', type: 'string' }, { name: 'hinweise', type: 'string' }, { name: 'nr_num', type: 'number' }],
    override_policy: 'anhaltswert', override_quote: QE_OVERRIDE_QUOTE, verification_status: cat.verification_status, rows };
}

/** All ten catalogues (the `SEED_BUILDERS.m820_3` entry). */
export function m8203SeedTables(): RegulationTable[] {
  return QE_CATALOGUES.map(qeCatalogueAsTable);
}
