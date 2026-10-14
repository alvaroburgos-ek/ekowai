// src/lib/scenarios/run-cases.ts
/**
 * Real + every case for one baseline (spec §3 step 7), with per-case containment (final review A2-I1 c): a case whose
 * run throws (e.g. a malformed stored override) becomes an error entry — Real and the other cases still compute.
 * Pure apart from logging; nothing persisted.
 */
import { runScenarioChain } from '@/lib/eval/scenario-chain';
import type { ScenarioBaseline } from './baseline';
import type { ScenarioResultsPayload, ScenarioRun, ScenarioSummary } from './types';

export const CASE_FAILED_MSG = 'Fall konnte nicht gerechnet werden.';

function failedRun(caseId: string): ScenarioRun {
  return { caseId, converged: false, passes: 0, values: {}, sheets: {}, iterations: [], mismatches: [], notRecomputed: [], skippedOverrides: [] };
}

export function runScenarioCases(baseline: ScenarioBaseline, summaries: readonly ScenarioSummary[]):
  { real: ScenarioRun; cases: ScenarioResultsPayload['cases'] } {
  const real = runScenarioChain(baseline, [], { caseId: 'real', approvalWithholding: 'bypass' });
  const cases = summaries.map((scenario) => {
    try {
      const run = runScenarioChain(
        baseline,
        scenario.overrides.filter((o) => o.standardCode === baseline.standardCode).map((o) => ({ fieldId: o.fieldId, value: o.value })),
        { caseId: scenario.id, approvalWithholding: 'bypass' },
      );
      return { scenario, run };
    } catch (e) {
      console.error(`[scenarios] case ${scenario.id} could not be computed`, e);
      return { scenario, run: failedRun(scenario.id), error: CASE_FAILED_MSG };
    }
  });
  return { real, cases };
}
