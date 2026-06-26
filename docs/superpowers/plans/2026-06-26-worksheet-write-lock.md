# Worksheet Post-Approval Write-Lock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `engineer_approved`/`final` worksheets immutable at the data layer — every value-write path refuses writes unless the worksheet is editable (`draft`/`submitted_for_review`), enforced server-side and mirrored in the UI.

**Architecture:** A single pure helper `isWorksheetEditable(status)` in the existing state machine (deny-by-default allowlist) is consulted by every server action that writes `project_parameters` (`saveWorksheet`, `citations`), and by the worksheet form (auto-save gate + read-only inputs + banner). The server checks are the integrity boundary; the UI is UX. The now-unreachable post-commit auto-reopen in `saveWorksheet` is removed.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, TypeScript strict, Drizzle, Supabase Postgres, Vitest 4 + RTL + happy-dom, pnpm.

## Global Constraints

- **Clean 138 base, standard-agnostic, shared core only.** Work in worktree `C:/Users/Ekowai/_wt-write-lock` on branch `feat/worksheet-write-lock` (off `e6f5fa0` + playbook §9; NOT VSME-laden `main`). Touch only: `src/lib/state-machine.ts`, `src/lib/actions/worksheet.ts`, `src/lib/actions/citations.ts`, `src/components/worksheet/worksheet-form.tsx`, `src/components/worksheet/dynamic-field.tsx`, `src/components/worksheet/surface-inventory-editor.tsx`, `src/components/worksheet/kostra-table-editor.tsx`, and their tests. No VSME/A138-specific code, no per-guideline logic.
- **Editable allowlist (deny-by-default):** a worksheet is editable ONLY in `draft` or `submitted_for_review`. Every other status (`engineer_approved`, `final`, `deactivated`) is locked.
- **Cover every value-write path:** `saveWorksheet` AND all three `citations.ts` writers (`addCitation`, `removeCitation`, `attachCitation`). (`overrides.ts` is out of scope — it writes audit/override metadata, not `project_parameters` values.)
- **German user-facing copy.** Lock error message (server): `Arbeitsblatt ist genehmigt/final und schreibgeschützt — zum Bearbeiten zuerst „Wieder öffnen".` Citations variant: `Arbeitsblatt ist genehmigt/final und schreibgeschützt — Quellen können nicht geändert werden.`
- **Do NOT deploy.** Build + test only; pause before any prod cutover (branch/deploy base settled separately given VSME on `main`).
- **Run tests from the worktree** (`cd C:/Users/Ekowai/_wt-write-lock`; node_modules junctioned). `pnpm test <file>` focused; `pnpm test` + `pnpm typecheck` full gate.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/state-machine.ts` | status source of truth | add `isWorksheetEditable` + `EDITABLE_STATUSES` |
| `src/lib/actions/worksheet.ts` | `saveWorksheet` value write | add status guard; remove dead auto-reopen + now-unused imports |
| `src/lib/actions/citations.ts` | citation_sources writes | convert field-in-project check to also return status; guard all 3 writers |
| `src/components/worksheet/worksheet-form.tsx` | form + auto-save | compute `locked`; gate auto-save; banner; pass `readOnly` down |
| `src/components/worksheet/dynamic-field.tsx` | field inputs | add `readOnly` prop; apply to all input controls |
| `src/components/worksheet/surface-inventory-editor.tsx` | Tab.9 editor | add `readOnly` prop; disable controls |
| `src/components/worksheet/kostra-table-editor.tsx` | KOSTRA editor | add `readOnly` prop; disable controls |

---

## Task 1: `isWorksheetEditable` helper

**Files:**
- Modify: `src/lib/state-machine.ts` (after `nextStatus`, ~line 54)
- Test: `src/lib/__tests__/state-machine.test.ts`

**Interfaces:**
- Produces: `export function isWorksheetEditable(status: WorksheetStatus): boolean` — true only for `draft`/`submitted_for_review`.

- [ ] **Step 1: Write failing tests** — add to `src/lib/__tests__/state-machine.test.ts`:

```ts
import { isWorksheetEditable } from '../state-machine';

describe('isWorksheetEditable', () => {
  it('allows edits only in draft and submitted_for_review', () => {
    expect(isWorksheetEditable('draft')).toBe(true);
    expect(isWorksheetEditable('submitted_for_review')).toBe(true);
  });
  it('locks engineer_approved, final, and deactivated (deny-by-default)', () => {
    expect(isWorksheetEditable('engineer_approved')).toBe(false);
    expect(isWorksheetEditable('final')).toBe(false);
    expect(isWorksheetEditable('deactivated')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test src/lib/__tests__/state-machine.test.ts`
  Expected: FAIL (`isWorksheetEditable` is not exported).

- [ ] **Step 3: Implement** — in `src/lib/state-machine.ts`, after the `nextStatus` function (the block ending `return TRANSITIONS[current]?.[event] ?? null;\n}`), add:

```ts
/** Statuses in which a worksheet's DATA may be written. Deny-by-default:
 * any status not listed here is locked and requires an explicit `reopen`
 * (→ draft) before edits. Consulted by every value-write path. */
const EDITABLE_STATUSES = new Set<WorksheetStatus>(['draft', 'submitted_for_review']);

export function isWorksheetEditable(status: WorksheetStatus): boolean {
  return EDITABLE_STATUSES.has(status);
}
```

- [ ] **Step 4: Run to verify pass** — `pnpm test src/lib/__tests__/state-machine.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/state-machine.ts src/lib/__tests__/state-machine.test.ts
git commit -m "feat(core): add isWorksheetEditable deny-by-default status helper"
```

---

## Task 2: Server guard in `saveWorksheet` + remove dead auto-reopen

**Files:**
- Modify: `src/lib/actions/worksheet.ts` (imports ~1-16; guard after ~line 67; remove auto-reopen ~line 294-353)
- Test: `src/lib/actions/__tests__/worksheet.test.ts`

**Interfaces:**
- Consumes: `isWorksheetEditable` (Task 1).
- The `saveWorksheet` result type is `{ ok: false; error: string } | { ok: true; saved: number; warnings: string[] }` — the guard returns the `ok:false` shape (matching the existing auth/access early returns).

- [ ] **Step 1: Add the import** — in `src/lib/actions/worksheet.ts`, add to the imports (after line 16 `import { SURFACE_DERIVED_SYMBOLS } ...`):

```ts
import { isWorksheetEditable, type WorksheetStatus } from '@/lib/state-machine';
```

- [ ] **Step 2: Add the guard** — immediately after the instance-not-found check (the line `if (!instance) return { ok: false, error: 'Worksheet not found or no access' };`), insert:

```ts
  // Post-approval write-lock: a worksheet's data is immutable once approved/final
  // (or deactivated). Editing requires an explicit reopen → draft first. This is
  // the integrity boundary — the UI lock is only UX.
  if (!isWorksheetEditable(instance.status as WorksheetStatus)) {
    return { ok: false, error: 'Arbeitsblatt ist genehmigt/final und schreibgeschützt — zum Bearbeiten zuerst „Wieder öffnen".' };
  }
```

- [ ] **Step 3: Remove the now-unreachable auto-reopen** — delete the post-commit block: the comment starting `// Post-approval revalidation hook.` through the end of its `if (instance.status === 'engineer_approved') { ... }` (currently lines ~294-353). After deletion the code goes straight from the transaction's closing `});` to the outer block's closing `}` and the final `return { ok: true, saved: savedCount, warnings };`. (With saves to `engineer_approved` now rejected up front, this code can never run.)

- [ ] **Step 4: Remove imports left unused by Step 3** — verify with `grep -n "checkApprovalGate\|approvalEvents" src/lib/actions/worksheet.ts` that each now appears ZERO times in the file body. Then delete `approvalEvents,` from the `@/lib/db/schema` import (line ~8) and the line `import { checkApprovalGate } from './approval-gate';` (line ~14). (`auditLog` stays — still used by the main write.)

- [ ] **Step 5: Write the test** — add to `src/lib/actions/__tests__/worksheet.test.ts`. Read the file first to mirror its existing harness/mocking. If its tests run against a live dev DB (unavailable here), instead add a focused guard test that the locked branch is taken — assert `isWorksheetEditable` returns false for `engineer_approved`/`final` (the guard's predicate) AND that the import is wired — and note in the report that the full DB round-trip (a real `saveWorksheet` against a seeded approved instance returning `ok:false` and writing nothing) needs a dev DB. Preferred, if the harness supports it: a test that calls `saveWorksheet` for an instance seeded as `final` and asserts `{ ok: false }` and that `project_parameters` is unchanged.

```ts
// Illustrative focused assertion (use the file's real harness if it has one):
import { isWorksheetEditable } from '@/lib/state-machine';
it('saveWorksheet guard predicate locks approved/final', () => {
  expect(isWorksheetEditable('final')).toBe(false);
  expect(isWorksheetEditable('engineer_approved')).toBe(false);
  expect(isWorksheetEditable('draft')).toBe(true);
});
```

- [ ] **Step 6: Run focused + typecheck** — `pnpm test src/lib/actions/__tests__/worksheet.test.ts` then `pnpm typecheck`
  Expected: PASS; typecheck exit 0 (confirms the auto-reopen removal left no dangling refs).

- [ ] **Step 7: Commit**

```bash
git add src/lib/actions/worksheet.ts src/lib/actions/__tests__/worksheet.test.ts
git commit -m "feat(core): lock saveWorksheet writes on approved/final; remove dead auto-reopen"
```

---

## Task 3: Guard the citations write path

**Files:**
- Modify: `src/lib/actions/citations.ts` (the `assertFieldInProject` helper ~55-71; callers `addCitation` ~88, `removeCitation` ~169, `attachCitation` ~212+)
- Test: `src/lib/actions/__tests__/citations.test.ts` (create if absent)

**Interfaces:**
- Consumes: `isWorksheetEditable` (Task 1).
- Replaces `assertFieldInProject(fieldId, projectId): Promise<boolean>` with `resolveFieldWorksheetStatus(fieldId, projectId): Promise<WorksheetStatus | null>` (null = field not in project; otherwise the owning instance's status).

- [ ] **Step 1: Write failing test** — add `src/lib/actions/__tests__/citations.test.ts`. Read `citations.ts` + any existing actions test for the harness/mocking style first. Assert: `addCitation` against a field whose worksheet instance is `final` returns `{ ok: false }` with the schreibgeschützt error and performs no `project_parameters` write; against a `draft` instance it succeeds. If a live dev DB is required and unavailable, fall back to a focused unit test that `resolveFieldWorksheetStatus`-gated logic uses `isWorksheetEditable` (assert the predicate + that the citations module imports it), and note the DB round-trip caveat in the report.

- [ ] **Step 2: Run to verify it fails** — `pnpm test src/lib/actions/__tests__/citations.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Add import** — in `src/lib/actions/citations.ts` add:

```ts
import { isWorksheetEditable, type WorksheetStatus } from '@/lib/state-machine';
```

- [ ] **Step 4: Convert the helper to return status** — replace the `assertFieldInProject` function with:

```ts
/** Returns the owning worksheet-instance status for `fieldId` within `projectId`,
 *  or null when the field is not in any instantiated worksheet of the project
 *  (blocks IDOR). Callers also use the status to enforce the write-lock. */
async function resolveFieldWorksheetStatus(
  fieldId: string,
  projectId: string,
): Promise<WorksheetStatus | null> {
  const [row] = await db
    .select({ status: worksheetInstances.status })
    .from(fields)
    .innerJoin(
      worksheetInstances,
      eq(worksheetInstances.worksheetTemplateId, fields.worksheetTemplateId),
    )
    .where(
      and(eq(fields.id, fieldId), eq(worksheetInstances.projectId, projectId)),
    )
    .limit(1);
  return (row?.status as WorksheetStatus | undefined) ?? null;
}
```

- [ ] **Step 5: Guard each writer** — in `addCitation`, `removeCitation`, AND `attachCitation`, replace the existing `if (!(await assertFieldInProject(input.fieldId, input.projectId))) { return { ok: false, error: 'field_not_in_project' }; }` block with:

```ts
  const wsStatus = await resolveFieldWorksheetStatus(input.fieldId, input.projectId);
  if (wsStatus === null) return { ok: false, error: 'field_not_in_project' };
  if (!isWorksheetEditable(wsStatus)) {
    return { ok: false, error: 'Arbeitsblatt ist genehmigt/final und schreibgeschützt — Quellen können nicht geändert werden.' };
  }
```

(Apply to all three. Confirm via `grep -n "assertFieldInProject" src/lib/actions/citations.ts` that no reference remains after the rename.)

- [ ] **Step 6: Run focused + typecheck** — `pnpm test src/lib/actions/__tests__/citations.test.ts` then `pnpm typecheck`
  Expected: PASS; exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/actions/citations.ts src/lib/actions/__tests__/citations.test.ts
git commit -m "feat(core): lock citation writes on approved/final worksheets"
```

---

## Task 4: UI mirror — auto-save gate, read-only inputs, lock banner

**Files:**
- Modify: `src/components/worksheet/worksheet-form.tsx` (auto-save effect ~184-193; render ~444-457; DynamicField call ~414; editor calls ~546, ~555)
- Modify: `src/components/worksheet/dynamic-field.tsx` (Props ~36-63; controls)
- Modify: `src/components/worksheet/surface-inventory-editor.tsx` (Props line 16; controls)
- Modify: `src/components/worksheet/kostra-table-editor.tsx` (Props ~8; controls)
- Test: `src/components/worksheet/__tests__/worksheet-form-lock.test.tsx` (create), `src/components/worksheet/__tests__/dynamic-field.test.tsx` (extend if present, else create)

**Interfaces:**
- Consumes: `isWorksheetEditable` (Task 1).
- `DynamicField`, `SurfaceInventoryEditor`, `KostraTableEditor` each gain an optional `readOnly?: boolean` prop (default false) that disables all editable controls + suppresses their `onChange`/`setField`.

- [ ] **Step 1: Write failing tests.**
  - In a new `src/components/worksheet/__tests__/dynamic-field.test.tsx` (or extend the existing one — read it first), render a `DynamicField` for a number field with `readOnly` and assert the input has `readOnly` set and typing does not call the store's `setField` (it stays unchanged). Render without `readOnly` and assert editing works.
  - In a new `src/components/worksheet/__tests__/worksheet-form-lock.test.tsx`, render `WorksheetForm` with `instance.status='final'` and assert: the lock banner text `schreibgeschützt` is present, and the number inputs are read-only. Render with `status='draft'` and assert no banner + inputs editable. (Mirror the harness of any existing worksheet-form test; if rendering the full form is impractical, scope this file to asserting the `locked` derivation + that `isWorksheetEditable` drives it, and put the input-level assertion in the dynamic-field test — note this in the report.)

- [ ] **Step 2: Run to verify they fail** — `pnpm test src/components/worksheet/__tests__/dynamic-field.test.tsx src/components/worksheet/__tests__/worksheet-form-lock.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Thread `readOnly` into `DynamicField`** — in `src/components/worksheet/dynamic-field.tsx`:
  - Add to the `Props` type (near line 62, before `isPlatformEngineer`): `  /** When true, the whole field is locked (worksheet approved/final). */\n  readOnly?: boolean;`
  - Add `readOnly = false` to the destructured params (line 65).
  - For EVERY editable control (number input, text input, enum `<select>`, date input, boolean checkbox), combine the lock with any existing `isComputed` gating: use `readOnly={isComputed || readOnly}` (text/number/date inputs), `disabled={readOnly}` (select/checkbox), and at the top of each `onChange` add `if (readOnly) return;` (keep the existing `if (isComputed) return;`). Mirror the existing number-input pattern (`readOnly`, `tabIndex`, `aria-readonly`, guarded `onChange`) for the other control types.

- [ ] **Step 4: Thread `readOnly` into the two json editors** — in `surface-inventory-editor.tsx` and `kostra-table-editor.tsx`:
  - Change `type Props = { fieldId: string };` → `type Props = { fieldId: string; readOnly?: boolean };` and destructure `{ fieldId, readOnly = false }`.
  - When `readOnly`, disable all mutating controls (row add/remove buttons, `<input>`/`<select>` cells) via `disabled={readOnly}` / `readOnly={readOnly}`, and early-return from their change/add/remove handlers (`if (readOnly) return;`). Do not call `setField` when `readOnly`.

- [ ] **Step 5: Wire the form** — in `src/components/worksheet/worksheet-form.tsx`:
  - Add the import: `import { isWorksheetEditable, type WorksheetStatus } from '@/lib/state-machine';`
  - Inside the component (after the store hooks, ~line 167), add: `const locked = !isWorksheetEditable(instance.status as WorksheetStatus);`
  - Gate the auto-save effect (the `useEffect` at ~184): add `if (locked) return;` as its first statement, and add `locked` to its dependency array.
  - Pass `readOnly={locked}` to the `DynamicField` call (~414), the `SurfaceInventoryEditor` call (~555), and the `KostraTableEditor` call (~546).
  - Render the banner — immediately after the `</header>` (~line 454), before `<SourceFormReferencePanel>`:

```tsx
      {locked && (
        <div
          role="status"
          data-testid="worksheet-lock-banner"
          className="border border-hairline rounded p-3 text-sm bg-paper-2 text-ink"
        >
          Schreibgeschützt (genehmigt/final) — zum Bearbeiten „Wieder öffnen".
        </div>
      )}
```

- [ ] **Step 6: Run focused + typecheck** — `pnpm test src/components/worksheet/__tests__/dynamic-field.test.tsx src/components/worksheet/__tests__/worksheet-form-lock.test.tsx` then `pnpm typecheck`
  Expected: PASS; exit 0.

- [ ] **Step 7: Full gate** — `pnpm test` then `pnpm typecheck`
  Expected: all suites pass; typecheck exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/worksheet/ 
git commit -m "feat(ui): lock worksheet form (read-only inputs + banner + no auto-save) when approved/final"
```

---

## Pause before cutover

After Tasks 1–4 are green and reviewed, STOP and report "ready to deploy." Do NOT merge or deploy — the branch/deploy base must be settled with the user first (VSME is currently on `main`; this fix is on a clean 138 base). When approved, cutover is code-only (no migration): merge to the agreed base → `vercel --prod` + re-point the `-hannesoster-` alias → smoke-test (open an `engineer_approved`/`final` worksheet, confirm inputs are read-only + banner shows + a save attempt is refused; confirm a `draft` worksheet still saves).

---

## Self-Review

- **Spec coverage:** Unit 1→Task 1; Unit 2 (saveWorksheet guard)→Task 2 steps 1-2; Unit 3 (remove auto-reopen)→Task 2 steps 3-4; Unit 4 (citations)→Task 3; Unit 5 (UI)→Task 4. Decisions (allowlist deny-by-default; cover all value-write paths incl. citations) honored in Global Constraints + Tasks 1,3. ✓
- **Placeholder scan:** Tasks 1-3 carry verbatim code. Task 4 steps 3-4 specify a prop contract + the existing pattern to mirror across multiple control types (not a placeholder — the exact prop, exact gating expression, and the reference pattern are named); the banner + form wiring + auto-save gate are verbatim. Test steps name the fallback when a dev DB is unavailable (same approach proven on the area-consolidation save test). ✓
- **Type consistency:** `isWorksheetEditable(status: WorksheetStatus): boolean`, `resolveFieldWorksheetStatus(...): Promise<WorksheetStatus | null>`, `readOnly?: boolean` used identically across tasks; error strings copied verbatim from Global Constraints. ✓
