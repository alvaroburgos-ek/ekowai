---
title: "Task 1 — min()/max() in formula engine (feat/a138-10-auto-qzu)"
created: 2026-06-29
tags: [ekowai-wizard, a138-10, eval-engine, task-report]
status: done
---

# Task 1: Add min()/max() to the formula engine

## What was done

### Files touched

| File | Change |
|---|---|
| `src/lib/eval/arithmetic.ts` | Added `min`/`max` support (tokenizer + parser) |
| `src/lib/eval/__tests__/formula-min-max.test.ts` | New test file (12 tests) |

### How min/max were added (`arithmetic.ts`)

The evaluator is a hand-written recursive descent parser. Function calls were previously unconditionally rejected in the tokenizer: any `identifier(` sequence threw `Funktionsaufruf "..." wird nicht unterstützt`.

Three targeted changes:

1. **New `SUPPORTED_FUNCTIONS` set**: `new Set<string>(['min', 'max'])` — the single gate controlling which names get through.

2. **Tokenizer gate updated**: When the tokenizer sees `identifier + (`, it now checks `SUPPORTED_FUNCTIONS.has(name)` before throwing. If the name is in the set it emits a `{ kind: 'fn', name: 'min' | 'max' }` token and advances past the identifier (NOT past the `(`). All other names still throw the original error message unchanged.

3. **`parsePrimary` extended**: A new `fn` arm consumes `( expr , expr )` (opening paren, first expression via `parseExpr`, comma, second expression via `parseExpr`, closing paren) and returns `Math.min(a, b)` or `Math.max(a, b)`. Whitespace around the comma is handled automatically because `parseExpr` delegates to the tokenizer which skips whitespace.

4. **`,` added as an operator token**: The op union type and tokenizer were extended to include `,` so the comma separator inside function calls can be consumed by the parser without throwing "unexpected character".

### How the unsupported-function rejection is preserved

The check `SUPPORTED_FUNCTIONS.has(name)` is the **only** change to the rejection path. For any name not in the set (e.g. `SUM`, `SQRT`, `foo`, `AVG`) the tokenizer throws exactly the same `Funktionsaufruf "${name}(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.` message as before. `formula.ts` catches that message via the existing `/Funktionsaufruf/` regex and maps it to `manual_required` — so the three-state contract is maintained.

### `normalizeFormula` safety

`normalizeFormula` uses `FN_LIKE = /([A-Za-z_][\w]*)\s*\(\s*([A-Za-z0-9_]+)\s*\)/g` which only matches single-token args with no commas. `min(a*b, 1)` and `max(a, b)` both have either multi-token args or a comma, so they are never rewritten to `min_ab` or similar. The normalization path is untouched.

## Test results

```
src/lib/eval/__tests__/formula-min-max.test.ts
  min(expr, expr)
    ✓ cap not binding: min(a * b, 1) with a=0.3, b=0.1 → 0.03
    ✓ cap binding: min(a * b, 1) with a=2, b=1 → 1 (clamps)
    ✓ whitespace variants: min( a * b , 1 ) still evaluates
    ✓ literal as first arg: min(1, a) with a=0.7 → 0.7
  max(expr, expr)
    ✓ max(a, b) with a=0.3, b=0.7 → 0.7
    ✓ max(a * 2, b) with a=1, b=0.5 → 2
  unsupported function calls are still rejected
    ✓ SUM(a, b) yields manual_required or error (NOT computed)
    ✓ foo(a) yields manual_required or error (NOT computed)
    ✓ SQRT(a) yields manual_required or error (NOT computed)
  plain arithmetic (no function) is unaffected
    ✓ x = a * b + c evaluates as before
    ✓ x = a ^ 2 evaluates power correctly
    ✓ missing input still yields manual_required (no function involved)

Test Files  1 passed (1)  |  Tests  12 passed (12)
```

## Regression

`pnpm vitest run --project unit`: **89 test files, 772 tests — all passed.**

Pre-existing TypeScript errors in `scripts/__tests__/pass3c-validate.test.ts`, `scripts/vsme/__tests__/build-workbook.test.ts`, and `src/lib/export/__tests__/build-vsme-xlsx.test.ts` are unrelated to this task (schema drift in test fixtures, Buffer type mismatch). `formula.ts` and `arithmetic.ts` are clean.

## Concerns

None for this task. The implementation is minimal and strictly scoped:
- `min`/`max` are the only names added to `SUPPORTED_FUNCTIONS`.
- The comma token is only meaningful inside a `fn` parse arm; in all other contexts it would cause "Unerwartetes Token am Ende des Ausdrucks" which is the correct failure mode.
- Nested `min(max(a, b), c)` would work correctly (both names are in the set and `parseExpr` recurses).
- 3-arg calls like `min(a, b, c)` would parse `a`, consume the first comma, parse `b`, then expect `)` but find `,` → throws "Fehlende schließende Klammer" → `manual_required`. Correct behaviour.
