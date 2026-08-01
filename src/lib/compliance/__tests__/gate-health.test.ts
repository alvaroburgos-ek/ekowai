import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractConditionSymbols, evaluateCondition } from '../evaluate';

/**
 * GATE-HEALTH HARNESS — classifies every compliance gate across the whole corpus using the real
 * condition engine, so mis-homed / vacuous / dead gates can be fixed to a UNIFORM level.
 *
 * A gate is HEALTHY when its condition parses AND every field it references is reachable on the gate's
 * own worksheet (owned there, or inherited via consumer_worksheets / "ALL"). It is:
 *   - MIS-HOMED  : its fields all live on ONE other worksheet → re-home target = that worksheet.
 *   - SPLIT      : its fields span several worksheets → needs a design decision.
 *   - FIELD-MISS : references a symbol that is not a field anywhere.
 *   - DEAD-PROSE : non-empty condition the engine can't parse (natural language).
 *   - VACUOUS    : `X IS NOT NULL` on a BOOLEAN field (passes for true AND false).
 * Writes a per-standard scorecard, the mechanical re-home worklist, and the owner-decision list.
 */
type Field = { symbol: string; data_type: string; worksheet_template_id: string; consumer_worksheets: string[] | null };
type CR = { id: string; code: string; condition: string | null; severity: string | null; worksheet_template_id: string };
type WS = { id: string; code: string };
type Bucket = { worksheets: WS[]; fields: Field[]; compliance: CR[] };
type Snapshot = { exported_at: string; standards: Record<string, Bucket> };

const snap = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../scripts/reasoning-map/snapshot/encoding-snapshot.json'), 'utf8'),
) as Snapshot;

type HealthRow = { code: string; gates: number; healthy: number; mishome: number; split: number; fieldMiss: number; deadProse: number; vacuous: number };
const rows: HealthRow[] = [];
const rehome: Array<{ code: string; cr: string; id: string; fromWs: string; toWsId: string; toWs: string; condition: string }> = [];
const decisions: Array<{ code: string; cr: string; kind: string; detail: string }> = [];

for (const [code, b] of Object.entries(snap.standards)) {
  const wsCodeById = new Map(b.worksheets.map((w) => [w.id, w.code]));
  const fieldBySym = new Map<string, Field>();
  for (const f of b.fields ?? []) if (!fieldBySym.has(f.symbol)) fieldBySym.set(f.symbol, f);
  const r: HealthRow = { code, gates: 0, healthy: 0, mishome: 0, split: 0, fieldMiss: 0, deadProse: 0, vacuous: 0 };

  const reachable = (f: Field, hostWsId: string): boolean => {
    if (f.worksheet_template_id === hostWsId) return true;
    const cons = f.consumer_worksheets ?? [];
    if (cons.includes('ALL')) return true;
    const hostCode = wsCodeById.get(hostWsId);
    return hostCode != null && cons.includes(hostCode);
  };

  for (const cr of b.compliance ?? []) {
    if ((cr.severity ?? '') === '') continue; // not an enforcing gate
    r.gates++;
    const cond = (cr.condition ?? '').trim();
    if (!cond) { r.healthy++; continue; } // empty = intentional manual attestation
    const syms = extractConditionSymbols(cond);
    if (syms === null) { r.deadProse++; decisions.push({ code, cr: cr.code, kind: 'dead-prose', detail: cond.slice(0, 80) }); continue; }

    // vacuous IS-NOT-NULL on a boolean
    const vac = /^\s*([A-Za-z_]\w*)\s+IS\s+NOT\s+(NULL|EMPTY)\s*$/i.exec(cond);
    if (vac && fieldBySym.get(vac[1])?.data_type === 'boolean') {
      r.vacuous++; decisions.push({ code, cr: cr.code, kind: 'vacuous-isnotnull-boolean', detail: cond }); continue;
    }

    const unreachable: Field[] = [];
    let missing = false;
    for (const s of syms) {
      const f = fieldBySym.get(s);
      if (!f) { missing = true; continue; }
      if (!reachable(f, cr.worksheet_template_id)) unreachable.push(f);
    }
    if (missing) { r.fieldMiss++; decisions.push({ code, cr: cr.code, kind: 'field-missing', detail: cond.slice(0, 80) }); continue; }
    if (unreachable.length === 0) { r.healthy++; continue; }
    const targetWss = new Set(unreachable.map((f) => f.worksheet_template_id));
    if (targetWss.size === 1) {
      const toWsId = [...targetWss][0];
      r.mishome++;
      rehome.push({ code, cr: cr.code, id: cr.id, fromWs: wsCodeById.get(cr.worksheet_template_id) ?? '?', toWsId, toWs: wsCodeById.get(toWsId) ?? '?', condition: cond });
    } else {
      r.split++; decisions.push({ code, cr: cr.code, kind: 'split-multi-worksheet', detail: cond.slice(0, 80) });
    }
  }
  rows.push(r);
}

rows.sort((a, b) => (b.mishome + b.split + b.fieldMiss + b.deadProse + b.vacuous) - (a.mishome + a.split + a.fieldMiss + a.deadProse + a.vacuous));
const totalDefect = rows.reduce((s, r) => s + r.mishome + r.split + r.fieldMiss + r.deadProse + r.vacuous, 0);
const totalGates = rows.reduce((s, r) => s + r.gates, 0);
const cleanStds = rows.filter((r) => r.mishome + r.split + r.fieldMiss + r.deadProse + r.vacuous === 0).length;

const out = [`# GATE-HEALTH SCORECARD`, `snapshot: ${snap.exported_at}`,
  `gate-clean standards: ${cleanStds}/${rows.length}; defect gates: ${totalDefect}/${totalGates}`,
  `mechanical re-homes available: ${rehome.length}; owner-decision items: ${decisions.length}`, '',
  `| standard | gates | healthy | mishome | split | field-miss | dead-prose | vacuous |`,
  `|---|--:|--:|--:|--:|--:|--:|--:|`];
for (const r of rows) out.push(`| ${r.code} | ${r.gates} | ${r.healthy} | ${r.mishome} | ${r.split} | ${r.fieldMiss} | ${r.deadProse} | ${r.vacuous} |`);
writeFileSync(resolve(__dirname, '../../../../scripts/reasoning-map/gate-health-scorecard.md'), out.join('\n') + '\n');
writeFileSync(resolve(__dirname, '../../../../scripts/reasoning-map/gate-rehomes.json'), JSON.stringify(rehome, null, 1));
writeFileSync(resolve(__dirname, '../../../../scripts/reasoning-map/gate-decisions.json'), JSON.stringify(decisions, null, 1));
// eslint-disable-next-line no-console
console.log(`\n[gate-health] ${cleanStds}/${rows.length} clean; ${rehome.length} re-homes, ${decisions.length} owner items`);

describe('gate-health harness', () => {
  it('classifies every enforcing gate in the corpus', () => {
    expect(totalGates).toBeGreaterThan(500);
  });
  it('every re-home target is a real worksheet in the same standard', () => {
    expect(rehome.every((h) => h.toWs && h.toWs !== '?')).toBe(true);
  });
  it('sanity: extractConditionSymbols agrees with evaluateCondition on parse-ability', () => {
    // a clean numeric gate parses (symbols non-null); a prose gate is null
    expect(extractConditionSymbols('a >= b')).not.toBeNull();
    expect(evaluateCondition('a >= b', () => undefined).kind).toBe('pending');
  });
});
