/**
 * DWA-M-708 (Abwasser aus der Milchverarbeitung, Gelbdruck 2025) — REAL
 * save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 12 live BLOCK gates (non-empty condition) by driving it
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
 *   - existence AND (number+enum)     REQ-708-06 (M708-01)
 *   - existence (text EMPTY + enum)   REQ-708-05 (M708-25)
 *   - boolean NOT/OR logic            REQ-708-12/13/14 (M708-02)
 *   - boolean == True                 REQ-708-10 (M708-12), REQ-708-11 (M708-25)
 *   - CROSS-WORKSHEET ordering compare (project-wide fallback resolver):
 *       REQ-708-01 — 7-way AND, c_* on M708-04 vs limit_* on M708-06
 *       REQ-708-02 — guarded, c_bsb5 (M708-04) vs limit (M708-06)
 *       REQ-708-03 — guarded, ied_anlage (M708-02) trigger + c_* (M708-04)
 *       REQ-708-04 — guarded, ied_anlage (M708-02) trigger + c_p (M708-04)
 *   - guarded AND                     REQ-708-07 (M708-11, all local)
 */
// @vitest-environment node
import './_harness-env-m708'; // top-level-await: PG + seedM708 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM708Harness } from './_harness-env-m708';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM708Harness();

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
 *  value clears the field (upsert to null) — used to VIOLATE existence gates. */
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

// Concentration / limit baselines for the M708-06 Direkteinleitung gates.
// c_* live on M708-04; limit_* + roh-load triggers live on M708-06. Baseline =
// every measured value AT its limit (<= passes) with all guard triggers active.
const BASE_CONC = { c_bsb5: 20, c_csb: 100, afs: 30, c_nh4_n: 5, c_n_ges: 15, c_p: 2, ph_wert: 7 };
const BASE_LIMITS = {
  limit_bsb5_direkt: 20, limit_csb_direkt: 100, limit_afs_direkt: 30,
  limit_nh4_n_direkt: 5, limit_nges_direkt: 15, limit_pges_direkt: 2, limit_ph_direkt: 9,
  bsb5_roh_je_tag: 5, nges_roh: 150, pges_roh: 25,
};

describe('DWA-M-708 — M708-01 Anlagenregistrierung', () => {
  it('REQ-708-06  eingehende_milchmenge/einleitungsart/haupterzeugnis IS NOT NULL (existence AND)', async () => {
    await proveBothWays('M708-01', 'REQ-708-06',
      [{ ws: 'M708-01', values: { eingehende_milchmenge: 250, einleitungsart: 'Direkteinleitung', haupterzeugnis: 'Kaese' } }],
      // clear one required field → IS NOT NULL fails → gate blocks
      [{ ws: 'M708-01', values: { eingehende_milchmenge: null } }]);
  });
});

describe('DWA-M-708 — M708-02 Genehmigungsrechtliche Einordnung (boolean logic)', () => {
  it('REQ-708-12  (NOT wasserwiederverwendung_geplant) OR wasserwiederverwendung_genehmigung', async () => {
    await proveBothWays('M708-02', 'REQ-708-12',
      [{ ws: 'M708-02', values: { wasserwiederverwendung_geplant: true, wasserwiederverwendung_genehmigung: true } }],
      [{ ws: 'M708-02', values: { wasserwiederverwendung_geplant: true, wasserwiederverwendung_genehmigung: false } }]);
  });
  it('REQ-708-13  (NOT awsv_anwendbar) OR (awsv_anzeige_eingereicht AND eignungsfeststellung_vorliegend)', async () => {
    await proveBothWays('M708-02', 'REQ-708-13',
      [{ ws: 'M708-02', values: { awsv_anwendbar: true, awsv_anzeige_eingereicht: true, eignungsfeststellung_vorliegend: true } }],
      [{ ws: 'M708-02', values: { awsv_anwendbar: true, awsv_anzeige_eingereicht: true, eignungsfeststellung_vorliegend: false } }]);
  });
  it('REQ-708-14  (NOT bimschv_12_schwelle_ueberschritten) OR stoerfall_klasse_eingeordnet', async () => {
    await proveBothWays('M708-02', 'REQ-708-14',
      [{ ws: 'M708-02', values: { bimschv_12_schwelle_ueberschritten: true, stoerfall_klasse_eingeordnet: true } }],
      [{ ws: 'M708-02', values: { bimschv_12_schwelle_ueberschritten: true, stoerfall_klasse_eingeordnet: false } }]);
  });
});

describe('DWA-M-708 — M708-06 Direkteinleitung (cross-worksheet fallback resolver)', () => {
  it('REQ-708-01  7-way emission-limit AND — c_* (M708-04) <= limit_* (M708-06)', async () => {
    await proveBothWays('M708-06', 'REQ-708-01',
      [{ ws: 'M708-04', values: { ...BASE_CONC } }, { ws: 'M708-06', values: { ...BASE_LIMITS } }],
      // bump CSB above its limit on M708-04 → resolved cross-worksheet → gate blocks
      [{ ws: 'M708-04', values: { c_csb: 150 } }]);
  });
  it('REQ-708-02  IF bsb5_roh_je_tag >= 3 THEN c_bsb5 <= limit_bsb5_direkt (guard both sides)', async () => {
    // pass via VACUOUS guard (roh-load below 3) even with c_bsb5 over the limit;
    // violate by activating the guard (roh-load 5) with c_bsb5 over the limit.
    await proveBothWays('M708-06', 'REQ-708-02',
      [{ ws: 'M708-04', values: { c_bsb5: 30 } }, { ws: 'M708-06', values: { limit_bsb5_direkt: 20, bsb5_roh_je_tag: 2 } }],
      [{ ws: 'M708-06', values: { bsb5_roh_je_tag: 5 } }]);
  });
  it('REQ-708-02  ALSO passes when guard active but c_bsb5 within limit (positive-guard pass)', async () => {
    await saveSymbols('M708-04', { c_bsb5: 15 });
    await saveSymbols('M708-06', { limit_bsb5_direkt: 20, bsb5_roh_je_tag: 5 });
    expect(await gateBlocks('M708-06', 'REQ-708-02')).toBe(false);
  });
  it('REQ-708-03  IF ied_anlage OR nges_roh > 100 THEN c_n_ges/c_nh4_n <= limits — nges_roh trigger', async () => {
    // Keep ied_anlage=false so the nges_roh load-threshold controls the guard.
    await proveBothWays('M708-06', 'REQ-708-03',
      [
        { ws: 'M708-02', values: { ied_anlage: false } },
        { ws: 'M708-04', values: { c_n_ges: 15, c_nh4_n: 5 } },
        { ws: 'M708-06', values: { limit_nges_direkt: 15, limit_nh4_n_direkt: 5, nges_roh: 50 } }, // 50 <= 100 → guard vacuous
      ],
      [{ ws: 'M708-04', values: { c_n_ges: 40 } }, { ws: 'M708-06', values: { nges_roh: 150 } }]); // guard active + body fails
  });
  it('REQ-708-03  ied_anlage=true (M708-02 fallback) ALSO activates the guard', async () => {
    // nges_roh below threshold → only the cross-worksheet ied_anlage flag can trigger.
    await saveSymbols('M708-06', { nges_roh: 10, limit_nges_direkt: 15, limit_nh4_n_direkt: 5 });
    await saveSymbols('M708-04', { c_n_ges: 40, c_nh4_n: 5 }); // c_n_ges over limit
    await saveSymbols('M708-02', { ied_anlage: false });
    expect(await gateBlocks('M708-06', 'REQ-708-03'), 'ied=false, roh<100 → guard vacuous → pass').toBe(false);
    await saveSymbols('M708-02', { ied_anlage: true }); // fallback flip activates guard
    expect(await gateBlocks('M708-06', 'REQ-708-03'), 'ied=true (fallback) → guard active → body fails → block').toBe(true);
  });
  it('REQ-708-04  IF ied_anlage OR pges_roh > 20 THEN c_p <= limit_pges_direkt — pges_roh trigger', async () => {
    await proveBothWays('M708-06', 'REQ-708-04',
      [
        { ws: 'M708-02', values: { ied_anlage: false } },
        { ws: 'M708-04', values: { c_p: 2 } },
        { ws: 'M708-06', values: { limit_pges_direkt: 2, pges_roh: 10 } }, // 10 <= 20 → vacuous
      ],
      [{ ws: 'M708-04', values: { c_p: 5 } }, { ws: 'M708-06', values: { pges_roh: 25 } }]); // guard active + body fails
  });
});

describe('DWA-M-708 — M708-11 Energie/Abluft (guarded dust limit)', () => {
  it('REQ-708-07  IF staub_massenstrom > 0.4 THEN staub_konzentration <= 10 AND staub_konzentration_trocknung <= 10', async () => {
    await proveBothWays('M708-11', 'REQ-708-07',
      // guard active (0.5 > 0.4), both dust concentrations within 10 → pass
      [{ ws: 'M708-11', values: { staub_massenstrom: 0.5, staub_konzentration: 8, staub_konzentration_trocknung: 9 } }],
      // one concentration over 10 → body fails → block
      [{ ws: 'M708-11', values: { staub_konzentration: 20 } }]);
  });
  it('REQ-708-07  vacuous pass when staub_massenstrom <= 0.4 (guard false)', async () => {
    await saveSymbols('M708-11', { staub_massenstrom: 0.3, staub_konzentration: 20, staub_konzentration_trocknung: 20 });
    expect(await gateBlocks('M708-11', 'REQ-708-07')).toBe(false);
  });
});

describe('DWA-M-708 — M708-12 Vorbehandlung (attestation)', () => {
  it('REQ-708-10  attest_m708_12_req_708_10 == True', async () => {
    await proveBothWays('M708-12', 'REQ-708-10',
      [{ ws: 'M708-12', values: { attest_m708_12_req_708_10: true } }],
      [{ ws: 'M708-12', values: { attest_m708_12_req_708_10: false } }]);
  });
});

describe('DWA-M-708 — M708-25 Selbstueberwachung (existence + attestation)', () => {
  it('REQ-708-05  ueberwachung_haeufigkeit/probenahmestellen IS NOT EMPTY AND ablauf_konformitaet IS NOT NULL', async () => {
    await proveBothWays('M708-25', 'REQ-708-05',
      [{ ws: 'M708-25', values: { ueberwachung_haeufigkeit: 'monatlich', probenahmestellen: 'Ablauf ABA', ablauf_konformitaet: 'PASS' } }],
      // clear a required text field → IS NOT EMPTY fails → block
      [{ ws: 'M708-25', values: { ueberwachung_haeufigkeit: null } }]);
  });
  it('REQ-708-11  attest_m708_25_req_708_11 == True', async () => {
    await proveBothWays('M708-25', 'REQ-708-11',
      [{ ws: 'M708-25', values: { attest_m708_25_req_708_11: true } }],
      [{ ws: 'M708-25', values: { attest_m708_25_req_708_11: false } }]);
  });
});
