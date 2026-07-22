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
    // flaeche: area device (§6.2.2 Gl.12 A_S IS an area) → no storage volume.
    // Footprint = the DIMENSIONED/built area `a138_A_s_dim` ("Bemessungs-
    // Versickerungsfläche"), NOT the dead `A_S` (inactive on A138-16) nor the
    // required `a138_A_s_erf`. Source-verified via field descriptions (DB).
    case 'flaeche': return { volumeSymbol: null,    footprintSymbol: 'a138_A_s_dim' };
    case 'mulde':   return { volumeSymbol: 'V_M',   footprintSymbol: 'A_S_m' };
    // rigole: V_R = b_R·h_R·L_R·s_R (§6.4.2 Gl.20); footprint A_S_m inherited.
    case 'rigole':  return { volumeSymbol: 'V_R',   footprintSymbol: 'A_S_m' };
    // mre: V_MR = V_M + V_R (§6.5.2 Gl.26); footprint A_S_m inherited.
    case 'mre':     return { volumeSymbol: 'V_MR',  footprintSymbol: 'A_S_m' };
    case 'mrs':     return { volumeSymbol: 'V_MUE', footprintSymbol: 'A_S_m' };
    // schacht: V_S (§6.7.2 Gl.36); footprint = the active `A_S_Schacht`
    // ("Versickerungsfläche Schacht", Gl.34), NOT the dead generic `A_S`.
    case 'schacht': return { volumeSymbol: 'V_S',   footprintSymbol: 'A_S_Schacht' };
    // becken: volume field is the ACTIVE `V_B` (§6.8.2 Gl.41 output), NOT `V_VA`
    // (no `V_VA` field on A138-22); footprint A_S_m inherited.
    case 'becken':  return { volumeSymbol: 'V_B',   footprintSymbol: 'A_S_m' };
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
   *   REQ-31 (Gl.13)         — unconditional BLOCK
   *   REQ-32 (Gl.25)         — BLOCK only when L_VS is present/nonzero
   *   REQ-33 (Gl.38)         — BLOCK only when Schacht-Typ = B
   */
  blockGateFailed: boolean;

  /**
   * Human-readable reasons for each failed block gate, e.g.:
   *   "REQ-32: L_VS·q_VS < r_5(n)·A_C·10⁻⁴"
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

// ---------------------------------------------------------------------------
// PHASE4_SUMMARY_BLOCKGATE_FANOUT — per-facility applicable BLOCK gate mapping
// ---------------------------------------------------------------------------

/**
 * RATIFIED per-facility BLOCK-gate mapping (the NAMED fan-out boundary).
 *
 *   flaeche → REQ-31 (Fläche-Machbarkeit §6.2.2 Gl.13)  [UNCONDITIONAL BLOCK]
 *   rigole  → REQ-32 (Gl.25)                             [CONDITIONAL — only when L_VS present]
 *   schacht → REQ-33 (Gl.38)                             [CONDITIONAL — only when Schacht-Typ = B]
 *   mulde / mre / mrs / becken → no applicable BLOCK gate → null.
 *
 * Fan-out task numbers (reconciled — MINOR 4):
 *   Task 5  encodes ALL THREE gate ROWS (REQ-31/32/33) into the standard;
 *   Task 8  wires the per-facility REQ-32 (rigole) condition eval;
 *   Task 11 wires the per-facility REQ-33 (schacht) condition eval;
 *   Task 13 wires the per-facility REQ-31 (flaeche) condition eval.
 *   → the accurate set touching these gates is Tasks 5/8/11/13.
 *
 * The MAPPING/topology lives here (single source); the fan-out tasks wire only the
 * CONDITION evaluation. Until then this branch does NOT flag a block fail from a
 * gate condition — see the fail-safe guard below for UNCONDITIONAL gates.
 */
export const PHASE4_SUMMARY_BLOCKGATE_FANOUT: Record<FacilityType, string | null> = {
  flaeche: 'REQ-31', // UNCONDITIONAL — Gl.13 feasibility, now auto-evaluated (fan-out)
  mulde:   null,     // pilot — no applicable block gate → correct now
  rigole:  'REQ-32', // CONDITIONAL (L_VS present) — Gl.25 eval (fan-out)
  mre:     null,     // no applicable block gate
  mrs:     null,     // no applicable block gate
  schacht: 'REQ-33', // CONDITIONAL (Schacht-Typ = B) — Gl.38 eval (fan-out)
  becken:  null,     // no applicable block gate
};

// ---------------------------------------------------------------------------
// Per-facility BLOCK-gate condition evaluators (fan-out — source-verified)
// ---------------------------------------------------------------------------

/** REQ-31 / §6.2.2 Gl.13 — Flächenversickerung feasibility: k_i > r_D(n)·10⁻⁷.
 *  feasible ⇒ pass; else the Gl.12 A_S goes negative → BLOCK. Returns null when an
 *  input is missing (cannot evaluate → treated as not-flagging here; completeness
 *  gating handles the missing-input case separately). */
export function evalReq31Flaeche(
  k_i: number | null,
  r_D_n_used: number | null,
): { flagged: boolean; reason: string | null } | null {
  if (k_i == null || r_D_n_used == null || !isFinite(k_i) || !isFinite(r_D_n_used)) return null;
  const feasible = k_i > r_D_n_used * 1e-7;
  if (feasible) return { flagged: false, reason: null };
  return {
    flagged: true,
    reason:
      `REQ-31 (§6.2.2 Gl.13): k_i = ${k_i.toExponential(2)} m/s ≤ r_D(n)·10⁻⁷ = ` +
      `${(r_D_n_used * 1e-7).toExponential(2)} m/s — Flächenversickerung nicht machbar ` +
      `(A_S nach Gl.12 negativ).`,
  };
}

/** REQ-32 / §6.4.2 Gl.25 — Vollsickerrohr hydraulic capacity: L_VS·q_VS ≥ r_5(n)·A_C·10⁻⁴.
 *  Applicable ONLY when L_VS is present/nonzero. Returns null when not applicable or an
 *  input is missing. */
export function evalReq32Rigole(inputs: {
  L_VS: number | null; q_VS: number | null; r_5_n: number | null; A_C: number | null;
}): { flagged: boolean; reason: string | null } | null {
  const { L_VS, q_VS, r_5_n, A_C } = inputs;
  // CONDITIONAL applicability: only when a Vollsickerrohr length is designed.
  if (L_VS == null || !isFinite(L_VS) || L_VS === 0) return null;
  if (q_VS == null || r_5_n == null || A_C == null) return null;
  if (![q_VS, r_5_n, A_C].every(isFinite)) return null;
  const lhs = L_VS * q_VS;
  const rhs = r_5_n * A_C * 1e-4;
  if (lhs >= rhs) return { flagged: false, reason: null };
  return {
    flagged: true,
    reason:
      `REQ-32 (§6.4.2 Gl.25): L_VS·q_VS = ${lhs.toFixed(3)} < r_5(n)·A_C·10⁻⁴ = ` +
      `${rhs.toFixed(3)} l/s — Versickerrohr hydraulisch unzureichend.`,
  };
}

/** REQ-33 / §6.7.2 Gl.38 — filter-layer permeability (Schacht Typ B):
 *  A_S,FS·k_f,FS ≥ A_S,Schacht·k_i. Applicable ONLY when shaft_type = 'typ_B'.
 *  Returns null when not applicable or an input is missing. */
export function evalReq33Schacht(inputs: {
  shaftType: string | null;
  A_S_FS: number | null; k_f_FS: number | null; A_S_Schacht: number | null; k_i: number | null;
}): { flagged: boolean; reason: string | null } | null {
  const { shaftType, A_S_FS, k_f_FS, A_S_Schacht, k_i } = inputs;
  // CONDITIONAL applicability: only for Schacht Typ B (filter layer present).
  const isTypB = shaftType != null && /(^|_)b$|typ_b|typ-b|^b$/i.test(shaftType);
  if (!isTypB) return null;
  if (A_S_FS == null || k_f_FS == null || A_S_Schacht == null || k_i == null) return null;
  if (![A_S_FS, k_f_FS, A_S_Schacht, k_i].every(isFinite)) return null;
  const lhs = A_S_FS * k_f_FS;
  const rhs = A_S_Schacht * k_i;
  if (lhs >= rhs) return { flagged: false, reason: null };
  return {
    flagged: true,
    reason:
      `REQ-33 (§6.7.2 Gl.38): A_S,FS·k_f,FS = ${lhs.toExponential(2)} < A_S,Schacht·k_i = ` +
      `${rhs.toExponential(2)} — Filterschicht begrenzt die Versickerungsleistung.`,
  };
}

/**
 * Facilities whose applicable BLOCK gate is UNCONDITIONAL. REQ-31 (flaeche §6.2.2
 * Gl.13) is now AUTO-EVALUATED in `assemblePhase4Summary`; the fail-safe downgrade is
 * applied only in the residual case where the gate's inputs (k_i / r_D(n)) are absent
 * and it therefore could not be evaluated (see the guard at the call site). This set
 * documents the facility→unconditional-gate topology; it is retained for callers that
 * enumerate unconditional gates.
 */
export const PHASE4_SUMMARY_UNCONDITIONAL_GATE_DEFERRED: ReadonlySet<FacilityType> =
  new Set<FacilityType>(['flaeche']);

/** Mandatory manual-check reason — injected only when REQ-31 could not be evaluated
 *  (k_i / r_D(n) absent), so the verdict is not a silent non-FAIL. */
export const PHASE4_SUMMARY_REQ20_DEFERRED_REASON =
  'REQ-31 (Fläche-Machbarkeit §6.2.2 Gl.13) noch nicht automatisch ausgewertet — Planer muss manuell prüfen.';

// ---------------------------------------------------------------------------
// assemblePhase4Summary — PURE assembly step (extracted from worksheet.ts)
// ---------------------------------------------------------------------------

/** Gathered scalar values (after the scoped DB reads) fed into the pure assembly. */
export type Phase4SummaryGathered = {
  facilityType: FacilityType | null;
  /** Dimensioned facility worksheet code (from FACILITY_TYPE_TO_SUMMARY_WORKSHEET), or null. */
  facilityWorksheetCode: string | null;
  /** Governing storage-volume symbol for this facility (null for area devices). */
  volumeSymbol: string | null;
  /** Governing footprint symbol for this facility. */
  footprintSymbol: string | null;
  /** Persisted governing volume value, or null. */
  volumeValue: number | null;
  /** Persisted footprint value, or null. */
  footprintValue: number | null;
  /** Measured Phase-3 q_S,AC (l/(s·ha)), or null. */
  qSac: number | null;
  /** Explicit facility_meets_qsac flag if set, else null (→ derive from qSac). */
  meetsQsacFlag: boolean | null;
  /** Above-ground emptying time t_E in hours, or null (= N/A). */
  tEHours: number | null;

  // ── Per-facility BLOCK-gate condition inputs (fan-out) ──
  /** REQ-31 (flaeche, Gl.13): bemessungsrelevante Infiltrationsrate k_i (m/s). */
  k_i?: number | null;
  /** REQ-31 (flaeche, Gl.13): r_D(n) used on A138-16 (l/(s·ha)). */
  rDnUsed?: number | null;
  /** REQ-32 (rigole, Gl.25): L_VS / q_VS / r_5(n) / A_C. */
  L_VS?: number | null;
  q_VS?: number | null;
  r_5_n?: number | null;
  A_C?: number | null;
  /** REQ-33 (schacht, Gl.38): shaft_type + A_S,FS / k_f,FS / A_S,Schacht (+ k_i above). */
  shaftType?: string | null;
  A_S_FS?: number | null;
  k_f_FS?: number | null;
  A_S_Schacht?: number | null;
};

/** One derived write: the target symbol, the typed value, and its value-kind. */
export type Phase4SummaryWrite =
  | { symbol: string; kind: 'text'; value: string | null }
  | { symbol: string; kind: 'number'; value: number | null }
  | { symbol: string; kind: 'boolean'; value: boolean | null }
  | { symbol: string; kind: 'enum'; value: string | null }
  | { symbol: string; kind: 'date'; value: string | null };

export type Phase4SummaryAssembled = {
  writes: Phase4SummaryWrite[];
  recommendation: Phase4Recommendation;
  reasons: string[];
};

/**
 * PURE assembly: given the gathered scalar values (after the scoped DB reads), build
 * the Phase4GateInput, compute the recommendation + reasons (with the UNCONDITIONAL-
 * gate fail-safe guard), and produce the 8-field write-set.
 *
 * The producer branch in worksheet.ts CALLS this — the branch and the tests exercise
 * the SAME code (no mirror). `nowIsoDate` is injected so the assembly stays pure.
 *
 * IMPORTANT: preserves the exact write-set shape + verdict the branch produced.
 */
export function assemblePhase4Summary(
  g: Phase4SummaryGathered,
  nowIsoDate: string,
): Phase4SummaryAssembled {
  // complete = footprint present AND (no governing volume OR volume present) AND facility present.
  const missingOutputs: string[] = [];
  if (g.facilityType == null) missingOutputs.push('facility_type_selected');
  if (g.footprintSymbol != null && g.footprintValue == null) missingOutputs.push(g.footprintSymbol);
  if (g.volumeSymbol != null && g.volumeValue == null) missingOutputs.push(g.volumeSymbol);

  const complete =
    g.facilityType != null &&
    g.footprintValue != null &&
    (g.volumeSymbol === null || g.volumeValue != null);

  // meetsQsac — prefer explicit flag, else derive from measured q_S,AC (≥ 2 l/(s·ha), REQ-15).
  const meetsQsac =
    g.meetsQsacFlag != null ? g.meetsQsacFlag : (g.qSac != null && g.qSac >= 2);

  // blockGateFailed: per-facility BLOCK-gate condition eval (fan-out — now wired).
  //   flaeche → REQ-31 (§6.2.2 Gl.13, UNCONDITIONAL)
  //   rigole  → REQ-32 (§6.4.2 Gl.25, CONDITIONAL: L_VS present)
  //   schacht → REQ-33 (§6.7.2 Gl.38, CONDITIONAL: Schacht Typ B)
  // Each evaluator returns null when its inputs are missing / not applicable → no flag.
  const blockGateReasons: string[] = [];
  let blockGateFailed = false;
  // REQ-31 is UNCONDITIONAL: if it could NOT be evaluated (k_i / r_D(n) missing) the
  // verdict must not silently pass — a manual-check downgrade is injected below.
  let req31Unevaluated = false;
  if (g.facilityType === 'flaeche') {
    const r = evalReq31Flaeche(g.k_i ?? null, g.rDnUsed ?? null);
    if (r == null) {
      req31Unevaluated = true;
    } else if (r.flagged) {
      blockGateFailed = true;
      if (r.reason) blockGateReasons.push(r.reason);
    }
  } else if (g.facilityType === 'rigole') {
    const r = evalReq32Rigole({
      L_VS: g.L_VS ?? null, q_VS: g.q_VS ?? null, r_5_n: g.r_5_n ?? null, A_C: g.A_C ?? null,
    });
    if (r?.flagged) { blockGateFailed = true; if (r.reason) blockGateReasons.push(r.reason); }
  } else if (g.facilityType === 'schacht') {
    const r = evalReq33Schacht({
      shaftType: g.shaftType ?? null, A_S_FS: g.A_S_FS ?? null, k_f_FS: g.k_f_FS ?? null,
      A_S_Schacht: g.A_S_Schacht ?? null, k_i: g.k_i ?? null,
    });
    if (r?.flagged) { blockGateFailed = true; if (r.reason) blockGateReasons.push(r.reason); }
  }

  const gateInput: Phase4GateInput = {
    complete,
    meetsQsac,
    blockGateFailed,
    blockGateReasons,
    missingOutputs,
    q_S_AC: g.qSac,
    tab14: {
      t_E_hours: g.tEHours,
      freeboardOk: null, // PHASE4_SUMMARY_TAB14_SOURCE — threshold not yet sourced
      slopeOk: null,     // PHASE4_SUMMARY_TAB14_SOURCE — threshold not yet sourced
    },
  };

  let recommendation = recommendedPhase4Gate(gateInput);
  const reasons = recommendationReasons(gateInput);

  // ── FAIL-SAFE guard (IMPORTANT 2) ──────────────────────────────────────────
  // REQ-31 (flaeche §6.2.2 Gl.13) is now auto-evaluated above. The fail-safe now
  // fires ONLY in the residual case where the gate could NOT be evaluated because
  // its inputs (k_i / r_D(n)) were absent: a silent PASS/CONDITIONAL would be unsafe
  // (the gate might fail), so downgrade a computed PASS to CONDITIONAL and inject the
  // mandatory manual-check reason. When the gate WAS evaluated (pass or block) no
  // downgrade is applied — the real verdict stands. FAIL is always left as-is.
  if (req31Unevaluated) {
    if (recommendation === 'PASS') {
      recommendation = 'CONDITIONAL';
    }
    if (recommendation !== 'FAIL' && !reasons.includes(PHASE4_SUMMARY_REQ20_DEFERRED_REASON)) {
      reasons.push(PHASE4_SUMMARY_REQ20_DEFERRED_REASON);
    }
  }

  const writes: Phase4SummaryWrite[] = [
    // Finding A: this field is the dimensioned facility TYPE ("Dimensionierter
    // Anlagentyp", e.g. 'mulde'/'rigole') — NOT the design-worksheet code.
    // Previously wrote g.facilityWorksheetCode (e.g. 'A138-17'), which is the
    // mapped code, so A138-23 showed "A138-17" instead of "mulde". Write the
    // raw facility type.
    { symbol: 'facility_type_dimensioned', kind: 'text', value: g.facilityType },
    { symbol: 'facility_specific_volume_m3', kind: 'number', value: g.volumeValue },
    { symbol: 'facility_footprint_m2', kind: 'number', value: g.footprintValue },
    { symbol: 'facility_meets_qsac', kind: 'boolean', value: meetsQsac },
    { symbol: 'facility_specific_dimensioning_complete', kind: 'boolean', value: complete },
    { symbol: 'facility_design_completion_date', kind: 'date', value: complete ? nowIsoDate : null },
    { symbol: 'recommended_phase_4_gate', kind: 'enum', value: recommendation },
    { symbol: 'phase_4_recommendation_reasons', kind: 'text', value: reasons.join('; ') },
  ];

  return { writes, recommendation, reasons };
}
