# 138-Derived Skill Foundation

- **Date:** 2026-06-08
- **Status:** FOUNDATION NOTES — not an applied skill. Do **not** build the encoder skill or touch standards 2–13 from this yet. It is a capture of what the DWA-A 138-1 close-out proved, to be turned into the reusable encoder skill **only after** engine-output materialization is fixed and verified (see §C).
- **Source work:** DWA-A 138-1 close-out for project *Flurstück 133, Kempen* (rainwater pond beside a greenhouse, closed-loop reuse — really an FLL §4.10 case, run through 138 to exercise the boundary). project_id `02f93026-fb20-4463-abd6-540befc049a9`.
- **Repo/branch:** patterns live on `integration/preview-138-plus-leads`; eval engine under `src/lib/eval/`, gate under `src/lib/actions/approval-gate.ts`, encoder pipeline under `scripts/import-pass3c.ts` + `_pass3c-*`.

## Why this document exists
Every bug found while closing 138 was an instance of the same root principle being violated: **a value should be derived once and referenced, never recomputed or re-entered.** The patterns below are proven on one standard. They are NOT safe to replicate across the other 12 standards until the one platform-level blocker in §C is fixed — otherwise every standard inherits the same broken downstream chain. This doc is the brief for the future skill, plus the hard line on when it may be applied.

---

## A. Proven patterns (ready to encode into the skill)

### A1. Single-source derivation
- **Classify every field** as **atomic-input** or **derived**.
- **Derived fields** are **computed, read-only, with the breakdown shown** (per-row contributions + subtotals), and **never hand-keyed**.
- **A value is produced in exactly ONE worksheet** and declares its `consumer_worksheets`; **downstream worksheets inherit by reference** — they never recompute and never re-enter it.
- **Each derivation is ONE registered equation (by stable ID)** evaluated through a **shared helper**, so all readers get **identical values by construction**.

*Proven by:* `summarizeSurfaceInventory(rows) → {sealed, unsealed, area, ac}` (`src/lib/eval/surface-types.ts`) is the single helper behind A138-07 `A_C_preliminary` (eq `b3f8c2e0-…`) and A138-10 `A_C` / ΣSealed / ΣUnsealed / C_m (eqs `1a48af79-…`, `d1a38110-…0001/0002/0003`). Aggregators are keyed by equation UUID in `aggregators.ts`; the no-divergence invariant `A_C == A_C_preliminary == ΣSealed + ΣUnsealed` holds by construction and is unit-tested. This replaced a state where A138-10 recomputed A_C from its own local `sub_areas_A138_10` table — two independent A_C values that could diverge.

### A2. Consumer wiring is declared data, not per-link code
A field's reachability into a worksheet is the field's `consumer_worksheets` array — a data declaration. When a requirement/equation on worksheet X references symbol S, X must be in S's consumers. Two genuine failures in 138 were *purely* missing entries here:
- `gw_clearance` (owned A138-02) lacked A138-04 → REQ-04 read "fehlend" instead of evaluating `0,5 ≥ 1,0`. Fix = add `A138-04` to the consumer array; REQ-04 then failed correctly on the real value.
- `belastungskategorie` (owned A138-06, = BK_I) lacked A138-04 → REQ-07 "fehlend". Fix = add `A138-04`; REQ-07 went green for the right reason.

**Skill target:** consumer links should be **derived automatically** from which equations/requirements reference each symbol — *no* hand-added per-link wiring. The manual fixes above prove the lever works; the skill removes the manual step.

### A3. Encode-time tagged field list for engineer review
At encode time the skill must **emit the full field list tagged** (atomic vs derived; for derived: the equation id; for every value: its producing worksheet + consumers) for **engineer review BEFORE locking** the standard. This is where mis-classification (e.g. a derived quantity left as a hand-keyable input) gets caught before it ships.

---

## B. Honesty invariants (must hold for EVERY standard)

1. **Genuine failures stay red.** Presence-only rules must never be false-greened by linking inadequate data. *The discriminating case:* REQ-07 (`belastungskategorie IS NOT NULL`) was linked because BK_I is a genuine, adequate assignment → earned green. REQ-03 (`k_f IS NOT NULL AND permeability_test_method IS NOT NULL`) was **deliberately left unlinked** because the underlying data is inadequate (k_f via uncertified `literaturwert`) — linking would have produced an unearned green. **Link only when the underlying value is genuinely adequate.**
2. **Agent-encoded equations are `needs_engineer_review`, never "verified".** The engineer of record attests. 138's A_C recompute + ΣSealed/ΣUnsealed/C_m + Q_zu were all written as `needs_engineer_review` / `pending_independent_audit`, not `verified_against_standard`.
3. **Never invent inputs to force a derived value.** `simple_method_applicable` had been hand-set to "Ja" while `q_S,AC` was never computed → reverted to unset. A derived conclusion waits on its real inputs.
4. **Cross-guideline coverage ≠ documented-deviation, and neither is a silent override.**
   - *Documented deviation* = justified non-compliance with the current rule (written justification + basis citation; distinct verdict; auditable).
   - *Coverage* = compliance demonstrated under a **different** standard (e.g. REQ-03/REQ-04 under FLL §4.10 for a closed-loop pond). Distinct verdict "Konform mit Abdeckung durch [Standard §X]"; requires target standard + clause + why-it-governs; **engineer-cited-not-system-verified** until that standard is encoded.
   - Both render as **distinct, auditable verdicts** — never identical to a plain green.
5. **Derived fields must not block approval gates as "missing required".** The gate's missing-required arm (`approval-gate.ts`, own + active + `is_required` + empty) currently counts derived outputs too: A138-10's `A_C` and `Q_zu` (derived, never persisted) would block `engineer_approve` as missing Pflichteingaben. The gate must **exclude derived fields** (or treat them satisfied-by-reference). Do not "fix" this by flipping a real output to not-required — that mis-models it. (138 interim: the *legacy* redundant `A_E_b_a_total` was set not-required to clear a permanent false-blocker; the derived `A_C`/`Q_zu` case was left for the workstream.)

---

## C. KNOWN GAPS — must be fixed BEFORE the skill is applied to any other standard

### C1. Engine-output materialization — **THE BLOCKER**
Engine/aggregator computed outputs (`A_C`, `A_C_preliminary`, `Q_zu`, ΣSealed/ΣUnsealed/C_m, …) are **NOT persisted to `project_parameters`**. The `use-equation-engine.ts` write-back updates the in-memory store for *live display* only; `saveWorksheet` does not persist computed/derived fields. **Proven live (2026-06-08):** A138-07 was saved on 2026-06-06 yet `A_C_preliminary.value_number` is null; after an engineer opened+saved A138-10, `A_C` still had no row. Because downstream sheets inherit by reading the origin field's `project_parameters` row (`merge-inherited-fields.ts`), the **downstream scalar chain is broken** — A138-13/16/17/18/19/20/21/22 cannot resolve `A_C`.

**This is the blocker.** The single-source skill's rule "downstream inherits by reference" (§A1) is unachievable until this is fixed. Applying the skill to standards 2–13 before fixing it would replicate this broken chain in all of them. The fix is platform-wide (a three-state-safe materialization of engine number outputs: persist on `computed`, null on `manual_required`, never clobber an engineer override) and must be **fixed AND verified** first.

*(Note for accuracy: the analysis flip-flopped twice before the DB settled it. The anchor is the data — `A_C` is null after save — not any reading of the code.)*

### C2. Produce-once-and-reference end state depends on C1
The clean end state is **one** A_C value produced on A138-07 and **referenced** by A138-10 — retiring `A_C_preliminary` as a separate value, and retiring A138-10's local `sub_areas_A138_10` / `A_E_*_total` table. The 138 stopgap (A138-10 *recomputes* from the same inherited carrier, identical-by-construction) is correct numerically but is NOT the invariant's end state — it recomputes. Reaching produce-once-reference requires C1.

---

## D. Process discipline that made 138 work (carry into how each standard is run)

1. **Staged deploys; additive before destructive; a human visual gate between.** 138's pile-14 shipped the additive single-source (recompute + read-only Σ/C_m) as Deploy-1, then HARD STOP for the engineer's eyes; the destructive retire of the local table is still held pending that gate.
2. **Verify on the actual host the engineer loads.** "Tests pass" / "renders in my build" ≠ "renders correctly in the host the engineer opens." The entire stale-bundle / two-Vercel-projects saga came from this; treat the engineer's real URL as the source of truth for visual acceptance.
3. **Prod writes need a human authorizer; never harvest credentials.** Every prod DB write (migrations, consumer-link edits, the pile-14 encode) went through explicit per-action authorization via the documented `_apply-supabase-sql.ts` path. Supabase MCP stays read-only. Credentials are never cat'd or harvested.
4. **One standard at a time, each verified, before the next.** No batch encoding. Each standard gets its own staged deploy + visual gate + engineer sign-off.

---

## Sequencing (do these in order; do NOT skip ahead)
1. **Fix engine-output materialization (§C1) platform-wide, and verify it** (downstream consumer resolves the real value from a persisted row).
2. **Write the encoder skill from this document** (turn §A/§B/§D into the skill; §A3 tagged-field-list output; §A2 auto-derived consumer links).
3. **Apply the skill to standards 2–13, one at a time**, each with the §D discipline and engineer sign-off.

Until step 1 is done and verified, this stays a foundation document. **No applied skill, no other standards.**

---

## Appendix — concrete 138 artifacts (faithful record)
- **No-divergence helper:** `summarizeSurfaceInventory` (`src/lib/eval/surface-types.ts`).
- **Equations:** A138-07 `A_C_preliminary` `b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0`; A138-10 `A_C` `1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3` (recompute-from-carrier); ΣSealed `d1a38110-…0001`, ΣUnsealed `…0002`, C_m `…0003`; `Q_zu` `b39dda00-9a90-46cc-a045-543047ec6498` (whitelisted onto the engine to fix the legacy-sum mis-output).
- **Whitelists (two, must stay in parity):** `whitelist.ts` (form + snapshot), `engine-whitelist.ts` (PDF report); profiles + `displayOnly` in `equation-profiles.ts`.
- **Consumer-link fixes (declared data):** `gw_clearance` and `belastungskategorie` each gained `A138-04` (standard-wide).
- **Honesty outcomes:** REQ-03 red (uncertified literaturwert, unlinked); REQ-04 red (0,5 m < 1,0 m, now on the real value); REQ-07 green (BK_I genuinely assigned); `simple_method_applicable` reverted to unset.
- **Gate:** `approval-gate.ts` (own + active + `is_required` + empty → missing); fires on `engineer_approve` in `worksheet-transition.ts`.
- **Related memory/specs:** engine-output-materialization-gap; single-source-derivation-invariant; a138-closeout-open-items; documented-deviation design (`docs/superpowers/specs/2026-06-06-documented-deviation-design.md`).
