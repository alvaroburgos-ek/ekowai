/**
 * Guideline tables that are DECISIONS: the engineer picks a printed row (or
 * column) and the guideline fixes the number. Rendered as printed on the
 * worksheet that consumes them; a click writes the fixed value(s) into the
 * existing fields — no new field, no new source. DWA-A 138-1:2024,
 * transcript lines in the entries (`Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).md`).
 *
 *   Tab. 11 (A138-03): test method → f_Methode                       (L1381–L1393)
 *   Tab. 8  (A138-08): protection category × A_C band → n (bound), T  (L1132–L1192)
 *   Tab. 14 (A138-15): facility type → the seven design specifications (L2250–L2269)
 *
 * The same shape carries Tab. 5/6/7/13 later. Values are the printed ones;
 * "≤ 0,1/a" is a BOUND (caption "Hinweise zur Festlegung", L1132) — the click
 * writes the bound as the proposal and says so.
 */

export type GuidelineRow = {
  key: string;
  /** printed row text(s), verbatim (LaTeX stripped to plain) */
  cells: string[];
  /** what a click writes: symbol → value */
  writes: Record<string, number | string>;
  /** how to recognise the current selection from stored values */
  matches: (v: Record<string, unknown>) => boolean;
  /** transcript line */
  line: string;
  note?: string;
};

export type GuidelineTable = {
  code: string;
  worksheet: string;
  titleDe: string;
  clause: string;
  /** column heads, verbatim */
  heads: string[];
  rows: GuidelineRow[];
  /** printed footnotes / the sentence that governs the use of the table */
  notesDe: string[];
  /** symbols the click writes (for the "written to" hint) */
  targets: string[];
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const near = (a: number | null, b: number) => a != null && Math.abs(a - b) < 1e-9;

// ---------------------------------------------------------------- Tab. 11 (A138-03)
/** prod enum of permeability_test_method has four tokens; the six printed rows map onto them (a138-E-1 proposes the 6-value enum). */
const TAB11_PROD_TOKEN: Record<string, string> = {
  feldversuch_grossflaechig: 'feldversuch', feldversuch_kleine_testgrube: 'feldversuch', doppelzylinder_infiltrometer: 'feldversuch',
  open_end_test: 'feldversuch', labor_ungestoert: 'laborversuch', labor_gestoert_sieblinie: 'korngroessenanalyse',
};
const TAB11: GuidelineTable = {
  code: 'TAB11', worksheet: 'A138-03',
  titleDe: 'Tabelle 11: Korrekturfaktoren Infiltrationsrate (Quelle: in Anlehnung an Bakeman et al. 2014)',
  clause: '§5.3.3.6, Tab. 11 (L1381–L1393)',
  heads: ['Bestimmungsmethode', 'Korrekturfaktoren f_Methode'],
  rows: [
    { key: 'feldversuch_grossflaechig', cells: ['Großflächige Feldversuche in Testgrube/Probeschurf (≥ 1 m²)', '1'], writes: { f_methode: 1, permeability_test_method: 'feldversuch' }, matches: (v) => near(num(v.f_methode), 1), line: 'L1384' },
    { key: 'feldversuch_kleine_testgrube', cells: ['Kleinflächige Feldversuche – kleine Testgrube/Probeschurf (< 1 m²)', '0,9'], writes: { f_methode: 0.9, permeability_test_method: 'feldversuch' }, matches: (v) => near(num(v.f_methode), 0.9) && v.permeability_test_method === 'feldversuch', line: 'L1385–L1386' },
    { key: 'doppelzylinder_infiltrometer', cells: ['Kleinflächige Feldversuche – Doppelzylinder-Infiltrometer', '0,9'], writes: { f_methode: 0.9, permeability_test_method: 'feldversuch' }, matches: () => false, line: 'L1387', note: 'gleicher Faktor wie kleine Testgrube — Auswahl nur über die Zeile erkennbar' },
    { key: 'open_end_test', cells: ['Kleinflächige Feldversuche – Open-End-Test', '0,8'], writes: { f_methode: 0.8, permeability_test_method: 'feldversuch' }, matches: (v) => near(num(v.f_methode), 0.8), line: 'L1388' },
    { key: 'labor_ungestoert', cells: ['Laborverfahren mit ungestörten Proben (z. B. Permeameter)', '0,7'], writes: { f_methode: 0.7, permeability_test_method: 'laborversuch' }, matches: (v) => near(num(v.f_methode), 0.7), line: 'L1389' },
    { key: 'labor_gestoert_sieblinie', cells: ['Laborverfahren mit gestörten Proben/Sieblinienauswertung für Sandböden', '0,1'], writes: { f_methode: 0.1, permeability_test_method: 'korngroessenanalyse' }, matches: (v) => near(num(v.f_methode), 0.1), line: 'L1390' },
  ],
  notesDe: [
    'Gl. 6 (L1361): f_K = f_Ort · f_Methode ≤ 1.',
    '§5.3.3.6 (L1392): Erfüllt der Boden der bewachsenen Bodenzone die Anforderungen nach 5.2.3.2 […], ist der Korrekturfaktor für die Bestimmungsmethode f_Methode nach Tabelle 11 in diesem Fall zu vernachlässigen.',
    'Die Prüfmethode wird auf die vier vorhandenen Optionen abgebildet (Feldversuch / Laborversuch / Korngrößenanalyse); die sechs gedruckten Zeilen als eigene Optionen sind Ruling a138-E-1.',
  ],
  targets: ['f_methode', 'permeability_test_method'],
};
void TAB11_PROD_TOKEN;

// ---------------------------------------------------------------- Tab. 8 (A138-08)
const TAB8_DESC: Record<string, string> = {
  gering: 'Bereiche, in denen das Wasser überwiegend schadlos und ohne Nutzungseinschränkungen auf der Oberfläche abfließen oder verbleiben kann; z. B.: offene Flächen abseits von Gebäuden (große Grundstücke in ländlichen Gebieten, Streusiedlungen, Grün- und Freiflächen, Parks etc.); Straßen ohne Randbebauung',
  maessig: 'Bereiche, in denen Überflutungen geringe bis mittlere Schäden oder Nutzungseinschränkungen verursachen können und die Sicherheit und Gesundheit nicht gefährden; z. B.: Wohn- und Mischgebiete mit Gebäuden ohne zu Wohn- oder Gewerbezwecken genutzte Untergeschosse; Parkplätze',
  stark: 'Bereiche, in denen Überflutungen lokal zu größeren Schäden oder Nutzungseinschränkungen führen oder die Sicherheit und Gesundheit potenziell gefährden können; z. B.: Stadtzentren; Wohn- und Mischgebiete mit Gebäuden mit zu Wohn- oder Gewerbezwecken genutzten Untergeschossen; Gewerbe-/Industriegebiete; private Tiefgaragen; Verkehrswege und Flächen von besonderer Bedeutung; untergeordnete Straßenunterführungen; Bereiche mit starkem Geländegefälle',
  sehr_stark: 'Bereiche, in denen Überflutungen zu weitreichenden größeren Schäden oder Nutzungseinschränkungen führen oder die Sicherheit und Gesundheit akut gefährden können; z. B.: Bereiche mit kritischer Infrastruktur; Bereiche mit U-Bahn-/Tiefbahnhofzugängen; übergeordnete Unterführungen; öffentliche Tiefgaragen',
};
/** One row per (category × A_C band): the click writes n = printed bound and T_n = 1/n. */
function tab8Row(k: string, label: string, band: 'le800' | 'gt800', nMax: number, tMin: number | null, ue: string, line: string): GuidelineRow {
  const bandText = band === 'le800' ? 'A_C ≤ 800 m² (a)' : 'A_C > 800 m² und öffentliche Entwässerung';
  const cell = `${tMin != null ? `≥ ${tMin} a ` : ''}(≤ ${String(nMax).replace('.', ',')}/a)`;
  return {
    key: `${k}|${band}`, cells: [label, TAB8_DESC[k], bandText, cell, ue], line,
    writes: { n: nMax, T_n: Math.round((1 / nMax) * 100) / 100 },
    matches: (v) => near(num(v.n), nMax) && (v.ac_band == null || v.ac_band === band),
    note: 'Gedruckt ist eine Obergrenze („≤“); die Auswahl schreibt sie als Vorschlag — eine kleinere Häufigkeit (größeres T) ist zulässig.',
  };
}
const TAB8: GuidelineTable = {
  code: 'TAB8', worksheet: 'A138-08',
  titleDe: 'Tabelle 8: Hinweise zur Festlegung von Bemessungs- und Überflutungshäufigkeiten für Versickerungsanlagen (Quelle: in Anlehnung an Arbeitsblatt DWA-A 118:2024)',
  clause: '§5.3.3.4, Tab. 8 (L1132–L1192)',
  heads: ['Schutzkategorie für Mensch, Umwelt, Versorgung, Wirtschaft, Kultur', 'Bereichsklassifizierung / Beispielhafte Nutzung', 'Grundstücksentwässerung', 'Bemessungshäufigkeit 1-mal in T bzw. (n)', 'Überflutungshäufigkeit 1-mal in T bzw. (n) öffentliche Entwässerung (b)'],
  rows: [
    tab8Row('gering', '(1) gering', 'le800', 0.33, null, '(0,1/a)', 'L1152–L1156'),
    tab8Row('gering', '(1) gering', 'gt800', 0.5, null, '(0,1/a)', 'L1152–L1156'),
    tab8Row('maessig', '(2) mäßig', 'le800', 0.2, null, '(0,05/a)', 'L1157–L1162'),
    tab8Row('maessig', '(2) mäßig', 'gt800', 0.33, null, '(0,05/a)', 'L1157–L1162'),
    tab8Row('stark', '(3) stark', 'le800', 0.2, 5, '30 a (0,033/a)', 'L1163–L1177'),
    tab8Row('stark', '(3) stark', 'gt800', 0.2, 5, '30 a (0,033/a)', 'L1163–L1177'),
    tab8Row('sehr_stark', '(4) sehr stark', 'le800', 0.1, 10, '(0,02/a)', 'L1179–L1188'),
    tab8Row('sehr_stark', '(4) sehr stark', 'gt800', 0.1, 10, '(0,02/a)', 'L1179–L1188'),
  ],
  notesDe: [
    '(a) Nach DIN 1986-100 ist kein rechnerischer Überflutungsnachweis erforderlich. Bei Durchführung eines Überflutungsnachweises kann bei A_C ≤ 800 m² die Bemessungshäufigkeit für A_C > 800 m² angesetzt werden. (L1191)',
    '(b) Weitere Regelungen zum Überflutungsnachweis nach DIN 1986-100 und Überflutungsprüfung nach DIN EN 752/ Arbeitsblatt DWA-A 118 enthält 5.3.4. (L1192)',
    '§5.3.3.4 (L1198): Für die Bemessungshäufigkeit n nach Tabelle 8 darf kein Überlauf aus der Versickerungsanlage […] auftreten.',
    'Die Schutzkategorie selbst wird heute nicht gespeichert (Ruling a138-G-4 / Plan 3 schutzkategorie); die Zeile ist an n erkennbar.',
  ],
  targets: ['n', 'T_n'],
};

// ---------------------------------------------------------------- Tab. 14 (A138-15), printed cells per facility
const TAB14_FACILITIES: Array<{ token: string; head: string }> = [
  { token: 'flaeche', head: 'Versickerungsfläche' }, { token: 'mulde', head: 'Versickerungsmulde' }, { token: 'MRE', head: 'Mulden-Rigolen-Element' },
  { token: 'MRS', head: 'Mulden-Rigolen-System' }, { token: 'rigole', head: 'Rigole' }, { token: 'schacht', head: 'Versickerungsschacht' }, { token: 'becken', head: 'Versickerungsbecken' },
];
/** Printed lines L2254–L2260, cell text per facility column (– = printed dash; blank = printed empty cell, a138-U-6). */
const TAB14_LINES: Array<{ label: string; unit: string; cells: string[]; line: string }> = [
  { label: 'k_f-Wert maßgebliche Bodenschicht', unit: 'm/s', cells: ['≥ 1 · 10⁻⁶', '≥ 1 · 10⁻⁶', '≥ 1 · 10⁻⁶', '–', '≥ 1 · 10⁻⁶', '≥ 1 · 10⁻⁶', '≥ 1 · 10⁻⁵'], line: 'L2254' },
  { label: 'Mächtigkeit bewachsene Bodenzone', unit: 'cm', cells: ['≥ 20', '≥ 20', '≥ 20', '≥ 20', '–', '–', '≥ 20'], line: 'L2255' },
  { label: 'k_f-Wert bewachsene Bodenzone (langjähriger Betrieb) (1)', unit: 'm/s', cells: ['ca. 1 · 10⁻⁵', 'ca. 1 · 10⁻⁵', 'ca. 1 · 10⁻⁵', 'ca. 1 · 10⁻⁵', '–', '–', 'ca. 1 · 10⁻⁵'], line: 'L2256' },
  { label: 'Einstauhöhe', unit: 'cm', cells: ['0', 'für Mulden i. d. R. ≤ 30', 'für Mulden i. d. R. ≤ 30', 'für Mulden i. d. R. ≤ 30', 'ggf. bautechnisch begrenzt', 'ggf. bautechnisch begrenzt', 'i. d. R. ≥ 50'], line: 'L2257' },
  { label: 'Freibord Überlauf (2)', unit: 'cm', cells: ['–', '–', '', '≥ 10', '–', '–', '≥ 35'], line: 'L2258' },
  { label: 'Böschungsneigung', unit: '1 : m', cells: ['–', 'i. d. R. 1 : 1,5 oder flacher', 'i. d. R. 1 : 1,5 oder flacher', 'i. d. R. 1 : 1,5 oder flacher', '–', '–', 'i. d. R. ≤ 1 : 1,5'], line: 'L2259' },
  { label: 'Entleerungszeit (n = 1/a) (3)', unit: 'h', cells: ['–', '≤ 84', '≤ 84', '≤ 84', '–', '–', '≤ 84'], line: 'L2260' },
];
const TAB14: GuidelineTable = {
  code: 'TAB14', worksheet: 'A138-15',
  titleDe: 'Tabelle 14: Zusammenstellung der Planungs- und Bemessungsvorgaben von Versickerungsanlagen',
  clause: '§6.9, Tab. 14 (L2250–L2269)',
  heads: ['Planungsvorgabe oder Nachweisgröße', 'Einheit', ...TAB14_FACILITIES.map((f) => f.head)],
  // transposed for the generic renderer: one ROW per facility (the click target), the printed lines become the cells
  rows: TAB14_FACILITIES.map((f, i) => ({
    key: f.token,
    cells: [f.head, i < 6 ? 'Dezentral' : 'Zentral', ...TAB14_LINES.map((l) => `${l.label} [${l.unit}]: ${l.cells[i] === '' ? '(Zelle leer gedruckt)' : l.cells[i]}`)],
    writes: { facility_type_selected: f.token },
    matches: (v) => v.facility_type_selected === f.token,
    line: 'L2252–L2260',
  })),
  notesDe: [
    '(1) Hinweise zur bewachsenen Bodenzone auch beim Einbau gemäß 5.2.3.2 beachten; abweichende Werte sind für den langjährigen Betrieb nachzuweisen; (2) Abstand zwischen der höchsten Wasserspiegellage und der Böschungsoberkante; (3) differenzierte Betrachtung je nach Bemessungsverfahren (siehe 6.3.2). (L2262–L2265)',
    'Freibord Überlauf beim Mulden-Rigolen-Element: Zelle im Regelwerk leer gedruckt (L2258) — kein Wert erfunden (a138-U-6).',
  ],
  targets: ['facility_type_selected'],
};

export const GUIDELINE_TABLES: Record<string, GuidelineTable> = { TAB11, TAB8, TAB14 };

/** Tables shown on a worksheet (DWA-A 138-1). */
export const TABLES_BY_WORKSHEET: Readonly<Record<string, string[]>> = {
  'A138-03': ['TAB11'],
  'A138-08': ['TAB8'],
  'A138-15': ['TAB14'],
};

/** Row keys of `table` that match the stored values (0, 1 or, for tables with a hidden key, several). */
export function matchingRows(table: GuidelineTable, values: Record<string, unknown>): string[] {
  return table.rows.filter((r) => r.matches(values)).map((r) => r.key);
}
