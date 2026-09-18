/**
 * DWA-M-820-3 — Plan 3 Task 9 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts m820_3` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`; prod has 0 equations for this standard —
 * nothing is replaced). Generated from ONE template over `QE_WORKSHEETS`
 * (field-configs/m820_3.ts) — never hand-written twelve times:
 *
 *   <ws>-D1 … -D4  <prefix>_items_{y,p,n,na}_calc = count_rows(<reg>, rating == '<r>'[ AND in_teil == 1])
 *   <ws>-D5        <prefix>_items_rated           = count_rows(<reg>[, in_teil == 1])
 *   <ws>-D6 … -D9  <prefix>_share_{y,p,n,na}_pct  = count_rows(<reg>, rating == '<r>'[ AND in_teil == 1]) * 100 / <prefix>_items_total
 *
 * The share denominators are the existing prod constants `<prefix>_items_total`
 * (own fields of each worksheet, "verbatim count N" per the prod descriptions,
 * VR '== N'); the printed counts are pinned by the seed test. Nothing here
 * encodes a fulfilment formula — the P-weight and the NA treatment are not
 * printed (m820_3-F-1). The count / share rows are register-fed
 * (materialised on save by the generic materialiser); the annex sums and the
 * Projektstopp codes are scalar-only (displayed, not server-materialised —
 * amendment D, expected).
 *
 * Annex rows: M8203-22-D1 / M8203-23-D1 sum the inherited `<prefix>_items_total`
 * constants (computable today — the fields are consumed by -22 / -23); -D2 sum
 * the created `<prefix>_items_rated` outputs (undecidable until the consumer edit
 * m820_3-C-5); -D3 / M8203-24-D1 are the Projektstopp codes: §3 L307 "Werden
 * Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines
 * Projektstopps erforderlich." → 1 when any inherited `pz_*_status` equals the
 * prod token 'nicht_erreicht' ("nicht … erreicht") OR 'teilweise_erreicht'
 * ("nur unvollständig erreicht") — the printed sentence names both, so the
 * emitted default follows it (source-settled; fix round 1, controller ruling);
 * the narrower nicht-only reading is the alternative on m820_3-J-2. The 13
 * Anhang-A goals on -22, the 54 Anhang-B goals on -23, all 67 on -24 — every
 * pz_* row is consumed there per the capture.
 * Every named input must be set (the engine checks inputs before evaluating):
 * a project of one type sets the other annex's goals `nicht_zutreffend`.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { norm, QE_CATALOGUES, Q_L67, Q_L194, Q_L307 } from '../regulation-tables-seed-m820_3';
import { QE_WORKSHEETS, RATING_TOKENS, RATING_LABELS, outputSymbols, rangeCond, registerSymbol, type QeWorksheet } from '../field-configs/m820_3';

const STD = 'DWA-M-820-3';
const CATALOGUE_CUE = `${norm(Q_L67)} — ${norm(Q_L194)}`;
const heading = (w: QeWorksheet) => norm(QE_CATALOGUES.find((c) => c.code === w.table)!.heading);

/** Prod `pz_<phase>_<n>_status` symbols per Phasenziel worksheet (captured: 5 / 5 / 3 on M8203-04 … -06; 5 / 8 / 12 / 12 / 11 / 6 on -11 … -18). */
export const PZ_SYMBOLS_A = [
  ...[1, 2, 3, 4, 5].map((n) => `pz_52_${n}_status`), ...[1, 2, 3, 4, 5].map((n) => `pz_53_${n}_status`), ...[1, 2, 3].map((n) => `pz_54_${n}_status`),
];
export const PZ_SYMBOLS_B = [
  ...[1, 2, 3, 4, 5].map((n) => `pz_62_${n}_status`), ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `pz_63_${n}_status`),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `pz_64_${n}_status`), ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `pz_65_${n}_status`),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => `pz_66_${n}_status`), ...[1, 2, 3, 4, 5, 6].map((n) => `pz_67_${n}_status`),
];
export const PZ_SYMBOLS = [...PZ_SYMBOLS_A, ...PZ_SYMBOLS_B];
/** Prod tokens of the statuses L307 names — "nicht … erreicht" and "nur unvollständig erreicht" (captured enum_values of every pz_* field). */
export const NICHT_ERREICHT = 'nicht_erreicht';
export const TEILWEISE_ERREICHT = 'teilweise_erreicht';
/** The printed trigger per goal: `pz IN {'nicht_erreicht', 'teilweise_erreicht'}` (fix round 1 — both readings of L307). */
export const PROJEKTSTOPP_TRIGGER = `IN {'${NICHT_ERREICHT}', '${TEILWEISE_ERREICHT}'}`;
export const projektstoppFormula = (out: string, symbols: readonly string[]) => `${out} = if(${symbols.map((s) => `${s} ${PROJEKTSTOPP_TRIGGER}`).join(' OR ')}, 1, 0)`;

function worksheetEquations(w: QeWorksheet): EquationEntry[] {
  const o = outputSymbols(w);
  const reg = registerSymbol(w);
  const n = w.to - w.from + 1;
  const scope = w.split ? `, nur Zeilen ${w.split} (in_teil == 1)` : '';
  const base = { standard: STD, worksheet: w.ws, clause_reference: QE_CATALOGUES.find((c) => c.code === w.table)!.clause_reference, verification_quote: `${heading(w)} — ${CATALOGUE_CUE}` };
  const count = (i: number, r: (typeof RATING_TOKENS)[number]): EquationEntry => ({
    ...base, equation_number: `${w.ws}-D${i}`, output_symbol: o[r], output_unit: null,
    formula: `${o[r]} = count_rows(${reg}, ${rangeCond(w, `rating == '${r}'`)})`, input_symbols: [reg],
    description: `Plan 3: Anzahl der Kriterien mit Bewertung ${RATING_LABELS[r]} im Register ${reg}${scope}; Zwilling des manuellen ${w.prefix}_items_${r} (Ablösung STAGED m820_3-D-1).`,
  });
  const share = (i: number, r: (typeof RATING_TOKENS)[number]): EquationEntry => ({
    ...base, equation_number: `${w.ws}-D${i}`, output_symbol: o[`share_${r}` as keyof typeof o], output_unit: '%',
    formula: `${o[`share_${r}` as keyof typeof o]} = count_rows(${reg}, ${rangeCond(w, `rating == '${r}'`)}) * 100 / ${w.prefix}_items_total`, input_symbols: [reg, `${w.prefix}_items_total`],
    description: `Plan 3: Anteil der Kriterien mit Bewertung ${RATING_LABELS[r]} an den ${n} gedruckten Kriterien (Nenner ${w.prefix}_items_total)${scope}; kein Erfüllungsgrad — P-Gewicht / NA-Behandlung nicht gedruckt (m820_3-F-1).`,
  });
  return [
    count(1, 'y'), count(2, 'p'), count(3, 'n'), count(4, 'na'),
    { ...base, equation_number: `${w.ws}-D5`, output_symbol: o.rated, output_unit: null, formula: `${o.rated} = count_rows(${reg}${w.split ? `, ${rangeCond(w)}` : ''})`, input_symbols: [reg],
      description: `Plan 3: Anzahl vollständig bewerteter Zeilen im Register ${reg}${scope} — Vollständigkeit = ${n} (die gedruckten Kriterien Nr. ${w.from}–${w.to}); Umbindung der Vollständigkeitsgates REQ-15 … REQ-24 (y + p + n + na == total) STAGED (m820_3-G-3).` },
    share(6, 'y'), share(7, 'p'), share(8, 'n'), share(9, 'na'),
  ];
}

const A = QE_WORKSHEETS.filter((w) => w.annex === 'A');
const B = QE_WORKSHEETS.filter((w) => w.annex === 'B');
const sum = (symbols: string[]) => symbols.join(' + ');

export const EQUATIONS: EquationEntry[] = [
  ...QE_WORKSHEETS.flatMap(worksheetEquations),
  // ---- M8203-22: Anhang A aggregates + Projektstopp code A ----
  { standard: STD, worksheet: 'M8203-22', equation_number: 'M8203-22-D1', output_symbol: 'gesamt_anhang_a_items_total_calc', output_unit: null,
    formula: `gesamt_anhang_a_items_total_calc = ${sum(A.map((w) => `${w.prefix}_items_total`))}`, input_symbols: A.map((w) => `${w.prefix}_items_total`),
    clause_reference: 'Anhang A.1–A.4', description: 'Plan 3: Σ der vererbten Katalogsummen qe52/53/54/55_items_total (gedruckt 15 + 8 + 12 + 3 = 38 — die Seed-Tabellen QE_A1 … QE_A4); das manuelle gesamt_anhang_a_items_total (VR ==38) bleibt, Ablösung STAGED (m820_3-D-2).',
    verification_quote: `${norm(QE_CATALOGUES[0].heading)} — ${norm(QE_CATALOGUES[3].heading)}` },
  { standard: STD, worksheet: 'M8203-22', equation_number: 'M8203-22-D2', output_symbol: 'gesamt_anhang_a_items_rated', output_unit: null,
    formula: `gesamt_anhang_a_items_rated = ${sum(A.map((w) => outputSymbols(w).rated))}`, input_symbols: A.map((w) => outputSymbols(w).rated),
    clause_reference: 'Anhang A.1–A.4', description: 'Plan 3: Σ der bewerteten Kriterien über die vier Anhang-A-Register (qe52/53/54/55_items_rated); unentscheidbar, bis die vier Ausgaben auf M8203-22 vererbt sind (m820_3-C-5).',
    verification_quote: CATALOGUE_CUE },
  { standard: STD, worksheet: 'M8203-22', equation_number: 'M8203-22-D3', output_symbol: 'projektstopp_code_a', output_unit: null,
    formula: projektstoppFormula('projektstopp_code_a', PZ_SYMBOLS_A), input_symbols: [...PZ_SYMBOLS_A],
    clause_reference: '§3; §5.2–5.4', description: 'Plan 3: 1, wenn eines der 13 Phasenziele §5.2 / §5.3 / §5.4 (alle auf M8203-22 vererbt) den Status nicht_erreicht („nicht … erreicht“) oder teilweise_erreicht („nur unvollständig erreicht“, L307) hat, sonst 0 (m820_3-J-2 trägt die engere Nur-nicht-Lesart als Alternative); REQ-31 (M8203-22, leere Bedingung) darauf STAGED (m820_3-G-4).',
    verification_quote: norm(Q_L307) },
  // ---- M8203-23: Anhang B aggregates + Projektstopp code B ----
  { standard: STD, worksheet: 'M8203-23', equation_number: 'M8203-23-D1', output_symbol: 'gesamt_anhang_b_items_total_calc', output_unit: null,
    formula: `gesamt_anhang_b_items_total_calc = ${sum(B.map((w) => `${w.prefix}_items_total`))}`, input_symbols: B.map((w) => `${w.prefix}_items_total`),
    clause_reference: 'Anhang B.1–B.6', description: 'Plan 3: Σ der vererbten Katalogsummen qe62/63a/63b/64a/64b/65/66/67_items_total (gedruckt 15 + 40 + 50 + 34 + 10 + 6 = 155 — die Seed-Tabellen QE_B1 … QE_B6); das manuelle gesamt_anhang_b_items_total (VR ==155) bleibt, Ablösung STAGED (m820_3-D-2).',
    verification_quote: `${norm(QE_CATALOGUES[4].heading)} — ${norm(QE_CATALOGUES[9].heading)}` },
  { standard: STD, worksheet: 'M8203-23', equation_number: 'M8203-23-D2', output_symbol: 'gesamt_anhang_b_items_rated', output_unit: null,
    formula: `gesamt_anhang_b_items_rated = ${sum(B.map((w) => outputSymbols(w).rated))}`, input_symbols: B.map((w) => outputSymbols(w).rated),
    clause_reference: 'Anhang B.1–B.6', description: 'Plan 3: Σ der bewerteten Kriterien über die acht Anhang-B-Register; unentscheidbar, bis die acht Ausgaben auf M8203-23 vererbt sind (m820_3-C-5).',
    verification_quote: CATALOGUE_CUE },
  { standard: STD, worksheet: 'M8203-23', equation_number: 'M8203-23-D3', output_symbol: 'projektstopp_code_b', output_unit: null,
    formula: projektstoppFormula('projektstopp_code_b', PZ_SYMBOLS_B), input_symbols: [...PZ_SYMBOLS_B],
    clause_reference: '§3; §6.2–6.7', description: 'Plan 3: 1, wenn eines der 54 Phasenziele §6.2 … §6.7 (alle auf M8203-23 vererbt) den Status nicht_erreicht oder teilweise_erreicht („nicht oder nur unvollständig erreicht“, L307) hat, sonst 0 (m820_3-J-2); REQ-31 darauf STAGED (m820_3-G-4).',
    verification_quote: norm(Q_L307) },
  // ---- M8203-24: overall Projektstopp code ----
  { standard: STD, worksheet: 'M8203-24', equation_number: 'M8203-24-D1', output_symbol: 'projektstopp_code', output_unit: null,
    formula: projektstoppFormula('projektstopp_code', PZ_SYMBOLS), input_symbols: [...PZ_SYMBOLS],
    clause_reference: '§3', description: 'Plan 3: 1, wenn irgendeines der 67 Phasenziele (Anhang A oder B, alle auf M8203-24 vererbt) den Status nicht_erreicht oder teilweise_erreicht („nicht oder nur unvollständig erreicht“, L307) hat, sonst 0; jedes Phasenziel muss gesetzt sein (nicht zutreffende Phasen: nicht_zutreffend) — sonst manual_required; die Booleans projektstopp_review_triggered / projektstopp_required bleiben Eingaben (m820_3-G-4).',
    verification_quote: norm(Q_L307) },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
