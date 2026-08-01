/**
 * DWA-M 187 (Retentionsbodenfilteranlagen — Sonderanwendungen; GELBDRUCK /
 * Entwurf, September 2025) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 13 live BLOCK gates (non-empty condition) by driving it
 * through the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is
 * proven ENFORCING only when shown BOTH ways: a persisted state where it does
 * NOT block, and a persisted state where it DOES (the F-4 lesson). Conditions
 * verbatim from prod; nothing is fixed here.
 *
 * COVERED GATE SHAPES:
 *   - enum membership IN {...}                       REQ-01 (M187-01, §1/§5)
 *   - boolean == True (attestation)                  REQ-07 (M187-04, M187-05, §4)
 *   - numeric ordering (literal RHS)                 REQ-02 h_FK≥1,0 · REQ-02-2 β≥4 · REQ-03 q_Dr≤0,03
 *   - numeric equality + ordering AND                REQ-04 (q_Dr==0,01 AND h_FK≥1,0; §5.3.3.1)
 *   - 4-term AND (CSB/750/qkrit/qA)                  REQ-05 + its byte-identical stray dup REQ-05-2 (§5.4)
 *   - 6-term AND (Klein-RBF Nachweis)                REQ-06 + its byte-identical stray dup REQ-06-2 (§5.5.4)
 *   - CROSS-WORKSHEET fallback                       REQ-03/REQ-04 on M187-07 (owns no fields)
 */
// @vitest-environment node
import './_harness-env-m187'; // top-level-await: PG + seedM187 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM187Harness } from './_harness-env-m187';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM187Harness();

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
 *  resolving each symbol against ITS home worksheet (`ws:symbol` key). A null
 *  value clears the field — used to VIOLATE existence gates. */
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
 *  persist the violating saves → blocked (definite fail). Saves may span
 *  multiple worksheets (cross-worksheet fallback gates). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code} SHOULD block in violating state`).toBe(true);
}

describe('DWA-M-187 — M187-01 Anwendungsbereich (applicability)', () => {
  it('REQ-01  sonderanwendung IN {p_rueckhalt,spurenstoffe,mikroorganismen,organische_belastung,klein_rbf} (§1/§5)', async () => {
    await proveBothWays('M187-01', 'REQ-01',
      [{ ws: 'M187-01', values: { sonderanwendung: 'p_rueckhalt' } }],
      [{ ws: 'M187-01', values: { sonderanwendung: 'sonstiges' } }]); // not one of the 5 → block
  });
  it('REQ-01  each of the five §5 special applications passes membership', async () => {
    for (const v of ['p_rueckhalt', 'spurenstoffe', 'mikroorganismen', 'organische_belastung', 'klein_rbf']) {
      await saveSymbols('M187-01', { sonderanwendung: v });
      expect(await gateBlocks('M187-01', 'REQ-01'), `${v} should be a member`).toBe(false);
    }
  });
});

describe('DWA-M-187 — attestation gates (§4 Grundvoraussetzungen Betrieb)', () => {
  it('REQ-07  attest_m187_04_req_07 == True (M187-04)', async () => {
    await proveBothWays('M187-04', 'REQ-07',
      [{ ws: 'M187-04', values: { attest_m187_04_req_07: true } }],
      [{ ws: 'M187-04', values: { attest_m187_04_req_07: false } }]);
  });
  it('REQ-07  attest_m187_05_req_07 == True (M187-05)', async () => {
    await proveBothWays('M187-05', 'REQ-07',
      [{ ws: 'M187-05', values: { attest_m187_05_req_07: true } }],
      [{ ws: 'M187-05', values: { attest_m187_05_req_07: false } }]);
  });
});

describe('DWA-M-187 — M187-05 P-Rückhalt Bemessung (§5.1)', () => {
  it('REQ-02  h_FK >= 1.0 (Filterkörperhöhe, §5.1.3.2 b: hFK ≥ 1,00 m)', async () => {
    await proveBothWays('M187-05', 'REQ-02',
      [{ ws: 'M187-05', values: { h_FK: 1.2 } }],
      [{ ws: 'M187-05', values: { h_FK: 0.8 } }]); // below 1,0 m → block
  });
  it('REQ-02-2  beta_wert >= 4 (Fällmittelmenge, §5.1.3.1 a: Beta-Wert ≥ 4)', async () => {
    await proveBothWays('M187-05', 'REQ-02-2',
      [{ ws: 'M187-05', values: { beta_wert: 5 } }],
      [{ ws: 'M187-05', values: { beta_wert: 3 } }]); // below 4 → block
  });
});

describe('DWA-M-187 — M187-06 Drossel gates (§5.2 Spurenstoffe / §5.3.3.1 Mikroorganismen)', () => {
  it('REQ-03  q_Dr_RBF <= 0.03 (§5.2: qDr,RBF ≤ 0,03 l/(s·m²))', async () => {
    await proveBothWays('M187-06', 'REQ-03',
      [{ ws: 'M187-06', values: { q_Dr_RBF: 0.02 } }],
      [{ ws: 'M187-06', values: { q_Dr_RBF: 0.05 } }]); // above 0,03 → block
  });
  it('REQ-04  q_Dr_RBF == 0.01 AND h_FK >= 1.0 (§5.3.3.1) — h_FK via cross-ws fallback (home M187-05)', async () => {
    // q_Dr_RBF local to M187-06; h_FK resolved project-wide from M187-05.
    await proveBothWays('M187-06', 'REQ-04',
      [
        { ws: 'M187-06', values: { q_Dr_RBF: 0.01 } },
        { ws: 'M187-05', values: { h_FK: 1.2 } },
      ],
      [{ ws: 'M187-06', values: { q_Dr_RBF: 0.02 } }]); // 0,02 != 0,01 → block
  });
  it('REQ-04  ALSO blocks when the fallback h_FK drops below 1,0 (q_Dr held at 0,01)', async () => {
    await saveSymbols('M187-06', { q_Dr_RBF: 0.01 });
    await saveSymbols('M187-05', { h_FK: 1.2 });
    expect(await gateBlocks('M187-06', 'REQ-04')).toBe(false);
    await saveSymbols('M187-05', { h_FK: 0.8 }); // fallback operand now violates
    expect(await gateBlocks('M187-06', 'REQ-04')).toBe(true);
  });
});

describe('DWA-M-187 — M187-07 SAME drossel gates, resolved PURELY via cross-worksheet fallback', () => {
  // M187-07 owns no fields; both operands resolve project-wide (q_Dr_RBF←M187-06, h_FK←M187-05).
  it('REQ-03  q_Dr_RBF <= 0.03 on a field-less worksheet (fallback from M187-06)', async () => {
    await proveBothWays('M187-07', 'REQ-03',
      [{ ws: 'M187-06', values: { q_Dr_RBF: 0.02 } }],
      [{ ws: 'M187-06', values: { q_Dr_RBF: 0.05 } }]);
  });
  it('REQ-04  q_Dr_RBF == 0.01 AND h_FK >= 1.0 — both operands via fallback', async () => {
    await proveBothWays('M187-07', 'REQ-04',
      [
        { ws: 'M187-06', values: { q_Dr_RBF: 0.01 } },
        { ws: 'M187-05', values: { h_FK: 1.2 } },
      ],
      [{ ws: 'M187-05', values: { h_FK: 0.5 } }]); // fallback h_FK < 1,0 → block
  });
});

describe('DWA-M-187 — M187-08 hohe organische Belastung (§5.4.3/5.4.4) + stray dup', () => {
  // REQ-05 and REQ-05-2 are byte-identical (R-2 "×2 dups" lead confirmed).
  const passSaves: Save[] = [{ ws: 'M187-08', values: { B_CSB: 18, A_F_pro_AEb: 800, q_krit: 60, q_A_max: 4 } }];
  it('REQ-05  B_CSB<=20 AND A_F_pro_AEb>=750 AND q_krit==60 AND q_A_max<=4', async () => {
    await proveBothWays('M187-08', 'REQ-05',
      passSaves,
      [{ ws: 'M187-08', values: { B_CSB: 25 } }]); // 25 > 20 g CSB/(m²·d) → block
  });
  it('REQ-05  ALSO blocks on each other term (750 / q_krit=60 / q_A,max=4)', async () => {
    await applySaves(passSaves);
    expect(await gateBlocks('M187-08', 'REQ-05')).toBe(false);
    await saveSymbols('M187-08', { A_F_pro_AEb: 700 }); // < 750 m²/ha
    expect(await gateBlocks('M187-08', 'REQ-05')).toBe(true);
    await saveSymbols('M187-08', { A_F_pro_AEb: 800, q_krit: 55 }); // != 60
    expect(await gateBlocks('M187-08', 'REQ-05')).toBe(true);
    await saveSymbols('M187-08', { q_krit: 60, q_A_max: 5 }); // > 4 m/h
    expect(await gateBlocks('M187-08', 'REQ-05')).toBe(true);
  });
  it('REQ-05-2  stray DUPLICATE of REQ-05 — fires identically; one violation trips BOTH copies', async () => {
    await applySaves(passSaves);
    const okState = await checkApprovalGate(fixture.instances['M187-08']);
    expect(okState.failingBlockConditions.some((c) => c.code === 'REQ-05')).toBe(false);
    expect(okState.failingBlockConditions.some((c) => c.code === 'REQ-05-2')).toBe(false);
    await saveSymbols('M187-08', { B_CSB: 25 });
    const badState = await checkApprovalGate(fixture.instances['M187-08']);
    // BOTH the original and the stray dup fire for the single CSB violation.
    expect(badState.failingBlockConditions.some((c) => c.code === 'REQ-05')).toBe(true);
    expect(badState.failingBlockConditions.some((c) => c.code === 'REQ-05-2')).toBe(true);
  });
});

describe('DWA-M-187 — M187-09 Klein-RBF Bemessung/Nachweis (§5.5.4/5.5.1) + stray dup', () => {
  // REQ-06 and REQ-06-2 are byte-identical.
  const passSaves: Save[] = [{
    ws: 'M187-09',
    values: { A_b_a: 0.5, A_F_anteil_Aba: 1.0, A_F: 50, h_RR: 0.25, h_RBF: 0.7, h_Draen: 0.15 },
  }];
  it('REQ-06  A_b_a<1 AND A_F_anteil_Aba==1.0 AND A_F>=1.0 AND h_RR>=0.2 AND h_RBF>=0.6 AND h_Draen>=0.1', async () => {
    await proveBothWays('M187-09', 'REQ-06',
      passSaves,
      [{ ws: 'M187-09', values: { A_b_a: 1.5 } }]); // ≥ 1 ha → not a Klein-RBF config → block
  });
  it('REQ-06  ALSO blocks when the retention/depth minima are violated (h_RBF<0,6; h_Drän<0,1)', async () => {
    await applySaves(passSaves);
    expect(await gateBlocks('M187-09', 'REQ-06')).toBe(false);
    await saveSymbols('M187-09', { h_RBF: 0.5 }); // < 0,6 m
    expect(await gateBlocks('M187-09', 'REQ-06')).toBe(true);
    await saveSymbols('M187-09', { h_RBF: 0.7, h_Draen: 0.05 }); // < 0,1 m
    expect(await gateBlocks('M187-09', 'REQ-06')).toBe(true);
  });
  it('REQ-06-2  stray DUPLICATE of REQ-06 — fires identically; one violation trips BOTH copies', async () => {
    await applySaves(passSaves);
    const okState = await checkApprovalGate(fixture.instances['M187-09']);
    expect(okState.failingBlockConditions.some((c) => c.code === 'REQ-06')).toBe(false);
    expect(okState.failingBlockConditions.some((c) => c.code === 'REQ-06-2')).toBe(false);
    await saveSymbols('M187-09', { A_b_a: 1.5 });
    const badState = await checkApprovalGate(fixture.instances['M187-09']);
    expect(badState.failingBlockConditions.some((c) => c.code === 'REQ-06')).toBe(true);
    expect(badState.failingBlockConditions.some((c) => c.code === 'REQ-06-2')).toBe(true);
  });
});
