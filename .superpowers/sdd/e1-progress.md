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
- E1-A (whitelist consolidation → single deny-set SSOT + BLOCKING faithfulness gate [D1]): NEXT, not started.
- E1-B (registry/dispatch hardening + CI integration tests): pending.
- E1-C (standard-agnostic symbol scoping §10c — MANDATORY before FLL): pending.
- E1-D (backlog: #17 cascade, non-turnover flag, provenance; #22 cross-worksheet + governingD deferred): pending.
