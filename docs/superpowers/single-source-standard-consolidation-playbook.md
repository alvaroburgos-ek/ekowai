# Single-Source Standard Consolidation — Reusable Playbook

> **For a fresh agent with no prior context.** This generalizes the pattern proven on **DWA-A 138-1** (surface inventory + Tabelle 9 runoff coefficients) so it can be applied to **any** EKOWAI-Wizard standard. It separates the **reusable mechanism** (copy this) from the **per-standard content** (do NOT copy — re-derive per standard). It is written to later fold into the `regulatory-standard-encoder` skill as the post-encode "wiring + deploy" phase.

Companion rule this implements: **[single-source-derivation-invariant]** (memory). Read that first — this playbook is its concrete realization.

---

## 0. When to use this

Use when a standard has **derived values that must come from one place** but currently are (a) free-typed, (b) produced in two worksheets, and/or (c) not flowing to the worksheets that consume them. Symptoms: a coefficient typed by hand instead of chosen from the standard's table; the same symbol (e.g. a design area, a mean coefficient) "produced" on two worksheets; downstream worksheets showing a derived value as missing/blank; a duplicate empty input that mirrors a real one.

The goal state: **one worksheet owns each datum; everyone else inherits it by reference; reference-table values are chosen via an accessor, never typed; downstream blanks with a cause when the source isn't ready.**

---

## 1. The invariant (the non-negotiable core)

1. **Single owner per datum.** Each coefficient / area / derived value is produced by exactly ONE worksheet — the one where the underlying data is entered.
2. **Inherit by reference, never re-enter or recompute.** Consumers inherit via the existing same-symbol / `consumer_worksheets` mechanism; they never re-type or run a second copy of the math.
3. **Blank with an upstream-cause when the source isn't final.** A downstream derived value blanks out *with a reason* ("Quelle <WS> nicht final (n/m …)") instead of showing stale or independently-recomputed numbers.
4. **Reference/table values come from the standard's tables via a single accessor, never free-typed.** Engineers select a table row; deviations are an explicit, audited override that keeps the original tabular value visible.
5. **Mirror the standard's structure.** Equation cards, symbols, and clause references follow the guideline's own numbering so the encoded form stays traceable to the source.
6. **Single active producer or the engine blanks it.** The eval engine's ambiguity guard refuses to compute a symbol that has >1 active producing field in the standard. Consolidation MUST end with exactly one active producing field per symbol.

---

## 2. Content vs. mechanism (read this before copying anything)

| **CONTENT — per standard, do NOT copy** | **MECHANISM — generalizes, copy the shape** |
|---|---|
| The actual equations: formulas, equation **UUIDs**, equation numbers (`Gl. 2`, `2c`…) | The engine wiring: aggregator-registry keyed by equation id; per-equation write-back; whitelist keys `WSCODE:EQNUM` |
| The table values (e.g. the 30 Tab. 9 coefficient triples) | The **accessor** pattern: a typed table behind `getX()/lookupX()`, tagged `standard`+`edition` |
| Field symbols/labels, worksheet codes, the consumer set | The **row shape**: selected-key + effective-values + override flag; `kind`/original-pair/`complete` **derived, never stored** |
| The migration's explicit legacy-label map (e.g. `asphalt → schwarzdecke_asphalt`) | The **migration logic**: explicit map → unique-coefficient match → else flag-for-reselection (never silently change a stored value) |
| Which worksheet is the owner, which are consumers | The **invariant** (§1), the **3-plan structure** (§4), the **deploy runbook** (§5) |

**Rule of thumb:** if it names a coefficient, a formula, a UUID, a symbol, or a worksheet code → it's content, re-derive it from the standard. If it's a function shape, a file's role, an ordering, or a check → it's mechanism, reuse it.

---

## 3. The reusable mechanisms (standard-agnostic), with code anchors

All paths are in this repo. For a new standard you write the **analogous** content into these same seams; you do **not** restructure them.

### 3a. Accessor-backed table picker (the "Tab. 9 picker")
- **Module:** a constant table behind accessors — see `src/lib/eval/tab9.ts` (`getTab9Entries()`, `lookupTab9(value)`). Each entry is tagged `standard`/`edition` so a future `regulation_tables` DB table can swap in behind the accessor with **zero caller changes**.
- **Rule:** callers (picker, backfill, kind/derivations, migration) use **only** the accessors — never import the raw array.
- **Editor:** a per-row `<select>` (grouped) that, on selection, **auto-fills the effective values read-only** and offers an explicit **"abweichend wählen" override** that makes them editable, sets an override flag, and keeps the original tabular pair visible for audit. See `src/components/worksheet/surface-inventory-editor.tsx`.
- **Generalize:** new standard → new `<thing>.ts` accessor module + the same editor shape pointed at its carrier field.

### 3b. Row shape + unique-match-or-flag migration
- **Shape** (`src/lib/eval/surface-inventory.ts`): stored row = `{ id, label, <selected_table_key>, <inputs…>, <effective coeffs…>, coeff_override }`. Everything else — the `kind`/category, the original table pair, "mismatch", "complete" — is **derived via the accessor**, never stored.
- **Normalizer** = one shared parse/migration function used by **both** the editor and the engine (so they can't diverge), idempotent, runs lazily on load:
  - explicit legacy-label map → ;
  - else **unique** coefficient match (a stored pair that matches **exactly one** table entry) → auto-map;
  - **ambiguous** (matches >1 entry) or unmapped → leave the table-key null, **preserve** stored values, flag "neu wählen", and mark the row **not complete**.
  - **Never silently change a stored coefficient.** Only backfill a *missing* paired value; surface a stored-vs-table mismatch as an audited override.
- **Generalize:** same normalizer logic; only the legacy-label map and the table are per-standard.

### 3c. Single-producer consolidation (retire duplicate, repoint consumers)
- When a symbol is produced on two worksheets (the classic violation), pick the **owner** (where the source data lives), and:
  - add the producer field(s) + equation(s) on the owner;
  - **repoint the consumer set** onto the owner's field (`consumer_worksheets`);
  - **retire the other producer**: delete its equations, set its producing fields `active=false`.
  - End state check (§1.6): exactly **one** active producing field per symbol.
- DB topology lives in `fields` (`symbol`, `consumer_worksheets`, `active`) and `equations` (`output_symbol`, `equation_number`, `input_symbols`). Equations have **no `active` column** → retire = DELETE rows + drop from the whitelist.

### 3d. The engine wiring (how derived values compute)
- **Aggregator registry** (`src/lib/eval/aggregators.ts`): `Record<equationId, Aggregator>`, dispatched in `src/lib/eval/formula.ts` by `req.equationId`. Σ-over-rows math lives in an `Aggregator`; flat formulas evaluate directly.
- **One equation → one output, write-back is per-equation** (`src/lib/eval/use-equation-engine.ts`): a worksheet can have several producer equations, each writing a different output field. The hook builds the per-equation aggregator **context** (e.g. `{ <carrierName>: carrier }`) for the producer's equation ids and reads the carrier via the shared normalizer; `consumedSymbolsFor` widens the consumed-symbol set for aggregator equations so the ambiguity guard sees the carrier.
- **Whitelist** (`src/lib/eval/whitelist.ts` AND `src/lib/eval/engine-whitelist.ts` — update BOTH) gates which `WSCODE:EQNUM` the engine computes.
- **Single shared summary helper** (e.g. `summarizeSurfaces`) is the ONLY place the sums live — the client engine, the report path, the snapshot path, the save-materialization, and the backfill ALL call it. No re-implementation anywhere.

### 3e. Upstream-cause "Quelle nicht final" messaging (3-state)
- A pure helper (`src/lib/eval/surface-source-state.ts`, `surfaceSourceState(carrier, sourceStatus) → 'missing' | 'incomplete' | 'ok'`) decides whether a consumer renders the inherited value or blanks-with-cause. `ok` only when **all rows complete AND** the source instance is `engineer_approved`/`final`.
- A cross-worksheet loader (`src/lib/db/queries/worksheet.ts → loadSurfaceSource`) fetches the source worksheet's **status + carrier** for the consumer's server component (the standard inherited-fields path doesn't carry instance status).
- A tiny banner component (`src/components/worksheet/surface-source-banner.tsx`) renders the cause; wired in `worksheet-form.tsx` above the inherited-values panel.
- **GATE THE VALUE, NOT JUST THE BANNER (learned the hard way on 138 — twice).** A banner alone is decorative — the consumer's inherited value still renders and the engine still computes off it, so the banner ends up claiming "ausgeblendet" above a visible value. Fix: when the source state isn't `ok`, **withhold the derived inherited symbols from the consumer's seeded `initialValues`** (server-side, in the worksheet page) so the value blanks AND the engine can't compute off an unapproved value. See `surfaceWithholdFieldIds` + `SURFACE_DERIVED_SYMBOLS` in `surface-source-state.ts`, applied in the worksheet `page.tsx` after `initialValues` is built; `loadSurfaceSource` returns the `ownerCode`.
  - **CRITICAL gotcha:** gate by the field's own **`inheritedFromWorksheet`** attribute (set on every inherited field by `mergeInheritedFields`), **NOT** by the value-resolution attribution map (`inheritedFromBySymbol`). Once a producer value is **materialized**, the consumer loads that row **by field id** and seeds it via the **local-param path** (`parameters.get(f.id)`), which never populates `inheritedFromBySymbol` — so gating on that map silently misses materialized values and the contradiction returns. The first 138 fix made exactly this mistake; the working gate keys on `inheritedFromWorksheet === ownerCode && symbol ∈ derived-set`, independent of how the value was seeded. Withhold derived symbols only (not atomic inputs inherited from the owner).
  - **Verify the gate against real state, not just unit tests:** a server-component render can't be curl-checked (dev-login 404s on prod), so confirm via (a) helper tests that gate by `inheritedFromWorksheet`, AND (b) a read-only check that the producer is active, lists the consumer, the source status is non-approved, and the value is materialized — then the deployed page WILL withhold it. Don't declare fixed on unit tests alone.
- **Compliance model:** a derived value is **not trustworthy until the source is formally approved/final** — so `ok` requires complete rows AND `engineer_approved`/`final` status, and unapproved ⇒ value withheld downstream. (If a project never formally approves, derived values stay withheld — that's intended; pair it with the approve-with-a-note pattern in §3g.)
- **Generalize:** same helper/loader/banner + the value-withholding; only the message wording and the derived-symbol set are per-standard.

### 3g. Approve-with-a-note (compliance override) — PATTERN TO BUILD (separate plan, not yet implemented)
A reusable compliance capability every guideline will want: **an engineer may approve an item that does not fully comply *only if* they attach a justification note, and that note becomes part of the audit trail.** This is the human-judgment escape hatch on top of the strict single-source gating (§3e): strict by default (unapproved/non-compliant ⇒ value withheld / gate blocks), overridable with a recorded, attributable justification. Likely seams: `compliance_requirements.requires_attestation` + the `audit_status`/`audited_by`/`audited_at`/`audit_notes` columns already on that table, and the worksheet approval transition (`worksheet-transition.ts` / `state-machine.ts`) — an `engineer_approved`-with-note variant that persists the note to the audit log. **Standard-agnostic.** Do NOT build it inside a consolidation; give it its own small plan after the first standard is confirmed clean, then every guideline inherits it.

### 3f. Server-side materialization + report/snapshot path rewiring
- **Why:** engine outputs are computed client-side and only persist to `project_parameters` when the engineer saves. Downstream consumers + the PDF/snapshot read that stored row, so derived values must be **materialized server-side**.
- **On save** (`src/lib/actions/worksheet.ts → saveWorksheet`): when the carrier field is among the saved fields, recompute via the shared helper and **UPSERT the derived `project_parameters` rows** (`source_type='derived'`, conflict on `(project_id, field_id)`, write `null` to clear stale). Gate it so it only fires for the owner worksheet.
- **Report + snapshot** (`src/lib/eval/evaluate-for-report.ts`, `src/lib/snapshots/payload.ts`): add the **same** aggregator-context branch the client engine has, so server-rendered A_C/derived values compute from the carrier too. ⚠️ Missing this means the PDF/snapshot value goes blank the moment the whitelist changes — independent of the migration.
- **Backfill** (one-time, for existing projects): a script computes the derived values for projects that already have carrier data and UPSERTs them, so consumers resolve immediately without a manual re-save. Idempotent; stamp `entered_by` from the project's existing carrier row (it's `NOT NULL` FK). NOTE: this self-heals anyway — the first post-deploy **save** of the owner worksheet materializes correctly via the tested code path.

---

## 4. The 3-plan structure (template)

Decompose every consolidation the same way; each plan is independently testable.

- **Plan 1 — Foundation (no DB/engine).** Accessor module + row shape + migrating normalizer + the picker editor. Pure client + pure functions → fully unit-testable. Ships nothing user-visible beyond the editor.
- **Plan 2 — Production + Consumer.** Shared summary helper; aggregators wired to the **owner's** equation ids; DB migration (add owner producer fields/equations, repoint output, repoint the consumer set, retire the duplicate producer, deactivate its fields); whitelist updates; consumer UI (read-only mirror, retire the duplicate editor, upstream-cause banner); cross-worksheet source loader. **Migration written but NOT applied** until deploy.
- **Plan 3 — Deploy slice.** Server-side materialization on save; report + snapshot path rewiring; one-time backfill; sweep deferred minors; the **deploy runbook** (§5).

Execute each plan **subagent-driven** (implementer + spec/quality review per task, then a whole-branch review). Keep an SDD ledger (`.superpowers/sdd/progress.md`) so progress survives compaction.

---

## 5. Deploy runbook (template)

The producer moves from one worksheet to another, so **code and migration are coupled — there is no zero-window ordering.** Minimize and pre-verify.

**Pre-reqs (before any prod write):**
- **Author the rollback SQL FIRST** — and capture the originals first, because the forward migration is **lossy** (e.g. it nulls the old producer's `consumer_worksheets`). The rollback re-inserts the deleted equations, re-activates + restores the old producer's fields/consumers, reverts the repointed output, and deactivates the new producer fields. Keep it in `scripts/` (NOT `supabase/migrations/`, so it's never auto-applied). Code rollback = re-add the old whitelist key + redeploy the prior build.
- **Strengthen verification:** assert the *new* equations exist post-apply (an `ON CONFLICT … DO NOTHING` silently skips on a number collision).

**Order = migration → deploy** (DB matches code the moment the new build goes live; brief blank window between the two). Optionally pre-verify the combined state on a throwaway DB first.

**Steps:**
1. Merge the branch → `main` (+ push). No auto-deploy happens here.
2. **Apply the migration to prod.** Verify (read-only) the single-producer end state.
3. **Deploy** (`vercel --prod`) **and re-point the custom alias** — `vercel --prod` updates the canonical alias only; the user's actual URL is a separate alias that must be re-pointed with `vercel alias set` (see **[reference_ekowai_wizard_deploy]**).
4. **Backfill** existing projects (or rely on first-save materialization).
5. **Smoke-test:** owner worksheet renders the picker + derived value; a consumer inherits it; one PDF renders it.

**Safety:** keep the rollback ready before step 2; stop and roll back on any failed verification.

---

## 6. Known-open items on 138 — status (resolved 2026-06-26)

- **"Quelle nicht final at 3/3" banner — RESOLVED.** Root cause: the banner was decorative; the value/engine weren't gated, so the banner contradicted a visible value. Fixed by **gating the value** (§3e: `surfaceWithholdFieldIds` withholds derived inherited symbols when state ≠ `ok`). The 3/3-but-draft case is now *correct*: data entered but not approved ⇒ value withheld + banner accurate. **When generalizing, copy the value-gating, not just the banner.**
- **REQ-06 — was a REAL bug (json-carrier gate lookup), now fixed 2026-06-26.**
  - `A138-REQ-06` (`surface_inventory IS NOT NULL`, severity `block`): it *did* block approval despite a populated 3/3 carrier. **Root cause:** the gate's symbol→value lookup **skipped `json`-carrier fields** in BOTH the client (`compliance-block.tsx`) and the server (`approval-gate.ts` `extractValue`) — so any `json` symbol resolved to "absent" and every `IS NOT NULL`/`IS NOT EMPTY` gate over a carrier failed regardless of content.
  - **Fix (general, applies to every standard):** a shared `jsonConditionValue(json)` in `evaluate.ts` maps a carrier to a presence marker — populated (`{rows:[…]}` non-empty, non-empty array/object) ⇒ `'present'`; null/empty ⇒ absent (gate still correctly fails on an *empty* carrier). Wired into both lookups. ⇒ **Lesson: any block-gate whose condition references a `json`-carrier symbol needs the carrier mapped to a presence marker; never let `json` fields silently resolve to undefined.**
  - **Correction to the prior note here:** an earlier draft dismissed REQ-06 as "a generic gate-evaluator concern, not caused by this work." That was wrong — it was a real, approval-blocking evaluator bug. Verify gates by actually evaluating them against prod data, not by assuming "the carrier is untouched, so it clears."
- **`A_C_preliminary` — orphaned old-output field after repointing a derived equation (retired 2026-06-26).** The consolidation repointed Gl. 2 output `A_C_preliminary` → `A_C` (canonical). That left `A_C_preliminary` with **no producer** yet still `is_required=true` → it blocked approval as a "missing required input." ⇒ **Lesson (apply everywhere): when you repoint an equation's output symbol during consolidation, RETIRE the old output field** (`active=false, is_required=false, consumer_worksheets=NULL`) in the same migration. Do NOT "make it derived" — that re-creates the double-production the consolidation just removed. Enumerate every field that *was* an equation output before the repoint and confirm each still has a producer or is retired.
- **REQ-22 — scope lesson (still open class).** `A138-REQ-22` (`IF flood_check_trigger THEN V_Rueck IS NOT NULL`): depends on **V_Rück**, a *different* derived value (the Gl. 10 flood path) that this consolidation **did not materialize**. ⇒ **Scope lesson (apply everywhere): materialize EVERY derived value a gate reads, not just the headline one.** When consolidating a standard, enumerate its block-severity `compliance_requirements` conditions and ensure each derived symbol they reference is materialized (§3f), or those gates won't clear.

---

## 7. Hard-won infrastructure lessons (this machine / repo)

- **Worktree-per-guideline isolation.** Do each guideline in its own git worktree AND its own local DB. Never share the data layer with another track (e.g. the VSME track has its own worktree + local Supabase stack; 138 must not touch it). Branch each off **`main`** only.
- **Read-only Supabase MCP is the guardrail.** The MCP is `--read-only` by design — use it for all reads/verification; it cannot (and must not be tricked into) writing.
- **Prod writes go via the Management-API PAT**, from an **explicit env var** (`SUPABASE_ACCESS_TOKEN`). The safety classifier will (correctly) **block**: scanning `~/.claude.json` for the token, probing env-var names to find it, and **writing hand-computed values straight into prod**. So: apply **reviewed migration files** (not ad-hoc SQL), and prefer the **real materialization/save path** over hand-written value SQL. The Management-API URL hardcodes the project ref → it can only hit prod, never local `54322`.
- **Migrations are hand-applied** (POST the `.sql` to `https://api.supabase.com/v1/projects/<ref>/database/query`). They are **not** registered in Supabase's migration history → **Supabase branching is useless here** (it rebuilds a branch from the ~3 registered migrations, not the real schema). Don't rely on `create_branch` for a faithful copy.
- **Docker is only reachable inside WSL** on this machine (no Docker Desktop); Windows can't reach WSL-published container ports; the `supabase/postgres` image won't run standalone; the schema is split across **drizzle** migrations (core tables) + **supabase** migrations (the DB-driven tables, needing supabase roles/RLS). ⇒ faithful local reconstruction is fragile; budget for it or skip it.
- **`/api/dev/login` returns 404 on production** (`VERCEL_ENV=production`) → you cannot curl-authenticate prod. Authenticated UI checks must be done in-browser by the user.

---

## 8. How to fold into the `regulatory-standard-encoder` skill

This playbook is the **post-encode wiring + deploy phase**. The encoder (Pass3c) produces **content** — equations, tables, fields, compliance — into the DB. This playbook then enforces the **single-source derivation** over that content: pick the owner, add the accessor + picker, consolidate duplicate producers, wire materialization, and deploy. When folding in: keep §1 (invariant) and §3 (mechanisms) as the skill body; treat §2 as the guardrail against copying content; ship §4–§5 as the execution template; and carry §6–§7 as "verify/known-traps" notes.

**Reference implementation:** DWA-A 138-1, branch `feat/a138-07-surface-singlesource` (merged to `main` `805686d`), specs/plans in `docs/superpowers/specs/2026-06-25-a138-07-…` and `docs/superpowers/plans/2026-06-25-a138-07-tab9-plan-{1,2,3}-…`, rollback `scripts/rollback-20260625170000-a138-singlesource.sql`.

---

## 9. Post-approval write-lock — STANDING integrity requirement (standard-agnostic) — FIXED + LIVE 2026-06-27

> **Status update:** the lock described below is now BUILT + deployed (`origin/main` `294c89d`): `saveWorksheet` refuses writes when `instance.status ∈ {engineer_approved, final}`, demanding an explicit `reopen → draft` first; UI mirrors it. Confirmed in use 2026-06-29 — the A138-07 materialization repair on PLT-HS-01 only landed after a `reopen → save → re-finalize` (a save without reopen was correctly blocked). The requirement text below is kept as the standing spec every guideline inherits.

**Requirement (every guideline needs it):** once a worksheet reaches an approved state (`engineer_approved` or `final`), its data must be **immutable** — editable only after an explicit `reopen` that demotes it to `draft`. Otherwise an approved record can be altered under its own sign-off, and single-source **consumers inherit post-approval changes** from a producer they believe is frozen (e.g. A138-10 inheriting `A_C`/`A_E_ba`/`A_C_sealed` from a *final* A138-07 that was edited after finalization). This is exactly why single-source makes the lock load-bearing: an unlocked producer silently rewrites every consumer.

**Confirmed current behavior (read-only audit 2026-06-26, repo `ekowai-wizard`) — NOT enforced:**
- **State machine (`src/lib/state-machine.ts`) is correct** but governs **status transitions only**: from `final` only `reopen`(→draft)/`deactivate`; from `engineer_approved` only `finalize`/`reopen`/`deactivate`. `transitionWorksheet` (`src/lib/actions/worksheet-transition.ts`) properly guards via `nextStatus()` + `checkApprovalGate` + compare-and-set.
- **The data-write path does NOT consult it.** `saveWorksheet` (`src/lib/actions/worksheet.ts`) checks auth + org-membership + field-template scope, then writes `project_parameters` (field values + `surface_inventory` + materialized derived rows) **unconditionally** (the `tx.insert(projectParameters)` ~L215) with **no `status` guard**. It reads `instance.status` only for a *post-commit* narrow auto-reopen (~L304) that fires **only for `engineer_approved`** and **only when the edit introduces a new block-severity violation** — it never blocks the edit, does nothing on benign edits, and **does not cover `final` at all**.
- **No UI lock either:** `worksheet-form.tsx` auto-saves on change (`void flush(saveWorksheet)`); `dynamic-field.tsx` sets `readOnly` only for *computed* fields — no status-based disabling. A `final` worksheet's inputs are editable and auto-persist.

**The fix shape (now built):** enforce the lock **server-side in `saveWorksheet`** (the real gate), not just the UI: refuse the write when `instance.status ∈ {engineer_approved, final}` (return an error telling the engineer to Reopen first), so editing an approved record is impossible without the explicit `reopen` transition. Mirror the lock in the UI (disable inputs / show a Reopen prompt) for UX, but the server check is the integrity boundary. Add a test asserting a save against an `engineer_approved`/`final` instance is rejected. Apply once, centrally (it's standard-agnostic — `saveWorksheet` is shared by all guidelines). Consider whether the existing narrow auto-reopen (L298–351) should be removed/subsumed once a hard lock exists.

---

## 10. The pattern FAMILY is general — audit a new guideline, then apply what fits

This playbook started as "single-source consolidation," but it is **one of a family of standard-agnostic patterns** proven on DWA-A 138-1. Every one is a reusable *mechanism* (copy the shape) carrying *content* that must be re-derived per guideline (§2). When you onboard or audit ANY new guideline (VSME, a new DIN/ISO/EN/FLL/VDI), do **not** assume which apply — **audit the guideline's own source document**, decide which patterns are warranted, and add the constructive update only where the source warrants it.

### 10a. The proven patterns (mechanism → where it lives → what it fixes)

| Pattern | Mechanism / code anchors | The defect it removes |
|---|---|---|
| **Single-source consolidation** | §1–§5 of this playbook; aggregator-registry + `consumer_worksheets` + ambiguity guard | Same datum produced in >1 worksheet, free-typed, or not flowing to consumers |
| **Predefined-table accessor** | `src/lib/eval/predefined-table-accessor.ts` (`lookupAccessor`, `ACCESSOR_REGISTRY`, `accessorSourceState`); the Tab. 9 instance `src/lib/eval/tab9.ts` | A value that must come from a standard's table being free-typed instead of *selected by key → derived* |
| **Multi-table / source layer** | `src/lib/eval/rainfall-tables.ts` (`normalizeRainfallCarrier`, `resolveSelectedTable`) + `RainfallTablesEditor`/`RainfallTableSelector` + per-facility `rainfall_table_ref` field (migration `20260628120000`) + resolution in `use-equation-engine`/`evaluate-for-report`/`snapshots/payload` | A project needs MULTIPLE source-tagged tables (grid cells / editions) and each consumer must pick WHICH (table id only — never the value) |
| **Governing-iteration engine** | `src/lib/eval/governing-duration.ts` (`iterateGoverningDuration`, `fixedDurationIntensity`, `GOVERNING_PROFILES`); Gl.8 unified in `aggregators.ts` | A value the standard prescribes as an *iteration result* (argmax over a stepped parameter) being free-typed; one shared engine + per-facility sizing profile, fixed-path for the exception |
| **Write-lock + derived materialization** | §9 (server-side `saveWorksheet` status guard); `materialize-surfaces.ts` + the "persist produced outputs as `source_type='derived'`" fix | Approved records editable under their own sign-off; engine outputs displayed but never persisted, so consumers read "fehlend" |

These compose: a datum is *selected* (accessor / table-ref), *derived* (single producer / governing engine), *materialized* (`derived` rows), *frozen* (write-lock), and *inherited by reference* (single-source). Selections are always inputs; computed values always derive; selecting never replaces the calc. (Companion: **[single-source-derivation-invariant]**.)

### 10b. Audit → apply-proven-patterns checklist (actionable for build subagents)

Run this per new/edited guideline. **Ground every "yes" in the guideline's actual source** — quote the clause; never apply a pattern by analogy alone.

- [ ] **Source in hand.** Have the real source doc (PDF/MD in `Desktop/Guidelines/`, or `audit-reports/<STANDARD>/`). The audit is read-against-source, not against the encoded DB alone (the encoding may itself be wrong).
- [ ] **Single-source sweep.** Any symbol produced by >1 worksheet, free-typed but defined by a formula, or consumed-but-not-flowing? → classify atomic vs derived; make derived read-only via one registered equation + shared helper; register `consumer_worksheets`. (§1–§3c)
- [ ] **Predefined-table accessor.** Any value the source says comes from a *table keyed by a selection* (material/class/coefficient table)? → accessor + picker, tagged `standard`+`edition`; never free-typed. **Guard:** only if the source treats it as a free key lookup — NOT if it's an iteration/fixed result (see next). (§3a, accessor module)
- [ ] **Multi-table / source layer.** Can a project legitimately hold MORE THAN ONE such table (grid cells, local vs national edition, scenarios)? → collection-in-one-field + per-consumer table-ref (id only) + resolution boundary; legacy single-table normalizes to primary. (§10a row 3)
- [ ] **Governing-iteration.** Does the source prescribe a value as the result of *iterating a stepped parameter and taking the governing case* (max/critical)? → derive via the shared engine + a per-facility sizing profile from the source equation; fixed-path for any prescribed-step exception. **Never** expose it as a free pick (that contradicts the method). Confirm the sizing formulation against the source (watch parameter-coupled geometry). (§10a row 4)
- [ ] **Materialization.** Does every block-severity gate read a value that is actually persisted? → materialize EVERY derived value a gate reads as `source_type='derived'` on save (not just the headline one). (§3f, §6)
- [ ] **Write-lock.** Inherited automatically — verify the standard's approved worksheets are immutable without reopen (it's central in `saveWorksheet`, so it already applies; just confirm the new worksheets' statuses transition correctly). (§9)
- [ ] **Output a per-guideline matrix.** For each pattern: applies? (source citation) · constructive task (or "n/a, why") · owner worksheet/field/migration. This matrix IS the build backlog; each task then follows §4 (3-plan) + §5 (deploy runbook), branch-isolated, written-not-applied migration, rollback authored.
- [ ] **No silent skips.** If a pattern *looks* applicable but the source doesn't warrant it (e.g. r_D(n) is iteration-governed, so a free-pick accessor is WRONG), record the explicit "considered, rejected, because <clause>" — that decision is as valuable as an applied pattern.

**Reference implementations to copy the shape from:** single-source — `feat/a138-07-surface-singlesource` (merged `805686d`); accessor — `feat/kostra-rdn-accessor`; multi-table — `feat/rainfall-multi-table` (Piece 2, live 2026-06-29); governing engine — `feat/governing-duration-engine` (Piece 1); write-lock/materialization — `origin/main` `294c89d`.
