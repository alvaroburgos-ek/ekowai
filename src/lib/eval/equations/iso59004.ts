/**
 * ISO-59004 — Plan 3 Task 29 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts iso59004` (NEW equation rows only;
 * `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span of the IN-SESSION `pdftotext -layout`
 * extraction of the standard's own FDIS PDF (`regulation-tables-quotes-iso59004.ts`, PDF page in the
 * span's doc comment) — grade VA under SR-3, from a FINAL DRAFT (iso59004-J-1).
 *
 * Single-source: prod carries ZERO equations for this standard (read-only capture 2026-09-24), so no row
 * here replaces or duplicates anything. Every row is a count over a register of its OWN worksheet and
 * therefore materialises on save (register-scoped materialiser); none is scalar-only. No figure is typed
 * into any formula.
 *
 * ENGINE FACTS PINNED IN THIS SESSION (raw output in the task report):
 *   - `count_rows(reg, col != '')` PARSES but does NOT evaluate — it returns
 *     `manual_required: Fehlende Eingabe für count_rows(): <col>`. The decidable alternative is
 *     `col IS NOT NULL`, which the engine already treats an EMPTY STRING as absent for (probe: two rows,
 *     one with '2030: 50 %' and one with '', ⇒ 1). `goals_with_targets` therefore uses `IS NOT NULL`
 *     (iso59004-J-5), not the brief's `!= ''`.
 *   - `count_rows(reg, col == 'a' OR col == 'b')` and `count_rows(reg, col IN {'a','b'})` both compute;
 *     the quoted `IN` form is used (a quoted literal never resolves as a symbol).
 *   - `count_rows(reg, boolcol == true)` computes (row-scoped booleans reach the aggregate).
 *   - an EMPTY register gives `count_rows` = 0 for every one of these — never a phantom pass.
 *
 * NOT emitted (STAGED in scripts/verification/iso59004-STAGED-plan3-rulings.sql):
 *   - `ISO-59004-04-D1` `all_principles_considered_code` — `contains()` over a json `select_many`
 *     carrier has NO engine path (no production `evaluateFormula` caller passes `carriers`); probed in
 *     this session, the exact formula returns `manual_required: Unbekanntes Symbol "principles" im
 *     Ausdruck.` The intended formula is kept verbatim as `WITHHELD_04_D1_FORMULA` in
 *     `field-configs/iso59004.ts` so a ratified engine change emits it mechanically (iso59004-F-1).
 *   - any equation over the `principles` / `circularity_aspects` checklists, for the same reason.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-quotes-iso59004';
import { collapseNoWatermark } from '../regulation-tables-seed-iso59004';

const STD = 'ISO-59004';
/**
 * Collapse a quote span for PROSE, dropping whole watermark-ONLY lines (iso59004-U-2). The RAW span in
 * `regulation-tables-quotes-iso59004.ts` is never rewritten; this only keeps a stored
 * `verification_quote` from reading "… need to be satisfied oj and if the need …".
 */
const norm = collapseNoWatermark;

type Spec = { n: string; out: string; rhs: string; reg: string; clause: string; what: string; quote: string };
const rows = (ws: string, specs: Spec[]): EquationEntry[] =>
  specs.map((s) => ({
    standard: STD, worksheet: ws, equation_number: `${ws}-${s.n}`,
    formula: `${s.out} = ${s.rhs}`, input_symbols: [s.reg], output_symbol: s.out, output_unit: null,
    clause_reference: s.clause, description: `Plan 3: ${s.what}`, verification_quote: s.quote,
  }));

export const EQUATIONS: EquationEntry[] = [
  // ---- ISO-59004-05: the §6.7 actions register ----
  ...rows('ISO-59004-05', [
    { n: 'D1', out: 'actions_count', rhs: 'count_rows(actions)', reg: 'actions', clause: '§6.7',
      what: 'count_rows ueber actions — Anzahl der erfassten Massnahmen der Kreislaufwirtschaft.', quote: norm(Q.L2541_2551) },
    { n: 'D2', out: 'refuse_rethink_first', rhs: "count_rows(actions, action IN {'refuse', 'rethink'})", reg: 'actions', clause: '§6.1',
      what: 'Zeilen mit action refuse oder rethink („Organizations should consider refuse and rethink as preliminary actions.“); Zwilling des Hand-Booleans preliminary_action_refuse_rethink (CR-018) — die Gate-Umstellung ist STAGED (iso59004-G-2).', quote: norm(Q.L1780) },
    { n: 'D3', out: 'pilot_actions_count', rhs: 'count_rows(actions, pilot == true)', reg: 'actions', clause: '§7.4.7',
      what: 'Zeilen mit pilot == true („a preliminary pilot application of a specific circular economy practice … before wider implementation“); Zwilling des Booleans pilot_project auf -06 (iso59004-D-4).', quote: norm(Q.L3110_3117) },
  ]),

  // ---- ISO-59004-06: the §7.3.2 goals register and the §7.6 indicator register ----
  ...rows('ISO-59004-06', [
    { n: 'D1', out: 'goals_count', rhs: 'count_rows(goals)', reg: 'goals', clause: '§7.3.2',
      what: 'count_rows ueber goals — Anzahl der erfassten Ziele der Kreislaufwirtschaft.', quote: norm(Q.L2937_2940) },
    { n: 'D2', out: 'goals_with_targets', rhs: 'count_rows(goals, intermediate_target IS NOT NULL)', reg: 'goals', clause: '§7.3.2',
      what: 'Ziele mit hinterlegtem Zwischenziel („Intermediate targets should be established to allow for circularity assessments of progress from the reference situation towards the longer-term goals.“). IS NOT NULL statt des vom Briefing genannten != \'\': der Vergleich gegen das leere Literal liefert am Motor manual_required, waehrend IS NOT NULL einen leeren Text bereits als nicht gesetzt zaehlt (iso59004-J-5).', quote: norm(Q.L2937_2940) },
    { n: 'D3', out: 'indicators_59004_count', rhs: 'count_rows(indicators_59004)', reg: 'indicators_59004', clause: '§7.6',
      what: 'count_rows ueber indicators_59004 — Anzahl der gewaehlten Zirkularitaetsindikatoren („the organization should choose circularity indicators to assess the effectiveness and efficiency of the interventions adopted and monitor the progress“).', quote: norm(Q.L3229_3234) },
  ]),
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
