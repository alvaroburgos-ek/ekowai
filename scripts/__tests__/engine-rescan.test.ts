/**
 * ENGINE-GAP RE-SCAN (2026-08-01) — READ-ONLY.
 *
 * Replays the REAL engine-entry path (normalizeFormula -> RHS extraction ->
 * evalExpression) over every prod `equations` row (pulled 2026-08-01 into
 * scripts/engine-rescan-data/chunk-*.json) with a synthetic scope where every
 * input symbol = 2.0. Purpose: after arithmetic.ts gained 1-arg
 * ln/log10/sqrt/exp/abs this morning, determine which formulas FLIPPED from
 * engine-gap to computable.
 *
 * CAVEAT: synthetic-scope evaluation proves PARSEABILITY + evaluability, NOT
 * numerical correctness. A COMPUTES verdict means "the engine can parse and
 * evaluate this expression", not "the result is the right number".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evalExpression, SUPPORTED_FUNCTIONS } from '../../src/lib/eval/arithmetic';
import { normalizeFormula, normalizeSymbols } from '../../src/lib/eval/normalize-formula';
import { equationProfiles } from '../../src/lib/eval/equation-profiles';
import { aggregators } from '../../src/lib/eval/aggregators';
import { rewriteRules } from '../../src/lib/eval/rewrites';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(HERE, '../engine-rescan-data');
const OUT_JSON = resolve(HERE, '../engine-rescan-2026-08-01.results.json');

type Row = {
  id: string;
  std: string;
  gl: string;
  f: string;
  ins: string[] | null;
  out: string;
};

/** Mirror of the (non-exported) rhs() helper in src/lib/eval/formula.ts. */
function rhs(formula: string): string {
  const flat = formula.replace(/\s+/g, ' ');
  const m = flat.match(/^\s*[A-Za-z_][\w()]*\s*(?:>=|<=|=|>|<)\s*(.+)\s*$/);
  return (m ? m[1] : flat).trim();
}

/** The 5 functions arithmetic.ts gained this morning. */
const NEW_FUNCS = ['ln', 'log10', 'sqrt', 'exp', 'abs'] as const;
const NEW_FUNC_CALL = /(?<![A-Za-z0-9_])(ln|log10|sqrt|exp|abs)\s*\(/g;
/** Any function-call token in the (normalized) RHS. */
const ANY_CALL = /(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;

type Verdict =
  | 'COMPUTES'
  | 'COMPUTES_NONFINITE'
  | 'MANUAL_FN'
  | 'MANUAL_OTHER'
  | 'AGGREGATOR';

type Result = Row & {
  verdict: Verdict;
  rhs: string;
  normalized: string;
  error?: string;
  flipped: boolean;
  flipFuncs: string[];
  missingFuncs: string[]; // unsupported call tokens found in the RHS
};

function loadRows(): Row[] {
  const files = readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('chunk-') && f.endsWith('.json'))
    .sort();
  const rows: Row[] = [];
  for (const file of files) {
    const arr = JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf8')) as Row[];
    rows.push(...arr);
  }
  return rows;
}

function classify(row: Row): Result {
  const base = { ...row, rhs: '', normalized: '', flipped: false, flipFuncs: [] as string[], missingFuncs: [] as string[] };

  // Aggregator path — the real engine bypasses arithmetic entirely.
  if (aggregators[row.id]) {
    return { ...base, verdict: 'AGGREGATOR' };
  }

  // rewriteRules is currently empty; mirror the real engine anyway.
  const rewrite = rewriteRules[row.id];
  const formulaInUse = rewrite ? rewrite.to : row.f;

  const profile = equationProfiles[row.id];
  const rhsStr = rhs(formulaInUse);
  const normalized = normalizeFormula(rhsStr);
  base.rhs = rhsStr;
  base.normalized = normalized;

  // Collect unsupported function tokens present in the normalized RHS.
  const calls = new Set<string>();
  for (const m of normalized.matchAll(ANY_CALL)) calls.add(m[1]);
  base.missingFuncs = [...calls].filter((c) => !SUPPORTED_FUNCTIONS.has(c));

  // Which of the 5 new funcs are called (as real calls) in this RHS.
  const flipFuncs = new Set<string>();
  for (const m of normalized.matchAll(NEW_FUNC_CALL)) flipFuncs.add(m[1]);
  base.flipFuncs = [...flipFuncs];

  // Build the synthetic scope: every (normalized) input symbol = 2.0, plus
  // any profile constants (e.g. pi), exactly as formula.ts assembles scope.
  const scope: Record<string, number> = {};
  const symbolsNeeded = rewrite
    ? Object.values(rewrite.remap)
    : normalizeSymbols(row.ins ?? []);
  for (const s of symbolsNeeded) scope[s] = 2.0;
  if (profile?.constants) Object.assign(scope, profile.constants);

  try {
    const val = evalExpression(normalized, scope);
    // evalExpression already throws on non-finite; a finite return is COMPUTES.
    const verdict: Verdict = Number.isFinite(val) ? 'COMPUTES' : 'COMPUTES_NONFINITE';
    // FLIP: computes now AND uses one of the 5 new funcs (which would have
    // thrown "Funktionsaufruf ... nicht unterstützt" before this morning).
    const flipped = verdict === 'COMPUTES' && flipFuncs.size > 0;
    return { ...base, verdict, flipped, flipFuncs: [...flipFuncs] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let verdict: Verdict;
    if (/Funktionsaufruf/.test(msg)) {
      verdict = 'MANUAL_FN';
    } else if (/Nicht-endliches Ergebnis|Division durch Null/.test(msg)) {
      // Parsed + evaluated fully; only a synthetic-scope domain artifact.
      verdict = 'COMPUTES_NONFINITE';
    } else {
      verdict = 'MANUAL_OTHER';
    }
    return { ...base, verdict, error: msg };
  }
}

describe('engine-gap re-scan 2026-08-01', () => {
  it('re-scans the corpus and writes results JSON + prints the summary', () => {
    const rows = loadRows();
    const results = rows.map(classify);

    // ---- Per-standard tallies ------------------------------------------------
    type Tally = {
      eq: number;
      computes: number;
      nonfinite: number;
      manualFn: number;
      manualOther: number;
      aggregator: number;
      flipped: number;
    };
    const byStd = new Map<string, Tally>();
    const flippedList: Result[] = [];
    const missingFreq = new Map<string, number>();

    for (const r of results) {
      const t =
        byStd.get(r.std) ??
        { eq: 0, computes: 0, nonfinite: 0, manualFn: 0, manualOther: 0, aggregator: 0, flipped: 0 };
      t.eq++;
      if (r.verdict === 'COMPUTES') t.computes++;
      else if (r.verdict === 'COMPUTES_NONFINITE') t.nonfinite++;
      else if (r.verdict === 'MANUAL_FN') t.manualFn++;
      else if (r.verdict === 'MANUAL_OTHER') t.manualOther++;
      else if (r.verdict === 'AGGREGATOR') t.aggregator++;
      if (r.flipped) {
        t.flipped++;
        flippedList.push(r);
      }
      byStd.set(r.std, t);
      // Remaining missing-function frequency (only for rows that did NOT compute).
      if (r.verdict === 'MANUAL_FN' || r.verdict === 'MANUAL_OTHER') {
        for (const fn of r.missingFuncs) missingFreq.set(fn, (missingFreq.get(fn) ?? 0) + 1);
      }
    }

    const totals = {
      eq: results.length,
      computes: results.filter((r) => r.verdict === 'COMPUTES').length,
      nonfinite: results.filter((r) => r.verdict === 'COMPUTES_NONFINITE').length,
      manualFn: results.filter((r) => r.verdict === 'MANUAL_FN').length,
      manualOther: results.filter((r) => r.verdict === 'MANUAL_OTHER').length,
      aggregator: results.filter((r) => r.verdict === 'AGGREGATOR').length,
      flipped: flippedList.length,
    };

    const missingSorted = [...missingFreq.entries()].sort((a, b) => b[1] - a[1]);

    // ---- Persist -------------------------------------------------------------
    writeFileSync(
      OUT_JSON,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          totals,
          perStandard: [...byStd.entries()].sort().map(([std, t]) => ({ std, ...t })),
          flipped: flippedList.map((r) => ({ std: r.std, gl: r.gl, id: r.id, funcs: r.flipFuncs, formula: r.f })),
          missingFuncFreq: missingSorted.map(([fn, n]) => ({ fn, n })),
          manualOther: results
            .filter((r) => r.verdict === 'MANUAL_OTHER')
            .map((r) => ({ std: r.std, gl: r.gl, id: r.id, formula: r.f, error: r.error })),
        },
        null,
        2,
      ),
      'utf8',
    );

    // ---- Print ---------------------------------------------------------------
    /* eslint-disable no-console */
    console.log('\n=== ENGINE RE-SCAN TOTALS ===');
    console.log(JSON.stringify(totals));
    console.log('\n=== FLIPPED (engine-gap -> computable) ===');
    for (const r of flippedList) console.log(`${r.std} | ${r.gl} | ${r.flipFuncs.join(',')} | ${r.f}`);
    console.log('\n=== REMAINING MISSING-FUNCTION FREQUENCY (non-computing rows) ===');
    for (const [fn, n] of missingSorted) console.log(`${fn}: ${n}`);
    console.log('\n=== PER-STANDARD (only standards with flips or manual gaps) ===');
    for (const [std, t] of [...byStd.entries()].sort()) {
      if (t.flipped > 0 || t.manualFn > 0 || t.manualOther > 0) {
        console.log(
          `${std}: eq=${t.eq} computes=${t.computes} nonfinite=${t.nonfinite} manual_fn=${t.manualFn} manual_other=${t.manualOther} aggregator=${t.aggregator} flipped=${t.flipped}`,
        );
      }
    }
    /* eslint-enable no-console */

    expect(results.length).toBe(730);
  });
});
