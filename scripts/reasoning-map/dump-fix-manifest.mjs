#!/usr/bin/env node
/**
 * Dump the map-write-back manifest from prod — every CR this campaign has repaired,
 * with the page its new evidence cites and the migration/commit that did it.
 *
 * Exists so the write-back is driven by what the DATABASE actually says, not by a list
 * pasted out of a chat transcript (R-1/R-2). Re-run it and you get the same manifest.
 *
 * Usage: node dump-fix-manifest.mjs > fixes.json
 */
const REF = 'vadsmshzebefjreqcicl';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN not set');
  process.exit(2);
}

const SQL = `
select coalesce(json_agg(json_build_object(
  'map', case when s.code = 'FLL-Naturteich' then 'FLL-Naturteich-2017' else s.code end,
  'cr', c.code,
  'page', (regexp_match(c.source_anchor, 'PDF p\\.(\\d+)'))[1],
  'defect_class', case when c.audited_by like 'W3-D1 %'
                       then 'rule-10a evidence-free label stub'
                       else 'rule-10b heading-as-evidence' end,
  'ref', case when c.audited_by like 'W3-D1 %' then '225b005' else '8cde213' end,
  'what', 'source_quote backfilled PDF-verbatim from the standard''s own rendered page; source_file .md -> .pdf',
  'lift', true,
  'date', '2026-07-27'
) order by s.code, c.code), '[]'::json) as fixes
from compliance_requirements c
join worksheet_templates w on w.id = c.worksheet_template_id
join standards s on s.id = w.standard_id
where c.audited_by like 'W3-D%';`;

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: SQL }),
});
if (!res.ok) {
  console.error(`HTTP ${res.status}`, (await res.text()).slice(0, 500));
  process.exit(1);
}
const rows = await res.json();
process.stdout.write(JSON.stringify(rows[0].fixes, null, 1));
