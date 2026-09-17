/**
 * DIN-1989-1 regulation-table seed builders (Plan 3 Task 2, 2026-09-17).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\DIN-1989-1.md`
 * (1127 lines; the line is in the comment next to each row). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts din1989_1 "<transcript>"`.
 * Emitted as `20260917100200_regulation_tables_seed_din1989_1.sql` (no earlier
 * DIN-1989-1 seed exists — nothing superseded).
 *
 * Edition: the transcript's title page (L1–L14) prints no date line; the edition
 * token is prod's `standards.version` "2002 (DIN 1989-1)" read in-session →
 * `'2002'` (the harness header says 2002-04 from a scan read in another
 * session — unverified here, see the report).
 *
 * Verification status: `md_verified` only where every row of the table is
 * lifted AND every cell is legible. Four tables stay `imported_unverified`
 * because of OCR-damaged, blank or truncated cells (sign-off din1989_1-U-1 … U-4, U-6):
 * TAB4_PERSON ("V" for "l", L882/L883), TAB4_FLAECHE (merged Grünland row
 * L887–L890 with "V"), TAB1 (blank class-number cells L471/L473/L475),
 * TAB2 ("I" for "l", L493/L494), TAB5 (Systemsteuerung Wartung cell cut
 * mid-parenthesis at L1030, U-6).
 *
 * The LaTeX token `${ }` (empty group before a superscript) is written as
 * `${'$'}{ }` inside String.raw so it is not read as a template interpolation.
 */
import type { RegulationTable, RegulationRow } from './regulation-tables';

const STD = 'DIN-1989-1';
export const DIN1989_1_EDITION = '2002';
const ED = DIN1989_1_EDITION;

// ---------------------------------------------------------------------------
// Tab. 3 — Ertragsbeiwerte (§16.3.4, L834–L847). Row keys = prod `auffangflaechen_art` enum tokens
// (captured din1989_1.prior.json, DIN-1989-1-02: 7 values, printed order). The header prints
// "Ertragsbeiwert % e" (L836) and the Gl. 1 legend "e der Ertragsbeiwert in %" (L867) while the cells
// print fractions (0,8 …) — encoded as printed (fractions; prod Gl. 1 multiplies them directly);
// sign-off din1989_1-J-3.
// ---------------------------------------------------------------------------
export const TAB3_AUFFANGFLAECHEN_ART = ['geneigtes_hartdach', 'flachdach_unbekiest', 'flachdach_bekiest', 'gruendach_intensiv', 'gruendach_extensiv', 'pflasterflaeche', 'asphaltbelag'] as const;
const TAB3_ROWS: ReadonlyArray<{ token: (typeof TAB3_AUFFANGFLAECHEN_ART)[number]; label: string; e: number; quote: string }> = [
  { token: 'geneigtes_hartdach', label: 'geneigtes Hartdach', e: 0.8, quote: String.raw`\hline geneigtes Hartdach ${'$'}{ }^{\text {a }}$ & 0,8 \\` }, // L837
  { token: 'flachdach_unbekiest', label: 'Flachdach unbekiest', e: 0.8, quote: String.raw`\hline Flachdach unbekiest & 0,8 \\` }, // L838
  { token: 'flachdach_bekiest', label: 'Flachdach bekiest', e: 0.6, quote: String.raw`\hline Flachdach bekiest & 0,6 \\` }, // L839
  { token: 'gruendach_intensiv', label: 'Gründach intensiv', e: 0.3, quote: String.raw`\hline Gründach intensiv & 0,3 \\` }, // L840
  { token: 'gruendach_extensiv', label: 'Gründach extensiv', e: 0.5, quote: String.raw`\hline Gründach extensiv & 0,5 \\` }, // L841
  { token: 'pflasterflaeche', label: 'Pflasterfläche/Verbundpflasterfläche', e: 0.5, quote: String.raw`\hline Pflasterfläche/Verbundpflasterfläche & 0,5 \\` }, // L842
  { token: 'asphaltbelag', label: 'Asphaltbelag', e: 0.8, quote: String.raw`\hline Asphaltbelag & 0,8 \\` }, // L843
];
export function tab3AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB3_ROWS.map((r, i) => ({ row_key: r.token, keys: { auffangflaechen_art: r.token }, group_label: null, label_de: r.label, order_index: i, values: { e: r.e }, verbatim_quote: r.quote }));
  return { standard_code: STD, edition: ED, table_code: 'TAB3', title_de: 'Ertragsbeiwerte', clause_reference: '§16.3.4, Tab. 3', page_ref: null,
    key_columns: ['auffangflaechen_art'], value_columns: [{ name: 'e', type: 'number' }],
    override_policy: 'anhaltswert',
    // L830 ("können … verwendet werden") + footnote a L844.
    override_quote: 'Als Planungsgrundlage für Neigung und Beschaffenheit der Auffangfläche können die Werte nach Tabelle 3 verwendet werden. — a Abweichungen je nach Saugfähigkeit und Rauheit',
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 4 — Ermittlung des jährlichen Betriebswasserbedarfs (§16.3.7, L875–L895), split into three tables:
// person-based rows (l/(Person·d)), the Waschmaschine ANMERKUNG (+10 l) and the area-based rows (l/m²).
// ---------------------------------------------------------------------------
export const TAB4_VERBRAUCHER = [
  { value: 'toilette_haushalt', label_de: 'Toiletten im Haushalt', p_d: 24, quote: String.raw`\hline \multicolumn{2}{|l|}{- Toiletten im Haushalt ${'$'}{ }^{\mathrm{a}}$} & $24 \mathrm{l} /$ Person $\times$ Tag & - \\` }, // L881
  // L882/L883 print "V" for "l" (OCR) — the unit is l/(Person × Tag) as L881 prints it; sign-off din1989_1-U-1.
  { value: 'toilette_buero', label_de: 'Toiletten im Bürobereich', p_d: 12, quote: String.raw`\hline \multicolumn{2}{|l|}{- Toiletten im Bürobereich ${'$'}{ }^{\text {a }}$} & $12 \mathrm{~V} /$ Person $\times$ Tag & - \\` }, // L882
  { value: 'toilette_schule', label_de: 'Toiletten in Schulen', p_d: 6, quote: String.raw`\hline \multicolumn{2}{|l|}{- Toiletten in Schulen ${'$'}{ }^{\text {a }}$} & $6 \mathrm{~V} /$ Person $\times$ Tag & - \\` }, // L883
] as const;
export function tab4PersonAsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB4_VERBRAUCHER.map((v, i) => ({ row_key: v.value, keys: { verbraucher_typ: v.value }, group_label: null, label_de: v.label_de, order_index: i, values: { p_d: v.p_d }, verbatim_quote: v.quote }));
  return { standard_code: STD, edition: ED, table_code: 'TAB4_PERSON', title_de: 'Personenbezogener Tagesbedarf (Tab. 4)', clause_reference: '§16.3.7, Tab. 4', page_ref: null,
    key_columns: ['verbraucher_typ'], value_columns: [{ name: 'p_d', type: 'number', unit: 'l/(Person·d)' }],
    override_policy: 'anhaltswert',
    // Footnote a L891 (wassersparende Ausführungen, 4,5-l-Toiletten) + L911 (gewerblich/industriell anwendungsbezogen).
    override_quote: 'a Bei Toiletten sollten grundsätzlich nur wassersparende Ausführungen angeschlossen werden, wie z.B. 6 l mit Zweimengen-Spülsystemen. Zur Erhöhung des Deckungsgrades können 4,5 I Toiletten bei entsprechenden hydraulischen Verhältnissen genutzt werden. — Der Betriebswasserbedarf für gewerbliche und industrielle Bereiche ist anwendungsbezogen zu ermitteln.',
    verification_status: 'imported_unverified', rows };
}
export function tab4WaschmaschineAsTable(): RegulationTable {
  const rows: RegulationRow[] = [{
    row_key: 'waschmaschine', keys: { zusatz: 'waschmaschine' }, group_label: null, label_de: 'Waschmaschinen angeschlossen (+10 l je Person und Tag)', order_index: 0, values: { p_d_zusatz: 10 },
    verbatim_quote: String.raw`\hline \multicolumn{4}{|l|}{ANMERKUNG Sollten Waschmaschinen angeschlossen werden, würde sich der personenbezogene Tagesbedarf um 10 Liter erhöhen.} \\`, // L892
  }];
  return { standard_code: STD, edition: ED, table_code: 'TAB4_WASCHMASCHINE', title_de: 'Zuschlag Waschmaschine (Tab. 4 ANMERKUNG)', clause_reference: '§16.3.7, Tab. 4 ANMERKUNG', page_ref: null,
    key_columns: ['zusatz'], value_columns: [{ name: 'p_d_zusatz', type: 'number', unit: 'l/(Person·d)' }],
    override_policy: 'locked', override_quote: 'ANMERKUNG Sollten Waschmaschinen angeschlossen werden, würde sich der personenbezogene Tagesbedarf um 10 Liter erhöhen.', // L892
    verification_status: 'md_verified', rows };
}
/**
 * Area-based rows. Garten and Sportanlagen print single values (stored in both bound columns); the two Grünland rows
 * are printed as ONE merged OCR row (L887–L890: "bei leichtem Boden bei schwerem Boden … 100 l/m² bis 200 l/m² 80 V/m²
 * bis 150 V/m²") — the pairing leicht → 100…200, schwer → 80…150 follows the printed order (sign-off din1989_1-U-2); the
 * ranges are SR-2 engineer picks inside the bounds (din1989_1-J-1).
 */
const GRUENLAND_QUOTE = String.raw`\hline - für Grünland bei leichtem Boden bei schwerem Boden & Gesamtmenge für 6 Monate Gesamtmenge für 6 Monate & \begin{tabular}{l}
- \\
-
\end{tabular} & $100 \mathrm{l} / \mathrm{m}^{2}$ bis $200 \mathrm{l} / \mathrm{m}^{2} 80 \mathrm{~V} / \mathrm{m}^{2}$ bis $150 \mathrm{~V} / \mathrm{m}^{2}$ \\`; // L887–L890
export const TAB4_BEWAESSERUNG = [
  { value: 'garten', label_de: 'Gartenbewässerung je 1 m² Nutzgarten Grünanlagen', min: 60, max: 60, quote: String.raw`\hline \multicolumn{2}{|c|}{- Gartenbewässerung je $1 \mathrm{~m}^{2}$ Nutzgarten Grünanlagen} & - & $60 \mathrm{l} / \mathrm{m}^{2}$ \\` }, // L884
  { value: 'sportanlage', label_de: 'Sportanlagen (Gesamtmenge für 6 Monate)', min: 200, max: 200, quote: String.raw`\hline - bei Sportanlagen & Gesamtmenge für 6 Monate & - & $200 \mathrm{l} / \mathrm{m}^{2}$ \\` }, // L886
  { value: 'gruenland_leicht', label_de: 'Grünland bei leichtem Boden (Gesamtmenge für 6 Monate)', min: 100, max: 200, quote: GRUENLAND_QUOTE },
  { value: 'gruenland_schwer', label_de: 'Grünland bei schwerem Boden (Gesamtmenge für 6 Monate)', min: 80, max: 150, quote: GRUENLAND_QUOTE },
] as const;
export function tab4FlaecheAsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB4_BEWAESSERUNG.map((v, i) => ({ row_key: v.value, keys: { bewaesserungs_typ: v.value }, group_label: null, label_de: v.label_de, order_index: i, values: { bs_a_min: v.min, bs_a_max: v.max }, verbatim_quote: v.quote }));
  return { standard_code: STD, edition: ED, table_code: 'TAB4_FLAECHE', title_de: 'Spezifischer Jahresbedarf Bewässerung (Tab. 4)', clause_reference: '§16.3.7, Tab. 4', page_ref: null,
    key_columns: ['bewaesserungs_typ'], value_columns: [{ name: 'bs_a_min', type: 'number', unit: 'l/m²' }, { name: 'bs_a_max', type: 'number', unit: 'l/m²' }],
    override_policy: 'anhaltswert',
    // L873 ("kann … ermittelt werden") + the section head L885.
    override_quote: 'Der jährliche Betriebswasserbedarf kann aus den Bedarfswerten nach Tabelle 4 ermittelt werden. — Bewässerung oder Beregnungsmengen während der Vegetationszeit von April bis September',
    verification_status: 'imported_unverified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 1 — Belastungsklassen für unterirdische Regenwasserspeicher unter Verkehrsbelastung (§7, L467–L481).
// Row keys = prod `belastungsklasse` enum tokens '1'…'6'. The class-number cells of rows 2/3/4 are printed EMPTY
// (`\multirow{2}{*}{}`, L471/L473/L475) — the rows are keyed by their printed position between "1" and "5"
// (sign-off din1989_1-U-3; table stays imported_unverified). The third/fourth printed columns ("Beispiele für die
// Verkehrslasten": vehicle + a number) carry no unit and no sub-header (L469) — the number is NOT seeded as a
// numeric column; both cells are kept as the printed string `verkehrslast_beispiele` (din1989_1-J-4).
// ---------------------------------------------------------------------------
const TAB1_ROWS: ReadonlyArray<{ klasse: string; bezeichnung: string; beispiele: string | null; abdeckung: string | null; quote: string }> = [
  { klasse: '1', bezeichnung: 'begehbar', beispiele: 'Personen', abdeckung: 'A 15', quote: String.raw`\hline 1 & begehbar & Personen & & A 15 \\` }, // L470
  { klasse: '2', bezeichnung: 'PKW - befahrbar', beispiele: 'PKW 1,2; Kleinbus 2,2', abdeckung: 'B 125', quote: String.raw`\hline \multirow{2}{*}{} & \multirow[t]{2}{*}{PKW - befahrbar} & PKW & 1,2 & \multirow[t]{2}{*}{B 125} \\
\hline & & Kleinbus & 2,2 & \\` }, // L471–L472
  { klasse: '3', bezeichnung: 'LKW 12 - befahrbar', beispiele: 'Traktor 7,2; LKW 12 t 8,0', abdeckung: 'D 400', quote: String.raw`\hline \multirow{2}{*}{} & \multirow[t]{2}{*}{LKW 12 - befahrbar} & Traktor & 7,2 & \multirow[t]{2}{*}{D 400} \\
\hline & & LKW 12 t & 8,0 & \\` }, // L473–L474
  { klasse: '4', bezeichnung: 'SLW 30 - befahrbar', beispiele: 'LKW 26 t 11,5; Feuerwehrfahrzeug 30 t 13,0', abdeckung: 'D 400', quote: String.raw`\hline \multirow{2}{*}{} & \multirow[t]{2}{*}{SLW 30 - befahrbar} & LKW 26 t & 11,5 & \multirow[t]{2}{*}{D 400} \\
\hline & & Feuerwehrfahrzeug 30 t & 13,0 & \\` }, // L475–L476
  { klasse: '5', bezeichnung: 'SLW 60 - befahrbar', beispiele: 'Schwerlastfahrzeug 60 t (a) 20,0', abdeckung: 'D 400', quote: String.raw`\hline 5 & SLW 60 - befahrbar & Schwerlastfahrzeug 60 ta & 20,0 & D 400 \\` }, // L477 — printed "60 ta" read as "60 t" + footnote mark "a" (L479 "a Schwerlastfahrzeuge (Achslast > 13 t) …"): an interpretation inside the string value, recorded under U-3/J-4
  { klasse: '6', bezeichnung: 'Sonderlasten nach Angabe des AG', beispiele: null, abdeckung: null, quote: String.raw`\hline 6 & \multicolumn{4}{|c|}{Sonderlasten nach Angabe des AG} \\` }, // L478
];
export function tab1AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB1_ROWS.map((r, i) => ({
    row_key: r.klasse, keys: { belastungsklasse: r.klasse }, group_label: null, label_de: `Klasse ${r.klasse} – ${r.bezeichnung}`, order_index: i,
    values: { bezeichnung: r.bezeichnung, verkehrslast_beispiele: r.beispiele, abdeckung_din_en_124: r.abdeckung }, verbatim_quote: r.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB1', title_de: 'Belastungsklassen für unterirdische Regenwasserspeicher unter Verkehrsbelastung', clause_reference: '§7, Tab. 1', page_ref: null,
    key_columns: ['belastungsklasse'],
    value_columns: [{ name: 'bezeichnung', type: 'string' }, { name: 'verkehrslast_beispiele', type: 'string' }, { name: 'abdeckung_din_en_124', type: 'string' }],
    override_policy: 'locked',
    override_quote: 'Speicher, Revisionsschächte und Abdeckungen müssen den Belastungsklassen nach Tabelle 1 entsprechen.', // L461
    verification_status: 'imported_unverified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 2 — Speicheröffnungen (§7, L486–L499). Two keys: `aufstellung` (oberirdisch | unterirdisch — the two printed
// kinds; prod `speicher_aufstellung` also carries `keller`, which has no Tab. 2 row) and `groesse_band`
// (le3000 | gt3000 by Einzelvolumen for above-ground tanks; dom_le450 | dom_gt450 by Domhöhe for buried tanks).
// The thresholds 3000 l / 450 mm are the printed row heads (L493–L496). L493/L494 print "I" for "l" (OCR) —
// read as litre (sign-off din1989_1-U-4; table stays imported_unverified). The last row additionally requires a
// Dom widening to ≥ 800 mm (`dom_aufweitung_min_mm`).
// ---------------------------------------------------------------------------
const TAB2_ROWS: ReadonlyArray<{ aufstellung: 'oberirdisch' | 'unterirdisch'; band: string; label: string; min: number; aufweitung: number | null; quote: string }> = [
  { aufstellung: 'oberirdisch', band: 'le3000', label: 'oberirdische Speicher ≤ 3000 l Einzelvolumen', min: 200, aufweitung: null, quote: String.raw`\hline oberirdische Speicher $\leq 3000$ I Einzelvolumen & $\geq 200$ \\` }, // L493
  { aufstellung: 'oberirdisch', band: 'gt3000', label: 'oberirdische Speicher > 3000 l Einzelvolumen', min: 600, aufweitung: null, quote: String.raw`\hline oberirdische Speicher > 3000 I Einzelvolumen & $\geq 600$ \\` }, // L494
  { aufstellung: 'unterirdisch', band: 'dom_le450', label: 'unterirdische Speicher bis Domhöhe ≤ 450 mm', min: 600, aufweitung: null, quote: String.raw`\hline unterirdischen Speicher bis Domhöhe $\leq 450 \mathrm{~mm}$ & $\geq 600$ \\` }, // L495
  { aufstellung: 'unterirdisch', band: 'dom_gt450', label: 'unterirdische Speicher ab Domhöhe > 450 mm mit Aufweitung des Domdurchmessers auf ≥ 800 mm', min: 600, aufweitung: 800, quote: String.raw`\hline unterirdischen Speicher ab Domhöhe $>450 \mathrm{~mm}$ mit Aufweitung des Domdurchmessers auf $\geq 800 \mathrm{~mm}$ (siehe Bild 1) & $\geq 600$ \\` }, // L496
];
export function tab2AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB2_ROWS.map((r, i) => ({
    row_key: `${r.aufstellung}|${r.band}`, keys: { aufstellung: r.aufstellung, groesse_band: r.band }, group_label: null, label_de: r.label, order_index: i,
    values: { oeffnung_min_mm: r.min, dom_aufweitung_min_mm: r.aufweitung }, verbatim_quote: r.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB2', title_de: 'Speicheröffnungen', clause_reference: '§7, Tab. 2', page_ref: null,
    key_columns: ['aufstellung', 'groesse_band'],
    value_columns: [{ name: 'oeffnung_min_mm', type: 'number', unit: 'mm' }, { name: 'dom_aufweitung_min_mm', type: 'number', unit: 'mm' }],
    override_policy: 'locked',
    override_quote: 'Zur Durchführung von Inspektion und Wartung dürfen die Öffnungen der Speicher die folgenden Durchmesser nicht unterschreiten (siehe auch E DIN 1989-3):', // L486
    verification_status: 'imported_unverified', rows };
}

// ---------------------------------------------------------------------------
// Tab. 5 — Inspektions- und Wartungsmaßnahmen (§18, L997–L1065). One row per printed Anlagenteil (17); the
// Inspektion/Wartung pair of a multirow entry is one row with both intervals. Intervals are stored as printed
// strings ("6 Monate", "1 Jahr", "≈ 10 Jahre"); the Hebeanlage maintenance cell prints three footnoted intervals
// (L1050–L1052: 3 Monate b · 6 Monate c · 1 Jahr d) kept in one cell with the footnote text in `hinweis`
// (sign-off din1989_1-J-2). Umfang columns carry the printed "Durchführung" text (LaTeX line breaks → "; ").
// The Systemsteuerung Wartung cell is printed TRUNCATED (L1030 "- Nachspeisung (Magnetventil" — the transcript cuts
// mid-parenthesis; whatever followed is not in the source) — stored as printed, sign-off din1989_1-U-6; the table
// therefore stays `imported_unverified` although all 17 quotes verify.
// ---------------------------------------------------------------------------
type Tab5Row = { value: string; label_de: string; inspektion_intervall: string; inspektion_umfang: string; wartung_intervall: string | null; wartung_umfang: string | null; hinweis: string | null; quote: string };
export const TAB5_ANLAGENTEILE: ReadonlyArray<Tab5Row> = [
  { value: 'dachablaeufe', label_de: 'Dachabläufe', inspektion_intervall: '6 Monate', inspektion_umfang: 'Prüfung auf ungehinderten Ablauf (auch etwaiger Überläufe), Dichtheit, Schmutzfänge reinigen, ggf. Beheizung prüfen', wartung_intervall: null, wartung_umfang: null, hinweis: null,
    quote: String.raw`\hline Dachabläufe & Inspektion & Prüfung auf ungehinderten Ablauf (auch etwaiger Überläufe), Dichtheit, Schmutzfänge reinigen, ggf. Beheizung prüfen & 6 Monate \\` }, // L1002
  { value: 'dachrinnen_regenfallrohre', label_de: 'Dachrinnen/Regenfallrohre', inspektion_intervall: '6 Monate', inspektion_umfang: 'Prüfung der Dichtheit, Sauberkeit, Befestigung, ggf. Beheizung und ggf. Schutzanstrich; Siebe reinigen', wartung_intervall: null, wartung_umfang: null, hinweis: null,
    quote: String.raw`\hline Dachrinnen/ Regenfallrohre & Inspektion & Prüfung der Dichtheit, Sauberkeit, Befestigung, ggf. Beheizung und ggf. Schutzanstrich; Siebe reinigen & 6 Monate \\` }, // L1003
  { value: 'filtersysteme', label_de: 'Filtersysteme', inspektion_intervall: '1 Jahr', inspektion_umfang: 'Kontrolle des Zustandes des Filters', wartung_intervall: '1 Jahr', wartung_umfang: 'Reinigung des Filters', hinweis: 'a nach Standortbedingungen und Herstellerangaben',
    quote: String.raw`\hline \multirow[t]{2}{*}{Filtersysteme} & Inspektion & Kontrolle des Zustandes des Filters & 1 Jahr ${'$'}{ }^{\text {a }}$ \\
\hline & Wartung & Reinigung des Filters & 1 Jahr \\` }, // L1004–L1005 (footnote a: L1058)
  { value: 'regenwasserspeicher', label_de: 'Regenwasserspeicher einschließlich Einbauteile', inspektion_intervall: '1 Jahr', inspektion_umfang: 'Prüfung der Sauberkeit, Dichtheit, Standsicherheit', wartung_intervall: '≈ 10 Jahre', wartung_umfang: 'Entleerung, Reinigung der Speicherinnenflächen, ggf. Entnahme des Sedimentes', hinweis: null,
    quote: String.raw`\hline \multirow{2}{*}{Regenwasserspeicher einschließlich Einbauteile} & Inspektion & Prüfung der Sauberkeit, Dichtheit, Standsicherheit & 1 Jahr \\
\hline & Wartung & Entleerung, Reinigung der Speicherinnenflächen, ggf. Entnahme des Sedimentes & $\approx 10$ Jahre \\` }, // L1006–L1007
  { value: 'betriebswasserpumpe', label_de: 'Betriebswasserpumpe', inspektion_intervall: '6 Monate', inspektion_umfang: 'visuelle Prüfung des Schaltspiels auf Betriebsfähigkeit und der Dichtheit', wartung_intervall: '1 Jahr',
    wartung_umfang: 'Probelauf: Vor, während bzw. nach dem Probelauf sind zu prüfen: die elektrische Absicherung der Pumpenanlage nach VDE-Vorschriften; Vordruck des Membranbehälters (falls vorhanden); Dichtheit der Gleitringdichtung der Pumpe; Funktion des Rückflussverhinderers; Pumpen- und Strömungsgeräusche; Dichtheit der Anlage und Armaturen; Sauberkeit der Anlage; Korrosion der Anlagenteile', hinweis: null,
    quote: String.raw`\hline \multirow[t]{2}{*}{Betriebswasserpumpe} & Inspektion & visuelle Prüfung des Schaltspiels auf Betriebsfähigkeit und der Dichtheit & 6 Monate \\
\hline & Wartung & \begin{tabular}{l}
Probelauf: \\
Vor, während bzw. nach dem Probelauf sind zu prüfen: \\
- die elektrische Absicherung der Pumpenanlage nach VDE-Vorschriften \\
- Vordruck des Membranbehälters (falls vorhanden) \\
- Dichtheit der Gleitringdichtung der Pumpe \\
- Funktion des Rückflussverhinderers \\
- Pumpen- und Strömungsgeräusche \\
- Dichtheit der Anlage und Armaturen \\
- Sauberkeit der Anlage \\
- Korrosion der Anlagenteile
\end{tabular} & 1 Jahr \\` }, // L1008–L1020
  { value: 'nachspeisung_freier_auslauf', label_de: 'Nachspeisung/Freier Auslauf Typ AA oder Typ AB', inspektion_intervall: '1 Jahr', inspektion_umfang: 'Prüfung des Sicherungsabstandes (Wasserstandseinstellung), des Einlaufventils und des Überlaufs bei voll geöffnetem Einlauf, gegebenenfalls Sichtkontrolle der Be- und Entlüftung', wartung_intervall: null, wartung_umfang: null, hinweis: null,
    quote: String.raw`\hline Nachspeisung/ Freier Auslauf Typ AA oder Typ AB & Inspektion & \begin{tabular}{l}
Prüfung des Sicherungsabstandes \\
(Wasserstandseinstellung), des Einlaufventils und des Überlaufs bei voll geöffnetem Einlauf, gegebenenfalls Sichtkontrolle der Be- und Entlüftung
\end{tabular} & 1 Jahr \\` }, // L1021–L1024
  { value: 'systemsteuerung', label_de: 'Systemsteuerung', inspektion_intervall: '6 Monate', inspektion_umfang: 'Prüfung durch Beobachtung eines Schaltspiels der Pumpenanlage', wartung_intervall: '1 Jahr', wartung_umfang: 'Probelauf: Vor, während bzw. nach dem Probelauf sind zu prüfen: Ein- und Ausschaltpunkte der Anlage; Nachspeisung (Magnetventil', hinweis: null,
    quote: String.raw`\hline \multirow[t]{2}{*}{Systemsteuerung} & Inspektion & Prüfung durch Beobachtung eines Schaltspiels der Pumpenanlage & 6 Monate \\
\hline & Wartung & \begin{tabular}{l}
Probelauf: \\
Vor, während bzw. nach dem Probelauf sind zu prüfen: \\
- Ein- und Ausschaltpunkte der Anlage \\
- Nachspeisung (Magnetventil
\end{tabular} & 1 Jahr \\` }, // L1025–L1031 (the printed cell ends mid-parenthesis)
  { value: 'fuellstandsanzeige', label_de: 'Füllstandsanzeige (Regenwasserspeicher)', inspektion_intervall: '1 Jahr', inspektion_umfang: 'Vergleich des Füllstandes im Speicher mit der Füllstandsanzeige', wartung_intervall: null, wartung_umfang: null, hinweis: null,
    quote: String.raw`\hline Füllstandsanzeige (Regenwasserspeicher) & Inspektion & Vergleich des Füllstandes im Speicher mit der Füllstandsanzeige & 1 Jahr \\` }, // L1032
  { value: 'rohrleitungen', label_de: 'Rohrleitungen', inspektion_intervall: '1 Jahr', inspektion_umfang: 'Prüfen aller sichtbaren Leitungen auf Zustand, Dichtheit, Befestigung und Außenkorrosion', wartung_intervall: null, wartung_umfang: null, hinweis: null,
    quote: String.raw`\hline Rohrleitungen & Inspektion & Prüfen aller sichtbaren Leitungen auf Zustand, Dichtheit, Befestigung und Außenkorrosion & 1 Jahr \\` }, // L1033
  { value: 'wasserzaehler', label_de: 'Wasserzähler', inspektion_intervall: '1 Jahr', inspektion_umfang: 'Prüfung von Wasserzählern auf Funktion und Dichtheit', wartung_intervall: '6 Jahre', wartung_umfang: 'Wasserzähler sind nach den eichrechtlichen Vorschriften alle 6 Jahre im Austausch zu erneuern, wenn sie im geschäftlichen Verkehr verwendet werden', hinweis: null,
    quote: String.raw`\hline \multirow[t]{2}{*}{Wasserzähler} & Inspektion & Prüfung von Wasserzählern auf Funktion und Dichtheit & 1 Jahr \\
\hline & Wartung & Wasserzähler sind nach den eichrechtlichen Vorschriften alle 6 Jahre im Austausch zu erneuern, wenn sie im geschäftlichen Verkehr verwendet werden & 6 Jahre \\` }, // L1034–L1035
  { value: 'rueckflussverhinderer', label_de: 'Rückflussverhinderer', inspektion_intervall: '1 Jahr', inspektion_umfang: 'Zur Prüfung des dichten Abschlusses ist die Rohrleitung in Fließrichtung vor dem Rückflussverhinderer abzusperren. Durch Öffnen der Prüfvorrichtung, die sich auf der Eingangsseite des Rückflussverhinderers befindet, wird festgestellt, ob Wasser ausfließt. Dabei wird vorausgesetzt, dass die Verbrauchsleitungen nach dem Rückflussverhinderer mit Wasser gefüllt sind. Der Abschluss ist dicht, wenn aus den Prüfstutzen kein Wasser ausfließt.', wartung_intervall: null, wartung_umfang: null, hinweis: null,
    quote: String.raw`\hline Rückflussverhinderer & Inspektion & Zur Prüfung des dichten Abschlusses ist die Rohrleitung in Fließrichtung vor dem Rückflussverhinderer abzusperren. Durch Öffnen der Prüfvorrichtung, die sich auf der Eingangsseite des Rückflussverhinderers befindet, wird festgestellt, ob Wasser ausfließt. Dabei wird vorausgesetzt, dass die Verbrauchsleitungen nach dem Rückflussverhinderer mit Wasser gefüllt sind. Der Abschluss ist dicht, wenn aus den Prüfstutzen kein Wasser ausfließt. & 1 Jahr \\` }, // L1044
  { value: 'rueckstauverschluesse', label_de: 'Rückstauverschlüsse', inspektion_intervall: '1 Monat', inspektion_umfang: 'Betriebsverschluss ggf. Notverschluss betätigen', wartung_intervall: '6 Monate', wartung_umfang: 'Säubern, Überprüfung auf Dichtheit, Funktion nach Herstellerunterlagen', hinweis: null,
    quote: String.raw`\hline \multirow[t]{2}{*}{Rückstauverschlüsse} & Inspektion & Betriebsverschluss ggf. Notverschluss betätigen & 1 Monat \\
\hline & Wartung & Säubern, Überprüfung auf Dichtheit, Funktion nach Herstellerunterlagen & 6 Monate \\` }, // L1045–L1046
  { value: 'geruchverschluesse', label_de: 'Geruchverschlüsse', inspektion_intervall: '6 Monate', inspektion_umfang: 'Prüfung auf Sauberkeit und Wasserstand, Dichtheit, ggf. Absperrbarkeit', wartung_intervall: null, wartung_umfang: null, hinweis: null,
    quote: String.raw`\hline Geruchverschlüsse & Inspektion & Prüfung auf Sauberkeit und Wasserstand, Dichtheit, ggf. Absperrbarkeit & 6 Monate \\` }, // L1047
  { value: 'abwasserhebeanlage', label_de: 'Abwasserhebeanlage (nach DIN EN 12050-2)', inspektion_intervall: '1 Monat', inspektion_umfang: 'Prüfung auf Betriebsfähigkeit, Dichtheit, äußere Korrosion', wartung_intervall: '3 Monate (b) / 6 Monate (c) / 1 Jahr (d)',
    wartung_umfang: 'Prüfung auf Dichtheit, Funktion, Kontrolle der Niveauschaltung, Einstellhöhen von Ein-, Aus- und Alarmniveau überprüfen, Kontrolle der Rückflussverhinderer auf Dichtheit.', hinweis: 'b in gewerblichen Betrieben; c in Mehrfamilienhäusern; d in Einfamilienhäusern',
    quote: String.raw`\hline \multirow[t]{2}{*}{Abwasserhebeanlage (nach DIN EN 12050-2)} & Inspektion & Prüfung auf Betriebsfähigkeit, Dichtheit, äußere Korrosion & 1 Monat \\
\hline & Wartung & Prüfung auf Dichtheit, Funktion, Kontrolle der Niveauschaltung, Einstellhöhen von Ein-, Aus- und Alarmniveau überprüfen, Kontrolle der Rückflussverhinderer auf Dichtheit. & \begin{tabular}{l}
3 Monate ${'$'}{ }^{\mathrm{b}}$ \\
6 Monate ${'$'}{ }^{\mathrm{c}}$ \\
1 Jahr ${'$'}{ }^{\text {d }}$
\end{tabular} \\` }, // L1048–L1053 (footnotes b/c/d: L1059–L1061)
  { value: 'entnahmearmaturen', label_de: 'Entnahmearmaturen', inspektion_intervall: '1 Jahr', inspektion_umfang: 'Prüfung aller Entnahmearmaturen auf Dichtheit und eventuelle Veränderungen des Wassers hinsichtlich Geruch, Farbe und Schwebstoffe', wartung_intervall: null, wartung_umfang: null, hinweis: null,
    quote: String.raw`\hline Entnahmearmaturen & Inspektion & Prüfung aller Entnahmearmaturen auf Dichtheit und eventuelle Veränderungen des Wassers hinsichtlich Geruch, Farbe und Schwebstoffe & 1 Jahr \\` }, // L1054
  { value: 'spueleinrichtungen', label_de: 'Spüleinrichtungen (Toiletten)', inspektion_intervall: '1 Jahr', inspektion_umfang: 'Prüfung des Spülvorganges von Spüleinrichtungen (Spülkästen, Druckspülern), ggf. Korrektur des Spülwasservolumens', wartung_intervall: null, wartung_umfang: null, hinweis: null,
    quote: String.raw`\hline Spüleinrichtungen (Toiletten) & Inspektion & Prüfung des Spülvorganges von Spüleinrichtungen (Spülkästen, Druckspülern), ggf. Korrektur des Spülwasservolumens & 1 Jahr \\` }, // L1055
  { value: 'kennzeichnung', label_de: 'Kennzeichnung', inspektion_intervall: '1 Jahr', inspektion_umfang: 'Prüfung der Kennzeichnung aller Rohrleitungen und Entnahmestellen', wartung_intervall: null, wartung_umfang: null, hinweis: null,
    quote: String.raw`\hline Kennzeichnung & Inspektion & Prüfung der Kennzeichnung aller Rohrleitungen und Entnahmestellen & 1 Jahr \\` }, // L1056
];
export function tab5AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB5_ANLAGENTEILE.map((a, i) => ({
    row_key: a.value, keys: { anlagenteil: a.value }, group_label: null, label_de: a.label_de, order_index: i,
    values: { inspektion_intervall: a.inspektion_intervall, inspektion_umfang: a.inspektion_umfang, wartung_intervall: a.wartung_intervall, wartung_umfang: a.wartung_umfang, hinweis: a.hinweis },
    verbatim_quote: a.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB5', title_de: 'Inspektions- und Wartungsmaßnahmen', clause_reference: '§18, Tab. 5', page_ref: null,
    key_columns: ['anlagenteil'],
    value_columns: [{ name: 'inspektion_intervall', type: 'string' }, { name: 'inspektion_umfang', type: 'string' }, { name: 'wartung_intervall', type: 'string' }, { name: 'wartung_umfang', type: 'string' }, { name: 'hinweis', type: 'string' }],
    override_policy: 'anhaltswert',
    override_quote: 'Längere oder kürzere Zeitintervalle können sich durch spezielle anlagen- und betriebstechnische Randbedingungen ergeben.', // L1067
    verification_status: 'imported_unverified', rows }; // U-6 (truncated L1030 cell)
}

/** The live DIN-1989-1 set (seven tables), in the order the brief's Step 2 lists them. */
export function din19891SeedTables(): RegulationTable[] {
  return [tab3AsTable(), tab4PersonAsTable(), tab4WaschmaschineAsTable(), tab4FlaecheAsTable(), tab1AsTable(), tab2AsTable(), tab5AsTable()];
}
