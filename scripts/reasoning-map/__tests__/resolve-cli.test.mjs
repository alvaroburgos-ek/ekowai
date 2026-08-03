import { describe, it, expect } from 'vitest';
import { runResolve } from '../resolve.mjs';

describe('runResolve', () => {
  it('splits staged vs escalated and groups migrations by standard+rule', () => {
    const records = [
      { target_id: 'g1', standard_code: 'DWA-M-820-2', provenance_grade: 'VA', edition: 'weissdruck',
        source_quote: 'Q', modal_verb: 'sollte', target: { id: 'g1', severity: 'block' } },
      { target_id: 'g2', standard_code: 'DWA-M-820-2', provenance_grade: 'VA', edition: 'weissdruck',
        source_quote: 'Q', modal_verb: 'muss', target: { id: 'g2', severity: 'block' } },
    ];
    const out = runResolve(records);
    expect(out.migrations).toHaveLength(1);
    expect(out.migrations[0]).toMatchObject({ standard_code: 'DWA-M-820-2', className: 'r-modal-severity' });
    expect(out.migrations[0].up).toContain("severity = 'warn' WHERE id = 'g1'");
    expect(out.escalations).toHaveLength(1);
    expect(out.escalations[0].target_id).toBe('g2');
  });
});
