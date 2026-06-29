# SDD progress — A138-10 auto Q_zu (governing-D derived)

Branch: feat/a138-10-auto-qzu (off live 2D-grid build feat/rainfall-2d-grid @ ff0e797)
Worktree: C:/Users/Ekowai/_wt-a138-10 (node_modules junction; .vercel→ekowai-wizard-preview)
Plan: docs/superpowers/plans/2026-06-29-a138-10-auto-qzu.md
Model: basin (A138-13) produces D_gov/r_D_gov via its existing iteration; A138-10 inherits → D_min/r_D_n derived; Q_zu auto via Gl.3. Single producer; no double-iterate; no free-typing.
Witnesses to hold: basin 18.684 @ D=30 unchanged; A138-10 Q_zu auto-computes at governing D.
Mode: subagent-driven, PAUSE for Alvaro after each task; dedicated review on Task 3 (migration).

- Task 1: basin engine exposes derivedExtras {D_gov, r_D_gov} — complete (cf23a79; 742 green; additive only, V_VA untouched; type AggregatorDerivedExtras in formula.ts, importable by all 3 paths; optional → undefined = withhold). review clean.
- Task 2: materialize basin governing r_D_n/D_min (3 paths) + A138-10 Q_zu auto — complete (b8b6a8c + whitelist fix 252fd68; 748 green; 18.684 holds; Q_zu=13.65@gov; withhold ok). Caught: A138-10:3 was NOT engine-whitelisted (would mis-compute via legacy sum) → added to engine-whitelist.ts + whitelist.ts + regression guard. review clean.
- Task 2b: materializeBasinGoverning on A138-13 save (persist r_D_n/D_min to project_parameters) — complete (b996ac0; 760 green; pure fn reuses basin profile, r_D_n=130/D_min=30; saveWorksheet UPSERTs derived rows). Concerns: (1) live DB-persist = Task-4 smoke (no local PG); (2) UPSERT needs Task-3 fields (else silently skipped — correct ordering); (3) scalar lookup queries ALL project active fields by symbol → cross-standard collision risk (low for 138 hydraulic symbols; verify at smoke / harden later).
- Validation for Task 3 (read-only): A138-13 no r_D_n/D_min collision (0), has a section; A138-10 r_D_n=20569b22.../D_min=e8f2de04... (req=true,active=true,cons=null); typed values=2 on "Wohngebiet Köln-Lindenthal" (r_D_n=200,D_min=15) — supersede OK'd by Alvaro.
- Task 3: migration (A138-13 produce r_D_n/D_min consumer=A138-10; deactivate A138-10 locals) — pending [GATED/dedicated review]
- Task 4: verify + cutover — pending [GATED]. HARD GATE (Alvaro): after in-browser A138-13 save, query project_parameters and confirm r_D_n/D_min landed source_type='derived' AND match the engine display — not optional.
- CLEANUP (real, non-blocking, Alvaro): materializeBasinGoverning scalar lookup resolves symbols across ALL project active fields (first-wins) = latent cross-guideline leak (safe only because 138 hydraulic symbols are unique; a future DIN/ISO/FLL sharing a symbol would grab the wrong field — violates strict-separation in principle). Scope the lookup to the current standard/worksheet set. Added to playbook "watch for".
- Playbook capture: audit→apply predefined-accessor (free-typed table-lookup → derived from single producer) — after land
