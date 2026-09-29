#!/usr/bin/env node
// READ-ONLY dump of every stored value of one project, grouped by standard and worksheet, as JSON.
// Usage: node scripts/verification/dump-project-values.mjs <project_id> <out_dir>
// Auth: DATABASE_URL_PROD from .env.local (never printed). Runs in a READ ONLY transaction.
// Purpose: dated baseline before a data wave (APPLY-ORDER step 0) — one file per standard,
//          plus worksheet statuses and approval events, so a later diff is re-executable.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envText = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
const m = envText.match(/^DATABASE_URL_PROD=(.+)$/m);
if (!m) {
  console.error('DATABASE_URL_PROD not found in .env.local');
  process.exit(1);
}
const url = m[1].trim().replace(/^"|"$/g, '');
const [projectId, outDir] = process.argv.slice(2);
if (!projectId || !outDir) {
  console.error('usage: dump-project-values.mjs <project_id> <out_dir>');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const sql = postgres(url, { max: 1, prepare: false, connection: { default_transaction_read_only: 'on' } });
const stamp = new Date().toISOString();
try {
  const rows = await sql.begin('read only', async (tx) => {
    const values = await tx`
      select s.code as standard, w.code as worksheet, f.symbol, f.widget, f.data_type,
             pp.value_number, pp.value_text, pp.value_enum, pp.value_boolean, pp.value_date, pp.value_json,
             pp.source_type, pp.client_supplied, pp.entered_at
      from project_parameters pp
      join fields f on f.id = pp.field_id
      join worksheet_templates w on w.id = f.worksheet_template_id
      join standards s on s.id = w.standard_id
      where pp.project_id = ${projectId}
      order by s.code, w.code, f.symbol`;
    const instances = await tx`
      select s.code as standard, w.code as worksheet, wi.id as instance_id, wi.status, wi.updated_at
      from worksheet_instances wi
      join worksheet_templates w on w.id = wi.worksheet_template_id
      join standards s on s.id = w.standard_id
      where wi.project_id = ${projectId}
      order by s.code, w.code`;
    const events = await tx`
      select s.code as standard, w.code as worksheet, ae.event_type, ae.from_status, ae.to_status,
             ae.actor_role, ae.comment, ae.occurred_at
      from approval_events ae
      join worksheet_instances wi on wi.id = ae.worksheet_instance_id
      join worksheet_templates w on w.id = wi.worksheet_template_id
      join standards s on s.id = w.standard_id
      where wi.project_id = ${projectId}
      order by ae.occurred_at`;
    return { values, instances, events };
  });
  const byStd = new Map();
  for (const v of rows.values) {
    if (!byStd.has(v.standard)) byStd.set(v.standard, {});
    const ws = byStd.get(v.standard);
    (ws[v.worksheet] ??= {})[v.symbol] = {
      widget: v.widget, data_type: v.data_type,
      value: v.value_number ?? v.value_text ?? v.value_enum ?? v.value_boolean ?? v.value_date ?? v.value_json ?? null,
      source_type: v.source_type, client_supplied: v.client_supplied, entered_at: v.entered_at,
    };
  }
  const summary = [];
  for (const [std, worksheets] of byStd) {
    const file = path.join(outDir, `${stamp.slice(0, 10)}_${std}.json`);
    const doc = {
      dumped_at: stamp, project_id: projectId, standard: std,
      instances: rows.instances.filter((i) => i.standard === std),
      events: rows.events.filter((e) => e.standard === std),
      worksheets,
    };
    fs.writeFileSync(file, JSON.stringify(doc, null, 2), 'utf8');
    const n = Object.values(worksheets).reduce((a, w) => a + Object.keys(w).length, 0);
    summary.push({ standard: std, worksheets: Object.keys(worksheets).length, values: n, file });
  }
  console.table(summary);
  console.log('instances', rows.instances.length, 'events', rows.events.length);
} finally {
  await sql.end();
}
