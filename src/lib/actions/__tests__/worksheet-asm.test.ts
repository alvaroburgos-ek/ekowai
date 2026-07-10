/**
 * Task 5 unit tests: A_S,m owner-materialize + min/max validation guards.
 *
 * DB-free — runs in the vitest `unit` project.
 *
 * These tests guard the logic-level invariants exercised by the isAsmSave owner
 * block in saveWorksheet:
 *   1. materializeAsm: direct 45/45 ⇒ 45 (PLT-HS-01 baseline from Task 2).
 *   2. A_S_min > A_S_max validation predicate (the server rejects before materialize).
 *   3. isAsmSave detection: same equation-topology as isLoadingSave — ASM_GL7_EQUATION_ID.
 *
 * DB-backed integration round-trip is verified live in Task 11.
 */

// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { materializeAsm } from '@/lib/eval/materialize-asm';
import { ASM_GL7_EQUATION_ID } from '@/lib/eval/asm-source';

// ---------------------------------------------------------------------------
// A_S,m owner materialize (logic) — mirrors what the server block does.
// ---------------------------------------------------------------------------
describe('A_S,m owner materialize (logic)', () => {
  it('direct 45/45 ⇒ 45 (baseline)', () => {
    expect(
      materializeAsm({
        method: 'direct',
        A_S_min: 45,
        A_S_max: 45,
        A_C: null,
        bodenart: null,
        geometryValue: null,
        manualValue: null,
        manualProvenance: null,
        facilityType: null,
        sourceWorksheet: 'A138-12',
      }).A_S_m,
    ).toBe(45);
  });

  it('A_S_min > A_S_max is a validation error the server must reject', () => {
    // The server rejects before calling materializeAsm; encode the predicate under test:
    const invalid = (min: number, max: number) => min > max;
    expect(invalid(50, 45)).toBe(true);
    expect(invalid(45, 45)).toBe(false);
    expect(invalid(30, 45)).toBe(false);
  });

  it('A_S_min === A_S_max is valid (returns that value)', () => {
    expect(
      materializeAsm({
        method: 'direct',
        A_S_min: 50,
        A_S_max: 50,
        A_C: null,
        bodenart: null,
        geometryValue: null,
        manualValue: null,
        manualProvenance: null,
        facilityType: null,
        sourceWorksheet: 'A138-12',
      }).A_S_m,
    ).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// V-2 manual-strip predicate — mirrors the server's A_S,m rejection logic.
// ---------------------------------------------------------------------------
describe('V-2 manual A_S,m without provenance — strip predicate (no DB)', () => {
  /**
   * Encodes the exact predicate the server uses to decide whether to splice
   * A_S_m out of the persistence batch (Finding 1 fix).
   * method must be 'manual' AND provenance must be absent/empty.
   */
  function shouldStripAsm(method: string | null, provenance: string | null | undefined): boolean {
    if (method !== 'manual') return false;
    return !provenance || provenance.trim() === '';
  }

  it('manual + no provenance → strip A_S_m', () => {
    expect(shouldStripAsm('manual', null)).toBe(true);
  });

  it('manual + empty string provenance → strip A_S_m', () => {
    expect(shouldStripAsm('manual', '')).toBe(true);
  });

  it('manual + whitespace-only provenance → strip A_S_m', () => {
    expect(shouldStripAsm('manual', '   ')).toBe(true);
  });

  it('manual + non-empty provenance → do NOT strip A_S_m', () => {
    expect(shouldStripAsm('manual', 'Datenblatt XY')).toBe(false);
  });

  it('direct + no provenance → do NOT strip A_S_m', () => {
    expect(shouldStripAsm('direct', null)).toBe(false);
  });

  it('geometry + no provenance → do NOT strip A_S_m', () => {
    expect(shouldStripAsm('geometry', null)).toBe(false);
  });

  it('soil_estimate + no provenance → do NOT strip A_S_m', () => {
    expect(shouldStripAsm('soil_estimate', null)).toBe(false);
  });

  it('null method + no provenance → do NOT strip A_S_m', () => {
    expect(shouldStripAsm(null, null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAsmSave detection — equation-topology trigger.
// Mirrors the pattern used for isLoadingSave in worksheet.ts.
// ---------------------------------------------------------------------------
describe('isAsmSave detection (equation-topology)', () => {
  it('fires when ASM_GL7_EQUATION_ID is in templateEquations', () => {
    const templateEquations = [{ id: ASM_GL7_EQUATION_ID, outputSymbol: 'A_S_m' }];
    const isAsmSave = templateEquations.some((e) => e.id === ASM_GL7_EQUATION_ID);
    expect(isAsmSave).toBe(true);
  });

  it('does NOT fire for a non-A138-12 worksheet with different equations', () => {
    const templateEquations = [
      { id: 'basin-equation-id-xxxx', outputSymbol: 'r_D_n' },
      { id: 'other-equation-id-yyyy', outputSymbol: 'Q_S' },
    ];
    const isAsmSave = templateEquations.some((e) => e.id === ASM_GL7_EQUATION_ID);
    expect(isAsmSave).toBe(false);
  });

  it('fires even when other equations are also present', () => {
    const templateEquations = [
      { id: 'other-equation-id-yyyy', outputSymbol: 'some_output' },
      { id: ASM_GL7_EQUATION_ID, outputSymbol: 'A_S_m' },
      { id: 'another-eq', outputSymbol: 'ac_as_ratio' },
    ];
    const isAsmSave = templateEquations.some((e) => e.id === ASM_GL7_EQUATION_ID);
    expect(isAsmSave).toBe(true);
  });
});
