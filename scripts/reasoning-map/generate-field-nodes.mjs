import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT='C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps';
const DRY=process.argv.includes('--dry');
const snap=JSON.parse(readFileSync('scripts/reasoning-map/snapshot/encoding-snapshot.json','utf8'));
const prod={};
for(const [std,enc] of Object.entries(snap.standards||{})){
  const wsById=new Map((enc.worksheets||[]).map(w=>[w.id,w.code]));
  const eqOut=new Set((enc.equations||[]).map(e=>(e.output_symbol||'').toLowerCase()).filter(Boolean));
  const fmap=new Map();
  for(const f of enc.fields||[]){ if(!f.symbol) continue; fmap.set(f.symbol.toLowerCase(), {symbol:f.symbol, ws:wsById.get(f.worksheet_template_id)||'', dt:f.data_type, derived:eqOut.has(f.symbol.toLowerCase())}); }
  prod[std]={fmap, srcdoc:(enc.standard&&enc.standard.title)||std};
}
const stdDirs=readdirSync(ROOT).filter(d=>{try{return statSync(join(ROOT,d)).isDirectory()&&!d.startsWith('_')&&!d.startsWith('.')}catch{return false}});
let created=0;
for(const std of stdDirs){
  const dir=join(ROOT,std); const P=prod[std]; if(!P) continue;
  const flist=readdirSync(dir).filter(f=>f.endsWith('.md'));
  const nodeIds=new Set(flist.map(f=>f.replace(/\.md$/,'')));
  const need=new Map();
  for(const f of flist){ const t=readFileSync(join(dir,f),'utf8');
    for(const m of t.matchAll(/\[\[((?:field-|fld-)[^\]|]+)(?:\|[^\]]*)?\]\]/gi)){
      const ref=m[1].trim(); if(nodeIds.has(ref)) continue;
      const mm=ref.match(/^(field-|fld-)(.+)$/i); if(!mm) continue;
      const pf=P.fmap.get(mm[2].toLowerCase()); if(pf) need.set(ref,pf);
    }
  }
  const slug=std.toLowerCase();
  for(const [ref,pf] of need){
    const fp=join(dir,ref+'.md'); if(existsSync(fp)) continue;
    const dc=pf.derived?'derived':'engineer_input';
    const body=`---
title: "${std} field -- ${pf.symbol}"
created: 2026-07-30
tags: [type/reasoning-map, std/${slug}, node/field, status/active]
status: active
source_document: ${std}
source_page: ""
owner_worksheet: ${pf.ws||std+'-*'}
provenance: VC
provenance_date: 2026-07-30
provenance_build: ""
data_class: ${dc}
severity: none
ratification_status: unratified
generated: field-node-backfill-2026-07-30
---
# ${std} field -- ${pf.symbol}

**What it is.** Field **\`${pf.symbol}\`** (type \`${pf.dt||'?'}\`) on worksheet ${pf.ws||'?'}, data_class \`${dc}\`.
DB-MIRROR node generated 2026-07-30 to close a field-node gap (equation/CR/section nodes linked
\`[[${ref}]]\` with no target). Mirrors the prod field row; nothing invented. Grade VC (verified vs the
encoding, not a rendered PDF).
`;
    if(!DRY) writeFileSync(fp,body,'utf8');
    created++;
  }
}
console.log(`${DRY?'DRY — would create':'created'} ${created} field nodes`);
