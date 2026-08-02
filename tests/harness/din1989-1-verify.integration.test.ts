/**
 * DIN 1989-1 ("Regenwassernutzungsanlagen — Teil 1: Planung, Ausführung, Betrieb
 * und Wartung"; DIN 1989-1:2002-04) — REAL save-path execution proof.
 *
 * SOURCE: PDF present but image-only (scan; pdftotext ≈ 0 chars). The four §16
 * equations were verified in-session against the RENDERED scan pages (SR-3 ground
 * truth): p27 Gl.(1) E_R=A_A×e×h_N×η, p28 Gl.(2) BW_a=P_d×n×365 + Gl.(3)
 * BW_a=A_Bew×BS_a, p29 Gl.(4) V_n=Minimum von (BW_a oder E_R)×0,06 — all FAITHFUL.
 * (Equations are computed fields on -04, not compliance gates; this test proves the
 * GATE layer.)
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the
 * standard's 14 live BLOCK gates (severity='block' + non-empty condition — the
 * standard has NO warn/manual gate) by driving each through the REAL enforcement
 * chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists
 *                                      the ones that definitely `fail`.
 *
 * A gate is proven ENFORCING only when shown BOTH ways: a persisted state where it
 * does NOT block, and a persisted state where it DOES (the F-4 lesson). Nothing is
 * applied to prod here.
 *
 * COVERED GATE SHAPES (14 gates, all severity='block'):
 *   - boolean equality (CR-01/02/03/05/07/08/09/14)  : `flag == true`
 *   - simple ordering compare (CR-04)                : `speicheroeffnung_dn >= 200`
 *   - enum-guard-as-OR (CR-06)                        : `enum != 'v' OR enum2 IN {…}`
 *   - 3-term existence (CR-10)                        : `a IS NOT NULL AND b … AND c …`
 *   - boolean-guard-as-OR (CR-11)                     : `flag != true OR flag2 == true`
 *   - membership over full enum domain (CR-12)        : `enum IN {all-values}`
 *   - two-conjunct boolean AND (CR-13)                : `flag == true AND flag2 == true`
 *
 * ENUM-DOMAIN NO-OP (surfaced + demonstrated by execution): CR-06 and CR-12 cannot
 * reach a definite `fail` for ANY in-domain enum value — their membership sets list
 * the ENTIRE prod enum domain, so every valid selection passes and a blank is
 * `pending`. The dedicated tests below prove (a) the mechanism CAN fail (driven with
 * an out-of-domain value the UI cannot produce), and (b) the worst in-domain state
 * does NOT block. Intent is still enforced because both operand fields are
 * is_required=true in prod (a blank is caught by the missing-required list, a path
 * this fixture leaves off to isolate the block-condition semantics).
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4
 * known engine traps are present — see the header of seed-din1989-1.ts for the
 * itemised result. All 12 unconditionally-failable gates reach a definite `fail` in
 * their violating state; CR-06/CR-12 reach it out-of-domain (documented).
 */
// @vitest-environment node
import './_harness-env-din1989-1'; // top-level-await: PG + seedDin1989 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDin1989Harness } from './_harness-env-din1989-1';
import { DIN1989_GATES } from './seed-din1989-1';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getDin1989Harness();

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

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through
 *  the REAL saveWorksheet. A null value clears the field. */
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

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked;
 *  persist the violating saves → blocked (definite fail). */
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

describe('DIN-1989-1 — seed sanity (topology matches the 14 prod block gates)', () => {
  it('seeds all 6 worksheet instances and 14 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'DIN-1989-1-01', 'DIN-1989-1-02', 'DIN-1989-1-03',
      'DIN-1989-1-04', 'DIN-1989-1-05', 'DIN-1989-1-06',
    ]);
    expect(DIN1989_GATES.length).toBe(14);
    expect(DIN1989_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DIN-1989-1-01 — Registrierung, Anwendungsbereich und Grundlagen (§4.1 / §12.7)', () => {
  it('CR-01  meldepflicht_erfuellt == true (boolean)', async () => {
    await proveBothWays('DIN-1989-1-01', 'DIN-1989-1-CR-01',
      [{ ws: 'DIN-1989-1-01', values: { meldepflicht_erfuellt: true } }],
      [{ ws: 'DIN-1989-1-01', values: { meldepflicht_erfuellt: false } }]);
  });
  it('CR-02  trinkwasser_getrennt == true (boolean)', async () => {
    await proveBothWays('DIN-1989-1-01', 'DIN-1989-1-CR-02',
      [{ ws: 'DIN-1989-1-01', values: { trinkwasser_getrennt: true } }],
      [{ ws: 'DIN-1989-1-01', values: { trinkwasser_getrennt: false } }]);
  });
});

describe('DIN-1989-1-02 — Auffangflächen, Aufbereitung und Regenwasserspeicher (§6.2 / §7; Tab.2)', () => {
  it('CR-03  filter_genormt == true (boolean)', async () => {
    await proveBothWays('DIN-1989-1-02', 'DIN-1989-1-CR-03',
      [{ ws: 'DIN-1989-1-02', values: { filter_genormt: true } }],
      [{ ws: 'DIN-1989-1-02', values: { filter_genormt: false } }]);
  });
  it('CR-04  speicheroeffnung_dn >= 200 (ordering; Tab.2 ≥200 mm)', async () => {
    await proveBothWays('DIN-1989-1-02', 'DIN-1989-1-CR-04',
      [{ ws: 'DIN-1989-1-02', values: { speicheroeffnung_dn: 200 } }],
      [{ ws: 'DIN-1989-1-02', values: { speicheroeffnung_dn: 100 } }]);
  });
});

describe('DIN-1989-1-03 — Pumpen, Nachspeisung, Systemsteuerung und Rohrsysteme (§8–§12)', () => {
  it('CR-05  nachspeisung_vorhanden == true (boolean)', async () => {
    await proveBothWays('DIN-1989-1-03', 'DIN-1989-1-CR-05',
      [{ ws: 'DIN-1989-1-03', values: { nachspeisung_vorhanden: true } }],
      [{ ws: 'DIN-1989-1-03', values: { nachspeisung_vorhanden: false } }]);
  });
  it('CR-06  nachspeisung_medium != trinkwasser OR sicherungseinrichtung_typ IN {AA,AB} (enum-guard-OR)', async () => {
    // Passing: medium is non-potable → left disjunct true (no securing device needed).
    // Violating: to reach a DEFINITE fail both disjuncts must be false → medium=trinkwasser
    // AND sicherungseinrichtung_typ NOT in {AA,AB}. Since {AA,AB} is the ENTIRE prod enum
    // domain, this is only reachable with an OUT-OF-DOMAIN value ('keine') the UI cannot
    // produce. This proves the condition mechanism enforces; the in-domain redundancy is
    // asserted in the ENUM-DOMAIN NO-OP block below.
    await proveBothWays('DIN-1989-1-03', 'DIN-1989-1-CR-06',
      [{ ws: 'DIN-1989-1-03', values: { nachspeisung_medium: 'nichttrinkwasser', sicherungseinrichtung_typ: null } }],
      [{ ws: 'DIN-1989-1-03', values: { nachspeisung_medium: 'trinkwasser', sicherungseinrichtung_typ: 'keine' } }]);
  });
  it('CR-07  trockenlaufschutz == true (boolean)', async () => {
    await proveBothWays('DIN-1989-1-03', 'DIN-1989-1-CR-07',
      [{ ws: 'DIN-1989-1-03', values: { trockenlaufschutz: true } }],
      [{ ws: 'DIN-1989-1-03', values: { trockenlaufschutz: false } }]);
  });
  it('CR-08  fuellstandueberwachung == true (boolean)', async () => {
    await proveBothWays('DIN-1989-1-03', 'DIN-1989-1-CR-08',
      [{ ws: 'DIN-1989-1-03', values: { fuellstandueberwachung: true } }],
      [{ ws: 'DIN-1989-1-03', values: { fuellstandueberwachung: false } }]);
  });
  it('CR-09  leitungskennzeichnung == true (boolean)', async () => {
    await proveBothWays('DIN-1989-1-03', 'DIN-1989-1-CR-09',
      [{ ws: 'DIN-1989-1-03', values: { leitungskennzeichnung: true } }],
      [{ ws: 'DIN-1989-1-03', values: { leitungskennzeichnung: false } }]);
  });
});

describe('DIN-1989-1-04 — Auslegung der Speichergröße (§16.3.8)', () => {
  it('CR-10  V_n IS NOT NULL AND E_R IS NOT NULL AND BW_a IS NOT NULL (3-term existence)', async () => {
    await proveBothWays('DIN-1989-1-04', 'DIN-1989-1-CR-10',
      [{ ws: 'DIN-1989-1-04', values: { V_n: 4000, E_R: 50000, BW_a: 35000 } }],
      [{ ws: 'DIN-1989-1-04', values: { V_n: null } }]); // first conjunct fails
  });
});

describe('DIN-1989-1-05 — Versickerung, Rückstauschutz und Inbetriebnahme (§13 / §14 / §17.2)', () => {
  it('CR-11  ueberlauf_versickerung != true OR versickerung_bemessung_a138 == true (boolean-guard-OR)', async () => {
    // Passing: infiltration IS used AND it is A138-dimensioned → right disjunct true.
    // Violating: infiltration used but NOT A138-dimensioned → both disjuncts false → fail.
    await proveBothWays('DIN-1989-1-05', 'DIN-1989-1-CR-11',
      [{ ws: 'DIN-1989-1-05', values: { ueberlauf_versickerung: true, versickerung_bemessung_a138: true } }],
      [{ ws: 'DIN-1989-1-05', values: { versickerung_bemessung_a138: false } }]);
  });
  it('CR-12  rueckstauschutz_art IN {rueckstaufrei,hebeanlage,rueckstauverschluss,nicht_erforderlich} (membership)', async () => {
    // Passing: any in-domain value. Violating: only an OUT-OF-DOMAIN value ('keine')
    // fails — the set lists the entire prod enum domain (see NO-OP block below).
    await proveBothWays('DIN-1989-1-05', 'DIN-1989-1-CR-12',
      [{ ws: 'DIN-1989-1-05', values: { rueckstauschutz_art: 'hebeanlage' } }],
      [{ ws: 'DIN-1989-1-05', values: { rueckstauschutz_art: 'keine' } }]);
  });
  it('CR-13  inbetriebnahme_fachkundig == true AND inbetriebnahmeprotokoll == true (AND)', async () => {
    await proveBothWays('DIN-1989-1-05', 'DIN-1989-1-CR-13',
      [{ ws: 'DIN-1989-1-05', values: { inbetriebnahme_fachkundig: true, inbetriebnahmeprotokoll: true } }],
      [{ ws: 'DIN-1989-1-05', values: { inbetriebnahmeprotokoll: false } }]); // second conjunct fails
  });
});

describe('DIN-1989-1-06 — Betrieb, Inspektion und Wartung (§18; Tab.5)', () => {
  it('CR-14  wartung_fachkundig == true (boolean)', async () => {
    await proveBothWays('DIN-1989-1-06', 'DIN-1989-1-CR-14',
      [{ ws: 'DIN-1989-1-06', values: { wartung_fachkundig: true } }],
      [{ ws: 'DIN-1989-1-06', values: { wartung_fachkundig: false } }]);
  });
});

describe('DIN-1989-1 — ENUM-DOMAIN NO-OP (block condition cannot fire for any in-domain enum value)', () => {
  it('CR-12: every in-domain rueckstauschutz_art value → NOT blocked (set = full enum domain)', async () => {
    for (const v of ['rueckstaufrei', 'hebeanlage', 'rueckstauverschluss', 'nicht_erforderlich']) {
      await saveSymbols('DIN-1989-1-05', { rueckstauschutz_art: v });
      expect(await gateBlocks('DIN-1989-1-05', 'DIN-1989-1-CR-12'),
        `CR-12 must NOT block for in-domain value '${v}'`).toBe(false);
    }
    // Blank → pending (not fail), so still not in failingBlockConditions.
    await saveSymbols('DIN-1989-1-05', { rueckstauschutz_art: null });
    expect(await gateBlocks('DIN-1989-1-05', 'DIN-1989-1-CR-12'),
      'CR-12 must NOT block (pending) for a blank rueckstauschutz_art').toBe(false);
  });
  it('CR-06: medium=trinkwasser with the ONLY in-domain non-pass state (typ blank) → pending, NOT blocked', async () => {
    // Both in-domain securing types pass; the sole remaining in-domain state is blank,
    // which is `pending` (never `fail`). So CR-06 cannot block within the enum domain.
    await saveSymbols('DIN-1989-1-03', { nachspeisung_medium: 'trinkwasser', sicherungseinrichtung_typ: 'AA' });
    expect(await gateBlocks('DIN-1989-1-03', 'DIN-1989-1-CR-06'), 'CR-06 passes with typ=AA').toBe(false);
    await saveSymbols('DIN-1989-1-03', { sicherungseinrichtung_typ: 'AB' });
    expect(await gateBlocks('DIN-1989-1-03', 'DIN-1989-1-CR-06'), 'CR-06 passes with typ=AB').toBe(false);
    await saveSymbols('DIN-1989-1-03', { sicherungseinrichtung_typ: null });
    expect(await gateBlocks('DIN-1989-1-03', 'DIN-1989-1-CR-06'),
      'CR-06 does NOT block (pending) for blank typ — in-domain it can never fail').toBe(false);
  });
});
