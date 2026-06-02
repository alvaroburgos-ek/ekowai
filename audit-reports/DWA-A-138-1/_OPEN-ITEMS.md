# DWA-A 138-1 — Open Items

A short, living register of decisions deferred during the engine-wiring slices. One bullet per item; close by linking to the resolving PR or audit decision.

---

## 1. Gl. (18) Q_S Rigole — RESOLVED (Pile-6, 2026-05-29)

- **Closed:** 2026-05-29 (Pile-6 + batch-4 PR). Source decision branch 1: standard genuinely uses m³/s for Gl. 18 (source §6.4.2 L1778 verbatim quote `"Die Versickerungsleistung Q_S (in m³/s) der Rigole ergibt sich nach GL. (18) zu"`). Pile-6 SQL (`_pile6-A138-18-Q_S-field.sql`) adds the Q_S field on A138-18 with unit `m³/s`. Gl. 18 is now whitelisted; unit guards proved end-to-end in `src/lib/eval/__tests__/formula-Gl18-Q_S.test.ts`. Cross-worksheet ambiguity between Gl. (4) (l/s, A138-12) and Gl. (18) (m³/s, A138-18) is caught by `mergeInheritedFields` + per-input unit guard, no longer silent.

<details><summary>Original entry (historical)</summary>

- **Where:** A138-18, Gl. (18) — `Q_S = ((b_R + h_R) · L_R + b_R · h_R) · k_i` (§6.4.2 per DB row).
- **The discrepancy:** the DB formula omits the `×10³` factor that Gl. (4) on A138-12 has for the same physical quantity Q_S (l/s with k_i in m/s and area in m²). Literal evaluation of Gl. (18) with (m, m, m, m/s) inputs returns **m³/s**, but the wizard's `Q_S` field is labelled **l/s** — a **1000× magnitude trap** for engineers comparing Q_S across worksheets.
- **Resolution required:** open `Guidelines knowledge markdown/DWA-A_138-1_WD (5).md` at §6.4.2 and decide one of:
  1. **The standard genuinely omits ×10³ here** — Q_S Rigole is intended in m³/s. ✅ This branch was confirmed by source quote.
  2. **Transcription dropped the factor** — ruled out.
- **Engineer:** the value the engine surfaces today is what the DB formula literally says — fail-loud, never silent.

</details>

## 2. Gl. (16) A_S,m Mulde — independently confirm the Heinsberg-fixture output 68.824 m²

- **Framing:** 68.824 m² is the engine's output for the **Heinsberg-like reference inputs** in `_eval-reference-Gl16.md`. It is NOT a normative constant of DWA-A 138-1 — for different project inputs the value changes. The open item is "is the formula transcription correct, so that the engine reproduces the source-derived hand-calc *for those specific reference inputs*?"
- **Where:** A138-17, Gl. (16) — `A_S,m = (A_C · 10⁻⁷ · r_D(n)) / (h_M / (D · 60 · f_Z) + k_i)` (§6.3.2 per DB row).
- **Status:** wired (PR #22). Engine reproduces the hand-calc to 12 decimal places — but **both derive from the same source** (the hand calc in `_eval-reference-Gl16.md` was computed alongside the formula transcription, then asserted in the unit test). Engine is *self-consistent*, not independently verified.
- **Resolution required:** read §6.3.2 in the source markdown, walk through Gl. (16) by hand with the same Heinsberg-like inputs (A_C=1000 m², r_D(n)=130 l/(s·ha), h_M=0.30 m, D=30 min, f_Z=1.2, k_i=5×10⁻⁵ m/s), and confirm A_S,m = **68.824 m²** is the formula-correct value **for those specific inputs**. The compound-fraction denominator is the part to check carefully: `h_M / (D·60·f_Z)` should evaluate to `0.30 / 2160 ≈ 1.389×10⁻⁴`, summing with `k_i` to `≈ 1.889×10⁻⁴`, with numerator `1000·10⁻⁷·130 = 0.013` giving `0.013 / 1.889×10⁻⁴ ≈ 68.824`.
- **If confirmed:** close this item with a one-line entry citing the source span (line range).
- **If different:** the formula transcription is suspect — same Pass3c re-import path as item 1 above.

## 3. Gl. (10) V_Rück flood-check — RESOLVED (Pile-5 + batch-4, 2026-05-29)

- **Closed:** 2026-05-29. Pile-5 SQL (`_pile5-schema.sql`) adds the flood-event sub-area carrier `sub_areas_A138_26` on A138-26 with per-row `c_S`. Batch-4 PR wires the Gl. 10 aggregator (Gl. 2 pattern, with own carrier + 4-stage fail-loud guards: scalars / carrier / unit / per-row). Hand-calc reference in `_eval-reference-Gl10.md` reproduced to ±0.001 m³ in `formula-Gl10.test.ts` (14 cases). Engine cannot silently fall back to design-event C.

<details><summary>Original entry (historical)</summary>

- **Where:** A138-26, Gl. (10) — `V_Rueck = ((r_D(T_n_Ue) · (SUM(A_E_b_a · C_S) + A_VA) / 10000) − (Q_S + Q_Dr)) · D · 60 / 1000 − V_VA ≥ 0` (§5.3.4 per DB row).
- **Why parked:** the SUM-over-sub-areas required a sub-area carrier with per-row **flood-event runoff coefficient `C_S`**. ✅ Pile-5 added a dedicated `sub_areas_A138_26` carrier (separate from design-C `sub_areas_A138_10`), so the engine cannot silently use design-event C.
- **Why fail-loud matters:** Gl. 10 is the **flood compliance gate**. Computing it wrong would understate retention. Now: per-row C_S + r_D(T_n,Ü) unit guard + scalar guard all enforced.

</details>

## 5. §6.1 L1596 — Zisterne via Simulationsmodell (deliberate scope deferral)

- **Where:** A138-13 Gl. 8 V_VA cistern-credit branch (Pile-8, PR #28).
- **Source clause (verbatim, §6.1 L1596):** *"Speicherräume können für eine Rückhaltung des Niederschlagswassers rechnerisch nur angesetzt werden, wenn sie ein zwangsentleertes Teilvolumen aufweisen **oder mithilfe von geeigneten Simulationsmodellen, die unter anderem den Ausfall von Entnahmen/Nutzungen (zum Beispiel in Urlaubszeiten) unregelmäßig und zufallsgesteuert abbilden, nachgewiesen wurden.**"*
- **What's implemented (PR #28):** the Zwangsentleerung branch — `V_Zisterne` is credited toward V_VA only when the boolean `zisterne_zwangsentleerung == true`.
- **What's NOT implemented:** the second creditable condition — proof via a simulation model that captures stochastic Entnahme/Nutzungs-Ausfall (e.g. Urlaubszeiten). The wizard currently has no carrier for a simulation attestation or its parameters, and the V_VA aggregator has no second `OR` branch that recognises it. Engineers who rely on simulation-based proof today must either (a) flip `zisterne_zwangsentleerung` to true with an external Nachweis, or (b) skip the cistern credit and engineer the headroom manually.
- **Why deferred:** simulation-model integration is materially larger than the Zwangsentleerung gate. It needs (i) a simulation-attestation field (boolean + reference document), (ii) a parameter-validation step (the source requires the simulation to capture *unregelmäßige zufallsgesteuerte* Nutzungs-Ausfälle — not a one-line property), and (iii) probably an own audit rubric. Out of scope for the engine-wiring slices through Pile-8.
- **Risk if left unaddressed:** an engineer using a legitimate simulation-based Nachweis cannot record it in the wizard. They will likely set `zisterne_zwangsentleerung = true` as a workaround, which is informationally wrong even if numerically equivalent. This is a **tracked, deliberate gap** — not silent.
- **When to revisit:** as part of a Phase-3 cistern slice, or when a real project first needs the simulation path. Re-open this item with a scope proposal at that point.

## 4. Squash-merge caveat — safety commits can be silently dropped

- **Observed:** PR #21's squash-merge to main (commit `415bd7b`) silently dropped commit `a4ed2ba` (the runtime ambiguity guard on `mergeInheritedFields`). The squash subject only mentioned the headline inheritance work; the second commit's content was not in the merged tree even though it was in the branch when the merge fired.
- **Recovery:** PR #22 (`483c001`) re-introduced the ambiguity guard as part of its diff, with an explicit note in the commit body so the squash doesn't drop it again. Verified post-merge: the guard's code AND its 3 tests are present on main and pass.
- **Standing rule for future PRs:**
  1. When a feature PR contains multiple commits whose individual purpose matters (safety guards, regression tests, schema flips), **list those commits in the PR body** so the maintainer can include them in the squash subject.
  2. **After every squash-merge to main, grep main for a marker string from each safety commit** (e.g. a unique identifier, a test name, an error string) and confirm it's present. If not, open a follow-up PR re-introducing the missed content immediately.
- **Why:** squash-merge collapses commit history to a single commit on main, so any silent drop is invisible from the PR view — only the working content of main reveals the loss.

---

### Conventions for this file

- One item per heading. Status line first, then the discrepancy and the resolution path.
- Closing an item: leave the heading, add a "Closed: <PR or date>, <one-line summary>" line at the top of the body, strike through obsolete steps. Don't delete — history matters.
- Order: open items first (newest at top), closed items after.
