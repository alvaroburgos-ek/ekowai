# Plan 3 per-standard reports

One report per standard task at `plan-3-<slug>.md` (slugs per the plan's conventions section). Task 30 aggregates the counts table of every report into the playbook's token-cost ratio, so every report copies the header below verbatim and fills one row.

## Counts table (copy verbatim; one row per standard)

| slug | tables | rows lifted | rows unreadable | registers | select_one | select_many | lookup_fill | field visible_when | section visible_when | equations new | equations staged | sign-off entries | tokens in | minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `<slug>` | | | | | | | | | | | | | | |

Column meanings:

- **tables** — `regulation_tables` seeded by the slug's builder (`src/lib/eval/regulation-tables-seed-<slug>.ts`).
- **rows lifted** — `regulation_table_rows` whose `verbatim_quote` passed `verify-regulation-tables.ts` (PASS lines pasted in the report).
- **rows unreadable** — printed rows NOT seeded because the transcript cell is unreadable (each has a `U` sign-off entry).
- **registers / select_one / select_many / lookup_fill** — `FIELD_CONFIGS` entries by widget (UPDATE + `create` together; state the `create` count in the report body).
- **field visible_when / section visible_when** — entries carrying a `visible_when` / `SECTION_VISIBILITY` entries.
- **equations new** — `EQUATIONS` entries emitted (INSERT … ON CONFLICT DO NOTHING).
- **equations staged** — replacements / switch equations written to `scripts/verification/<slug>-STAGED-plan3-rulings.sql` (not emitted).
- **sign-off entries** — blocks appended to `SIGN-OFF-plan-3.md` by this task.
- **tokens in** — the subagent's context total at end (from the transcript's usage line); **minutes** — wall-clock of the task.

## Prior capture (before emitting field configs)

`node scripts/regulation-tables/build-prior-snapshot.mjs <STANDARD CODE> <slug>` writes `src/lib/eval/field-configs/<slug>.prior.json` (read-only prod capture, full JSON rows; `_meta.command` + `_meta.captured_at` record the run). Never fold `prod-query.mjs` output by hand — it truncates cells to 120 chars and the emitter refuses a stringified capture. Prod section codes are single letters per worksheet (e.g. `A138-01 A`, `A138-01 B`), NOT clause numbers — `SECTION_VISIBILITY` entries and `create.section_code` use the captured codes from `prior.sections` verbatim (the emitter refuses an unknown one). Paste the script's summary line into the report; if prod was unreachable, say so, build the prior from the harness seed, and emit with `--provenance "PRIOR FROM HARNESS SEED (prod unreachable <date>): owner re-captures before applying"`.

## Report sections (in this order)

1. Counts table (above).
2. Raw test output: `pnpm test` summary line, `pnpm -s typecheck`, eslint on touched files, the harness chain named in the task brief.
3. Transcript verification: the `verify-regulation-tables.ts <slug> "<path>"` output, pasted.
4. Inventory §5 top-wins walk: each marked encoded / partially / deferred-with-reason.
5. Files changed (migrations + rollbacks named with their timestamps).
6. Residue: what the guideline demands that the worksheets still do not ask, with the reason.
