# Piece 1 / Task 5 — Field Inventory (governing-duration engine)

Confirmed against live prod (`vadsmshzebefjreqcicl`, read-only MCP) on 2026-06-28.
This is the gated prerequisite for Task 6 (per-facility sizing profiles). It records,
per storage facility, the conversion-target `r_D(n)` field, the maximized quantity,
and the §6 sizing equation — **and flags the modeling decisions Task 6 needs.**

## Inventory

| Facility | Code | r_D field (symbol / id) | Maximizes | Sizing eq | Mode |
|---|---|---|---|---|---|
| Flächenversickerung | A138-16 | `r_D_n_used` / `62c740bc-645e-4730-88a6-6e7d9d75e787` | A_S (Gl.12) | Gl.12 `A_S = A_C / (k_i·1e7/r_D(n) − 1)` | **fixed-D** (D=10–15 min) |
| Muldenversickerung | A138-17 | **NONE** (no local r_D field) | V_M (Gl.14) | Gl.14 `V_M = ((A_C+A_VA)·1e-7·r_D(n) − A_S_m·k_i)·D·60·f_Z` | iterate |
| Rigole | A138-18 | `r_D_n_used_R` / `381de031-ca4d-473b-91c4-00135c82feec` | V_R (Gl.19) | Gl.19 `V_R = (A_C·1e-7·r_D(n) − ((b_R+h_R)·L_R + b_R·h_R)·k_i − Q_Dr·1e-3)·D·60·f_Z` | iterate |
| Mulden-Rigolen-Element | A138-19 | **NONE** (no local r_D field) | V_MR (Gl.28) | Gl.28 `V_MR = ((A_C+A_VA)·1e-7·r_D(n) − ((b_R+h_R)·L_R + b_R·h_R)·k_i)·D·60·f_Z` | iterate |
| Mulden-Rigolen-System | A138-20 | `r_D_nR` / `31783b92-de55-467e-af3c-5aebb9b3e5ed` | V_MUE (Gl.30) | Gl.30 `V_MUE = ((A_C+A_VA)·r_D(n_R)·1e-7 − A_S_m·k_i)·D·60·f_Z − V_M` | iterate (uses r_D(n_R)) |
| Schacht-/Rohrvers. | A138-21 | `r_D_n_S` / `289556cd-c982-446c-aa4c-31e9d3a52be1` | V_S (Gl.35) | Gl.35 `V_S = (A_C·1e-7·r_D(n) − A_S·k_i)·D·60·f_Z` | iterate |
| Beckenversickerung | A138-22 | `r_D_n_B` / `6b5b9361-560c-45bb-9c6f-7dc6eac59045` | V_VA (Gl.41) | Gl.41 `V_VA = ((A_C+A_VA)·1e-7·r_D(n) − A_S_m·k_i − Q_Dr·1e-3)·D·60·f_Z·f_A` | iterate |

Basin (A138-13/Gl.8 V_VA) is already a profile (Tasks 1–4, unified onto the engine).

## Decisions Task 6 needs (NOT a mechanical port — confirm before building)

1. **D-coupled geometry.** Only the **Becken (Gl.41)** sizing is a clean function of
   `(D, r_D, given scalars)` when `A_S_m` is an engineer-supplied infiltration area.
   The others couple a geometry term that is itself D-dependent and co-determined with the volume:
   - Mulde `A_S_m` (Gl.16), Schacht `A_S`←`h_S` (Gl.34/37), Rigole/MRE `L_R` (Gl.23/29), MRS `A_S_m`/`V_M`.
   For these the per-duration "sizing" must either (a) treat the geometry as a **given input**
   (engineer enters A_S_m/L_R/h_S; the iteration maximizes the volume at fixed geometry), or
   (b) **solve the coupled geometry per D** (the full §6 iterative dimensioning). These give
   different governing D. **Which formulation per facility?** — engineering decision (Alvaro).

2. **Missing r_D fields on A138-17 (Mulde) and A138-19 (MRE).** Their equations reference
   `r_D(n)` but there is no local field carrying it. Task 6 must ADD a derived `r_D(n)` field
   (migration) on both, or confirm an alternate source. (Today r_D(n) is unresolved there.)

3. **Flächenversickerung (A138-16) range rule.** `fixedDurationIntensity` currently picks the
   in-range row with the largest r_D; confirm vs §6 L1836/2004 the prescribed D (point vs 10–15 range).

4. **MRS r_D(n_R) (A138-20).** Distinct symbol `r_D_nR` (note the `_R`/`n_R`) — confirm it iterates
   the same inherited table and that V_MUE subtracts the already-sized V_M correctly.

## Source-fidelity note
Encoding any of these sizing functions wrong would put incorrect engineering math into a
compliance tool. The §6 verbatim citations exist in the spec/source; Task 6 should verify each
sizing against `audit-reports/DWA-A-138-1/` (and the source PDF) and add a hand-computed
governing-value unit test per facility before wiring. PAUSED here for Alvaro's go on (1)–(4).
