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
 * `az` (Anzahl Versickerrohre im Rigolenquerschnitt) is the same class: a trench
 * without a seepage pipe has az = 0 (§6.4.2 L1820: "ohne Sickerrohr gilt s_R = s_F",
 * Gl. 21 with az = 0). Readiness run 2026-09-30 (case A6): the client evaluation of
 * Gl. 21 reported d_i/d_a as missing for a pipe-less trench and wrote NULL over the
 * server's s_R = s_F — so the pipe diameters default to 0 exactly when az is 0
 * (CONDITIONAL_ZERO_INPUTS), which is what the server rule
 * (computeRigoleStorageCoefficient) already does. With az > 0 an empty diameter
 * stays a genuinely missing input on both sides.
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
  az: 'Anzahl Versickerrohre im Rigolenquerschnitt (§6.4.2 Gl. 21/22); ohne Sickerrohr az = 0.',
};

/**
 * Inputs that are ZERO when a gate symbol resolves to 0 (or is itself absent-zero):
 * the pipe diameters of Gl. 21/22 only enter the formula multiplied by `az`.
 */
export const CONDITIONAL_ZERO_INPUTS: Readonly<Record<string, { whenZero: string; note: string }>> = {
  d_i: { whenZero: 'az', note: 'Innendurchmesser nur mit Sickerrohr (az > 0); bei az = 0 fällt der Rohrterm in Gl. 21/22 weg.' },
  d_a: { whenZero: 'az', note: 'Außendurchmesser nur mit Sickerrohr (az > 0); bei az = 0 fällt der Rohrterm in Gl. 21/22 weg.' },
};

/** Resolves another symbol's numeric value (null = absent) for the conditional defaults. */
export type AbsentResolver = (symbol: string) => number | null;

/** The value to use when `symbol` has no stored/inherited value: 0 for the
 * optional-zero inputs, 0 for a conditional-zero input whose gate is 0 (when a
 * resolver is given), otherwise null (= genuinely missing). */
export function defaultForAbsent(symbol: string, resolve?: AbsentResolver): number | null {
  if (Object.prototype.hasOwnProperty.call(OPTIONAL_ZERO_INPUTS, symbol)) return 0;
  const cond = Object.prototype.hasOwnProperty.call(CONDITIONAL_ZERO_INPUTS, symbol)
    ? CONDITIONAL_ZERO_INPUTS[symbol]
    : undefined;
  if (cond && resolve) {
    const gate = resolve(cond.whenZero);
    const gateValue = typeof gate === 'number' && Number.isFinite(gate) ? gate : defaultForAbsent(cond.whenZero);
    if (gateValue === 0) return 0;
  }
  return null;
}

/** `value` when present, else the optional-zero default (0) or null. */
export function withAbsentDefault(symbol: string, value: number | null | undefined, resolve?: AbsentResolver): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return defaultForAbsent(symbol, resolve);
}
