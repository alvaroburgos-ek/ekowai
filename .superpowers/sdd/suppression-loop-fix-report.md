---
title: "Suppression loop fix — Gl.7 A_S,m write-back for all non-direct methods"
created: 2026-07-09
tags: [a138-asm, bugfix, suppression, infinite-save-loop]
status: done
---

## Condition change (old → new)

**Old** (commit 2ec7817, `worksheet-form.tsx`):
```ts
() => (asmMethod === 'manual' ? new Set(['A_S_m']) : EMPTY_SUPPRESSED)
```

**New** (this fix):
```ts
() => asmEngineSuppressedSymbols(asmMethod)
```

Where `asmEngineSuppressedSymbols` in `src/lib/eval/asm-source.ts` implements:
```ts
if (asmMethod != null && asmMethod !== 'direct') {
  return new Set(['A_S_m']);
}
return _EMPTY_ASM_SUPPRESSED; // stable module-level reference
```

## Helper extracted

`asmEngineSuppressedSymbols(asmMethod: string | null): ReadonlySet<string>` was added as a
pure exported function in `src/lib/eval/asm-source.ts`. This makes the ownership logic
testable in isolation (no DOM/timer integration test required) and reusable from
`worksheet-form.tsx`.

The stable-empty-set (`_EMPTY_ASM_SUPPRESSED`) moved into `asm-source.ts` (private module-level
constant). The now-redundant `EMPTY_SUPPRESSED` constant in `worksheet-form.tsx` was removed.

The `isComputed` prop on `DynamicField` for `A_S_m` was updated to use the same condition:
```ts
// old
!(f.symbol === 'A_S_m' && asmMethod === 'manual')
// new
!(f.symbol === 'A_S_m' && asmMethod != null && asmMethod !== 'direct')
```
This ensures the field is rendered as editable (not read-only) for all server-owned methods.

## Four-method + null trace (unit tests in `asm-source.test.ts`)

| asmMethod      | A_S_m in suppress set? | Owner             | Reason                                             |
|----------------|------------------------|-------------------|----------------------------------------------------|
| `'direct'`     | NO                     | Gl.7 (client)     | Formula engine is authoritative — write-back runs  |
| `null` (unset) | NO                     | Gl.7 (client)     | Defaults to direct behaviour                       |
| `'manual'`     | YES                    | Server (manual)   | Engineer enters value; Gl.7 must not clobber       |
| `'geometry'`   | YES                    | Server (geometry) | A138-17/18 geometry eqs produce value              |
| `'soil_est'`   | YES                    | Server (materialize) | materializeAsm from Tab.13/A_C; Gl.7 writes 45 vs server 967 → loop |

All five cases asserted in `src/lib/eval/__tests__/asm-source.test.ts` under the
`asmEngineSuppressedSymbols — Gl.7 write-back ownership` describe block (6 `it()` cases,
including a stable-reference identity check for the non-suppressed path).

## Why direct is the only non-suppressed method

`A_S,m = (A_S,min + A_S,max)/2` (Gl.7) is computed entirely from client-side inputs — it
runs in the browser formula engine and writes back immediately. For `direct` the client IS the
sole producer. For all other methods a server-side pipeline (materializeAsm) derives A_S_m from
a different data source (Tab.13+A_C for soil_estimate; geometry equations on A138-17/18 for
geometry; engineer entry for manual). These must never be overwritten by Gl.7's stale result.

## Test + typecheck results

- `pnpm vitest run src/lib/eval/__tests__`: **349 tests, 39 files — all passed**
  (includes 6 new `asmEngineSuppressedSymbols` cases in `asm-source.test.ts`)
- `pnpm vitest run src/components/worksheet/__tests__`: **159 tests, 20 files — all passed**
- `npx tsc --noEmit` — **0 errors in worksheet-form.tsx and asm-source.ts**.
  Pre-existing errors remain in `scripts/__tests__/`, `vsme/`, and `export/` (unrelated, unchanged).

## Self-review

- The fix is minimal: only the suppression condition and the `isComputed` condition changed.
- No server materialize, no engine write-back mechanism, no non-A_S_m behaviour touched.
- `EMPTY_SUPPRESSED` removal from `worksheet-form.tsx` is safe — the stable reference now lives
  in `asm-source.ts` as `_EMPTY_ASM_SUPPRESSED` (module-private).
- The helper is pure (no side effects, no imports from React or the store) — safe to call from
  any context.

## Concerns

- The `isComputed` update also broadens editability for `geometry` and `soil_estimate` on
  the DynamicField. For `geometry` the A_S_m field should arguably be read-only (it's
  produced by server geometry equations). If a future task locks geometry-produced fields,
  the `isComputed` check here would need a second pass. For now the spec says YAGNI and
  the primary fix is the suppression set.
- Live idle-open verification (worksheet open >3 debounce cycles, zero A_S_m writes after
  initial save) was NOT run here — it is a post-redeploy manual check per the brief.
