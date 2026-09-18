/**
 * DWA-M-820-3 — Plan 3 Task 9 field configs (the twelve item-level QE
 * checklist registers, their derived count / share outputs, the annex
 * aggregates, the Projektstopp code, two created select_many sets and the
 * project_type visibility rules) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts m820_3`.
 *
 * Every `verification_quote` is a span lifted verbatim (one transcript line)
 * from `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-3\DWA-M_820-3.md`; the
 * constants are exported by `regulation-tables-seed-m820_3.ts` with their
 * line numbers. Prod facts come from the captured `m820_3.prior.json`
 * (2026-09-18, read-only): 24 worksheets, each with the nine coded sections
 * A B C D F J K L M (fields live in B / C / F; 0 orphans); 0 equations; 32
 * compliance rows. `project_type` tokens are `gesamtsystem` / `einzelprojekt`
 * / `both` (NOT the brief's `beide`).
 *
 * The twelve registers are generated from ONE template (`QE_WORKSHEETS`):
 * each QE worksheet gets a register `<prefix>_items` bound to its catalogue
 * table (`nr` lookup_key → `kriterium` / `hinweise` lookup_values, a
 * Y / P / N / NA rating, Nachweis, Bemerkung); the B.2 / B.3 catalogues are
 * printed ONCE but prod splits them over two worksheets each (M8203-12 /
 * -13 = B.2 Nr. 1–21 / 22–40, M8203-14 / -15 = B.3 Nr. 1–17 / 18–50 — the
 * prod `qeNN_items_total` VR strings), so those four registers bind the same
 * table and carry a `in_teil` badge (`lookup(<table>, nr, 'nr_num')` inside
 * the printed range) that the counts filter on.
 *
 * Placement decisions (codebase reality over the brief — report §8, sign-off
 * sheet):
 *   - the derived counts are CREATED twins (`<prefix>_items_y_calc`, … ,
 *     `<prefix>_items_rated`, `<prefix>_share_*_pct`) beside the existing
 *     manual count fields, NOT the existing `qeNN_items_y/p/n/na` symbols the
 *     brief names: those are consumed manual inputs (M8203-22 / -23 / -24,
 *     REQ-15 … REQ-24) and taking them over is the deactivation class the
 *     brief itself labels m820_3-D-1 — STAGED with the full SQL, never emitted
 *     (the a138-D-2 / fll_naturteich-R-* precedent: an equation never takes
 *     ownership of a consumed manual number without a ruling);
 *   - `qeNN_fulfilment_pct` stays manual: the P-weight and the NA treatment
 *     are not printed (m820_3-F-1 carries the two candidate formulas);
 *   - `project_type.consumer_worksheets = ["ALL"]` is NOT resolved by
 *     `loadInheritedFields` (`code = ANY(consumer_worksheets)`), so every rule
 *     keyed on it is `pending` (visible, inert) on the other worksheets until
 *     the consumer edit m820_3-C-1 (the fll_gar-C-1 pattern) — the rules are
 *     emitted on the CREATED fields anyway and pinned;
 *   - section rules: NONE emitted. Every field-bearing section of M8203-04 …
 *     -18 holds consumed producers (pz_* → -07 … -15 / -22 / -23 / -24;
 *     qeNN_* → -22 / -23 / -24) and the emitter refuses them; the field-free
 *     sections are not observable (Task 8 lesson). The Anhang-A / Anhang-B
 *     hide of the existing scalars is STAGED as m820_3-C-2 / -C-3;
 *   - field rules on EXISTING fields: none (all consumed — the brief's BIM
 *     block rule on M8203-19 is m820_3-C-4, `projektstopp_review_triggered`
 *     stays visible as the brief says);
 *   - `bild1_schritte` is NOT created: Bild 1 is an image (L315–L319), the
 *     four steps are not printed as text (m820_3-U-2); `sektoren` (L196) and
 *     `anwendungshinweise` (L200 / L202 / L204 / L206) are created as
 *     select_many beside the booleans they mirror (m820_3-J-1 keeps the
 *     booleans until ratified).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import type { RegisterUiConfig } from '../field-config';
import { norm, QE_CATALOGUES, QE_OVERRIDE_QUOTE, Q_L67, Q_L194, Q_L196, Q_L200, Q_L202, Q_L204, Q_L206, Q_L307, Q_L321, Q_L398 } from '../regulation-tables-seed-m820_3';

const STD = 'DWA-M-820-3';

/** Prod `project_type` tokens (M8203-01, captured). */
export const PROJECT_TYPE_TOKENS = ['gesamtsystem', 'einzelprojekt', 'both'] as const;
/** The rating scale of the prod count fields (`qeNN_items_y/p/n/na`, "Items rated Y (erfüllt)" …) — not printed in the standard, prod's design. */
export const RATING_TOKENS = ['y', 'p', 'n', 'na'] as const;
export const RATING_LABELS: Record<(typeof RATING_TOKENS)[number], string> = { y: 'Y — erfüllt', p: 'P — teilweise erfüllt', n: 'N — nicht erfüllt', na: 'NA — nicht zutreffend' };

// ---- drivers / conditions (prod tokens) ----
/** Anhang A (Gesamtsystem) applies to gesamtsystem / both — §4 L321 + §6.1 L398 (Bild 1 split). */
export const ANNEX_A = "project_type IN {'gesamtsystem', 'both'}";
/** Anhang B (Projekte) applies to einzelprojekt / both. */
export const ANNEX_B = "project_type IN {'einzelprojekt', 'both'}";
const ANNEX_CUE = `${norm(Q_L321)} — ${norm(Q_L398)}`;
const CATALOGUE_CUE = `${norm(Q_L67)} — ${norm(Q_L194)}`;

export type QeWorksheet = {
  ws: string; prefix: string; table: string; annex: 'A' | 'B'; title: string;
  /** Printed Nr. range covered by this worksheet (the whole catalogue, or prod's split half). */
  from: number; to: number; split: string | null;
};
/** Worksheet ↔ catalogue ↔ printed item range (prod VR strings: 15 / 8 / 12 / 3 / 15 / 21 / 19 / 17 / 33 / 34 / 10 / 6). */
export const QE_WORKSHEETS: readonly QeWorksheet[] = [
  { ws: 'M8203-07', prefix: 'qe52', table: 'QE_A1', annex: 'A', title: 'QE 5.2: Bedarfsplanung Konzept (Anhang A.1)', from: 1, to: 15, split: null },
  { ws: 'M8203-08', prefix: 'qe53', table: 'QE_A2', annex: 'A', title: 'QE 5.3: Konzept Gesamtsystem (Anhang A.2)', from: 1, to: 8, split: null },
  { ws: 'M8203-09', prefix: 'qe54', table: 'QE_A3', annex: 'A', title: 'QE 5.4: Identifikation von Projekten (Anhang A.3)', from: 1, to: 12, split: null },
  { ws: 'M8203-10', prefix: 'qe55', table: 'QE_A4', annex: 'A', title: 'QE 5.5: Matrix Nachhaltigkeit (Anhang A.4)', from: 1, to: 3, split: null },
  { ws: 'M8203-11', prefix: 'qe62', table: 'QE_B1', annex: 'B', title: 'QE 6.2: Bedarfsplanung Projekt (Anhang B.1)', from: 1, to: 15, split: null },
  { ws: 'M8203-12', prefix: 'qe63a', table: 'QE_B2', annex: 'B', title: 'QE 6.3: Planung (Anhang B.2, Teil 1: Grundlagenermittlung, Vorplanung — Nr. 1–21)', from: 1, to: 21, split: 'Teil 1 (Nr. 1–21)' },
  { ws: 'M8203-13', prefix: 'qe63b', table: 'QE_B2', annex: 'B', title: 'QE 6.3: Planung (Anhang B.2, Teil 2: Entwurfsplanung, Genehmigungsplanung — Nr. 22–40)', from: 22, to: 40, split: 'Teil 2 (Nr. 22–40)' },
  { ws: 'M8203-14', prefix: 'qe64a', table: 'QE_B3', annex: 'B', title: 'QE 6.4: Ausführungsvorbereitung (Anhang B.3, Teil 1: Ausführungsplanung — Nr. 1–17)', from: 1, to: 17, split: 'Teil 1 (Nr. 1–17)' },
  { ws: 'M8203-15', prefix: 'qe64b', table: 'QE_B3', annex: 'B', title: 'QE 6.4: Ausführungsvorbereitung (Anhang B.3, Teil 2: Vorbereiten + Mitwirken bei der Vergabe — Nr. 18–50)', from: 18, to: 50, split: 'Teil 2 (Nr. 18–50)' },
  { ws: 'M8203-16', prefix: 'qe65', table: 'QE_B4', annex: 'B', title: 'QE 6.5: Ausführung (Anhang B.4)', from: 1, to: 34, split: null },
  { ws: 'M8203-17', prefix: 'qe66', table: 'QE_B5', annex: 'B', title: 'QE 6.6: Inbetriebnahme, Testbetrieb, Abnahme (Anhang B.5)', from: 1, to: 10, split: null },
  { ws: 'M8203-18', prefix: 'qe67', table: 'QE_B6', annex: 'B', title: 'QE 6.7: Projektabschluss (Anhang B.6)', from: 1, to: 6, split: null },
];
const catalogue = (code: string) => QE_CATALOGUES.find((c) => c.code === code)!;
export const annexRule = (w: QeWorksheet) => (w.annex === 'A' ? ANNEX_A : ANNEX_B);
export const registerSymbol = (w: QeWorksheet) => `${w.prefix}_items`;
/** Row-scope range badge for the split worksheets (`in_teil`), the printed Nr. read from the catalogue row. */
export const inTeilExpr = (w: QeWorksheet) => `if(lookup('${w.table}', nr, 'nr_num') >= ${w.from} AND lookup('${w.table}', nr, 'nr_num') <= ${w.to}, 1, 0)`;
/** The count condition the equations use (`in_teil == 1` only on split worksheets). */
export const rangeCond = (w: QeWorksheet, cond?: string) => [cond, w.split ? 'in_teil == 1' : null].filter(Boolean).join(' AND ');
/** Symbols of the derived outputs per worksheet (created `derived` fields, footer order). */
export const outputSymbols = (w: QeWorksheet) => ({
  y: `${w.prefix}_items_y_calc`, p: `${w.prefix}_items_p_calc`, n: `${w.prefix}_items_n_calc`, na: `${w.prefix}_items_na_calc`, rated: `${w.prefix}_items_rated`,
  share_y: `${w.prefix}_share_y_pct`, share_p: `${w.prefix}_share_p_pct`, share_n: `${w.prefix}_share_n_pct`, share_na: `${w.prefix}_share_na_pct`,
});

function registerUi(w: QeWorksheet): RegisterUiConfig {
  const cat = catalogue(w.table);
  const grouped = w.table === 'QE_B2' || w.table === 'QE_B3';
  const o = outputSymbols(w);
  return {
    title: `Qualitätselemente — ${w.title}`,
    subtitle: `je gedrucktem Kriterium (${cat.title_de}, Nr. ${w.from}–${w.to}) eine Zeile — Bewertung Y / P / N / NA mit Nachweis${w.split ? `; Zeilen außerhalb ${w.split} zählen hier nicht` : ''}`,
    add_label: '+ Kriterium', placement: 'section',
    columns: [
      { key: 'nr', label: 'Nr.', type: 'lookup_key', required: true, lookup: grouped ? { table_code: w.table, group_by: 'group_label' } : { table_code: w.table }, aria_label: `Kriterium aus ${cat.title_de} wählen` },
      { key: 'kriterium', label: 'Qualitätselemente/-kriterien', type: 'lookup_value', lookup: { table_code: w.table, key_column: 'nr', value: 'kriterium' } },
      { key: 'hinweise', label: 'Hinweise', type: 'lookup_value', lookup: { table_code: w.table, key_column: 'nr', value: 'hinweise' } },
      { key: 'rating', label: 'Bewertung', type: 'enum', required: true, options: [...RATING_TOKENS], option_labels: RATING_LABELS },
      { key: 'evidence', label: 'Nachweis', type: 'text', aria_label: 'Nachweis / Beleg zum Kriterium' },
      { key: 'remark', label: 'Bemerkung', type: 'text', aria_label: 'Bemerkung zum Kriterium' },
      ...(w.split ? [{ key: 'in_teil', label: w.split, type: 'derived' as const, expr: inTeilExpr(w), display: 'badge' as const, value_labels: { '1': `gehört zu ${w.split}`, '0': `außerhalb ${w.split} — gehört auf das andere Arbeitsblatt, zählt hier nicht` } }] : []),
    ],
    footer: [o.rated, o.y, o.p, o.n, o.na, o.share_y, o.share_p, o.share_n, o.share_na],
    note: `${QE_OVERRIDE_QUOTE} — Zeilen werden aus dem Katalog gewählt (Vollständigkeit: ${o.rated} == ${w.to - w.from + 1} gedruckte Kriterien); projektspezifische Ergänzungen sind nicht als Zeile erfassbar (m820_3-X-1).`,
  };
}

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });

/** One created `derived` number output in section D, hidden together with its register (annex rule). */
function derivedOut(w: QeWorksheet, symbol: string, label: string, unit: string | null, eqNo: string, what: string): FieldConfigEntry {
  const cat = catalogue(w.table);
  return on(w.ws)({
    symbol, widget: 'derived', ui_config: null, visible_when: annexRule(w),
    verification_quote: `${norm(cat.heading)} — ${CATALOGUE_CUE}`,
    create: { section_code: 'D', label_de: label, data_type: 'number', unit, clause_reference: cat.clause_reference,
      description: `Plan 3: Ausgabe der Gleichung ${eqNo} (${what} über ${registerSymbol(w)}${w.split ? `, nur Zeilen ${w.split}` : ''}); die manuellen Zählfelder ${w.prefix}_items_y/p/n/na bleiben Eingaben — Ablösung STAGED (m820_3-D-1), Gate-Umbindung STAGED (m820_3-G-3).` },
  });
}

function worksheetEntries(w: QeWorksheet): FieldConfigEntry[] {
  const cat = catalogue(w.table);
  const o = outputSymbols(w);
  const n = w.to - w.from + 1;
  const reg = on(w.ws)({
    symbol: registerSymbol(w), widget: 'register', ui_config: registerUi(w), visible_when: annexRule(w),
    verification_quote: `${norm(cat.heading)} — ${CATALOGUE_CUE} — ${ANNEX_CUE}`,
    create: { section_code: 'C', label_de: `Qualitätselemente ${cat.title_de}${w.split ? ` — ${w.split}` : ''} (je Kriterium Bewertung Y / P / N / NA)`, data_type: 'json', unit: null, clause_reference: cat.clause_reference,
      description: `Plan 3: Zeilen je gedrucktem Kriterium aus ${w.table} (${n} Kriterien Nr. ${w.from}–${w.to}; Nr. → Kriterium / Hinweise aus dem Katalog, Bewertung Y / P / N / NA, Nachweis, Bemerkung); Zählungen → ${o.y} / ${o.p} / ${o.n} / ${o.na} / ${o.rated} (${w.ws}-D1 … -D5), Anteile je Bewertung → ${o.share_y} / ${o.share_p} / ${o.share_n} / ${o.share_na} (${w.ws}-D6 … -D9, Nenner ${w.prefix}_items_total); Erfüllungsgrad ${w.prefix}_fulfilment_pct bleibt Eingabe (P-Gewicht / NA-Behandlung nicht gedruckt — m820_3-F-1). Sichtbar für project_type ${w.annex === 'A' ? 'gesamtsystem / both' : 'einzelprojekt / both'} — wirksam erst nach m820_3-C-1.` },
  });
  const counts = [
    derivedOut(w, o.rated, `${w.title}: bewertete Kriterien (vollständige Zeilen)`, null, `${w.ws}-D5`, 'count_rows'),
    derivedOut(w, o.y, `${w.title}: Kriterien mit Bewertung Y (erfüllt) — aus dem Register`, null, `${w.ws}-D1`, "count_rows mit rating == 'y'"),
    derivedOut(w, o.p, `${w.title}: Kriterien mit Bewertung P (teilweise erfüllt) — aus dem Register`, null, `${w.ws}-D2`, "count_rows mit rating == 'p'"),
    derivedOut(w, o.n, `${w.title}: Kriterien mit Bewertung N (nicht erfüllt) — aus dem Register`, null, `${w.ws}-D3`, "count_rows mit rating == 'n'"),
    derivedOut(w, o.na, `${w.title}: Kriterien mit Bewertung NA (nicht zutreffend) — aus dem Register`, null, `${w.ws}-D4`, "count_rows mit rating == 'na'"),
    derivedOut(w, o.share_y, `${w.title}: Anteil Y an den ${n} gedruckten Kriterien`, '%', `${w.ws}-D6`, "count_rows mit rating == 'y' · 100 / items_total"),
    derivedOut(w, o.share_p, `${w.title}: Anteil P an den ${n} gedruckten Kriterien`, '%', `${w.ws}-D7`, "count_rows mit rating == 'p' · 100 / items_total"),
    derivedOut(w, o.share_n, `${w.title}: Anteil N an den ${n} gedruckten Kriterien`, '%', `${w.ws}-D8`, "count_rows mit rating == 'n' · 100 / items_total"),
    derivedOut(w, o.share_na, `${w.title}: Anteil NA an den ${n} gedruckten Kriterien`, '%', `${w.ws}-D9`, "count_rows mit rating == 'na' · 100 / items_total"),
  ];
  return [reg, ...counts];
}

/** M8203-22 / -23 annex aggregates and the per-annex Projektstopp code; M8203-24 the overall code. */
const annexEntries = (): FieldConfigEntry[] => {
  const a = QE_WORKSHEETS.filter((w) => w.annex === 'A');
  const b = QE_WORKSHEETS.filter((w) => w.annex === 'B');
  const ratedList = (ws: QeWorksheet[]) => ws.map((w) => outputSymbols(w).rated).join(' + ');
  const totalList = (ws: QeWorksheet[]) => ws.map((w) => `${w.prefix}_items_total`).join(' + ');
  return [
    on('M8203-22')({ symbol: 'gesamt_anhang_a_items_total_calc', widget: 'derived', ui_config: null, visible_when: ANNEX_A, verification_quote: `${norm(catalogue('QE_A1').heading)} — ${norm(catalogue('QE_A4').heading)} — ${ANNEX_CUE}`,
      create: { section_code: 'D', label_de: 'Gesamtsystem QE Items (Anhang A) — Σ der Katalogsummen aus M8203-07 … -10', data_type: 'number', unit: null, clause_reference: 'Anhang A.1–A.4', description: `Plan 3: Ausgabe der Gleichung M8203-22-D1 (${totalList(a)} — die vererbten Katalogsummen; gedruckt 15 + 8 + 12 + 3 = 38); das manuelle gesamt_anhang_a_items_total bleibt Eingabe (Ablösung STAGED m820_3-D-2).` } }),
    on('M8203-22')({ symbol: 'gesamt_anhang_a_items_rated', widget: 'derived', ui_config: null, visible_when: ANNEX_A, verification_quote: `${norm(catalogue('QE_A1').heading)} — ${CATALOGUE_CUE}`,
      create: { section_code: 'D', label_de: 'Gesamtsystem QE Items (Anhang A) — Σ bewertete Kriterien aus den Registern M8203-07 … -10', data_type: 'number', unit: null, clause_reference: 'Anhang A.1–A.4', description: `Plan 3: Ausgabe der Gleichung M8203-22-D2 (${ratedList(a)}); unentscheidbar, bis die vier Register-Ausgaben auf M8203-22 vererbt sind (m820_3-C-5).` } }),
    on('M8203-22')({ symbol: 'projektstopp_code_a', widget: 'derived', ui_config: null, visible_when: ANNEX_A, verification_quote: norm(Q_L307),
      create: { section_code: 'D', label_de: 'Projektstopp-Prüfung erforderlich (Anhang A) — 1, wenn ein Phasenziel §5.2 / §5.3 / §5.4 „nicht oder nur unvollständig erreicht“ ist (nicht_erreicht / teilweise_erreicht)', data_type: 'number', unit: null, clause_reference: '§3; §5.2–5.4', description: 'Plan 3: Ausgabe der Gleichung M8203-22-D3 (OR über die 13 pz_52_* / pz_53_* / pz_54_*-Status IN {nicht_erreicht, teilweise_erreicht} — L307 „nicht oder nur unvollständig erreicht“ —, alle auf M8203-22 vererbt); REQ-31 (leere Bedingung) darauf STAGED (m820_3-G-4).' } }),
    on('M8203-23')({ symbol: 'gesamt_anhang_b_items_total_calc', widget: 'derived', ui_config: null, visible_when: ANNEX_B, verification_quote: `${norm(catalogue('QE_B1').heading)} — ${norm(catalogue('QE_B6').heading)} — ${ANNEX_CUE}`,
      create: { section_code: 'D', label_de: 'Projekt QE Items (Anhang B) — Σ der Katalogsummen aus M8203-11 … -18', data_type: 'number', unit: null, clause_reference: 'Anhang B.1–B.6', description: `Plan 3: Ausgabe der Gleichung M8203-23-D1 (${totalList(b)} — die vererbten Katalogsummen; gedruckt 15 + 40 + 50 + 34 + 10 + 6 = 155); das manuelle gesamt_anhang_b_items_total bleibt Eingabe (Ablösung STAGED m820_3-D-2).` } }),
    on('M8203-23')({ symbol: 'gesamt_anhang_b_items_rated', widget: 'derived', ui_config: null, visible_when: ANNEX_B, verification_quote: `${norm(catalogue('QE_B1').heading)} — ${CATALOGUE_CUE}`,
      create: { section_code: 'D', label_de: 'Projekt QE Items (Anhang B) — Σ bewertete Kriterien aus den Registern M8203-11 … -18', data_type: 'number', unit: null, clause_reference: 'Anhang B.1–B.6', description: `Plan 3: Ausgabe der Gleichung M8203-23-D2 (${ratedList(b)}); unentscheidbar, bis die acht Register-Ausgaben auf M8203-23 vererbt sind (m820_3-C-5).` } }),
    on('M8203-23')({ symbol: 'projektstopp_code_b', widget: 'derived', ui_config: null, visible_when: ANNEX_B, verification_quote: norm(Q_L307),
      create: { section_code: 'D', label_de: 'Projektstopp-Prüfung erforderlich (Anhang B) — 1, wenn ein Phasenziel §6.2 … §6.7 „nicht oder nur unvollständig erreicht“ ist (nicht_erreicht / teilweise_erreicht)', data_type: 'number', unit: null, clause_reference: '§3; §6.2–6.7', description: 'Plan 3: Ausgabe der Gleichung M8203-23-D3 (OR über die 54 pz_62_* … pz_67_*-Status IN {nicht_erreicht, teilweise_erreicht} — L307 —, alle auf M8203-23 vererbt); REQ-31 darauf STAGED (m820_3-G-4).' } }),
    on('M8203-24')({ symbol: 'projektstopp_code', widget: 'derived', ui_config: null, verification_quote: norm(Q_L307),
      create: { section_code: 'F', label_de: 'Projektstopp-Prüfung erforderlich — 1, wenn irgendein Phasenziel (Anhang A oder B) „nicht oder nur unvollständig erreicht“ ist (nicht_erreicht / teilweise_erreicht)', data_type: 'number', unit: null, clause_reference: '§3', description: 'Plan 3: Ausgabe der Gleichung M8203-24-D1 (OR über alle 67 pz_*_status IN {nicht_erreicht, teilweise_erreicht} — L307 —, alle auf M8203-24 vererbt; jedes Phasenziel muss gesetzt sein — nicht zutreffende Phasen als nicht_zutreffend); die Booleans projektstopp_review_triggered (M8203-02) / projektstopp_required bleiben Eingaben, REQ-31 darauf STAGED (m820_3-G-4).' } }),
  ];
};

/** §1 sectors (L196) and the four Anwendungshinweise (L200 / L202 / L204 / L206) as select_many beside the prod booleans (m820_3-J-1). */
export const SEKTOR_OPTIONS = [
  { value: 'wasserwirtschaft', label_de: 'Wasserwirtschaft', order_index: 0 }, { value: 'wasserbau', label_de: 'Wasserbau', order_index: 1 },
  { value: 'abwasser', label_de: 'Abwasser', order_index: 2 }, { value: 'abfall', label_de: 'Abfall', order_index: 3 },
];
/** The printed sentence without the OCR'd bullet glyph ("I" / "1" at the line start). */
const hinweisText = (span: string) => norm(span).replace(/^[I1] /, '');
export const ANWENDUNGSHINWEIS_OPTIONS = [
  { value: 'hinweis_1', label_de: hinweisText(Q_L200), order_index: 0 }, { value: 'hinweis_2', label_de: hinweisText(Q_L202), order_index: 1 },
  { value: 'hinweis_3', label_de: hinweisText(Q_L204), order_index: 2 }, { value: 'hinweis_4', label_de: hinweisText(Q_L206), order_index: 3 },
];
const selectionEntries = (): FieldConfigEntry[] => [
  on('M8203-01')({ symbol: 'sektoren', widget: 'select_many', ui_config: { title: 'Bereiche (§1 Anwendungsbereich)', subtitle: 'Wasserwirtschaft · Wasserbau · Abwasser · Abfall — Mehrfachauswahl', note: norm(Q_L196) },
    enum_values: SEKTOR_OPTIONS, verification_quote: norm(Q_L196),
    create: { section_code: 'B', label_de: 'Bereiche nach §1 (Wasserwirtschaft / Wasserbau / Abwasser / Abfall)', data_type: 'json', unit: null, clause_reference: '§1', description: 'Plan 3: Mehrfachauswahl über die vier gedruckten Bereiche (L196) neben den vier Booleans sector_* (REQ-01 liest die Booleans weiter — Ablösung STAGED m820_3-J-1).' } }),
  on('M8203-02')({ symbol: 'anwendungshinweise', widget: 'select_many', ui_config: { title: 'Anwendungshinweise (§1) — zur Kenntnis genommen', subtitle: 'die vier gedruckten Hinweise — Mehrfachauswahl', note: CATALOGUE_CUE },
    enum_values: ANWENDUNGSHINWEIS_OPTIONS, verification_quote: `${norm(Q_L200)} — ${norm(Q_L202)} — ${norm(Q_L204)} — ${norm(Q_L206)}`,
    create: { section_code: 'C', label_de: 'Anwendungshinweise nach §1 (vier gedruckte Hinweise)', data_type: 'json', unit: null, clause_reference: '§1 Anwendungshinweise', description: 'Plan 3: Mehrfachauswahl über die vier gedruckten Anwendungshinweise (L200 / L202 / L204 / L206) neben den Booleans anw_hinweis_1…4_confirmed (REQ-02 hat eine leere Bedingung — Vorschlag STAGED m820_3-G-5; Ablösung der Booleans m820_3-J-1).' } }),
];

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  ...selectionEntries(),
  ...QE_WORKSHEETS.flatMap(worksheetEntries),
  ...annexEntries(),
];

/**
 * Section rules: NONE emitted. Every field-bearing section of M8203-04 … -18 (B / C / F) holds a symbol other worksheets
 * inherit (pz_*_status → M8203-07 … -15 / -22 / -23 / -24; qeNN_* → -22 / -23 / -24) — the emitter refuses them — and the
 * remaining sections (A, D, J, K, L, M) hold 0 fields, so a rule there alone is not observable (worksheet-form.tsx renders
 * only sections that contain a visible field). The Anhang-A / Anhang-B hide of the existing scalars is STAGED as
 * m820_3-C-2 (M8203-04 … -10 ← ANNEX_A) / m820_3-C-3 (M8203-11 … -18 ← ANNEX_B), which also needs m820_3-C-1 first.
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];
/** The cues the staged C-2 / C-3 / C-4 rules rest on (kept here so the sheet and the STAGED file cite the same spans). */
export const SECTION_RULE_CUES = { annex: ANNEX_CUE, catalogue: CATALOGUE_CUE };

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
