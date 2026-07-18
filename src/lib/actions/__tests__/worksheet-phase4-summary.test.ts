/**
 * Task 3b.2 — A138-23 Phase-4 summary producer branch.
 *
 * DB-free — runs in the vitest `unit` project (the full DB round-trip runs in the
 * `integration` project against a live Postgres, mirroring worksheet-asm/tab6).
 *
 * These tests exercise the EXACT code the producer branch runs: the branch in
 * worksheet.ts (`producerEntry.id === 'phase4_summary'`) gathers scalars via scoped
 * DB reads and then calls the exported pure function `assemblePhase4Summary`. These
 * tests call that SAME function directly (no hand-copied mirror), so they cannot
 * drift from the branch. The tiny `gather()` helper below only reproduces the
 * facility→worksheet-code + governing-symbol resolution the DB reads perform, then
 * hands the scalars to the real assembly.
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
  assemblePhase4Summary,
  FACILITY_TYPE_TO_SUMMARY_WORKSHEET,
  PHASE4_SUMMARY_REQ20_DEFERRED_REASON,
  type FacilityType,
  type Phase4SummaryGathered,
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
// gather() — reproduces ONLY the facility→worksheet-code + governing-symbol/value
// resolution that the branch's scoped DB reads perform, then hands the scalars to
// the REAL exported `assemblePhase4Summary`. This is NOT a mirror of the assembly
// logic (complete/meetsQsac/verdict/write-set) — that is the code under test.
// ---------------------------------------------------------------------------

type Persisted = {
  facility_type_selected?: string | null;
  facility_meets_qsac?: boolean | null;
  q_S_AC?: number | null;
  t_E?: number | null;
  // Governing volume/footprint symbols (V_M, V_R, …, A_S, A_S_m) read by symbol.
  [sym: string]: number | string | boolean | null | undefined;
};

function gather(p: Persisted): Phase4SummaryGathered {
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

  return {
    facilityType,
    facilityWorksheetCode,
    volumeSymbol,
    footprintSymbol,
    volumeValue: volumeSymbol != null ? asNum(p[volumeSymbol]) : null,
    footprintValue: footprintSymbol != null ? asNum(p[footprintSymbol]) : null,
    qSac: p.q_S_AC ?? null,
    meetsQsacFlag: p.facility_meets_qsac ?? null,
    tEHours: p.t_E ?? null,
  };
}

/** Convenience: gather → assemblePhase4Summary, returning writes as a symbol→value map. */
function assemble(p: Persisted, nowIsoDate = '2026-07-17') {
  const { writes, recommendation, reasons } = assemblePhase4Summary(gather(p), nowIsoDate);
  const bySymbol = new Map(writes.map((w) => [w.symbol, w.value]));
  return {
    recommendation,
    reasonsJoined: reasons.join('; '),
    get: (sym: string) => bySymbol.get(sym),
  };
}

describe('assemblePhase4Summary — Mulde pilot', () => {
  // Mulde: volumeSymbol=V_M, footprintSymbol=A_S_m.
  it('case 1 — V_M + A_S_m present, q_S_AC≥2, t_E≤84 → PASS + support fields written', () => {
    const out = assemble({
      facility_type_selected: 'mulde',
      V_M: 120,
      A_S_m: 45,
      q_S_AC: 2.5,
      t_E: 60,
    });
    expect(out.recommendation).toBe('PASS');
    // Finding A: facility_type_dimensioned is the facility TYPE ('mulde'), not
    // the mapped design-worksheet code ('A138-17').
    expect(out.get('facility_type_dimensioned')).toBe('mulde');
    expect(out.get('facility_specific_volume_m3')).toBe(120);
    expect(out.get('facility_footprint_m2')).toBe(45);
    expect(out.get('facility_meets_qsac')).toBe(true);
    expect(out.get('facility_specific_dimensioning_complete')).toBe(true);
    expect(out.get('facility_design_completion_date')).toBe('2026-07-17');
    expect(out.reasonsJoined).toContain('Alle anwendbaren');
  });

  it('case 2 — t_E = 92 > 84 → CONDITIONAL, reason cites "92" and "84"', () => {
    const out = assemble({
      facility_type_selected: 'mulde',
      V_M: 120,
      A_S_m: 45,
      q_S_AC: 2.5,
      t_E: 92,
    });
    expect(out.recommendation).toBe('CONDITIONAL');
    expect(out.reasonsJoined).toContain('92');
    expect(out.reasonsJoined).toContain('84');
    // support fields still populated on CONDITIONAL
    expect(out.get('facility_specific_volume_m3')).toBe(120);
    expect(out.get('facility_footprint_m2')).toBe(45);
    expect(out.get('facility_specific_dimensioning_complete')).toBe(true);
  });

  it('case 3 — V_M missing → incomplete → FAIL, completion_date null, reason cites V_M', () => {
    const out = assemble({
      facility_type_selected: 'mulde',
      // V_M absent
      A_S_m: 45,
      q_S_AC: 2.5,
      t_E: 60,
    });
    expect(out.recommendation).toBe('FAIL');
    expect(out.get('facility_specific_dimensioning_complete')).toBe(false);
    expect(out.get('facility_design_completion_date')).toBeNull();
    expect(out.get('facility_specific_volume_m3')).toBeNull();
    expect(out.reasonsJoined).toContain('unvollständig');
    expect(out.reasonsJoined).toContain('V_M');
  });

  it('case 4 — q_S_AC = 1.3 < 2 (no explicit flag) → FAIL, reason cites the measured value', () => {
    const out = assemble({
      facility_type_selected: 'mulde',
      V_M: 120,
      A_S_m: 45,
      q_S_AC: 1.3,
      t_E: 60,
    });
    expect(out.recommendation).toBe('FAIL');
    expect(out.get('facility_meets_qsac')).toBe(false);
    expect(out.reasonsJoined).toContain('1.30');
  });

  it('case 5 — explicit facility_meets_qsac=true overrides a low measured q_S_AC', () => {
    const out = assemble({
      facility_type_selected: 'mulde',
      V_M: 120,
      A_S_m: 45,
      facility_meets_qsac: true,
      q_S_AC: 1.3,
      t_E: 60,
    });
    // Explicit flag wins → not a q_S,AC FAIL; complete + t_E ok → PASS.
    expect(out.get('facility_meets_qsac')).toBe(true);
    expect(out.recommendation).toBe('PASS');
  });
});

describe('assemblePhase4Summary — flaeche REQ-31 unconditional-gate fail-safe (IMPORTANT 2)', () => {
  it('flaeche: volumeSymbol=null → complete requires only footprint A_S', () => {
    const out = assemble({
      facility_type_selected: 'flaeche',
      A_S: 200,
      q_S_AC: 3,
    });
    // No V_S required for flaeche; footprint present → complete.
    expect(out.get('facility_specific_dimensioning_complete')).toBe(true);
    expect(out.get('facility_specific_volume_m3')).toBeNull();
    expect(out.get('facility_footprint_m2')).toBe(200);
    // Finding A: TYPE not CODE.
    expect(out.get('facility_type_dimensioned')).toBe('flaeche');
  });

  it('flaeche with otherwise-PASS inputs → NOT a silent PASS: downgraded to CONDITIONAL + REQ-31 note', () => {
    // Complete, meetsQsac, no t_E flag → the ratified predicate alone would return PASS.
    // The REQ-31 unconditional-gate deferral must force at most CONDITIONAL + a mandatory reason.
    const out = assemble({
      facility_type_selected: 'flaeche',
      A_S: 200,
      q_S_AC: 3,
    });
    expect(out.recommendation).toBe('CONDITIONAL');
    expect(out.recommendation).not.toBe('PASS');
    expect(out.reasonsJoined).toContain(PHASE4_SUMMARY_REQ20_DEFERRED_REASON);
    expect(out.reasonsJoined).toContain('REQ-31');
    expect(out.reasonsJoined).toContain('noch nicht');
    expect(out.reasonsJoined).toContain('ausgewertet');
  });

  it('flaeche that FAILs (incomplete) stays FAIL — the guard never masks a FAIL', () => {
    const out = assemble({
      facility_type_selected: 'flaeche',
      // A_S absent → incomplete → FAIL
      q_S_AC: 3,
    });
    expect(out.recommendation).toBe('FAIL');
    // FAIL is already the safe verdict; the REQ-31 note is not appended over a FAIL.
    expect(out.reasonsJoined).not.toContain(PHASE4_SUMMARY_REQ20_DEFERRED_REASON);
  });

  it('mulde is UNAFFECTED by the flaeche guard (no REQ-31 note, PASS stays PASS)', () => {
    const out = assemble({
      facility_type_selected: 'mulde',
      V_M: 120,
      A_S_m: 45,
      q_S_AC: 2.5,
      t_E: 60,
    });
    expect(out.recommendation).toBe('PASS');
    expect(out.reasonsJoined).not.toContain('REQ-31');
  });
});
