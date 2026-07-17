/**
 * DWA-A 138-1 — Phase 4 summary logic (A138-23).
 *
 * SCOPE: pure functions — no DB, no importer, no side-effects.
 *
 * This module computes:
 *   (a) which storage-volume + footprint symbols feed the Phase 4 summary per facility,
 *   (b) the recommended verdict (PASS / CONDITIONAL / FAIL) from the ratified predicate,
 *   (c) the companion reasons identifying which constraint flagged, with values.
 *
 * IMPORTANT: `phase_4_gate_result` is an ENGINEER-ENTERED enum (D3 rider).
 * The outputs of this module are surfaced to the engineer as a recommendation;
 * they are NEVER auto-persisted as the entered enum value.
 *
 * Predicate ratified 2026-07-15; D3 addition (reasons) also binding.
 */

// ---------------------------------------------------------------------------
// FacilityType
// ---------------------------------------------------------------------------

export type FacilityType =
  | 'flaeche'
  | 'mulde'
  | 'rigole'
  | 'mre'
  | 'mrs'
  | 'schacht'
  | 'becken';

/**
 * facility_type_selected (A138-15) → dimensioned facility worksheet code, for the
 * Phase-4 summary. Superset of asm-source's FACILITY_TYPE_TO_WORKSHEET: adds the
 * COMPOSITE facilities mre (Mulden-Rigolen-Element → A138-19) and mrs
 * (Mulden-Rigolen-System → A138-20), which the A_S,m single-source map omits
 * (they don't produce A_S,m via geometry). The summary DOES need them because
 * their governing storage volumes (V_MR / V_MUE) live on those worksheets.
 */
export const FACILITY_TYPE_TO_SUMMARY_WORKSHEET: Record<FacilityType, string> = {
  flaeche: 'A138-16',
  mulde:   'A138-17',
  rigole:  'A138-18',
  mre:     'A138-19',
  mrs:     'A138-20',
  schacht: 'A138-21',
  becken:  'A138-22',
};

// ---------------------------------------------------------------------------
// facilitySummaryInputs
// ---------------------------------------------------------------------------

/**
 * Returns the governing storage-volume symbol and footprint symbol for the given
 * facility type, verbatim from the Phase 4 summary table (A138-23).
 *
 * `volumeSymbol` is null for area-based devices that have no dedicated storage
 * volume (Flächenversickerung uses A_S directly; there is no V_S for that type).
 */
export function facilitySummaryInputs(facilityType: FacilityType): {
  volumeSymbol: string | null;
  footprintSymbol: string;
} {
  switch (facilityType) {
    case 'flaeche': return { volumeSymbol: null,    footprintSymbol: 'A_S' };
    case 'mulde':   return { volumeSymbol: 'V_M',   footprintSymbol: 'A_S_m' };
    case 'rigole':  return { volumeSymbol: 'V_R',   footprintSymbol: 'A_S_m' };
    case 'mre':     return { volumeSymbol: 'V_MR',  footprintSymbol: 'A_S_m' };
    case 'mrs':     return { volumeSymbol: 'V_MUE', footprintSymbol: 'A_S_m' };
    case 'schacht': return { volumeSymbol: 'V_S',   footprintSymbol: 'A_S' };
    case 'becken':  return { volumeSymbol: 'V_VA',  footprintSymbol: 'A_S_m' };
  }
}

// ---------------------------------------------------------------------------
// Phase4GateInput
// ---------------------------------------------------------------------------

export type Phase4GateInput = {
  /**
   * All required facility-specific sizing outputs are present.
   * Set false when any mandatory symbol is absent (e.g. volume not yet computed).
   */
  complete: boolean;

  /**
   * facility_meets_qsac: q_S,AC ≥ 2 l/(s·ha) — carried from Phase-3 REQ-15.
   * PASS and CONDITIONAL both require this; failure forces FAIL regardless of
   * Tab.14 status.
   */
  meetsQsac: boolean;

  /**
   * True when any APPLICABLE facility BLOCK gate evaluated false:
   *   REQ-20 (Gl.13)         — unconditional BLOCK
   *   REQ-21 (Gl.25)         — BLOCK only when L_VS is present/nonzero
   *   REQ-22 (Gl.38)         — BLOCK only when Schacht-Typ = B
   */
  blockGateFailed: boolean;

  /**
   * Human-readable reasons for each failed block gate, e.g.:
   *   "REQ-21: L_VS·q_VS < r_5(n)·A_C·10⁻⁴"
   * Must be provided when blockGateFailed is true.
   */
  blockGateReasons?: string[];

  /**
   * Symbols of required sizing outputs that are absent.
   * Used to build the 'incomplete' reason string when complete is false.
   * @remarks Should be supplied whenever `complete` is false; omitting it yields
   * the generic '(keine Angabe)' notice.
   */
  missingOutputs?: string[];

  /**
   * Measured specific infiltration performance q_S,AC in l/(s·ha); when supplied,
   * the ¬q_S,AC reason cites it (e.g. "q_S,AC = 1.30 l/(s·ha) < 2 l/(s·ha)").
   * Optional — backward-compatible; callers that omit this keep the static reason.
   */
  q_S_AC?: number | null;

  /**
   * §6/Tab.14 soft constraints for above-ground facilities.
   * Set individual members to null when not applicable to this facility type.
   */
  tab14: {
    /** Emptying time in hours. Tab.14/§6.3.2 requires t_E ≤ 84 h at n=1/a. null = N/A. */
    t_E_hours: number | null;

    /** True when freeboard satisfies Tab.14 limits, false when exceeded, null when N/A. */
    freeboardOk: boolean | null;

    /** True when slope satisfies Tab.14 limits, false when exceeded, null when N/A. */
    slopeOk: boolean | null;
  };
};

// ---------------------------------------------------------------------------
// Phase4Recommendation
// ---------------------------------------------------------------------------

export type Phase4Recommendation = 'PASS' | 'CONDITIONAL' | 'FAIL';

// ---------------------------------------------------------------------------
// recommendedPhase4Gate
// ---------------------------------------------------------------------------

/**
 * Computes the recommended Phase 4 verdict from the ratified predicate (2026-07-15).
 *
 * Predicate (MUST be encoded exactly):
 *
 *   FAIL        if !complete OR blockGateFailed OR !meetsQsac
 *   CONDITIONAL if any applicable Tab.14 soft constraint flags:
 *                 (t_E_hours != null && t_E_hours > 84)
 *                 OR (freeboardOk === false)
 *                 OR (slopeOk === false)
 *   PASS        otherwise (complete AND meetsQsac AND no block fail AND all
 *               applicable Tab.14 constraints met)
 *
 * NOTE: The engineer MUST confirm this verdict; it is never auto-written to
 * `phase_4_gate_result` (D3 rider).
 */
export function recommendedPhase4Gate(input: Phase4GateInput): Phase4Recommendation {
  // FAIL branch — hard prerequisites
  if (!input.complete || input.blockGateFailed || !input.meetsQsac) {
    return 'FAIL';
  }

  // CONDITIONAL branch — Tab.14 soft constraints
  const { t_E_hours, freeboardOk, slopeOk } = input.tab14;
  if (
    (t_E_hours != null && t_E_hours > 84) ||
    freeboardOk === false ||
    slopeOk === false
  ) {
    return 'CONDITIONAL';
  }

  // PASS — all hard + soft prerequisites satisfied
  return 'PASS';
}

// ---------------------------------------------------------------------------
// recommendationReasons
// ---------------------------------------------------------------------------

/**
 * Companion reasons for the recommended verdict (D3 addition — binding).
 *
 * Returns ALL applicable reason strings (never just the first) so the engineer
 * sees every flagged constraint with its value before confirming.
 *
 * Reason strings:
 *   FAIL / !complete      → "Bemessung unvollständig: fehlende Größen <symbols>"
 *   FAIL / blockGateFailed→ each blockGateReasons entry verbatim
 *   FAIL / !meetsQsac     → "q_S,AC < 2 l/(s·ha) (Phase-3 REQ-15 nicht erfüllt)"
 *   CONDITIONAL / t_E>84  → "Entleerungszeit t_E = <t_E_hours> h > 84 h (Tab. 14, §6.3.2)"
 *   CONDITIONAL / freeboard→ "Freibord außerhalb Tab. 14"
 *   CONDITIONAL / slope   → "Böschungsneigung außerhalb Tab. 14"
 *   PASS                  → ["Alle anwendbaren Bemessungsvorgaben erfüllt (§6/Tab. 14)."]
 */
export function recommendationReasons(input: Phase4GateInput): string[] {
  const reasons: string[] = [];

  // --- FAIL reasons ---
  if (!input.complete) {
    const missing = input.missingOutputs && input.missingOutputs.length > 0
      ? input.missingOutputs.join(', ')
      : '(keine Angabe)';
    reasons.push(`Bemessung unvollständig: fehlende Größen ${missing}`);
  }

  if (input.blockGateFailed) {
    const blockReasons = input.blockGateReasons ?? [];
    for (const r of blockReasons) {
      reasons.push(r);
    }
    // Guard: if blockGateFailed but no reasons supplied, add a generic notice
    if (blockReasons.length === 0) {
      reasons.push('Blockierendes Nachweisziel nicht erfüllt (kein Grund angegeben)');
    }
  }

  if (!input.meetsQsac) {
    if (input.q_S_AC != null && isFinite(input.q_S_AC)) {
      reasons.push(
        `q_S,AC = ${input.q_S_AC.toFixed(2)} l/(s·ha) < 2 l/(s·ha) (Phase-3 REQ-15 nicht erfüllt)`
      );
    } else {
      reasons.push('q_S,AC < 2 l/(s·ha) (Phase-3 REQ-15 nicht erfüllt)');
    }
  }

  // If any FAIL reason collected, return them — CONDITIONAL reasons do not add
  if (reasons.length > 0) {
    return reasons;
  }

  // --- CONDITIONAL reasons ---
  const { t_E_hours, freeboardOk, slopeOk } = input.tab14;

  if (t_E_hours != null && t_E_hours > 84) {
    reasons.push(`Entleerungszeit t_E = ${t_E_hours} h > 84 h (Tab. 14, §6.3.2)`);
  }
  if (freeboardOk === false) {
    reasons.push('Freibord außerhalb Tab. 14');
  }
  if (slopeOk === false) {
    reasons.push('Böschungsneigung außerhalb Tab. 14');
  }

  if (reasons.length > 0) {
    return reasons;
  }

  // --- PASS ---
  return ['Alle anwendbaren Bemessungsvorgaben erfüllt (§6/Tab. 14).'];
}
