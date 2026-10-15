/**
 * F-A8 — the ONE numeric comparison used by the gate DSL (and by any TS-side
 * verdict that re-derives a gate boundary, e.g. Phase-4 `meetsQsac`).
 *
 * Printed limits ("q_S,AC ≥ 2 l/(s·ha)", DWA-A 138-1 Gl. 9) are compared with
 * values computed in IEEE-754; a design sized exactly to the limit yields
 * 1.9999999999999998 and an untolerant `>=` fails it. Two numbers count as
 * EQUAL when
 *
 *   |a − b| ≤ max(REL_TOL · max(|a|, |b|), ABS_TOL)
 *
 * and every operator is derived from that one equality:
 *   >=  a > b or equal       >  a > b and not equal
 *   <=  a < b or equal       <  a < b and not equal
 *   ==  equal                !=  not equal
 *
 * REL_TOL 1e-9 is ~4.5 million ulps at magnitude 1 (far above accumulated
 * rounding in the engine's formulas) yet far below any printed precision in
 * the encoded standards — at EVERY magnitude, because it is purely relative.
 *
 * Fix round 1 (review F-A8 #1): there is NO meaningful absolute floor. A floor
 * of 1e-12 was 2 % of the FLL-GAR limit `gtd_kf_m_s <= 5e-11` and let 5.1e-11
 * pass a block gate. ABS_TOL is Number.MIN_VALUE, so a comparison
 * against literal 0 is exact (0 == 0 and -0 == 0 stay equal via `a === b`).
 * A difference against 0 (`a - b >= 0`) gets its tolerance from the
 * evaluator, which compares the two operands instead (evaluate.ts acompare).
 * Non-numeric comparisons never come here.
 */
export const REL_TOL = 1e-9;
export const ABS_TOL = Number.MIN_VALUE; // 5e-324: only a sub-normal residual counts as 0

export type NumericCompareOp = '>=' | '<=' | '==' | '!=' | '<' | '>';

export function numbersEqual(a: number, b: number): boolean {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= Math.max(REL_TOL * Math.max(Math.abs(a), Math.abs(b)), ABS_TOL);
}

/** Tolerant numeric comparison; returns `false` for an unknown operator. */
export function compareNumbers(a: number, op: string, b: number): boolean {
  const eq = numbersEqual(a, b);
  switch (op) {
    case '>=': return eq || a > b;
    case '<=': return eq || a < b;
    case '==': return eq;
    case '!=': return !eq;
    case '>': return !eq && a > b;
    case '<': return !eq && a < b;
    default: return false;
  }
}
