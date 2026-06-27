# Rainfall Multi-Table / Source Layer (Piece 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let a project hold multiple rainfall tables (KOSTRA-DWD-2020 / DWA-A-531-local / grid cells), each source-tagged, and let each facility reference which table it uses — selecting the TABLE only, never an `r_D(n)` value. Value stays engine-derived (Piece 1).

**Architecture:** The single A138-04 `r_D_n_table` carrier becomes `{ tables: [{ id, name, source, rows }] }`. A resolution helper picks the facility's referenced table (default = primary) and feeds its rows to the UNCHANGED Gl.8 aggregator. Change stays strictly at the table-resolution boundary.

**Tech Stack:** TypeScript, Next.js, Drizzle, Vitest.

## Global Constraints

- Touches ONLY: rainfall carrier shape + normalizer, table editor UI, per-facility table-selector field+component, the carrier-resolution step (engine + report/snapshot read paths), a single-table→collection migration. Does NOT touch Gl.8 math/signature, value-derivation, Tab.9, the flood path, or `main`.
- **Selection is of the TABLE id only — never an `r_D(n)` value.** Do not reintroduce the cancelled free-pick picker.
- Tasks 1–4 are **DB-free**, buildable now. Tasks 5–7 are **GATED** on the MCP token + live `r_D_n_table` verification + Alvaro's go — **PAUSE before them**.
- Branch `feat/rainfall-multi-table` off `origin/main` `294c89d`, worktree `C:/Users/Ekowai/_wt-rainfall` (node_modules junction). Tests: `pnpm vitest run <path>`.
- Legacy carrier shape: `{ rows: [{ id, label?, D_min, r_D_n }] }`. New: `{ tables: [{ id, name, source, rows: [...] }] }`.

---

### Task 1: Multi-table carrier type + tolerant normalizer (DB-free)

**Files:** Create `src/lib/eval/rainfall-tables.ts`; Test `src/lib/eval/__tests__/rainfall-tables.test.ts`.

**Interfaces / Produces:**
- `type RainfallSource = 'KOSTRA-DWD-2020' | 'DWA-A-531-local' | 'engineer'`
- `type RainfallTable = { id: string; name: string; source: RainfallSource; gridCell?: string; note?: string; rows: Array<{ D_min: number | null; r_D_n: number | null }> }`
- `type RainfallCarrier = { tables: RainfallTable[] }`
- `normalizeRainfallCarrier(raw: unknown): RainfallCarrier` — accepts BOTH legacy `{ rows }` (wraps as one `engineer` table id `'default'`) and new `{ tables }`; safe on malformed (`{ tables: [] }`).

- [ ] **Step 1: Failing test** — legacy `{rows}` wraps into one table; new `{tables}` passes through; malformed → `{tables:[]}`.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/eval/__tests__/rainfall-tables.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** the types + `normalizeRainfallCarrier` (legacy detection: `raw.rows` array & no `raw.tables` → wrap).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(eval): multi-table rainfall carrier type + legacy-tolerant normalizer`.

---

### Task 2: `resolveSelectedTable` helper (DB-free)

**Files:** Modify `src/lib/eval/rainfall-tables.ts`; Test `src/lib/eval/__tests__/rainfall-tables-resolve.test.ts`.

**Produces:** `resolveSelectedTable(carrier: RainfallCarrier, ref: string | null): RainfallTable | null` — returns `tables.find(id===ref)`, else `tables[0]` (primary) when `ref` is null/stale, else `null` when no tables.

- [ ] **Step 1: Failing test** — match by id; unset ref → primary; stale ref → primary; empty tables → null.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(eval): resolveSelectedTable (default to primary)`.

---

### Task 3: Multi-table editor UI (DB-free)

**Files:** Create `src/components/worksheet/rainfall-tables-editor.tsx`; Test `__tests__/rainfall-tables-editor.test.tsx`.

**Behavior:** manage N tables (add/remove/name/source/gridCell + per-table duration rows reusing the existing row editor); writes the `{ tables }` carrier to the store. Does NOT alter the per-row `(D_min, r_D_n)` entry semantics (still free-entry — project data). Render test: renders existing tables; "Tabelle hinzufügen" adds an entry; source `<select>` present.

- [ ] Steps 1–5: failing render test → implement → pass → commit `feat(worksheet): multi-table rainfall editor (manage N source-tagged tables)`.

---

### Task 4: Per-facility table-selector component (DB-free)

**Files:** Create `src/components/worksheet/rainfall-table-selector.tsx`; Test `__tests__/rainfall-table-selector.test.tsx`.

**Behavior:** a `<select>` of the project's table ids (label = `name` + source badge); value = selected table id; `onSelect(id)`. Read-only when locked. **Never renders an `r_D(n)` value input.** Render test: options listed; selecting calls `onSelect`; no `spinbutton`.

- [ ] Steps 1–5: failing render test → implement → pass → commit `feat(worksheet): per-facility rainfall table-selector (table id only)`.

---

> ⚠️ **PAUSE HERE.** Tasks 5–7 need the MCP token + live verification of the prod `r_D_n_table` shape/data + Alvaro's go. Do NOT build them until then.

### Task 5 (GATED): Resolution wiring — feed the selected table to the unchanged aggregator
- Verify live `r_D_n_table` shape/data first.
- In `use-equation-engine.ts` (and the server `evaluate-for-report.ts`, `snapshots/payload.ts`): replace the direct single-carrier read with `resolveSelectedTable(normalizeRainfallCarrier(carrier), facilityRef).rows` → pass to the SAME Gl.8 aggregator. No aggregator change. DB-free engine integration test (mocked fields/values) asserting the basin iterates the SELECTED table's rows.

### Task 6 (GATED): Per-facility `rainfall_table_ref` field + single-table→collection migration
- Add `rainfall_table_ref` atomic field to the storage-facility worksheets (schema/workbook — confirm against live). Migration: wrap existing `{rows}` → `{tables:[{id:'default',...}]}`; default all facility refs to `'default'` (behavior unchanged). Idempotent; rollback authored.

### Task 7 (GATED): Final wiring + verify + PAUSE for cutover
- Render the multi-table editor on A138-04; render the table-selector on each facility; full unit suite green + typecheck. PAUSE → report to Alvaro for the prod cutover go (no access-control migration; deploy→smoke-on-direct-URL→alias per the deploy playbook).

---

## Self-Review
- Spec coverage: collection model (T1), resolution+default (T2), multi-table editor (T3), table-selector/table-only (T4), wiring at the boundary (T5), per-facility ref + migration/back-compat (T6), cutover (T7). Source-choice absorbed as a per-table tag (T1). Gl.8/Tab.9/flood/main untouched (Global Constraints).
- Placeholders: the per-facility field symbol + the live carrier shape are explicit Task-5/6 confirmations (token-gated), not silent gaps.
- Invariant: selection is table-id only; `r_D(n)` never picked (T4) — never reintroduces the cancelled picker.

## Playbook capture (after Piece 2 lands)
Record in `docs/superpowers/single-source-standard-consolidation-playbook.md`: the multi-table/source layer (collection-in-one-field + per-facility table-reference + resolution-boundary), the **table-selection-not-value-selection** invariant, and the ordered relationship to Piece 1 (per-facility derivation) and Piece 3 (comparison view).
