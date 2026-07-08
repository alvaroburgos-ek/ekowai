# Task 2b Report — materializeBasinGoverning + saveWorksheet wiring

## Status

DONE. Pure function implemented, unit tests green (12/12), wired into `saveWorksheet`, full unit suite passes (760/760), typecheck clean.

---

## 1. Pure function signature

**File:** `src/lib/eval/materialize-basin-governing.ts`

```ts
export type BasinGoverningInput = {
  carrierRaw: unknown;              // raw r_D_n_table JSON blob
  rainfallTableRef: string | null;  // selected table id (or null → primary)
  T_n: number | null;               // resolved return period (years)
  scalars: {
    A_C: number; A_VA: number; Q_S: number;
    Q_Dr: number; f_Z: number; f_A: number;
  };
};

export type BasinGoverningOutput = {
  r_D_n: number;   // l/(s·ha) — r_D at governing duration
  D_min: number;   // minutes  — governing duration
};

export function materializeBasinGoverning(
  input: BasinGoverningInput,
): BasinGoverningOutput | null
```

**Logic:**
1. All six scalars must be finite — else return `null`.
2. `normalizeRainfallCarrier(carrierRaw)` → `resolveSelectedTable(carrier, rainfallTableRef)` → `resolveColumn(table, T_n)`.
3. `column.status === 'missing'` → return `null` (withhold).
4. `iterateGoverningDuration(col.rows, basinProfile.sizing)` using the REGISTERED `GOVERNING_PROFILES` entry for `'A138-13'` — formula is NOT duplicated.
5. Returns `{ r_D_n: r_D_at_governing, D_min: governingD }` when both are finite; `null` otherwise.

---

## 2. saveWorksheet wiring

**File:** `src/lib/actions/worksheet.ts`

**Detection trigger:** A cheap indexed lookup for `fields.symbol = 'r_D_n_table'` in the saved batch, scoped to `instance.worksheetTemplateId`. Exactly mirrors the `surface_inventory` detection in the surface block.

**Scalar + T_n resolution:**
- Sibling template fields are queried (`basinWsFields`) for output field ids and to check if any scalar is being saved right now.
- Cross-worksheet scalars (`A_C`, `A_VA`, `Q_S`, `Q_Dr`, `f_Z`, `f_A`) and return-period symbols (`n`, `T_n`) are resolved from `project_parameters` via a join on `fields.symbol` across all active fields in the project. A same-batch override check ensures fields on this very template (if any) get the freshly saved value.
- `rainfall_table_ref` is read from the current save batch (if present) or from the existing `project_parameters` row.
- T_n is resolved via `facilityReturnPeriod('A138-13', pickNum)` — A138-13 has no local frequency field, so it uses project `n` → `1/n`, or `T_n` directly.

**UPSERT:**
- `BASIN_GOVERNING_SYMBOLS = ['r_D_n', 'D_min']` — field ids resolved from `basinIdBySymbol`.
- On governing success: `valueNumber = String(governing[sym])`, `sourceType = 'derived'`.
- On governing null (withhold): `valueNumber = null`, `sourceType = 'derived'` — **clears stale values** so A138-10 blanks-with-cause.
- Conflict target: `(projectId, fieldId)` — same as surface block.
- All within the same Drizzle transaction as the main parameter UPSERT.

---

## 3. Unit test results

**File:** `src/lib/eval/__tests__/materialize-basin-governing.test.ts`

| Case | Input | Expected | Result |
|---|---|---|---|
| Heinsberg legacy carrier, T_n=5 | full scalars, T_n=5, legacyDesignColumn | r_D_n=130, D_min=30 | PASS |
| Legacy carrier, T_n=null | full scalars, T_n=null, legacyDesignColumn | r_D_n=130, D_min=30 | PASS |
| 2D native carrier, T_n=5 column | full scalars, T_n=5, native rows `r: {'5': ...}` | r_D_n=130, D_min=30 | PASS |
| Empty carrier `{tables:[]}` | full scalars | null | PASS |
| Null carrier | full scalars | null | PASS |
| Native table + T_n=null | full scalars, native table | null (missing column) | PASS |
| Native table, T_n not in columns | full scalars, T_n=10 not in native | null (missing column) | PASS |
| Missing scalar (A_C=null) | legacyDesignColumn | null | PASS |
| NaN scalar (Q_S=NaN) | legacyDesignColumn | null | PASS |
| All scalars null | legacyDesignColumn | null | PASS |
| Non-existent table ref + empty carrier | stale rainfallTableRef | null | PASS |
| Table ref selection (table-B) | two tables, ref='table-B' (Heinsberg) | r_D_n=130, D_min=30 | PASS |

**r_D_n=130, D_min=30 witness confirmed in 3 independent cases.**

---

## 4. Basin 18.684 witness

Confirmed green. The governing-duration-basin.test.ts and formula-Gl8.test.ts tests are untouched and pass in the full unit suite (760/760, 88 files).

The pure function reuses the registered `GOVERNING_PROFILES` entry for `'A138-13'` — the sizing formula is defined exactly once. No divergence between `materializeBasinGoverning` and the live engine is possible at runtime.

---

## 5. Typecheck

```
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "materialize-basin|worksheet.ts" → clean
```

---

## 6. Live DB-persist smoke-verification note

The basin governing UPSERT path in `saveWorksheet` is **not covered by automated DB tests** (the integration test suite requires a real Postgres and is excluded from the unit run). The following must be verified at cutover:

1. Open an A138-13 worksheet that has a complete rainfall table + inherited scalars.
2. Save the worksheet.
3. Query `project_parameters` for the project: confirm `r_D_n` and `D_min` rows with `source_type='derived'` appear on the A138-13 field ids, and that their numeric values match the engine's displayed governing duration and intensity.
4. Open A138-10 for the same project: confirm `r_D_n` and `D_min` show as derived/read-only (inheriting from A138-13's rows), and `Q_zu` auto-computes.
5. Verify withhold: remove a scalar (or use a native table with no matching T_n column). Save A138-13. Confirm the derived rows clear (valueNumber=null), and A138-10 blanks-with-cause.

**Known concern:** The scalar lookup queries ALL active fields in the project by symbol. If another standard in the same project has fields with the same symbols (`A_C`, `f_Z`, etc.) and those fields happen to have project_parameters rows, the first-wins disambiguation may pick the wrong value. The risk is low in the current DB (A138 symbols are standard-specific), but the cutover smoke should confirm the correct values are written.

**Known constraint:** The Task-3 migration (deactivating A138-10's local `r_D_n`/`D_min` fields and adding A138-13 producer fields with those symbols) must be applied before A138-10 inherits the derived rows. Without the migration, the `basinIdBySymbol` lookup for `r_D_n` and `D_min` finds A138-13's own active fields (if they already exist) — the UPSERT still works, but A138-10 won't yet see them as inherited. This is the gated step documented in Task 3.
