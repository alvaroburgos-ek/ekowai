import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateFormula } from '../../eval/formula';
import { evaluateCondition } from '../evaluate';

/**
 * CORPUS READY-TO-USE HARNESS (Wizard roadmap Stage 6 — "golden tests"; Iteration-2 backlog #1/#2).
 *
 * "Ready to use" for the COMPUTE LAYER of a guideline means, per the Wizard roadmap:
 *   - every encoded equation either COMPUTES or is an honest engine-gap (manual) — it never
 *     HARD-ERRORS (a malformed formula that crashes the engine is a broken worksheet), and
 *   - every block/warn gate PARSES to a real, enforcing condition — it is not dead prose that
 *     silently never fires.
 *
 * This test drives the REAL engine (evaluateFormula + evaluateCondition) over the committed
 * prod snapshot and:
 *   1. asserts a true invariant — the engine never THROWS (structured result only);
 *   2. asserts the roadmap PRIORITY standards (the ones that gate the real V1.5 deliverable)
 *      are compute-ready (0 equation hard-errors);
 *   3. writes a full per-standard readiness scorecard to disk for the audit.
 *
 * When this is green, the priority standards are ready and a future edit cannot silently
 * reintroduce a hard-error equation or dead gate on them without turning it red.
 */

type StdBucket = {
  standard: { code: string };
  equations: Array<{ id: string; formula: string; input_symbols: string[] | null; output_symbol: string }>;
  compliance: Array<{ code: string; condition: string | null; severity: string | null }>;
};
type Snapshot = { exported_at: string; standards: Record<string, StdBucket> };

const SNAP_PATH = resolve(__dirname, '../../../../scripts/reasoning-map/snapshot/encoding-snapshot.json');
const snap = JSON.parse(readFileSync(SNAP_PATH, 'utf8')) as Snapshot;

// Roadmap priority: these gate the real paid deliverable (V1.5 Versickerung) and must be ready first.
const PRIORITY = ['DWA-A-138-1', 'DIN-18130-1'];
const TESTVAL = 2; // safe positive input for every symbol (avoids /0 and stays in log/exp domains)

type EqClass = 'computed' | 'manual' | 'error';
function classifyEquation(eq: StdBucket['equations'][number]): EqClass {
  const syms = eq.input_symbols ?? [];
  const inputs = syms.map((s) => ({ symbol: s, value: TESTVAL, unit: null }));
  try {
    const r = evaluateFormula({
      equationId: eq.id,
      formula: eq.formula,
      inputSymbols: syms,
      outputSymbol: eq.output_symbol,
      inputs,
    });
    if (r.kind === 'computed') return 'computed';
    if (r.kind === 'manual_required') return 'manual';
    return 'error';
  } catch {
    engineThrew++; // engine THREW instead of returning a structured result — invariant violation
    return 'error';
  }
}

let engineThrew = 0;

// A gate is "dead" when it has a non-empty condition that the engine cannot parse into a real
// check (returns 'manual' on an empty lookup — i.e. prose / unsupported grammar). A well-formed
// gate returns 'pending' on an empty lookup (it needs inputs), which is healthy.
function isDeadGate(cr: StdBucket['compliance'][number]): boolean {
  const c = (cr.condition ?? '').trim();
  if (!c) return false; // empty condition = intentional manual attestation, not dead
  const r = evaluateCondition(c, () => undefined);
  return r.kind === 'manual';
}

type Row = {
  code: string;
  eqTotal: number; eqComputed: number; eqManual: number; eqError: number;
  gates: number; deadGates: number;
  readyCompute: boolean; // 0 equation hard-errors
};

const rows: Row[] = [];

for (const [code, bucket] of Object.entries(snap.standards)) {
  const eqs = bucket.equations ?? [];
  let eqComputed = 0, eqManual = 0, eqError = 0;
  for (const eq of eqs) {
    const cls = classifyEquation(eq);
    if (cls === 'computed') eqComputed++;
    else if (cls === 'manual') eqManual++;
    else eqError++;
  }
  const gates = (bucket.compliance ?? []).filter((c) => (c.severity ?? '') !== '');
  let deadGates = 0;
  for (const cr of bucket.compliance ?? []) if (isDeadGate(cr)) deadGates++;
  rows.push({
    code,
    eqTotal: eqs.length, eqComputed, eqManual, eqError,
    gates: gates.length, deadGates,
    readyCompute: eqError === 0,
  });
}

rows.sort((a, b) => (a.readyCompute === b.readyCompute ? b.eqError - a.eqError : a.readyCompute ? 1 : -1));

// Write the scorecard for the human audit.
const readyCount = rows.filter((r) => r.readyCompute).length;
const lines: string[] = [];
lines.push(`# CORPUS READY-TO-USE SCORECARD`);
lines.push(`snapshot exported_at: ${snap.exported_at}`);
lines.push(`compute-ready (0 equation hard-errors): ${readyCount} / ${rows.length} standards`);
lines.push('');
lines.push(`| standard | eq | computed | manual(gap) | ERROR | gates | dead-gates | compute-ready |`);
lines.push(`|---|--:|--:|--:|--:|--:|--:|:--:|`);
for (const r of rows) {
  lines.push(
    `| ${r.code} | ${r.eqTotal} | ${r.eqComputed} | ${r.eqManual} | ${r.eqError} | ` +
      `${r.gates} | ${r.deadGates} | ${r.readyCompute ? '✅' : '❌'} |`,
  );
}
const OUT = resolve(__dirname, '../../../../scripts/reasoning-map/ready-to-use-scorecard.md');
writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
// eslint-disable-next-line no-console
console.log(`\n[ready-to-use] ${readyCount}/${rows.length} compute-ready; scorecard → ${OUT}`);

describe('corpus ready-to-use harness (real engine over the prod snapshot)', () => {
  it('INVARIANT: evaluateFormula never throws — it returns a structured result for every encoded equation', () => {
    expect(engineThrew).toBe(0);
  });

  it('the corpus scorecard covers every encoded standard', () => {
    expect(rows.length).toBeGreaterThanOrEqual(70);
    expect(rows.every((r) => r.code.length > 0)).toBe(true);
  });

  for (const code of PRIORITY) {
    it(`PRIORITY (${code}) is compute-ready: no equation hard-errors + no dead gates`, () => {
      const r = rows.find((x) => x.code === code);
      expect(r, `${code} present in snapshot`).toBeDefined();
      expect(r!.eqError, `${code} equation hard-errors`).toBe(0);
      expect(r!.deadGates, `${code} dead gates`).toBe(0);
    });
  }

  it('a majority of the corpus is compute-ready (regression floor)', () => {
    // Records the current floor; a code/data change that pushes more standards below it fails here.
    expect(readyCount).toBeGreaterThanOrEqual(Math.ceil(rows.length * 0.5));
  });
});
