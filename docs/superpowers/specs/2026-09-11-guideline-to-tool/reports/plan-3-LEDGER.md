# Plan 3 — LEDGER (close-out, Task 30)

> **Read the residue section at the bottom before you act on anything here.** Plan 3 is BUILT, not
> applied. No migration has touched any database, no build has been deployed, no browser pass has
> been run, and 1 279 sign-off blocks are awaiting the owner's signature.

## Session header

| | |
|---|---|
| **Model** | Claude Opus 5 (1M context) — `claude-opus-5[1m]`, effort **max** (Task-30 close-out session, 2026-09-24) |
| **CLI** | Claude Code **2.1.281** (`claude --version`; no update run — standing owner rule "no CLI updates") |
| **Plan-3 execution** | controller on `claude-opus-5[1m]` (Claude Code 2.1.260 at the time); implementers on Opus, scoped re-reviewers on Sonnet; every commit trailed `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` |
| **Branch / worktree** | `feat/guideline-to-tool` in `C:\Users\Ekowai\_wt-g2t` · base `f2caca4` (Plan-2b fix wave) · head at close-out `2b2bca2` + this commit |
| **Plan** | `docs/superpowers/plans/2026-09-16-guideline-to-tool-plan-3-encode-29-standards.md` |
| **Controller ledger** | `.superpowers/sdd/2026-09-16-guideline-to-tool-plan-3-encode-29-standards/progress.md` |
| **Sign-off sheet** | `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` (index table at the top) |
| **Apply order** | `docs/superpowers/guideline-to-tool-playbook.md` → "Apply order (hard constraint)" → "Plan 3 — the 29 standards" |

Authorship, verified in this session:

```
$ git log --format="%an <%ae>" f2caca4..HEAD | sort | uniq -c
     76 Alvaro <alvaro.burgos@ekowai.com>
$ git log --format=%H f2caca4..HEAD | while read h; do git log -1 --format=%B $h \
    | grep -q "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" || echo "MISSING $h"; done
  (no output — all 76 commits carry the trailer)
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
| sign-off blocks | **1 279** |
| STAGED blocks (29 files, 100 % SQL comments) | **1 045** |
| commits | **76** (`f2caca4..2b2bca2`) |

```
$ ls scripts/migrations/2026091710*_regulation_tables_seed_*.sql | wc -l   →  27
$ ls scripts/migrations/2026091710*_field_configs_*.sql          | wc -l   →  29
$ ls scripts/migrations/2026091710*_equations_*.sql              | wc -l   →  29
$ ls scripts/migrations/20260917*.sql | wc -l ; ls scripts/rollback-20260917*.sql | wc -l  →  85 / 85
$ node scripts/verification/_t30-signoff-index.mjs | head -3
#SHEET_TOTAL   1279
#STAGED_TOTAL  1045
#UNKNOWN_CLASS_LETTERS  []
```

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

## Whole-branch verification at close-out (2026-09-24)

| check | result |
|---|---|
| `pnpm test` | **PASS** — 360 files passed, 1 skipped; **3 157 tests passed**, 1 expected fail, 1 skipped; exit 0 |
| `pnpm -s typecheck` | **PASS** — exit 0, no output |
| `pnpm -s lint` (whole repo) | **FAIL** — 235 problems, **56 errors**, 179 warnings, exit 1. **Every erroring file is outside Plan 3's diff** (see the finding below) |
| `npx eslint <the 270 .ts/.tsx/.mjs files in `git diff --name-only f2caca4..HEAD`>` | **PASS** — exit 0 across all chunks |
| emitter determinism, 28 seed builders | **PASS** — all re-emitted, `git status --short` shows no migration/rollback change |
| emitter determinism, 29 field-config + 29 equation migrations | **PASS** — all re-emitted at their committed timestamps, byte-identical |
| migration/rollback pairing | **PASS** — 85 / 85, 0 unpaired either way |
| `pnpm vitest run --project integration` | **see the note below — it was still running when this ledger was written** |

**Finding L-1 (lint, pre-existing, NOT introduced by Plan 3).** `pnpm -s lint` over the whole repo
exits 1 with 56 errors, all `@typescript-eslint/no-explicit-any` / `no-require-imports` in
`scripts/vsme/**` (8 files), `src/components/vsme/worklist.tsx`,
`src/components/worksheet/__tests__/{a138-17-dual-role,engine-routing-generalized,engine-wiring-suppress-a138-17}.test.tsx`,
`src/lib/actions/__tests__/co2.integration.test.ts` and
`src/lib/eval/__tests__/engine-gate-blocking.demo.test.tsx`. **None of those files appears in
`git diff --name-only f2caca4..HEAD`**, and `eslint.config.mjs` is untouched by the branch. The 29
task reports say "eslint clean" because each ran `npx eslint <its own touched files>`, which is
true and is reproduced here for all 270 branch-touched code files. The whole-repo red is real
technical debt on `main`, and it is recorded here because a reader would otherwise find it and
assume Plan 3 caused it. **It is not a Plan-3 defect and nothing in this plan should be changed to
fix it.**

**Note on the integration project.** `pnpm vitest run --project integration` runs **135
`tests/harness/*.integration.test.ts` files plus ~20 DB-backed action/query suites**, each standing
up its own embedded Postgres. The run was launched at the start of this session and was still
executing 43 minutes in when the close-out was written (no output flushed, 45 live `postgres`
processes, the count unchanged across three checks); its result is therefore **NOT claimed
here**. What IS on the record is each task's own harness chain, run green inside that task and
pasted raw into its report (A138 38/38, A-262E 59/59, FLL-GAR 30 files/119, DIN-276 28/28,
ISO-46001 55/55, ISO-59004 14/14, …). **A reader must not take "integration green" from this
ledger; re-run it.**

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

Per the controller's instruction the transcripts were **not** re-grepped here; the five above are
recorded as findings for the next touch of those standards, not silently repaired.

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

> **Plan 3 COMPLETE (BUILT, nothing applied) 2026-09-24** — 29 standards encoded on
> `feat/guideline-to-tool` (`f2caca4..2b2bca2` + close-out, 76 commits, all as Alvaro with the Fable
> trailer): 196 tables / 1 945 verbatim rows / 169 registers / 774 visibility rules / 679 equations
> / 1 096 additive fields. **85 migrations + 85 rollbacks WRITTEN-NOT-APPLIED**; 1 279 sign-off
> blocks, 1 045 STAGED SQL blocks, all awaiting the owner's batch. Apply order (owner-stamped) is in
> `docs/superpowers/guideline-to-tool-playbook.md` and is GATED on `plan1-D-3-1` — prod's legacy
> `regulation_tables` (5 382 rows, 19 columns) must be renamed by `20260911100000` first or every
> seed fails silently behind the TS fallback. Ledger: `reports/plan-3-LEDGER.md`. Next = owner
> decision batch + Plan 2c (17 interface/engine gaps, listed on the sign-off sheet) + the final
> `[CODE]` wave + a deployed browser pass. Whole-branch `pnpm test` 3 157 green, typecheck 0;
> repo-wide `pnpm -s lint` is RED with 56 PRE-EXISTING errors in files Plan 3 never touched.

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
3. **`pnpm vitest run --project integration` is UNCLAIMED** for the whole branch (see the note
   above). Per-task harness chains are green and pasted in the task reports; the full project run
   is not.
4. **1 279 sign-off blocks are unratified**, including every enforcement decision. Three of them
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
8. **Five absence claims have no evidence beside them** (listed above). They were not re-verified.
9. **The Plan-2c backlog (17 items) is open**, and several are user-visible today: server-side
   visibility/materialisation ignores inherited fields, checklists render enum values instead of
   labels, `contains()` has no engine path, and a `lookup()` miss inside a register silently blanks
   a cell and poisons its aggregates.
10. **One re-emit candidate is knowingly left undone:** `fll_gar-C-2`'s FLL-GAR-12 C section rule
    could now be emitted under the Task-12b self-consumer rule. Doing so rewrites a committed
    migration, which a close-out must not do. It belongs to the next fll_gar touch or the corpus
    re-emit that item 15 of the Plan-2c backlog (`visible_when IS NULL` guard) will force anyway.
11. **No cross-standard inheritance was encoded** (Phase 6) and **no `verified_against_standard`
    equation was replaced** — every replacement is a STAGED `R`/`E` block.
