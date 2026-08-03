import { describe, it, expect } from 'vitest';
import { RULES } from '../resolver-catalog.mjs';

const rule = (id) => RULES.find(r => r.id === id);

describe('R-CLAUSEREF', () => {
  it('detects a clause-reference mismatch and resolves to the located clause', () => {
    const r = rule('R-CLAUSEREF');
    const ev = { located_clause: '§5.1', clause_ref: '§4.2' };
    const target = { id: 'g1', clause_reference: '§4.2' };
    expect(r.detector(ev, target)).toBe(true);
    expect(r.resolve(ev, target)).toEqual({ column: 'clause_reference', before: '§4.2', after: '§5.1' });
  });
  it('does not fire when located clause equals clause_reference', () => {
    const r = rule('R-CLAUSEREF');
    expect(r.detector({ located_clause: '§4.2', clause_ref: '§4.2' }, {})).toBe(false);
  });
});
