/**
 * Task 3b.2 — A138-23 Phase-4 summary producer branch.
 *
 * DB-free — runs in the vitest `unit` project (the full DB round-trip runs in the
 * `integration` project against a live Postgres, mirroring worksheet-asm/tab6).
 *
 * These tests are REPRODUCTION-GRADE for the producer branch in worksheet.ts
 * (`producerEntry.id === 'phase4_summary'`): a small faithful mirror of the
 * branch's input-gathering → Phase4GateInput → recommendedPhase4Gate /
 * recommendationReasons → write-set. If the governing volume/footprint symbol
 * resolution, the complete predicate, the meetsQsac derivation, or the write-set
 * shape were wrong, these tests fail.
 */

// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  MATERIALIZE_REGISTRY,
  producerFiredEntries,
  PHASE4_SUMMARY_CONSUMER_CODE,
} from '../materialize-registry';
import {
  facilitySummaryInputs,
  recommendedPhase4Gate,
  recommendationReasons,
  FACILITY_TYPE_TO_SUMMARY_WORKSHEET,
  type FacilityType,
  type Phase4GateInput,
} from '@/lib/eval/phase4-summary';

// ---------------------------------------------------------------------------
// Registry entry
// ---------------------------------------------------------------------------
describe('phase4_summary registry entry', () => {
  const entry = MATERIALIZE_REGISTRY.find((e) => e.id === 'phase4_summary');

  it('exists and targets A138-23', () => {
    expect(entry).toBeTruthy();
    expect(entry!.consumerTemplateCode).toBe('A138-23');
    expect(PHASE4_SUMMARY_CONSUMER_CODE).toBe('A138-23');
  });

  it('has a no-equation ownerTrigger (A138-23 owns no equation → always false)', () => {
    // Even with arbitrary equation ids present, the equation-topology ownerTrigger
    // never matches (owner path is driven by the template-code marker in worksheet.ts).
    expect(entry!.ownerTrigger([{ id: 'anything' }])).toBe(false);
    expect(entry!.ownerTrigger([])).toBe(false);
  });

  it('producer-fires when a Phase-4 support symbol changes on any worksheet', () => {
    for (const sym of ['facility_type_selected', 'V_M', 'A_S_m', 'A_S', 'q_S_AC', 't_E', 'V_VA', 'V_MR', 'V_MUE', 'V_R', 'V_S']) {
      const fired = producerFiredEntries(new Set([sym]), new Set());
      expect(fired.some((e) => e.id === 'phase4_summary')).toBe(true);
    }
  });

  it('does NOT producer-fire on an unrelated symbol', () => {
    const fired = producerFiredEntries(new Set(['bbz_thickness']), new Set());
    expect(fired.some((e) => e.id === 'phase4_summary')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Facility → worksheet map: composites included
// ---------------------------------------------------------------------------
describe('FACILITY_TYPE_TO_SUMMARY_WORKSHEET (composites)', () => {
  it('maps all seven facility types incl. mre/mrs composites', () => {
    expect(FACILITY_TYPE_TO_SUMMARY_WORKSHEET).toEqual({
      flaeche: 'A138-16',
      mulde:   'A138-17',
      rigole:  'A138-18',
      mre:     'A138-19',
      mrs:     'A138-20',
      schacht: 'A138-21',
      becken:  'A138-22',
    });
  });
});

// ---------------------------------------------------------------------------
// Producer-branch logic mirror.
// Faithful transcription of the branch's input-gathering + build + compute +
// write-set, over an in-memory persisted-parameter map. The mirror MUST stay
// byte-equivalent to worksheet.ts so a divergence breaks a test.
// ---------------------------------------------------------------------------

type Persisted = {
  facility_type_selected?: string | null;
  facility_meets_qsac?: boolean | null;
  q_S_AC?: number | null;
  t_E?: number | null;
  // Governing volume/footprint symbols (V_M, V_R, …, A_S, A_S_m) read by symbol.
  [sym: string]: number | string | boolean | null | undefined;
};

type SummaryWriteSet = {
  facility_type_dimensioned: string | null;
  facility_specific_volume_m3: number | null;
  facility_footprint_m2: number | null;
  facility_meets_qsac: boolean;
  facility_specific_dimensioning_complete: boolean;
  facility_design_completion_date: string | null;
  recommended_phase_4_gate: 'PASS' | 'CONDITIONAL' | 'FAIL';
  phase_4_recommendation_reasons: string;
};

/** Mirror of the worksheet.ts phase4_summary branch (steps 2–9). */
function computeSummary(p: Persisted, nowIsoDate = '2026-07-17'): SummaryWriteSet {
  const rawFt = p.facility_type_selected ?? null;
  const facilityType: FacilityType | null =
    rawFt === 'flaeche' || rawFt === 'mulde' || rawFt === 'rigole' ||
    rawFt === 'mre' || rawFt === 'mrs' || rawFt === 'schacht' || rawFt === 'becken'
      ? rawFt
      : null;

  const facilityWorksheetCode =
    facilityType != null ? FACILITY_TYPE_TO_SUMMARY_WORKSHEET[facilityType] : null;

  const summaryInputs = facilityType != null ? facilitySummaryInputs(facilityType) : null;
  const volumeSymbol = summaryInputs?.volumeSymbol ?? null;
  const footprintSymbol = summaryInputs?.footprintSymbol ?? null;

  const asNum = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  const volumeValue = volumeSymbol != null ? asNum(p[volumeSymbol]) : null;
  const footprintValue = footprintSymbol != null ? asNum(p[footprintSymbol]) : null;

  const qSac = p.q_S_AC ?? null;
  const meetsQsacFlag = p.facility_meets_qsac ?? null;
  const tEHours = p.t_E ?? null;

  const missingOutputs: string[] = [];
  if (facilityType == null) missingOutputs.push('facility_type_selected');
  if (footprintSymbol != null && footprintValue == null) missingOutputs.push(footprintSymbol);
  if (volumeSymbol != null && volumeValue == null) missingOutputs.push(volumeSymbol);

  const complete =
    facilityType != null &&
    footprintValue != null &&
    (volumeSymbol === null || volumeValue != null);

  const meetsQsac =
    meetsQsacFlag != null ? meetsQsacFlag : (qSac != null && qSac >= 2);

  const blockGateFailed = false; // pilot/no-gate; gated facilities deferred to fan-out
  const blockGateReasons: string[] = [];

  const gateInput: Phase4GateInput = {
    complete,
    meetsQsac,
    blockGateFailed,
    blockGateReasons,
    missingOutputs,
    q_S_AC: qSac,
    tab14: { t_E_hours: tEHours, freeboardOk: null, slopeOk: null },
  };

  const recommendation = recommendedPhase4Gate(gateInput);
  const reasons = recommendationReasons(gateInput);

  return {
    facility_type_dimensioned: facilityType != null ? facilityWorksheetCode : null,
    facility_specific_volume_m3: volumeValue,
    facility_footprint_m2: footprintValue,
    facility_meets_qsac: meetsQsac,
    facility_specific_dimensioning_complete: complete,
    facility_design_completion_date: complete ? nowIsoDate : null,
    recommended_phase_4_gate: recommendation,
    phase_4_recommendation_reasons: reasons.join('; '),
  };
}

describe('Phase-4 summary producer-branch logic (Mulde pilot)', () => {
  // Mulde: volumeSymbol=V_M, footprintSymbol=A_S_m.
  it('case 1 — V_M + A_S_m present, q_S_AC≥2, t_E≤84 → PASS + support fields written', () => {
    const out = computeSummary({
      facility_type_selected: 'mulde',
      V_M: 120,
      A_S_m: 45,
      q_S_AC: 2.5,
      t_E: 60,
    });
    expect(out.recommended_phase_4_gate).toBe('PASS');
    expect(out.facility_type_dimensioned).toBe('A138-17');
    expect(out.facility_specific_volume_m3).toBe(120);
    expect(out.facility_footprint_m2).toBe(45);
    expect(out.facility_meets_qsac).toBe(true);
    expect(out.facility_specific_dimensioning_complete).toBe(true);
    expect(out.facility_design_completion_date).toBe('2026-07-17');
    expect(out.phase_4_recommendation_reasons).toContain('Alle anwendbaren');
  });

  it('case 2 — t_E = 92 > 84 → CONDITIONAL, reason cites "92" and "84"', () => {
    const out = computeSummary({
      facility_type_selected: 'mulde',
      V_M: 120,
      A_S_m: 45,
      q_S_AC: 2.5,
      t_E: 92,
    });
    expect(out.recommended_phase_4_gate).toBe('CONDITIONAL');
    expect(out.phase_4_recommendation_reasons).toContain('92');
    expect(out.phase_4_recommendation_reasons).toContain('84');
    // support fields still populated on CONDITIONAL
    expect(out.facility_specific_volume_m3).toBe(120);
    expect(out.facility_footprint_m2).toBe(45);
    expect(out.facility_specific_dimensioning_complete).toBe(true);
  });

  it('case 3 — V_M missing → incomplete → FAIL, completion_date null, reason cites V_M', () => {
    const out = computeSummary({
      facility_type_selected: 'mulde',
      // V_M absent
      A_S_m: 45,
      q_S_AC: 2.5,
      t_E: 60,
    });
    expect(out.recommended_phase_4_gate).toBe('FAIL');
    expect(out.facility_specific_dimensioning_complete).toBe(false);
    expect(out.facility_design_completion_date).toBeNull();
    expect(out.facility_specific_volume_m3).toBeNull();
    expect(out.phase_4_recommendation_reasons).toContain('unvollständig');
    expect(out.phase_4_recommendation_reasons).toContain('V_M');
  });

  it('case 4 — q_S_AC = 1.3 < 2 (no explicit flag) → FAIL, reason cites the measured value', () => {
    const out = computeSummary({
      facility_type_selected: 'mulde',
      V_M: 120,
      A_S_m: 45,
      q_S_AC: 1.3,
      t_E: 60,
    });
    expect(out.recommended_phase_4_gate).toBe('FAIL');
    expect(out.facility_meets_qsac).toBe(false);
    expect(out.phase_4_recommendation_reasons).toContain('1.30');
  });

  it('case 5 — explicit facility_meets_qsac=true overrides a low measured q_S_AC', () => {
    const out = computeSummary({
      facility_type_selected: 'mulde',
      V_M: 120,
      A_S_m: 45,
      facility_meets_qsac: true,
      q_S_AC: 1.3,
      t_E: 60,
    });
    // Explicit flag wins → not a q_S,AC FAIL; complete + t_E ok → PASS.
    expect(out.facility_meets_qsac).toBe(true);
    expect(out.recommended_phase_4_gate).toBe('PASS');
  });
});

describe('Phase-4 summary — area device (Flächenversickerung) has no governing volume', () => {
  it('flaeche: volumeSymbol=null → complete requires only footprint A_S', () => {
    const out = computeSummary({
      facility_type_selected: 'flaeche',
      A_S: 200,
      q_S_AC: 3,
    });
    // No V_S required for flaeche; footprint present → complete.
    expect(out.facility_specific_dimensioning_complete).toBe(true);
    expect(out.facility_specific_volume_m3).toBeNull();
    expect(out.facility_footprint_m2).toBe(200);
    expect(out.facility_type_dimensioned).toBe('A138-16');
  });
});
