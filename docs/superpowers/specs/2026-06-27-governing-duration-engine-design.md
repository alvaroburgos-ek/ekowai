# Governing-Duration Iteration Engine (Piece 1) — Design

**Date:** 2026-06-27 · **Status:** DESIGN ONLY. Build gated on the **field inventory** (MCP token) — pause before the gated build step. Approach B (shared engine) confirmed; §6 per-facility method confirmed by Alvaro.
**Branch:** `feat/governing-duration-engine` (off `origin/main` `294c89d`).

## Goal

Make `r_D(n)` **derived per facility**, not free-typed. Each storage facility's design rainfall intensity is the `r_D` at *its* **governing duration** — the duration that maximizes that facility's sized quantity when its sizing equation is iterated over the rainfall table's durations. No-storage Flächenversickerung uses a **fixed prescribed `D = 10–15 min`**. This fixes the pervasive free-typed-intensity gap (Mulde/Rigole/MRE/MRS/Schacht/Becken/Flächenversickerung) and composes with Piece 2 (the facility iterates over its *selected* table).

## §6 basis (confirmed — Alvaro, DWA-A 138-1 Oct 2024)

Every **storage** facility uses the **identical iterative method** — iterate over durations `D`, evaluate that facility's own sizing equation at each `(D, r_D)`, take the governing one. Verbatim anchors: Mulde/Versickerungsfläche §6.2.2 L2072 (iterative for `A_S,m`); Rigole Gl.23/29 L2185/2299; Mulden-Rigolen-Element Gl.33 L2371; Schacht Gl.38 L2461–2462; Becken Gl.41 L2532 — all *"iterative Anwendung … für unterschiedliche Dauerstufen D."* **Only the sizing equation differs**; the iteration scaffold is identical. **Flächenversickerung is the lone exception** — fixed `D = 10–15 min` (L1836, 2004), not iterated. The basin (A138-13/Gl.8) already implements this iteration for `V_VA`.

## Architecture — one shared engine, per-facility profiles

```ts
// pure, DB-free
type GoverningResult = {
  governingD: number | null;
  r_D_at_governing: number | null;   // the DERIVED r_D(n) the facility uses
  governingValue: number | null;     // the maximized sized quantity at the governing D
  perDuration: Array<{ D: number; r_D: number; value: number }>;
};

// Iterate the (selected) table's durations, evaluate the facility's sizing
// function at each (D, r_D), take the argmax (the governing duration).
function iterateGoverningDuration(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  sizing: (D: number, r_D: number) => number | null,
): GoverningResult;

// Fixed-D path (Flächenversickerung): pick the prescribed duration's r_D
// (10–15 min) from the table; no iteration.
function fixedDurationIntensity(
  rows: ..., prescribedD: number | { min: number; max: number },
): { D: number | null; r_D: number | null };
```

A **facility profile** declares: its `equationId`, its **per-duration sizing function** (closure over the facility's scalars, mirroring the DB formula), the **maximized quantity** label, and the **derived output symbol(s)** (the facility's `r_D(n)` + governing `D`). The engine is written **once**; each facility supplies (a) its sizing function and (b) what it maximizes.

**Gl.8 unification (recommended, test-guarded):** the basin's `V_VA` sizing becomes the **first registered profile** — i.e. refactor A138-13/Gl.8 onto the shared engine so the iteration truly lives in one place. The existing acceptance test (`formula-Gl8.test.ts`: max `V_VA = 18.684` at governing `D = 30`) is the regression guard. **Alternative** (if you'd rather not touch live Gl.8 in v1): leave Gl.8 as-is and add the shared engine for the not-yet-iterating facilities only, unify later. *Decision needed at spec review.*

**Maximized quantity per facility** (to finalize against the equations at build): Becken `V_VA` (Gl.41), Mulde `V_M`/`A_S,m` (Gl.14/§6.2.2), Rigole `V_R`/`L_R` (Gl.19/23), MRE `V_MR`/`L_R` (Gl.28/29), MRS (Gl.32/33), Schacht `h_S`/`V_S` (Gl.35/37/38). Each is "maximize the required size over D."

## Outputs + materialization

For each facility: the engine yields the **derived `r_D(n)`** (= `r_D` at the governing `D`), the **governing `D`**, and the sized quantity. These persist `source_type='derived'` via the **existing** materialization path (`derivedOutputSymbols`/`saveWorksheet`) — the facility's `r_D(n)` field becomes a derived output, not a free input. Rows come from the facility's **Piece-2-selected** table (default = primary). The per-duration breakdown feeds **Piece 3**'s comparison view, now for every facility.

## Constraints / non-goals

- Does **not** reintroduce a free-pick `r_D(n)` value selector (the cancelled picker stays cancelled — `r_D(n)` is iteration/fixed-D derived).
- Tab.9, the flood path (Gl.10), and `main` untouched. Composes with — does not duplicate — Piece 2's table resolution.
- No central A138-10 `r_D(n)` derivation (circular; per-facility only).

## Composition model (project = N independent facilities) + series-system boundary

**A project = multiple facilities composed in PARALLEL/independently.** Each facility carries, independently:
- **(a) Location** → references its own rainfall table (Piece 2 `rainfall_table_ref`) — supports two locations / two grid cells / different corners of a site.
- **(b) Type** → its sizing equation (this spec's `FacilityGoverningProfile`).
- **(c) Geometry/scalars** (`A_C`, `k_f`, `A_S,m`, …) — already per-facility fields.
- **(d) Duration mode** → **iterated** (storage → `iterateGoverningDuration`) | **fixed** (no-storage Flächenversickerung → `fixedDurationIntensity`, D=10–15) | **selected-from-predefined** (a general-model capability — see note).

**Per-facility flow:** reference table → resolve duration (iterate/fix) → derive `r_D` → run sizing equation → produce size. **Invariant:** selections are always **inputs** (which table, type, duration mode, geometry); the computed values (`r_D`, size) always **derive**; *selecting never replaces the calculation* (no free-pick of `r_D` — the cancelled picker stays cancelled).

**This is already the planned architecture, not new scope.** Piece 2 gives each facility its own table reference; Piece 1 gives each its own sizing profile + duration mode. The **"two locations / different sizes / parallel"** case = N independent facilities, each `(own table ref) × (own sizing profile) → own size`. It composes by construction.

**Duration-mode note (DWA-138):** §6 uses only **iterated** (storage) and **fixed** (Flächenversickerung). `selected-from-predefined` is a general-model mode **not applicable to DWA-138** — applying it to a DWA-138 facility would reintroduce the cancelled free-pick `r_D` and violate §6.

**⚠️ Series-system boundary (Tabelle 12 — confirmed by Alvaro against the source; NOT encoded in the wizard today).** Tabelle 12 separates:
- **Einfaches Verfahren** — dezentrale + einfache zentrale Anlagen, sized **per-facility** → **THIS model.**
- **Nachweisverfahren** — *vernetzte Mulden-Rigolen-Systeme in Reihenschaltung* (networked series) → require **long-term simulation (Langzeitsimulation)**, a **different method**.

So **parallel/independent** facilities compose in our model (each its own table + duration + size); **networked series** systems are **out of scope** for the Einfaches Verfahren and must **NOT** be forced into the per-facility model — they need the Nachweisverfahren, which is **not implemented**. A grep of `audit-reports/` + code found **no** Tabelle-12 / Nachweisverfahren / Reihenschaltung notion — so the wizard has no series/network composition today, consistent with implementing only the Einfaches Verfahren. This boundary is documented here so series systems aren't silently forced into the per-facility model. *(Authoritative Tabelle-12 / §5.3.3 reading is Alvaro's from the Oct-2024 source; re-confirm exact anchors there.)*

## Gated build precondition (the ONLY one — MCP token)

The **field inventory**: per facility, confirm which `r_D(n)`/`r_D_n_used` field is free-typed today (the conversion target), the exact `equationId` + `formula` + units, and the maximized quantity. Needed to wire each profile and to author any field/migration changes. **Build pauses here** until the token is back + Alvaro's go.

## Testing

DB-free, TDD: the pure `iterateGoverningDuration` + `fixedDurationIntensity` (incl. argmax tie/empty/incomplete); each facility sizing function with hand-computed governing values; the basin profile **cross-checked against the existing Gl.8 acceptance** (18.684 @ D=30). The DB round-trip (materialization) covered by the integration project.
