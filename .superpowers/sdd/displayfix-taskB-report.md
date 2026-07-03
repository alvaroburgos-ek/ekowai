# Display-Fix Task B — Post-save derived value refresh report

## Summary

After a successful `saveWorksheet` call the server already materializes derived rows in the
same transaction (surface A138-07, basin A138-13, loading A138-12). The client store was
never updated from those rows, so read-only computed fields (e.g. `ac_as_ratio`,
`ac_as_ratio_check`) showed stale values until a full manual reload. This task fixes that
by returning the materialized rows from the server action and surgically applying them in
the store.

---

## Return-shape change

**`src/lib/actions/worksheet.ts`**

New exported types added at line ~55 (after `SaveWorksheetInput`):

```ts
export type SavedDerivedRow = {
  fieldId: string;
  valueNumber: string | null;
  valueText: string | null;
};

export type SaveWorksheetResult =
  | { ok: true; saved: number; warnings: string[]; derived: SavedDerivedRow[] }
  | { ok: false; error: string };
```

`derived` is now a required field on the `ok: true` branch. The `ok: false` branch is
unchanged.

A `writtenDerived: SavedDerivedRow[]` accumulator is declared before the transaction.
After each of the three materialize UPSERTs, the written rows are pushed into it:

| Materialize pass | Symbol set | valueText written? |
|---|---|---|
| Surface (A138-07) | `SURFACE_DERIVED_SYMBOLS` (6 symbols) | No (number only) |
| Basin governing (A138-13) | `BASIN_GOVERNING_SYMBOLS` (`r_D_n`, `D_min`) | No (number only) |
| Tab.6 loading check (A138-12) | `LOADING_CHECK_OUTPUT_SYMBOLS` (4 symbols) | Yes (`ac_as_ratio_check`, `ac_as_ratio_check_reason`) |

The final `return` statement and the early-exit (zero-field) return both include
`derived: writtenDerived` / `derived: []`.

No materialize logic, transaction structure, UPSERT, or trigger detection was changed.

---

## Client surgical apply

**`src/lib/state/worksheet-store.ts`** — `flush()` method

On a successful save (`result.ok === true`), before the `set(...)` call:

1. Iterate `result.derived` rows.
2. For each row, determine the `FieldValue` type by checking the **existing store entry** for
   that `fieldId`. If the existing type is `'text'`, write `{ type: 'text', value: row.valueText }`.
   If `'number'`, parse `row.valueNumber` with `Number()` and write
   `{ type: 'number', value: ... }`. Unknown types (enum/boolean/json) are skipped — the
   materialize passes only write number/text columns.
3. Accumulate updates into a `derivedUpdates` record (plain object, not a new Map).
4. Merge into the store in the same `set(...)` call that clears `pendingFieldIds` and sets
   `saveStatus: 'saved'`, using `{ ...s.values, ...derivedUpdates }`.

The `set(...)` is a single atomic call, so there is no window where `saveStatus='saved'`
but derived values are not yet visible.

---

## In-flight edit protection

The `pendingFieldIds` set is cleared in the same `set(...)` call. Before that call, any
field in `pendingFieldIds` is a user edit. The derived rows returned by the server are
exclusively from the read-only computed field sets (surface/basin/loading outputs). These
field ids are disjoint from any user-entered field ids by design (the `derivedSymbols` guard
in `saveWorksheet` ensures no user-entered field is ever persisted as `derived`). Therefore:

- The merge `{ ...s.values, ...derivedUpdates }` overwrites only the keys in `derivedUpdates`.
- User-edited fields that are NOT in `derivedUpdates` retain their store values untouched.
- A field that is simultaneously dirty AND in `derivedUpdates` is impossible by the
  single-source invariant, but even if it happened, the test suite covers the non-interference
  contract (see store test "does NOT touch dirty user-edited field").

`router.refresh()` is not used as the mechanism; the store update is the fix. The existing
`router.refresh()` calls elsewhere (citations, approval) are unaffected.

---

## No materialize/write logic changed

All three UPSERT blocks are unchanged. The only additions are:
- `const writtenDerived: SavedDerivedRow[] = [];` before the transaction.
- Three `for (const r of ...) { writtenDerived.push(...) }` blocks after each UPSERT (inside
  the `if (rows.length > 0)` guards that already existed).
- `derived: writtenDerived` on the return value.

---

## TDD evidence

### RED phase
`src/lib/state/__tests__/worksheet-store-derived-apply.test.ts` was written before any code
change. All 8 tests failed because:
- `SaveWorksheetResult` had no `derived` field (TypeScript error in mock).
- The store's `flush()` had no logic to apply derived rows.

### GREEN phase
After updating `worksheet.ts` (type + collection) and `worksheet-store.ts` (apply logic),
all 8 tests pass.

### Type-shape tests
`src/lib/actions/__tests__/worksheet.test.ts` has 3 new static/type-shape tests for
`SaveWorksheetResult` and `SavedDerivedRow`. These are co-located with the existing
`SURFACE_DERIVED_SYMBOLS` static test. They are DB-gated (the `_setup-env` import throws
without `DATABASE_URL`) but compile and would run in a DB environment.

---

## Test results

```
pnpm vitest run src/lib/state src/components/worksheet
Test Files  21 passed (21)
Tests      167 passed (167)
```

No new unit failures introduced. DB-gated (integration/rls) failures are pre-existing and
unchanged.

---

## Files changed

| File | Change |
|---|---|
| `src/lib/actions/worksheet.ts` | Add `SavedDerivedRow` + extend `SaveWorksheetResult`; collect written rows; return `derived` |
| `src/lib/state/worksheet-store.ts` | `flush()` applies `result.derived` surgically on ok=true |
| `src/lib/actions/__tests__/worksheet.test.ts` | 3 new type-shape tests for Task B return contract |
| `src/lib/state/__tests__/worksheet-store-derived-apply.test.ts` | New: 8 TDD store tests (RED→GREEN) |
