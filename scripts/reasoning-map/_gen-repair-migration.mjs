import { readFileSync, writeFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync('scripts/reasoning-map/_repair-apply.json', 'utf8'));
const q = (s) => String(s).replace(/'/g, "''");
const lines = [];
lines.push('-- READY-TO-USE equation repair (PDF-verified by read-only agents, wks6vs8a2). 55 fixes across');
lines.push('-- the not-ready standards. Each was reproduction-proven broken->computes/manual and printed-quote');
lines.push('-- matched to its PDF. Classes: chained-equality->single RHS, syntax-clean engine-gap->manual,');
lines.push('-- piecewise->min/max (exact at breakpoints), compound-LHS/identity solved-for-output. NOTE:');
lines.push('-- DWA-A-262E 13/14 (two branches, identical encoded RHS) syntax-extracted only — the branch');
lines.push('-- duplication is a pre-existing PDF-re-check ruling, value unchanged. Rollback: rollback-<ts>-repair.sql');
lines.push('DO $$');
lines.push('DECLARE v int := 0;');
lines.push('BEGIN');
for (const r of rows) {
  const sets = [`formula='${q(r.formula)}'`];
  if (Array.isArray(r.inputs)) sets.push(`input_symbols='{${r.inputs.map(q).join(',')}}'`);
  if (r.unit) sets.push(`output_unit='${q(r.unit)}'`);
  const ids = r.ids.map((i) => `'${i}'`).join(',');
  lines.push(`  UPDATE equations SET ${sets.join(', ')} WHERE id IN (${ids});  -- ${r.code} ${r.eq} [${r.disp}]`);
}
lines.push("  RAISE NOTICE 'repair applied';");
lines.push('END $$;');
const ts = '20260801170000';
writeFileSync(`scripts/migrations/${ts}_ready_eq_repair.sql`, lines.join('\n') + '\n');
console.log(`wrote scripts/migrations/${ts}_ready_eq_repair.sql with ${rows.length} updates`);
