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

describe('R-MODAL-SEVERITY', () => {
  const r = rule('R-MODAL-SEVERITY');
  it('fires on a block gate governed by a soft modal', () => {
    for (const m of ['soll','sollte','should','empfohlen','bevorzugt','present-indicative']) {
      expect(r.detector({ modal_verb: m }, { severity: 'block' })).toBe(true);
    }
    expect(r.resolve({ modal_verb: 'sollte' }, { severity: 'block' }))
      .toEqual({ column: 'severity', before: 'block', after: 'warn' });
  });
  it('does not fire on muss/shall or on a warn gate', () => {
    expect(r.detector({ modal_verb: 'muss' }, { severity: 'block' })).toBe(false);
    expect(r.detector({ modal_verb: 'sollte' }, { severity: 'warn' })).toBe(false);
  });
  it('escalates when the modal is mixed', () => {
    expect(r.escalateIf({ modal_verb: 'mixed' }, { severity: 'block' })).toBe(true);
    expect(r.escalateIf({ modal_verb: 'sollte' }, { severity: 'block' })).toBe(false);
  });
});
