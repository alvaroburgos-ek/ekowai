// Pre-/post-state regenerator for the staged DWA-M 820 case-C4 blocks 20261015130000 / 140000 / 150000 (2026-10-17).
// (20261015160000 has its own generator: scripts/verification/m820-3-c4-qe-guards/gen-c4q.mjs.)
//
// The three blocks were hand-written / generated without a committed generator; their guard signatures came from the harness seed,
// which lacked prod's verification_quote (see tests/harness/m820-prod-overlay.ts). This script rewrites ONLY the state facts of the
// committed SQL — the block semantics (guards, appended texts, drivers, equations, gates) are untouched:
//   1. sig0 of every touched field  = prod signature (tests/harness/m820-prod-vq-2026-10-17.json, exported READ ONLY);
//      150000's M820-24 rows = 130000's sig1 (150000 is applied after 130000).
//   2. verification_quote written by the block = prod quote + SEP + the block's own quote (prod evidence is kept, never replaced);
//      the block's own quotes are frozen in block-vq.json (extracted once from the e8db65a SQL with --extract).
//   3. sig1 of every touched field  = <block>.sig1.json, written by tests/harness/m820-c4-prestate.integration.test.ts
//      (M820_PRESTATE_WRITE=1) from the harness after the apply; not yet discovered → the current value stays (run: regen → discover →
//      regen → discover → regen; two rounds because 150000's M820-24 sig0 is 130000's sig1).
// Gate / section signatures are not touched (they matched prod on 2026-10-17).
// Run: node scripts/verification/m820-c4-prestate/regen.mjs [--extract]   (rewrites migration + read-back of the three blocks in place)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WT = resolve(HERE, '../../..');
export const SEP = ' | ';
export const PROD_STATE = 'tests/harness/m820-prod-vq-2026-10-17.json';
export const BLOCKS = {
  '130000': { std: 'DWA-M-820-1', mig: 'scripts/migrations/20261015130000_m820_1_c4_procurement_guards.sql', rb: 'scripts/verification/apply/readback-20261015130000-m820-1-c4-procurement-guards.sql' },
  '140000': { std: 'DWA-M-820-2', mig: 'scripts/migrations/20261015140000_m820_2_c4_phase_guards.sql', rb: 'scripts/verification/apply/readback-20261015140000-m820-2-c4-phase-guards.sql' },
  '150000': { std: 'DWA-M-820-1', mig: 'scripts/migrations/20261015150000_m820_1_c4_phase_drivers.sql', rb: 'scripts/verification/apply/readback-20261015150000-m820-1-c4-phase-drivers.sql', after: { ws: 'M820-24', block: '130000' } },
};

const read = (p) => readFileSync(resolve(WT, p), 'utf8');
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** fv rows of the read-back R0: ws, sym, sig0, sig1 (130000 carries a guard column before sig0). */
export function readbackRows(rbText) {
  const i0 = rbText.indexOf('fv(');
  const block = rbText.slice(i0, rbText.search(/\)\),\s*\r?\n\s*(gv|sv)\(/) + 2);
  const rows = [...block.matchAll(/\('([^']+)','([^']+)',(?:'[^']*',)?'([0-9a-f]{32})','([0-9a-f]{32})'\)/g)]
    .map((m) => ({ ws: m[1], sym: m[2], sig0: m[3], sig1: m[4] }));
  if (!rows.length) throw new Error('no fv rows');
  return rows;
}

/** Every `UPDATE fields f SET … WHERE … w.code = ws AND f.symbol = sym …;` statement: [start, end, ws, sym]. */
function fieldUpdates(sql) {
  const out = [];
  // texts contain „;“ — a statement ends at the first line-final „;“ after its WHERE line
  const re = /UPDATE fields f\s+SET /g;
  let m;
  while ((m = re.exec(sql))) {
    const wh = sql.indexOf('\n WHERE ', m.index);
    const endM = /;\r?\n/g; endM.lastIndex = wh; const e = endM.exec(sql);
    if (wh < 0 || !e) throw new Error('unterminated UPDATE at ' + m.index);
    const text = sql.slice(m.index, e.index + 1);
    const w = text.slice(wh - m.index).match(/w\.code = '([^']+)' AND f\.symbol = '([^']+)'/);
    if (w) out.push({ start: m.index, end: e.index + 1, ws: w[1], sym: w[2], text });
  }
  return out;
}
const VQ_RE = /verification_quote = \$m\$([\s\S]*?)\$m\$/;

const sig1File = (b) => resolve(HERE, `${b}.sig1.json`);
const BVQ = resolve(HERE, 'block-vq.json');

function extract() {
  const out = {};
  for (const [b, c] of Object.entries(BLOCKS)) {
    out[b] = {};
    for (const u of fieldUpdates(read(c.mig))) {
      const v = u.text.match(VQ_RE);
      if (v) out[b][`${u.ws} ${u.sym}`] = v[1];
    }
  }
  writeFileSync(BVQ, JSON.stringify(out, null, 1) + '\n');
  console.log('extracted', Object.fromEntries(Object.entries(out).map(([b, x]) => [b, Object.keys(x).length])));
}

function render() {
  const prod = json(resolve(WT, PROD_STATE)).rows;
  const bvq = json(BVQ);
  const P = (std, ws, sym) => { const r = prod.find((x) => x.std === std && x.ws === ws && x.symbol === sym); if (!r) throw new Error(`no prod row ${std} ${ws} ${sym}`); return r; };
  const report = {};
  for (const [b, c] of Object.entries(BLOCKS)) {
    const sig1 = existsSync(sig1File(b)) ? json(sig1File(b)) : {};
    const dep = c.after ? (existsSync(sig1File(c.after.block)) ? json(sig1File(c.after.block)) : {}) : {};
    let mig = read(c.mig); let rb = read(c.rb);
    const rows = readbackRows(rb);
    // 1 + 3 · signatures
    const map = new Map();
    for (const r of rows) {
      const k = `${r.ws} ${r.sym}`;
      const s0 = c.after && r.ws === c.after.ws ? (dep[k] ?? r.sig0) : P(c.std, r.ws, r.sym).sig;
      const s1 = sig1[k] ?? r.sig1; // not yet discovered → keep the current value (an md5, so a later run can still map it)
      map.set(r.sig0, s0); map.set(r.sig1, s1);
    }
    let nSig = 0;
    for (const [a, z] of map) {
      if (a === z) continue;
      const re = new RegExp(esc(a), 'g');
      const n = (mig.match(re) ?? []).length + (rb.match(re) ?? []).length;
      if (!n) throw new Error(`${b}: signature ${a} not found`);
      mig = mig.replace(re, z); rb = rb.replace(re, z); nSig += n;
    }
    // 2 · verification_quote = prod quote + SEP + block quote
    let nVq = 0; let nKept = 0;
    const ups = fieldUpdates(mig).reverse();
    for (const u of ups) {
      const k = `${u.ws} ${u.sym}`;
      if (!(k in bvq[b])) continue;
      const own = bvq[b][k];
      const pv = P(c.std, u.ws, u.sym).verification_quote;
      if (pv && pv.includes('$m$')) throw new Error('dollar tag in prod quote ' + k);
      const val = pv ? `${pv}${SEP}${own}` : own;
      const t2 = u.text.replace(VQ_RE, () => `verification_quote = $m$${val}$m$`);
      mig = mig.slice(0, u.start) + t2 + mig.slice(u.end);
      nVq++; if (pv) nKept++;
    }
    writeFileSync(resolve(WT, c.mig), mig); writeFileSync(resolve(WT, c.rb), rb);
    report[b] = { fields: rows.length, sigReplacements: nSig, vqStatements: nVq, prodQuoteKept: nKept, pendingSig1: rows.filter((r) => !(`${r.ws} ${r.sym}` in sig1)).length };
  }
  console.log(JSON.stringify(report));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { if (process.argv.includes('--extract')) extract(); else render(); }
