/**
 * DWA-A 131 ("Bemessung von einstufigen Belebungsanlagen"; Arbeitsblatt DWA-A 131,
 * Juni 2016) — REAL save-path execution proof.
 *
 * SOURCE-ABSENT NOTICE: the DWA-A-131 source PDF is NOT in the library (confirmed
 * this session — no DWA-A-131 folder under C:\Users\Ekowai\Desktop\Guidelines\). This
 * harness proves ENFORCEMENT (gates block both-ways through the real save path); it
 * does NOT verify any threshold against a source, because there is none. Conditions
 * are verbatim from prod; no numeric value is asserted to be "correct".
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the
 * standard's live BLOCK gates (severity='block' + non-empty condition) by driving
 * each drivable one through the REAL enforcement chain against a disposable embedded
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
 * DRIVABILITY (20 block gates, all severity='block'):
 *   - 15 DRIVEN BOTH WAYS (real conditions):
 *       CR-001, CR-002, CR-003, CR-004, CR-005, CR-006, CR-007, CR-008, CR-009,
 *       CR-010, CR-011, CR-012, CR-014, CR-015, CR-016.
 *   - 5 documentary tautologies (condition literally `TRUE`): CR-013, CR-017, CR-018,
 *       CR-019, CR-020. `TRUE` always evaluates `pass`, so NO violating state exists —
 *       they can never appear in failingBlockConditions. Proven "always-pass, never
 *       blocks" (a real enforcement-path property) and LOGGED as not-both-ways-drivable
 *       by construction. This is the gate's own semantics, not a coverage gap.
 *
 * COVERED GATE SHAPES (drivable):
 *   - numeric range AND (CR-001, CR-004, CR-008)         : `a <= x AND x <= b`
 *   - simple ordering compare (CR-002/003/005/011/012/014/015/009) : `x >=|<=|< literal`
 *   - enum-guard-as-OR, parenthesised (CR-006, CR-007)   : `(enum==v AND n<=a) OR (n<=b)`
 *   - bare-symbol-RHS ordering inside OR (CR-010)        : `(enum==v AND Q_RS<=Q_M) OR (Q_RS<=0.75*Q_M)`
 *   - arithmetic multi-operand compare (CR-016)          : `Q_SR >= (Q_RS*TS_RS - Q_K*TS_BB)/TS_BS`
 *
 * CROSS-WORKSHEET FALLBACK proven: CR-010 (home A131-06) reads Q_M — a field on
 * A131-02 — via the conflict-free project-wide fallback.
 *
 * F-4 / KNOWN-RISK PROOF (CR-010): the sub-term `Q_RS <= Q_M` is an ordering compare
 * with a BARE-IDENTIFIER RHS — historically the shape that string-coerced the RHS to
 * the symbol NAME and made the gate silently never enforce. The passing drive below
 * (Q_RS=90, Q_M=100; second disjunct 90 <= 0.75*100=75 is FALSE) passes ONLY because
 * `Q_RS <= Q_M` evaluates NUMERICALLY to true via the acompare route. A regression to
 * string-RHS would keep it blocked in the passing state → this test would go red.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4
 * known engine traps are present — see the header of seed-a131.ts for the itemised
 * result (only bare-ident RHS is CR-010's ordering `Q_RS <= Q_M`, routed to numeric
 * acompare and proven; no `!= null` gate; no IN-set; no unparenthesised IF/THEN).
 */
// @vitest-environment node
import './_harness-env-a131'; // top-level-await: PG + seedA131 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA131Harness } from './_harness-env-a131';
import { A131_GATES } from './seed-a131';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA131Harness();

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

describe('DWA-A-131 — seed sanity (topology matches the 20 prod block gates)', () => {
  it('seeds all 8 worksheet instances and 20 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'A131-01', 'A131-02', 'A131-03', 'A131-04',
      'A131-05', 'A131-06', 'A131-07', 'A131-08',
    ]);
    expect(A131_GATES.length).toBe(20);
    expect(A131_GATES.every((g) => g.sev === 'block')).toBe(true);
    expect(A131_GATES.filter((g) => g.drivable).length).toBe(15);
    expect(A131_GATES.filter((g) => !g.drivable).map((g) => g.code).sort())
      .toEqual(['CR-013', 'CR-017', 'CR-018', 'CR-019', 'CR-020']);
  });
});

describe('DWA-A-131 — A131-02 Belastungsdaten und CSB-Fraktionierung (§5.1.1)', () => {
  it('CR-001  T >= 8 AND T <= 20 (range)', async () => {
    await proveBothWays('A131-02', 'CR-001',
      [{ ws: 'A131-02', values: { T: 15 } }],
      [{ ws: 'A131-02', values: { T: 25 } }]); // above upper bound → AND false
  });
});

describe('DWA-A-131 — A131-03 Erforderliches Schlammalter (§5.1.3 / §5.1.6 / §5.2.4)', () => {
  it('CR-002  PF >= 1.5', async () => {
    await proveBothWays('A131-03', 'CR-002',
      [{ ws: 'A131-03', values: { PF: 2 } }],
      [{ ws: 'A131-03', values: { PF: 1 } }]);
  });
  it('CR-003  t_TS_Bem >= 20', async () => {
    await proveBothWays('A131-03', 'CR-003',
      [{ ws: 'A131-03', values: { t_TS_Bem: 25 } }],
      [{ ws: 'A131-03', values: { t_TS_Bem: 10 } }]);
  });
  it('CR-004  V_D_V_BB >= 0.2 AND V_D_V_BB <= 0.6 (range)', async () => {
    await proveBothWays('A131-03', 'CR-004',
      [{ ws: 'A131-03', values: { V_D_V_BB: 0.4 } }],
      [{ ws: 'A131-03', values: { V_D_V_BB: 0.7 } }]); // above upper bound
  });
});

describe('DWA-A-131 — A131-04 Denitrifikationsvolumen und Schlammproduktion (§5.2.5)', () => {
  it('CR-005  x_iter <= 1 (iteration criterion)', async () => {
    await proveBothWays('A131-04', 'CR-005',
      [{ ws: 'A131-04', values: { x_iter: 0.5 } }],
      [{ ws: 'A131-04', values: { x_iter: 2 } }]);
  });
});

describe('DWA-A-131 — A131-06 Bemessung der Nachklaerung (§6)', () => {
  it('CR-006  (nklb==vertikal AND q_SV<=650) OR (q_SV<=500) (parenthesised enum-guard OR)', async () => {
    await proveBothWays('A131-06', 'CR-006',
      // pass: vertikal + q_SV=600 → first disjunct true (600<=650); second (600<=500) false
      [{ ws: 'A131-06', values: { nklb_durchstroemung: 'vertikal', q_SV: 600 } }],
      // violate: vertikal + q_SV=700 → first 700<=650 false; second 700<=500 false → fail
      [{ ws: 'A131-06', values: { q_SV: 700 } }]);
  });
  it('CR-007  (nklb==vertikal AND q_A<=2.0) OR (q_A<=1.6)', async () => {
    await proveBothWays('A131-06', 'CR-007',
      [{ ws: 'A131-06', values: { nklb_durchstroemung: 'vertikal', q_A: 1.8 } }], // first true
      [{ ws: 'A131-06', values: { q_A: 2.5 } }]); // both disjuncts false
  });
  it('CR-008  ISV >= 50 AND ISV <= 200 (range)', async () => {
    await proveBothWays('A131-06', 'CR-008',
      [{ ws: 'A131-06', values: { ISV: 120 } }],
      [{ ws: 'A131-06', values: { ISV: 30 } }]); // below lower bound
  });
  it('CR-009  VSV < 600', async () => {
    await proveBothWays('A131-06', 'CR-009',
      [{ ws: 'A131-06', values: { VSV: 400 } }],
      [{ ws: 'A131-06', values: { VSV: 700 } }]);
  });
  it('CR-010  (nklb==vertikal AND Q_RS<=Q_M) OR (Q_RS<=0.75*Q_M) — bare-symbol RHS + cross-ws fallback (F-4 proof)', async () => {
    // Q_M is homed on A131-02 → resolved cross-worksheet via the project-wide fallback.
    // Pass state passes ONLY because `Q_RS <= Q_M` evaluates NUMERICALLY (acompare):
    //   Q_RS=90, Q_M=100 → first disjunct 90<=100 TRUE; second 90<=0.75*100=75 FALSE.
    // A string-coerced RHS ("Q_M" as a name) would make the first disjunct false and
    // the gate would (wrongly) block here — so a green pass IS the F-4 proof.
    await proveBothWays('A131-06', 'CR-010',
      [{ ws: 'A131-02', values: { Q_M: 100 } }, { ws: 'A131-06', values: { Q_RS: 90 } }],
      // violate: Q_RS=120 → first 120<=100 false; second 120<=75 false → fail
      [{ ws: 'A131-06', values: { Q_RS: 120 } }]);
  });
  it('CR-011  TS_BB > 1.0', async () => {
    await proveBothWays('A131-06', 'CR-011',
      [{ ws: 'A131-06', values: { TS_BB: 4 } }],
      [{ ws: 'A131-06', values: { TS_BB: 0.5 } }]);
  });
  it('CR-012  RV >= 0.5', async () => {
    await proveBothWays('A131-06', 'CR-012',
      [{ ws: 'A131-06', values: { RV: 0.8 } }],
      [{ ws: 'A131-06', values: { RV: 0.3 } }]);
  });
  it('CR-016  Q_SR >= (Q_RS*TS_RS - Q_K*TS_BB)/TS_BS (arithmetic multi-operand)', async () => {
    // RHS = (10*8 - 5*4)/2 = (80-20)/2 = 30.  pass: Q_SR=100 (>=30); violate: Q_SR=10 (<30).
    await proveBothWays('A131-06', 'CR-016',
      [{ ws: 'A131-06', values: { Q_SR: 100, Q_RS: 10, TS_RS: 8, Q_K: 5, TS_BB: 4, TS_BS: 2 } }],
      [{ ws: 'A131-06', values: { Q_SR: 10 } }]);
  });
});

describe('DWA-A-131 — A131-07 Bemessung der Belebung (§7.2)', () => {
  it('CR-014  t_T >= 2 (minimum cycle time)', async () => {
    await proveBothWays('A131-07', 'CR-014',
      [{ ws: 'A131-07', values: { t_T: 3 } }],
      [{ ws: 'A131-07', values: { t_T: 1 } }]);
  });
});

describe('DWA-A-131 — A131-08 Nachweise und Zusammenstellung (§7.4)', () => {
  it('CR-015  S_KS_AB >= 1.5 (minimum acid capacity)', async () => {
    await proveBothWays('A131-08', 'CR-015',
      [{ ws: 'A131-08', values: { S_KS_AB: 2 } }],
      [{ ws: 'A131-08', values: { S_KS_AB: 1 } }]);
  });
});

describe('DWA-A-131 — TRUE documentary gates (tautology: always pass, never block)', () => {
  // These 5 gates have condition literally `TRUE`. No violating state exists — the
  // condition is a tautology — so they cannot be driven both-ways by construction.
  // We prove the real, checkable property: they NEVER appear in failingBlockConditions
  // regardless of persisted state. This is honest coverage, not a claim of both-ways.
  for (const g of A131_GATES.filter((x) => !x.drivable)) {
    it(`${g.code}  TRUE — never blocks (documentary attestation, not both-ways drivable)`, async () => {
      expect(await gateBlocks(g.ws, g.code), `${g.code}@${g.ws} must never block (TRUE)`).toBe(false);
    });
  }
});
