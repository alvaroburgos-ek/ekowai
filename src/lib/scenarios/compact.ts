import type { ScenarioRun } from './types';

/** A model-sized view of a run: one value or reason per equation, one verdict per gate, governing points per iteration. */
export function compactRun(run: ScenarioRun, includePerDuration: boolean) {
  return {
    caseId: run.caseId,
    converged: run.converged,
    mismatches: run.mismatches,
    notRecomputed: run.notRecomputed,
    skippedOverrides: run.skippedOverrides,
    sheets: Object.fromEntries(Object.entries(run.sheets).map(([code, s]) => [code, {
      hidden: s.hiddenSymbols,
      results: s.equations.map((e) => ({
        equation: `Gl. ${e.equationNumber}`,
        output: e.outputSymbol,
        value: e.state.kind === 'computed' ? e.state.value : null,
        note: e.state.kind === 'computed' ? (e.state.warnings?.join(' ') ?? null) : e.state.kind === 'error' ? e.state.message : e.state.reason,
      })),
      compliance: s.compliance.map((c) => ({ code: c.code, verdict: c.result.kind })),
    }])),
    iterations: run.iterations.map((it) => ({
      key: it.key, governingD: it.governingD, governingValue: it.governingValue, boundaryLimited: it.boundaryLimited,
      ...(includePerDuration ? { perDuration: it.perDuration } : {}),
    })),
  };
}
