# Guideline → Tool — Plan 2a (Phase 4 engine + Phase 3 runtime: one expression language, `visible_when`, `not_applicable` gates, register equations, generic materialiser) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two hand-written expression evaluators with one language that also understands rows, tables and conditions, so a guideline's derived values are formula strings on equation rows, `visible_when` hides fields and sections, hidden-symbol gates report `not_applicable`, and register-fed equations are materialised server-side by one generic block instead of two bespoke ones.

**Architecture:** (1) `src/lib/expr/` — one tokenizer, one parser (the compliance grammar + `^` + function calls), one evaluator with two modes (lenient for conditions, strict/throwing for numbers) and one `Scope` (symbols, prepared registers, table lookup, raw carriers). `compliance/evaluate.ts` and `eval/arithmetic.ts` become thin adapters with their public signatures unchanged, so every existing test keeps pinning behaviour. (2) `src/lib/eval/register-rows.ts` + `register-configs.ts` — the carrier normaliser that turns a JSON register into rows with typed cells, derived columns and a completeness flag, driven by the `register` `ui_config` contract from Plan 1 (DB wins, TS fallback while `widget IS NULL`). (3) `formula.ts` gains registers; the six A138-07 UUID aggregators die and their math becomes `sum_rows(...)` formula strings (migration written-not-applied, rewrite-rule bridge until applied); `saveWorksheet`'s surface and pollutant blocks become one `materializeDerivedOutputs` over register-fed equations. (4) `src/lib/compliance/visibility.ts` evaluates `visible_when` for fields and sections; hidden symbols feed `evaluateCondition` which gains the `not_applicable` kind, handled at every consumer.

**Tech Stack:** Next.js 16 / React 19, Drizzle (schema only), raw SQL data migrations under `scripts/migrations/` with rollbacks, zod 4, vitest (`pnpm test` = unit project, happy-dom; `pnpm vitest run --project integration` = embedded Postgres harness under `tests/harness/`).

**Spec:** `docs/superpowers/specs/2026-09-11-guideline-to-tool-generic-fields-design.md` §6 (runtime), §8 phases 3–4, §9 risks 1/3/4, §11 tests. Evidence: `docs/superpowers/specs/2026-09-11-guideline-to-tool/ARCH-PROPOSAL-fable.md` §3 (runtime architecture), worked example A. The Plan-2 code map (every file:line cited below was re-read on `da79b99`) is in the Plan-2 session; Plan 1 is `docs/superpowers/plans/2026-09-11-guideline-to-tool-plan-1-schema-tables-configs.md`.

**Scope split (decided while writing this plan):** Phase 3/4 is delivered as two plans. **This plan (2a)** = the engine and runtime half: expression language, register rows, formula/materialiser, visibility, gate kind. **Plan 2b** (written next, separate document) = the editor half: generic `RegisterEditor` with lookup/derived/discriminator columns, `surface_inventory` and `pollutant_register` onto it, `reference` and `lookup_fill` field renderers, risk register → register + grid column. 2b consumes 2a's `prepareRegisterRows`, `evalValue` and `resolveRegisterConfig` unchanged. Nothing in 2a changes what an engineer sees in an editor; it changes what computes, what hides, and what persists.

**Branch / worktree:** `feat/guideline-to-tool` in `C:\Users\Ekowai\_wt-g2t` (HEAD `da79b99`, 1928 unit tests green on 2026-09-16). Run every command from that directory. Commit as Alvaro (`git config user.email` = `alvaro.burgos@ekowai.com`). Never run `scripts/apply-migration.mjs`, `drizzle-kit`, `vercel`, or any DB write from an assistant session; `node scripts/verification/prod-query.mjs` (read-only) is allowed.

## Global Constraints

- Single-source derivation invariant: a derived value is produced by exactly one registered equation (formula string), read-only, materialised as `source_type='derived'`; per-row outputs stay inside the row, only aggregates become symbols (spec §4 discriminator note, §9 risk 5).
- SR-1 never-invent: no table cell, option or threshold is typed into code in this plan. The only table data touched is A138 TAB9/5/6/13, already seeded by Plan 1 from the TS constants (`imported_unverified`, I-2 ruling).
- Calculations untouched in VALUE: every existing equation must compute the same number after this plan. The A138-07 six outputs are pinned to the recorded fixtures (`A_C 4826.43`, `C_m 0.9`, `A_E_ba 5362.7`, sealed/unsealed 90/60) through `evaluateFormula` — parity by execution, not by reading.
- Zero behaviour change for `widget IS NULL` fields and for every equation without a register input: the client engine, report evaluator and `saveWorksheet` paths must produce identical states for them (the 1928-test suite is the pin; no existing test may be deleted or weakened — extend only; a pin whose *text* must change because a mechanism moved is updated with a `// Plan 2a:` note explaining what moved).
- Deploy-before-migration safety (hard constraint from `docs/superpowers/guideline-to-tool-playbook.md`): every migration in this plan is WRITTEN, NOT APPLIED. Code must behave correctly with none of them applied: A138-07 via the rewrite bridge (Task 6), VSME-B04 via fallback equations (Task 5), A138-12 visibility via `LEGACY_VISIBLE_WHEN` (Task 10). Each bridge carries a comment naming the migration whose application retires it.
- Owner-stamped: applying any migration to `vadsmshzebefjreqcicl` is the owner's step; the ledger records the apply order (Task 12).
- Gates: hidden ⇒ null; a gate referencing a hidden symbol ⇒ `not_applicable`, never `pass`, never `fail`; `pending|manual` never hides a field (spec §6, §9 risk 3).
- Decision items found while executing (modal wording, a completeness rule the guideline leaves open, stdev population vs sample) go to the sign-off sheet `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-2a.md` with verbatim evidence — never auto-applied, never blocking.
- Every commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/expr/tokens.ts` (create) | one tokenizer (compliance token set + `^`, `.5` numbers, unterminated-string/unknown-char errors) |
| `src/lib/expr/ast.ts` (create) | `Node` / `ArithNode` / `Expr` types (compliance AST + `'^'` + `call`) and `isConditionNode` |
| `src/lib/expr/parser.ts` (create) | one recursive-descent parser: `parseCondition`, `parseNumeric`, `parseExpression`; `IF…THEN` vs `if(…)` disambiguation |
| `src/lib/expr/functions.ts` (create) | function registry: math (7 + `lg` alias), row, logic; `canonicalFunctionName`, `EXPR_FUNCTION_NAMES` |
| `src/lib/expr/scope.ts` (create) | `Value`, `RowValues`, `PreparedRow`, `PreparedRegister`, `Scope`, `EvalResult`, `ExprError` |
| `src/lib/expr/evaluate.ts` (create) | one evaluator core (`evalValueCore`, `evalNodeCore`), entry points `evalNumber`, `evalValue`, `evalCondition`, `evaluateNodeLenient`, `evaluateArithLenient`, `extractSymbols` |
| `src/lib/expr/index.ts` (create) | barrel |
| `src/lib/expr/__tests__/*.test.ts` (create) | tokenizer/parser/evaluator/function tests |
| `src/lib/compliance/evaluate.ts` (rewrite) | adapter over `expr` — same exported names and signatures + `opts` param + `not_applicable` kind |
| `src/lib/compliance/explain.ts` (modify) | `call` and `'^'` rendering; `not_applicable` untouched (explainer is only invoked for fail/pending) |
| `src/lib/eval/arithmetic.ts` (rewrite) | adapter: `evalExpression(expression, scope, extra?)` over `evalNumber`; keeps `SUPPORTED_FUNCTIONS`, `canonicalFunctionName` exports |
| `src/lib/eval/normalize-formula.ts` (modify) | exclusion list built from `EXPR_FUNCTION_NAMES` |
| `src/lib/eval/engine-eligibility.ts` (modify) | supported calls pass, unknown calls (`SUM`) still fail |
| `src/lib/eval/register-configs.ts` (create) | `REGISTER_CONFIGS_FALLBACK` (`surface_inventory`, `pollutant_register`), `resolveRegisterConfig`, `FALLBACK_REGISTER_EQUATIONS`, `withFallbackRegisterEquations` |
| `src/lib/eval/register-rows.ts` (create) | `prepareRegisterRows(carrierRaw, columns, ctx)` — typed cells, legacy map replay, derived columns, completeness, flags |
| `src/lib/eval/regulation-tables-fallback.ts` (create) | `makeTableLookup(standardCode)` — registry first, A138 seed builders as fallback |
| `src/lib/eval/formula.ts` (modify) | `EvalRequest.registers/tableLookup/carriers`; parse-based criterion classification when calls present; rewrite bridge applies only while DB formula differs |
| `src/lib/eval/aggregators.ts` (modify) | delete `makeSurfaceAggregator` + six entries |
| `src/lib/eval/rewrites.ts` (modify) | six A138-07 bridge entries (retire after migration `20260916100000`) |
| `src/lib/eval/materialize-surfaces.ts` (delete) | replaced by the generic materialiser |
| `src/lib/eval/use-equation-engine.ts` (modify) | registers + table lookup plumbing; surface aggregator branch removed |
| `src/lib/eval/evaluate-for-report.ts` (modify) | same for the PDF path |
| `src/lib/eval/materialize-derived.ts` (create) | pure `materializeDerivedOutputs` |
| `src/lib/actions/worksheet.ts` (modify) | one generic register-materialise block replaces the surface + pollutant blocks; fallback equations in `derivedSymbols` |
| `src/lib/eval/carrier-source-state.ts` (create) | `carrierSourceState`, `carrierWithholdFieldIds`; `surface-source-state.ts` becomes a shim |
| `src/lib/compliance/visibility.ts` (create) | `computeVisibility(fields, sections, lookup)` (pure, server+client) + `LEGACY_VISIBLE_WHEN` |
| `src/components/worksheet/worksheet-form.tsx` (modify) | hidden fields/sections out of the grid; `hiddenSymbols` to engine + compliance block |
| `src/components/worksheet/compliance-block.tsx` (modify) | `hiddenSymbols` prop; N.A. badge + count |
| `src/components/worksheet/dynamic-field.tsx` (modify) | the two ASM early returns removed (visibility now decided in the form) |
| `src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx` (modify) | sections carry `visibleWhen`; fallback equations merged |
| `src/lib/actions/approval-gate.ts`, `src/lib/eval/evaluate-for-report.ts`, `src/lib/snapshots/payload.ts`, `src/lib/pdf/assemble-standard-report.ts`, `src/lib/pdf/sections/compliance.tsx`, `src/components/pdf/worksheet-section.tsx`, `src/components/pdf/pruefmemo-document.tsx` (modify) | `not_applicable` handled |
| `scripts/_pass3c-validate.ts` (modify) | `visible_when` forbidden on a field with non-empty `consumer_worksheets` |
| `scripts/migrations/20260916100000_a138_07_register_equations.sql` (+ rollback) | six equation rows: formula + input_symbols |
| `scripts/migrations/20260916110000_vsme_b04_register_equations.sql` (+ rollback) | three VSME-B04.100 equation rows inserted |
| `scripts/migrations/20260916120000_a138_12_visible_when.sql` (+ rollback) | `visible_when` on `soil_bodenart_tab13`, `a_s_m_provenance` |
| `tests/harness/register-materialise.integration.test.ts` (create) | A138-07 carrier through the real `saveWorksheet` → six derived rows |
| `docs/superpowers/guideline-to-tool-playbook.md` (modify) | "What Plan 2a added" + apply order extended |

**Task dependency graph (for parallel dispatch):** T1 → T2 → T3 → {T4, T6}; T2 → T5 → {T6, T9}; T6 → {T7, T8}; T3 → T10 → T11; T12 last. Parallel groups: after T3: {T4, T5, T10} · after T5+T3: {T6, T9} · after T6: {T7, T8, T11}.

---

### Task 1: `src/lib/expr/` tokens, AST, parser

**Files:**
- Create: `src/lib/expr/tokens.ts`, `src/lib/expr/ast.ts`, `src/lib/expr/parser.ts`
- Test: `src/lib/expr/__tests__/parser.test.ts`
- Reference (read, do not modify yet): `src/lib/compliance/evaluate.ts:34-331` (the tokenizer + `Parser` class this task generalises), `src/lib/eval/arithmetic.ts:68-131` (the numeric tokenizer whose `^`, `.5` and error messages must survive)

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  // tokens.ts
  export type Token =
    | { type: 'ident'; value: string } | { type: 'number'; value: number } | { type: 'string'; value: string }
    | { type: 'op'; value: '>=' | '<=' | '==' | '!=' | '<' | '>' }
    | { type: 'aop'; value: '+' | '-' | '*' | '/' | '^' }
    | { type: 'lparen' } | { type: 'rparen' } | { type: 'lbrace' } | { type: 'rbrace' } | { type: 'comma' }
    | { type: 'kw'; value: KeywordToken };
  export type KeywordToken = 'IF' | 'THEN' | 'AND' | 'OR' | 'NOT' | 'IS' | 'NULL' | 'EMPTY' | 'IN' | 'TRUE' | 'FALSE';
  export type TokenizeResult = { ok: true; tokens: Token[] } | { ok: false; message: string };
  export function tokenize(src: string): TokenizeResult;
  // ast.ts
  export type CompareOp = '>=' | '<=' | '==' | '!=' | '<' | '>';
  export type Literal = { kind: 'lit'; value: number | string | boolean | null };
  export type ArithNode =
    | { kind: 'anum'; value: number } | { kind: 'astr'; value: string } | { kind: 'abool'; value: boolean } | { kind: 'anull' }
    | { kind: 'aref'; symbol: string }
    | { kind: 'abin'; op: '+' | '-' | '*' | '/' | '^'; left: ArithNode; right: ArithNode }
    | { kind: 'aneg'; inner: ArithNode }
    | { kind: 'call'; name: string; args: Expr[] };
  export type Node =
    | Literal | { kind: 'truthy'; symbol: string }
    | { kind: 'compare'; symbol: string; op: CompareOp; rhs: Literal }
    | { kind: 'acompare'; left: ArithNode; op: CompareOp; right: ArithNode }
    | { kind: 'exists'; symbol: string; negate: boolean } | { kind: 'in'; symbol: string; members: Literal[] }
    | { kind: 'and'; left: Node; right: Node } | { kind: 'or'; left: Node; right: Node }
    | { kind: 'not'; inner: Node } | { kind: 'guard'; guard: Node; body: Node };
  export type Expr = Node | ArithNode;
  export function isConditionNode(e: Expr): e is Node;
  // parser.ts
  export type ParseNumericResult = { ok: true; node: ArithNode } | { ok: false; message: string };
  export function parseCondition(src: string): Node | null;      // null = not machine-evaluable (today's semantics)
  export function parseNumeric(src: string): ParseNumericResult; // arithmetic-only entry; messages below
  export function parseExpression(src: string): Expr | null;     // condition OR arithmetic; used by formula.ts classification
  ```

- [ ] **Step 1: Write the failing parser tests**

```ts
// src/lib/expr/__tests__/parser.test.ts
import { describe, it, expect } from 'vitest';
import { tokenize } from '../tokens';
import { parseCondition, parseNumeric, parseExpression } from '../parser';
import { isConditionNode } from '../ast';

describe('tokenize — union of the compliance and arithmetic tokenizers', () => {
  it('keeps every compliance token and adds ^', () => {
    const r = tokenize("x >= 1e-6 AND y IN {a, 'b'} OR z^2");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tokens.map((t) => t.type)).toEqual([
      'ident','op','number','kw','ident','kw','lbrace','ident','comma','string','rbrace','kw','ident','aop','number',
    ]);
  });
  it('accepts .5 and scientific notation like arithmetic.ts', () => {
    const r = tokenize('.5 * 1.23e+4');
    expect(r.ok && r.tokens[0]).toEqual({ type: 'number', value: 0.5 });
  });
  it('folds a negative literal after an operator but not after an operand (10^-4, 2 - 3)', () => {
    const a = tokenize('10^-4'); const b = tokenize('2 - 3');
    expect(a.ok && a.tokens.map((t) => t.type)).toEqual(['number','aop','number']);
    expect(b.ok && b.tokens.map((t) => t.type)).toEqual(['number','aop','number']);
    expect(b.ok && b.tokens[1]).toEqual({ type: 'aop', value: '-' });
  });
  it('reports the arithmetic.ts unknown-character message', () => {
    const r = tokenize('a # b');
    expect(r).toEqual({ ok: false, message: 'Unerwartetes Zeichen "#" an Position 2.' });
  });
  it('reports an unterminated string', () => {
    expect(tokenize("x == 'abc")).toEqual({ ok: false, message: 'Nicht abgeschlossene Zeichenkette an Position 5.' });
  });
});

describe('parseNumeric — the arithmetic grammar', () => {
  it('parses -x^2 as -(x^2) and 2^3^2 right-associatively', () => {
    const a = parseNumeric('-x^2');
    expect(a.ok && a.node).toEqual({ kind: 'aneg', inner: { kind: 'abin', op: '^', left: { kind: 'aref', symbol: 'x' }, right: { kind: 'anum', value: 2 } } });
    const b = parseNumeric('2^3^2');
    expect(b.ok && b.node).toEqual({ kind: 'abin', op: '^', left: { kind: 'anum', value: 2 }, right: { kind: 'abin', op: '^', left: { kind: 'anum', value: 3 }, right: { kind: 'anum', value: 2 } } });
  });
  it('parses function calls with arithmetic and condition arguments', () => {
    const r = parseNumeric("sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_i, 0))");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.node.kind).toBe('call');
    if (r.node.kind !== 'call') return;
    expect(r.node.name).toBe('sum_rows');
    expect(r.node.args[0]).toEqual({ kind: 'aref', symbol: 'surface_inventory' });
    const inner = r.node.args[1];
    expect(inner.kind).toBe('call');
    if (inner.kind !== 'call') return;
    expect(inner.name).toBe('if');
    expect(isConditionNode(inner.args[0])).toBe(true);
    expect(inner.args[0]).toEqual({ kind: 'compare', symbol: 'kind', op: '==', rhs: { kind: 'lit', value: 'paved' } });
    expect(isConditionNode(inner.args[1])).toBe(false);
  });
  it("parses lookup('TAB9', tab9_value, 'kind') with string-literal args", () => {
    const r = parseNumeric("lookup('TAB9', tab9_value, 'kind')");
    expect(r.ok && r.node).toEqual({ kind: 'call', name: 'lookup', args: [
      { kind: 'astr', value: 'TAB9' }, { kind: 'aref', symbol: 'tab9_value' }, { kind: 'astr', value: 'kind' },
    ] });
  });
  it('rejects trailing tokens and a bare condition with the arithmetic.ts messages', () => {
    expect(parseNumeric('a b')).toEqual({ ok: false, message: 'Unerwartetes Token am Ende des Ausdrucks.' });
    expect(parseNumeric('(a + b')).toEqual({ ok: false, message: 'Fehlende schließende Klammer.' });
    expect(parseNumeric('')).toEqual({ ok: false, message: 'Ausdruck endet vorzeitig.' });
    expect(parseNumeric('a >= b').ok).toBe(false);
  });
});

describe('parseCondition — legacy semantics preserved', () => {
  it('bare-ident RHS of == stays a string literal; relational RHS is a symbol ref', () => {
    expect(parseCondition('status == approved')).toEqual({ kind: 'compare', symbol: 'status', op: '==', rhs: { kind: 'lit', value: 'approved' } });
    expect(parseCondition('V_s >= V_S_min')).toEqual({ kind: 'acompare', left: { kind: 'aref', symbol: 'V_s' }, op: '>=', right: { kind: 'aref', symbol: 'V_S_min' } });
  });
  it('IF … THEN … stays a guard; if(…) inside a comparison is a call', () => {
    const g = parseCondition('IF (a AND b) THEN c >= 1');
    expect(g?.kind).toBe('guard');
    const c = parseCondition("if(flag, 1, 0) >= 1");
    expect(c?.kind).toBe('acompare');
    if (c?.kind === 'acompare') expect(c.left.kind).toBe('call');
  });
  it('an unknown character or unbalanced brace still yields null (manual)', () => {
    expect(parseCondition('x # 1')).toBeNull();
    expect(parseCondition('x IN {a, b')).toBeNull();
  });
});

describe('parseExpression', () => {
  it('classifies a top-level condition vs arithmetic', () => {
    expect(isConditionNode(parseExpression('a >= b')!)).toBe(true);
    expect(isConditionNode(parseExpression('a * b')!)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run --project unit src/lib/expr/__tests__/parser.test.ts`
Expected: FAIL — `Cannot find module '../tokens'`.

- [ ] **Step 3: Write `tokens.ts`**

Copy `tokenize` from `src/lib/compliance/evaluate.ts:57-122` and change exactly these things:

```ts
// src/lib/expr/tokens.ts
export type KeywordToken = 'IF' | 'THEN' | 'AND' | 'OR' | 'NOT' | 'IS' | 'NULL' | 'EMPTY' | 'IN' | 'TRUE' | 'FALSE';
export type Token = /* union as in Interfaces above */;
export type TokenizeResult = { ok: true; tokens: Token[] } | { ok: false; message: string };

const KEYWORDS: Record<string, KeywordToken> = { if: 'IF', then: 'THEN', and: 'AND', or: 'OR', not: 'NOT', is: 'IS', null: 'NULL', empty: 'EMPTY', in: 'IN', true: 'TRUE', false: 'FALSE' };
const NUMBER = /^(?:\d+\.\d+|\d+|\.\d+)(?:[eE][+-]?\d+)?/;      // arithmetic.ts:98 superset
const NEG_NUMBER = /^-(?:\d+\.\d+|\d+|\.\d+)(?:[eE][+-]?\d+)?/;
const IDENT = /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*/;                    // evaluate.ts:110 (Latin-1 superset of arithmetic's ASCII)

export function tokenize(src: string): TokenizeResult {
  const toks: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '(') { toks.push({ type: 'lparen' }); i++; continue; }
    if (c === ')') { toks.push({ type: 'rparen' }); i++; continue; }
    if (c === '{') { toks.push({ type: 'lbrace' }); i++; continue; }
    if (c === '}') { toks.push({ type: 'rbrace' }); i++; continue; }
    if (c === ',') { toks.push({ type: 'comma' }); i++; continue; }
    if (c === '>' || c === '<' || c === '=' || c === '!') {
      // identical to evaluate.ts:68-78, except the fall-through returns the error object:
      // ... (>=, <=, ==, !=, <>, =, <, >)
      return { ok: false, message: `Unerwartetes Zeichen "${c}" an Position ${i}.` };
    }
    if (c === '+' || c === '*' || c === '/' || c === '^') { toks.push({ type: 'aop', value: c }); i++; continue; }
    if (c === '·' || c === '×') { toks.push({ type: 'aop', value: '*' }); i++; continue; }
    if (c === '-') {
      const lastTok = toks[toks.length - 1];
      const canBeNegative = !lastTok || lastTok.type === 'op' || lastTok.type === 'aop' || lastTok.type === 'lparen' || lastTok.type === 'comma' || lastTok.type === 'kw';
      const numM = NEG_NUMBER.exec(src.slice(i));
      if (canBeNegative && numM) { toks.push({ type: 'number', value: Number(numM[0]) }); i += numM[0].length; continue; }
      toks.push({ type: 'aop', value: '-' }); i++; continue;
    }
    if ((c >= '0' && c <= '9') || (c === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const m = NUMBER.exec(src.slice(i));
      if (!m) return { ok: false, message: `Ungültige Zahl an Position ${i}: "${src.slice(i, i + 6)}"` };
      toks.push({ type: 'number', value: Number(m[0]) }); i += m[0].length; continue;
    }
    if (c === "'" || c === '"') {
      const quote = c; let j = i + 1;
      while (j < src.length && src[j] !== quote) j++;
      if (j >= src.length) return { ok: false, message: `Nicht abgeschlossene Zeichenkette an Position ${i}.` };
      toks.push({ type: 'string', value: src.slice(i + 1, j) }); i = j + 1; continue;
    }
    const idMatch = IDENT.exec(src.slice(i));
    if (idMatch) {
      const word = idMatch[0]; const kw = KEYWORDS[word.toLowerCase()];
      if (kw) toks.push({ type: 'kw', value: kw }); else toks.push({ type: 'ident', value: word });
      i += word.length; continue;
    }
    return { ok: false, message: `Unerwartetes Zeichen "${c}" an Position ${i}.` };
  }
  return { ok: true, tokens: toks };
}
```

- [ ] **Step 4: Write `ast.ts`**

```ts
// src/lib/expr/ast.ts
// (types exactly as in Interfaces above)
const CONDITION_KINDS = new Set(['lit', 'truthy', 'compare', 'acompare', 'exists', 'in', 'and', 'or', 'not', 'guard']);
export function isConditionNode(e: Expr): e is Node { return CONDITION_KINDS.has(e.kind); }
```

- [ ] **Step 5: Write `parser.ts`**

Port the `Parser` class from `src/lib/compliance/evaluate.ts:124-331` verbatim, then make these changes and nothing else:

1. Construction: `new Parser(tokens)`; keep `parse()` (condition, whole input) and add `parseNumericAll(): ArithNode` that calls `parseArithExpr()` and throws `ParseError('Unerwartetes Token am Ende des Ausdrucks.')` when tokens remain. Introduce `class ParseError extends Error {}` used ONLY inside the numeric path; the condition path keeps returning `null`.
2. `parseAtom` on `IF`: save `pos`; try the guard form (`parseOr` → expect `THEN` → `parseOr`); if any step fails, restore `pos` and `return this.parseComparison()` (which reaches `parsePrimary` and parses `if(...)` as a call). This is the IF…THEN vs `if(` disambiguation — the guard form needs `THEN`, so it is deterministic.
3. Replace `parseFactor` (`:292-316`) with three methods:
   ```ts
   // unary := '-' unary | power
   private parseUnary(): ArithNode | null {
     const t = this.peek();
     if (t?.type === 'aop' && t.value === '-') { this.next(); const inner = this.parseUnary(); return inner === null ? null : { kind: 'aneg', inner }; }
     return this.parsePower();
   }
   // power := primary ('^' unary)?   right-associative, exponent may carry a unary minus
   private parsePower(): ArithNode | null {
     const left = this.parsePrimary(); if (left === null) return null;
     const t = this.peek();
     if (t?.type === 'aop' && t.value === '^') { this.next(); const right = this.parseUnary(); return right === null ? null : { kind: 'abin', op: '^', left, right }; }
     return left;
   }
   // primary := number | string | TRUE | FALSE | NULL | ident | ident '(' args ')' | IF '(' args ')' | '(' arithExpr ')'
   private parsePrimary(): ArithNode | null {
     const t = this.peek(); if (!t) return null;
     if (t.type === 'lparen') { this.next(); const e = this.parseArithExpr(); if (e === null) return null; if (this.peek()?.type !== 'rparen') return null; this.next(); return e; }
     if (t.type === 'number') { this.next(); return { kind: 'anum', value: t.value }; }
     if (t.type === 'string') { this.next(); return { kind: 'astr', value: t.value }; }
     if (t.type === 'kw' && t.value === 'TRUE') { this.next(); return { kind: 'abool', value: true }; }
     if (t.type === 'kw' && t.value === 'FALSE') { this.next(); return { kind: 'abool', value: false }; }
     if (t.type === 'kw' && t.value === 'NULL') { this.next(); return { kind: 'anull' }; }
     const isCallable = t.type === 'ident' || (t.type === 'kw' && t.value === 'IF');
     if (isCallable && this.toks[this.pos + 1]?.type === 'lparen') {
       const name = t.type === 'ident' ? t.value : 'if';
       this.next(); this.next();
       const args: Expr[] = [];
       if (this.peek()?.type !== 'rparen') {
         for (;;) {
           const arg = this.parseArg(); if (arg === null) return null;
           args.push(arg);
           if (this.peek()?.type === 'comma') { this.next(); continue; }
           break;
         }
       }
       if (this.peek()?.type !== 'rparen') return null;
       this.next();
       return { kind: 'call', name, args };
     }
     if (t.type === 'ident') { this.next(); return { kind: 'aref', symbol: t.value }; }
     return null;
   }
   // arg := arithExpr (when followed by ',' or ')') | condition
   private parseArg(): Expr | null {
     const save = this.pos;
     const arith = this.parseArithExpr();
     const after = this.peek();
     if (arith !== null && (after?.type === 'comma' || after?.type === 'rparen')) return arith;
     this.pos = save;
     return this.parseOr();
   }
   ```
   `parseTerm` now calls `parseUnary()` instead of `parseFactor()`.
4. `parseNumericAll` wraps the null-returning helpers: when `parseArithExpr()` returns null, decide the message by the token at the failure position: no token → `'Ausdruck endet vorzeitig.'`; an unclosed `(` (count of lparen > rparen in the token list) → `'Fehlende schließende Klammer.'`; otherwise `'Ausdruck erwartet.'`. Trailing tokens → `'Unerwartetes Token am Ende des Ausdrucks.'`.

Exports:
```ts
export function parseCondition(src: string): Node | null {
  if (!src || !src.trim()) return null;
  const t = tokenize(src); if (!t.ok || t.tokens.length === 0) return null;
  return new Parser(t.tokens).parse();
}
export function parseNumeric(src: string): ParseNumericResult {
  const t = tokenize(src); if (!t.ok) return t;
  if (t.tokens.length === 0) return { ok: false, message: 'Ausdruck endet vorzeitig.' };
  try { return { ok: true, node: new Parser(t.tokens).parseNumericAll() }; }
  catch (e) { return { ok: false, message: e instanceof Error ? e.message : String(e) }; }
}
export function parseExpression(src: string): Expr | null {
  const cond = parseCondition(src);
  if (cond !== null && cond.kind !== 'truthy') return cond;   // a bare ident is arithmetic in this entry point
  const num = parseNumeric(src);
  return num.ok ? num.node : cond;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run --project unit src/lib/expr/__tests__/parser.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 7: Commit**

```bash
git add src/lib/expr/tokens.ts src/lib/expr/ast.ts src/lib/expr/parser.ts src/lib/expr/__tests__/parser.test.ts
git commit -m "feat(expr): one tokenizer + parser for conditions and formulas (^, function calls, IF…THEN vs if())"
```

---

### Task 2: `src/lib/expr/` functions, scope, evaluator (two modes, one core)

**Files:**
- Create: `src/lib/expr/functions.ts`, `src/lib/expr/scope.ts`, `src/lib/expr/evaluate.ts`, `src/lib/expr/index.ts`
- Test: `src/lib/expr/__tests__/evaluate.test.ts`, `src/lib/expr/__tests__/row-functions.test.ts`
- Reference: `src/lib/compliance/evaluate.ts:372-526` (lenient evaluator to port), `src/lib/eval/arithmetic.ts:29-66,204-272` (strict semantics + messages to reproduce)

**Interfaces:**
- Consumes: Task 1 types and parsers.
- Produces:
  ```ts
  // functions.ts
  export const MATH_FUNCTIONS_1: Record<string, (x: number) => number>;   // ln, log10, sqrt, exp, abs
  export const MATH_FUNCTIONS_2: Record<string, (a: number, b: number) => number>; // min, max
  export const ROW_FUNCTIONS = ['sum_rows', 'count_rows', 'max_rows', 'min_rows', 'mean_rows', 'stdev_rows', 'last_rows'] as const;
  export const LOGIC_FUNCTIONS = ['if', 'lookup', 'contains', 'cell', 'flag'] as const;
  export const EXPR_FUNCTION_NAMES: ReadonlySet<string>;   // every canonical name above
  export function canonicalFunctionName(name: string): string | null; // math: case-insensitive + lg→log10; row/logic: exact lowercase; else null
  // scope.ts
  export type Value = number | string | boolean | null;
  export type RowValues = Record<string, Value>;
  export type PreparedRow = { id: string; values: RowValues; complete: boolean };
  export type PreparedRegister = { rows: PreparedRow[]; flags: Record<string, boolean> };
  export type TableRowValues = Record<string, Value>;
  export type Scope = {
    symbol: (sym: string) => Value | undefined;                       // undefined = no such value
    register?: (sym: string) => PreparedRegister | undefined;
    table?: (tableCode: string, keys: Value[]) => TableRowValues | undefined;
    carrier?: (sym: string) => unknown;                               // raw json for contains()/cell()
  };
  export type EvalResult =
    | { kind: 'pass' } | { kind: 'fail'; reason?: string }
    | { kind: 'pending'; missingSymbols: string[] } | { kind: 'manual' }
    | { kind: 'not_applicable'; hiddenSymbols: string[] };
  export type ConditionOptions = { hiddenSymbols?: ReadonlySet<string> };
  export class ExprError extends Error { constructor(message: string, public readonly recoverable: boolean) }
  // evaluate.ts
  export function evalNumber(src: string, scope: Scope): number;                     // strict; throws ExprError / parse Error
  export function evalValue(node: Expr, scope: Scope, row?: RowValues): Value;       // strict; used by register-rows for derived cells
  export function evalCondition(src: string, scope: Scope, opts?: ConditionOptions): EvalResult;
  export function evaluateNodeLenient(n: Node, scope: Scope): 'true' | 'false' | 'missing';
  export function evaluateArithLenient(n: ArithNode, scope: Scope): number | null;
  export function extractSymbols(e: Expr): Set<string>;                              // free symbol refs (rules of evaluate.ts:562-593 + call args)
  export function unknownFunctionNames(e: Expr): string[];
  ```

- [ ] **Step 1: Write the failing evaluator tests**

```ts
// src/lib/expr/__tests__/evaluate.test.ts
import { describe, it, expect } from 'vitest';
import { evalNumber, evalCondition, evalValue, extractSymbols } from '../evaluate';
import { parseNumeric } from '../parser';
import type { Scope } from '../scope';

const sc = (vals: Record<string, number | string | boolean | null>): Scope => ({ symbol: (s) => (s in vals ? vals[s] : undefined) });

describe('evalNumber — strict mode reproduces arithmetic.ts', () => {
  it('computes with precedence, power and the 7 math functions (case-insensitive, lg alias)', () => {
    expect(evalNumber('2 + 3 * 4 ^ 2', sc({}))).toBe(50);
    expect(evalNumber('SQRT(16) + Lg(100) + min(3, 2) + max(1, abs(-5))', sc({}))).toBe(4 + 2 + 2 + 5);
    expect(evalNumber('e^(-k*t)', { symbol: (s) => ({ e: Math.E, k: 1, t: 0 } as Record<string, number>)[s] })).toBeCloseTo(1, 12);
  });
  it('throws the exact arithmetic.ts messages', () => {
    expect(() => evalNumber('a / 0', sc({ a: 1 }))).toThrow('Division durch Null.');
    expect(() => evalNumber('x + 1', sc({}))).toThrow('Unbekanntes Symbol "x" im Ausdruck.');
    expect(() => evalNumber('SUM(a)', sc({ a: 1 }))).toThrow('Funktionsaufruf "SUM(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.');
    expect(() => evalNumber('ln(0)', sc({}))).toThrow(/Nicht-endliches Ergebnis/);
    expect(() => evalNumber('a # 1', sc({ a: 1 }))).toThrow('Unerwartetes Zeichen "#" an Position 2.');
  });
  it('if() short-circuits and accepts a condition or a truthy value as its test', () => {
    expect(evalNumber("if(kind == 'paved', 1, 1/0)", sc({ kind: 'paved' }))).toBe(1);
    expect(evalNumber('if(flag, 10, 20)', sc({ flag: false }))).toBe(20);
    expect(evalNumber('if(n > 2 AND m IS NOT NULL, 1, 0)', sc({ n: 3, m: 'x' }))).toBe(1);
    expect(() => evalNumber("if(kind == 'paved', 1, 0)", sc({}))).toThrow('Fehlende Eingabe für if(): kind');
  });
  it('a top-level string result is not a number', () => {
    expect(() => evalNumber("lookup('TAB9', k, 'kind')", { ...sc({ k: 'a' }), table: () => ({ kind: 'paved' }) })).toThrow('Nicht-endliches Ergebnis: paved');
  });
});

describe('evalValue — strict, string results allowed', () => {
  it('lookup() resolves through Scope.table with the key values in order', () => {
    const calls: unknown[] = [];
    const scope: Scope = { ...sc({ tier: 'tier2', band: 'thick' }), table: (code, keys) => { calls.push([code, keys]); return { max: 50 }; } };
    const node = parseNumeric("lookup('TAB6', tier, band, 'max')");
    expect(node.ok && evalValue(node.node, scope)).toBe(50);
    expect(calls).toEqual([['TAB6', ['tier2', 'thick']]]);
  });
  it('lookup() with no matching row throws a recoverable error', () => {
    const node = parseNumeric("lookup('TAB9', k, 'cm')");
    expect(() => node.ok && evalValue(node.node, { ...sc({ k: 'nope' }), table: () => undefined })).toThrow("lookup(): keine Zeile in TAB9 für Schlüssel [nope]");
  });
  it('row values shadow scope symbols', () => {
    const node = parseNumeric('area_m2 * c_i');
    expect(node.ok && evalValue(node.node, sc({ area_m2: 1, c_i: 1 }), { area_m2: 100, c_i: 0.9 })).toBeCloseTo(90);
  });
});

describe('evalCondition — lenient mode reproduces compliance/evaluate.ts', () => {
  it('pass / fail / pending / manual', () => {
    expect(evalCondition('k_f >= 1e-6', sc({ k_f: 1e-5 }))).toEqual({ kind: 'pass' });
    expect(evalCondition('k_f >= 1e-6', sc({ k_f: 1e-7 }))).toEqual({ kind: 'fail' });
    expect(evalCondition('k_f >= 1e-6', sc({}))).toEqual({ kind: 'pending', missingSymbols: ['k_f'] });
    expect(evalCondition('Engineer attestation', sc({}))).toEqual({ kind: 'manual' });
    expect(evalCondition('V_Rueck >= Q * 25', sc({ V_Rueck: 100, Q: 0 }))).toEqual({ kind: 'pass' });
    expect(evalCondition('a / b > 1', sc({ a: 1, b: 0 }))).toEqual({ kind: 'pending', missingSymbols: [] });
  });
  it('a call with an unknown function name is manual, not fail', () => {
    expect(evalCondition('SUM(a) > 1', sc({ a: 1 }))).toEqual({ kind: 'manual' });
  });
  it('a hidden symbol makes the gate not_applicable before evaluation', () => {
    expect(evalCondition('x >= 1 AND y == 2', sc({ x: 5, y: 2 }), { hiddenSymbols: new Set(['y']) }))
      .toEqual({ kind: 'not_applicable', hiddenSymbols: ['y'] });
    expect(evalCondition('x >= 1', sc({ x: 5 }), { hiddenSymbols: new Set(['y']) })).toEqual({ kind: 'pass' });
  });
  it('count_rows() in a condition reads a register from the scope', () => {
    const reg = { rows: [{ id: '1', values: { v: 3 }, complete: true }, { id: '2', values: { v: 9 }, complete: true }, { id: '3', values: { v: 1 }, complete: false }], flags: {} };
    const scope: Scope = { ...sc({ limit: 5 }), register: () => reg };
    expect(evalCondition('count_rows(samples, v <= limit) >= 1', scope)).toEqual({ kind: 'pass' });
    expect(evalCondition('count_rows(samples) == 2', scope)).toEqual({ kind: 'pass' });
  });
});

describe('extractSymbols', () => {
  it('collects refs incl. call args, never string literals or enum-literal RHS', () => {
    const { parseCondition } = require('../parser');
    const n = parseCondition("lookup('TAB9', k, 'kind') == paved AND x IN {a, b}");
    expect([...extractSymbols(n)].sort()).toEqual(['k', 'x']);
  });
});
```

```ts
// src/lib/expr/__tests__/row-functions.test.ts
import { describe, it, expect } from 'vitest';
import { evalNumber } from '../evaluate';
import type { Scope, PreparedRegister } from '../scope';

const reg: PreparedRegister = {
  rows: [
    { id: 'a', values: { area_m2: 100, c_i: 0.9, kind: 'paved' }, complete: true },
    { id: 'b', values: { area_m2: 200, c_i: 0.3, kind: 'unpaved' }, complete: true },
    { id: 'c', values: { area_m2: 50, c_i: null, kind: null }, complete: false },
  ],
  flags: { not_applicable: false },
};
const scope: Scope = { symbol: () => undefined, register: (s) => (s === 'reg' ? reg : undefined) };

describe('row functions operate on complete rows only', () => {
  it('sum_rows / count_rows / max_rows / min_rows / mean_rows', () => {
    expect(evalNumber('sum_rows(reg, area_m2 * c_i)', scope)).toBeCloseTo(150, 6);
    expect(evalNumber("sum_rows(reg, if(kind == 'paved', area_m2, 0))", scope)).toBe(100);
    expect(evalNumber('count_rows(reg)', scope)).toBe(2);
    expect(evalNumber("count_rows(reg, kind == 'unpaved')", scope)).toBe(1);
    expect(evalNumber('max_rows(reg, area_m2)', scope)).toBe(200);
    expect(evalNumber('min_rows(reg, area_m2)', scope)).toBe(100);
    expect(evalNumber('mean_rows(reg, area_m2)', scope)).toBe(150);
  });
  it('stdev_rows is the SAMPLE standard deviation (n-1) and needs ≥ 2 rows', () => {
    expect(evalNumber('stdev_rows(reg, area_m2)', scope)).toBeCloseTo(Math.sqrt(((100 - 150) ** 2 + (200 - 150) ** 2) / 1), 9);
    const one: PreparedRegister = { rows: [reg.rows[0]], flags: {} };
    expect(() => evalNumber('stdev_rows(reg, area_m2)', { ...scope, register: () => one })).toThrow('stdev_rows(): mindestens 2 vollständige Zeilen erforderlich.');
  });
  it('last_rows(reg, n) is a register-valued argument', () => {
    expect(evalNumber('count_rows(last_rows(reg, 1), area_m2 > 150)', scope)).toBe(1);
    expect(evalNumber('sum_rows(last_rows(reg, 5), area_m2)', scope)).toBe(300);
  });
  it('zero complete rows: sum/max/min/mean throw the recoverable message, count returns 0', () => {
    const empty: PreparedRegister = { rows: [reg.rows[2]], flags: {} };
    const s: Scope = { ...scope, register: () => empty };
    expect(() => evalNumber('sum_rows(reg, area_m2)', s)).toThrow('Keine vollständigen Zeilen in "reg".');
    expect(evalNumber('count_rows(reg)', s)).toBe(0);
  });
  it('a missing register is an unknown symbol', () => {
    expect(() => evalNumber('sum_rows(nope, area_m2)', scope)).toThrow('Unbekanntes Symbol "nope" im Ausdruck.');
  });
  it('flag(), contains(), cell()', () => {
    expect(evalNumber("if(flag(reg, 'not_applicable'), 0, 1)", scope)).toBe(1);
    const s: Scope = { ...scope, carrier: (sym) => (sym === 'list' ? { selected: ['a', 'b'] } : sym === 'grid' ? { cells: { r1: { c1: 7 } } } : undefined) };
    expect(evalNumber("if(contains(list, 'a'), 1, 0)", s)).toBe(1);
    expect(evalNumber("cell(grid, 'r1', 'c1') * 2", s)).toBe(14);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run --project unit src/lib/expr/`
Expected: FAIL — `Cannot find module '../evaluate'`.

- [ ] **Step 3: Write `functions.ts` and `scope.ts`**

```ts
// src/lib/expr/functions.ts
export const MATH_FUNCTIONS_1: Record<string, (x: number) => number> = { ln: Math.log, log10: Math.log10, sqrt: Math.sqrt, exp: Math.exp, abs: Math.abs };
export const MATH_FUNCTIONS_2: Record<string, (a: number, b: number) => number> = { min: Math.min, max: Math.max };
const MATH_ALIASES: Record<string, string> = { lg: 'log10' }; // bare `log` stays UNSUPPORTED (ambiguous ln vs lg)
export const ROW_FUNCTIONS = ['sum_rows', 'count_rows', 'max_rows', 'min_rows', 'mean_rows', 'stdev_rows', 'last_rows'] as const;
export const LOGIC_FUNCTIONS = ['if', 'lookup', 'contains', 'cell', 'flag'] as const;
export const MATH_FUNCTION_NAMES: ReadonlySet<string> = new Set([...Object.keys(MATH_FUNCTIONS_1), ...Object.keys(MATH_FUNCTIONS_2)]);
export const EXPR_FUNCTION_NAMES: ReadonlySet<string> = new Set([...MATH_FUNCTION_NAMES, ...ROW_FUNCTIONS, ...LOGIC_FUNCTIONS]);
export function canonicalFunctionName(name: string): string | null {
  const lower = name.toLowerCase();
  const math = MATH_ALIASES[lower] ?? lower;
  if (MATH_FUNCTION_NAMES.has(math)) return math;
  if ((ROW_FUNCTIONS as readonly string[]).includes(name) || (LOGIC_FUNCTIONS as readonly string[]).includes(name)) return name;
  if (name === 'IF' || name === 'If') return 'if';
  return null;
}
```

`scope.ts`: the types from Interfaces plus
```ts
export class ExprError extends Error {
  constructor(message: string, public readonly recoverable: boolean) { super(message); this.name = 'ExprError'; }
}
```

- [ ] **Step 4: Write `evaluate.ts`**

One core, two modes. `Ctx = { scope: Scope; strict: boolean; missing: Set<string>; row?: RowValues }`.

```ts
// src/lib/expr/evaluate.ts
import { parseCondition, parseNumeric } from './parser';
import { isConditionNode, type ArithNode, type Expr, type Node } from './ast';
import { MATH_FUNCTIONS_1, MATH_FUNCTIONS_2, canonicalFunctionName } from './functions';
import { ExprError, type ConditionOptions, type EvalResult, type PreparedRegister, type RowValues, type Scope, type Value } from './scope';

type Ctx = { scope: Scope; strict: boolean; missing: Set<string>; row?: RowValues };

function fail(ctx: Ctx, message: string, recoverable = true): null {
  if (ctx.strict) throw new ExprError(message, recoverable);
  return null;
}
function readSymbol(ctx: Ctx, sym: string): Value | undefined {
  if (ctx.row && sym in ctx.row) return ctx.row[sym];
  return ctx.scope.symbol(sym);
}
function isMissing(v: Value | undefined): v is undefined | null | '' { return v === undefined || v === null || v === ''; }
function toNumber(v: Value): number | null {            // evaluate.ts:519-526
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : null; }
  return null;
}
function truthy(v: Value): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v !== '' && v.toLowerCase() !== 'false';
  return false;
}

/** Arithmetic core. Lenient: null + ctx.missing; strict: throws ExprError. Strings survive (lookup results). */
function evalValueCore(n: ArithNode, ctx: Ctx): Value | null {
  switch (n.kind) {
    case 'anum': return n.value;
    case 'astr': return n.value;
    case 'abool': return n.value;
    case 'anull': return null;
    case 'aref': {
      const v = readSymbol(ctx, n.symbol);
      if (isMissing(v)) { ctx.missing.add(n.symbol); return fail(ctx, `Unbekanntes Symbol "${n.symbol}" im Ausdruck.`); }
      return v;
    }
    case 'aneg': { const x = num(evalValueCore(n.inner, ctx), ctx); return x === null ? null : -x; }
    case 'abin': {
      const a = num(evalValueCore(n.left, ctx), ctx); const b = num(evalValueCore(n.right, ctx), ctx);
      if (a === null || b === null) return null;
      let res: number;
      switch (n.op) {
        case '+': res = a + b; break; case '-': res = a - b; break; case '*': res = a * b; break;
        case '/': if (b === 0) return fail(ctx, 'Division durch Null.'); res = a / b; break;
        case '^': res = Math.pow(a, b); break;
      }
      return Number.isFinite(res) ? res : fail(ctx, `Nicht-endliches Ergebnis: ${String(res)}`);
    }
    case 'call': return evalCall(n, ctx);
  }
}
/** Coerce an operand to a number the way evaluate.ts:377-403 did (abool/anull → null, numeric strings ok). */
function num(v: Value | null, ctx: Ctx): number | null {
  if (v === null) return null;
  const x = toNumber(v);
  return x === null ? fail(ctx, `Operand ist keine Zahl: ${String(v)}`) : x;
}
```

`evalCall(n, ctx)`:
- `canonicalFunctionName(n.name)` null → `fail(ctx, \`Funktionsaufruf "${n.name}(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.\`)`.
- Math 1/2-arg: evaluate args with `num(evalValueCore(argAsArith))`; an arg that is a condition node → `fail(ctx, 'Bedingung als Zahl verwendet.')`; wrong arity → `fail(ctx, \`Erwarte ${k} Argument(e) in ${name}(...)\`)`; result non-finite → the `Nicht-endliches Ergebnis` message.
- `if`: 3 args. Test = `args[0]`: condition node → `evalNodeCore(args[0], ctx)`; `'missing'` → `fail(ctx, \`Fehlende Eingabe für if(): ${[...ctx.missing].join(', ')}\`)`; arith node → `truthy(value)` (null → missing handling as above). Evaluate ONLY the taken branch.
- `lookup`: ≥ 3 args; `args[0]` and last must be `astr` else `fail(ctx, "lookup(): Tabellencode und Spaltenname müssen Zeichenketten sein.")`; keys = middle args via `evalValueCore` (null → return null / already failed); `ctx.scope.table?.(code, keys)` undefined → `fail(ctx, \`lookup(): keine Zeile in ${code} für Schlüssel [${keys.map(String).join(', ')}]\`)`; column absent → `fail(ctx, \`lookup(): Spalte ${col} nicht in ${code}\`, false)`.
- Register-valued args — `resolveRegister(e: Expr, ctx): { reg: PreparedRegister; name: string } | null`: `aref` → `ctx.scope.register?.(sym)`; undefined → `ctx.missing.add(sym); fail(ctx, \`Unbekanntes Symbol "${sym}" im Ausdruck.\`)`; `call last_rows(regExpr, n)` → `{ reg: { rows: completeRows.slice(-n), flags }, name }`; anything else → `fail(ctx, 'Registerausdruck erwartet.', false)`.
- `sum_rows/max_rows/min_rows/mean_rows(reg, expr)`: rows = `reg.rows.filter(r => r.complete)`; empty → `fail(ctx, \`Keine vollständigen Zeilen in "${name}".\`)` (lenient also `ctx.missing.add(name)`); per row `num(evalValueCore(expr, { ...ctx, row: r.values }))`; null → propagate null (strict already threw).
- `count_rows(reg[, cond])`: complete rows; with cond: condition node → `evalNodeCore` in row ctx === 'true'; arith node → `truthy`. Returns the count (0 allowed).
- `stdev_rows`: n < 2 → `fail(ctx, 'stdev_rows(): mindestens 2 vollständige Zeilen erforderlich.')`; sample stdev (divide by n−1).
- `contains(sym, 'x')`: `ctx.scope.carrier?.(sym)`; accepts `string[]` or `{ selected: string[] }`; undefined → missing; returns boolean.
- `cell(sym, 'r', 'c')`: carrier `{ cells: Record<string, Record<string, Value>> }`; absent → null (lenient) / `fail(ctx, \`cell(): ${r}/${c} nicht vorhanden\`)`.
- `flag(sym, 'key')`: register via `resolveRegister`; `reg.flags[key] === true`.

`evalNodeCore(n: Node, ctx): 'true' | 'false' | 'missing'` = port of `evaluate.ts:405-485` with `lookup` replaced by `readSymbol(ctx, …)` and `evalArith` replaced by `num(evalValueCore(…, lenientCopy))`, where `lenientCopy = { ...ctx, strict: false }` — conditions never throw.

Entry points:
```ts
export function evalNumber(src: string, scope: Scope): number {
  const p = parseNumeric(src);
  if (!p.ok) throw new Error(p.message);
  const v = evalValueCore(p.node, { scope, strict: true, missing: new Set() });
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ExprError(`Nicht-endliches Ergebnis: ${String(v)}`, true);
  return v;
}
export function evalValue(node: Expr, scope: Scope, row?: RowValues): Value {
  const ctx: Ctx = { scope, strict: true, missing: new Set(), row };
  if (isConditionNode(node)) { const t = evalNodeCore(node, ctx); if (t === 'missing') throw new ExprError(`Fehlende Eingabe: ${[...ctx.missing].join(', ')}`, true); return t === 'true'; }
  return evalValueCore(node, ctx) as Value;
}
export function evalCondition(src: string, scope: Scope, opts?: ConditionOptions): EvalResult {
  const ast = parseCondition(src);
  if (!ast) return { kind: 'manual' };
  if (unknownFunctionNames(ast).length > 0) return { kind: 'manual' };
  if (opts?.hiddenSymbols?.size) {
    const hidden = [...extractSymbols(ast)].filter((s) => opts.hiddenSymbols!.has(s));
    if (hidden.length > 0) return { kind: 'not_applicable', hiddenSymbols: hidden };
  }
  const ctx: Ctx = { scope, strict: false, missing: new Set() };
  const r = evalNodeCore(ast, ctx);
  if (r === 'missing') return { kind: 'pending', missingSymbols: [...ctx.missing] };
  return r === 'true' ? { kind: 'pass' } : { kind: 'fail' };
}
export function evaluateNodeLenient(n: Node, scope: Scope) { return evalNodeCore(n, { scope, strict: false, missing: new Set() }); }
export function evaluateArithLenient(n: ArithNode, scope: Scope): number | null {
  const v = evalValueCore(n, { scope, strict: false, missing: new Set() }); return v === null ? null : toNumber(v);
}
```
`extractSymbols` = the walker at `evaluate.ts:568-591` plus `call` → walk every arg (arith args via `walkArith`, condition args via `walk`); `astr` args contribute nothing. `unknownFunctionNames` walks `call` nodes and returns names whose `canonicalFunctionName` is null.

`index.ts` re-exports everything public from the five modules.

- [ ] **Step 5: Run the expr tests**

Run: `pnpm vitest run --project unit src/lib/expr/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/expr
git commit -m "feat(expr): one evaluator core with strict/lenient modes, row + logic functions, not_applicable result"
```

---

### Task 3: Rewire `compliance/evaluate.ts`, `explain.ts`, `eval/arithmetic.ts` onto `expr` (pins: every existing suite)

**Files:**
- Rewrite: `src/lib/compliance/evaluate.ts`, `src/lib/eval/arithmetic.ts`
- Modify: `src/lib/compliance/explain.ts:11-18,175-204`
- Test (existing, must stay green untouched): `src/lib/compliance/evaluate.test.ts`, `src/lib/compliance/evaluate.arith.test.ts`, `src/lib/compliance/__tests__/*.test.ts`, `src/lib/eval/arithmetic.test.ts`, `src/lib/eval/formula*.test.ts`, `src/lib/eval/__tests__/normalize-formula.test.ts`, `src/lib/eval/__tests__/engine-eligibility.test.ts`
- Test (create): `src/lib/compliance/__tests__/evaluate-adapter.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces (unchanged names, widened):
  ```ts
  // compliance/evaluate.ts
  export type EvalResult   // now includes { kind: 'not_applicable'; hiddenSymbols: string[] }
  export type ConditionValue = Value; export type ConditionNode = Node; export type ConditionArithNode = ArithNode; export type ConditionOptions;
  export function evaluateCondition(condition: string, valuesBySymbol: (sym: string) => Value | undefined, opts?: ConditionOptions): EvalResult;
  export function extractConditionSymbols(condition: string): Set<string> | null;
  export function parseCondition(condition: string): Node | null;
  export function evaluateNode(n: Node, lookup: (sym: string) => Value | undefined): 'true' | 'false' | 'missing';
  export function evaluateArithNode(n: ArithNode, lookup: (sym: string) => Value | undefined): number | null;
  export function jsonConditionValue(json: unknown): string | null;   // moved verbatim
  // eval/arithmetic.ts
  export const SUPPORTED_FUNCTIONS: ReadonlySet<string>;   // = EXPR_FUNCTION_NAMES
  export function canonicalFunctionName(name: string): string | null;
  export type EvalExtras = { registers?: Record<string, PreparedRegister>; table?: Scope['table']; carriers?: Record<string, unknown> };
  export function evalExpression(expression: string, scope: Record<string, number>, extra?: EvalExtras): number;
  ```

- [ ] **Step 1: Write the adapter test**

```ts
// src/lib/compliance/__tests__/evaluate-adapter.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateCondition, extractConditionSymbols, parseCondition, evaluateNode } from '../evaluate';
import { evalExpression, SUPPORTED_FUNCTIONS } from '@/lib/eval/arithmetic';

describe('compliance/evaluate.ts is a thin adapter over src/lib/expr', () => {
  it('keeps the 4 legacy kinds and adds not_applicable via opts', () => {
    const lookup = (s: string) => ({ a: 1 } as Record<string, number>)[s];
    expect(evaluateCondition('a >= 1', lookup)).toEqual({ kind: 'pass' });
    expect(evaluateCondition('a >= 1', lookup, { hiddenSymbols: new Set(['a']) })).toEqual({ kind: 'not_applicable', hiddenSymbols: ['a'] });
  });
  it('extractConditionSymbols still returns null for prose and excludes enum literals', () => {
    expect(extractConditionSymbols('Engineer attestation')).toBeNull();
    expect([...extractConditionSymbols('investment_type IN {ersatz, erneuerung}')!]).toEqual(['investment_type']);
  });
  it('evaluateNode reuses the same AST', () => {
    const n = parseCondition('x == 1')!;
    expect(evaluateNode(n, () => 1)).toBe('true');
  });
});

describe('eval/arithmetic.ts is a thin adapter over evalNumber', () => {
  it('field named e wins over the constant; pi falls back', () => {
    expect(evalExpression('e * 2', { e: 3 })).toBe(6);
    expect(evalExpression('pi', {})).toBeCloseTo(Math.PI);
  });
  it('SUPPORTED_FUNCTIONS now includes row/logic names', () => {
    expect(SUPPORTED_FUNCTIONS.has('sqrt')).toBe(true);
    expect(SUPPORTED_FUNCTIONS.has('sum_rows')).toBe(true);
  });
  it('registers reach the evaluator through extra', () => {
    const reg = { rows: [{ id: '1', values: { x: 2 }, complete: true }], flags: {} };
    expect(evalExpression('sum_rows(r, x) + y', { y: 1 }, { registers: { r: reg } })).toBe(3);
  });
});
```

- [ ] **Step 2: Run the whole compliance + eval suites to record the baseline**

Run: `pnpm vitest run --project unit src/lib/compliance src/lib/eval`
Expected: baseline PASS (record the counts), the new adapter test FAILS (`evalExpression` has no third param / `not_applicable` unknown).

- [ ] **Step 3: Rewrite `compliance/evaluate.ts`**

Keep the file's doc comment (`:1-24`). Replace everything else with:

```ts
import { evalCondition, evaluateNodeLenient, evaluateArithLenient, extractSymbols, parseCondition as parseExprCondition } from '@/lib/expr';
import type { ArithNode, Node } from '@/lib/expr';
import type { ConditionOptions as ExprConditionOptions, EvalResult as ExprEvalResult, Value } from '@/lib/expr';

export type EvalResult = ExprEvalResult;
export type ConditionOptions = ExprConditionOptions;
export type ConditionValue = Value;
export type ConditionNode = Node;
export type ConditionArithNode = ArithNode;

export function evaluateCondition(condition: string, valuesBySymbol: (sym: string) => Value | undefined, opts?: ConditionOptions): EvalResult {
  if (!condition || !condition.trim()) return { kind: 'manual' };
  return evalCondition(condition, { symbol: valuesBySymbol }, opts);
}
export function extractConditionSymbols(condition: string): Set<string> | null {
  const ast = parseExprCondition(condition);
  return ast ? extractSymbols(ast) : null;
}
export function parseCondition(condition: string): Node | null { return parseExprCondition(condition); }
export function evaluateNode(n: Node, lookup: (sym: string) => Value | undefined) { return evaluateNodeLenient(n, { symbol: lookup }); }
export function evaluateArithNode(n: ArithNode, lookup: (sym: string) => Value | undefined) { return evaluateArithLenient(n, { symbol: lookup }); }
export function jsonConditionValue(json: unknown): string | null { /* verbatim from :636-647 */ }
```

- [ ] **Step 4: Rewrite `eval/arithmetic.ts`**

Keep the doc comment (`:1-26`, add one line: "Since Plan 2a the grammar lives in `src/lib/expr`; this file is the numeric adapter."). Body:

```ts
import { evalNumber, EXPR_FUNCTION_NAMES, canonicalFunctionName as canon, type PreparedRegister, type Scope } from '@/lib/expr';
export const SUPPORTED_FUNCTIONS: ReadonlySet<string> = EXPR_FUNCTION_NAMES;
export function canonicalFunctionName(name: string): string | null { return canon(name); }
const CONSTANTS: Record<string, number> = { e: Math.E, pi: Math.PI };
export type EvalExtras = { registers?: Record<string, PreparedRegister>; table?: Scope['table']; carriers?: Record<string, unknown> };
export function evalExpression(expression: string, scope: Record<string, number>, extra?: EvalExtras): number {
  const values = new Map(Object.entries(scope));
  const exprScope: Scope = {
    symbol: (sym) => (values.has(sym) ? values.get(sym) : sym in CONSTANTS ? CONSTANTS[sym] : undefined),
    register: extra?.registers ? (sym) => extra.registers![sym] : undefined,
    table: extra?.table,
    carrier: extra?.carriers ? (sym) => extra.carriers![sym] : undefined,
  };
  return evalNumber(expression, exprScope);
}
```

- [ ] **Step 5: Update `explain.ts`**

`arithToText` gains `case 'call': return \`${n.name}(${n.args.map(exprToText).join(', ')})\`;` and `abin` already prints `n.op` (`^` included). Add `function exprToText(e: Expr): string { return isConditionNode(e) ? nodeToText(e) : arithToText(e); }` importing `isConditionNode` and `Expr` from `@/lib/expr`. `isNumericLiteral` unchanged. No other change.

- [ ] **Step 6: Run all suites**

Run: `pnpm vitest run --project unit src/lib/compliance src/lib/eval && pnpm -s typecheck`
Expected: every pre-existing test PASS with the counts from Step 2; the adapter test PASS; tsc exit 0. If any pre-existing assertion pins a message this refactor changed, do NOT edit the assertion — fix the evaluator to emit the pinned message (the messages in Task 2 were copied from `arithmetic.ts`; a mismatch means a port error).

- [ ] **Step 7: Commit**

```bash
git add src/lib/compliance/evaluate.ts src/lib/compliance/explain.ts src/lib/eval/arithmetic.ts src/lib/compliance/__tests__/evaluate-adapter.test.ts
git commit -m "refactor(expr): compliance/evaluate.ts and eval/arithmetic.ts become adapters over src/lib/expr (no behaviour change)"
```

---

### Task 4: `normalize-formula.ts` + `engine-eligibility.ts` learn the function set

**Files:**
- Modify: `src/lib/eval/normalize-formula.ts:34-45`, `src/lib/eval/engine-eligibility.ts:35,51-61`
- Test: `src/lib/eval/__tests__/normalize-formula.test.ts` (extend), `src/lib/eval/__tests__/engine-eligibility.test.ts` (extend)

**Interfaces:**
- Consumes: `EXPR_FUNCTION_NAMES`, `canonicalFunctionName` (Task 2).
- Produces: `normalizeFormula('count_rows(reg)') === 'count_rows(reg)'`; `validateEngineEligibility('A_C = sum_rows(surface_inventory, area_m2 * c_i)', ['surface_inventory'], fields∋surface_inventory).verified === true`; `SUM(...)` still rejected.

- [ ] **Step 1: Extend both tests**

```ts
// append to normalize-formula.test.ts
it('Plan 2a: row/logic function calls are never rewritten to ident_arg', () => {
  expect(normalizeFormula('count_rows(reg)')).toBe('count_rows(reg)');
  expect(normalizeFormula("flag(reg, 'x') + r_D(n)")).toBe("flag(reg, 'x') + r_D_n");
});
// append to engine-eligibility.test.ts
it('Plan 2a: supported calls pass, SUM still fails', () => {
  const f = new Set(['surface_inventory', 'A_C']);
  expect(validateEngineEligibility('A_C = sum_rows(surface_inventory, area_m2 * c_i)', ['surface_inventory'], f).verified).toBe(true);
  expect(validateEngineEligibility('A_C = SUM(surface_inventory)', ['surface_inventory'], f).verified).toBe(false);
  expect(validateEngineEligibility('x = sqrt(A_C)', ['A_C'], f).verified).toBe(true);
});
```

- [ ] **Step 2: Run → FAIL** (`pnpm vitest run --project unit src/lib/eval/__tests__/normalize-formula.test.ts src/lib/eval/__tests__/engine-eligibility.test.ts`)

- [ ] **Step 3: Implement**

`normalize-formula.ts`: build the regex from the function set:
```ts
import { EXPR_FUNCTION_NAMES, canonicalFunctionName } from '@/lib/expr';
const EXCLUDED = [...EXPR_FUNCTION_NAMES, 'log', 'lg'].join('|');
const FN_LIKE = new RegExp(`(?<![A-Za-z0-9_])(?!(?:${EXCLUDED})\\s*\\()([A-Za-z_][A-Za-z0-9_]*)\\s*\\(\\s*([A-Za-z0-9_]+)\\s*\\)`, 'gi');
```
(`i` flag so `SQRT(x)` is excluded like `sqrt(x)`; `rewrite()` keeps its `canonicalFunctionName(name) !== null ? match : …` guard.)

`engine-eligibility.ts`: replace the `SURVIVING_FN_CALL.test(...)` block with
```ts
const CALL = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
const unsupported = [...normalizedFormula.matchAll(CALL)].map((m) => m[1]).filter((name) => canonicalFunctionName(name) === null);
if (unsupported.length > 0) return { verified: false, reason: `nicht engine-verifiziert: nicht unterstützte Funktion/Aggregat im Formeltext (${unsupported.join(', ')})`, unresolved: [] };
```
Keep check (2) unchanged. Then read `src/lib/eval/equation-manual-denylist.ts:80-140` (the caller) and confirm nothing there re-rejects supported calls; if it does, adjust the same way and add one test.

- [ ] **Step 4: Run → PASS**, then the full unit suite once: `pnpm test` (expected: green; `engine-rescan`-style pins that counted sqrt formulas as ineligible would flip — if one does, it is a pin of the OLD gate; update it with a `// Plan 2a:` note).

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/normalize-formula.ts src/lib/eval/engine-eligibility.ts src/lib/eval/__tests__/normalize-formula.test.ts src/lib/eval/__tests__/engine-eligibility.test.ts
git commit -m "feat(eval): normaliser + eligibility gate recognise the expr function set; SUM stays rejected"
```

---

### Task 5: Register rows, register configs (TS fallback), table lookup with fallback

**Files:**
- Create: `src/lib/eval/register-rows.ts`, `src/lib/eval/register-configs.ts`, `src/lib/eval/regulation-tables-fallback.ts`
- Test: `src/lib/eval/__tests__/register-rows.test.ts`, `src/lib/eval/__tests__/register-configs.test.ts`
- Reference: `src/lib/eval/field-config.ts` (the `registerColumn` / `registerUi` zod contracts — `RegisterColumn`, `RegisterUiConfig`), `src/lib/eval/surface-inventory.ts:23-112` (legacy replay + completeness to reproduce), `src/lib/eval/pollutant-register.ts:60-94`, `src/lib/eval/regulation-tables.ts` (`getTable`, `lookupRow`, `rowKeyFor`), `src/lib/eval/regulation-tables-seed-a138.ts` (`a138SeedTables()`), `src/lib/vsme/pollutants.ts` (`POLLUTANTS`)

**Interfaces:**
- Consumes: Task 2 (`evalValue`, `Scope`, `PreparedRegister`, `parseExpression`), Plan 1 (`parseFieldConfig`, `RegisterColumn`, `RegisterUiConfig`).
- Produces:
  ```ts
  // regulation-tables-fallback.ts
  export function resolveRegulationTable(standardCode: string, tableCode: string): RegulationTable | undefined; // registry (latest edition) → A138 seed builders → undefined
  export function makeTableLookup(standardCode: string): NonNullable<Scope['table']>;   // (code, keys) → row.values, keys matched in key_columns order
  export function makeTableRows(standardCode: string): (tableCode: string) => RegulationRow[] | undefined;
  // register-rows.ts
  export type RegisterRowsCtx = { table?: Scope['table']; tableRows?: (tableCode: string) => RegulationRow[] | undefined; symbol?: Scope['symbol'] };
  export type RegisterRowsOpts = { legacyMap?: Record<string, Record<string, string>>; flagKeys?: readonly string[]; overrideFlagKey?: string };
  export function prepareRegisterRows(carrierRaw: unknown, columns: readonly RegisterColumn[], ctx: RegisterRowsCtx, opts?: RegisterRowsOpts): PreparedRegister;
  // register-configs.ts
  export const REGISTER_CONFIGS_FALLBACK: Readonly<Record<string, RegisterUiConfig>>;   // keys: 'surface_inventory', 'pollutant_register'
  export function registerFlagKeys(symbol: string): readonly string[];                  // 'pollutant_register' → ['not_applicable'], else []
  export type RegisterFieldLike = { symbol: string; dataType: string; widget?: string | null; uiConfig?: unknown };
  export function resolveRegisterConfig(f: RegisterFieldLike): RegisterUiConfig | null;  // DB (widget==='register') wins; fallback only while widget == null
  export type FallbackEquation = { id: string; equationNumber: string; formula: string; inputSymbols: string[]; outputSymbol: string; clauseReference: string | null; description: string | null };
  export const FALLBACK_REGISTER_EQUATIONS: Readonly<Record<string, readonly FallbackEquation[]>>;   // by worksheet_templates.code: 'VSME-B04.100'
  export function withFallbackRegisterEquations<E extends { outputSymbol: string | null }>(worksheetCode: string, equations: E[]): Array<E | FallbackEquation>; // appends a fallback only when no equation already outputs that symbol
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/eval/__tests__/register-rows.test.ts
import { describe, it, expect } from 'vitest';
import { prepareRegisterRows } from '../register-rows';
import { REGISTER_CONFIGS_FALLBACK, registerFlagKeys } from '../register-configs';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { POLLUTANTS } from '@/lib/vsme/pollutants';

const surface = REGISTER_CONFIGS_FALLBACK.surface_inventory;
const ctx = { table: makeTableLookup('DWA-A-138-1'), tableRows: makeTableRows('DWA-A-138-1') };
const surfaceOpts = { legacyMap: surface.legacy_map, overrideFlagKey: surface.override?.flag_key };

describe('prepareRegisterRows — A138 surface_inventory parity', () => {
  it('typed cells, derived kind + a_c_i, completeness = required columns non-null', () => {
    const reg = prepareRegisterRows({ rows: [
      { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: 'bad', label: 'Unbestimmt', tab9_value: null, area_m2: 200, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ] }, surface.columns, ctx, surfaceOpts);
    expect(reg.rows[0].complete).toBe(true);
    expect(reg.rows[0].values).toMatchObject({ area_m2: 3786.8, c_i: 0.9, c_s: 1, kind: 'paved' });
    expect(reg.rows[0].values.a_c_i as number).toBeCloseTo(3408.12, 6);
    expect(reg.rows[1].complete).toBe(false);
    expect(reg.rows[1].values.kind).toBeNull();
  });
  it('replays the legacy surface_type shape exactly like normalizeSurfaceCarrier (asphalt maps, dach does not)', () => {
    const reg = prepareRegisterRows({ rows: [
      { id: 'g', label: 'Gewächshausdach', surface_type: 'dach', area_m2: 3786.8, c_i: 0.9, c_s: 1.0 },
      { id: 'p', label: 'Parkplatz', surface_type: 'asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0 },
    ] }, surface.columns, ctx, surfaceOpts);
    expect(reg.rows[0].values.tab9_value).toBeNull();          // (0.9, 1.0) matches several Tab. 9 rows ⇒ reselection
    expect(reg.rows[0].complete).toBe(false);
    expect(reg.rows[1].values.tab9_value).toBe('schwarzdecke_asphalt');
    expect(reg.rows[1].values.coeff_override).toBe(false);
    expect(reg.rows[1].complete).toBe(true);
  });
  it('an overridden c_i is kept (audited override), a null lookup_value cell is refilled from the table', () => {
    const reg = prepareRegisterRows({ rows: [
      { id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.75, c_s: 1.0, coeff_override: true },
      { id: 's', label: 'Rasen', tab9_value: 'park_flach', area_m2: 100, c_i: null, c_s: null, coeff_override: false },
    ] }, surface.columns, ctx, surfaceOpts);
    expect(reg.rows[0].values.c_i).toBe(0.75);
    expect(reg.rows[1].values).toMatchObject({ c_i: 0.1, c_s: 0.2, kind: 'unpaved' });
    expect(reg.rows[1].complete).toBe(true);
  });
  it('pollutant_register: enum options validate, min:0 enforces completeness, flag is read', () => {
    const cols = REGISTER_CONFIGS_FALLBACK.pollutant_register.columns;
    const p = POLLUTANTS[0].value;
    const reg = prepareRegisterRows({ not_applicable: true, rows: [
      { id: 'a', label: 'Kessel', pollutant: p, medium: 'air', amount_t: 1.5 },
      { id: 'b', label: 'x', pollutant: 'NOT-A-POLLUTANT', medium: 'air', amount_t: 1 },
      { id: 'c', label: 'y', pollutant: p, medium: 'water', amount_t: -1 },
    ] }, cols, {}, { flagKeys: registerFlagKeys('pollutant_register') });
    expect(reg.flags).toEqual({ not_applicable: true });
    expect(reg.rows.map((r) => r.complete)).toEqual([true, false, false]);
    expect(reg.rows[1].values.pollutant).toBeNull();
  });
  it('null / non-object carriers give an empty register', () => {
    expect(prepareRegisterRows(null, surface.columns, ctx)).toEqual({ rows: [], flags: {} });
    expect(prepareRegisterRows({ rows: 'x' }, surface.columns, ctx)).toEqual({ rows: [], flags: {} });
  });
});
```

```ts
// src/lib/eval/__tests__/register-configs.test.ts
import { describe, it, expect } from 'vitest';
import { parseFieldConfig } from '../field-config';
import { REGISTER_CONFIGS_FALLBACK, resolveRegisterConfig, withFallbackRegisterEquations, FALLBACK_REGISTER_EQUATIONS } from '../register-configs';
import { validateEngineEligibility } from '../engine-eligibility';

describe('REGISTER_CONFIGS_FALLBACK', () => {
  it('every fallback config passes the Plan-1 zod contract', () => {
    for (const [symbol, ui] of Object.entries(REGISTER_CONFIGS_FALLBACK)) {
      expect(() => parseFieldConfig({ widget: 'register', uiConfig: ui, lookup: null, visibleWhen: null }), symbol).not.toThrow();
    }
  });
  it('DB config wins; fallback only while widget IS NULL', () => {
    const db = { title: 'DB', columns: [{ key: 'a', type: 'text', label: 'A' }] };
    expect(resolveRegisterConfig({ symbol: 'surface_inventory', dataType: 'json', widget: 'register', uiConfig: db })?.title).toBe('DB');
    expect(resolveRegisterConfig({ symbol: 'surface_inventory', dataType: 'json', widget: null })?.title).toBe('Flächenverzeichnis');
    expect(resolveRegisterConfig({ symbol: 'surface_inventory', dataType: 'json', widget: 'select_many' })).toBeNull();
    expect(resolveRegisterConfig({ symbol: 'other', dataType: 'json', widget: null })).toBeNull();
  });
});

describe('FALLBACK_REGISTER_EQUATIONS', () => {
  it('VSME-B04.100 carries the three per-medium sums, engine-eligible', () => {
    const eqs = FALLBACK_REGISTER_EQUATIONS['VSME-B04.100'];
    expect(eqs.map((e) => e.outputSymbol)).toEqual(['AmountOfEmissionToAir', 'AmountOfEmissionToWater', 'AmountOfEmissionToSoil']);
    for (const e of eqs) expect(validateEngineEligibility(e.formula, e.inputSymbols, new Set(['pollutant_register'])).verified).toBe(true);
  });
  it('withFallbackRegisterEquations appends only missing outputs', () => {
    const own = [{ id: 'x', outputSymbol: 'AmountOfEmissionToAir' }];
    const merged = withFallbackRegisterEquations('VSME-B04.100', own);
    expect(merged.map((e) => e.outputSymbol)).toEqual(['AmountOfEmissionToAir', 'AmountOfEmissionToWater', 'AmountOfEmissionToSoil']);
    expect(withFallbackRegisterEquations('A138-07', own)).toEqual(own);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`pnpm vitest run --project unit src/lib/eval/__tests__/register-rows.test.ts src/lib/eval/__tests__/register-configs.test.ts`)

- [ ] **Step 3: Write `regulation-tables-fallback.ts`**

```ts
import { getTable, type RegulationRow, type RegulationTable } from './regulation-tables';
import { a138SeedTables } from './regulation-tables-seed-a138';
import type { Scope, Value } from '@/lib/expr';

let seedCache: Map<string, RegulationTable> | null = null;   // key `${standard_code}|${table_code}`
function seedTables(): Map<string, RegulationTable> {
  if (!seedCache) { seedCache = new Map(); for (const t of a138SeedTables()) seedCache.set(`${t.standard_code}|${t.table_code}`, t); }
  return seedCache;
}
/** Registry (latest edition) first — the form/server registered DB rows there; the TS seed builders are the deploy-before-seed fallback. */
export function resolveRegulationTable(standardCode: string, tableCode: string): RegulationTable | undefined {
  return getTable(standardCode, undefined, tableCode) ?? seedTables().get(`${standardCode}|${tableCode}`);
}
export function makeTableRows(standardCode: string): (tableCode: string) => RegulationRow[] | undefined {
  return (tableCode) => resolveRegulationTable(standardCode, tableCode)?.rows;
}
export function makeTableLookup(standardCode: string): NonNullable<Scope['table']> {
  return (tableCode, keys) => {
    const t = resolveRegulationTable(standardCode, tableCode);
    if (!t || keys.length !== t.key_columns.length) return undefined;
    const want = keys.map((k) => (k == null ? '' : String(k)));
    const row = t.rows.find((r) => t.key_columns.every((col, i) => String(r.keys[col] ?? '') === want[i]));
    return row ? (row.values as Record<string, Value>) : undefined;
  };
}
```

- [ ] **Step 4: Write `register-rows.ts`**

```ts
import { parseExpression, evalValue, type PreparedRegister, type PreparedRow, type RowValues, type Scope, type Value } from '@/lib/expr';
import type { RegulationRow } from './regulation-tables';
import type { RegisterColumn } from './field-config';

export type RegisterRowsCtx = { table?: Scope['table']; tableRows?: (tableCode: string) => RegulationRow[] | undefined; symbol?: Scope['symbol'] };
export type RegisterRowsOpts = { legacyMap?: Record<string, Record<string, string>>; flagKeys?: readonly string[]; overrideFlagKey?: string };

function genId(): string { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function num(v: unknown): number | null { return typeof v === 'number' && Number.isFinite(v) ? v : null; }
function str(v: unknown): string | null { return typeof v === 'string' && v.length > 0 ? v : null; }

function coerce(raw: unknown, c: RegisterColumn): Value {
  switch (c.type) {
    case 'number': return num(raw);
    case 'boolean': return raw === true;
    case 'enum': { const s = str(raw); return s !== null && (!c.options || c.options.includes(s)) ? s : null; }
    case 'date': return str(raw);
    case 'lookup_key': return str(raw);
    case 'lookup_value': { const n = num(raw); return n !== null ? n : str(raw); }
    case 'derived': return null;                         // never stored; computed below
    default: return typeof raw === 'string' ? raw : '';  // text
  }
}

/** Legacy replay (generalises surface-inventory.ts:85-104). Acts only on rows carrying NONE of the
 * register's lookup_key column keys and no override flag ("legacy shape"). For each lookup_key column:
 * (a) legacyMap[sourceKey][rawValue] when the raw row has sourceKey; else (b) the UNIQUE table row whose
 * lookup_value cells all equal the row's stored values; (c) otherwise leave the key null (reselection).
 * When mapped: keep stored lookup_value cells, fill missing ones from the table row, set the override
 * flag to (stored !== table value) for the first applies_to column. */
function replayLegacy(raw: Record<string, unknown>, values: RowValues, columns: readonly RegisterColumn[], ctx: RegisterRowsCtx, opts: RegisterRowsOpts): void {
  const keyCols = columns.filter((c) => c.type === 'lookup_key');
  if (keyCols.length === 0) return;
  const isLegacy = keyCols.every((c) => !(c.key in raw)) && (!opts.overrideFlagKey || !(opts.overrideFlagKey in raw));
  if (!isLegacy) return;
  for (const kc of keyCols) {
    const tableCode = kc.lookup!.table_code;
    const valueCols = columns.filter((c) => c.type === 'lookup_value' && c.lookup?.table_code === tableCode && c.lookup.key_column === kc.key);
    let mapped: string | null = null;
    for (const [sourceKey, map] of Object.entries(opts.legacyMap ?? {})) {
      const rawVal = raw[sourceKey];
      if (typeof rawVal === 'string' && map[rawVal]) { mapped = map[rawVal]; break; }
    }
    if (mapped === null) {
      const rows = ctx.tableRows?.(tableCode) ?? [];
      const hits = rows.filter((r) => valueCols.every((vc) => values[vc.key] !== null && r.values[vc.lookup!.value!] === values[vc.key]));
      if (hits.length === 1) mapped = hits[0].row_key;
    }
    if (mapped === null) continue;
    const tableRow = ctx.tableRows?.(tableCode)?.find((r) => r.row_key === mapped);
    if (!tableRow) continue;
    values[kc.key] = mapped;
    let differs = false;
    for (const vc of valueCols) {
      const tv = tableRow.values[vc.lookup!.value!] as Value;
      if (values[vc.key] === null) values[vc.key] = tv; else if (values[vc.key] !== tv) differs = true;
    }
    if (opts.overrideFlagKey) values[opts.overrideFlagKey] = differs;
  }
}

/** A null lookup_value cell is filled from the table when its key is set and the row is not overridden.
 * A NON-null cell is never overwritten here (the editor refills on key change — Plan 2b; the engine must
 * not clobber an audited override even if the flag was lost). */
function refillLookupValues(values: RowValues, columns: readonly RegisterColumn[], ctx: RegisterRowsCtx, opts: RegisterRowsOpts): void {
  const overridden = opts.overrideFlagKey ? values[opts.overrideFlagKey] === true : false;
  for (const c of columns) {
    if (c.type !== 'lookup_value' || !c.lookup?.key_column || !c.lookup.value) continue;
    if (values[c.key] !== null || overridden) continue;
    const key = values[c.lookup.key_column];
    if (key === null || key === undefined) continue;
    values[c.key] = (ctx.table?.(c.lookup.table_code, [key])?.[c.lookup.value] ?? null) as Value;
  }
}

function isComplete(values: RowValues, columns: readonly RegisterColumn[]): boolean {
  for (const c of columns) {
    if (c.type === 'derived') continue;
    const v = values[c.key];
    if (c.required && (v === null || v === undefined || v === '')) return false;
    if (c.type === 'number' && typeof v === 'number') {
      if (c.min !== undefined && v < c.min) return false;
      if (c.max !== undefined && v > c.max) return false;
    }
  }
  return true;
}

export function prepareRegisterRows(carrierRaw: unknown, columns: readonly RegisterColumn[], ctx: RegisterRowsCtx, opts: RegisterRowsOpts = {}): PreparedRegister {
  if (!carrierRaw || typeof carrierRaw !== 'object') return { rows: [], flags: {} };
  const v = carrierRaw as Record<string, unknown>;
  const flags: Record<string, boolean> = {};
  for (const k of opts.flagKeys ?? []) flags[k] = v[k] === true;
  if (!Array.isArray(v.rows)) return { rows: [], flags };
  const scope: Scope = { symbol: ctx.symbol ?? (() => undefined), table: ctx.table };
  const derived = columns.filter((c) => c.type === 'derived').map((c) => ({ c, node: parseExpression(c.expr!) }));
  const rows: PreparedRow[] = [];
  for (const raw of v.rows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const values: RowValues = {};
    for (const c of columns) values[c.key] = coerce(r[c.key], c);
    replayLegacy(r, values, columns, ctx, opts);
    refillLookupValues(values, columns, ctx, opts);
    for (const { c, node } of derived) {
      try { values[c.key] = node ? evalValue(node, scope, values) : null; } catch { values[c.key] = null; }
    }
    rows.push({ id: str(r.id) ?? genId(), values, complete: isComplete(values, columns) });
  }
  return { rows, flags };
}
```
Note on `RegisterColumn.max`: the Plan-1 zod `registerColumn` has `min` but no `max` — add `max: z.number().optional()` to `field-config.ts` (additive; extend `field-config.test.ts` with one acceptance line).

- [ ] **Step 5: Write `register-configs.ts`**

```ts
import { parseFieldConfig, type RegisterUiConfig } from './field-config';
import { POLLUTANTS } from '@/lib/vsme/pollutants';

const SURFACE_INVENTORY: RegisterUiConfig = {
  title: 'Flächenverzeichnis', subtitle: 'Tab. 9 — C_i für Gl. 2 und C_s für Gl. 10', add_label: '+ Zeile hinzufügen', placement: 'bottom',
  columns: [
    { key: 'label', type: 'text', label: 'Bezeichnung', placeholder: 'z.B. Hauptdach' },
    { key: 'tab9_value', type: 'lookup_key', label: 'Oberflächentyp', required: true, lookup: { table_code: 'TAB9', group_by: 'group_label' } },
    { key: 'area_m2', type: 'number', label: 'A', unit: 'm²', required: true, min: 0 },
    { key: 'c_i', type: 'lookup_value', label: 'C_i', required: true, lookup: { table_code: 'TAB9', key_column: 'tab9_value', value: 'cm' } },
    { key: 'c_s', type: 'lookup_value', label: 'C_s', required: true, lookup: { table_code: 'TAB9', key_column: 'tab9_value', value: 'cs' } },
    { key: 'coeff_override', type: 'boolean', label: 'abweichend' },
    { key: 'kind', type: 'derived', label: 'befestigt/unbefestigt', expr: "lookup('TAB9', tab9_value, 'kind')" },
    { key: 'a_c_i', type: 'derived', label: 'A·C_i', expr: 'area_m2 * c_i' },
  ],
  override: { flag_key: 'coeff_override', applies_to: ['c_i', 'c_s'], policy: 'anhaltswert' },
  legacy_map: { surface_type: { asphalt: 'schwarzdecke_asphalt', rasen: 'park_flach' } },
};
const POLLUTANT_REGISTER: RegisterUiConfig = {
  title: 'Schadstoffregister', subtitle: 'Emissionen je Schadstoff (VSME Abs. 32)', add_label: '+ Schadstoff',
  columns: [
    { key: 'label', type: 'text', label: 'Quelle / Anlage' },
    { key: 'pollutant', type: 'enum', label: 'Schadstoff (E-PRTR)', required: true, options: POLLUTANTS.map((p) => p.value) },
    { key: 'medium', type: 'enum', label: 'Medium', required: true, options: ['air', 'water', 'soil'] },
    { key: 'amount_t', type: 'number', label: 'Menge', unit: 't', required: true, min: 0 },
  ],
  note: 'not_applicable = keine meldepflichtigen Schadstoffe (Summen = 0).',
};
export const REGISTER_CONFIGS_FALLBACK: Readonly<Record<string, RegisterUiConfig>> = { surface_inventory: SURFACE_INVENTORY, pollutant_register: POLLUTANT_REGISTER };
/** Register-level boolean flags per symbol, read by flag(). Plan 2b adds `ui_config.flags` to the zod contract for DB-configured registers. */
const REGISTER_FLAG_KEYS: Readonly<Record<string, readonly string[]>> = { pollutant_register: ['not_applicable'] };
export function registerFlagKeys(symbol: string): readonly string[] { return REGISTER_FLAG_KEYS[symbol] ?? []; }

export type RegisterFieldLike = { symbol: string; dataType: string; widget?: string | null; uiConfig?: unknown };
export function resolveRegisterConfig(f: RegisterFieldLike): RegisterUiConfig | null {
  if (f.widget != null) {
    if (f.widget !== 'register') return null;
    try { return parseFieldConfig({ widget: 'register', uiConfig: f.uiConfig ?? null, lookup: null, visibleWhen: null }).ui as RegisterUiConfig; } catch { return null; }
  }
  if (f.dataType !== 'json') return null;
  return REGISTER_CONFIGS_FALLBACK[f.symbol] ?? null;
}

export type FallbackEquation = { id: string; equationNumber: string; formula: string; inputSymbols: string[]; outputSymbol: string; clauseReference: string | null; description: string | null };
const B04 = (medium: 'air' | 'water' | 'soil', out: string): FallbackEquation => ({
  id: `fallback-vsme-b04-${medium}`, equationNumber: `B04.100-${medium}`,
  formula: `${out} = if(flag(pollutant_register, 'not_applicable'), 0, sum_rows(pollutant_register, if(medium == '${medium}', amount_t, 0)))`,
  inputSymbols: ['pollutant_register'], outputSymbol: out, clauseReference: 'VSME para 32',
  description: `Summe ${medium} aus dem Schadstoffregister (Plan 2a fallback, bis Migration 20260916110000 angewandt ist)`,
});
export const FALLBACK_REGISTER_EQUATIONS: Readonly<Record<string, readonly FallbackEquation[]>> = {
  'VSME-B04.100': [B04('air', 'AmountOfEmissionToAir'), B04('water', 'AmountOfEmissionToWater'), B04('soil', 'AmountOfEmissionToSoil')],
};
export function withFallbackRegisterEquations<E extends { outputSymbol: string | null }>(worksheetCode: string, equations: E[]): Array<E | FallbackEquation> {
  const fb = FALLBACK_REGISTER_EQUATIONS[worksheetCode]; if (!fb) return equations;
  const have = new Set(equations.map((e) => e.outputSymbol));
  return [...equations, ...fb.filter((e) => !have.has(e.outputSymbol))];
}
```
Note: `REGISTER_CONFIGS_FALLBACK.surface_inventory` marks `label` NOT required and `tab9_value/area_m2/c_i/c_s` required — this is byte-for-byte `rowComplete()` in `surface-inventory.ts:45-52`. Do not "improve" it.

- [ ] **Step 6: Run → PASS**, plus `pnpm -s typecheck`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/eval/register-rows.ts src/lib/eval/register-configs.ts src/lib/eval/regulation-tables-fallback.ts src/lib/eval/field-config.ts src/lib/eval/__tests__/register-rows.test.ts src/lib/eval/__tests__/register-configs.test.ts src/lib/eval/__tests__/field-config.test.ts
git commit -m "feat(eval): generic register rows (typed cells, legacy replay, derived, completeness) + TS fallback register configs and VSME-B04 fallback equations"
```

---

### Task 6: `formula.ts` registers; the six A138-07 aggregators become formula strings

**Files:**
- Modify: `src/lib/eval/formula.ts:94-110,131-271`, `src/lib/eval/aggregators.ts:783-834` (delete the surface aggregators), `src/lib/eval/rewrites.ts:36`
- Create: `scripts/migrations/20260916100000_a138_07_register_equations.sql`, `scripts/rollback-20260916100000-a138-07-register-equations.sql`, `scripts/__tests__/a138-07-register-equations-sql.test.ts`
- Test: `src/lib/eval/__tests__/surface-aggregators.test.ts` (rewrite through `evaluateFormula`), `src/lib/eval/__tests__/formula-registers.test.ts` (create)

**Interfaces:**
- Consumes: Task 3 (`evalExpression(expression, scope, extra)`), Task 5 (`PreparedRegister`, `prepareRegisterRows`, `makeTableLookup`, `REGISTER_CONFIGS_FALLBACK`).
- Produces:
  ```ts
  // formula.ts
  export type EvalRequest = { /* existing */; registers?: Record<string, PreparedRegister>; tableLookup?: Scope['table']; carriers?: Record<string, unknown>; };
  // rewrites.ts
  export const A138_07_REGISTER_FORMULAS: Readonly<Record<string /*equation UUID*/, { outputSymbol: string; formula: string }>>;
  ```

- [ ] **Step 1: Capture the current prod rows (read-only, in-session) for the migration's rollback**

Read the header of `scripts/verification/prod-query.mjs` for its argument shape, then query the six ids `b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0`, `a1380702-0000-4000-8000-00000000000{2,3,4,5,6}` from `equations` (columns `id, equation_number, formula, input_symbols, output_symbol`). Paste the six rows verbatim into the rollback file as `UPDATE equations SET formula = '<prior>', input_symbols = ARRAY[...] WHERE id = '<uuid>';`. If prod is unreachable, take the prior formulas from `tests/harness/seed-a138.ts:185-195` and write `-- UNVERIFIED prior values (prod unreachable <date>): owner re-captures before applying` at the top of the rollback.

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/eval/__tests__/formula-registers.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { REGISTER_CONFIGS_FALLBACK } from '../register-configs';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { A138_07_REGISTER_FORMULAS } from '../rewrites';

const table = makeTableLookup('DWA-A-138-1');
const cfg = REGISTER_CONFIGS_FALLBACK.surface_inventory;
const prep = (rows: unknown[]) => prepareRegisterRows({ rows }, cfg.columns, { table, tableRows: makeTableRows('DWA-A-138-1') }, { legacyMap: cfg.legacy_map, overrideFlagKey: cfg.override?.flag_key });
const registers = { surface_inventory: prep([
  { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
  { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
]) };
const req = (equationId: string, formula: string) => ({ equationId, formula, inputSymbols: ['surface_inventory'], outputSymbol: '', inputs: [], registers, tableLookup: table });
const A_C_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';

describe('evaluateFormula with registers — A138-07 parity with the retired aggregators', () => {
  const expected: Record<string, number> = { A_C: 4826.43, C_m: 0.9, A_E_ba: 5362.7, A_E_nba: 0, A_C_sealed: 4826.43, A_C_unsealed: 0 };
  for (const [id, { outputSymbol, formula }] of Object.entries(A138_07_REGISTER_FORMULAS)) {
    it(`${outputSymbol} via its formula string`, () => {
      const s = evaluateFormula(req(id, formula));
      expect(s.kind).toBe('computed');
      if (s.kind === 'computed') expect(s.value).toBeCloseTo(expected[outputSymbol], 2);
    });
  }
  it('paved/unpaved split: 100 m² asphalt @0.9 + 200 m² park @0.3 ⇒ sealed 90, unsealed 60', () => {
    const split = { surface_inventory: prep([
      { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', label: 'Rasen', tab9_value: 'park_flach', area_m2: 200, c_i: 0.3, c_s: 0.5, coeff_override: true },
    ]) };
    const sealed = evaluateFormula({ ...req('a1380702-0000-4000-8000-000000000005', A138_07_REGISTER_FORMULAS['a1380702-0000-4000-8000-000000000005'].formula), registers: split });
    const unsealed = evaluateFormula({ ...req('a1380702-0000-4000-8000-000000000006', A138_07_REGISTER_FORMULAS['a1380702-0000-4000-8000-000000000006'].formula), registers: split });
    expect(sealed).toMatchObject({ kind: 'computed' }); expect((sealed as { value: number }).value).toBeCloseTo(90, 6);
    expect((unsealed as { value: number }).value).toBeCloseTo(60, 6);
  });
  it('empty register ⇒ manual_required with the row message (never 0)', () => {
    const s = evaluateFormula({ ...req(A_C_ID, A138_07_REGISTER_FORMULAS[A_C_ID].formula), registers: { surface_inventory: prep([]) } });
    expect(s.kind).toBe('manual_required');
    if (s.kind === 'manual_required') expect(s.reason).toMatch(/Keine vollständigen Zeilen/);
  });
  it('the rewrite bridge applies only while the DB formula differs from the target', () => {
    const bridged = evaluateFormula(req(A_C_ID, 'A_C_preliminary = Σ_i (A_E,i · C_i)'));
    expect(bridged.kind).toBe('computed');
    if (bridged.kind === 'computed') expect(bridged.rewrite).toBeDefined();
    const migrated = evaluateFormula(req(A_C_ID, A138_07_REGISTER_FORMULAS[A_C_ID].formula));
    expect(migrated.kind).toBe('computed');
    if (migrated.kind === 'computed') expect(migrated.rewrite).toBeUndefined();
  });
  it('a formula with if(a > b, …) is NOT misclassified as a criterion', () => {
    const s = evaluateFormula({ equationId: 'y', formula: 'y = if(a > b, a, b)', inputSymbols: ['a', 'b'], outputSymbol: 'y', inputs: [{ symbol: 'a', value: 2, unit: null }, { symbol: 'b', value: 1, unit: null }] });
    expect(s).toMatchObject({ kind: 'computed', value: 2 });
  });
  it('a scalar equation without registers is untouched', () => {
    const s = evaluateFormula({ equationId: 'z', formula: 'z = a * 2', inputSymbols: ['a'], outputSymbol: 'z', inputs: [{ symbol: 'a', value: 3, unit: null }] });
    expect(s).toMatchObject({ kind: 'computed', value: 6, formulaEvaluated: 'a * 2' });
  });
});
```

Rewrite `surface-aggregators.test.ts`: keep every numeric expectation it holds today (90 / 60 / 4826.43 / 0.9 / 5362.7 / `manual_required` on empty) but obtain each state through `evaluateFormula` with `registers` exactly as above instead of `aggregators[ID].run(...)`; header comment `// Plan 2a: the six UUID aggregators are retired; the same fixtures now pin the formula strings.` Also `scripts/__tests__/a138-07-register-equations-sql.test.ts`: read the migration file and assert it contains each of the six `formula` strings from `A138_07_REGISTER_FORMULAS` verbatim and each of the six ids.

- [ ] **Step 3: Run → FAIL**

- [ ] **Step 4: Implement**

`rewrites.ts` — replace the empty registry with:
```ts
export const A138_07_REGISTER_FORMULAS: Readonly<Record<string, { outputSymbol: string; formula: string }>> = {
  'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0': { outputSymbol: 'A_C',          formula: 'A_C = sum_rows(surface_inventory, area_m2 * c_i)' },
  'a1380702-0000-4000-8000-000000000002': { outputSymbol: 'C_m',          formula: 'C_m = sum_rows(surface_inventory, area_m2 * c_i) / sum_rows(surface_inventory, area_m2)' },
  'a1380702-0000-4000-8000-000000000003': { outputSymbol: 'A_E_ba',       formula: "A_E_ba = sum_rows(surface_inventory, if(kind == 'paved', area_m2, 0))" },
  'a1380702-0000-4000-8000-000000000004': { outputSymbol: 'A_E_nba',      formula: "A_E_nba = sum_rows(surface_inventory, if(kind == 'unpaved', area_m2, 0))" },
  'a1380702-0000-4000-8000-000000000005': { outputSymbol: 'A_C_sealed',   formula: "A_C_sealed = sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_i, 0))" },
  'a1380702-0000-4000-8000-000000000006': { outputSymbol: 'A_C_unsealed', formula: "A_C_unsealed = sum_rows(surface_inventory, if(kind == 'unpaved', area_m2 * c_i, 0))" },
};
// Plan 2a deploy-safety bridge: until scripts/migrations/20260916100000_a138_07_register_equations.sql is applied
// the DB still stores the Σ-notation; the bridge substitutes the formula string. formula.ts skips a bridge whose
// `to` already equals the stored formula, so after the migration the engine card shows no rewrite. DELETE these
// six entries once the migration is applied in prod (owner step, ledger).
export const rewriteRules: Record<string, Rewrite> = Object.fromEntries(Object.entries(A138_07_REGISTER_FORMULAS).map(([id, r]) => [id, {
  from: 'Σ-Notation (DB)', to: r.formula, remap: { surface_inventory: 'surface_inventory' },
  reason: 'Σ über Flächenverzeichnis-Zeilen als Zeilenfunktion sum_rows() (Plan 2a); identische Summe über vollständige Zeilen.',
}]));
```

`formula.ts`:
1. `EvalRequest` gains `registers?`, `tableLookup?`, `carriers?` (types from `@/lib/expr`).
2. Bridge guard: `const bridge = rewriteRules[req.equationId]; const rewrite = bridge && norm(bridge.to) !== norm(req.formula) ? bridge : undefined;` with `const norm = (s: string) => s.replace(/\s+/g, ' ').trim();`.
3. Symbol-resolution loop: `if (req.registers?.[sym] !== undefined || req.carriers?.[sym] !== undefined) continue;` before the numeric lookup.
4. Criterion sniff: `const hasCall = /\b(if|lookup|sum_rows|count_rows|max_rows|min_rows|mean_rows|stdev_rows|last_rows|contains|cell|flag)\s*\(/i.test(expression);` — when `hasCall`, replace the regex test with `const parsed = parseExpression(expression); if (parsed && isConditionNode(parsed)) return { kind: 'manual_required', reason: 'Vergleichs-/Kriteriumsformel — kein berechenbarer Zahlenwert; manuell prüfen.', rewrite };` else keep the existing regex.
5. `evalExpression(expression, scope, { registers: req.registers, table: req.tableLookup, carriers: req.carriers })`.
6. Recoverable regex: `/Unbekanntes Symbol|Funktionsaufruf|Division durch Null|Nicht-endliches Ergebnis|Keine vollständigen Zeilen|Fehlende Eingabe|lookup\(\)|stdev_rows\(\)|Operand ist keine Zahl/`.
7. Registers are not numbers, so they are not added to `substituted`; `formulaEvaluated: expression` as today.
8. `aggregators.ts`: delete `makeSurfaceAggregator` (`:783-812`), its six instances (`:815-820`) and the six map entries (`:822-834`); drop the `summarizeSurfaces` import if unused. Keep `AggregatorContext.surfaceInventory` until Task 7 removes the last readers.

Migration `scripts/migrations/20260916100000_a138_07_register_equations.sql`:
```sql
-- Plan 2a · DWA-A-138-1 A138-07: the six Σ-notation producers become row-function formula strings.
-- Same math (Σ over COMPLETE Flächenverzeichnis rows). After this the bridge in src/lib/eval/rewrites.ts is a no-op → delete it.
BEGIN;
UPDATE equations SET formula = 'A_C = sum_rows(surface_inventory, area_m2 * c_i)', input_symbols = ARRAY['surface_inventory'] WHERE id = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
-- … five more UPDATEs, formulas byte-identical to A138_07_REGISTER_FORMULAS …
COMMIT;
```

- [ ] **Step 5: Run → PASS**: `pnpm vitest run --project unit src/lib/eval scripts/__tests__ && pnpm -s typecheck`. Then `pnpm test`. Between Task 6 and Task 7 the six A138-07 outputs are `manual_required` in the form and the report (no aggregator, no registers yet) — acceptable inside the branch, NOT a deployable state; Task 7 must land before any deploy.

- [ ] **Step 6: Commit**

```bash
git add src/lib/eval/formula.ts src/lib/eval/aggregators.ts src/lib/eval/rewrites.ts src/lib/eval/__tests__/surface-aggregators.test.ts src/lib/eval/__tests__/formula-registers.test.ts scripts/migrations/20260916100000_a138_07_register_equations.sql scripts/rollback-20260916100000-a138-07-register-equations.sql scripts/__tests__/a138-07-register-equations-sql.test.ts
git commit -m "feat(engine): registers in evaluateFormula; A138-07 Σ-aggregators retired for sum_rows formula strings (migration written-not-applied, rewrite bridge)"
```

---

### Task 7: Client engine + report evaluator feed registers

**Files:**
- Modify: `src/lib/eval/use-equation-engine.ts:23-49,58-62,85-110,145-153,445-490`, `src/lib/eval/evaluate-for-report.ts:33-47,53-58,162-168,262-263,333-335`, `src/components/worksheet/worksheet-form.tsx:392-399`, `src/lib/eval/aggregators.ts` (`AggregatorContext.surfaceInventory` removed)
- Test: `src/components/worksheet/__tests__/engine-wiring-a138-07.test.tsx`, `engine-wiring-a138-07-sealed.test.tsx` (existing pins — must stay green), `src/lib/eval/__tests__/evaluate-for-report-registers.test.ts` (create)

**Interfaces:**
- Consumes: Task 5 (`resolveRegisterConfig`, `registerFlagKeys`, `withFallbackRegisterEquations`, `prepareRegisterRows`, `makeTableLookup`, `makeTableRows`), Task 6.
- Produces: `useEquationEngine({ …, standardCode })` — `Args.standardCode: string` (new, required); `FieldMeta` gains `dataType?: string; widget?: string | null; uiConfig?: unknown`; `evaluateWorksheetEquations(worksheetCode, equations, fields, parameters, opts?: { standardCode?: string })`; `ReportField` gains the same optional keys.

- [ ] **Step 1: Write the report test**

```ts
// src/lib/eval/__tests__/evaluate-for-report-registers.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateWorksheetEquations } from '../evaluate-for-report';
import { A138_07_REGISTER_FORMULAS } from '../rewrites';

describe('evaluateWorksheetEquations — register-fed equations on the PDF path', () => {
  it('computes the six A138-07 outputs from the persisted surface_inventory json', () => {
    const fields = [
      { id: 'f-si', symbol: 'surface_inventory', unit: null, dataType: 'json' },
      ...Object.values(A138_07_REGISTER_FORMULAS).map((r, i) => ({ id: `f-${i}`, symbol: r.outputSymbol, unit: null, dataType: 'number' })),
    ];
    const parameters = [{ fieldId: 'f-si', valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: { rows: [
      { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ] } }];
    const equations = Object.entries(A138_07_REGISTER_FORMULAS).map(([id, r]) => ({ id, equationNumber: r.outputSymbol, formula: r.formula, inputSymbols: ['surface_inventory'], outputSymbol: r.outputSymbol, outputUnit: null }));
    const out = evaluateWorksheetEquations('A138-07', equations, fields, parameters, { standardCode: 'DWA-A-138-1' });
    const by = (s: string) => out.find((r) => r.outputSymbol === s)!.state as { kind: string; value?: number };
    expect(by('A_C').kind).toBe('computed');
    expect(by('A_C').value).toBeCloseTo(4826.43, 2);
    expect(by('C_m').value).toBeCloseTo(0.9, 6);
  });
  it('VSME-B04.100 gets its fallback equations without the caller asking', () => {
    const fields = [{ id: 'p', symbol: 'pollutant_register', unit: null, dataType: 'json' }, { id: 'a', symbol: 'AmountOfEmissionToAir', unit: 't', dataType: 'number' }];
    const parameters = [{ fieldId: 'p', valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: { not_applicable: true, rows: [] } }];
    const out = evaluateWorksheetEquations('VSME-B04.100', [], fields, parameters, { standardCode: 'VSME' });
    expect(out.find((r) => r.outputSymbol === 'AmountOfEmissionToAir')?.state).toMatchObject({ kind: 'computed', value: 0 });
  });
});
```

- [ ] **Step 2: Run → FAIL** (`opts` unknown / states `manual_required`).

- [ ] **Step 3: Implement the client hook**

In `use-equation-engine.ts`:
- Imports: add `import { resolveRegisterConfig, registerFlagKeys, type RegisterFieldLike } from './register-configs'; import { prepareRegisterRows } from './register-rows'; import { makeTableLookup, makeTableRows } from './regulation-tables-fallback'; import type { PreparedRegister } from '@/lib/expr';` Remove the `normalizeSurfaceCarrier` / `SurfaceInventoryCarrier` import.
- `Args.standardCode: string`; `FieldMeta` widened as in Interfaces.
- Delete the six `A138_07_*` constants and `A138_07_SURFACE_IDS` (`:43-49`); in `consumedSymbolsFor` (`:95-110`) delete the first branch and return `[...normalizeSymbols(eq.inputSymbols ?? []), ...Object.values(rewriteRules[eq.id]?.remap ?? {})]` for the generic case (the bridge's `remap` names the register while the DB row is un-migrated; after the migration `input_symbols` carries it).
- Add:
  ```ts
  const tableLookup = useMemo(() => makeTableLookup(standardCode), [standardCode]);
  const tableRows = useMemo(() => makeTableRows(standardCode), [standardCode]);
  const registers = useMemo(() => {
    const out: Record<string, PreparedRegister> = {};
    for (const f of fields) {
      const cfg = resolveRegisterConfig(f as RegisterFieldLike);
      if (!cfg) continue;
      const v = values[f.id];
      if (v?.type !== 'json') continue;
      out[f.symbol] = prepareRegisterRows(v.value, cfg.columns, { table: tableLookup, tableRows }, { legacyMap: cfg.legacy_map, flagKeys: registerFlagKeys(f.symbol), overrideFlagKey: cfg.override?.flag_key });
    }
    return out;
  }, [fields, values, tableLookup, tableRows]);
  ```
- Delete the `surfaceField` / `surfaceCarrier` memos (`:145-153`) and the `if (A138_07_SURFACE_IDS.has(eq.id))` aggregator branch (`:446-447`); pass `registers, tableLookup` into the `evaluateFormula({...})` call (`:484-492`). Add `registers` to the memo's dependency list.
- `worksheet-form.tsx:392-399`: pass `standardCode` and `equations: withFallbackRegisterEquations(worksheet.template.code, sortedEquations)` (import from `@/lib/eval/register-configs`); the equations block keeps rendering `equations` (the DB list) — fallback equations only feed the engine and their output fields' engine cards.
- `aggregators.ts`: remove `surfaceInventory` from `AggregatorContext` and any now-dead import.

Report path (`evaluate-for-report.ts`): add the fifth parameter `opts?: { standardCode?: string }`; widen `ReportField` with `widget?: string | null; uiConfig?: unknown`; delete `A138_07_*` constants (`:33-47`) and the `surfaceCarrier` line (`:262`) and the `A138_07_SURFACE_IDS` aggregator branch (`:333-335`); build `registers` from `fields` × `jsonBySymbol` exactly like the hook (same helper call); `const tableLookup = makeTableLookup(opts?.standardCode ?? '')`; wrap the equation list: `for (const eq of withFallbackRegisterEquations(worksheetCode, equations))`; pass `registers, tableLookup` to `evaluateFormula`. Then `grep -rn "evaluateWorksheetEquations(" src` and thread `{ standardCode }` at every call site where the standard code is in scope (`assemble-standard-report.ts` iterates templates with their standard — read `:560-640` to find the variable; `src/lib/pdf/load-data.ts` likewise; `src/lib/snapshots/payload.ts` if it calls it).

- [ ] **Step 4: Run** `pnpm test` → the two `engine-wiring-a138-07*` tests must pass unchanged (they render `WorksheetForm` and assert the A138-07 outputs — if their props lack `standardCode`, they already pass one to the form; if the hook is called directly in a test without `standardCode`, add `standardCode: 'DWA-A-138-1'` with a `// Plan 2a: required arg` note). `pnpm -s typecheck` exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/use-equation-engine.ts src/lib/eval/evaluate-for-report.ts src/lib/eval/aggregators.ts src/components/worksheet/worksheet-form.tsx src/lib/eval/__tests__/evaluate-for-report-registers.test.ts src/lib/pdf src/lib/snapshots src/components/worksheet/__tests__
git commit -m "feat(engine): client hook + report evaluator build registers generically; A138-07 surface branch removed"
```

---

### Task 8: Generic materialiser replaces the surface + pollutant blocks in `saveWorksheet`

**Files:**
- Create: `src/lib/eval/materialize-derived.ts`, `src/lib/eval/__tests__/materialize-derived.test.ts`, `scripts/migrations/20260916110000_vsme_b04_register_equations.sql`, `scripts/rollback-20260916110000-vsme-b04-register-equations.sql`, `scripts/__tests__/vsme-b04-register-equations-sql.test.ts`, `tests/harness/register-materialise.integration.test.ts`
- Delete: `src/lib/eval/materialize-surfaces.ts`, `src/lib/eval/__tests__/materialize-surfaces.test.ts` (its three assertions move into `materialize-derived.test.ts`)
- Modify: `src/lib/actions/worksheet.ts:1-30 (imports), 145-152, 660-778`, `src/lib/actions/materialize-registry.ts:201-220` (surface entry → generic `register` entry), `tests/harness/seed-plt-hs01.ts` (+ `seed-a138.ts:185-195`)
- Reference: `tests/harness/finding-h-real-save-path.integration.test.ts:72-118` (how the real `saveWorksheet` is driven), `tests/harness/_harness-env.ts` (bootstrap), `src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx:178-198` (per-dataType parameter → FieldValue mapping to mirror)

**Interfaces:**
- Consumes: Tasks 5–7.
- Produces:
  ```ts
  export type FieldValue = /* the 6-member union from worksheet.ts:68-74 */;
  export type DerivedWrite = { equationId: string; symbol: string; fieldId: string; value: number | null; state: EvalState };
  export function materializeDerivedOutputs(args: {
    standardCode: string; worksheetCode: string;
    equations: ReadonlyArray<{ id: string; equationNumber: string; formula: string; inputSymbols: string[] | null; outputSymbol: string | null }>;
    fields: ReadonlyArray<{ id: string; symbol: string; dataType: string; unit: string | null; widget?: string | null; uiConfig?: unknown }>;
    valuesByFieldId: Record<string, FieldValue>;   // persisted rows overlaid by the save batch
  }): DerivedWrite[];   // one per register-fed, non-displayOnly equation whose output symbol has a field on this template
  export function registerFieldIds(fields: ReadonlyArray<{ id: string; symbol: string; dataType: string; widget?: string | null; uiConfig?: unknown }>, valuesByFieldId: Record<string, FieldValue>): string[];
  export function parametersToFieldValues(rows: ReadonlyArray<{ fieldId: string; valueNumber: string | number | null; valueText: string | null; valueEnum: string | null; valueDate: string | null; valueBoolean: boolean | null; valueJson: unknown }>, fields: ReadonlyArray<{ id: string; dataType: string }>): Record<string, FieldValue>;
  ```

- [ ] **Step 1: Write the pure test**

```ts
// src/lib/eval/__tests__/materialize-derived.test.ts
import { describe, it, expect } from 'vitest';
import { materializeDerivedOutputs } from '../materialize-derived';
import { A138_07_REGISTER_FORMULAS } from '../rewrites';

const fields = [
  { id: 'f-si', symbol: 'surface_inventory', dataType: 'json', unit: null },
  ...Object.values(A138_07_REGISTER_FORMULAS).map((r, i) => ({ id: `f-${i}`, symbol: r.outputSymbol, dataType: 'number', unit: null })),
];
const equations = Object.entries(A138_07_REGISTER_FORMULAS).map(([id, r]) => ({ id, equationNumber: r.outputSymbol, formula: r.formula, inputSymbols: ['surface_inventory'], outputSymbol: r.outputSymbol }));
const carrier = (rows: unknown[]) => ({ 'f-si': { type: 'json' as const, value: { rows } } });

describe('materializeDerivedOutputs', () => {
  it('maps a complete carrier to the six derived scalars (was materializeSurfaceOutputs)', () => {
    const out = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations, fields, valuesByFieldId: carrier([
      { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ]) });
    const by = (s: string) => out.find((w) => w.symbol === s)!;
    expect(by('A_C').value).toBeCloseTo(4826.43, 2);
    expect(by('C_m').value).toBeCloseTo(0.9, 6);
    expect(by('A_E_ba').value).toBeCloseTo(5362.7, 4);
    expect(by('A_E_nba').value).toBe(0);
    expect(by('A_C').fieldId).toBe('f-0');
  });
  it('materializes A_C_sealed and A_C_unsealed (100 @0.9 paved + 200 @0.3 unpaved ⇒ 90 / 60)', () => {
    const out = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations, fields, valuesByFieldId: carrier([
      { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', tab9_value: 'park_flach', area_m2: 200, c_i: 0.3, c_s: 0.5, coeff_override: true },
    ]) });
    expect(out.find((w) => w.symbol === 'A_C_sealed')!.value).toBeCloseTo(90, 6);
    expect(out.find((w) => w.symbol === 'A_C_unsealed')!.value).toBeCloseTo(60, 6);
  });
  it('returns nulls (not 0) when nothing is complete — clears stale downstream values', () => {
    const out = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations, fields, valuesByFieldId: carrier([]) });
    expect(out).toHaveLength(6);
    expect(out.every((w) => w.value === null && w.state.kind === 'manual_required')).toBe(true);
    const none = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations, fields, valuesByFieldId: {} });
    expect(none.every((w) => w.value === null)).toBe(true);
  });
  it('VSME-B04.100 sums come from the fallback equations; not_applicable ⇒ 0, empty ⇒ null', () => {
    const f = [{ id: 'p', symbol: 'pollutant_register', dataType: 'json', unit: null }, { id: 'a', symbol: 'AmountOfEmissionToAir', dataType: 'number', unit: 't' }, { id: 'w', symbol: 'AmountOfEmissionToWater', dataType: 'number', unit: 't' }, { id: 's', symbol: 'AmountOfEmissionToSoil', dataType: 'number', unit: 't' }];
    const na = materializeDerivedOutputs({ standardCode: 'VSME', worksheetCode: 'VSME-B04.100', equations: [], fields: f, valuesByFieldId: { p: { type: 'json', value: { not_applicable: true, rows: [] } } } });
    expect(na.map((w) => w.value)).toEqual([0, 0, 0]);
    const empty = materializeDerivedOutputs({ standardCode: 'VSME', worksheetCode: 'VSME-B04.100', equations: [], fields: f, valuesByFieldId: { p: { type: 'json', value: { not_applicable: false, rows: [] } } } });
    expect(empty.map((w) => w.value)).toEqual([null, null, null]);
  });
  it('ignores scalar equations and equations whose output has no field on this template', () => {
    const out = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations: [{ id: 'q', equationNumber: 'q', formula: 'q = a * 2', inputSymbols: ['a'], outputSymbol: 'q' }, equations[0]], fields: [fields[0]], valuesByFieldId: carrier([]) });
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement the pure module**

```ts
// src/lib/eval/materialize-derived.ts
import { evaluateFormula, type EvalState } from './formula';
import { equationProfiles } from './equation-profiles';
import { normalizeSymbols } from './normalize-formula';
import { rewriteRules } from './rewrites';
import { resolveRegisterConfig, registerFlagKeys, withFallbackRegisterEquations } from './register-configs';
import { prepareRegisterRows } from './register-rows';
import { makeTableLookup, makeTableRows } from './regulation-tables-fallback';
import type { PreparedRegister } from '@/lib/expr';

export type FieldValue =
  | { type: 'number'; value: number | null } | { type: 'text'; value: string | null } | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null } | { type: 'boolean'; value: boolean | null } | { type: 'json'; value: unknown };
type EqLike = { id: string; equationNumber: string; formula: string; inputSymbols: string[] | null; outputSymbol: string | null };
type FieldLike = { id: string; symbol: string; dataType: string; unit: string | null; widget?: string | null; uiConfig?: unknown };
export type DerivedWrite = { equationId: string; symbol: string; fieldId: string; value: number | null; state: EvalState };

export function parametersToFieldValues(rows, fields): Record<string, FieldValue> {
  const typeById = new Map(fields.map((f) => [f.id, f.dataType]));
  const out: Record<string, FieldValue> = {};
  for (const p of rows) {
    switch (typeById.get(p.fieldId)) {
      case 'number': out[p.fieldId] = { type: 'number', value: p.valueNumber == null ? null : Number(p.valueNumber) }; break;
      case 'text': out[p.fieldId] = { type: 'text', value: p.valueText }; break;
      case 'enum': out[p.fieldId] = { type: 'enum', value: p.valueEnum }; break;
      case 'date': out[p.fieldId] = { type: 'date', value: p.valueDate }; break;
      case 'boolean': out[p.fieldId] = { type: 'boolean', value: p.valueBoolean }; break;
      case 'json': out[p.fieldId] = { type: 'json', value: p.valueJson }; break;
    }
  }
  return out;
}
export function registerFieldIds(fields, valuesByFieldId): string[] {
  return fields.filter((f) => resolveRegisterConfig(f) !== null && valuesByFieldId[f.id]?.type === 'json').map((f) => f.id);
}
export function materializeDerivedOutputs(args: { standardCode: string; worksheetCode: string; equations: ReadonlyArray<EqLike>; fields: ReadonlyArray<FieldLike>; valuesByFieldId: Record<string, FieldValue> }): DerivedWrite[] {
  const { standardCode, worksheetCode, fields, valuesByFieldId } = args;
  const table = makeTableLookup(standardCode); const tableRows = makeTableRows(standardCode);
  const fieldBySymbol = new Map(fields.map((f) => [f.symbol, f]));
  const registers: Record<string, PreparedRegister> = {};
  for (const f of fields) {
    const cfg = resolveRegisterConfig(f); if (!cfg) continue;
    const v = valuesByFieldId[f.id];
    registers[f.symbol] = prepareRegisterRows(v?.type === 'json' ? v.value : null, cfg.columns, { table, tableRows }, { legacyMap: cfg.legacy_map, flagKeys: registerFlagKeys(f.symbol), overrideFlagKey: cfg.override?.flag_key });
  }
  const registerSymbols = new Set(Object.keys(registers));
  const out: DerivedWrite[] = [];
  for (const eq of withFallbackRegisterEquations(worksheetCode, [...args.equations])) {
    if (!eq.outputSymbol || equationProfiles[eq.id]?.displayOnly) continue;
    const consumed = new Set([...normalizeSymbols(eq.inputSymbols ?? []), ...Object.values(rewriteRules[eq.id]?.remap ?? {})]);
    if (![...consumed].some((s) => registerSymbols.has(s))) continue;
    const outField = fieldBySymbol.get(eq.outputSymbol); if (!outField) continue;
    const inputs = [...consumed].filter((s) => !registerSymbols.has(s)).map((sym) => {
      const f = fieldBySymbol.get(sym); const v = f ? valuesByFieldId[f.id] : undefined;
      return { symbol: sym, value: v?.type === 'number' ? v.value : null, unit: f?.unit ?? null };
    });
    const state = evaluateFormula({ equationId: eq.id, formula: eq.formula, inputSymbols: eq.inputSymbols ?? [], outputSymbol: eq.outputSymbol, inputs, registers, tableLookup: table });
    out.push({ equationId: eq.id, symbol: eq.outputSymbol, fieldId: outField.id, value: state.kind === 'computed' ? state.value : null, state });
  }
  return out;
}
```

- [ ] **Step 4: Wire `saveWorksheet`**

1. Widen the template-equation select (`worksheet.ts:145-148`) to `{ id, equationNumber, formula, inputSymbols, outputSymbol }`. Compute `derivedSymbols` AFTER `savedTemplateRow` is loaded (move the line from `:152` to just after `:178`) as `derivedOutputSymbols(withFallbackRegisterEquations(savedTemplateCode ?? '', templateEquations), BASIN_GOVERNING_SYMBOLS)` — this stamps the VSME sums `derived` even before the migration exists.
2. Replace the two blocks (`:660-719` surface, `:722-778` pollutant) with ONE block placed at the same position:
   ```ts
   // Plan 2a — generic register materialisation (replaces the A138-07 surface and VSME-B04 pollutant blocks).
   // Fires when the save batch contains a register carrier of this template; evaluates every register-fed
   // equation (DB rows + fallback rows) through the same evaluateFormula the form uses and upserts the
   // outputs as source_type='derived' (null when not computable → clears stale downstream values).
   const templateFields = await tx
     .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType, unit: fields.unit, widget: fields.widget, uiConfig: fields.uiConfig })
     .from(fields)
     .where(and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)));
   const batchRegisterIds = registerFieldIds(templateFields, input.values).filter((id) => fieldIds.includes(id));
   if (batchRegisterIds.length > 0 && savedTemplateRow?.standardCode && savedTemplateCode) {
     const persisted = await tx
       .select({ fieldId: projectParameters.fieldId, valueNumber: projectParameters.valueNumber, valueText: projectParameters.valueText, valueEnum: projectParameters.valueEnum, valueDate: projectParameters.valueDate, valueBoolean: projectParameters.valueBoolean, valueJson: projectParameters.valueJson })
       .from(projectParameters)
       .where(and(eq(projectParameters.projectId, instance.projectId), inArray(projectParameters.fieldId, templateFields.map((f) => f.id))));
     const valuesByFieldId = { ...parametersToFieldValues(persisted, templateFields), ...input.values };
     const writes = materializeDerivedOutputs({ standardCode: savedTemplateRow.standardCode, worksheetCode: savedTemplateCode, equations: templateEquations, fields: templateFields, valuesByFieldId });
     const derivedRows = writes.map((w) => ({ projectId: instance.projectId, fieldId: w.fieldId, valueNumber: w.value == null ? null : String(w.value), sourceType: 'derived' as const, enteredBy: userId, enteredAt: now }));
     if (derivedRows.length > 0) {
       await tx.insert(projectParameters).values(derivedRows).onConflictDoUpdate({
         target: [projectParameters.projectId, projectParameters.fieldId],
         set: { valueNumber: sql`excluded.value_number`, sourceType: sql`excluded.source_type`, enteredBy: sql`excluded.entered_by`, enteredAt: now },
       });
       for (const r of derivedRows) writtenDerived.push({ fieldId: r.fieldId, valueNumber: r.valueNumber, valueText: null });
     }
   }
   ```
   `fieldIds` is the batch's field-id list already in scope (`:670`). `valueDate` may come back as a `Date` — coerce with `String()`/`toISOString()` in `parametersToFieldValues`'s caller if tsc complains. Remove from `worksheet.ts` the imports `materializeSurfaceOutputs`, `SURFACE_DERIVED_SYMBOLS`, `normalizePollutantCarrier`, `summarizePollutants`, `POLLUTANT_REGISTER_SYMBOL`, `POLLUTANT_OUTPUT_SYMBOLS`, `POLLUTANT_MEDIA`, `PollutantMedium`; add `materializeDerivedOutputs`, `registerFieldIds`, `parametersToFieldValues` from `@/lib/eval/materialize-derived` and `withFallbackRegisterEquations` from `@/lib/eval/register-configs`.
3. `materialize-registry.ts`: rename the `surface` entry `id: 'register'`, `inputSymbols: new Set<string>(['surface_inventory', 'pollutant_register'])`, comment "generic register materialisation — fires on in-batch presence (Plan 2a); listed for registry completeness". `grep -rn "'surface'" src tests` and update any reference to the old id.
4. Delete `materialize-surfaces.ts` + its test.

Migration `scripts/migrations/20260916110000_vsme_b04_register_equations.sql`:
```sql
-- Plan 2a · VSME-B04.100: the three per-medium pollutant sums become equation rows (were code-only materialisation).
-- Formulas byte-identical to FALLBACK_REGISTER_EQUATIONS in src/lib/eval/register-configs.ts; after applying, the fallback entries can be deleted.
BEGIN;
INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status)
SELECT wt.id, 'B04.100-air', 'AmountOfEmissionToAir = if(flag(pollutant_register, ''not_applicable''), 0, sum_rows(pollutant_register, if(medium == ''air'', amount_t, 0)))', ARRAY['pollutant_register'], 'AmountOfEmissionToAir', 't', 'VSME para 32', 'Summe Luft aus dem Schadstoffregister', 'imported_unverified'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id WHERE s.code = 'VSME' AND wt.code = 'VSME-B04.100'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;
-- water, soil analogous
COMMIT;
```
Rollback deletes by `(worksheet_template_id, equation_number)`. Pin: `scripts/__tests__/vsme-b04-register-equations-sql.test.ts` asserts the SQL contains each fallback formula (with `'` doubled) and each `equation_number`.

- [ ] **Step 5: Integration test through the real save path**

Extend `SeededFixture` in `tests/harness/seed-plt-hs01.ts` with `ws07InstanceId: string`, `surfaceInventoryFieldId: string`, `a138_07: Record<'A_C' | 'C_m' | 'A_E_ba' | 'A_E_nba' | 'A_C_sealed' | 'A_C_unsealed', string>` — seeded the same way `ws17InstanceId` / `hMFieldId` are (find those lines in the seed and mirror them for A138-07; the A138-07 fields exist via `SYMBOL_HOME`, `seed-a138.ts:71-73`; the six output fields — add them to `SYMBOL_HOME` under `ws: 'A138-07'` if absent). Update the six A138-07 rows in `A138_EQUATIONS` (`seed-a138.ts:185-195`) to the `sum_rows` formulas with `need: ['surface_inventory'], kind: 'manual_required'` and the comment `// Plan 2a: register-fed; the scalar verify harness cannot feed a carrier — computed in register-materialise.integration.test.ts`. Ensure the seeded equation ids for those six rows are the prod UUIDs (so the bridge and the migration both address them) — if the seed generates ids, add an optional `id` to the row type and set it for these six.

```ts
// tests/harness/register-materialise.integration.test.ts
// @vitest-environment node
import './_harness-env';
import { describe, it, expect, afterAll } from 'vitest';
import { getHarness } from './_harness-env';

const { harness, fixture } = getHarness();
const sql = harness.sql;
afterAll(async () => { await harness.stop(); });

describe('Plan 2a — register-fed equations materialise through the REAL saveWorksheet (embedded Postgres)', () => {
  it('saving a surface_inventory carrier on A138-07 writes the six derived rows; an empty carrier clears them to null', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const rows = [
      { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
      { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
    ];
    const r1 = await saveWorksheet({ instanceId: fixture.ws07InstanceId, values: { [fixture.surfaceInventoryFieldId]: { type: 'json', value: { rows } } } });
    expect(r1.ok).toBe(true);
    const read = async (fieldId: string) => (await sql<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`)[0];
    const aC = await read(fixture.a138_07.A_C);
    expect(aC.source_type).toBe('derived');
    expect(Number(aC.value_number)).toBeCloseTo(4826.43, 2);
    expect(Number((await read(fixture.a138_07.C_m)).value_number)).toBeCloseTo(0.9, 6);
    expect(Number((await read(fixture.a138_07.A_E_ba)).value_number)).toBeCloseTo(5362.7, 4);
    const r2 = await saveWorksheet({ instanceId: fixture.ws07InstanceId, values: { [fixture.surfaceInventoryFieldId]: { type: 'json', value: { rows: [] } } } });
    expect(r2.ok).toBe(true);
    expect((await read(fixture.a138_07.A_C)).value_number).toBeNull();
  });
});
```

Run: `pnpm vitest run --project integration tests/harness/register-materialise.integration.test.ts`. If the embedded-Postgres binary is absent on this machine the harness skips-when-absent — record the outcome verbatim in the task report; a skipped integration run is NOT a pass and must be stated as "expected to run, not proven".

- [ ] **Step 6: Full suites** `pnpm test && pnpm -s typecheck && pnpm -s lint`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/eval/materialize-derived.ts src/lib/eval/__tests__/materialize-derived.test.ts src/lib/actions/worksheet.ts src/lib/actions/materialize-registry.ts scripts/migrations/20260916110000_vsme_b04_register_equations.sql scripts/rollback-20260916110000-vsme-b04-register-equations.sql scripts/__tests__/vsme-b04-register-equations-sql.test.ts tests/harness
git rm -q src/lib/eval/materialize-surfaces.ts src/lib/eval/__tests__/materialize-surfaces.test.ts
git commit -m "feat(save): one generic register materialiser replaces the surface + pollutant blocks; VSME-B04 sums as equations (fallback + migration written-not-applied)"
```

---

### Task 9: `carrierSourceState` generalises `surfaceSourceState` (shim keeps the pins)

**Files:**
- Create: `src/lib/eval/carrier-source-state.ts`, `src/lib/eval/__tests__/carrier-source-state.test.ts`
- Modify: `src/lib/eval/surface-source-state.ts` (becomes a shim; exports unchanged)
- Test (existing, unchanged): `src/lib/eval/__tests__/surface-source-state.test.ts`

**Interfaces:**
- Consumes: Task 5 (`prepareRegisterRows`, `REGISTER_CONFIGS_FALLBACK`, `makeTableLookup`, `makeTableRows`), Task 6 (`A138_07_REGISTER_FORMULAS`).
- Produces:
  ```ts
  export type CarrierSourceState = { state: 'missing' | 'incomplete' | 'ok'; complete: number; total: number; message: string | null };
  export function carrierSourceState(carrierRaw: unknown, columns: readonly RegisterColumn[], sourceStatus: string | null, opts: { ownerLabel: string; standardCode: string; legacyMap?; overrideFlagKey?; flagKeys? }): CarrierSourceState;
  export function carrierWithholdFieldIds(fields: ReadonlyArray<{ id: string; symbol: string; inheritedFromWorksheet?: string | null }>, ownerCode: string | null, state: CarrierSourceState['state'], producedSymbols: ReadonlySet<string>): string[];
  // surface-source-state.ts keeps: surfaceSourceState, SURFACE_DERIVED_SYMBOLS, surfaceWithholdFieldIds, SurfaceSourceState — implemented via the generic pair with the surface config and ownerLabel 'A138-07'.
  ```

- [ ] **Step 1: Write the test**

```ts
// src/lib/eval/__tests__/carrier-source-state.test.ts
import { describe, it, expect } from 'vitest';
import { carrierSourceState, carrierWithholdFieldIds } from '../carrier-source-state';
import { REGISTER_CONFIGS_FALLBACK } from '../register-configs';

const cols = REGISTER_CONFIGS_FALLBACK.pollutant_register.columns;
const opts = { ownerLabel: 'VSME-B04.100', standardCode: 'VSME', flagKeys: ['not_applicable'] as const };

describe('carrierSourceState (generic)', () => {
  it('missing / incomplete / ok follow the surface rules with the register config as the completeness source', () => {
    expect(carrierSourceState(null, cols, 'final', opts).state).toBe('missing');
    const rows = [{ id: 'a', label: 'x', pollutant: 'NOT-A-POLLUTANT', medium: 'air', amount_t: 1 }];
    expect(carrierSourceState({ rows }, cols, 'final', opts)).toMatchObject({ state: 'incomplete', complete: 0, total: 1 });
    expect(carrierSourceState({ rows }, cols, 'final', opts).message).toBe('Quelle VSME-B04.100 nicht final (0/1 Zeilen vollständig) — abgeleitete Werte ausgeblendet.');
  });
  it('withholds only produced symbols inherited from the owner', () => {
    const fields = [
      { id: 'a', symbol: 'AmountOfEmissionToAir', inheritedFromWorksheet: 'VSME-B04.100' },
      { id: 'b', symbol: 'pollutant_register', inheritedFromWorksheet: 'VSME-B04.100' },
      { id: 'c', symbol: 'AmountOfEmissionToAir', inheritedFromWorksheet: 'OTHER' },
    ];
    expect(carrierWithholdFieldIds(fields, 'VSME-B04.100', 'incomplete', new Set(['AmountOfEmissionToAir']))).toEqual(['a']);
    expect(carrierWithholdFieldIds(fields, 'VSME-B04.100', 'ok', new Set(['AmountOfEmissionToAir']))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run → FAIL**, then implement `carrier-source-state.ts` (port of `surface-source-state.ts:3-29,46-56` with `prepareRegisterRows(...).rows` supplying `complete`/`total`, messages parameterised by `ownerLabel`: `'Quelle ${ownerLabel} nicht erfasst — abgeleitete Werte ausgeblendet.'` / `'Quelle ${ownerLabel} nicht final (${complete}/${total} Zeilen vollständig) — abgeleitete Werte ausgeblendet.'`). Rewrite `surface-source-state.ts` so `surfaceSourceState(carrierRaw, status)` = `carrierSourceState(carrierRaw, REGISTER_CONFIGS_FALLBACK.surface_inventory.columns, status, { ownerLabel: 'A138-07', standardCode: 'DWA-A-138-1', legacyMap, overrideFlagKey: 'coeff_override' })` and `surfaceWithholdFieldIds(fields, ownerCode, state)` = `carrierWithholdFieldIds(fields, ownerCode, state, new Set(SURFACE_DERIVED_SYMBOLS))`. `SURFACE_DERIVED_SYMBOLS` must equal `Object.values(A138_07_REGISTER_FORMULAS).map(r => r.outputSymbol)` — add that one-line pin to `surface-source-state.test.ts` (extension, not a change).

- [ ] **Step 3: Run** `pnpm vitest run --project unit src/lib/eval/__tests__/surface-source-state.test.ts src/lib/eval/__tests__/carrier-source-state.test.ts` → PASS (all 10 existing surface assertions unchanged).

- [ ] **Step 4: Commit** — `git commit -m "refactor(eval): carrierSourceState generalises the A138-07 upstream-cause gate; surface API is a shim"`

---

### Task 10: `visible_when` — fields and sections hide; hidden symbols reach engine and gates

**Files:**
- Create: `src/lib/compliance/visibility.ts`, `src/lib/compliance/__tests__/visibility.test.ts`, `scripts/migrations/20260916120000_a138_12_visible_when.sql`, `scripts/rollback-20260916120000-a138-12-visible-when.sql`
- Modify: `src/components/worksheet/worksheet-form.tsx:571-632,848-859` (grid + sections), `:392-399` (engine `hiddenSymbols`), the `<ComplianceBlock …>` call (`hiddenSymbols` prop); `src/components/worksheet/compliance-block.tsx:36-73` (prop + lookup); `src/components/worksheet/dynamic-field.tsx:170-175` (remove the two early returns); `src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx:337-340` (sections carry `visibleWhen`); `src/components/worksheet/section-group.tsx:4-11` (type gains `visibleWhen?: string | null`); `src/lib/eval/use-equation-engine.ts` (`Args.hiddenSymbols?: ReadonlySet<string>` — a hidden symbol resolves to `null`); `scripts/_pass3c-validate.ts` (rule); `src/lib/actions/approval-gate.ts:200-206`, `src/lib/eval/evaluate-for-report.ts:408-440`, `src/lib/snapshots/payload.ts:525-540`, `src/lib/pdf/assemble-standard-report.ts:663-670` (compute hidden symbols server-side and pass `opts`)
- Test: `src/components/worksheet/__tests__/visible-when-form.test.tsx` (create), `src/components/worksheet/__tests__/dynamic-field.test.tsx` (existing — if it pins the ASM early returns, those assertions move to the new form test with a `// Plan 2a:` note), `scripts/__tests__/pass3c-validate-visible-when.test.ts` (create)

**Interfaces:**
- Consumes: Task 3 (`evaluateCondition` with `opts`), Task 2 (`extractSymbols` for the importer rule — not needed; the rule is structural).
- Produces:
  ```ts
  // src/lib/compliance/visibility.ts (pure, no React, no DB)
  export const LEGACY_VISIBLE_WHEN: Readonly<Record<string, string>> = {
    soil_bodenart_tab13: "a_s_m_determination_method IS NOT NULL AND a_s_m_determination_method == 'soil_estimate'",
    a_s_m_provenance:    "a_s_m_determination_method IS NOT NULL AND a_s_m_determination_method == 'manual'",
  };   // used while fields.visible_when IS NULL; retired once migration 20260916120000 is applied
  export type VisibilityField = { id: string; symbol: string; sectionId: string | null; visibleWhen?: string | null };
  export type VisibilitySection = { id: string; parentSectionId: string | null; visibleWhen?: string | null };
  export type Visibility = { hiddenFieldIds: Set<string>; hiddenSectionIds: Set<string>; hiddenSymbols: Set<string> };
  export function effectiveVisibleWhen(f: { symbol: string; visibleWhen?: string | null }): string | null;   // f.visibleWhen ?? LEGACY_VISIBLE_WHEN[f.symbol] ?? null
  export function computeVisibility(fields: readonly VisibilityField[], sections: readonly VisibilitySection[], lookup: (sym: string) => Value | undefined): Visibility;
  // rule: a section is hidden iff its own visible_when evaluates to `fail` OR its parent is hidden; a field is hidden iff
  // its effective visible_when evaluates to `fail` OR its section is hidden. pass | pending | manual | not_applicable ⇒ visible.
  ```

- [ ] **Step 1: Write the tests**

```ts
// src/lib/compliance/__tests__/visibility.test.ts
import { describe, it, expect } from 'vitest';
import { computeVisibility, effectiveVisibleWhen } from '../visibility';

const lookup = (vals: Record<string, string | number | null>) => (s: string) => (s in vals ? vals[s] : undefined);
const fields = [
  { id: 'm', symbol: 'a_s_m_determination_method', sectionId: 's1' },
  { id: 'soil', symbol: 'soil_bodenart_tab13', sectionId: 's1' },
  { id: 'prov', symbol: 'a_s_m_provenance', sectionId: 's1' },
  { id: 'x', symbol: 'x', sectionId: 's2', visibleWhen: "sewer_system_type == 'misch'" },
  { id: 'y', symbol: 'y', sectionId: 's3' },
];
const sections = [
  { id: 's1', parentSectionId: null }, { id: 's2', parentSectionId: null },
  { id: 's3', parentSectionId: 's2', visibleWhen: "sewer_system_type == 'trenn'" },
];

describe('computeVisibility', () => {
  it('LEGACY_VISIBLE_WHEN reproduces the two ASM early returns, incl. the null-method case', () => {
    expect(effectiveVisibleWhen({ symbol: 'soil_bodenart_tab13', visibleWhen: null })).toMatch(/soil_estimate/);
    expect(effectiveVisibleWhen({ symbol: 'soil_bodenart_tab13', visibleWhen: 'x == 1' })).toBe('x == 1');
    const v0 = computeVisibility(fields, sections, lookup({}));                                   // method unset ⇒ both hidden (as today)
    expect([...v0.hiddenFieldIds]).toEqual(expect.arrayContaining(['soil', 'prov']));
    const v1 = computeVisibility(fields, sections, lookup({ a_s_m_determination_method: 'soil_estimate' }));
    expect(v1.hiddenFieldIds.has('soil')).toBe(false); expect(v1.hiddenFieldIds.has('prov')).toBe(true);
    expect(v1.hiddenSymbols.has('a_s_m_provenance')).toBe(true);
  });
  it('fail hides; pending / manual keep visible (fail-safe)', () => {
    const v = computeVisibility(fields, sections, lookup({ a_s_m_determination_method: 'manual' }));
    expect(v.hiddenFieldIds.has('x')).toBe(false);          // sewer_system_type missing ⇒ pending ⇒ visible
    const v2 = computeVisibility(fields, sections, lookup({ a_s_m_determination_method: 'manual', sewer_system_type: 'trenn' }));
    expect(v2.hiddenFieldIds.has('x')).toBe(true);
  });
  it('a hidden section hides its fields and its child sections', () => {
    const v = computeVisibility(fields, sections, lookup({ a_s_m_determination_method: 'manual', sewer_system_type: 'misch' }));
    expect(v.hiddenSectionIds.has('s3')).toBe(true);
    expect(v.hiddenFieldIds.has('y')).toBe(true);
    expect(v.hiddenFieldIds.has('x')).toBe(false);
  });
});
```

```tsx
// src/components/worksheet/__tests__/visible-when-form.test.tsx — render proof through WorksheetForm
// Copy the fixture/props scaffolding from src/components/worksheet/__tests__/selection-dispatch-form-render.test.tsx
// (it already renders WorksheetForm with a minimal prop set). Fields: one enum `sewer_system_type` (values misch/trenn),
// one number `x` with visibleWhen "sewer_system_type == 'misch'", one section s3 with visibleWhen "sewer_system_type == 'trenn'"
// holding number `y`; one compliance requirement { code: 'CR-1', condition: 'x >= 1', severity: 'block' }.
// Assertions:
//  1. initial (enum unset): x and y both rendered (pending ⇒ visible); CR-1 badge is "Eingabe erforderlich".
//  2. after selecting 'trenn': x's input is gone from the DOM, y remains, CR-1 badge aria-label is "Nicht anwendbar".
//  3. after selecting 'misch': x back, y (section s3) gone.
```

```ts
// scripts/__tests__/pass3c-validate-visible-when.test.ts
import { describe, it, expect } from 'vitest';
import { validateVisibleWhenNotOnProducer } from '../_pass3c-validate';
describe('importer: visible_when is forbidden on a field other worksheets consume', () => {
  it('flags a produced symbol with consumer_worksheets and visible_when', () => {
    expect(validateVisibleWhenNotOnProducer({ symbol: 'A_C', visible_when: 'x == 1', consumer_worksheets: ['A138-10'] })).toEqual(['field A_C: visible_when on a symbol consumed by A138-10 is not allowed (hidden ⇒ null would blank the consumer)']);
    expect(validateVisibleWhenNotOnProducer({ symbol: 'A_C', visible_when: null, consumer_worksheets: ['A138-10'] })).toEqual([]);
    expect(validateVisibleWhenNotOnProducer({ symbol: 'z', visible_when: 'x == 1', consumer_worksheets: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement**

`visibility.ts`:
```ts
import { evaluateCondition } from './evaluate';
import type { Value } from '@/lib/expr';
export const LEGACY_VISIBLE_WHEN = { /* as in Interfaces */ } as const;
export function effectiveVisibleWhen(f) { return f.visibleWhen ?? (LEGACY_VISIBLE_WHEN as Record<string, string>)[f.symbol] ?? null; }
export function computeVisibility(fields, sections, lookup): Visibility {
  const hides = (cond: string | null) => cond != null && evaluateCondition(cond, lookup).kind === 'fail';
  const parent = new Map(sections.map((s) => [s.id, s.parentSectionId]));
  const own = new Map(sections.map((s) => [s.id, hides(s.visibleWhen ?? null)]));
  const hiddenSectionIds = new Set<string>();
  const isHidden = (id: string | null, seen = new Set<string>()): boolean => {
    if (!id || seen.has(id)) return false; seen.add(id);
    if (hiddenSectionIds.has(id)) return true;
    const h = own.get(id) === true || isHidden(parent.get(id) ?? null, seen);
    if (h) hiddenSectionIds.add(id);
    return h;
  };
  for (const s of sections) isHidden(s.id);
  const hiddenFieldIds = new Set<string>(); const hiddenSymbols = new Set<string>();
  for (const f of fields) {
    if (isHidden(f.sectionId) || hides(effectiveVisibleWhen(f))) { hiddenFieldIds.add(f.id); hiddenSymbols.add(f.symbol); }
  }
  return { hiddenFieldIds, hiddenSectionIds, hiddenSymbols };
}
```
(Evaluation is single-pass over the CURRENT values; a `visible_when` referencing another hidden symbol sees that symbol's stored value — spec §6 says hidden ⇒ null for engine and gates; for visibility chains this first pass is accepted and recorded as a sign-off note: "visibility does not cascade through hidden drivers in one render".)

Form (`worksheet-form.tsx`):
- Build the symbol lookup once (extract the `lookup` memo from `compliance-block.tsx:46-73` into `src/components/worksheet/symbol-lookup.ts` as `makeSymbolLookup(fields, values)` and use it in both places).
- `const visibility = useMemo(() => computeVisibility(fields, sections, symbolLookup), [fields, sections, symbolLookup]);`
- `fieldsBySectionId`: skip `visibility.hiddenFieldIds`; `visibleSectionIds`: additionally exclude `visibility.hiddenSectionIds` (a hidden section never renders even if a child would).
- Engine: `useEquationEngine({ …, hiddenSymbols: visibility.hiddenSymbols })`; in the hook, when resolving a symbol's value for `evalInputs` (`:429-434`), a symbol in `hiddenSymbols` resolves to `null`.
- `<ComplianceBlock … hiddenSymbols={visibility.hiddenSymbols} />`; in the block, `evaluateCondition(cr.condition, lookup, { hiddenSymbols })` for requirements AND for suggestion conditions (`:158`).
- `dynamic-field.tsx:170-175`: delete the two early returns (keep `asmIsLocked`, `asmProvenanceRequired`, badge logic).
- Page: sections map adds `visibleWhen: s.visibleWhen ?? null`; `section-group.tsx` type gains it.

Server consumers (all use the same pure helper with a param-based lookup):
- `approval-gate.ts`: after `lookup` is built (`:205`), load `sections` for the template (`worksheetSections` by `worksheetTemplateId`) and `tmplFields` already has `symbol`; add `sectionId`, `visibleWhen` to the select; `const { hiddenSymbols } = computeVisibility(...)`; `evaluateCondition(r.condition, lookup, { hiddenSymbols })`. `not_applicable` does not block (only `fail` does — unchanged branch).
- `evaluate-for-report.ts` `evaluateWorksheetCompliance(...)`: add `opts?: { hiddenSymbols?: ReadonlySet<string> }` and pass through; the caller (`assemble-standard-report.ts`) computes visibility from its loaded fields/sections/params (it has `resolvedBySymbol`; sections may need one extra select — read `:560-640`).
- `payload.ts`, `assemble-standard-report.ts:663-670`: pass `{ hiddenSymbols }` where fields/sections are in scope; where sections are not loaded, load them (one `db.select().from(worksheetSections)` per template).

Importer: `_pass3c-validate.ts` — add and call in the Fields loop:
```ts
export function validateVisibleWhenNotOnProducer(f: { symbol: string; visible_when?: string | null; consumer_worksheets?: string[] | null }): string[] {
  if (!f.visible_when || !f.consumer_worksheets?.length) return [];
  return [`field ${f.symbol}: visible_when on a symbol consumed by ${f.consumer_worksheets.join(', ')} is not allowed (hidden ⇒ null would blank the consumer)`];
}
```

Migration `scripts/migrations/20260916120000_a138_12_visible_when.sql`:
```sql
-- Plan 2a · DWA-A-138-1 A138-12: the two hardcoded ASM visibility rules become data (retires LEGACY_VISIBLE_WHEN in src/lib/compliance/visibility.ts).
BEGIN;
UPDATE fields f SET visible_when = 'a_s_m_determination_method IS NOT NULL AND a_s_m_determination_method = ''soil_estimate'''
  FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1' AND f.symbol = 'soil_bodenart_tab13' AND f.visible_when IS NULL;
UPDATE fields f SET visible_when = 'a_s_m_determination_method IS NOT NULL AND a_s_m_determination_method = ''manual'''
  FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1' AND f.symbol = 'a_s_m_provenance' AND f.visible_when IS NULL;
COMMIT;
```
Rollback sets both back to `NULL`. Pin the two strings against `LEGACY_VISIBLE_WHEN` in `scripts/__tests__/a138-12-visible-when-sql.test.ts` (note `=` vs `==`: the DSL accepts both — assert on the `'soil_estimate'` / `'manual'` literals and the `IS NOT NULL` guard).

- [ ] **Step 4: Run** `pnpm test && pnpm -s typecheck` → PASS. `dynamic-field.test.tsx`: if it asserted "soil_bodenart_tab13 hidden when method != soil_estimate" through `DynamicField` alone, move that assertion into `visible-when-form.test.tsx` (the decision moved up one level) and leave a comment in the old test.

- [ ] **Step 5: Commit** — `git commit -m "feat(visibility): visible_when for fields and sections; hidden symbols feed engine + gates; A138-12 ASM rules become data (migration written-not-applied, legacy fallback)"`

---

### Task 11: `not_applicable` at every gate consumer

**Files:**
- Modify: `src/components/worksheet/compliance-block.tsx:95-121,130-150,355-430` (count, header chip, badge), `src/lib/snapshots/payload.ts:86,538-550` (`SnapshotComplianceVerdict` gains `'not_applicable'`), `src/lib/snapshots/diff.ts` (verdict rendering — read it), `src/lib/pdf/sections/compliance.tsx:68` (switch), `src/components/pdf/worksheet-section.tsx:197` (badge), `src/components/pdf/pruefmemo-document.tsx:17-18` (counts), `src/lib/actions/approval-gate.ts:228-232` (comment only: N.A. never blocks), `src/lib/pdf/load-conformity.ts` (if it counts gate kinds — grep `kind ===`)
- Test: `src/components/worksheet/__tests__/compliance-block-not-applicable.test.tsx` (create), `src/lib/snapshots/__tests__/*` (extend the verdict mapping test if one exists; else add `payload-not-applicable.test.ts`)

**Interfaces:**
- Consumes: Task 3 (`EvalResult` union), Task 10 (`hiddenSymbols` reaches every `evaluateCondition` call).
- Produces: badge `aria-label="Nicht anwendbar"`, title `Nicht anwendbar — Bedingung bezieht sich auf ein ausgeblendetes Feld`, glyph `–`; header chip `– N n.a.`; `SnapshotComplianceVerdict = 'pass' | 'fail' | 'open' | 'not_applicable'`; PDF badge label `– n.a.`; Prüfmemo counts N.A. separately from passed.

- [ ] **Step 1: Write the tests**

```tsx
// src/components/worksheet/__tests__/compliance-block-not-applicable.test.tsx
// Render <ComplianceBlock> (copy the minimal props from an existing compliance-block test in this folder — grep "ComplianceBlock" in __tests__)
// with fields [{id:'fx', symbol:'x'}], store value x=5, requirements [{ code:'CR-1', condition:'x >= 1', severity:'block' }],
// hiddenSymbols = new Set(['x']). Assert: getByLabelText('Nicht anwendbar') exists; the header shows /1 n\.a\./; no "Warum?" details rendered;
// and with hiddenSymbols = new Set() the badge is 'Erfüllt'.
```
```ts
// payload: evaluateCondition → 'not_applicable' maps to complianceResults[id] = 'not_applicable'
```

- [ ] **Step 2: Run → FAIL** (tsc: `kind` comparison / missing switch case).

- [ ] **Step 3: Implement** — every `switch (result.kind)` / `result.kind ===` site listed in Files gets the new case; run `grep -rn "\.kind === 'manual'\|case 'manual':\|kind === 'pending'" src --include=*.ts --include=*.tsx | grep -v test` and handle each hit that switches on an `EvalResult`. `pnpm -s typecheck` is the completeness check: with `switch` exhaustiveness the compiler names every missed site.

- [ ] **Step 4: Run** `pnpm test && pnpm -s typecheck` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(gates): not_applicable result kind rendered in form, PDF, Prüfmemo, snapshots; never blocks approval"`

---

### Task 12: Close-out — full verification, playbook, sign-off sheet, ledger

**Files:**
- Modify: `docs/superpowers/guideline-to-tool-playbook.md` ("What Plan 2 will add" → "What Plan 2a added" + apply order steps 4–6 + bridge retirement list), `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-2a.md` (create)

- [ ] **Step 1: Whole-branch verification**

```bash
pnpm test && pnpm -s typecheck && pnpm -s lint
pnpm vitest run --project integration tests/harness/register-materialise.integration.test.ts
git status --short   # must be empty
git log --oneline da79b99..HEAD
```
Record the raw counts (tests, files, duration) in the task report — R-1: the command, not the claim.

- [ ] **Step 2: Playbook**

Replace the "What Plan 2 will add" section with "What Plan 2a added (2026-09-16)": the expression language (`src/lib/expr`, function list), `visible_when` semantics (fail hides; pending/manual visible; hidden ⇒ null; gates ⇒ `not_applicable`), register equations (`sum_rows` etc. — Step 5 of the recipe now says: write the derivation as a formula string on an equation row, `input_symbols` = the register symbol), the generic materialiser, and the three deploy-safety bridges with their retiring migrations. Extend "Apply order" with steps 4–6: `20260916100000_a138_07_register_equations.sql` → `20260916110000_vsme_b04_register_equations.sql` → `20260916120000_a138_12_visible_when.sql` (each independent of the others; all after the Plan-1 schema migration; rollback in reverse), and the post-apply cleanup: delete `rewriteRules` A138-07 entries, `FALLBACK_REGISTER_EQUATIONS['VSME-B04.100']`, `LEGACY_VISIBLE_WHEN`, plus the `consumedSymbolsFor` remap union. State plainly: "Plan 2b (editors) is not written yet — registers still render through the bespoke editors; Plan 2a changed computation and persistence only."

- [ ] **Step 3: Sign-off sheet** `SIGN-OFF-plan-2a.md` — one block per decision made in-plan, each with the evidence and a ☐ RATIFIED ☐ REJECTED ☐ DEFER line:
  - D-4 `stdev_rows` = sample standard deviation (n−1); population (n) would change M-820-1 S-Abw and M-1200-2 SD when encoded — cite the two inventories' wording once Plan 3 lifts it; until then the choice is a code default, not a guideline claim.
  - D-5 VSME-B04.100 sums as three equation rows (`imported_unverified`) — replaces code-only materialisation; VSME para 32 quote as evidence.
  - D-6 Visibility does not cascade through hidden drivers within one render (documented limitation).
  - D-7 A138-12 ASM visibility as `visible_when` data — behaviour identical to the early returns incl. null method ⇒ hidden.
  - D-8 Register-fed equations only are materialised server-side (spec §6 also lists "inputs in the saved batch"; scalar-equation materialisation stays with the engine-output-materialization workstream).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/guideline-to-tool-playbook.md docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-2a.md
git commit -m "docs(guideline-to-tool): Plan 2a close-out — playbook apply order, bridge retirement, sign-off sheet"
```

---

## Self-review (run by the plan author before execution)

**Spec coverage (§6 + §8 phases 3–4):** one renderer path → Plan 2b (deliberately split; editors unchanged here) · `visibleFields()` + `visible_when` incl. sections → T10 · one expression language, two entry points, functions `if lookup sum_rows count_rows max_rows min_rows mean_rows stdev_rows last_rows contains cell` → T1–T3 (+ `flag`, added for the VSME carrier flag) · eligibility remains the admission path → T4 · six aggregators → equation rows; `materializeSurfaceOutputs` + pollutant block → one `materializeDerivedOutputs`; inputs from `input_symbols` → T6, T8 · `surfaceSourceState` → `carrierSourceState` → T9 · inheritance unchanged (nothing touched) · `not_applicable` gate kind + importer forbids `visible_when` on consumed producers → T10, T11 · `ac_as_ratio_limit` → TAB6 `lookup_fill` role limit and the risk-register grid column → Plan 2b (need the `lookup_fill` renderer / grid column) · §11 tests: parser, row functions, `visibleFields` with `visible_when`, gate `not_applicable`, materialiser round-trip against embedded Postgres → T1, T2, T10, T11, T8.

**Placeholder scan:** every task carries runnable test code and implementation code; the only "copy from" instructions point at exact existing files and line ranges for fixture scaffolding (T8 harness ids, T10/T11 render-test props), which the executor must open — no TBD/TODO remains.

**Type consistency:** `PreparedRegister { rows: PreparedRow[]; flags }` (T2) is what `prepareRegisterRows` returns (T5) and what `EvalRequest.registers` carries (T6), built identically in the hook (T7), the report path (T7) and the materialiser (T8) via the same `resolveRegisterConfig` / `registerFlagKeys` / `makeTableLookup` / `makeTableRows` calls. `evaluateCondition(cond, lookup, opts)` (T3) is the single signature used by T10 and T11. `A138_07_REGISTER_FORMULAS` (T6) feeds T7's test, T8's tests, T9's pin and the migration pin.
