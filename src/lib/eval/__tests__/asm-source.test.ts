import { describe, it, expect } from 'vitest';
import {
  resolveAsmProducer, computeDirect, computeSoilEstimate,
  ASM_GL16_EQUATION_ID, ASM_GL17_EQUATION_ID, FACILITY_TYPE_TO_WORKSHEET,
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
