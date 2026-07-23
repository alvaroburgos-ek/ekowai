/**
 * Defect #22 — A_S,m cross-worksheet dual-role on A138-17 (Mulde).
 *
 * ROOT CAUSE: On A138-17, Gl.16 (id 14999c2a-…) PRODUCES A_S_m, while
 * Gl.14 (bfe6e59a-…) and Gl.15 (44fd56a8-…) CONSUME it. But A_S_m's
 * single active field lives on A138-12 (its home). A138-17 has no local
 * A_S_m field — it INHERITS the value from A138-12. The client engine's
 * Gl.16 write-back shadow-writes A_S_m into the render store, colliding
 * with the inherited A138-12 value → the A138-17 A_S_m slot blanks ("—"),
 * Gl.14/15 report "Fehlt: A_S_m", geometric V_M is blocked.
 *
 * FIX: symbolHomeSuppressedSymbols(currentWorksheetCode, symbolHomes)
 * returns the set of symbols whose home worksheet differs from the current one.
 * This is unioned into engineSuppressedSymbols in worksheet-form so Gl.16's
 * client write-back is suppressed on A138-17. The server asm producer path
 * (Gl.16→A138-12 via materialize-registry / worksheet.ts) is UNTOUCHED.
 *
 * TESTS (pure-function unit):
 *   Tests for symbolHomeSuppressedSymbols (standard-agnostic helper).
 *   The integration render test lives in
 *   src/components/worksheet/__tests__/a138-17-dual-role.test.tsx.
 */

import { describe, it, expect } from 'vitest';
import { symbolHomeSuppressedSymbols } from '@/lib/eval/asm-source';

// ============================================================================
// (a) Pure-function unit tests — symbolHomeSuppressedSymbols
// ============================================================================

describe('defect #22 — symbolHomeSuppressedSymbols (pure function)', () => {
  // A_S_m single home = A138-12; A138-17 Gl.16 produces it locally + Gl.14/15 consume it.
  const homesMap = new Map<string, string>([['A_S_m', 'A138-12']]);
  const homesRecord: Record<string, string> = { A_S_m: 'A138-12' };

  it('suppresses A_S_m write-back on A138-17 (home is A138-12) — Map input', () => {
    expect(symbolHomeSuppressedSymbols('A138-17', homesMap).has('A_S_m')).toBe(true);
  });

  it('suppresses A_S_m write-back on A138-17 (home is A138-12) — Record input', () => {
    expect(symbolHomeSuppressedSymbols('A138-17', homesRecord).has('A_S_m')).toBe(true);
  });

  it('does NOT suppress on the home worksheet A138-12 — A_S_m field lives here', () => {
    expect(symbolHomeSuppressedSymbols('A138-12', homesMap).has('A_S_m')).toBe(false);
  });

  it('A138-20 (pure A_S_m consumer, no local producer) — A_S_m in suppressed set (home≠current)', () => {
    // Suppression of write-back is a no-op if no equation produces A_S_m locally,
    // but the set is correct: guards against any accidental local write.
    expect(symbolHomeSuppressedSymbols('A138-20', homesMap).has('A_S_m')).toBe(true);
  });

  it('A138-22 (pure A_S_m consumer, no local producer) — same as A138-20', () => {
    expect(symbolHomeSuppressedSymbols('A138-22', homesMap).has('A_S_m')).toBe(true);
  });

  it('empty map → returns stable empty set (same object reference, no useMemo churn)', () => {
    const a = symbolHomeSuppressedSymbols('A138-17', new Map());
    const b = symbolHomeSuppressedSymbols('A138-17', new Map());
    expect(a.size).toBe(0);
    expect(a).toBe(b); // stable-empty reference equality
  });

  it('empty record → returns stable empty set', () => {
    const a = symbolHomeSuppressedSymbols('A138-17', {});
    const b = symbolHomeSuppressedSymbols('A138-17', {});
    expect(a.size).toBe(0);
    expect(a).toBe(b);
  });

  it('multiple symbols: only non-home ones are suppressed', () => {
    const homes = new Map<string, string>([
      ['A_S_m', 'A138-12'],
      ['A_C', 'A138-07'],
      ['k_i', 'A138-17'], // home IS A138-17 → not suppressed
    ]);
    const set = symbolHomeSuppressedSymbols('A138-17', homes);
    expect(set.has('A_S_m')).toBe(true);
    expect(set.has('A_C')).toBe(true);
    expect(set.has('k_i')).toBe(false);
  });

  it('home-worksheet itself suppresses none of its own symbols', () => {
    const homes = new Map<string, string>([
      ['A_S_m', 'A138-12'],
      ['Q_S', 'A138-12'],
    ]);
    const set = symbolHomeSuppressedSymbols('A138-12', homes);
    expect(set.size).toBe(0);
  });
});
