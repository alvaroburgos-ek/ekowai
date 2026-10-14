import { describe, it, expect } from 'vitest';
import { buildFixtureBaseline, FIXTURE_SHEETS, fid, EQ } from '../__fixtures__/hellenthal-a138';
import { sortSheets } from '../baseline';

describe('C4-shaped fixture', () => {
  it('builds a baseline with the A 138 chain in phase order and entered values only', () => {
    const b = buildFixtureBaseline();
    expect(b.standardCode).toBe('DWA-A-138-1');
    expect(sortSheets(b.sheets).map((s) => s.code)).toEqual(
      ['A138-03', 'A138-04', 'A138-05', 'A138-07', 'A138-08', 'A138-10', 'A138-11', 'A138-12', 'A138-13', 'A138-15', 'A138-17', 'A138-26'],
    );
    expect(b.stored[fid('A138-05', 'k_f')]).toMatchObject({ valueNumber: 1e-6, sourceType: 'entered' });
    expect(b.stored[fid('A138-11', 'k_i')]).toBeUndefined();
    expect(FIXTURE_SHEETS.find((s) => s.code === 'A138-13')?.equations.map((e) => e.id)).toContain(EQ.GL8);
  });
  it('stores derived seeds with sourceType derived', () => {
    const b = buildFixtureBaseline({ storedDerived: { 'A138-11:k_i': { type: 'number', value: 4e-8 } } });
    expect(b.stored[fid('A138-11', 'k_i')]).toMatchObject({ valueNumber: 4e-8, sourceType: 'derived' });
  });
});
