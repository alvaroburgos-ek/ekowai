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

export type PreparedRegister = { rows: PreparedRow[]; flags: Record<string, boolean> };

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

export type ConditionOptions = { hiddenSymbols?: ReadonlySet<string> };

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
