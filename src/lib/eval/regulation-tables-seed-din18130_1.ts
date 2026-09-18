/**
 * DIN-18130-1 regulation-table seed builders (Plan 3 Task 10, 2026-09-18).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-18130-1\DIN-18130-1.md`
 * (1359 lines; the line is in the comment next to each row). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts din18130_1 "<transcript>"`.
 * Emitted as `20260917101000_regulation_tables_seed_din18130_1.sql` (no earlier
 * DIN-18130-1 seed exists — nothing superseded).
 *
 * Edition: the transcript's title page (L1–L112) prints "Ersatz für Ausgabe 1989-11"
 * (L7) and "Frühere Ausgaben DIN 18130-1: 1983-11, 1989-11" (L115–L116) but no own date;
 * the token is prod's `standards.version` "1998-05 (Ersatz für 1989-11)" read
 * in-session → `'1998-05'` (the OCR sibling `DIN-18130-1_OCR.md` prints the page
 * header "DIN 18130-1 :1998-05" at its L616 — corroboration only; sign-off
 * din18130_1-I-1).
 *
 * Verification status: `md_verified` only where every printed row is lifted AND
 * every cell is legible (TAB1, TAB2, TAB3, TAB4, S5_8, S5_8_KORN). TAB5 stays
 * `imported_unverified`: its Bauteil cells are printed as `\multirow` spans
 * (three sub-rows cannot be mapped cell-by-cell and are NOT seeded — sign-off
 * din18130_1-U-1) and several marks print as lower-case "x" while the legend
 * defines only "X" (din18130_1-U-2).
 *
 * Key tokens (G-A3): TAB5.anordnung = prod `versuchsanordnung` tokens KD/ZY/TX;
 * TAB4 / S5_8_KORN keys are the stringified prod booleans 'true'/'false'
 * (`resolveLookupFill` matches `String(value)`); TAB3.s_r_band, S5_8.bodenklasse
 * and TAB5.bodenart are the tokens of the selects CREATED by
 * `field-configs/din18130_1.ts`; TAB1.bereich_code = '1'…'5' (the value of the
 * DIN-18130-1-04-D3 `bereich_code` equation, stringified); TAB2.t_c = '5'…'25'.
 */
import type { RegulationTable, RegulationRow } from './regulation-tables';

const STD = 'DIN-18130-1';
export const DIN18130_1_EDITION = '1998-05';
const ED = DIN18130_1_EDITION;

/** Build-time SR-1 guard: every seeded cell text must be printed inside the row's own quote span. */
function inSpan(quote: string, cell: string | null, where: string): void {
  if (cell !== null && !quote.includes(cell)) throw new Error(`${where}: cell "${cell}" is not inside its verbatim_quote`);
}

// ---------------------------------------------------------------------------
// Tab. 1 — Durchlässigkeitsbereiche in Abhängigkeit vom Durchlässigkeitsbeiwert (§3.7, L199–L212).
// Keys '1'…'5' in caption order; bounds as printed ("unter 10⁻⁸" → upper 1e-8 exclusive; "10⁻⁸ bis 10⁻⁶" → 1e-8 … 1e-6
// inclusive; "über 10⁻⁶ bis 10⁻⁴" → exclusive lower / inclusive upper …). The DIN-18130-1-04-D3 `bereich_code` if-chain
// encodes exactly these five printed bounds (k < 1e-8 → 1; ≤ 1e-6 → 2; ≤ 1e-4 → 3; ≤ 1e-2 → 4; else 5).
// ---------------------------------------------------------------------------
export const TAB1_BEREICHE: ReadonlyArray<{ code: string; bereich: string; k_lower: number | null; k_upper: number | null; quote: string }> = [
  { code: '1', bereich: 'sehr schwach durchlässig', k_lower: null, k_upper: 1e-8, quote: String.raw`\hline unter $10^{-8}$ & sehr schwach durchlässig \\` }, // L205
  { code: '2', bereich: 'schwach durchlässig', k_lower: 1e-8, k_upper: 1e-6, quote: String.raw`\hline $10^{-8}$ bis $10^{-6}$ & schwach durchlässig \\` }, // L206
  { code: '3', bereich: 'durchlässig', k_lower: 1e-6, k_upper: 1e-4, quote: String.raw`\hline über $10^{-6}$ bis $10^{-4}$ & durchlässig \\` }, // L207
  { code: '4', bereich: 'stark durchlässig', k_lower: 1e-4, k_upper: 1e-2, quote: String.raw`\hline über $10^{-4}$ bis $10^{-2}$ & stark durchlässig \\` }, // L208
  { code: '5', bereich: 'sehr stark durchlässig', k_lower: 1e-2, k_upper: null, quote: String.raw`\hline über $10^{-2}$ & sehr stark durchlässig \\` }, // L209
];
export function tab1AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB1_BEREICHE.map((r, i) => {
    inSpan(r.quote, r.bereich, `TAB1 ${r.code}`);
    return { row_key: r.code, keys: { bereich_code: r.code }, group_label: null, label_de: `${r.code} – ${r.bereich}`, order_index: i, values: { bereich: r.bereich, k_lower: r.k_lower, k_upper: r.k_upper }, verbatim_quote: r.quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'TAB1', title_de: 'Durchlässigkeitsbereiche in Abhängigkeit vom Durchlässigkeitsbeiwert', clause_reference: '§3.7, Tab. 1', page_ref: null,
    key_columns: ['bereich_code'], value_columns: [{ name: 'bereich', type: 'string' }, { name: 'k_lower', type: 'number', unit: 'm/s' }, { name: 'k_upper', type: 'number', unit: 'm/s' }],
    override_policy: 'locked',
    override_quote: 'ANMERKUNG: Für bautechnische Zwecke werden fünf Durchlässigkeitsbereiche definiert (siehe Tabelle 1).', // L195
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 2 — Korrekturbeiwert α zur Berücksichtigung der Zähigkeit des Wassers (§5.7, L314–L325). The table is
// TRANSPOSED (one header row of temperatures L321, one α row L322) — the two-line span is the quote of every
// column, as A138 TAB14 did. Gl. 6 (L305) prints the closed form that reproduces these five values; TAB2 is the
// display/pin table, the equation DIN-18130-1-03-D2 computes α from the closed form (din18130_1-J-3 records the
// §9.1 example that used the LINEAR interpolation of this table instead: α = 0,754 for T = 21 °C, L953).
// ---------------------------------------------------------------------------
const TAB2_QUOTE = String.raw`\end{tabular} & 5 & 10 & 15 & 20 & 25 \\
\hline$\alpha$ & 1,158 & 1,000 & 0,874 & 0,771 & 0,686 \\`; // L321–L322
export const TAB2_ALPHA: ReadonlyArray<{ t_c: string; alpha: number; printed: string }> = [
  { t_c: '5', alpha: 1.158, printed: '1,158' },
  { t_c: '10', alpha: 1.0, printed: '1,000' },
  { t_c: '15', alpha: 0.874, printed: '0,874' },
  { t_c: '20', alpha: 0.771, printed: '0,771' },
  { t_c: '25', alpha: 0.686, printed: '0,686' },
];
export function tab2AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB2_ALPHA.map((r, i) => {
    inSpan(TAB2_QUOTE, r.printed, `TAB2 ${r.t_c}`);
    inSpan(TAB2_QUOTE, `& ${r.t_c} `, `TAB2 T=${r.t_c}`);
    return { row_key: r.t_c, keys: { t_c: r.t_c }, group_label: null, label_de: `T = ${r.t_c} °C`, order_index: i, values: { alpha: r.alpha }, verbatim_quote: TAB2_QUOTE };
  });
  return { standard_code: STD, edition: ED, table_code: 'TAB2', title_de: 'Korrekturbeiwert α zur Berücksichtigung der Zähigkeit des Wassers', clause_reference: '§5.7, Tab. 2', page_ref: null,
    key_columns: ['t_c'], value_columns: [{ name: 'alpha', type: 'number' }],
    override_policy: 'anhaltswert',
    override_quote: 'Zwischenwerte können geradlinig eingeschaltet werden.', // L327
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 3 — Sättigungsdruck u_0 in Abhängigkeit von der Sättigungszahl S_r (§6.5, L419–L432). Three discrete printed
// rows (≥ 0,95 / 0,90 / 0,85); in-between values are undefined by the table → the band is an engineer selection
// (SR-2, created select `s_r_band`). Policy `locked` (the brief's policy; fix round 1): no printed sentence permits
// intermediate values (contrast Tab. 2 L327). The standard's own example 9.3 nevertheless applies u_o = 720 kN/m² for
// S_ra = 0,88 (L1205 / L1215 — the linear interpolation between the 0,90 and 0,85 rows) — sign-off din18130_1-O-1
// proposes `anhaltswert` on that evidence; the owner rules.
// ---------------------------------------------------------------------------
export const TAB3_U0: ReadonlyArray<{ band: string; label: string; u_0: number; printed: string; quote: string }> = [
  { band: 'ge095', label: 'S_r ≥ 0,95', u_0: 300, printed: '300', quote: String.raw`\hline$\geq 0,95$ & 300 \\` }, // L427
  { band: 'e090', label: 'S_r = 0,90', u_0: 600, printed: '600', quote: String.raw`\hline 0,90 & 600 \\` }, // L428
  { band: 'e085', label: 'S_r = 0,85', u_0: 900, printed: '900', quote: String.raw`\hline 0,85 & 900 \\` }, // L429
];
export function tab3AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB3_U0.map((r, i) => {
    inSpan(r.quote, r.printed, `TAB3 ${r.band}`);
    return { row_key: r.band, keys: { s_r_band: r.band }, group_label: null, label_de: r.label, order_index: i, values: { u_0_kn_m2: r.u_0 }, verbatim_quote: r.quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'TAB3', title_de: 'Sättigungsdruck u_0 in Abhängigkeit von der Sättigungszahl S_r', clause_reference: '§6.5, Tab. 3', page_ref: null,
    key_columns: ['s_r_band'], value_columns: [{ name: 'u_0_kn_m2', type: 'number', unit: 'kN/m²' }],
    override_policy: 'locked',
    // L417 (the table is the rule; no printed sentence permits intermediate values — contrast Tab. 2 L327). O-1 proposes
    // anhaltswert on the example-9.3 evidence L1205 "S_ra = 0,88" → L1215 "u_o = 720 kN/m²".
    override_quote: 'Dazu wird das Porenwasser in dem Probekörper mit einem hydrostatischen Druck (Sättigungsdruck, back pressure) belastet (siehe Tabelle 3).',
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 4 — Einteilung der Versuche in Versuchsklassen (§3.8 / §6.7, L475–L487). Two boolean axes: "Wassersättigung
// nachgewiesen und kontrolliert nach DIN 18137-2" (prod `saettigung_aufgebracht`) × "Strömung stationär nachgewiesen"
// (created `stroemung_stationaer`); keys are the stringified booleans. `versuchsklasse` cells are prod's enum tokens
// 1a/1b/2/3 verbatim; the 1b footnote *) (L484) is carried in `fussnote`.
// ---------------------------------------------------------------------------
const TAB4_FUSSNOTE = '*) Die stationäre Strömung wird nicht nachgewiesen. Aufgrund der Versuchsbedingungen, insbesondere aufgrund der vorausgegangenen Phase der Wassersättigung kann aber angenommen werden, daß die Strömung stationär ist.'; // L484
export const TAB4_KLASSEN: ReadonlyArray<{ saettigung: 'true' | 'false'; stationaer: 'true' | 'false'; klasse: string; fussnote: string | null; quote: string }> = [
  { saettigung: 'true', stationaer: 'true', klasse: '1a', fussnote: null, quote: String.raw`\hline 1a & ja & ja \\` }, // L480
  { saettigung: 'true', stationaer: 'false', klasse: '1b', fussnote: TAB4_FUSSNOTE, quote: String.raw`\hline 1b & ja & nein*) \\` }, // L481 (footnote L484)
  { saettigung: 'false', stationaer: 'true', klasse: '2', fussnote: null, quote: String.raw`\hline 2 & nein & ja \\` }, // L482
  { saettigung: 'false', stationaer: 'false', klasse: '3', fussnote: null, quote: String.raw`\hline 3 & nein & nein \\` }, // L483
];
export function tab4AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB4_KLASSEN.map((r, i) => {
    inSpan(r.quote, r.klasse, `TAB4 ${r.klasse}`);
    return { row_key: `${r.saettigung}|${r.stationaer}`, keys: { saettigung: r.saettigung, stationaer: r.stationaer }, group_label: null,
      label_de: `Versuchsklasse ${r.klasse} (Wassersättigung ${r.saettigung === 'true' ? 'ja' : 'nein'} · Strömung stationär ${r.stationaer === 'true' ? 'ja' : 'nein'})`,
      order_index: i, values: { versuchsklasse: r.klasse, fussnote: r.fussnote }, verbatim_quote: r.quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'TAB4', title_de: 'Einteilung der Versuche in Versuchsklassen, abhängig von den einzuhaltenden Bedingungen', clause_reference: '§3.8, §6.7, Tab. 4', page_ref: null,
    key_columns: ['saettigung', 'stationaer'], value_columns: [{ name: 'versuchsklasse', type: 'string' }, { name: 'fussnote', type: 'string' }],
    override_policy: 'locked',
    override_quote: 'Entsprechend diesen Bedingungen werden die Versuche in drei Versuchsklassen eingeteilt (siehe Tabelle 4).', // L447
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 5 — Geeignete Versuchsanordnungen in Abhängigkeit von den Bodenarten (§6.7 / §7.1.4.4, L528–L559).
// Printed columns (L532–L539): Bodenart | Erreichbare Versuchsklasse | Bauteil (Versuchszylinder · KD · Triaxialzelle) |
// Messung des hydraulischen Gefälles (mehrere Standrohre · ein Standrohr · Druckerzeuger) | Messung des Wasservolumens
// (Meßzylinder · Standrohr oder Bürette · Kapillare) | Statische Belastung SB | Sättigungsdruck U0.
// Legend L553–L555: "X geeignet", "(X) bedingt geeignet", "- nicht geeignet".
//
// Encoding: ONE row per (bodenart, anordnung) whose Bauteil cell is printed ON THE ROW ITSELF ("X"/"x" → the row's
// measurement cells apply; "-" → `geeignet = nicht geeignet`, other cells null). The Bauteil columns of the Ton/Schluff
// and Sand-Ton-Gemisch groups are printed as `\multirow{3}{*}{x}` / `\multirow[b]{3}{*}{X}` spans on the FIRST line
// (L540, L547) with empty cells below (L541, L542, L549) — those three sub-rows (Ton/Schluff KD + TX, Sand-Ton TX)
// cannot be mapped cell-by-cell from the transcript and are NOT seeded (din18130_1-U-1; SR-3 PDF p. 10 check).
// L548 (Sand-Ton, Klasse 3) prints its own "x" in the KD cell and is seeded as (sand_ton, KD) — the L547 span that also
// covers it is recorded in U-1. Lower-case "x" marks (L540, L543, L545, L546, L548, L551) are read as "X" (U-2).
// ---------------------------------------------------------------------------
export const TAB5_BODENARTEN = [
  { value: 'ton_schluff', label_de: 'Ton, Schluff' },                  // L540
  { value: 'feinsand', label_de: 'Feinsand' },                          // L543
  { value: 'mittel_grobsand', label_de: 'Mittel- und Grobsand' },       // L545
  { value: 'sand_kies', label_de: 'Sand-KiesGemisch' },                 // L546 (printed without hyphen-space)
  { value: 'sand_ton', label_de: 'Sand-TonGemisch' },                   // L547
  { value: 'kies_sand_ton', label_de: 'Kies-Sand-Ton-Gemisch' },        // L550
] as const;
export type Tab5Bodenart = (typeof TAB5_BODENARTEN)[number]['value'];
export const TAB5_ANORDNUNGEN = ['ZY', 'KD', 'TX'] as const; // = prod versuchsanordnung tokens (capture)
export const TAB5_GLYPH: Record<string, string> = { X: 'geeignet', x: 'geeignet', '(X)': 'bedingt geeignet', '-': 'nicht geeignet' };
const glyph = (g: string): string | null => (g === '' ? null : TAB5_GLYPH[g]);

/** One printed line = 13 cells (Bodenart | Klasse | ZY | KD | TX | MS | ES | DE | MZ | ST | KP | SB | U0), lifted verbatim. */
type Tab5Line = { bodenart: Tab5Bodenart; line: number; quote: string; cells: readonly string[] };
const TAB5_LINES: ReadonlyArray<Tab5Line> = [
  { bodenart: 'ton_schluff', line: 540, quote: String.raw`\hline \multirow[t]{3}{*}{Ton, Schluff} & 3 & x & \multirow{3}{*}{x} & \multirow[b]{3}{*}{X} & x & x & x & (X) & x & - & (X) & - \\`,
    cells: ['3', 'x', '', '', 'x', 'x', 'x', '(X)', 'x', '-', '(X)', '-'] },
  // L541 (Ton/Schluff, Klasse 3: "& 3 & \multirow{2}{*}{} & & & - & X & - & - & X & - & X & -") and L542 (Klasse 1: "& 1 & & & & - & - & X & - & (X) & x & X & X")
  // carry NO Bauteil mark of their own → not seeded (U-1).
  { bodenart: 'feinsand', line: 543, quote: String.raw`\hline \multirow[t]{2}{*}{Feinsand} & 2 & X & - & & X & X & - & X & x & - & - & - \\`,
    cells: ['2', 'X', '-', '', 'X', 'X', '-', 'X', 'x', '-', '-', '-'] },
  { bodenart: 'feinsand', line: 544, quote: String.raw`\hline & 2 (1) & & & X & - & - & X & X & - & - & X & X \\`,
    cells: ['2 (1)', '', '', 'X', '-', '-', 'X', 'X', '-', '-', 'X', 'X'] },
  { bodenart: 'mittel_grobsand', line: 545, quote: String.raw`\hline Mittel- und Grobsand & 2 & X & - & - & X & X & - & X & x & - & - & - \\`,
    cells: ['2', 'X', '-', '-', 'X', 'X', '-', 'X', 'x', '-', '-', '-'] },
  { bodenart: 'sand_kies', line: 546, quote: String.raw`\hline Sand-KiesGemisch & 2 & X & - & - & x & (X) & - & x & (X) & - & - & - \\`,
    cells: ['2', 'X', '-', '-', 'x', '(X)', '-', 'x', '(X)', '-', '-', '-'] },
  { bodenart: 'sand_ton', line: 547, quote: String.raw`\hline \multirow[t]{3}{*}{Sand-TonGemisch} & 2 & X & \multirow{3}{*}{X} & \multirow[b]{3}{*}{X} & X & X & X & (X) & X & - & (X) & - \\`,
    cells: ['2', 'X', '', '', 'X', 'X', 'X', '(X)', 'X', '-', '(X)', '-'] },
  { bodenart: 'sand_ton', line: 548, quote: String.raw`\hline & 3 & \multirow{2}{*}{} & x & & - & X & - & - & X & - & X & - \\`,
    cells: ['3', '', 'x', '', '-', 'X', '-', '-', 'X', '-', 'X', '-'] },
  // L549 (Sand-Ton, Klasse 1: "& 1 & & & & - & X & X & (X) & X & x & X & X") carries no Bauteil mark of its own → not seeded (U-1).
  { bodenart: 'kies_sand_ton', line: 550, quote: String.raw`\hline \multirow{2}{*}{Kies-Sand-Ton-Gemisch} & 2 & X & - & & - & X & X & (X) & X & - & - & - \\`,
    cells: ['2', 'X', '-', '', '-', 'X', 'X', '(X)', 'X', '-', '-', '-'] },
  { bodenart: 'kies_sand_ton', line: 551, quote: String.raw`\hline & 1 & & & x & - & - & X & (X) & - & x & X & x \\`,
    cells: ['1', '', '', 'x', '-', '-', 'X', '(X)', '-', 'x', 'X', 'x'] },
];
export const TAB5_UNSEEDED = [
  { bodenart: 'ton_schluff', anordnung: 'KD', line: 541 }, { bodenart: 'ton_schluff', anordnung: 'TX', line: 542 }, { bodenart: 'sand_ton', anordnung: 'TX', line: 549 },
] as const;

export function tab5AsTable(): RegulationTable {
  const rows: RegulationRow[] = [];
  const bodenartLabel = (v: Tab5Bodenart) => TAB5_BODENARTEN.find((b) => b.value === v)!.label_de;
  for (const ln of TAB5_LINES) {
    if (ln.cells.length !== 12) throw new Error(`TAB5 L${ln.line}: expected 12 cells (Klasse + 11 marks), got ${ln.cells.length}`);
    const [klasse, zy, kd, tx, ms, es, de, mz, st, kp, sb, u0] = ln.cells;
    for (const c of ln.cells) inSpan(ln.quote, c === '' ? null : c, `TAB5 L${ln.line}`);
    const bauteil: Array<[typeof TAB5_ANORDNUNGEN[number], string]> = [['ZY', zy], ['KD', kd], ['TX', tx]];
    for (const [anordnung, mark] of bauteil) {
      if (mark === '') continue; // no mark of its own on this line
      const geeignet = glyph(mark)!;
      const applies = geeignet !== 'nicht geeignet';
      const v = (g: string) => (applies ? glyph(g) : null);
      rows.push({
        row_key: `${ln.bodenart}|${anordnung}`, keys: { bodenart: ln.bodenart, anordnung }, group_label: bodenartLabel(ln.bodenart),
        label_de: `${bodenartLabel(ln.bodenart)} – ${anordnung}${applies ? ` (Klasse ${klasse})` : ' (nicht geeignet)'}`, order_index: rows.length,
        values: { erreichbare_klasse: applies ? klasse : null, geeignet, ms: v(ms), es: v(es), de: v(de), mz: v(mz), st: v(st), kp: v(kp), sb: v(sb), u0: v(u0) },
        verbatim_quote: ln.quote,
      });
    }
  }
  const suitability = ['geeignet', 'bedingt geeignet', 'nicht geeignet'];
  const col = (name: string) => ({ name, type: 'enum' as const, values: suitability });
  return { standard_code: STD, edition: ED, table_code: 'TAB5', title_de: 'Geeignete Versuchsanordnungen in Abhängigkeit von den Bodenarten', clause_reference: '§6.7, §7.1.4.4, Tab. 5', page_ref: null,
    key_columns: ['bodenart', 'anordnung'],
    value_columns: [{ name: 'erreichbare_klasse', type: 'string' }, col('geeignet'), col('ms'), col('es'), col('de'), col('mz'), col('st'), col('kp'), col('sb'), col('u0')],
    override_policy: 'anhaltswert',
    // L553–L555 legend (bedingt geeignet is a graded suitability) — L446 (Anordnung nach den Erfordernissen des Anwendungsfalls).
    override_quote: String.raw`Dabei ist: X geeignet \\ (X) bedingt geeignet \\ - nicht geeignet — Die Versuchsanordnung ist entsprechend den jeweiligen Erfordernissen des Anwendungsfalls zusammenzustellen.`,
    verification_status: 'imported_unverified', rows };
}

// ---------------------------------------------------------------------------
// §5.8 Probenabmessungen (L335–L336): minimum cross-section by soil class and the Größtkorn ratio by uniformity.
// Both are "sollte … nicht unterschreiten" sentences → anhaltswert. S5_8 is keyed by the created select
// `bindig_grobkoernig`; S5_8_KORN by the prod boolean `ungleichfoermig` (stringified 'true'/'false').
// ---------------------------------------------------------------------------
const L336 = String.raw`Bei bindigen Böden sollte die Querschnittsfläche mindestens $A=10 \mathrm{~cm}^{2}$ betragen, bei grobkörnigen Böden mindestens A $=20 \mathrm{~cm}^{2}$, sofern die Versuchsgeräte nach Abschnitt 7 keine größeren Abmessungen bedingen.`;
const L335 = String.raw`Das Verhältnis Größtkorn zu Probendurchmesser bzw. Probenhöhe sollte $1: 5$ bei ungleichförmigen und $1: 10$ bei gleichförmigen Böden nicht unterschreiten.`;
export const S5_8_BODENKLASSEN = [
  { value: 'bindig', label_de: 'bindigen Böden', a_min: 10, printed: 'A=10' },
  { value: 'grobkoernig', label_de: 'grobkörnigen Böden', a_min: 20, printed: 'A $=20' },
] as const;
export function s58AsTable(): RegulationTable {
  const rows: RegulationRow[] = S5_8_BODENKLASSEN.map((r, i) => {
    inSpan(L336, r.printed, `S5_8 ${r.value}`);
    return { row_key: r.value, keys: { bodenklasse: r.value }, group_label: null, label_de: `${r.label_de}: A ≥ ${r.a_min} cm²`, order_index: i, values: { a_min_cm2: r.a_min }, verbatim_quote: L336 };
  });
  return { standard_code: STD, edition: ED, table_code: 'S5_8', title_de: 'Mindest-Querschnittsfläche nach Bodenklasse (§5.8)', clause_reference: '§5.8', page_ref: null,
    key_columns: ['bodenklasse'], value_columns: [{ name: 'a_min_cm2', type: 'number', unit: 'cm²' }],
    override_policy: 'anhaltswert', override_quote: L336,
    verification_status: 'md_verified', rows };
}
export const S5_8_KORN = [
  { value: 'true', label_de: 'ungleichförmigen Böden', verhaeltnis: '1 : 5', printed: '$1: 5$ bei ungleichförmigen' },
  { value: 'false', label_de: 'gleichförmigen Böden', verhaeltnis: '1 : 10', printed: '$1: 10$ bei gleichförmigen' },
] as const;
export function s58KornAsTable(): RegulationTable {
  const rows: RegulationRow[] = S5_8_KORN.map((r, i) => {
    inSpan(L335, r.printed, `S5_8_KORN ${r.value}`);
    return { row_key: r.value, keys: { ungleichfoermig: r.value }, group_label: null, label_de: `${r.label_de}: Größtkorn : Probendurchmesser bzw. -höhe ≥ ${r.verhaeltnis}`, order_index: i, values: { verhaeltnis: r.verhaeltnis }, verbatim_quote: L335 };
  });
  return { standard_code: STD, edition: ED, table_code: 'S5_8_KORN', title_de: 'Verhältnis Größtkorn zu Probendurchmesser bzw. Probenhöhe (§5.8)', clause_reference: '§5.8', page_ref: null,
    key_columns: ['ungleichfoermig'], value_columns: [{ name: 'verhaeltnis', type: 'string' }],
    override_policy: 'anhaltswert', override_quote: L335,
    verification_status: 'md_verified', rows };
}

/** The live DIN-18130-1 set (seven tables), in the order the brief's Step 2 lists them. */
export function din181301SeedTables(): RegulationTable[] {
  return [tab1AsTable(), tab2AsTable(), tab3AsTable(), tab4AsTable(), tab5AsTable(), s58AsTable(), s58KornAsTable()];
}
