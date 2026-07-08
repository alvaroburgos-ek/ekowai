# A_S,m Per-Facility Single-Source Design (DWA-A 138-1)

> **For agentic workers:** this is a DESIGN document. The implementation plan
> is written separately (writing-plans) after this design is approved.

**Goal:** Make the mean infiltration surface area `A_S,m` a single-sourced,
derived quantity: exactly one authoritative producer per design run (chosen by a
determination-method selector bound to the selected facility type), with every
downstream consumer inheriting it by reference and never re-deriving it. This
structurally eliminates the "three producers, one field, first-non-null-wins"
collision and subsumes the A138-12 A_S/A_S,m drift defect.

**Architecture:** `A_S,m` keeps its single canonical home field on A138-12. A
new `a_s_m_determination_method` selector resolves — together with
`facility_type_selected` — to the *one* equation that may write `A_S,m` in a
given run. Geometry methods that live on Phase-4 facility worksheets write back
to the canonical A138-12 field through the existing producer-side materialize
registry (the B1 mechanism), which also re-fires the Phase-3 consumers
(`q_S_AC`, the Tab.6 loading check) when the authoritative value changes. Manual
entry is a first-class method with required provenance.

**Tech Stack:** Next.js (App Router, the vendored breaking-change build) +
Drizzle/Postgres (Supabase). Server-side materialize in the `saveWorksheet`
transaction. TypeScript discriminated unions for method/provenance state.
Vitest via the isolated pnpm store (defect-register P1).

## Global Constraints

- **Single write-path invariant** (STANDING rule, `project_single_source_derivation_invariant`):
  `A_S,m` is produced exactly once per run by one registered producer; all other
  worksheets inherit by reference and never recompute or re-enter it. No
  editable-derived-field state may exist for `A_S,m`.
- **Regression baseline PLT-HS-01 must stay identical** after this work:
  `A_C/A_S,m = 107,48`, Tab.6 limit `50`, check `fail`; `V_VA = 293,1695`;
  `Q_zu = 2,8312`; `q_S_AC = 0,00742`; `r_D_n = 5,8`, `D = 1440`. Configuration
  `flaechengruppe=V2`, `A_S = A_S_min = A_S_max = 45` ⇒ `A_S,m = 45`. See
  `01-Projects/ekowai-wizard/plt-hs-01-regression-baseline.md`. In PLT-HS-01 the
  determination method is `direct` — the migration must default existing data to
  `direct` so the baseline is unchanged.
- **Consumers are method-agnostic.** `q_S_AC` (Gl.9), `V_M` (Gl.14/15), `V_VA`
  (Gl.41), and the Tab.6 check must run byte-identically against `A_S,m`
  regardless of which method produced it — no per-method branch in any consumer.
- **Facility-scoped, multi-facility non-foreclosing.** Build for one facility per
  run (the standard's Einfaches-Verfahren flow), but structure the resolver and
  field access behind one indirection so a future per-facility inventory is an
  additive change, not a rewrite. §11 states exactly what would change.
- **German UI copy, English code/docs.** Match existing worksheet field wording.
- **Alvaro's git identity** (`alvaro.burgos@ekowai.com`); test only on the
  `-hannesoster-` alias after hard-reload (defect-register P2).

---

## 1. Problem statement (grounded in the DB, 2026-07-08)

### 1.1 Producer topology — three producers of one symbol

`A_S_m` is the `output_symbol` of three equations spanning the phase boundary:

| Worksheet | Phase | Eq | Formula | Clause | Method |
|---|---|---|---|---|---|
| **A138-12** | 3 | Gl.7 | `A_S_m = (A_S_min + A_S_max) / 2` | §5.3.3.6 | direct |
| **A138-17** (Mulde) | 4 | Gl.16 | `A_S_m = (A_C·10⁻⁷·r_D(n)) / (h_M/(D·60·f_Z) + k_i)` | §6.3.2 | geometry |
| **A138-18** (Rigole) | 4 | Gl.17 | `A_S_m = (b_R + h_R)·L_R + b_R·h_R` | §6.4.2 | geometry |

Only **one field** for `A_S_m` exists — on **A138-12** — with a declared
`consumer_worksheets` list `[A138-13, A138-15, A138-16, A138-17, A138-19,
A138-20, A138-22, A138-25]`. A138-12 also owns `A_S`, `A_S_min`, `A_S_max`.
A138-17 and A138-18 own **no** `A_S_m` field; their Gl.16/Gl.17 outputs have
nowhere canonical to land, so today they either compute transiently or collide
with A138-12's value through the symbol resolver.

### 1.2 Consumers of A_S,m

| Consumer | Phase | Eq | Uses A_S,m for |
|---|---|---|---|
| A138-13 | 3 | Gl.9 | `q_S_AC = (k_i·A_S_m·1000 + Q_Dr)/A_C·10⁴` |
| A138-17 | 4 | Gl.14 / Gl.15 | `V_M` (loss term / geometric) |
| A138-22 | 4 | Gl.41 | `V_VA` (basin infiltration volume) |
| A138-12 | 3 | Tab.6 | `A_C/A_S_m ≤ limit` (the B1 loading check) |

### 1.3 The three defects this creates

1. **Multi-producer collision.** `loadSameSymbolValues` resolves `A_S_m`
   symbol-only ("first non-null wins" by ancestor → stage → recency), **not**
   scoped to the selected facility. With A138-12 (direct) and A138-17/18
   (geometry) all holding an `A_S_m`, the wrong value can win — independent of
   what the engineer actually chose on A138-15.
2. **Phase-ordering hazard.** `q_S_AC` (A138-13, Phase 3) and the Tab.6 check
   (A138-12, Phase 3) consume `A_S_m` *before* the geometry producers
   (A138-17/18, Phase 4) can exist. If a Phase-4 geometry then re-derives
   `A_S_m`, the Phase-3 consumers hold a stale value unless something re-fires
   them.
3. **Editable-derived drift (defect-register #9, #8).** On A138-12, `A_S,m` is a
   derived output that can be hand-edited after Gl.7 computes it; nothing
   re-syncs, and `A_S_min ≤ A_S_max` is unvalidated. This is a symptom of the
   missing single-write-path, not a separate bug.

### 1.4 What is already right (do not regress)

- One canonical `A_S_m` field on A138-12 with a real consumer list.
- The B1 producer-side materialize registry already routes a producer's write to
  a consumer template by `code` scoped by `standard_id` (fail-closed), and
  re-fires downstream materializes when an input symbol actually changes.
- `facility_type_selected` (A138-15, enum `flaeche|mulde|rigole|schacht|becken`
  + documented `MRE|MRS`) is verified and consumed by the facility worksheets.

**Section 1 checkpoint — does this problem framing match your understanding?**

---

## 2. The model: A_S,m as one quantity with a determination-method selector

`A_S,m` is one physical quantity — the mean infiltration surface area of the
selected facility (source: §5.3.3.6 Gl.7 is the generic definition; the Mulde
and Rigole sections *solve for the same A_S,m* from geometry). It has multiple
**determination methods**; exactly one is active per run and is the sole writer.

```
a_s_m_determination_method ∈ { direct, geometry, soil_estimate, manual }
                                     │
        ┌────────────────────────────┼───────────────────────────┐
        ▼                            ▼                            ▼
   direct (Gl.7)            geometry (per facility)          manual
   A138-12                  Gl.16 Mulde / Gl.17 Rigole       A138-12 A_S_m
   A_S_min, A_S_max         (facility worksheet, Phase 4)    entered + provenance
        │                            │                            │
        └──────────── all write the ONE canonical A_S_m (A138-12) ┘
                                     │
      consumers read by reference (method-agnostic):
      q_S_AC (Gl.9) · Tab.6 check · V_M (Gl.14/15) · V_VA (Gl.41)
```

**Key decision — canonical home stays on A138-12.** A138-12 is Phase 3 (runs
every design, before facility selection) and already owns the field + consumer
list. Geometry producers on Phase-4 facility worksheets write back to A138-12's
`A_S_m` via the producer registry, rather than owning parallel `A_S_m` fields.
This is the single write-path: **one field, one active writer, chosen by the
method selector.** A138-17/A138-18 keep their geometry *inputs* (`h_M`; `b_R,
h_R, L_R`) and their *own* volume outputs (`V_M`, `V_R`), but not a rival
`A_S_m` field.

**Section 2 checkpoint — canonical home on A138-12, geometry writes back. OK?**

---

## 3. Producer-selection rule

Define one pure resolver (no side effects), the single place that maps run state
to the authoritative producer:

```ts
// src/lib/eval/asm-source.ts  (new)
type AsmMethod = 'direct' | 'geometry' | 'soil_estimate' | 'manual';

type AsmProducer =
  | { kind: 'direct'; equationId: GL7 }                       // A138-12
  | { kind: 'geometry'; worksheetCode: string; equationId: string } // facility Gl.16/17/…
  | { kind: 'soil_estimate'; factor: 0.10 | 0.20 }           // Tab.13, A138-12
  | { kind: 'manual' };                                        // entered on A138-12

function resolveAsmProducer(
  method: AsmMethod,
  facilityType: FacilityType | null,
): AsmProducer | { kind: 'unresolved'; reason: string };
```

Rules:
- `direct`, `soil_estimate`, `manual` resolve **without** a facility type
  (available in Phase 3 and Phase 4).
- `geometry` requires `facilityType`. It resolves to the facility worksheet's
  geometry equation: `mulde → A138-17/Gl.16`, `rigole → A138-18/Gl.17`. If
  `facilityType` is a type with **no** geometry method (e.g. `flaeche` uses Gl.12
  which outputs `A_S`, a required-area not `A_S,m`; `schacht`, `becken` — see
  §3.1), `geometry` is `unresolved` and the UI must fall back to
  `direct`/`manual`. Fail-closed: an unresolved producer never silently picks a
  stray `A_S_m`; the consumers see `indeterminate` (§9).
- Cross-worksheet reads of `A_S_m` go through the resolver, not raw
  `loadSameSymbolValues`. The read is scoped to the resolved producer's
  worksheet; other worksheets' `A_S_m` (if any survive) are ignored.

### 3.1 Facility-type → method availability (verified against §6)

| facility_type | worksheet | geometry eq | native A_S,m producer? |
|---|---|---|---|
| `flaeche` | A138-16 | Gl.12 → `A_S` (required area, §6.2.2) | **No** — Gl.12 outputs `A_S`, not `A_S,m`; A_S,m via `direct`/`manual` |
| `mulde` | A138-17 | Gl.16 → `A_S_m` | **Yes** (geometry) |
| `rigole` | A138-18 | Gl.17 → `A_S_m` | **Yes** (geometry) |
| `schacht` | A138-21 | Gl.34 → `A_S` (shaft area, §6.7.2) | **No** — `A_S` shaft, distinct; A_S,m via `direct`/`manual` |
| `becken` | A138-22 | Gl.41 consumes `A_S_m` | **No** — A138-22 is a *consumer*; A_S,m via `direct`/`manual` |
| `MRE`,`MRS` | A138-19/20 | (out of scope this piece) | flag as residue |

> **D-1 — RESOLVED (source-verified): `geometry` = `mulde`/`rigole` only.**
> Gl.12 → `A_S` is the Flächenversickerung design target (§5.3.3.7 "außer bei
> der Flächenversickerung"); Gl.34 → `A_S,Schacht` is the shaft-area chain; only
> Gl.16/Gl.17 produce `A_S,m` by name. `flaeche`/`schacht`/`becken` supply
> `A_S,m` by `direct` or `manual`.
>
> **Residue R-1 (open ratification — do NOT decide silently in the build).**
> Gl.34's `π·d_a·h_S/2` construction is *semantically* a mean infiltration area.
> Whether a `schacht` run should write its `A_S` back to the canonical `A_S,m`
> so `q_S_AC`/Tab.6 re-check against the shaft value is an open ratification
> item. Logged here; the plan treats `schacht` as `direct`/`manual` for `A_S,m`
> and flags R-1 for a human ruling before any schacht-geometry write-back.

**Section 3 checkpoint — resolver shape + method availability table. OK?**

---

## 4. Determination methods in detail

### 4.1 `direct` (Gl.7) — the Phase-3 default
- Inputs `A_S_min`, `A_S_max` on A138-12 (entered). `A_S_m = (A_S_min+A_S_max)/2`.
- Validation V-1: `A_S_min ≤ A_S_max` (defect #8) — block save with a field
  error when violated.
- This is the **migration default** for all existing data (baseline safety).

### 4.2 `geometry` — Phase-4 facility write-back
- `rigole`: Gl.17 = `(b_R+h_R)·L_R + b_R·h_R` — **one-shot** from `b_R, h_R, L_R`.
- `mulde`: Gl.16 is **ITERATIVE (A-2, source-verbatim):** "iterative Berechnung
  für unterschiedliche Dauerstufen D und jeweils zugehöriger Regenspende r_D(n)."
  The Mulde `A_S,m` is a **Dauerstufen sweep**: evaluate Gl.16 at each tabulated
  `(D, r_D(n))` and take the **governing = maximum required area** across the
  sweep. This reuses Piece-A's engine `iterateGoverningDuration(rows, sizing)`
  (`src/lib/eval/governing-duration.ts`) — the same r_D(n)-table row pattern the
  basin uses. A one-shot Gl.16 at a single D computes the **wrong** number.
- The facility worksheet's geometry equation is registered as a producer of the
  canonical A138-12 `A_S_m` (registry entry, §10). On facility save, the sweep
  runs, `A_S_m` (= governing max) materializes onto A138-12, and the Phase-3
  consumers re-fire.
- Validation V-2 (source cross-check, §6.3.2): the geometry result must satisfy
  the Gl.7 envelope — "der erforderliche Flächenbedarf entspricht mindestens der
  maximalen Versickerungsfläche `A_S,max`." **V-2 evaluates against the sweep
  result** (the governing max), not a single-D value. When `A_S_max` is present,
  flag (not block) if `A_S,m(geometry) < A_S_max`. This is a **validation**, not
  a compute; surfaced as a discriminated warning, never mutates the value.

### 4.3 `soil_estimate` (Tab.13) — third method — **D-2 encode now; A-1 binding**
- Source (verbatim): Tab.13 gives `A_S = 0,10·A_C` for **Mittel-/Feinsand** and
  `A_S = 0,20·A_C` for **schluffiger Sand / sandiger Schluff / Schluff** — a
  coarse pre-design estimate. Compute `A_S_m = factor·A_C` on A138-12.
- **A-1 — the band is a verbatim Bodenart selector, NOT a k_f threshold.**
  Tab.13 is keyed by Bodenart. There is **no `k_f` cut in the source**: the only
  `k_f ↔ Bodenart` correspondence is **Bild 2 (a figure)**, which Anhang A itself
  disqualifies as a sole source ("mehrere Größenordnungen" Unsicherheit).
  Therefore:
  - **Primary (built):** a **two-option Bodenart selector** mirroring Tab.13's
    rows verbatim — `Mittel-/Feinsand → 0,10`; `schluffiger Sand / sandiger
    Schluff / Schluff → 0,20`. This is the single source of the band.
  - **k_f seed (optional, badged):** at most a *suggestion* pre-selecting the
    Bodenart option from A138-05 `k_f` via Bild 2 — explicitly badged as an
    **encoder heuristic (figure-derived, NR, needs ratification)**, never
    authoritative, and easily omitted. Default for the build: **omit the seed**
    unless trivially cheap; the selector stands alone.
  - `soil_classification` (A138-05, free text) → Tab.13 enum promotion stays a
    follow-up (R-3).
- The Bodenart selector lives on A138-12 (co-located with the method selector);
  it is read only when `method = soil_estimate`.

### 4.4 `manual` — datasheet / proprietary units (source-sanctioned)
- Source: A_S,m "kann … vereinfacht vorgegeben werden"; the Fertigteil-Rigole
  case (§6.4.1) makes manufacturer data the honest source — **not** a deviation
  (does **not** route through A138-27).
- When `method = manual`: `A_S_m` is `entered` on A138-12 with a **required**
  provenance note (source/datasheet reference). Four requirements (your riders):
  1. Selected via the method selector — same single-write-path as every other
     method; **no editable-derived state** anywhere. (This is what structurally
     kills defect #9: `A_S,m` is never an editable derived field; it is either
     computed by the active method or entered *because* the active method is
     `manual`.)
  2. Provenance note required + a visible "specified, not derived" badge +
     an explicit line in the PDF report.
  3. All downstream checks (Gl.9, Tab.6, Gl.41) run unchanged against the manual
     value — method-agnostic consumers, no bypass.
  4. Type-change handling per §8 (manual flags stale, does not auto-clear).

**Section 4 checkpoint — methods + D-2 (Tab.13 encode vs reserve). OK?**

---

## 5. Data model changes

New / changed **fields** (via migration, mirroring the importer's UPSERT shape;
`verification_status` preserved):

| Change | Where | Detail |
|---|---|---|
| Add `a_s_m_determination_method` (enum) | A138-12 | values `direct, geometry, soil_estimate, manual`; default `direct`; `regulation_reference §5.3.3.6/§6`. Consumer list: none (it is a local selector read by the resolver + registry). |
| Add `a_s_m_provenance` (text) | A138-12 | required iff method=`manual`; holds datasheet/source ref. |
| **No** new `soil_favourability` field | — | Tab.13 band derived from A138-05 `k_f` (§4.3); A138-05 stays the single source of soil truth. |
| **Retire `A_S_m_Becken`** (A138-22) | A138-22 | DB-verified orphan: entered `number`, **no producing equation, `consumer_worksheets = null`, and Gl.41 consumes generic `A_S_m` not this symbol**. Deactivate (`active=false`) it; A138-22/Gl.41 reads canonical `A_S_m` by reference (D-4). Migration first **checks `project_parameters` for any stored `A_S_m_Becken` values** — if found, log as residue + surface for engineer re-entry via the method selector rather than silently dropping. If a read-only mirror is preferred over retirement, alias it to canonical `A_S_m` (no independent write). |
| Mark `A_S_m` as derived/read-only in the UI | A138-12 | not a schema flag — enforced by the field being computed for all methods except `manual`; §6. |
| Backfill | all existing 138 projects | set `a_s_m_determination_method = 'direct'` so PLT-HS-01 and every saved project are unchanged. |
| (No new `A_S_m` field on A138-17/18) | — | geometry writes back to A138-12; confirm no orphan `A_S_m` fields exist there (topology says none today). |

Migration lives in `scripts/migrations/YYYYMMDDHHMMSS_a138_asm_single_source.sql`
with a paired rollback (defect-register / deploy convention). **Written but not
applied** until the plan's cutover task, same discipline as B1.

**Section 5 checkpoint — field changes + `direct` backfill default. OK?**

---

## 6. Write-path & read-path

**Write (one path):** `saveWorksheet` computes/accepts `A_S_m` only for the
active method:
- `direct`/`soil_estimate` → server materializes `A_S_m` on A138-12 from its
  inputs (extends the existing A138-12 materialize).
- `geometry` → facility worksheet save materializes `A_S_m` onto A138-12 via the
  registry (§10).
- `manual` → `A_S_m` is the engineer's entered value; server persists it +
  requires `a_s_m_provenance`. For every non-manual method `A_S_m` is
  server-owned and the client renders it read-only (reuse B1's computed-field
  lock).

**Read (one path):** every consumer resolves `A_S_m` through `resolveAsmProducer`
(§3), which returns the scoped source worksheet; the value is then read from the
canonical A138-12 field. No consumer calls raw `loadSameSymbolValues` for
`A_S_m`.

---

## 7. Consumers stay method-agnostic

`q_S_AC` (Gl.9), `V_M` (Gl.14/15), `V_VA` (Gl.41), Tab.6 check: **no change to
their formulas or code paths.** They read one `A_S_m`. The only change they see
is *when* it updates (re-fire on producer change, §10). A test asserts each
consumer yields identical results for the same `A_S_m` regardless of method.

---

## 8. Type-change invalidation

`facility_type_selected` is an input symbol to the geometry producer. On its
change (A138-15 save):
- **geometry-derived `A_S_m` clears** (recompute from the new facility's
  geometry, or fall to `unresolved`/`indeterminate` until the new facility's
  geometry inputs are entered). No stale carry-over — the B1 lesson.
- **manual `A_S_m` is flagged stale / needs-reconfirmation** (not cleared): a
  hand-entered datasheet value is real data; the engineer must reconfirm it still
  applies to the new type, surfaced as a discriminated `needs_reconfirmation`
  state + badge.
- `direct`/`soil_estimate` values are facility-agnostic → unaffected.

This is implemented by adding `facility_type_selected` to the geometry registry
entry's `inputSymbols` (§10), plus a small "manual-stale" flag write.

**Section 8 checkpoint — clear vs flag-stale split. OK?**

---

## 9. Honest states (discriminated unions)

`A_S,m` resolution returns a discriminated status, never a bare number or a
silent zero:

```ts
type AsmState =
  | { status: 'determined'; value: number; method: AsmMethod; sourceWorksheet: string }
  | { status: 'manual'; value: number; provenance: string }
  | { status: 'needs_reconfirmation'; value: number; reason: 'facility_type_changed' }
  | { status: 'indeterminate'; reason: 'no_method' | 'geometry_unresolved' | 'inputs_missing' };
```

Consumers and the Tab.6 check already handle an `indeterminate`/missing `A_S,m`
(B1 produces `indeterminate` when `A_S,m` is absent). This extends that
vocabulary rather than inventing a parallel one.

---

## 10. Propagation-registry interaction (extends B1)

Add one registry entry (the general mechanism, `MaterializeEntry`), 138-specific
data flagged as in B1:

```
{ id: 'asm',
  inputSymbols: { A_S_min, A_S_max, facility_type_selected,
                  h_M, b_R, h_R, L_R,        // geometry inputs
                  a_s_m_determination_method },
  ownerTrigger: A138-12 owns Gl.7,           // A_S_m home
  consumerTemplateCode: 'A138-12' }          // canonical field lives here
```

- Changing any listed input on any worksheet re-derives `A_S,m` on A138-12 (via
  the resolved producer) and, because `A_S,m` is itself an input to the existing
  `loading` and `basin` registry entries, the Tab.6 check and `q_S_AC` re-fire
  in the same save — the chained recompute B1 already supports.
- `consumerTemplateCode` resolution stays `standard_id`-scoped, fail-closed
  (B1's fix 3146c20). Geometry write-back from A138-17/18 lands on A138-12's
  field ids, never a producer-template field.
- The registry `id:'asm'` entry documents the 138-specific symbols and equation
  ids inline, per the B1 registry file's contract.

**Section 10 checkpoint — one new registry entry, chained re-fire. OK?**

---

## 11. Multi-facility non-foreclosure (what a future extension changes)

Today `A_S,m` is a single project-level scalar (one facility per run). To go
multi-facility later, and **only** these change (no rewrite):
1. The canonical `A_S_m` gains a facility dimension — a `facility_id`-keyed row
   set (or a per-facility inventory carrier, like `surface_inventory` on
   A138-07) instead of one `project_parameter`.
2. `resolveAsmProducer` takes a `facilityId` and returns the producer *for that
   facility*; the read indirection in §6 already funnels through this one
   function, so consumers change only by passing which facility they mean.
3. The registry entry keys its write by `facility_id` too.

Because every read/write already goes through `resolveAsmProducer` + the registry
(not scattered `loadSameSymbolValues` calls), the blast radius of multi-facility
is those three points. This is the same "build for one, scope so many is
additive" discipline as B1's `standard_id` scoping. **Explicitly out of scope
now.**

---

## 12. Out of scope

- Multi-facility inventory (§11 flags it; not built).
- `MRE`/`MRS` (A138-19/20) geometry producers — residue, flagged.
- The `A_S` (bare) multi-producer question (A138-16 Gl.12 vs A138-21 Gl.34 vs the
  A138-12 `A_S` field with consumers `[A138-16, A138-18, A138-21]`). This is a
  *sibling* single-source case (required-area, not mean-area). **Flagged as a
  follow-up piece**, not folded in — keeping B2 to `A_S,m` only.
- Compliance-gating of the loading check / q_S_AC (that is B3 → gate-enforcement
  remediation, standard-agnostic).

## 13. Acceptance criteria

1. **Baseline identical.** PLT-HS-01 (method `direct`, backfilled) reproduces
   every value in the Global-Constraints baseline, byte-for-byte, live on the
   alias.
2. **Single producer.** With `mulde` selected + geometry entered, the *only*
   `A_S_m` any consumer reads is the Gl.16 write-back on A138-12; the stray
   resolver path is provably not taken (test + live).
3. **Chained re-fire.** Changing `h_M` (Mulde geometry) on save updates `A_S_m`,
   `q_S_AC`, and the Tab.6 verdict without opening A138-13/A138-12 (producer-side
   propagation, hard-reloaded alias).
4. **Type-change.** `mulde → rigole` clears the geometry `A_S_m`; a `manual`
   value flags `needs_reconfirmation` instead of clearing.
5. **Validation.** `A_S_min > A_S_max` blocks; geometry `< A_S_max` flags.
6. **Manual provenance.** `manual` without a provenance note is rejected; the
   badge + PDF line appear.
7. **No editable-derived state.** `A_S_m` is never a free-editable derived field
   for any non-manual method (defect #9 closed structurally).
8. Unit + integration tests run green on the isolated pnpm store before ship.

## 14. Rulings (all RESOLVED 2026-07-08) + open residues

**Resolved — the plan is unblocked:**
- **D-1 ✅** `geometry` = `mulde`/`rigole` only (source-verified, §3.1).
- **D-2 ✅** Encode Tab.13 `soil_estimate` now (0,10 Mittel-/Feinsand, 0,20
  schluffig); favourability bound to A138-05 `k_f`, derived-and-confirmable
  (§4.3).
- **D-3 ✅** Canonical home = A138-12 (§2).
- **D-4 ✅** `A_S_m_Becken` is a verified orphan dual-source → retire (or
  read-only alias); `becken`/Gl.41 consumes canonical `A_S_m` by reference (§5).

**Open residues (logged, NOT decided in the build — each needs a human ruling
before its scope is touched):**
- **R-1** — `schacht` Gl.34 (`π·d_a·h_S/2`) is semantically a mean area; whether
  it write-backs to canonical `A_S,m` for q_S_AC/Tab.6 re-check is unratified.
  Build treats `schacht` `A_S,m` as `direct`/`manual`; no schacht geometry
  write-back until ratified (§3.1).
- **R-2 (REVISED by A-1)** — there is **no `k_f` cut** to pin (Tab.13 is keyed by
  Bodenart; the only `k_f↔Bodenart` map is Bild 2, a figure Anh. A disqualifies
  as sole source). No threshold hunt, no STOP condition. The Bodenart selector
  (§4.3) is authoritative; the optional Bild-2 `k_f` seed is an encoder heuristic
  (figure-derived, NR) that **needs ratification** before it can pre-select
  anything. If the seed is built at all, it is badged NR — else omitted.
- **R-3** — `soil_classification` → Tab.13 enum promotion (would make the band an
  exact string map); follow-up, not built (§4.3).
- **R-4** — `A_S` (bare) sibling single-source (Gl.12 vs Gl.34 vs the A138-12
  `A_S` field); separate follow-up piece, not folded in (§12).
- **R-5** — `MRE`/`MRS` (A138-19/20) geometry producers; residue (§12).
