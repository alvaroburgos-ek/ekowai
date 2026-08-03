const q = (v) => (typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

export function toMigrationSql(decisions) {
  const staged = decisions.filter(d => d.action === 'stage');
  const up = staged.map(d =>
    `-- ${d.rule_id} (risk ${d.risk})\nUPDATE compliance_requirements SET ${d.change.column} = ${q(d.change.after)} WHERE id = ${q(d.target_id)};`
  ).join('\n');
  const down = staged.map(d =>
    `UPDATE compliance_requirements SET ${d.change.column} = ${q(d.change.before)} WHERE id = ${q(d.target_id)};`
  ).join('\n');
  return { up, down };
}

export function toLedgerRows(standardCode, decisions) {
  return decisions.map(d => {
    if (d.action === 'stage') {
      const c = d.change;
      return `| ${standardCode} | ${d.target_id} | ${d.rule_id} | stage | ${c.column}: ${c.before} → ${c.after} | ${(d.evidence_quote||'').slice(0,80)} |`;
    }
    return `| ${standardCode} | ${d.target_id} | ${d.rule_id||'—'} | escalate (${d.reason}) | — | — |`;
  }).join('\n');
}
