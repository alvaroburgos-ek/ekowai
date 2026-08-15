/**
 * DWA-A 138-1 — materialize the single-sourced mean infiltration area A_S,m.
 *
 * Pure / DB-free. Given the active determination method + its inputs, returns
 * the flat A_S_m value to persist on A138-12 and a discriminated AsmState. The
 * server (worksheet.ts) supplies inputs and persists the outputs; consumers read
 * A_S_m by reference and never see the method.
 */
import {
  type AsmMethod, type FacilityType, type Tab13Bodenart, type AsmState,
  resolveAsmProducer, computeDirect, computeSoilEstimate,
} from './asm-source';
import type { FacilityType as SummaryFacilityType } from './phase4-summary';
import { iterateGoverningDuration } from './governing-duration';

/**
 * A-2: Mulde Gl.16 is iterative over Dauerstufen. Evaluate
 *   A_S,m(D,r_D) = (A_C·1e-7·r_D) / (h_M/(D·60·f_Z) + k_i)
 * at each tabulated (D, r_D(n)) and take the GOVERNING = maximum required area.
 * Reuses Piece-A's iterateGoverningDuration engine.
 */
export function computeMuldeGeometrySweep(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  scalars: { A_C: number; h_M: number; f_Z: number; k_i: number },
): { A_S_m: number | null; governingD: number | null; boundaryLimited: boolean } {
  const gov = iterateGoverningDuration(rows, (D, r_D) =>
    (scalars.A_C * 1e-7 * r_D) / (scalars.h_M / (D * 60 * scalars.f_Z) + scalars.k_i),
  );
  return { A_S_m: gov.governingValue, governingD: gov.governingD, boundaryLimited: gov.boundaryLimited };
}

/**
 * §6.4.2 Gl.21 (exact) / Gl.22 (thin-wall) — SERVER compute of the Rigole storage
 * coefficient s_R. Pure.
 *
 *   Gl.21:  s_R = (s_F/(b_R·h_R)) · [ b_R·h_R + az·(π/4)·( (1/s_F)·d_i² − d_a² ) ]
 *   Gl.22:  s_R = (s_F/(b_R·h_R)) · [ b_R·h_R + az·(π·d²/4)·( (1/s_F) − 1 ) ]   (d ≈ d_i ≈ d_a)
 *
 * When az (embedded-pipe count) is 0/absent the pipe term vanishes → s_R = s_F.
 * Gl.21 is the default (exact); Gl.22 is used only when the engineer flags
 * thin-wall pipes. Returns null when a required input is missing/non-finite.
 */
export function computeRigoleStorageCoefficient(inputs: {
  s_F: number | null;
  b_R: number | null;
  h_R: number | null;
  az: number | null;
  d_i: number | null;
  d_a: number | null;
  /** true → Gl.22 thin-wall (d ≈ d_i); default false → Gl.21 exact. */
  thinWall?: boolean;
}): number | null {
  const { s_F, b_R, h_R } = inputs;
  if (s_F == null || b_R == null || h_R == null) return null;
  if (![s_F, b_R, h_R].every(Number.isFinite)) return null;
  if (b_R === 0 || h_R === 0 || s_F === 0) return null;
  const az = inputs.az != null && Number.isFinite(inputs.az) ? inputs.az : 0;
  const bhr = b_R * h_R;
  if (az === 0) {
    // No embedded pipes → the bracket collapses to b_R·h_R → s_R = s_F.
    return s_F;
  }
  if (inputs.thinWall) {
    const d = inputs.d_i;
    if (d == null || !Number.isFinite(d)) return null;
    // Gl.22: pipe term az·(π·d²/4)·(1/s_F − 1).
    const pipeTerm = az * ((Math.PI * d * d) / 4) * (1 / s_F - 1);
    return (s_F / bhr) * (bhr + pipeTerm);
  }
  const d_i = inputs.d_i;
  const d_a = inputs.d_a;
  if (d_i == null || d_a == null || !Number.isFinite(d_i) || !Number.isFinite(d_a)) return null;
  // Gl.21: pipe term az·(π/4)·((1/s_F)·d_i² − d_a²).
  const pipeTerm = az * (Math.PI / 4) * ((1 / s_F) * d_i * d_i - d_a * d_a);
  return (s_F / bhr) * (bhr + pipeTerm);
}

/**
 * §6.7.2 Gl.37 — SERVER sweep of the governing shaft design head h_S.
 *
 *   h_S(D,r_D) = ( A_C·1e-7·r_D − (π·d_a²/4)·k_i )
 *              / ( π·d_i²/(4·D·60·f_Z) + d_a·π·k_i/2 )
 *
 * Iterate over the tabulated (D, r_D) rows and take the GOVERNING = maximum required
 * head (mirrors the Mulde sweep). Returns { h_S, governingD }. Gl.36 then gives the
 * geometric volume V_S = π·d_i²/4·h_S at that governing head.
 */
export function computeSchachtHeadSweep(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  scalars: { A_C: number; d_a: number; d_i: number; k_i: number; f_Z: number },
): { h_S: number | null; governingD: number | null; boundaryLimited: boolean } {
  const { A_C, d_a, d_i, k_i, f_Z } = scalars;
  const gov = iterateGoverningDuration(rows, (D, r_D) => {
    const numerator = A_C * 1e-7 * r_D - (Math.PI * d_a * d_a) / 4 * k_i;
    const denominator = (Math.PI * d_i * d_i) / (4 * D * 60 * f_Z) + (d_a * Math.PI * k_i) / 2;
    if (denominator === 0) return null;
    return numerator / denominator;
  });
  return { h_S: gov.governingValue, governingD: gov.governingD, boundaryLimited: gov.boundaryLimited };
}

/**
 * Finding F — the facility GOVERNING STORAGE VOLUME rule (pure).
 *
 * The geometry sweep (server-side) yields the footprint A_S_m / a governing head;
 * the governing storage volume is derived and MUST be persisted onto the facility
 * worksheet's volume field so the A138-23 summary can read it (engine-output-
 * materialization gap fix).
 *
 * Source-verified per facility (DWA-A 138-1):
 *   mulde   → V_M  = A_S,m · h_M                         (§6.3.2 Gl.15)
 *   rigole  → V_R  = b_R · h_R · L_R · s_R               (§6.4.2 Gl.20; s_R via Gl.21/22)
 *   mre     → V_MR = V_M + V_R                           (§6.5.2 Gl.26)  [cross-ws sum]
 *   schacht → V_S  = π · d_i²/4 · h_S                    (§6.7.2 Gl.36; h_S swept via Gl.37)
 *   becken  → V_B  = Gl.41 governing sweep               (§6.8.2 Gl.41)  [server-provided]
 *   flaeche → none (area device, §6.2.2 Gl.12 A_S is an area)
 *   mrs     → V_MUE — EXCLUDED (blocked on a ratification: source storage = V_MR not
 *             V_MUE, and A138-20 has no V_MR field). Returns null.
 *
 * @returns the governing volume, or null when an input is missing / non-finite / the
 *   facility's rule is excluded.
 */
export type FacilityGoverningVolumeInputs = {
  /** Governing footprint from the sweep (A_S,m). */
  A_S_m: number | null;
  /** Mulde depth h_M. */
  h_M: number | null;
  // ── Rigole (Gl.20) ──
  b_R?: number | null;
  h_R?: number | null;
  L_R?: number | null;
  s_R?: number | null;
  // ── MRE (Gl.26) — persisted component volumes ──
  V_M?: number | null;
  V_R?: number | null;
  // ── Schacht (Gl.36) — inner diameter + swept governing head ──
  d_i?: number | null;
  h_S?: number | null;
  // ── Becken (Gl.41) — server-provided governing volume (from the Gl.41 sweep) ──
  V_B_governing?: number | null;
};

export function facilityGoverningVolume(
  facilityType: SummaryFacilityType,
  inputs: FacilityGoverningVolumeInputs,
): number | null {
  const finite = (x: number | null | undefined): x is number =>
    x != null && Number.isFinite(x);
  switch (facilityType) {
    case 'mulde': {
      const { A_S_m, h_M } = inputs;
      if (!finite(A_S_m) || !finite(h_M)) return null;
      // Gl.15: V_M = A_S,m · h_M.
      return A_S_m * h_M;
    }
    case 'rigole': {
      const { b_R, h_R, L_R, s_R } = inputs;
      if (!finite(b_R) || !finite(h_R) || !finite(L_R) || !finite(s_R)) return null;
      // Gl.20: V_R = b_R · h_R · L_R · s_R.
      return b_R * h_R * L_R * s_R;
    }
    case 'mre': {
      const { V_M, V_R } = inputs;
      if (!finite(V_M) || !finite(V_R)) return null;
      // Gl.26: V_MR = V_M + V_R (scoped cross-ws sum of persisted component volumes).
      return V_M + V_R;
    }
    case 'schacht': {
      const { d_i, h_S } = inputs;
      if (!finite(d_i) || !finite(h_S)) return null;
      // Gl.36: V_S = π · d_i²/4 · h_S (at the governing swept head).
      return (Math.PI * d_i * d_i) / 4 * h_S;
    }
    case 'becken': {
      const { V_B_governing } = inputs;
      if (!finite(V_B_governing)) return null;
      // Gl.41 governing sweep is computed server-side (GOVERNING_PROFILES 'A138-22');
      // the result flows in as V_B_governing.
      return V_B_governing;
    }
    // area device — no dedicated storage volume.
    case 'flaeche':
    // MRS excluded — ratification block (V_MR vs V_MUE); never fabricate.
    case 'mrs':
      return null;
  }
}

/**
 * Governing storage-volume symbol per facility (the facility worksheet's V field).
 * Source-verified + auto-persisted for mulde/rigole/mre/schacht/becken. flaeche has
 * no storage volume; mrs is EXCLUDED (ratification block) → null so nothing persists.
 */
export const FACILITY_GOVERNING_VOLUME_SYMBOL: Record<SummaryFacilityType, string | null> = {
  flaeche: null,     // area device — no dedicated storage volume
  mulde:   'V_M',    // §6.3.2 Gl.15
  rigole:  'V_R',    // §6.4.2 Gl.20
  mre:     'V_MR',   // §6.5.2 Gl.26
  mrs:     null,     // EXCLUDED — ratification block (V_MR vs V_MUE)
  schacht: 'V_S',    // §6.7.2 Gl.36
  becken:  'V_B',    // §6.8.2 Gl.41 (active field is V_B, not V_VA)
};

/** Descriptor of the governing-volume row to persist onto the facility worksheet. */
export type FacilityVolumeWrite = { volumeSymbol: string; value: number };

/**
 * Finding F write-set assembly (pure): given the facility type and the sweep inputs,
 * produce the governing-volume row to persist (symbol + value), or null when there is
 * nothing to persist (no volume rule / inputs missing).
 *
 * The worksheet.ts asm producer branch calls this after computing the sweep footprint
 * to persist V_M in the SAME transaction; the branch and the unit tests exercise the
 * SAME rule (no mirror).
 */
export function facilityVolumeMaterialize(
  facilityType: SummaryFacilityType,
  inputs: FacilityGoverningVolumeInputs,
): FacilityVolumeWrite | null {
  const volumeSymbol = FACILITY_GOVERNING_VOLUME_SYMBOL[facilityType];
  if (volumeSymbol == null) return null;
  const value = facilityGoverningVolume(facilityType, inputs);
  if (value == null || !Number.isFinite(value)) return null;
  return { volumeSymbol, value };
}

export type AsmMaterializeInput = {
  method: AsmMethod;
  A_S_min: number | null;
  A_S_max: number | null;
  A_C: number | null;
  bodenart: Tab13Bodenart | null;
  /** Resolved facility geometry value: Rigole one-shot Gl.17, or the Mulde sweep's A_S_m. */
  geometryValue: number | null;
  manualValue: number | null;
  manualProvenance: string | null;
  facilityType: FacilityType | null;
  sourceWorksheet: string | null;
};

export function materializeAsm(input: AsmMaterializeInput): { A_S_m: number | null; state: AsmState } {
  const producer = resolveAsmProducer(input.method, input.facilityType);

  if (producer.kind === 'unresolved') {
    return { A_S_m: null, state: { status: 'indeterminate', reason: producer.reason } };
  }

  if (producer.kind === 'manual') {
    if (input.manualValue == null || !Number.isFinite(input.manualValue)) {
      return { A_S_m: null, state: { status: 'indeterminate', reason: 'Manueller A_S,m-Wert fehlt.' } };
    }
    if (!input.manualProvenance || input.manualProvenance.trim() === '') {
      return { A_S_m: null, state: { status: 'indeterminate', reason: 'Herkunftsangabe (Datenblatt/Quelle) für manuellen A_S,m erforderlich.' } };
    }
    return { A_S_m: input.manualValue, state: { status: 'manual', value: input.manualValue, provenance: input.manualProvenance.trim() } };
  }

  let value: number | null;
  if (producer.kind === 'direct') {
    value = computeDirect(input.A_S_min, input.A_S_max);
  } else if (producer.kind === 'soil_estimate') {
    value = computeSoilEstimate(input.A_C, input.bodenart);
  } else { // geometry — geometryValue already resolved (Mulde sweep / Rigole one-shot)
    value = input.geometryValue != null && Number.isFinite(input.geometryValue) ? input.geometryValue : null;
  }

  if (value == null) {
    return { A_S_m: null, state: { status: 'indeterminate', reason: `A_S,m per ${input.method} nicht bestimmbar — Eingaben fehlen.` } };
  }

  // Derive sourceWorksheet from the resolved producer for geometry; otherwise use caller's value
  const sourceWorksheet = producer.kind === 'geometry' ? producer.worksheetCode : (input.sourceWorksheet ?? 'A138-12');

  return {
    A_S_m: value,
    state: { status: 'determined', value, method: input.method, sourceWorksheet },
  };
}
