/**
 * DWA-A 125 ("Rohrvortrieb und verwandte Verfahren"; Arbeitsblatt DWA-A 125,
 * Dezember 2008, korrigierte Fassung September 2020) — REAL save-path execution proof.
 *
 * SOURCE-ABSENT NOTICE: the DWA-A-125 source PDF is NOT in the library. This harness
 * proves ENFORCEMENT (gates block both-ways through the real save path); it does NOT
 * verify any threshold against a source, because there is none. Conditions are
 * verbatim from prod; no numeric value is asserted to be "correct".
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the
 * standard's 16 live BLOCK gates (severity='block' + non-empty condition — all 16 CRs)
 * by driving each through the REAL enforcement chain against a disposable embedded
 * Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists
 *                                      the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and
 * a persisted state where it DOES (the F-4 lesson). Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (16 gates, all severity='block'):
 *   - 3-way parenthesised AND-of-ORs (CR-001)            : `(a AND b) OR (c AND d AND e) OR (f)`
 *   - variable-vs-variable ordering compare (CR-002/005/012): `x <= y` / `x < y` (acompare)
 *   - boolean equality (CR-003/009/013)                  : `flag == true`
 *   - multi-conjunct boolean equality (CR-004/010)       : `a == true AND b == true`
 *   - simple ordering compare (CR-006)                   : `x <= literal`
 *   - enum-eq OR boolean (CR-007)                        : `(enum=='v') OR (flag == true)`
 *   - two-conjunct positivity compare (CR-008)           : `a > 0 AND b > 0`
 *   - existence IS NOT NULL (CR-016)                     : `x IS NOT NULL`
 *   - boolean-false OR (compare AND compare) (CR-011)    : `(flag==false) OR (n<=a AND m<=b)`
 *   - membership IN {set} (CR-014)                       : `enum IN {a,b,c,d}` (see NO-OP note)
 *   - two-conjunct existence, cross-worksheet (CR-015)   : `a IS NOT NULL AND b IS NOT NULL`
 *
 * CROSS-WORKSHEET FALLBACK proven: CR-012 (home A125-06) reads zul_vorpresskraft
 * (home A125-05); CR-015 (home A125-07) reads sondergelaende (home A125-01) — each
 * resolved via the conflict-free project-wide fallback (single-home topology).
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4
 * known engine traps are present — see the header of seed-a125.ts for the itemised
 * result. All 16 gates reach a definite `fail` in their violating state.
 *
 * TRUE NO-OP LOGGED (CR-014): the IN set equals the field's COMPLETE enum domain, so no
 * VALID enum selection can violate it — under input-side enum validation the gate can
 * never block a real user. It is driven both ways here with an out-of-domain string to
 * PROVE the engine's membership path fails on a non-member, but its prod enforcement
 * value is nil (see the `CR-014` test note and the wave report).
 */
// @vitest-environment node
import './_harness-env-a125'; // top-level-await: PG + seedA125 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA125Harness } from './_harness-env-a125';
import { A125_GATES } from './seed-a125';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA125Harness();

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

describe('DWA-A-125 — seed sanity (topology matches the 16 prod block gates)', () => {
  it('seeds all 7 worksheet instances and 16 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'A125-01', 'A125-02', 'A125-03', 'A125-04', 'A125-05', 'A125-06', 'A125-07',
    ]);
    expect(A125_GATES.length).toBe(16);
    expect(A125_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DWA-A-125 — A125-02 Rohre und Verbindungen (§5.2 / §5.3, Tab.1/Tab.2)', () => {
  it('CR-001  (DN<=800 AND tol<=5) OR (DN>800..1200 AND tol<=8) OR (DN>1200) (3-way AND-of-ORs)', async () => {
    await proveBothWays('A125-02', 'CR-001',
      [{ ws: 'A125-02', values: { DN: 500, baulaengentoleranz: 3 } }],   // branch 1 true
      [{ ws: 'A125-02', values: { DN: 500, baulaengentoleranz: 10 } }]); // tol>5, DN not>800, DN not>1200 → all 3 false
  });
  it('CR-002  delta_a <= rechtwinkligkeit_zul (variable-vs-variable ordering → acompare)', async () => {
    await proveBothWays('A125-02', 'CR-002',
      [{ ws: 'A125-02', values: { delta_a: 2, rechtwinkligkeit_zul: 5 } }],
      [{ ws: 'A125-02', values: { delta_a: 8, rechtwinkligkeit_zul: 5 } }]);
  });
  it('CR-003  scherlast_nachweis == true (boolean equality, lowercase literal)', async () => {
    await proveBothWays('A125-02', 'CR-003',
      [{ ws: 'A125-02', values: { scherlast_nachweis: true } }],
      [{ ws: 'A125-02', values: { scherlast_nachweis: false } }]);
  });
  it('CR-004  dichtheit_betrieb == true AND dichtheit_bau == true (multi-conjunct boolean)', async () => {
    await proveBothWays('A125-02', 'CR-004',
      [{ ws: 'A125-02', values: { dichtheit_betrieb: true, dichtheit_bau: true } }],
      [{ ws: 'A125-02', values: { dichtheit_bau: false } }]); // second conjunct false
  });
  it('CR-005  druckuebertragungsring_breite < rohrwanddicke (variable-vs-variable ordering)', async () => {
    await proveBothWays('A125-02', 'CR-005',
      [{ ws: 'A125-02', values: { druckuebertragungsring_breite: 20, rohrwanddicke: 50 } }],
      [{ ws: 'A125-02', values: { druckuebertragungsring_breite: 60, rohrwanddicke: 50 } }]);
  });
});

describe('DWA-A-125 — A125-03 Baugrunderkundung (§7.1.3, DIN 4020/18319, Tab.8)', () => {
  it('CR-006  aufschluss_abstand <= 50 (simple compare)', async () => {
    await proveBothWays('A125-03', 'CR-006',
      [{ ws: 'A125-03', values: { aufschluss_abstand: 30 } }],
      [{ ws: 'A125-03', values: { aufschluss_abstand: 80 } }]);
  });
});

describe('DWA-A-125 — A125-04 Trassierung / Mindestlichtmass (Tab.9/Tab.10)', () => {
  it('CR-007  (personaleinsatz==keiner) OR (mlm_vortriebslaenge_zul == true) (enum-eq OR bool)', async () => {
    await proveBothWays('A125-04', 'CR-007',
      [{ ws: 'A125-04', values: { personaleinsatz: 'keiner', mlm_vortriebslaenge_zul: false } }], // guard branch true
      [{ ws: 'A125-04', values: { personaleinsatz: 'staendig', mlm_vortriebslaenge_zul: false } }]); // both disjuncts false
  });
  it('CR-008  abweichung_vertikal_zul > 0 AND abweichung_horizontal_zul > 0 (two-conjunct positivity)', async () => {
    await proveBothWays('A125-04', 'CR-008',
      [{ ws: 'A125-04', values: { abweichung_vertikal_zul: 10, abweichung_horizontal_zul: 10 } }],
      [{ ws: 'A125-04', values: { abweichung_vertikal_zul: 0 } }]); // first conjunct false (0 not > 0)
  });
});

describe('DWA-A-125 — A125-05 Statik und Standsicherheit (§7.1.x)', () => {
  it('CR-009  vortriebskraft_nachweis == true (boolean equality)', async () => {
    await proveBothWays('A125-05', 'CR-009',
      [{ ws: 'A125-05', values: { vortriebskraft_nachweis: true } }],
      [{ ws: 'A125-05', values: { vortriebskraft_nachweis: false } }]);
  });
  it('CR-010  ortsbrust_standsicherheit == true AND baugrube_standsicherheit == true (multi-conjunct boolean)', async () => {
    await proveBothWays('A125-05', 'CR-010',
      [{ ws: 'A125-05', values: { ortsbrust_standsicherheit: true, baugrube_standsicherheit: true } }],
      [{ ws: 'A125-05', values: { ortsbrust_standsicherheit: false } }]);
  });
  it('CR-016  ueberschnitt IS NOT NULL (existence)', async () => {
    await proveBothWays('A125-05', 'CR-016',
      [{ ws: 'A125-05', values: { ueberschnitt: 15 } }],
      [{ ws: 'A125-05', values: { ueberschnitt: null } }]);
  });
});

describe('DWA-A-125 — A125-06 Vortrieb und Protokollierung', () => {
  it('CR-011  (verfahren_steuerbar==false) OR (laenge<=100 AND zeit<=90) (bool-false OR paren AND)', async () => {
    await proveBothWays('A125-06', 'CR-011',
      [{ ws: 'A125-06', values: { verfahren_steuerbar: false, aufzeichnungsintervall_laenge: 50, aufzeichnungsintervall_zeit: 50 } }], // guard branch true
      [{ ws: 'A125-06', values: { verfahren_steuerbar: true, aufzeichnungsintervall_laenge: 150, aufzeichnungsintervall_zeit: 50 } }]); // both disjuncts false (laenge>100)
  });
  it('CR-012  vorpresskraft_gemessen <= zul_vorpresskraft (ordering, cross-worksheet RHS home A125-05)', async () => {
    await proveBothWays('A125-06', 'CR-012',
      [{ ws: 'A125-06', values: { vorpresskraft_gemessen: 800 } }, { ws: 'A125-05', values: { zul_vorpresskraft: 1000 } }],
      [{ ws: 'A125-06', values: { vorpresskraft_gemessen: 1200 } }]); // exceeds the persisted zul_vorpresskraft
  });
});

describe('DWA-A-125 — A125-07 Gueteueberwachung / Qualifikation / Sondergelaende (§8)', () => {
  it('CR-013  gueteueberwachung == true (boolean equality)', async () => {
    await proveBothWays('A125-07', 'CR-013',
      [{ ws: 'A125-07', values: { gueteueberwachung: true } }],
      [{ ws: 'A125-07', values: { gueteueberwachung: false } }]);
  });
  it('CR-014  unternehmen_qualifikation IN {ral_gz_961,dvgw_gw_301,dvgw_gw_302,gleichwertig} (membership)', async () => {
    // NO-OP CAVEAT: the IN set == the field's complete enum domain, so no VALID enum
    // selection can violate this gate in prod. Here we PROVE the engine's membership
    // path by storing an out-of-domain string in the violating state — enforcement of
    // the SHAPE is proven, but the gate's prod enforcement value against valid input is nil.
    await proveBothWays('A125-07', 'CR-014',
      [{ ws: 'A125-07', values: { unternehmen_qualifikation: 'ral_gz_961' } }],       // in-set member
      [{ ws: 'A125-07', values: { unternehmen_qualifikation: 'nicht_qualifiziert' } }]); // non-member → definite fail
  });
  it('CR-015  sondergelaende IS NOT NULL AND sondergelaende_genehmigung IS NOT NULL (2-conjunct existence, cross-worksheet)', async () => {
    await proveBothWays('A125-07', 'CR-015',
      [{ ws: 'A125-01', values: { sondergelaende: 'bahngelaende' } }, { ws: 'A125-07', values: { sondergelaende_genehmigung: 'zie' } }],
      [{ ws: 'A125-07', values: { sondergelaende_genehmigung: null } }]); // second conjunct fails
  });
});
