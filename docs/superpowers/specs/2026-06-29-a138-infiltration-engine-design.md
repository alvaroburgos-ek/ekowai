# A138-11 f_K/k_i + A138-13:9 q_S_AC — engine wiring fix — Design

> Status: **DESIGN — for Alvaro's review before any build.** Code + small equations-text
> migration. Same gap class as the A138-10:3 whitelist fix: derived values that the legacy
> sum-evaluator silently mis-handles because the equation isn't on the formula-engine whitelist
> and/or its stored formula references symbols that don't match the field symbols.

## 0. The gap (audited against all 41 DWA-A 138-1 equations)
Most equations are whitelisted (incl. A138-12:4 Q_S, A138-20:33 Q_Dr, A138-26:10 flood). The
value-producing gaps are **A138-11:5/6** and **A138-13:9**. Two condition-equations (A138-13:1,
A138-16:13) are unrelated — see §4.

## 1. A138-11 — f_K (Gl.6) + k_i (Gl.5)
Both are derived but blank because A138-11 has **zero engine-whitelist entries** AND the stored
formulas use symbols that don't match the fields (the engine is **case-sensitive** — `normalizeSymbol`
only rewrites `fn(x)`→`fn_x`, never case):
- **Gl.6 stored:** `f_K = f_Ort * f_Methode <= 1` — fields are `f_ort` / `f_methode` (case
  mismatch); inputs present: `f_ort=0.3` (A138-08→A138-11), `f_methode=0.1` (A138-03→A138-11).
- **Gl.5 stored:** `k_i = k_i = k * f_K  (= konstant …)` — doubled `k_i =`, and references **`k`**
  where the field is **`k_f`** (inherited 2.66e-6 from A138-05).
- Expected: `f_K = 0.3·0.1 = 0.03`; `k_i = 2.66e-6 · 0.03 ≈ 7.98e-8`.

**Fix:** whitelist `A138-11:6` + `A138-11:5` (both lists), and **correct the stored formula text** at
source:
- Gl.6 → `f_K = min(f_ort * f_methode, 1)`
- Gl.5 → `k_i = k_f * f_K`

### 1a. The `≤1` cap needs evaluator `min()` support (decision)
`evaluateFormula` currently **throws on any function call** (e.g. `SUM(`), and a trailing `<= 1` would
be parsed as a boolean (the RHS-stripper handles one leading comparison only). So `min(…,1)` is not
expressible today. Two options:
- **(A, recommended) Add `min`/`max` to the evaluator** — a small, contained capability in
  `formula.ts` (whitelisted function names, fold into the parser). Makes the cap real + testable
  ("if product>1 → clamps to 1") and is reusable for other capped equations.
- **(B) Drop the cap** — `f_K = f_ort * f_methode`. Structurally non-binding (both factors are ≤1 by
  definition, so product ≤1 always), but not faithful to the source's explicit `≤1` and not what you
  asked to test.

→ Recommend **A** (add `min()`), since you want the clamp implemented + tested. Flagged because it's
a (small) evaluator change beyond the formula migration.

## 2. A138-13:9 — q_S_AC (the §6 suitability value)
Stored: `q_S_AC = (k_i·A_S_m·1000 + Q_Dr)/A_C · 10^4 >= 2`. Symbols match fields (`k_i`, `A_S_m`,
`Q_Dr`, `A_C` — no case issue). It's NOT whitelisted → not computed. The `>= 2` is the **adequacy
gate `A138-REQ-15`** (`q_S_AC >= 2 AND (q_S_AC > 5 OR f_Z == 1.2)`, severity **block**) — a separate
compliance check, NOT part of the value.

**Critical:** REQ-15 reads `q_S_AC`, which today holds a **stale bogus `4836.43`** (= A_C, a prior
mis-eval) on PLT-HS-01 → the block gate is **passing on garbage**. Fixing the value makes the gate
correct.

**Fix:** whitelist `A138-13:9` (both lists) and correct the stored formula to compute the value only —
`q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4` (strip the `>= 2`; REQ-15 keeps the threshold).

## 3. Symbol reconciliation = equations-text migration (not code aliases)
Per your call, correct the **stored formula text** at source (single-source-correct) rather than
scatter per-equation symbol aliases:
- `UPDATE equations` for A138-11:5, A138-11:6, A138-13:9 to the corrected formulas above.
- Idempotent; **WRITTEN-NOT-APPLIED**; rollback restores the exact prior formula strings.
- **Read-only prod validation** before apply: confirm **no project has a typed `f_K`/`k_i`** value
  (none found — clean) and note the stale derived `q_S_AC=4836.43` on PLT-HS-01 (it's A138-13-OWNED
  and derived → the engine **overwrites** it on recompute; NOT a shadow trap like the A_C local row,
  since q_S_AC is produced on A138-13, not inherited). No `project_parameters` row is deleted.

## 4. The two conditions — verified, and they are NOT in this fix
- **A138-13:1 `M ≥ 3·T_n`** — gated **nowhere** (A138-13 has no compliance reqs; not whitelisted).
  Output `M`. It's a condition, not a chain value. → **Report as an unwired condition** (likely
  informational/redundant — the design frequency is set via `n`/`T_n` on A138-08). NOT a
  value-computation gap; defer to a separate compliance-gating judgment.
- **A138-16:13 `k_i > r_D(n)·10⁻⁷`** — the Flächenversickerung feasibility condition; gated
  **nowhere**. → **Report as a likely missing compliance gate** (its siblings 16:11/12 are
  whitelisted values; this is a check). NOT a value gap; defer to a compliance-gating task.
→ Neither is fixed here (you said "only fix if real omissions" — these are *condition*/gating
questions, a different class from the value-computation gaps). Reported for your decision.

## 5. Files
- `src/lib/eval/formula.ts` — add `min`/`max` function support (option A).
- `src/lib/eval/engine-whitelist.ts` + `src/lib/eval/whitelist.ts` — add `A138-11:5`, `A138-11:6`,
  `A138-13:9`.
- `supabase/migrations/2026XXXX_a138_formula_symbol_fix.sql` (+ rollback) — correct the 3 formulas.
- Tests: `f_K=0.03`, `k_i≈7.98e-8`, the `min` cap clamps when product>1; `q_S_AC` computes from a
  hand set; engine-whitelist regression guards for the 3 keys.

## 6. Discipline
Built on the live A138-10 build branch (deploy stays on your `-hannesoster-` URL — no temp URLs).
design → plan → review → build+test → migration written-not-applied + rollback + read-only validation
→ apply → deploy → **the 18.684 basin witness + A138-10 Q_zu witness stay green** → your go.
