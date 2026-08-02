/**
 * HOAI-2021 ("Honorarordnung für Architekten und Ingenieure (HOAI), Fassung 2021,
 * Novelle 2020/2021") — REAL save-path gate-execution proof + fee-interpolation equation chain.
 *
 * (C) GATE EXECUTION — drives all 23 live BLOCK gates through the REAL enforcement chain against
 *     a disposable embedded Postgres:
 *       saveWorksheet(instance, values) → values persist to project_parameters
 *       checkApprovalGate(instance)     → the engineer-approve gate replays every block condition
 *                                         against the SAVED values and lists definite `fail`s.
 *     `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 *     `engineer_approve` transition (src/lib/actions/approval-gate.ts) — local field symbols plus
 *     the conflict-free project-wide fallback, so CR-05's cross-worksheet operand (objektart,
 *     home WS01) resolves exactly as in production. A gate is proven ENFORCING only when shown
 *     BOTH ways: a persisted passing state (not blocked) and a persisted violating state
 *     (definite fail) — the F-4 lesson.
 *
 *     17 substantive gates driven both ways (existence, boolean ==true, K/p_sum/z_umbau/NK/ust
 *     ordering comparisons, phase-sum ==100 acompare). CR-05 (enum-full-domain membership) driven
 *     both ways at the ENGINE level via an out-of-domain honorarzone. The 4 TRUE no-op block gates
 *     (CR-02, CR-21, CR-22, CR-23) driven to demonstrate they NEVER block.
 *
 * (B) EQUATIONS — 6 fee-interpolation equations driven through the REAL evaluateFormula. All are
 *     pure plus/minus/mult/div arithmetic (§13 lineare Interpolation + §§6/8/14/16 chain), all COMPUTE.
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-hoai2021'; // top-level-await: PG + seedHOAI2021 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getHOAI2021Harness } from './_harness-env-hoai2021';
import { HOAI_GATES, HOAI_EQUATIONS } from './seed-hoai2021';
import { evaluateFormula } from '@/lib/eval/formula';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getHOAI2021Harness();

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

/** Every gate code the test actually drives — asserted to cover all 23 at the end. */
const DRIVEN = new Set<string>();

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through the REAL
 *  saveWorksheet. A null value clears the field. */
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

/** Whether `code` is in the block-gate failing list for worksheet `gateWs` given the CURRENT
 *  persisted project state (the real approval-gate read path). */
async function gateBlocks(gateWs: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[gateWs]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked; persist the
 *  violating saves → blocked (definite fail). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  DRIVEN.add(code);
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
}

/** Build a phase-percentage save map for `prefix`lph1..N with the given values. */
function phaseVals(prefix: string, vals: number[]): Record<string, Val> {
  const out: Record<string, Val> = {};
  vals.forEach((v, i) => { out[`${prefix}${i + 1}`] = v; });
  return out;
}
// §34 Abs.3 Gebäude percentages — sum exactly 100 (source-faithful 9-phase split).
const NINE_100 = [2, 7, 15, 3, 25, 10, 4, 32, 2];
const NINE_99 = [2, 7, 15, 3, 25, 10, 4, 32, 1]; // sum 99 → ==100 fails
// §51 Abs.1 Tragwerksplanung percentages — sum exactly 100 (6-phase).
const SIX_100 = [3, 10, 15, 30, 40, 2];
const SIX_99 = [3, 10, 15, 30, 40, 1];

// ────────────────────────────────────────────────────────────────────────────────────────────
// Seed sanity
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('HOAI-2021 — seed sanity (topology matches prod: 7 worksheets, 23 block gates, 6 equations)', () => {
  it('seeds all 7 worksheet instances, 23 block gates (4 TRUE no-ops), 6 equations', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'HOAI-2021-01', 'HOAI-2021-02', 'HOAI-2021-03', 'HOAI-2021-04',
      'HOAI-2021-05', 'HOAI-2021-06', 'HOAI-2021-07',
    ]);
    expect(HOAI_GATES.length).toBe(23);
    expect(HOAI_GATES.every((g) => g.sev === 'block')).toBe(true);
    // Exactly 4 TRUE no-op block gates (reproduces the prior-scan flag; not reversed).
    expect(HOAI_GATES.filter((g) => g.cond === 'TRUE').map((g) => g.code).sort())
      .toEqual(['HOAI-CR-02', 'HOAI-CR-21', 'HOAI-CR-22', 'HOAI-CR-23']);
    // No `!= ''` / `!= null` / `== null` remains in any condition (trap-2 audit: none present).
    expect(HOAI_GATES.some((g) => /!=\s*''|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
    expect(HOAI_EQUATIONS.length).toBe(6);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS01 — Projektregistrierung & Anwendungsbereich
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('HOAI-2021-01 — Anwendungsbereich', () => {
  const WS = 'HOAI-2021-01';
  it('CR-01  hoai_anwendbar == true', async () => {
    await proveBothWays(WS, 'HOAI-CR-01',
      [{ ws: WS, values: { hoai_anwendbar: true } }],
      [{ ws: WS, values: { hoai_anwendbar: false } }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS02 — Honorargrundlagen (§4/§5/§6/§13)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('HOAI-2021-02 — Honorargrundlagen', () => {
  const WS = 'HOAI-2021-02';
  it('CR-03  leistungsbild AND honorarzone AND K IS NOT NULL', async () => {
    await proveBothWays(WS, 'HOAI-CR-03',
      [{ ws: WS, values: { leistungsbild: 'gebaeude', honorarzone: 'III', K: 1500000 } }],
      [{ ws: WS, values: { leistungsbild: null } }]); // clear one → AND fails
  });
  it('CR-04  K > 0', async () => {
    await proveBothWays(WS, 'HOAI-CR-04',
      [{ ws: WS, values: { K: 1500000 } }],
      [{ ws: WS, values: { K: 0 } }]); // 0 is not > 0 → definite fail
  });
  it('CR-05  (objektart IN {…} AND honorarzone IN {I,II,III}) OR honorarzone IN {I,II,III,IV,V} — engine both-ways via out-of-domain honorarzone (enum-full-domain no-op in UI use)', async () => {
    await proveBothWays(WS, 'HOAI-CR-05',
      [{ ws: WS, values: { honorarzone: 'III' } }],              // in-domain → OR-right true → pass
      [{ ws: WS, values: { honorarzone: 'ZZ_invalid' } }]);      // present, out-of-domain → both disjuncts false → fail
  });
  it('CR-06  K AND K_u AND K_o AND H_u_unten AND H_o_unten IS NOT NULL', async () => {
    await proveBothWays(WS, 'HOAI-CR-06',
      [{ ws: WS, values: { K: 1500000, K_u: 1000000, K_o: 2000000, H_u_unten: 10000, H_o_unten: 18000 } }],
      [{ ws: WS, values: { K_o: null } }]); // clear one → AND fails
  });
  it('CR-20  K IS NOT NULL', async () => {
    await proveBothWays(WS, 'HOAI-CR-20',
      [{ ws: WS, values: { K: 1500000 } }],
      [{ ws: WS, values: { K: null } }]);
  });
  it("CR-22 (condition 'TRUE', §17 Bauleitplanung) never blocks — no-op", async () => {
    DRIVEN.add('HOAI-CR-22');
    expect(await gateBlocks(WS, 'HOAI-CR-22')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS03 — Honorarermittlung (§2a/§6/§8/§14/§16)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('HOAI-2021-03 — Honorarermittlung', () => {
  const WS = 'HOAI-2021-03';
  it("CR-02 (condition 'TRUE', §2a/§7 Orientierungswerte) never blocks — no-op", async () => {
    DRIVEN.add('HOAI-CR-02');
    expect(await gateBlocks(WS, 'HOAI-CR-02')).toBe(false);
  });
  it('CR-07  p_sum > 0 AND p_sum <= 100', async () => {
    await proveBothWays(WS, 'HOAI-CR-07',
      [{ ws: WS, values: { p_sum: 100 } }],
      [{ ws: WS, values: { p_sum: 120 } }]); // > 100 → fail
  });
  it('CR-15  z_umbau >= 0', async () => {
    await proveBothWays(WS, 'HOAI-CR-15',
      [{ ws: WS, values: { z_umbau: 20 } }],
      [{ ws: WS, values: { z_umbau: -1 } }]);
  });
  it('CR-18  NK >= 0', async () => {
    await proveBothWays(WS, 'HOAI-CR-18',
      [{ ws: WS, values: { NK: 1000 } }],
      [{ ws: WS, values: { NK: -1 } }]);
  });
  it('CR-19  ust >= 0', async () => {
    await proveBothWays(WS, 'HOAI-CR-19',
      [{ ws: WS, values: { ust: 19 } }],
      [{ ws: WS, values: { ust: -1 } }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS04 — Objektplanung Phasen-% (§34/§34/§39) — phase-sum == 100 (arithmetic acompare)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('HOAI-2021-04 — Objektplanung Phasen-%', () => {
  const WS = 'HOAI-2021-04';
  it('CR-08  Sum p_geb_lph1..9 == 100', async () => {
    await proveBothWays(WS, 'HOAI-CR-08',
      [{ ws: WS, values: phaseVals('p_geb_lph', NINE_100) }],
      [{ ws: WS, values: phaseVals('p_geb_lph', NINE_99) }]);
  });
  it('CR-09  Sum p_inn_lph1..9 == 100', async () => {
    await proveBothWays(WS, 'HOAI-CR-09',
      [{ ws: WS, values: phaseVals('p_inn_lph', NINE_100) }],
      [{ ws: WS, values: phaseVals('p_inn_lph', NINE_99) }]);
  });
  it('CR-10  Sum p_fre_lph1..9 == 100', async () => {
    await proveBothWays(WS, 'HOAI-CR-10',
      [{ ws: WS, values: phaseVals('p_fre_lph', NINE_100) }],
      [{ ws: WS, values: phaseVals('p_fre_lph', NINE_99) }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS05 — Ingenieurbau/Verkehr Phasen-% (§43/§47)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('HOAI-2021-05 — Ingenieurbau/Verkehr Phasen-%', () => {
  const WS = 'HOAI-2021-05';
  it('CR-11  Sum p_ing_lph1..9 == 100', async () => {
    await proveBothWays(WS, 'HOAI-CR-11',
      [{ ws: WS, values: phaseVals('p_ing_lph', NINE_100) }],
      [{ ws: WS, values: phaseVals('p_ing_lph', NINE_99) }]);
  });
  it('CR-12  Sum p_ver_lph1..9 == 100', async () => {
    await proveBothWays(WS, 'HOAI-CR-12',
      [{ ws: WS, values: phaseVals('p_ver_lph', NINE_100) }],
      [{ ws: WS, values: phaseVals('p_ver_lph', NINE_99) }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS06 — Fachplanung Phasen-% (§51 Tragwerk 6-phase / §55 TGA 9-phase)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('HOAI-2021-06 — Fachplanung Phasen-%', () => {
  const WS = 'HOAI-2021-06';
  it('CR-13  Sum p_tra_lph1..6 == 100', async () => {
    await proveBothWays(WS, 'HOAI-CR-13',
      [{ ws: WS, values: phaseVals('p_tra_lph', SIX_100) }],
      [{ ws: WS, values: phaseVals('p_tra_lph', SIX_99) }]);
  });
  it('CR-14  Sum p_tga_lph1..9 == 100', async () => {
    await proveBothWays(WS, 'HOAI-CR-14',
      [{ ws: WS, values: phaseVals('p_tga_lph', NINE_100) }],
      [{ ws: WS, values: phaseVals('p_tga_lph', NINE_99) }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS07 — Prüfung, Honorarvereinbarung & Zusammenfassung (§7/§11/§15)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('HOAI-2021-07 — Prüfung & Honorarvereinbarung', () => {
  const WS = 'HOAI-2021-07';
  it('CR-16  auftraggeber_verbraucher == true AND hinweis_erteilt == true', async () => {
    await proveBothWays(WS, 'HOAI-CR-16',
      [{ ws: WS, values: { auftraggeber_verbraucher: true, hinweis_erteilt: true } }],
      [{ ws: WS, values: { hinweis_erteilt: false } }]); // clear one → AND fails
  });
  it('CR-17  vereinbarung_textform == true', async () => {
    await proveBothWays(WS, 'HOAI-CR-17',
      [{ ws: WS, values: { vereinbarung_textform: true } }],
      [{ ws: WS, values: { vereinbarung_textform: false } }]);
  });
  it("CR-21 (condition 'TRUE', §15 Fälligkeit) never blocks — no-op", async () => {
    DRIVEN.add('HOAI-CR-21');
    expect(await gateBlocks(WS, 'HOAI-CR-21')).toBe(false);
  });
  it("CR-23 (condition 'TRUE', §11 mehrere Objekte) never blocks — no-op", async () => {
    DRIVEN.add('HOAI-CR-23');
    expect(await gateBlocks(WS, 'HOAI-CR-23')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// (B) EQUATIONS — 6 fee-interpolation equations through the REAL evaluateFormula (all compute)
// ────────────────────────────────────────────────────────────────────────────────────────────
function runEq(num: string, inputs: Record<string, number>) {
  const e = HOAI_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: fixture.equationIds[num],
    formula: e.formula,
    inputSymbols: Object.keys(inputs),
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('HOAI-2021 — 6 fee equations COMPUTE via the REAL engine (§13 lineare Interpolation + chain)', () => {
  it('HOAI-EQ-01  H_basis = H_u_unten + (K-K_u)/(K_o-K_u)*(H_o_unten-H_u_unten)  [§13]', () => {
    const r = runEq('HOAI-EQ-01', { H_u_unten: 10000, K: 1500000, K_u: 1000000, K_o: 2000000, H_o_unten: 18000 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(10000 + 0.5 * 8000, 6); // 14000
  });
  it('HOAI-EQ-02  H_oben = H_u_oben + (K-K_u)/(K_o-K_u)*(H_o_oben-H_u_oben)  [§13]', () => {
    const r = runEq('HOAI-EQ-02', { H_u_oben: 12000, K: 1500000, K_u: 1000000, K_o: 2000000, H_o_oben: 22000 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(12000 + 0.5 * 10000, 6); // 17000
  });
  it('HOAI-EQ-03  H_tafel = H_basis + s_satz*(H_oben-H_basis)  [§2a span selection]', () => {
    const r = runEq('HOAI-EQ-03', { H_basis: 14000, s_satz: 0.5, H_oben: 17000 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(15500, 6);
  });
  it('HOAI-EQ-04  H_phasen = H_tafel*(p_sum/100)  [§8 Abs.1]', () => {
    const r = runEq('HOAI-EQ-04', { H_tafel: 15500, p_sum: 80 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(12400, 6);
  });
  it('HOAI-EQ-05  H_zuschlag = H_phasen*(1 + z_umbau/100)  [§6 Abs.2]', () => {
    const r = runEq('HOAI-EQ-05', { H_phasen: 12400, z_umbau: 20 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(14880, 6);
  });
  it('HOAI-EQ-06  H_gesamt = (H_zuschlag + NK)*(1 + ust/100)  [§14/§16]', () => {
    const r = runEq('HOAI-EQ-06', { H_zuschlag: 14880, NK: 1000, ust: 19 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(15880 * 1.19, 4); // 18897.2
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// Coverage — every one of the 23 block gates was driven (undriven list MUST be empty)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('HOAI-2021 — all 23 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every gate code in prod topology', () => {
    const allCodes = HOAI_GATES.map((g) => g.code).sort();
    const driven = [...DRIVEN].sort();
    const undriven = allCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(driven).toEqual(allCodes);
    expect(DRIVEN.size).toBe(23);
  });
});
