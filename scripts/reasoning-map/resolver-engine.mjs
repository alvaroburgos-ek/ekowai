import { RULES } from './resolver-catalog.mjs';

const DRAFT = new Set(['gelbdruck', 'dis', 'fdis']);

/** Pure: evidence + target -> Decision. No I/O. */
export function resolve(ev, target, rules = RULES) {
  const rule = rules.find(r => r.detector(ev, target));
  if (!rule) return { target_id: ev.target_id, action: 'escalate', reason: 'no-rule' };
  if (rule.escalateIf && rule.escalateIf(ev, target))
    return { target_id: ev.target_id, action: 'escalate', rule_id: rule.id, reason: 'rule-escalate' };
  if (rule.risk !== 'zero') {
    if (DRAFT.has(ev.edition))
      return { target_id: ev.target_id, action: 'escalate', rule_id: rule.id, reason: 'draft-edition' };
    if (ev.provenance_grade !== 'VA')
      return { target_id: ev.target_id, action: 'escalate', rule_id: rule.id, reason: 'vc-evidence' };
  }
  return {
    target_id: ev.target_id, action: 'stage', rule_id: rule.id, risk: rule.risk,
    change: rule.resolve(ev, target), evidence_quote: ev.source_quote, reason: 'resolved',
  };
}
