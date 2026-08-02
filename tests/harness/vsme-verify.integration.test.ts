/**
 * EFRAG VSME (version 2026-02-01) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner): "runnable" means RAN. This harness PROVES the encoding
 * end-to-end against a disposable embedded Postgres. Nothing is applied to prod;
 * nothing is committed. Provenance ceiling: VA — the rendered EFRAG VSME Standard
 * PDF exists and was used as SR-3 this wave (the long-standing "source-absent"
 * belief is FALSE, R-5 reversal).
 *
 *  B. EQUATIONS — the 10 prod additive-aggregation equations driven through the
 *     REAL evaluateFormula. All ten compute; no comma-decimal formula string;
 *     kinds asserted.
 *
 *  C. GATE EXECUTION PROOF — every one of the 9 live BLOCK gates driven BOTH WAYS
 *     through the REAL `saveWorksheet` → `checkApprovalGate` chain: a persisted
 *     state that PASSES (field present → gate absent from the block list) and one
 *     that VIOLATES (field cleared to null → gate present → definite block). All 9
 *     block gates are `X IS NOT NULL` existence predicates. VSME-CR-B07-01 is homed
 *     on the B01.000 template but reads a field on B07.000 → proven via the
 *     project-wide fallback (buildFallbackValues / makeGateLookup).
 *
 *  The 22 WARN gates are severity='warn' → structurally excluded from the approval-
 *  gate block query → never block. Five are spot-checked (incl. an existence-would-
 *  fail state), plus the two-conjunct B08-01 AND gate.
 */
// @vitest-environment node
import './_harness-env-vsme'; // top-level-await: PG + seed BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getVSMEHarness } from './_harness-env-vsme';
import { VSME_GATES, VSME_EQUATIONS, BASIS_FOR_PREPARATION_ENUM, BASIS_FOR_REPORTING_ENUM } from './seed-vsme';
import { evaluateFormula } from '@/lib/eval/formula';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getVSMEHarness();
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

const BLOCK_GATES = VSME_GATES.filter((g) => g.sev === 'block');
const WARN_GATES = VSME_GATES.filter((g) => g.sev === 'warn');

// ─────────────────────────────────────────────────────────────────────────────
// Seed sanity — topology matches prod
// ─────────────────────────────────────────────────────────────────────────────
describe('VSME — seed sanity (40 worksheets, 9 block, 22 warn, 10 equations)', () => {
  it('seeds 40 worksheet instances', () => {
    expect(Object.keys(fixture.instances).length).toBe(40);
  });
  it('has 9 block gates + 22 warn gates', () => {
    expect(BLOCK_GATES.length).toBe(9);
    expect(WARN_GATES.length).toBe(22);
  });
  it('has 10 equations', () => {
    expect(Object.keys(fixture.equationIds).length).toBe(10);
    expect(VSME_EQUATIONS.length).toBe(10);
  });
  it('no empty-condition BLOCK gate', () => {
    expect(BLOCK_GATES.filter((g) => g.cond.trim() === '').map((g) => g.code)).toEqual([]);
  });
  it('every BLOCK gate is a single-symbol IS NOT NULL existence predicate', () => {
    for (const g of BLOCK_GATES) expect(g.cond).toMatch(/^\w+ IS NOT NULL$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Engine-trap audit — BLOCK gates only (evaluate.ts + live prod strings)
// ─────────────────────────────────────────────────────────────────────────────
describe('VSME — BLOCK gates engine-trap / no-op audit', () => {
  it('trap-2: no != null / == null / != "" shape in any BLOCK gate (IS NOT NULL is the supported existence form, NOT the broken shape)', () => {
    expect(BLOCK_GATES.some((g) => /!=\s*''|!=\s*""|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
  });
  it('no literal-TRUE no-op BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => g.cond.trim().toUpperCase() === 'TRUE')).toBe(false);
  });
  it('trap-3: no IN-membership BLOCK gate', () => {
    expect(BLOCK_GATES.filter((g) => /\bIN\b/.test(g.cond)).map((g) => g.code)).toEqual([]);
  });
  it('trap-4: no unparenthesised chained IF..THEN..AND..IF..THEN BLOCK gate', () => {
    expect(BLOCK_GATES.some((g) => (g.cond.match(/\bIF\b/g) ?? []).length > 1)).toBe(false);
  });
  it('trap-1: no bare-identifier-RHS field-vs-field under an ORDERING operator in any BLOCK gate', () => {
    const orderingBareRhs = BLOCK_GATES.filter((g) => /(>=|<=|>|<)\s*[A-Za-z_]\w*(\s|$)/.test(g.cond));
    expect(orderingBareRhs.map((g) => g.code)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. GATE EXECUTION PROOF — real saveWorksheet → checkApprovalGate, both ways
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
async function saveMany(saves: Array<[string, Record<string, Val>]>): Promise<void> {
  for (const [ws, vals] of saves) await save(ws, vals);
}
async function gateBlocks(checkWs: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[checkWs]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

const DRIVEN = new Set<string>();
/** Prove a BLOCK gate ENFORCING both ways. `passSaves` persist the read field(s)
 *  present (gate must NOT block); `violateSaves` clear them to null (gate MUST
 *  block). Multi-ws plans exercise the project-wide fallback for cross-worksheet
 *  gates (VSME-CR-B07-01). */
async function proveBothWays(
  checkWs: string, code: string,
  passSaves: Array<[string, Record<string, Val>]>,
  violateSaves: Array<[string, Record<string, Val>]>,
): Promise<void> {
  DRIVEN.add(code);
  await saveMany(passSaves);
  expect(await gateBlocks(checkWs, code), `${code} should NOT block in passing (field-present) state`).toBe(false);
  await saveMany(violateSaves);
  expect(await gateBlocks(checkWs, code), `${code} SHOULD block in violating (field-absent) state`).toBe(true);
}

describe('VSME (C) — 8 local BLOCK gates enforce both ways (present ⇒ pass, null ⇒ block)', () => {
  it('VSME-CR-B01-01 BasisForPreparation IS NOT NULL [B01.000]', async () =>
    proveBothWays('VSME-B01.000', 'VSME-CR-B01-01',
      [['VSME-B01.000', { BasisForPreparation: BASIS_FOR_PREPARATION_ENUM[0] }]],
      [['VSME-B01.000', { BasisForPreparation: null }]]));
  it('VSME-CR-B01-02 BasisForReporting IS NOT NULL [B01.000]', async () =>
    proveBothWays('VSME-B01.000', 'VSME-CR-B01-02',
      [['VSME-B01.000', { BasisForReporting: BASIS_FOR_REPORTING_ENUM[1] }]],
      [['VSME-B01.000', { BasisForReporting: null }]]));
  it('VSME-CR-B03-01 TotalEnergyConsumption IS NOT NULL [B03.000]', async () =>
    proveBothWays('VSME-B03.000', 'VSME-CR-B03-01',
      [['VSME-B03.000', { TotalEnergyConsumption: 1234 }]],
      [['VSME-B03.000', { TotalEnergyConsumption: null }]]));
  it('VSME-CR-B03-02 GrossScope1GreenhouseGasEmissions IS NOT NULL [B03.200]', async () =>
    proveBothWays('VSME-B03.200', 'VSME-CR-B03-02',
      [['VSME-B03.200', { GrossScope1GreenhouseGasEmissions: 500 }]],
      [['VSME-B03.200', { GrossScope1GreenhouseGasEmissions: null }]]));
  it('VSME-CR-B03-03 GrossLocationBasedScope2GreenhouseGasEmissions IS NOT NULL [B03.200]', async () =>
    proveBothWays('VSME-B03.200', 'VSME-CR-B03-03',
      [['VSME-B03.200', { GrossLocationBasedScope2GreenhouseGasEmissions: 300 }]],
      [['VSME-B03.200', { GrossLocationBasedScope2GreenhouseGasEmissions: null }]]));
  it('VSME-CR-B06-01 TotalAmountOfWaterWithdrawnFromAllSites IS NOT NULL [B06.000]', async () =>
    proveBothWays('VSME-B06.000', 'VSME-CR-B06-01',
      [['VSME-B06.000', { TotalAmountOfWaterWithdrawnFromAllSites: 9000 }]],
      [['VSME-B06.000', { TotalAmountOfWaterWithdrawnFromAllSites: null }]]));
  it('VSME-CR-B09-01 NumberOfRecordableWorkRelatedAccidents IS NOT NULL [B09.000]', async () =>
    proveBothWays('VSME-B09.000', 'VSME-CR-B09-01',
      [['VSME-B09.000', { NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod: 3 }]],
      [['VSME-B09.000', { NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod: null }]]));
  it('VSME-CR-B09-02 NumberOfFatalities IS NOT NULL [B09.000]', async () =>
    proveBothWays('VSME-B09.000', 'VSME-CR-B09-02',
      [['VSME-B09.000', { NumberOfFatalitiesAsAResultOfWorkRelatedInjuriesAndWorkRelatedIllHealth: 0 }]],
      [['VSME-B09.000', { NumberOfFatalitiesAsAResultOfWorkRelatedInjuriesAndWorkRelatedIllHealth: null }]]));
});

describe('VSME (C) — 1 CROSS-WORKSHEET BLOCK gate enforces both ways (project-wide fallback)', () => {
  it('VSME-CR-B07-01 UndertakingAppliesCircularEconomyPrinciples IS NOT NULL [gate on B01.000; field on B07.000]', async () =>
    proveBothWays('VSME-B01.000', 'VSME-CR-B07-01',
      [['VSME-B07.000', { UndertakingAppliesCircularEconomyPrinciples: true }]],
      [['VSME-B07.000', { UndertakingAppliesCircularEconomyPrinciples: null }]]));
});

// ─────────────────────────────────────────────────────────────────────────────
// WARN gates never appear in the approval-gate block set
// ─────────────────────────────────────────────────────────────────────────────
describe('VSME — WARN gates never block (spot-check, even in would-fail existence state)', () => {
  it('VSME-CR-B03-04 (intensity IS NOT NULL) never blocks even when the field is absent', async () => {
    expect(await gateBlocks('VSME-B03.300', 'VSME-CR-B03-04')).toBe(false);
  });
  it('VSME-CR-B05-01 (biodiversity IS NOT NULL) never blocks even when absent', async () => {
    expect(await gateBlocks('VSME-B05.000', 'VSME-CR-B05-01')).toBe(false);
  });
  it('VSME-CR-B06-02 (high-water-stress IS NOT NULL) never blocks even when absent', async () => {
    expect(await gateBlocks('VSME-B06.000', 'VSME-CR-B06-02')).toBe(false);
  });
  it('VSME-CR-B08-01 (two-conjunct AND existence) never blocks even when both absent', async () => {
    expect(await gateBlocks('VSME-B08.000', 'VSME-CR-B08-01')).toBe(false);
  });
  it('VSME-CR-B11-01 (convictions IS NOT NULL) never blocks even when absent', async () => {
    expect(await gateBlocks('VSME-B11.000', 'VSME-CR-B11-01')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. EQUATIONS — driven through the REAL evaluateFormula
// ─────────────────────────────────────────────────────────────────────────────
function runEq(num: string, inputs: Record<string, number>) {
  const e = VSME_EQUATIONS.find((x) => x.num === num)!;
  return evaluateFormula({
    equationId: fixture.equationIds[num],
    formula: e.formula,
    inputSymbols: Object.keys(inputs),
    outputSymbol: e.out,
    inputs: Object.entries(inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('VSME (B) — 10 equations compute through the REAL engine', () => {
  it('no equation formula string carries a comma-decimal (dot-only engine)', () => {
    for (const e of VSME_EQUATIONS) expect(e.formula).not.toMatch(/\d,\d/);
  });
  it('EQ-B01-emp NumberOfEmployees = Permanent + Temporary → 150 for 120+30', () => {
    const r = runEq('EQ-B01-emp', { NumberOfPermanentContractEmployees: 120, NumberOfTemporaryContractEmployees: 30 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(150, 9);
  });
  it('EQ-B03-locS12 = Scope1 + LocScope2 → 800 for 500+300', () => {
    const r = runEq('EQ-B03-locS12', { GrossScope1GreenhouseGasEmissions: 500, GrossLocationBasedScope2GreenhouseGasEmissions: 300 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(800, 9);
  });
  it('EQ-B03-locGHG = (S1+S2) + Scope3 → 950 for 800+150', () => {
    const r = runEq('EQ-B03-locGHG', { TotalGrossLocationBasedScope1AndScope2GHGEmissions: 800, GrossScope3GreenhouseGasEmissions: 150 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(950, 9);
  });
  it('EQ-B03-mktS12 = MktScope2 + Scope1 → 700 for 200+500', () => {
    const r = runEq('EQ-B03-mktS12', { GrossMarketBasedScope2GreenhouseGasEmissions: 200, GrossScope1GreenhouseGasEmissions: 500 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(700, 9);
  });
  it('EQ-B03-mktGHG = (mktS1+S2) + Scope3 → 850 for 700+150', () => {
    const r = runEq('EQ-B03-mktGHG', { TotalGrossMarketBasedScope1AndScope2GHGEmissions: 700, GrossScope3GreenhouseGasEmissions: 150 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(850, 9);
  });
  it('EQ-C08-fossil = Coal + Oil + Gas → 60 for 10+20+30', () => {
    const r = runEq('EQ-C08-fossil', { RevenueDerivedFromCoal: 10, RevenueDerivedFromOil: 20, RevenueDerivedFromGas: 30 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(60, 9);
  });
  it('EQ-B07-wMass = Hazardous + NonHazardous → 45 for 5+40', () => {
    const r = runEq('EQ-B07-wMass', { TotalHazardousWasteGeneratedMass: 5, TotalNonHazardousWasteGeneratedMass: 40 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(45, 9);
  });
  it('EQ-B07-wVol = Hazardous + NonHazardous → 22 for 2+20', () => {
    const r = runEq('EQ-B07-wVol', { TotalHazardousWasteGeneratedVolume: 2, TotalNonHazardousWasteGeneratedVolume: 20 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(22, 9);
  });
  it('EQ-B07-rMass = Disposal + DivertedToRecycle → 100 for 60+40', () => {
    const r = runEq('EQ-B07-rMass', { WasteDirectedToDisposalMass: 60, WasteDivertedToRecycleOrReuseMass: 40 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(100, 9);
  });
  it('EQ-B07-rVol = Disposal + DivertedToRecycle → 15 for 9+6', () => {
    const r = runEq('EQ-B07-rVol', { WasteDirectedToDisposalVolume: 9, WasteDivertedToRecycleOrReuseVolume: 6 });
    expect(r.kind).toBe('computed');
    if (r.kind === 'computed') expect(r.value).toBeCloseTo(15, 9);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Persistence read-back through the real save path
// ─────────────────────────────────────────────────────────────────────────────
describe('VSME — persistence read-back through the real save path', () => {
  it('a saved numeric TotalEnergyConsumption round-trips to project_parameters', async () => {
    await save('VSME-B03.000', { TotalEnergyConsumption: 4321 });
    const fid = fixture.fieldByWs['VSME-B03.000']['TotalEnergyConsumption'].fieldId;
    const [row] = await sql<{ value_number: string | null }[]>`
      SELECT value_number FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
    expect(Number(row?.value_number)).toBe(4321);
  });
});

describe('VSME — all 9 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every one of the 9 block gate codes', () => {
    const blockCodes = BLOCK_GATES.map((g) => g.code).sort();
    const undriven = blockCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(DRIVEN.size).toBe(9);
  });
});
