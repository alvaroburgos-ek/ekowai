# A138-23 Summary-Layer Fix Wave — Design (for approval, NO build yet)

> Pilot Findings **F + G1 + G2**. Scope boundary (binding): **SUMMARY LAYER ONLY**. The #22 chain (A_S_m materialization + V_M compute on A138-17) is proven and stays untouched — regression-guarded in this wave's test run (the #22 seam/render/wiring repro tests must stay green). Reproduction tests fail-on-current for F and G1, real topology, for approval before any build.

## The one design question (F + G1 together): how summary state flows
The summary aggregator on A138-23 consumes facility outputs (governing volume, footprint, q_S,AC). Two coupled defects:
- **F:** the governing volume (`V_M` for mulde; `V_R`/`V_MR`/`V_MUE`/`V_S`/`V_VA` for the others) is a **client-only engine output** — it computes on screen but is never persisted (engine-output-materialization gap), so the aggregator reads null.
- **G1:** the aggregator only re-fires when a symbol in its `inputSymbols` appears in the **user's save batch**; but `A_S_m`/`V_M` are materialized **server-side** by other saves (asm sweep / facility), never in the batch → the summary freezes at its first firing (Step-1 snapshot). And `worksheet.ts:558` (tx-open) **excludes `isPhase4SummarySave`** → a deliberate no-dirty A138-23 re-save can't force it either.

### F — persist the facility governing volume (a materialize)
The facility geometry sweep already runs **server-side** in the asm producer branch and computes `A_S_m` at the governing duration D (`worksheet.ts:1641-1644`, `computeMuldeGeometrySweep`). Extend that same path to also compute and **persist the governing volume** onto the facility worksheet's volume field (A138-17 `V_M` = de5f9fee):
- For mulde: `V_M = A_S_m · h_M` (Gl.15 geometric — equals the Gl.14 design value at the governing D). Persist as `derived`.
- Generalise per facility via a small map `facility → { volumeSymbol, compute(inputs) }` (mulde→V_M, rigole→V_R, schacht→V_S, becken→V_VA, MRE→V_MR, MRS→V_MUE), reusing each facility's already-computed geometry.
- The summary aggregator then reads the **persisted** governing volume (unchanged read path) → non-null → `facility_specific_volume_m3` populated, `complete=true`.
- **Alternative considered (rejected for now):** have the aggregator itself compute the volume from persisted A_S_m + h_M. Rejected — it hardcodes six facility-specific volume formulas into the summary and duplicates the sweep's design-point logic. The materialize keeps one source of truth (the facility) and makes V_M available to the facility display too.

### G1 — re-fire the summary when its inputs materialize (chain) + manual fallback
1. **Chain-fire:** after the asm/facility materialize writes `A_S_m` (and F's `V_M`) in a save's transaction, **also run the `phase4_summary` recompute in the same transaction** (chain), so the summary reflects the fresh values — the same shape as the B1/B2 "chained Tab.6 re-fire" already used for the loading check. Concretely: when `producerEntries`/owner path materializes `A_S_m`/`V_M`/facility values, add `phase4_summary` to the fired set for that transaction.
2. **Manual fallback:** add `isPhase4SummarySave` to the `worksheet.ts:558` tx-open condition, so a deliberate A138-23 re-save **always** opens the transaction and re-runs the aggregator even with no dirty field. (Belt-and-suspenders; the chain is the primary mechanism.)

## G2 — the enum layer (splits by cost, per the ruling)
**Root cause of "no option highlighted" + "my FAIL didn't persist" (answered):** A138-23 has **no equations** → `computeComputedSymbols` returns ∅ → **no A138-23 field is `isComputed`** → the derived `recommended_phase_4_gate` renders as a **normal editable SegmentedControl**, visually identical to the editable `phase_4_gate_result` right beside it. So:
- **Why your FAIL didn't persist — most likely the read-only twin.** `recommended_phase_4_gate` already held `FAIL` (derived, from Step 1). Rendered editable, it looks like the verdict; selecting `FAIL` on it = no change → **no dirty → no save**. `phase_4_gate_result` (the real verdict, null) was never touched → stayed null. That's the #15b adjacency biting exactly as you suspected. (The "no highlight" is the same field: a derived enum whose value isn't surfaced as the selected segment.)
- **This is NOT cosmetic** — a field that looks editable but silently no-ops on a real click is a correctness/UX defect. It's in G2, not the display batch.

**G2 fix (contained — rides along):**
- **G2a — make `recommended_phase_4_gate` genuinely read-only.** Since `computedSymbols` can't catch it (no equation), add a small **derived/read-only marker** for engine-written A138-23 fields (an explicit read-only symbol set on A138-23, the same shape as `LOADING_CHECK_SYMBOLS`/`BASIN_GOVERNING_SYMBOLS`) → `isComputed=true` for `recommended_phase_4_gate` → DynamicField renders it as a **read-only display of the derived verdict** (badge/value), not an editable control. This fixes the no-highlight AND removes the click-target confusion in one move.
- **G2b — the #15b cheap mitigation (required this wave):** with G2a the recommendation becomes a locked/read-only display visually distinct from the editable `phase_4_gate_result` verdict (label + lock styling). That is the "visually distinguish read-only recommendation from editable verdict" the ruling asks for. Deeper cluster redesign (grouping/card) → deferred to the display batch.
- **G2c — verify the editable verdict persists on a clean click.** Once the twin is read-only, `phase_4_gate_result` is the only settable enum. Confirm (repro + live) that setting it dirties + persists. If it STILL no-ops on a genuine change, that's a deeper editable-enum-dirty bug — chase it then; but the evidence (both fields at their existing values → no dirty) points to the twin, not a broken save.

## Reproduction tests (fail-on-current, real topology — the approval artifacts)
- **F-repro (aggregator reads persisted volume):** drive the facility materialize for a mulde fixture (A_S_m swept, h_M=0.30) → assert the summary's `facility_specific_volume_m3` = the persisted governing volume (≈283.03) and `complete=true`. **RED on current:** V_M not persisted → summary volume **null**, complete **false**. GREEN after F.
- **G1-repro (summary re-fires on input materialization):** materialize a fresh `A_S_m` (or V_M) via a facility/asm save → assert the summary reflects the NEW value in the SAME save (footprint/volume/verdict refreshed). **RED on current:** summary **stale** (old snapshot) after the materialize. GREEN after G1 (chain-fire). Plus a manual-fallback test: an A138-23 no-dirty re-save opens the tx and re-runs (RED on current — tx-open excludes isPhase4SummarySave).
- **G2-repro (contained):** unit — `recommended_phase_4_gate` ∈ the A138-23 read-only set → `isComputed=true` (RED before the marker). Optional render test: the recommendation renders read-only (not an editable control).
- **REGRESSION GUARD (scope boundary):** the wave's test run re-executes the #22 repro suite (computed-symbols seam, render-a138-17-asm-inherited-prod-signal, engine-wiring-suppress) — all must stay GREEN. The summary fixes touch materialize-registry/worksheet.ts producer + DynamicField read-only marking; they must not perturb the A_S_m suppression/inheritance path.

## Build order (after approval)
1. F materialize (persist governing volume) + F-repro.
2. G1 chain-fire + :558 tx-open + G1-repro (+ manual-fallback).
3. G2a/b read-only marker + styling + G2-repro.
4. Full suite + #22 regression guard green + by-file tsc (baseline 28).
5. Redeploy preview → resume pilot Step 4 (expect: aggregator re-fires → facility_type_dimensioned='mulde' [confirms Finding A], volume≈283.03, complete=true, meets_qsac=false → recommended FAIL; then the verdict-flips now demonstrate PASS/CONDITIONAL) → baseline restore → close.

## SOURCE-VERIFICATION (§6.3.2) — done 2026-07-20, ruling CONFIRMED
Source_quotes (prod equations): Gl.(14) `V_M=[...]·D·60·f_Z` = "erforderliches Speichervolumen der Mulde"; Gl.(15) `V_M=A_S,m·h_M` (geometric, h_M=max Einstauhöhe); Gl.(16) is derived by SETTING Gl.(15)=Gl.(14) and solving for A_S,m. → at the dimensioned point (sweep A_S,m) the geometric `A_S,m·h_M` EQUALS the erforderliches Speichervolumen; both are V_M, both = 283.03. So persisting `V_M = A_S,m·h_M` IS the standard's Mulde Speichervolumen (source does NOT say otherwise) → build approved. FAN-OUT RULE: same source-check per facility (persist the standard's own storage-volume definition).

## Open decisions for your ratification
1. **F volume source:** persist `V_M = A_S_m·h_M` (geometric, = design value at governing D) on the facility save — OK? (vs. the fuller Gl.14 form, which the sweep could also emit.)
2. **G2 scope:** G2a+G2b (read-only marker + lock styling) in THIS wave; deeper #15b card-redesign to the display batch — OK?
3. Anything to add/cut before I build.
