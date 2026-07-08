/**
 * Server-side materialization for the basin governing duration + intensity.
 *
 * Mirrors materialize-surfaces.ts: pure function, no DB, no side-effects.
 * Called from saveWorksheet when the saved instance is A138-13, to persist
 * the governing { r_D_n, D_min } pair to project_parameters so A138-10 can
 * inherit them (same-symbol producer/consumer relationship).
 *
 * Design constraints:
 * - Reuse the REGISTERED A138-13 basin profile in GOVERNING_PROFILES (do NOT
 *   re-derive the sizing formula).
 * - Reuse the existing column resolution chain:
 *   normalizeRainfallCarrier → resolveSelectedTable → resolveColumn.
 * - Return null when the column is missing/withheld OR any required scalar is
 *   missing — A138-10 then blanks-with-cause (no stale persist).
 * - Match the aggregator's governing-selection logic EXACTLY so the persisted
 *   values are identical to what the live engine displays.
 */

import { iterateGoverningDuration, GOVERNING_PROFILES } from './governing-duration';
import {
  normalizeRainfallCarrier,
  resolveSelectedTable,
  resolveColumn,
} from './rainfall-tables';

export type BasinGoverningOutput = {
  /** The DERIVED r_D(n) at the governing duration (l/(s·ha)). */
  r_D_n: number;
  /** The governing duration D_min (minutes). */
  D_min: number;
};

export type BasinGoverningInput = {
  /** Raw carrier value from project_parameters (JSON blob). */
  carrierRaw: unknown;
  /** rainfall_table_ref: the facility's selected table id, or null for primary. */
  rainfallTableRef: string | null;
  /** Resolved T_n (years). Null when not determinable (native table → withhold). */
  T_n: number | null;
  /** The six scalar inputs A138-13 Gl.8 requires, as resolved numbers. */
  scalars: {
    A_C: number;
    A_VA: number;
    Q_S: number;
    Q_Dr: number;
    f_Z: number;
    f_A: number;
  };
};

/** All six scalar symbols required by Gl.8. */
const REQUIRED_SCALAR_KEYS = ['A_C', 'A_VA', 'Q_S', 'Q_Dr', 'f_Z', 'f_A'] as const;

/**
 * Resolve the basin governing duration and intensity from the rainfall carrier +
 * scalars. Returns `{ r_D_n, D_min }` when both are determinable (column
 * resolved, all scalars finite, iteration yields a governing row), or `null`
 * when any prerequisite is missing (→ no persist → A138-10 blanks-with-cause).
 *
 * Matches the a138_13_gl8 aggregator's logic exactly:
 *  - resolveColumn status 'ok' or 'legacy' → proceed; 'missing' → null.
 *  - iterateGoverningDuration with the registered basin profile's sizing fn.
 *  - governingD / r_D_at_governing from GoverningResult.
 */
export function materializeBasinGoverning(
  input: BasinGoverningInput,
): BasinGoverningOutput | null {
  // 1. Scalar guard — all six must be finite numbers.
  for (const key of REQUIRED_SCALAR_KEYS) {
    const v = input.scalars[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return null;
    }
  }

  // 2. Resolve the column from the carrier using the same chain as the aggregator.
  const carrier = normalizeRainfallCarrier(input.carrierRaw);
  const table = resolveSelectedTable(carrier, input.rainfallTableRef);
  if (!table) return null;

  const col = resolveColumn(table, input.T_n);
  if (col.status === 'missing') return null;
  // col.rows is the 1D slice the iteration consumes.
  const rows = col.rows;
  if (rows.length === 0) return null;

  // 3. Delegate to iterateGoverningDuration with the registered basin profile.
  //    This is the SINGLE definition of the sizing formula — not duplicated here.
  const basinProfile = GOVERNING_PROFILES.find((p) => p.facility === 'A138-13');
  if (!basinProfile) return null; // defensive — profile always registered

  const scalarBag = {
    A_C: input.scalars.A_C,
    A_VA: input.scalars.A_VA,
    Q_S: input.scalars.Q_S,
    Q_Dr: input.scalars.Q_Dr,
    f_Z: input.scalars.f_Z,
    f_A: input.scalars.f_A,
  };

  const governing = iterateGoverningDuration(
    rows,
    (D, r_D) => basinProfile.sizing(D, r_D, scalarBag),
  );

  // 4. Check result is determinable.
  if (
    governing.governingD === null ||
    governing.r_D_at_governing === null
  ) {
    return null;
  }

  return {
    r_D_n: governing.r_D_at_governing,
    D_min: governing.governingD,
  };
}
