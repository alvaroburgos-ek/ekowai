# DWA-A 138-1 — Project State

**As of:** 2026-05-29 · `main` at `483c001` (PR #22 merged).
**Purpose:** survives outside chat history. Hand this file to a fresh engineer and they should be able to pick up where we left off.

---

## 1 What's done

### 1.1 The audit (Pile-0)

Every row in `fields`, `equations`, `compliance_requirements` for DWA-A 138-1 was compared verbatim against `DWA-A_138-1_WD (5).md` (Mathpix LaTeX) using extract-then-compare both directions. **241 match / 0 mismatch / 71 not_found** after remediation; **41 / 41 equations verbatim** including all `≥` caps, `10^x` exponents, and algebraic identities. Per-worksheet reports in `audit-reports/DWA-A-138-1/A138-01.md` … `A138-28.md` and the tally in `_PROGRESS.md`.

### 1.2 Remediation passes

| Pile | What | Effect |
|---|---|---|
| **Pile-1** | 12 `§4.x → §5.x.y / §6.x.y` anchor fixes | rows moved from `mismatch` → `match`. SQL in `_pile2-applied.sql`. |
| **Pile-2 Group 2** | 4 sourceless fields deprecated via `active=false` (`a138_k_f_geo`, `a138_korrekturfaktor`, `a138_speichertyp`, `a138_A_u`). Schema additive: `ALTER TABLE fields ADD COLUMN active boolean DEFAULT true`. | rows retained for audit trail; form hides them (`visibleFields` filter). |
| **Pile-2 Group 3** | 2 Wizard-derived fields reclassified (`a138_V_Sp_vorhanden`, `a138_anlagentyp_kandidaten`) — `clause_reference=NULL`, `verification_status='inferred_from_worksheet'`, `audit_status='not_found'` | semantic, no data loss. |
| **Pile-2 Group 4** | `d_a` / `d_i` (A138-18, Rigole) reclassified `mismatch → match` after confirming §6.4.2 locally overrides Tab. 2's `mm` with `m` for the Rigole context (parallel to §6.7.2 Schacht). | audit error corrected. The wizard's `m` storage is source-correct in the §6.x context. |
| **Pile-3** | Sub-areas carrier `sub_areas_A138_10` added (`data_type='json'`) on A138-10; existing totals/`C_m` downgraded to `inferred_from_worksheet`. | additive, no destructive migration. |
| **Pile-4** | Single r_D / D fields on A138-04 downgraded to `inferred_from_worksheet` after `r_D_n_table` JSON carrier was wired. | additive, no INSERT (carrier already existed). |

All SQL is in `_pile{2,3,4}-applied.sql` / `_pile{2,3,4}-schema.sql` / `_pile{2,3,4}-decisions.md` files in this directory.

### 1.3 The engine — 9 whitelisted equations

`FORMULA_ENGINE_WHITELIST` in `src/components/worksheet/worksheet-form.tsx`.

| # | WS | Gl. | What it computes | Path | Hand-calc fixture output |
|---|---|---|---|---|---|
<!-- "Hand-calc fixture output" column: the number is what the engine returns
     for the specific reference inputs in the linked _eval-reference-Gl*.md
     file (Heinsberg-like fixture). NOT a normative constant of the standard —
     real projects produce different numbers. -->

| 1 | A138-10 | **2** | A_C = Σ(A_E,b,a,i · C_i) + Σ(A_E,nb,a,i · C_i) | aggregator over `sub_areas_A138_10` JSON carrier | `_eval-reference-Gl2.md` → 690 m² |
| 2 | A138-12 | **4** | Q_S = k_i · A_S · 10³ | arithmetic | `_eval-reference-Gl4.md` → 5.000 l/s |
| 3 | A138-12 | **7** | A_S,m = (A_S,min + A_S,max) / 2 | arithmetic | `_eval-reference-Gl7.md` → 100.000 m² |
| 4 | A138-13 | **8** | V_VA = max over (D, r_D(n)) rows of `(r_D · (A_C+A_VA)·10⁻⁴ − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³` | aggregator over `r_D_n_table` JSON carrier + 6 inherited scalars | `_eval-reference-Gl8.md` → 18.684 m³ at D=30 min |
| 5 | A138-16 | **11** | Bilanz-Check: `(A_C+A_S) · r_D(n) · 10⁻⁷ ≟ A_S · k_i` (±1 % tol) | balance aggregator | `_eval-reference-Gl11.md` → residual ≈ 0 |
| 6 | A138-16 | **12** | A_S = A_C / (k_i · 10⁷ / r_D(n) − 1) | arithmetic + symbol alias `r_D_n → r_D_n_used` | `_eval-reference-Gl12.md` → 351.351 m² |
| 7 | A138-17 | **16** | A_S,m Mulde = `(A_C · 10⁻⁷ · r_D(n)) / (h_M / (D · 60 · f_Z) + k_i)` | arithmetic + inheritance | `_eval-reference-Gl16.md` → 68.824 m² *(see open item 2)* |
| 8 | A138-18 | **17** | A_S,m = (b_R + h_R) · L_R + b_R · h_R | arithmetic | `_eval-reference-Gl17.md` → 21.000 m² |
| 9 | A138-18 | **21** | s_R = (s_F / (b_R · h_R)) · (b_R · h_R + az · (π/4) · ((d_i²/s_F) − d_a²)) | arithmetic + `pi` constant via profile + d_a/d_i unit guard | `_eval-reference-Gl21.md` → 0.317 166 |

**Gl. 18** has a profile + hand calc + unit test but is **NOT in the whitelist** — see open item 1.

---

## 2 Key architectural decisions (with WHY)

### 2.1 Real evaluator, not the legacy naive sum

The original `worksheet-form.tsx` had a naive sum-evaluator: it ignored `equations.formula` and just summed `input_symbols`. It was built for DIN-276 cost roll-ups (every DIN-276 equation IS a sum). For DWA-A 138-1 every equation is a real algebraic formula — the naive sum would silently produce garbage (e.g. for Gl. 21 it would have written `sum(s_F, b_R, h_R, az, d_i, d_a)` into `s_R`).

We built an in-tree shunting-yard arithmetic evaluator (`src/lib/eval/arithmetic.ts`, ~150 LOC) plus a profile/aggregator layer (`src/lib/eval/formula.ts`). Reasons for in-tree rather than mathjs/expr-eval:

1. Turbopack + pnpm could not resolve mathjs nor expr-eval client-bundle entries under Next 16.
2. The arithmetic surface we actually need is small and stable: `+ − * / ^ ()` with scientific notation. A 150-line evaluator we own is more defensible than a 600 KB external dep.
3. **Unknown identifiers throw** (no implicit `0` default). Function calls throw. That's the fail-loud default the project wants.

The naive sum-evaluator is kept in place for the non-whitelisted equations (it harms nothing for DIN-276 worksheets) and is bypassed for any equation on `FORMULA_ENGINE_WHITELIST`.

### 2.2 Data model holds what the standard itemizes

The Gl. 2 discovery: the source formula sums over per-sub-area `(A_i, C_i)` pairs, but the wizard had collapsed it to `(A_E_b_a_total, A_E_nb_a_total, C_m)`. **Iteration 1** wired a string-level rewrite (`SUM(A_E_b_a_i · C_i)` → `A_E_b_a_total · C_m`) — algebraically exact only when `C_m` is the area-weighted mean across BOTH paved and unpaved sub-areas, which engineers don't always honour. The mixed-coefficient case (400@0.9 + 300@0.8 + 100@0.5 + 200@0.2 unpaved) hand-calcs to 690 m²; the totals × arithmetic-mean-C trap gives ~733 m² — a +6.3 % silent over-design feeding into Q_zu → V_VA → storage.

**Iteration 2** retired the rewrite, added a JSON carrier `sub_areas_A138_10` on A138-10, and re-wired Gl. 2 as a real Σ-aggregator over the rows. Same pattern reused for KOSTRA (`r_D_n_table`, Gl. 8) and any future itemised input.

The rule: **if the standard itemizes it, the data model must hold the items**. Means and totals are inferred outputs, not primary inputs.

### 2.3 Three-state fail-loud contract

Every equation evaluation returns exactly one of three states (`src/lib/eval/formula.ts:EvalState`):

- `computed` — `value` + `substituted` map of all inputs used + the formula actually evaluated (post-rewrite/normalisation). Persistable to `project_parameters`.
- `manual_required` — `reason` text plus optional `missing[]` / `unitConflicts[]` / `rewrite` field. **NEVER carries a `value`.**
- `error` — malformed formula or evaluator throw.

`EquationEngineCard` renders the two non-computed states with the red banner "rechnerisch nicht bestätigt — manuell prüfen". The store's output field is force-cleared on non-computed states so a stale number can't survive across edits.

**Why:** an engineering compliance tool that silently returns a 1000×-wrong number is worse than no tool. The badge is honest about what the engine could and couldn't verify.

### 2.4 Unit guards

The engine compares each input's field-stored unit against the per-equation profile's `expectedUnits` BEFORE evaluating. Mismatch → `manual_required` with the conflict list visible, never compute. Examples in production:

- **d_i / d_a in mm vs §6.4.2's m** — the audit-flagged 1000× error (Gl. 21).
- **KOSTRA r_D(n) in mm/h or m/s vs l/(s·ha)** — Gl. 8 silent-error trap.

The aggregator path performs its own unit check on carrier columns (KOSTRA, sub-areas).

### 2.5 Cross-worksheet inheritance via `consumer_worksheets`

The `fields.consumer_worksheets text[]` column was already populated in DB — every origin field declares its downstream consumers. The page loader (`loadInheritedFields` in `src/lib/db/queries/worksheet.ts`) reads this; `mergeInheritedFields` adds the upstream fields to the current form's field list (own fields win on symbol collision). Values flow via `project_parameters` keyed by `(project_id, field_id)` — single canonical store, any worksheet that knows a field's id reads/writes the same row.

**Why this approach beats hand-wired inheritance maps:** the wiring graph lives in DB next to the field definitions, gets audited as part of the standard's data, and changes without code edits.

### 2.6 Multi-producer ambiguity guard

If a symbol resolves to >1 active producing field within the standard, the engine refuses to compute any equation that consumes that symbol — `"mehrdeutige Quelle für {symbol} ({origin1}, {origin2}, …)"`. Implementation: `mergeInheritedFields` returns `{ fields, ambiguousSymbols }`; `useEquationEngine` checks before delegating to the aggregator/arithmetic path. Tested with a synthetic Q_S double-producer collision (`A138-12 + A138-ROGUE`) — engine refused to pick despite both Q_S field ids carrying values.

**Why:** the active-field collision scan on today's DB returns zero, but additions can drift in silently. The guard fails loud the moment a second producer is wired.

---

## 3 Open items

### 3.1 From `_OPEN-ITEMS.md`

1. **Gl. (18) Q_S Rigole — un-whitelisted, pending source check.** The DB formula omits the `×10³` factor Gl. (4) has for the same Q_S quantity, so literal evaluation returns m³/s while the field is labelled l/s (1000× magnitude trap). Resolution: read §6.4.2 in `DWA-A_138-1_WD (5).md` and decide — relabel the field unit (m³/s) or patch the formula via Pass3c re-import (recover `×10³`).
2. **Gl. (16) A_S,m Mulde — confirm 68.824 m² independently.** Engine reproduces the hand calc but both derive from the same source. Walk through §6.3.2 manually with the same inputs; close with a one-line source-span citation.
3. **Squash-merge caveat — standing rule.** Future PRs with multi-commit safety content must list safety commits in the PR body and grep main post-merge for marker strings.

### 3.2 Engine coverage backlog (the remaining ~28 §6 equations)

`equations` table has 41 rows for DWA-A 138-1. **9 wired today.** Remaining ~32 (some are equations like Gl. 5, 6, 9 that aren't strictly §6.x.y but live in §5.3.3.x — same engine, different worksheet):

- §5.3.3.x: Gl. 3 (Q_zu), Gl. 5 (k_i), Gl. 6 (f_K), Gl. 9 (q_S,AC threshold), Gl. 10 (V_Rück Überflutung)
- §6.5.2 MRE: Gl. 26–29
- §6.6.2 MRS: Gl. 30–33
- §6.7.2 Schacht: Gl. 34–40
- §6.8.2 Becken: Gl. 41
- Plus the §6.4.2 Rigole leftovers (Gl. 18 is open item 1; Gl. 19, 20, 22, 23, 24, 25 not wired)
- Plus Gl. 13–15 if they're standalone DB rows

Procedure for batching them: §3 below.

### 3.3 Source → DB coverage sweep

The audit went DB → source. The other direction — every source equation has a DB row + audit row + hand calc — was sampled but not exhaustive. One sweep pass on `DWA-A_138-1_WD (5).md` to confirm every numbered Gleichung in §5.3.x and §6.x.y has a `DB equations.equation_number` match.

### 3.4 One-time Vercel visual check

The integration tests prove the engine renders correctly through the production hook + components in a happy-dom env. A live browser pass on the Vercel preview (any one project with a complete dataset) would close the loop on:

- Does the engine card render legibly on the live Tailwind build?
- Do the inherited-values panel and KOSTRA editor look usable to engineers?
- Does the de-DE number formatting (`18,684 m³`) carry through to PDFs / reports?

Blocked on Vercel MCP auth or someone sharing the preview URL.

---

## 4 The repeatable procedure (in brief)

For every future standard or every future batch within a standard:

**Audit (extract-then-compare, both directions).** For each DB row find the source span verbatim; for each source equation find the DB row. Per-row outcomes: `match` / `mismatch` / `not_found`. Output: one `A{ws-code}.md` per worksheet + a running `_PROGRESS.md`.

**Remediate (flag-don't-fix, deprecate-don't-delete).** Wrong anchor → propose new anchor + tracking SQL. Sourceless field → `active=false` (retained for audit trail) + `verification_status='needs_engineer_review'`. Schema changes are ADDITIVE only — `ADD COLUMN IF NOT EXISTS`, never `DROP`. Reviewable SQL before applying.

**Prove keystone equations first.** Pick the four shapes:

1. **Aggregate over itemised inputs** (Gl. 2 sub-areas) — proves the data model captures what the standard itemizes.
2. **Hard arithmetic** (Gl. 21 nested fractions, π, squared terms) — proves the evaluator handles real algebra.
3. **Iteration over a table** (Gl. 8 over KOSTRA) — proves aggregators can find a governing variable.
4. **Cross-worksheet inheritance** (Gl. 12 + Gl. 16 + Gl. 8 scalars) — proves the dependency graph flows.

For each: hand-calc reference file FIRST (no code) → equation profile + aggregator → unit test against the hand calc → rendered integration test against the production hook + EquationEngineCard. Three-state contract preserved; unit guard tested; missing-input tested.

**Batch the rest with sampling-review.** Once the keystones are in, the remaining equations are mostly variations of those four shapes. Pattern:

- Wire a batch (5–10 equations) in one PR.
- Hand-calc file per equation (concise — input table + worked steps + result).
- Combined evaluator test file per batch; rendered integration test on the most novel one only.
- Document any DB-vs-source discrepancies (like Gl. 18's missing `×10³`) in `_OPEN-ITEMS.md` rather than fixing silently.

**Branch-and-PR discipline:**

- Branch off current `main` (or current PR head when stacking).
- Local CI mirror before push: `pnpm typecheck && pnpm lint && pnpm test`.
- Draft PR with explicit Step-0 findings + per-equation table with computed values.
- If the PR has multi-commit safety content, list the safety commits in the PR body — squash-merges silently drop unlisted commits (cf. PR #21 → PR #22 rescue).
- After every squash-merge, grep main for a marker from each safety commit to confirm survival.

---

## 5 File index for this directory

- `_PROGRESS.md` — audit tally + per-WS table.
- `_PROJECT-STATE.md` — this file.
- `_OPEN-ITEMS.md` — open audit / engineering decisions.
- `_eval-reference-Gl{2,4,7,8,11,12,16,17,18,21}.md` — hand-calc references.
- `_pile{2,3,4}-{applied,decisions,schema}.{md,sql}` — remediation evidence.
- `A138-01.md` … `A138-28.md` — per-worksheet audit reports.

PRs that built this: #18 (Gl. 2 iter 1) · #19 (Gl. 21) · #20 (Gl. 8) · #21 (cross-worksheet inheritance + ambiguity guard — squash lost the ambiguity guard) · #22 (§6 batch + ambiguity guard re-introduction) · #23 (`_OPEN-ITEMS.md`).
