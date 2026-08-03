import { describe, it, expect } from 'vitest';
import { resolve } from '../resolver-engine.mjs';

const base = { target_id: 'g1', provenance_grade: 'VA', edition: 'weissdruck', source_quote: 'Q' };

describe('resolve() engine', () => {
  it('stages a met, VA, non-draft rule', () => {
    const d = resolve({ ...base, modal_verb: 'sollte' }, { id: 'g1', severity: 'block' });
    expect(d.action).toBe('stage');
    expect(d.rule_id).toBe('R-MODAL-SEVERITY');
    expect(d.change).toEqual({ column: 'severity', before: 'block', after: 'warn' });
    expect(d.evidence_quote).toBe('Q');
  });
  it('escalates when no rule matches', () => {
    const d = resolve({ ...base, modal_verb: 'muss' }, { id: 'g1', severity: 'block' });
    expect(d).toMatchObject({ action: 'escalate', reason: 'no-rule' });
  });
  it('escalates a draft edition even when a rule matches', () => {
    const d = resolve({ ...base, edition: 'gelbdruck', modal_verb: 'sollte' }, { id: 'g1', severity: 'block' });
    expect(d).toMatchObject({ action: 'escalate', reason: 'draft-edition' });
  });
  it('escalates an enforcement-changing rule on VC evidence', () => {
    const d = resolve({ ...base, provenance_grade: 'VC', modal_verb: 'sollte' }, { id: 'g1', severity: 'block' });
    expect(d).toMatchObject({ action: 'escalate', reason: 'vc-evidence' });
  });
  it('allows a zero-risk rule on VC evidence', () => {
    const d = resolve({ ...base, provenance_grade: 'VC', located_clause: '§5.1', clause_ref: '§4.2' },
                      { id: 'g1', clause_reference: '§4.2' });
    expect(d).toMatchObject({ action: 'stage', rule_id: 'R-CLAUSEREF' });
  });
  it('honours rule.escalateIf (mixed modal)', () => {
    const d = resolve({ ...base, modal_verb: 'mixed' }, { id: 'g1', severity: 'block' });
    expect(d).toMatchObject({ action: 'escalate', reason: 'rule-escalate' });
  });
  it('escalates when more than one rule matches (multi-match)', () => {
    const d = resolve({ ...base, modal_verb: 'sollte', located_clause: '§5.1', clause_ref: '§4.2' },
                      { id: 'g1', severity: 'block', clause_reference: '§4.2' });
    expect(d).toMatchObject({ action: 'escalate', reason: 'multi-match' });
  });
  it('escalates resolve-error instead of throwing on a malformed record', () => {
    const d = resolve({ ...base, enum_domain_coverage: 'partial', all_members_verbatim: true },
                      { id: 'g1', condition: 'x IN {a}' }); // source_enum_members missing -> resolve would throw
    expect(d).toMatchObject({ action: 'escalate', reason: 'resolve-error' });
  });
});
