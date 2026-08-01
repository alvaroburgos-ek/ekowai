import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluate';

// Reproduction for DWA-M-820-2 REQ-51 (migration 20260801480000).
// Broken-before: `!= null` compare path → a missing date is `pending`, never `fail` → never blocks.
// Fixed-after: `IS NOT NULL` exists path → a missing date returns `fail` → blocks.
const lk = (vals: Record<string, string | number | boolean | null>) =>
  (sym: string) => (sym in vals ? vals[sym] : undefined);
const OLD = 'warranty_start_date != null AND warranty_end_date != null';
const NEW = 'warranty_start_date IS NOT NULL AND warranty_end_date IS NOT NULL';

describe('DWA-M-820-2 REQ-51 warranty-dates presence — reproduction', () => {
  it('BROKEN-BEFORE: a missing end-date does NOT block (never fail)', () => {
    expect(evaluateCondition(OLD, lk({ warranty_start_date: '2024-01-01' })).kind).not.toBe('fail');
  });
  it('FIXED: a missing end-date now BLOCKS', () => {
    expect(evaluateCondition(NEW, lk({ warranty_start_date: '2024-01-01' })).kind).toBe('fail');
  });
  it('FIXED: both dates set → passes', () => {
    expect(evaluateCondition(NEW, lk({ warranty_start_date: '2024-01-01', warranty_end_date: '2029-01-01' })).kind).toBe('pass');
  });
});
