import { readFileSync, writeFileSync } from 'node:fs';
const snap = JSON.parse(readFileSync('scripts/reasoning-map/snapshot/encoding-snapshot.json', 'utf8'));
const decisions = JSON.parse(readFileSync('scripts/reasoning-map/gate-decisions.json', 'utf8'));
const rehomes = JSON.parse(readFileSync('scripts/reasoning-map/gate-rehomes.json', 'utf8'));

const crIx = new Map(), fieldSym = new Map();
const codesByWs = new Map(); // wsId -> Set(codes)
for (const [std, b] of Object.entries(snap.standards)) {
  for (const c of b.compliance ?? []) {
    crIx.set(`${std}|${c.code}`, c);
    if (!codesByWs.has(c.worksheet_template_id)) codesByWs.set(c.worksheet_template_id, new Set());
    codesByWs.get(c.worksheet_template_id).add(c.code);
  }
}
const q = (s) => String(s).replace(/'/g, "''");
const mig = ['-- GATE DECISION SHEET — bulk-approved sections applied (A1 attestation->==True, B1 dead-prose warn->clear,',
  '-- E dup-code collision renumber+rehome). D1 = keep (no write). Owner APPROVE-ALL 2026-08-01. Rollback: -decisions.',
  'DO $$', 'BEGIN'];
const rb = ['DO $$ BEGIN'];
let a1 = 0, b1 = 0, e = 0;

// ---- A1: vacuous IS-NOT-NULL on affirmative/attestation boolean -> == True ----
const AFFIRM = /(attest|confirm|erfuel|erfüll|nachgewiesen|dokument|eingehalten|durchgef|erstellt|geprueft|geprüft|bestaetigt|bestätigt|vorhanden|abgeschlossen|freigegeben|genehmig|eingehal|umgesetzt|_ok$|_done$|_present$)/i;
for (const d of decisions.filter((x) => x.kind === 'vacuous-isnotnull-boolean')) {
  const c = crIx.get(`${d.code}|${d.cr}`); if (!c) continue;
  const sym = /^\s*([A-Za-z_]\w*)/.exec(c.condition ?? '')?.[1] ?? '';
  const affirmative = AFFIRM.test(sym) || c.requires_attestation === true || /\b(muss|müssen|shall|ist zu|sind zu|has to|must)\b/i.test(c.source_quote ?? '');
  if (!affirmative || !sym) continue;
  mig.push(`  UPDATE compliance_requirements SET condition='${q(sym)} == True' WHERE id='${c.id}' AND condition='${q(c.condition)}';`);
  rb.push(`  UPDATE compliance_requirements SET condition='${q(c.condition)}' WHERE id='${c.id}';`);
  a1++;
}

// ---- B1: dead-prose WARN -> clear condition to '' (clean manual attestation) ----
for (const d of decisions.filter((x) => x.kind === 'dead-prose')) {
  const c = crIx.get(`${d.code}|${d.cr}`); if (!c || (c.severity ?? '') !== 'warn') continue;
  mig.push(`  UPDATE compliance_requirements SET condition='' WHERE id='${c.id}' AND condition='${q(c.condition)}';`);
  rb.push(`  UPDATE compliance_requirements SET condition='${q(c.condition)}' WHERE id='${c.id}';`);
  b1++;
}

// ---- E: duplicate-code collision -> renumber moved gate to a unique code + re-home ----
const claimed = new Map(); // wsId -> Set(codes claimed this batch)
const takenOn = (wsId) => { if (!claimed.has(wsId)) claimed.set(wsId, new Set()); return new Set([...(codesByWs.get(wsId) ?? []), ...claimed.get(wsId)]); };
for (const x of rehomes) {
  const c = crIx.get(`${x.code}|${x.cr}`); if (!c) continue;
  const existing = codesByWs.get(x.toWsId) ?? new Set();
  const clash = existing.has(c.code) || (claimed.get(x.toWsId)?.has(c.code));
  if (!clash) continue; // non-collision re-homes were already applied in mig 190000
  // pick a unique code on the target: <code>-2, -3, ...
  let n = 2, nc;
  const taken = takenOn(x.toWsId);
  do { nc = `${c.code}-${n++}`; } while (taken.has(nc));
  claimed.get(x.toWsId).add(nc);
  mig.push(`  UPDATE compliance_requirements SET code='${q(nc)}', worksheet_template_id='${x.toWsId}' WHERE id='${c.id}' AND worksheet_template_id='${c.worksheet_template_id}';`);
  rb.push(`  UPDATE compliance_requirements SET code='${q(c.code)}', worksheet_template_id='${c.worksheet_template_id}' WHERE id='${c.id}';`);
  e++;
}

mig.push("  RAISE NOTICE 'decisions applied';"); mig.push('END $$;'); rb.push('END $$;');
writeFileSync('scripts/migrations/20260801200000_gate_decisions_bulk.sql', mig.join('\n') + '\n');
writeFileSync('scripts/rollback-20260801200000-decisions.sql', rb.join('\n') + '\n');
console.log(`A1(==True)=${a1}  B1(clear)=${b1}  E(renumber+rehome)=${e}  total=${a1 + b1 + e}`);
