---
title: "Sign-off sheet — Plan 2a (expression language, visible_when, register equations, materialiser)"
created: 2026-09-17
tags: [project/ekowai-wizard, type/decision-batch, status/awaiting-signature, topic/guideline-to-tool]
status: awaiting-signature
---

# Sign-off — Plan 2a

- **Branch / range:** `feat/guideline-to-tool`, commits `7ee7d22..9b0e1bd` (base `da79b99`), worktree `C:\Users\Ekowai\_wt-g2t`
- **Plan:** `docs/superpowers/plans/2026-09-16-guideline-to-tool-plan-2a-expression-language-visibility-materialiser.md` · **Spec:** `docs/superpowers/specs/2026-09-11-guideline-to-tool-generic-fields-design.md` (§6, §8 phases 3–4, §9, §11)
- **Ledger:** `.superpowers/sdd/2026-09-16-guideline-to-tool-plan-2a-expression-language-visibility-materialiser/progress.md` (every `Ruling:` line is mapped below; the task reports `task-1..11-report.md` in the same folder carry the RED/GREEN evidence per item)
- **Sessions:** Tasks 1–7, 9 on Claude Fable 5.1; Tasks 8, 10, 10b, 11, 12 on Claude Opus 5 (`claude-opus-5[1m]`) after the Fable weekly limit (ledger line "MODEL CHANGE 2026-09-17"); Claude Code 2.1.260; this sheet written by Opus 5, effort high. Commit trailers carry the plan-mandated `Co-Authored-By: Claude Fable 5.1` on every commit regardless of model — the ledger, not the trailer, is the provenance record.
- **Verification at close-out (re-executable, run 2026-09-17 in the worktree):** `pnpm test` → 217 files passed | 1 skipped · 2107 passed | 1 expected fail | 1 skipped · `pnpm -s typecheck` → exit 0 · `git diff --name-only da79b99..HEAD | xargs pnpm eslint` → 0 errors / 9 warnings (all 9 present at `da79b99`) · `pnpm vitest run --project integration tests/harness/register-materialise.integration.test.ts` → 1 passed (embedded PG 18) · `git status --short` → empty.
- **Nothing here is applied to prod.** The three migrations are WRITTEN, NOT APPLIED (`scripts/migrations/20260916100000`, `…110000`, `…120000` + rollbacks); no new `supabase/migrations/*`. Apply order and bridge retirement: `docs/superpowers/guideline-to-tool-playbook.md`.
- **How to sign:** tick one box per block. RATIFIED = keep as built. REJECTED = say what instead (the block names the two-line change where one exists). DEFER = stays as built, re-raised at the named later point. Items marked **enforcement-changing** or **value-changing** were NOT applied — they are proposals.

Blocks: D-4 … D-11 (design decisions the plan asked for), S-2a-1 … S-2a-6 + S-2a-9 (findings raised to sign-off during execution; S-2a-9 added at the Plan 2b close-out), L-1 … L-26 (every other ledger ruling that changed behaviour, in task order), then the deferred-minor appendix and the "5-minute look" list.

---

## D — design decisions requested by the plan

### D-4 `stdev_rows` = SAMPLE standard deviation (n−1)

- **Built:** `src/lib/expr/evaluate.ts` `case 'stdev_rows'` → `Math.sqrt(ss / (xs.length - 1))`; fewer than 2 survivors → recoverable `stdev_rows(): mindestens 2 vollständige Zeilen erforderlich.` (pinned in `src/lib/expr/__tests__/row-functions.test.ts`).
- **Why it needs you:** a population deviation (n) gives a different number for every register with a finite row count. No guideline is encoded against `stdev_rows` yet — DWA-M-820-1 "S-Abw" and DWA-M-1200-2 "SD" are the first inventory items that will be (Plan 3). The choice is a **code default, not a guideline claim**; when Plan 3 lifts those two inventories the wording is quoted verbatim and, if it names the population form, the encoding uses an explicit formula rather than a silent change of this default.
- **Cost if wrong:** every future stdev-backed value is off by the factor √((n−1)/n) — a value change, never applied without this signature.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### D-5 VSME-B04.100 per-medium sums as three equation rows (`imported_unverified`)

- **Built:** `FALLBACK_REGISTER_EQUATIONS['VSME-B04.100']` (`src/lib/eval/register-configs.ts`) + migration `20260916110000_vsme_b04_register_equations.sql` insert `B04.100-air/-water/-soil` with formula `AmountOfEmissionTo<Medium> = if(flag(pollutant_register, 'not_applicable'), 0, sum_rows(pollutant_register, if(medium == '<medium>', amount_t, 0)))`, `input_symbols = {pollutant_register}`, `clause_reference 'VSME para 32'`, `verification_status 'imported_unverified'`. Replaces the code-only pollutant block in `saveWorksheet` (deleted).
- **Evidence (source, already in the codebase at `src/lib/eval/pollutant-register.ts:7`):** VSME para 32 — "it shall disclose the pollutants it emits to air, water and soil in its own operations, with the respective amount for each pollutant."
- **Parity:** `not_applicable: true` ⇒ 0 per medium (was 0); no complete rows ⇒ null (was null); sums over complete rows only (register required set `pollutant`, `medium`, `amount_t ≥ 0` = the old `pollutantRowComplete`). Pure test `src/lib/eval/__tests__/materialize-derived.test.ts`; the VSME save path was NOT driven on embedded Postgres (no VSME harness seed) — "expected to run", the A138-07 path RAN.
- **Residue:** the snapshot payload carries three extra `equationOutputs` keys (`B04.100-air/water/soil`) from the fallback rows until the migration lands — the diff viewer shows them as new entries on the first post-deploy snapshot.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### D-6 Visibility is single-pass — no cascade through hidden drivers within one render

- **Built:** `computeVisibility` (`src/lib/compliance/visibility.ts`) evaluates every `visible_when` against the CURRENT values once. A rule that references another hidden symbol sees that symbol's stored value, not `null`. Documented in the module header; the save path adds the same note (`src/lib/actions/worksheet.ts`, above `computeVisibility`: visibility is evaluated against pre-save values, so a rule referencing a derived output sees the previous save's value).
- **Why accepted:** a fixpoint iteration would need a dependency order and a cycle rule (see S-2a-3); no rule in the corpus today references a hidden symbol (only the two A138-12 ASM rules exist, both on an atomic driver).
- **Cost if wrong:** a two-level conditional (`b` visible only when `a` visible AND `a == x`) needs its guard written explicitly (`a IS NOT NULL AND …`) — an encoding convention for Plan 3, not a runtime defect.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### D-7 A138-12 ASM visibility as `visible_when` data (behaviour identical to the early returns)

- **Built:** the two `DynamicField` early returns are deleted; `LEGACY_VISIBLE_WHEN` (`visibility.ts`) supplies `a_s_m_determination_method IS NOT NULL AND a_s_m_determination_method == 'soil_estimate'` (`soil_bodenart_tab13`) and `… == 'manual'` (`a_s_m_provenance`) while `fields.visible_when IS NULL`; migration `20260916120000_a138_12_visible_when.sql` writes the same rules as data (SQL uses `=`, the DSL's equality).
- **Evidence:** `scripts/__tests__/a138-12-visible-when-sql.test.ts` asserts identical `evaluateCondition` verdicts for the SQL literal vs the TS rule over method ∈ {undefined, null, direct, manual, soil_estimate, geometry}; `visible-when-form.test.tsx` pins method unset ⇒ both hidden, `soil_estimate` ⇒ soil only, `manual` ⇒ provenance only through the real form.
- **Note:** `LEGACY_VISIBLE_WHEN` is keyed by SYMBOL (any standard whose field is called `soil_bodenart_tab13` gets the rule) while the migration is scoped to `DWA-A-138-1`. Today only A138-12 carries these symbols; after retirement the scope is the migration's.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### D-8 Only REGISTER-fed equations are materialised server-side

- **Built:** `materializeDerivedOutputs` (`src/lib/eval/materialize-derived.ts`) evaluates equations whose consumed symbols (normalised `input_symbols` ∪ bridge `remap`) include a register present in the saved batch; scalar-only equations are skipped. Spec §6 also lists "inputs in the saved batch" — that half is NOT built.
- **Why:** scalar-equation materialisation is the open engine-output-materialization workstream (memory `project_engine_output_materialization`); folding it into 2a would have changed persistence for every standard's scalar equations in the same diff as the register mechanism.
- **Cost if wrong:** downstream "fehlend" persists for scalar outputs (unchanged from today).

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### D-9 Upstream-cause completeness follows the register contract (`carrierSourceState`)

- **Built:** `src/lib/eval/carrier-source-state.ts`; `surfaceSourceState` is a shim over it with the `surface_inventory` fallback config. Completeness = `prepareRegisterRows(...).rows[i].complete` — the same rule the engine uses.
- **Two observable edges on the A138-07 → A138-10 gate (Task 9 report):** (1) a new-shape row with a valid `tab9_value` but null `c_i`/`c_s` was INCOMPLETE before (the old normaliser only backfilled legacy rows); the register refills from Tab. 9 (unless `coeff_override`) so it now counts COMPLETE — the gate agrees with the engine, which already refilled; (2) a row with `area_m2 < 0` was COMPLETE before; `min: 0` from the column contract makes it INCOMPLETE (tightens). Deferred minors alongside: non-object row entries drop from `total`; string-valued `c_i`/`c_s` count complete.
- **Cost if wrong:** a consumer worksheet sees derived values one refill earlier than before (edge 1); a negative-area row now withholds (edge 2).

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### D-10 A `not_applicable: true` register with zero rows reads `missing` — future `assertingFlags`

- **Built:** `carrierSourceState` plumbs `flagKeys` but does not read the flags; the VSME `pollutant_register` with the "Keine meldepflichtigen Schadstoffe" flag set and no rows is `missing` for the upstream gate. No consumer of that gate exists today (the VSME consumer is Plan 2b/3).
- **Proposal when the first consumer is wired:** `opts.assertingFlags?: string[]` — a true flag in the list asserts the source complete (state `ok` when approved/final).
- **Cost if wrong:** a VSME consumer worksheet withholds B04 sums until rows exist even though the engineer declared "none".

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### D-11 Snapshot visibility over RAW parameters vs gates over derived overrides

- **Built:** `buildSnapshotPayload` computes `computeVisibility` from the raw stored `parameters` BEFORE the equation loop (so hidden symbols can be nulled for the engine), while its compliance gates read `derivedOverrides` (values derived in the same pass). A `visible_when` on `r_D_n` / `D_min` therefore reads the stored value, not the just-derived one — the single-pass rule of D-6 applied to the snapshot. The `parameters` record and `lookupForCompliance` stay raw (the snapshot documents what is stored; gates get `not_applicable`).
- **Cost if wrong:** only rules on derived symbols are affected; none exist today.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

---

## S-2a — findings raised to sign-off during execution

### S-2a-1 `SUM(x)` single-token phantom-symbol hazard — **enforcement-changing, NOT fixed**

- **Finding (Task 4, re-executed on HEAD and on Task-4 sources):** `normalize-formula.ts` `FN_LIKE` rewrites any `NAME(singleToken)` with an unsupported NAME to the symbol `NAME_token` BEFORE the eligibility gate runs — `A_C = SUM(surface_inventory)` becomes `A_C = SUM_surface_inventory`, no call survives, check (2) resolves declared `input_symbols` only, and the gate reports `verified: true`. Pre-existing (inventoried as a WARN rule, `scripts/reasoning-map/validate.mjs:669-676`); `SUM(expr, …)` with a non-single-token argument IS rejected (pinned).
- **Proposal:** in check (1), for each raw `name(arg)` that `FN_LIKE` rewrote, require `name_arg ∈ knownFieldSymbols`, else report `name` as an unsupported call. This can flip currently-eligible formulas to `manual_required` → enforcement change → your call.
- **Exposure today:** `computeEngineDenyKeys` exempts `Σ|SUM(` formulas before the gate anyway; a Σ-style single-token call that slips through evaluates to `manual_required` at runtime (fail-safe, not a wrong number).

☐ RATIFIED (apply the proposal)  ☐ REJECTED (leave as is)  ☐ DEFER

### S-2a-2 Prod submit-for-review hang — root cause fixed in Task 10b (`e2c9283`), deployed proof owed

- **Root cause (file:line at `ebc9ddc`):** `worksheet-transition.ts:112-127` runs `captureSnapshot({ txDb: tx })` inside `db.transaction`; `snapshots/capture.ts:108-131` ran five queries in `Promise.all`, one of them `loadInheritedFields(...)` which used the GLOBAL pool (`db/queries/worksheet.ts:142-147`) unconditionally — a second connection requested while the tx holds one; with a small/serverless pool the global query queues forever, the tx callback never resolves, DB shows `idle in transaction`. Pre-existing on main; Plan 2a's Task 7 capture change did not cause it (its `sections` select was on `dbi`).
- **Fix:** `loadInheritedFields(…, dbi = db)`; capture loads sequentially, all on `dbi`. Pinned by `src/lib/snapshots/__tests__/capture-tx.test.ts` (RED showed 4 queries in flight on the tx fake and a global-db call) and `src/lib/db/queries/__tests__/load-inherited-fields-client.test.ts` (proven to pin by a temporary revert).
- **What is NOT proven:** the prod symptom clearing. There is no harness driver for the transition path; the deployed proof is your browser submit on a build containing `e2c9283`.
- **Owner items (operational, from the 10b review):** explicit pool `max` + `idle_timeout`/`connect_timeout` on the postgres.js client (`src/lib/db/index.ts`); `ALTER ROLE … SET idle_in_transaction_session_timeout = '30s'` + `statement_timeout` on the app role (prod DDL — converts any future regression of this class into a loud rollback); optionally a lint/unit guard flagging `db.` inside `db.transaction` bodies.

☐ RATIFIED (fix stands; retest on deploy)  ☐ REJECTED  ☐ DEFER

### S-2a-3 Importer rule against self-referential `visible_when` — needs the dependency graph, not built

- **Hazard (data, not code):** a field whose `visible_when` reads an engine output computed FROM that field oscillates (visible → computed → fail → hidden → null → pending → visible …). No such rule exists (the two ASM rules read an atomic driver).
- **Proposal:** importer rule — `visible_when` may not reference an equation output whose input set (transitively) contains the field's own symbol. Requires the equation dependency graph in `_pass3c-validate.ts`; deferred to Plan 3 Task 0 or Plan 2b.
- **Related, built:** the importer DOES reject `visible_when` on a field with non-empty `consumer_worksheets` and on any section of its chain (`validateVisibleWhenNotOnProducer`, `sectionChainFor`); the section half is latent until the xlsx contract carries `visible_when` on sections.

☐ RATIFIED (add the rule when the graph exists)  ☐ REJECTED  ☐ DEFER

### S-2a-4 Hand-coded A138 materialisers in `worksheet.ts` do not null hidden inputs

- **Scope of the hidden ⇒ null rule as built:** the generic `materializeDerivedOutputs`, the client engine hook (every special path: registers, KOSTRA, Gl.8/Gl.10 scalars, flood carrier, `r_D_30`), the report evaluator, the snapshot payload and the PDF assembler all read through `withHidden`. NOT covered: `materializeBasinGoverning`, `materializeAsm`, `materializeLoadingCheck` in `src/lib/actions/worksheet.ts` — they read typed inputs through their own loaders.
- **Exposure:** only if a `visible_when` is ever put on one of THEIR inputs (none today — A138-12's two hidden fields are inputs of `materializeAsm`'s method-specific branches, which the method switch already selects; hiding follows the same driver). A guideline conditional on a basin-governing input would need those loaders wrapped.
- **Proposal:** wrap the three loaders' value reads with `withHidden` when Plan 3 first encodes a `visible_when` on an A138 scalar input; until then, documented.

☐ RATIFIED (defer until needed)  ☐ REJECTED (wrap now)  ☐ DEFER

### S-2a-5 A138-12 CRs guarded on `a_s_m_provenance` / `soil_bodenart_tab13` flip from vacuous pass to `not_applicable` when hidden

- **Behaviour change (spec-mandated, §6/§9 risk 3):** before 2a a compliance requirement referencing a hidden ASM field evaluated as `pass` (the guard's premise was false — vacuous) or `pending`; now `evaluateCondition(…, { hiddenSymbols })` returns `not_applicable` and the badge shows `–` instead of `✓`. Approval is unaffected (only `fail` blocks; `not_applicable` never does — `approval-gate.ts:273`).
- **What to confirm:** on the prod test project's A138-12 worksheet with method = `direct` or `geometry`, the CRs that mention `a_s_m_provenance` / `soil_bodenart_tab13` show `– n.a.` and the header chip counts them; the conformity panel's pass count drops by that number. This is a badge/count change on an existing worksheet, not a value change.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### S-2a-6 Fourth JSONB verdict value `'not_applicable'`; PDF wording "n.a. — nicht anwendbar"

- **Built (Task 11):** `SnapshotComplianceVerdict = 'pass' | 'fail' | 'open' | 'not_applicable'`; snapshots written from now on may carry the 4th value in `compliance_results` JSONB — no constraint, no migration, older rows stay valid, doc comment on `src/lib/db/schema.ts:506-508`; `diffCompliance` treats `open → not_applicable` as a verdict change. PDF: badge `– n.a.`, verdict text `n.a. — nicht anwendbar (ausgeblendetes Feld)` (Task 3's interim `nicht zutreffend` was reworded to avoid colliding with the worksheet-level "Nicht zutreffend" state); Prüfmemo appends `· N n.a. (ausgeblendetes Feld)` only when N > 0 (existing text byte-identical otherwise).
- **Your call:** the wording pair (gate-level "nicht anwendbar / n.a." vs worksheet-level "Nicht zutreffend") and whether any external reader of `compliance_results` assumes three values (none found in `src/`).

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### S-2a-9 Enum values that share a field's name — validator rule proposed, NOT fixed (judgment class; added 2026-09-17 at the Plan 2b close-out)

- **Finding (2a fix-wave re-review, re-measured in the 2b close-out session on the 2026-08-01 snapshot):** the corpus assumption behind the C-1 rule — "no enum value shares a field name" — is false: 59 (field, enum-value) pairs collide with a field symbol of the same standard (44 distinct values), and 40 equality gates in those standards compare a select field against such a bare identifier (58 if any field symbol corpus-wide counts; the re-review counted 61). Example: DWA-M-179-1 REQ-14 `IF treatment_method == sedimentation THEN q_A_max >= 1 AND q_A_max <= 10` — `sedimentation` is BOTH an enum value of `treatment_method` AND a number field. Under the legacy var-vs-var rule (kept by 2a, L-2) the RHS resolves as the FIELD whenever that field has a value, so the gate compares `treatment_method` with a number (never equal → the guard is false → vacuous pass) or, while the field is empty, uses the enum literal as intended. The gate's verdict therefore depends on whether an unrelated field happens to be filled.
- **Why it is not fixed:** every remedy changes enforcement — (a) quoting the RHS in the 40–61 conditions (data fix per standard, each one a prod write that can flip a vacuous pass to a real fail); (b) making the evaluator prefer the enum literal when the LHS is a select field with that value in its `enum_values` (engine change affecting every standard); (c) renaming the colliding fields. None is source-settled; the choice is yours.
- **Proposal (validator rule, judgment class):** add rule `enum-value-field-collision` to `scripts/reasoning-map/validate.mjs` — for every `fields.enum_values` entry whose value equals a field symbol of the same standard, WARN on the field, and ERROR on every compliance condition whose `==`/`!=` bare-identifier RHS is such a value. Re-run corpus-wide; the hits become per-standard decision items (quote the RHS, or rename). No code path changes until you pick (a), (b) or (c).
- **Cost if wrong (deferred):** the affected gates keep evaluating against the field instead of the enum literal — a pre-existing condition since before Plan 2a, not a regression; but a sign-off that reads "no collisions" would have hidden it, which is why the L-2 / L-25a wording was corrected.

☐ RATIFIED (add the validator rule; decisions per standard follow)  ☐ REJECTED  ☐ DEFER

---

## L — ledger rulings that changed behaviour (task order)

### L-1 Grammar widening is visible through the adapters (Task 1–3)

Unary `+` is identity (`+5`, `10^+3`); `^` right-associative with `-x^2 = -(x^2)`; function calls; `.5` and scientific numbers; `IF a THEN b` guard vs `if(c, x, y)` call. Consequences no pre-2a test pins (Task 3 report §7.3): gate conditions now accept `^`, calls and `.5` (were `manual`); a formula identifier with Latin-1 letters throws `Unbekanntes Symbol` (→ `manual_required`) instead of `Unerwartetes Zeichen` (→ `error`); a quoted numeric string in a formula evaluates instead of throwing. Every pre-2a pinned message/number is reproduced (868 → 874 compliance+eval tests, none edited).

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-2 C-1 — enum-literal RHS after a CALL LHS only (Task 2; corrected by the fix wave 2026-09-17)

`acompare` with `==`/`!=`, a bare-identifier RHS **and a call-result LHS** (`lookup('TAB9', k, 'kind') == paved`): the RHS is a symbol if it has a value, else its own name as a string literal; `extractSymbols` skips it — the legacy compare-node rule (`compliance/evaluate.ts:426-436`) extended to that one new shape. Equality compares `Value`s (lookup strings work); relational ops stay numeric. **An arithmetic LHS keeps the legacy acompare semantics** (`compliance/evaluate.ts@da79b99:439-444`): in `a + b == c` the RHS `c` is a symbol reference → `pending` when unvalued, `fail` only on a real mismatch. The first cut applied the enum rule to EVERY `acompare`; the whole-branch corpus differential (legacy evaluators @ da79b99 vs HEAD over the 2026-08-01 snapshot, 1872 conditions) found **10 affected gates** — DWA-A-102-2 REQ-04 (`A_b_a_I + A_b_a_II + A_b_a_III == A_b_a`), DWA-M-102-4 REQ-18 (`A_E_k_b + A_E_k_nb == A_E_k`), DWA-M-820-3 REQ-15/16/17/18/19/22/23/24 (`qeNN_items_y + … == qeNN_items_total`) — that flipped `pending → fail` with an empty total and `fail` instead of `not_applicable` with a hidden total. Fixed in `5c01871` (`isEnumRhs` requires `left.kind === 'call'`; pinned in `legacy-semantics.test.ts` "C-1 scope"). The former blind spot is closed too: the `not_applicable` pre-check now uses `hiddenReferences()`, which also counts a bare-ident equality RHS (`x == c`, `lookup(...) == c`, `x + 1 == c`) when it names a hidden symbol; `extractConditionSymbols` is unchanged (enum literals still excluded for the residual gate-symbol check). **Corpus fact (corrected at the Plan 2b close-out, 2026-09-17):** the earlier sentence "no enum value shares a field name" was FALSE. Re-measured on `scripts/reasoning-map/snapshot/encoding-snapshot.json` (2026-08-01 export): **59 (field, enum-value) pairs** collide with a field symbol of the same standard (44 distinct values), and **40 equality gates** in those standards compare against such a bare identifier (58 gates if any field symbol corpus-wide counts; the 2a re-review's own count was 61) — e.g. DWA-M-179-1 REQ-14 `IF treatment_method == sedimentation THEN …` while `sedimentation` is also a number field. This is the pre-existing legacy compare-node behaviour (the RHS resolves as a symbol whenever that field is valued → vacuous pass / pending instead of an enum comparison), unchanged by 2a and NOT fixed (enforcement-changing) — see S-2a-9. Re-executable count: the node one-liner recorded in `.superpowers/sdd/2026-09-16-guideline-to-tool-plan-2b-generic-editors/task-10-report.md` §"S-2a-9 measurement".

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-3 C-2 — `extractSymbols` ignores row-scoped identifiers (Task 2)

Identifiers inside the row-scoped arguments of `sum_rows/max_rows/min_rows/mean_rows/stdev_rows/median_rows/percentile_rows/count_rows` are column names, not collected; the register symbol is; `percentile_rows`' `p` argument IS walked. Consequence: a worksheet symbol read through the scope fallback inside a row expression (`limit` in `count_rows(samples, v <= limit)`) is invisible to the hidden-symbol N.A. check and to the residual gate-symbol check (rare by design; code comment).

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-4 `count_rows` — an undecidable row makes the whole count undecidable (Task 2 review)

Lenient: `null` + missing symbols (gate → `pending`); strict: recoverable `Fehlende Eingabe für count_rows(): <syms>`; condition and truthy-value paths identical; `count_rows` over 0 survivors is 0. Rule: pending never becomes fail (F-4 class). Cost: registers with optional cells make rolling-acceptance gates `pending` instead of counting the decidable rows — fail-safe.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-5 Strict-mode error semantics (Task 2 review minors 1, 2, 5, 7)

Finiteness checked on the FINAL result only (`arithmetic.ts:268` parity — `1/exp(1000)` = 0; an intermediate Infinity that cancels out is accepted, same as before); division by zero still throws at the op; a null operand throws recoverable `Operand ist keine Zahl: null`; `Bedingung als Zahl verwendet.` is NON-recoverable (`error`, not `manual_required`); `lookup()` without a table adapter in scope is NON-recoverable `lookup(): kein Tabellenzugriff im Scope.` (lenient: `pending` with an empty ledger). Deferred: non-finite intermediates reaching non-arithmetic sinks (`last_rows` count, `if()` truthy test, lookup key) are coerced rather than thrown.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-6 `canonicalFunctionName` widening reaches the normaliser and the gate (Tasks 3, 4, 4b)

`name(singleToken)` is no longer rewritten to `name_token` for any registry name, case-insensitively (`COUNT_ROWS(x)` is now rejected as a NAMED unsupported call instead of silently becoming the phantom `COUNT_ROWS_x`); `IF(` keyword form is accepted by the gate (`canonicalFunctionName('IF') === 'if'`); the gate's reason string changed from the fixed `(kein reiner Ausdruck)` to the offender list `(SUM, foo)` (nothing matched the old text). No stored formula uses a stringified `name_token` of a row/logic function.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-7 `percentile_rows` = R-7 / Excel `PERCENTILE.INC`; `median_rows` = R-7 at p=50 (Task 4b)

Rank = (n−1)·p/100 with linear interpolation; `p` evaluated in the OUTER scope, `0 ≤ p ≤ 100` else non-recoverable. A code default: a guideline naming nearest-rank / R-6 / `PERCENTILE.EXC` goes on the Plan 3 sheet, never silently substituted. Aggregates gained an optional filter argument (`(reg, expr[, cond])`, arity message now `2 oder 3`); `stdev_rows` with one survivor after a filter reports the ≥ 2 message without naming the filter.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-8 Plan-2a amendments A1–A4 to the register contract (Task 5)

A1 `ui_config.flags: [{key,label}]` + `registerFlagKeys(symbol, ui)` (explicit `flags: []` wins over the symbol fallback); A2 row-scope `visible_when` on a column: `fail` ⇒ the column is skipped by `isComplete` (a discriminator row is complete without its irrelevant columns; `pending` keeps the column required); A3 `grid` column type — plain-object carrier kept (arrays/strings → null), required grid complete when ≥ 1 cell, grid cells ride through `Value` by cast (Plan 2b may widen `RowValues`); A4 `surface_inventory.title` stays `'Flächenverzeichnis'`. Grid reducers (`grid_mean/grid_stdev/grid_count`) deferred to Plan 2b Task 9 — the risk register stays bespoke until then.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-9 A2 null row cell shadows a same-named worksheet symbol (Task 5 fix round 1)

`columnHiddenInRow` uses `s in values ? values[s] : ctx.symbol?.(s)` — a NULL cell never falls through to a worksheet symbol of the same name (the evaluator's own `readSymbol` rule). Plan 2b callers must pass a `ctx.symbol` that returns `undefined` for unknown names (a catch-all breaks `col == 'literal'` rules via the var-vs-var rule).

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-10 Legacy override-flag parity: only the FIRST `override.applies_to` column decides (Task 5 fix round 2)

`coeff_override` on legacy-shape replay compares `c_i` only (legacy `surface-inventory.ts:103`), passed as `opts.overrideAppliesTo`; filling of null cells from the table row still covers ALL bound columns. Differential test runs `normalizeSurfaceCarrier` vs `prepareRegisterRows` over legacy fixtures incl. a c_s-only-differs row (`false`) and a c_i-differs row (`true`). Cost if wrong: a legacy row with a deviating `c_s` is not flagged (same as today). Deferred: `overrideAppliesTo` fallback for multi-key registers.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-11 `PreparedRegister.diagnostics` — non-recoverable derived-column errors surface instead of silent null (Task 5 fix round 2)

Recoverable `ExprError` (missing input, no lookup row) → null cell, silent; non-recoverable or any other error → null cell AND `<column>: <message>` in `diagnostics`; the save path emits `Register: <column>: <message>` warnings (deduped). Deferred: diagnostics repeat per row (dedupe / "(rows: N)" for Plan 2b display); a caller omitting `ctx.table` gets one diagnostic per row (intended, noisy).

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-12 Tasks 6 + 7 as ONE unit; `formula.test.ts` pins updated with `// Plan 2a:` notes (Task 6 ruling B/2)

Deleting the six aggregators reds five hook/report/snapshot pins, so both tasks landed in `402d487`. Pin text changed (numbers untouched: 4826.43 / 380 / 180 / 360 / 90 / 60 / 0.9 / 5362.7): the `substituted['Σ befestigt' | 'Σ unbefestigt']` keys are gone (register formulas expose no Σ-keys in `substituted`; `expect(r.substituted).toEqual({})` + the bridge `from` pin), and the empty-carrier message pin moved from `/Keine Flächen/` (the retired aggregator's text) to `/Keine vollständigen Zeilen in "surface_inventory"/` (the row function's) — Task 6 concern 3 asked you to confirm this second artefact.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-13 Bridge `from` = the captured prod formula text per id; migration overwrites `C_m = A_C / A_E` (Task 6 rulings 3, 4; concern 2)

`A138_07_PRIOR_FORMULAS` holds the six prior strings captured READ-ONLY from prod 2026-09-16T23:23:45Z (`node scripts/verification/prod-query.mjs`, main checkout; verbatim in the rollback SQL, no UNVERIFIED marker). Gl. 2c was never Σ-notation in prod — its stored text is `C_m = A_C / A_E`; the migration replaces it with `C_m = sum_rows(surface_inventory, area_m2 * c_i) / sum_rows(surface_inventory, area_m2)` (same value — Σ over complete rows), so the printed "source formula" line changes. **Your call:** whether Gl. 2c's `clause_reference` needs a note. The engine card shows the register formula as `formulaEvaluated`; the source line shows the DB text; the rewrite badge disappears once the migration is applied (`formula.ts` skips a bridge whose `to` equals the stored formula, whitespace-insensitive).

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-14 `standardCode` optional on the hook/report/snapshot; standard-less table resolution only for a UNIQUE table code (Task 7)

The brief said required; ~22 direct hook callers in tests and ruling 2 (tests unchanged) made it optional. Without a code, `findTableByCode` resolves only when exactly ONE standard registers that code (latest edition), else `undefined` → `manual_required`; it never guesses a standard. Production callers all pass the code. Exposure: a test/legacy caller that succeeds today flips to `manual_required` the day a second standard registers `TAB9`.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-15 PDF assembler evaluates register-fed equations (Task 6+7 review, "fix not backlog")

`assemble-standard-report.ts` had an `evaluateFormula` call without registers/table/fallback equations — the VSME-B04 PDF would have shown `manual_required` after the seed migration. Threaded through `buildRegisters` + `withFallbackRegisterEquations`; `PDF_138_FROZEN_GATE` untouched (A138-07 producers stay `evalState: null` on the 138 PDF). The `buildRegisters` helper (`register-rows.ts`) is the ONE builder for hook/report/snapshot/assembler/materialiser.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-16 `a138-verify` harness totals 37/8/1 → 36/9/1 (Task 8 ruling, concern 1)

C_m left the scalar form `A_C / A_E` (computed by the pure-arithmetic harness) for its register form (`manual_required` by construction in `runEq`, which never feeds a register). The six A138-07 rows are asserted `manual_required`; the harness ran 38/38 on embedded PG. Harness classification only — no value change. Two-line revert if you prefer C_m scalar in the harness.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-17 Materialiser dedupe: ONE write per output field, FIRST equation in list order wins (Task 8 fix round 1)

DB rows in loaded order, fallback rows appended LAST (`withFallbackRegisterEquations`), so a DB equation beats a fallback for the same output; without it the `INSERT … ON CONFLICT DO UPDATE` would hit the same `(project_id, field_id)` twice and Postgres would roll the whole save back. Deferred: a null-evaluating first duplicate shadows a computing later one; the docblock's "first in list order" means first register-fed non-displayOnly.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-18 Materialiser trigger + absent register (Task 8)

The generic block fires when ANY register field of the template is in the saved batch (`registerFieldIds ∩ fieldIds`, minus rejected ids) — the old blocks fired on their one literal symbol. An absent carrier yields `{}` → `rows = []` → `manual_required` → null (clears stale outputs); `templateFields` is loaded once per non-empty save (was a `limit(1)` probe per block). The `materialize-registry.ts` `surface` entry became `register` with `ownerTrigger: () => false`.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-19 hidden ⇒ null on EVERY equation path, server and client (Task 10 ruling on concern 1)

Spec §6 says hidden ⇒ null for the ENGINE and gates; the first cut only nulled in the client hook. Fix round 1 routes `evaluateWorksheetEquations` (report), `buildSnapshotPayload`, `assemble-standard-report.ts`, `materializeDerivedOutputs` and every client special path (registers json source, KOSTRA, Gl.8/Gl.10 scalars, flood carrier, `r_D_30`) through `withHidden`. Pinned RED→GREEN by `src/lib/eval/__tests__/hidden-symbols-server.test.ts` (5 of 7 failed before) and `engine-hidden-symbols.test.tsx`. Not covered: S-2a-4.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-20 A hidden register-fed equation's output is still WRITTEN, as null (Task 10 materialiser ruling)

Hidden register ⇒ `{}` ⇒ no rows ⇒ `manual_required` ⇒ `null` write — clears the stale value, consistent with the engine's clear-on-non-computed. Alternative would be to skip the write and leave the previous value standing. Cost if wrong: none (null is the fail-safe).

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-21 Approval gate: a hidden REQUIRED field is skipped in the missing-required check (Task 10)

`checkApprovalGate` computes visibility over the same gate lookup; a hidden `is_required` field no longer blocks approval (it cannot be filled in; otherwise approval would block forever). `not_applicable` results never block (only `fail`, unchanged). This is an enforcement relaxation for hidden fields only — mandated by the mechanism, listed so it is not discovered later.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-22 Dedicated editors honour `hiddenFieldIds`; symbol lookup null semantics (Task 10 fix round 1)

Rainfall tables/selector, surface inventory, risk register, mitigation plan, selection fields and pollutant register are gated on `!visibility.hiddenFieldIds.has(f.id)` (they bypassed the grid). `makeSymbolLookup` returns `undefined` for known-but-null (aligned with the server); `effectiveVisibleWhen` treats `''`/whitespace as null. The DSL still treats a bare `null` store value as present-but-null so `IS NOT NULL` fails for it — the guard that makes "method unset ⇒ hidden" hold (pinned by the SQL method matrix).

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-23 PDF assembler: standard-wide `resolvedBySymbol` vs per-template `hiddenSymbols` (Task 10 fix round 1)

A symbol hidden on THIS worksheet reads as no value for THIS worksheet's equations only; the same symbol resolved for another template on the same PDF is untouched. Deferred: PDF field tables still print a hidden field's stored value (Task 11 candidate, not done); a hidden output field keeps its stored number on the form.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-24 Task 10b in scope as a `[CODE]` fix (Task 10b ruling)

The prod submit hang (S-2a-2) was pre-existing on main and outside the plan; ruled in scope because the owner's A138 retest depends on it, one extra review cycle. `DrizzleClient` type hoisted to `db/queries/worksheet.ts` (Task 11 amendment); sequential loads on `dbi` in both tx and non-tx paths.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-25 Task 3's forced one-liners and Task 11's wording (Tasks 3, 11)

Widening `EvalResult` with `not_applicable` forced two edits outside Task 3's file list (`compliance-block.tsx` counts seed; `pdf/sections/compliance.tsx` verdict case) for `tsc`; Task 11 completed every consumer with `default: never` guards (StatusBadge, payload verdict, PDF `renderVerdict`, `badgeFor`) and `snapshot-diff.tsx` (found by tsc, not in the brief). Wording decisions are in S-2a-6.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-25a Corpus-differential residuals after the fix wave (2026-09-17) — for the record

The `scripts/reasoning-map/` scorecards are regenerated by the full test run and, since the fix wave, **committed** (they are the corpus differential's ledger). Against `da79b99` the residual deltas are: (i) **DWA-M-277E REQ-04/REQ-05** (`Q_SW = SUM(Q_SW_P_i * P_i) + …`, `Q_GW = SUM(Q_GW_P_i * P_i)`) move `dead-prose → field-missing` in `gate-decisions.json` / `gate-health-scorecard.md` — `extractConditionSymbols` now returns a symbol set for them because `SUM(...)` parses as a call (unsupported → still `manual` at evaluation; the gate is as dead as before, only classified more precisely); (ii) **DWA-M-102-4 B.6** newly COMPUTES (`if(...)` is now a supported call; 24 → 25 computed, intended by Task 4); (iii) reason-text wording for formulas that were already `error` (DWA-M-708 E-CH4-Heizwert, DWA-M-732 Gl-M732-03 — the unified tokenizer reports a different first offence); (iv) the 96 eligibility changes from Task 4 (supported math calls now eligible; `SUM` still rejected). One more, to ratify: **DWA-A-262E eq. 15** (`A_ANF = 2 * h_zu * (…) / (k_fB * (h_zu^2 - h_ab^2))  (m^2)`) reads `error` instead of `manual_required` — the legacy `manual` was a TESTVAL artefact (all inputs = 2 ⇒ `h_zu² − h_ab² = 0` ⇒ "Division durch Null" raised while evaluating, before the trailing `(m^2)` was reached); with any real `h_zu ≠ h_ab` the legacy engine also returned "Unerwartetes Token am Ende" = `error`. The stray unit suffix is a source-encoding defect of that row, not an engine regression. The 21 `manual_required → error` flips (DWA-M-816 ×19, DWA-A-272E RULE-11, DWA-M-1200-1 EQ-001) are fixed in `789bf58` (legacy-order parse-failure triage). **Corrected at the Plan 2b close-out:** the differential's residual list was built under the assumption that bare-identifier equality RHS values are enum literals; that assumption does not hold corpus-wide (59 enum/field-name collisions, see L-2 and S-2a-9) — the legacy and the unified evaluator agree on those gates (both resolve the RHS as a symbol when valued), so the differential is unaffected, but the gates themselves are mis-encoded and remain so.

☐ RATIFIED  ☐ REJECTED  ☐ DEFER

### L-26 Process rulings with no behaviour effect — recorded, no signature needed

Implementers serial / reviewers parallel; Fable-only subagents until the weekly limit, then Opus 5 (header); Task 4b inserted after Task 4; Plans 2b and 3 drafted mid-2a and committed with the plan text (`305a0e6`, `4998234`); `scripts/reasoning-map/` scorecards regenerated by every full test run and — until the fix wave — restored before staging (committed since `L-25a`); `e`/`pi` constants live in the `arithmetic.ts` adapter (field of that name wins), not the expr core; dead `IF`/`If` branch removed; dollar-quoted SQL literals so formulas are byte-identical to the TS registries (pins assert verbatim containment).

---

## Deferred minors (backlog — no ruling needed unless you disagree with "later")

From the ledger's `Minor (deferred)` lines, so nothing in it is unmapped: parser tests lack direct `IS EMPTY` / `NOT (…)` cases; `if()` ledger wording; `count_rows` strict message joins the whole `ctx.missing`; `Math.max` spread; `evaluate.ts` ~660 lines (split `evalCall`); stale doc headers in `arithmetic.ts:22-26` / `evaluate.ts:19-24` kept verbatim by plan (this pass left them — the "since Plan 2a" pointer lines are the fix); `e`/`pi` `values.has` vs `!== undefined` edge; mixed CRLF in working-tree copies (cosmetic, committed content LF); `legacy_map` not bound to a specific `lookup_key`; `lookup_value` string coercion; per-row re-parse of `visible_when`; fallback precedence + arity tests; `orphanEngineEquations` iterates the DB list (a fallback equation without a visible output field gets no card); registers memo re-prepares on every store write (O(rows) per keystroke); hook reason text for `{type:'json', value:null}` now "Fehlende oder leere Eingaben: surface_inventory"; `page.tsx:196` seeds null json unguarded; assembler registers are per-template only; `symbolLookup` known-but-null → `undefined` alignment done; double dedupe layers in the materialiser; rollback header sentence; Set identity churn in visibility memos; report path own-template params only (pre-existing); `SURFACE_DERIVED_SYMBOLS` is a hand-written literal guarded by a test rather than derived from `rewrites.ts` (tuple type + client-bundle hygiene); `register` registry entry names only the two known carrier symbols in `inputSymbols`; VSME `pollutant_register` save path not driven on embedded PG ("expected to run"); exact 8-query order pin in `capture-tx.test.ts` relaxed to a set.

---

## Ready for your 5-minute look — on a deploy containing `9b0e1bd`

No campaign deploy was made by Plan 2a (docs-only close-out; the deploying session names the alias from raw `vercel` output — none is invented here). On the first build that contains this branch, with NONE of the three migrations applied:

1. **A138-07 (Flächenverzeichnis)** — the six engine cards (A_C, C_m, A_E_ba, A_E_nba, A_C_sealed, A_C_unsealed) show the `sum_rows(...)` formula as the evaluated formula WITH the rewrite badge (reason "Σ über Flächenverzeichnis-Zeilen als Zeilenfunktion sum_rows() (Plan 2a) …"); the numbers equal the pre-2a values on the same rows (PLT-HS-01 baseline: A_C 4826.43, C_m 0.9). After applying `20260916100000` the badge disappears and the numbers do not move.
2. **A138-07 save → A138-10** — save the carrier; the consumer worksheet shows the six values as `derived` (no "fehlend"); clear the carrier and save; the six go empty (null), not stale.
3. **A138-12 (ASM)** — switch `a_s_m_determination_method`: `soil_estimate` shows only `soil_bodenart_tab13`, `manual` shows only `a_s_m_provenance`, `direct`/`geometry`/unset hide both — identical to before. NEW: any CR that mentions a hidden one of these two shows `–` (aria "Nicht anwendbar") and the compliance header carries `– N n.a.`; the pass count is lower by N (S-2a-5).
4. **A hidden-symbol gate** — on the same worksheet, the `–` badge has no "Warum?" link; approval is not blocked by it.
5. **Submit for review** (any worksheet, the A138 test project) — the transition returns instead of hanging (S-2a-2 deployed proof). If it still hangs, the fix is not the cause you saw; report the DB `idle in transaction` state.
6. **VSME-B04.100** — with the "Keine meldepflichtigen Schadstoffe" flag set, the three medium sums read 0; with rows, the sums; the engine cards for the three sums exist (fallback equations) and show no rewrite badge. The snapshot diff after the first save shows three new `equationOutputs` entries (D-5 residue).
7. **PDF (Prüfmemo)** for a worksheet with an N.A. gate — the Prüfergebnis line ends with `· N n.a. (ausgeblendetes Feld)`; for a worksheet without, the text is byte-identical to before.
