import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluate';

// Reproduction for FLL-Naturteich REQ-07 nested-guard fix (migration 20260801490000).
// Broken-before: type_III regeneration-area minimum is nested in the type_I/II guard → dead.
// Fixed-after: two independent guards → type_III enforces its own >30 minimum.
const lk = (vals: Record<string, string | number | boolean | null>) =>
  (sym: string) => (sym in vals ? vals[sym] : undefined);
const OLD = 'IF natural_pool_type IN {type_I, type_II} THEN regeneration_area_share > 50 AND IF natural_pool_type == type_III THEN regeneration_area_share > 30';
const NEW = '(IF natural_pool_type IN {type_I, type_II} THEN regeneration_area_share > 50) AND (IF natural_pool_type == type_III THEN regeneration_area_share > 30)';

describe('FLL-Naturteich REQ-07 regeneration-area — reproduction', () => {
  it('BROKEN-BEFORE: type_III with 20% (<30) is NOT blocked (dead branch)', () => {
    expect(evaluateCondition(OLD, lk({ natural_pool_type: 'type_III', regeneration_area_share: 20 })).kind).not.toBe('fail');
  });
  it('FIXED: type_III with 20% now BLOCKS', () => {
    expect(evaluateCondition(NEW, lk({ natural_pool_type: 'type_III', regeneration_area_share: 20 })).kind).toBe('fail');
  });
  it('FIXED: type_III with 40% passes', () => {
    expect(evaluateCondition(NEW, lk({ natural_pool_type: 'type_III', regeneration_area_share: 40 })).kind).toBe('pass');
  });
  it('FIXED: type_I still enforces its own >50 (60 pass, 40 fail)', () => {
    expect(evaluateCondition(NEW, lk({ natural_pool_type: 'type_I', regeneration_area_share: 60 })).kind).toBe('pass');
    expect(evaluateCondition(NEW, lk({ natural_pool_type: 'type_I', regeneration_area_share: 40 })).kind).toBe('fail');
  });
});
