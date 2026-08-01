/**
 * DWA-M 363 (Herkunft und Verwertung von Biogas — Merkblatt, WEISSDRUCK,
 * 1. Auflage Februar 2022) — REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES
 * each of the standard's 35 live BLOCK gates (non-empty condition) by driving it
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
 *   - existence (single + 3-term AND)                C363-01, C363-02, C363-08/08-2
 *   - boolean == True/true (attestation)             C363-09/16/17/13/24/24-2/27/27-2 …
 *   - numeric ordering                               C363-25/25-2 (o2 >= 17)
 *   - two-term numeric AND                           C363-26/26-2 (CO2/H2S Atemluft)
 *   - guarded ordering (IF a<b THEN c>=d)            C363-22 (TA Luft Verweilzeit)
 *   - guarded enum → ordering                        C363-19 (Druckgeräte-RL)
 *   - guarded enum → large-number ordering           C363-20 (Tankstelle >20 MPa)
 *   - guarded ordering → enum !=                      C363-10/10-2/12/12-2/28/28-2
 *   - guarded ordering → existence                   C363-11/11-2
 *   - guarded enum → ordering (Formaldehyd)          C363-21
 *   - EXACT `-2` stray dup gates (both driven)       …-2 variants
 *   - CROSS-WORKSHEET re-homed gates (fallback)      C363-19 (M363-13), C363-20
 *                                                    (M363-16), C363-21 (M363-20)
 */
// @vitest-environment node
import './_harness-env-m363'; // top-level-await: PG + seedM363 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM363Harness } from './_harness-env-m363';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM363Harness();

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

describe('DWA-M-363 — M363-01 Anlagenprofil / M363-02 Biogasqualität (existence)', () => {
  it('C363-01  biogas_quelle IS NOT NULL (§1 Herkunftsbereich dokumentiert)', async () => {
    await proveBothWays('M363-01', 'C363-01',
      [{ ws: 'M363-01', values: { biogas_quelle: 'faulgas' } }],
      [{ ws: 'M363-01', values: { biogas_quelle: null } }]);
  });
  it('C363-02  ch4_anteil AND co2_anteil AND h2s_konz all present (§4.1)', async () => {
    await proveBothWays('M363-02', 'C363-02',
      [{ ws: 'M363-02', values: { ch4_anteil: 60, co2_anteil: 38, h2s_konz: 200 } }],
      [{ ws: 'M363-02', values: { h2s_konz: null } }]); // one of the AND terms missing → block
  });
});

describe('DWA-M-363 — M363-04 TA Luft 2021 Mindestverweilzeit (guarded ordering)', () => {
  it('C363-22  IF substrat_guelleanteil_pct < 100 THEN verweilzeit_gasdicht >= 150 (§5.5)', async () => {
    await proveBothWays('M363-04', 'C363-22',
      [{ ws: 'M363-04', values: { substrat_guelleanteil_pct: 60, verweilzeit_gasdicht: 180 } }],
      [{ ws: 'M363-04', values: { verweilzeit_gasdicht: 120 } }]); // guard true, 120 < 150 → block
  });
  it('C363-22  pure-Gülle plant (guard false, guelleanteil == 100) vacuously passes', async () => {
    await saveSymbols('M363-04', { substrat_guelleanteil_pct: 100, verweilzeit_gasdicht: 10 });
    expect(await gateBlocks('M363-04', 'C363-22')).toBe(false);
  });
});

describe('DWA-M-363 — M363-07 Druckgeräterichtlinie (guarded enum → ordering)', () => {
  it('C363-19  IF speichertyp == gewichtsbelastet THEN speicherbetriebsdruck <= 500 (§6.7)', async () => {
    await proveBothWays('M363-07', 'C363-19',
      [{ ws: 'M363-07', values: { speichertyp: 'gewichtsbelastet', speicherbetriebsdruck: 300 } }],
      [{ ws: 'M363-07', values: { speicherbetriebsdruck: 600 } }]); // >500 at gewichtsbelastet → block
  });
  it('C363-19  non-gewichtsbelastet (guard false) vacuously passes at any pressure', async () => {
    await saveSymbols('M363-07', { speichertyp: 'membranspeicher', speicherbetriebsdruck: 9999 });
    expect(await gateBlocks('M363-07', 'C363-19')).toBe(false);
  });
});

describe('DWA-M-363 — M363-08 Verwertungsweg + Attestierungen + Tankstelle (mis-titled Bioabfall)', () => {
  it('C363-08  verwertungsweg IS NOT NULL (§7.1)', async () => {
    await proveBothWays('M363-08', 'C363-08',
      [{ ws: 'M363-08', values: { verwertungsweg: 'bhkw' } }],
      [{ ws: 'M363-08', values: { verwertungsweg: null } }]);
  });
  it('C363-08-2  EXACT stray dup of C363-08 — the second copy also enforces', async () => {
    await proveBothWays('M363-08', 'C363-08-2',
      [{ ws: 'M363-08', values: { verwertungsweg: 'bhkw' } }],
      [{ ws: 'M363-08', values: { verwertungsweg: null } }]);
  });
  it('C363-09  attest_m363_08_c363_09 == True (Einspeisung DVGW G 260, §7.4.1)', async () => {
    await proveBothWays('M363-08', 'C363-09',
      [{ ws: 'M363-08', values: { attest_m363_08_c363_09: true } }],
      [{ ws: 'M363-08', values: { attest_m363_08_c363_09: false } }]);
  });
  it('C363-16  attest_m363_08_c363_16 == True (Heizkessel 1. BImSchV, §8.1)', async () => {
    await proveBothWays('M363-08', 'C363-16',
      [{ ws: 'M363-08', values: { attest_m363_08_c363_16: true } }],
      [{ ws: 'M363-08', values: { attest_m363_08_c363_16: false } }]);
  });
  it('C363-17  attest_m363_08_c363_17 == True (BHKW Gasmotor Entschwefelung, §9.2.2)', async () => {
    await proveBothWays('M363-08', 'C363-17',
      [{ ws: 'M363-08', values: { attest_m363_08_c363_17: true } }],
      [{ ws: 'M363-08', values: { attest_m363_08_c363_17: false } }]);
  });
  it('C363-20  IF verwertungsweg == tankstelle THEN speicherbetriebsdruck > 200000 (§6.7; druck home M363-07 via fallback)', async () => {
    await proveBothWays('M363-08', 'C363-20',
      [
        { ws: 'M363-08', values: { verwertungsweg: 'tankstelle' } },
        { ws: 'M363-07', values: { speicherbetriebsdruck: 250000 } }, // > 20 MPa → body true
      ],
      [{ ws: 'M363-07', values: { speicherbetriebsdruck: 100000 } }]); // <= 200000 at tankstelle → block
  });
  it('C363-20  non-tankstelle (guard false) vacuously passes', async () => {
    await saveSymbols('M363-08', { verwertungsweg: 'bhkw' });
    await saveSymbols('M363-07', { speicherbetriebsdruck: 100 });
    expect(await gateBlocks('M363-08', 'C363-20')).toBe(false);
  });
});

describe('DWA-M-363 — M363-09 BImSchG / Störfall / Formaldehyd legal set (mis-titled Cofermentation)', () => {
  it('C363-10  IF rohgas_kapazitaet >= 1.2 THEN anlagen_nr_4bimschv != keine (§8.1)', async () => {
    await proveBothWays('M363-09', 'C363-10',
      [{ ws: 'M363-09', values: { rohgas_kapazitaet: 2.0, anlagen_nr_4bimschv: 'nr_8_6_3' } }],
      [{ ws: 'M363-09', values: { anlagen_nr_4bimschv: 'keine' } }]); // genehmigungspflichtig but 'keine' → block
  });
  it('C363-10-2  EXACT stray dup of C363-10 — the second copy also enforces', async () => {
    await proveBothWays('M363-09', 'C363-10-2',
      [{ ws: 'M363-09', values: { rohgas_kapazitaet: 2.0, anlagen_nr_4bimschv: 'nr_8_6_3' } }],
      [{ ws: 'M363-09', values: { anlagen_nr_4bimschv: 'keine' } }]);
  });
  it('C363-11  IF biogasmenge_total >= 10000 THEN privilegierung_baugb IS NOT NULL (§8.1 Störfall)', async () => {
    await proveBothWays('M363-09', 'C363-11',
      [{ ws: 'M363-09', values: { biogasmenge_total: 15000, privilegierung_baugb: true } }],
      [{ ws: 'M363-09', values: { privilegierung_baugb: null } }]);
  });
  it('C363-11-2  EXACT stray dup of C363-11 — the second copy also enforces', async () => {
    await proveBothWays('M363-09', 'C363-11-2',
      [{ ws: 'M363-09', values: { biogasmenge_total: 15000, privilegierung_baugb: true } }],
      [{ ws: 'M363-09', values: { privilegierung_baugb: null } }]);
  });
  it('C363-12  IF feuerungswaermeleistung >= 1 THEN anlagen_nr_4bimschv != keine (44. BImSchV §8.1)', async () => {
    await proveBothWays('M363-09', 'C363-12',
      [{ ws: 'M363-09', values: { feuerungswaermeleistung: 2.0, anlagen_nr_4bimschv: 'nr_1_4' } }],
      [{ ws: 'M363-09', values: { anlagen_nr_4bimschv: 'keine' } }]);
  });
  it('C363-12-2  EXACT stray dup of C363-12 — the second copy also enforces', async () => {
    await proveBothWays('M363-09', 'C363-12-2',
      [{ ws: 'M363-09', values: { feuerungswaermeleistung: 2.0, anlagen_nr_4bimschv: 'nr_1_4' } }],
      [{ ws: 'M363-09', values: { anlagen_nr_4bimschv: 'keine' } }]);
  });
  it('C363-13  attest_m363_09_c363_13 == True (Ex-Schutz Gefährdungsbeurteilung, §10.3)', async () => {
    await proveBothWays('M363-09', 'C363-13',
      [{ ws: 'M363-09', values: { attest_m363_09_c363_13: true } }],
      [{ ws: 'M363-09', values: { attest_m363_09_c363_13: false } }]);
  });
  it('C363-21  IF anlagenstatus == neu THEN formaldehyd_abgas <= 20 (44. BImSchV §9.3.4; home M363-22 via fallback)', async () => {
    await proveBothWays('M363-09', 'C363-21',
      [{ ws: 'M363-22', values: { anlagenstatus: 'neu', formaldehyd_abgas: 15 } }],
      [{ ws: 'M363-22', values: { formaldehyd_abgas: 30 } }]); // neu but 30 > 20 → block
  });
  it('C363-28  IF rohgas_kapazitaet > 2.3 THEN verfahrenstyp_bimschg != nicht_genehmigungsbeduerftig (§8.1 BauGB)', async () => {
    await proveBothWays('M363-09', 'C363-28',
      [{ ws: 'M363-09', values: { rohgas_kapazitaet: 3.0, verfahrenstyp_bimschg: 'genehmigungsbeduerftig' } }],
      [{ ws: 'M363-09', values: { verfahrenstyp_bimschg: 'nicht_genehmigungsbeduerftig' } }]);
  });
  it('C363-28-2  EXACT stray dup of C363-28 — the second copy also enforces', async () => {
    await proveBothWays('M363-09', 'C363-28-2',
      [{ ws: 'M363-09', values: { rohgas_kapazitaet: 3.0, verfahrenstyp_bimschg: 'genehmigungsbeduerftig' } }],
      [{ ws: 'M363-09', values: { verfahrenstyp_bimschg: 'nicht_genehmigungsbeduerftig' } }]);
  });
});

describe('DWA-M-363 — M363-10 Messplatz DIN EN 15259 (mis-titled Fermenter Bemessung)', () => {
  it('C363-24  messplatz_din_en_15259 == true (§9.5)', async () => {
    await proveBothWays('M363-10', 'C363-24',
      [{ ws: 'M363-10', values: { messplatz_din_en_15259: true } }],
      [{ ws: 'M363-10', values: { messplatz_din_en_15259: false } }]);
  });
  it('C363-24-2  EXACT stray dup of C363-24 — the second copy also enforces', async () => {
    await proveBothWays('M363-10', 'C363-24-2',
      [{ ws: 'M363-10', values: { messplatz_din_en_15259: true } }],
      [{ ws: 'M363-10', values: { messplatz_din_en_15259: false } }]);
  });
});

describe('DWA-M-363 — M363-11 O2 / Flammendurchschlagsicherung safety (mis-titled Deponiegasausbeute)', () => {
  it('C363-25  o2_atemluft >= 17 (§10.2 Sauerstoff-Mindestkonzentration)', async () => {
    await proveBothWays('M363-11', 'C363-25',
      [{ ws: 'M363-11', values: { o2_atemluft: 20.9 } }],
      [{ ws: 'M363-11', values: { o2_atemluft: 15 } }]);
  });
  it('C363-25-2  EXACT stray dup of C363-25 — the second copy also enforces', async () => {
    await proveBothWays('M363-11', 'C363-25-2',
      [{ ws: 'M363-11', values: { o2_atemluft: 20.9 } }],
      [{ ws: 'M363-11', values: { o2_atemluft: 15 } }]);
  });
  it('C363-27  flammendurchschlagsicherung == true (§10.3.2)', async () => {
    await proveBothWays('M363-11', 'C363-27',
      [{ ws: 'M363-11', values: { flammendurchschlagsicherung: true } }],
      [{ ws: 'M363-11', values: { flammendurchschlagsicherung: false } }]);
  });
  it('C363-27-2  EXACT stray dup of C363-27 — the second copy also enforces', async () => {
    await proveBothWays('M363-11', 'C363-27-2',
      [{ ws: 'M363-11', values: { flammendurchschlagsicherung: true } }],
      [{ ws: 'M363-11', values: { flammendurchschlagsicherung: false } }]);
  });
});

describe('DWA-M-363 — M363-13 Druckgeräterichtlinie (cross-ws re-home of C363-19, pure fallback)', () => {
  it('C363-19  same gate on M363-13 — speichertyp + speicherbetriebsdruck resolve via fallback (home M363-07)', async () => {
    await proveBothWays('M363-13', 'C363-19',
      [{ ws: 'M363-07', values: { speichertyp: 'gewichtsbelastet', speicherbetriebsdruck: 300 } }],
      [{ ws: 'M363-07', values: { speicherbetriebsdruck: 600 } }]);
  });
});

describe('DWA-M-363 — M363-16 Verwertungsweg attestations + Tankstelle (correctly-titled home)', () => {
  it('C363-09  attest_m363_16_c363_09 == True (Einspeisung DVGW G 260)', async () => {
    await proveBothWays('M363-16', 'C363-09',
      [{ ws: 'M363-16', values: { attest_m363_16_c363_09: true } }],
      [{ ws: 'M363-16', values: { attest_m363_16_c363_09: false } }]);
  });
  it('C363-16  attest_m363_16_c363_16 == True (Heizkessel 1. BImSchV)', async () => {
    await proveBothWays('M363-16', 'C363-16',
      [{ ws: 'M363-16', values: { attest_m363_16_c363_16: true } }],
      [{ ws: 'M363-16', values: { attest_m363_16_c363_16: false } }]);
  });
  it('C363-17  attest_m363_16_c363_17 == True (BHKW Entschwefelung)', async () => {
    await proveBothWays('M363-16', 'C363-17',
      [{ ws: 'M363-16', values: { attest_m363_16_c363_17: true } }],
      [{ ws: 'M363-16', values: { attest_m363_16_c363_17: false } }]);
  });
  it('C363-20  same Tankstelle gate on M363-16 — verwertungsweg (home M363-08) + druck (home M363-07) via fallback', async () => {
    await proveBothWays('M363-16', 'C363-20',
      [
        { ws: 'M363-08', values: { verwertungsweg: 'tankstelle' } },
        { ws: 'M363-07', values: { speicherbetriebsdruck: 250000 } },
      ],
      [{ ws: 'M363-07', values: { speicherbetriebsdruck: 100000 } }]);
  });
});

describe('DWA-M-363 — M363-20 Ex-Schutz + Formaldehyd (correctly-titled legal home)', () => {
  it('C363-13  attest_m363_20_c363_13 == True (Ex-Schutz Gefährdungsbeurteilung)', async () => {
    await proveBothWays('M363-20', 'C363-13',
      [{ ws: 'M363-20', values: { attest_m363_20_c363_13: true } }],
      [{ ws: 'M363-20', values: { attest_m363_20_c363_13: false } }]);
  });
  it('C363-21  same Formaldehyd gate on M363-20 — anlagenstatus + formaldehyd (home M363-22) via fallback', async () => {
    await proveBothWays('M363-20', 'C363-21',
      [{ ws: 'M363-22', values: { anlagenstatus: 'neu', formaldehyd_abgas: 15 } }],
      [{ ws: 'M363-22', values: { formaldehyd_abgas: 30 } }]);
  });
});

describe('DWA-M-363 — M363-23 Toxizität CO2/H2S Atemluft (two-term numeric AND)', () => {
  it('C363-26  co2_atemluft <= 0.5 AND h2s_atemluft <= 5 (§10.2 Tab.16/17)', async () => {
    await proveBothWays('M363-23', 'C363-26',
      [{ ws: 'M363-23', values: { co2_atemluft: 0.4, h2s_atemluft: 3 } }],
      [{ ws: 'M363-23', values: { h2s_atemluft: 8 } }]); // second AND term violated → block
  });
  it('C363-26-2  EXACT stray dup of C363-26 — the second copy also enforces', async () => {
    await proveBothWays('M363-23', 'C363-26-2',
      [{ ws: 'M363-23', values: { co2_atemluft: 0.4, h2s_atemluft: 3 } }],
      [{ ws: 'M363-23', values: { co2_atemluft: 0.9 } }]); // first AND term violated → block
  });
});
