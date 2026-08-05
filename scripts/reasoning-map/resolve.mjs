import { resolve } from './resolver-engine.mjs';
import { toMigrationSql, toLedgerRows } from './resolver-emit.mjs';
import { pathToFileURL } from 'node:url';

export function runResolve(records) {
  const decisions = records.map(rec => ({ rec, d: resolve(rec, rec.target) }));
  const staged = decisions.filter(x => x.d.action === 'stage');
  const escalations = decisions.filter(x => x.d.action === 'escalate').map(x => ({ ...x.d, standard_code: x.rec.standard_code }));

  // group staged by standard_code + rule_id
  const groups = new Map();
  for (const { rec, d } of staged) {
    const key = `${rec.standard_code}::${d.rule_id}`;
    if (!groups.has(key)) groups.set(key, { standard_code: rec.standard_code, className: d.rule_id.toLowerCase(), ds: [] });
    groups.get(key).ds.push(d);
  }
  const migrations = [...groups.values()].map(g => {
    const { up, down } = toMigrationSql(g.ds);
    return { standard_code: g.standard_code, className: g.className, up, down };
  });

  const ledger = decisions.map(x => toLedgerRows(x.rec.standard_code, [x.d])).join('\n');
  return { migrations, ledger, escalations };
}

// fs wrapper — only when run directly, keeps runResolve pure/testable
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const records = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = runResolve(records);
  const stamp = process.argv[3] || 'run'; // caller passes a fixed stamp (no Date.now — WSL/reproducibility)
  for (const m of out.migrations) {
    const base = `scripts/migrations/${stamp}_resolve_${m.standard_code.replace(/[^A-Za-z0-9]/g,'')}_${m.className}`;
    fs.writeFileSync(`${base}.sql`, `-- WRITTEN-NOT-APPLIED — owner one-click apply\n${m.up}\n`);
    fs.writeFileSync(`scripts/rollback-${path.basename(base)}.sql`, `${m.down}\n`);
  }
  fs.appendFileSync('.superpowers/sdd/RESOLVER-DECISIONS.md', out.ledger + '\n');
  console.log(`migrations=${out.migrations.length} escalations=${out.escalations.length}`);
}
