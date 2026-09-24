/**
 * Scope contract + result types for the unified expression evaluator.
 *
 * A `Scope` is how the evaluator reads the outside world: plain symbol
 * values, register (row-set) values, lookup tables, and raw json carriers
 * for `contains()` / `cell()`. Callers build one per evaluation context;
 * the evaluator never touches storage directly.
 */

export type Value = number | string | boolean | null;

export type RowValues = Record<string, Value>;

export type PreparedRow = { id: string; values: RowValues; complete: boolean };

/**
 * `diagnostics` (optional, additive): non-recoverable derived-column failures
 * collected while preparing the rows (`"<column key>: <message>"`), e.g. a
 * column-name typo in `lookup()`. Absent when there were none; recoverable
 * conditions (missing inputs) are never reported here. This is the WARNING
 * channel — the save path surfaces it and the register editor renders it in
 * amber, so only an authoring defect belongs in it.
 *
 * `lookupMisses` (Plan 3 final wave A, defect 5): derived cells that are blank
 * because the regulation table has NO ROW for the row's keys
 * (`"<column key>: lookup(): keine Zeile in <table> für Schlüssel […] (Spalte <col>)"`),
 * deduplicated. Deliberately NOT `diagnostics`: across the corpus a missing
 * table row is the DESIGNED blank badge for a combination the standard does
 * not print (DIN-EN-16941-2 Tab. A.2, DWA-M-1200-2 Tab. 4/6, DWA-M-1200-3
 * Tab. 14, ISO-5667-10 §7.2.2.1, DIN-276 Tab. 4), so warning about it on
 * every healthy project would be noise. It IS the answer to "why is this
 * aggregate manual_required?" (iso5667_1-F-1), and the row functions append it
 * to their failure message.
 */
export type PreparedRegister = {
  rows: PreparedRow[];
  flags: Record<string, boolean>;
  diagnostics?: string[];
  lookupMisses?: string[];
};

export type TableRowValues = Record<string, Value>;

export type Scope = {
  /** `undefined` = no such value (missing); `null`/`''` are also treated as missing. */
  symbol: (sym: string) => Value | undefined;
  /** Register-valued symbols (row sets) for the `*_rows` / `flag()` functions. */
  register?: (sym: string) => PreparedRegister | undefined;
  /** Lookup tables: `undefined` = no row for these keys. */
  table?: (tableCode: string, keys: Value[]) => TableRowValues | undefined;
  /** Raw json carrier for `contains()` / `cell()`. */
  carrier?: (sym: string) => unknown;
};

export type EvalResult =
  | { kind: 'pass' }
  | { kind: 'fail'; reason?: string }
  | { kind: 'pending'; missingSymbols: string[] }
  | { kind: 'manual' }
  | { kind: 'not_applicable'; hiddenSymbols: string[] };

/**
 * `carrier` (Plan 3 final wave A, defect 4): the raw json carrier accessor for
 * `contains()` / `cell()` inside a GATE condition. It lives in the options
 * rather than in a `Scope` because the compliance adapter's value accessor is
 * a bare `(sym) => Value | undefined` function that every call site already
 * passes positionally; `evalCondition` folds it into the scope it builds.
 * Omitted ⇒ `contains()` over a carrier is `pending` (fail-safe), never a
 * verdict.
 */
export type ConditionOptions = { hiddenSymbols?: ReadonlySet<string>; carrier?: (sym: string) => unknown };

/**
 * Thrown by the strict evaluation mode. `recoverable` = true when the
 * failure is a data condition an engineer can resolve by supplying input
 * (missing symbol, empty register, no matching lookup row); false when the
 * expression itself is malformed for its context (wrong argument shape).
 */
export class ExprError extends Error {
  constructor(message: string, public readonly recoverable: boolean) {
    super(message);
    this.name = 'ExprError';
  }
}
