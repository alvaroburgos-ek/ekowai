import { describe, it, expect } from 'vitest';
import { scopeFieldsToStandard } from '../symbol-scoping';

/**
 * §10c reproduction — cross-guideline symbol collision (E1-C).
 *
 * Two standards define `A_C` (rider-1 found the real symbol overlaps). The save
 * path resolves A_C by symbol; without standard-scoping it is first-wins across
 * ALL standards → it can grab the FOREIGN guideline's field. This test proves
 * the scoped resolver returns the CURRENT standard's field, and — same
 * reproduction style as E1-B's #21 — that the PRE-FIX first-wins path resolves
 * to the wrong standard (so reverting `scopeFieldsToStandard` to identity fails).
 */
describe('§10c scopeFieldsToStandard — cross-guideline symbol collision', () => {
  // A by-symbol A_C query in a multi-standard project returns both standards' fields.
  const CURRENT = 'DWA-A-138-1';
  const candidates = [
    { symbol: 'A_C', standardId: 'FLL-GAR-2023', fieldId: 'fll-ac', value: 999 },  // foreign
    { symbol: 'A_C', standardId: 'DWA-A-138-1', fieldId: '138-ac', value: 4836 },   // current
  ];

  it('scoped resolver returns ONLY the current standard field', () => {
    const scoped = scopeFieldsToStandard(candidates, CURRENT);
    expect(scoped).toHaveLength(1);
    expect(scoped[0].fieldId).toBe('138-ac');
    expect(scoped[0].value).toBe(4836);
  });

  it('PRE-FIX first-wins (unscoped) resolves to the FOREIGN standard — the collision the fix prevents', () => {
    // The unscoped query hands the reducer both fields in arbitrary order; a
    // first-non-null-wins reduction takes candidates[0] = FLL's A_C (WRONG).
    const firstWins = candidates.find((f) => f.value != null);
    expect(firstWins?.standardId).toBe('FLL-GAR-2023'); // wrong standard leaks in
    // After scoping, first-wins over the scoped set is safe:
    const firstWinsScoped = scopeFieldsToStandard(candidates, CURRENT).find((f) => f.value != null);
    expect(firstWinsScoped?.standardId).toBe(CURRENT);
  });

  it('empty when the current standard has no field for the symbol (no cross-standard fallback)', () => {
    const scoped = scopeFieldsToStandard(candidates, 'DIN-1989-1');
    expect(scoped).toHaveLength(0); // never falls back to a foreign standard's field
  });
});
