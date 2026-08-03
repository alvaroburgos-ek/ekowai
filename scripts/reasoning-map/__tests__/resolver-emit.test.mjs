import { describe, it, expect } from 'vitest';
import { toMigrationSql, toLedgerRows } from '../resolver-emit.mjs';

const staged = { target_id: 'g1', action: 'stage', rule_id: 'R-MODAL-SEVERITY', risk: 'med',
  change: { column: 'severity', before: 'block', after: 'warn' }, evidence_quote: 'Q1' };
const escalated = { target_id: 'g2', action: 'escalate', rule_id: 'R-MODAL-SEVERITY', reason: 'rule-escalate' };
const stagedEquation = { target_id: 'eq1', action: 'stage', rule_id: 'R-EQ-GL13', risk: 'low',
  change: { column: 'formula', before: 'w_P = V_dot/(A*E_E)', after: 'w_P = V_dot/(A*e_E)', table: 'equations' },
  evidence_quote: 'Q2' };

describe('emitters', () => {
  it('generates idempotent UPDATE + inverse rollback, quoting text values', () => {
    const { up, down } = toMigrationSql([staged]);
    expect(up).toContain("UPDATE compliance_requirements SET severity = 'warn' WHERE id = 'g1';");
    expect(down).toContain("UPDATE compliance_requirements SET severity = 'block' WHERE id = 'g1';");
    expect(up).toContain('-- R-MODAL-SEVERITY');
  });
  it('is table-aware: an equation-kind change targets the equations table, gate rules stay on compliance_requirements', () => {
    const { up, down } = toMigrationSql([staged, stagedEquation]);
    expect(up).toContain("UPDATE equations SET formula = 'w_P = V_dot/(A*e_E)' WHERE id = 'eq1';");
    expect(down).toContain("UPDATE equations SET formula = 'w_P = V_dot/(A*E_E)' WHERE id = 'eq1';");
    expect(up).toContain("UPDATE compliance_requirements SET severity = 'warn' WHERE id = 'g1';");
  });
  it('emits no SQL for escalations', () => {
    expect(toMigrationSql([escalated]).up.trim()).toBe('');
  });
  it('ledger rows carry rule, action, before->after, quote', () => {
    const md = toLedgerRows('DWA-M-820-2', [staged, escalated]);
    expect(md).toContain('| DWA-M-820-2 | g1 | R-MODAL-SEVERITY | stage | severity: block → warn |');
    expect(md).toContain('| DWA-M-820-2 | g2 | R-MODAL-SEVERITY | escalate (rule-escalate) |');
  });
  it('emits bare SQL NULL for a null before/after (no literal quotes)', () => {
    const d = { target_id: 'x1', action: 'stage', rule_id: 'R-CLAUSEREF', risk: 'zero',
      change: { column: 'clause_reference', before: null, after: '§5.1' } };
    const { up, down } = toMigrationSql([d]);
    expect(up).toContain("SET clause_reference = '§5.1' WHERE id = 'x1';");
    expect(down).toContain('SET clause_reference = NULL WHERE id = \'x1\';');
  });
  it('escapes a pipe in free text so it does not produce an extra ledger cell', () => {
    const withPipe = { target_id: 'g3', action: 'stage', rule_id: 'R-MODAL-SEVERITY', risk: 'med',
      change: { column: 'severity', before: 'block', after: 'warn' }, evidence_quote: 'a | b' };
    const md = toLedgerRows('DWA-M-820-2', [withPipe]);
    const row = md.split('\n').find(l => l.includes('g3'));
    // split on the markdown cell delimiter " | " (space-pipe-space); an escaped "\|" inside
    // the quote has no space before the pipe, so it must NOT match this delimiter and must
    // NOT add an extra cell beyond the 6 real columns.
    expect(row.split(' | ')).toHaveLength(6);
  });
});
