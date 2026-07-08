# A138-11 f_K/k_i + A138-13:9 q_S_AC engine-wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Make `f_K`, `k_i` (A138-11) and `q_S_AC` (A138-13) auto-compute from the engine instead of being blank/legacy-mis-summed — by whitelisting their equations, correcting the stored formula symbols at source, and adding a `min()` cap to the evaluator for Gl.6's `≤1`.

**Architecture:** Same audit→apply pattern as A138-10:3. Code (evaluator `min()` + two whitelists) + a small equations-text migration (correct the stored formulas). No new fields. Built on the live A138-10 branch so it deploys to the one `-hannesoster-` URL.

**Tech Stack:** TypeScript, Vitest, Supabase.

## Global Constraints
- Branch off the live A138-10 build (`feat/a138-10-auto-qzu`); worktree `_wt-a138-10`.
- Engine is **case-sensitive**; fix formula symbols at source (`f_Ort→f_ort`, `f_Methode→f_methode`, `k→k_f`), don't alias.
- `q_S_AC ≥ 2` stays in **A138-REQ-15** (compliance); the formula computes the value only (strip `>= 2`).
- The 18.684 basin witness AND the A138-10 Q_zu witness MUST stay green.
- Migration WRITTEN-NOT-APPLIED; rollback restores exact prior formula strings; read-only prod validation (no typed `f_K`/`k_i`; stale `q_S_AC=4836.43` is overwritten on recompute, not shadowed).
- Conditions A138-13:1 / A138-16:13 are OUT of scope (reported separately as unwired-gating questions).

---

### Task 1: Evaluator `min()` / `max()` support (DB-free)
**Files:** Modify `src/lib/eval/formula.ts`; Test `src/lib/eval/__tests__/formula-min-max.test.ts`.
- [ ] **Step 1 (failing test):** `evaluateFormula` for `x = min(a * b, 1)` with a=0.3,b=0.1 → 0.03; with a=2,b=1 → 1 (clamps); `max(a,b)` symmetric.
- [ ] **Step 2:** run → FAIL (functions throw). 
- [ ] **Step 3:** add `min`/`max` to the evaluator's allowed function set (parse the 2-arg call, fold to `Math.min`/`Math.max`); keep all other function calls throwing.
- [ ] **Step 4:** run → PASS; full eval suite green (no regression to the SUM-throws behavior).
- [ ] **Step 5:** commit `feat(eval): support min()/max() in the formula engine (for capped equations)`.

### Task 2: Whitelist A138-11:5/6 + A138-13:9 (DB-free)
**Files:** Modify `src/lib/eval/engine-whitelist.ts` + `src/lib/eval/whitelist.ts`; Test `src/lib/eval/__tests__/engine-whitelist.test.ts`.
- [ ] **Step 1 (failing test):** assert `FORMULA_ENGINE_WHITELIST` has `A138-11:5`, `A138-11:6`, `A138-13:9`.
- [ ] **Step 2:** FAIL. **Step 3:** add the three keys to BOTH lists (match the `A138-10:3` pattern). **Step 4:** PASS.
- [ ] **Step 5:** commit `fix(eval): whitelist A138-11:5/6 (k_i/f_K) + A138-13:9 (q_S_AC) for the real engine`.

### Task 3: Equations-text migration — correct the stored formulas (GATED)
**Files:** Create `supabase/migrations/2026XXXX_a138_formula_symbol_fix.sql` + `scripts/rollback-…sql`.
- [ ] `UPDATE equations` (lookup by standard+worksheet+equation_number, capture old text in the rollback):
  - A138-11 Gl.6 → `f_K = min(f_ort * f_methode, 1)`
  - A138-11 Gl.5 → `k_i = k_f * f_K`
  - A138-13 Gl.9 → `q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4`
- [ ] Idempotent; rollback restores the three exact prior formula strings (paste them verbatim from the read-only capture). **WRITTEN-NOT-APPLIED.**
- [ ] **Read-only validation** (report counts): no typed `f_K`/`k_i` anywhere; the stale `q_S_AC=4836.43` on PLT-HS-01 is A138-13-owned+derived (overwritten on recompute, not shadowed). No row deleted.

### Task 4: Integration test — the chain computes (DB-free)
**Files:** Test `src/components/worksheet/__tests__/a138-infiltration.test.tsx` (mirror the engine-wiring harness).
- [ ] A138-11 with inherited `f_ort=0.3`, `f_methode=0.1`, `k_f=2.66e-6` (+ whitelist) → `f_K=0.03`, `k_i≈7.98e-8`; and a case where `f_ort*f_methode>1` clamps `f_K=1`.
- [ ] A138-13 with `k_i`, `A_S_m`, `Q_Dr`, `A_C` set → `q_S_AC` computes (hand value); and the basin **18.684** + A138-10 **Q_zu** witnesses still green.
- [ ] commit `test(eval): A138-11 f_K/k_i + A138-13 q_S_AC compute via the engine`.

### Task 5 (GATED): apply + deploy + smoke
- [ ] Full unit suite + typecheck green; witnesses green.
- [ ] Apply migration (Management-API, HTTP 201) → deploy `--prod --skip-domain` → **HARD GATE in-browser on `-hannesoster-`** (after promote): A138-11 shows `f_K=0.03`/`k_i≈7.98e-8` (not blank), A138-13 `q_S_AC` computes + REQ-15 evaluates on the real value; query `project_parameters` to confirm. → re-point both aliases to the new build → confirm.

---

## Self-Review
- Spec coverage: min() cap (T1), whitelist (T2), formula-text migration + validation (T3), chain compute + witnesses (T4), cutover (T5). q_S_AC≥2 stays REQ-15. Conditions reported, not fixed.
- Open confirmations: (1) add `min()` (option A) vs drop the cap (option B) — recommend A; (2) the two unwired conditions (A138-13:1, A138-16:13) — defer to a compliance-gating review, or include now? (out of scope as written).
- Risk: REQ-15 currently passes on stale `q_S_AC=4836.43`; after the fix it evaluates the real value — surface in the smoke (the gate may legitimately flip if the real q_S_AC < 2).

## Playbook capture
Record under §10: "by-symbol resolver is case-sensitive — reconcile stored formula symbols to field symbols at source"; and "whitelist + formula-text are both required for a derived value to compute (whitelist alone is insufficient when the stored formula's symbols don't match the fields)." Add `min()`/cap to the supported-operator notes.
