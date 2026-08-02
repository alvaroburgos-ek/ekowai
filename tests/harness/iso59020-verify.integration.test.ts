/**
 * ISO 59020:2024 ("Circular economy — Measuring and assessing circularity
 * performance", First edition 2024-05) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner): "runnable" means RAN. This harness PROVES the encoding
 * end-to-end against a disposable embedded Postgres:
 *
 *  A. ENGINE SYMBOL-VERIFY — every one of the 13 Annex-A indicator equations is
 *     driven through the REAL `evaluateFormula`. ISO prints them with `mREUI(X)`
 *     paren notation and mixed `%REUI(X)`/`PRENI(X)` LHS symbols; the engine's
 *     `normalizeFormula` (ident(X)→ident_X) + `rhs()` (LHS strip) reduce each to a
 *     computable dot-decimal RHS over the declared underscore-form inputs → all 13
 *     COMPUTE. (Confirms no comma-decimal / unsupported-call NR among them.)
 *
 *  B. GATE EXECUTION PROOF — every one of the 13 live BLOCK gates is driven BOTH
 *     WAYS through the REAL `saveWorksheet` → `checkApprovalGate` chain: a persisted
 *     state that PASSES (gate absent from the block list) and one that VIOLATES
 *     (gate present → definite block). This catches the F-4 class (a gate that
 *     fires but never enforces). The 6 arithmetic-identity gates (CR-011..017) use
 *     `acompare`; the 2 balance gates (CR-014/019) sum-to-100; CR-018 is a proper
 *     `IS NOT NULL` existence AND; the rest are boolean attestations.
 *
 * SR-1: synthetic inputs test the ENCODING'S ARITHMETIC (does the engine reproduce
 * the printed formula), not a standard value. Formulas + conditions are VERBATIM
 * from prod; source anchors are the rendered Annex-A PDF (SR-3). Nothing is applied
 * to prod.
 */
// @vitest-environment node
import './_harness-env-iso59020'; // top-level-await: PG + seed BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO59020Harness } from './_harness-env-iso59020';
import { evaluateFormula } from '@/lib/eval/formula';
import { ISO59020_EQUATIONS, ISO59020_GATES } from './seed-iso59020';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO59020Harness();
const sql = harness.sql;

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null;

const BLOCK_GATES = ISO59020_GATES.filter((g) => g.sev === 'block');
const WARN_GATES = ISO59020_GATES.filter((g) => g.sev === 'warn');

// ─────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 59020 — seed sanity (9 worksheets, 13 block, 24 warn, 13 equations)', () => {
  it('seeds 9 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(9);
  });
  it('has 13 block gates + 24 warn gates verbatim from prod', () => {
    expect(BLOCK_GATES.length).toBe(13);
    expect(WARN_GATES.length).toBe(24);
  });
  it('has 13 equations', () => {
    expect(ISO59020_EQUATIONS.length).toBe(13);
  });
  it('no empty-condition BLOCK gate (empty conditions are all WARN)', () => {
    expect(BLOCK_GATES.filter((g) => g.cond.trim() === '').map((g) => g.code)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Engine-trap audit — BLOCK gates only (evaluate.ts + live prod strings)
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 59020 — BLOCK gates carry no engine-trap / no-op shape', () => {
  it('no != null / == null / != "" trap-2 shape in any BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
  });
  it('no literal-TRUE no-op, no IN, no IF/THEN in any BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => g.cond.trim().toUpperCase() === 'TRUE')).toBe(false);
    expect(BLOCK_GATES.some((g) => /\bIN\b/.test(g.cond))).toBe(false);
    expect(BLOCK_GATES.some((g) => /\bIF\b/.test(g.cond))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A. ENGINE SYMBOL-VERIFY — all 13 equations through the REAL evaluateFormula
// ─────────────────────────────────────────────────────────────────────────────
function runEq(num: string, inputs: Record<string, number>) {
  const e = ISO59020_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: `iso59020-${num}`, // synthetic id → no aggregator/rewrite registered
    formula: e.formula,
    inputSymbols: Object.keys(inputs),
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}
function expectComputed(num: string, inputs: Record<string, number>, expected: number, dp = 6) {
  const r = runEq(num, inputs);
  expect(r.kind, `${num} should compute, got ${JSON.stringify(r)}`).toBe('computed');
  if (r.kind === 'computed') expect(r.value).toBeCloseTo(expected, dp);
}

describe('ISO 59020 (A) — all 13 Annex-A indicator equations COMPUTE through the REAL engine', () => {
  it('A.1  %REUI(X) = (mREUI/mTI)·100      → 50', () => expectComputed('A.1', { mREUI_X: 50, mTI_X: 100 }, 50));
  it('A.2  %RECI(X) = (mRECI/mTI)·100      → 25', () => expectComputed('A.2', { mRECI_X: 25, mTI_X: 100 }, 25));
  it('A.3  PRENI(X) = (mRENI/mTI)·100      → 20 (printed P-prefix LHS stripped)', () => expectComputed('A.3', { mRENI_X: 20, mTI_X: 100 }, 20));
  it('A.4  RLP(X)   = tLP/tIALP            → 1.2', () => expectComputed('A.4', { tLP_X: 12, tIALP_X: 10 }, 1.2));
  it('A.5  PREUO(X) = (mREUO/mTO)·100      → 20', () => expectComputed('A.5', { mREUO_X: 40, mTO_X: 200 }, 20));
  it('A.6  PRECO(X) = (mRECO/mTO)·100      → 25', () => expectComputed('A.6', { mRECO_X: 50, mTO_X: 200 }, 25));
  it('A.7  PRENO(X) = (mRENO/mTO)·100      → 15', () => expectComputed('A.7', { mRENO_X: 30, mTO_X: 200 }, 15));
  it('A.8  PECONRE(X)=((EIRENE−EORENE)/(EITE−EOTE))·100 → 60', () => expectComputed('A.8', { EIRENE_X: 80, EORENE_X: 20, EITE_X: 200, EOTE_X: 100 }, 60));
  it('A.9  PCWW = (VCIW/VAIW)·100          → 40', () => expectComputed('A.9', { VCIW: 40, VAIW: 100 }, 40));
  it('A.10 PCDW = (VCDW/VAIW)·100          → 30', () => expectComputed('A.10', { VCDW: 30, VAIW: 100 }, 30));
  it('A.11 RWRR = VTWU/VTWW                → 1.2', () => expectComputed('A.11', { VTWU: 120, VTWW: 100 }, 1.2));
  it('A.12 RMP  = C/D                      → 2', () => expectComputed('A.12', { C: 1000, D: 500 }, 2));
  it('A.13 IRII = E/F                      → 0.5', () => expectComputed('A.13', { E: 3, F: 6 }, 0.5));

  it('every one of the 13 equations reaches kind=computed (no NR / comma-decimal / unsupported-call)', () => {
    const trivial: Record<string, number> = {
      mREUI_X: 1, mRECI_X: 1, mRENI_X: 1, mTI_X: 1, tLP_X: 1, tIALP_X: 1,
      mREUO_X: 1, mRECO_X: 1, mRENO_X: 1, mTO_X: 1,
      EIRENE_X: 3, EORENE_X: 1, EITE_X: 4, EOTE_X: 2, VCIW: 1, VAIW: 1, VCDW: 1,
      VTWU: 1, VTWW: 1, C: 1, D: 1, E: 1, F: 1,
    };
    const notComputed = ISO59020_EQUATIONS.filter((e) => {
      const inputs = Object.fromEntries(e.inputs.map((s) => [s, trivial[s]]));
      return runEq(e.num, inputs).kind !== 'computed';
    }).map((e) => e.num);
    expect(notComputed, `equations that did not compute: ${notComputed.join(', ')}`).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. GATE EXECUTION PROOF — real saveWorksheet → checkApprovalGate, both ways
// ─────────────────────────────────────────────────────────────────────────────
async function save(ws: string, values: Record<string, Val>): Promise<void> {
  const wsFields = fixture.fieldByWs[ws];
  const batch: Record<string, { type: string; value: Val }> = {};
  for (const [symbol, value] of Object.entries(values)) {
    const meta = wsFields?.[symbol];
    if (!meta) throw new Error(`seed gap: no field for ${symbol} on ${ws}`);
    batch[meta.fieldId] = { type: meta.dataType, value };
  }
  const res = await saveWorksheet({
    instanceId: fixture.instances[ws],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: batch as any,
  });
  expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
}
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

const DRIVEN = new Set<string>();
/** Prove a BLOCK gate ENFORCING both ways: a persisted PASS state (no block), then
 *  a persisted VIOLATE state (definite fail → block). */
async function proveBothWays(
  ws: string, code: string,
  passState: Record<string, Val>, violateState: Record<string, Val>,
): Promise<void> {
  DRIVEN.add(code);
  await save(ws, passState);
  expect(await gateBlocks(ws, code), `${code} should NOT block in passing state`).toBe(false);
  await save(ws, violateState);
  expect(await gateBlocks(ws, code), `${code} SHOULD block in violating state`).toBe(true);
}

describe('ISO 59020 (B) — 4 boolean-attestation BLOCK gates enforce both ways', () => {
  it('CR-005 all_flows_quantified == true            [ISO-59020-03]', async () =>
    proveBothWays('ISO-59020-03', 'CR-005', { all_flows_quantified: true }, { all_flows_quantified: false }));
  it('CR-006 resource_balance_applied == true        [ISO-59020-03]', async () =>
    proveBothWays('ISO-59020-03', 'CR-006', { resource_balance_applied: true }, { resource_balance_applied: false }));
  it('CR-009 mandatory_core_indicators_included == true [ISO-59020-04]', async () =>
    proveBothWays('ISO-59020-04', 'CR-009', { mandatory_core_indicators_included: true }, { mandatory_core_indicators_included: false }));
  it('CR-031 criteria_review_done == true            [ISO-59020-09]', async () =>
    proveBothWays('ISO-59020-09', 'CR-031', { criteria_review_done: true }, { criteria_review_done: false }));
});

describe('ISO 59020 (B) — 6 arithmetic-identity (acompare) BLOCK gates enforce both ways', () => {
  it('CR-011 pct_REUI_X == (mREUI_X/mTI_X)·100       [ISO-59020-05]', async () =>
    proveBothWays('ISO-59020-05', 'CR-011',
      { pct_REUI_X: 50, mREUI_X: 50, mTI_X: 100 }, { pct_REUI_X: 99, mREUI_X: 50, mTI_X: 100 }));
  it('CR-012 pct_RECI_X == (mRECI_X/mTI_X)·100       [ISO-59020-05]', async () =>
    proveBothWays('ISO-59020-05', 'CR-012',
      { pct_RECI_X: 25, mRECI_X: 25, mTI_X: 100 }, { pct_RECI_X: 99, mRECI_X: 25, mTI_X: 100 }));
  it('CR-013 pct_RENI_X == (mRENI_X/mTI_X)·100       [ISO-59020-05]', async () =>
    proveBothWays('ISO-59020-05', 'CR-013',
      { pct_RENI_X: 12.5, mRENI_X: 12.5, mTI_X: 100 }, { pct_RENI_X: 99, mRENI_X: 12.5, mTI_X: 100 }));
  it('CR-015 pct_REUO_X == (mREUO_X/mTO_X)·100       [ISO-59020-06]', async () =>
    proveBothWays('ISO-59020-06', 'CR-015',
      { pct_REUO_X: 50, mREUO_X: 50, mTO_X: 100 }, { pct_REUO_X: 99, mREUO_X: 50, mTO_X: 100 }));
  it('CR-016 pct_RECO_X == (mRECO_X/mTO_X)·100       [ISO-59020-06]', async () =>
    proveBothWays('ISO-59020-06', 'CR-016',
      { pct_RECO_X: 25, mRECO_X: 25, mTO_X: 100 }, { pct_RECO_X: 99, mRECO_X: 25, mTO_X: 100 }));
  it('CR-017 pct_RENO_X == (mRENO_X/mTO_X)·100       [ISO-59020-06]', async () =>
    proveBothWays('ISO-59020-06', 'CR-017',
      { pct_RENO_X: 12.5, mRENO_X: 12.5, mTO_X: 100 }, { pct_RENO_X: 99, mRENO_X: 12.5, mTO_X: 100 }));
});

describe('ISO 59020 (B) — 2 sum-to-100 balance BLOCK gates enforce both ways (Figures A.1/A.2)', () => {
  it('CR-014 pct_REUI+pct_RECI+pct_RENI+pct_linear_inflow == 100 [ISO-59020-05]', async () =>
    proveBothWays('ISO-59020-05', 'CR-014',
      { pct_REUI_X: 50, pct_RECI_X: 25, pct_RENI_X: 12.5, pct_linear_inflow: 12.5 },
      { pct_REUI_X: 50, pct_RECI_X: 25, pct_RENI_X: 12.5, pct_linear_inflow: 30 }));
  it('CR-019 pct_REUO+pct_RECO+pct_RENO+pct_linear_outflow == 100 [ISO-59020-06]', async () =>
    proveBothWays('ISO-59020-06', 'CR-019',
      { pct_REUO_X: 50, pct_RECO_X: 25, pct_RENO_X: 12.5, pct_linear_outflow: 12.5 },
      { pct_REUO_X: 50, pct_RECO_X: 25, pct_RENO_X: 12.5, pct_linear_outflow: 30 }));
});

describe('ISO 59020 (B) — the multi-field existence BLOCK gate enforces both ways', () => {
  it('CR-018 pct_REUO_X IS NOT NULL AND pct_RECO_X IS NOT NULL AND pct_RENO_X IS NOT NULL [ISO-59020-06]', async () =>
    proveBothWays('ISO-59020-06', 'CR-018',
      { pct_REUO_X: 50, pct_RECO_X: 25, pct_RENO_X: 12.5 },
      { pct_REUO_X: null, pct_RECO_X: 25, pct_RENO_X: 12.5 }));
});

// ─────────────────────────────────────────────────────────────────────────────
// WARN gates never appear in the approval-gate block set (even when violated)
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 59020 — representative WARN gates never block', () => {
  it('CR-004 (WARN, boolean) never blocks even when false', async () => {
    await save('ISO-59020-02', { all_stages_documented: false });
    expect(await gateBlocks('ISO-59020-02', 'CR-004')).toBe(false);
  });
  it('CR-026 (WARN, boolean) never blocks even when false', async () => {
    await save('ISO-59020-08', { system_breakdown_done: false });
    expect(await gateBlocks('ISO-59020-08', 'CR-026')).toBe(false);
  });
  it('CR-020 (WARN, arithmetic identity) never blocks even when the identity is violated', async () => {
    // ((80−20)/(200−100))·100 = 60; persist a contradicting pct_ECONRE_X.
    await save('ISO-59020-07', { pct_ECONRE_X: 999, EIRENE_X: 80, EORENE_X: 20, EITE_X: 200, EOTE_X: 100 });
    expect(await gateBlocks('ISO-59020-07', 'CR-020')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Persistence read-back + coverage
// ─────────────────────────────────────────────────────────────────────────────
describe('ISO 59020 — persistence read-back through the real save path', () => {
  it('a saved indicator value round-trips to project_parameters', async () => {
    await save('ISO-59020-05', { pct_REUI_X: 42.5 });
    const fid = fixture.fieldByWs['ISO-59020-05']['pct_REUI_X'].fieldId;
    const [row] = await sql<{ value_number: string | null }[]>`
      SELECT value_number FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
    expect(row?.value_number == null ? null : Number(row.value_number)).toBeCloseTo(42.5, 9);
  });
});

describe('ISO 59020 — all 13 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every one of the 13 block gate codes', () => {
    const blockCodes = BLOCK_GATES.map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(13);
  });
});
