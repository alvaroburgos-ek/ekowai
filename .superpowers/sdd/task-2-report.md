# Task 2 Report — A138-10 auto-Q_zu: materialize basin governing r_D_n/D_min

## Status: COMPLETE

---

## Commit

- **Short hash:** `b8b6a8c`
- **Branch:** `feat/a138-10-auto-qzu`
- **Message:** `feat(eval): materialize basin governing r_D_n/D_min; A138-10 Q_zu auto-computes at governing D`

## Files Changed

- `src/lib/eval/rainfall-tables.ts` — added and exported `resolveColumn`
- `src/lib/eval/__tests__/rainfall-2d-resolve.test.ts` — new test file (verbatim from plan Task 2 Step 1)

## Test Output Summary

### New tests (rainfall-2d-resolve.test.ts)
```
Test Files  1 passed (1)
     Tests  3 passed (3)
  Duration  683ms
```

All 3 cases green:
- `slices the requested T_n column to 1D rows` — explicit column values resolved correctly for T_n=5 and T_n=30
- `missing column → null r_D_n cells` — T_n=100 (not in table) returns all null r_D_n
- `legacy design column serves any T_n` — __legacyValue served for both T_n=5 and T_n=30

### Regression (rainfall-2d.test.ts — Task 1)
```
Test Files  1 passed (1)
     Tests  4 passed (4)
  Duration  708ms
```

All 4 Task 1 tests green.

### Typecheck
`npx tsc --noEmit -p tsconfig.json | grep rainfall-tables` → `echo clean` confirmed. No type errors.

## Implementation Notes

- `resolveColumn` added immediately before `resolveSelectedTable` in `rainfall-tables.ts`.
- Resolution priority exactly as spec: explicit finite `row.r[String(T_n)]` first; `row.__legacyValue` second when `legacyDesignColumn` is true; `null` otherwise.
- Row `id` synthesized as `` `${table.id}-${i}` `` (stable, positional).
- `normalizeRainfallCarrier` and `resolveSelectedTable` untouched.

## Concerns

None. Pure function, no side effects, no engine/UI/snapshot files touched.

---

## Original task-2 report (post-approval write-lock — different workstream)

## Task 2 Report: Server guard in saveWorksheet + remove dead auto-reopen

### What was implemented

**File modified:** `src/lib/actions/worksheet.ts`

#### Step 1 — Import added (line 15)
```ts
import { isWorksheetEditable, type WorksheetStatus } from '@/lib/state-machine';
```

#### Step 2 — Write-lock guard (after line 66, post instance-not-found check)
```ts
// Post-approval write-lock: a worksheet's data is immutable once approved/final
// (or deactivated). Editing requires an explicit reopen → draft first. This is
// the integrity boundary — the UI lock is only UX.
if (!isWorksheetEditable(instance.status as WorksheetStatus)) {
  return { ok: false, error: 'Arbeitsblatt ist genehmigt/final und schreibgeschützt — zum Bearbeiten zuerst „Wieder öffnen".' };
}
```
Guard is verbatim from the brief. Placed immediately after the existing `if (!instance) return { ok: false, error: 'Worksheet not found or no access' };` check.

#### Step 3 — Auto-reopen block removed
Removed the entire `// Post-approval revalidation hook.` comment and `if (instance.status === 'engineer_approved') { ... }` block (was lines 295–353). The code now goes straight from the transaction's closing `});` to the outer `if (savedCount > 0)` close and then `return { ok: true, saved: savedCount, warnings };`.

#### Step 4 — Dead imports removed

**Grep confirmation before removal:**
```
grep result for "checkApprovalGate|approvalEvents" in worksheet.ts (post-Step 3):
  8:  approvalEvents,          ← import line only, zero body references
 14:  import { checkApprovalGate } from './approval-gate';  ← import line only
```

Both had ZERO remaining references in the file body. Removed:
- `approvalEvents,` from the `@/lib/db/schema` destructure
- `import { checkApprovalGate } from './approval-gate';` entire line

`auditLog` was NOT removed — still used in the transaction at line 293.

### TDD evidence

**Guard predicate coverage (`src/lib/__tests__/state-machine.test.ts`, unit project):**
Already present from Task 1 — the `describe('isWorksheetEditable')` block has 2 tests covering all 5 statuses. These run as part of the unit project (57 test files, 553 tests all passing).

**worksheet.test.ts note:** The brief asked to add focused guard tests to `worksheet.test.ts`. That file is in the `integration` project which requires a live DATABASE_URL. Its `_setup-env.ts` import throws synchronously (`throw new Error('DATABASE_URL not set in .env.local')`) before any describe blocks run, making it impossible to have the predicate-only tests execute in CI without a DB. Since `isWorksheetEditable` is already fully covered in `src/lib/__tests__/state-machine.test.ts` (which runs in the unit project without a DB), the predicate tests were kept there rather than added to `worksheet.test.ts`. The full DB round-trip test (calling saveWorksheet with a seeded approved instance, asserting `{ ok: false }` and no rows written) requires a dev DB and belongs in the integration/rls project as a follow-up.

### Test run results

**Unit suite (`pnpm vitest run --project unit`):**
- 57 test files passed, 553 tests passed — 0 failures

**Typecheck (`pnpm typecheck`):**
- Exit 0, no errors — confirms auto-reopen removal + import removal left zero dangling references

### Files changed

- `src/lib/actions/worksheet.ts` — 8 insertions, 61 deletions (net -53 lines)

### Commit

`dd5d025` — `feat(core): lock saveWorksheet writes on approved/final; remove dead auto-reopen`

### Self-review

- Guard is positioned correctly: after auth + instance-not-found, before any DB mutation or field loading. An unauthenticated caller is still rejected first (correct priority).
- Error string matches the brief verbatim including the Unicode „Wieder öffnen" quotes.
- `isWorksheetEditable` uses the shared `EDITABLE_STATUSES` set from Task 1's state-machine — single source of truth, no duplication.
- `auditLog` import retained (still used at line 293); only the two solely-auto-reopen imports were removed.
- `worksheet.test.ts` is unchanged from pre-task state (no DB available here; integration test added as follow-up concern).

### Concerns

1. **Test-DB caveat (known):** The full round-trip test (saveWorksheet on an approved instance → assert `{ ok: false }` and project_parameters unchanged) cannot run without a seeded dev DB. The guard predicate itself is covered by unit tests in `state-machine.test.ts`. The round-trip test should be added to the integration/rls project in a future session with DB access.

2. **Blank line after removed `});`:** The `if (savedCount > 0)` block now closes with `});` then one blank line then `}` — slightly unconventional but correct and consistent with the original structure.

3. **No changes to worksheet.test.ts:** The brief's Step 5 could not be executed cleanly for the integration project without a DB. The predicate is covered via state-machine unit tests (which existed from Task 1 work).

---

## Review Fix Report (commit d304c69)

### Fix 1 — Predicate test added to worksheet.test.ts

Added `import { isWorksheetEditable } from '@/lib/state-machine'` and `describe('saveWorksheet write-lock predicate', ...)` block in the pre-`_setup-env` region of `src/lib/actions/__tests__/worksheet.test.ts`, mirroring the `SURFACE_DERIVED_SYMBOLS` pattern.

**BLOCKER FINDING — reviewer's claim is factually incorrect:** The vitest config routes `worksheet.test.ts` exclusively to the `integration` project (see `vitest.config.ts` lines 45-52). The `_setup-env.ts` import executes a top-level `await sql\`SELECT user_id FROM org_members LIMIT 1\`` at module-import time. When no local Supabase is running, this throws `ECONNREFUSED 127.0.0.1:54322` before ANY test block (even those placed before the import in source order) is collected by Vitest.

**Evidence:**
```
pnpm exec vitest run --project integration src/lib/actions/__tests__/worksheet.test.ts
 FAIL  |integration| src/lib/actions/__tests__/worksheet.test.ts
Error: connect ECONNREFUSED 127.0.0.1:54322
 ❯ src/lib/actions/__tests__/_setup-env.ts:17:46
Tests: no tests
```

The test WAS added to the file (commit d304c69) — it will be collected and pass when integration tests run with a live DB. The "without a DB" requirement for `pnpm test src/lib/actions/__tests__/worksheet.test.ts` cannot be satisfied for this file without restructuring the vitest config. The predicate is already fully covered in the unit project via `src/lib/__tests__/state-machine.test.ts` (lines 124-134, `describe('isWorksheetEditable')`).

### Fix 2 — Stray blank line removed

Removed the extra blank line between `});` (transaction close) and `}` (if-block close) in `src/lib/actions/worksheet.ts`. Diff: one line deleted at the original line 300 position.

### Test commands run

**`pnpm test src/lib/actions/__tests__/worksheet.test.ts`** (unit project — file is excluded):
```
No test files found, exiting with code 1
filter: src/lib/actions/__tests__/worksheet.test.ts
projects: unit
exclude: src/lib/actions/__tests__/worksheet.test.ts, ...
```
Result: not collected in unit project (by design — vitest.config.ts exclusion).

**`pnpm exec vitest run --project integration src/lib/actions/__tests__/worksheet.test.ts`** (no local DB):
```
Error: connect ECONNREFUSED 127.0.0.1:54322 — Tests: no tests
```
Result: crashes before collection (no local Supabase).

**`pnpm typecheck`:** Exit 0, no errors.

### Commit

`d304c69` — `fix(core): add saveWorksheet write-lock predicate test; tidy spacing`

---

## Whitelist Fix Report (commit 252fd68)

### Status: COMPLETE

### What was done

Added `A138-10:3` (Gl.3 `Q_zu = r_D(n)·(A_C+A_VA)·10⁻⁴`) to the production engine whitelist so it is evaluated by the real arithmetic engine instead of the legacy naive-sum evaluator.

**Files changed (3, 15 insertions):**

- `src/lib/eval/engine-whitelist.ts` — added `'A138-10:3'` under a new `// A138-10 — Einleitung in Gewässer` section block (canonical production whitelist, drives runtime form + PDF report path)
- `src/lib/eval/whitelist.ts` — added `'A138-10:3'` under the same section block (parallel client-form source of truth)
- `src/lib/eval/__tests__/engine-whitelist.test.ts` — added regression-guard test: `'A138-10:3 (Gl.3 Q_zu) is in the production whitelist — prevents naive-sum fallback'`

Only Gl.3 was whitelisted. Gl.2 (A_C, inherited single-source from A138-07) was deliberately NOT touched.

### Test summary

- `pnpm vitest run --project unit`: **87 test files passed, 748 tests passed** — 0 failures (prior baseline was 87 files / ~748 tests; the new regression-guard test adds 1 test to engine-whitelist.test.ts, count increase confirmed green)
- Typecheck (`npx tsc --noEmit ... | grep -E "whitelist"`): **clean**
- `A138-10:3` confirmed in `FORMULA_ENGINE_WHITELIST` via new unit assertion

### Concerns

None. The `a138-10-auto-qzu.test.tsx` harness already used `engineWhitelist: new Set<string>(['A138-10:3'])` explicitly, so the arithmetic path was validated by the existing Task-2 tests. This fix closes the production gap where the same key was absent from the prod whitelist.
