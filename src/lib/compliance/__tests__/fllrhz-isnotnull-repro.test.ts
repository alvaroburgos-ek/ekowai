import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluate';

// Reproduction for FLL-TP-RHIZOM REQ-03/04 (migration 20260801500000).
// Broken-before: `!= null` compare path → missing value = pending, never fail → never blocks.
// Fixed-after: `IS NOT NULL` exists path → missing value = fail → blocks.
const lk = (vals: Record<string, string | number | boolean | null>) =>
  (sym: string) => (sym in vals ? vals[sym] : undefined);

describe('FLL-TP-RHIZOM REQ-03/04 presence — reproduction', () => {
  const O3 = 'wachstumshemmende_wirkstoffe != null';
  const N3 = 'wachstumshemmende_wirkstoffe IS NOT NULL';
  it('REQ-03 BROKEN-BEFORE: missing value does NOT block', () => {
    expect(evaluateCondition(O3, lk({})).kind).not.toBe('fail');
  });
  it('REQ-03 FIXED: missing value BLOCKS; present passes', () => {
    expect(evaluateCondition(N3, lk({})).kind).toBe('fail');
    expect(evaluateCondition(N3, lk({ wachstumshemmende_wirkstoffe: 'keine' })).kind).toBe('pass');
  });

  const O4 = 'mehrschichtprodukt == false OR (schutzschicht_definition != null)';
  const N4 = 'mehrschichtprodukt == false OR (schutzschicht_definition IS NOT NULL)';
  it('REQ-04 BROKEN-BEFORE: multilayer w/o schutzschicht does NOT block', () => {
    expect(evaluateCondition(O4, lk({ mehrschichtprodukt: true })).kind).not.toBe('fail');
  });
  it('REQ-04 FIXED: multilayer w/o schutzschicht BLOCKS; with it passes; non-multilayer passes', () => {
    expect(evaluateCondition(N4, lk({ mehrschichtprodukt: true })).kind).toBe('fail');
    expect(evaluateCondition(N4, lk({ mehrschichtprodukt: true, schutzschicht_definition: 'x' })).kind).toBe('pass');
    expect(evaluateCondition(N4, lk({ mehrschichtprodukt: false })).kind).toBe('pass');
  });
});
