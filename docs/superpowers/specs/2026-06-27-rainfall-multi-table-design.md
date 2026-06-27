# Rainfall Multi-Table / Source Layer — Design (Piece 2)

**Date:** 2026-06-27 · **Status:** scoped/approved-in-principle; DESIGN+PLAN only — PAUSE before migration/wiring (needs MCP token + live `r_D_n_table` verification + Alvaro's go).
**Branch:** `feat/rainfall-multi-table` (off `origin/main` `294c89d`).

## Goal

A project can hold **multiple rainfall tables** (KOSTRA-DWD-2020, local DWA-A 531, different grid cells), each with a **source/provenance tag**; each facility **references which table it uses**. The selection is of the **TABLE (data source) only — never an `r_D(n)` value** (the cancelled free-pick picker is not reintroduced — see [[project_kostra_rdn_accessor]]). The value a facility uses stays **derived** by the iteration (Gl.8, storage) or the prescribed fixed `D=10–15` (no-storage) — that derivation is **Piece 1**, out of scope here.

## Foundation, basin-only in effect (accepted)

Table-selection only has effect where the value is derived FROM the table. Today only the **basin (A138-13/Gl.8)** iterates the table, so Piece 2 is **immediately useful for the basin** and is the **substrate Piece 1** derives against for the other facilities. This is accepted.

## Scope / isolation (hard)

Touches ONLY: the rainfall-table carrier shape + its normalizer, the table editor UI, a per-facility table-selector field + component, the carrier-**resolution** step feeding the aggregator, the server report/snapshot read paths, and a single-table→collection migration. Does **NOT** touch: the **Gl.8 aggregator math/signature**, value-derivation, **Tab.9**, the **flood path**, or **main**. The change lives **strictly at the table-resolution boundary**, never inside the aggregator.

## Current state (confirmed read-only)

Exactly **one** rainfall table per project: `r_D_n_table` is a single json carrier field owned on **A138-04**, inherited by **symbol** to facilities (`use-equation-engine.ts` `fields.find(symbol==='r_D_n_table')`; `merge-inherited-fields.ts` via `originWorksheetCode`). Two producers of one symbol → the **ambiguity guard** fires, so multiple tables are actively rejected today. Carrier shape: `{ rows: [{ id, label?, D_min, r_D_n }] }`.

## Design decisions

1. **Collection in the same field (least invasive).** `r_D_n_table` carrier becomes `{ tables: [{ id, name, source, rows: [{ D_min, r_D_n }] }] }` on the **same single A138-04 field** — still one field/symbol, inherited exactly as today (no new producer → no ambiguity). Rejected alt: a separate project-level store (more invasive, new inheritance path).
2. **Source tag** per table entry: `source: 'KOSTRA-DWD-2020' | 'DWA-A-531-local' | 'engineer'`, plus optional `gridCell?: string` and free-text `note?`. (This **absorbs the earlier standalone "source-choice" piece** — source is now a per-table property.)
3. **Per-facility table reference** = a new atomic field `rainfall_table_ref` (a SELECT of a table `id`) on each storage facility worksheet. It is a legitimate free *input* (which data source applies here is an engineering decision), categorically distinct from picking a value. Rejected alt: a project-level facility→table map (less aligned with the field/worksheet model + the selector UI).
4. **Resolution rule:** `selected = tables.find(t => t.id === ref) ?? tables[0]` (default to the primary/first table when `ref` is unset or stale). The selected table's `rows` are passed to the **unchanged** aggregator. Resolution lives in the engine/report/snapshot layers, never in the aggregator.
5. **Back-compat / migration:** an existing single-table carrier `{ rows }` migrates to `{ tables: [{ id: <stable>, name: 'Standardtabelle', source: 'engineer', rows }] }`; all facilities default-reference that id → **behavior unchanged** until a second table is added. (Migration is token-gated; see below.)
6. **Table-selection, never value-selection (invariant):** the selector writes a table `id`; `r_D(n)` is never written/picked. Enforced by the field being an enum of table ids, and the value remaining engine-derived.

## DB-free vs token-gated

- **Buildable + testable NOW (DB-free):** the collection carrier type, a normalizer that accepts BOTH legacy `{ rows }` and new `{ tables }` (in-memory upgrade), the resolution helper (`resolveSelectedTable(carrier, ref)`), the multi-table editor UI, and the per-facility table-selector component (render tests).
- **GATED on MCP token + live verification + Alvaro's go:** the prod single-table→collection **migration**, the per-facility `rainfall_table_ref` **field additions** (schema/workbook), confirming the live `r_D_n_table` shape/data, and the final form/engine **wiring**. Build PAUSES here.

## Testing

TDD, DB-free: the normalizer (legacy `{rows}` + new `{tables}` + malformed), `resolveSelectedTable` (match / unset→primary / stale→primary / empty), editor + selector render tests. The aggregator is untouched and its existing tests must stay green.
