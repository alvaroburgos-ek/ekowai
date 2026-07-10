# SDD Progress — B2 A_S,m per-facility single-source

Plan: docs/superpowers/plans/2026-07-08-a138-asm-single-source.md
Branch: feat/a138-asm-single-source (worktree _wt-a138-asm)
Base: f65a173 (origin/main, post-B1)
Isolated test store: /c/Users/Ekowai/.pnpm-store-138test (defect-register P1)
Pause gates (user): after Task 3 (migration), before Task 11 (deploy).

STANDING RULE (2026-07-10, after a session-context loss): **update this ledger at EVERY step transition, not batched at the end.** It is the recovery lifeline — proven when a lost session was reconstructed only from what was written here. A passed/failed/held step gets recorded the moment it transitions, with its DB-verified values.

- Task 0: complete (isolated store installed, vitest runs)
- Task 1: complete (commits d2a71c4..428f25d, review clean — 8/8)
- Task 2: complete (commits 428f25d..4eac5c5, review clean incl. sourceWorksheet fix — 9/9)
- Task 3: complete (commits 4eac5c5..9e6aba0, review clean incl. hardening fixes)  <-- PAUSE (migration gate) — awaiting user go
- Task 4: complete (commits 9e6aba0..e1d3d71, review clean — 3/3; "12 symbols" was report typo, code has 11)
- Task 5: complete (commits e1d3d71..02e7ae5, review clean incl. ordering+UPSERT fix — asm now before loading)
- Task 5a: complete (folded into Task 5 — validateGeometryAgainstMax, 7 tests)
- Task 6: complete (commits 02e7ae5..d6ee1d7, opus review clean; geometry write-back + chained Tab.6 re-fire; q_S_AC render-time, basin independent of A_S_m)
- Task 7: complete (commits d6ee1d7..151d51c + doc 5b49617; REDUCED per user — invariant test only, resolver not built; R-6 + vault A1/A2 logged; review clean)
- Task 8: complete (commits d6f7aac..93cac71, review clean after 2 fixes: geometry-clear on type change [acceptance #4] + Tab.6 recompute-to-indeterminate on clear; migration amended w/ a_s_m_needs_reconfirmation — RE-PRESENT at deploy gate)
- Task 9: complete (commit 93cac71..ae31425, review Approved; 1003/1003 tests, 0 new TS errors)
- Task 10: complete (commit ae31425..87a28ea, review Approved; 19/19 + 4/4 report tests)
- FINAL whole-branch review: DONE (opus) — verdict Ready-to-merge; 2 fixes applied (5e125e4): manual A_S,m rejected w/o provenance (mirror V-1); rollback no longer strips pre-existing A138-13/A138-22 consumers. Re-review clean.
- DEPLOY GATE: MIGRATION APPLIED to prod (HTTP 201, Management-API POST) after 2 GOs — first apply caught entered_by uuid/text mismatch (atomic DO → full rollback, prod clean), fixed (0418e66) + re-GO'd. Rollback FK-order also fixed pre-apply (c342492). HEAD 0418e66.
  Structural verification ALL PASS: (a) 4 fields present+correct enums/defaults; (b) 1 project (PLT-HS-01), 1 'direct' row, 0 dups, real user; (c) A_S_m_Becken active=false, 0 residue; (d) A_S_m consumers unchanged 8/8 same order; A_S_m=45 baseline intact.
- DEPLOYED 2026-07-08: build 1c8ab51l8 (dpl_Cr3pXix9rW5s7gt7RNfQZF3ajMgS, READY, prod) from HEAD 0418e66. THREE aliases (not two!) re-pointed → 1c8ab51l8: (1) ...-hannesoster-... [user's session URL — was STALE on owtcy4vdw after deploy, P2 caught it], (2) ...-hannesosters-projects... (canonical), (3) ...-alvaroburgos-2539... ROLLBACK TARGET (prev live B1): owtcy4vdw — re-point ALL THREE back for rollback. LESSON: --skip-domain + auto-alias only moves the canonical; the custom -hannesoster- alias must be re-pointed EXPLICITLY every deploy (confirm via alias-ls source column, not inspect which lags).
- MULDE-SWEEP PREDICTION (h_M=0,30, Tab.1f, T_n=5): A_S,m governing = 943,43 m² @ D=1440 (boundaryLimited=TRUE, likely NOT surfaced in UI — observe); Tab.6 flips fail→pass (A_C/A_S,m=5,126 ≤ 50).
- Task 11: IN PROGRESS. FOUR manual-method bugs live-caught + fixed: 0173a80 (unlock isComputed) + 2ec7817 (engine-suppression) + 210aa32 (server reject on write-path — batch-restricted symbolById skipped the strip → manual A_S,m persisted + false pass; INTEGRITY) + 4586c92 (client honesty — surface warning + revert field). All opus/sonnet-reviewed. REDEPLOYED build tbbbfg3s7 (HEAD 4586c92), all 3 aliases confirmed. Rollback target r5fvhgssz.
  Step 2 (manual reject+accept) PASSED live on tbbbfg3s7. Step 3a triggered INFINITE LOOP (defect #20: suppression too narrow — soil/geometry client Gl.7 fought server value). Fixed 2dbd663+74db330 (suppression non-direct; editability manual-only). REDEPLOYED h1syebk4l (HEAD 74db330), 3 aliases confirmed. Rollback tbbbfg3s7.
  Cleanup on h1syebk4l: method=direct, A_S_m=45, ratio 107,48/fail (ref 15:52:15.126). IDLE-OPEN DEATH CERT PASSED: 60s+ open+untouched → ZERO A_S_m/ratio/check/method writes after ref (loop dead, defect #20 fixed+verified).
  LIVE ACCEPTANCE on h1syebk4l — step-by-step (ledger updated per transition, not batched — see standing rule below):
    • Step 3a (soil schluffig): PASSED + DB-verified — A_S,m=967,29 read-only, ratio 5,00, 60s idle survived (no loop).
    • Step 3b (soil, 2nd variant): PASSED + DB-verified — A_S,m=483,64, ratio 10,00.
    • Step 4 (geometry Mulde): **FAILED — HELD. ROOT CAUSE NAILED 2026-07-10 (defect #21).** Saved facility=mulde (A138-15) then h_M=0,30 (A138-17); A138-12 returned A_S,m EMPTY / ratio — / check UNBESTIMMT. **Root cause:** the `asm` registry ownerTrigger matches Gl.7|Gl.16|Gl.17; Gl.16 is owned by A138-17 (DB-confirmed), so an A138-17 save sets ownerFiredIds⊇{asm} → producer-fire SUPPRESSED (registry:207), while the owner-path asm dispatch is gated on `isAsmSave`=Gl.7-only (worksheet.ts:144) → false for A138-17. **Net: asm materialize runs on NEITHER path on a geometry save; the Gl.16 sweep never executes.** A_S,m stays the stale null the facility CLEAR wrote at 15:18:22 (before h_M existed). NOT an input-null: all inputs present+sufficient (hand-calc ≈944 @ D=1440). Diagnosis answers: (1) h_M landed cleanly (0,3) but WITH a #19 partial-flush (string "0"→0,3, self-corrected, defect #19b); (2) producer branch did NOT run — no sweep input resolved null, the sweep didn't run; (3) k_i is 7,98e-8 in DB, "displays as 0" = 2-decimal rounding artifact (defect #5/#15c class), NOT the cause. **Blast-radius: A138-18 Rigole identical (Gl.17 in ownerTrigger).** PLT-HS-01 left indeterminate ON PURPOSE. Merge HELD. Fix HELD for user go.
    • Step 4 FIX BUILT 2026-07-10 (TDD, defect #21): narrowed asm registry `ownerTrigger` to Gl.7-only (materialize-registry.ts:191) so it mirrors the `isAsmSave` owner-gate; geometry-facility saves (A138-17/-18) now route via the PRODUCER path (already built: full Gl.16 sweep + scalar resolution). RED test first (materialize-registry.test.ts, parametrized A138-17/Gl.16 + A138-18/Gl.17 → both routed to NO path), GREEN after narrow. Riders traced: (a) client suppression covers geometry (asm-source.ts:141) no loop; (b) facility-clear@1724 gated on facility_type_selected, h_M save skips it, no race; (c) A138-12 owner save still owner-only (Gl.7 in ownerTrigger) no double-fire. Full unit suite 1044/1044; tsc 28=28 (0 new, none in touched files); ownerTrigger single caller (worksheet.ts:500). FULL-JOURNEY REVIEW: Ready-to-merge YES (opus/gp) — no Critical/Important; reviewer independently re-verified DB Gl.7 uniquely owned by A138-12 (n=1, no facility owns Gl.7); 1 Minor follow-up (test mirrors isAsmSave/ownerFiredIds one-liners instead of importing them — export for direct import OR saveWorksheet-level integration test; pre-existing pattern, non-blocking). NOT yet deployed — awaiting user redeploy GO.
    • Steps 5 (type-change) / 6 (baseline restore incl. basin re-fire for V_VA=293,1695 + PDF line): NOT REACHED (blocked behind Step 4).
  Leftover harmless: stale a_s_m_provenance + soil_bodenart_tab13 (hidden in direct mode).
  Step 1 baseline confirmed (V2/107,48/50/fail, engine traces). Steps 2a/2b contaminated PLT-HS-01 (A_S bare→120, method→manual) — cleanup pending: A_S→45, method→direct. Then single clean pass 2b→6.
  KNOWN: V_VA stale 293,178 (A_S=44/120 era) — Step 6 baseline restore must explicitly re-fire basin (A138-13) to reach 293,1695 (defect #17). Merge to main AFTER Step 6.
- Task 11: pending  <-- PAUSE (before deploy)

## Minor findings (for final review)
- Task 1: alignment whitespace on ASM_GL7 const (asm-source.ts:95); no EOF blank line in test — style only, no fix.
- Task 6/8: **loading-check materialize now duplicated across 3 sites** (owner block, step-7 producer re-fire, clear block) — ~40-line pattern repeated; extract a shared `writeLoadingCheck(consumerFieldMap, inputs)` helper. Refactor candidate for final review.
- Task 6/8: cross-worksheet symbol reads use global symbol + limit(1)/first-wins (no standard scoping) — pre-existing single-owner caveat (same as basin/loading); consistent w/ R-6 (loadSameSymbolValues class). Not new.
- Task 8: `AsmClearLcRow` type declared inline (cosmetic).
- Task 9 (→ Task 11 live-review calls): (a) badge uses `data-state` vs B1's `data-status` — selector-consistency, align if live tests use attribute selectors; (b) provenance "Herkunftsangabe erforderlich" error renders EAGERLY on manual-mode mount (before typing) — UX judgment, decide with user at live review (blur-timing vs eager). Neither is a correctness blocker.
