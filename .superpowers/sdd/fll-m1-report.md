# FLL Revision — Milestone 1 Report (known items + harness extension)

**Branch:** `feat/fll-revision` (worktree `C:\Users\Ekowai\_wt-fll`, off `main` @ 11dde93)
**Identity:** alvaro.burgos@ekowai.com · **Date:** 2026-07-23
**Method:** guideline-as-ground-truth · real-save-path harness · source-verify before change · provenance-honest · NO prod apply / NO merge.

---

## 0. Build-integrity of the inherited merge (pre-flight)
`src/lib/eval/equation-profiles.ts` imports cleanly on the branch (node TS-strip → `IMPORT_OK`) and the
first `tsc` pass emitted **0 `error TS` lines** mentioning it. **No inherited merge/syntax error.** The
merge resolution on `main` for equation-profiles.ts is clean.

> ENV NOTE (verbatim, the documented ACL gotcha): a *second* direct `tsc` invocation and every `vitest`
> run hit `EPERM: operation not permitted, open '…\node_modules\.pnpm\…\vitest\vitest.mjs'` (errno -4048).
> `Get-Acl` on the locked file shows only `EKOWAI-PC-01\johannes`, `BUILTIN\Administrators`,
> `NT AUTHORITY\SYSTEM` — the running identity is not on the ACL. This is the documented pnpm-store
> ACL/EPERM lock. It persists with the sandbox disabled. I did **not** alter the store's ACLs and I do
> **not** claim any vitest run passed.

---

## 1. KNOWN ITEM #1 — C=0,82 correction on GAR-27 → Q_NOT = 5,274728

### Source verification (read-only, against prod `vadsmshzebefjreqcicl`)
- **Equation** (worksheet `FLL-GAR-27`, id `02387918-c243-4a7e-b38d-993c65f79754`):
  `Q_NOT = (r_5_100 - r_5_5 * C) * (A / 10000)` — verbatim; audit `equations_numbers.md` confirms it
  matches the source Anhang-1 formula `Q_NOT = [(r5,100 – (r5,5 * C)] * (A / 10.000)`.
- **Field the equation consumes:** `C` (id `d6f02425-71c9-4a85-bfd2-35069a118771`, label "Abflussbeiwert").
- **Live example project `f7249ae1-bbda-415f-ac83-991a282d2c8b`** carries entered inputs:
  `A = 263`, `r_5_100 = 317`, `r_5_5 = 142`, and consumed `C = 0.83` → persisted derived
  `Q_NOT = 5.237381999999999` (**WRONG**).
- The **correct** abflussbeiwert **0.82** is present but stranded in the DECOY twin field
  `C_abflusswert` (id `34d5b6f0-faf8-4f4c-b308-b330b36f6d94`). With `C = 0.82`:
  `(317 − 142·0.82)·(263/10000) = 5.2747280000000005` → **matches the target 5,274728 to float epsilon.**

### C-value basis citation (important provenance nuance)
The **FLL-GAR PDF does NOT tabulate the abflussbeiwert C.** The guideline body (`FLL-Gewässerabdichtungs­richtlinien.md`
L1591-1603) defers the Notüberlauf/Notentwässerung dimensioning to **DIN 1986-100** (r_5,100) and the
Regelüberlauf to r_5,5. The only worked example inside the FLL Anhang 1 uses **C = 1** (Düsseldorf:
r5,5=316, r5,100=607, A=800 m² → 23,28 l/s — audit `equations_numbers.md` L36). Therefore **C = 0,82 is
a DIN 1986-100 runoff coefficient, not an FLL-GAR value.** The number `5,274728` and `0,82` appear
**nowhere** in the FLL PDF, the knowledge markdown, the site-audit artifacts, or the DB defaults — they
are reproduced here **only** from the live project's own entered/stranded values (A=263, r=317/142) +
the DIN C=0,82. This is recorded so no FLL-source provenance is fabricated for C.

### Harness extension (real save path)
New files on the branch under `tests/harness/` (auto-included by the vitest `integration` project glob
`tests/harness/*.integration.test.ts`):
- `seed-fll-gar27.ts` — seeds standard FLL-GAR-2023 + worksheet FLL-GAR-27 with the equation-consumed
  fields **and** both decoy twins (`A_einzugsflaeche`, `C_abflusswert`), the Gl.1 Q_NOT equation, and
  the live inputs (A=263, r_5_100=317, r_5_5=142). Every scalar carries an inline source citation.
- `_harness-env-fll.ts` — top-level-await bootstrap (embedded Postgres + BYPASS_AUTH), mirrors the 138
  `_harness-env.ts`, on a dedicated global.
- `fll-gar27-qnot.integration.test.ts` — drives BOTH production seams: (1) the **real** client compute
  `evaluateFormula` (the exact fn `use-equation-engine.ts:485` calls) and (2) the **real** `saveWorksheet`
  against the embedded PG. Asserts GREEN `Q_NOT ≈ 5.274728` (C=0,82) and RED `≈ 5.237382` (C=0,83), the
  RED case proving the target is discriminating (not trivially satisfied).

**Exact acceptance field:** `Q_NOT` field id `a16564d1-60d8-4bc4-bb5b-aab4041baa79` (symbol `Q_NOT`,
unit `l/s`) on FLL-GAR-27. Corrected value **5,274728** via consumed field `C` (`d6f02425-…`) = **0,82**.

**Harness RESULT: env-BLOCKED (EPERM).** The vitest runner cannot load under the pnpm-store ACL lock
(verbatim error above). The pure arithmetic underlying the assertion was cross-checked with a plain
calculator (`C=0.82 → 5.274728`, `C=0.83 → 5.237382`); the in-tree `evalExpression` couldn't be
node-stripped (parameter-property syntax) and is covered by the repo's own `arithmetic.test.ts`. **The
integration test is written and staged but UNRUN — re-run once the ACL lock is cleared** (see
Ratification Bundle).

---

## 2. FINDING #1 — inverted A/C dedupe (per-field source-verified table)

Mechanism: `scripts/_pass3c-scans.ts::computeInvertedTagCandidates` flags a field tagged to a `Gl.`
clause that **no** equation consumes/produces **and** that has a consumed prefix-twin on the same
worksheet — "the FLL-GAR-27 A/C shape" (its own comment, L62). On FLL-GAR-27 the equation consumes
`A`, `C`, `r_5_100`, `r_5_5`. Two decoy twins exist. Source-verified per field:

| field id | symbol | label | clause_ref | consumed by Gl.1? | live value | verdict |
|---|---|---|---|---|---|---|
| a5712ffb-… | `A` | Flaeche (Notentwaesserung) | Anhang 1 | **YES** (intended A) | 263 | **KEEP as producer** — the equation's `A`. |
| bd84d4da-… | `A_einzugsflaeche` | Einzugsfläche A | §Gl.1 | no | 263 | **DECOY** — dedupe into `A`; values agree (263), low risk. |
| d6f02425-… | `C` | Abflussbeiwert | Anhang 1 | **YES** (intended C) | **0.83 (WRONG)** | **KEEP as producer**, but its value is stale — see Item #1. |
| 34d5b6f0-… | `C_abflusswert` | Abflussbeiwert C | §Gl.1 | no | **0.82 (CORRECT)** | **DECOY holding the correct value** — the inversion: correct C is in the un-consumed twin. |

**The inversion, stated precisely:** the *consumed* fields (`A`, `C`) carry the Anhang-1 clause tag while
the *decoy* twins (`A_einzugsflaeche`, `C_abflusswert`) carry the `§Gl.1` tag — i.e. the clause tags are
swapped relative to which field the equation actually reads, and (worse) the **correct C=0,82 lives in
the decoy**, while the consumed `C` holds a wrong 0,83. A naïve dedupe that collapsed the twin *into the
consumed field by value* would be fine for `A` (both 263) but for `C` must take the **decoy's 0,82**, not
the consumed field's 0,83 — the exact place an automated dedupe would invert the answer.

**Proposed fix (FLAGGED FOR RATIFICATION — not applied):**
1. Correct consumed `C` (`d6f02425-…`) to **0,82** on the live project (source: DIN 1986-100, not FLL —
   confirm the surface type warrants 0,82).
2. Collapse the decoy twins: retire/merge `A_einzugsflaeche`→`A` and `C_abflusswert`→`C` so the worksheet
   has one A and one C, both consumed. Re-tag the survivor to the **Anhang-1** clause reference.
3. Re-derive `Q_NOT` → 5,274728.
No field was flipped. Direction of every merge is stated above for your sign-off.

---

## 3. FINDING #2 — Gl.2b displayOnly (confirmed in merged code)

- `equation-profiles.ts['c7dc584b-0f65-476d-935a-d5306d885a65'].displayOnly === true` — confirmed by
  importing the branch's module (`IMPORT_OK; Gl2b.displayOnly = true`). Note text present and correct
  ("Mindestauflast-Bedingung … displayOnly — Gl. (2a) ist der Produzent von g_prime, Gl. (2b) ist die
  Prüfbedingung.").
- **Source confirms Gl.2b is an inequality, not a producer:** DB formula
  `g_prime >= (Delta_u*gamma_A − (gamma_F_prime*d_F + gamma_Di_prime*d_Di)) / cos(beta)`; audit
  `equations_numbers.md` L33 transcribes it verbatim from source Anhang 2 as `g' ≥ …`.
- **No multi-producer collision blanks g_prime:** exactly two equations output `g_prime` on FLL-GAR-22 —
  Gl.2a (`430d62b2-…`, `g_prime = gamma_D_prime * d_D`, the sole producer) and Gl.2b (displayOnly). The
  client write-back loop skips displayOnly (`use-equation-engine.ts:527`), so Gl.2a's g_prime stands.
- **Verdict: Item #3 HOLDS.** No change needed.

---

## 4. KNOWN RESIDUE (out of scope — logged, not fixed)

- **cos_beta / trig engine support.** Only Gl.2b references `cos(beta)` (verified: it's the *only*
  FLL-GAR equation with a trig call). Because Gl.2b is displayOnly, the engine never evaluates it → the
  cos_beta gap is **dormant** (blocks no live computation today). If Gl.2a/2b ever need to compute the
  Mindestauflast on a slope (β≠0), the arithmetic engine needs a `cos` function. **Parked as the engine
  decision — no engine change, no workaround.**
- **FLL-Naturteich DS items (Provenienz-Decke, no PDF).** Not touched this milestone; any Naturteich work
  must treat missing-PDF provenance as residue, never invent source.

---

## RATIFICATION BUNDLE (needs your / the user's sign-off)

1. **[Item #1 target vs FLL source]** The Q_NOT=5,274728 acceptance is reproduced from the live project's
   entered inputs (A=263, r=317/142) + **C=0,82 which is a DIN 1986-100 coefficient, NOT an FLL-GAR
   value** (the FLL PDF only worked C=1). Ratify that 0,82 is the intended abflussbeiwert for this
   surface before it is written to the consumed `C` field.
2. **[Finding #1 dedupe direction]** Approve the merge directions in §2: `A_einzugsflaeche`→`A`,
   `C_abflusswert`→`C`, taking the **decoy's 0,82** for C (not the consumed field's stale 0,83), and
   re-tagging the survivors to the Anhang-1 clause. This is the flip that must be human-confirmed.
3. **[Env]** The pnpm-store ACL/EPERM lock blocks vitest on this machine for the running identity.
   Milestone-1's integration test is written but UNRUN. Ratify a path to run it (grant the running user
   ACL on `…\node_modules\.pnpm`, or run as `johannes`/Admin) so the real-save-path proof executes.

## PROPOSED MILESTONE 2 SCOPE
Full harness pass over the FLL family: (a) drive the ratified Item-#1 fix through the harness and go
GREEN once the ACL lock is cleared; (b) extend the seed to FLL-GAR-22 (g_prime Gl.2a producer + Gl.2b
displayOnly non-clobber assertion through the real save path); (c) FLL-Naturteich worksheets with the
DS-provenance residue explicitly quarantined; (d) FLL-TP-RHIZOM-2023; (e) author the ratified Item-#1 /
Finding-#1 migration (dedupe + C correction) as a written-not-applied migration + rollback, mirroring the
138 close-out.

---
## RAW ARTIFACTS
- New harness files: `tests/harness/seed-fll-gar27.ts`, `tests/harness/_harness-env-fll.ts`,
  `tests/harness/fll-gar27-qnot.integration.test.ts`.
- Arithmetic cross-check: `C=0.82 → 5.2747280000000005`, `C=0.83 → 5.237381999999999` (plain node calc).
- Profiles integrity: `IMPORT_OK; Gl2b.displayOnly = true` on the branch.
- EPERM (verbatim): `Error: EPERM: operation not permitted, open 'C:\Users\Ekowai\projects\ekowai-wizard\node_modules\.pnpm\vitest@4.1.5_…\node_modules\vitest\vitest.mjs'` errno -4048.
