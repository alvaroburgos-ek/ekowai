# Task — Real-save-path harness + Finding H fix (RED-first)

Branch: feat/138-phase-4-facility-sizing (worktree _wt-138-p4), base 3ac5497.
Identity: alvaro.burgos@ekowai.com.

## Harness mechanism chosen + why
**embedded-postgres 18.4** (npm `embedded-postgres@18.4.0-beta.17`) — spins a REAL
PostgreSQL 18 binary locally (NO Docker, NO prod, NO prod credentials). Verified on
this Windows box: `@embedded-postgres/windows-x64` ships initdb/postgres/pg_ctl; the
app's `postgres.js` client (`src/lib/db`) connects over TCP exactly as in production,
so the harness exercises the **REAL `saveWorksheet`**, not a proxy.

Schema is applied from the Drizzle model via `drizzle-kit/api` `generateMigration`
(empty→current snapshot) — 68 CREATE statements — rather than the committed migrations,
because those carry Supabase-only SQL (RLS policies, GRANTs to `anon`/`authenticated`,
`auth.users`) that a bare Postgres lacks. The app tables/enums are identical; only the
Supabase security layer (which `db` bypasses as the postgres role anyway) is omitted.

Auth: the harness sets `BYPASS_AUTH=1` + `BYPASS_AUTH_USER_ID` (the built-in test-only
bypass in `src/lib/supabase/server.ts`) so `saveWorksheet`'s auth resolves to the
seeded org member without GoTrue; `resolveProjectAccess` then passes via the real
app-level `org_members` join against the harness DB. Dummy Supabase env satisfies the
`@/env` zod schema (never contacted under bypass). Env is set BEFORE `@/lib/db` loads
via a top-level-await bootstrap module (`tests/harness/_harness-env.ts`), and
`saveWorksheet` is dynamically imported after.

Files (TEST infra, committed): `tests/harness/embedded-pg.ts` (bring-up + schema),
`tests/harness/seed-plt-hs01.ts` (fixture), `tests/harness/_harness-env.ts` (env boot),
`tests/harness/finding-h-real-save-path.integration.test.ts` (the acceptance test).
Registered in the `integration` vitest project (node env); NOT in `unit`. NO secrets
committed; PG is disposable (temp dir, torn down in afterAll).

## Fixture (PLT-HS-01-shaped)
org + user(org_members) + project + DWA-A-138-1 standard; templates A138-04 (r_D_n_table
carrier), A138-07 (A_C=4836.43), A138-12 (A_S,m owner Gl.7), A138-15 (facility_type=mulde),
A138-17 (Mulde: h_M=0.30, f_Z=1.2, k_i=7.98e-8, V_M, Gl.14/15/16), A138-23 (summary +
recommended_phase_4_gate/phase_4_recommendation_reasons + entered phase_4_gate_result=FAIL).
Rainfall carrier's governing Dauerstufe (D=1440, r_D_n=5.8) yields
A_S_m=943.4338711204341 → V_M = A_S,m·h_M = **283.0301613361302** (matches the documented
prod baseline). Expected V_M recomputed in-test via `computeMuldeGeometrySweep` (cannot drift).

## RED-first (the missing acceptance artifact)
The payload is CLIENT-FAITHFUL and models the REAL two-save autosave-clobber sequence
(Finding H is a debounced 2nd save, not one batch):
- SAVE 1 = h_M nudge → producer 'asm' fires → geometry sweep materializes A_S_m +
  step-6b materializes V_M=283.03.
- SAVE 2 = debounced autosave flushing Gl.14's V_M write-back; h_M unchanged → 'asm'
  does NOT re-fire → step-6b does NOT run → the batch's V_M UPSERTs directly.
Whether SAVE 2 carries V_M is driven by the REAL write-back skip rule (client enqueues
V_M iff some V_M-producing equation on A138-17 is NOT displayOnly — checked against the
REAL `equationProfiles`), so reverting the fix genuinely flips the test through the real
save path.

**RED (current code, Gl.14 non-displayOnly → SAVE 2 sends V_M=null, verbatim):**
```
 × two-save autosave sequence persists V_M correctly (RED: null clobber / GREEN: derived 283.03)
AssertionError: expected null to be close to 283.0301613361302, received difference is 283.0301613361302, but expected 5e-7
   104|     expect(vM?.source_type).toBe('derived');
   105|     expect(vM?.value_number == null ? null : Number(vM.value_number)).…
      Tests  1 failed (1)
```
i.e. the DB row `project_parameters.V_M` = NULL (clobbered) through the real `saveWorksheet`;
the A138-23 summary volume/complete assertions likewise would fail on the null.

## The fix (within approved F design)
Chose fix option (b): **mark Gl.14 (`bfe6e59a-…`) `displayOnly`** in
`src/lib/eval/equation-profiles.ts`. Guideline check: §6.3.2 Gl.15 (`V_M = A_S,m·h_M`) is
the source-verified Speichervolumen persisted server-side; Gl.14 needs the server-only
governing D, so its client write-back can only produce null. The client write-back loop
(`use-equation-engine.ts:527`) SKIPS displayOnly equations → with BOTH V_M producers
displayOnly (Gl.15 already was), the client never enqueues V_M → step-6b's derived
283.0302 stands. Gl.14 still evaluates purely + renders in the equation card.

Chose (b) over the client-suppress-set option because a blanket V_M suppress also blanks
the valid Gl.15 display value and broke the #22 render guard; displayOnly is surgical —
it stops only the null write-back while leaving the display/eval intact.

**GREEN (fix in place, verbatim):**
```
 Test Files  1 passed (1)
      Tests  1 passed (1)
```
Asserts through the real save path: `project_parameters.V_M` = derived 283.0301613361302;
A138-23 `facility_specific_volume_m3` = 283.0302, `facility_type_dimensioned` = 'mulde',
`facility_specific_dimensioning_complete` = true. (Reasons drop the V_M clause → q_S,AC-only;
recommendation still FAIL because q_S,AC<2 — the honest PLT-HS-01 outcome.)

## Guards
- **Full `pnpm vitest run --project unit`: GREEN — 1195 passed | 1 expected fail (1196), 128 files.**
- **#22 regression guard: GREEN** — computed-symbols, render-a138-17-asm-inherited-prod-signal,
  engine-wiring-suppress, asm-source, asm-dual-role (6 files, 45 passed + 1 expected fail).
  One #22 file, `a138-17-dual-role.test.tsx`, had two stale assertions premised on "Gl.14
  writes V_M back to the store" — the exact behavior Finding H identifies as the bug. Updated
  them to assert Gl.14 still COMPUTES (engine state) but no longer WRITES V_M (displayOnly);
  the A_S_m-survival property (the actual #22 guard) is untouched. `render-a138-17-…-prod-signal`
  uses synthetic equation ids (not the real Gl.14) so it is unaffected and stays green.
- **tsc BY FILE: baseline 28, 0 new.** worksheet-store-derived-apply.test.ts 14 /
  build-vsme-xlsx.test.ts 10 / pass3c-validate.test.ts 2 / export-route.integration 1 /
  build-workbook 1 = 28. Touched files (equation-profiles.ts, a138-17-dual-role.test.tsx) and
  all tests/harness/* files: 0 tsc errors.

## Concerns
- The fix touches SHARED equation metadata (Gl.14 displayOnly) — standard-agnostic in
  mechanism but 138-specific in effect. Fan-out facilities (V_R/V_MR/V_MUE/V_S/V_VA) have
  their own "required" equations; each needs the same displayOnly + source-verify per-facility
  before its volume auto-persists (already a NAMED BOUNDARY in the F design).
- The harness applies the schema from the Drizzle model, not the committed Supabase
  migrations (RLS/roles omitted). Faithful for the `db`-role save path; it does NOT exercise
  RLS (out of scope — saveWorksheet bypasses RLS by design).
- Live browser sign-off on a real preview build is still the final prod confirmation; the
  harness closes the false-confidence gap (real saveWorksheet + real client write-back rule)
  but is not a prod write.
