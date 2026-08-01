/**
 * DWA-M-816 (dynamische Kostenvergleichsrechnung; Weißdruck Oktober 2021) —
 * REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES each
 * of the standard's 10 live BLOCK gates (non-empty condition) by driving it through
 * the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists
 *                                      the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and
 * a persisted state where it DOES (the F-4 lesson). Conditions verbatim from prod;
 * nothing is applied to prod here.
 *
 * COVERED GATE SHAPES:
 *   - membership IN {…}                      REQ-01 (investment_type), REQ-03 (evaluation_basis)
 *   - enum equality (bare-ident RHS)         REQ-02 (methodology_confirmation)
 *   - boolean/attestation equality           REQ-05 (attest), REQ-14 body (flag)
 *   - numeric threshold                      REQ-04 (alternative_count >= 2)
 *   - guarded IF … THEN (quoted-string+exists) REQ-09 (discounting_method / Bundesbank date)
 *   - AND of threshold + existence           REQ-11 (vorlauf_v / p_v_percent), cross-ws fallback
 *   - guarded IF … THEN (flag AND exists)    REQ-14 (partial replication), cross-ws fallback
 *   - existence                              REQ-26 (gesamtbeurteilung IS NOT EMPTY)
 *   - NESTED double-IF (engine hole exposed) REQ-13 (n = max(n_a, n_b))
 */
// @vitest-environment node
import './_harness-env-m816'; // top-level-await: PG + seedM816 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM816Harness } from './_harness-env-m816';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM816Harness();

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

/** Persist a symbol→value map to worksheet `ws` through the REAL saveWorksheet,
 *  resolving each symbol against ITS home worksheet (`ws:symbol` key). A null value
 *  clears the field. */
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

type Save = { ws: string; values: Record<string, Val> };
async function applySaves(saves: Save[]): Promise<void> {
  for (const s of saves) await saveSymbols(s.ws, s.values);
}

/** Whether `code` is in the block-gate failing list for worksheet `ws` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked;
 *  persist the violating saves → blocked (definite fail). Saves may span multiple
 *  worksheets (cross-worksheet fallback gates). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
}

describe('DWA-M-816 — M816-01 Projektregistrierung (Anwendungsbereich + Methodik)', () => {
  it('REQ-01  investment_type IN {ersatz, erneuerung}', async () => {
    await proveBothWays('M816-01', 'REQ-01',
      [{ ws: 'M816-01', values: { investment_type: 'ersatz' } }],
      [{ ws: 'M816-01', values: { investment_type: 'sanierung' } }]);
  });
  it('REQ-01  ALSO passes the erneuerung branch', async () => {
    await saveSymbols('M816-01', { investment_type: 'erneuerung' });
    expect(await gateBlocks('M816-01', 'REQ-01')).toBe(false);
    await saveSymbols('M816-01', { investment_type: 'neubau' });
    expect(await gateBlocks('M816-01', 'REQ-01')).toBe(true);
  });
  it('REQ-02  methodology_confirmation == dyn_cost_comp_arbf (bare-ident enum RHS)', async () => {
    await proveBothWays('M816-01', 'REQ-02',
      [{ ws: 'M816-01', values: { methodology_confirmation: 'dyn_cost_comp_arbf' } }],
      [{ ws: 'M816-01', values: { methodology_confirmation: 'kvr_leitlinien_classic' } }]);
  });
  it('REQ-03  evaluation_basis IN {nominal, real}', async () => {
    await proveBothWays('M816-01', 'REQ-03',
      [{ ws: 'M816-01', values: { evaluation_basis: 'nominal' } }],
      [{ ws: 'M816-01', values: { evaluation_basis: 'gemischt' } }]);
  });
  it('REQ-05  attest_m816_01_req_05 == True', async () => {
    await proveBothWays('M816-01', 'REQ-05',
      [{ ws: 'M816-01', values: { attest_m816_01_req_05: true } }],
      [{ ws: 'M816-01', values: { attest_m816_01_req_05: false } }]);
  });
});

describe('DWA-M-816 — M816-02 Investitionsalternativen', () => {
  it('REQ-04  alternative_count >= 2 (numeric threshold)', async () => {
    await proveBothWays('M816-02', 'REQ-04',
      [{ ws: 'M816-02', values: { alternative_count: 2 } }],
      [{ ws: 'M816-02', values: { alternative_count: 1 } }]);
  });
});

describe('DWA-M-816 — M816-04 Finanzmarktparameter (durationsabh. Abzinsung → Bundesbank-Kurve)', () => {
  it('REQ-09  IF discounting_method=="duration_dep" THEN bundesbank_reference_date IS NOT NULL', async () => {
    await proveBothWays('M816-04', 'REQ-09',
      [{ ws: 'M816-04', values: { discounting_method: 'duration_dep', bundesbank_reference_date: '2020-12-31' } }],
      [{ ws: 'M816-04', values: { bundesbank_reference_date: null } }]);
  });
  it('REQ-09  vacuously passes when discounting_method != duration_dep (guard false)', async () => {
    await saveSymbols('M816-04', { discounting_method: 'kvr_flat_3', bundesbank_reference_date: null });
    expect(await gateBlocks('M816-04', 'REQ-09')).toBe(false);
  });
});

describe('DWA-M-816 — M816-08 Nutzungsdauer & Betrachtungszeitraum (n = max(n_a, n_b))', () => {
  // ── DEFECT (REVERSAL — flagged, NOT fixed) ─────────────────────────────────
  // Condition (verbatim prod): `IF n_a >= n_b THEN n_observation_period == n_a
  //   AND IF n_b >= n_a THEN n_observation_period == n_b`
  // Intended rule §4.4.1: the common Betrachtungszeitraum = the LONGER usage life
  //   (n = max(n_a, n_b)). The encoding cannot enforce it, for TWO reasons:
  //   (1) BARE-IDENT-RHS TRAP on `==`: the engine routes only ORDERING operators
  //       (<,<=,>,>=) var-vs-var to the numeric path; `==`/`!=` keep legacy
  //       string-literal-RHS semantics (evaluate.ts L241-258). So
  //       `n_observation_period == n_a` compares the NUMBER n_obs to the STRING
  //       "n_a" → equals(10,"n_a") is always false → the THEN-body is always false.
  //   (2) MISSING PARENTHESES: the second `IF` nests inside the first IF's THEN
  //       body, so when n_a < n_b the OUTER guard is false → vacuous pass.
  // Net demonstrated behaviour: the gate blocks IFF (n_a >= n_b), completely
  // INDEPENDENT of n_observation_period — it never checks n = max at all.
  // Proposed source-settled fix (drafted, on sign-off sheet, NOT applied):
  //   `(IF n_a - n_b >= 0 THEN n_observation_period - n_a == 0) AND
  //    (IF n_b - n_a >= 0 THEN n_observation_period - n_b == 0)`
  //   — the `-` forces the numeric acompare path AND the parentheses un-nest the
  //   two guards. Changing a gate's enforcement is a judgment item → owner ruling.
  it('REQ-13  [DEFECT] over-blocks on n_a>=n_b even when n_obs is the correct max', async () => {
    await saveSymbols('M816-08', { n_a: 10, n_b: 5, n_observation_period: 10 });
    // n_obs = 10 = max(10,5) IS correct, yet the `==`"n_a" string trap → blocks.
    expect(await gateBlocks('M816-08', 'REQ-13')).toBe(true);
  });
  it('REQ-13  [DEFECT] blocks identically for a WRONG n_obs — verdict ignores n_obs', async () => {
    await saveSymbols('M816-08', { n_a: 10, n_b: 5, n_observation_period: 99 });
    expect(await gateBlocks('M816-08', 'REQ-13')).toBe(true);
  });
  it('REQ-13  [DEFECT] vacuous-pass hole: n_a<n_b passes regardless of n_obs (missing parens)', async () => {
    await saveSymbols('M816-08', { n_a: 5, n_b: 10, n_observation_period: 5 }); // WRONG (should be 10)
    expect(await gateBlocks('M816-08', 'REQ-13')).toBe(false);
    await saveSymbols('M816-08', { n_observation_period: 10 }); // CORRECT
    expect(await gateBlocks('M816-08', 'REQ-13')).toBe(false); // still not blocked — never checked
  });
});

describe('DWA-M-816 — M816-19 Durationsberechnung (cross-worksheet fallback gates)', () => {
  it('REQ-11  vorlauf_v >= 0 AND p_v_percent IS NOT NULL (both via fallback)', async () => {
    await proveBothWays('M816-19', 'REQ-11',
      [{ ws: 'M816-21', values: { vorlauf_v: 15 } }, { ws: 'M816-09', values: { p_v_percent: 1.5 } }],
      // negative Vorlauf → threshold fails → block
      [{ ws: 'M816-21', values: { vorlauf_v: -1 } }]);
  });
  it('REQ-11  ALSO blocks when p_v_percent is cleared (existence arm)', async () => {
    await applySaves([{ ws: 'M816-21', values: { vorlauf_v: 0 } }, { ws: 'M816-09', values: { p_v_percent: 2 } }]);
    expect(await gateBlocks('M816-19', 'REQ-11')).toBe(false);
    await saveSymbols('M816-09', { p_v_percent: null });
    expect(await gateBlocks('M816-19', 'REQ-11')).toBe(true);
  });
  // REQ-14 body ARM genuinely enforces both ways (flag + n_tr existence). The GUARD,
  // however, is defective — see the [DEFECT] test below.
  it('REQ-14  body enforces: flag+n_tr present → pass; flag cleared → block (differing lives)', async () => {
    await proveBothWays('M816-19', 'REQ-14',
      [{ ws: 'M816-08', values: { n_a: 30, n_b: 25, n_observation_period: 30 } },
       { ws: 'M816-02', values: { partial_replication_flag: true, alternative_count: 2 } },
       { ws: 'M816-22', values: { n_tr: 4 } }],
      // differing lives but replication not flagged → body fails → block
      [{ ws: 'M816-02', values: { partial_replication_flag: false, alternative_count: 2 } }]);
  });
  // ── DEFECT (REVERSAL — flagged, NOT fixed) ─────────────────────────────────
  // Condition (verbatim prod): `IF n_a != n_b THEN partial_replication_flag == TRUE
  //   AND n_tr IS NOT NULL`. The guard `n_a != n_b` hits the BARE-IDENT-RHS TRAP:
  //   `!=` keeps string-literal-RHS semantics, so it compares the NUMBER n_a to the
  //   STRING "n_b" → always true → the guard NEVER goes vacuously false. Result: the
  //   replication requirement (flag+n_tr) is imposed even when n_a == n_b, i.e. when
  //   no Teilreplikation is needed (§4.4.2 applies only for n_a != n_b).
  // Proposed source-settled fix (drafted, sign-off sheet, NOT applied):
  //   `IF n_a - n_b != 0 THEN partial_replication_flag == TRUE AND n_tr IS NOT NULL`
  //   — the `-` forces the numeric acompare path so the guard truly compares n_a to n_b.
  it('REQ-14  [DEFECT] guard never vacuous: blocks at n_a==n_b with flag=false (no replication needed)', async () => {
    await applySaves([
      { ws: 'M816-08', values: { n_a: 25, n_b: 25, n_observation_period: 25 } },
      { ws: 'M816-02', values: { partial_replication_flag: false, alternative_count: 2 } },
    ]);
    // Equal lives → §4.4.2 does NOT require replication → SHOULD be vacuous pass,
    // but the `!=`"n_b" string trap keeps the guard true → gate blocks.
    expect(await gateBlocks('M816-19', 'REQ-14')).toBe(true);
  });
});

describe('DWA-M-816 — M816-30 Gesamtbeurteilung', () => {
  it('REQ-26  gesamtbeurteilung IS NOT EMPTY', async () => {
    await proveBothWays('M816-30', 'REQ-26',
      [{ ws: 'M816-30', values: { gesamtbeurteilung: 'Empfehlung: Alternative A (niedrigster PBW).' } }],
      [{ ws: 'M816-30', values: { gesamtbeurteilung: null } }]);
  });
});
