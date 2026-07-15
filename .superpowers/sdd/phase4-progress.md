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

- Task 0 (ratification bundle: D1 clauses + D3 predicate): IN PROGRESS — artifact written docs/superpowers/plans/2026-07-15-phase4-ratification.md; presented to user; AWAITING individual ratification of REQ-20/21/22 severities + Gl.38 Typ-B rider + phase_4_gate_result predicate. Tasks 3/5 gated on this.
- Task 1–2 (#22 reproduction + fix): DONE 2026-07-15. RED commit a1bda0a (9 unit + 3 integration tests fail on missing export). GREEN commit 8c8edc0 (12/12 pass, 0 new TS errors, 1092/1092 unit suite). Files: asm-source.ts (+symbolHomeSuppressedSymbols), worksheet-form.tsx (union into engineSuppressedSymbols), asm-dual-role-a138-17.test.ts, a138-17-dual-role.test.tsx. Reproduction property: "bug path" test asserts manual_required when unsuppressed; "fix path" test asserts V_M≈22.05 m³ when suppressed. Report: .superpowers/sdd/task-1-2-report.md.
- Task 3 (A138-23 summary aggregator): pending Task 0 D3 ratification.
- Task 4 (REQ-19 enforcement verify): pending.
- Task 5 (compliance gates importer): pending Task 0 D1 ratification.
- Task 6 (Mulde pilot acceptance): pending — PILOT GATE.
- Task 7 (pilot close-out): pending.
- Tasks 8–13 (fan-out Rigole/MRE/MRS/Schacht/Becken/Fläche): pending pilot sign-off.
- Task 14 (full regression + deploy + close-out): pending.
