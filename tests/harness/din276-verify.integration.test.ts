/**
 * DIN 276 ("Kosten im Bauwesen", DIN 276:2018-12) — REAL save-path execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-din276.ts header).
 * The 50 KG rollups + 4 §3 identities were verified symbol-by-symbol against the printed
 * §5.4 Tab.1 cost-group tree and the §3.11/§3.12/§3.13 definitions — all FAITHFUL. This
 * harness is the EXECUTION half: it PROVES the standard's 27 live BLOCK gates
 * (severity='block' + non-empty condition) by driving each through the REAL enforcement
 * chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists the
 *                                      ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and a
 * persisted state where it DOES (the F-4 lesson). Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (27 gates, all severity='block'):
 *   - membership IN {lowercase enum} (REQ-01, REQ-15)     : `x IN {a,b,c}`
 *   - existence IS NOT EMPTY (REQ-05, REQ-06, REQ-07)     : text/json presence
 *   - existence IS NOT NULL (REQ-03, REQ-04)              : `x IS NOT NULL`
 *   - single IF/THEN guard (REQ-08, REQ-10..14)           : vacuous-pass + violate-body
 *   - boolean equality `== True`/`== true` (REQ-02,       : attest + feasibility flags
 *       16-20, 30, 21-23, 31, 32, part of 24)
 *   - AND of existence + boolean (REQ-24)                 : `x IS NOT NULL AND flag == true`
 *   - ARITHMETIC identity, cross-worksheet RHS (REQ-25)   : `building_costs == kg_300_total + kg_400_total`
 *
 * CROSS-WORKSHEET FALLBACK proven: REQ-08 reads multi_building (home DIN-276-01) from
 * gate-home DIN-276-02; REQ-25 reads kg_300_total (home DIN-276-11) + kg_400_total (home
 * DIN-276-12) from gate-home DIN-276-25 — all via the conflict-free project-wide fallback.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4
 * known engine traps present — see the seed-din276.ts header for the itemised result.
 * All 27 gates reach a definite `fail` in their violating state; there are NO literal-TRUE
 * no-op block gates in DIN-276.
 */
// @vitest-environment node
import './_harness-env-din276'; // top-level-await: PG + seedDIN276 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDIN276Harness } from './_harness-env-din276';
import { DIN276_GATES } from './seed-din276';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getDIN276Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null | Record<string, unknown> | unknown[];

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through the
 *  REAL saveWorksheet. A null value clears the field. */
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

/** Whether `code` is in the block-gate failing list for worksheet `gateWs` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
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
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
}

describe('DIN-276 — seed sanity (topology matches the 27 prod block gates)', () => {
  it('seeds all 12 worksheet instances and 27 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'DIN-276-01', 'DIN-276-02', 'DIN-276-03', 'DIN-276-08', 'DIN-276-09',
      'DIN-276-11', 'DIN-276-12', 'DIN-276-18', 'DIN-276-23', 'DIN-276-25',
      'DIN-276-26', 'DIN-276-28',
    ]);
    expect(DIN276_GATES.length).toBe(27);
    expect(DIN276_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DIN-276-01 — Projektregistrierung (§1 scope)', () => {
  it('REQ-01  project_type IN {building,...} (membership)', async () => {
    await proveBothWays('DIN-276-01', 'REQ-01',
      [{ ws: 'DIN-276-01', values: { project_type: 'building' } }],
      [{ ws: 'DIN-276-01', values: { project_type: 'not_a_din276_type' } }]); // outside the set → fail
  });
});

describe('DIN-276-02 — Umfangsdefinition (§4.2.6, §4.2.8)', () => {
  it('REQ-06  project_scope_description IS NOT EMPTY (text presence)', async () => {
    await proveBothWays('DIN-276-02', 'REQ-06',
      [{ ws: 'DIN-276-02', values: { project_scope_description: 'Neubau Verwaltungsgebäude, 3 Bauteile' } }],
      [{ ws: 'DIN-276-02', values: { project_scope_description: null } }]);
  });
  it('REQ-08  IF multi_building THEN separate_calculations_per_building (guard; cross-ws guard field)', async () => {
    await proveBothWays('DIN-276-02', 'REQ-08',
      // vacuous pass: guard false (multi_building=false, home DIN-276-01 → fallback)
      [{ ws: 'DIN-276-01', values: { multi_building: false } }],
      // violate: guard true + body false → IF fires, body fails
      [{ ws: 'DIN-276-01', values: { multi_building: true } },
       { ws: 'DIN-276-02', values: { separate_calculations_per_building: false } }]);
  });
});

describe('DIN-276-03 — Planungsstand & Datenquellen (§4.2.4/5/7/15)', () => {
  it('REQ-04  cost_status_date IS NOT NULL (date existence)', async () => {
    await proveBothWays('DIN-276-03', 'REQ-04',
      [{ ws: 'DIN-276-03', values: { cost_status_date: '2026-01-15' } }],
      [{ ws: 'DIN-276-03', values: { cost_status_date: null } }]);
  });
  it('REQ-05  input_documents_register IS NOT EMPTY (json carrier presence)', async () => {
    await proveBothWays('DIN-276-03', 'REQ-05',
      [{ ws: 'DIN-276-03', values: { input_documents_register: { rows: [{ doc: 'Lageplan M 1:500' }] } } }],
      [{ ws: 'DIN-276-03', values: { input_documents_register: null } }]); // empty carrier → undefined → fail
  });
  it('REQ-07  cost_calculation_method IS NOT EMPTY (text presence)', async () => {
    await proveBothWays('DIN-276-03', 'REQ-07',
      [{ ws: 'DIN-276-03', values: { cost_calculation_method: 'Kostenflächenarten (BKI)' } }],
      [{ ws: 'DIN-276-03', values: { cost_calculation_method: null } }]);
  });
  it('REQ-15  vat_treatment IN {gross,net,mixed} (membership)', async () => {
    await proveBothWays('DIN-276-03', 'REQ-15',
      [{ ws: 'DIN-276-03', values: { vat_treatment: 'gross' } }],
      [{ ws: 'DIN-276-03', values: { vat_treatment: 'undeclared' } }]);
  });
});

describe('DIN-276-08 — Vorhandene Bausubstanz & Sonderkosten (§4.2.10-14, single IF/THEN guards)', () => {
  it('REQ-10  IF existing_substance_value > 0 THEN separately_shown == true', async () => {
    await proveBothWays('DIN-276-08', 'REQ-10',
      [{ ws: 'DIN-276-08', values: { existing_substance_value: 0 } }], // guard false → vacuous pass
      [{ ws: 'DIN-276-08', values: { existing_substance_value: 250000, separately_shown_existing_substance: false } }]);
  });
  it('REQ-11  IF contributed_goods_value > 0 THEN separately_shown == true', async () => {
    await proveBothWays('DIN-276-08', 'REQ-11',
      [{ ws: 'DIN-276-08', values: { contributed_goods_value: 0 } }],
      [{ ws: 'DIN-276-08', values: { contributed_goods_value: 40000, separately_shown_contributed_goods: false } }]);
  });
  it('REQ-12  IF special_costs_value > 0 THEN separately_shown == true', async () => {
    await proveBothWays('DIN-276-08', 'REQ-12',
      [{ ws: 'DIN-276-08', values: { special_costs_value: 0 } }],
      [{ ws: 'DIN-276-08', values: { special_costs_value: 15000, separately_shown_special_costs: false } }]);
  });
  it('REQ-13  IF forecasted_costs_value > 0 THEN assumptions_stated == true', async () => {
    await proveBothWays('DIN-276-08', 'REQ-13',
      [{ ws: 'DIN-276-08', values: { forecasted_costs_value: 0 } }],
      [{ ws: 'DIN-276-08', values: { forecasted_costs_value: 80000, forecasted_costs_assumptions_stated: false } }]);
  });
  it('REQ-14  IF risk_costs_value > 0 THEN separately_shown == true', async () => {
    await proveBothWays('DIN-276-08', 'REQ-14',
      [{ ws: 'DIN-276-08', values: { risk_costs_value: 0 } }],
      [{ ws: 'DIN-276-08', values: { risk_costs_value: 120000, separately_shown_risk_costs: false } }]);
  });
});

describe('DIN-276-09 — KG 100 (§5.1 attest)', () => {
  it('REQ-02  attest_din_276_09_req_02 == True (boolean equality)', async () => {
    await proveBothWays('DIN-276-09', 'REQ-02',
      [{ ws: 'DIN-276-09', values: { attest_din_276_09_req_02: true } }],
      [{ ws: 'DIN-276-09', values: { attest_din_276_09_req_02: false } }]);
  });
});

describe('DIN-276-18 — Kostenrahmen (§4.3.2-7 attests)', () => {
  for (const [code, sym] of [
    ['REQ-16', 'attest_din_276_18_req_16'],
    ['REQ-17', 'attest_din_276_18_req_17'],
    ['REQ-18', 'attest_din_276_18_req_18'],
    ['REQ-19', 'attest_din_276_18_req_19'],
    ['REQ-20', 'attest_din_276_18_req_20'],
    ['REQ-30', 'attest_din_276_18_req_30'],
  ] as const) {
    it(`${code}  ${sym} == True`, async () => {
      await proveBothWays('DIN-276-18', code,
        [{ ws: 'DIN-276-18', values: { [sym]: true } }],
        [{ ws: 'DIN-276-18', values: { [sym]: false } }]);
    });
  }
});

describe('DIN-276-23 — Gesamtkostenkompilation (§4.2.3)', () => {
  it('REQ-03  GK_total IS NOT NULL (number existence)', async () => {
    await proveBothWays('DIN-276-23', 'REQ-03',
      [{ ws: 'DIN-276-23', values: { GK_total: 12500000 } }],
      [{ ws: 'DIN-276-23', values: { GK_total: null } }]);
  });
});

describe('DIN-276-25 — Bauwerkskosten (§3.12 arithmetic identity, cross-worksheet RHS)', () => {
  it('REQ-25  building_costs == kg_300_total + kg_400_total', async () => {
    await proveBothWays('DIN-276-25', 'REQ-25',
      // pass: 100 == 60 + 40 (RHS via cross-ws fallback from DIN-276-11/-12)
      [{ ws: 'DIN-276-11', values: { kg_300_total: 60 } },
       { ws: 'DIN-276-12', values: { kg_400_total: 40 } },
       { ws: 'DIN-276-25', values: { building_costs: 100 } }],
      // violate: 100 != 60 + 30
      [{ ws: 'DIN-276-12', values: { kg_400_total: 30 } }]);
  });
});

describe('DIN-276-26 — Kostenkontrolle (§4.4/§4.5/§4.1 attests)', () => {
  for (const [code, sym] of [
    ['REQ-21', 'attest_din_276_26_req_21'],
    ['REQ-22', 'attest_din_276_26_req_22'],
    ['REQ-23', 'attest_din_276_26_req_23'],
    ['REQ-31', 'attest_din_276_26_req_31'],
    ['REQ-32', 'attest_din_276_26_req_32'],
  ] as const) {
    it(`${code}  ${sym} == True`, async () => {
      await proveBothWays('DIN-276-26', code,
        [{ ws: 'DIN-276-26', values: { [sym]: true } }],
        [{ ws: 'DIN-276-26', values: { [sym]: false } }]);
    });
  }
});

describe('DIN-276-28 — Kostenvorgabe-Konformität (§4.6.2)', () => {
  it('REQ-24  cost_target_value IS NOT NULL AND feasibility_checked == true', async () => {
    await proveBothWays('DIN-276-28', 'REQ-24',
      [{ ws: 'DIN-276-28', values: { cost_target_value: 9800000, feasibility_checked: true } }],
      // violate: keep the target set, flip feasibility → the AND collapses to fail
      [{ ws: 'DIN-276-28', values: { feasibility_checked: false } }]);
  });
});
