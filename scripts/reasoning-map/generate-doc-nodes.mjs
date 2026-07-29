import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT='C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps';
const DRY=process.argv.includes('--dry');
const stdDirs=readdirSync(ROOT).filter(d=>{try{return statSync(join(ROOT,d)).isDirectory()&&!d.startsWith('_')&&!d.startsWith('.')}catch{return false}});
function titleFromSlug(slug){
  let s=slug.replace(/^doc-/i,''); const parts=s.split('-'); const alpha=[]; let i=0;
  for(;i<parts.length;i++){ if(/^[a-z]+$/i.test(parts[i]) && parts[i].length<=4){ alpha.push(parts[i].toUpperCase()); } else break; }
  return (alpha.join(' ')+' '+parts.slice(i).join('-')).trim();
}
let created=0;
for(const std of stdDirs){
  const dir=join(ROOT,std);
  const flist=readdirSync(dir).filter(f=>f.endsWith('.md'));
  const nodeIds=new Set(flist.map(f=>f.replace(/\.md$/,'')));
  const need=new Set();
  for(const f of flist){ const t=readFileSync(join(dir,f),'utf8');
    for(const m of t.matchAll(/\[\[(doc-[^\]|]+)(?:\|[^\]]*)?\]\]/g)){ const tgt=m[1].trim(); if(!nodeIds.has(tgt)) need.add(tgt); } }
  const slug=std.toLowerCase();
  for(const tgt of need){
    const fp=join(dir,tgt+'.md'); if(existsSync(fp)) continue;
    const desig=titleFromSlug(tgt);
    const body=`---
title: "DOC — ${desig} (external referenced standard)"
created: 2026-07-29
tags: [type/reasoning-map, std/${slug}, node/document, status/active]
status: active
source_document: referenced by ${std}
source_page: ""
owner_worksheet: ${std}-*
provenance: NR
provenance_date: 2026-07-29
provenance_build: ""
data_class: standard_fixed
severity: warn
ratification_status: unratified
in_library: false
generated: doc-node-backfill-2026-07-29
---
# DOC — ${desig}

**What it is.** External standard **${desig}**, cited by ${std} but NOT held in the encoding library.
Generated 2026-07-29 to close a reference-edge gap (${std} nodes linked \`[[${tgt}]]\` with no target).

**Provenance.** \`in_library: false\`, provenance **NR** — the referenced document is not in the library,
so its content is neither encoded nor verified here. Acquisition-list candidate. Per the content-boundary
rule, a bare cross-reference is displayed honestly, never expanded or filled from memory.
`;
    if(!DRY) writeFileSync(fp,body,'utf8');
    created++;
  }
}
console.log(`${DRY?'DRY — would create':'created'} ${created} in_library:false doc nodes`);
