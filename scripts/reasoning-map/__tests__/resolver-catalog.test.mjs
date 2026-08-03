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

describe('threshold rules', () => {
  it('R-THRESH-EXAMPLE: illustrative value (z.B./ca.) on a block gate -> warn', () => {
    const r = rule('R-THRESH-EXAMPLE');
    expect(r.detector({ threshold_in_source: 'example' }, { severity: 'block' })).toBe(true);
    expect(r.detector({ threshold_in_source: 'approximate' }, { severity: 'block' })).toBe(true);
    expect(r.detector({ threshold_in_source: 'true' }, { severity: 'block' })).toBe(false);
    expect(r.resolve({ threshold_in_source: 'example' }, { severity: 'block' }))
      .toEqual({ column: 'severity', before: 'block', after: 'warn' });
  });
  it('R-THRESH-UNSUPPORTED: value absent from source -> warn, condition untouched', () => {
    const r = rule('R-THRESH-UNSUPPORTED');
    expect(r.risk).toBe('high');
    expect(r.detector({ threshold_in_source: 'false' }, { severity: 'block' })).toBe(true);
    const change = r.resolve({ threshold_in_source: 'false' }, { severity: 'block', condition: 'x >= 50000' });
    expect(change).toEqual({ column: 'severity', before: 'block', after: 'warn' });
    expect(change.column).not.toBe('condition'); // never rewrites/deletes the number
  });
});

describe('enum rules', () => {
  it('R-ENUM-FULLDOMAIN: IN over whole domain -> IS NOT NULL', () => {
    const r = rule('R-ENUM-FULLDOMAIN');
    const t = { condition: "x IN {a,b,c}" };
    expect(r.detector({ enum_domain_coverage: 'full' }, t)).toBe(true);
    expect(r.detector({ enum_domain_coverage: 'partial' }, t)).toBe(false);
    expect(r.resolve({ enum_domain_coverage: 'full' }, t))
      .toEqual({ column: 'condition', before: "x IN {a,b,c}", after: 'x IS NOT NULL' });
  });
  it('R-ENUM-UNDERINCLUSIVE: fires on partial coverage, escalates on unverifiable member', () => {
    const r = rule('R-ENUM-UNDERINCLUSIVE');
    expect(r.detector({ enum_domain_coverage: 'partial' }, { condition: 'x IN {a,b}' })).toBe(true);
    expect(r.escalateIf({ source_enum_members: ['a','b'], all_members_verbatim: true }, {})).toBe(false);
    expect(r.escalateIf({ source_enum_members: ['a','b'], all_members_verbatim: false }, {})).toBe(true);
  });
  it('R-ENUM-FULLDOMAIN: extracts the symbol from a compound condition', () => {
    const r = rule('R-ENUM-FULLDOMAIN');
    const t = { condition: "y = 1 AND status IN {a,b}" };
    expect(r.detector({ enum_domain_coverage: 'full' }, t)).toBe(true);
    expect(r.resolve({ enum_domain_coverage: 'full' }, t))
      .toEqual({ column: 'condition', before: "y = 1 AND status IN {a,b}", after: 'status IS NOT NULL' });
  });
  it('R-ENUM-UNDERINCLUSIVE: resolve adds the missing source-printed members', () => {
    const r = rule('R-ENUM-UNDERINCLUSIVE');
    const ev = { enum_domain_coverage: 'partial', source_enum_members: ['a','b','c'], all_members_verbatim: true };
    const t = { condition: 'x IN {a,b}' };
    expect(r.resolve(ev, t)).toEqual({ column: 'condition', before: 'x IN {a,b}', after: 'x IN {a,b,c}' });
  });
  it('R-ENUM-UNDERINCLUSIVE: does not fire (or crash) when the condition has no IN-clause', () => {
    const r = rule('R-ENUM-UNDERINCLUSIVE');
    expect(r.detector({ enum_domain_coverage: 'partial' }, { condition: 'x >= 5' })).toBe(false);
    expect(r.detector({ enum_domain_coverage: 'partial' }, {})).toBe(false);
  });
});
