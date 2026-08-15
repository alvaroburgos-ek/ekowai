import { describe, it, expect } from 'vitest';
import {
  facilitySummaryInputs,
  recommendedPhase4Gate,
  recommendationReasons,
  evalReq31Flaeche,
  evalReq32Rigole,
  evalReq33Schacht,
  type FacilityType,
  type Phase4GateInput,
} from '../phase4-summary';

// ---------------------------------------------------------------------------
// Per-facility BLOCK-gate condition evaluators (fan-out — source-verified)
// ---------------------------------------------------------------------------
describe('evalReq31Flaeche — §6.2.2 Gl.13 (k_i > r_D(n)·10⁻⁷)', () => {
  it('feasible → not flagged', () => {
    expect(evalReq31Flaeche(1e-4, 100)).toEqual({ flagged: false, reason: null });
  });
  it('infeasible (k_i ≤ r_D(n)·10⁻⁷) → flagged with a Gl.13 reason', () => {
    const r = evalReq31Flaeche(5e-7, 100);
    expect(r?.flagged).toBe(true);
    expect(r?.reason).toContain('Gl.13');
  });
  it('below the threshold r_D(n)·10⁻⁷ → infeasible (strict >)', () => {
    // r_D(n)·10⁻⁷ for r_D=100 is ~1e-5; a k_i clearly under it must flag.
    expect(evalReq31Flaeche(9e-6, 100)?.flagged).toBe(true);
  });
  it('missing input → null (cannot evaluate)', () => {
    expect(evalReq31Flaeche(null, 100)).toBeNull();
    expect(evalReq31Flaeche(1e-4, null)).toBeNull();
  });
});

describe('evalReq32Rigole — §6.4.2 Gl.25 (L_VS·q_VS ≥ r_5(n)·A_C·10⁻⁴)', () => {
  it('not applicable when L_VS absent/zero → null', () => {
    expect(evalReq32Rigole({ L_VS: null, q_VS: 5, r_5_n: 200, A_C: 1000 })).toBeNull();
    expect(evalReq32Rigole({ L_VS: 0, q_VS: 5, r_5_n: 200, A_C: 1000 })).toBeNull();
  });
  it('sufficient capacity → not flagged', () => {
    // L_VS·q_VS = 20·5 = 100 ≥ 200·1000·1e-4 = 20 → ok.
    expect(evalReq32Rigole({ L_VS: 20, q_VS: 5, r_5_n: 200, A_C: 1000 })).toEqual({ flagged: false, reason: null });
  });
  it('insufficient capacity → flagged with a Gl.25 reason', () => {
    // L_VS·q_VS = 1·0.2 = 0.2 < 200·1000·1e-4 = 20 → block.
    const r = evalReq32Rigole({ L_VS: 1, q_VS: 0.2, r_5_n: 200, A_C: 1000 });
    expect(r?.flagged).toBe(true);
    expect(r?.reason).toContain('Gl.25');
  });
});

describe('evalReq33Schacht — §6.7.2 Gl.38 (A_S,FS·k_f,FS ≥ A_S,Schacht·k_i)', () => {
  it('not applicable unless Schacht Typ B → null', () => {
    expect(evalReq33Schacht({ shaftType: 'typ_a', A_S_FS: 1, k_f_FS: 1e-4, A_S_Schacht: 1, k_i: 1e-5 })).toBeNull();
    expect(evalReq33Schacht({ shaftType: null, A_S_FS: 1, k_f_FS: 1e-4, A_S_Schacht: 1, k_i: 1e-5 })).toBeNull();
  });
  it('Typ B sufficient filter → not flagged', () => {
    // 1·1e-4 = 1e-4 ≥ 1·1e-5 = 1e-5 → ok.
    expect(evalReq33Schacht({ shaftType: 'typ_b', A_S_FS: 1, k_f_FS: 1e-4, A_S_Schacht: 1, k_i: 1e-5 })).toEqual({ flagged: false, reason: null });
  });
  it('Typ B insufficient filter → flagged with a Gl.38 reason', () => {
    const r = evalReq33Schacht({ shaftType: 'typ_b', A_S_FS: 1, k_f_FS: 1e-7, A_S_Schacht: 5, k_i: 1e-5 });
    expect(r?.flagged).toBe(true);
    expect(r?.reason).toContain('Gl.38');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A fully-passing input — all flags green, Tab.14 all-null (N/A). */
function passingInput(overrides?: Partial<Phase4GateInput>): Phase4GateInput {
  return {
    complete: true,
    meetsQsac: true,
    blockGateFailed: false,
    tab14: { t_E_hours: null, freeboardOk: null, slopeOk: null },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// facilitySummaryInputs — verbatim table (A138-23)
// ---------------------------------------------------------------------------

describe('facilitySummaryInputs — verbatim symbol mapping', () => {
  it('flaeche: no volume symbol, footprint a138_A_s_dim (dimensioned/built area)', () => {
    // §6.2.2 — area device; footprint is the DIMENSIONED area (a138_A_s_dim),
    // not the dead generic A_S (inactive on A138-16).
    expect(facilitySummaryInputs('flaeche')).toEqual({ volumeSymbol: null, footprintSymbol: 'a138_A_s_dim' });
  });

  it('mulde: V_M, A_S_m', () => {
    expect(facilitySummaryInputs('mulde')).toEqual({ volumeSymbol: 'V_M', footprintSymbol: 'A_S_m' });
  });

  it('rigole: V_R, A_S_m', () => {
    expect(facilitySummaryInputs('rigole')).toEqual({ volumeSymbol: 'V_R', footprintSymbol: 'A_S_m' });
  });

  it('mre: V_MR, A_S_m', () => {
    expect(facilitySummaryInputs('mre')).toEqual({ volumeSymbol: 'V_MR', footprintSymbol: 'A_S_m' });
  });

  it('mrs: V_MUE, A_S_m', () => {
    expect(facilitySummaryInputs('mrs')).toEqual({ volumeSymbol: 'V_MUE', footprintSymbol: 'A_S_m' });
  });

  it('schacht: V_S, A_S_Schacht (active footprint, Gl.34)', () => {
    // §6.7.2 — footprint is the active A_S_Schacht, not the dead generic A_S.
    expect(facilitySummaryInputs('schacht')).toEqual({ volumeSymbol: 'V_S', footprintSymbol: 'A_S_Schacht' });
  });

  it('becken: V_B, A_S_m', () => {
    // §6.8.2 Gl.41 — the active volume field on A138-22 is V_B (no V_VA field).
    expect(facilitySummaryInputs('becken')).toEqual({ volumeSymbol: 'V_B', footprintSymbol: 'A_S_m' });
  });

  it('covers all 7 FacilityType values exhaustively', () => {
    const all: FacilityType[] = ['flaeche', 'mulde', 'rigole', 'mre', 'mrs', 'schacht', 'becken'];
    for (const t of all) {
      const result = facilitySummaryInputs(t);
      // footprintSymbol is always a non-empty string
      expect(typeof result.footprintSymbol).toBe('string');
      expect(result.footprintSymbol.length).toBeGreaterThan(0);
      // volumeSymbol is either null or a non-empty string
      if (result.volumeSymbol !== null) {
        expect(typeof result.volumeSymbol).toBe('string');
        expect(result.volumeSymbol.length).toBeGreaterThan(0);
      }
    }
  });

  it('only flaeche has null volumeSymbol', () => {
    const withNull: FacilityType[] = ['flaeche'];
    const withVolume: FacilityType[] = ['mulde', 'rigole', 'mre', 'mrs', 'schacht', 'becken'];
    for (const t of withNull) {
      expect(facilitySummaryInputs(t).volumeSymbol).toBeNull();
    }
    for (const t of withVolume) {
      expect(facilitySummaryInputs(t).volumeSymbol).not.toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// recommendedPhase4Gate — PASS
// ---------------------------------------------------------------------------

describe('recommendedPhase4Gate — PASS', () => {
  it('PASS when complete=true, meetsQsac=true, no block fail, Tab.14 all-null', () => {
    expect(recommendedPhase4Gate(passingInput())).toBe('PASS');
  });

  it('PASS with Tab.14 values present but all within limits', () => {
    const input = passingInput({
      tab14: { t_E_hours: 72, freeboardOk: true, slopeOk: true },
    });
    expect(recommendedPhase4Gate(input)).toBe('PASS');
  });

  it('PASS with t_E exactly 84 h (boundary — not > 84)', () => {
    const input = passingInput({
      tab14: { t_E_hours: 84, freeboardOk: null, slopeOk: null },
    });
    expect(recommendedPhase4Gate(input)).toBe('PASS');
  });
});

// ---------------------------------------------------------------------------
// recommendedPhase4Gate — CONDITIONAL
// ---------------------------------------------------------------------------

describe('recommendedPhase4Gate — CONDITIONAL (Tab.14 soft constraints)', () => {
  it('CONDITIONAL when t_E = 92 h > 84 h (Tab.14/§6.3.2)', () => {
    const input = passingInput({
      tab14: { t_E_hours: 92, freeboardOk: null, slopeOk: null },
    });
    expect(recommendedPhase4Gate(input)).toBe('CONDITIONAL');
  });

  it('CONDITIONAL when t_E = 85 h > 84 h (boundary + 1)', () => {
    const input = passingInput({
      tab14: { t_E_hours: 85, freeboardOk: null, slopeOk: null },
    });
    expect(recommendedPhase4Gate(input)).toBe('CONDITIONAL');
  });

  it('CONDITIONAL when freeboardOk = false', () => {
    const input = passingInput({
      tab14: { t_E_hours: null, freeboardOk: false, slopeOk: null },
    });
    expect(recommendedPhase4Gate(input)).toBe('CONDITIONAL');
  });

  it('CONDITIONAL when slopeOk = false', () => {
    const input = passingInput({
      tab14: { t_E_hours: null, freeboardOk: null, slopeOk: false },
    });
    expect(recommendedPhase4Gate(input)).toBe('CONDITIONAL');
  });

  it('CONDITIONAL when multiple Tab.14 constraints flag simultaneously', () => {
    const input = passingInput({
      tab14: { t_E_hours: 92, freeboardOk: false, slopeOk: false },
    });
    expect(recommendedPhase4Gate(input)).toBe('CONDITIONAL');
  });
});

// ---------------------------------------------------------------------------
// recommendedPhase4Gate — FAIL
// ---------------------------------------------------------------------------

describe('recommendedPhase4Gate — FAIL', () => {
  it('FAIL when complete=false (missing sizing outputs)', () => {
    expect(recommendedPhase4Gate(passingInput({ complete: false }))).toBe('FAIL');
  });

  it('FAIL when blockGateFailed=true', () => {
    expect(recommendedPhase4Gate(passingInput({ blockGateFailed: true }))).toBe('FAIL');
  });

  it('FAIL when meetsQsac=false (q_S,AC < 2 l/(s·ha))', () => {
    expect(recommendedPhase4Gate(passingInput({ meetsQsac: false }))).toBe('FAIL');
  });

  it('FAIL beats CONDITIONAL: blockGateFailed=true AND Tab.14 flagged → FAIL', () => {
    const input = passingInput({
      blockGateFailed: true,
      blockGateReasons: ['REQ-32: L_VS·q_VS < r_5(n)·A_C·10⁻⁴'],
      tab14: { t_E_hours: 92, freeboardOk: false, slopeOk: false },
    });
    expect(recommendedPhase4Gate(input)).toBe('FAIL');
  });

  it('FAIL beats CONDITIONAL: !complete AND Tab.14 flagged → FAIL', () => {
    const input = passingInput({
      complete: false,
      tab14: { t_E_hours: 92, freeboardOk: false, slopeOk: null },
    });
    expect(recommendedPhase4Gate(input)).toBe('FAIL');
  });

  it('FAIL beats CONDITIONAL: !meetsQsac AND Tab.14 flagged → FAIL', () => {
    const input = passingInput({
      meetsQsac: false,
      tab14: { t_E_hours: 92, freeboardOk: null, slopeOk: null },
    });
    expect(recommendedPhase4Gate(input)).toBe('FAIL');
  });

  it('FAIL when all three hard conditions are true simultaneously', () => {
    const input = passingInput({
      complete: false,
      meetsQsac: false,
      blockGateFailed: true,
    });
    expect(recommendedPhase4Gate(input)).toBe('FAIL');
  });
});

// ---------------------------------------------------------------------------
// Tab.14 all-null → not CONDITIONAL on that basis
// ---------------------------------------------------------------------------

describe('Tab.14 all-null — not CONDITIONAL on that basis', () => {
  it('Tab.14 entirely N/A (all null) does not trigger CONDITIONAL', () => {
    const input = passingInput({
      tab14: { t_E_hours: null, freeboardOk: null, slopeOk: null },
    });
    // Must be PASS, not CONDITIONAL
    expect(recommendedPhase4Gate(input)).toBe('PASS');
  });

  it('freeboardOk=true, slopeOk=true, t_E=null → PASS (null t_E is N/A)', () => {
    const input = passingInput({
      tab14: { t_E_hours: null, freeboardOk: true, slopeOk: true },
    });
    expect(recommendedPhase4Gate(input)).toBe('PASS');
  });
});

// ---------------------------------------------------------------------------
// recommendationReasons — PASS
// ---------------------------------------------------------------------------

describe('recommendationReasons — PASS', () => {
  it('returns single "all satisfied" sentence for PASS', () => {
    const reasons = recommendationReasons(passingInput());
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('Alle anwendbaren Bemessungsvorgaben erfüllt');
  });
});

// ---------------------------------------------------------------------------
// recommendationReasons — CONDITIONAL (values embedded)
// ---------------------------------------------------------------------------

describe('recommendationReasons — CONDITIONAL with values', () => {
  it('t_E=92 h: reason mentions 92 and 84', () => {
    const input = passingInput({
      tab14: { t_E_hours: 92, freeboardOk: null, slopeOk: null },
    });
    const reasons = recommendationReasons(input);
    expect(reasons.length).toBeGreaterThanOrEqual(1);
    const r = reasons.find((s) => s.includes('Entleerungszeit'));
    expect(r).toBeTruthy();
    expect(r).toContain('92');
    expect(r).toContain('84');
    expect(r).toContain('Tab. 14');
    expect(r).toContain('§6.3.2');
  });

  it('t_E=120 h: reason mentions 120', () => {
    const input = passingInput({
      tab14: { t_E_hours: 120, freeboardOk: null, slopeOk: null },
    });
    const reasons = recommendationReasons(input);
    const r = reasons.find((s) => s.includes('Entleerungszeit'));
    expect(r).toContain('120');
  });

  it('freeboardOk=false: reason mentions Freibord', () => {
    const input = passingInput({
      tab14: { t_E_hours: null, freeboardOk: false, slopeOk: null },
    });
    const reasons = recommendationReasons(input);
    expect(reasons.some((r) => r.includes('Freibord'))).toBe(true);
  });

  it('slopeOk=false: reason mentions Böschungsneigung', () => {
    const input = passingInput({
      tab14: { t_E_hours: null, freeboardOk: null, slopeOk: false },
    });
    const reasons = recommendationReasons(input);
    expect(reasons.some((r) => r.includes('Böschungsneigung'))).toBe(true);
  });

  it('all three Tab.14 flags: returns all three reason strings', () => {
    const input = passingInput({
      tab14: { t_E_hours: 92, freeboardOk: false, slopeOk: false },
    });
    const reasons = recommendationReasons(input);
    expect(reasons.length).toBe(3);
    expect(reasons.some((r) => r.includes('Entleerungszeit'))).toBe(true);
    expect(reasons.some((r) => r.includes('Freibord'))).toBe(true);
    expect(reasons.some((r) => r.includes('Böschungsneigung'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// recommendationReasons — FAIL
// ---------------------------------------------------------------------------

describe('recommendationReasons — FAIL', () => {
  it('!complete with missingOutputs: reason lists the missing symbols', () => {
    const input = passingInput({
      complete: false,
      missingOutputs: ['V_M', 'A_S_m'],
    });
    const reasons = recommendationReasons(input);
    expect(reasons.some((r) => r.includes('V_M'))).toBe(true);
    expect(reasons.some((r) => r.includes('A_S_m'))).toBe(true);
    expect(reasons.some((r) => r.includes('unvollständig'))).toBe(true);
  });

  it('!complete with no missingOutputs: reason still names incompleteness', () => {
    const input = passingInput({ complete: false });
    const reasons = recommendationReasons(input);
    expect(reasons.some((r) => r.includes('unvollständig'))).toBe(true);
  });

  it('blockGateFailed: reason carries blockGateReasons verbatim', () => {
    const blockMsg = 'REQ-32: L_VS·q_VS < r_5(n)·A_C·10⁻⁴';
    const input = passingInput({
      blockGateFailed: true,
      blockGateReasons: [blockMsg],
    });
    const reasons = recommendationReasons(input);
    expect(reasons).toContain(blockMsg);
  });

  it('blockGateFailed with multiple reasons: all carried', () => {
    const r1 = 'REQ-31: Gl.13 nicht erfüllt';
    const r2 = 'REQ-33: Gl.38 bei Schacht-Typ B nicht erfüllt';
    const input = passingInput({
      blockGateFailed: true,
      blockGateReasons: [r1, r2],
    });
    const reasons = recommendationReasons(input);
    expect(reasons).toContain(r1);
    expect(reasons).toContain(r2);
  });

  it('!meetsQsac: reason mentions q_S,AC and REQ-15', () => {
    const input = passingInput({ meetsQsac: false });
    const reasons = recommendationReasons(input);
    const r = reasons.find((s) => s.includes('q_S,AC'));
    expect(r).toBeTruthy();
    expect(r).toContain('REQ-15');
  });

  it('all three FAIL conditions simultaneously: all reasons present', () => {
    const blockMsg = 'REQ-31: Gl.13 nicht erfüllt';
    const input = passingInput({
      complete: false,
      meetsQsac: false,
      blockGateFailed: true,
      blockGateReasons: [blockMsg],
      missingOutputs: ['V_M'],
    });
    const reasons = recommendationReasons(input);
    expect(reasons.some((r) => r.includes('unvollständig'))).toBe(true);
    expect(reasons).toContain(blockMsg);
    expect(reasons.some((r) => r.includes('q_S,AC'))).toBe(true);
  });

  it('FAIL(block+tab14) → reasons are FAIL reasons only, not Tab.14 (FAIL takes precedence)', () => {
    const blockMsg = 'REQ-32: L_VS·q_VS < r_5(n)·A_C·10⁻⁴';
    const input = passingInput({
      blockGateFailed: true,
      blockGateReasons: [blockMsg],
      tab14: { t_E_hours: 92, freeboardOk: false, slopeOk: false },
    });
    const reasons = recommendationReasons(input);
    // Block reason must be present
    expect(reasons).toContain(blockMsg);
    // Tab.14 reasons must NOT appear — FAIL swallows CONDITIONAL signals
    expect(reasons.some((r) => r.includes('Entleerungszeit'))).toBe(false);
    expect(reasons.some((r) => r.includes('Freibord'))).toBe(false);
    expect(reasons.some((r) => r.includes('Böschungsneigung'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// M1 — !meetsQsac reason cites the measured q_S,AC value when supplied
// ---------------------------------------------------------------------------

describe('recommendationReasons — !meetsQsac with q_S_AC (M1)', () => {
  it('!meetsQsac WITH q_S_AC=1.3 → reason includes measured value "1.30", "2", and REQ-15', () => {
    const input = passingInput({ meetsQsac: false, q_S_AC: 1.3 });
    const reasons = recommendationReasons(input);
    const r = reasons.find((s) => s.includes('q_S,AC'));
    expect(r).toBeTruthy();
    expect(r).toContain('1.30');
    expect(r).toContain('2');
    expect(r).toContain('REQ-15');
  });

  it('!meetsQsac WITHOUT q_S_AC (omitted) → static fallback reason still present (backward-compat)', () => {
    const input = passingInput({ meetsQsac: false });
    const reasons = recommendationReasons(input);
    const r = reasons.find((s) => s.includes('q_S,AC'));
    expect(r).toBeTruthy();
    expect(r).toBe('q_S,AC < 2 l/(s·ha) (Phase-3 REQ-15 nicht erfüllt)');
  });

  it('!meetsQsac WITH q_S_AC=null → static fallback reason (backward-compat)', () => {
    const input = passingInput({ meetsQsac: false, q_S_AC: null });
    const reasons = recommendationReasons(input);
    const r = reasons.find((s) => s.includes('q_S,AC'));
    expect(r).toBeTruthy();
    expect(r).toBe('q_S,AC < 2 l/(s·ha) (Phase-3 REQ-15 nicht erfüllt)');
  });

  it('supplying q_S_AC does NOT change the FAIL verdict (logic untouched)', () => {
    const input = passingInput({ meetsQsac: false, q_S_AC: 1.3 });
    expect(recommendedPhase4Gate(input)).toBe('FAIL');
  });
});

// ---------------------------------------------------------------------------
// Consistency: verdict ↔ reasons alignment
// ---------------------------------------------------------------------------

describe('verdict-reasons consistency', () => {
  it('PASS verdict ↔ PASS reason (no "unvollständig" / no "Entleerungszeit")', () => {
    const input = passingInput();
    expect(recommendedPhase4Gate(input)).toBe('PASS');
    const reasons = recommendationReasons(input);
    expect(reasons.every((r) => !r.includes('unvollständig'))).toBe(true);
    expect(reasons.every((r) => !r.includes('Entleerungszeit'))).toBe(true);
    expect(reasons.some((r) => r.includes('erfüllt'))).toBe(true);
  });

  it('CONDITIONAL verdict ↔ CONDITIONAL reasons (no "erfüllt" sole-pass message)', () => {
    const input = passingInput({
      tab14: { t_E_hours: 92, freeboardOk: null, slopeOk: null },
    });
    expect(recommendedPhase4Gate(input)).toBe('CONDITIONAL');
    const reasons = recommendationReasons(input);
    // The single-pass message must not appear
    expect(reasons.every((r) => !r.includes('Alle anwendbaren'))).toBe(true);
    expect(reasons.some((r) => r.includes('Entleerungszeit'))).toBe(true);
  });

  it('FAIL verdict ↔ FAIL reasons (no sole-pass message)', () => {
    const input = passingInput({ complete: false, missingOutputs: ['V_R'] });
    expect(recommendedPhase4Gate(input)).toBe('FAIL');
    const reasons = recommendationReasons(input);
    expect(reasons.every((r) => !r.includes('Alle anwendbaren'))).toBe(true);
    expect(reasons.some((r) => r.includes('unvollständig'))).toBe(true);
  });
});
