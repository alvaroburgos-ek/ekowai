// Refresh c4q-state.json from a prod export (2026-10-17): verification_quote + field signature (fsig) of every DWA-M-820-3 row in
// the state, taken from tests/harness/m820-prod-vq-2026-10-17.json (exported READ ONLY from prod; see tests/harness/m820-prod-overlay.ts).
// Every other column of the state rows already equalled prod (column diff 2026-10-17: only verification_quote differed).
// Run: node scripts/verification/m820-3-c4-qe-guards/refresh-c4q-state.mjs [prod-export.json]  → then gen-c4q.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCR = dirname(fileURLToPath(import.meta.url));
const WT = resolve(SCR, '../../..');
const src = resolve(WT, process.argv[2] ?? 'tests/harness/m820-prod-vq-2026-10-17.json');
const prod = JSON.parse(readFileSync(src, 'utf8')).rows.filter((r) => r.std === 'DWA-M-820-3');
const S = JSON.parse(readFileSync(`${SCR}/c4q-state.json`, 'utf8'));
const P = (ws, sym) => { const r = prod.find((x) => x.ws === ws && x.symbol === sym); if (!r) throw new Error(`no prod row ${ws} ${sym}`); return r; };
let vq = 0; let sig = 0;
for (const f of S.fields) {
  if (!f.active) continue;
  const p = P(f.ws, f.symbol);
  if ((f.verification_quote ?? null) !== p.verification_quote) { f.verification_quote = p.verification_quote; vq++; }
}
for (const s of S.fsig) { const p = P(s.ws, s.symbol); if (s.sig !== p.sig) { s.sig = p.sig; sig++; } }
S.note = `${S.note} Refreshed 2026-10-17 from prod (${src.replace(/\\/g, '/').split('/').slice(-1)[0]}): verification_quote + fsig = prod.`;
writeFileSync(`${SCR}/c4q-state.json`, JSON.stringify(S, null, 1) + '\n');
console.log({ fields: S.fields.length, vqChanged: vq, fsigChanged: sig });
