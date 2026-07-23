/**
 * FLL revision · MILESTONE 1 · KNOWN ITEM #1 — Q_NOT through the REAL saveWorksheet.
 *
 * Drives the FLL-GAR-27 Notüberlauf calculation (Anhang 1, Gl. 1) through the
 * SAME two seams the browser uses:
 *   1. the REAL client compute — `evaluateFormula` (use-equation-engine.ts:485
 *      calls this exact function) against the DB equation formula + resolved
 *      inputs, to obtain the value the client write-back would enqueue;
 *   2. the REAL `saveWorksheet` (imported, run against a disposable embedded
 *      Postgres) with that computed Q_NOT in the payload.
 *
 * This is the 138 discipline: an acceptance that passes on a path the UI doesn't
 * use is false confidence. Here BOTH the compute (evaluateFormula) and the persist
 * (saveWorksheet) are the production code paths.
 *
 * KNOWN ITEM #1 — the C=0,82 correction:
 *   The live project f7249ae1… has the equation-consumed field `C` = 0.83, which
 *   persists the WRONG Q_NOT = 5.237382. The correct abflussbeiwert is 0.82 (it is
 *   present but stranded in the decoy twin `C_abflusswert`). With C = 0.82 the
 *   chain yields Q_NOT = 5.274728. This test asserts the corrected chain (GREEN)
 *   AND the current wrong chain (RED) so the number is genuinely discriminating.
 */
// @vitest-environment node
import './_harness-env-fll'; // top-level-await: starts PG + seeds BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllHarness } from './_harness-env-fll';
import { evaluateFormula } from '@/lib/eval/formula';
import { GAR_GL1_QNOT_EQ, GAR_GL1_FORMULA, GAR27, expectedQNot } from './seed-fll-gar27';

const { harness, fixture } = getFllHarness();
const sql = harness.sql;

afterAll(async () => {
  await harness.stop();
});

/** Compute Q_NOT the way the real client engine does: the exact evaluateFormula
 *  call, with the equation's input symbols + resolved values (r_5_100, r_5_5, C,
 *  A). Returns the computed number or throws if the engine did not compute. */
function clientComputesQNot(C: number): number {
  const state = evaluateFormula({
    equationId: GAR_GL1_QNOT_EQ,
    formula: GAR_GL1_FORMULA,
    inputSymbols: ['r_5_100', 'r_5_5', 'C', 'A'],
    outputSymbol: 'Q_NOT',
    inputs: [
      { symbol: 'r_5_100', value: GAR27.r_5_100, unit: 'l/(s·ha)' },
      { symbol: 'r_5_5', value: GAR27.r_5_5, unit: 'l/(s·ha)' },
      { symbol: 'C', value: C, unit: '-' },
      { symbol: 'A', value: GAR27.A, unit: 'm^2' },
    ],
  });
  if (state.kind !== 'computed') {
    throw new Error(`engine did not compute Q_NOT: ${state.kind} ${JSON.stringify(state)}`);
  }
  return state.value;
}

async function persistedQNot(): Promise<number | null> {
  const [row] = await sql<{ value_number: string | null; source_type: string }[]>`
    SELECT value_number, source_type FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fixture.qNotFieldId}`;
  return row?.value_number == null ? null : Number(row.value_number);
}

async function saveQNot(C: number, computed: number) {
  const { saveWorksheet } = await import('@/lib/actions/worksheet');
  // The client save carries the engineer-entered C AND the engine's Q_NOT
  // write-back — exactly the payload the browser sends on a Notüberlauf edit.
  return saveWorksheet({
    instanceId: fixture.gar27InstanceId,
    values: {
      [fixture.cFieldId]: { type: 'number', value: C },
      [fixture.qNotFieldId]: { type: 'number', value: computed },
    },
  });
}

describe('FLL-GAR-27 Q_NOT — real client-compute + real saveWorksheet (embedded Postgres)', () => {
  it('the real engine reproduces the equation exactly for both C values', () => {
    // Guards the assertion targets against formula drift.
    expect(clientComputesQNot(GAR27.C_CORRECT)).toBeCloseTo(expectedQNot(GAR27.C_CORRECT), 9);
    expect(clientComputesQNot(GAR27.C_WRONG)).toBeCloseTo(expectedQNot(GAR27.C_WRONG), 9);
    expect(expectedQNot(GAR27.C_CORRECT)).toBeCloseTo(5.274728, 6); // KNOWN ITEM #1 target
    expect(expectedQNot(GAR27.C_WRONG)).toBeCloseTo(5.237382, 6);   // current wrong value
  });

  it('RED — current chain (C=0,83) persists the WRONG Q_NOT = 5.237382', async () => {
    const computed = clientComputesQNot(GAR27.C_WRONG);
    const res = await saveQNot(GAR27.C_WRONG, computed);
    expect(res.ok).toBe(true);
    const q = await persistedQNot();
    expect(q).not.toBeNull();
    expect(q!).toBeCloseTo(5.237382, 6);
    // Prove the target is NOT already satisfied by the wrong C (discrimination).
    expect(Math.abs(q! - 5.274728)).toBeGreaterThan(0.03);
  });

  it('GREEN — corrected chain (C=0,82) drives Q_NOT = 5.274728 through the REAL save path', async () => {
    const computed = clientComputesQNot(GAR27.C_CORRECT);
    const res = await saveQNot(GAR27.C_CORRECT, computed);
    expect(res.ok).toBe(true);
    const q = await persistedQNot();
    expect(q).not.toBeNull();
    // KNOWN ITEM #1 acceptance — Q_NOT = 5,274728 (± float epsilon) through
    // real client-compute (evaluateFormula) + real saveWorksheet.
    expect(q!).toBeCloseTo(5.274728, 6);
  });
});
