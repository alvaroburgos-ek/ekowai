# SDD Progress — E1 Engine Generalization

Scope: vault 01-Projects/ekowai-wizard/2026-07-10-E1-engine-generalization-scope.md (APPROVED 2026-07-10, D1–D4 settled)
Branch: feat/engine-generalization-e1 (worktree _wt-engine-gen); backup of pre-reconcile tip = backup/engine-gen-pre-e1 (22c472c)
Base: main 0aaed2e (post-B2). Prior Layer-0 branch feat/engine-generalization forked from 9fe3341 (pre-B2).
Test runner: _wt-engine-gen has a store-locked tsc/vitest (EPERM) → run via a throwaway branch in _wt-a138-asm's isolated store (.pnpm-store-138test).

STANDING RULE: update this ledger at EVERY task transition (recovery lifeline).

- **E1-0 (reconcile) — COMPLETE 2026-07-10.** Reconciled feat/engine-generalization (route-all-minus-deny-set + multi-producer collision guard + naive-sum retirement + whitelist deletion) onto post-B2 main. Commit **51a4a17** (pushed origin). Mechanism: single-resolution squash (interactive rebase unavailable in-env; net code identical to a 6-commit replay). Conflicts: 10-file surface auto-merged to 3 (modify/delete on engine-whitelist.ts + whitelist.ts + engine-whitelist.test.ts) → honored branch delete. New-on-main consumers of the removed `engineWhitelist` API updated (branch never saw them): suppress-write-back, a138-infiltration, a138-10-auto-qzu, engine-wiring-A138-13-2d, engine-wiring-A138-13-multitable.
  VERIFY: tsc 28=28 (0 new, none whitelist-related); full unit suite **1046/1046** (107 files) — branch deny-set tests + all B2 tests green together.
  D2 RIDER — 3 B2 invariants re-traced vs reconciled code: **#18** worksheet.ts byte-identical to main → intact; **#21** materialize-registry.ts byte-identical → intact; **#20** asm-source.ts identical + hook carries route-all AND suppressWriteBackSymbols + worksheet-form wires asmMethod→suppression → composed correctly. Branch touches ONLY client engine gate + PDF/snapshot gates; all server/registry invariant files untouched.
  NOTES for E1-A: (1) route-all evaluates MORE 138 client equations than the old whitelist — A_S_m Gl.16 (A138-17) was already whitelisted so no NEW behavior; A138-17 A_S_m client-eval remains the parked #22 dual-role, NOT a #20 regression. (2) PDF keeps `PDF_ENGINE_WHITELIST` as a deliberate 138-conservative gate ("138 PDF unchanged") — a THIRD whitelist-shaped construct, E1-A consolidation candidate. (3) deny-set seed (equation-manual-denylist.ts) carries the faithfulness-scan candidates; the D1 CONDITION (encode-time symbol-resolution+parse gate, blocking) is E1-A build work, not yet present.
  <-- STOP here per user: reconcile report delivered, await go before E1-A.
- **E1-A — IN PROGRESS.**
  ### Rider 1 (VERIFIED): newly client-evaluated equations under route-all vs old client whitelist (whitelist.ts) — #20 check
  Old CLIENT whitelist (whitelist.ts) had 24 keys; it LACKED all of A138-19/20/21/22/26 + A138-13:1, 16:13, 18:24/25. Those newly evaluate client-side under route-all. Deny-set (138): A138-18:18 only. For each newly-eval eq: does its output symbol get server-materialized TO THE SAME worksheet (the #20 write-back-loop shape)?

  | key | output | #20 shape? | disposition |
  |---|---|---|---|
  | A138-13:1 | M | no | benign (facility-local) |
  | A138-16:13 | (condition) | no (no write-back) | benign |
  | A138-18:24 | q_VS | no | benign |
  | A138-18:25 | (condition) | no | benign |
  | A138-19:26/28 | V_MR | no | collision-guard pair (one displayOnly) |
  | A138-19:27 | V_R | overload w/ A138-18 (gap-9) | §10c/E1-C, not #20 |
  | A138-19:29, 20:32 | L_R | overload | §10c/E1-C |
  | A138-20:30 | V_MUE | no | benign |
  | A138-20:31 | Q_MUE | no | benign |
  | A138-20:33 | Q_Dr | cross-ws producer (basin input), NOT server-materialized to A138-20 | benign for #20; note cross-ws |
  | A138-21:34 | A_S | A_S≡A_S_m single-source for ponding (gap-9); Schacht-local here | §10c/E1-C + single-source note, not #20 |
  | A138-21:35/36 | V_S | no | collision-guard pair |
  | A138-21:37/40 | h_S | no | collision-guard pair |
  | A138-21:38 | (condition) | no | benign |
  | A138-21:39 | erf_k_f_FS | no | benign |
  | A138-22:41 | V_VA | **overload w/ basin A138-13 V_VA (server-materialized), but on A138-22 (Becken), different worksheet** | §10c/E1-C (gap-9 overload), NOT a same-ws #20 loop |
  | A138-26:10 | V_Rueck | no | benign |

  **VERIFIED CONCLUSION (converts note 1 asserted→verified):** NO newly-eval equation writes a server-materialized symbol (A_C, A_S_m, ac_as_ratio*, basin V_VA/r_D_n/D_min) to the SAME worksheet that server-materializes it — those live on A138-07/12/13 and no newly-eval eq is on them. The only server-symbol overlaps (V_VA@A138-22, A_S@A138-21, V_R/L_R@A138-19/20) are cross-worksheet OVERLOADS (gap-class 9 / §10c) → E1-C scope, NOT #20 write-back loops. Same-worksheet duplicate producers (V_M, V_R, V_S, h_S, V_MR pairs) are handled by the branch's multi-producer collision guard (one of each pair is displayOnly). A_S_m (the one real conditional-owner) was ALREADY client-whitelisted (17:16/12:7) → unchanged. **No newly-eval eq needs new suppression or a new deny-set entry for #20 reasons.**

  ### Rider 2 (DONE): PDF_ENGINE_WHITELIST → PDF_138_FROZEN_GATE
  Renamed + design note (WHY frozen = Step-6.3 acceptance; WHEN dies = backlog "retire PDF 138 gate" at end E1-D / 138 Phase 4, re-verify PLT-HS-01 PDF vs Step-6.3 baseline). Commit 50fae5f. Two-class-split design note added to scope doc §3a.

  ### Faithfulness gate (D1) — VALIDATOR BUILT + DEMONSTRATED; blocking enforcement RE-SCOPED
  - `validateEngineEligibility(formula, inputSymbols, knownFieldSymbols)` — class (i) parse + symbol-resolution. TDD RED (12a1833, module-missing) → GREEN (a17f31c). src/lib/eval/engine-eligibility.ts + test. Reserved: pi/e + numeric literals; rejects surviving fn/aggregate calls (SUM) + any input symbol resolving to no active field (exact case, post fn(x)->fn_x normalize).
  - **DEMO on REAL DWA-A-138-1 encodings (commit c7ee4fd, 8/8 green):** A138-18:22 (s_R) was HUMAN-WHITELISTED yet references bare `d` (fields are d_a/d_i) → CAUGHT, unresolved=[d]; A138-26:10 (V_Rueck) SUM() + A_E_b_a (field is A_E_ba) → NOT verified; A138-10:3 (Q_zu) faithful → verified (no over-reject). Gate catches a mis-encoding the OLD manual whitelist trusted.
  - **BLOCKING enforcement — naive runtime wiring PROVEN WRONG, reverted.** Wired the gate into `engineEquationIds` (be88b80): full suite → **25 fails**. Cause: the gate false-rejects AGGREGATOR equations (A138-07 A_C surface, A138-13 Gl.8 basin, A138-26 Gl.10 flood) whose input_symbols legitimately DON'T resolve as plain fields — they read carriers (surface_inventory / KOSTRA) via special aggregator paths (`consumedSymbolsFor`). Reverted to c7ee4fd (1054/1054 green). **CONCLUSION: enforcement belongs at ENCODE TIME (importer `_pass3c-validate.ts`) per D1 — a structural check over the standard's fields, exempting the 3 aggregator equation classes, producing a computed deny-set / flag — NOT naive runtime exclusion.** This is the remaining E1-A step to make the gate blocking end-to-end.
  ### ENCODE-TIME BLOCKING ENFORCEMENT — DONE (deny-set SSOT), E1-A COMPLETE
  Second runtime-wiring attempt (structural carrier-diff exemption) → 8 fails (min() parse-reject + surface diff-empty edge). Confirmed: enforce at ENCODE TIME.
  FINAL ARCHITECTURE (deny-set = single SSOT):
  - `computeEngineDenyKeys(equations, fieldSymbols)` (equation-manual-denylist.ts) — encode-time class-(i) gate. STRUCTURAL carrier exemption (formula has Σ/SUM → carrier-internal, aggregator-handled; future FLL aggregators exempt by same rule). Enforces SYMBOL-RESOLUTION only (silent-wrong-preventing); parse constructs (min()) route via engine paths + fail-safe. TDD: over real 138 shapes → yields EXACTLY ['A138-18:22'].
  - `EQUATION_GATE_DENYLIST` (class i) ∪ `EQUATION_MANUAL_DENYLIST` (class ii) → `EQUATION_DENYLIST`; `shouldEngineEvaluate` honors it = SINGLE SSOT. A138-18:22 materialized (gate-fed).
  - Importer wired: `computeWorkbookGateDenyKeys` (scripts/_pass3c-validate.ts, non-blocking).
  - BLOCKING END-TO-END DEMONSTRATED (real standard): engine-gate-blocking.demo.test.tsx — production hook excludes A138-18:22 (bare `d`) from route-all; faithful + carrier-aggregator routed. + compute-engine-deny-keys.test.ts.
  VERIFY: tsc 28=28 (0 new, none in gate files); full suite **1058/1058**.
  DISPOSITION (proposed, not applied): **A138-18:22 (bare `d`)** → FIX at source — equations-text migration `d`→ d_a OR d_i, REQUIRES source-verify §6.4.2 (which diameter the s_R pipe cross-section uses); written-not-applied; sits in deny-set until applied. **A138-26:10 `A_E_b_a`** → NOT a gate catch (SUM aggregate-exempt); `A_E_b_a` is a per-subarea carrier-row symbol in the Gl.10 flood aggregator, DISTINCT from the `A_E_ba` aggregate-output field → NOT a typo, no fix (documented to avoid re-diagnosis).
  <-- STOP: E1-A close-out report for user before E1-B.
- **E1-B (registry/dispatch hardening + CI tests) — COMPLETE 2026-07-13.**
  Acceptance bar met:
  (a) THREE invariants CI-encoded (reproduction-grade):
    - **#21** ownerTrigger ⊆ owner-dispatch — NEW src/lib/actions/__tests__/dispatch-routing-matrix.test.ts (structural invariant + routing matrix). PROVEN against the historical bug: reverting the #21 fix (widen asm ownerTrigger → Gl.7|16|17) makes 3 tests FAIL (invariant + A138-17/A138-18 geometry routes-to-no-path); restored → 9/9 green.
    - **#20** conditional-owner suppression — asm-source.test.ts:79/84 (geometry + soil_estimate → A_S_m suppressed; pre-#20-fix 'manual'-only would fail these).
    - **#18** post-validation full field-map reads — worksheet-asm-manual-reject.test.ts:98 (batch-restricted symbolById → strip no-ops → false pass; full-sibling-map = fix).
  (b) Dispatch-level routing matrix: owner/producer routing for loading/basin/asm/surface × save origins (A138-12 Gl.7, A138-13 Gl.8, A138-17/18 geometry, A138-15 facility, A138-06 flaechengruppe) — each runs on exactly one path, never both, never none.
  (c) full suite **1067/1067**; tsc 28=28 (0 new, none in E1-B files).
  SIDE-TASK (A138-18:22 fix, non-blocking): source-verified §6.4.2 — Gl.(21) uses d_i AND d_a; Gl.(22) thin-wall defines **d = d_i ≈ d_a** (verbatim source line 1836). READING: fix `d` → `d_i`. AWAITING user confirm → then equations-text migration (written-not-applied); A138-18:22 stays in gate deny-set until applied.
- E1-B (registry/dispatch hardening + CI integration tests): DONE (above).
- **E1-C (standard-agnostic symbol scoping §10c) — IN PROGRESS.**
  ### (a) AUDIT — by-symbol lookup sites (the §10c audit trigger)
  Server-side `eq/inArray(fields.symbol, …)` lookups NOT scoped to the current standard (project-wide first-wins → cross-guideline collision when a 2nd standard reuses A_C/V_VA/D/Q_S). Sites in src/lib/actions/worksheet.ts:
  - 573 surface_inventory (owner) · 652 r_D_n_table (basin carrier) · 701 BASIN_LOOKUP_SYMBOLS (basin scalars — §10c named instance) · 890 A_C (asm owner) · 929 facility_type_selected (asm owner) · 1109/1285/1761/1924 LOADING_CHECK_CROSS_SYMBOLS (loading owner/producer/clear/chained) · 1436 facility_type_selected (asm producer) · 1466 r_D_n_table (mulde sweep) · 1517 MULDE_SCALAR_SYMS (A_C/h_M/f_Z/k_i) · 1584 RIGOLE_SYMS · 1671 A_C (asm producer)
  Also: src/lib/db/queries/worksheet.ts:238 (inArray symbols), :386 surface_inventory; src/lib/actions/co2.ts:63 (VSME OUTPUT_SYMBOLS).
  All resolve fields by symbol across ALL standards, then read project_parameters by field id (project-scoped). Safe TODAY only because 138 symbols are unique; FLL (or any 2nd standard reusing a symbol) collides. Rider-1 overlaps (V_VA@A138-22 vs basin, A_S@A138-21) are WITHIN-138 (gap-9); the cross-STANDARD case is the FLL trigger.
  FIX APPROACH: scope each lookup to the saved standard's worksheet set (join fields→worksheet_templates→standard_id = savedStandardId) via a shared scoped-resolver; reproduction test (two standards sharing A_C → resolves CURRENT; fails on first-wins).
  ### (b) MECHANISM + REPRODUCTION — DONE
  - `scopeFieldsToStandard(candidates, currentStandardId)` (src/lib/db/queries/symbol-scoping.ts) — the single tested chokepoint every by-symbol resolver routes through; filters candidates to the current standard BEFORE any first-wins reduction.
  - Reproduction test (src/lib/db/queries/__tests__/symbol-scoping.test.ts, 3/3): two standards share A_C → scoped resolves the CURRENT (138) field; PRE-FIX first-wins resolves the FOREIGN (FLL) field (the collision); no cross-standard fallback. Same reproduction style as E1-B.
  - Full suite 1070/1070; savedStandardId available function-wide (worksheet.ts:155).
  ### (a) SITE APPLICATION — REMAINING (the 15 lookup sites)
  Each site: add innerJoin worksheet_templates + `eq(worksheetTemplates.standardId, savedStandardId)` (or route candidates through scopeFieldsToStandard). BEHAVIOR-PRESERVING for single-standard 138 (savedStandardId=138 → scoping is a no-op since 138 symbols are unique) → suite stays green; CORRECT for multi-standard (FLL). Low-risk but 15 careful save-path edits — recommended as a focused pass with per-site + full-suite validation, NOT rushed.
  <-- STATUS: E1-C audit + mechanism + reproduction DONE + pushed (foundation banked). Site application = remaining, deferred to a fresh focused session.
  ### NEXT SESSION — the 15-site scoping pass (user riders, binding):
  1. CLUSTER BY MATERIALIZE BLOCK — group the 15 sites into clusters (asm owner / asm producer / basin / loading / carriers / db-queries / co2) and go cluster by cluster. Full suite GREEN between clusters. ONE COMMIT PER CLUSTER (so any regression bisects to a cluster instantly). NOT one big diff.
  2. VERIFY (not assume) the behavior-preserving claim: after all sites scoped, proof = full suite green PLUS a TARGETED check that a representative 138 save (A138-12 or A138-13) produces BYTE-IDENTICAL materialize reads pre/post scoping — the no-op-for-138 property DEMONSTRATED, not asserted.
  3. E1-C CLOSES ONLY when all 15 sites scoped AND the close-out report shows the site checklist with EACH ONE's commit. Remains the MANDATORY-BEFORE-FLL gate.
  Sites to scope (from the (a) audit above): worksheet.ts 573/652/701/890/929/1109/1285/1436/1466/1517/1584/1671/1761/1924; db/queries/worksheet.ts 238/386; co2.ts 63. Chokepoint helper ready: scopeFieldsToStandard (src/lib/db/queries/symbol-scoping.ts). savedStandardId available @ worksheet.ts:155.

  ### E1-C — COMPLETE 2026-07-13. Cluster-by-cluster, one commit each, suite green between.
  SITE CHECKLIST (each → commit):
  | site | symbol(s) | cluster | commit | disposition |
  |---|---|---|---|---|
  | worksheet.ts 890 | A_C | asm owner | d049d1d | scoped |
  | worksheet.ts 929 | facility_type_selected | asm owner | d049d1d | scoped |
  | worksheet.ts 1448 | facility_type_selected | asm producer | 0fdb4bc | scoped |
  | worksheet.ts 1478 | r_D_n_table | asm producer | 0fdb4bc | scoped |
  | worksheet.ts 1529 | MULDE_SCALAR_SYMS | asm producer | 0fdb4bc | scoped |
  | worksheet.ts 1596 | RIGOLE_SYMS | asm producer | 0fdb4bc | scoped |
  | worksheet.ts 1683 | A_C | asm producer | 0fdb4bc | scoped |
  | worksheet.ts 652 | r_D_n_table | basin | 869a6ae | scoped |
  | worksheet.ts 701 | BASIN_LOOKUP_SYMBOLS | basin | 869a6ae | scoped |
  | worksheet.ts 1121 | LOADING_CHECK_CROSS_SYMBOLS | loading owner | 7244ab8 | scoped |
  | worksheet.ts 1297 | LOADING_CHECK_CROSS_SYMBOLS | loading producer | 7244ab8 | scoped |
  | worksheet.ts 1806 | LOADING_CHECK_CROSS_SYMBOLS | loading clear | 7244ab8 | scoped |
  | worksheet.ts 1969 | LOADING_CHECK_CROSS_SYMBOLS | loading chained | 7244ab8 | scoped |
  | db/queries/worksheet.ts 238 | (many) loadSameSymbolValues | render resolver | 9c214d8 | current-standard-first tiebreak (NOT join-scope; preserves parent/child inheritance) |
  | worksheet.ts 573 | surface_inventory | carrier owner | — | ALREADY scoped (worksheetTemplateId) — false positive |
  | db/queries/worksheet.ts 386 | surface_inventory | carrier read | — | ALREADY scoped (standardId) — false positive |
  | co2.ts 63 | VSME OUTPUT_SYMBOLS | co2 | — | ALREADY scoped (standards.code='VSME') — false positive |
  RIDER-2 PROOF (no-op-for-138 DEMONSTRATED, not asserted): PLT-HS-01 is MULTI-standard (138 + M-1200-1 + M-820-1 + VSME). (1) zero foreign-standard params share a symbol with the 138 materialize reads → scoping cannot change any resolved value; (2) representative A138-13 basin: all 9 BASIN_LOOKUP scalars resolve IDENTICAL unscoped vs scoped (A_C 4836,43 / Q_S 0,003591 / f_Z 1,2 / … all identical=true). Full suite 1073/1073; tsc 28=28 (0 new).
  <-- E1-C CLOSED. Mandatory-before-FLL gate satisfied: no server-side by-symbol read can leak a foreign guideline's field.
- SESSION SEQUENCE AFTER THIS: (1) 15-site scoping pass → close E1-C · (2) E1-D short backlog (#17 derived→derived cascade, non-turnover flag generalization, r_D_n/D_min provenance; #22 cross-worksheet + governingD DEFERRED) · (3) FLL-GAR bring-up (E1 exit criterion: zero engine changes).
- **E1-D (short backlog) — COMPLETE 2026-07-13.** Three small items, each with its own test, cluster-per-item commit, suite green.
  - **Item 1 — r_D_n/D_min provenance (gap-class 6 inverse):** DB scan found the real bug on A138-10 (r_D_n/D_min persisted `entered`; A138-13's are `derived`). A138-10 inherits them but no equation produces them → general write (worksheet.ts:292) stamped `entered`. Fix: `derivedOutputSymbols(equations, extraDerivedSymbols)` param + wire `BASIN_GOVERNING_SYMBOLS` at the call site → r_D_n/D_min stamped `derived`. TDD (derived-output-symbols.test.ts). OPTIONAL follow-up: backfill the 2 stale A138-10 `entered` rows (self-heal on next save).
  - **Item 2 — non-turnover flag generalization (gap-class 8):** shared `boundaryLimitedWarning(governingD, midClause?)` in governing-duration.ts; basin adopts it BYTE-IDENTICAL (governing-duration.test.ts). SCOPE-DISCIPLINE: surfacing it into the Mulde/geometry SAVE path is save-path warning result-flow plumbing (growth point) → DEFERRED; helper is ready for any facility.
  - **Item 3 — #17 derived→derived cascade:** ASSESSED (not assumed) → NO engine change needed. The write-back effect (use-equation-engine.ts:541) persists a produced symbol to the store; a dependent equation reads it next render → same-worksheet cascade CONVERGES (proven: engine-derived-cascade.test.tsx, out_B consumes out_A → converges). FLL Delta_u→Gl.2b will converge like A_S_m→Tab.6. Did NOT touch the eval loop/dispatch (per the risk flag). g_prime two-producer = separate conditional-owner class, deferred with #22.
  - VERIFY: full suite **1078/1078**; tsc 28=28 (0 new). #22 cross-worksheet + governingD stay deferred as decided.
- E1 STATUS: E1-0 ✓ · E1-A ✓ · E1-B ✓ · E1-C ✓ · E1-D ✓. FLL gate open.
- **FLL-GAR bring-up — plan: vault 2026-07-13-FLL-GAR-bringup-plan.md (approved, profile route for Gl.2b).**
  - CONFIG DONE: FLL-GAR-22:2b (c7dc584b) marked `displayOnly` (equation-profiles) — inequality, not g_prime producer; Gl.2a sole producer. Guard test fll-gar-22-2b-displayonly.test.tsx (RED without config → g_prime blanked by collision; GREEN with). Pattern logged: defect register ES-1 "inequality encoded as equation-producer" (standard-agnostic scan trigger for the §10e audit). tsc 28=28; suite 1080/1080.
  - DEPLOYMENT GATE (before live browser bring-up): the live bring-up needs the E1 branch RUNNING against the FLL DB. E1 (route-all + deny-set + scoping + displayOnly) is NOT on prod (prod = B2/main). Options: (a) preview-deploy feat/engine-generalization-e1 → validate FLL on preview BEFORE the big E1 prod merge (RECOMMENDED — validate then merge); (b) merge E1 to main + deploy prod first. Awaiting user's env decision.
  - PREVIEW DEPLOYED 2026-07-13: build ld10kk6av (dpl_EtPjBxFVaTwEK3CRwtKQLQHPEKVe, target=PREVIEW not prod, READY) from E1 tip 5df8961 (clean-tree deploy from _wt-engine-gen; Vercel attached no git SHA for CLI-from-worktree, provenance = clean tree). URL: ekowai-wizard-preview-ld10kk6av-hannesosters-projects.vercel.app. Preview → PROD Supabase (vadsmshzebefjreqcicl).
  - WRITE-SAFETY: reads FLL encoding read-only; writes ONLY to a NEW test project (project_standards + 29 worksheet_instances + project_parameters). PLT-HS-01 (138 baseline) + clients + encoding tables UNTOUCHED.
  - ACCEPTANCE PREDICTIONS (predictions-first): FLL-GAR-22 Delta_u=(0.35+0.15)·9.81=4.905; g_prime=18.5·0.25=4.625 (derived, not blanked). FLL-GAR-27 Q_NOT=(317−142·0.82)·(263/10000)=5.2747 l/s. WATCH: Gl.2b RHS uses cos(beta), beta in DEGREES but mathjs cos()=radians → if RHS wrong, it's an ENCODING/unit fix (cos(beta·π/180)), NOT an engine gap; core checks (Delta_u/g_prime/Q_NOT) unaffected.
  - REMAINING: user-driven browser bring-up on preview + DB-verify; then 138 regression pass on preview (PLT-HS-01: A138-12 direct→Tab.6→basin V_VA vs Step-6 baseline 45/107,48/fail/293,1695 + PDF vs Step-6.3) BEFORE any E1→main merge. Exit assertion: ZERO engine/dispatch/gate changes.
