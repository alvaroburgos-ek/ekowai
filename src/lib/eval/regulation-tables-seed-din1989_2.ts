/**
 * DIN-1989-2 regulation-table seed builders (Plan 3 Task 17, 2026-09-18).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-1989-2\DIN-1989-2.md`
 * (927 lines; the line is in the comment next to each row). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts din1989_2 "<transcript>"`.
 * Emitted as `20260917101700_regulation_tables_seed_din1989_2.sql` (no earlier
 * DIN-1989-2 seed exists — nothing superseded).
 *
 * Edition: the transcript's title page (L1–L13) prints no date line; the edition
 * token is prod's `standards.version` "2004 (DIN 1989-2)" read in-session →
 * `'2004'` (sign-off din1989_2-I-1: a UNIQUE-key component — the owner confirms
 * the printed edition on the PDF cover before the seed is applied).
 *
 * Verification status: `md_verified` only where every printed row is lifted AND
 * every cell — numeric or displayed text — is legible (amendment F). TAB1 stays
 * `imported_unverified`: the column head of its first Funktionsprinzip column is
 * an IMAGE in the transcript (L271 `![](…08.jpg…)`) — the title "großes
 * Sedimentationsvolumen" is taken from the sibling head L272 ("kleines
 * Sedimentationsvolumen") and §5.3.2 L281 ("in einem ausreichend großen Volumen"),
 * sign-off din1989_2-U-1; the printed "-" cell (Fremdstoffrückhalt ohne
 * Sedimentationsvolumen, L273) is NOT seeded — no such type exists.
 *
 * The LaTeX token `${ }` (empty group before a superscript) is written as
 * `${'$'}{ }` inside String.raw so it is not read as a template interpolation.
 */
import type { RegulationTable, RegulationRow } from './regulation-tables';

const STD = 'DIN-1989-2';
export const DIN1989_2_EDITION = '2004';
const ED = DIN1989_2_EDITION;

// ---------------------------------------------------------------------------
// Tab. 1 — Filtertypen (§5.3.1, L265–L277). Two keys: `filterart` = the printed row heads "mit Fremdstoffrückhalt" /
// "mit Fremdstoffableitung" (L273 / L274) keyed by the prod `funktionsprinzip` enum tokens (captured din1989_2.prior.json,
// DIN-1989-2-01: fremdstoffrueckhalt | fremdstoffableitung — prod labels the row head "Funktionsprinzip", sign-off
// din1989_2-O-1) and `sedimentationsvolumen` = the three printed column heads (gross | klein | keines — the created
// select of DIN-1989-2-01). Value `typ` = the prod `filtertyp` tokens (typ_a | typ_b | typ_c), `typ_gedruckt` = the printed
// cell. The "-" cell (L273, third column) is not a row.
// ---------------------------------------------------------------------------
export const TAB1_FILTERART = ['fremdstoffrueckhalt', 'fremdstoffableitung'] as const;
export const TAB1_SEDIMENTATIONSVOLUMEN = ['gross', 'klein', 'keines'] as const;
const Q_L273 = String.raw`\hline mit Fremdstoffrückhalt & TYP A & TYP B & - \\`; // L273
const Q_L274 = String.raw`\hline mit Fremdstoffableitung & TYP A & TYP B & TYP C \\`; // L274
const TAB1_ROWS: ReadonlyArray<{ filterart: (typeof TAB1_FILTERART)[number]; sed: (typeof TAB1_SEDIMENTATIONSVOLUMEN)[number]; typ: 'typ_a' | 'typ_b' | 'typ_c'; gedruckt: string; label: string; quote: string }> = [
  { filterart: 'fremdstoffrueckhalt', sed: 'gross', typ: 'typ_a', gedruckt: 'TYP A', label: 'mit Fremdstoffrückhalt · großes Sedimentationsvolumen', quote: Q_L273 },
  { filterart: 'fremdstoffrueckhalt', sed: 'klein', typ: 'typ_b', gedruckt: 'TYP B', label: 'mit Fremdstoffrückhalt · kleines Sedimentationsvolumen', quote: Q_L273 },
  // fremdstoffrueckhalt × keines prints "-" (L273) — no type; not seeded (the lookup_fill reads "keine Zeile").
  { filterart: 'fremdstoffableitung', sed: 'gross', typ: 'typ_a', gedruckt: 'TYP A', label: 'mit Fremdstoffableitung · großes Sedimentationsvolumen', quote: Q_L274 },
  { filterart: 'fremdstoffableitung', sed: 'klein', typ: 'typ_b', gedruckt: 'TYP B', label: 'mit Fremdstoffableitung · kleines Sedimentationsvolumen', quote: Q_L274 },
  { filterart: 'fremdstoffableitung', sed: 'keines', typ: 'typ_c', gedruckt: 'TYP C', label: 'mit Fremdstoffableitung · Filter mit mechanischer Filtration ohne Sedimentationsvolumen', quote: Q_L274 },
];
export function tab1AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB1_ROWS.map((r, i) => ({
    row_key: `${r.filterart}|${r.sed}`, keys: { filterart: r.filterart, sedimentationsvolumen: r.sed }, group_label: null, label_de: r.label, order_index: i,
    values: { typ: r.typ, typ_gedruckt: r.gedruckt }, verbatim_quote: r.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB1', title_de: 'Filtertypen', clause_reference: '§5.3.1, Tab. 1', page_ref: null,
    key_columns: ['filterart', 'sedimentationsvolumen'],
    value_columns: [{ name: 'typ', type: 'string' }, { name: 'typ_gedruckt', type: 'string' }],
    override_policy: 'locked',
    override_quote: 'Aufgrund der unterschiedlichen Funktionsprinzipien sind Filter den in Tabelle 1 aufgeführten Typen zuzuordnen.', // L263
    verification_status: 'imported_unverified', rows }; // U-1 (header image L271)
}

// ---------------------------------------------------------------------------
// Tab. 2 — Prüfzeiten für Volumenströme (§6.4.5, L481–L504). Key `stufe` = the printed Q_Zu/Q_Zu,max percentage as a
// token (p100 … p1); values `q_pct` (the printed %) and `pruefzeit_min` (Prüfzeit t in min).
// ---------------------------------------------------------------------------
export const TAB2_STUFEN = [
  { value: 'p100', q_pct: 100, t_min: 2, quote: String.raw`\hline 100 & 2 \\` }, // L495
  { value: 'p50', q_pct: 50, t_min: 2, quote: String.raw`\hline 50 & 2 \\` },    // L496
  { value: 'p20', q_pct: 20, t_min: 3, quote: String.raw`\hline 20 & 3 \\` },    // L497
  { value: 'p10', q_pct: 10, t_min: 4, quote: String.raw`\hline 10 & 4 \\` },    // L498
  { value: 'p5', q_pct: 5, t_min: 8, quote: String.raw`\hline 5 & 8 \\` },       // L499
  { value: 'p2_5', q_pct: 2.5, t_min: 8, quote: String.raw`\hline 2,5 & 8 \\` }, // L500
  { value: 'p1', q_pct: 1, t_min: 8, quote: String.raw`\hline 1 & 8 \\` },       // L501
] as const;
export function tab2AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB2_STUFEN.map((s, i) => ({
    row_key: s.value, keys: { stufe: s.value }, group_label: null, label_de: `${String(s.q_pct).replace('.', ',')} % Q_Zu,max`, order_index: i,
    values: { q_pct: s.q_pct, pruefzeit_min: s.t_min }, verbatim_quote: s.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB2', title_de: 'Prüfzeiten für Volumenströme', clause_reference: '§6.4.5, Tab. 2', page_ref: null,
    key_columns: ['stufe'], value_columns: [{ name: 'q_pct', type: 'number', unit: '%' }, { name: 'pruefzeit_min', type: 'number', unit: 'min' }],
    override_policy: 'locked',
    // L479: the flows AND their durations are "festgelegt".
    override_quote: 'Das unbelastete Filtersystem wird über die vorgegebene Nennweite des Zulaufquerschnitts, Gefälle $l=1 / 100$ nach DIN EN 12056-3:2001-01, Tabelle C. 1 mit in Tabelle 2 angegebenen Volumenströmen über eine jeweils festgelegte Dauer angeströmt.',
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 3 — Prüfstoffe je 1000 Liter Prüfmedium (§6.5.1, L561–L591). Key `pruefstoff` (created tokens); values `stueck`
// (Menge Stück — printed only for the LDPE foil, "-" else → null), `masse_g` (Masse g per 1000 l), `konzentration_g_l`,
// `bezeichnung` (the printed first cell), `masse_anteile` (the PP row prints 150 as 75 + 75 for the two diameters) and
// `fussnote` (a: the LDPE foil enters the mass balance fictitiously with 10 g per piece — L588).
// ---------------------------------------------------------------------------
export const TAB3_PRUEFSTOFFE = [
  { value: 'ldpe_folie', bezeichnung: 'LDPE-Folie, 15 µm dick', stueck: 15, masse_g: 150, konz: 0.15, anteile: null, fussnote: 'a Die LDPE-Folie geht fiktiv mit 10 g/Stück in die Massenbilanz ein.',
    quote: String.raw`\hline LDPE-Folie, $15 \mu \mathrm{~m}$ dick & 15 & $150{ }^{\text {a }}$ & $0,15 \mathrm{~g} / \mathrm{l}$ \\` }, // L572 (footnote a: L588)
  { value: 'pp_kugeln', bezeichnung: 'Polypropylenkugeln d = 3,5 mm / d = 2 mm', stueck: null, masse_g: 150, konz: 0.15, anteile: '75 (d = 3,5 mm) / 75 (d = 2 mm)', fussnote: null,
    quote: String.raw`\hline Polypropylenkugeln
$$
\begin{aligned}
d & =3,5 \mathrm{~mm} \\
d & =2 \mathrm{~mm}
\end{aligned}
$$ & - & \begin{tabular}{l}
150 \\
75 \\
75
\end{tabular} & $0,15 \mathrm{~g} / \mathrm{l}$ \\` }, // L573–L583
  { value: 'quarzsand', bezeichnung: 'Quarzsand HFs 250 µm bis 1250 µm', stueck: null, masse_g: 200, konz: 0.20, anteile: null, fussnote: null,
    quote: String.raw`\hline \begin{tabular}{l}
Quarzsand HFs \\
$250 \mu \mathrm{~m}$ bis $1250 \mu \mathrm{~m}$
\end{tabular} & - & 200 & $0,20 \mathrm{~g} / \mathrm{l}$ \\` }, // L584–L587
] as const;
export function tab3AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB3_PRUEFSTOFFE.map((p, i) => ({
    row_key: p.value, keys: { pruefstoff: p.value }, group_label: null, label_de: p.bezeichnung, order_index: i,
    values: { stueck: p.stueck, masse_g: p.masse_g, konzentration_g_l: p.konz, bezeichnung: p.bezeichnung, masse_anteile: p.anteile, fussnote: p.fussnote }, verbatim_quote: p.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB3', title_de: 'Prüfstoffe je 1000 Liter Prüfmedium', clause_reference: '§6.5.1, Tab. 3', page_ref: null,
    key_columns: ['pruefstoff'],
    value_columns: [{ name: 'stueck', type: 'number', unit: 'Stück' }, { name: 'masse_g', type: 'number', unit: 'g' }, { name: 'konzentration_g_l', type: 'number', unit: 'g/l' }, { name: 'bezeichnung', type: 'string' }, { name: 'masse_anteile', type: 'string' }, { name: 'fussnote', type: 'string' }],
    override_policy: 'locked',
    override_quote: 'Die Menge, Masse und Konzentration des einzelnen Prüfstoffes je 1000 Liter Prüfmedium muss Tabelle 3 entsprechen:', // L559 (L530 prints the same sentence with a full stop)
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 4 — Zusatz Quarzsand (§6.5.1, L595–L610). Key `kornklasse` (created tokens for the two printed classes); values
// `anteil_pct` (Massenanteil %) and the printed class text.
// ---------------------------------------------------------------------------
export const TAB4_KORNKLASSEN = [
  { value: 'k125_250', gedruckt: '125 bis 250', anteil: 0, quote: String.raw`\hline 125 bis 250 & 0 \\` }, // L606
  { value: 'gt250', gedruckt: '> 250', anteil: 100, quote: String.raw`\hline$>250$ & 100 \\` },           // L607
] as const;
export function tab4AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB4_KORNKLASSEN.map((k, i) => ({
    row_key: k.value, keys: { kornklasse: k.value }, group_label: null, label_de: `Kornklasse ${k.gedruckt} µm`, order_index: i,
    values: { anteil_pct: k.anteil, kornklasse_gedruckt: k.gedruckt }, verbatim_quote: k.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB4', title_de: 'Zusatz Quarzsand', clause_reference: '§6.5.1, Tab. 4', page_ref: null,
    key_columns: ['kornklasse'], value_columns: [{ name: 'anteil_pct', type: 'number', unit: '%' }, { name: 'kornklasse_gedruckt', type: 'string' }],
    override_policy: 'locked',
    override_quote: 'Art und Zusammensetzung der Zusätze sind nach Tabelle 3 und Tabelle 4 zu wählen.', // L593
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 5 — Werkseigene Produktionskontrolle (§8.3, L730–L739). Key `merkmal` (Prüfgegenstand); values the three printed
// text cells (Anforderungen nach · Prüfung · Prüfhäufigkeit).
// ---------------------------------------------------------------------------
export const TAB5_WPK = [
  { value: 'werkstoff', gegenstand: 'Werkstoff', anforderung: 'Abschnitt 5', pruefung: 'Inaugenscheinnahme des Lieferscheines', haeufigkeit: 'Jede Anlieferung',
    quote: String.raw`\hline Werkstoff & Abschnitt 5 & Inaugenscheinnahme des Lieferscheines & Jede Anlieferung \\` }, // L735
  { value: 'masse', gegenstand: 'Maße', anforderung: 'Herstellerunterlagen', pruefung: 'Vergleich mit Erstprüfstück', haeufigkeit: 'Halbjährlich an einem Prüfstück',
    quote: String.raw`\hline Maße & Herstellerunterlagen & Vergleich mit Erstprüfstück & Halbjährlich an einem Prüfstück \\` }, // L736
] as const;
export function tab5AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB5_WPK.map((w, i) => ({
    row_key: w.value, keys: { merkmal: w.value }, group_label: null, label_de: w.gegenstand, order_index: i,
    values: { pruefgegenstand: w.gegenstand, anforderung_nach: w.anforderung, pruefung: w.pruefung, haeufigkeit: w.haeufigkeit }, verbatim_quote: w.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB5', title_de: 'Werkseigene Produktionskontrolle', clause_reference: '§8.3, Tab. 5', page_ref: null,
    key_columns: ['merkmal'],
    value_columns: [{ name: 'pruefgegenstand', type: 'string' }, { name: 'anforderung_nach', type: 'string' }, { name: 'pruefung', type: 'string' }, { name: 'haeufigkeit', type: 'string' }],
    override_policy: 'locked',
    override_quote: 'Der Mindestumfang der durchzuführenden Prüfungen und Kontrollen muss Tabelle 5 entsprechen.', // L728
    verification_status: 'md_verified', rows };
}

/** The live DIN-1989-2 set (five tables), in the order the brief's Step 2 lists them. */
export function din19892SeedTables(): RegulationTable[] {
  return [tab1AsTable(), tab2AsTable(), tab3AsTable(), tab4AsTable(), tab5AsTable()];
}
