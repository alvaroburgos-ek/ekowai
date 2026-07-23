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
 * Task 8: Determines what happens to a persisted A_S,m when `facility_type_selected`
 * (A138-15) changes. The answer depends on the PREVIOUS determination method:
 *
 *  - geometry     → value is facility-specific (Mulde/Rigole geometry). Clear it so
 *                   the producer recomputes for the new type (or falls to indeterminate).
 *                   The geometry recompute in the `asm` producer branch already handles
 *                   this: when `facility_type_selected ∈ changedSymbols`, the branch
 *                   re-runs materializeAsm for the new type — clearing is
 *                   invalidation-by-recompute, not an explicit null write.
 *  - manual       → value came from an engineer's datasheet entry; it may or may not
 *                   apply to the new facility type. Do NOT clear — flag needs-reconfirmation
 *                   so the engineer explicitly re-confirms or re-enters the value.
 *  - direct / soil_estimate → facility-agnostic (computed from A_S,min/max or Bodenart/A_C).
 *                   Unchanged: the formula still applies after a type change.
 *
 * Return type:
 *   clear               — set A_S_m to null (geometry case; used if recompute is absent)
 *   flagNeedsReconfirm  — persist a_s_m_needs_reconfirmation=true (manual case)
 *
 * Pure function: no DB access, no side-effects. Tested in asm-invalidation.test.ts.
 */
export function asmInvalidationOnTypeChange(
  prevMethod: AsmMethod,
): { clear: boolean; flagNeedsReconfirm: boolean } {
  if (prevMethod === 'geometry') return { clear: true,  flagNeedsReconfirm: false };
  if (prevMethod === 'manual')   return { clear: false, flagNeedsReconfirm: true  };
  return { clear: false, flagNeedsReconfirm: false };
}

// Stable empty set: module-level constant so callers can use reference equality
// to avoid useMemo/useEffect churn on worksheets where no symbols are suppressed.
const _EMPTY_ASM_SUPPRESSED: ReadonlySet<string> = new Set();

/**
 * Returns the set of engine write-back symbols that must be suppressed for the
 * given A_S,m determination method.
 *
 * OWNERSHIP PRINCIPLE:
 *   Gl.7 (A138-12 formula engine) owns A_S,m ONLY when method='direct' (or null/
 *   unset, which defaults to direct behaviour). For every other method the server
 *   (materializeAsm) is the authoritative producer:
 *     - 'manual'        → engineer enters value directly; Gl.7 must not clobber.
 *     - 'geometry'      → geometry equations on A138-17/18 write back; Gl.7 must
 *                         not fight the geometry value → suppressed.
 *     - 'soil_estimate' → materializeAsm derives from Tab.13/A_C; Gl.7 writes 45
 *                         (from A_S,min/max) while server writes 967 (from A_C) →
 *                         infinite save loop unless suppressed.
 *
 * The returned set is stable-empty (same object reference) for non-suppressed
 * cases so useMemo/useEffect deps do not churn.
 *
 * All five cases are unit-tested in asm-source.test.ts.
 */
export function asmEngineSuppressedSymbols(asmMethod: string | null): ReadonlySet<string> {
  // Suppress for every method except 'direct' (and the null/unset default which
  // resolves to direct behaviour). This covers manual, geometry, and soil_estimate.
  if (asmMethod != null && asmMethod !== 'direct') {
    return new Set(['A_S_m']);
  }
  return _EMPTY_ASM_SUPPRESSED;
}

/**
 * Cross-home write-back suppression (defect #22, standard-agnostic).
 *
 * A facility worksheet must not let its local equation output shadow-write a
 * symbol whose single active-field home is a DIFFERENT worksheet — the
 * inherited home value is authoritative; the local producer drives the SERVER
 * materialize (registry) only. Generalises asmEngineSuppressedSymbols from
 * "method owns the symbol" to "home worksheet owns the symbol".
 *
 * Example: on A138-17, Gl.16 produces A_S_m but A_S_m's home is A138-12.
 * The inherited A138-12 value must survive in the client store so Gl.14/15
 * can consume it; Gl.16's server-side write-back (via worksheet.ts registry)
 * is unaffected.
 *
 * @param currentWorksheetCode - the template code of the worksheet being rendered
 * @param symbolHomes - map/record of symbol → home worksheet code
 *   (entries where home === currentWorksheetCode are NOT suppressed)
 * @returns stable-empty set (module constant) when nothing to suppress, else
 *   a new set of all symbols whose home ≠ currentWorksheetCode.
 */
export function symbolHomeSuppressedSymbols(
  currentWorksheetCode: string,
  symbolHomes: ReadonlyMap<string, string> | Readonly<Record<string, string>>,
): ReadonlySet<string> {
  const entries =
    symbolHomes instanceof Map
      ? symbolHomes.entries()
      : Object.entries(symbolHomes);
  const out = new Set<string>();
  for (const [symbol, homeCode] of entries) {
    if (homeCode !== currentWorksheetCode) out.add(symbol);
  }
  return out.size === 0 ? _EMPTY_ASM_SUPPRESSED : out;
}

/**
 * Compose the engine write-back suppression set for a worksheet: the union of
 * method-based suppression (asmEngineSuppressedSymbols) and home-boundary
 * suppression (symbolHomeSuppressedSymbols, defect #22). This is the single
 * seam worksheet-form calls, so a reproduction test on it fails if either
 * suppression term is removed (the real code path).
 *
 * Stable-empty short-circuit: when both terms are empty the stable-empty
 * module constant is returned (same object reference) so useMemo/useEffect
 * deps do not churn on worksheets where nothing is suppressed.
 */
export function composeEngineSuppressedSymbols(
  asmMethod: string | null,
  worksheetCode: string,
  symbolHomes: ReadonlyMap<string, string> | Readonly<Record<string, string>>,
): ReadonlySet<string> {
  const methodSet = asmEngineSuppressedSymbols(asmMethod);
  const homeSet = symbolHomeSuppressedSymbols(worksheetCode, symbolHomes);
  if (methodSet.size === 0 && homeSet.size === 0) return methodSet; // stable-empty ref
  if (methodSet.size === 0) return homeSet;
  if (homeSet.size === 0) return methodSet;
  const merged = new Set<string>(methodSet);
  for (const sym of homeSet) merged.add(sym);
  return merged;
}

/**
 * V-2 manual-provenance gate (pure decision).
 *
 * A138-12 A_S,m is user-editable ONLY when method='manual', and then a non-empty
 * provenance (Datenblatt/Quelle) is MANDATORY. This helper decides — from the
 * EFFECTIVE method and EFFECTIVE provenance (i.e. the values that WILL persist:
 * batch value if the field is in the batch, else the persisted DB value) —
 * whether a manual A_S,m save must be REJECTED (the A_S_m write stripped so it
 * cannot persist without provenance).
 *
 * CRITICAL: callers MUST resolve `method` and `provenance` against the full
 * A138-12 sibling-field set — NOT the batch-restricted field map. On an
 * A_S_m-only save, the method/provenance fields are absent from the batch; if the
 * caller resolves them only from batch metadata they read `null` and the reject
 * silently no-ops, letting an unprovenanced manual A_S,m persist (the live bug).
 *
 * Returns { reject:true } iff method='manual' AND provenance is empty/whitespace.
 * For every non-manual method the value is produced by a formula (direct/soil) or
 * geometry, so this gate never fires — those paths stay byte-identical.
 */
export function resolveManualAsmReject(
  method: string | null,
  provenance: string | null | undefined,
): { reject: boolean } {
  if (method !== 'manual') return { reject: false };
  const hasProvenance = typeof provenance === 'string' && provenance.trim() !== '';
  return { reject: !hasProvenance };
}

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
