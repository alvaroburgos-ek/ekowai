/**
 * DWA-A 138-1 — single-source resolution for the mean infiltration area A_S,m.
 *
 * A_S,m is ONE physical quantity with multiple determination methods (§5.3.3.6
 * Gl.7 generic; Mulde/Rigole solve for the same A_S,m from geometry). Exactly
 * one method is active per run and is the sole producer of the canonical A138-12
 * A_S_m field. This module is pure / DB-free: it maps (method, facilityType) to
 * the authoritative producer and computes the direct + soil-estimate methods.
 * Geometry values are produced by the facility worksheets' own equations and
 * write back to A138-12 (handled in worksheet.ts, not here).
 */

export type AsmMethod = 'direct' | 'geometry' | 'soil_estimate' | 'manual';
export type FacilityType = 'flaeche' | 'mulde' | 'rigole' | 'schacht' | 'becken';
/** Tab.13 Bodenart rows (verbatim, A-1). */
export type Tab13Bodenart = 'mittel_feinsand' | 'schluffig';

/** Verified equation ids (Global Constraints). */
export const ASM_GL7_EQUATION_ID  = '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac'; // A138-12 direct
export const ASM_GL16_EQUATION_ID = '14999c2a-cdeb-42c1-98fd-fcdec65123da'; // A138-17 Mulde geometry
export const ASM_GL17_EQUATION_ID = '8afdb49a-7bb1-4f07-a64e-43009b8b6be1'; // A138-18 Rigole geometry

/** facility_type_selected (A138-15) → design worksheet code. */
export const FACILITY_TYPE_TO_WORKSHEET: Record<FacilityType, string> = {
  flaeche: 'A138-16',
  mulde:   'A138-17',
  rigole:  'A138-18',
  schacht: 'A138-21',
  becken:  'A138-22',
};

/** Discriminated state of the resolved A_S,m. Never a bare number / silent zero. */
export type AsmState =
  | { status: 'determined'; value: number; method: AsmMethod; sourceWorksheet: string }
  | { status: 'manual'; value: number; provenance: string }
  | { status: 'needs_reconfirmation'; value: number; reason: 'facility_type_changed' }
  | { status: 'indeterminate'; reason: string };

/** The authoritative producer for the active method. */
export type AsmProducer =
  | { kind: 'direct' }
  | { kind: 'geometry'; worksheetCode: string; equationId: string }
  | { kind: 'soil_estimate' }
  | { kind: 'manual' }
  | { kind: 'unresolved'; reason: string };

/**
 * Map the active determination method (+ selected facility) to the sole producer.
 * D-1: `geometry` is available ONLY for mulde/rigole; the other types supply
 * A_S,m via direct/manual (their own geometry produces a different symbol).
 */
export function resolveAsmProducer(method: AsmMethod, facilityType: FacilityType | null): AsmProducer {
  switch (method) {
    case 'direct':        return { kind: 'direct' };
    case 'soil_estimate': return { kind: 'soil_estimate' };
    case 'manual':        return { kind: 'manual' };
    case 'geometry':
      if (facilityType === 'mulde')  return { kind: 'geometry', worksheetCode: 'A138-17', equationId: ASM_GL16_EQUATION_ID };
      if (facilityType === 'rigole') return { kind: 'geometry', worksheetCode: 'A138-18', equationId: ASM_GL17_EQUATION_ID };
      return { kind: 'unresolved', reason: `geometry-Methode nur für Mulde/Rigole; Typ=${facilityType ?? 'nicht gewählt'}.` };
  }
}

/** Gl.7 direct method: A_S,m = (A_S,min + A_S,max)/2. */
export function computeDirect(aSmin: number | null, aSmax: number | null): number | null {
  if (typeof aSmin !== 'number' || !Number.isFinite(aSmin)) return null;
  if (typeof aSmax !== 'number' || !Number.isFinite(aSmax)) return null;
  return (aSmin + aSmax) / 2;
}

/**
 * Tab.13 (verbatim, A-1): A_S,m = 0,10·A_C for Mittel-/Feinsand,
 * 0,20·A_C for schluffiger Sand / sandiger Schluff / Schluff.
 * Keyed by the Bodenart selector — NOT by k_f (there is no source k_f cut).
 */
export function computeSoilEstimate(aC: number | null, bodenart: Tab13Bodenart | null): number | null {
  if (typeof aC !== 'number' || !Number.isFinite(aC) || bodenart === null) return null;
  return (bodenart === 'mittel_feinsand' ? 0.10 : 0.20) * aC;
}
// NOTE (A-1 / R-2): no soilFavourabilityFromKf. Any k_f→Bodenart seed would be a
// Bild-2 (figure) heuristic Anh. A disqualifies as sole source → NR, needs
// ratification. Omitted from this build; the Bodenart selector is authoritative.

/**
 * §6.3.2 V-2: The geometry-derived A_S,m must be ≥ A_S,max (Gl.7 term).
 * "der erforderliche Flächenbedarf entspricht mindestens der maximalen
 * Versickerungsfläche A_S,max".
 *
 * Flag-only: does NOT change A_S_m. The server surfaces this as a warning
 * when method='geometry' and A_S_max is present.
 */
export function validateGeometryAgainstMax(
  geometryValue: number | null,
  aSmax: number | null,
): { flag: boolean; reason: string | null } {
  if (typeof geometryValue !== 'number' || !Number.isFinite(geometryValue)) return { flag: false, reason: null };
  if (typeof aSmax !== 'number' || !Number.isFinite(aSmax)) return { flag: false, reason: null };
  if (geometryValue < aSmax) {
    return {
      flag: true,
      reason: `A_S,m (Geometrie ${geometryValue}) < A_S,max (${aSmax}) — §6.3.2 Flächenbedarf-Untergrenze verletzt.`,
    };
  }
  return { flag: false, reason: null };
}
