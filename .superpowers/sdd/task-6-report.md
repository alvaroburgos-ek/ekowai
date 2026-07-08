# Task 6 Report — Producer-fired A_S,m geometry write-back + chained Tab.6 re-fire

**Status: DONE**
**Commit:** `d6ee1d7` — feat(a138): producer-fired A_S,m geometry write-back + chained Tab.6/q_S_AC re-fire
**Branch:** feat/a138-asm-single-source

---

## Branch added

Added `else if (producerEntry.id === 'asm')` after the `if (producerEntry.id === 'loading')` block in the `for (const producerEntry of producerEntries)` dispatch loop in `src/lib/actions/worksheet.ts`.

**Anchors mirrored from the `loading` producer branch:**
- Consumer-template resolution: `const [asmConsumerTmpl] = savedStandardId ? await tx.select(...).where(and(eq(worksheetTemplates.code, producerEntry.consumerTemplateCode), eq(worksheetTemplates.standardId, savedStandardId))).limit(1) : []` — fail-closed skip when not found.
- Field-id resolution: `asmCWsFields` queried from `asmConsumerTmpl.id` (the consumer A138-12 template), not `instance.worksheetTemplateId`.
- UPSERT shape: `valueNumber, valueText: null, sourceType: 'derived', enteredBy: userId, enteredAt: now; onConflictDoUpdate incl. valueText`.
- Push to `writtenDerived`.

---

## How the r_D_n_table rows are read for the Mulde sweep

Exactly mirrors the `isBasinSave` block:

1. Global symbol lookup: `await tx.select({ id: fields.id }).from(fields).where(and(eq(fields.symbol, 'r_D_n_table'), eq(fields.active, true))).limit(1)` — same as basin's carrier read (no scope by template; today one owner).
2. Read `valueJson` from `project_parameters` for the project.
3. `normalizeRainfallCarrier(muldeCarrierRaw)` → `resolveSelectedTable(carrier, muldeRainfallTableRef)` → `resolveColumn(table, muldeT_n)`.
4. `col.rows` (type `RainfallRow[]` with `{ D_min, r_D_n }`) passed directly to `computeMuldeGeometrySweep(col.rows, { A_C, h_M, f_Z, k_i })`.

`rainfall_table_ref`: read from the producer (A138-17) save batch first, then persisted — same pattern the basin block uses for its `rainfall_table_ref`.

T_n: resolved via `facilityReturnPeriod('A138-17', pickMuldeNum)` — reads `n_M_Bemessung` (A138-17 local, from `FACILITY_FREQUENCY_SYMBOL`) then project `n`/`T_n`. Cross-worksheet scalars read via `inArray(fields.symbol, MULDE_SCALAR_SYMS)` across all active fields; save batch overrides applied for producer (A138-17) fields.

---

## How the consumer template is resolved

```typescript
const [asmConsumerTmpl] = savedStandardId
  ? await tx
      .select({ id: worksheetTemplates.id })
      .from(worksheetTemplates)
      .where(and(
        eq(worksheetTemplates.code, producerEntry.consumerTemplateCode), // 'A138-12'
        eq(worksheetTemplates.standardId, savedStandardId),
      ))
      .limit(1)
  : [];
if (!asmConsumerTmpl) { continue; }
```

Identical to the `loading` producer branch. `savedStandardId` scopes the resolution so cross-standard misfires are impossible. Field ids are resolved from `asmConsumerTmpl.id`, not `instance.worksheetTemplateId`.

---

## Rigole one-shot formula

```
Gl.17: A_S,m = (b_R + h_R) · L_R + b_R · h_R
```

`b_R`, `h_R`, `L_R` read cross-worksheet by symbol, with save-batch overrides from the producer (A138-18). Missing any scalar → `geometryValueP = null` → `materializeAsm` returns indeterminate.

---

## Chained Tab.6 re-fire

After the A_S_m UPSERT (step 6), the branch immediately re-runs `materializeLoadingCheck` with:
- `A_S_m: asmOutP.A_S_m` — used directly from the materialize output (no DB round-trip; consistent with the prior UPSERT).
- `A_C, flaechengruppe, bbz_thickness` — read from `project_parameters` via the same cross-worksheet pattern as the `loading` producer branch.
- UPSERT the four `ac_as_ratio*` rows onto the A138-12 consumer template's field ids (using `asmCIdBySymbol` already resolved for the consumer).
- Push to `writtenDerived`.

Gated inside `if (asmConsumerFieldId && asmOutP.A_S_m != null)` — the Tab.6 re-fire only runs when A_S_m is computable and was persisted.

---

## Imports added to worksheet.ts

```typescript
import { materializeAsm, computeMuldeGeometrySweep } from '@/lib/eval/materialize-asm';
import { normalizeRainfallCarrier, resolveSelectedTable, resolveColumn, FACILITY_FREQUENCY_SYMBOL } from '@/lib/eval/rainfall-tables';
```

---

## Test evidence

- `pnpm vitest run src/lib/actions/__tests__/materialize-registry.test.ts src/lib/actions/__tests__/worksheet-asm.test.ts` → **9/9 PASS**
- `pnpm vitest run src/lib/actions/__tests__ src/lib/eval/__tests__` → **429/429 unit tests PASS** (7 integration suites skipped — pre-existing DATABASE_URL missing in this env, not caused by these changes)
- `npx tsc --noEmit`: zero errors in `worksheet.ts`; pre-existing errors in other files (scripts/, export tests, state tests) unchanged.

---

## Self-review

- The `loading` producer branch is mirrored structurally (consumer-template lookup, field-id resolution, UPSERT shape, writtenDerived push) — no pattern deviations.
- The r_D_n_table carrier read is verbatim-identical to the `isBasinSave` pattern (global symbol, single limit(1), valueJson).
- The Rigole formula `(b_R + h_R) * L_R + b_R * h_R` is Gl.17 verbatim.
- The chained Tab.6 re-fire avoids stale-verdict via in-branch re-run after the A_S_m UPSERT.
- Non-geometry methods (`direct`, `soil_estimate`, `manual`) set `geometryValueP = null` — `materializeAsm` handles them via their own A138-12 inputs.
- `facility_type_selected` change on A138-15 for non-Mulde/Rigole types: `geometryValueP = null` → `materializeAsm` returns indeterminate → UPSERT gated, no stale overwrite.

---

## Concerns

1. **Loop ordering / loading runs first:** The `loading` entry precedes `asm` in `MATERIALIZE_REGISTRY` so loading fires first in the loop with the OLD persisted A_S_m. If both fire in the same save, loading's Tab.6 result is immediately overwritten by the asm branch's chained re-fire. Net result correct, two UPSERTs instead of one. Low cost, no integrity issue.

2. **Single-owner assumption for `r_D_n_table`, `b_R`, `h_R`, `L_R`:** Same caveat as basin cross-ws comment — if two templates ever introduce the same symbol, first-row-wins. Flagged identically to existing basin block.

---

## Report path

`C:/Users/Ekowai/_wt-a138-asm/.superpowers/sdd/task-6-report.md`
