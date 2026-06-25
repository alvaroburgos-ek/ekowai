# A138-07 Deploy Slice (Plan 3 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make A138-07's derived `A_C`/`C_m`/`A_E_ba`/`A_E_nba` durable and visible everywhere — persisted server-side (materialization), computed on the PDF-report and snapshot paths, backfilled for existing projects — then ship the whole consolidation (Plans 1+2+3) to prod with a safe migration+deploy sequence.

**Architecture:** A server-side `materializeSurfaceOutputs()` runs inside `saveWorksheet` whenever A138-07's `surface_inventory` is saved, UPSERTing the four derived `project_parameters` rows via the shared `summarizeSurfaces()` (single source). The report (`evaluate-for-report.ts`) and snapshot (`payload.ts`) evaluators gain the same `surfaceInventory` aggregator branch the client engine already has. A one-time backfill script materializes existing projects. The deploy runbook applies migration `20260625170000` and the code together.

**Tech Stack:** Next.js 16 (server actions), Drizzle ORM, Supabase Postgres, Vitest 4.

## Global Constraints

- pnpm; single test `pnpm test <path>`; full `pnpm test`; types `pnpm typecheck`.
- German UI. TS strict. Single-source: derived values produced once via `summarizeSurfaces`; never hand-keyed; never recomputed divergently — the report/snapshot/materialization paths ALL call `summarizeSurfaces`, not a re-implementation.
- Work in worktree `C:\Users\Ekowai\_wt-a138`, branch `feat/a138-07-surface-singlesource`. Git identity Alvaro.
- **Plan 3 execution touches NO prod DB and does NOT deploy.** It writes code, a backfill script, and tests. The actual prod migration + deploy + backfill happen in the **Deploy Runbook** section, executed separately by/with the user (prod is outward-facing — explicit per-step approval).
- Reuse the four A138-07 equation ids verbatim: A_C `b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0`, C_m `a1380702-0000-4000-8000-000000000002`, A_E_ba `…0003`, A_E_nba `…0004`. Field symbols: `A_C`, `C_m`, `A_E_ba`, `A_E_nba`, carrier `surface_inventory`.

---

### Task 1: Server-side materialization in `saveWorksheet`

**Files:**
- Create: `src/lib/eval/materialize-surfaces.ts` (pure mapping: carrier → {symbol: value} for the 4 outputs)
- Modify: `src/lib/actions/worksheet.ts` (`saveWorksheet`: after persisting entered values, if `surface_inventory` was among them, UPSERT the 4 derived rows)
- Test: `src/lib/eval/__tests__/materialize-surfaces.test.ts`

**Interfaces:**
- Consumes: `summarizeSurfaces`, `normalizeSurfaceCarrier` (`./surface-inventory`).
- Produces: `materializeSurfaceOutputs(carrierRaw: unknown): Record<'A_C'|'C_m'|'A_E_ba'|'A_E_nba', number | null>` — pure; null per field when not computable.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/eval/__tests__/materialize-surfaces.test.ts
import { describe, it, expect } from 'vitest';
import { materializeSurfaceOutputs } from '../materialize-surfaces';

describe('materializeSurfaceOutputs', () => {
  it('maps a complete carrier to the four derived scalars', () => {
    const out = materializeSurfaceOutputs({
      rows: [
        { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ],
    });
    expect(out.A_C).toBeCloseTo(4826.43, 2);
    expect(out.C_m).toBeCloseTo(0.9, 6);
    expect(out.A_E_ba).toBeCloseTo(5362.7, 4);
    expect(out.A_E_nba).toBe(0);
  });
  it('returns nulls (not 0) when nothing is complete — clears stale downstream values', () => {
    expect(materializeSurfaceOutputs({ rows: [] })).toEqual({ A_C: null, C_m: null, A_E_ba: null, A_E_nba: null });
    expect(materializeSurfaceOutputs(null)).toEqual({ A_C: null, C_m: null, A_E_ba: null, A_E_nba: null });
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`pnpm test src/lib/eval/__tests__/materialize-surfaces.test.ts`)

- [ ] **Step 3: Write `src/lib/eval/materialize-surfaces.ts`**

```ts
import { normalizeSurfaceCarrier, summarizeSurfaces } from './surface-inventory';

export type SurfaceOutputs = Record<'A_C' | 'C_m' | 'A_E_ba' | 'A_E_nba', number | null>;

/** Pure carrier → the four derived scalars. Single source via summarizeSurfaces.
 * Null per field when not computable (clears stale downstream rows on save). */
export function materializeSurfaceOutputs(carrierRaw: unknown): SurfaceOutputs {
  const s = summarizeSurfaces(normalizeSurfaceCarrier(carrierRaw));
  return { A_C: s.A_C, C_m: s.C_m, A_E_ba: s.A_E_ba, A_E_nba: s.A_E_nba };
}
```

- [ ] **Step 4: Run — expect PASS** (2 tests)

- [ ] **Step 5: Wire into `saveWorksheet`** (`src/lib/actions/worksheet.ts`)

Inside the save transaction, AFTER the existing `project_parameters` UPSERT of entered values, add a materialization step. Read the template id from the instance; only run when a `surface_inventory` field was saved on THIS worksheet:

```ts
// after the entered-values UPSERT, inside the same tx:
import { materializeSurfaceOutputs } from '@/lib/eval/materialize-surfaces';

// Resolve this worksheet's fields by symbol (surface_inventory carrier + 4 outputs).
const wsFields = await tx
  .select({ id: fields.id, symbol: fields.symbol })
  .from(fields)
  .where(and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)));
const surfaceFieldId = wsFields.find((f) => f.symbol === 'surface_inventory')?.id;

if (surfaceFieldId && fieldIds.includes(surfaceFieldId)) {
  // The just-saved carrier value (json) for this field.
  const carrier = input.values[surfaceFieldId]?.type === 'json' ? input.values[surfaceFieldId].value : null;
  const outputs = materializeSurfaceOutputs(carrier);
  const idBySymbol = new Map(wsFields.map((f) => [f.symbol, f.id]));
  const derivedRows = (['A_C', 'C_m', 'A_E_ba', 'A_E_nba'] as const)
    .map((sym) => ({ sym, fieldId: idBySymbol.get(sym) }))
    .filter((x): x is { sym: typeof x.sym; fieldId: string } => x.fieldId != null)
    .map((x) => ({
      projectId: instance.projectId,
      fieldId: x.fieldId,
      valueNumber: outputs[x.sym],
      sourceType: 'derived' as const,
      enteredBy: userId,
      enteredAt: new Date(),
    }));
  if (derivedRows.length > 0) {
    await tx.insert(projectParameters).values(derivedRows).onConflictDoUpdate({
      target: [projectParameters.projectId, projectParameters.fieldId],
      set: { valueNumber: sql`excluded.value_number`, sourceType: 'derived', enteredBy: userId, enteredAt: new Date() },
    });
  }
}
```

Notes for the implementer: match the exact column/identifier names used by the existing UPSERT in this file (e.g. how `userId`, `instance`, `fieldIds`, `input.values`, the `projectParameters` import, and the `onConflictDoUpdate` shape are already written — mirror them). `sourceType: 'derived'` — confirm the column is free-text `text` (it is; no enum). Writing `valueNumber: null` is intentional (clears a stale value when the carrier goes incomplete).

- [ ] **Step 6: Run full suite + typecheck** — `pnpm test && pnpm typecheck` (expect green; if a `saveWorksheet` test asserts the exact set of written rows, update it to include the derived rows for an A138-07 save and name it in the report).

- [ ] **Step 7: Commit**

```bash
git add src/lib/eval/materialize-surfaces.ts src/lib/eval/__tests__/materialize-surfaces.test.ts src/lib/actions/worksheet.ts
git commit -m "feat(138): materialize A_C/C_m/A_E_ba/A_E_nba on A138-07 save (durable for consumers)"
```

---

### Task 2: Rewire `evaluate-for-report.ts` to the surface aggregators

**Files:**
- Modify: `src/lib/eval/evaluate-for-report.ts`
- Test: `src/lib/eval/__tests__/evaluate-for-report-surface.test.ts`

**Interfaces:** consumes `normalizeSurfaceCarrier` + `SurfaceInventoryCarrier`; the four A138-07 ids.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/eval/__tests__/evaluate-for-report-surface.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateWorksheetEquations } from '../evaluate-for-report';

// Minimal A138-07 inputs: the surface_inventory json param + the A_C equation.
const fields = [
  { id: 'f-si', symbol: 'surface_inventory', dataType: 'json' },
  { id: 'f-ac', symbol: 'A_C', dataType: 'number' },
];
const parameters = [
  { fieldId: 'f-si', valueJson: { rows: [
    { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
    { id: '2', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
  ] } },
];
const equations = [
  { id: 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0', equationNumber: '2', formula: 'A_C = …', inputSymbols: ['surface_inventory'], outputSymbol: 'A_C' },
];

describe('evaluate-for-report — A138-07 surface producer', () => {
  it('computes A_C from the surface_inventory carrier (report path)', () => {
    const res = evaluateWorksheetEquations('A138-07', equations, fields, parameters);
    const ac = res.find((r) => r.equationId === 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0');
    expect(ac?.state.kind).toBe('computed');
    if (ac?.state.kind === 'computed') expect(ac.state.value).toBeCloseTo(4826.43, 2);
  });
});
```

(Adjust the field/parameter/equation object shapes to match `evaluate-for-report.ts`'s actual `ReportField`/`ReportParameter`/equation types — read the file first; the test must use the real exported signature of `evaluateWorksheetEquations`.)

- [ ] **Step 2: Run — expect FAIL** (no surfaceInventory branch → A_C not computed)

- [ ] **Step 3: Edit `evaluate-for-report.ts`** — add the import, the four-id Set, build `surfaceCarrier` from `jsonBySymbol.get('surface_inventory')` via `normalizeSurfaceCarrier`, and add the branch `if (A138_07_SURFACE_IDS.has(eq.id)) { aggregator = surfaceCarrier ? { surfaceInventory: surfaceCarrier } : undefined; }` as the FIRST branch of the per-equation aggregator if/else (see the explore map: insert near the existing carrier builds ~line 148 and the branch ~line 223). Leave the inert `A138_10_GL2_ID` code or delete it.

- [ ] **Step 4: Run — expect PASS**, then full suite + typecheck (`pnpm test && pnpm typecheck`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/eval/evaluate-for-report.ts src/lib/eval/__tests__/evaluate-for-report-surface.test.ts
git commit -m "feat(138): report evaluator computes A138-07 A_C/C_m from surface_inventory"
```

---

### Task 3: Rewire `snapshots/payload.ts` to the surface aggregators

**Files:**
- Modify: `src/lib/snapshots/payload.ts`
- Test: `src/lib/snapshots/__tests__/payload-surface.test.ts`

- [ ] **Step 1: Write the failing test** — mirror Task 2's test against `buildSnapshotPayload({ worksheetCode: 'A138-07', … })` with a `surface_inventory` json field/param, asserting the snapshot records A_C = 4826.43. (Read `payload.ts` for the exact `buildSnapshotPayload` args + return shape; write the test to the real signature.)

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Edit `payload.ts`** — same pattern: import `normalizeSurfaceCarrier`, add the four-id Set, find the `surface_inventory` field + build `surfaceCarrier`, add the `if (A138_07_SURFACE_IDS.has(eq.id))` branch first (explore map: ~line 197 carrier build, ~line 291 branch).

- [ ] **Step 4: Run — expect PASS**, then `pnpm test && pnpm typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/snapshots/payload.ts src/lib/snapshots/__tests__/payload-surface.test.ts
git commit -m "feat(138): snapshot payload computes A138-07 A_C/C_m from surface_inventory"
```

---

### Task 4: One-time backfill script for existing projects

**Files:**
- Create: `scripts/backfill-a138-surface-materialization.ts`
- Test: `src/lib/eval/__tests__/backfill-surface-plan.test.ts` (unit-test the pure row-planning function the script uses)

**Interfaces:**
- Produces: `planSurfaceBackfill(rows: Array<{ projectId: string; acFieldId: string; cmFieldId: string; baFieldId: string; nbaFieldId: string; carrier: unknown }>): Array<{ projectId: string; fieldId: string; valueNumber: number | null }>` — pure; the script wraps it with DB read + write.

- [ ] **Step 1: Write the failing test** for `planSurfaceBackfill` (one project, complete carrier → 4 rows with the right numbers; empty carrier → 4 rows all null). Put `planSurfaceBackfill` in a small module `src/lib/eval/backfill-surface-plan.ts` so it's importable + testable.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Write `src/lib/eval/backfill-surface-plan.ts`** using `materializeSurfaceOutputs` to produce the per-field rows. (Pure; no DB.)

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Write the script `scripts/backfill-a138-surface-materialization.ts`** — reads `DATABASE_URL`; for the DWA-A-138-1 standard, finds A138-07's `surface_inventory` + `A_C`/`C_m`/`A_E_ba`/`A_E_nba` field ids; for every project that has a `surface_inventory` `project_parameters` row, loads the carrier, calls `planSurfaceBackfill`, and UPSERTs the derived `project_parameters` rows (sourceType `derived`). Idempotent (re-runnable; UPSERT on (project_id, field_id)). It must print a per-project summary and a dry-run mode (`--dry-run` prints the plan without writing). **The script is NOT run during Plan 3 execution** — it runs once at deploy (Runbook step 5).

- [ ] **Step 6: Commit**

```bash
git add scripts/backfill-a138-surface-materialization.ts src/lib/eval/backfill-surface-plan.ts src/lib/eval/__tests__/backfill-surface-plan.test.ts
git commit -m "feat(138): backfill script + planner to materialize A_C/C_m for existing projects (run at deploy)"
```

---

### Task 5: Sweep deferred minors + A138-07 engine-wiring integration test

**Files:**
- Modify: `src/lib/db/queries/worksheet.ts` (`loadSurfaceSource` → `Promise.all` the two independent queries)
- Modify: `src/components/worksheet/worksheet-form.tsx` (remove dead `type SurfaceInventoryCarrier` import)
- Test: `src/lib/eval/__tests__/engine-wiring-a138-07.test.tsx` (integration: the hook produces A_C/C_m/A_E_ba/A_E_nba on A138-07 from a surface_inventory store value — replaces the deleted A138-10 wiring test)

- [ ] **Step 1: Write the failing integration test** — render/drive `useEquationEngine` (or its host) for worksheet A138-07 with a `surface_inventory` json value in the store + the four producer equations, and assert the engine writes A_C=4826.43, C_m=0.9, A_E_ba=5362.7, A_E_nba=0 to the output fields. (Model it on the deleted `engine-wiring-A138-10.test.tsx` pattern — find it in git history `git show 814ae27^:src/lib/eval/__tests__/engine-wiring-A138-10.test.tsx` if it helps.)
- [ ] **Step 2: Run — expect FAIL** (test asserts new behavior / file new)
- [ ] **Step 3: Apply the two minor cleanups** (Promise.all; drop dead import).
- [ ] **Step 4: Run the integration test + full suite + typecheck — expect PASS.**
- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/worksheet.ts src/components/worksheet/worksheet-form.tsx src/lib/eval/__tests__/engine-wiring-a138-07.test.tsx
git commit -m "test(138): A138-07 engine-wiring integration test + sweep deferred minors"
```

---

## DEPLOY RUNBOOK (review this — executed separately, with per-step approval)

This is the only part that touches prod. **Nothing here runs during Plan 3 implementation.** It ships Plans 1+2+3 together. The producer of `A_C` moves from A138-10 (deployed) to A138-07 (this branch), so code and migration are coupled — there is **no zero-window ordering**; we minimize and pre-verify.

### The coupling (why ordering matters)
- **Migration without new code:** prod (old code) computes A_C via `A138-10:2`, but the migration deletes A138-10's Gl. 2 + deactivates its A_C field → A_C breaks.
- **New code without migration:** new code expects A138-07's `A_C` field/equations (added by the migration) → A_C not produced/persisted; consumers read stale A_C.

So the DB and code must flip together. For a ~2-user app the exposure is a brief window; we de-risk by verifying the combined state on a preview first.

### Phase A — Pre-verify on a throwaway preview (no prod impact)
1. `supabase` MCP `create_branch` → a dev DB branch off prod.
2. Apply migration `20260625170000` to the dev branch (Management API).
3. Deploy a **Vercel preview** of `feat/a138-07-surface-singlesource` pointed at the dev-branch DB env.
4. Verify end-to-end on the preview: open A138-07 (enter/confirm surfaces; Gewächshausdach reselect), confirm A_C/C_m compute + persist; open A138-13/16/…/26 and confirm inherited A_C resolves; generate a PDF report + a snapshot and confirm A_C is present (not blank). Run the backfill script (`--dry-run` then real) against the dev branch and re-verify consumers.
5. Tear down the dev branch.

### Phase B — Production cutover (low-traffic window, per-step approval)
1. Final whole-branch review of Plans 1+2+3; merge `feat/a138-07-surface-singlesource` → `main`.
2. **Apply migration `20260625170000` to prod** (`vadsmshzebefjreqcicl`) via the Management API (CLAUDE.md MCP path). Verify with the COUNT/SELECT in Plan 2 Task 3.
3. **Immediately deploy `main` to prod**: `vercel --prod` **and re-point the `-hannesoster-` alias** (`vercel alias set <new> ekowai-wizard-preview-hannesoster-hannesosters-projects.vercel.app`) — per [[reference_ekowai_wizard_deploy]], `--prod` does NOT move that alias. (Order 2→3 = DB matches code the moment the new build goes live; window = build time.)
4. **Run the backfill** against prod: `node scripts/backfill-a138-surface-materialization.ts --dry-run` then for real (compile per CLAUDE.md if `tsx` is broken). Populates A_C/C_m for existing 138 projects.
5. **Smoke-test prod:** A138-07 reopen (the original bug), A_C computes; A138-13/26 inherited A_C present; one PDF report renders A_C.

### Rollback
- Code: re-deploy the previous prod build + re-point the alias back.
- DB: the migration is additive + deactivating; a rollback SQL would re-activate A138-10's `A_C`/`C_m`/`sub_areas` fields and re-insert the deleted A138-10 equations. **Write this rollback SQL as part of Phase B prep** (not yet written) and keep it ready before step B2.

---

## Self-Review (against spec + carried items)

- Spec §5 "materialization dependency" + the Plan-2 carried OPEN ITEMS → Tasks 1 (materialize on save) + 4 (backfill existing) + 2/3 (report+snapshot paths). ✓
- Carried minors → Task 5. ✓
- Deploy coupling + migration-with-code → Deploy Runbook. ✓
- Single-source: materialization, report, snapshot, and the client engine ALL go through `summarizeSurfaces`. ✓
- **Not yet written (flagged):** the DB rollback SQL for Phase B (write during Runbook prep). Sourcetype `'derived'` assumes the free-text column accepts it — Task 1 confirms.

**Placeholder scan:** the two server-path tests (Tasks 2/3) say "adjust shapes to the real exported signature" — that's a real instruction (read the file), not a code placeholder; the aggregator-branch code to add is fully specified.

## Open question for the deploy review
Phase B step ordering is **migration→deploy** (DB ready when code lands). Alternative is **deploy→migration** (consumers show *stale* A_C during the window instead of *blank*). Both have a window; pick one at cutover. Recommend **migration→deploy after Phase A preview passes**.
