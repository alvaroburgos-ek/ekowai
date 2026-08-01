/**
 * DWA-A-201 (Abwasserteiche) — REAL save-path execution proof.
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
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts) — local field
 * symbols plus the conflict-free project-wide fallback, so cross-worksheet guards
 * (absetz_vorstufe on A201-02, A_EW_unbelueftet on A201-10, Q_M on A201-04,
 * k_f_boden/klueftiger_untergrund on A201-06, BSB5/CSB_grenzwert on A201-01) resolve
 * exactly as in production. A gate is proven ENFORCING only when it is shown BOTH
 * ways: a persisted state where it does NOT block, and a persisted state where it
 * DOES (the F-4 lesson — gates that fire but never enforce are invisible to static
 * reading). Conditions are verbatim from prod; nothing is fixed here.
 *
 * STANDOUT FINDING (CR-006): the condition
 *   IF absetz_vorstufe == true  THEN A_EW_unbelueftet >= 8
 *   AND IF absetz_vorstufe == false THEN A_EW_unbelueftet >= 10
 * has NO parentheses, so evaluate.ts parses it as
 *   IF absetz==true THEN ( A_EW>=8 AND ( IF absetz==false THEN A_EW>=10 ) )
 * — the second implication is NESTED inside the first's THEN. When absetz==false
 * the OUTER guard is vacuously true and the whole gate passes regardless of
 * A_EW_unbelueftet, so the F-07 requirement (≥10 with no Absetzteich) NEVER
 * enforces. Proven below by executing all four states; see the four-state block.
 */
// @vitest-environment node
import './_harness-env-a201'; // top-level-await: PG + seedA201 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA201Harness } from './_harness-env-a201';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA201Harness();

// The db-touching server actions are imported AFTER _harness-env's top-level
// await set DATABASE_URL, so @/lib/db connects to the harness Postgres.
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

/**
 * Persist a symbol→value map through the REAL saveWorksheet, partitioned by each
 * symbol's home worksheet (saveWorksheet only accepts fields of the addressed
 * instance's template). Value `type` is taken from the field's real data_type.
 */
async function saveSymbols(values: Record<string, Val>): Promise<void> {
  const byWs = new Map<string, Record<string, { type: string; value: Val }>>();
  for (const [symbol, value] of Object.entries(values)) {
    const meta = fixture.fieldMeta[symbol];
    if (!meta) throw new Error(`seed gap: no field for symbol ${symbol}`);
    const batch = byWs.get(meta.ws) ?? {};
    batch[meta.fieldId] = { type: meta.dataType, value };
    byWs.set(meta.ws, batch);
  }
  for (const [ws, batch] of byWs) {
    const res = await saveWorksheet({
      instanceId: fixture.instances[ws],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values: batch as any,
    });
    expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
  }
}

/** Returns whether `code` is in the block-gate failing list for worksheet `ws`
 * given the CURRENT persisted project state (the real approval-gate read path). */
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
  await saveSymbols(passState);
  expect(await gateBlocks(ws, code), `${code} should NOT block in passing state`).toBe(false);
  await saveSymbols(violateState);
  expect(await gateBlocks(ws, code), `${code} SHOULD block in violating state`).toBe(true);
}

describe('DWA-A-201 — 9 well-formed BLOCK gates proven ENFORCING both-ways through the REAL saveWorksheet + checkApprovalGate', () => {
  it('A201-01 CR-001  abwasser_typ IN {haeuslich, gewerblich_vergleichbar}', async () => {
    await proveBothWays('A201-01', 'CR-001',
      { abwasser_typ: 'haeuslich' },
      { abwasser_typ: 'industriell' });
  });

  it('A201-05 CR-002  EW_BSB5 <= 5000', async () => {
    await proveBothWays('A201-05', 'CR-002', { EW_BSB5: 4000 }, { EW_BSB5: 6000 });
  });

  it('A201-08 CR-004  V_erf_grobstoff >= Q_M * t_R_M and t_R_M == 0.5  (Q_M cross-ws A201-04)', async () => {
    // Q_M=100, t_R_M=0.5 → threshold 50. pass: V=60; violate: V=40 (< 50).
    await proveBothWays('A201-08', 'CR-004',
      { V_erf_grobstoff: 60, Q_M: 100, t_R_M: 0.5 },
      { V_erf_grobstoff: 40, Q_M: 100, t_R_M: 0.5 });
  });

  it('A201-09 CR-005  V_EW_absetz>=0.5 AND V_schlammraum_absetz>=0.15 AND t_R_absetz>=1 AND v_strom_absetz<=0.05', async () => {
    const good = { V_EW_absetz: 0.6, V_schlammraum_absetz: 0.2, t_R_absetz: 1.5, v_strom_absetz: 0.04 };
    await proveBothWays('A201-09', 'CR-005', good, { ...good, v_strom_absetz: 0.08 });
  });

  it('A201-11 CR-007  B_R_BSB<=25 AND t_R_belueftet>=5 AND OV_C_BSB>=1.5 AND P_R>=1 AND P_R<=3', async () => {
    const good = { B_R_BSB: 20, t_R_belueftet: 6, OV_C_BSB: 2, P_R: 2 };
    await proveBothWays('A201-11', 'CR-007', good, { ...good, P_R: 4 });
  });

  it('A201-12 CR-008  t_R_nachklaer>=1 AND A_min_nachklaer>=20 AND h_nachklaer>=1.2', async () => {
    const good = { t_R_nachklaer: 1.5, A_min_nachklaer: 25, h_nachklaer: 1.5 };
    await proveBothWays('A201-12', 'CR-008', good, { ...good, h_nachklaer: 1.0 });
  });

  it('A201-15 CR-010  IF (k_f_boden>=k_f_sealing_threshold OR klueftiger_untergrund==true) THEN dichtung_erforderlich==true  (guard-true both ways; k_f_boden/klueftiger cross-ws A201-06)', async () => {
    // Guard true via klueftiger_untergrund=true. pass: dichtung=true; violate: dichtung=false.
    await proveBothWays('A201-15', 'CR-010',
      { k_f_boden: 1e-9, k_f_sealing_threshold: 1e-8, klueftiger_untergrund: true, dichtung_erforderlich: true },
      { k_f_boden: 1e-9, k_f_sealing_threshold: 1e-8, klueftiger_untergrund: true, dichtung_erforderlich: false });
  });

  it('A201-19 CR-013  min_wasser_ueber_schlamm_absetz>=1.0 AND min_wasser_ueber_schlamm_nachklaer>=0.9', async () => {
    await proveBothWays('A201-19', 'CR-013',
      { min_wasser_ueber_schlamm_absetz: 1.2, min_wasser_ueber_schlamm_nachklaer: 1.0 },
      { min_wasser_ueber_schlamm_absetz: 0.8, min_wasser_ueber_schlamm_nachklaer: 1.0 });
  });

  it('A201-20 CR-014  BSB5_ablauf<=BSB5_grenzwert AND CSB_ablauf<=CSB_grenzwert  (grenzwerte cross-ws A201-01)', async () => {
    await proveBothWays('A201-20', 'CR-014',
      { BSB5_ablauf: 20, BSB5_grenzwert: 25, CSB_ablauf: 80, CSB_grenzwert: 90 },
      { BSB5_ablauf: 30, BSB5_grenzwert: 25, CSB_ablauf: 80, CSB_grenzwert: 90 });
  });
});

describe('DWA-A-201 — CR-006 four-state execution: the mis-structured IF/THEN-AND gate (STANDOUT)', () => {
  // Gate host A201-08; absetz_vorstufe home A201-02; A_EW_unbelueftet home A201-10.
  // Both guard symbols are cross-worksheet → resolved via the project-wide fallback.
  // Condition (verbatim):
  //   IF absetz_vorstufe == true  THEN A_EW_unbelueftet >= 8
  //   AND IF absetz_vorstufe == false THEN A_EW_unbelueftet >= 10
  // Parsed (no parens): IF absetz==true THEN (A_EW>=8 AND (IF absetz==false THEN A_EW>=10)).

  it('State 1 — Absetzteich present (absetz=true), A_EW=8 → PASSES (F-08 ≥8 satisfied): NOT blocked', async () => {
    await saveSymbols({ absetz_vorstufe: true, A_EW_unbelueftet: 8 });
    expect(await gateBlocks('A201-08', 'CR-006')).toBe(false);
  });

  it('State 2 — Absetzteich present (absetz=true), A_EW=7 → VIOLATES F-08 (<8): DOES block (definite fail)', async () => {
    await saveSymbols({ absetz_vorstufe: true, A_EW_unbelueftet: 7 });
    expect(await gateBlocks('A201-08', 'CR-006')).toBe(true);
  });

  it('State 3 — No Absetzteich (absetz=false), A_EW=10 → PASSES (F-07 ≥10 satisfied): NOT blocked', async () => {
    await saveSymbols({ absetz_vorstufe: false, A_EW_unbelueftet: 10 });
    expect(await gateBlocks('A201-08', 'CR-006')).toBe(false);
  });

  it('State 4 — No Absetzteich (absetz=false), A_EW=9 → violates F-07 (<10): BLOCKS (FIXED via explicit parens)', async () => {
    // REPRODUCTION CHECK (source-settled fix, §5.3 "sind mit A_EW ≥ 10 zu bemessen"):
    // Broken-before was proven with the unparenthesised condition (State 4 did NOT block).
    // Fixed-after: seed CR-006 now uses `(IF absetz==true THEN A_EW>=8) AND
    // (IF absetz==false THEN A_EW>=10)` — two independent guards. When absetz==false the
    // first guard is vacuously true and the SECOND enforces A_EW>=10, so 9<10 now BLOCKS.
    await saveSymbols({ absetz_vorstufe: false, A_EW_unbelueftet: 9 });
    expect(
      await gateBlocks('A201-08', 'CR-006'),
      'CR-006 fixed — F-07 (≥10 when absetz=false) now enforces through the real save path',
    ).toBe(true);
  });
});
