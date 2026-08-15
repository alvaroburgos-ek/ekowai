## Task 4 (Phase-4): REQ-19 gate enforcement verification — DONE

### Enforcement confirmed

**Grammar support (`IN {PASS, CONDITIONAL}`):**
`evaluate.ts:220–234` — `parseComparison` recognises `kw 'IN'` followed by `lbrace … rbrace` and builds an `in` node; `evalNode` at `evaluate.ts:431–435` checks `if (v === undefined || v === null || v === '') → missing` then `n.members.some((m) => equals(v, m.value))` → `'true'` or `'false'`. Brace-style is the only supported `IN` form; paren-style returns `manual` (confirmed by REQ-02 dead-check regression test in the same file).

**Block-is-blocking:**
`approval-gate.ts:91–98` (JSDoc) + `approval-gate.ts:228–257` — the gate queries only `severity = 'block'` rows, calls `evaluateCondition`, and pushes any `result.kind === 'fail'` row to `failingBlockConditions`; `ok = failingBlockConditions.length === 0`. A definite `fail` on a block-severity row **prevents the `engineer_approve` transition**. Pending/manual/pass do not block. Confirmed at `approval-gate.ts:249–251`.

### New assertions added

File: `src/lib/compliance/__tests__/enum-gated-conditions.test.ts` (after line 257)

| assertion | result | meaning |
|---|---|---|
| `phase_4_gate_result = 'CONDITIONAL'` | `pass` | both valid hand-off states covered |
| `phase_4_gate_result = 'FAIL'` (named) | `fail` | Phase-5 handoff explicitly blocked (named reproduction assertion, mirrors the pre-existing line 254-256) |
| absent key (`{}`) | `pending` | unset gate does NOT silently pass Phase-5 |
| explicit `null` value | `pending` | null treated as missing, same as absent |

### Test results

```
pnpm vitest run src/lib/compliance/__tests__/enum-gated-conditions.test.ts
→ 28 passed (was 25; +3 new)

pnpm vitest run --project unit
→ 119 files, 1145 passed + 1 expected fail — ALL GREEN

pnpm tsc --noEmit
→ 28 errors, 0 new (baseline files: worksheet-store-derived-apply, build-vsme-xlsx,
  pass3c-validate, export-route, build-workbook — all pre-existing/VSME)
```

### No concerns

REQ-19 enforces correctly. Grammar is supported (brace-style `IN`). Block-severity failure is blocking at `approval-gate.ts:249–251`. The NULL/absent property is now hardened by a dedicated reproduction assertion.
