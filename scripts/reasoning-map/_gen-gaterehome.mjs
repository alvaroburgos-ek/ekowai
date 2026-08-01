import { readFileSync, writeFileSync } from 'node:fs';
const rh = JSON.parse(readFileSync('scripts/reasoning-map/gate-rehomes.json', 'utf8'));
const snap = JSON.parse(readFileSync('scripts/reasoning-map/snapshot/encoding-snapshot.json', 'utf8'));
const curWs = {};
const codeByWs = new Set(); // "wsId|code" pairs that already exist
const crCode = {};
for (const b of Object.values(snap.standards)) for (const c of b.compliance ?? []) {
  curWs[c.id] = c.worksheet_template_id;
  crCode[c.id] = c.code;
  codeByWs.add(`${c.worksheet_template_id}|${c.code}`);
}
// Exclude re-homes whose (target worksheet, code) already exists → would violate the unique
// (worksheet_template_id, code) constraint. Those gates need a code-renumber first (duplicate-REQ-code
// class) → they go to the owner-decision list, not this mechanical batch.
const collisions = [];
const claimed = new Set(); // (wsId|code) claimed by an already-accepted re-home in this batch
const safe = rh.filter((x) => {
  const key = `${x.toWsId}|${crCode[x.id]}`;
  const hit = codeByWs.has(key) || claimed.has(key);
  if (hit) { collisions.push({ code: x.code, cr: crCode[x.id], toWs: x.toWs }); return false; }
  claimed.add(key);
  return true;
});
writeFileSync('scripts/reasoning-map/gate-rehome-collisions.json', JSON.stringify(collisions, null, 1));
console.log(`re-homes: ${rh.length} total, ${safe.length} safe, ${collisions.length} code-collisions (deferred)`);
const mig = [
  '-- GATE RE-HOME: move each mis-homed gate to the worksheet that OWNS its referenced fields, so it resolves',
  '-- worksheet-locally (report/PDF path) instead of showing pending. Mechanical + deterministic (single-target',
  `-- only; multi-worksheet gates are flagged, not moved). ${safe.length} gates. Rollback: -gaterehome.`,
  'DO $$', 'BEGIN',
];
const rb = ['DO $$ BEGIN'];
for (const x of safe) {
  mig.push(`  UPDATE compliance_requirements SET worksheet_template_id='${x.toWsId}' WHERE id='${x.id}';`);
  rb.push(`  UPDATE compliance_requirements SET worksheet_template_id='${curWs[x.id]}' WHERE id='${x.id}';`);
}
mig.push('END $$;');
rb.push('END $$;');
writeFileSync('scripts/migrations/20260801190000_gate_rehome.sql', mig.join('\n') + '\n');
writeFileSync('scripts/rollback-20260801190000-gaterehome.sql', rb.join('\n') + '\n');
console.log(`wrote migration with ${safe.length} re-homes + rollback`);
