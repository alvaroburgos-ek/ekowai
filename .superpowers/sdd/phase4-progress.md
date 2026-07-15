# SDD Progress — DWA-A-138-1 Phase 4 (Facility Sizing Completion)

Plan: docs/superpowers/plans/2026-07-15-138-phase-4-facility-sizing.md
Scope (approved 2026-07-15): vault 01-Projects/ekowai-wizard/2026-07-15-138-phase-4-facility-sizing-scope.md
Branch: feat/138-phase-4-facility-sizing (worktree _wt-138-p4)
Base: main aa656a5 (post-E1-merge 9689926, live prod fy53ay6wu)
Isolated test store (P1): /c/Users/Ekowai/.pnpm-store-138test — run vitest from _wt-138-p4 only.
Identity: alvaro.burgos@ekowai.com (verify before every commit).

STANDING RULE: update this ledger at EVERY task transition (recovery lifeline), with DB-verified values.

Execution: subagent-driven (fresh implementer per task + task review). GO given 2026-07-15.

Riders (binding):
- D1: three facility gates BLOCK; each severity ratified individually against verbatim source clause BEFORE enforcing (Task 0). Gl.38 enum-conditioned on Schacht-Typ=B.
- D2: all 7 facilities, PILOT-FIRST (Mulde). Pilot (Task 6) is a GATE; defect classes it surfaces are fixed in the shared pattern before fan-out (Tasks 8–13).
- D3: phase_4_gate_result stays an ENTERED engineer sign-off (Phase-2 `entered` precedent, verified on PLT-HS-01); six support fields auto-derive; wizard shows a recommended verdict; predicate ratified BEFORE wiring (Task 0).
- #22 fix gets a reproduction-grade test (fails-on-old / passes-on-new, E1-B standard).
- Every cross-worksheet read via scopeFieldsToStandard — NO new bare by-symbol reads.

## Task ledger

- Task 0 (ratification bundle: D1 clauses + D3 predicate): RATIFIED 2026-07-15. artifact docs/superpowers/plans/2026-07-15-phase4-ratification.md. USER-RATIFIED: REQ-20 (Gl.13) BLOCK unconditional (arithmetic infeasibility, not modal); REQ-21 (Gl.25) BLOCK conditioned on L_VS present/nonzero, N/A otherwise; REQ-22 (Gl.38) BLOCK enum-conditioned Schacht-Typ=B only; D3 entered-enum + recommended verdict, Tab.14 soft constraints (t_E/freeboard/slope) drive CONDITIONAL. D3 ADDITION (binding): the recommended verdict MUST carry its reasons — which constraint flagged, with values — in a companion field, so the engineer confirms an EXPLAINED recommendation, not a bare verdict. Tasks 3/5 CLEARED to build.
- Task 1–2 (#22 reproduction + fix): IMPL DONE, REPRODUCTION GAP FOUND — NOT yet review-clean. RED commit a1bda0a, GREEN commit 8c8edc0, ledger d3e507b. 12 tests + 1092/1092 unit + 28=28 TS. Files: asm-source.ts (+symbolHomeSuppressedSymbols), worksheet-form.tsx (union into engineSuppressedSymbols), asm-dual-role-a138-17.test.ts (9 pure-unit), a138-17-dual-role.test.tsx (3 hook-integration). GAP (implementer self-flagged, report §Reproduction property + controller-confirmed): the integration tests pass an EXPLICIT suppress-set to the hook harness → reverting the worksheet-form.tsx union fails NO test → violates the reproduction-grade rider (must fail on the REAL code path). GAP CLOSED: commit 5a1d7e4 extracted composeEngineSuppressedSymbols (asm-source.ts) as the seam worksheet-form calls; reproduction test on A138-17+method=direct asserts A_S_m suppressed. RED PROOF (controller + fixer verified): removing the home term → "AssertionError: expected false to be true" (asm-source.test.ts:115); restored → GREEN. Full: 1097/1097 unit, 28=28 TS. TASK REVIEW (a238dcb..5a1d7e4): Approved-with-reservation. Spec-clean on all verified points (server path untouched, standard-agnostic, stable-empty byte-identical, A138-20/22 guard). ONE Important: reverting the worksheet-form.tsx:309 wiring (compose→old helper) fails NO test — seam tests catch reverting the LOGIC, not the injection point. FIX DONE: commit e56c86e — wiring-level test (renders real WorksheetForm, spies useEquationEngine, asserts captured suppressWriteBackSymbols ∋ A_S_m). RED PROOF: reverting worksheet-form.tsx:309 (compose→old helper) → "AssertionError: expected false to be true" at engine-wiring-suppress-a138-17.test.tsx:194; restored → GREEN. Suite 1100 pass +1 expected-fail; 28=28 TS.

Task 1–2 (#22): COMPLETE 2026-07-15, review-clean (commits a238dcb..e56c86e: a1bda0a RED, 8c8edc0 GREEN, d3e507b ledger, 5a1d7e4 seam+repro, e56c86e wiring-repro). Reproduction-grade satisfied at BOTH the logic seam (composeEngineSuppressedSymbols) AND the production wiring (WorksheetForm render). Server materialize path untouched; standard-agnostic; A138-20/22 pure-consumers guarded. Report: .superpowers/sdd/task-1-2-report.md.
- Task 3a (phase4-summary pure module): COMPLETE 2026-07-15. facilitySummaryInputs (7 facility rows verbatim), recommendedPhase4Gate (ratified predicate), recommendationReasons (D3 addition — values embedded). 42/42 tests, 1142/1142 unit suite, 0 new TS errors. Files: src/lib/eval/phase4-summary.ts + __tests__/phase4-summary.test.ts. Report: .superpowers/sdd/task-3a-report.md.
- Task 4 (REQ-19 enforcement verify): pending.
- Task 5 (compliance gates importer): pending Task 0 D1 ratification.
- Task 6 (Mulde pilot acceptance): pending — PILOT GATE.
- Task 7 (pilot close-out): pending.
- Tasks 8–13 (fan-out Rigole/MRE/MRS/Schacht/Becken/Fläche): pending pilot sign-off.
- Task 14 (full regression + deploy + close-out): pending.
