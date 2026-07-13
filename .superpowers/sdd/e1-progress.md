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
  <-- CHECKPOINT: gate built + demonstrated (D1 demo delivered on real data); encode-time BLOCKING enforcement is the remaining piece. Awaiting go on encode-time wiring.
- E1-B (registry/dispatch hardening + CI integration tests): pending.
- E1-C (standard-agnostic symbol scoping §10c — MANDATORY before FLL): pending.
- E1-D (backlog: #17 cascade, non-turnover flag, provenance; #22 cross-worksheet + governingD deferred): pending.
