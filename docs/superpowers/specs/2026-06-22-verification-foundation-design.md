# Verification Foundation — Unified Model + Canonical "100%"

- **Date:** 2026-06-22
- **Status:** Approved (design) — pending spec review
- **Sub-project:** 1 of 6 in the "100% verified compliance" program
- **Owner:** Alvaro (leadership@ekowai.com)
- **Codebase:** `C:\Users\Ekowai\projects\ekowai-wizard` (Next.js 15 + Supabase, prod project `vadsmshzebefjreqcicl`)

## Context

EKOWAI Wizard certifies regulatory standards (DWA, FLL, DIN, …) by verifying their encoded
content (fields, equations, validation rules, regulation tables, master-per-type, compliance
requirements) against the source norm. The product goal is a per-standard **"100% verified
against version X"** badge — the difference between "a database" and "certified compliance" for
a liability-conscious Ingenieurbüro.

Verification today is piecemeal and the data model is fragmented. This sub-project fixes the
**foundation** so that verification is measured correctly across all six content tables, the
data bugs are repaired, and there is a single canonical computation of "is this standard 100%
verified." It builds **no new UI** — it makes the existing gauge honest and whole, and unblocks
every later sub-project (Cockpit, Automated Floor, Computability Gate, Version Lifecycle,
Lock/Regression + Badge).

### Verified current state (live DB + code, 2026-06-22)

The six content tables and how each reaches a standard:

| Table | Links to standard via | `active` flag | Has `verification_*` | Has `audit_*` |
|---|---|---|---|---|
| `fields` | `worksheet_template_id` → `worksheet_templates.standard_id` | yes | yes (full) | yes (full) |
| `equations` | `worksheet_template_id` → … | no | yes (full) | yes (full) |
| `validation_rules` | `standard_id` + `worksheet_template_id` | no | yes (full) | yes (full) |
| `regulation_tables` | `standard_id` | no | status only | status only |
| `master_per_type` | `standard_id` | no | status only | no |
| `compliance_requirements` | `worksheet_template_id` → … | no | **none** | status only |

"full" = `verification_status`, `verified_by_user_id`, `verified_at`, `verification_note`.
"status only" = just `verification_status`.

**Headline bug — two disconnected vocabularies.**
`src/lib/actions/verification.ts:15` defines `const VERIFIED = 'engineer_verified'` and the
per-standard rollup in `src/lib/db/queries/library.ts` counts only
`verification_status = 'engineer_verified'`. But **zero rows in the DB** use that value. Every
actually-verified row uses `verified_against_standard` (written by the encoder/importer). The
in-app gauge is therefore blind to ~99% of the verification work already done, and only counts
`fields` + `equations` — ignoring the other four tables entirely.

**Live `verification_status` vocabulary (engineer truth):**
`imported_unverified`, `needs_engineer_review`, `verified_against_standard`,
`verified_via_cross_reference`, `derived_from_structural_mapping`, `inferred_from_worksheet`.
(The orphan `engineer_verified` is expected by app code but written to no row.)

**Live `audit_status` vocabulary (a separate AI / independent-audit layer):**
`ai_audit_passed`, `pending_independent_audit`, `ai_audit_flagged_minor`,
`ai_audit_flagged_major`, `match`, `not_found`, `corrected_pending_engineer`,
`audit_flagged_source_unsupported`, `NULL`. This is the future "automated floor" precursor —
**not** a duplicate of `verification_status`.

**Column-shift bug:** 28 `regulation_tables` rows have a verbatim quote string sitting in
`verification_status` (e.g. `"Verbatim Tab. 5 Zeile '…' Spalte '…': 'KA0'."`). The string
belongs in `source_quote` (column exists). These rows can never reach a valid status until
remapped.

## Decisions (locked with the user)

1. **Canonical vocabulary:** keep the encoder enum; retire `engineer_verified`. No data
   migration needed (0 rows use it).
2. **`audit_*` family:** keep as a separate machine-check dimension; `verification_status`
   remains the single source of truth for "done." `audit_*` data is left untouched.
3. **"100%" rule:** only `verified_against_standard` OR `verified_via_cross_reference` count.
   `derived_*` / `inferred_*` do **not** count and are treated as review-queue items.
4. **Program order:** Foundation → Cockpit → drive A-138-1 to true 100% → Automated Floor +
   Computability Gate → Version Lifecycle + Lock/Regression + Badge. Each its own
   spec → plan → build, all on Opus 4.8.

## Goals / Non-goals

**Goals**
- One canonical `verification_status` enum, enforced in the DB, used by encoder and app.
- All six content tables carry the same engineer columns.
- The `regulation_tables` column-shift bug fixed and made impossible to recur.
- One canonical computation (`standard_verification_rollup` view) of per-standard,
  per-table, and aggregate %verified plus an `is_certified` boolean.
- The app gauge reads the canonical computation — honest and covering all six tables.

**Non-goals (later sub-projects)**
- Cockpit / review-queue UI, PDF side-by-side, bulk-select tooling.
- Automated floor (Worked-Example Replay, verbatim string-compare auto-promotion).
- Computability gate (equation = verified only if engine-wired + replay passes).
- Version lifecycle (Gelbdruck→Weißdruck diffing), lock/regression, reviewer assignment,
  certifiable badge UI.

## Design

### Component A — Canonical status enum + DB enforcement

The allowed `verification_status` values, with their effect on "done":

| State | Counts as done | Notes |
|---|---|---|
| `verified_against_standard` | ✅ | engineer confirmed against source norm |
| `verified_via_cross_reference` | ✅ | confirmed via another verified standard |
| `needs_engineer_review` | ❌ | in review queue |
| `imported_unverified` | ❌ | fresh import |
| `derived_from_structural_mapping` | ❌ | auto-derived → review |
| `inferred_from_worksheet` | ❌ | auto-inferred → review |

- A single source-of-truth constant module (e.g. `src/lib/verification/status.ts`) exporting
  the enum values, the `DONE_STATES` set, and the default initial state. App code imports from
  here; no string literals scattered across files.
- A Postgres **CHECK constraint** on `verification_status` for each of the six tables, pinning
  it to this set. This is also the permanent fix for the column-shift class of bug — a leaked
  quote string can no longer be inserted.
- Implemented as `text` + `CHECK` (not a Postgres `enum` type) to avoid disruptive type
  migration on live data and keep encoder UPSERTs simple.

### Component B — `audit_*` left as a separate dimension

No schema or data change to `audit_status` / `audit_notes` / `audited_by` / `audited_at`.
Documented as the machine-check dimension that the future Automated Floor sub-project will use
to *propose* (never set) verification. The rollup (Component E) ignores `audit_*` entirely.

### Component C — Schema completion (additive migration)

Bring all six tables to the same engineer-column shape:

- `compliance_requirements`: add `verification_status text`, `verified_by_user_id uuid`,
  `verified_at timestamptz`, `verification_note text`. Backfill
  `verification_status = 'needs_engineer_review'` for all rows (brings the 1351 NULL-audit rows
  into the scheme and into the review queue). `audit_status` retained unchanged.
- `regulation_tables`: add `verified_by_user_id uuid`, `verified_at timestamptz`,
  `verification_note text`.
- `master_per_type`: add `verified_by_user_id uuid`, `verified_at timestamptz`,
  `verification_note text`.

All new columns are nullable (or defaulted), so the migration is non-breaking on live prod.
`verified_by_user_id` references `auth.users(id)` to match `fields`/`equations` (FK or plain
uuid, matching the existing pattern on those tables — verified during implementation).

### Component D — Fix the `regulation_tables` column-shift bug

1. Back up the affected rows to `_backup_regtables_colshift_20260622` (matches the existing
   `_backup_*_20260621` convention).
2. For each row where `verification_status` is a leaked verbatim string (detected by the
   `Verbatim ` prefix / not in the enum): if `source_quote` is empty/NULL, move the string into
   `source_quote`; then set `verification_status = 'needs_engineer_review'`.
3. The Component A CHECK constraint is added **after** this cleanup so all rows are valid.

### Component E — Canonical "100%" computation

A DB view `standard_verification_rollup`, the single source for any "verified %" or badge:

- Granularity: one row per (`standard_id`, `version`, `content_table`) plus an aggregate row
  per (`standard_id`, `version`).
- Per content table: `total`, `verified` (rows with `verification_status IN DONE_STATES`),
  `pct`.
- Denominators: `fields` filters `active = true`; the other five count all rows.
- Aggregate: sum across all six tables; `is_certified` boolean = every table at 100%
  (the "Definition of Done" gate). A table with `total = 0` is treated as 100% (vacuously
  complete) so standards that legitimately have no rows in a table aren't blocked.
- The view joins each table to its standard via the linkage in the table above
  (`fields`/`equations`/`compliance_requirements` through `worksheet_templates`; the rest by
  `standard_id`).

### Component F — Wire the app to the canonical computation

- `src/lib/db/queries/library.ts`: replace the `engineer_verified`, fields+equations-only
  rollup with reads from `standard_verification_rollup`, so the standard-level and
  worksheet-level gauges reflect all six tables and all real verifications. Numbers will drop
  versus today — this is the gauge becoming honest.
- `src/lib/actions/verification.ts`: `VERIFIED` constant → `verified_against_standard`
  (imported from the Component A module). `unverify*` continues to reset to
  `imported_unverified`. Per-row and "verify all fields in worksheet" actions keep working
  with the new value.
- `src/components/worksheet/verify-button.tsx`: its `isVerified` check uses the shared
  `DONE_STATES` instead of the literal `engineer_verified`.

## Data flow

```
encoder/importer ──writes verification_status (canonical enum)──┐
                                                                 ▼
app verify action ──writes verified_against_standard──────►  six content tables
                                                                 │  (CHECK-constrained)
                                                                 ▼
                                            standard_verification_rollup (view)
                                                                 │
                                                                 ▼
                                       library.ts ──► standard/worksheet gauges
```

## Error handling & safety

- **Live prod (221 projects):** every DDL step is additive (nullable/defaulted columns) or a
  guarded data remap with a backup table. No column drops, no type changes to existing data.
- Migration applied as a single Supabase migration (`apply_migration` via MCP, or a numbered
  migration file run through the importer's DB path per `CLAUDE.md`).
- CHECK constraints are added **after** the column-shift cleanup so no existing row violates
  them; if any row still violates, the migration fails loudly rather than silently corrupting.
- The importer already never overwrites `verification_status` — unchanged and re-verified.

## Testing

- Reconcile `standard_verification_rollup` counts against manual SQL per standard for
  A-138-1, A-131, DIN-276, A-226 (known numbers from the analysis) — the view must reproduce
  them under the new denominator definition.
- Unit test for the rollup/`DONE_STATES` logic (which states count, `is_certified` gate,
  `total = 0` → vacuously complete).
- Post-migration assertions: every `verification_status` across all six tables is in the enum;
  the 28 column-shift rows now have `source_quote` populated and a valid status; zero rows use
  `engineer_verified`.
- App smoke: per-row verify writes `verified_against_standard`; gauge updates; "verify all in
  worksheet" still flips rows.

## Rollout

1. Apply migration (columns + backfill + column-shift fix + CHECK constraints) to prod.
2. Ship code change (status module, `library.ts`, `verification.ts`, `verify-button.tsx`).
3. Verify gauges render the honest numbers; spot-check A-138-1.

## Open questions for spec review

- `verified_by_user_id`: FK to `auth.users(id)` vs plain `uuid` — match whatever
  `fields`/`equations` already do (confirm during implementation; no behavior impact).
- Whether the worksheet-level in-page gauge should stay fields+equations (local relevance) while
  only the **standard-level** badge requires all six tables. Current design makes both use the
  view; flag if you want the worksheet gauge to stay narrow.
