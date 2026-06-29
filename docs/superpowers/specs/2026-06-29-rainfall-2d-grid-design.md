# Rainfall 2D KOSTRA Grid (Model A) — Design

> Status: **DESIGN — for Alvaro's review before any build.** Grounded in DWA-A 138-1
> (§3.2 Tab.2, §5.3.3.4 Tab.8, §5.3.3.5 Gl.3, §5.3.4 Gl.10) and the KOSTRA-DWD-2020 grid
> structure — NOT from the UI. Evolves Piece 2 (multi-table) + Piece 1 (governing engine).

## 0. Base-branch decision — CONFIRM FIRST

You said "isolated branch off clean `origin/main`." This work **cannot** sit on bare
`origin/main` (`294c89d`): it directly extends `src/lib/eval/rainfall-tables.ts` (Piece 2),
the governing-duration resolution (Piece 1), and the A138-26 flood path. Bare main has none
of those. So this branch is based on the **union** `integration/rainfall-govdur` (`7b4510a`
= Piece 2 + Piece 1 + Gl.8 unification), branch `feat/rainfall-2d-grid`.

**Implication:** the 2D grid supersedes Piece 2's 1D carrier; it should ship *after* (or
together with) the union. If you'd rather it be standalone off bare main, we'd have to
re-include Piece 2 — not advised. **Decision needed: confirm union base.**

## 1. Source grounding (the structure, from the standard)

- **`r_D` is a function of two variables — duration D and return period T_n.** §5.3.3.5 Gl.3
  / §3.2 Tab.2 give `r_D(D, T_n)` (Regenspende). The KOSTRA-DWD-2020 atlas is a **2D grid per
  Rasterfeld (location)**: rows = Dauerstufe D, columns = Wiederkehrzeit T_n.
- **Return-period set (columns).** KOSTRA-DWD-2020 standard annuities:
  **T_n ∈ {1, 2, 3, 5, 10, 30, 50, 100} a** (confirmed by you against the atlas). These are the
  grid's fixed columns; the per-D `r_D` values are **project data** entered once per location.
- **T_n is set per protection category — §5.3.3.4 Tab.8.** The design return period is chosen
  from Tab.8 by the Schutzkategorie, and is already encoded as A138-08's `T_n`
  (`Wiederkehrzeit T_n`, unit `a`) + `n` (`Bemessungshäufigkeit n`, unit `1/a`, with `n = 1/T_n`).
  Audit ref: `audit-reports/DWA-A-138-1/A138-04.md` (`a138_jaehrlichkeit_T → §3.2 Tab.2 + §5.3.3.4 Tab.8`).
- **Flood case — §5.3.4 Gl.10 — uses T_n = 30 a.** Gl.10 (A138-26) is
  `V_Rueck = ((r_D(T_n_Ue)·(Σ(A_E_b_a·C_S)+A_VA)/10000) − (Q_S+Q_Dr))·D·60/1000 − V_VA ≥ 0`,
  with `T_n_Ue = 30 a`. So the flood "r_D(30)" is **just the T_n=30 column** of the same grid.

## 2. The model (Model A)

**One location = one Rasterfeld = ONE 2D table.** Values entered once per location; the full
grid (D × T_n) lives in a single carrier. **No location's data is ever duplicated across
tables** (that would violate single-source). A project with N locations holds N such 2D tables
(this is exactly Piece 2's per-location collection — each table simply grows from 1 column to
the full T_n set).

**T_n is per-case, not per-table.** Each facility/case uses the column for **its own** T_n:
- A facility inherits `T_n` from A138-08 (per Tab.8 / its protection category).
- That inherited T_n **selects the column**; the governing-duration iteration **sweeps D within
  that column**; `r_D` **derives** at the governing D — never free-picked.
- The flood case (A138-26) selects the **T_n = 30** column of the same grid.

This composes with Piece 2: a facility (a) references **which location's table** (`rainfall_table_ref`,
Piece 2) and (b) reads **which column** (its inherited `T_n`). Selecting is always input;
`r_D` always derives.

## 3. Data model

### 3.1 Carrier shape evolution (`src/lib/eval/rainfall-tables.ts`)

Today (Piece 2, 1D):
```ts
type RainfallRow = { D_min: number | null; r_D_n: number | null };
type RainfallTable = { id; name; source; gridCell?; note?; rows: RainfallRow[] };
type RainfallCarrier = { tables: RainfallTable[] };
```
New (2D). **Additive + legacy-tolerant** — the row gains a per-T_n value map; the table
declares its column set:
```ts
/** Canonical KOSTRA-DWD-2020 return-period columns (years). */
const RETURN_PERIODS = [1, 2, 3, 5, 10, 30, 50, 100] as const;
type ReturnPeriod = typeof RETURN_PERIODS[number];        // 1|2|3|5|10|30|50|100
type TnKey = `${ReturnPeriod}`;                            // "1"|"2"|…|"100"

/** A duration row: r_D for each return-period column. Missing/empty → null. */
type RainfallGridRow = { D_min: number | null; r: Partial<Record<TnKey, number | null>> };

type RainfallTable = {
  id; name; source; gridCell?; note?;
  /** Which columns this table carries (default = RETURN_PERIODS). */
  columns: ReturnPeriod[];
  rows: RainfallGridRow[];
  /** Back-compat marker: rows came from a legacy 1D table whose single curve is
   *  the project's DESIGN-T_n column (true until the engineer fills the real grid). */
  legacyDesignColumn?: boolean;
};
type RainfallCarrier = { tables: RainfallTable[] };
```

### 3.2 Column resolution (the new boundary — aggregator stays unchanged)

A pure helper turns the 2D table + a chosen T_n back into the **1D `{D_min, r_D_n}` slice** the
existing Gl.8 aggregator / governing engine already consume:
```ts
/** Slice the table to one return-period column → the 1D rows the aggregator iterates.
 *  - exact column present → use r[Tn].
 *  - else if legacyDesignColumn → use the single legacy curve for ANY T_n (back-compat).
 *  - else → null cells (aggregator emits manual_required: column not entered). */
function resolveColumn(table: RainfallTable, T_n: number): RainfallRow[] /* {D_min, r_D_n} */
```
Resolution order at each read site: `resolveSelectedTable(carrier, ref)` (Piece 2, picks the
location) → `resolveColumn(table, T_n)` (picks the T_n column) → 1D rows → **unchanged**
`KostraCarrier` → **unchanged** Gl.8 aggregator / `iterateGoverningDuration`. The 2D→1D slice is
the only new step; no aggregator/iteration math changes.

### 3.3 T_n inheritance to facilities

Currently `T_n` (A138-08) inherits only to **A138-04 + A138-26**. Facilities inherit `n` (=1/T_n).
To let a facility select its column, **extend `T_n.consumer_worksheets`** to the storage
facilities (A138-13/16/17/18/19/20/21/22) via migration (single-source: T_n stays owned by
A138-08, inherited by reference). The basin (A138-13) reads `T_n` for its column.
(`n = 1/T_n`; we use `T_n` directly as the column key — no recomputation.)

## 4. Flood-path unification (A138-26, Gl.10)

Today A138-26's `r_D_30` is a **free-typed** field feeding Gl.10's `r_D(T_n_Ue)`. Model A makes
it **derived from the same grid**: resolve the inherited carrier's **T_n=30 column** at the flood
duration (`D_flood_min`) → `r_D(30)`. So:
- `r_D_30` becomes a **derived** value (read-only), produced from the grid — retire its
  free-typed input (mirror the A138-07 "retire the orphaned input" precedent).
- Gl.10 math is **unchanged**; only its `r_D(T_n_Ue)` source changes from a typed field to the
  grid's 30-column slice at `D_flood_min`.
- Single-source win: the flood event no longer maintains a separate rainfall number.

## 5. Back-compat (existing 1D data → 2D)

Three populated shapes exist in the wild:
1. **Pre-Piece-2 legacy** `{ rows: [{D_min, r_D_n}] }` (e.g. PLT-HS-01's 16 rows).
2. **Piece-2** `{ tables: [{…, rows: [{D_min, r_D_n}] }] }`.
3. **2D** `{ tables: [{…, columns, rows: [{D_min, r}] }] }` (new).

`normalizeRainfallCarrier` (extended) maps 1+2 → 2D by wrapping the single 1D curve as the
table's **design column** (`legacyDesignColumn: true`, rows `{D_min, r: {}}` carrying the curve
under the back-compat path). **No blind data UPDATE** (A138-07 precedent): the legacy curve is
served for any T_n at read time (so the basin AND flood keep computing), and is **re-keyed to the
project's actual design-T_n column when the engineer next saves via the 2D editor** (app-path
canonicalization). Optionally, a one-time data migration can re-key per project from A138-08's
`T_n` — presented as a follow-up, not required for correctness.

**Result for PLT-HS-01:** its 16-row legacy curve becomes the design column; the basin reads it
for the project's T_n exactly as today (numbers unchanged) until the real 2D grid is filled.

## 6. The 18.684 witness (must stay green)

`formula-Gl8.test.ts`, `__tests__/governing-duration-basin.test.ts`, and
`engine-wiring-A138-13.test.tsx` assert **max V_VA = 18.684 m³ @ D=30**. After 2D:
- Their 1D fixtures normalize (legacy design column) → `resolveColumn(table, anyT_n)` returns the
  same `{D_min, r_D_n}` rows → **18.684 preserved** with no fixture change (back-compat path).
- We ADD a 2D-native witness: a grid whose **T_n=5 column** holds the same curve, facility
  `T_n=5` → resolveColumn → same rows → **18.684** (proves the 2D path reproduces the witness).
Both must be green; the legacy one is the regression guard, the 2D one proves the new path.

## 7. Single-source invariant adherence

- One 2D table per location; the curve for each (D, T_n) entered exactly once. ✓
- Facilities/flood **inherit by reference** (table-ref + inherited T_n); they never re-type
  `r_D` and never recompute. ✓
- `r_D` is **derived** (column slice + governing iteration), never free-picked. ✓ (flood `r_D_30`
  moves from typed → derived.)
- Ambiguity guard untouched; one owner (A138-04) for the grid. ✓

## 8. Out of scope (explicit)

- The geometry-coupled facility sizing profiles (Mulde/Rigole/MRE/Schacht/MRS — Piece 1 Task 6
  remainder) — still deferred; this design wires only the **basin (Gl.8)** + **flood (Gl.10)** to
  the column resolution. Other facilities gain it for free when their iteration is wired later.
- Tabelle-12 Nachweisverfahren / vernetzte Reihenschaltung (out of the per-facility model).
- Becken (A138-22) profile stays inert/banked (no UI change).

## 9. Files touched (map)

- **Modify** `src/lib/eval/rainfall-tables.ts` — 2D types, `RETURN_PERIODS`, `normalizeRainfallCarrier`
  (legacy→2D), `resolveColumn`. Keep `resolveSelectedTable`.
- **Modify** `src/lib/eval/use-equation-engine.ts` — after `resolveSelectedTable`, call
  `resolveColumn(table, inherited T_n)`; read `T_n` from fields.
- **Modify** `src/lib/eval/evaluate-for-report.ts` + `src/lib/snapshots/payload.ts` — same column
  slice (server + snapshot paths).
- **Modify** `src/lib/eval/aggregators.ts` (A138-26 Gl.10) + `use-equation-engine`/server — feed
  the grid's T_n=30 column at `D_flood_min` as `r_D(T_n_Ue)`; make `r_D_30` derived.
- **Modify** `src/components/worksheet/rainfall-tables-editor.tsx` — 2D matrix editor (D rows ×
  T_n columns). **Selector** unchanged (still table-id only; T_n is not picked).
- **Create** migrations: extend `T_n.consumer_worksheets` to facilities; retire/repoint `r_D_30`
  to derived. WRITTEN-NOT-APPLIED; rollback authored.
- **Tests**: 2D unit tests for `normalizeRainfallCarrier`/`resolveColumn`; 2D witness; flood-from-grid
  test; legacy back-compat test.

## 10. Discipline

Isolated branch `feat/rainfall-2d-grid` (off the union). Build → full unit suite + the 18.684
witness green → migrations written-not-applied + rollback → deploy `--prod --skip-domain` →
smoke-test the deploy's **own direct URL** (A138-04 2D grid editor; basin column resolves; flood
reads 30-column; Piece 2 selector intact) → **PAUSE for Alvaro's go before re-pointing the alias**.
