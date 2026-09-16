/**
 * Evaluator for the unified expression language — ONE core, TWO modes.
 *
 *   - strict  (`evalNumber`, `evalValue`): a failure throws `ExprError`
 *     (`recoverable` = data condition vs malformed expression). Reproduces
 *     the semantics and German messages of `src/lib/eval/arithmetic.ts`.
 *   - lenient (`evalCondition`, `evaluateNodeLenient`, `evaluateArithLenient`):
 *     a failure yields `null` / `'missing'` and records missing symbols in
 *     `ctx.missing`. Ported from `src/lib/compliance/evaluate.ts:372-526`.
 *
 * Conditions NEVER throw: `evalNodeCore` always runs its sub-tree with
 * `strict: false`, even when reached from a strict call chain (e.g. the test
 * argument of `if(...)`); the strict caller then decides what a `'missing'`
 * outcome means for it.
 *
 * Row values (`ctx.row`) shadow scope symbols, so a per-row expression like
 * `area_m2 * c_i` reads the row first and falls back to the project scope.
 */

import { parseCondition, parseNumeric } from './parser';
import { isConditionNode, type ArithNode, type Expr, type Node } from './ast';
import { MATH_FUNCTIONS_1, MATH_FUNCTIONS_2, canonicalFunctionName } from './functions';
import {
  ExprError,
  type ConditionOptions,
  type EvalResult,
  type PreparedRegister,
  type PreparedRow,
  type RowValues,
  type Scope,
  type Value,
} from './scope';

type Ctx = { scope: Scope; strict: boolean; missing: Set<string>; row?: RowValues };

type Ternary = 'true' | 'false' | 'missing';

type CallNode = Extract<ArithNode, { kind: 'call' }>;

/** Row functions whose 2nd argument is evaluated per row (identifiers there are column names). */
const ROW_SCOPED_FUNCTIONS: ReadonlySet<string> = new Set([
  'sum_rows', 'max_rows', 'min_rows', 'mean_rows', 'stdev_rows', 'count_rows',
]);

// ---- primitives -----------------------------------------------------------

/** Strict: throw. Lenient: yield null (the caller propagates it). */
function fail(ctx: Ctx, message: string, recoverable = true): null {
  if (ctx.strict) throw new ExprError(message, recoverable);
  return null;
}

function readSymbol(ctx: Ctx, sym: string): Value | undefined {
  if (ctx.row && sym in ctx.row) return ctx.row[sym];
  return ctx.scope.symbol(sym);
}

function isMissing(v: Value | undefined): v is undefined | null | '' {
  return v === undefined || v === null || v === '';
}

/** evaluate.ts:519-526 — finite numbers and numeric strings only. */
function toNumber(v: Value): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function truthy(v: Value): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v !== '' && v.toLowerCase() !== 'false';
  return false;
}

/**
 * Coerce an operand to a number the way evaluate.ts:377-403 did (abool → null,
 * numeric strings ok). A null operand (NULL literal, null lookup cell) is a
 * recoverable `Operand ist keine Zahl: null` in strict mode, null in lenient
 * mode. Strict mode passes non-finite numbers through (arithmetic.ts parity:
 * finiteness is judged on the FINAL result only, see `finite`).
 */
function num(v: Value, ctx: Ctx): number | null {
  if (v === null) return ctx.strict ? fail(ctx, 'Operand ist keine Zahl: null') : null;
  if (ctx.strict && typeof v === 'number') return v;
  const x = toNumber(v);
  return x === null ? fail(ctx, `Operand ist keine Zahl: ${String(v)}`) : x;
}

/**
 * Per-operation finiteness. Strict mode: pass-through — like arithmetic.ts:268
 * only the FINAL result is checked (`evalNumber` / `evalValue`), so
 * `1 / exp(1000)` evaluates to 0. Lenient mode: a non-finite intermediate is
 * null (evaluate.ts:397). Division by zero is caught at the operation in
 * both modes.
 */
function finite(res: number, ctx: Ctx): number | null {
  if (ctx.strict) return res;
  return Number.isFinite(res) ? res : null;
}

function nonFinite(v: Value): never {
  throw new ExprError(`Nicht-endliches Ergebnis: ${String(v)}`, true);
}

// ---- arithmetic core ------------------------------------------------------

/** Arithmetic core. Lenient: null + ctx.missing; strict: throws ExprError. Strings survive (lookup results). */
function evalValueCore(n: ArithNode, ctx: Ctx): Value {
  switch (n.kind) {
    case 'anum': return n.value;
    case 'astr': return n.value;
    case 'abool': return n.value;
    case 'anull': return null;
    case 'aref': {
      const v = readSymbol(ctx, n.symbol);
      if (isMissing(v)) {
        ctx.missing.add(n.symbol);
        return fail(ctx, `Unbekanntes Symbol "${n.symbol}" im Ausdruck.`);
      }
      return v;
    }
    case 'aneg': {
      const x = num(evalValueCore(n.inner, ctx), ctx);
      return x === null ? null : -x;
    }
    case 'abin': {
      const a = num(evalValueCore(n.left, ctx), ctx);
      const b = num(evalValueCore(n.right, ctx), ctx);
      if (a === null || b === null) return null;
      let res: number;
      switch (n.op) {
        case '+': res = a + b; break;
        case '-': res = a - b; break;
        case '*': res = a * b; break;
        case '/':
          if (b === 0) return fail(ctx, 'Division durch Null.');
          res = a / b;
          break;
        case '^': res = Math.pow(a, b); break;
      }
      return finite(res, ctx);
    }
    case 'call': return evalCall(n, ctx);
  }
}

/** Evaluate either kind of expression to a Value (conditions become booleans). */
function evalExpr(e: Expr, ctx: Ctx): Value {
  if (isConditionNode(e)) {
    const t = evalNodeCore(e, ctx);
    if (t === 'missing') return fail(ctx, `Fehlende Eingabe: ${[...ctx.missing].join(', ')}`);
    return t === 'true';
  }
  return evalValueCore(e, ctx);
}

/** A numeric function argument: conditions are rejected, values coerced. */
function numArg(e: Expr, ctx: Ctx): number | null {
  if (isConditionNode(e)) return fail(ctx, 'Bedingung als Zahl verwendet.', false);
  return num(evalValueCore(e, ctx), ctx);
}

function arity(n: CallNode, name: string, k: number, ctx: Ctx): boolean {
  if (n.args.length === k) return true;
  fail(ctx, `Erwarte ${k} Argument(e) in ${name}(...)`);
  return false;
}

// ---- register-valued arguments -------------------------------------------

/** `aref` → Scope.register; `last_rows(regExpr, n)` → the last n COMPLETE rows. */
function resolveRegister(e: Expr, ctx: Ctx): { reg: PreparedRegister; name: string } | null {
  if (e.kind === 'aref') {
    const reg = ctx.scope.register?.(e.symbol);
    if (reg === undefined) {
      ctx.missing.add(e.symbol);
      return fail(ctx, `Unbekanntes Symbol "${e.symbol}" im Ausdruck.`);
    }
    return { reg, name: e.symbol };
  }
  if (e.kind === 'call' && canonicalFunctionName(e.name) === 'last_rows') {
    if (!arity(e, 'last_rows', 2, ctx)) return null;
    const inner = resolveRegister(e.args[0], ctx);
    if (inner === null) return null;
    const count = numArg(e.args[1], ctx);
    if (count === null) return null;
    const take = Math.max(0, Math.floor(count));
    const complete = inner.reg.rows.filter((r) => r.complete);
    return { reg: { rows: take === 0 ? [] : complete.slice(-take), flags: inner.reg.flags }, name: inner.name };
  }
  return fail(ctx, 'Registerausdruck erwartet.', false);
}

/** Complete rows of a register argument; empty → the recoverable "Keine vollständigen Zeilen" failure. */
function completeRowsOrFail(e: Expr, ctx: Ctx): PreparedRow[] | null {
  const r = resolveRegister(e, ctx);
  if (r === null) return null;
  const rows = r.reg.rows.filter((row) => row.complete);
  if (rows.length === 0) {
    ctx.missing.add(r.name);
    return fail(ctx, `Keine vollständigen Zeilen in "${r.name}".`);
  }
  return rows;
}

/** Evaluate `expr` once per row (row values shadow the scope) to numbers. */
function perRowNumbers(rows: PreparedRow[], expr: Expr, ctx: Ctx): number[] | null {
  const xs: number[] = [];
  for (const row of rows) {
    const rowCtx: Ctx = { ...ctx, row: row.values };
    const v = num(evalExpr(expr, rowCtx), rowCtx);
    if (v === null) return null;
    xs.push(v);
  }
  return xs;
}

// ---- function calls -------------------------------------------------------

function evalCall(n: CallNode, ctx: Ctx): Value {
  const name = canonicalFunctionName(n.name);
  if (name === null) {
    return fail(ctx, `Funktionsaufruf "${n.name}(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.`);
  }

  const f1 = MATH_FUNCTIONS_1[name];
  if (f1) {
    if (!arity(n, name, 1, ctx)) return null;
    const a = numArg(n.args[0], ctx);
    return a === null ? null : finite(f1(a), ctx);
  }
  const f2 = MATH_FUNCTIONS_2[name];
  if (f2) {
    if (!arity(n, name, 2, ctx)) return null;
    const a = numArg(n.args[0], ctx);
    const b = numArg(n.args[1], ctx);
    return a === null || b === null ? null : finite(f2(a, b), ctx);
  }

  switch (name) {
    case 'if': {
      if (!arity(n, 'if', 3, ctx)) return null;
      const [test, whenTrue, whenFalse] = n.args;
      let taken: boolean;
      if (isConditionNode(test)) {
        const t = evalNodeCore(test, ctx);
        if (t === 'missing') return fail(ctx, `Fehlende Eingabe für if(): ${[...ctx.missing].join(', ')}`);
        taken = t === 'true';
      } else {
        const v = evalValueCore(test, ctx);
        if (v === null && !ctx.strict) return null; // missing already recorded
        taken = truthy(v);
      }
      // Only the taken branch is evaluated (short-circuit).
      return evalExpr(taken ? whenTrue : whenFalse, ctx);
    }

    case 'lookup': {
      if (n.args.length < 3) {
        return fail(ctx, 'Erwarte mindestens 3 Argument(e) in lookup(...)');
      }
      const first = n.args[0];
      const last = n.args[n.args.length - 1];
      if (first.kind !== 'astr' || last.kind !== 'astr') {
        return fail(ctx, 'lookup(): Tabellencode und Spaltenname müssen Zeichenketten sein.');
      }
      const code = first.value;
      const col = last.value;
      const keys: Value[] = [];
      for (const k of n.args.slice(1, -1)) {
        const v = evalExpr(k, ctx);
        if (v === null) return null;
        keys.push(v);
      }
      if (!ctx.scope.table) return fail(ctx, 'lookup(): kein Tabellenzugriff im Scope.', false);
      const row = ctx.scope.table(code, keys);
      if (row === undefined) {
        return fail(ctx, `lookup(): keine Zeile in ${code} für Schlüssel [${keys.map(String).join(', ')}]`);
      }
      if (!(col in row)) return fail(ctx, `lookup(): Spalte ${col} nicht in ${code}`, false);
      return row[col];
    }

    case 'sum_rows':
    case 'max_rows':
    case 'min_rows':
    case 'mean_rows':
    case 'stdev_rows': {
      if (!arity(n, name, 2, ctx)) return null;
      const rows = completeRowsOrFail(n.args[0], ctx);
      if (rows === null) return null;
      if (name === 'stdev_rows' && rows.length < 2) {
        return fail(ctx, 'stdev_rows(): mindestens 2 vollständige Zeilen erforderlich.');
      }
      const xs = perRowNumbers(rows, n.args[1], ctx);
      if (xs === null) return null;
      const sum = xs.reduce((acc, x) => acc + x, 0);
      switch (name) {
        case 'sum_rows': return finite(sum, ctx);
        case 'max_rows': return finite(Math.max(...xs), ctx);
        case 'min_rows': return finite(Math.min(...xs), ctx);
        case 'mean_rows': return finite(sum / xs.length, ctx);
        default: {
          // SAMPLE standard deviation (n − 1).
          const mean = sum / xs.length;
          const ss = xs.reduce((acc, x) => acc + (x - mean) ** 2, 0);
          return finite(Math.sqrt(ss / (xs.length - 1)), ctx);
        }
      }
    }

    case 'count_rows': {
      if (n.args.length < 1 || n.args.length > 2) {
        return fail(ctx, 'Erwarte 1 oder 2 Argument(e) in count_rows(...)');
      }
      const r = resolveRegister(n.args[0], ctx);
      if (r === null) return null;
      const rows = r.reg.rows.filter((row) => row.complete);
      if (n.args.length === 1) return rows.length;
      // RULE (controller ruling, Task 2 fix round 1): an undecidable row makes
      // the whole count undecidable. Lenient: null + the row's missing symbols
      // go to ctx.missing (gate → pending). Strict: recoverable ExprError.
      // The condition path and the truthy-value path behave identically —
      // both are evaluated leniently per row and judged on the outcome.
      const cond = n.args[1];
      let count = 0;
      for (const row of rows) {
        const rowMissing = new Set<string>();
        const rowCtx: Ctx = { ...ctx, strict: false, row: row.values, missing: rowMissing };
        let matched: boolean | null;
        if (isConditionNode(cond)) {
          const t = evalNodeCore(cond, rowCtx);
          matched = t === 'missing' ? null : t === 'true';
        } else {
          const v = evalValueCore(cond, rowCtx);
          matched = v === null ? null : truthy(v);
        }
        if (matched === null) {
          for (const m of rowMissing) ctx.missing.add(m);
          return fail(ctx, `Fehlende Eingabe für count_rows(): ${[...ctx.missing].join(', ')}`);
        }
        if (matched) count++;
      }
      return count;
    }

    case 'last_rows':
      return fail(ctx, 'last_rows(): nur als Registerargument zulässig.', false);

    case 'contains': {
      if (!arity(n, 'contains', 2, ctx)) return null;
      const target = n.args[0];
      if (target.kind !== 'aref') return fail(ctx, 'contains(): Symbol erwartet.', false);
      const raw = ctx.scope.carrier?.(target.symbol);
      const list = Array.isArray(raw)
        ? raw
        : raw !== null && typeof raw === 'object' && Array.isArray((raw as { selected?: unknown }).selected)
          ? ((raw as { selected: unknown[] }).selected)
          : undefined;
      if (list === undefined) {
        ctx.missing.add(target.symbol);
        return fail(ctx, `Unbekanntes Symbol "${target.symbol}" im Ausdruck.`);
      }
      const needle = evalExpr(n.args[1], ctx);
      if (needle === null) return null;
      return list.some((x) => String(x) === String(needle));
    }

    case 'cell': {
      if (!arity(n, 'cell', 3, ctx)) return null;
      const target = n.args[0];
      if (target.kind !== 'aref') return fail(ctx, 'cell(): Symbol erwartet.', false);
      const raw = ctx.scope.carrier?.(target.symbol);
      if (raw === undefined) {
        ctx.missing.add(target.symbol);
        return fail(ctx, `Unbekanntes Symbol "${target.symbol}" im Ausdruck.`);
      }
      const r = evalExpr(n.args[1], ctx);
      const c = evalExpr(n.args[2], ctx);
      if (r === null || c === null) return null;
      const cells = raw !== null && typeof raw === 'object'
        ? (raw as { cells?: Record<string, Record<string, Value> | undefined> }).cells
        : undefined;
      const v = cells?.[String(r)]?.[String(c)];
      if (isMissing(v)) return fail(ctx, `cell(): ${String(r)}/${String(c)} nicht vorhanden`);
      return v;
    }

    case 'flag': {
      if (!arity(n, 'flag', 2, ctx)) return null;
      const r = resolveRegister(n.args[0], ctx);
      if (r === null) return null;
      const key = evalExpr(n.args[1], ctx);
      if (key === null) return null;
      return r.reg.flags[String(key)] === true;
    }

    default:
      return fail(ctx, `Funktionsaufruf "${n.name}(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.`);
  }
}

// ---- condition core (port of evaluate.ts:405-485) -------------------------

/**
 * The legacy var-vs-var rule (compliance/evaluate.ts:426-436, on the `compare`
 * node) extended to a call-result LHS (`lookup(...) == paved` parses as
 * `acompare` with an `aref` RHS): a bare-ident RHS of `==`/`!=` resolves as a
 * symbol when it HAS a value, otherwise it is its own name as a string
 * literal (an enum value). `extractSymbols` skips it for the same reason.
 * Controller ruling 2026-09-17 (Task 2, C-1).
 */
function isEnumRhs(n: Extract<Node, { kind: 'acompare' }>): boolean {
  return (n.op === '==' || n.op === '!=') && n.right.kind === 'aref';
}

function evalNodeCore(n: Node, ctx: Ctx): Ternary {
  // Conditions never throw — even inside a strict call chain.
  const c: Ctx = ctx.strict ? { ...ctx, strict: false } : ctx;
  switch (n.kind) {
    case 'lit':
      if (typeof n.value === 'boolean') return n.value ? 'true' : 'false';
      return 'missing'; // a bare literal as a condition isn't meaningful
    case 'truthy': {
      const v = readSymbol(c, n.symbol);
      if (isMissing(v)) { c.missing.add(n.symbol); return 'missing'; }
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      return 'true';
    }
    case 'exists': {
      const v = readSymbol(c, n.symbol);
      const exists = !isMissing(v);
      const result = n.negate ? exists : !exists;
      return result ? 'true' : 'false';
    }
    case 'compare': {
      const v = readSymbol(c, n.symbol);
      if (isMissing(v)) { c.missing.add(n.symbol); return 'missing'; }
      let r = n.rhs.value;
      // Var-vs-var equality (evaluate.ts review finding #1): a bare-ident RHS
      // that IS a symbol WITH a value compares against that value; enum
      // literals never resolve as symbols, so enum gates keep string semantics.
      if (typeof r === 'string' && (n.op === '==' || n.op === '!=')) {
        const resolved = readSymbol(c, r);
        if (!isMissing(resolved)) r = resolved;
      }
      return compare(v, n.op, r) ? 'true' : 'false';
    }
    case 'acompare': {
      const l = evalValueCore(n.left, c);
      let r: Value;
      if (isEnumRhs(n)) {
        // Same rule as `compare` above, for a non-symbol LHS (e.g. a lookup()).
        const sym = (n.right as Extract<ArithNode, { kind: 'aref' }>).symbol;
        const resolved = readSymbol(c, sym);
        r = isMissing(resolved) ? sym : resolved;
      } else {
        r = evalValueCore(n.right, c);
      }
      if (l === null || r === null) return 'missing';
      if (n.op === '==' || n.op === '!=') return compare(l, n.op, r) ? 'true' : 'false';
      // Relational: both sides must be numeric (evaluate.ts:377-403 → null → missing).
      const ln = toNumber(l);
      const rn = toNumber(r);
      if (ln === null || rn === null) return 'missing';
      return compare(ln, n.op, rn) ? 'true' : 'false';
    }
    case 'in': {
      const v = readSymbol(c, n.symbol);
      if (isMissing(v)) { c.missing.add(n.symbol); return 'missing'; }
      return n.members.some((m) => equals(v, m.value)) ? 'true' : 'false';
    }
    case 'and': {
      const l = evalNodeCore(n.left, c);
      const r = evalNodeCore(n.right, c);
      if (l === 'false' || r === 'false') return 'false';
      if (l === 'missing' || r === 'missing') return 'missing';
      return 'true';
    }
    case 'or': {
      const l = evalNodeCore(n.left, c);
      const r = evalNodeCore(n.right, c);
      if (l === 'true' || r === 'true') return 'true';
      if (l === 'missing' || r === 'missing') return 'missing';
      return 'false';
    }
    case 'not': {
      const v = evalNodeCore(n.inner, c);
      if (v === 'missing') return 'missing';
      return v === 'true' ? 'false' : 'true';
    }
    case 'guard': {
      // IF guard THEN body — vacuously pass when the guard is false; pending
      // when the guard is missing (only the guard's symbols are reported).
      const guardMissing = new Set<string>();
      const g = evalNodeCore(n.guard, { ...c, missing: guardMissing });
      if (g === 'missing') {
        for (const m of guardMissing) c.missing.add(m);
        return 'missing';
      }
      if (g === 'false') return 'true';
      return evalNodeCore(n.body, c);
    }
  }
}

function compare(v: Value, op: string, r: Value): boolean {
  // Numeric comparison if both sides parse to finite numbers.
  const ln = toNumber(v);
  const rn = toNumber(r);
  if (ln !== null && rn !== null) {
    switch (op) {
      case '>=': return ln >= rn;
      case '<=': return ln <= rn;
      case '==': return ln === rn;
      case '!=': return ln !== rn;
      case '<': return ln < rn;
      case '>': return ln > rn;
    }
  }
  // Equality across heterogeneous types — coerce to string.
  if (op === '==') return equals(v, r);
  if (op === '!=') return !equals(v, r);
  return false;
}

function equals(a: Value, b: Value): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a === typeof b) return a === b;
  // boolean ↔ string ('true'/'false')
  if (typeof a === 'boolean' && typeof b === 'string') return String(a).toLowerCase() === b.toLowerCase();
  if (typeof a === 'string' && typeof b === 'boolean') return a.toLowerCase() === String(b).toLowerCase();
  // number ↔ string
  if (typeof a === 'number' && typeof b === 'string') return a === Number(b);
  if (typeof a === 'string' && typeof b === 'number') return Number(a) === b;
  return false;
}

// ---- entry points ---------------------------------------------------------

/** Strict numeric evaluation (arithmetic.ts semantics). Throws ExprError / parse Error. */
export function evalNumber(src: string, scope: Scope): number {
  const p = parseNumeric(src);
  if (!p.ok) throw new Error(p.message);
  const v = evalValueCore(p.node, { scope, strict: true, missing: new Set() });
  if (typeof v !== 'number' || !Number.isFinite(v)) return nonFinite(v);
  return v;
}

/**
 * Strict evaluation of a parsed expression; string/boolean results allowed
 * (derived register cells). A numeric result is finiteness-checked here
 * (final result only, arithmetic.ts parity).
 */
export function evalValue(node: Expr, scope: Scope, row?: RowValues): Value {
  const v = evalExpr(node, { scope, strict: true, missing: new Set(), row });
  if (typeof v === 'number' && !Number.isFinite(v)) return nonFinite(v);
  return v;
}

/**
 * Lenient gate evaluation. Unparseable input or an unknown function name →
 * `manual`; a referenced symbol in `opts.hiddenSymbols` → `not_applicable`
 * (before any evaluation); missing values → `pending`; else pass/fail.
 */
export function evalCondition(src: string, scope: Scope, opts?: ConditionOptions): EvalResult {
  const ast = parseCondition(src);
  if (!ast) return { kind: 'manual' };
  if (unknownFunctionNames(ast).length > 0) return { kind: 'manual' };
  const hiddenSet = opts?.hiddenSymbols;
  if (hiddenSet && hiddenSet.size > 0) {
    const hidden = [...extractSymbols(ast)].filter((s) => hiddenSet.has(s));
    if (hidden.length > 0) return { kind: 'not_applicable', hiddenSymbols: hidden };
  }
  const ctx: Ctx = { scope, strict: false, missing: new Set() };
  const r = evalNodeCore(ast, ctx);
  if (r === 'missing') return { kind: 'pending', missingSymbols: [...ctx.missing] };
  return r === 'true' ? { kind: 'pass' } : { kind: 'fail' };
}

export function evaluateNodeLenient(n: Node, scope: Scope): Ternary {
  return evalNodeCore(n, { scope, strict: false, missing: new Set() });
}

export function evaluateArithLenient(n: ArithNode, scope: Scope): number | null {
  const v = evalValueCore(n, { scope, strict: false, missing: new Set() });
  return v === null ? null : toNumber(v);
}

// ---- static walks ---------------------------------------------------------

/**
 * Free symbol references an expression would look up at evaluation time
 * (evaluate.ts:562-593 rules, plus every call argument). Excludes string
 * literals and enum-literal RHS positions (`IN {a,b}`, `x == enum_val`,
 * `lookup(...) == enum_val`).
 */
export function extractSymbols(e: Expr): Set<string> {
  const out = new Set<string>();
  const walkAny = (arg: Expr): void => {
    if (isConditionNode(arg)) walk(arg);
    else walkArith(arg);
  };
  // The register argument of a row function: the register symbol itself is a
  // free symbol; a `last_rows(regExpr, n)` wrapper contributes its register
  // and its count expression.
  const walkRegisterArg = (arg: Expr): void => {
    if (arg.kind === 'call' && canonicalFunctionName(arg.name) === 'last_rows') {
      if (arg.args[0]) walkRegisterArg(arg.args[0]);
      if (arg.args[1]) walkAny(arg.args[1]);
      return;
    }
    walkAny(arg);
  };
  const walkArith = (n: ArithNode): void => {
    switch (n.kind) {
      case 'aref': out.add(n.symbol); return;
      case 'aneg': walkArith(n.inner); return;
      case 'abin': walkArith(n.left); walkArith(n.right); return;
      case 'call': {
        if (ROW_SCOPED_FUNCTIONS.has(canonicalFunctionName(n.name) ?? '')) {
          // Row functions: only the register argument is a free symbol.
          // Identifiers inside the row-scoped expression / condition
          // (2nd argument) are COLUMN names of that register, so they are not
          // collected. Consequence, by design: a worksheet symbol read
          // through the scope fallback inside a row expression (e.g.
          // `limit` in `count_rows(samples, v <= limit)`) is invisible to
          // the hidden-symbol check of `evalCondition`.
          if (n.args[0]) walkRegisterArg(n.args[0]);
          return;
        }
        for (const arg of n.args) walkAny(arg);
        return;
      }
      default: return; // anum/astr/abool/anull carry no symbol
    }
  };
  const walk = (n: Node): void => {
    switch (n.kind) {
      case 'truthy': out.add(n.symbol); return;
      case 'exists': out.add(n.symbol); return;
      case 'in': out.add(n.symbol); return; // members are literals, not looked-up symbols
      case 'compare': out.add(n.symbol); return; // rhs is a literal (incl. bare-ident enum value)
      case 'acompare':
        walkArith(n.left);
        if (!isEnumRhs(n)) walkArith(n.right);
        return;
      case 'and':
      case 'or': walk(n.left); walk(n.right); return;
      case 'not': walk(n.inner); return;
      case 'guard': walk(n.guard); walk(n.body); return;
      case 'lit': return;
    }
  };
  if (isConditionNode(e)) walk(e);
  else walkArith(e);
  return out;
}

/** Call names (as written, deduplicated, in order) the evaluator does not support. */
export function unknownFunctionNames(e: Expr): string[] {
  const out: string[] = [];
  const walkArith = (n: ArithNode): void => {
    switch (n.kind) {
      case 'aneg': walkArith(n.inner); return;
      case 'abin': walkArith(n.left); walkArith(n.right); return;
      case 'call':
        if (canonicalFunctionName(n.name) === null && !out.includes(n.name)) out.push(n.name);
        for (const arg of n.args) {
          if (isConditionNode(arg)) walk(arg);
          else walkArith(arg);
        }
        return;
      default: return;
    }
  };
  const walk = (n: Node): void => {
    switch (n.kind) {
      case 'acompare': walkArith(n.left); walkArith(n.right); return;
      case 'and':
      case 'or': walk(n.left); walk(n.right); return;
      case 'not': walk(n.inner); return;
      case 'guard': walk(n.guard); walk(n.body); return;
      default: return; // lit/truthy/exists/in/compare contain no calls
    }
  };
  if (isConditionNode(e)) walk(e);
  else walkArith(e);
  return out;
}
