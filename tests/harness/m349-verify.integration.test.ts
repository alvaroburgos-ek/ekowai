/**
 * DWA-M 349 ("Biologische Stickstoffelimination von Schlammwässern der anaeroben
 * Schlammstabilisierung"; Merkblatt DWA-M 349, Mai 2019, 1. Auflage) — REAL
 * save-path execution proof.
 *
 * SOURCE-ABSENT NOTICE: the DWA-M-349 source PDF is NOT in the library. This harness
 * proves ENFORCEMENT (gates behave correctly through the real save path); it does NOT
 * verify any threshold against a source, because there is none. Conditions are
 * verbatim from prod; no numeric value is asserted to be "correct".
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the
 * standard's 27 live BLOCK gates (all severity='block' + non-empty condition) by
 * driving each through the REAL enforcement chain against a disposable embedded
 * Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists
 *                                      the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts).
 *
 *   - 16 DRIVABLE gates: proven ENFORCING BOTH ways — a persisted state where the
 *     gate does NOT block, and a persisted state where it DOES (the F-4 lesson).
 *   - 11 literal-`TRUE` NO-OP gates: cannot fail in ANY state (parse to `{lit true}`
 *     → always `pass`). Proven by the negative — absent from failingBlockConditions
 *     in the EMPTY seed state AND after the full drivable battery has populated the
 *     project. LOGGED, not fixed (source-absent + owner-gated; a prior SEV-1's fix is
 *     WRITTEN-NOT-APPLIED).
 *
 * COVERED GATE SHAPES (16 drivable, all severity='block'):
 *   - 4-conjunct numeric range (CR-001)             : `a>=x AND a<=y AND b>=p AND b<=q`
 *   - 2-conjunct numeric range (CR-010, CR-014)     : `x >= a AND x <= b`
 *   - existence IS NOT NULL, number (CR-002)        : `x IS NOT NULL`
 *   - existence IS NOT NULL, enum (CR-009)          : `enum IS NOT NULL`
 *   - simple ordering compare (CR-004/008/011/012/013/015) : `x >/>=/</<= literal`
 *   - numeric equality (CR-005)                     : `x == 1.3`
 *   - parenthesised AND-of-ORs incl. IN-set (CR-006): `(enum==v AND range) OR (enum IN{..} AND range)`
 *   - enum-eq AND numeric compare (CR-007)          : `enum == 'v' AND n < a`
 *   - boolean equality OR (CR-019)                  : `flag == false OR flag == true`
 *   - boolean equality AND (CR-017)                 : `flag == true AND flag == true`
 *
 * CROSS-WORKSHEET FALLBACK proven: CR-006 and CR-007 (home M349-05) read
 * `schlammsystem`, whose home is M349-01 — resolved via the conflict-free
 * project-wide fallback (single-home topology).
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4
 * known engine traps are present — see the header of seed-m349.ts for the itemised
 * result (no field==field RHS; no `!= null` gate; no Titlecase-vs-lowercase IN-set;
 * no unparenthesised IF/THEN nest). All 16 drivable gates reach a definite `fail` in
 * their violating state.
 */
// @vitest-environment node
import './_harness-env-m349'; // top-level-await: PG + seedM349 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM349Harness } from './_harness-env-m349';
import { M349_GATES } from './seed-m349';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM349Harness();

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

const NOOP_GATES = M349_GATES.filter((g) => g.noop);
const DRIVABLE_GATES = M349_GATES.filter((g) => !g.noop);

describe('DWA-M-349 — seed sanity (topology matches the 27 prod block gates)', () => {
  it('seeds all 8 worksheet instances', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'M349-01', 'M349-02', 'M349-03', 'M349-04',
      'M349-05', 'M349-06', 'M349-07', 'M349-08',
    ]);
  });
  it('has 27 block gates, all severity=block, non-empty condition', () => {
    expect(M349_GATES.length).toBe(27);
    expect(M349_GATES.every((g) => g.sev === 'block')).toBe(true);
    expect(M349_GATES.every((g) => g.cond.trim().length > 0)).toBe(true);
  });
  it('partitions into 16 drivable + 11 literal-TRUE no-op gates', () => {
    expect(DRIVABLE_GATES.length).toBe(16);
    expect(NOOP_GATES.length).toBe(11);
    expect(NOOP_GATES.every((g) => g.cond === 'TRUE')).toBe(true);
  });
});

describe('DWA-M-349 — literal-TRUE no-op gates never block (empty seed state)', () => {
  // Before ANY save: a TRUE condition parses to {lit true} → always pass → can never
  // enter failingBlockConditions. Prove the negative on every one of the 11.
  for (const g of NOOP_GATES) {
    it(`${g.code}@${g.ws}  TRUE → never in failingBlockConditions (empty state)`, async () => {
      expect(await gateBlocks(g.ws, g.code), `${g.code} must not block`).toBe(false);
    });
  }
});

describe('DWA-M-349 — M349-02 Schlammwasser-Charakterisierung (§6.2.2)', () => {
  it('CR-001  S_NH4_N 600..1300 AND pH_wert 7..8 (4-conjunct range)', async () => {
    await proveBothWays('M349-02', 'CR-001',
      [{ ws: 'M349-02', values: { S_NH4_N: 800, pH_wert: 7.5 } }],
      [{ ws: 'M349-02', values: { S_NH4_N: 1500, pH_wert: 7.5 } }]); // above upper bound → conjunct false
  });
  it('CR-002  B_d_x_Rueck IS NOT NULL (existence, number)', async () => {
    await proveBothWays('M349-02', 'CR-002',
      [{ ws: 'M349-02', values: { B_d_x_Rueck: 120 } }],
      [{ ws: 'M349-02', values: { B_d_x_Rueck: null } }]);
  });
});

describe('DWA-M-349 — M349-03 Prozessgrundlagen (§4.5.1)', () => {
  it('CR-004  T > 23', async () => {
    await proveBothWays('M349-03', 'CR-004',
      [{ ws: 'M349-03', values: { T: 25 } }],
      [{ ws: 'M349-03', values: { T: 20 } }]);
  });
  it('CR-012  c_NO2_reaktor < 5', async () => {
    await proveBothWays('M349-03', 'CR-012',
      [{ ws: 'M349-03', values: { c_NO2_reaktor: 3 } }],
      [{ ws: 'M349-03', values: { c_NO2_reaktor: 8 } }]);
  });
  it('CR-013  c_O2_reaktor <= 1', async () => {
    await proveBothWays('M349-03', 'CR-013',
      [{ ws: 'M349-03', values: { c_O2_reaktor: 0.8 } }],
      [{ ws: 'M349-03', values: { c_O2_reaktor: 2 } }]);
  });
});

describe('DWA-M-349 — M349-04 Auslegung Nitritation/Denitritation (§5.2.2)', () => {
  it('CR-008  HRT_denitritation >= 0.3', async () => {
    await proveBothWays('M349-04', 'CR-008',
      [{ ws: 'M349-04', values: { HRT_denitritation: 0.5 } }],
      [{ ws: 'M349-04', values: { HRT_denitritation: 0.1 } }]);
  });
  it('CR-009  c_quelle_typ IS NOT NULL (existence, enum)', async () => {
    await proveBothWays('M349-04', 'CR-009',
      [{ ws: 'M349-04', values: { c_quelle_typ: 'methanol' } }],
      [{ ws: 'M349-04', values: { c_quelle_typ: null } }]);
  });
  it('CR-010  c_O2_nitritation_soll 1..1.5 (range)', async () => {
    await proveBothWays('M349-04', 'CR-010',
      [{ ws: 'M349-04', values: { c_O2_nitritation_soll: 1.2 } }],
      [{ ws: 'M349-04', values: { c_O2_nitritation_soll: 2 } }]);
  });
});

describe('DWA-M-349 — M349-05 Auslegung Deammonifikation (§4.6 / §5) — cross-worksheet fallback', () => {
  it('CR-005  verhaeltnis_no2_nh4 == 1.3 (numeric equality)', async () => {
    await proveBothWays('M349-05', 'CR-005',
      [{ ws: 'M349-05', values: { verhaeltnis_no2_nh4: 1.3 } }],
      [{ ws: 'M349-05', values: { verhaeltnis_no2_nh4: 1.5 } }]);
  });
  it('CR-006  (art==suspendiert AND rb 0.2..0.5) OR (art IN{biofilm,granula} AND rb 0.5..2.0) — IN-set branch + fallback', async () => {
    // pass via the biofilm branch (exercises the IN {biofilm,granula} membership → true);
    // schlammsystem is home M349-01, read cross-worksheet from M349-05 via fallback.
    await proveBothWays('M349-05', 'CR-006',
      [{ ws: 'M349-01', values: { schlammsystem: 'biofilm' } }, { ws: 'M349-05', values: { N_raumbelastung: 1.0 } }],
      [{ ws: 'M349-05', values: { N_raumbelastung: 3.0 } }]); // biofilm branch: 3.0>2.0 false; suspendiert branch: art mismatch → OR false
  });
  it('CR-007  schlammsystem == suspendiert AND N_raumbelastung < 0.5 (enum-eq AND compare, fallback)', async () => {
    await proveBothWays('M349-05', 'CR-007',
      [{ ws: 'M349-01', values: { schlammsystem: 'suspendiert' } }, { ws: 'M349-05', values: { N_raumbelastung: 0.3 } }],
      [{ ws: 'M349-05', values: { N_raumbelastung: 1.0 } }]); // guard true, 1.0<0.5 false → AND false
  });
  it('CR-014  nh4_betriebsbereich 10..200 (range)', async () => {
    await proveBothWays('M349-05', 'CR-014',
      [{ ws: 'M349-05', values: { nh4_betriebsbereich: 100 } }],
      [{ ws: 'M349-05', values: { nh4_betriebsbereich: 5 } }]);
  });
});

describe('DWA-M-349 — M349-06 Belüftung, Dosierung und Anlagentechnik', () => {
  it('CR-019  speicher_erforderlich == false OR ex_schutz_speicher == true (boolean OR)', async () => {
    await proveBothWays('M349-06', 'CR-019',
      [{ ws: 'M349-06', values: { speicher_erforderlich: true, ex_schutz_speicher: true } }],   // right disjunct true
      [{ ws: 'M349-06', values: { speicher_erforderlich: true, ex_schutz_speicher: false } }]); // both disjuncts false
  });
});

describe('DWA-M-349 — M349-07 Betrieb: Analytik, Inbetriebnahme', () => {
  it('CR-011  nitrat_anteil_zulauffracht < 15', async () => {
    await proveBothWays('M349-07', 'CR-011',
      [{ ws: 'M349-07', values: { nitrat_anteil_zulauffracht: 10 } }],
      [{ ws: 'M349-07', values: { nitrat_anteil_zulauffracht: 20 } }]);
  });
  it('CR-015  leistungssteigerung_rate <= 3.5', async () => {
    await proveBothWays('M349-07', 'CR-015',
      [{ ws: 'M349-07', values: { leistungssteigerung_rate: 3 } }],
      [{ ws: 'M349-07', values: { leistungssteigerung_rate: 5 } }]);
  });
  it('CR-017  messung_temperatur == true AND messung_pH == true (boolean AND)', async () => {
    await proveBothWays('M349-07', 'CR-017',
      [{ ws: 'M349-07', values: { messung_temperatur: true, messung_pH: true } }],
      [{ ws: 'M349-07', values: { messung_temperatur: true, messung_pH: false } }]); // second conjunct false
  });
});

describe('DWA-M-349 — literal-TRUE no-op gates STILL never block (fully populated state)', () => {
  // After the whole drivable battery has persisted values across the project, re-prove
  // the negative: a TRUE gate cannot be dragged into failingBlockConditions by ANY
  // state. This is the F-4-inverse — a no-op gate that never enforces, confirmed live.
  for (const g of NOOP_GATES) {
    it(`${g.code}@${g.ws}  TRUE → still never in failingBlockConditions (populated state)`, async () => {
      expect(await gateBlocks(g.ws, g.code), `${g.code} must not block`).toBe(false);
    });
  }
});
