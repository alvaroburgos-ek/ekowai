# DWA-A 138-1 — Open Items

A short, living register of decisions deferred during the engine-wiring slices. One bullet per item; close by linking to the resolving PR or audit decision.

---

## 1. Gl. (18) Q_S Rigole — un-whitelisted, pending source check

- **Where:** A138-18, Gl. (18) — `Q_S = ((b_R + h_R) · L_R + b_R · h_R) · k_i` (§6.4.2 per DB row).
- **Status:** **NOT in `FORMULA_ENGINE_WHITELIST`** (removed in PR #22 commit `cfe35a4`). Evaluator profile, hand-calc reference, and unit test all retained so the open question stays visible.
- **The discrepancy:** the DB formula omits the `×10³` factor that Gl. (4) on A138-12 has for the same physical quantity Q_S (l/s with k_i in m/s and area in m²). Literal evaluation of Gl. (18) with (m, m, m, m/s) inputs returns **m³/s**, but the wizard's `Q_S` field is labelled **l/s** — a **1000× magnitude trap** for engineers comparing Q_S across worksheets.
- **Resolution required:** open `Guidelines knowledge markdown/DWA-A_138-1_WD (5).md` at §6.4.2 and decide one of:
  1. **The standard genuinely omits ×10³ here** — Q_S Rigole is intended in m³/s (Gl. 18 is dimensionally "leakage rate", not the same Q_S as Gl. 4). Then: the wizard's Q_S field unit on A138-18 (and any downstream consumer such as A138-13 Gl. 8 Q_S input) is mis-labelled; fix the unit label and re-wire Gl. 18.
  2. **Transcription dropped the factor** — Pass3c re-import patched out the `·10³`. Then: correct the DB formula via a Pass3c re-import + signed-off audit, and re-wire.
- **Engineer:** the value the engine surfaces today is what the DB formula literally says — fail-loud, never silent. The form shows no numeric result for Gl. 18 (`manual_required`) rather than a wrong-magnitude one.

## 2. Gl. (16) A_S,m Mulde — independently confirm 68.824 m²

- **Where:** A138-17, Gl. (16) — `A_S,m = (A_C · 10⁻⁷ · r_D(n)) / (h_M / (D · 60 · f_Z) + k_i)` (§6.3.2 per DB row).
- **Status:** wired (PR #22). Engine reproduces the hand-calc to 12 decimal places — but **both derive from the same source** (the hand calc in `_eval-reference-Gl16.md` was computed alongside the formula transcription, then asserted in the unit test). Engine is *self-consistent*, not independently verified.
- **Resolution required:** read §6.3.2 in the source markdown, walk through Gl. (16) by hand with the same Heinsberg-like inputs (A_C=1000 m², r_D(n)=130 l/(s·ha), h_M=0.30 m, D=30 min, f_Z=1.2, k_i=5×10⁻⁵ m/s), and confirm A_S,m = **68.824 m²** is the source-correct value. The compound-fraction denominator is the part to check carefully: `h_M / (D·60·f_Z)` should evaluate to `0.30 / 2160 ≈ 1.389×10⁻⁴`, summing with `k_i` to `≈ 1.889×10⁻⁴`, with numerator `1000·10⁻⁷·130 = 0.013` giving `0.013 / 1.889×10⁻⁴ ≈ 68.824`.
- **If confirmed:** close this item with a one-line entry citing the source span (line range).
- **If different:** the formula transcription is suspect — same Pass3c re-import path as item 1 above.

## 3. Squash-merge caveat — safety commits can be silently dropped

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
