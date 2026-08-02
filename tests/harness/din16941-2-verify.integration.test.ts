/**
 * DIN EN 16941-2:2021 ("Vor-Ort-Anlagen für Nicht-Trinkwasser — Teil 2: behandeltes
 * Grauwasser") — REAL save-path execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-din16941-2.ts header).
 * The 2 equations (Gl.(1) Y_G §6.2.4.2, Gl.(2) D_G §6.2.4.3) were verified symbol-by-symbol
 * against the printed formulas — both FAITHFUL. This harness is the EXECUTION half: it PROVES
 * the standard's 19 live BLOCK gates (severity='block' + non-empty condition) by driving each
 * through the REAL enforcement chain against a disposable embedded Postgres:
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
 * COVERED GATE SHAPES (19 gates, all severity='block'):
 *   - boolean equality `== true` (CR-01..06, 09, 10, 11, 14, 16, 18, 19)  : attest flags
 *   - numeric acompare, bare-ident RHS ordering (CR-07)                   : ueberlauf >= zufluss
 *   - membership IN {enum} (CR-08)                                        : {AA,AB} (matches enum case)
 *   - existence AND-chain IS NOT NULL (CR-12, CR-17)                      : presence
 *   - numeric acompare vs literal (CR-13)                                 : abstand >= 3
 *   - enum equality, bare-ident RHS = enum value (CR-15)                  : == bestanden
 *
 * NO cross-worksheet operand exists in this standard — every gate symbol is LOCAL to its
 * gate's worksheet, so the project-wide fallback is not exercised (contrast DIN-276/14021).
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4 known
 * engine traps present — see the seed-din16941-2.ts header for the itemised result. All 19
 * gates reach a definite `fail` in their violating state; there are NO literal-TRUE no-op
 * block gates. ONE judgment item (CR-12 min-selection encoded as existence, not the numeric
 * min-identity) is on the sign-off sheet — see the seed header.
 */
// @vitest-environment node
import './_harness-env-din16941-2'; // top-level-await: PG + seed BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDIN16941_2Harness } from './_harness-env-din16941-2';
import { DIN16941_2_GATES } from './seed-din16941-2';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getDIN16941_2Harness();

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

const WS2 = 'DIN-EN-16941-2-02';
const WS3 = 'DIN-EN-16941-2-03';
const WS4 = 'DIN-EN-16941-2-04';
const WS5 = 'DIN-EN-16941-2-05';

describe('DIN-EN-16941-2 — seed sanity (topology matches the 19 prod block gates)', () => {
  it('seeds all 4 gate-home worksheet instances and 19 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([WS2, WS3, WS4, WS5]);
    expect(DIN16941_2_GATES.length).toBe(19);
    expect(DIN16941_2_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DIN-EN-16941-2-02 — Planung (§5 boolean attests + overflow + backflow)', () => {
  for (const [code, sym] of [
    ['DIN-EN-16941-2-CR-01', 'getrennte_sammlung'],
    ['DIN-EN-16941-2-CR-02', 'bypass_vorhanden'],
    ['DIN-EN-16941-2-CR-03', 'behandlung_erreicht_qualitaet'],
    ['DIN-EN-16941-2-CR-04', 'speicher_lichtundurchlaessig'],
    ['DIN-EN-16941-2-CR-05', 'standsicherheit_nachgewiesen'],
    ['DIN-EN-16941-2-CR-06', 'wasserdichtheit_nachgewiesen'],
    ['DIN-EN-16941-2-CR-09', 'pumpe_trockenlaufschutz'],
    ['DIN-EN-16941-2-CR-10', 'anlagensteuerung_vorhanden'],
    ['DIN-EN-16941-2-CR-11', 'keine_querverbindungen_verteilung'],
  ] as const) {
    it(`${code}  ${sym} == true (boolean equality)`, async () => {
      await proveBothWays(WS2, code,
        [{ ws: WS2, values: { [sym]: true } }],
        [{ ws: WS2, values: { [sym]: false } }]);
    });
  }

  it('CR-07  ueberlauf_kapazitaet >= zufluss_kapazitaet (numeric acompare, bare-ident RHS)', async () => {
    await proveBothWays(WS2, 'DIN-EN-16941-2-CR-07',
      [{ ws: WS2, values: { ueberlauf_kapazitaet: 100, zufluss_kapazitaet: 50 } }],
      [{ ws: WS2, values: { ueberlauf_kapazitaet: 40 } }]); // 40 < 50 → fail
  });

  it('CR-08  rueckflusssicherung_typ IN {AA,AB} (membership, enum-case match)', async () => {
    await proveBothWays(WS2, 'DIN-EN-16941-2-CR-08',
      [{ ws: WS2, values: { rueckflusssicherung_typ: 'AA' } }],
      [{ ws: WS2, values: { rueckflusssicherung_typ: 'none' } }]); // outside {AA,AB} → fail
  });
});

describe('DIN-EN-16941-2-03 — Bemessung (§6.1 existence chain)', () => {
  it('CR-12  Y_G / D_G / bemessungswert_massgebend IS NOT NULL (existence AND-chain)', async () => {
    await proveBothWays(WS3, 'DIN-EN-16941-2-CR-12',
      // pass: all three present (61 = min(61, 65) as the massgebend value — presence is what the gate tests)
      [{ ws: WS3, values: { Y_G: 61, D_G: 65, bemessungswert_massgebend: 61 } }],
      // violate: clear bemessungswert_massgebend → AND collapses to fail
      [{ ws: WS3, values: { bemessungswert_massgebend: null } }]);
  });
});

describe('DIN-EN-16941-2-04 — Einbau/Kennzeichnung/Inbetriebnahme/Wasserqualität (§7-§9,§11)', () => {
  it('CR-13  abstand_wurzeln_m >= 3 (numeric acompare vs literal)', async () => {
    await proveBothWays(WS4, 'DIN-EN-16941-2-CR-13',
      [{ ws: WS4, values: { abstand_wurzeln_m: 3 } }],
      [{ ws: WS4, values: { abstand_wurzeln_m: 2 } }]); // < 3 → fail
  });
  it('CR-14  kennzeichnung_nicht_trinkwasser == true (boolean equality)', async () => {
    await proveBothWays(WS4, 'DIN-EN-16941-2-CR-14',
      [{ ws: WS4, values: { kennzeichnung_nicht_trinkwasser: true } }],
      [{ ws: WS4, values: { kennzeichnung_nicht_trinkwasser: false } }]);
  });
  it('CR-15  querverbindungstest_ergebnis == bestanden (enum equality, bare-ident RHS = enum value)', async () => {
    await proveBothWays(WS4, 'DIN-EN-16941-2-CR-15',
      [{ ws: WS4, values: { querverbindungstest_ergebnis: 'bestanden' } }],
      [{ ws: WS4, values: { querverbindungstest_ergebnis: 'nicht_bestanden' } }]);
  });
  it('CR-16  inbetriebnahmeprotokoll_erstellt == true (boolean equality)', async () => {
    await proveBothWays(WS4, 'DIN-EN-16941-2-CR-16',
      [{ ws: WS4, values: { inbetriebnahmeprotokoll_erstellt: true } }],
      [{ ws: WS4, values: { inbetriebnahmeprotokoll_erstellt: false } }]);
  });
  it('CR-17  probenahmestelle_im_verteilsystem / bewertung_status IS NOT NULL (existence AND-chain)', async () => {
    await proveBothWays(WS4, 'DIN-EN-16941-2-CR-17',
      [{ ws: WS4, values: { probenahmestelle_im_verteilsystem: true, bewertung_status: 'gruen' } }],
      // violate: clear the enum status → AND collapses to fail
      [{ ws: WS4, values: { bewertung_status: null } }]);
  });
});

describe('DIN-EN-16941-2-05 — Qualität/Risikobewertung/Wartung (§10,§12)', () => {
  for (const [code, sym] of [
    ['DIN-EN-16941-2-CR-18', 'risikobewertung_durchgefuehrt'],
    ['DIN-EN-16941-2-CR-19', 'betriebstagebuch_gefuehrt'],
  ] as const) {
    it(`${code}  ${sym} == true (boolean equality)`, async () => {
      await proveBothWays(WS5, code,
        [{ ws: WS5, values: { [sym]: true } }],
        [{ ws: WS5, values: { [sym]: false } }]);
    });
  }
});
