const q = (v) => (v === null || v === undefined) ? 'NULL'
  : (typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

export function toMigrationSql(decisions) {
  const staged = decisions.filter(d => d.action === 'stage');
  const up = staged.map(d =>
    `-- ${d.rule_id} (risk ${d.risk})\nUPDATE ${d.change.table ?? 'compliance_requirements'} SET ${d.change.column} = ${q(d.change.after)} WHERE id = ${q(d.target_id)};`
  ).join('\n');
  const down = staged.map(d =>
    `UPDATE ${d.change.table ?? 'compliance_requirements'} SET ${d.change.column} = ${q(d.change.before)} WHERE id = ${q(d.target_id)};`
  ).join('\n');
  return { up, down };
}

const sanitizeCell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export function toLedgerRows(standardCode, decisions) {
  return decisions.map(d => {
    if (d.action === 'stage') {
      const c = d.change;
      const change = `${sanitizeCell(c.column)}: ${sanitizeCell(c.before)} → ${sanitizeCell(c.after)}`;
      return `| ${standardCode} | ${d.target_id} | ${d.rule_id} | stage | ${change} | ${sanitizeCell((d.evidence_quote||'').slice(0,80))} |`;
    }
    return `| ${standardCode} | ${d.target_id} | ${d.rule_id||'—'} | escalate (${sanitizeCell(d.reason)}) | — | — |`;
  }).join('\n');
}
