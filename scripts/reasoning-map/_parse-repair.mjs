import { readFileSync, writeFileSync } from 'node:fs';
const OUT = process.argv[2];
const raw = JSON.parse(readFileSync(OUT, 'utf8'));
const results = raw.result?.results ?? raw.results ?? [];
const APPLY = new Set(['fix-formula', 'syntax-clean-to-manual', 'piecewise-to-minmax']);
const applyRows = [];
const holdRows = [];
const counts = {};
for (const std of results) {
  for (const f of std.fixes ?? []) {
    counts[f.disposition] = (counts[f.disposition] || 0) + 1;
    const row = {
      code: std.code, eq: f.equation_number, ids: f.ids ?? [], disp: f.disposition,
      formula: f.new_formula ?? '', inputs: f.new_input_symbols ?? null, unit: f.new_output_unit ?? null,
    };
    if (APPLY.has(f.disposition) && f.new_formula && (f.ids ?? []).length) applyRows.push(row);
    else if (f.disposition !== 'no-change-already-manual') holdRows.push({ code: std.code, eq: f.equation_number, disp: f.disposition, note: (f.proof ?? '').slice(0, 240) });
  }
}
console.log('DISPOSITION COUNTS:', JSON.stringify(counts, null, 0));
console.log('APPLICABLE FIX ROWS:', applyRows.length);
console.log('HOLD/RULING ROWS:', holdRows.length);
writeFileSync('scripts/reasoning-map/_repair-apply.json', JSON.stringify(applyRows, null, 1));
writeFileSync('scripts/reasoning-map/_repair-hold.json', JSON.stringify(holdRows, null, 1));
// Emit the apply rows compactly for review
for (const r of applyRows) {
  console.log(`APPLY  ${r.code}  ${r.eq}  [${r.disp}]  ${r.ids.length}id  =>  ${r.formula}${r.unit ? '  {unit:' + r.unit + '}' : ''}${r.inputs ? '  {in:' + r.inputs.join(',') + '}' : ''}`);
}
console.log('---- HOLD ----');
for (const r of holdRows) console.log(`HOLD   ${r.code}  ${r.eq}  [${r.disp}]`);
