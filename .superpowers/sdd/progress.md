# SDD Progress — B2 A_S,m per-facility single-source

Plan: docs/superpowers/plans/2026-07-08-a138-asm-single-source.md
Branch: feat/a138-asm-single-source (worktree _wt-a138-asm)
Base: f65a173 (origin/main, post-B1)
Isolated test store: /c/Users/Ekowai/.pnpm-store-138test (defect-register P1)
Pause gates (user): after Task 3 (migration), before Task 11 (deploy).

- Task 0: complete (isolated store installed, vitest runs)
- Task 1: complete (commits d2a71c4..428f25d, review clean — 8/8)
- Task 2: complete (commits 428f25d..4eac5c5, review clean incl. sourceWorksheet fix — 9/9)
- Task 3: complete (commits 4eac5c5..9e6aba0, review clean incl. hardening fixes)  <-- PAUSE (migration gate) — awaiting user go
- Task 4: complete (commits 9e6aba0..e1d3d71, review clean — 3/3; "12 symbols" was report typo, code has 11)
- Task 5: complete (commits e1d3d71..02e7ae5, review clean incl. ordering+UPSERT fix — asm now before loading)
- Task 5a: complete (folded into Task 5 — validateGeometryAgainstMax, 7 tests)
- Task 6: complete (commits 02e7ae5..d6ee1d7, opus review clean; geometry write-back + chained Tab.6 re-fire; q_S_AC render-time, basin independent of A_S_m)
- Task 7: REDUCED (user-adjudicated) — collision structurally prevented (single canonical A_S_m field). Deliverable: DB-gated COUNT(active A_S_m)=1 invariant test (registry consumerTemplateCode='A138-12' already asserted in Task 4) + design-doc residue R-6 + vault audit-register handoffs. In progress.
- Task 8: pending
- Task 9: pending
- Task 10: pending
- Task 11: pending  <-- PAUSE (before deploy)

## Minor findings (for final review)
- Task 1: alignment whitespace on ASM_GL7 const (asm-source.ts:95); no EOF blank line in test — style only, no fix.
