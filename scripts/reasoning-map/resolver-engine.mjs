import { RULES } from './resolver-catalog.mjs';

const DRAFT = new Set(['gelbdruck', 'dis', 'fdis']);

/** Pure: evidence + target -> Decision. No I/O. */
export function resolve(ev, target, rules = RULES) {
  const matched = rules.filter(r => r.detector(ev, target));
  if (matched.length === 0) return { target_id: ev.target_id, action: 'escalate', reason: 'no-rule' };
  if (matched.length > 1) return { target_id: ev.target_id, action: 'escalate', reason: 'multi-match', rule_id: matched.map(r => r.id).join('+') };
  const rule = matched[0];
  if (rule.escalateIf && rule.escalateIf(ev, target))
    return { target_id: ev.target_id, action: 'escalate', rule_id: rule.id, reason: 'rule-escalate' };
  if (rule.risk !== 'zero') {
    if (DRAFT.has(ev.edition))
      return { target_id: ev.target_id, action: 'escalate', rule_id: rule.id, reason: 'draft-edition' };
    if (ev.provenance_grade !== 'VA')
      return { target_id: ev.target_id, action: 'escalate', rule_id: rule.id, reason: 'vc-evidence' };
  }
  let change;
  try { change = rule.resolve(ev, target); }
  catch { return { target_id: ev.target_id, action: 'escalate', rule_id: rule.id, reason: 'resolve-error' }; }
  return {
    target_id: ev.target_id, action: 'stage', rule_id: rule.id, risk: rule.risk,
    change, evidence_quote: ev.source_quote, reason: 'resolved',
  };
}
