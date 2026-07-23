# DWA-A-138-1 Phase 4 — Facility Sizing Completion · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the seven Phase-4 facility-sizing worksheets (A138-16…22) and the A138-23 Phase-4 gate so a DWA-A-138-1 project can dimension its selected infiltration facility end-to-end, with enforced compliance gates and a DB-verified acceptance chain.

**Architecture:** E1 already routes every facility equation through the client engine (route-all-minus-deny; only `A138-18:18` denied) and neutralises same-worksheet duplicate producers via `displayOnly` profiles. This plan adds: (1) the one cross-worksheet dual-role fix (`A_S,m` on A138-17, defect #22); (2) cross-worksheet propagation for the composite facilities (MRE/MRS read upstream `V_M`/`V_R`/`A_S,m`) via **new registry entries only** — never touching the dispatch loop; (3) the A138-23 summary (derived support fields + the engineer-signed `phase_4_gate_result`, following the Phase-2/3 precedent); (4) three source-ratified BLOCK compliance gates encoded through the importer. A **Mulde pilot is a hard gate**: every defect class it surfaces is fixed in the pattern before the six-facility fan-out.

**Tech Stack:** Next.js (repo-local vendored version — read `node_modules/next/dist/docs/` before touching routing/server-action code), Drizzle ORM + Postgres (Supabase prod `vadsmshzebefjreqcicl`), Vitest, mathjs evaluator. Data enters the DB ONLY through the Pass3c importer — never hand-edit tables.

## Global Constraints

- **Identity:** the user is Alvaro — commit as `Alvaro <alvaro.burgos@ekowai.com>` (repo default). Verify `git config user.email` before every commit.
- **Test runner (defect-register P1):** worktree `node_modules` symlink into a store-locked vitest. Run the suite via the isolated store: a fresh worktree + `pnpm install --package-import-method=copy --store-dir /c/Users/Ekowai/.pnpm-store-138test` (existing: `_wt-138-test`, ~34 s). Never run vitest from `projects/ekowai-wizard` directly.
- **Ledger rule (STANDING, binding rider):** update `.superpowers/sdd/phase4-progress.md` at EVERY task transition — the recovery lifeline. A passed/failed/held step is recorded the moment it transitions, with its DB-verified values.
- **Cross-worksheet reads (STANDING rider):** every by-symbol cross-worksheet read goes through the E1-C scoped resolver `scopeFieldsToStandard(candidates, savedStandardId)` (`src/lib/db/queries/symbol-scoping.ts`) or an `innerJoin(worksheetTemplates) + eq(worksheetTemplates.standardId, savedStandardId)`. **NO new bare `inArray(fields.symbol, …)` reads.** `savedStandardId` is available at `worksheet.ts:155`.
- **Reproduction-grade tests (STANDING rider, E1-B standard):** the #22 fix and each cross-worksheet propagation gets a test that FAILS on current code and PASSES on the fix — the historical-bug-reproduction style of `dispatch-routing-matrix.test.ts` / `symbol-scoping.test.ts`.
- **Deny-set is the SSOT:** `shouldEngineEvaluate(worksheetCode, equationNumber)` gates every equation. Do not add allow-lists. `A138-18:18` stays denied.
- **Pilot gate:** Tasks 1–7 (through Mulde acceptance) complete and sign off BEFORE any fan-out task (8+). Defect classes surfaced in the pilot are folded into the shared pattern first.
- **Ratification gates:** Task 0 (gate clauses D1 + predicate D3) STOPS for the user's explicit ratification before any gate enforces or the summary predicate is wired.

**Verified equation ids (from `asm-source.ts` + `equation-profiles.ts`, do not re-derive):**
- `ASM_GL7_EQUATION_ID = 55151cb1-…` (A138-12 direct, owner)
- `ASM_GL16_EQUATION_ID = 14999c2a-…` (A138-17 Mulde geometry, produces A_S_m)
- `ASM_GL17_EQUATION_ID = 8afdb49a-…` (A138-18 Rigole geometry)
- A138-17 `V_M` producer Gl.14 = `bfe6e59a-…`; displayOnly Gl.15 = `44fd56a8-…`

**Facility → design worksheet (`FACILITY_TYPE_TO_WORKSHEET`, asm-source.ts:24):** flaeche→A138-16, mulde→A138-17, rigole→A138-18, schacht→A138-21, becken→A138-22. (MRE A138-19 / MRS A138-20 are composite variants reached from mulde/rigole; confirm their `facility_type_selected` mapping in Task 8.)

**Governing storage-volume + footprint symbol per facility (for A138-23 summary):**

| facility | worksheet | governing volume symbol | footprint symbol |
|---|---|---|---|
| flaeche | A138-16 | — (no storage; area device) | `A_S` |
| mulde | A138-17 | `V_M` (Gl.14) | `A_S_m` |
| rigole | A138-18 | `V_R` (Gl.19) | `A_S_m` |
| MRE | A138-19 | `V_MR` (Gl.28) | `A_S_m` |
| MRS | A138-20 | `V_MUE` (Gl.30) | `A_S_m` |
| schacht | A138-21 | `V_S` (Gl.35) | `A_S` (Gl.34) |
| becken | A138-22 | `V_VA` (Gl.41, A138-22-local) | `A_S_m` |

---

## Task 0: Ratification bundle — gate clauses (D1) + Phase-4 predicate (D3)

**No code.** Produces a review artifact; STOPS for the user's ratification. Nothing downstream enforces or wires until this is signed.

**Files:**
- Create: `docs/superpowers/plans/2026-07-15-phase4-ratification.md` (review artifact)

**D1 — the three BLOCK gates, each with its quoted source clause and the modal-verb reading to ratify:**

| Gate | `code` | Clause | Verbatim source (equations.source_quote) | Modal reading → proposed severity |
|---|---|---|---|---|
| A138-16 Gl.13 | `A138-REQ-20` | §6.2.2 Gl. (13) | "k_i > r_D(n) · 10⁻⁷ … Wenn die Bedingung gemäß GL. (13) nicht erfüllt ist, erhält man ein negatives Ergebnis, weil die Niederschlagsintensität die vorhandene Infiltrationsrate übersteigt." | Feasibility precondition — if false, area infiltration yields a negative area (physically impossible) → **BLOCK** |
| A138-18 Gl.25 | `A138-REQ-21` | §6.4.2 Gl. (25) | "L_VS · q_VS ≥ r_5(n) · AC · 10⁻⁴ … L_VS Gesamtlänge der Vollsickerrohre; r_5(n) Regenspende für D=5 min…" | Hydraulic-capacity requirement (`≥`) → **BLOCK** |
| A138-21 Gl.38 | `A138-REQ-22` | §6.7.2 Gl. (38) | "A_S,FS · k_f,FS ≥ A_S,Schacht · k_i … Schacht-Typ-B-Bedingung: Filterschicht-Versickerungsleistung ≥ Schacht-Versickerungsleistung." | Filter-layer sufficiency (`≥`), Type-B only → **BLOCK when Schacht-Typ = B** |

- [ ] **Step 1: Assemble the D1 ratification table** into the artifact, each row carrying the verbatim `source_quote` (already pulled, above), the `≥`/`>` operator, and the modal-verb reading. Flag the A138-21 rider explicitly: Gl.38 is a **Typ-B-only** condition — the gate must be enum-gated on the Schacht type selector, not unconditional (mirror the existing `enum-gated-conditions` pattern).

- [ ] **Step 2: Assemble the D3 predicate proposal.** Anchor to the Phase-2 precedent finding:
  - **Precedent (verified in prod):** `phase_2_gate_result` on PLT-HS-01 is `source_type='entered'` (engineer-selected enum), value `CONDITIONAL`. `phase_2/3/4_gate_result` are all `PASS/CONDITIONAL/FAIL` enums with NO code producer — the phase gate is an **engineer sign-off**, not an aggregator output. (This corrects scope §3's "pure aggregator" framing.)
  - **Proposal (recommended):** `phase_4_gate_result` follows the precedent — an **engineer-entered enum** — while A138-23's SIX support fields are auto-derived to inform the decision (single-source derivation invariant): `facility_type_dimensioned`, `facility_specific_volume_m3`, `facility_footprint_m2`, `facility_meets_qsac`, `facility_specific_dimensioning_complete`, `facility_design_completion_date`. The wizard surfaces a **recommended** gate value the engineer confirms:
    - **PASS** — `facility_specific_dimensioning_complete = true` AND `facility_meets_qsac = true` AND all facility BLOCK gates (Task 0 D1) satisfied.
    - **CONDITIONAL** — dimensioning complete AND q_S,AC met, but a **warn**-level check flags (mirrors Phase-2 CONDITIONAL = "passable with noted conditions"; anchor §6/Tab. 14 "systemspezifische Bemessungsvorgaben").
    - **FAIL** — dimensioning incomplete OR a BLOCK gate unsatisfied.
  - Present the alternative (fully auto-derive the enum, breaking the entered precedent) and mark it NOT recommended (diverges from Phase-2/3, removes the engineer attestation the phase-gate design intends).

- [ ] **Step 3: STOP — request ratification.** Present the artifact. Do not proceed to any enforcing/wiring task until the user ratifies (a) the three severities + the A138-21 Typ-B rider, and (b) the D3 predicate + entered-vs-derived choice. Record the ratified decisions in `phase4-progress.md`.

---

## Task 1: Defect #22 reproduction test (RED) — A_S,m dual-role on A138-17

**Files:**
- Create: `src/lib/actions/__tests__/asm-dual-role-a138-17.test.ts`

**Interfaces:**
- Consumes: `asmEngineSuppressedSymbols(asmMethod)` (asm-source.ts:138) — today keys on method only.
- Produces: `symbolHomeSuppressedSymbols(currentWorksheetCode, symbolHomes)` (Task 2) — the home-boundary suppression.

**Root cause (register #22):** on A138-17, Gl.16 *produces* `A_S_m` (client engine writes it into the A138-17 store) while Gl.14/15 *consume* it; but `A_S_m`'s single active-field home is A138-12. The local Gl.16 output collides with the inherited A138-12 value → the A138-17 `A_S_m` slot renders "—", Gl.14/15 report "Fehlt: A_S_m", geometric `V_M` is blocked.

- [ ] **Step 1: Write the failing test.** Model the resolution the fix will change — a facility worksheet must NOT let a local equation write back a symbol whose single active-field home is a different worksheet:

```ts
import { describe, it, expect } from 'vitest';
import { symbolHomeSuppressedSymbols } from '@/lib/eval/asm-source';

describe('defect #22 — cross-home write-back suppression on A138-17', () => {
  // A_S_m single home = A138-12; A138-17 Gl.16 produces it locally + Gl.14/15 consume it.
  const homes = new Map<string, string>([['A_S_m', 'A138-12']]);

  it('suppresses A_S_m local write-back on A138-17 (home is A138-12)', () => {
    expect(symbolHomeSuppressedSymbols('A138-17', homes).has('A_S_m')).toBe(true);
  });

  it('does NOT suppress on the home worksheet A138-12', () => {
    expect(symbolHomeSuppressedSymbols('A138-12', homes).has('A_S_m')).toBe(false);
  });

  it('leaves pure-consumer worksheets (A138-20/A138-22) unaffected — nothing to suppress', () => {
    // They never locally produce A_S_m, so even with the rule active the set is empty for them.
    expect(symbolHomeSuppressedSymbols('A138-20', homes).has('A_S_m')).toBe(true);
    // (present in the home-map ⇒ suppressed if they tried to write; they don't ⇒ inheritance path unaffected)
  });
});
```

- [ ] **Step 2: Run it — expect FAIL (module export missing).**
Run: `pnpm vitest run src/lib/actions/__tests__/asm-dual-role-a138-17.test.ts` (from `_wt-138-test`)
Expected: FAIL — `symbolHomeSuppressedSymbols` is not exported.

- [ ] **Step 3: Commit the RED test.**
```bash
git add src/lib/actions/__tests__/asm-dual-role-a138-17.test.ts
git commit -m "test(138-p4): reproduce defect #22 A_S_m dual-role write-back (RED)"
```

---

## Task 2: Defect #22 fix (GREEN) — home-boundary write-back suppression

**Files:**
- Modify: `src/lib/eval/asm-source.ts` (add `symbolHomeSuppressedSymbols`)
- Modify: the client engine hook that applies `asmEngineSuppressedSymbols` (grep `asmEngineSuppressedSymbols` → `src/hooks/use-equation-engine.ts` / `worksheet-form`; wire the new set alongside it)
- Test: `src/lib/actions/__tests__/asm-dual-role-a138-17.test.ts` (Task 1)

**Interfaces:**
- Produces: `symbolHomeSuppressedSymbols(currentWorksheetCode: string, symbolHomes: ReadonlyMap<string,string>): ReadonlySet<string>` — symbols whose single active-field home ≠ `currentWorksheetCode`.
- Consumes (caller): the per-worksheet `symbolHomes` map = each consumed symbol → the worksheet_template.code of its single active field (built from `fields` where `active` and single-home; A_S_m → A138-12). Resolve once per render, standard-scoped.

- [ ] **Step 1: Implement the pure helper** (generalises the #20 ownership principle across the home boundary — do NOT hardcode `A_S_m`):

```ts
/**
 * Cross-home write-back suppression (defect #22, standard-agnostic).
 * A facility worksheet must not let its local equation output shadow-write a
 * symbol whose single active-field home is a DIFFERENT worksheet — the
 * inherited home value is authoritative; the local producer drives the SERVER
 * materialize (registry) only. Generalises asmEngineSuppressedSymbols from
 * "method owns the symbol" to "home worksheet owns the symbol".
 */
export function symbolHomeSuppressedSymbols(
  currentWorksheetCode: string,
  symbolHomes: ReadonlyMap<string, string>,
): ReadonlySet<string> {
  const out = new Set<string>();
  for (const [symbol, homeCode] of symbolHomes) {
    if (homeCode !== currentWorksheetCode) out.add(symbol);
  }
  return out.size === 0 ? _EMPTY_ASM_SUPPRESSED : out;
}
```

- [ ] **Step 2: Run the Task-1 test — expect PASS.**
Run: `pnpm vitest run src/lib/actions/__tests__/asm-dual-role-a138-17.test.ts`
Expected: PASS (3/3).

- [ ] **Step 3: Wire it into the client engine write-back.** At the site where `asmEngineSuppressedSymbols(asmMethod)` gates the write-back loop, union in `symbolHomeSuppressedSymbols(currentWorksheetCode, symbolHomes)`. The union means: on A138-17, `A_S_m` is suppressed by HOME even when method-based suppression wouldn't apply → Gl.16's client output no longer competes with the inherited A138-12 value; Gl.14/15 resolve the inherited value; `V_M` unblocks. The **server** `asm` producer path (registry) is untouched — Gl.16 still drives the sweep→A138-12.

- [ ] **Step 4: Regression guard — A138-20 / A138-22 pure consumers unregressed.** Add an assertion (in the same test file) that with the rule active, A138-20 and A138-22 still resolve inherited `A_S_m` (they never locally produce it, so suppression is a no-op for their render — matches the clean-inheritance of `ac_as_ratio`). Run the full suite:
Run: `pnpm vitest run` (from `_wt-138-test`)
Expected: PASS, count ≥ prior baseline + new tests; `tsc` 0-new.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/eval/asm-source.ts src/hooks/use-equation-engine.ts src/lib/actions/__tests__/asm-dual-role-a138-17.test.ts
git commit -m "fix(138-p4): resolve defect #22 A_S_m dual-role via home-boundary write-back suppression"
```

**Ledger:** record Task 1–2 transition with the suite count + the reproduction-test provenance (fails-on-old / passes-on-new).

---

## Task 3: A138-23 summary — derived support fields aggregator

*(Gated on Task 0 D3 ratification. Uses the RATIFIED entered-vs-derived choice; steps below assume the recommended "entered enum + derived support fields + recommended value".)*

**Files:**
- Modify: `src/lib/actions/materialize-registry.ts` (add the `phase4_summary` entry — registry only, NOT the dispatch loop)
- Modify: `src/lib/actions/worksheet.ts` (the `phase4_summary` producer branch, mirroring `asm`/`loading`)
- Create: `src/lib/eval/phase4-summary.ts` (pure mapping: facility → governing volume/footprint symbols; the recommended-gate predicate)
- Test: `src/lib/eval/__tests__/phase4-summary.test.ts`

**Interfaces:**
- Produces: `facilitySummaryInputs(facilityType): { volumeSymbol: string | null; footprintSymbol: string }` and `recommendedPhase4Gate(input): 'PASS' | 'CONDITIONAL' | 'FAIL'` per the ratified predicate.
- Consumes: the per-facility governing-volume/footprint table (Global Constraints); `facility_type_selected` (A138-15); `q_S_AC`/`facility_meets_qsac` carried from Phase-3 A138-12.

- [ ] **Step 1: Write the failing test** for the pure mapping + predicate (encode the ratified rule; example shows the recommended one):

```ts
import { describe, it, expect } from 'vitest';
import { facilitySummaryInputs, recommendedPhase4Gate } from '@/lib/eval/phase4-summary';

describe('phase4 summary mapping + recommended gate', () => {
  it('maps mulde → V_M / A_S_m', () => {
    expect(facilitySummaryInputs('mulde')).toEqual({ volumeSymbol: 'V_M', footprintSymbol: 'A_S_m' });
  });
  it('flaeche has no storage volume', () => {
    expect(facilitySummaryInputs('flaeche').volumeSymbol).toBeNull();
  });
  it('PASS when complete + q_S,AC met + no blocking gate', () => {
    expect(recommendedPhase4Gate({ complete: true, meetsQsac: true, blockGateFailed: false, warnFlag: false })).toBe('PASS');
  });
  it('CONDITIONAL when complete + q_S,AC met but a warn flags', () => {
    expect(recommendedPhase4Gate({ complete: true, meetsQsac: true, blockGateFailed: false, warnFlag: true })).toBe('CONDITIONAL');
  });
  it('FAIL when incomplete or a block gate failed', () => {
    expect(recommendedPhase4Gate({ complete: false, meetsQsac: true, blockGateFailed: false, warnFlag: false })).toBe('FAIL');
    expect(recommendedPhase4Gate({ complete: true, meetsQsac: true, blockGateFailed: true, warnFlag: false })).toBe('FAIL');
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module missing).** Run: `pnpm vitest run src/lib/eval/__tests__/phase4-summary.test.ts` → FAIL.

- [ ] **Step 3: Implement `phase4-summary.ts`** — the facility→symbol table (verbatim from Global Constraints) + `recommendedPhase4Gate` per the ratified predicate. Pure, DB-free.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Add the `phase4_summary` registry entry** (materialize-registry.ts) keyed on `inputSymbols = { facility_type_selected, V_M, V_R, V_MR, V_MUE, V_S, V_VA, A_S, A_S_m, q_S_AC }`, `ownerTrigger` = saved template owns an A138-23 field, `consumerTemplateCode = 'A138-23'`. **Do not touch the dispatch loop.**

- [ ] **Step 6: Implement the `phase4_summary` producer branch** in `worksheet.ts` mirroring the `asm` branch (Task-reference `worksheet.ts:1405`): resolve the A138-23 consumer template by code + `savedStandardId` (fail-closed); read the dimensioned facility's governing volume + footprint **through `scopeFieldsToStandard`** (STANDING rider — no bare by-symbol reads); write the six derived support fields; compute the **recommended** gate value into a display field (NOT `phase_4_gate_result` itself — that stays engineer-entered per precedent). Set `facility_design_completion_date` on completion.

- [ ] **Step 7: Full suite + tsc.** Run: `pnpm vitest run`; `pnpm tsc --noEmit`. Expected: green, 0-new TS errors.

- [ ] **Step 8: Commit.**
```bash
git add src/lib/eval/phase4-summary.ts src/lib/eval/__tests__/phase4-summary.test.ts src/lib/actions/materialize-registry.ts src/lib/actions/worksheet.ts
git commit -m "feat(138-p4): A138-23 summary aggregator + recommended phase_4_gate (support fields derived, enum entered)"
```

---

## Task 4: REQ-19 gate enforcement verification (no new code expected)

**Files:** Test only — `src/lib/compliance/__tests__/enum-gated-conditions.test.ts` already covers `phase_4_gate_result IN {PASS, CONDITIONAL}` (lines 237–255).

- [ ] **Step 1: Confirm REQ-19 enforces** — run the existing enum-gated test; verify PASS→pass, FAIL→fail, and that `evaluate.ts` treats `severity='block'` as blocking (per `reference_wizard_compliance_gates`: gates enforce only via `compliance_requirements` severity=block + `evaluate.ts`). If the condition grammar `IN {PASS, CONDITIONAL}` is already supported (it is — precedent REQ-09/16), no code change; record confirmation in the ledger.

- [ ] **Step 2: Add a reproduction assertion** that a `phase_4_gate_result = FAIL` (or NULL) makes REQ-19 block the Phase-5 handoff (A138-24/25 consumers), mirroring the REQ-09 test shape. Commit if new.

---

## Task 5: Compliance gates encoding (importer) — the three ratified BLOCK gates

*(Gated on Task 0 D1 ratification.)*

**Files:**
- Modify: the Pass3c workbook for DWA-A-138-1 in `C:\Users\Ekowai\Desktop\Supabase data\` — `Compliance_Requirements` sheet (add REQ-20/21/22). Data enters via importer ONLY.
- Run: `scripts/import-pass3c.ts` (dry-run then real; MCP path if no DATABASE_URL, per CLAUDE.md).

- [ ] **Step 1: Add the three rows** to the workbook's Compliance_Requirements sheet with the RATIFIED severities and conditions in the supported `evaluate.ts` grammar (single comparison, no chained/`when`):
  - `A138-REQ-20` · A138-16 · condition `k_i > r_D_n_used * 0.0000001` · **block** · clause §6.2.2 Gl.(13) · source_quote verbatim.
  - `A138-REQ-21` · A138-18 · condition per ratified reading of `L_VS * q_VS >= r_5_n * A_C * 0.0001` · **block** · §6.4.2 Gl.(25).
  - `A138-REQ-22` · A138-21 · **enum-gated on Schacht-Typ = B** (Typ-B rider) · condition `A_S_FS * k_f_FS >= A_S_Schacht * k_i` · **block** · §6.7.2 Gl.(38).
  - If any condition exceeds the supported grammar, encode the comparison as a derived boolean field + gate on that boolean (the `facility_meets_qsac` pattern) — note the mechanism in the ledger.

- [ ] **Step 2: Dry-run import.** `pnpm tsx scripts/import-pass3c.ts "<…138…Pass3c.xlsx>" --dry-run` → validate, no write.

- [ ] **Step 3: Real import (idempotent UPSERT; `engineer_verified` preserved).** Then verify with COUNT queries (worksheets/fields/equations/compliance) against parsed counts.

- [ ] **Step 4: Confirm enforcement live** — the three gates render + block on an infeasible input (e.g. A138-16 with `k_i ≤ r_D(n)·10⁻⁷` → REQ-20 blocks). Ledger the DB-verified gate behavior.

---

## Task 6: Mulde pilot acceptance (Task-11 protocol) — **PILOT GATE**

**No production code** — a live DB-verified acceptance run on prod (PLT-HS-01 Pilot, project `02f93026`) against the deployed build. This is the gate: sign-off required before fan-out (Task 8+).

**Protocol (verbatim B2 Task-11 discipline):**

- [ ] **Step 1: Predictions first.** Record expected values BEFORE the browser: Mulde `h_M=0,30` → `A_S_m=943,43` @ `D=1440`; `V_M` via Gl.14 (compute the number from persisted A_C/A_VA/r_D_n/k_i/f_Z + A_S_m=943,43); ratio `5,13` → Tab.6 pass. Pick a **discriminating** second value: `h_M=0,25` → `A_S_m=1126,08` (unambiguously distinct path).

- [ ] **Step 2: Deploy the branch to prod** (single Vercel project `ekowai-wizard-preview`; manual deploy from the main worktree; re-point ALL 3 aliases and confirm via `alias ls` source column — `reference_ekowai_wizard_deploy`, defect-register P2). One-tab rule (P3), hard-reload on the alias URL.

- [ ] **Step 3: Nudge-to-dirty re-save + DB-verify #22 unblock.** On PLT-HS-01 A138-17, nudge `h_M` (0,30→0,25→save→verify→0,30→save). Assert via `project_parameters` by SYMBOL (not label): `A_S_m` materialises on **A138-12** (`derived`, `is_stale=false`, fresh timestamp) AND `V_M` computes on **A138-17** (the #22 unblock — previously "Fehlt: A_S_m"). DB decides, not the screen.

- [ ] **Step 4: DB-verify the A138-23 summary** populates from the dimensioned Mulde (support fields derived; recommended gate = PASS; engineer confirms `phase_4_gate_result`), and REQ-19 lets the Phase-5 handoff proceed.

- [ ] **Step 5: PILOT GATE decision.** Enumerate every defect class the pilot surfaced. For each, fix it in the SHARED pattern (registry/suppression/summary/acceptance) — NOT as a Mulde one-off — and re-verify, before any fan-out task starts. Record the gate verdict + the DB snapshots in the ledger. **STOP for user GO if a defect class needs a scope decision.**

---

## Task 7: Pilot close-out + ledger

- [ ] **Step 1:** Write the pilot scorecard to `vault 01-Projects/ekowai-wizard/2026-07-15-138-phase4-mulde-pilot.md` (predictions vs DB-verified, timestamps, #22 proof, summary/gate proof). Update `phase4-progress.md`. STOP for the user's GO to fan out.

---

## Tasks 8–13: Facility fan-out (gated behind the pilot; one task per remaining facility)

**Design note (honest scoping):** the six remaining facilities share ONE validated pattern (from the pilot): route-all engine (already green) + `symbolHomeSuppressedSymbols` where a facility consumes a cross-home symbol + a registry entry for cross-worksheet propagation + the summary contribution + acceptance. Rather than pre-writing speculative code the pilot may reshape (YAGNI + the pilot-gate rider), each fan-out task is the SAME concrete procedure parameterised by the per-facility data below. Expand each into full TDD steps AFTER the pilot gate, applying any pattern fix the pilot forced.

**Per-facility procedure (each task):**
1. Add/confirm the cross-worksheet registry entry (materialize-registry.ts) — inputs the facility reads cross-worksheet; `consumerTemplateCode`; `ownerTrigger`. **Registry only.**
2. Add the producer branch in `worksheet.ts` mirroring `asm`/`loading`, all cross-ws reads via `scopeFieldsToStandard` (STANDING rider).
3. Reproduction-grade test (fails-on-old / passes-on-new, E1-B style) for the propagation.
4. Contribute the governing volume/footprint to the A138-23 summary (already mapped in Task 3).
5. Live acceptance pass (shorter Task-11: predictions → discriminating DB values → nudge-to-dirty → fresh timestamps).
6. Ledger the transition.

| Task | WS | Facility | Cross-worksheet reads (scoped) | #22-class? | Local gate | Notes |
|---|---|---|---|---|---|---|
| 8 | A138-18 | Rigole | (own geometry; `asm` sweep already wired) | No — pure producer of its A_S_m; Gl.18/19 consume geometry, not the symbol | REQ-21 (Task 5) | confirm `s_R` fix live (migration 20260713120000); mostly UI verify |
| 9 | A138-19 | MRE | `V_M`←A138-17, `V_R`←A138-18 | inherits, no local produce | — | Gl.28 `V_MR` primary; 26/27/29 displayOnly (already set) |
| 10 | A138-20 | MRS | `V_M`←A138-17, `A_S_m`←A138-12 (inherited) | pure consumer of A_S_m — must stay clean (guard) | — | Gl.30 `V_MUE`, 31 `Q_MUE`, 33 `Q_Dr`; 32 displayOnly |
| 11 | A138-21 | Schacht | local + inherited A_C/r_D_n/k_i | No | REQ-22 (Typ-B) | Gl.34 A_S, 35 V_S, 37 h_S, 39 erf_k_f_FS; 36/40 displayOnly; two-form render verify |
| 12 | A138-22 | Becken | `A_S_m`←A138-12 (inherited) | pure consumer — guard; confirm A138-22 `V_VA` stays scoped-distinct from A138-13 basin `V_VA` (E1-C) | — | Gl.41 V_VA local |
| 13 | A138-16 | Fläche | local + inherited A_C/r_D_n/k_i | No | REQ-20 | Gl.12 A_S; Gl.11 balance; feasibility gate is the main add |

---

## Task 14: Full Phase-4 regression + deploy + close-out

- [ ] **Step 1:** Full suite green + `tsc` 0-new (isolated store).
- [ ] **Step 2:** 138 regression re-confirm on the deployed build — A138-12/13 baseline (A_S_m=45, ac_as_ratio=107,48/fail, V_VA=293,169549312) re-derives byte-identical via nudge-to-dirty (defect-register P2/P3/P4); no Phase-4 change perturbed Phase-3.
- [ ] **Step 3:** Deploy to prod (single Vercel project, re-point all 3 aliases + source-column confirm). 
- [ ] **Step 4:** Measure "Phase 4 done" (§9 of the scope doc): all 7 facilities' primary sizing outputs persist `derived`/not-stale; cross-ws consumers resolve; #22 closed; A138-23 produces the gate + REQ-19 enforces; the three facility gates enforce; Mulde pilot + 6 acceptance passes signed off; 138 regression green. Write the close-out to the vault + `phase4-progress.md`. STOP.

---

## Self-Review notes

- **Spec coverage:** scope §1 (7 worksheets) → Tasks 3/6/8–13; §2 (#22) → Tasks 1–2; §3 (A138-23 gate) → Tasks 3–4 (with the corrected entered-enum precedent); §4 (compliance gates) → Tasks 0+5; §5 (acceptance) → Task 6; §6 effort/sequence → task order; §8 decisions → Task 0 ratifications; §9 done-definition → Task 14.
- **Riders honored:** D1 severities → Task 0 ratification with verbatim clauses; D2 all-7 pilot-first → pilot gate Task 6 before Tasks 8–13; D3 predicate → Task 0 D3 anchored to the verified Phase-2 `entered`/CONDITIONAL precedent + §6/Tab.14; #22 reproduction test → Tasks 1–2 (fails-on-old/passes-on-new); scoped resolver → Global Constraints + every producer branch; ledger-every-transition → Global Constraints.
- **Open dependency:** Tasks 3/5/8–13 are gated on Task 0 ratification and Task 6 pilot sign-off — do not start them until both clear.
```
