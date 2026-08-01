/**
 * DWA-M-277E (Greywater treatment & reuse; English Edition, October 2017) —
 * REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES each
 * of the standard's 49 live BLOCK gates (non-empty condition) by driving it through
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
 *   - parenthesised AND/OR groups          REQ-29 (MBO 50 m³ threshold)
 *   - membership IN {…}                     REQ-02/-02-2 (greywater_type)
 *   - grouped disjunction + membership      REQ-03 (quality_category / greywater_type)
 *   - boolean/attestation equality          REQ-24, REQ-12…-28, REQ-13, REQ-20, REQ-22
 *   - guarded IF … THEN (string + numeric)  REQ-30, REQ-08, REQ-09, REQ-14, REQ-15, REQ-23, REQ-32
 *   - numeric band / single limit           REQ-11 (pH), REQ-10 (O2 saturation)
 *   - arithmetic-RHS equality               REQ-07 (Q_WB == Q_GW - Q_SW)
 *   - cross-worksheet fallback resolution   REQ-07/-30 on M277E-06/14, guards on M277E-10/23
 */
// @vitest-environment node
import './_harness-env-m277e'; // top-level-await: PG + seedM277E BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM277EHarness } from './_harness-env-m277e';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM277EHarness();

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

describe('DWA-M-277E — M277E-01 Projekt-Registrierung (MBO 50 m³ threshold)', () => {
  it('REQ-29  (cap<=50 AND notif) OR (cap>50 AND authorisation) — parenthesised AND/OR', async () => {
    await proveBothWays('M277E-01', 'REQ-29',
      [{ ws: 'M277E-01', values: { storage_capacity_m3: 30, MBO_notification_only: true, MBO_authorisation_required: false } }],
      // notification cleared while cap<=50 → first group false, second false → block
      [{ ws: 'M277E-01', values: { MBO_notification_only: false } }]);
  });
  it('REQ-29  ALSO passes the large-tank branch (cap>50 AND authorisation)', async () => {
    await saveSymbols('M277E-01', { storage_capacity_m3: 80, MBO_notification_only: false, MBO_authorisation_required: true });
    expect(await gateBlocks('M277E-01', 'REQ-29')).toBe(false);
    await saveSymbols('M277E-01', { MBO_authorisation_required: false });
    expect(await gateBlocks('M277E-01', 'REQ-29')).toBe(true);
  });
});

describe('DWA-M-277E — M277E-02 Begriffe & Symbole (classification)', () => {
  it('REQ-02  greywater_type IN {A1, A2, B1, B2}', async () => {
    await proveBothWays('M277E-02', 'REQ-02',
      [{ ws: 'M277E-02', values: { greywater_type: 'A1' } }],
      [{ ws: 'M277E-02', values: { greywater_type: 'unknown' } }]);
  });
  it('REQ-02-2  greywater_type IN {A1, A2, B1, B2} (duplicate — both enforce)', async () => {
    await proveBothWays('M277E-02', 'REQ-02-2',
      [{ ws: 'M277E-02', values: { greywater_type: 'B2' } }],
      [{ ws: 'M277E-02', values: { greywater_type: 'X' } }]);
  });
  it('REQ-03  (C1 AND type∈{A1,A2}) OR C2 — quality_category via fallback', async () => {
    await proveBothWays('M277E-02', 'REQ-03',
      [{ ws: 'M277E-14', values: { quality_category: 'C2' } }, { ws: 'M277E-02', values: { greywater_type: 'A1' } }],
      // C1 with a Type-B flow satisfies neither disjunct → block
      [{ ws: 'M277E-14', values: { quality_category: 'C1' } }, { ws: 'M277E-02', values: { greywater_type: 'B1' } }]);
  });
});

describe('DWA-M-277E — M277E-03 Einordnung in NASS', () => {
  it('REQ-24  attest_m277e_03_req_24 == True', async () => {
    await proveBothWays('M277E-03', 'REQ-24',
      [{ ws: 'M277E-03', values: { attest_m277e_03_req_24: true } }],
      [{ ws: 'M277E-03', values: { attest_m277e_03_req_24: false } }]);
  });
  it('REQ-30  IF building_type==rented_apartment THEN drinking_water_option (cross-ws fallback)', async () => {
    await proveBothWays('M277E-03', 'REQ-30',
      [{ ws: 'M277E-01', values: { building_type: 'rented_apartment' } }, { ws: 'M277E-09', values: { drinking_water_option_available: true } }],
      [{ ws: 'M277E-09', values: { drinking_water_option_available: false } }]);
  });
});

describe('DWA-M-277E — M277E-04 Rechtsrahmen (Table 4 limits + DIN 19650 + laundry)', () => {
  it('REQ-09  IF C2 THEN BOD5 < 5 (guard C2 via fallback, BOD5 via fallback)', async () => {
    await proveBothWays('M277E-04', 'REQ-09',
      [{ ws: 'M277E-14', values: { quality_category: 'C2' } }, { ws: 'M277E-08', values: { BOD5: 3 } }],
      [{ ws: 'M277E-08', values: { BOD5: 8 } }]);
  });
  it('REQ-24  DIN_19650_class_documented == true', async () => {
    await proveBothWays('M277E-04', 'REQ-24',
      [{ ws: 'M277E-04', values: { DIN_19650_class_documented: true } }],
      [{ ws: 'M277E-04', values: { DIN_19650_class_documented: false } }]);
  });
  it('REQ-32  IF use_category==laundry_private THEN C2', async () => {
    await proveBothWays('M277E-04', 'REQ-32',
      [{ ws: 'M277E-04', values: { use_category: 'laundry_private' } }, { ws: 'M277E-14', values: { quality_category: 'C2' } }],
      [{ ws: 'M277E-14', values: { quality_category: 'C1' } }]);
  });
  it('REQ-32-2  IF use_category==laundry_private THEN C2 (duplicate — both enforce)', async () => {
    await proveBothWays('M277E-04', 'REQ-32-2',
      [{ ws: 'M277E-04', values: { use_category: 'laundry_private' } }, { ws: 'M277E-14', values: { quality_category: 'C2' } }],
      [{ ws: 'M277E-14', values: { quality_category: 'C1' } }]);
  });
});

describe('DWA-M-277E — M277E-06 Quellenklassifikation (water balance + tenant option)', () => {
  it('REQ-07  Q_WB == (Q_GW - Q_SW) — arithmetic-RHS equality, Q_SW local + Q_WB/Q_GW fallback', async () => {
    await proveBothWays('M277E-06', 'REQ-07',
      [{ ws: 'M277E-07', values: { Q_GW: 1625 } }, { ws: 'M277E-06', values: { Q_SW: 875 } }, { ws: 'M277E-08', values: { Q_WB: 750 } }],
      [{ ws: 'M277E-08', values: { Q_WB: 100 } }]);
  });
  it('REQ-30  IF building_type==rented_apartment THEN drinking_water_option (cross-ws)', async () => {
    await proveBothWays('M277E-06', 'REQ-30',
      [{ ws: 'M277E-01', values: { building_type: 'rented_apartment' } }, { ws: 'M277E-09', values: { drinking_water_option_available: true } }],
      [{ ws: 'M277E-09', values: { drinking_water_option_available: false } }]);
  });
});

describe('DWA-M-277E — M277E-08 Qualitätsdaten (pH range, Table 4)', () => {
  it('REQ-11  pH_value >= 6.5 AND pH_value <= 9.5', async () => {
    await proveBothWays('M277E-08', 'REQ-11',
      [{ ws: 'M277E-08', values: { pH_value: 7.5 } }],
      [{ ws: 'M277E-08', values: { pH_value: 10 } }]);
  });
  it('REQ-11-2  pH range (duplicate — both enforce); ALSO blocks below 6.5', async () => {
    await proveBothWays('M277E-08', 'REQ-11-2',
      [{ ws: 'M277E-08', values: { pH_value: 7.5 } }],
      [{ ws: 'M277E-08', values: { pH_value: 6.0 } }]);
  });
});

describe('DWA-M-277E — M277E-09 Komponenten (backfeed / separation / labelling / frost)', () => {
  it('REQ-12  automatic_backfeed_present == True', async () => {
    await proveBothWays('M277E-09', 'REQ-12',
      [{ ws: 'M277E-09', values: { automatic_backfeed_present: true } }],
      [{ ws: 'M277E-09', values: { automatic_backfeed_present: false } }]);
  });
  it('REQ-12-2  automatic_backfeed_present == true (duplicate)', async () => {
    await proveBothWays('M277E-09', 'REQ-12-2',
      [{ ws: 'M277E-09', values: { automatic_backfeed_present: true } }],
      [{ ws: 'M277E-09', values: { automatic_backfeed_present: false } }]);
  });
  it('REQ-16  network_separation_per_DIN_EN_1717 == True', async () => {
    await proveBothWays('M277E-09', 'REQ-16',
      [{ ws: 'M277E-09', values: { network_separation_per_DIN_EN_1717: true } }],
      [{ ws: 'M277E-09', values: { network_separation_per_DIN_EN_1717: false } }]);
  });
  it('REQ-16-2  network_separation_per_DIN_EN_1717 == true (duplicate)', async () => {
    await proveBothWays('M277E-09', 'REQ-16-2',
      [{ ws: 'M277E-09', values: { network_separation_per_DIN_EN_1717: true } }],
      [{ ws: 'M277E-09', values: { network_separation_per_DIN_EN_1717: false } }]);
  });
  it('REQ-17  service_water_labelled AND isolated_from_drinking_water', async () => {
    await proveBothWays('M277E-09', 'REQ-17',
      [{ ws: 'M277E-09', values: { service_water_labelled: true, service_water_isolated_from_drinking_water: true } }],
      [{ ws: 'M277E-09', values: { service_water_labelled: false } }]);
  });
  it('REQ-17-2  labelled AND isolated (duplicate); ALSO blocks when isolation cleared', async () => {
    await saveSymbols('M277E-09', { service_water_labelled: true, service_water_isolated_from_drinking_water: true });
    expect(await gateBlocks('M277E-09', 'REQ-17-2')).toBe(false);
    await saveSymbols('M277E-09', { service_water_isolated_from_drinking_water: false });
    expect(await gateBlocks('M277E-09', 'REQ-17-2')).toBe(true);
  });
  it('REQ-18  installation_frost_free == True', async () => {
    await proveBothWays('M277E-09', 'REQ-18',
      [{ ws: 'M277E-09', values: { installation_frost_free: true } }],
      [{ ws: 'M277E-09', values: { installation_frost_free: false } }]);
  });
  it('REQ-18-2  installation_frost_free == true (duplicate)', async () => {
    await proveBothWays('M277E-09', 'REQ-18-2',
      [{ ws: 'M277E-09', values: { installation_frost_free: true } }],
      [{ ws: 'M277E-09', values: { installation_frost_free: false } }]);
  });
  it('REQ-21-2  auto_switch_to_backfeed == true AND auto_fault_report == true', async () => {
    await proveBothWays('M277E-09', 'REQ-21-2',
      [{ ws: 'M277E-09', values: { auto_switch_to_backfeed: true, auto_fault_report: true } }],
      [{ ws: 'M277E-09', values: { auto_fault_report: false } }]);
  });
  it('REQ-26  attest_m277e_09_req_26 == True', async () => {
    await proveBothWays('M277E-09', 'REQ-26',
      [{ ws: 'M277E-09', values: { attest_m277e_09_req_26: true } }],
      [{ ws: 'M277E-09', values: { attest_m277e_09_req_26: false } }]);
  });
  it('REQ-26-2  automatic_backfeed_present == true (dup code, different symbol)', async () => {
    await proveBothWays('M277E-09', 'REQ-26-2',
      [{ ws: 'M277E-09', values: { automatic_backfeed_present: true } }],
      [{ ws: 'M277E-09', values: { automatic_backfeed_present: false } }]);
  });
  it('REQ-27  attest_m277e_09_req_27 == True', async () => {
    await proveBothWays('M277E-09', 'REQ-27',
      [{ ws: 'M277E-09', values: { attest_m277e_09_req_27: true } }],
      [{ ws: 'M277E-09', values: { attest_m277e_09_req_27: false } }]);
  });
  it('REQ-27-2  automatic_backfeed_present == true (dup code, different symbol)', async () => {
    await proveBothWays('M277E-09', 'REQ-27-2',
      [{ ws: 'M277E-09', values: { automatic_backfeed_present: true } }],
      [{ ws: 'M277E-09', values: { automatic_backfeed_present: false } }]);
  });
  it('REQ-28-2  auto_switch_to_backfeed == true', async () => {
    await proveBothWays('M277E-09', 'REQ-28-2',
      [{ ws: 'M277E-09', values: { auto_switch_to_backfeed: true } }],
      [{ ws: 'M277E-09', values: { auto_switch_to_backfeed: false } }]);
  });
});

describe('DWA-M-277E — M277E-10 Toilettenspülung (Table 4 numeric limits + handover + discharge)', () => {
  it('REQ-08  IF C2 THEN turbidity_NTU < 2 (C2 via fallback)', async () => {
    await proveBothWays('M277E-10', 'REQ-08',
      [{ ws: 'M277E-14', values: { quality_category: 'C2' } }, { ws: 'M277E-10', values: { turbidity_NTU: 1 } }],
      [{ ws: 'M277E-10', values: { turbidity_NTU: 3 } }]);
  });
  it('REQ-10  o2_saturation_pct > 50', async () => {
    await proveBothWays('M277E-10', 'REQ-10',
      [{ ws: 'M277E-10', values: { o2_saturation_pct: 60 } }],
      [{ ws: 'M277E-10', values: { o2_saturation_pct: 40 } }]);
  });
  it('REQ-10-2  o2_saturation_pct > 50 (duplicate)', async () => {
    await proveBothWays('M277E-10', 'REQ-10-2',
      [{ ws: 'M277E-10', values: { o2_saturation_pct: 60 } }],
      [{ ws: 'M277E-10', values: { o2_saturation_pct: 40 } }]);
  });
  it('REQ-14  IF C2 THEN total_coliforms_treated < 10000', async () => {
    await proveBothWays('M277E-10', 'REQ-14',
      [{ ws: 'M277E-14', values: { quality_category: 'C2' } }, { ws: 'M277E-10', values: { total_coliforms_treated: 5000 } }],
      [{ ws: 'M277E-10', values: { total_coliforms_treated: 20000 } }]);
  });
  it('REQ-15  IF C2 THEN p_aeruginosa < 100', async () => {
    await proveBothWays('M277E-10', 'REQ-15',
      [{ ws: 'M277E-14', values: { quality_category: 'C2' } }, { ws: 'M277E-10', values: { p_aeruginosa: 50 } }],
      [{ ws: 'M277E-10', values: { p_aeruginosa: 200 } }]);
  });
  it('REQ-20  attest_m277e_10_req_20 == True', async () => {
    await proveBothWays('M277E-10', 'REQ-20',
      [{ ws: 'M277E-10', values: { attest_m277e_10_req_20: true } }],
      [{ ws: 'M277E-10', values: { attest_m277e_10_req_20: false } }]);
  });
  it('REQ-22  attest_m277e_10_req_22 == True', async () => {
    await proveBothWays('M277E-10', 'REQ-22',
      [{ ws: 'M277E-10', values: { attest_m277e_10_req_22: true } }],
      [{ ws: 'M277E-10', values: { attest_m277e_10_req_22: false } }]);
  });
  it('REQ-23  IF discharge_into_water_body THEN WHG_permit_present', async () => {
    await proveBothWays('M277E-10', 'REQ-23',
      [{ ws: 'M277E-10', values: { discharge_into_water_body: true, WHG_permit_present: true } }],
      [{ ws: 'M277E-10', values: { WHG_permit_present: false } }]);
  });
  it('REQ-25  attest_m277e_10_req_25 == True', async () => {
    await proveBothWays('M277E-10', 'REQ-25',
      [{ ws: 'M277E-10', values: { attest_m277e_10_req_25: true } }],
      [{ ws: 'M277E-10', values: { attest_m277e_10_req_25: false } }]);
  });
});

describe('DWA-M-277E — M277E-11 Bewässerung (commissioning + handover + maintenance)', () => {
  it('REQ-13  authority_notification_sent == True', async () => {
    await proveBothWays('M277E-11', 'REQ-13',
      [{ ws: 'M277E-11', values: { authority_notification_sent: true } }],
      [{ ws: 'M277E-11', values: { authority_notification_sent: false } }]);
  });
  it('REQ-13-2  authority_notification_sent == true (duplicate)', async () => {
    await proveBothWays('M277E-11', 'REQ-13-2',
      [{ ws: 'M277E-11', values: { authority_notification_sent: true } }],
      [{ ws: 'M277E-11', values: { authority_notification_sent: false } }]);
  });
  it('REQ-20  handover_certificate_present AND user_manual_handed_over', async () => {
    await proveBothWays('M277E-11', 'REQ-20',
      [{ ws: 'M277E-11', values: { handover_certificate_present: true, user_manual_handed_over: true } }],
      [{ ws: 'M277E-11', values: { user_manual_handed_over: false } }]);
  });
  it('REQ-22  maintenance_contract_present == true', async () => {
    await proveBothWays('M277E-11', 'REQ-22',
      [{ ws: 'M277E-11', values: { maintenance_contract_present: true } }],
      [{ ws: 'M277E-11', values: { maintenance_contract_present: false } }]);
  });
});

describe('DWA-M-277E — M277E-14 Qualitätskategorie C1/C2 (quality category + water balance)', () => {
  it('REQ-03  (C1 AND type∈{A1,A2}) OR C2 — quality_category local, greywater_type fallback', async () => {
    await proveBothWays('M277E-14', 'REQ-03',
      [{ ws: 'M277E-14', values: { quality_category: 'C2' } }, { ws: 'M277E-02', values: { greywater_type: 'A1' } }],
      [{ ws: 'M277E-14', values: { quality_category: 'C1' } }, { ws: 'M277E-02', values: { greywater_type: 'B1' } }]);
  });
  it('REQ-07  Q_WB == (Q_GW - Q_SW) — ALL operands via cross-ws fallback', async () => {
    await proveBothWays('M277E-14', 'REQ-07',
      [{ ws: 'M277E-07', values: { Q_GW: 1625 } }, { ws: 'M277E-06', values: { Q_SW: 875 } }, { ws: 'M277E-08', values: { Q_WB: 750 } }],
      [{ ws: 'M277E-08', values: { Q_WB: 100 } }]);
  });
});

describe('DWA-M-277E — M277E-23 Betrieb & Eigenüberwachung (Table 4 re-host + discharge + attest)', () => {
  it('REQ-08  IF C2 THEN turbidity_NTU < 2 (turbidity via fallback from M277E-10)', async () => {
    await proveBothWays('M277E-23', 'REQ-08',
      [{ ws: 'M277E-14', values: { quality_category: 'C2' } }, { ws: 'M277E-10', values: { turbidity_NTU: 1 } }],
      [{ ws: 'M277E-10', values: { turbidity_NTU: 3 } }]);
  });
  it('REQ-09  IF C2 THEN BOD5 < 5 (BOD5 via fallback from M277E-08)', async () => {
    await proveBothWays('M277E-23', 'REQ-09',
      [{ ws: 'M277E-14', values: { quality_category: 'C2' } }, { ws: 'M277E-08', values: { BOD5: 3 } }],
      [{ ws: 'M277E-08', values: { BOD5: 8 } }]);
  });
  it('REQ-14  IF C2 THEN total_coliforms_treated < 10000 (fallback)', async () => {
    await proveBothWays('M277E-23', 'REQ-14',
      [{ ws: 'M277E-14', values: { quality_category: 'C2' } }, { ws: 'M277E-10', values: { total_coliforms_treated: 5000 } }],
      [{ ws: 'M277E-10', values: { total_coliforms_treated: 20000 } }]);
  });
  it('REQ-15  IF C2 THEN p_aeruginosa < 100 (fallback)', async () => {
    await proveBothWays('M277E-23', 'REQ-15',
      [{ ws: 'M277E-14', values: { quality_category: 'C2' } }, { ws: 'M277E-10', values: { p_aeruginosa: 50 } }],
      [{ ws: 'M277E-10', values: { p_aeruginosa: 200 } }]);
  });
  it('REQ-23  IF discharge_into_water_body THEN WHG_permit_present (fallback)', async () => {
    await proveBothWays('M277E-23', 'REQ-23',
      [{ ws: 'M277E-10', values: { discharge_into_water_body: true, WHG_permit_present: true } }],
      [{ ws: 'M277E-10', values: { WHG_permit_present: false } }]);
  });
  it('REQ-25  attest_m277e_23_req_25 == True (local)', async () => {
    await proveBothWays('M277E-23', 'REQ-25',
      [{ ws: 'M277E-23', values: { attest_m277e_23_req_25: true } }],
      [{ ws: 'M277E-23', values: { attest_m277e_23_req_25: false } }]);
  });
});
