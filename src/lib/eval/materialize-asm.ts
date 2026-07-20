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
 * Finding F — the facility GOVERNING STORAGE VOLUME rule (pure).
 *
 * The geometry sweep (server-side) yields the footprint A_S_m; the governing
 * storage volume is derived from it and MUST be persisted onto the facility
 * worksheet's volume field so the A138-23 summary can read it (engine-output-
 * materialization gap fix).
 *
 * mulde  → V_M = A_S,m · h_M   (Gl.15; §6.3.2-verified Speichervolumen — equals the
 *          Gl.14 erforderliches Speichervolumen at the dimensioned governing D).
 *
 * OTHER FACILITIES — NAMED BOUNDARY (do NOT fabricate here): rigole/mre/mrs/schacht/
 * becken/flaeche each define their own storage-volume symbol (V_R/V_MR/V_MUE/V_S/
 * V_VA / none). Their formulas are wired at fan-out with a per-facility source-verify
 * (FACILITY_GOVERNING_VOLUME_FANOUT). Until then this helper returns null for them
 * (no volume persisted) rather than an invented value.
 *
 * @returns the governing volume, or null when an input is missing / non-finite / the
 *   facility's rule is not yet source-verified.
 */
export type FacilityGoverningVolumeInputs = {
  /** Governing footprint from the sweep (A_S,m). */
  A_S_m: number | null;
  /** Mulde depth h_M. */
  h_M: number | null;
};

export function facilityGoverningVolume(
  facilityType: SummaryFacilityType,
  inputs: FacilityGoverningVolumeInputs,
): number | null {
  switch (facilityType) {
    case 'mulde': {
      const { A_S_m, h_M } = inputs;
      if (A_S_m == null || h_M == null) return null;
      if (!Number.isFinite(A_S_m) || !Number.isFinite(h_M)) return null;
      // Gl.15: V_M = A_S,m · h_M.
      return A_S_m * h_M;
    }
    // NAMED BOUNDARY — per-facility storage-volume formulas deferred to fan-out with
    // a source-verify. No fabrication: return null (no governing volume persisted).
    case 'flaeche':
    case 'rigole':
    case 'mre':
    case 'mrs':
    case 'schacht':
    case 'becken':
      return null;
  }
}

/**
 * Governing storage-volume symbol per facility (the facility worksheet's V field).
 * NAMED BOUNDARY: only mulde is source-verified + auto-persisted for now (the fan-out
 * wires the rest with per-facility source-verify). flaeche has no storage volume.
 */
export const FACILITY_GOVERNING_VOLUME_SYMBOL: Record<SummaryFacilityType, string | null> = {
  flaeche: null,     // area device — no dedicated storage volume
  mulde:   'V_M',    // source-verified (Gl.15) — auto-persisted this wave
  rigole:  'V_R',    // fan-out (source-verify pending)
  mre:     'V_MR',   // fan-out
  mrs:     'V_MUE',  // fan-out
  schacht: 'V_S',    // fan-out
  becken:  'V_VA',   // fan-out
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
