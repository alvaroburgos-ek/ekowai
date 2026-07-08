# B1 Task 4 Report — A138-12 Tab.6 Loading Check Read-Only, Four-State Render

## What was added to computedSymbols

Two new module-scope `Set` constants were declared at the top of `worksheet-form.tsx` (after the imports), mirroring the existing `BASIN_GOVERNING_SYMBOLS` pattern:

```ts
const BASIN_GOVERNING_SYMBOLS = new Set(['r_D_n', 'D_min']);   // moved to module scope

const LOADING_CHECK_SYMBOLS = new Set([
  'ac_as_ratio',
  'ac_as_ratio_limit',
  'ac_as_ratio_check',
  'ac_as_ratio_check_reason',
]);
```

Inside `computedSymbols` useMemo, a second iteration was added after the existing `BASIN_GOVERNING_SYMBOLS` loop:

```ts
for (const sym of LOADING_CHECK_SYMBOLS) {
  if (fieldBySymbol.has(sym)) set.add(sym);
}
```

The `fieldBySymbol.has(sym)` guard means these symbols are harmless on every standard that does not carry them — only A138-12 worksheets where the fields actually exist will set `isComputed=true`.

## Four-state render (AcAsRatioCheckStatus component)

New file: `src/components/worksheet/ac-as-ratio-check-status.tsx`

The component renders a single badge `<span data-testid="ac-as-ratio-check-badge" data-status={status}>` followed by optional reason text:

| Status | Label | Tokens |
|---|---|---|
| `pass` | bestanden | `text-success bg-success/10 border-success/30` |
| `fail` | nicht bestanden | `text-error bg-error/10 border-error/30` |
| `not_applicable` | nicht anwendbar | `text-warning bg-warning/10 border-warning/30` |
| `indeterminate` | unbestimmt | `text-subtext bg-paper-2 border-hairline-strong` |

Tokens reuse the same CSS variables as `equation-engine-card.tsx` (`text-success`/`text-error`) and `surface-source-banner.tsx` (`bg-warning/10`). No new mechanism invented.

## How the two N/A reasons are distinguished

For `not_applicable` and `indeterminate`, the component renders `reason` text directly below the badge when non-null:

```tsx
{cfg.showReason && reason && (
  <p className="text-xs text-subtext leading-snug">{reason}</p>
)}
```

The two not_applicable sub-cases differ only in the `reason` string the T3 materialize writes:
- "keine Anforderung nach Tab.6" — no numeric limit applies
- "behördlich abzustimmen (*)" — authority-coordination case

Both render visibly below the amber badge, making the two causes distinguishable without any additional branching.

## flaechengruppe stays editable

`flaechengruppe` is NOT in `LOADING_CHECK_SYMBOLS` and was not added to `computedSymbols` anywhere. It remains a normal enum field on A138-06, rendered as an editable `SegmentedControl` or `Select` by `DynamicField`. Confirmed by grep: the symbol does not appear in `worksheet-form.tsx`.

## DynamicField text-branch fix

The `ac_as_ratio_check` field uses `dataType='text'`. The existing text branch in `dynamic-field.tsx` only respected `readOnly` (worksheet lock), not `isComputed`. The branch was updated to introduce a `textLocked = isComputed || readOnly` local, applied to `readOnly`, `tabIndex`, `aria-readonly`, and the `onChange` early-return guard — mirroring the existing number-branch treatment exactly.

## TDD evidence

Tests written BEFORE implementation (RED), then made green:

- `src/components/worksheet/__tests__/a138-12-loading-readonly.test.tsx` — 18 tests:
  - `ac_as_ratio` readOnly + aria-readonly + store-write blocked (3 tests)
  - `ac_as_ratio_limit` readOnly + store-write blocked (2 tests)
  - `ac_as_ratio_check` readOnly + store-write blocked (2 tests)
  - `A_E` (editable) still writes to store — regression baseline (1 test)
  - `AcAsRatioCheckStatus` four-state badge render (pass/fail/not_applicable/indeterminate) (8 tests)
  - null-limit display (1 test)

## Test results

```
pnpm vitest run src/components/worksheet/__tests__/a138-12-loading-readonly.test.tsx
  Tests  18 passed (18)

pnpm vitest run src/components/worksheet
  Tests  135 passed (135)   [19 test files]

pnpm vitest run
  Tests  900 passed (924)   — 24 failures all in |rls| / |integration| suites
                              (DB-gated, supabaseUrl missing, pre-existing)
  No new unit failures introduced.
```

## Files changed

- `src/components/worksheet/worksheet-form.tsx` — moved `BASIN_GOVERNING_SYMBOLS` to module scope, added `LOADING_CHECK_SYMBOLS` at module scope, wired both into `computedSymbols` useMemo.
- `src/components/worksheet/dynamic-field.tsx` — extended text-branch to respect `isComputed` via `textLocked` local.
- `src/components/worksheet/ac-as-ratio-check-status.tsx` — new four-state display component.
- `src/components/worksheet/__tests__/a138-12-loading-readonly.test.tsx` — new 18-test suite.

Commit: `24698ab` — feat(ui): A138-12 Tab.6 loading check read-only, four-state render (pass/fail/N-A/indeterminate)

---

## Fix wave (review fixes applied after 24698ab)

### Fix 1 — AcAsRatioCheckStatus wired into DynamicField render

`src/components/worksheet/dynamic-field.tsx` line 11: `import { AcAsRatioCheckStatus } from './ac-as-ratio-check-status';`

Inside the `field.dataType === 'text'` IIFE (line ~235), a symbol-specific branch was inserted **before** the default textarea/input path:

```tsx
if (field.symbol === 'ac_as_ratio_check' && isComputed) {
  const status = v ?? 'indeterminate';
  return <AcAsRatioCheckStatus status={status} reason={statusReason ?? null} />;
}
```

New prop added to `DynamicField`: `statusReason?: string | null`. Defaults to `null`.

### How statusReason is threaded (worksheet-form.tsx)

Inside `renderField()` in `worksheet-form.tsx`, before the `<DynamicField>` JSX, the reason value is resolved from the store:

```ts
let statusReason: string | null = null;
if (f.symbol === 'ac_as_ratio_check') {
  const reasonField = fieldBySymbol.get('ac_as_ratio_check_reason');
  if (reasonField) {
    const rv = values[reasonField.id];
    statusReason = rv?.type === 'text' ? (rv.value ?? null) : null;
  }
}
```

Uses the existing `fieldBySymbol` Map and `values` store subscriptions already present — no new state machinery.

### Fix 2 — ac_as_ratio_limit null-state

In the `field.dataType === 'number'` IIFE (before the `<input>` element), a null-label branch was added:

```tsx
if (field.symbol === 'ac_as_ratio_limit' && isComputed && v == null) {
  return (
    <div data-testid="ac-as-ratio-limit-null" className="... bg-paper-2 cursor-default italic">
      — (kein Tab.6-Grenzwert)
    </div>
  );
}
```

`limitIsNull` prop was **removed** from `AcAsRatioCheckStatus` (was misplaced there; belongs to the limit field's own render path). The component doc comment was updated to reflect this. Model is now coherent: badge = ac_as_ratio_check field; limit null-label = ac_as_ratio_limit's number render.

### Fix 3 — Integration test

New sections added to `src/components/worksheet/__tests__/a138-12-loading-readonly.test.tsx`:

**Section 4 (updated)** — `DynamicField — ac_as_ratio_limit null-state` (2 tests):
- null store value → null-label div shown, no spinbutton
- value set → spinbutton rendered (not null-label)

**Section 5 (new)** — `DynamicField integration — ac_as_ratio_check badge wiring` (6 tests):
- `pass` → badge with `data-status=pass`, no textbox
- `fail` → badge with `data-status=fail`, no textbox
- `not_applicable` + reason "keine Anforderung nach Tab.6" → reason text visible, no textbox
- `not_applicable` + reason "behördlich abzustimmen (*)" → different reason text visible, no textbox
- `indeterminate` + reason → reason text visible, no textbox
- no stored value → defaults to `indeterminate` badge, no textbox

Two existing tests in section 3 (`ac_as_ratio_check`) were updated: the old tests expected a `<input type="text">` with `readonly`; after Fix 1 the badge replaces the input, so those tests now assert badge present + no textbox.

Two existing tests in section 1 (`ac_as_ratio_limit`) were updated: `beforeEach` calls `initStore()` with no value, which now triggers the null-state path. Tests were updated to pre-seed `{ type: 'number', value: 0.5 }` so the spinbutton render path is exercised.

### Test results

```
pnpm vitest run src/components/worksheet/__tests__/a138-12-loading-readonly.test.tsx
  Tests  25 passed (25)   [was 18 before Fix wave]

pnpm vitest run src/components/worksheet
  Tests  142 passed (142)   [was 135 before Fix wave — 7 new tests]

pnpm vitest run
  Tests  907 passed (931)   — 24 failures all in |rls| / |integration| suites (DB-gated, pre-existing)
  No new unit failures.
```

### Files touched in Fix wave

- `src/components/worksheet/dynamic-field.tsx` — import + `statusReason` prop + `ac_as_ratio_check` badge branch + `ac_as_ratio_limit` null-label branch
- `src/components/worksheet/worksheet-form.tsx` — `statusReason` resolution + pass-down in `renderField`
- `src/components/worksheet/ac-as-ratio-check-status.tsx` — removed `limitIsNull` prop, updated doc comment
- `src/components/worksheet/__tests__/a138-12-loading-readonly.test.tsx` — updated sections 3 & 4, new section 5 (integration)
