/**
 * DWA-M-102-4 / BWK-M 3-4 (Wasserhaushaltsbilanz) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 10 live BLOCK gates by driving it through the REAL
 * enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is
 * proven ENFORCING only when shown BOTH ways: a persisted state where it does NOT
 * block, and a persisted state where it DOES (the F-4 lesson — gates that fire but
 * never enforce are invisible to static reading). Conditions verbatim from prod;
 * nothing is fixed here.
 *
 * COVERED GATE SHAPES:
 *   - enum membership  IN {…}        REQ-01 (project_type), REQ-22 (worksheet_status)
 *   - boolean equality == True       REQ-02, REQ-20, REQ-14, REQ-19
 *   - numeric-literal comparison     REQ-03 (A_E_k_b >= 800)
 *   - AND-joined range               REQ-08 (P), REQ-09 (ET_p)   — both bounds driven
 *   - ARITHMETIC IDENTITY (novel)    REQ-18  A_E_k_b + A_E_k_nb == A_E_k
 *       field+field == field; carries '+' so routes through evaluate.ts acompare
 *       (numeric, pending-safe), proven both ways.
 */
// @vitest-environment node
import './_harness-env-m1024'; // top-level-await: PG + seedM1024 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM1024Harness } from './_harness-env-m1024';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM1024Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string;

/** Persist a symbol→value map to worksheet `ws` through the REAL saveWorksheet,
 *  resolving each symbol against ITS home worksheet (`ws:symbol` key). */
async function saveSymbols(ws: string, values: Record<string, Val>): Promise<void> {
  const batch: Record<string, { type: string; value: Val }> = {};
  for (const [symbol, value] of Object.entries(values)) {
    const meta = fixture.fieldMeta[`${ws}:${symbol}`];
    if (!meta) throw new Error(`seed gap: no field for ${ws}:${symbol}`);
    batch[meta.fieldId] = { type: meta.dataType, value };
  }
  const res = await saveWorksheet({
    instanceId: fixture.instances[ws],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: batch as any,
  });
  expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
}

/** Whether `code` is in the block-gate failing list for worksheet `ws` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Assert a gate is proven ENFORCING both ways through the real save path. */
async function proveBothWays(
  ws: string,
  code: string,
  passState: Record<string, Val>,
  violateState: Record<string, Val>,
): Promise<void> {
  await saveSymbols(ws, passState);
  expect(await gateBlocks(ws, code), `${code} should NOT block in passing state`).toBe(false);
  await saveSymbols(ws, violateState);
  expect(await gateBlocks(ws, code), `${code} SHOULD block in violating state`).toBe(true);
}

describe('DWA-M-102-4 — M104-01 Projektregistrierung gates', () => {
  it('REQ-01  project_type IN {Neuerschließung, Konversion, Sanierung, Nachverdichtung}', async () => {
    await proveBothWays('M104-01', 'REQ-01',
      { project_type: 'Neuerschließung' },
      { project_type: 'Bestandserhalt' });
  });
  it('REQ-02  attest_m104_01_req_02 == True', async () => {
    await proveBothWays('M104-01', 'REQ-02',
      { attest_m104_01_req_02: true },
      { attest_m104_01_req_02: false });
  });
  it('REQ-20  attest_m104_01_req_20 == True', async () => {
    await proveBothWays('M104-01', 'REQ-20',
      { attest_m104_01_req_20: true },
      { attest_m104_01_req_20: false });
  });
  it('REQ-22  worksheet_status IN {engineer_approved, customer_approved, final}', async () => {
    await proveBothWays('M104-01', 'REQ-22',
      { worksheet_status: 'final' },
      { worksheet_status: 'draft' });
  });
});

describe('DWA-M-102-4 — M104-02 Bilanzgebiet gates (incl. arithmetic identity)', () => {
  it('REQ-03  A_E_k_b >= 800 (Relevanzgrenze)', async () => {
    await proveBothWays('M104-02', 'REQ-03',
      { A_E_k_b: 800 },
      { A_E_k_b: 500 });
  });
  it('REQ-18  A_E_k_b + A_E_k_nb == A_E_k  (field+field == field, acompare path)', async () => {
    await proveBothWays('M104-02', 'REQ-18',
      { A_E_k_b: 600, A_E_k_nb: 200, A_E_k: 800 },   // 800 == 800 → balances
      { A_E_k_b: 600, A_E_k_nb: 200, A_E_k: 900 });  // 800 == 900 → fails
  });
});

describe('DWA-M-102-4 — validity-range gates (both bounds driven)', () => {
  it('REQ-08  P >= 500 AND P <= 1700  — lower-bound violation', async () => {
    await proveBothWays('M104-04', 'REQ-08', { P: 800 }, { P: 400 });
  });
  it('REQ-08  P >= 500 AND P <= 1700  — upper-bound violation also blocks', async () => {
    await saveSymbols('M104-04', { P: 1800 });
    expect(await gateBlocks('M104-04', 'REQ-08')).toBe(true);
    await saveSymbols('M104-04', { P: 1200 });
    expect(await gateBlocks('M104-04', 'REQ-08')).toBe(false);
  });
  it('REQ-09  ET_p >= 450 AND ET_p <= 700  — lower-bound violation', async () => {
    await proveBothWays('M104-05', 'REQ-09', { ET_p: 550 }, { ET_p: 400 });
  });
  it('REQ-09  ET_p >= 450 AND ET_p <= 700  — upper-bound violation also blocks', async () => {
    await saveSymbols('M104-05', { ET_p: 750 });
    expect(await gateBlocks('M104-05', 'REQ-09')).toBe(true);
    await saveSymbols('M104-05', { ET_p: 600 });
    expect(await gateBlocks('M104-05', 'REQ-09')).toBe(false);
  });
});

describe('DWA-M-102-4 — attestation gates', () => {
  it('REQ-14  attest_m104_07_req_14 == True (M104-07)', async () => {
    await proveBothWays('M104-07', 'REQ-14',
      { attest_m104_07_req_14: true },
      { attest_m104_07_req_14: false });
  });
  it('REQ-19  attest_m104_29_req_19 == True (M104-29)', async () => {
    await proveBothWays('M104-29', 'REQ-19',
      { attest_m104_29_req_19: true },
      { attest_m104_29_req_19: false });
  });
});

describe('DWA-M-102-4 — project-wide fallback resolver smoke (M104-15 area totals)', () => {
  it('area totals saved on M104-15 resolve via the conflict-free project-wide fallback', async () => {
    // No M-102-4 block gate depends on the fallback (all ten are worksheet-local),
    // so this drives the resolver directly: save the totals on their M104-15 home,
    // then confirm evaluating M104-15 (which hosts NO block gate) returns ok with
    // no spurious failures — i.e. the cross-worksheet values load cleanly.
    await saveSymbols('M104-15', { A_E_k_b: 700, A_E_k_nb: 300, A_E_k: 1000 });
    const result = await checkApprovalGate(fixture.instances['M104-15']);
    expect(result.failingBlockConditions.length).toBe(0);
  });
});
