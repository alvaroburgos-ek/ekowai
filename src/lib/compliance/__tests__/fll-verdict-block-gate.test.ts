import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluate';

/**
 * D-3 (FLL M2): proves the two BLOCK verdict gates applied to prod
 * (RHZ-18 pruefergebnis_rhizomfest, RHZ-21 final_rhizom_conformity) behave as
 * intended under the REAL evaluator BEFORE/independent of the SQL apply.
 * Condition authored: `<verdict> == 'rhizomfest'`.
 */
describe('FLL rhizome verdict block gate — == \'rhizomfest\' semantics', () => {
  const cond = "pruefergebnis_rhizomfest == 'rhizomfest'";
  const lk = (v: string | undefined) => (sym: string) =>
    sym === 'pruefergebnis_rhizomfest' ? v : undefined;

  it('rhizomfest -> pass (does not block)', () => {
    expect(evaluateCondition(cond, lk('rhizomfest'))).toEqual({ kind: 'pass' });
  });
  it('nicht_rhizomfest -> fail (blocks)', () => {
    expect(evaluateCondition(cond, lk('nicht_rhizomfest'))).toEqual({ kind: 'fail' });
  });
  it('vorzeitig_abgebrochen -> fail (blocks, per §9 no Pruefbericht)', () => {
    expect(evaluateCondition(cond, lk('vorzeitig_abgebrochen'))).toEqual({ kind: 'fail' });
  });
  it('unset -> pending (never a false fail)', () => {
    const r = evaluateCondition(cond, lk(undefined));
    expect(r.kind).toBe('pending');
  });

  it('final_rhizom_conformity mirror gate has identical semantics', () => {
    const c2 = "final_rhizom_conformity == 'rhizomfest'";
    const l2 = (v: string | undefined) => (s: string) =>
      s === 'final_rhizom_conformity' ? v : undefined;
    expect(evaluateCondition(c2, l2('rhizomfest'))).toEqual({ kind: 'pass' });
    expect(evaluateCondition(c2, l2('nicht_rhizomfest'))).toEqual({ kind: 'fail' });
    expect(evaluateCondition(c2, l2('vorzeitig_abgebrochen'))).toEqual({ kind: 'fail' });
  });
});
