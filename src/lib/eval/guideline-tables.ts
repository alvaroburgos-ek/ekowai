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


// ---------------------------------------------------------------- Tab. 5 (A138-06), L800–L860 (three printed parts)
/** One row per printed Flächengruppe; tokens = prod enum of flaechengruppe (D … SA) and belastungskategorie (BK_I/II/III). */
function tab5Row(group: string, art: string, spec: string, bk: 'BK_I' | 'BK_II' | 'BK_III', line: string, note?: string): GuidelineRow {
  const bkText = bk === 'BK_I' ? 'I' : bk === 'BK_II' ? 'II' : 'III';
  return {
    key: group, cells: [art, spec, group, bkText], line, note,
    writes: { flaechengruppe: group, belastungskategorie: bk },
    matches: (v) => v.flaechengruppe === group,
  };
}
const ART_VW = 'Hof- und Wegeflächen (VW), Verkehrsflächen (V)';
const ART_BS = 'Betriebsflächen (B) und sonstige Flächen mit besonderer Belastung (S)';
const TAB5: GuidelineTable = {
  code: 'TAB5', worksheet: 'A138-06',
  titleDe: 'Tabelle 5: Kategorisierung von Niederschlagswasser bebauter oder befestigter Flächen (Quelle: analog Arbeitsblatt DWA-A 102-2/BWK-A 3-2:2020)',
  clause: '§5.2.2, Tab. 5 (L800–L860)',
  heads: ['Flächenart', 'Flächenspezifizierung', 'Flächengruppe (Kurzzeichen)', 'Belastungskategorie (BK)'],
  rows: [
    tab5Row('D', 'Dächer (D)', 'Alle Dachflächen ≤ 50 m² und Dachflächen > 50 m² mit Ausnahme der unter Flächengruppe SD1 oder SD2 fallenden', 'BK_I', 'L804'),
    tab5Row('VW1', ART_VW, 'Fuß-, Rad- und Wohnwege; Hof- und Wegeflächen ohne Kfz-Verkehr in Sport- und Freizeitanlagen; Hofflächen ohne Kfz-Verkehr in Wohngebieten, wenn Fahrzeugwaschen dort unzulässig; Garagenzufahrten bei Einzelhausbebauung; Fußgängerzonen ohne Marktstände und seltenen Freiluftveranstaltungen', 'BK_I', 'L805–L809'),
    tab5Row('V1', ART_VW, 'Hof- und Verkehrsflächen in Wohngebieten mit geringem Kfz-Verkehr (DTV ≤ 300 Kfz/d oder ≤ 50 Wohneinheiten), z. B. Wohnstraßen mit Park- und Stellplätzen, Zufahrten zu Sammelgaragen; Park- und Stellplätze mit geringer Frequentierung (z. B. private Stellplätze)', 'BK_I', 'L810–L813'),
    tab5Row('VW2', ART_VW, 'Marktplätze; Flächen, auf denen häufig Freiluftveranstaltungen stattfinden; Einkaufsstraßen in Wohngebieten', 'BK_II', 'L814–L816'),
    tab5Row('V2', ART_VW, 'Hof- und Verkehrsflächen außerhalb von Misch-, Gewerbe- und Industriegebieten mit mäßigem Kfz-Verkehr (DTV 300 Kfz/d bis 15.000 Kfz/d), z. B. Wohn- und Erschließungsstraßen mit Park- und Stellplätzen, zwischengemeindliche Straßen- und Wegeverbindungen, Zufahrten zu Sammelgaragen', 'BK_II', 'L817'),
    tab5Row('V3', ART_VW, 'Verkehrsflächen außerhalb von Misch- und Gewerbe- und Industriegebieten mit hohem Kfz-Verkehr (DTV > 15.000 Kfz/d); Park- und Stellplätze mit hoher Frequentierung (z. B. bei Einkaufsmärkten); Hof- und Verkehrsflächen in Misch-, Gewerbe- und Industriegebieten mit mittlerem oder hohem Kfz-Verkehr (DTV > 2.000 Kfz/d), mit Ausnahme der unter SV und SVW fallenden', 'BK_III', 'L819–L825'),
    tab5Row('BG1', ART_BS, 'Gleisanlagen (G) mit Schotteroberbau auf freier Strecke sowie im Bahnhofsbereich bis 100.000 Lt/d (Leistungstonnen pro Tag) pro Gleis mit Ausnahme der unter SG fallenden', 'BK_I', 'L835'),
    tab5Row('BF', ART_BS, 'Start- und Landebahnen und weitere Betriebsflächen von Flughäfen (F) mit Ausnahme der unter SF fallenden', 'BK_II', 'L836'),
    tab5Row('BL', ART_BS, 'Landwirtschaftliche Hofflächen (L) mit Ausnahme der unter SL fallenden', 'BK_II', 'L837'),
    tab5Row('BG2', ART_BS, 'Gleisanlagen (G) mit Schotteroberbau im Bahnhofsbereich > 100.000 Lt/d pro Gleis sowie Gleisanlagen (G) mit fester Fahrbahn bis 100.000 Lt/d pro Gleis mit Ausnahme der unter SG fallenden', 'BK_II', 'L838–L841'),
    tab5Row('SD1', ART_BS, 'Dachflächen (D) mit hohen Anteilen (20 % bis 70 % der Gesamtdachfläche) an Materialien, die im Niederschlagswasser zu signifikanten Belastungen mit gewässerschädlichen Substanzen führen', 'BK_II', 'L842'),
    tab5Row('SD2', ART_BS, 'Dachflächen (D) mit sehr hohen Anteilen (> 70 % der Gesamtdachfläche) an Materialien, die im Niederschlagswasser zu signifikanten Belastungen mit gewässerschädlichen Substanzen führen', 'BK_III', 'L843'),
    tab5Row('SV', ART_BS, 'Hof- und Verkehrsflächen sowie Park- und Stellplätze (V) innerhalb von Misch-, Gewerbe- und Industriegebieten, auf denen sonstige besondere Beeinträchtigungen der Niederschlagswasserqualität zu erwarten sind, z. B. Lagerflächen, Zufahrten Steinbruch', 'BK_III', 'L844', 'gedruckt „SV bzw. SVW“ — eine Zeile, zwei Kurzzeichen'),
    tab5Row('SVW', ART_BS, 'wie SV (gedruckt „SV bzw. SVW“)', 'BK_III', 'L844'),
    tab5Row('SF', ART_BS, 'Flächen von Flughäfen, auf denen eine Wäsche von Flugzeugen erfolgt; Flächen im unmittelbaren Umfeld von Flächen mit Betankung oder Enteisung von Flugzeugen', 'BK_III', 'L845–L848'),
    tab5Row('SL', ART_BS, 'Landwirtschaftliche Hofflächen und sonstige Flächen (L) mit großen Tieransammlungen, z. B. Viehhaltungsbetriebe, Reiterhöfe oder landwirtschaftliche Hofflächen (L) mit sonstigen starken Beeinträchtigungen der Niederschlagswasserqualität, z. B. Flächen zur Fahrzeugreinigung', 'BK_III', 'L849'),
    tab5Row('BG3', ART_BS, 'Gleisanlagen (G) mit fester Fahrbahn > 100.000 Lt/d pro Gleis mit Ausnahme der unter SG fallenden', 'BK_III', 'L850'),
    tab5Row('SG', ART_BS, 'Gleisanlagen mit betriebsbedingt stark erhöhter Beeinträchtigung der Niederschlagswasserqualität, z. B. durch starken Rangierbetrieb oder stark frequentierte Bremsstrecken, bei Vegetationskontrolle durch Herbizideinsatz', 'BK_III', 'L858–L862'),
    tab5Row('SA', ART_BS, 'Hof- und Verkehrsflächen auf Abwasser- und Abfallanlagen (A) mit stark erhöhter Beeinträchtigung der Niederschlagswasserqualität, z. B. Flächen im unmittelbaren Umfeld von Flächen, auf denen Abfälle abgefüllt, verladen oder gelagert werden', 'BK_III', 'L863'),
  ],
  notesDe: [
    'Die Belastungskategorie folgt aus der Flächengruppe (Tab. 5); für D, SD1, SD2, SV, SVW, SF, SL, SG und SA richten sich die Behandlungsanforderungen nach den rechtlichen Anforderungen und sind ggf. mit der zuständigen Behörde abzustimmen (Tab. 6, Verwendungshinweis (*), L1016).',
    'Bei Anschluss mehrerer Flächengruppen an eine Anlage gilt die jeweils strengste Behandlungsanforderung (§5.2.3.2, L944).',
    '„Von der Kategorisierung nach Tabelle 5 kann in begründeten Fällen abgewichen werden.“ (L791)',
  ],
  targets: ['flaechengruppe', 'belastungskategorie'],
};


// ---------------------------------------------------------------- Tab. 6 (A138-06), L912–L935 — display only (keyed by the Tab.-5 group)
const T6_STAR = '(*)';
const T6_STAR_NOTE = '(*) Verwendungshinweis: Die Behandlungsanforderungen für die Kategorien D, SD1, SD2, SV, SVW, SF, SL, SG und SA richten sich nach den rechtlichen Anforderungen und sind ggf. mit der zuständigen Behörde abzustimmen. → „Behandlung erforderlich“ ist hier eine Behörden-/Rechtsfrage, nicht aus der Tabelle ableitbar.';
const T6_TIER2_20 = 'A_C/A_S,m ≤ 30; bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a';
const T6_TIER2_30 = 'A_C/A_S,m ≤ 50; bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a';
const T6_TIER3_20 = 'A_C/A_S,m ≤ 15; bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a';
const T6_TIER3_30 = 'A_C/A_S,m ≤ 30; bei Mulden-Rigole: Überlauf in Rigole mit n_M max. 1/a';
const T6_NONE_NOTE = 'Zelle leer gedruckt: keine Behandlungsanforderung über die bewachsene Bodenzone hinaus → „Behandlung erforderlich“ = Nein.';
const T6_TIER_NOTE = 'Die Behandlung erfolgt durch die bewachsene Bodenzone; einzuhalten ist die Flächenbelastung A_C/A_S,m je Mächtigkeit (Prüfung auf A138-12).';
function tab6Row(group: string, bk: string, c20: string, c30: string, line: string, note: string): GuidelineRow {
  return { key: group, cells: [group, bk, c20, c30], writes: {}, matches: (v) => v.flaechengruppe === group, line, note };
}
const TAB6: GuidelineTable = {
  code: 'TAB6', worksheet: 'A138-06',
  titleDe: 'Tabelle 6: Anforderungen an die Niederschlagswasserbehandlung bei Versickerung durch eine bewachsene Bodenzone',
  clause: '§5.2.3.2, Tab. 6 (L912–L935)',
  heads: ['Flächengruppe (Tab. 5)', 'Belastungskategorie', 'Mindestmächtigkeit bewachsene Bodenzone ≥ 20 cm', '≥ 30 cm'],
  rows: [
    tab6Row('D', 'I', T6_STAR, T6_STAR, 'L916', T6_STAR_NOTE),
    tab6Row('VW1', 'I', '', '', 'L917', T6_NONE_NOTE),
    tab6Row('V1', 'I', '', '', 'L918', T6_NONE_NOTE),
    tab6Row('BG1', 'I', 'bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 2/a', 'bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 2/a', 'L919', 'Keine Flächenbelastungs-Grenze; nur die Überlaufhäufigkeit bei Mulden-Rigolen.'),
    tab6Row('VW2', 'II', T6_TIER2_20, T6_TIER2_30, 'L920', T6_TIER_NOTE),
    tab6Row('V2', 'II', T6_TIER2_20, T6_TIER2_30, 'L921', T6_TIER_NOTE),
    tab6Row('BF', 'II', T6_TIER2_20, T6_TIER2_30, 'L922', T6_TIER_NOTE),
    tab6Row('BG2', 'II', T6_TIER2_20, T6_TIER2_30, 'L923', T6_TIER_NOTE),
    tab6Row('BL', 'II', T6_TIER3_20, T6_TIER3_30, 'L924', T6_TIER_NOTE),
    tab6Row('V3', 'III', T6_TIER3_20, T6_TIER3_30, 'L925', T6_TIER_NOTE),
    tab6Row('BG3', 'III', T6_TIER3_20, T6_TIER3_30, 'L926', T6_TIER_NOTE),
    tab6Row('SD1', 'II', T6_STAR, T6_STAR, 'L927', T6_STAR_NOTE),
    tab6Row('SD2', 'III', T6_STAR, T6_STAR, 'L928', T6_STAR_NOTE),
    tab6Row('SV', 'III', T6_STAR, T6_STAR, 'L929', T6_STAR_NOTE + ' (gedruckt „SV bzw. SVW“)'),
    tab6Row('SVW', 'III', T6_STAR, T6_STAR, 'L929', T6_STAR_NOTE + ' (gedruckt „SV bzw. SVW“)'),
    tab6Row('SF', 'III', T6_STAR, T6_STAR, 'L930', T6_STAR_NOTE),
    tab6Row('SL', 'III', T6_STAR, T6_STAR, 'L931', T6_STAR_NOTE),
    tab6Row('SG', 'III', T6_STAR, T6_STAR, 'L932', T6_STAR_NOTE),
    tab6Row('SA', 'III', T6_STAR, T6_STAR, 'L933', T6_STAR_NOTE),
  ],
  notesDe: [
    '§5.2.3.2 (L940): Die Anforderungen für die Versickerung des Niederschlagswassers aus dem Anliefer-/Verladebereich sowie von Flächen der Flächengruppen D und sonstigen Flächen mit besonderer Belastung (S) bedürfen grundsätzlich der vorherigen Abstimmung mit der zuständigen Behörde.',
    '§5.2.3.2 (L944): Flächen mit unterschiedlichen Anforderungen […] an eine gemeinsame Mulde […]: es gilt die jeweils strengste Behandlungsanforderung.',
    '§5.2.3.2 (L946): Die jeweilige Mindestmächtigkeit der bewachsenen Bodenzone nach Tabelle 6 ist nach Setzung der Schicht einzuhalten.',
  ],
  targets: [],
};


// ---------------------------------------------------------------- Tab. 7 (A138-06), L980–L1018 — display only, keyed by the Tab.-5 group
const T7_STAR_NOTE = '(*) Verwendungshinweis: Die Behandlungsanforderungen für die Kategorien D, SD1, SD2, SV, SVW, SF, SL, SG und SA richten sich nach den rechtlichen Anforderungen und sind ggf. mit der zuständigen Behörde abzustimmen. → Für unterirdische Anlagen (Rigole, Schacht) gibt Tab. 7 hier keinen Wirkungsgrad vor.';
const T7_T1_HINT = 'Bei Versickerung über Versickerungsschacht Typ B mit ausreichender Filtersandschicht und vorgeschaltetem Absetzschacht (Oberflächenbeschickung 10 m/h, Horizontalgeschwindigkeit 0,05 m/s) gilt die Reinigungsleistung als nachgewiesen';
const T7_T2_HINT = 'z. B. dezentrale Behandlungsanlage mit allgemeiner bauaufsichtlicher Zulassung DIBt; mögliche zusätzliche Sicherheitsaspekte (Tauchwand, Absperrschieber, Beprobung auf Schadstoffakkumulation etc.) im Einzelfall mit der zuständigen Behörde abstimmen';
function tab7Row(group: string, bk: string, afs: string, gel: string, hint: string, line: string, note: string): GuidelineRow {
  return { key: group, cells: [group, bk, afs, gel, hint], writes: {}, matches: (v) => v.flaechengruppe === group, line, note };
}
const T7_REQ = (afs: string, gel: string) => `Vor einer unterirdischen Versickerung ist eine dezentrale Behandlung mit η_AFS63 ≥ ${afs} und η_gelöste Stoffe ≥ ${gel} (Kupfer und Zink) nachzuweisen (Prüfung der eingetragenen Wirkungsgrade eta_AFS63 / eta_geloest).`;
const TAB7: GuidelineTable = {
  code: 'TAB7', worksheet: 'A138-06',
  titleDe: 'Tabelle 7: Anforderungen an die dezentrale Niederschlagswasserbehandlung vor Versickerung über unterirdische Versickerungsanlagen (Rigolen, Versickerungsschächte) (*)',
  clause: '§5.2.3.3, Tab. 7 (L980–L1018)',
  heads: ['Flächengruppe (Tab. 5)', 'Belastungskategorie', 'η_AFS63', 'η_gelöste Stoffe', 'Zusätzliche Hinweise'],
  rows: [
    tab7Row('D', 'I', '(*)', '(*)', '(*)', 'L985', T7_STAR_NOTE),
    tab7Row('VW1', 'I', '40 %', '50 % (**)', T7_T1_HINT, 'L986', T7_REQ('40 %', '50 %')),
    tab7Row('V1', 'I', '40 %', '50 % (**)', T7_T1_HINT, 'L987', T7_REQ('40 %', '50 %')),
    tab7Row('BG1', 'I', '40 %', '50 % (**)', T7_T1_HINT, 'L988', T7_REQ('40 %', '50 %')),
    tab7Row('VW2', 'II', '70 %', '65 % (**)', T7_T2_HINT, 'L1005', T7_REQ('70 %', '65 %')),
    tab7Row('V2', 'II', '70 %', '65 % (**)', T7_T2_HINT, 'L1006', T7_REQ('70 %', '65 %')),
    tab7Row('BF', 'II', '70 %', '65 % (**)', T7_T2_HINT, 'L1007', T7_REQ('70 %', '65 %')),
    tab7Row('BG2', 'II', '70 %', '65 % (**)', T7_T2_HINT, 'L1008', T7_REQ('70 %', '65 %')),
    tab7Row('BL', 'II', '80 %', '75 % (**)', T7_T2_HINT, 'L1009', T7_REQ('80 %', '75 %')),
    tab7Row('V3', 'III', '80 %', '75 % (**)', T7_T2_HINT, 'L1010', T7_REQ('80 %', '75 %')),
    tab7Row('BG3', 'III', '80 %', '75 % (**)', T7_T2_HINT, 'L1011', T7_REQ('80 %', '75 %')),
    ...['SD1', 'SD2', 'SV', 'SVW', 'SF', 'SL', 'SG', 'SA'].map((g) => tab7Row(g, g === 'SD1' ? 'II' : 'III', '(*)', '(*)', '(*)', 'L1012–L1018', T7_STAR_NOTE)),
  ],
  notesDe: [
    '(**) Der Wirkungsgrad η_gelöste Stoffe bezieht sich ausschließlich auf die Referenzparameter Kupfer und Zink. (L1017)',
    '§5.2.3.3 (L967): Bei Einsatz unterirdischer Versickerungsanlagen sind dezentrale Behandlungsanlagen vorzuschalten.',
    'Nur relevant, wenn der gewählte Anlagentyp unterirdisch ist (Rigole, Schacht, Mulden-Rigolen mit Rigolenanteil); bei Versickerung über eine bewachsene Bodenzone gilt Tab. 6.',
  ],
  targets: [],
};

// ---------------------------------------------------------------- Tab. 13 (A138-12), L1706–L1713 — clickable, writes soil_bodenart_tab13
const TAB13: GuidelineTable = {
  code: 'TAB13', worksheet: 'A138-12',
  titleDe: 'Tabelle 13: Größenordnungen A_S,m nach Bodenart',
  clause: '§6.3.2, Tab. 13 (L1706–L1713)',
  heads: ['Bodenart', 'Erforderliche, mittlere Versickerungsfläche A_S,m'],
  rows: [
    { key: 'mittel_feinsand', cells: ['Mittel-/Feinsand', '0,10 · A_C'], writes: { soil_bodenart_tab13: 'mittel_feinsand' }, matches: (v) => v.soil_bodenart_tab13 === 'mittel_feinsand', line: 'L1709', note: 'Orientierung: A_S,m ≈ 0,10 · A_C — Abschätzung unabhängig von der Geometrie (L1702), kein Nachweis.' },
    { key: 'schluffig', cells: ['schluffiger Sand, sandiger Schluff, Schluff', '0,20 · A_C'], writes: { soil_bodenart_tab13: 'schluffig' }, matches: (v) => v.soil_bodenart_tab13 === 'schluffig', line: 'L1710', note: 'Orientierung: A_S,m ≈ 0,20 · A_C — Abschätzung unabhängig von der Geometrie (L1702), kein Nachweis.' },
  ],
  notesDe: [
    '§6.3.2 (L1702): In Tabelle 13 werden in Abhängigkeit der Bodenart Größenordnungen zur Abschätzung von A_S,m unabhängig von der Geometrie der Anlage gegeben.',
    '§6.3.2 (L1715): Das aus qualitativer Sicht erforderliche Verhältnis A_C/A_S,m (Tabelle 6) ist nachzuweisen.',
  ],
  targets: ['soil_bodenart_tab13'],
};

// ---------------------------------------------------------------- §6.4.2 q_VS list (A138-18), L1866–L1870 — display (q_VS is Gl.-24 engine output)
const QVS: GuidelineTable = {
  code: 'QVS', worksheet: 'A138-18',
  titleDe: '§6.4.2 — Näherungswerte für den spezifischen Wasseraustritt q_VS aus dem Versickerrohr (ohne Herstellerangaben)',
  clause: '§6.4.2 (L1866–L1870)',
  heads: ['Schüttmaterial', 'q_VS'],
  rows: [
    { key: 'kiessand', cells: ['bei Kiessand als Schüttmaterial', 'q_VS = 0,2 l/(s·m)'], writes: {}, matches: () => false, line: 'L1869' },
    { key: 'kies', cells: ['bei Kies (z. B. 16/32) als Schüttmaterial', 'q_VS = 5 l/(s·m)'], writes: {}, matches: () => false, line: 'L1870' },
  ],
  notesDe: [
    '§6.4.2 (L1866): Liegen keine Herstellerangaben zu den Sickeröffnungen vor, können folgende Werte näherungsweise für den spezifischen Wasseraustritt q_D aus dem Versickerrohr verwendet werden.',
    'Mit Herstellerangaben gilt Gl. 24: q_VS = 0,1 · az_SÖ · A_SÖ · 10⁻¹ (Engine-Ausgabe); das Schüttmaterial als Feld ist Ruling a138-E-4.',
  ],
  targets: [],
};

// ---------------------------------------------------------------- Tab. 12 (A138-01), L1471–L1490 — display keyed by design_method
const TAB12: GuidelineTable = {
  code: 'TAB12', worksheet: 'A138-01',
  titleDe: 'Tabelle 12: Empfehlung hydrologischer Grundlagen für Versickerungsanlagen',
  clause: '§5.3.3.5, Tab. 12 (L1471–L1490)',
  heads: ['Verfahren', 'Anwendung', 'Regen', 'Bemessungshäufigkeit n (1/a) 2)', 'Maßgebliche Dauerstufe D (min)', 'Abflussbildung', 'Abflusskonzentration'],
  rows: [
    { key: 'einfaches_verfahren', cells: ['Einfaches Verfahren (Lastfallkonzept)', 'Dezentrale und einfache zentrale Versickerungsanlagen 1)', 'statistische Starkregen (z. B. KOSTRA)', '0,02–0,5', 'Flächenversickerung 10–15; sonst iterativ', 'Bestimmung der Rechenwerte AC unter Berücksichtigung eines konstanten Abflussbeiwerts', 'in der Regel ohne Berücksichtigung; ggf. Abminderungsfaktor f_A'], writes: {}, matches: (v) => v.design_method === 'einfaches_verfahren', line: 'L1473–L1484', note: 'Einfaches Verfahren: KOSTRA-Regenspenden, A_C mit konstantem Abflussbeiwert (Tab. 9), n nach Tab. 8 innerhalb 0,02–0,5/a, Anwendungsgrenzen nach §5.3.3.2 (A_E ≤ 200 ha oder t_f ≤ 15 min; n ≥ 0,1/a; q_S,AC ≥ 2).' },
    { key: 'nachweisverfahren', cells: ['Nachweisverfahren (Langzeitkontinuumsimulation)', 'Zentrale Versickerung und vernetzte Mulden-Rigolen-Systeme 3)', 'geeignete, kontinuierliche Regenreihen für min. 10 Jahre', '0,02–0,5', 'entfällt', 'flächenspezifische Prozessmodellierung', 'entfällt oder Übertragungsfunktion'], writes: {}, matches: (v) => v.design_method === 'nachweisverfahren', line: 'L1473–L1484', note: 'Nachweisverfahren: Langzeitsimulation mit ≥ 10 Jahren Regenreihe (Gl. 1: M ≥ 3 · T_n), außerhalb des Einfachen Verfahrens dieser Kette.' },
  ],
  notesDe: [
    '1) Einzelanlagen (Mulden, Rigolen, Mulden-Rigolen-Elemente, Schachtversickerung, Becken) oder parallel geschaltete Mulden-Rigolen-Systeme; 2) nach Tabelle 8 und unter Berücksichtigung der Anwendungsgrenzen des Einfachen Verfahrens; 3) Mulden-Rigolen-Systeme in Reihenschaltung. (L1486–L1489)',
  ],
  targets: [],
};

// ---------------------------------------------------------------- Tab. 4 (A138-03), L759–L767 — reference checklist (what data from where)
const TAB4: GuidelineTable = {
  code: 'TAB4', worksheet: 'A138-03',
  titleDe: 'Tabelle 4: Verwendung, Art und Herkunft von Grundlagendaten für die Ersteinschätzung',
  clause: '§5.1.1, Tab. 4 (L759–L767)',
  heads: ['Verwendung', 'Informationsgrundlage', 'Quelle'],
  rows: [
    { key: 'boden', cells: ['Beurteilung der Boden-/Untergrundverhältnisse (z. B. k_f-Werte)', 'Bodenkarte, Geologische Karte, Baugrundgutachten, Sondierbohrungen etc.', 'Fachbehörden (Geologisches Landesamt, Landesamt für Bodenforschung, Umweltamt etc.), Fachplanende'], writes: {}, matches: () => false, line: 'L762' },
    { key: 'grundwasser', cells: ['Beurteilung der Grundwasserverhältnisse (z. B. Grundwasserflurabstand, Fließrichtung)', 'Hydrogeologische Karte, Grundwasserstandsmessungen, Grundwassergleichenplan, Flurabstandsplan, hydrogeologische Gutachten etc.', 'Fachbehörden, Wasserversorgungsunternehmen'], writes: {}, matches: () => false, line: 'L763' },
    { key: 'topografie', cells: ['Beurteilung der topografischen Verhältnisse (z. B. Hangneigung)', 'topografische Karte, Deutsche Grundkarte, digitales Geländemodell', 'Landesvermessungsamt, Katasteramt'], writes: {}, matches: () => false, line: 'L764' },
    { key: 'restriktionen', cells: ['Beurteilung möglicher Restriktionen', 'Flächennutzungsplan, Bebauungsplan, Gebietsentwicklungsplan, Altlastenkataster, Altlastengutachten, Schutzgebiete (Landschafts-, Natur- und Wasserschutzgebiete)', 'Verwaltungsbehörden (Stadt, Kommune, Kreis, Bezirksregierung), Fachbehörden'], writes: {}, matches: () => false, line: 'L765' },
    { key: 'machbarkeit', cells: ['Beurteilung der technischen Machbarkeit', 'Katasterplan, Leitungsplan, örtliche Begehung', 'Katasteramt, Versorgungsunternehmen, Verwaltungsbehörden'], writes: {}, matches: () => false, line: 'L766' },
  ],
  notesDe: [
    'In NRW: Boden/Grundwasser → Baugrundgutachten + LANUK (OpenHygrisC), Topografie → TIM-online (DGM1, Hangneigung), Restriktionen → ELWAS-WEB (Wasserschutzgebiete, Überschwemmungsgebiete) + Kataster, Machbarkeit → Lageplan, Leitungspläne, Begehung. Die Portal-Links auf A138-01 sind mit dem Standort voreingestellt.',
  ],
  targets: [],
};

// ---------------------------------------------------------------- Tab. A.1 (A138-03), L2444–L2463 — display keyed by permeability_test_method
const A1_ROW = (key: string, method: string, norm: string, result: string, quality: string, boden: string, anlage: string, line: string, match: (v: Record<string, unknown>) => boolean, note: string): GuidelineRow =>
  ({ key, cells: [method, norm, result, quality, boden, anlage], writes: {}, matches: match, line, note });
const TABA1: GuidelineTable = {
  code: 'TABA1', worksheet: 'A138-03',
  titleDe: 'Tabelle A.1: Einordnung von Methoden für die Durchlässigkeitsbestimmung in anstehendem Boden',
  clause: 'Anhang A (normativ), Tab. A.1 (L2444–L2463)',
  heads: ['Methode', 'Normung / Quelle', 'Ergebnis', 'Ergebnisqualität für Projektplanung', 'Eignung für Bodenart', 'Eignung für Versickerungsanlage'],
  rows: [
    A1_ROW('karten', 'Abschätzung mit Boden- oder Geodaten-Karten', 'DIN 4220, DIN 18196 (Eckelmann 2005)', 'k_f-Wert', 'Ersteinschätzung; nicht für Bemessung', 'alle', 'alle', 'L2448', (v) => v.permeability_test_method === 'literaturwert', 'Nur Ersteinschätzung — nicht für die Bemessung zulässig; ein Literaturwert kann den Nachweis nicht tragen.'),
    A1_ROW('ansprache', 'Abschätzung mit Bodenansprache', 'DIN 19682-2, DIN EN ISO 14688-1, DIN EN ISO 14688-2 (Eckelmann 2005)', 'k_f-Wert', 'Ersteinschätzung; nicht für Bemessung', 'alle', 'alle', 'L2453', () => false, ''),
    A1_ROW('sieblinie', 'Sieblinienauswertung', 'DIN ISO 11277, DIN EN ISO 17892-4, DIN 18196', 'k_f-Wert', 'Planungsgrundlage und für Bemessung', 'Sandböden (Feinsand/ breitstufige Sande)', 'tief liegende Rigolen, Schächte, unter Umständen bei Becken', 'L2454', (v) => v.permeability_test_method === 'korngroessenanalyse', 'Sieblinienauswertung: für Bemessung zulässig (f_Methode 0,1, Tab. 11), Eignung laut A.1 für Sandböden und tief liegende Rigolen/Schächte — für Versickerungsfläche und Mulden nennt A.1 den Doppelzylinder-Infiltrometer als geeignete Methode; als Bestätigung vor Ort empfohlen.'),
    A1_ROW('labor_ungestoert', 'Laborversuche ungestörte Proben (z. B. Permeameter-Versuch, Stechzylinderbodenprobe)', 'DIN 19683-9, DIN EN ISO 17892-11, DIN 19672-1', 'k_f-Wert', 'Planungsgrundlage und für Bemessung', 'alle', 'alle', 'L2456', (v) => v.permeability_test_method === 'laborversuch', 'Laborversuch an ungestörten Proben: für alle Bodenarten und Anlagen geeignet (f_Methode 0,7, Tab. 11).'),
    A1_ROW('bohrloch', 'Bohrlochmethode (z. B. Open-End-Test)', 'DIN EN ISO 22282-2 (Stecker 1995) (Mahabadi 2012)', 'k_f-Wert', 'Planungsgrundlage und für Bemessung', 'alle', 'Rigolen, Schächte, unter Umständen bei Becken', 'L2457', () => false, ''),
    A1_ROW('doppelzylinder', 'Doppelzylinder-Infiltrometer', 'DIN EN ISO 22282-5, DIN 19682-7', 'Infiltrationsrate k_i oder k_f-Wert', 'Planungsgrundlage und für Bemessung', 'schlämmungsunempfindliche und steinarme Böden', 'Versickerungsfläche, Mulden, unter Umständen bei Becken', 'L2458', () => false, ''),
    A1_ROW('schurf_klein', 'Kleinflächiger Probeschurf (≤ 1 m²)', '(Mahabadi 2012) (Woods-Ballard et al. 2015)', 'Infiltrationsrate k_i oder k_f-Wert', 'Planungsgrundlage und für Bemessung', 'alle', 'alle', 'L2459', () => false, ''),
    A1_ROW('schurf_gross', 'Großflächige Testgrube/Probeschurf (> 1 m²)', '(Mahabadi 2012) (Woods-Ballard et al. 2015)', 'Infiltrationsrate k_i', 'Planungsgrundlage und für Bemessung', 'alle', 'alle', 'L2460', (v) => v.permeability_test_method === 'feldversuch', 'Feldversuch: die vom Regelwerk bevorzugte Methode (§5.3.3.6, L1377: „Vorzugsweise sollte der Durchlässigkeitsbeiwert für Planungen durch Feldversuche bestimmt werden.“); welche Feldmethode (Tab. 11: 1 · 0,9 · 0,9 · 0,8) ist in der Zeile zu wählen.'),
  ],
  notesDe: [
    '§5.3.3.6 (L1377): Informationen zur Eignung von Bestimmungsmethoden sind ergänzend mit Anhang A, Tabelle A.1 in Abhängigkeit des Versickerungsverfahrens und der Bodenart gegeben. Vorzugsweise sollte der Durchlässigkeitsbeiwert für Planungen durch Feldversuche bestimmt werden.',
    'Die vier vorhandenen Optionen (Feldversuch / Laborversuch / Korngrößenanalyse / Literaturwert) werden auf die acht gedruckten Methoden abgebildet; die feineren Zeilen sind Ruling a138-E-1.',
  ],
  targets: [],
};

export const GUIDELINE_TABLES: Record<string, GuidelineTable> = { TAB4, TAB5, TAB6, TAB7, TAB8, TAB11, TAB12, TAB13, TAB14, TABA1, QVS };

/** Tables shown on a worksheet (DWA-A 138-1). */
export const TABLES_BY_WORKSHEET: Readonly<Record<string, string[]>> = {
  'A138-01': ['TAB12'],
  'A138-03': ['TAB11', 'TABA1', 'TAB4'],
  'A138-06': ['TAB5', 'TAB6', 'TAB7'],
  'A138-08': ['TAB8'],
  'A138-12': ['TAB13'],
  'A138-15': ['TAB14'],
  'A138-18': ['QVS'],
};

/** Row keys of `table` that match the stored values (0, 1 or, for tables with a hidden key, several). */
export function matchingRows(table: GuidelineTable, values: Record<string, unknown>): string[] {
  return table.rows.filter((r) => r.matches(values)).map((r) => r.key);
}
