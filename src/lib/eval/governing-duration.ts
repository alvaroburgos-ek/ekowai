/**
 * Shared governing-duration iteration engine (Piece 1). DWA-A 138-1 §6 defines
 * ONE iterative method and applies it per facility: iterate over durations D,
 * evaluate the facility's own sizing equation at each (D, r_D), take the
 * governing one (the duration that maximizes the required size/volume). The
 * facility's design intensity r_D(n) is then the r_D at that governing D —
 * DERIVED, never free-picked.
 *
 * This module is the iteration scaffold, written ONCE. Each facility supplies
 * only its per-duration sizing function. Pure / DB-free.
 */

export type GoverningResult = {
  governingD: number | null;
  /** The DERIVED r_D(n) the facility uses = r_D at the governing duration. */
  r_D_at_governing: number | null;
  /** The maximized sized quantity at the governing duration. */
  governingValue: number | null;
  perDuration: Array<{ D: number; r_D: number; value: number }>;
};

/**
 * Iterate complete rows, evaluate `sizing(D, r_D)` for each, and take the
 * governing duration = the FIRST argmax (matching the aggregator's strict `>`).
 * Rows with a missing D/r_D, or whose sizing returns null/non-finite, are
 * skipped. Empty result → all-null.
 */
export function iterateGoverningDuration(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  sizing: (D: number, r_D: number) => number | null,
): GoverningResult {
  const perDuration: Array<{ D: number; r_D: number; value: number }> = [];
  for (const row of rows) {
    const D = row.D_min;
    const r_D = row.r_D_n;
    if (typeof D !== 'number' || !Number.isFinite(D)) continue;
    if (typeof r_D !== 'number' || !Number.isFinite(r_D)) continue;
    const value = sizing(D, r_D);
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    perDuration.push({ D, r_D, value });
  }

  let gi = -1;
  let maxV = -Infinity;
  perDuration.forEach((p, i) => {
    if (p.value > maxV) {
      maxV = p.value;
      gi = i;
    }
  });

  if (gi < 0) {
    return { governingD: null, r_D_at_governing: null, governingValue: null, perDuration };
  }
  return {
    governingD: perDuration[gi].D,
    r_D_at_governing: perDuration[gi].r_D,
    governingValue: perDuration[gi].value,
    perDuration,
  };
}

/**
 * Fixed-duration intensity for the no-storage Flächenversickerung exception
 * (§6.2.2 — prescribed D = 10–15 min, NOT iterated). Exact number → that
 * duration's row; range → the in-range row with the largest r_D (most
 * conservative for sizing). Returns null when no complete row matches.
 * NOTE: the range-selection rule is provisional — confirm against §6 L1836/2004
 * when wiring Flächenversickerung (gated build step).
 */
export function fixedDurationIntensity(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  prescribed: number | { min: number; max: number },
): { D: number; r_D: number } | null {
  const complete = rows.filter(
    (r): r is { D_min: number; r_D_n: number } =>
      typeof r.D_min === 'number' && Number.isFinite(r.D_min) &&
      typeof r.r_D_n === 'number' && Number.isFinite(r.r_D_n),
  );
  if (typeof prescribed === 'number') {
    const m = complete.find((r) => r.D_min === prescribed);
    return m ? { D: m.D_min, r_D: m.r_D_n } : null;
  }
  const inRange = complete.filter((r) => r.D_min >= prescribed.min && r.D_min <= prescribed.max);
  if (inRange.length === 0) return null;
  const best = inRange.reduce((a, b) => (b.r_D_n > a.r_D_n ? b : a));
  return { D: best.D_min, r_D: best.r_D_n };
}

/**
 * A facility's governing-duration profile: it supplies its per-duration sizing
 * function (mirroring its DB sizing equation) + the quantity it maximizes. The
 * iteration scaffold (iterateGoverningDuration) is shared. `scalars` is the
 * facility's resolved numeric inputs (validated by the caller).
 */
export type FacilityGoverningProfile = {
  facility: string;
  equationId: string;
  maximizes: string;
  sizing: (D: number, r_D: number, scalars: Record<string, number>) => number | null;
  derived: { rDSymbol: string; governingDSymbol?: string };
};

/** Registered facility profiles. The basin (A138-13/Gl.8) is the first profile;
 * its sizing is the canonical V_VA formula the aggregator now delegates to.
 * Other storage facilities are added at the gated build step (field inventory).
 */
export const GOVERNING_PROFILES: FacilityGoverningProfile[] = [
  {
    facility: 'A138-13',
    equationId: '69f31e6e-a755-4246-af10-ae46668b5c86',
    maximizes: 'V_VA',
    sizing: (D, r_D, s) => {
      const Q_zu = r_D * (s.A_C + s.A_VA) * 1e-4;
      return (Q_zu - s.Q_S - s.Q_Dr) * D * 60 * s.f_Z * s.f_A * 1e-3;
    },
    derived: { rDSymbol: 'r_D_n', governingDSymbol: 'D_min' },
  },
  {
    // A138-22 Beckenversickerung, Gl. 41:
    //   V_VA = ((A_C+A_VA)·1e-7·r_D(n) − A_S_m·k_i − Q_Dr·1e-3)·D·60·f_Z·f_A
    // The one storage facility whose sizing is a clean function of
    // (D, r_D, given scalars): A_S_m is the engineer-supplied basin
    // infiltration area, NOT a D-coupled solve. (m³: inflow & drain in m³/s,
    // D·60 → s; r_D in l/(s·ha) so (A_C+A_VA)·1e-7·r_D = inflow in m³/s.)
    facility: 'A138-22',
    equationId: '433f7700-90cb-410d-8103-7b72f53db8fa',
    maximizes: 'V_VA',
    sizing: (D, r_D, s) =>
      ((s.A_C + s.A_VA) * 1e-7 * r_D - s.A_S_m * s.k_i - s.Q_Dr * 1e-3) *
      D * 60 * s.f_Z * s.f_A,
    derived: { rDSymbol: 'r_D_n_B' },
  },
  {
    // A138-26 Gl. 10 — Flood retention check (§5.3.4).
    //
    //   V_Rück(D) = ((r_D(30) · (AcS_paved + A_VA) / 10000) − (Q_S + Q_Dr))
    //               · D · 60 / 1000  −  V_VA
    //
    // where AcS_paved = Σ(A_E,b,a · C_S)  (peak flood runoff coefficient C_S
    // over befestigte areas, NOT the design-event C_i per Tab. 9).
    //
    // Source: §5.3.4 L1876 — D is ITERATED (governing = max V_Rück across the
    // T_n=30 column); r_D(30) is the 30-column value at each duration D.
    //
    // Floor: the aggregator call site applies max(0, governingValue) — NOT here.
    // scalars expected: { AcS_paved, A_VA, Q_S, Q_Dr, V_VA }
    facility: 'A138-26',
    equationId: '8e3c7e22-e3c7-449a-b267-928332c89306',
    maximizes: 'V_Rueck',
    sizing: (D, r_D, s) =>
      ((r_D * (s.AcS_paved + s.A_VA)) / 10000 - (s.Q_S + s.Q_Dr)) *
      D * 60 / 1000 -
      s.V_VA,
    derived: { rDSymbol: 'r_D_30', governingDSymbol: 'D_min' },
  },
];
