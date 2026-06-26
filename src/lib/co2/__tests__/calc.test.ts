import { describe, it, expect } from 'vitest';
import { lineCo2eTonnes, sumByScope } from '../calc';

describe('lineCo2eTonnes', () => {
  it('amount × factor ÷ 1000', () => {
    expect(lineCo2eTonnes(10000, 0.3716)).toBeCloseTo(3.716, 6); // 10 MWh grid elec
  });
  it('0 amount → 0', () => { expect(lineCo2eTonnes(0, 0.5)).toBe(0); });
});
describe('sumByScope', () => {
  it('groups and sums by scope', () => {
    const r = sumByScope([
      { scope: 'Scope 1', tco2e: 2 }, { scope: 'Scope 1', tco2e: 3 }, { scope: 'Scope 2', tco2e: 5 },
    ]);
    expect(r['Scope 1']).toBeCloseTo(5, 9);
    expect(r['Scope 2']).toBeCloseTo(5, 9);
  });
});
