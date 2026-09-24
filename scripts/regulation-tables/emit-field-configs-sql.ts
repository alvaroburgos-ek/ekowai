/**
 * Plan 3 Task 0 — the field-config emitter: the Plan-2b widget emitter
 * (`emit-widget-configs-sql.ts`, whose `q`/`j`/`JOIN`/`sqlComment`/
 * `gatedHeaderLines` primitives and per-entry UPDATE scoping it reuses)
 * generalised to the DATA a Plan-3 standard task writes:
 *
 *   - one `UPDATE fields` per entry, scoped standard + worksheet + symbol
 *     (+ `f.active`, matching the capture filter), ALWAYS writing `widget`,
 *     `ui_config`, `lookup`, `visible_when`;
 *   - `enum_values` written only into a captured NULL prior (owner ruling D-1
 *     — a non-null prod list is never overwritten; the entry says
 *     `'keep_prod'` and files a sign-off entry when the printed list differs);
 *   - a `visible_when` on a symbol that another worksheet consumes
 *     (`consumer_worksheets` non-empty in the prior snapshot) is REFUSED
 *     (importer rule, Plan 2a Task 10 — hiding a producer would hide the
 *     value its consumers inherit); since Task 3 fix round 1 the guard is
 *     TRANSITIVE: a symbol that is an `input_symbols` member of a
 *     same-worksheet equation whose output — directly, or through further
 *     same-worksheet equations — is a consumed field is refused too (a hidden
 *     input nulls the equation, and the consumers inherit the null); the
 *     chain is walked over the captured `prior.equations` (plus the Plan-2a
 *     `rewriteRules[id].remap` inputs) and named in the message; a legacy
 *     prior without `equations` degrades to the direct rule (the CLI warns);
 *     the owner worksheet's own code is REMOVED from a field's
 *     `consumer_worksheets` before any of this is decided (Task 12b ruling)
 *     — the runtime never inherits a field from its own owner worksheet
 *     (`loadInheritedFields` in `src/lib/db/queries/worksheet.ts` filters
 *     `worksheetTemplateId <> currentTemplateId`), so a self-only entry is a
 *     runtime no-op and must not count as a consumer; the CLI prints a
 *     NOTICE for every symbol whose captured `consumer_worksheets` held such
 *     a self-entry (a prod data oddity worth recording even though it
 *     changes nothing here);
 *     the same refusal applies to a SECTION
 *     `visible_when` whose section — or any descendant section, coded or
 *     not, since the runtime hides descendants of a hidden section — contains
 *     such a producer (walked via the captured `section_path`);
 *   - GATE-AWARE (Task 12c): a field / section `visible_when` is REFUSED when a hidden
 *     symbol is read by a SAME-worksheet `compliance_requirements.condition` (the
 *     captured `prior.gates[…].symbols`, extracted at capture time with the engine's own
 *     `extractConditionSymbols`) — a hidden symbol is `null` for the engine (`withHidden`)
 *     and the gate silently stops enforcing (`hiddenReferences` ⇒ `not_applicable`), an
 *     enforcement change that must be a sign-off (G-block), never an emitted default;
 *     a gate whose condition the engine cannot parse (`parse_error`) is refused
 *     CONSERVATIVELY for every hidden symbol of its worksheet (its symbols are unknown)
 *     — except an EMPTY condition, which is `manual` whatever is hidden (round 2);
 *     the ONE exemption is a gate of the form `IF <driver> <op> <value> THEN …` whose
 *     guard is exactly the rule's `visible_when` (`<driver> <op> <value>` — same driver
 *     symbol, same op, same literal; a bare `tok` equals a quoted `'tok'` only when no
 *     field `tok` exists on the worksheet, round 2; `guardExempts`): the gate never
 *     fires while the field is hidden anyway; anything else refuses. `create` entries run
 *     the same check (round 3: a created field CAN be read by an existing gate through a
 *     bare-ident RHS, and counts as resolvable for the bare-literal rule; a section rule
 *     also covers the batch's creates landing in its tree). Round 3: "reads" is decided by
 *     the runtime's own `hiddenReferences` on top of the captured `symbols` — the superset
 *     that counts a bare-ident `==` / `!=` RHS naming the hidden symbol. Round 4: a gate
 *     also reads `symbol` when `symbol` REACHES, through same-worksheet equations
 *     (`equationReach` — the producer walk's BFS, remaps honoured, cycle-guarded), an
 *     output the gate reads (a hidden input nulls the equation, the gate goes N.A.); the
 *     message names the chain (`hides x → Gl.1 Y_G read by gate CR-12 (…)`).
 *   - amendment N (round 4): `select_many` on an EXISTING field whose captured `data_type`
 *     is not `json` is REFUSED — the checklist editor stores `{type:'json'}`, the enum
 *     reader expects `value_enum`; the data_type switch is a STAGED S-block.
 *     A legacy prior without `gates` degrades to the producer-only guard (the CLI warns);
 *     `gate_guard: 'warn'` (CLI `--gate-guard=warn`, the Task 12c re-audit + the freshness
 *     pins of standards whose modules still carry refused rules) turns each refusal into a
 *     `GATE-REFUSAL` warning line instead — the SQL is identical either way;
 *   - `UPDATE worksheet_sections` per section entry, keyed by worksheet code +
 *     section code, refused when the key is absent from the captured
 *     `prior.sections` (its UPDATE would touch 0 rows); a section whose prod
 *     `code IS NULL` cannot be keyed — the task records it in its STAGED file;
 *   - `create` entries INSERT additively (`WHERE NOT EXISTS`), never touching
 *     an existing row; `create.section_code` must exist in `prior.sections`
 *     when that map was captured (else the row would land unsectioned); the
 *     `Plan 3:` description prefix is the rollback selector so the rollback
 *     deletes only what this migration created;
 *   - the rollback restores every touched field's four columns (and
 *     `enum_values` when written) to the captured prior, byte-for-byte; a
 *     row/section with no captured prior is restored to NULL with an explicit
 *     comment line saying so.
 *
 * Every entry is validated before a single statement is emitted: the prior
 * snapshot itself (`assertPriorSnapshot` — JSON columns must be object/array/
 * null, never a stringified or truncated cell), zod (`parseFieldConfig`),
 * condition/expr parse of `visible_when` and of every register column's
 * `expr` / `visible_when`, the D-1 and consumed-producer guards, the
 * `lookup_fill` data_type rule (amendment C), select widgets without options,
 * duplicate entries.
 *
 * The prior snapshot (`src/lib/eval/field-configs/<slug>.prior.json`) is a
 * READ-ONLY capture of prod written in-session by
 * `node scripts/regulation-tables/build-prior-snapshot.mjs <CODE> <slug>`
 * (full JSON rows, no truncation — `prod-query.mjs` truncates cells to 120
 * chars and is for audits only). When prod is unreachable the executor
 * derives it from the harness seed and passes `--provenance` so the
 * migration header says so and the owner re-captures before applying.
 * WRITTEN, NOT APPLIED.
 */
import { readFileSync, existsSync } from 'node:fs';
import { parseFieldConfig, type RegisterUiConfig } from '../../src/lib/eval/field-config';
import { parseCondition, parseNumeric, quotedComparisonLiterals, hiddenReferences, type Expr } from '../../src/lib/expr';
import type { FieldConfigEntry, SectionVisibilityEntry, PriorFieldRow, PriorFieldKey, PriorSectionRow, PriorEquationRow, PriorGateRow, PriorSnapshot } from '../../src/lib/eval/field-configs/types';
import { FIELD_CONFIG_MODULES } from '../../src/lib/eval/field-configs';
import { rewriteRules } from '../../src/lib/eval/rewrites';
import { normalizeSymbol } from '../../src/lib/eval/normalize-formula';
import { q, j, JOIN, SCHEMA_MIGRATION, gatedHeaderLines, writeSql } from './emit-widget-configs-sql';

/** The prior-snapshot types live in src/lib/eval/field-configs/types.ts (re-exported for the tests and the CLI). */
export type { PriorFieldRow, PriorFieldKey, PriorSectionRow, PriorEquationRow, PriorGateRow, PriorSnapshot };

/** File-level header options (the Plan-2b `gated` / `gated_note` / `provenance` pattern, one file per slug). */
export type FieldConfigHeader = {
  /** Extra provenance comment PREPENDED above the generated-by line (e.g. the PRIOR-FROM-HARNESS-SEED marker). */
  provenance?: string;
  /** Sign-off id that must be RATIFIED before this migration may be applied. */
  gated?: string;
  /** Free-text rationale emitted as SQL comment lines after the GATED line. */
  gated_note?: string;
  /**
   * Task 12c gate-aware guard mode (default `'refuse'`). `'warn'` (CLI `--gate-guard=warn`) turns every gate
   * refusal into a `GATE-REFUSAL` line in `warnings` — used ONLY for the re-audit run and for the freshness pins
   * of standards whose modules still carry refused rules (each pin asserts its exact refusal count); the SQL is
   * byte-identical in both modes.
   */
  gate_guard?: 'refuse' | 'warn';
};

export const SIGN_OFF_DOC_PLAN_3 = 'docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md';
const LOOKUP_FILL_DATA_TYPES: ReadonlySet<string> = new Set(['number', 'text', 'enum']);
const JSON_COLUMNS = ['enum_values', 'ui_config', 'lookup'] as const;
const RESERVED_KEYS: ReadonlySet<string> = new Set(['sections', 'equations', 'gates', '_meta']);

/**
 * The read-only prod capture (full-schema form) that `build-prior-snapshot.mjs`
 * runs to build `<slug>.prior.json`; `<CODE>` = standards.code. Documented here
 * so the emitter's contract and the capture stay reviewable side by side — the
 * script additionally nulls the Plan-1 columns when they do not exist yet.
 */
export const PRIOR_SQL = {
  fields: "select w.code as worksheet, f.symbol, f.enum_values, f.widget, f.ui_config, f.lookup, f.visible_when, f.consumer_worksheets, f.data_type, f.section_id, ws.code as section_code from fields f join worksheet_templates w on w.id=f.worksheet_template_id join standards s on s.id=w.standard_id left join worksheet_sections ws on ws.id=f.section_id where s.code='<CODE>' and f.active",
  // EVERY section, null-coded ones included: the fold derives each field's ancestor chain (section_path) from id/parent_section_id
  // and keys the `sections` map by the coded ones only.
  sections: "select w.code as worksheet, ws.id, ws.parent_section_id, ws.code as section_code, p.code as parent_code, ws.visible_when from worksheet_sections ws join worksheet_templates w on w.id=ws.worksheet_template_id join standards s on s.id=w.standard_id left join worksheet_sections p on p.id=ws.parent_section_id where s.code='<CODE>'",
  // Every equation of the standard (Task 3 fix round 1): the producer guard walks input_symbols → output_symbol chains per worksheet.
  equations: "select w.code as worksheet, e.id, e.equation_number, e.output_symbol, e.input_symbols from equations e join worksheet_templates w on w.id=e.worksheet_template_id join standards s on s.id=w.standard_id where s.code='<CODE>'",
  // Every gate of the standard (Task 12c; compliance_requirements has no active flag): the capture adds `symbols` per row via the engine's extractConditionSymbols.
  gates: "select w.code as worksheet, cr.code as req_code, cr.condition, cr.severity from compliance_requirements cr join worksheet_templates w on w.id=cr.worksheet_template_id join standards s on s.id=w.standard_id where s.code='<CODE>'",
};

/** Every captured field row (skips `sections` / `_meta`). */
export function priorFieldRows(prior: PriorSnapshot): Array<[PriorFieldKey, PriorFieldRow]> {
  return (Object.entries(prior) as Array<[string, unknown]>)
    .filter(([k]) => !RESERVED_KEYS.has(k))
    .map(([k, v]) => [k as PriorFieldKey, v as PriorFieldRow]);
}

const isJsonValue = (v: unknown) => v == null || typeof v === 'object';

/**
 * Refuses a prior snapshot whose JSON columns are not object/array/null — a
 * stringified or truncated cell (the `prod-query.mjs` console.table shape)
 * would otherwise be written back by the rollback as a JSON *string*.
 */
export function assertPriorSnapshot(prior: PriorSnapshot): void {
  for (const [key, row] of priorFieldRows(prior)) {
    if (!key.includes(' ')) throw new Error(`prior "${key}": field keys are "<worksheet> <symbol>"`);
    if (row == null || typeof row !== 'object' || Array.isArray(row)) throw new Error(`prior "${key}": row must be an object`);
    for (const col of JSON_COLUMNS) {
      if (!isJsonValue(row[col])) throw new Error(`prior "${key}".${col} must be an object/array/null, got ${typeof row[col]} — re-capture with build-prior-snapshot.mjs (prod-query.mjs truncates cells)`);
    }
    if (row.widget != null && typeof row.widget !== 'string') throw new Error(`prior "${key}".widget must be a string/null`);
    if (row.visible_when != null && typeof row.visible_when !== 'string') throw new Error(`prior "${key}".visible_when must be a string/null`);
    if (row.consumer_worksheets != null && !Array.isArray(row.consumer_worksheets)) throw new Error(`prior "${key}".consumer_worksheets must be an array/null`);
    if (row.section_path != null && !Array.isArray(row.section_path)) throw new Error(`prior "${key}".section_path must be an array`);
  }
  for (const [key, row] of Object.entries(prior.sections ?? {})) {
    if (row == null || typeof row !== 'object') throw new Error(`prior.sections "${key}": row must be an object`);
    if (row.visible_when != null && typeof row.visible_when !== 'string') throw new Error(`prior.sections "${key}".visible_when must be a string/null`);
  }
  for (const [key, row] of Object.entries(prior.equations ?? {})) {
    if (!key.includes(' ')) throw new Error(`prior.equations "${key}": keys are "<worksheet> <equation_number>"`);
    if (row == null || typeof row !== 'object' || Array.isArray(row)) throw new Error(`prior.equations "${key}": row must be an object`);
    if (typeof row.output_symbol !== 'string' || !row.output_symbol) throw new Error(`prior.equations "${key}".output_symbol must be a non-empty string`);
    if (!Array.isArray(row.input_symbols) || row.input_symbols.some((x) => typeof x !== 'string')) throw new Error(`prior.equations "${key}".input_symbols must be a string array`);
    if (row.id != null && typeof row.id !== 'string') throw new Error(`prior.equations "${key}".id must be a string/null`);
  }
  for (const [key, row] of Object.entries(prior.gates ?? {})) {
    if (!key.includes(' ')) throw new Error(`prior.gates "${key}": keys are "<worksheet> <req_code>"`);
    if (row == null || typeof row !== 'object' || Array.isArray(row)) throw new Error(`prior.gates "${key}": row must be an object`);
    if (typeof row.condition !== 'string') throw new Error(`prior.gates "${key}".condition must be a string`);
    if (row.severity != null && typeof row.severity !== 'string') throw new Error(`prior.gates "${key}".severity must be a string/null`);
    if (!Array.isArray(row.symbols) || row.symbols.some((x) => typeof x !== 'string')) throw new Error(`prior.gates "${key}".symbols must be a string array`);
    if (row.parse_error != null && row.parse_error !== true) throw new Error(`prior.gates "${key}".parse_error must be true or absent`);
    if (row.parse_error && row.symbols.length) throw new Error(`prior.gates "${key}": a parse_error row carries no symbols`);
  }
}

/** Legacy-prior degradations the CLI prints to stderr (never part of `warnings` — the SQL and the lint are unaffected). */
export function priorSnapshotWarnings(slug: string, prior: PriorSnapshot): string[] {
  const out: string[] = [];
  if (!prior.equations) out.push(`warning: ${slug}.prior.json carries no "equations" map — the producer guard is direct-only; re-capture with build-prior-snapshot.mjs for the transitive check`);
  if (!prior.gates) out.push(`warning: ${slug}.prior.json carries no "gates" map — the gate-aware guard (Task 12c) is OFF, a visible_when may silently stop a same-worksheet gate enforcing; re-capture with build-prior-snapshot.mjs`);
  return out;
}

/**
 * Task 12c — the ONE exemption of the gate-aware guard, checked conservatively: the gate condition is
 * `IF <driver> <op> <value> THEN …` (a top-level `guard` node whose guard is a plain `compare`) and the rule's
 * `visible_when` is exactly `<driver> <op> <value>` — same driver symbol, same comparison op, same literal. Then
 * the field is hidden exactly when the guard is false, i.e. when the gate would not fire anyway — hiding turns a
 * `pass` into `not_applicable`, never a `fail` into a non-fail. Anything else (a compound guard, an `exists` /
 * `IN` guard, a different driver, op or literal, an unparseable side) refuses.
 *
 * Literal quotedness (round 2 ruling): a BARE identifier `tok` in one literal position and the QUOTED `'tok'` in
 * the other are the same literal WHEN no field with symbol `tok` exists on the worksheet (`hasField`) — by the
 * Task 13b rule the bare identifier then compares as the token string at runtime, exactly like the quoted one.
 * When such a field exists the bare identifier resolves to it and the two are NOT the same literal ⇒ refuse.
 * `hasField` defaults to "exists" (the conservative answer) so a caller without a prior cannot widen the exemption.
 */
export function guardExempts(condition: string, visibleWhen: string, hasField: (symbol: string) => boolean = () => true): boolean {
  const gate = parseCondition(condition);
  const rule = parseCondition(visibleWhen);
  if (!gate || !rule || gate.kind !== 'guard' || gate.guard.kind !== 'compare' || rule.kind !== 'compare') return false;
  const g = gate.guard;
  if (g.symbol !== rule.symbol || g.op !== rule.op || g.rhs.value !== rule.rhs.value) return false;
  if (!!g.rhs.quoted === !!rule.rhs.quoted) return true;
  // one side bare, the other quoted: the same literal only if the bare token cannot resolve to a field of this worksheet
  return typeof g.rhs.value === 'string' && !hasField(g.rhs.value);
}

/** Round 2 ruling: an EMPTY (or whitespace) condition is `manual` at the engine whatever is hidden — captured, never a refusal. */
const isEmptyCondition = (gate: PriorGateRow): boolean => gate.condition.trim() === '';

/** One gate the guard names in a refusal. */
export type GateReader = {
  code: string; gate: PriorGateRow; reason: 'reads' | 'parse_error';
  /** Round 4: when the gate reads an OUTPUT the hidden symbol reaches through same-worksheet equations — `x → Gl.1 Y_G` (absent for a direct read). */
  chain?: string;
};

/**
 * Round 3: does a symbol named `tok` resolve on `worksheet` at runtime? True when the captured prior holds
 * `<worksheet> <tok>`, when this batch CREATES it (`createdKeys`), or when another worksheet's field `tok` is
 * inherited here (`consumer_worksheets` includes `worksheet` — `loadInheritedFields`). Decides the bare ↔ quoted
 * literal equivalence of `guardExempts`: a bare `tok` that resolves is NOT the same literal as `'tok'`.
 */
function symbolResolvesOn(prior: PriorSnapshot, worksheet: string, tok: string, createdKeys: ReadonlySet<string>): boolean {
  const key = `${worksheet} ${tok}`;
  if (key in prior || createdKeys.has(key)) return true;
  const suffix = ` ${tok}`;
  return priorFieldRows(prior).some(([k, r]) => k.endsWith(suffix) && k !== key && (r.consumer_worksheets?.includes(worksheet) ?? false));
}

/**
 * The same-worksheet gates that read `symbol` — the captured `prior.gates[…].symbols` (matched through
 * `normalizeSymbol` like the producer walk) OR, round 3, the runtime's own N.A. pre-check `hiddenReferences`
 * (`src/lib/expr/evaluate.ts`) applied to the gate's condition with `symbol` hidden: a superset of
 * `extractSymbols` that also counts a bare-ident `==` / `!=` RHS naming the hidden symbol (`status == neu` with
 * a field `neu` hidden ⇒ N.A. at runtime) — or whose condition the engine could not parse (`parse_error`:
 * symbols unknown ⇒ counted conservatively; an EMPTY condition is exempt — round 2) — minus the ones
 * `guardExempts` for this `visibleWhen` (bare ↔ quoted literal equivalence decided by `symbolResolvesOn`:
 * captured fields + this batch's creates + inherited fields). Empty when the prior carries no `gates` map
 * (legacy prior — the CLI warns).
 */
export function gateReaders(prior: PriorSnapshot, worksheet: string, symbol: string, visibleWhen: string, createdKeys: ReadonlySet<string> = new Set()): GateReader[] {
  if (!prior.gates) return [];
  const prefix = `${worksheet} `;
  const sym = normalizeSymbol(symbol);
  const hasField = (tok: string): boolean => symbolResolvesOn(prior, worksheet, tok, createdKeys);
  // Round 4: every output the hidden symbol reaches through same-worksheet equations is nulled with it (a hidden
  // input nulls the equation) — a gate reading such an output stops enforcing exactly like a direct read.
  const reach = equationReach(prior, worksheet, symbol);
  const out: GateReader[] = [];
  for (const [key, gate] of Object.entries(prior.gates)) {
    if (!key.startsWith(prefix)) continue;
    if (gate.parse_error && isEmptyCondition(gate)) continue; // round 2: empty ⇒ `manual`, hiding changes nothing
    const ast = gate.parse_error ? null : parseCondition(gate.condition);
    const readsName = (name: string, norm: string): boolean =>
      gate.symbols.some((s) => normalizeSymbol(s) === norm) || (ast != null && hiddenReferences(ast, new Set([name])).length > 0);
    let reason: GateReader['reason'] | null = null;
    let chain: string | undefined;
    if (gate.parse_error) reason = 'parse_error';
    else if (readsName(symbol, sym)) reason = 'reads';
    else {
      const hop = reach.find((h) => readsName(h.output, h.out));
      if (hop) { reason = 'reads'; chain = hop.chain; }
    }
    if (!reason) continue;
    if (reason === 'reads' && guardExempts(gate.condition, visibleWhen, hasField)) continue;
    out.push({ code: key.slice(prefix.length), gate, reason, ...(chain ? { chain } : {}) });
  }
  return out;
}

/** `hides <symbol | chain> read by gate <code> (<severity>: "<condition>")[, …]` — one segment per distinct chain (round 4), `; `-joined. */
const gateRefusalText = (symbol: string, readers: GateReader[]): string => {
  const groups = new Map<string, GateReader[]>();
  for (const r of readers) {
    const what = r.chain ?? symbol;
    if (!groups.has(what)) groups.set(what, []);
    groups.get(what)!.push(r);
  }
  return [...groups.entries()]
    .map(([what, rs]) => `hides ${what} read by gate ${rs.map((r) => `${r.code} (${r.gate.severity}: ${JSON.stringify(r.gate.condition)}${r.reason === 'parse_error' ? ' — parse_error, symbols unknown' : ''})`).join(', ')}`)
    .join('; ');
};

/** Refusal text of the gate-aware guard for one hidden symbol (null = accepted). */
function fieldGateRefusal(prior: PriorSnapshot, worksheet: string, symbol: string, visibleWhen: string, createdKeys: ReadonlySet<string>): string | null {
  const readers = gateReaders(prior, worksheet, symbol, visibleWhen, createdKeys);
  return readers.length ? gateRefusalText(symbol, readers) : null;
}

/**
 * Round 3: is the captured section `sectionCode` the hidden section `hiddenCode` or one of its descendants?
 * Walked over `prior.sections[…].parent_code` (a cycle in bad data stops the walk). Used for same-batch `create`
 * entries, whose rows are not in the prior's `section_path` yet.
 */
function sectionInTree(prior: PriorSnapshot, worksheet: string, sectionCode: string, hiddenCode: string): boolean {
  const seen = new Set<string>();
  for (let code: string | null | undefined = sectionCode; code != null && !seen.has(code); code = prior.sections?.[`${worksheet} ${code}`]?.parent_code) {
    if (code === hiddenCode) return true;
    seen.add(code);
  }
  return false;
}

/**
 * Does hiding `symbol` on `worksheet` hide a value another worksheet inherits — directly (the symbol is a
 * consumed field) or TRANSITIVELY (it feeds a same-worksheet equation whose output, possibly through further
 * same-worksheet equations, is a consumed field)? Returns the chain to name in the refusal, or null. Walked
 * over the captured `prior.equations` (stored `input_symbols` + the Plan-2a `rewriteRules[id].remap`
 * inputs); a prior without `equations` yields the direct answer only. Symbols are matched through the same
 * `normalizeSymbol` as `formula.ts` (`r_D(n)` ↔ `r_D_n`), so a function-like spelling cannot slip past.
 * `opts.skipDirect`: a CREATED field has no consumers of its own but may complete a dangling
 * `input_symbols` reference of a consumed equation — the chain walk still runs for it.
 *
 * Task 12b ruling: the owner worksheet's own code is stripped out of `consumer_worksheets`
 * before this function decides anything — the runtime (`loadInheritedFields`) never inherits a
 * field from its own owner worksheet, so a self-only entry is a no-op at runtime and is not a
 * producer. A chain whose only captured consumer is the owner worksheet itself is therefore NOT
 * refused; a chain consumed by the owner AND another worksheet is still refused, naming only the
 * other worksheet(s).
 */
export function producerChain(prior: PriorSnapshot, worksheet: string, symbol: string, opts: { skipDirect?: boolean } = {}): string | null {
  const consumers = (sym: string): string[] | null => {
    const row = prior[`${worksheet} ${sym}` as PriorFieldKey];
    const others = row?.consumer_worksheets?.filter((w) => w !== worksheet) ?? [];
    return others.length ? others : null;
  };
  if (!opts.skipDirect) {
    const direct = consumers(symbol);
    if (direct) return `${symbol} (consumed by ${direct.join(', ')})`;
  }
  // BFS from the hidden symbol through same-worksheet equations; the first consumed output names the chain.
  for (const hop of equationReach(prior, worksheet, symbol)) {
    const c = consumers(hop.output) ?? consumers(hop.out);
    if (c) return `${hop.chain} (consumed by ${c.join(', ')})`;
  }
  return null;
}

/** One output the hidden symbol reaches: as stored (`output`), normalised (`out`), and the chain text `x → Gl.1 y → …`. */
export type EquationHop = { output: string; out: string; chain: string };

/**
 * Every output symbol that `symbol` reaches through SAME-worksheet equations, in BFS order (cycle-guarded), over
 * the captured `prior.equations` (stored `input_symbols` + the Plan-2a `rewriteRules[id].remap` inputs), symbols
 * matched through `normalizeSymbol`. Shared by the producer guard (`producerChain`) and, since round 4, the
 * gate-aware guard (`gateReaders`): a hidden input nulls every equation downstream of it. A prior without
 * `equations` reaches nothing.
 */
export function equationReach(prior: PriorSnapshot, worksheet: string, symbol: string): EquationHop[] {
  const prefix = `${worksheet} `;
  const eqs = Object.entries(prior.equations ?? {}).filter(([k]) => k.startsWith(prefix)).map(([k, e]) => {
    const remap = e.id ? Object.values(rewriteRules[e.id]?.remap ?? {}) : [];
    const n = k.slice(prefix.length);
    return { label: /^\d/.test(n) ? `Gl.${n}` : n, output: e.output_symbol, inputs: new Set([...e.input_symbols, ...remap].map(normalizeSymbol)) };
  });
  const start = normalizeSymbol(symbol);
  const queue: Array<{ sym: string; chain: string }> = [{ sym: start, chain: symbol }];
  const seen = new Set<string>([start]);
  const hops: EquationHop[] = [];
  while (queue.length) {
    const { sym, chain } = queue.shift()!;
    for (const e of eqs) {
      const out = normalizeSymbol(e.output);
      if (!e.inputs.has(sym) || seen.has(out)) continue;
      seen.add(out);
      const next = `${chain} → ${e.label} ${e.output}`;
      hops.push({ output: e.output, out, chain: next });
      queue.push({ sym: out, chain: next });
    }
  }
  return hops;
}

/**
 * Plan 3 final wave C (item 3): `guardVisibleWhen` appends `AND f.visible_when IS NULL`
 * — the guard every STAGED block's hide carries and the generated migrations did not
 * (`iso14046-I-2`, `atv_a704e-I-2`). It rides ONLY on statements that WRITE a rule: an
 * entry with no `visible_when` writes `visible_when = NULL` under the emitter's
 * always-written invariant, and guarding that would silently skip its widget/ui_config
 * write on any field that already carries a rule in prod. The ROLLBACK is never
 * guarded — it restores the captured prior unconditionally.
 */
const where = (e: { standard: string; worksheet: string; symbol: string }, guardVisibleWhen = false) =>
  `${JOIN} WHERE f.worksheet_template_id = w.id AND f.symbol = ${q(e.symbol)} AND w.code = ${q(e.worksheet)} AND s.code = ${q(e.standard)} AND f.active${guardVisibleWhen ? ' AND f.visible_when IS NULL' : ''}`;
const sectionWhere = (s: { standard: string; worksheet: string; section_code: string }, guardVisibleWhen = false) =>
  `${JOIN} WHERE ws.worksheet_template_id = w.id AND ws.code = ${q(s.section_code)} AND w.code = ${q(s.worksheet)} AND s.code = ${q(s.standard)}${guardVisibleWhen ? ' AND ws.visible_when IS NULL' : ''}`;
const jsonOrNull = (v: unknown) => (v == null ? 'NULL' : j(v));
const textOrNull = (v: string | null | undefined) => (v == null ? 'NULL' : q(v));
const NO_PRIOR_NOTE = (key: string) => `-- ${key}: no prior snapshot row captured — restore assumes prod had NULL in these columns; re-capture before applying the rollback.`;
/**
 * Plan 3 final wave C, fix round 1 (reviewer, IMPORTANT 2) — the asymmetry the guard created.
 *
 * The UP writes `visible_when` only into a NULL cell; the DOWN cannot be guarded the same way
 * (a rollback must restore the captured prior unconditionally). So once a human sets a rule
 * AFTER the migration was applied, re-applying the migration is a silent no-op while the
 * ROLLBACK still overwrites that rule with the captured prior. `NO_PRIOR_NOTE` never covered
 * this — it fires only when no prior row was captured at all — so 0 rollback statements in the
 * corpus carried any warning. Every restore whose UP is guarded now says it out loud.
 */
const GUARDED_RESTORE_NOTE = (key: string) => `-- ${key}: the UP writes visible_when under an IS NULL guard; this restore is unguarded — re-capture before applying the rollback (a rule set after the migration is overwritten here).`;

/**
 * Plan 3 final wave C (item 2) — register column keys the ROW SHAPE already owns.
 *
 * A register row travels as `{ id, <columnKey>: value, … }`: `register-rows.ts`
 * reads `rows.push({ id: str(r.id) ?? genId(), values, … })` and the register editor
 * writes `{ id: genId() }` on every added row. A column keyed `id` therefore reads the
 * row identity as its cell and is overwritten on the next save — found by Task 20,
 * which had to rename the column to `kennung` after the fact (Task 28 hit it too).
 * The convention is now a refusal.
 *
 * Audit of the rest of the row/carrier shape (`register-rows.ts`, this session):
 *   - `values` / `complete` are fields of `PreparedRow`, NOT keys of the raw row —
 *     every column key lands INSIDE `values`, so they cannot collide;
 *   - `rows` and the register's `flags[].key` live on the CARRIER object
 *     (`{ rows: [...], <flagKey>: bool }`), one level above a row;
 *   - `override.flag_key` IS written into a row's values (`values[overrideFlagKey] = differs`),
 *     but it is a DECLARED boolean column of the same register (surface_inventory's
 *     `coeff_override`), so it is a binding, not a collision.
 * `id` is therefore the only reserved word today; the map keeps the next one cheap.
 */
const RESERVED_REGISTER_COLUMN_KEYS: ReadonlyMap<string, string> = new Map([
  ['id', "`register-rows.ts` owns `id` as the ROW IDENTITY (the raw row's `id`), so the column would read the row id as its cell and be overwritten on save; rename it (Task 20 used `kennung`)"],
]);

/** `gate`: receives each Task 12c gate refusal (the caller throws or collects it per `gate_guard`). */
function validateEntry(e: FieldConfigEntry, p: PriorFieldRow | undefined, prior: PriorSnapshot, gate: (msg: string) => void, createdKeys: ReadonlySet<string>): void {
  const id = `${e.worksheet} ${e.symbol}`;
  const cfg = parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }); // throws FieldConfigError
  if (e.visible_when != null && parseCondition(e.visible_when) === null) throw new Error(`${id}: visible_when does not parse: ${e.visible_when}`);
  if (e.widget === 'register') {
    for (const c of (cfg.ui as RegisterUiConfig).columns) {
      const reserved = RESERVED_REGISTER_COLUMN_KEYS.get(c.key);
      if (reserved) throw new Error(`${id}.${c.key}: reserved register column key — ${reserved}`);
      if (c.expr && !parseNumeric(c.expr).ok) throw new Error(`${id}.${c.key}: expr does not parse: ${c.expr}`);
      if (c.visible_when && parseCondition(c.visible_when) === null) throw new Error(`${id}.${c.key}: visible_when does not parse: ${c.visible_when}`);
    }
  }
  if (e.visible_when != null) {
    // A created field has no consumers of its own (direct check skipped) but may complete a dangling input of a consumed equation.
    const chain = producerChain(prior, e.worksheet, e.symbol, { skipDirect: !!e.create });
    if (chain) throw new Error(`${id}: visible_when on a symbol consumed by another worksheet — hides ${chain} (hiding a producer, or an input of a producer, hides the inherited value; STAGE the consumer edit instead)`);
    // Task 12c: a same-worksheet gate reading the hidden symbol would silently stop enforcing. Runs for create entries too (uniformity).
    const refusal = fieldGateRefusal(prior, e.worksheet, e.symbol, e.visible_when, createdKeys);
    if (refusal) gate(`${id}: visible_when ${refusal} — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block`);
  }
  if (e.widget === 'lookup_fill') {
    const dt = e.create?.data_type ?? p?.data_type;
    if (dt != null && !LOOKUP_FILL_DATA_TYPES.has(dt)) throw new Error(`${id}: lookup_fill needs data_type number|text|enum, got ${dt}`);
  }
  if (e.create) {
    if (!e.create.description.startsWith('Plan 3:')) throw new Error(`${id}: create.description must start with 'Plan 3:' (rollback selector)`);
    if (e.enum_values === 'keep_prod') throw new Error(`${id}: a created field has no prod enum_values to keep`);
    if (p) throw new Error(`${id}: create given but the prior snapshot already has this field — use an UPDATE entry`);
    if (e.create.section_code != null && prior.sections && !(`${e.worksheet} ${e.create.section_code}` in prior.sections)) {
      throw new Error(`${id}: create.section_code ${e.create.section_code} is not a captured section of ${e.worksheet} (the INSERT would land an unsectioned row)`);
    }
    if ((e.widget === 'select_one' || e.widget === 'select_many') && !Array.isArray(e.enum_values)) throw new Error(`${id}: a created ${e.widget} needs an enum_values list`);
  } else {
    // A captured snapshot (_meta present) that lacks the key means the UPDATE would touch 0 rows — same rule as sections.
    if (!p && prior._meta) throw new Error(`${id}: not a captured active field of ${e.worksheet} (its UPDATE would touch 0 rows) — check worksheet/symbol, or add it via create`);
    // Amendment N (round 4): the checklist editor stores {type:'json'} and the enum reader expects value_enum — a select_many
    // re-keyed onto a captured non-json field would lose its data; the data_type switch is a STAGED S-block, never emitted here.
    if (e.widget === 'select_many' && p?.data_type != null && p.data_type !== 'json') throw new Error(`${id}: select_many on a non-json field loses data (captured data_type ${p.data_type}) — STAGE the data_type switch (S-block)`);
    if (Array.isArray(e.enum_values)) {
      // D-1: a list may only go into a NULL prior — and "NULL" must be a captured fact, never an absent row.
      if (!p) throw new Error(`${id}: D-1 — enum_values given but no prior snapshot row; capture prod (or add the field via create) before emitting`);
      if (p.enum_values != null) throw new Error(`${id}: D-1 — prod enum_values is non-null; use 'keep_prod' and file a sign-off entry`);
    } else if (e.widget === 'select_one' || e.widget === 'select_many') {
      // A select widget without options is an authoring slip: either the entry lists them (into a NULL prior) or prod already has them.
      if (p?.enum_values == null) throw new Error(`${id}: ${e.widget} without options — prod enum_values is ${p ? 'null' : 'not captured'} and the entry lists none`);
    }
  }
}

/**
 * Task 13b (sign-off din276-X-1) belt-and-braces lint — a WARNING, never a refusal.
 * A quoted string literal in comparison position is a literal by the engine rule
 * (`quotedComparisonLiterals`), so these expressions evaluate correctly; the warning
 * flags an enum token that ALSO names a register column key (row expressions /
 * column visible_when of that register) or a symbol of the worksheet (the captured
 * prior rows + the fields created in this batch), because a bare-ident spelling of
 * the same token elsewhere WOULD resolve to that column / symbol — the executor
 * records it on the standard's sheet. Returns one line per collision.
 */
export function quotedLiteralCollisionWarnings(entries: FieldConfigEntry[], sections: SectionVisibilityEntry[], prior: PriorSnapshot): string[] {
  const out: string[] = [];
  const worksheetSymbols = new Map<string, Set<string>>();
  const addSymbol = (ws: string, sym: string): void => {
    if (!worksheetSymbols.has(ws)) worksheetSymbols.set(ws, new Set());
    worksheetSymbols.get(ws)!.add(sym);
  };
  for (const [key] of priorFieldRows(prior)) {
    const i = key.indexOf(' ');
    addSymbol(key.slice(0, i), key.slice(i + 1));
  }
  for (const e of entries) if (e.create) addSymbol(e.worksheet, e.symbol);
  const check = (id: string, what: string, ast: Expr | null, columnKeys: ReadonlySet<string>, ws: string): void => {
    if (!ast) return;
    for (const lit of quotedComparisonLiterals(ast)) {
      const hits: string[] = [];
      if (columnKeys.has(lit)) hits.push('a register column key');
      if (worksheetSymbols.get(ws)?.has(lit)) hits.push(`a symbol of ${ws}`);
      if (hits.length) out.push(`WARNING ${id}: ${what} compares against the quoted literal '${lit}', which is also ${hits.join(' and ')} — a literal by the engine rule (Task 13b), but a bare-ident spelling of the same token would resolve to it; record on the sign-off sheet`);
    }
  };
  const none: ReadonlySet<string> = new Set();
  for (const e of entries) {
    const id = `${e.worksheet} ${e.symbol}`;
    if (e.visible_when != null) check(id, 'visible_when', parseCondition(e.visible_when), none, e.worksheet);
    if (e.widget !== 'register') continue;
    const ui = e.ui_config as { columns?: Array<{ key: string; expr?: string; visible_when?: string }> } | null | undefined;
    const columns = Array.isArray(ui?.columns) ? ui.columns : [];
    const keys: ReadonlySet<string> = new Set(columns.map((c) => c.key));
    for (const c of columns) {
      if (c.expr) { const p = parseNumeric(c.expr); check(`${id}.${c.key}`, 'expr', p.ok ? p.node : null, keys, e.worksheet); }
      if (c.visible_when) check(`${id}.${c.key}`, 'visible_when', parseCondition(c.visible_when), keys, e.worksheet);
    }
  }
  for (const s of sections) check(`section ${s.worksheet} ${s.section_code}`, 'visible_when', parseCondition(s.visible_when), none, s.worksheet);
  return out;
}

/**
 * Is the field inside the targeted section OR any of its descendants? The runtime hides every descendant of a
 * hidden section (src/lib/compliance/visibility.ts), so the guard walks the captured ancestor chain. An orphan
 * field (`section_id IS NULL`, `section_path: []`) is never section-hidden. A legacy prior without
 * `section_path` falls back to the own-section code.
 */
function inSectionTree(r: PriorFieldRow, sectionCode: string): boolean {
  if (r.section_id_is_null) return false;
  const path = r.section_path ?? (r.section_code != null ? [r.section_code] : []);
  return path.includes(sectionCode);
}

function validateSection(s: SectionVisibilityEntry, prior: PriorSnapshot, gate: (msg: string) => void, createdKeys: ReadonlySet<string>, creates: ReadonlyArray<FieldConfigEntry>): void {
  const key = `${s.worksheet} ${s.section_code}`;
  if (parseCondition(s.visible_when) === null) throw new Error(`section ${key}: visible_when does not parse: ${s.visible_when}`);
  if (prior.sections && !(key in prior.sections)) throw new Error(`section ${key}: not a captured section (its UPDATE would touch 0 rows) — check worksheet_sections.code`);
  const producers = priorFieldRows(prior)
    .filter(([k, r]) => k.startsWith(`${s.worksheet} `) && inSectionTree(r, s.section_code))
    .map(([k]) => producerChain(prior, s.worksheet, k.slice(s.worksheet.length + 1)))
    .filter((chain): chain is string => chain != null);
  if (producers.length) throw new Error(`section ${key}: visible_when on a section (or a descendant of it) containing a symbol consumed by another worksheet: ${producers.join('; ')} (hiding a producer, or an input of a producer, hides the inherited value; STAGE the consumer edit instead)`);
  // Task 12c: every field of the section tree is hidden with it — a same-worksheet gate reading any of them stops enforcing.
  const gated = priorFieldRows(prior)
    .filter(([k, r]) => k.startsWith(`${s.worksheet} `) && inSectionTree(r, s.section_code))
    .map(([k]) => fieldGateRefusal(prior, s.worksheet, k.slice(s.worksheet.length + 1), s.visible_when, createdKeys))
    .filter((m): m is string => m != null);
  // Round 3: same-batch creates landing in the hidden section tree are hidden with it too (a created field with no
  // section_code lands in the worksheet's first root section — not resolvable here, so it is not checked).
  const createdGated = creates
    .filter((e) => e.worksheet === s.worksheet && e.create?.section_code != null && sectionInTree(prior, s.worksheet, e.create.section_code, s.section_code))
    .map((e) => fieldGateRefusal(prior, s.worksheet, e.symbol, s.visible_when, createdKeys))
    .filter((m): m is string => m != null);
  gated.push(...createdGated);
  if (gated.length) gate(`section ${key}: visible_when on a section (or a descendant of it) ${gated.join('; ')} — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block`);
}

/**
 * `warnings`: the Task 13b quoted-literal collision lint (never a refusal) — the CLI prints them to stderr — plus,
 * under `header.gate_guard === 'warn'`, one `GATE-REFUSAL (warn mode) …` line per Task 12c refusal that would
 * have thrown in the default `'refuse'` mode.
 */
export function emitFieldConfigSql(slug: string, entries: FieldConfigEntry[], sections: SectionVisibilityEntry[], prior: PriorSnapshot, header: FieldConfigHeader = {}): { up: string; down: string; warnings: string[] } {
  assertPriorSnapshot(prior);
  const gateWarnings: string[] = [];
  // Round 3: the batch's created fields per worksheet — they resolve at runtime like captured ones (bare-literal rule) and
  // are hidden by a section rule over their section.
  const creates = entries.filter((e) => e.create);
  const createdKeys: ReadonlySet<string> = new Set(creates.map((e) => `${e.worksheet} ${e.symbol}`));
  const gate = (msg: string): void => {
    if (header.gate_guard === 'warn') gateWarnings.push(`GATE-REFUSAL (warn mode) ${msg}`);
    else throw new Error(msg);
  };
  const up = [
    ...(header.provenance ? [`-- ${header.provenance}`] : []),
    `-- Generated by scripts/regulation-tables/emit-field-configs-sql.ts for ${slug} (Plan 3). Regenerate, do not hand-edit.`,
    `-- Source: src/lib/eval/field-configs/${slug}.ts against the prod capture src/lib/eval/field-configs/${slug}.prior.json. Apply AFTER ${SCHEMA_MIGRATION}.`,
    ...(header.gated ? gatedHeaderLines(header.gated, header.gated_note, SIGN_OFF_DOC_PLAN_3) : []),
    'BEGIN;',
  ];
  const down = [
    `-- Generated rollback for ${slug} field configs (scripts/regulation-tables/emit-field-configs-sql.ts). Restores the captured prior; deletes only 'Plan 3:' rows. Regenerate, do not hand-edit.`,
    'BEGIN;',
  ];
  const seen = new Set<string>();
  for (const e of entries) {
    const key: PriorFieldKey = `${e.worksheet} ${e.symbol}`;
    if (seen.has(key)) throw new Error(`${key}: duplicate entry`);
    seen.add(key);
    const p = prior[key];
    validateEntry(e, p, prior, gate, createdKeys);
    if (e.create) {
      const section = e.create.section_code
        ? `(SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = ${q(e.create.section_code)})`
        : '(SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.parent_section_id IS NULL ORDER BY ws.order_index LIMIT 1)';
      // NOT EXISTS is deliberately NOT filtered by f2.active: an inactive row with the same symbol still holds the (template, symbol) unique key.
      up.push(`INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, ${section}, ${q(e.symbol)}, ${q(e.create.label_de)}, ${q(e.create.data_type)}, ${textOrNull(e.create.unit)}, false, ${q(e.create.clause_reference)}, ${q(e.create.description)}, 'imported_unverified', ${q(e.verification_quote)}, ${q(e.widget)}, ${jsonOrNull(e.ui_config)}, ${jsonOrNull(e.lookup)}, ${textOrNull(e.visible_when)}, ${Array.isArray(e.enum_values) ? j(e.enum_values) : 'NULL'}, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
${JOIN} WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = ${q(e.symbol)}) AND w.code = ${q(e.worksheet)} AND s.code = ${q(e.standard)};`);
      down.push(`DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = ${q(e.standard)} AND w.code = ${q(e.worksheet)} AND f.symbol = ${q(e.symbol)} AND f.description LIKE 'Plan 3:%';`);
      continue;
    }
    const sets = [`widget = ${q(e.widget)}`, `ui_config = ${jsonOrNull(e.ui_config)}`, `lookup = ${jsonOrNull(e.lookup)}`, `visible_when = ${textOrNull(e.visible_when)}`];
    const writesEnum = Array.isArray(e.enum_values);
    if (writesEnum) sets.push(`enum_values = ${j(e.enum_values)}`);
    up.push(`UPDATE fields f SET ${sets.join(', ')} ${where(e, e.visible_when != null)};`);
    const restore = [
      `widget = ${textOrNull(p?.widget)}`,
      `ui_config = ${jsonOrNull(p?.ui_config)}`,
      `lookup = ${jsonOrNull(p?.lookup)}`,
      `visible_when = ${textOrNull(p?.visible_when)}`,
    ];
    if (writesEnum) restore.push(`enum_values = ${jsonOrNull(p?.enum_values)}`);
    // A missing prior row cannot be refused (an enum list is — see validateEntry), but the rollback must say what it assumes.
    if (!p) down.push(NO_PRIOR_NOTE(key));
    if (e.visible_when != null) down.push(GUARDED_RESTORE_NOTE(key));
    down.push(`UPDATE fields f SET ${restore.join(', ')} ${where(e)};`);
  }
  const seenSections = new Set<string>();
  for (const s of sections) {
    const key = `${s.worksheet} ${s.section_code}`;
    if (seenSections.has(key)) throw new Error(`section ${key}: duplicate entry`);
    seenSections.add(key);
    validateSection(s, prior, gate, createdKeys, creates);
    up.push(`UPDATE worksheet_sections ws SET visible_when = ${q(s.visible_when)} ${sectionWhere(s, true)};`);
    const ps = prior.sections?.[key];
    if (!ps) down.push(NO_PRIOR_NOTE(`section ${key}`));
    down.push(GUARDED_RESTORE_NOTE(`section ${key}`)); // a section entry always writes a rule ⇒ its UP is always guarded
    down.push(`UPDATE worksheet_sections ws SET visible_when = ${textOrNull(ps?.visible_when)} ${sectionWhere(s)};`);
  }
  up.push('COMMIT;'); down.push('COMMIT;');
  return { up: up.join('\n') + '\n', down: down.join('\n') + '\n', warnings: [...quotedLiteralCollisionWarnings(entries, sections, prior), ...gateWarnings] };
}

/** Migration + rollback file paths for a slug and timestamp (relative to the repo root). */
export function fieldConfigFilesFor(slug: string, ts: string): { migration: string; rollback: string } {
  if (!/^\d{14}$/.test(ts)) throw new Error(`timestamp must be 14 digits, got ${JSON.stringify(ts)}`);
  return {
    migration: `scripts/migrations/${ts}_field_configs_${slug}.sql`,
    rollback: `scripts/rollback-${ts}-field-configs-${slug.replace(/_/g, '-')}.sql`,
  };
}

/** Parses `[--gated <id>] [--provenance "<line>"] [--gate-guard=warn|refuse]`; a flag without a value is an error. */
export function parseHeaderArgs(rest: readonly string[]): FieldConfigHeader {
  const header: FieldConfigHeader = {};
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const gateGuard = flag.match(/^--gate-guard=(.*)$/);
    if (gateGuard) {
      if (gateGuard[1] !== 'warn' && gateGuard[1] !== 'refuse') throw new Error(`--gate-guard takes warn|refuse, got ${JSON.stringify(gateGuard[1])}`);
      header.gate_guard = gateGuard[1];
      continue;
    }
    if (flag !== '--gated' && flag !== '--provenance') throw new Error(`unknown argument ${flag}`);
    const value = rest[i + 1];
    if (value == null || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    if (flag === '--gated') header.gated = value; else header.provenance = value;
    i++;
  }
  return header;
}

/** Reads and validates `<slug>.prior.json` (shape + JSON-column sanity). */
export function loadPriorSnapshot(path: string): PriorSnapshot {
  if (!existsSync(path)) throw new Error(`missing prior snapshot ${path} — capture prod first: node scripts/regulation-tables/build-prior-snapshot.mjs <CODE> <slug>`);
  const prior = JSON.parse(readFileSync(path, 'utf8')) as PriorSnapshot;
  assertPriorSnapshot(prior);
  return prior;
}

if (process.argv[1]?.endsWith('emit-field-configs-sql.ts')) {
  // CLI: tsx scripts/regulation-tables/emit-field-configs-sql.ts <slug> <ts> [--gated <sign-off id>] [--provenance "<line 1>"] [--gate-guard=warn]
  // Reads src/lib/eval/field-configs/<slug>.ts (via FIELD_CONFIG_MODULES) + <slug>.prior.json.
  const [slug = '', ts = '', ...rest] = process.argv.slice(2);
  const load = FIELD_CONFIG_MODULES[slug];
  if (!load) throw new Error(`unknown field-config slug ${JSON.stringify(slug)} — known: ${Object.keys(FIELD_CONFIG_MODULES).join(', ') || '(none)'}`);
  const files = fieldConfigFilesFor(slug, ts);
  const header = parseHeaderArgs(rest);
  const prior = loadPriorSnapshot(`src/lib/eval/field-configs/${slug}.prior.json`);
  for (const w of priorSnapshotWarnings(slug, prior)) console.error(w);
  if (header.gate_guard === 'warn') console.error('warning: --gate-guard=warn — Task 12c gate refusals are printed as GATE-REFUSAL lines, not enforced (re-audit / pinned-debt runs only)');
  // Task 12b: a self-entry in a field's own consumer_worksheets is a prod data oddity (the runtime
  // never inherits a field from its own owner worksheet) — the guard ignores it, but it is worth
  // recording so the executor can file it as an X-class observation when it next touches the standard.
  const selfConsumed = priorFieldRows(prior)
    .filter(([key, row]) => row.consumer_worksheets?.includes(key.slice(0, key.indexOf(' '))))
    .map(([key]) => key);
  if (selfConsumed.length) console.error(`NOTICE: prod data oddity — self-consumer ignored: ${selfConsumed.join(', ')}`);
  load().then((m) => {
    const { up, down, warnings } = emitFieldConfigSql(slug, m.FIELD_CONFIGS, m.SECTION_VISIBILITY, prior, header);
    // Task 13b: quoted-literal ↔ column-key / worksheet-symbol collisions are a WARNING (stderr), never a refusal;
    // Task 12c warn-mode gate refusals print the same way (GATE-REFUSAL prefix).
    for (const w of warnings) console.error(w);
    writeSql(files.migration, up);
    writeSql(files.rollback, down);
    console.log(`wrote ${m.FIELD_CONFIGS.length} field entries + ${m.SECTION_VISIBILITY.length} section entries for ${slug} ->`, files.migration, files.rollback);
  }).catch((err) => { console.error(err); process.exit(1); });
}
