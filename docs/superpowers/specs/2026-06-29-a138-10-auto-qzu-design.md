# A138-10 Auto Q_zu (governing-D derived) — Design

> Status: **DESIGN — for Alvaro's review before any build.** Grounded in DWA-A 138-1 §5.3.3.5
> (Gl.2/Gl.3) + §5.3.3.7/§6 (REQ-14: iteration über D, governing). Builds on the live 2D-grid
> branch (`feat/rainfall-2d-grid`, build q67s7l9jb→7goiqmhu2): reuses `resolveColumn`,
> `facilityReturnPeriod`, and the governing-duration engine.

## 0. The gap
A138-10 ("Bemessungswert A_C und Zufluss") currently **free-types** `r_D_n` ("Regenspende r_D(n)
bei gewählter D/n") and `D_min` ("Dauerstufe D (gewählt)"). Both are inputs with **no producer**.
`r_D` is a table-lookup value and D is the *governing* (iterated) duration — neither should be
hand-entered. This violates the single-source / predefined-table-accessor invariant. Goal: make
them **derived** so `Q_zu = r_D(n)·(A_C+A_VA)·10⁻⁴` (Gl.3) auto-computes at the worst-case D.

## 1. The two structural questions — RESOLVED by tracing the data (read-only prod)

### 1a. Q_zu consumers + who really uses what
- A138-10 `Q_zu`.consumer_worksheets = **{A138-13}** (only the basin).
- A138-13 Gl.8 string = `V_VA = (Q_zu − Q_S − Q_Dr)·D·60·f_Z·f_A·10⁻³`, BUT the **Gl.8 engine
  recomputes `Q_zu(D)` per duration internally** (`r_D(D)·(A_C+A_VA)·10⁻⁴` — see the basin profile
  in `governing-duration.ts` / `aggregators.ts`). The aggregator's scalar set is
  `{A_C, A_VA, Q_S, Q_Dr, f_Z, f_A, …}` — **it does NOT read A138-10's scalar `Q_zu`.**
- ⇒ **A138-10's `Q_zu` is effectively a documented design value**, not a sizing input the engine
  consumes. Wrong-D today does NOT corrupt basin sizing (the engine is self-contained) — but it IS
  an approved compliance value that must be correct/derived. So the fix is about the **integrity of
  the displayed/approved value**, not preventing a sizing error. (Lower blast radius than feared.)

### 1b. Dependency inversion — NOT a real cycle (confirmed)
Data edges: `A_C` (A138-10, **D-independent** area, Gl.2) → A138-13. A138-13 iterates the governing
D from `A_C` + grid + basin scalars. Governing `D`/`r_D` → back to A138-10. The only A138-10→A138-13
value is `A_C` (independent of D); the only A138-13→A138-10 values are the governing `D`/`r_D`. **No
value depends on itself → acyclic.** (And the existing `Q_zu`→A138-13 edge is inert: the engine
recomputes Q_zu, so removing/replacing A138-10's scalar Q_zu changes nothing for the basin.)

### 1c. Per-facility ambiguity — NOT an issue for Q_zu (confirmed)
`Q_zu`'s only consumer is the **basin (A138-13)**. The other facilities (Mulde/Rigole/MRE/MRS/
Schacht/Becken) do **not** consume A138-10's `Q_zu` — each sizes its own inflow internally (Piece 1).
So A138-10's `Q_zu` is specifically **the basin's design inflow at the basin's governing D** —
single and unambiguous. **No per-facility split for Q_zu.** (The per-facility r_D concern still
applies to the *other* facilities' own r_D fields — a separate, later workstream, NOT this one.)

## 2. The model
The governing D is a **property of the basin sizing (A138-13/Gl.8)** — that is where the iteration
already runs (`GoverningResult.governingD` + `r_D_at_governing`). Single-source ⇒ produce it **once
on A138-13**, consume it on A138-10.

**Mechanism = the proven A138-07 area-consolidation pattern (same-symbol producer + consumer
deactivates its local duplicate).** `mergeInheritedFields` is own-symbol-wins, so a distinct name
like `D_gov` would NOT flow into A138-10's `r_D_n`. Instead the basin **produces the very symbols
A138-10 consumes**:
- **A138-13 (producer):** add two **derived fields** carrying the basin's governing values under the
  symbols A138-10's Gl.3 already reads — `r_D_n` (l/(s·ha)) and `D_min` (min) — `consumer_worksheets =
  ['A138-10']`, `is_required=false`. The Gl.8 engine materializes them from `derivedExtras`
  (`r_D_gov`→the `r_D_n` field, `D_gov`→the `D_min` field) alongside `V_VA`, `source_type='derived'`.
- **A138-10 (consumer):** its **local `r_D_n` + `D_min` are deactivated** (Task 3 migration) — exactly
  as A138-10's duplicate area fields were deactivated when A138-07 became their producer. A138-10 then
  inherits `r_D_n`/`D_min` from A138-13 by same-symbol; **Gl.3 is unchanged** and reads the inherited
  governing `r_D` → `Q_zu = r_D(n)·(A_C+A_VA)·10⁻⁴` auto-computes. No free-typing, no equation alias.

(Reference precedent: migration `20260626140000_a138_area_singlesource.sql` + the surface
materialization in `use-equation-engine`/`evaluate-for-report`/`payload` — replicate that exact shape.)

A138-10 does **not** itself run `resolveColumn`/`facilityReturnPeriod` — those run **once** inside the
basin engine (A138-13), and A138-10 inherits the result by reference (single producer). This is the
reuse the goal asks for, located at the single owner.

### Why not let A138-10 iterate locally?
It has no sizing equation to maximize (only Gl.2 area + Gl.3 inflow). The governing D = argmax over D
of `V_VA(D)`, which needs Q_S/Q_Dr/f_Z/f_A — basin parameters. Re-deriving it on A138-10 would
duplicate the iteration (two producers) → violates the single-source invariant. So A138-13 owns it.

## 3. Producing D_gov / r_D_gov from the engine
`a138_13_gl8` aggregator already iterates and knows the governing duration (it surfaces "Maßgebende
Dauerstufe D" in its `substituted` map). The engine path that writes `V_VA` back to the store
(`use-equation-engine` write-effect; server `evaluate-for-report`; snapshot `payload`) is extended to
also write `D_gov` + `r_D_gov` (from `GoverningResult.governingD` / `r_D_at_governing`) as
`source_type='derived'`. When the basin is `manual_required` (e.g. missing scalars on PLT-HS-01) or
the grid column is missing → `D_gov`/`r_D_gov` are withheld (not written) and A138-10's `r_D_n`/`D_min`
/`Q_zu` stay blank-with-cause (same withhold semantics as the 2D grid). No new math.

## 4. Back-compat
- Existing free-typed `r_D_n`/`D_min` values on A138-10: there are none on PLT-HS-01 (the basin is
  manual_required, so they were never meaningfully set). The migration flips them to derived/not-
  required and the engine repopulates them on save. No stored value is deleted (mirror A138-07/r_D_30
  precedents: field-flag change, materialize via real code).
- **Load precedence caveat (per dedicated review):** the basin value reaches A138-10 via the
  same-symbol *seeding* path (step-2), which a project's OWN persisted A138-10 `r_D_n`/`D_min` param
  row (step-1) still **wins** over. So a CLEAN project (no local value, e.g. PLT-HS-01) derives
  correctly; a project that already TYPED a value keeps **showing it (shadowed, not superseded)**
  until that param row is cleared. True supersession would require DELETING the stale param rows
  (this migration does not). Only Köln-Lindenthal (throwaway, 200/15) is affected — accepted.

## 5. Witness / acceptance
- Basin (A138-13) with the Heinsberg set still computes **V_VA = 18.684 @ D=30**, and now also
  exposes **D_gov = 30**, **r_D_gov = 130** (the engine's governing values).
- A138-10 with that basin result: `D_min = 30` (derived), `r_D_n = 130` (derived), and
  `Q_zu = 130·(A_C+A_VA)·10⁻⁴` auto-computes — no free-typing. Hand-check the Q_zu value.
- Basin manual_required (missing scalars) → A138-10 `r_D_n`/`D_min`/`Q_zu` withhold with a cause.

## 6. Files (map)
- `src/lib/eval/governing-duration.ts` — (already exposes governingD/r_D_at_governing; no change or a
  tiny accessor).
- `src/lib/eval/aggregators.ts` / `use-equation-engine.ts` / `evaluate-for-report.ts` /
  `snapshots/payload.ts` — materialize `D_gov` + `r_D_gov` from the basin GoverningResult (alongside V_VA);
  A138-10 `r_D_n`/`D_min` become derived (inherited), `Q_zu` auto via Gl.3.
- **Migration** (written-not-applied): add `D_gov`/`r_D_gov` derived fields on A138-13
  (`consumer_worksheets=['A138-10']`); retire A138-10 `r_D_n`/`D_min` to derived/not-required. Rollback authored.
- Tests: engine materializes D_gov/r_D_gov; A138-10 auto-Q_zu witness; withhold-on-manual_required.

## 7. Out of scope
The other facilities' own free-typed r_D fields (r_D_n_used etc.) + their per-facility governing D —
that's the separate Piece-1 Tasks 6-7 facility workstream, NOT this. This piece is **A138-10 / basin
Q_zu only** (single consumer = basin).

## 8. Discipline
Branch `feat/a138-10-auto-qzu` off the live 2D-grid build. design → plan → Alvaro review → build+test →
migration written-not-applied + rollback → apply migration → deploy `--prod --skip-domain` →
smoke-test direct URL → **PAUSE for alias go**. The basin 18.684 witness must stay green.
