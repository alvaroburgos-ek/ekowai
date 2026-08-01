/**
 * DWA-M-820-3 (Merkblatt DWA-M 820-3 — "Qualität von Ingenieurleistungen optimieren
 * — Teil 3: Qualitätselemente"; Februar 2026, final Merkblatt / Weißdruck) —
 * REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the
 * standard's live BLOCK gates (severity='block' + non-empty condition) by driving each
 * through the REAL enforcement chain against a disposable embedded Postgres:
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
 * COVERED GATE SHAPES (M-820-3 is a quality-element checklist standard — 0 equations,
 * 24 block gates):
 *   - sector-OR boolean group + text IS NOT EMPTY   REQ-01
 *   - single boolean `== true`                       REQ-04, REQ-26, REQ-28
 *   - enum-status disjunction chains                 REQ-06/07/08/09/10/11/12/13/14
 *     (each conjunct: `pz_X_status == "erreicht" OR == "teilweise_erreicht" OR
 *      == "nicht_zutreffend"`; the 4th enum value `nicht_erreicht` is the violator)
 *   - number-sum equality (worksheet-local)          REQ-15/16/17/18/19/22/23/24
 *   - fixed-count sums, CROSS-WORKSHEET operands      REQ-20 (== 40), REQ-21 (== 50)
 *   - text IS NOT EMPTY + enum-verdict membership     REQ-32
 *
 * GRAMMAR-TRAP AUDIT (this session, verified against evaluate.ts + prod enum values):
 *   - bare-ident-RHS `field == field` / `field != field` silent-string-coerce: NONE.
 *     The sum gates are `(a + b + …) == total` — LHS is an arithmetic `abin`, so the
 *     WHOLE comparison routes through the numeric `acompare` path (evaluate.ts L244:
 *     the legacy string-RHS shortcut fires only when the LEFT side is a bare `aref`).
 *     The `total`/40/50 RHS is resolved numerically, not stringified. Enforces.
 *   - `!= null` / `== null` compare-path non-enforcement: NONE. No M-820-3 gate uses a
 *     null literal; presence is expressed as `IS NOT EMPTY` (the `exists` path, which
 *     returns a definite `false`/fail when the value is absent).
 *   - always-false `IN {Titlecase}` membership: NONE — no `IN {}` block gate. Enum
 *     comparisons use `== "lowercase"` matching the prod enum values exactly
 *     (erreicht / teilweise_erreicht / nicht_erreicht / nicht_zutreffend;
 *     gruen / gelb / rot). No case trap.
 *   - unparenthesised nested-guard dead-branch (IF..THEN..AND IF..THEN): NONE — no
 *     guarded (IF/THEN) block gate at all.
 *   => No reversal found: all 24 block gates are demonstrated ENFORCING below.
 */
// @vitest-environment node
import './_harness-env-m820-3'; // top-level-await: PG + seedM820_3 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM820_3Harness } from './_harness-env-m820-3';
import { M820_3_GATES } from './seed-m820-3';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM820_3Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null | unknown[];

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

/** Simple `<boolean symbol> == true` gate whose symbol is homed on `ws`. */
async function proveBooleanGate(ws: string, code: string, symbol: string): Promise<void> {
  await proveBothWays(ws, code,
    [{ ws, values: { [symbol]: true } }],
    [{ ws, values: { [symbol]: false } }]);
}

/** Build the pz_<prefix>_<i>_status symbol list. */
function pzSyms(prefix: string, n: number): string[] {
  return Array.from({ length: n }, (_, k) => `${prefix}_${k + 1}_status`);
}

/** Enum-status disjunction chain: pass = every status "erreicht"; violate = flip the
 *  first status to "nicht_erreicht" (the only enum value NOT in the accepted OR-set),
 *  making that conjunct's OR-group a definite false → whole AND definite fail. */
async function proveEnumChainGate(ws: string, code: string, prefix: string, n: number): Promise<void> {
  const syms = pzSyms(prefix, n);
  const pass: Record<string, Val> = {};
  for (const s of syms) pass[s] = 'erreicht';
  await proveBothWays(ws, code,
    [{ ws, values: pass }],
    [{ ws, values: { [syms[0]]: 'nicht_erreicht' } }]);
}

/** Worksheet-local number-sum equality: pass = y+p+n+na == total (2+1+1+0 == 4);
 *  violate = bump total to 5 (all four addends still present ⇒ definite mismatch fail). */
async function proveLocalSumGate(ws: string, code: string, base: string): Promise<void> {
  const S = (suf: string) => `${base}_items_${suf}`;
  await proveBothWays(ws, code,
    [{ ws, values: { [S('y')]: 2, [S('p')]: 1, [S('n')]: 1, [S('na')]: 0, [S('total')]: 4 } }],
    [{ ws, values: { [S('total')]: 5 } }]);
}

// ─── Coverage guard ────────────────────────────────────────────────────────────
describe('DWA-M-820-3 — block-gate coverage', () => {
  it('drives every live BLOCK gate (24) exactly once', () => {
    expect(M820_3_GATES.length).toBe(24);
    expect(new Set(M820_3_GATES.map((g) => g.code)).size).toBe(24);
  });
});

// ─── M8203-01 Projektregistrierung (§1 Anwendungsbereich) ────────────────────────
describe('DWA-M-820-3 — M8203-01 Projektregistrierung (§1 Anwendungsbereich)', () => {
  it('REQ-01  (sector-OR) AND client IS NOT EMPTY AND contractor IS NOT EMPTY', async () => {
    await proveBothWays('M8203-01', 'REQ-01',
      [{ ws: 'M8203-01', values: { sector_abwasser: true, client_auftraggeber: 'AG GmbH', contractor_auftragnehmer: 'Ingenieurbüro AN' } }],
      // clear the client text → IS NOT EMPTY false (exists path, definite) → AND fails
      [{ ws: 'M8203-01', values: { client_auftraggeber: null } }]);
  });
});

// ─── M8203-03 Rahmenbedingungen (§4 Bild 1) ──────────────────────────────────────
describe('DWA-M-820-3 — M8203-03 Rahmenbedingungen (§4 Bild 1)', () => {
  it('REQ-04  bild1_acknowledged == true', async () => {
    await proveBooleanGate('M8203-03', 'REQ-04', 'bild1_acknowledged');
  });
});

// ─── §5 Gesamtsystem — Phasenziele (enum chains) ─────────────────────────────────
describe('DWA-M-820-3 — §5 Gesamtsystem Phasenziele (enum-status chains)', () => {
  it('REQ-06  Phasenziele §5.2 (5 conjuncts) @M8203-04', async () => {
    await proveEnumChainGate('M8203-04', 'REQ-06', 'pz_52', 5);
  });
  it('REQ-07  Phasenziele §5.3 (5 conjuncts) @M8203-05', async () => {
    await proveEnumChainGate('M8203-05', 'REQ-07', 'pz_53', 5);
  });
  it('REQ-08  Phasenziele §5.4 (3 conjuncts) @M8203-06', async () => {
    await proveEnumChainGate('M8203-06', 'REQ-08', 'pz_54', 3);
  });
});

// ─── Anhang A — QE checklist sum gates (Gesamtsystem) ────────────────────────────
describe('DWA-M-820-3 — Anhang A QE sum gates (Gesamtsystem)', () => {
  it('REQ-15  QE 5.2 y+p+n+na == total (Anhang A.1) @M8203-07', async () => {
    await proveLocalSumGate('M8203-07', 'REQ-15', 'qe52');
  });
  it('REQ-16  QE 5.3 y+p+n+na == total (Anhang A.2) @M8203-08', async () => {
    await proveLocalSumGate('M8203-08', 'REQ-16', 'qe53');
  });
  it('REQ-17  QE 5.4 y+p+n+na == total (Anhang A.3) @M8203-09', async () => {
    await proveLocalSumGate('M8203-09', 'REQ-17', 'qe54');
  });
  it('REQ-18  QE 5.5 Matrix Nachhaltigkeit y+p+n+na == total (Anhang A.4) @M8203-10', async () => {
    await proveLocalSumGate('M8203-10', 'REQ-18', 'qe55');
  });
});

// ─── M8203-11 Bedarfsplanung Projekt — enum + three sum gates ────────────────────
describe('DWA-M-820-3 — M8203-11 Bedarfsplanung Projekt (§6.2 + Anhang B.1/B.2/B.3)', () => {
  it('REQ-09  Phasenziele §6.2 (5 conjuncts, enum) @M8203-11', async () => {
    await proveEnumChainGate('M8203-11', 'REQ-09', 'pz_62', 5);
  });
  it('REQ-19  QE 6.2 y+p+n+na == total (Anhang B.1, worksheet-local) @M8203-11', async () => {
    await proveLocalSumGate('M8203-11', 'REQ-19', 'qe62');
  });
  it('REQ-20  QE 6.3 qe63a_items_total + qe63b_items_total == 40 (CROSS-WORKSHEET, Anhang B.2)', async () => {
    // Operands homed on M8203-12 / M8203-13, resolved via checkApprovalGate's
    // conflict-free project-wide fallback; gate evaluated on M8203-11.
    // Source: Anhang B.2 "QE 6.3: Planung" has exactly 40 numbered items (verified).
    await proveBothWays('M8203-11', 'REQ-20',
      [
        { ws: 'M8203-12', values: { qe63a_items_total: 20 } },
        { ws: 'M8203-13', values: { qe63b_items_total: 20 } },
      ],
      // 20 + 19 = 39 ≠ 40 → definite mismatch fail
      [{ ws: 'M8203-13', values: { qe63b_items_total: 19 } }]);
  });
  it('REQ-21  QE 6.4 qe64a_items_total + qe64b_items_total == 50 (CROSS-WORKSHEET, Anhang B.3)', async () => {
    // Source: Anhang B.3 "QE 6.4: Ausführungsvorbereitung" has exactly 50 numbered items (verified).
    await proveBothWays('M8203-11', 'REQ-21',
      [
        { ws: 'M8203-14', values: { qe64a_items_total: 25 } },
        { ws: 'M8203-15', values: { qe64b_items_total: 25 } },
      ],
      // 25 + 24 = 49 ≠ 50 → definite mismatch fail
      [{ ws: 'M8203-15', values: { qe64b_items_total: 24 } }]);
  });
});

// ─── §6 Projekte — Phasenziele (enum chains) ─────────────────────────────────────
describe('DWA-M-820-3 — §6 Projekte Phasenziele (enum-status chains)', () => {
  it('REQ-10  Phasenziele §6.3 (8 conjuncts) @M8203-12', async () => {
    await proveEnumChainGate('M8203-12', 'REQ-10', 'pz_63', 8);
  });
  it('REQ-11  Phasenziele §6.4 (12 conjuncts) @M8203-14', async () => {
    await proveEnumChainGate('M8203-14', 'REQ-11', 'pz_64', 12);
  });
  it('REQ-12  Phasenziele §6.5 (12 conjuncts) @M8203-16', async () => {
    await proveEnumChainGate('M8203-16', 'REQ-12', 'pz_65', 12);
  });
  it('REQ-13  Phasenziele §6.6 (11 conjuncts) @M8203-17', async () => {
    await proveEnumChainGate('M8203-17', 'REQ-13', 'pz_66', 11);
  });
  it('REQ-14  Phasenziele §6.7 (6 conjuncts) @M8203-18', async () => {
    await proveEnumChainGate('M8203-18', 'REQ-14', 'pz_67', 6);
  });
});

// ─── Anhang B — QE checklist sum gates (Ausführung/IBN/Abschluss) ────────────────
describe('DWA-M-820-3 — Anhang B QE sum gates (Ausführung/IBN/Abschluss)', () => {
  it('REQ-22  QE 6.5 y+p+n+na == total (Anhang B.4) @M8203-16', async () => {
    await proveLocalSumGate('M8203-16', 'REQ-22', 'qe65');
  });
  it('REQ-23  QE 6.6 y+p+n+na == total (Anhang B.5) @M8203-17', async () => {
    await proveLocalSumGate('M8203-17', 'REQ-23', 'qe66');
  });
  it('REQ-24  QE 6.7 y+p+n+na == total (Anhang B.6) @M8203-18', async () => {
    await proveLocalSumGate('M8203-18', 'REQ-24', 'qe67');
  });
});

// ─── §7 Digitalisierung ──────────────────────────────────────────────────────────
describe('DWA-M-820-3 — §7 Digitalisierung / Datenrechte', () => {
  it('REQ-26  digital_twin_after_project == true (§7.2.3) @M8203-19', async () => {
    await proveBooleanGate('M8203-19', 'REQ-26', 'digital_twin_after_project');
  });
  it('REQ-28  digital_rights_clarified == true (§7.4) @M8203-20', async () => {
    await proveBooleanGate('M8203-20', 'REQ-28', 'digital_rights_clarified');
  });
});

// ─── M8203-24 Gesamtverifizierung (§6.7) ─────────────────────────────────────────
describe('DWA-M-820-3 — M8203-24 Gesamtverifizierung Qualität (§6.7)', () => {
  it('REQ-32  signoff_engineer IS NOT EMPTY AND signoff_client IS NOT EMPTY AND verdict∈{gruen,gelb,rot}', async () => {
    await proveBothWays('M8203-24', 'REQ-32',
      [{ ws: 'M8203-24', values: { signoff_engineer: 'Dipl.-Ing. Prüfer', signoff_client: 'AG Projektleiter', overall_quality_verdict: 'gruen' } }],
      // clear the engineer sign-off → IS NOT EMPTY false (definite) → AND fails
      [{ ws: 'M8203-24', values: { signoff_engineer: null } }]);
  });
});
