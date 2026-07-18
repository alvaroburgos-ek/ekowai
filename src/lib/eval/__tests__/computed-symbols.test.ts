/**
 * Finding E (seam) — computeComputedSymbols home-exclusion.
 *
 * A Gl.16-shaped equation on A138-17 outputs A_S_m locally, but A_S_m's HOME is
 * A138-12 (inheritedFromBySymbol['A_S_m'] = 'A138-12'). The value is inherited,
 * so A_S_m must NOT be in the computed set (it must render the inherited value,
 * not a blank local engine card). On A_S_m's home (inheritedFromBySymbol={})
 * A_S_m IS a local computed output and STAYS in the set.
 */
import { describe, it, expect } from 'vitest';
import { computeComputedSymbols } from '../computed-symbols';

const GL16 = { outputSymbol: 'A_S_m' }; // Mulde geometry, home = A138-12
const GL15 = { outputSymbol: 'V_M' }; // local output, home = here

describe('computeComputedSymbols — home-exclusion (Finding E)', () => {
  it('A138-17: A_S_m inherited from A138-12 → NOT a local computed output', () => {
    const set = computeComputedSymbols([GL16, GL15], { A_S_m: 'A138-12' });
    expect(set.has('A_S_m')).toBe(false); // ← masked-bug guard
    expect(set.has('V_M')).toBe(true); // local output unaffected
  });

  it('A138-12 (home): no inheritance for A_S_m → A_S_m STAYS computed', () => {
    const set = computeComputedSymbols([GL16], {});
    expect(set.has('A_S_m')).toBe(true);
  });

  it('respects hasField gate (harmless on standards lacking the symbol)', () => {
    const set = computeComputedSymbols([GL16], {}, { hasField: () => false });
    expect(set.has('A_S_m')).toBe(false);
  });

  it('folds extraSymbols and applies the same home-exclusion to them', () => {
    const set = computeComputedSymbols([], { r_D_n: 'A138-10' }, {
      extraSymbols: ['r_D_n', 'D_min'],
    });
    // r_D_n is inherited (home A138-10) → excluded; D_min is local → kept.
    expect(set.has('r_D_n')).toBe(false);
    expect(set.has('D_min')).toBe(true);
  });
});
