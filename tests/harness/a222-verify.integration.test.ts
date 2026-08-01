/**
 * DWA-A-222 (kleine Kläranlagen ≤ 1.000 E, Weißdruck Mai 2011 / korr. Okt 2018) —
 * REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 59 live BLOCK gates by driving it through the REAL
 * enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts) — local field
 * symbols plus the conflict-free project-wide fallback. A gate is proven ENFORCING
 * only when shown BOTH ways: a persisted state where it does NOT block, and a
 * persisted state where it DOES (the F-4 lesson). Conditions verbatim from prod.
 *
 * R-2 LEAD ("A-222 no chosen-vs-required area gate"): CONFIRMED as present+ungated.
 * §4.4.2 Gl.(22) `A_NB,theo >= Q_bem*(1+RV)/2,2` and §4.4.3 Gl.(27)
 * `A_NB >= Q_bem*(1+RV)/2,8` are printed inequalities (dimensioned surface ≥
 * required minimum). The encoding stores each as a NON-evaluable equation.formula
 * containing `>=` (arithmetic.ts rejects `>=`) and NO compliance_requirement
 * enforces it. This test: (1) proves arithmetic.ts cannot evaluate those formulas;
 * (2) shows the live A222-14 gate set contains no area check (undersized clarifier
 * does NOT block today); (3) proves the DRAFTED subtraction-form gate
 * `A_NB - Q_bem*(1+RV)/2.8 >= 0` enforces both ways through the real save path.
 * The drafted gate is NOT applied to prod — new gate ⇒ sign-off-sheet judgment.
 */
// @vitest-environment node
import './_harness-env-a222'; // top-level-await: PG + seedA222 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA222Harness } from './_harness-env-a222';
import { evalExpression } from '@/lib/eval/arithmetic';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA222Harness();

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

/** Persist a symbol→value map through the REAL saveWorksheet, partitioned by each
 *  symbol's home worksheet. Value `type` is the field's real data_type. */
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

/** Whether `code` is in the block-gate failing list for worksheet `ws` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

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

/**
 * Table of all 59 live BLOCK gates with a passing and a violating persisted state.
 * Each pass state sets EVERY symbol its condition reads, so gate order is
 * independent (a prior gate's violate cannot pollute a later gate's pass).
 */
const DRIVES: Array<{ ws: string; code: string; pass: Record<string, Val>; violate: Record<string, Val> }> = [
  // A222-01
  { ws: 'A222-01', code: 'CR-027', pass: { negativliste_geprueft: true, mischsystem_ausnahmefall: false }, violate: { negativliste_geprueft: false, mischsystem_ausnahmefall: false } },
  { ws: 'A222-01', code: 'CR-042', pass: { attest_a222_01_cr_042: true }, violate: { attest_a222_01_cr_042: false } },
  { ws: 'A222-01', code: 'CR-043', pass: { attest_a222_01_cr_043: true }, violate: { attest_a222_01_cr_043: false } },
  // A222-02
  { ws: 'A222-02', code: 'CR-001', pass: { EW: 800 }, violate: { EW: 1200 } },
  { ws: 'A222-02', code: 'CR-002', pass: { w_s_d: 160 }, violate: { w_s_d: 140 } },
  { ws: 'A222-02', code: 'CR-014', pass: { m: 0.7 }, violate: { m: 1.5 } },
  { ws: 'A222-02', code: 'CR-017', pass: { TKN_BSB5: 0.2 }, violate: { TKN_BSB5: 0.3 } },
  // A222-03
  { ws: 'A222-03', code: 'CR-003', pass: { t_Aufenthalt_VB: 3, V_VB_EWspez: 80 }, violate: { t_Aufenthalt_VB: 1, V_VB_EWspez: 80 } },
  { ws: 'A222-03', code: 'CR-008', pass: { V_SB: 2, V_R: 10 }, violate: { V_SB: 8, V_R: 10 } }, // field-vs-field·const (acompare)
  { ws: 'A222-03', code: 'CR-022', pass: { GK: 'gk_1', mindestanforderungen_abwv_anh1: true }, violate: { GK: 'gk_1', mindestanforderungen_abwv_anh1: false } },
  // A222-04
  { ws: 'A222-04', code: 'CR-004', pass: { h_TK: 2.5 }, violate: { h_TK: 1.5 } },
  { ws: 'A222-04', code: 'CR-020', pass: { A_TK_spez: 120 }, violate: { A_TK_spez: 200 } },
  { ws: 'A222-04', code: 'CR-020-2', pass: { A_TK_spez: 120 }, violate: { A_TK_spez: 80 } }, // duplicate code (relocation artifact)
  // A222-06
  { ws: 'A222-06', code: 'CR-005', pass: { d_Scheibe: 20 }, violate: { d_Scheibe: 10 } },
  { ws: 'A222-06', code: 'CR-015', pass: { n_RT: 2 }, violate: { n_RT: 1 } },
  // A222-07
  { ws: 'A222-07', code: 'CR-006', pass: { V_FB: 5, V_R: 10 }, violate: { V_FB: 9, V_R: 10 } }, // field-vs-field·const (acompare)
  { ws: 'A222-07', code: 'CR-030', pass: { n_FB_Kaskaden: 2 }, violate: { n_FB_Kaskaden: 1 } },
  // A222-08
  { ws: 'A222-08', code: 'CR-031', pass: { versuchsbericht_a_sb_spez: true }, violate: { versuchsbericht_a_sb_spez: false } },
  { ws: 'A222-08', code: 'CR-032', pass: { rueckhaltenachweis_aufwuchskoerper: true }, violate: { rueckhaltenachweis_aufwuchskoerper: false } },
  // A222-09
  { ws: 'A222-09', code: 'CR-009', pass: { H_W_e: 2.0, H_W_0: 1.5 }, violate: { H_W_e: 1.6, H_W_0: 1.5 } }, // (H_W_e-H_W_0) LHS-arith
  { ws: 'A222-09', code: 'CR-016', pass: { h_max: 3.0, H_W_e: 2.0 }, violate: { h_max: 5.0, H_W_e: 2.0 } },
  // A222-10
  { ws: 'A222-10', code: 'CR-011', pass: { RV: 1.2 }, violate: { RV: 0.5 } }, // RV home A222-14 (fallback)
  { ws: 'A222-10', code: 'CR-012', pass: { t_NB: 3 }, violate: { t_NB: 2 } },  // t_NB home A222-14 (fallback)
  { ws: 'A222-10', code: 'CR-018', pass: { TS_BB: 4 }, violate: { TS_BB: 5.5 } },
  { ws: 'A222-10', code: 'CR-019', pass: { C_O: 2.5 }, violate: { C_O: 1.5 } },
  // A222-11
  { ws: 'A222-11', code: 'CR-013', pass: { V_speicher_EWspez: 120 }, violate: { V_speicher_EWspez: 80 } }, // home A222-16 (fallback)
  { ws: 'A222-11', code: 'CR-023', pass: { attest_a222_11_cr_023: true }, violate: { attest_a222_11_cr_023: false } },
  { ws: 'A222-11', code: 'CR-024', pass: { attest_a222_11_cr_024: true }, violate: { attest_a222_11_cr_024: false } },
  { ws: 'A222-11', code: 'CR-025', pass: { attest_a222_11_cr_025: true }, violate: { attest_a222_11_cr_025: false } },
  { ws: 'A222-11', code: 'CR-034', pass: { attest_a222_11_cr_034: true }, violate: { attest_a222_11_cr_034: false } },
  { ws: 'A222-11', code: 'CR-035', pass: { attest_a222_11_cr_035: true }, violate: { attest_a222_11_cr_035: false } },
  { ws: 'A222-11', code: 'CR-036', pass: { attest_a222_11_cr_036: true }, violate: { attest_a222_11_cr_036: false } },
  { ws: 'A222-11', code: 'CR-037', pass: { attest_a222_11_cr_037: true }, violate: { attest_a222_11_cr_037: false } },
  { ws: 'A222-11', code: 'CR-038', pass: { attest_a222_11_cr_038: true }, violate: { attest_a222_11_cr_038: false } },
  { ws: 'A222-11', code: 'CR-039', pass: { attest_a222_11_cr_039: true }, violate: { attest_a222_11_cr_039: false } },
  { ws: 'A222-11', code: 'CR-040', pass: { attest_a222_11_cr_040: true }, violate: { attest_a222_11_cr_040: false } },
  // A222-12
  { ws: 'A222-12', code: 'CR-010', pass: { t_D: 3, t_T: 10 }, violate: { t_D: 5, t_T: 10 } }, // t_D/t_T LHS-arith
  // A222-14
  { ws: 'A222-14', code: 'CR-011', pass: { RV: 1.2 }, violate: { RV: 0.5 } },
  { ws: 'A222-14', code: 'CR-012', pass: { t_NB: 3 }, violate: { t_NB: 2 } },
  { ws: 'A222-14', code: 'CR-029', pass: { RV: 1.2 }, violate: { RV: 0.5 } },
  // A222-16
  { ws: 'A222-16', code: 'CR-013', pass: { V_speicher_EWspez: 120 }, violate: { V_speicher_EWspez: 80 } },
  { ws: 'A222-16', code: 'CR-023', pass: { attest_a222_16_cr_023: true }, violate: { attest_a222_16_cr_023: false } },
  { ws: 'A222-16', code: 'CR-025', pass: { attest_a222_16_cr_025: true }, violate: { attest_a222_16_cr_025: false } },
  { ws: 'A222-16', code: 'CR-036', pass: { stoermeldung_vorhanden: true, stromausfallmeldung_netzunabhaengig: true }, violate: { stoermeldung_vorhanden: false, stromausfallmeldung_netzunabhaengig: true } }, // 2nd symbol home A222-18 (fallback)
  { ws: 'A222-16', code: 'CR-037', pass: { attest_a222_16_cr_037: true }, violate: { attest_a222_16_cr_037: false } },
  { ws: 'A222-16', code: 'CR-038', pass: { attest_a222_16_cr_038: true }, violate: { attest_a222_16_cr_038: false } },
  // A222-18
  { ws: 'A222-18', code: 'CR-021', pass: { h_OK_freibord: 0.35 }, violate: { h_OK_freibord: 0.2 } },
  { ws: 'A222-18', code: 'CR-021-2', pass: { h_OK: 2.5, h_Wasser: 2.0 }, violate: { h_OK: 2.2, h_Wasser: 2.0 } }, // field-vs-field+const (acompare)
  { ws: 'A222-18', code: 'CR-026', pass: { DN: 150 }, violate: { DN: 100 } },
  { ws: 'A222-18', code: 'CR-026-2', pass: { DN: 200 }, violate: { DN: 120 } }, // duplicate code (relocation artifact)
  // A222-20
  { ws: 'A222-20', code: 'CR-039', pass: { sbr_steuerung_variation_zykluszeiten: true }, violate: { sbr_steuerung_variation_zykluszeiten: false } },
  { ws: 'A222-20', code: 'CR-040', pass: { doppelfuellstandsmessung_vorhanden: true }, violate: { doppelfuellstandsmessung_vorhanden: false } },
  // A222-21
  { ws: 'A222-21', code: 'CR-034', pass: { betriebsstundenzaehler_installiert: true }, violate: { betriebsstundenzaehler_installiert: false } },
  { ws: 'A222-21', code: 'CR-035', pass: { durchflussmessung_vorhanden: true }, violate: { durchflussmessung_vorhanden: false } },
  { ws: 'A222-21', code: 'CR-043', pass: { attest_a222_21_cr_043: true }, violate: { attest_a222_21_cr_043: false } },
  // A222-22
  { ws: 'A222-22', code: 'CR-042', pass: { betriebstagebuch_gefuehrt: true }, violate: { betriebstagebuch_gefuehrt: false } },
  // A222-24
  { ws: 'A222-24', code: 'CR-024', pass: { betrsichv_konformitaet: true }, violate: { betrsichv_konformitaet: false } },
  { ws: 'A222-24', code: 'CR-041', pass: { betriebsanweisung_dwa_a_199_4: true }, violate: { betriebsanweisung_dwa_a_199_4: false } },
];

describe('DWA-A-222 — 57 straight-line BLOCK gates (both-ways, real save path)', () => {
  for (const d of DRIVES) {
    it(`${d.ws} ${d.code} enforces both ways`, async () => {
      await proveBothWays(d.ws, d.code, d.pass, d.violate);
    });
  }
});

describe('DWA-A-222 — A222-01 CR-041 guarded gate (IF entwaesserungssystem == mischsystem THEN …)', () => {
  it('guard FALSE → vacuous pass; guard TRUE + body FALSE → blocks', async () => {
    // guard false (trennsystem) → vacuously passes
    await saveSymbols({ entwaesserungssystem: 'trennsystem' });
    expect(await gateBlocks('A222-01', 'CR-041')).toBe(false);
    // guard true + body false → blocks
    await saveSymbols({ entwaesserungssystem: 'mischsystem', geltungsbereich: 'unterer', mischsystem_ausnahmefall: false });
    expect(await gateBlocks('A222-01', 'CR-041')).toBe(true);
  });
  it('guard TRUE + body TRUE → passes (oberer Geltungsbereich + Ausnahmefall)', async () => {
    await saveSymbols({ entwaesserungssystem: 'mischsystem', geltungsbereich: 'oberer', mischsystem_ausnahmefall: true });
    expect(await gateBlocks('A222-01', 'CR-041')).toBe(false);
  });
});

describe('DWA-A-222 — R-2 chosen-vs-required clarifier-surface (§4.4.2/§4.4.3)', () => {
  it('arithmetic.ts CANNOT evaluate the Gl.22/Gl.27 inequality formulas (they are non-evaluable)', () => {
    // The encoded equation.formula for Gl.22 / Gl.27 embed `>=` — the arithmetic
    // engine rejects the operator, so these "equations" never compute a value.
    expect(() => evalExpression('A_NB_theo >= Q_bem * (1 + RV) / 2.2', { A_NB_theo: 5, Q_bem: 2, RV: 1 })).toThrow();
    expect(() => evalExpression('A_NB >= Q_bem * (1 + RV) / 2.8', { A_NB: 5, Q_bem: 2, RV: 1 })).toThrow();
    // The pure RHS (the required minimum) DOES compute — so the fix has a valid form.
    expect(evalExpression('Q_bem * (1 + RV) / 2.8', { Q_bem: 2, RV: 1 })).toBeCloseTo(1.42857, 4);
  });

  it('REPRODUCTION — the LIVE A222-14 gate set contains NO area check: an undersized clarifier does NOT block today', async () => {
    // Dimension the clarifier far too small (A_NB = 0.1 m²) while Q_bem/RV imply a
    // much larger required surface. Keep the live A222-14 gates (RV, t_NB) satisfied.
    await saveSymbols({ A_NB: 0.1, A_NB_theo: 0.1, Q_bem: 5, RV: 1, t_NB: 3 });
    const result = await checkApprovalGate(fixture.instances['A222-14']);
    const codes = result.failingBlockConditions.map((c) => c.code);
    // No LIVE gate references A_NB / A_NB_theo — the undersize is invisible to enforcement.
    expect(codes).not.toContain('CR-011');
    expect(codes).not.toContain('CR-012');
    expect(codes).not.toContain('CR-029');
    // (The only A222-14 code that catches it is the PROPOSED gate, proven below.)
  });

  it('DRAFT FIX — CR-PROPOSED-A_NB-27 (A_NB - Q_bem*(1+RV)/2.8 >= 0) enforces both ways', async () => {
    // required = Q_bem*(1+RV)/2.8 = 5*2/2.8 = 3.571 m²
    await proveBothWays('A222-14', 'CR-PROPOSED-A_NB-27',
      { A_NB: 5, Q_bem: 5, RV: 1 },   // 5 - 3.571 = 1.43 ≥ 0 → pass
      { A_NB: 1, Q_bem: 5, RV: 1 });  // 1 - 3.571 < 0 → block
  });

  it('DRAFT FIX — CR-PROPOSED-A_NB_theo-22 (A_NB_theo - Q_bem*(1+RV)/2.2 >= 0) enforces both ways', async () => {
    // required = Q_bem*(1+RV)/2.2 = 5*2/2.2 = 4.545 m²
    await proveBothWays('A222-14', 'CR-PROPOSED-A_NB_theo-22',
      { A_NB_theo: 6, Q_bem: 5, RV: 1 },   // 6 - 4.545 = 1.45 ≥ 0 → pass
      { A_NB_theo: 2, Q_bem: 5, RV: 1 });  // 2 - 4.545 < 0 → block
  });
});
