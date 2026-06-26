# Worksheet Post-Approval Write-Lock — Design

**Date:** 2026-06-26 · **Author:** Alvaro (with Claude) · **Status:** approved, ready for planning

## Problem

Once a worksheet is approved (`engineer_approved`) or final (`final`), its data must be immutable — editable only after an explicit **Reopen → draft**. Today it is not: an approved record can be altered under its own sign-off, and single-source **consumers inherit post-approval changes** from a producer they believe is frozen (e.g. A138-10 inheriting `A_C`/`A_E_ba`/`A_C_sealed` from a *final* A138-07 edited after finalization). Single-source makes this load-bearing — an unlocked producer silently rewrites every consumer.

### Confirmed current behavior (read-only audit 2026-06-26)
- `src/lib/state-machine.ts` is correct but governs **status transitions only**: from `final` only `reopen`(→draft)/`deactivate`; from `engineer_approved` only `finalize`/`reopen`/`deactivate`. `transitionWorksheet` (`src/lib/actions/worksheet-transition.ts`) properly guards transitions.
- **The data-write path never consults it.** `saveWorksheet` (`src/lib/actions/worksheet.ts`) checks auth + org-membership + field-template scope, then writes `project_parameters` (field values + `surface_inventory` + materialized derived rows) **unconditionally** (`tx.insert(projectParameters)` ~L215). No `status` guard. It reads `instance.status` only for a *post-commit* narrow auto-reopen (~L298–351) that fires **only for `engineer_approved`** and **only when the edit introduces a new block-severity violation** — never blocks the edit, does nothing on benign edits, and **does not cover `final`**.
- **Second write path:** `src/lib/actions/citations.ts` (`addCitation`/`removeCitation`) also writes `project_parameters` (`citation_sources` provenance), with no status guard. (`src/lib/actions/overrides.ts` records audit/override metadata — it does **not** write `project_parameters` values — so it is out of scope.)
- **No UI lock:** `worksheet-form.tsx` auto-saves on change (`void flush(saveWorksheet)`); `dynamic-field.tsx` sets `readOnly` only for *computed* fields. A `final` worksheet's inputs are editable and auto-persist.

## Goal

Make `engineer_approved` and `final` worksheets immutable at the data layer, enforced **server-side** (the integrity boundary) and mirrored in the **UI** (UX). Standard-agnostic: lives entirely in shared core; no per-guideline code.

## Decisions

1. **Deny-by-default allowlist.** A worksheet is editable only in `draft` or `submitted_for_review`. Everything else is locked — this covers `engineer_approved` + `final` (the requirement) and, correctly, `deactivated` (reactivate→draft first). Any status added later defaults to locked.
2. **Cover every value-write path.** Guard both `saveWorksheet` and `citations.ts` — a half-freeze is not a freeze. (`overrides.ts` excluded: not a `project_parameters` value-write.)
3. **DB-level enforcement (trigger/RLS) is deferred** — the app's shared write actions are the single surface; revisit only if non-app writers become a concern.

## Architecture

### Unit 1 — `isWorksheetEditable` (pure helper, `src/lib/state-machine.ts`)
```ts
const EDITABLE_STATUSES = new Set<WorksheetStatus>(['draft', 'submitted_for_review']);
/** Data edits are allowed only in these states; every other status is locked
 *  (deny-by-default) and requires an explicit `reopen` → draft first. */
export function isWorksheetEditable(status: WorksheetStatus): boolean {
  return EDITABLE_STATUSES.has(status);
}
```
What it does: maps a status to whether worksheet DATA may be written. Depends on nothing. Testable in isolation. The state machine stays the single source of truth for both transitions and editability.

### Unit 2 — server guard in `saveWorksheet` (`src/lib/actions/worksheet.ts`)
Immediately after the instance load (it already selects `status`), before any write:
```ts
if (!isWorksheetEditable(instance.status)) {
  return { ok: false, error: 'Arbeitsblatt ist genehmigt/final und schreibgeschützt — zum Bearbeiten zuerst „Wieder öffnen".' };
}
```
This refuses field values, `surface_inventory`, and the materialized derived rows in one place. Return shape matches the existing `{ ok: false, error }` early returns (auth/access).

### Unit 3 — remove the dead auto-reopen (`worksheet.ts:298–351`)
With saves to `engineer_approved` rejected up front, the post-commit auto-reopen is unreachable. Remove it plus any imports/helpers it solely used (`approvalEvents` import, `checkApprovalGate` call inside this block, etc. — only those no longer referenced elsewhere in the file). It never caught cross-worksheet drift, so nothing is lost.

### Unit 4 — server guard in `citations.ts` (`addCitation` / `removeCitation`)
Each resolves the field's worksheet-instance status (the existing field→`worksheetInstances` join is already present) and rejects when locked:
```ts
if (!isWorksheetEditable(status)) {
  return { ok: false, error: 'Arbeitsblatt ist genehmigt/final und schreibgeschützt — Quellen können nicht geändert werden.' };
}
```
Return shape matches each action's existing result type.

### Unit 5 — UI mirror (`worksheet-form.tsx` + `dynamic-field.tsx`)
- `const locked = !isWorksheetEditable(instance.status)`.
- When `locked`: **suppress the auto-save flush** (guard the `void flush(saveWorksheet)` effect) so the engine's computed write-backs don't spam rejected saves; render inputs read-only/disabled; show a banner: *"Schreibgeschützt (genehmigt/final) — zum Bearbeiten „Wieder öffnen"."* The existing **Reopen** action (already surfaced by `userActionsFor` for `engineer_approved`/`final`) is the unlock path. The server guard remains the integrity boundary; the UI is UX.

## Data flow

Editable statuses (`draft`, `submitted_for_review`): unchanged. Locked statuses: every value-write action returns `ok:false` with a German "reopen first" message; the form prevents the attempt and signals read-only.

## Error handling

Server actions return `{ ok: false, error }` (German, instructs Reopen). The form surfaces the message and, by suppressing auto-save + disabling inputs, prevents the attempt in the first place.

## Testing

- `state-machine.test.ts`: `isWorksheetEditable` → true for `draft`/`submitted_for_review`; false for `engineer_approved`/`final`/`deactivated`.
- `saveWorksheet`: a save against an `engineer_approved`/`final` instance returns `ok:false` and writes nothing. (Caveat: the full DB-backed `worksheet.test.ts` needs a dev DB; if unrunnable, add a focused guard-level test + assert the helper wiring — same approach used for the area-consolidation save test.)
- `citations`: `addCitation`/`removeCitation` against a locked worksheet return `ok:false`.
- UI: the form renders read-only + the lock banner and fires no auto-save when `locked`; editable when `draft`.

## Scope / out of scope

- **In:** shared core only — `state-machine.ts`, `worksheet.ts`, `citations.ts`, `worksheet-form.tsx`, `dynamic-field.tsx`. Standard-agnostic.
- **Out:** `overrides.ts` (not a value-write); DB-level enforcement (deferred); any per-guideline logic; VSME/A138-specific code.
- **Branch/deploy:** built on a CLEAN 138 base (`feat/worksheet-write-lock` off `e6f5fa0`+playbook §9, not VSME-laden `main`). Build + test only; **pause before any prod cutover** — the branch/deploy base (given VSME re-landed on `main`) is settled separately with the user.
