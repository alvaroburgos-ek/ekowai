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
