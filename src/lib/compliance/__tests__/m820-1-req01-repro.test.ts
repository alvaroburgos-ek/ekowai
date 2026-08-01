import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluate';

// Reproduction for DWA-M-820-1 REQ-01 sector-scope fix (migration 20260801470000).
// Broken-before: Wasserbau (water_engineering, an in-scope §1 enum value) is omitted
// from the IN-set → wrongly blocked. Fixed-after: it is a member → passes.
const lk = (vals: Record<string, string | number | boolean | null>) =>
  (sym: string) => (sym in vals ? vals[sym] : undefined);
const OLD = 'sector IN {wastewater,water_supply,flood_protection,waste,other}';
const NEW = 'sector IN {wastewater,water_supply,flood_protection,waste,water_engineering,other}';

describe('DWA-M-820-1 REQ-01 sector scope — reproduction', () => {
  it('BROKEN-BEFORE: Wasserbau (water_engineering) is wrongly blocked', () => {
    expect(evaluateCondition(OLD, lk({ sector: 'water_engineering' })).kind).toBe('fail');
  });
  it('FIXED: Wasserbau passes', () => {
    expect(evaluateCondition(NEW, lk({ sector: 'water_engineering' })).kind).toBe('pass');
  });
  it('FIXED: an out-of-scope sector still blocks', () => {
    expect(evaluateCondition(NEW, lk({ sector: 'not_a_sector' })).kind).toBe('fail');
  });
});
