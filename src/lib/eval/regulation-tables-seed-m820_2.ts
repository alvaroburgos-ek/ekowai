/**
 * DWA-M-820-2 regulation-table seed builders (Plan 3 Task 19, 2026-09-18).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `Desktop\Guidelines\DWA-M-820-2\DWA-M_820-2.md` (2701
 * lines; the line is in the comment next to each row). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts m820_2 "<transcript>"`.
 * Emitted as `20260917101900_regulation_tables_seed_m820_2.sql` (no earlier
 * DWA-M-820-2 table seed exists — nothing superseded; the Plan-1 selection
 * configs `20260911120000_selection_configs_DWA_M_820_2.sql` carry no tables).
 *
 * Edition: title page L9 "April 2023", imprint L48 "© DWA, 1. Auflage, Hennef
 * 2023" = prod `standards.version` 'April 2023' → `'2023'`.
 *
 * Teil 2 prints NO numeric value table (inventory §1). Its two tabular
 * structures are the printed OUTLINES of Anhang A (Statusbericht, 19 numbered
 * sections + 2 annexes, L2532–L2550 / L2556–L2557) and Anhang B (Projekthandbuch,
 * 8 chapters, L2563–L2570). They are seeded as text catalogues (one row per
 * printed line) so the two `select_many` checklists `statusbericht_abschnitte`
 * (820-2-06) and `projekthandbuch_kapitel` (820-2-05) list exactly the printed
 * outline — the options are the `gedruckt` column of these rows (pinned).
 *
 * Policy `anhaltswert`: both annexes are headed "Gliederungsvorschlag" (L2523 /
 * L2559); the brief's cue IS printed — L367 "Ein erster Gliederungsvorschlag ist
 * im Anhang B beigefügt." (§ 2.1 Projekthandbuch) and L375 "Ein Gliederungsvorschlag
 * und ein Beispiel sind im Anhang A beigefügt." (§ 2.1 Statusbericht) — plus L663
 * "Im Anhang B ist ein Gliederungsvorschlag enthalten." and L681 "Es empfiehlt
 * sich, einen Muster-Statusbericht (Gliederungsbeispiel siehe Anhang A) …
 * aufzubauen": a proposal to adapt, never a locked list. (Fix round 1: the first
 * commit falsely recorded L367 / L375 as "not printed" — retracted, see the report.)
 *
 * Verification status: `md_verified` on both — every printed row is lifted and
 * every displayed cell (number + title) is legible (amendment F).
 */
import type { RegulationTable, RegulationRow } from './regulation-tables';

const STD = 'DWA-M-820-2';
export const M820_2_EDITION = '2023';
const ED = M820_2_EDITION;

/** Cue sentences (transcript line in the name) shared with the field-config module. */
export const Q_L663 = 'Inhalte und Umfang des projektspezifischen Projekthandbuchs richten sich nach der Komplexität des jeweiligen Projekts und sind auf das Notwendige beschränkt. Im Anhang B ist ein Gliederungsvorschlag enthalten.';
export const Q_L681 = 'Es empfiehlt sich, einen Muster-Statusbericht (Gliederungsbeispiel siehe Anhang A), gegebenenfalls mit externer Unterstützung, aufzubauen, der zu Kosten, Terminen, Qualitäten, Entscheidungen, erreichten Etappenzielen etc. informiert.';
export const Q_L2523 = 'Anhang A Gliederungsvorschlag für einen Statusbericht';
export const Q_L2525 = 'Abhängig von den Anforderungen im Projekt kann der Statusbericht auf 1 bis 2 Seiten in stark zusammengefasster Form oder auch in textlicher Form in einem längeren Bericht erarbeitet werden.';
export const Q_L2559 = 'Anhang B Gliederungsvorschlag für ein Projekthandbuch';
export const Q_L367 = "Ein erster Gliederungsvorschlag ist im Anhang B beigefügt."; // § 2.1 "Projekthandbuch" — the brief's cue, printed
export const Q_L375 = "Ein Gliederungsvorschlag und ein Beispiel sind im Anhang A beigefügt."; // § 2.1 "Statusbericht" — the brief's cue for Anhang A, printed

// ---------------------------------------------------------------------------
// Anhang A — Gliederungsvorschlag für einen Statusbericht (L2523; the Inhaltsverzeichnis table L2531–L2552, the two
// printed annexes L2556–L2557). Key `abschnitt` = one token per printed line (a1 … a9_2, anhang1, anhang2); values
// `nummer` (the printed number / "Anhang n" label), `titel` (the printed title) and `gedruckt` = "<nummer> <titel>" —
// the option string of the `statusbericht_abschnitte` checklist (820-2-06). `ebene` = 1 for a numbered section,
// 2 for a numbered subsection, 0 for the two annexes (structural, derived from the printed numbering).
// ---------------------------------------------------------------------------
type OutlineRow = { value: string; nummer: string; titel: string; ebene: number; quote: string; line: number };
const A = (value: string, nummer: string, titel: string, ebene: number, line: number): OutlineRow => ({
  value, nummer, titel, ebene, line, quote: String.raw`\hline ${nummer} & ${titel} \\`,
});
export const ANHANGA_ROWS: readonly OutlineRow[] = [
  A('a1', '1', 'Einleitung', 1, 2532),
  A('a2', '2', 'Organisation', 1, 2533),
  A('a3', '3', 'Stand der Arbeiten', 1, 2534),
  A('a3_1', '3.1', 'Planung und Ausschreibungen', 2, 2535),
  A('a3_2', '3.2', 'Baufortschritt', 2, 2536),
  A('a3_3', '3.3', 'Spezielle Ereignisse', 2, 2537),
  A('a4', '4', 'Kostenübersicht', 1, 2538),
  A('a4_1', '4.1', 'Stand der Rechnungen und Zahlungen', 2, 2539),
  A('a4_2', '4.2', 'Arbeitsvergaben', 2, 2540),
  A('a4_3', '4.3', 'Projektänderungen und Nachträge', 2, 2541),
  A('a4_4', '4.4', 'Puffer (Reserven)', 2, 2542),
  A('a4_5', '4.5', 'Prognose', 2, 2543),
  A('a5', '5', 'Finanz- und Liquiditätsplan', 1, 2544),
  A('a6', '6', 'Termine', 1, 2545),
  A('a7', '7', 'Öffentlichkeitsarbeit', 1, 2546),
  A('a8', '8', 'Qualitätsüberwachung', 1, 2547),
  A('a9', '9', 'Risikoanalyse und Arbeitssicherheit', 1, 2548),
  A('a9_1', '9.1', 'Risikoanalyse', 2, 2549),
  A('a9_2', '9.2', 'Arbeitssicherheit', 2, 2550),
  // the two printed annexes (L2556 / L2557 — plain lines under the "Anhang" head, not tabular rows). L2556 ends in the
  // printed fill-in label "Stand:" (the date the plan is dated) — deliberately EXCLUDED from `titel` and `gedruckt`
  // (a label, not part of the title); it stays in the verbatim quote.
  { value: 'anhang1', nummer: 'Anhang 1', titel: 'Finanz- und Liquiditätsplan', ebene: 0, line: 2556, quote: 'Anhang 1: Finanz- und Liquiditätsplan Stand:' },
  { value: 'anhang2', nummer: 'Anhang 2', titel: 'Kosten-, Vertrags- und Zahlungsstand sowie Kostenprognose', ebene: 0, line: 2557, quote: 'Anhang 2: Kosten-, Vertrags- und Zahlungsstand sowie Kostenprognose' },
];
/** The checklist option string per row ("<nummer> <titel>"; annexes "Anhang n: <titel>" as printed). */
export const outlineOption = (r: OutlineRow): string => (r.ebene === 0 ? `${r.nummer}: ${r.titel}` : `${r.nummer} ${r.titel}`);

export function anhangAAsTable(): RegulationTable {
  const rows: RegulationRow[] = ANHANGA_ROWS.map((r, i) => ({
    row_key: r.value, keys: { abschnitt: r.value }, group_label: r.ebene === 0 ? 'Anhang' : 'Inhaltsverzeichnis', label_de: outlineOption(r), order_index: i,
    values: { nummer: r.nummer, titel: r.titel, gedruckt: outlineOption(r), ebene: r.ebene }, verbatim_quote: r.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'ANHANGA', title_de: 'Gliederungsvorschlag für einen Statusbericht (Anhang A)', clause_reference: 'Anhang A; § 4.3.6', page_ref: null,
    key_columns: ['abschnitt'],
    value_columns: [{ name: 'nummer', type: 'string' }, { name: 'titel', type: 'string' }, { name: 'gedruckt', type: 'string' }, { name: 'ebene', type: 'number' }],
    override_policy: 'anhaltswert',
    // L681 — L2525 — L375 (a "Gliederungsbeispiel" to build a project template from; length and form are the project's choice)
    override_quote: `${Q_L681} — ${Q_L2525} — ${Q_L375}`,
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Anhang B — Gliederungsvorschlag für ein Projekthandbuch (L2559; the eight printed chapters L2563–L2570, plain numbered
// lines). Key `kapitel` = b1 … b8; values `nummer`, `titel`, `gedruckt` = "<nummer> <titel>" (the option string of the
// `projekthandbuch_kapitel` checklist, 820-2-05).
// ---------------------------------------------------------------------------
const B = (value: string, nummer: string, titel: string, line: number): OutlineRow => ({ value, nummer, titel, ebene: 1, line, quote: `${nummer} ${titel}` });
export const ANHANGB_ROWS: readonly OutlineRow[] = [
  B('b1', '1', 'Aufbau und Organisation des Organisationshandbuchs', 2563),
  B('b2', '2', 'Projektinformationen', 2564),
  B('b3', '3', 'Aufbauorganisation', 2565),
  B('b4', '4', 'Aufgabenbeschreibungen', 2566),
  B('b5', '5', 'Projekt- und Planungsorganisation', 2567),
  B('b6', '6', 'EDV-, CAD-, BIM-Regelungen', 2568),
  B('b7', '7', 'Terminliche Abwicklung', 2569),
  B('b8', '8', 'Kostenmanagement', 2570),
];

export function anhangBAsTable(): RegulationTable {
  const rows: RegulationRow[] = ANHANGB_ROWS.map((r, i) => ({
    row_key: r.value, keys: { kapitel: r.value }, group_label: null, label_de: outlineOption(r), order_index: i,
    values: { nummer: r.nummer, titel: r.titel, gedruckt: outlineOption(r) }, verbatim_quote: r.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'ANHANGB', title_de: 'Gliederungsvorschlag für ein Projekthandbuch (Anhang B)', clause_reference: 'Anhang B; § 4.3.5', page_ref: null,
    key_columns: ['kapitel'],
    value_columns: [{ name: 'nummer', type: 'string' }, { name: 'titel', type: 'string' }, { name: 'gedruckt', type: 'string' }],
    override_policy: 'anhaltswert',
    // L663 — L367 (the Merkblatt's own words: contents and scope follow the project's complexity; Anhang B is "ein erster Gliederungsvorschlag")
    override_quote: `${Q_L663} — ${Q_L367}`,
    verification_status: 'md_verified', rows };
}

/** The live DWA-M-820-2 set (two outline catalogues). */
export function m8202SeedTables(): RegulationTable[] {
  return [anhangAAsTable(), anhangBAsTable()];
}
