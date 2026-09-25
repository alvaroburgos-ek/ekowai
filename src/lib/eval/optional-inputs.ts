/**
 * Inputs that are ZERO when no worksheet produces them.
 *
 * `Q_Dr` (mittlerer Drosselabfluss, l/s) is the throttled discharge of a
 * Mulden-Rigolen-System — produced by A138-20 Gl. 33 and consumed by
 * Gl. 8, 9 (A138-13), 19, 23 (A138-18), 32 (A138-20), 41 (A138-22) and
 * 10 (A138-26). Every other facility type has no throttle: the drain term is
 * physically zero, not unknown. Treating the absent value as "missing input"
 * left Gl. 8 and Gl. 9 red on every project without an MRS (first real run,
 * project TEST-A138-BESS-Mulde, 2026-09-19: "Fehlende Eingaben: Q_Dr").
 *
 * The default applies ONLY when no value exists anywhere in the project. As
 * soon as A138-20 is designed, its Q_Dr is inherited and wins. The server
 * flood-check path already did `(await fvReadNum('Q_Dr')) ?? 0`; this makes
 * the client hook, the report evaluator, the snapshot payload and the basin
 * sweep agree with it. The substituted map shows `Q_Dr = 0`, so the reader
 * sees the assumption.
 */
export const OPTIONAL_ZERO_INPUTS: Readonly<Record<string, string>> = {
  Q_Dr: 'Drosselabfluss nur bei Mulden-Rigolen-System (A138-20, Gl. 33); ohne Drossel Q_Dr = 0.',
};

/** The value to use when `symbol` has no stored/inherited value: 0 for the
 * optional-zero inputs, otherwise null (= genuinely missing). */
export function defaultForAbsent(symbol: string): number | null {
  return Object.prototype.hasOwnProperty.call(OPTIONAL_ZERO_INPUTS, symbol) ? 0 : null;
}

/** `value` when present, else the optional-zero default (0) or null. */
export function withAbsentDefault(symbol: string, value: number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return defaultForAbsent(symbol);
}
