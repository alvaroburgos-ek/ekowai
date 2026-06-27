# Governing-Duration Iteration Engine (Piece 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A single shared engine that derives each storage facility's `r_D(n)` as the intensity at its governing duration (iterate the selected rainfall table's durations, evaluate the facility's sizing equation, take the argmax), plus a fixed-`D` path for no-storage Flächenversickerung. Replaces the free-typed `r_D(n)`.

**Architecture:** `iterateGoverningDuration(rows, sizingFn)` + `fixedDurationIntensity(rows, prescribedD)` (pure). Per-facility profiles supply `(sizingFn, maximized-quantity, derived-output-symbols)`. The basin's `V_VA` becomes the first profile (Gl.8 unified onto the engine, guarded by its acceptance test).

## Global Constraints

- Approach B (shared engine), §6 method confirmed. `r_D(n)` is iteration/fixed-D **derived** — never a free pick (cancelled picker stays cancelled).
- Does not touch Tab.9, the flood path (Gl.10), or `main`. Composes with Piece 2 (rows come from the facility's selected table). Materialize via the **existing** `derivedOutputSymbols`/`saveWorksheet` path — no new materialization machinery.
- **Tasks 1–3 are DB-free**, buildable now. **Task 4** (Gl.8 unification) is DB-free but touches live code → needs the spec-review decision. **Tasks 5–7 are GATED** on the field inventory (MCP token) + Alvaro's go — PAUSE before them.
- Branch `feat/governing-duration-engine` off `origin/main` `294c89d`. TDD; tests `pnpm vitest run <path>`.

---

### Task 1 (DB-free): pure `iterateGoverningDuration`
**Files:** Create `src/lib/eval/governing-duration.ts`; Test `src/lib/eval/__tests__/governing-duration.test.ts`.
**Produces:** `iterateGoverningDuration(rows, sizing: (D, r_D) => number | null): GoverningResult` (`{ governingD, r_D_at_governing, governingValue, perDuration }`). Iterates complete rows, evaluates `sizing` per `(D, r_D)`, takes the first argmax. Skips incomplete rows; empty → all-null.
- [ ] Failing test (argmax pick; first-wins tie; incomplete/empty); run → FAIL; implement; run → PASS; commit `feat(eval): pure governing-duration iteration engine`.

### Task 2 (DB-free): `fixedDurationIntensity` (Flächenversickerung)
**Files:** Modify `governing-duration.ts`; Test `__tests__/governing-duration-fixed.test.ts`.
**Produces:** `fixedDurationIntensity(rows, prescribed: number | {min,max}): { D, r_D }` — picks the prescribed-`D` row's `r_D` (for a range, the governing within `[min,max]`; if absent, nearest/none per a documented rule). No iteration.
- [ ] Failing test (exact D; range; missing) → FAIL → implement → PASS → commit `feat(eval): fixed-duration intensity path (no-storage Flächenversickerung)`.

### Task 3 (DB-free): facility-profile structure + basin reference profile
**Files:** Modify `governing-duration.ts` (profile type + registry); Test `__tests__/governing-duration-basin.test.ts`.
**Produces:** `type FacilityGoverningProfile = { facility: string; equationId: string; maximizes: string; sizing: (D, r_D, scalars) => number | null; derived: { rDSymbol: string; governingDSymbol?: string } }` + a `GOVERNING_PROFILES` registry. Register the **basin `V_VA`** profile (sizing = `(r_D·(A_C+A_VA)·1e-4 − Q_S − Q_Dr)·D·60·f_Z·f_A·1e-3`).
- [ ] Failing test: basin profile via the engine reproduces **max V_VA = 18.684 @ D=30** and **cross-checks against the real Gl.8 aggregator** (`evaluateFormula`, same governing D + max V) → FAIL → implement → PASS → commit `feat(eval): facility governing-profile registry + basin V_VA profile`.

### Task 4 (DB-free, DECISION-GATED): unify Gl.8 onto the shared engine
> Spec-review decision: refactor A138-13/Gl.8 to consume `iterateGoverningDuration` via the basin profile (recommended — iteration lives once), **or** leave Gl.8 as-is and only add the engine for the other facilities.
- [ ] If unifying: refactor the Gl.8 aggregator to delegate to the engine; **`formula-Gl8.test.ts` (18.684 @ D=30, cistern-credit cases) must stay green unchanged** as the regression guard; full eval suite green. Commit `refactor(eval): Gl.8 basin sizing delegates to the shared governing-duration engine`.

---
> ⚠️ **PAUSE — Tasks 5–7 need the field inventory (MCP token) + Alvaro's go.**

### Task 5 (GATED): field inventory
Per facility (Mulde A138-17, Rigole A138-18, MRE A138-19, MRS A138-20, Schacht A138-21, Becken A138-22, Flächenversickerung A138-16): confirm the free-typed `r_D(n)`/`r_D_n_used` field (conversion target), the exact `equationId` + `formula` + units, and the maximized quantity. Record as the profile inputs.

### Task 6 (GATED): per-facility sizing profiles + derive/materialize
- [ ] Add each facility's sizing function as a profile (from Task 5 + the §6 equations); the Flächenversickerung profile uses the fixed-`D` path.
- [ ] Wire each facility's `r_D(n)` to the engine output (rows = the facility's Piece-2-selected table); make `r_D(n)` **read-only/derived** (`computedSymbols`/`derivedOutputSymbols`); materialize `source_type='derived'` via the existing path. Any field/migration changes authored + idempotent + rollback.
- [ ] DB-free unit tests per facility (hand-computed governing); engine integration test (mocked fields/values).

### Task 7 (GATED): verify + PAUSE for cutover
- [ ] Full unit suite green + typecheck; per-facility governing values sanity-checked vs §6 examples. PAUSE → report for the prod cutover go (no access-control migration; deploy→smoke-on-direct-URL→alias per the deploy playbook).

---

## Self-Review
- Spec coverage: shared engine (T1), fixed-D (T2), profile registry + basin (T3), Gl.8 unification (T4), inventory (T5), per-facility wiring + materialize (T6), verify/cutover (T7). `r_D(n)` derived-not-picked (T6 + constraints). Tab.9/flood/main untouched.
- Placeholders: per-facility sizing formulas + free-typed field symbols are explicit Task-5 confirmations (token-gated), not silent gaps.
- The basin cross-check (T3) ties the engine to the authoritative Gl.8 numbers before any facility is wired.

## Playbook capture (after Piece 1 lands)
Record in the consolidation playbook: the **governing-duration iteration engine** pattern (iteration once + per-facility sizing profiles + fixed-D exception), as the §6-faithful generalization, and its composition with Piece 2 (selected table) and Piece 3 (per-facility comparison view).
