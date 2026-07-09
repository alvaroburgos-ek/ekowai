import { describe, it, expect } from 'vitest';
import {
  resolveAsmProducer, computeDirect, computeSoilEstimate,
  ASM_GL16_EQUATION_ID, ASM_GL17_EQUATION_ID, FACILITY_TYPE_TO_WORKSHEET,
  validateGeometryAgainstMax,
  asmEngineSuppressedSymbols,
} from '../asm-source';

describe('resolveAsmProducer', () => {
  it('direct/soil/manual resolve without a facility type', () => {
    expect(resolveAsmProducer('direct', null)).toEqual({ kind: 'direct' });
    expect(resolveAsmProducer('soil_estimate', null)).toEqual({ kind: 'soil_estimate' });
    expect(resolveAsmProducer('manual', null)).toEqual({ kind: 'manual' });
  });
  it('geometry resolves only for mulde/rigole (D-1)', () => {
    expect(resolveAsmProducer('geometry', 'mulde'))
      .toEqual({ kind: 'geometry', worksheetCode: 'A138-17', equationId: ASM_GL16_EQUATION_ID });
    expect(resolveAsmProducer('geometry', 'rigole'))
      .toEqual({ kind: 'geometry', worksheetCode: 'A138-18', equationId: ASM_GL17_EQUATION_ID });
  });
  it('geometry is unresolved for flaeche/schacht/becken and null', () => {
    for (const t of ['flaeche', 'schacht', 'becken', null] as const) {
      expect(resolveAsmProducer('geometry', t).kind).toBe('unresolved');
    }
  });
});

describe('computeDirect (Gl.7)', () => {
  it('averages min/max; PLT-HS-01 baseline 45/45 ⇒ 45', () => {
    expect(computeDirect(45, 45)).toBe(45);
    expect(computeDirect(30, 50)).toBe(40);
  });
  it('null on missing/non-finite input', () => {
    expect(computeDirect(null, 50)).toBeNull();
    expect(computeDirect(30, Number.NaN)).toBeNull();
  });
});

describe('computeSoilEstimate (Tab.13 — Bodenart-keyed, A-1)', () => {
  it('0,10·A_C Mittel-/Feinsand, 0,20·A_C schluffig', () => {
    expect(computeSoilEstimate(1000, 'mittel_feinsand')).toBeCloseTo(100, 9);
    expect(computeSoilEstimate(1000, 'schluffig')).toBeCloseTo(200, 9);
  });
  it('null when A_C or Bodenart missing', () => {
    expect(computeSoilEstimate(null, 'mittel_feinsand')).toBeNull();
    expect(computeSoilEstimate(1000, null)).toBeNull();
  });
});

describe('constants', () => {
  it('facility→worksheet map', () => {
    expect(FACILITY_TYPE_TO_WORKSHEET.mulde).toBe('A138-17');
    expect(FACILITY_TYPE_TO_WORKSHEET.becken).toBe('A138-22');
  });
});

describe('asmEngineSuppressedSymbols — Gl.7 write-back ownership', () => {
  /**
   * OWNERSHIP: Gl.7 (formula engine) is the authoritative producer of A_S,m
   * ONLY when method='direct'. For every other method the server (materializeAsm)
   * is the producer; the client engine write-back must be suppressed to prevent
   * clobber (manual) or infinite save loops (soil_estimate/geometry).
   */
  it("direct → A_S_m NOT suppressed (Gl.7 is the owner)", () => {
    const set = asmEngineSuppressedSymbols('direct');
    expect(set.has('A_S_m')).toBe(false);
  });

  it("null (unset / default) → A_S_m NOT suppressed (defaults to direct behaviour)", () => {
    const set = asmEngineSuppressedSymbols(null);
    expect(set.has('A_S_m')).toBe(false);
  });

  it("manual → A_S_m suppressed (engineer enters value; Gl.7 must not clobber)", () => {
    const set = asmEngineSuppressedSymbols('manual');
    expect(set.has('A_S_m')).toBe(true);
  });

  it("geometry → A_S_m suppressed (A138-17/18 geometry eqs produce value; Gl.7 must not fight)", () => {
    const set = asmEngineSuppressedSymbols('geometry');
    expect(set.has('A_S_m')).toBe(true);
  });

  it("soil_estimate → A_S_m suppressed (materializeAsm derives from Tab.13/A_C; Gl.7 fighting causes infinite save loop)", () => {
    const set = asmEngineSuppressedSymbols('soil_estimate');
    expect(set.has('A_S_m')).toBe(true);
  });

  it("direct and null return the same stable empty-set reference (no useMemo churn on non-A138-12 worksheets)", () => {
    // Both non-suppressed cases must return the same object so that useMemo
    // deps using reference equality don't create spurious re-renders.
    const a = asmEngineSuppressedSymbols(null);
    const b = asmEngineSuppressedSymbols(null);
    expect(a).toBe(b);
    const c = asmEngineSuppressedSymbols('direct');
    // direct also returns the stable empty set (not suppressed path)
    expect(c).toBe(a);
  });
});

describe('V-2 geometry ≥ A_S_max cross-check (§6.3.2)', () => {
  it('flags when geometry < A_S_max', () => {
    expect(validateGeometryAgainstMax(40, 45).flag).toBe(true);
  });
  it('provides a reason string when flagged', () => {
    const result = validateGeometryAgainstMax(40, 45);
    expect(result.flag).toBe(true);
    expect(typeof result.reason).toBe('string');
    expect(result.reason).not.toBeNull();
  });
  it('no flag when geometry ≥ A_S_max', () => {
    expect(validateGeometryAgainstMax(50, 45).flag).toBe(false);
    expect(validateGeometryAgainstMax(45, 45).flag).toBe(false);
  });
  it('no flag when A_S_max is absent (null)', () => {
    expect(validateGeometryAgainstMax(40, null).flag).toBe(false);
  });
  it('no flag when geometryValue is absent (null)', () => {
    expect(validateGeometryAgainstMax(null, 45).flag).toBe(false);
  });
  it('no flag when both are null', () => {
    expect(validateGeometryAgainstMax(null, null).flag).toBe(false);
  });
  it('reason is null when not flagged', () => {
    expect(validateGeometryAgainstMax(50, 45).reason).toBeNull();
    expect(validateGeometryAgainstMax(null, 45).reason).toBeNull();
  });
});
