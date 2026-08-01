import { readFileSync, writeFileSync } from 'node:fs';
const snap = JSON.parse(readFileSync('scripts/reasoning-map/snapshot/encoding-snapshot.json', 'utf8'));
const dec = JSON.parse(readFileSync('scripts/reasoning-map/gate-decisions.json', 'utf8'));
const crIx = new Map(), fieldsByStd = new Map();
for (const [std, b] of Object.entries(snap.standards)) {
  for (const c of b.compliance ?? []) crIx.set(`${std}|${c.code}`, c);
  fieldsByStd.set(std, new Set((b.fields ?? []).map((f) => f.symbol)));
}
const q = (s) => String(s).replace(/'/g, "''");
const mig = ['-- INDIVIDUAL-CALL gate items (owner: finish them too). A2 attestation/action -> ==True (data-flags/',
  '-- disclosures/conditionals KEPT as presence); C field-missing typo -> corrected symbol, else cleared to manual.',
  '-- D2 splits KEPT (enforce via project-wide fallback; re-home of a 2-ws split only shifts which ws shows pending).',
  '-- Rollback: -individual.', 'DO $$', 'BEGIN'];
const rb = ['DO $$ BEGIN'];
const plan = ['# INDIVIDUAL-ITEM DECISIONS (auto-applied, review + override any)', ''];

// ---- A2 ----
const AFFIRM = /(attest|confirm|erfuel|erfüll|nachgewiesen|dokument|eingehalten|durchgef|erstellt|geprueft|geprüft|bestaetigt|bestätigt|vorhanden|abgeschlossen|freigegeben|genehmig|umgesetzt|_ok$|_done$|_present$)/i;
const ACTION = /(_conducted|_recorded|_tested|_documented|_validat|_determined|_addressed|_met$|_adequate|_controlled|_presented|_minimi[sz]ed|_secured|_refrigerated|_airtight|_performed|_verified|_assessed|_identified|_established|_completed|_implemented|_calibrated|_labelled|_reported|_correction$|_curve_presented|_specific$)/i;
const COND = /(si se|si una|cuando sea|\bif\b|\bwenn\b|\bfalls\b|\bwhere\b|sofern|appropriate|as required|bei Bedarf|apropiado)/i;
const MAND = /(muss|müssen|shall|\bdebe\b|\bdeben\b|ist zu|sind zu|\bmust\b|required)/i;
plan.push('## A2 vacuous booleans'); let a2t = 0, a2k = 0;
for (const d of dec.filter((x) => x.kind === 'vacuous-isnotnull-boolean')) {
  const c = crIx.get(`${d.code}|${d.cr}`); if (!c) continue;
  const sym = /^\s*([A-Za-z_]\w*)/.exec(c.condition ?? '')?.[1] ?? '';
  const aff = AFFIRM.test(sym) || c.requires_attestation === true || MAND.test(c.source_quote ?? '');
  if (aff) continue; // A1, already applied
  const disclosure = /^[A-Z][a-zA-Z]{18,}/.test(sym); // long PascalCase = VSME-style disclosure
  const cond = COND.test(c.source_quote ?? '') || COND.test(sym);
  const toTrue = !disclosure && !cond && (ACTION.test(sym) || MAND.test(c.source_quote ?? ''));
  if (toTrue) {
    mig.push(`  UPDATE compliance_requirements SET condition='${q(sym)} == True' WHERE id='${c.id}' AND condition='${q(c.condition)}';`);
    rb.push(`  UPDATE compliance_requirements SET condition='${q(c.condition)}' WHERE id='${c.id}';`);
    plan.push(`- **==True** ${d.code}/${d.cr} \`${sym}\` (action/mandatory)`); a2t++;
  } else {
    plan.push(`- keep presence ${d.code}/${d.cr} \`${sym}\` (${disclosure ? 'disclosure' : cond ? 'conditional' : 'data-flag'})`); a2k++;
  }
}

// ---- C field-missing ----
plan.push('', '## C field-missing'); let cfix = 0, cclr = 0;
const lev = (a, b) => { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 0; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; };
for (const d of dec.filter((x) => x.kind === 'field-missing')) {
  const c = crIx.get(`${d.code}|${d.cr}`); if (!c) continue;
  const cond = c.condition ?? '';
  const refs = [...new Set((cond.match(/[A-Za-z_]\w+/g) ?? []).filter((t) => !/^(IS|NOT|NULL|EMPTY|AND|OR|IN|IF|THEN|True|False|true|false|SUM)$/i.test(t)))];
  const flds = fieldsByStd.get(d.code) ?? new Set();
  const miss = refs.filter((r) => !flds.has(r));
  // try a typo correction for a SINGLE missing symbol with a close real field
  if (miss.length === 1) {
    let best = null, bd = 99;
    for (const f of flds) { const dd = lev(miss[0], f); if (dd < bd) { bd = dd; best = f; } }
    if (best && bd <= 2 && bd < miss[0].length * 0.34) {
      const nc = cond.split(miss[0]).join(best);
      mig.push(`  UPDATE compliance_requirements SET condition='${q(nc)}' WHERE id='${c.id}' AND condition='${q(cond)}';`);
      rb.push(`  UPDATE compliance_requirements SET condition='${q(cond)}' WHERE id='${c.id}';`);
      plan.push(`- **typo-fix** ${d.code}/${d.cr}: \`${miss[0]}\` -> \`${best}\` (dist ${bd})`); cfix++; continue;
    }
  }
  // else clear the broken condition to a manual-review item (references field(s) that don't exist)
  mig.push(`  UPDATE compliance_requirements SET condition='' WHERE id='${c.id}' AND condition='${q(cond)}';`);
  rb.push(`  UPDATE compliance_requirements SET condition='${q(cond)}' WHERE id='${c.id}';`);
  plan.push(`- clear->manual ${d.code}/${d.cr}: missing ${miss.join(',')} (no close field)`); cclr++;
}

mig.push("  RAISE NOTICE 'individual applied';"); mig.push('END $$;'); rb.push('END $$;');
writeFileSync('scripts/migrations/20260801210000_gate_individual.sql', mig.join('\n') + '\n');
writeFileSync('scripts/rollback-20260801210000-individual.sql', rb.join('\n') + '\n');
writeFileSync('scripts/reasoning-map/_individual-plan.md', plan.join('\n') + '\n');
console.log(`A2: ${a2t} ->==True, ${a2k} kept-presence | C: ${cfix} typo-fixed, ${cclr} cleared | D2: 68 kept (fallback-enforcing)`);
