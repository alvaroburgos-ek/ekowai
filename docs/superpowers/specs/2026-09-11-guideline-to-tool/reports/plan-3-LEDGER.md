# Plan 3 — LEDGER (close-out, Task 30; refreshed at HEAD `757a85d` 2026-09-25)

> **Read the residue section at the bottom before you act on anything here.** Plan 3 is BUILT, not
> applied. No migration has touched any database, no build has been deployed, no browser pass has
> been run, and **1 280** sign-off blocks are awaiting the owner's signature.

> ### REFRESH NOTICE — this ledger was written SEVEN COMMITS BEFORE the final `[CODE]` waves
>
> The Task-30 close-out was committed at `2b2bca2`. Three `[CODE]` waves landed afterwards —
> **A** (engine, `2b3f84c` + `cc6b9ed`), **B** (server/UI, `c0aad97` + `f7af30e`) and **C**
> (emitter/tooling, `95d0ea3` + `757a85d`) — and this file was never re-measured against them.
> Everything below has been brought to HEAD `757a85d` by **running the commands**, in a
> documentation-truth pass on 2026-09-25. Where a figure changed, the OLD figure is shown struck
> or labelled so the change is auditable. **Model / CLI / effort for that pass:**
> `claude-opus-5[1m]` · Claude Code **2.1.281** (no update taken — standing `feedback_no_cli_update`
> ruling) · reasoning effort maximum · author Alvaro (`alvaro.burgos@ekowai.com`).
>
> | figure | close-out (`2b2bca2`) | HEAD `757a85d` |
> |---|---|---|
> | unit tests | 3 157 | **3 284** |
> | commits since the Plan-2b head `f2caca4` | 76 | **84** |
> | commits since the true branch point `a57c081d4741` | *not stated* | **430** |
> | sign-off blocks | 1 279 | **1 280** (`plan1-D-3-1` was invisible to the index) |
> | integration project | UNCLAIMED | **32 Plan-3 harnesses / 883 tests, all green** (see below) |
> | Plan-2c backlog open | 17 of 17 | **2 of 17** (items 3 and 6) |

## Session header

| | |
|---|---|
| **Model** | Claude Opus 5 (1M context) — `claude-opus-5[1m]`, effort **max** (Task-30 close-out session, 2026-09-24) |
| **CLI** | Claude Code **2.1.281** (`claude --version`; no update run — standing owner rule "no CLI updates") |
| **Plan-3 execution** | controller on `claude-opus-5[1m]` (Claude Code 2.1.260 at the time); implementers on Opus, scoped re-reviewers on Sonnet; every commit trailed `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` |
| **Branch / worktree** | `feat/guideline-to-tool` in `C:\Users\Ekowai\_wt-g2t` · Plan-3 base `f2caca4` (Plan-2b fix wave) · head at close-out `2b2bca2` + that commit · **head now `757a85d`** (waves A/B/C + this truth pass) · **true branch point `a57c081d4741`** — `git merge-base a57c081d4741 HEAD` → `a57c081d47413cabc8c7b0511a391adc788e7d16` |
| **Plan** | `docs/superpowers/plans/2026-09-16-guideline-to-tool-plan-3-encode-29-standards.md` |
| **Controller ledger** | `.superpowers/sdd/2026-09-16-guideline-to-tool-plan-3-encode-29-standards/progress.md` |
| **Sign-off sheet** | `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` (index table at the top) |
| **Apply order** | `docs/superpowers/guideline-to-tool-playbook.md` → "Apply order (hard constraint)" → "Plan 3 — the 29 standards" |

Authorship, verified in this session:

Re-executed at HEAD `757a85d` on 2026-09-25 (the close-out's own numbers were 76 / 76):

```
$ git log --oneline a57c081d4741..HEAD | wc -l
430                     # commits since the TRUE branch point
$ git log --oneline f2caca4..HEAD | wc -l
84                      # commits since the Plan-2b head this plan was based on
$ git log --format="%an <%ae>" f2caca4..HEAD | sort | uniq -c
     84 Alvaro <alvaro.burgos@ekowai.com>
$ git log --format=%H f2caca4..HEAD | while read h; do git log -1 --format=%B $h \
    | grep -q "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" || echo "MISSING $h"; done
  (no output — all 84 commits carry the trailer)
```

## What was built

Measured in this session from the committed modules, not from a report
(`pnpm -s tsx scripts/verification/_t30-counts.ts`; the frozen Plan-1 `a138` builder excluded, its
superseding `a138_p3` counted):

| | |
|---|---|
| standards encoded | **29** |
| `regulation_tables` | **196** |
| `regulation_table_rows` (each with a lifted `verbatim_quote`) | **1 945** |
| register carriers | **169** |
| `select_one` / `select_many` / `lookup_fill` configs | **55** / **15** / **172** |
| field `visible_when` / section `visible_when` | **484** / **290** |
| equations emitted | **679** |
| fields created additively | **1 096** |
| migrations written | **85** (27 seed · 29 field-config · 29 equations) |
| rollbacks written | **85** (0 unpaired in either direction) |
| **migrations applied** | **0** |
| sign-off blocks | **1 280** (was 1 279 — `plan1-D-3-1` was invisible to the index script; both the script and the sheet are corrected) |
| STAGED blocks (29 files, 100 % SQL comments) | **1 045** |
| commits | **84** (`f2caca4..757a85d`) · **430** since the true branch point `a57c081d4741` (was: 76 at `2b2bca2`) |

```
$ ls scripts/migrations/2026091710*_regulation_tables_seed_*.sql | wc -l   →  27
$ ls scripts/migrations/2026091710*_field_configs_*.sql          | wc -l   →  29
$ ls scripts/migrations/2026091710*_equations_*.sql              | wc -l   →  29
$ ls scripts/migrations/20260917*.sql | wc -l ; ls scripts/rollback-20260917*.sql | wc -l  →  85 / 85
$ node scripts/verification/_t30-signoff-index.mjs | head -3      # re-run 2026-09-25 after the script fix
#SHEET_TOTAL   1280                                              #   (was 1279 — see the note below)
#STAGED_TOTAL  1045
#UNKNOWN_CLASS_LETTERS  []
```

**Index-script correction (2026-09-25).** `_t30-signoff-index.mjs` could not see `plan1-D-3-1` for
two reasons: `plan1` was not in its `SLUGS` array, and the id's number part is two-segment (`3-1`)
where the heading regex accepted `\d+`. **That is the one block that gates the entire apply list.**
Both were fixed; the script now prints a `plan1` row (D = 1, `staged_blocks` 0, `staged_file`
MISSING by design — its SQL is `supabase/migrations/20260911100000_guideline_to_tool_schema.sql`,
not a STAGED file). The sheet's "234 sheet blocks are rulings with no SQL" is corrected to **233**
there, with the derivation.

VSME (Task 24) and ATV-A-704E (Task 27) have **no seed migration** — neither has a transcript of
any kind, so no table content could be lifted under SR-1. `SEED_BUILDERS` therefore carries 27 of
the 29 slugs.

## Per-task commits, migrations and counts

Migration timestamps follow the plan's convention `2026091710<NN>{00|10|20}` where `<NN>` is the
task number: `…00` seed, `…10` field configs, `…20` equations. Every filename below was listed from
disk in this session; every hash resolves (`git cat-file -e <h>^{commit}` for all 76).

| task | standard (slug) | commits | migration stamps | tables/rows | registers | equations | sign-off blocks |
|---|---|---|---|---|---|---|---|
| 0 | shared infrastructure | `b349d21` `0520b4c` `cb3ff4d` | — | — | — | — | 0 (+1 observation) |
| 1 | DWA-A-138-1 (`a138`) | `8e693e0` `0ed878a` | `…100100/110/120` | 9 / 81 | 2 | 5 | 35 |
| 1b | *(engine)* enum/text inputs reach formulas | `1d0539b` `9485df2` | — | — | — | — | — |
| 2 | DIN-1989-1 (`din1989_1`) | `f6c3e5d` `f2af4fa` | `…100200/210/220` | 7 / 42 | 5 | 9 | 22 |
| 3 | DWA-A-262E (`a262e`) | `2bc4035` `f88155e` `755d952` `43f23dc` | `…100300/310/320` | 10 / 69 | 4 | 14 | 44 |
| 4 | DWA-M-277E (`m277e`) | `b075143` `77e2ce2` `8afd86e` `6fee3be` | `…100400/410/420` | 9 / 38 | 7 | 14 | 30 |
| 5 | DWA-M-1200-1 (`m1200_1`) | `e53ed5c` `faf0418` | `…100500/510/520` | 7 / 63 | 6 | 8 | 28 |
| 6 | DWA-M-1200-3 (`m1200_3`) | `829dd07` `fde8316` | `…100600/610/620` | 10 / 62 | 8 | 9 | 27 |
| 7 | FLL-GAR-2023 (`fll_gar`) | `c8c5453` `a2dcf19` `4922627` | `…100700/710/720` | 20 / 107 | 9 | 19 | 46 |
| 8 | FLL-Naturteich (`fll_naturteich`) | `57ebbc7` `e2ed808` | `…100800/810/820` | 11 / 38 | 5 | 11 | 32 |
| 9 | DWA-M-820-3 (`m820_3`) | `cee1e98` `0197bab` | `…100900/910/920` | 10 / 193 | 12 | 115 | 22 |
| 10 | DIN-18130-1 (`din18130_1`) | `8479e7d` `54151cd` | `…101000/010/020` | 7 / 36 | 2 | 8 | 36 |
| 10b | *(UI)* `fmt()` scientific form under 0.01 | `5b88dc1` | — | — | — | — | — |
| 11 | DWA-M-205 (`m205`) | `62f6c48` `309d553` | `…101100/110/120` | 15 / 79 | 6 | 16 | 50 |
| 12 | DWA-M-187 (`m187`) | `d8fbc21` `e037ce6` | `…101200/210/220` | 11 / 69 | 6 | 25 | 48 |
| 12b | *(emitter)* self-consumer is not a producer | `72b975b` | — | — | — | — | — |
| 12c | *(emitter)* gate-aware producer guard, 4 rounds | `1b7db36` `9b52f99` `00ad41a` `e390e20` | — | — | — | — | — |
| 13 | DIN-276 (`din276`) | `00cbe95` `885f781` | `…101300/310/320` | 4 / 671 | 14 | 115 | 45 |
| 13b | *(expr)* a quoted literal is never a symbol | `7c82243` | — | — | — | — | — |
| 14 | DWA-A-178 (`a178`) | `55debd6` `ede96bb` | `…101400/410/420` | 7 / 51 | 4 | 17 | 57 |
| 15 | DIN-EN-16941-2 (`din16941_2`) | `2ea6145` `19cee8f` | `…101500/510/520` | 9 / 36 | 4 | 15 | 32 |
| 16 | DWA-M-1200-2 (`m1200_2`) | `a8ef2d3` `f008ea0` | `…101600/610/620` | 10 / 58 | 5 | 63 | 44 |
| 17 | DIN-1989-2 (`din1989_2`) | `ddbaffa` `5444d8f` | `…101700/710/720` | 5 / 19 | 3 | 23 | 32 |
| 18 | DWA-M-820-1 (`m820_1`) | `bc4583f` `a687568` | `…101800/810/820` | 6 / 20 | 6 | 36 | 54 |
| 19 | DWA-M-820-2 (`m820_2`) | `f0144d8` `1a4544c` | `…101900/910/920` | 2 / 29 | 7 | 14 | 33 |
| 20 | ISO-5667-10 (`iso5667_10`) | `348ca28` `359e3fb` | `…102000/010/020` | 8 / 14 | 5 | 18 | 51 |
| 21 | ISO-59020 (`iso59020`) | `a9448aa` `f6d1e35` | `…102100/110/120` | 1 / 13 | 7 | 38 | 51 |
| 22 | ISO-46001 (`iso46001`) | `86511b0` `c0cdb03` | `…102200/210/220` | 2 / 40 | 9 | 20 | 83 |
| 23 | ISO-5667-6 (`iso5667_6`) | `114b8c3` `dac13d5` | `…102300/310/320` | 6 / 23 | 4 | 10 | 47 |
| 24 | VSME (`vsme`) | `fd8ea8e` `e9b4619` | `…102410/420` *(no seed)* | 0 / 0 | 7 | 14 | 54 |
| 25 | DIN-14021 (`din14021`) | `aa1433c` `6420adb` | `…102500/510/520` | 3 / 38 | 1 | 3 | 77 |
| 26 | ISO-14046 (`iso14046`) | `290149f` `0ee2682` `4df61a1` | `…102600/610/620` | 2 / 17 | 5 | 15 | 56 |
| 27 | ATV-A-704E (`atv_a704e`) | `6588dec` `bffcd55` | `…102710/720` *(no seed)* | 0 / 0 | 9 | 12 | 72 |
| 28 | ISO-5667-1 (`iso5667_1`) | `0410029` `224a38e` | `…102800/810/820` | 4 / 33 | 4 | 7 | 39 |
| 29 | ISO-59004 (`iso59004`) | `adcc689` `2b2bca2` | `…102900/910/920` | 1 / 6 | 3 | 6 | 32 |
| 30 | close-out (this commit) | *(see `git log -1`)* | — | — | — | — | 3 (`din1989_1-G-4`, `a262e-G-11`, `a262e-G-12`) |

Tables/rows/registers/equations are the live measurement; sign-off block counts are from the index
at the top of the sheet. **Task 30's three blocks are already included in the DIN-1989-1 (22) and
DWA-A-262E (44) rows** — the index keys on the id's slug, not on the task that wrote the block —
so the table's block column must not be summed with the Task-30 row. Per-standard detail, raw test output and residue:
`docs/superpowers/specs/2026-09-11-guideline-to-tool/reports/plan-3-<slug>.md` (29 files).

## Whole-branch verification — RE-RUN AT HEAD `757a85d` (2026-09-25)

Every row below was re-executed in the documentation-truth pass. The close-out's own figures
(2026-09-24, `2b2bca2`) are kept in the right-hand column so the movement is auditable.

| check | result at HEAD `757a85d` | at close-out `2b2bca2` |
|---|---|---|
| `pnpm test` | **PASS** — 373 files passed, 1 skipped (374); **3 284 tests passed**, 1 expected fail, 1 skipped (3 286); 61.84 s; exit 0 | 3 157 passed |
| `pnpm -s typecheck` | **PASS** — exit 0, no output | same |
| `pnpm -s lint` (whole repo) | **FAIL**, and that is pre-existing debt — **but the close-out's scoping of it was wrong; see the corrected finding L-1 below** | 56 errors, "all outside Plan 3's diff" |
| `npx eslint` over **every** branch-touched code file — 737 existing `.ts/.tsx/.mjs/.js/.cjs` files in `git diff --name-only a57c081d4741..HEAD` | **1 file with 1 error, 158 warnings** — and the error pre-exists at the branch point (corrected finding L-1) | claimed PASS over 270 files, measured against `f2caca4`, not the branch point |
| emitter determinism, 28 seed builders | **PASS** at wave C — all re-emitted, `git status --short` clean of migrations/rollbacks | same |
| emitter determinism, 29 field-config + 29 equation migrations | **PASS** at wave C — 29 + 29 + 27 re-emits, byte-identical, 85/85 pairing intact | same |
| migration/rollback pairing | **PASS** — 85 / 85, 0 unpaired either way | same |
| `pnpm vitest run --project integration` | **NO LONGER UNCLAIMED — see "Integration evidence" below.** 32 Plan-3 verify harnesses, **883 tests, 0 failures**, run in 16 batches of two with `--no-file-parallelism` | "still running when this ledger was written" |

### Integration evidence at HEAD `757a85d` — the project run is no longer unclaimed

Run in this session, batch by batch, each `npx vitest run --project integration
--no-file-parallelism <two files>`; every batch finished in 10–14 s:

| batch | files | tests |
|---|---|--:|
| 1 | `a138-verify` · `a178-verify` | 65 |
| 2 | `a262e-verify` · `a704e-verify` | 98 |
| 3 | `din14021-verify` · `din16941-2-verify` | 72 |
| 4 | `din18130-verify` · `din1989-1-verify` | 34 |
| 5 | `din1989-2-verify` · `din276-verify` | 46 |
| 6 | `fllnt02-verify` · `fllnt11-verify` | 5 |
| 7 | `fllnt12-verify` · `iso14046-verify` | 26 |
| 8 | `iso46001-verify` · `iso5667-1-verify` | 79 |
| 9 | `iso5667-10-verify` · `iso5667-13-verify` | 55 |
| 10 | `iso5667-16-verify` · `iso5667-6-verify` | 31 |
| 11 | `iso59004-verify` · `iso59020-verify` | 52 |
| 12 | `m1200-1-verify` · `m1200-2-verify` | 33 |
| 13 | `m1200-3-verify` · `m187-verify` | 29 |
| 14 | `m205-verify` · `m277e-verify` | 126 |
| 15 | `m820-1-verify` · `m820-2-verify` | 70 |
| 16 | `m820-3-verify` · `vsme-verify` | 62 |
| | **32 files** | **883** |

**All 32 passed; 0 failures.** This covers every one of the 29 Plan-3 standards' verify harnesses
(plus `iso5667-13` / `iso5667-16`, which the same glob picks up). It is **not** the whole
`--project integration` run — that project holds 135 `tests/harness/*.integration.test.ts` files
plus ~20 DB-backed action/query suites, and the remainder is still unclaimed here. On top of this,
the waves' own reviewers ran their samples: wave A 5 harnesses / 138 tests, wave B 142 + 8 + 38 +
52, wave C's reviewer 15 files / 552 tests, and the wave-B reviewer's independent sample of 16
harnesses the implementer never ran (487 tests, 0 failures). **Re-runnable — the commands are
above, and so is the trap that makes them look broken (see the wedge note in the playbook).**

**Finding L-1 (lint) — CORRECTED 2026-09-25. The conclusion survives; the proof did not.**

~~**None of those files appears in `git diff --name-only f2caca4..HEAD`.**~~ That comparison is
against **`f2caca4`, the Plan-2b head** — not against the branch point. `feat/guideline-to-tool`
forks from **`a57c081d4741`**, 430 commits back, and 737 code files are touched over that span, not
270. Measured against the real branch point, **one erroring file IS branch-touched.** Re-run in this
session in 60-file chunks (`npx eslint -f json`, aggregated):

```
$ git diff --name-only a57c081d4741..HEAD | grep -E '\.(ts|tsx|mjs|js|cjs)$' | wc -l
746                     # 737 of them still exist on disk
$ # eslint over all 737, results aggregated from the JSON reporter:
ERROR files: 1   errors: 1   warnings: 158
 - src/components/worksheet/__tests__/engine-wiring-suppress-a138-17.test.tsx
   246:48  @typescript-eslint/no-require-imports  A `require()` style import is forbidden.
```

**The branch introduces no new error.** The offending line exists verbatim at the branch point —
`git show a57c081d4741:src/components/worksheet/__tests__/engine-wiring-suppress-a138-17.test.tsx`
prints it at L247 (`const { asmEngineSuppressedSymbols } = require('@/lib/eval/asm-source') as
typeof import('@/lib/eval/asm-source');`) — and the branch's only edit to that file removed two
`vi.mock` lines, which is why the same statement now sits on L246:

```
$ diff <(git show a57c081d4741:src/components/worksheet/__tests__/engine-wiring-suppress-a138-17.test.tsx) \
       src/components/worksheet/__tests__/engine-wiring-suppress-a138-17.test.tsx
84,85c84
< vi.mock('../rainfall-table-selector', () => ({ RainfallTableSelector: () => null }));
< vi.mock('../surface-inventory-editor', () => ({ SurfaceInventoryEditor: () => null }));
---
> // Plan 2b: `../surface-inventory-editor` deleted (generic RegisterEditor) — its vi.mock removed.
```

**So the honest statement is: the branch touches one file that lints red, and the red pre-dates the
branch.** `eslint.config.mjs` is untouched by the branch. The whole-repo `pnpm -s lint` red is real
technical debt on `main`; **it is not a Plan-3 defect and nothing in this plan should be changed to
fix it** — that conclusion is unchanged. What changed is that the claim "no branch-touched file
errors" is retired, because it was only ever true of the last 84 commits.

~~**Note on the integration project** — superseded by "Integration evidence at HEAD" above.~~
The close-out could not claim the integration project because its run was still executing 43
minutes in (no output flushed, 45 live `postgres` processes). **That was not slowness — it was the
orphan wedge**, now diagnosed and recorded in the playbook: previous sessions' embedded-Postgres
processes survive their runs, and once enough of them are alive a new run hangs before it prints
anything. In this session 68 orphaned `postgres.exe` from 2026-09-17…09-24 were alive, a two-file
batch hung past 10 minutes, and after killing the orphans **the same two files finished in 11.38 s.**

## Absence audit (amendment O) — the honest result

Amendment O was added **after Task 19 shipped a false "not printed" claim** (a `cut -c1-300` had
truncated the paragraph that did print the cue; retracted in `1a4544c`). Tasks 1–19 therefore
predate the rule. Task 30 screened every source-absence claim across the 29 reports and the 29
STAGED files:

```
$ node scripts/verification/_t30-absence-audit.mjs
#SOURCE_ABSENCE_CLAIMS                     144
#WITH_COMMAND                               74
#WITH_COMMAND_AND_EXIT_OR_EMPTY             34
#NO_COMMAND                                 70
#NO_COMMAND_BUT_CITES_A_TRANSCRIPT_LINE     60
#NO_COMMAND_AND_NO_LINE_CITATION            10
```

- **74 of 144** claims carry a re-executable command within ±10 lines; **34** carry the command AND
  an exit code / empty-output marker — the full amendment-O standard.
- **60** carry no command but DO cite the transcript line or PDF page they read, which is weaker
  evidence than a failing grep but is not a bare assertion.
- **10** carry neither. Of those, five are regex false positives (a counts-table cell, a token/time
  line, an equations list), and **five are genuine gaps** a reader should treat as unverified:
  `plan-3-m277e.md:125` ("Table 5 prints no area row"), `plan-3-fll_gar.md:137` ("Tab. 28 prints no
  'nein'"), `m820_3-STAGED-plan3-rulings.sql:1010` ("the fulfilment formula and the verdict bands
  are NOT printed"), `plan-3-iso5667_1.md:17` ("the standard prints no whole-worksheet
  applicability rule"), `iso59004-STAGED-plan3-rulings.sql:332` ("Table 1 prints no category
  column" — this one IS backed by a grep, in §5 of the same standard's report, just not beside the
  claim).

Per the controller's instruction the transcripts were **not** re-grepped in Task 30; the five above were
recorded as findings, not silently repaired.

**CLOSED in Task 30b (2026-09-24).** All five were re-executed against their own sources in one session —
three md transcripts read with full-line `sed` / `awk` / `grep` (never `cut`), and two fresh in-session
`pdftotext -layout` extractions of the ISO PDFs (scratchpad only, not committed). **All five HOLD**; none
was the Task-19 incident class repeating, and no encoding was touched. Command, raw output and exit code
now sit beside every one of them — in the standard's report and in the block that relies on it
(`m277e-J-3`, `fll_gar-J-5`, `m820_3-F-1`, `iso59004-D-2`; the ISO-5667-1 claim is a counts-table statement
with no dependent block). Two claims turned out to be stronger than stated: "nein" occurs nowhere in the
FLL-GAR transcript at all, and "categor" nowhere in the ISO 59004 FDIS at all. Full pass:
`.superpowers/sdd/2026-09-16-guideline-to-tool-plan-3-encode-29-standards/task-30b-report.md`.

## Gate-guard debt — closed in this task

The controller ledger carried three items to Task 30. Result:

| item | state found | action |
|---|---|---|
| `din1989_1` CR-11 → G-block | **MISSING** — CR-11 appeared only in passing inside the `din1989_1-C-1` block; no G-block existed | **WRITTEN**: `din1989_1-G-4` (STAGED file + sheet) |
| `a262e` REQ-05 + 8 section minima → G-blocks | **MISSING** — `grep "REQ-05\b"` / `REQ-40` / … over `a262e-STAGED-plan3-rulings.sql` all returned 0 | **WRITTEN**: `a262e-G-11` (REQ-05) and `a262e-G-12` (the eight section rules, **ten** gates — REQ-111 and REQ-131 ride along on the -20 C and -22 C refusals) |
| `fll_gar-C-2` FLL-GAR-12 C re-emit | **ALREADY THERE** — `fll_gar-C-2` documents the `-12 C` case (`fll_gar-STAGED-plan3-rulings.sql:62–74`) and offers the new-gate option at `:213` | **no change**. The re-emit itself would rewrite `20260917100710_field_configs_fll_gar.sql`, which is an encoding change and outside a close-out's mandate — it is listed as the one open re-emit candidate below |

Both new blocks are md5-guarded against prod values captured **read-only in this session**, use the
archive pattern with the complete live 18-column `compliance_requirements` list, and are 100 %
comments (`grep -cvE '^[[:space:]]*(--|$)'` → 0 on both files).

## The memory line to add

Append to `project_guideline_to_tool_generic_fields.md`:

> **Plan 3 COMPLETE (BUILT, nothing applied) 2026-09-24; final `[CODE]` waves + truth pass
> 2026-09-25** — 29 standards encoded on `feat/guideline-to-tool` (`f2caca4..757a85d`, **84**
> commits; **430** since the true branch point `a57c081d4741`; all as Alvaro with the Fable
> trailer): 196 tables / 1 945 verbatim rows / 169 registers / 774 visibility rules / 679 equations
> / 1 096 additive fields. **85 migrations + 85 rollbacks WRITTEN-NOT-APPLIED**; **1 280** sign-off
> blocks, 1 045 STAGED SQL blocks, all awaiting the owner's batch. Apply order (owner-stamped) is in
> `docs/superpowers/guideline-to-tool-playbook.md` and is GATED on `plan1-D-3-1` — prod's legacy
> `regulation_tables` (5 382 rows, 19 columns) must be renamed by `20260911100000` first or every
> seed fails silently behind the TS fallback. Ledger: `reports/plan-3-LEDGER.md`. **Plan 2c is
> 15 of 17 DONE** by waves A/B/C (open: inputs inside an untaken `if()` branch; `LookupFillField`
> under a `locked` policy). Next = owner decision batch + a deployed browser pass. Whole-branch
> `pnpm test` **3 284** green, typecheck 0; 32 Plan-3 integration harnesses / 883 tests green;
> repo-wide `pnpm -s lint` is RED with PRE-EXISTING errors — one of the erroring files IS
> branch-touched but its error pre-dates the branch point.

## Honest residue — what a reader must NOT assume is done

1. **Nothing is applied.** Zero migrations have run against `vadsmshzebefjreqcicl` or any other
   database. Re-executed READ-ONLY in this session:

   ```
   $ node scripts/verification/prod-query.mjs --sql "select
       (select count(*) from information_schema.tables  where table_schema='public' and table_name='regulation_table_rows') as rt_rows_table_exists,
       (select count(*) from information_schema.columns where table_schema='public' and table_name='regulation_tables' and column_name='standard_code') as has_standard_code,
       (select count(*) from public.regulation_tables) as legacy_rows"
     rt_rows_table_exists = 0 · has_standard_code = 0 · legacy_rows = 5382
   ```

   Prod still carries the **legacy** `regulation_tables` (19 columns, 5 382 rows) and has no
   `regulation_table_rows` table at all. Every count in this ledger describes files on a branch.
2. **Nothing is deployed and there has been no browser pass.** The proof mandate's deployed-build
   execution has not been run for any of the 29 standards. The "5-minute look" queue at the bottom
   of the sign-off sheet is a script for a pass that has not happened.
3. **The integration project is PARTLY claimed** *(corrected 2026-09-25 — it read "UNCLAIMED")*.
   **32 Plan-3 verify harnesses / 883 tests ran green at HEAD `757a85d`** in this session, in 16
   batches of two — every one of the 29 standards is covered, and the table is above. What is
   still unclaimed is the REST of the project: `--project integration` holds 135
   `tests/harness/*.integration.test.ts` files plus ~20 DB-backed action/query suites, and the
   ~103 non-Plan-3 harnesses have not been run as one sweep. Re-runnable — and read the wedge note
   in the playbook first, or a clean run will look like a hang.
4. **1 280 sign-off blocks are unratified** *(1 279 + `plan1-D-3-1`, which the index could not
   see)*, including every enforcement decision. Three of them
   (`din1989_1-G-4`, `a262e-G-11`, `a262e-G-12`) mean that **applying `20260917100210` or
   `20260917100310` as they stand makes eleven `block` gates stop enforcing, silently.** That is
   the single most dangerous thing in this plan and it is why the apply order names them.
5. **`plan1-D-3-1` gates everything.** Until the owner rules on renaming the legacy prod
   `regulation_tables`, the whole apply list is blocked — and applying it without the rename fails
   in a way the runtime fallback hides.
6. **Roughly 60 printed rows and two whole standards' table content were deliberately not encoded**
   (91 `U` blocks). ISO-46001 Table D.1 is 1 of 24 rows; ISO-59004 Table 1 is not seeded at all;
   VSME and ATV-A-704E have no tables because they have no readable source. Those worksheets will
   look complete and will not be.
7. **ISO-59004 is encoded from a FINAL DRAFT (FDIS).** `iso59004-J-1` gates all three of its
   migrations. If the owner rejects draft-sourced encoding, Task 29's entire output falls.
8. ~~**Five absence claims have no evidence beside them** (listed above). They were not
   re-verified.~~ **CLOSED — and this residue line contradicted the section above it even at the
   close-out.** Task 30b (2026-09-24) re-executed all five against their own sources in one
   session; **all five HOLD**, each now carries its command, raw output and exit code beside it,
   and two turned out stronger than stated. See "Absence audit" above and
   `.superpowers/sdd/2026-09-16-guideline-to-tool-plan-3-encode-29-standards/task-30b-report.md`.
   *(Corrected 2026-09-25.)*
9. **The Plan-2c backlog is 2 of 17 open, not 17** *(rewritten 2026-09-25 — this item was wrong on
   ALL FOUR of the examples it named; every one of them was fixed by waves A/B/C, seven commits
   after this ledger was written).* For the avoidance of doubt, what it said and what is true:
   | it said (2026-09-24) | at HEAD `757a85d` |
   |---|---|
   | "server-side visibility/materialisation ignores inherited fields" | **FIXED** — `c0aad97` + `f7af30e`; `saveWorksheet` loads inherited fields on the tx client and passes them to both helpers, and the report path uses the same pair |
   | "checklists render enum values instead of labels" | **FIXED** — `c0aad97` + `f7af30e`; labels render, blank `label_de` falls back to the value |
   | "`contains()` has no engine path" | **FIXED** — `2b3f84c` + `cc6b9ed`; json carriers reach all five production callers, and an AND-chain of `contains()` parses and evaluates |
   | "a `lookup()` miss inside a register silently blanks a cell and poisons its aggregates" | **HALF FIXED** — `2b3f84c` + `cc6b9ed`; the miss is now CITED on both aggregate paths. The aggregate still goes `manual_required`, **deliberately** — turning an unprinted table row into a `0` is the owner's judgement, not the engine's (`iso5667_1-F-1` stays open on that half) |

   **What is genuinely still open: two items.** (3) inputs inside an untaken `if()` branch are
   still required — `src/lib/eval/formula.ts:213-231` still demands every symbol the formula names,
   which is why `M187-22-D7 carbonatschicht_nachweis` has to exist; and (6) `LookupFillField`
   renders no input at all under a `locked` policy with unresolved keys —
   `src/components/worksheet/lookup-fill-field.tsx:181` still requires `policy !== 'locked'`, which
   is why the whole corpus uses twins instead of re-binds on required fields. **Both were re-probed
   at HEAD in the documentation-truth pass.** The per-item state, with the fixing commit for each of
   the other fifteen, is on the sign-off sheet under "Plan 2c backlog".

   **A closed backlog item is an OPTION, not an encoding.** Nothing was re-encoded on the strength
   of these fixes — in particular the 23 ISO-59004 gate conditions that `iso59004-I-3` now permits
   were **not** written; that block lays out the choice and waits for a signature.
10. **One re-emit candidate is knowingly left undone:** `fll_gar-C-2`'s FLL-GAR-12 C section rule
    could now be emitted under the Task-12b self-consumer rule. Doing so rewrites a committed
    migration, which a close-out must not do. ~~It belongs to … the corpus re-emit that item 15 of
    the Plan-2c backlog (`visible_when IS NULL` guard) will force anyway.~~ **Corrected 2026-09-25:
    that re-emit has ALREADY HAPPENED** — wave C (`95d0ea3`) added the guard and re-emitted the
    corpus (24 of 29 field-config migrations changed; 140 field + 290 section guards; proven
    mechanical, reversing the guard strings reproduces the parent byte-for-byte), and
    `20260917100710_field_configs_fll_gar.sql` was among the files it rewrote **without** emitting
    this rule. So there is no longer a free ride: emitting `fll_gar-C-2`'s FLL-GAR-12 C rule now
    needs its own touch of that standard, and it is still undone.
11. **Sixteen `visible_when = NULL` writes are UNGUARDED** *(new, 2026-09-25)*. Wave C guarded the
    430 statements that WRITE a rule; the sixteen that CLEAR one were deliberately left unguarded,
    so for those fields a re-apply is not a no-op — it wipes a rule a human set. They are listed
    field-by-field in the `C-1` amendment on the sign-off sheet. *(The final whole-branch review
    said twelve; `grep -rn "visible_when = NULL" scripts/migrations/*.sql | wc -l` says 16, across
    8 files.)*
12. **Six symbols are configured by BOTH a Plan-1 and a Plan-3 migration** *(new, 2026-09-25)* —
    `award_criteria_list`, `bewertungskommission_members`, `stakeholder_list`, `change_orders`,
    `plant_species_list`, `bewaesserungstagebuch`. The Plan-1 `20260911120000_selection_configs_*`
    UPDATE is **standard-wide and unguarded**; the Plan-3 field-config UPDATE is worksheet-scoped.
    Today no worksheet is left behind (verified read-only against prod), but re-running a Plan-1
    migration after Plan 3 overwrites the richer config everywhere, and a Plan-3 rollback restores
    `NULL`, not the Plan-1 config. New sign-off block **`C-3`** carries the enumeration, the prod
    query and the three options.
13. **No cross-standard inheritance was encoded** (Phase 6) and **no `verified_against_standard`
    equation was replaced** — every replacement is a STAGED `R`/`E` block.
14. **The six now-false `ui_config.note` strings are STILL FALSE** *(carried from wave C, restated
    2026-09-25)*. They are ENCODED VALUES shown to the engineer under the widget, so wave C did not
    touch them; the four `fields.description` strings carrying the same claim WERE corrected and
    re-emitted. The list is block `C-2` on the sign-off sheet
    (`din14021.ts:188` / `:201`, `iso14046.ts:107` / `:252`, `iso59004.ts:184`,
    `iso5667_6.ts:275`). Each tells the engineer that a completeness code over a checklist cannot
    be materialised; since wave A it can.
