@AGENTS.md

# AUTONOMOUS SEQUENCING RULE (STANDING — owner's verbatim text, ratified 2026-07-27)

> "AUTONOMOUS SEQUENCING RULE: The orchestrator never presents option menus or asks 'where
> should work go.' The standing priority order decides, always: (1) prod-write fixes that
> clear an active validator rule are PRE-AUTHORIZED when each fix is a verbatim source quote
> captured from the standard's own PDF in-session (SR-1 compliant by construction —
> quote-backfills, reference-edge additions, provenance corrections); (2) [CODE]-class
> tooling fixes — always pre-authorized, just do them; (3) next standard in the ranked queue.
> Decision items needing MY ruling (modal severities, range choices, normative ambiguity)
> accumulate in the queue file and NEVER block or sequence work — I sign asynchronously. The
> ONLY stops remain: prod writes that CHANGE computed values or enforcement behavior,
> ratified-design changes, irreversibles."

**Operational reading.** No menus, no "which should I do first". Work the order 1→2→3 and keep
going. Ratification items are *written down*, never *waited on*. The pre-authorisation in (1) is
scoped by its own justification: it holds only while the write is **evidence capture** — text
lifted verbatim from the standard's own PDF in the acting session. The moment a write would move
a number, a severity, a condition, or a gate's enforcement, it leaves clause (1) and hits the
stop-list, regardless of how small it looks. Capturing a quote is pre-authorised; deciding what
the quote *means* is not.

**Interaction with R-1/R-2.** In-session is load-bearing. A quote captured by another session,
another agent, or read out of a prior ledger is UNVERIFIED INPUT and does NOT qualify for the
pre-authorisation — it must be re-extracted from the PDF here before it may be written.

# SOURCE-SETTLED FIXES (STANDING — owner's verbatim text, ratified 2026-07-27)

> "SOURCE-SETTLED FIXES are pre-authorized prod writes: corrections where the printed
> standard or the standard's own declared structure fully determines the right answer, with
> zero interpretation — (a) symbol/case mismatches between a formula and its own declared
> fields (the Gl.13 class), (b) values/operators contradicting the verbatim printed page
> (with the quote captured in-session as evidence), (c) dead references to the standard's
> own content. Each ships with: the source quote or structural proof, a reproduction check
> (broken before, computes after — through the real save path where feasible), rollback,
> raw-output verify. What still stops for me: severity changes, anything resting on a modal
> reading or ambiguous language, new gates, range selections — the judgment layer stays mine."

**THE MISSION IS WORKING WORKSHEETS, NOT DOCUMENTED DEFECTS.** A findings list is not a
deliverable. Per standard, a wave is **done** only when all three hold:

1. Every **source-settled** defect is FIXED and re-verified.
2. Every **judgment** item is on the sign-off sheet with its evidence.
3. The **workflow metric** is stated: *what can an engineer actually run today?* — named
   worksheets that compute end-to-end, and named ones that still cannot, with the reason.

**The zero-interpretation test — apply it honestly, and default to NO.** A fix is
source-settled only if any competent engineer reading the same page or the same declared
structure would produce the identical correction. If the fix requires choosing a
representation the engine does not already provide (e.g. inventing a summation form for
`SUM_over_i`), deciding what a clause *means*, or picking among candidates, it is NOT
source-settled — it is a ruling, and it goes on the sheet. The bar is "determined", not
"probably right". Being 90 % sure is a ruling.

**The reproduction check is the point, not paperwork.** "Broken before, computes after" must
be demonstrated, not asserted — the F-4 lesson (gates that FIRE but never enforce) is exactly
what static reasoning misses. Where the real save path cannot be driven, say so explicitly and
state what was proven instead; never let an argued fix read as an executed one.

# UNATTENDED LONG-RUN (STANDING — owner's order, ratified 2026-07-27)

**Mission: every owned guideline to WORKING-WORKSHEET state** — audited at full depth AND
repaired, standard after standard from the ranked queue. Execute without asking until context
physically forces the boundary.

**Pre-authorised, never ask:**
1. **Source-settled prod fixes** (see the section above) — with proof, reproduction check,
   rollback, raw-output verify.
2. **Quote/evidence backfills.**
3. **All `[CODE]`/tooling fixes.**
4. **Schema/infra changes serving the mandate.**
5. **Sequencing** — the ranked queue decides, re-ranked on live validator errors as it moves.

**Accumulate, never block.** All judgment items (modal severities, ranges, normative
ambiguity, new gates) go to the sign-off sheet with verbatim evidence. The owner signs on
return; nothing waits on a signature.

**The only three stops:** severity/enforcement changes resting on interpretation ·
ratified-design changes · irreversibles outside the pre-authorised classes. **If one is
genuinely hit: log it, SKIP that item, continue with the next. Never idle on a stop.**

**Hygiene, every wave:** depth mandate in full (100 % in subagents) · three-line summaries
in-session, full reports to disk · honest reversals logged · **verify effects, never exit
codes** · ledger updated at every transition · campaign-skill playbooks applied explicitly
per standard · **one guideline at a time — never parallel standards** · maximum reasoning
effort throughout.

**At context end:** stop on a wave boundary, write a resume pointer, and leave a
one-paragraph absence summary — standards completed, fixed counts, workflow-metric movement,
sign-off sheet count.

# THE PROOF MANDATE (STANDING — owner's verbatim text, ratified 2026-07-27)

> "A standard's workflow metric is only claimable by EXECUTION, never by assessment. Per
> standard, before the wave closes: (1) extend/reuse the harness to drive every runnable
> worksheet chain through the REAL save path — values persist, derived fields compute,
> summaries aggregate — raw output per chain; (2) every live gate demonstrated BOTH ways
> where drivable: a state that passes it and a state that violates it (the F-4 lesson: gates
> that fire but never enforce are invisible to static reading); (3) blocked worksheets stated
> with the demonstrated blocker, not the suspected one — 'cannot run because X' must show X
> actually stopping the run; (4) after any fix wave: regression — the standard's previously-green
> chains re-driven, plus the #22-guard class for anything touching dual-role fields; (5) the wave
> report's workflow metric cites the harness run ID/raw output — 'runnable' means RAN.
> Retroactively: A-178's '14 of 19' gets its execution proof at the next touch of that standard;
> new standards get it in-wave."

**"Runnable" means RAN.** An assessed metric is a hypothesis. Until a chain has been driven
through the real save path, the honest word is *"expected to run"*, and it must be written that
way. **A-178's current 14/19 is therefore UNPROVEN** and is labelled so until its next touch.

# DEPLOYED-PRODUCT PROOF (STANDING — owner's verbatim text, ratified 2026-07-27)

> "The product is the wizard in a browser, not the database. Per standard, the proof mandate's
> execution runs against a DEPLOYED build: (1) maintain the campaign preview deployment — after
> any code-affecting fix wave, build + deploy the branch, re-point the stable campaign alias
> (one URL, from raw vercel output only), verify 200; (2) the harness proof runs against that
> deployment's real API (not a local shortcut), so 'runnable' means runnable ON A BUILD; (3) per
> standard at wave close: a RENDER SPOT-CHECK — fetch the standard's key worksheets from the
> deployed app and verify the fixed values/evidence actually appear in the served page (the
> Finding-E class: server-green, render-broken — catchable only by looking at what the app
> serves); (4) the wave report names the build ID + alias state alongside the harness run ID.
> Owner browser passes stay the FINAL sign-off per standard — queue a one-line 'ready for your
> 5-minute look: [alias], [standard], [what to check]' entry on the sign-off sheet when a
> standard reaches fully-treated."

**The campaign alias is NOT the owner's alias.** Alvaro works on the `-hannesoster-` URL and
has a standing directive never to be sent elsewhere. The campaign deployment therefore gets its
**own stable alias**, re-pointed freely by the campaign; `-hannesoster-` is re-pointed only on a
deliberate production cutover. A campaign deploy must never repoint the owner's working URL.

**Alias discipline.** The alias is set from **raw `vercel` output only** — never from a
remembered or reconstructed deployment URL. Verify 200 on the alias itself after re-pointing,
not on the deployment URL it now serves. Per the standing lesson: verify effects, never exit
codes — a deploy that returns success and an alias still pointing at the old build look
identical from the command line.

**First-run check.** The Vercel CLI has previously been absent in this environment and blocked a
deploy. Confirm the CLI and project link before promising a deployed proof; if it is missing,
that is a logged blocker and the standard's metric stays UNPROVEN — never downgrade silently to
a local run and call it deployed.

# BIDIRECTIONAL COVERAGE (STANDING — owner's order, ratified 2026-07-27)

Per standard the comparison runs **both ways**:

- **Encoding → source** (the direction already practised): does every encoded item match its
  printed page?
- **Source → encoding** (the direction that was missing): does every normative element the
  guideline *prints* exist in the encoding? Walk the standard's own table of contents and clause
  structure. Every section carrying normative content — requirements, equations, tables,
  procedures — either maps to worksheet content **or** is listed in the residue as
  not-encoded-with-reason.

**A standard is not READY-TO-USE if the guideline demands something the worksheets never ask.**
Coverage gaps are silent by construction: nothing in the encoding points at what is absent from
it, which is exactly why the sweep must start from the source's own structure and not from the
encoded rows.

# CORPUS-WIDE SCOPE (STANDING — confirmed 2026-07-27)

**The full treatment applies to EVERY owned standard in the ranked queue — all ~71 — not only
the ones already touched.** Full treatment = bidirectional page comparison · proof mandate ·
source-settled fixes applied · judgment items on the sheet · map write-back · validator green
for the classes checked.

**No standard is "done" by triage alone.** Wave-0 triage assigned tiers; it did not treat
anything. Every wave report carries a **convergence table** so the corpus-wide position is
visible every time:

| state | meaning |
|---|---|
| **fully treated** | all six full-treatment elements satisfied, with execution proof |
| **in progress** | audited and/or partly repaired, missing at least one element |
| **untouched** | triaged only |

Report the counts every wave, and never let partial work read as completion.

> "The reasoning map is updated in the SAME wave as every change it describes — a fix without
> its map write-back is incomplete work. Per fix: the affected node's frontmatter updates
> (provenance grade lifted where the fix earns it — e.g. quote-backfilled → VA;
> verification_method = re-executed; data_class corrected if it changed), a `fixed::` entry is
> appended to the node (date, defect class, commit/migration id, one-line what-changed), and
> findings previously attached to the node flip to resolved. Per wave: the standard's `_index`
> re-renders from live prod + the validator re-runs, so map-vs-reality drift stays at zero
> (drift is its own finding class, rule 3). New defect classes discovered mid-fix still become
> validator rules in the same wave and re-check the corpus — including the already-fixed nodes.
> The map is the single truthful mirror: anyone reading a node sees what the standard says,
> what the encoding does, what was broken, what fixed it, and when — without opening any other
> artifact."

**Operational note.** A provenance lift is earned by *evidence*, not by activity: a
quote-backfilled node reaches VA only because a PDF page now backs it. Never lift a grade
because a row was touched. A fix that did not change what is known leaves the grade alone.

# CONTENT BOUNDARY RULE (STANDING — owner's verbatim text, ratified 2026-07-27)

> "A worksheet's content universe is exactly its own guideline's printed pages — nothing
> more. (1) Methodology, equations, tables the guideline itself prints — including
> reproductions it prints from other standards ('Tab. X nach DIN Y' printed in full) — are
> the guideline's own encodable content, verified against ITS pages, provenance-noted as
> reproduction where applicable. (2) A bare reference to another document ('nach DWA-A 117')
> is encoded AS a reference only — displayed honestly, never expanded, never filled from
> memory, training knowledge, or plausibility. (3) Never extend a printed reproduction
> beyond what the guideline printed — leaving the page is inventing. (4) Missing referenced
> documents: in_library:false node, NR/VC cap, acquisition list entry, visible gap — never
> silently filled."

**Validator query:** any node whose source anchor points outside its own standard's document
without an explicit reference edge = violation. Implementation:
`scripts/reasoning-map/content-boundary-scan.mjs` (alias table required —
a standard's own variant designation is not a foreign one; `product_workflow` exempt).

Full schema entry + derived implementation notes:
`reasoning-maps/_schema/CONTENT-BOUNDARY-RULE.md`.

# UNVERIFIED PROVENANCE — the gravest incident class (STANDING, read first)

Ratified 2026-07-27. **The failure mode: a claim of completed work that no live command
can reproduce.** Fabricated output is byte-identical to real output — a pasted table of DB
rows, a PDF cover-page quote, a wave report, a decision batch. Nothing about the *text*
distinguishes them. Therefore:

**R-1 — Raw output must be RE-EXECUTABLE.** Any claim citing DB rows, files, page counts,
or deploys is valid only if THIS session can re-run the command and get the same result.
A pasted result is not evidence; the command is. Cite the command, not the output.

**R-2 — Session boundary.** Work claimed by another session, chat, or ledger is
**UNVERIFIED INPUT** — the same standing as an assertion pasted by a human. It is a lead to
check, never a foundation to build on. Re-execute against DB/disk in the acting session
before any downstream work depends on it. This binds the ledger and the triage table too.

**R-3 — The verification asymmetry.** Because fabricated and real output are
indistinguishable by inspection, **verification means RE-EXECUTION, never reading harder.**
"It looks right" is not a check. If you cannot re-run it, you have not verified it.

**R-4 — Join or invalid.** Every triage row, roster entry, and wave claim must join to a
live DB/disk query run in the acting session. Enforced by validator rule 9
(`9.triage-row-in-inventory`, `9.map-in-inventory`). Rows that do not join are INVALID.

**R-5 — Report the reversal.** If a claimed defect is not in the source, say so and STOP.
Never fabricate a finding, an incident, or a correction to match a premise — including a
premise supplied by the user, and including one about your own past behaviour. Writing a
false incident record is itself the incident class. (Doctrine's reverse-Trap-6, generalised.)

**Never-invent applies to locations.** If asked for a path/URL that does not exist, print
the failing search, not a plausible string. A fabricated location in a ledger is
indistinguishable from a real one until someone opens it.

## Incident record — A-117/A-118 phantom roster (2026-07-27)

A Wave-1 roster naming **DWA-A-117** and **DWA-A-118** entered the campaign from outside
verified ground. Live re-execution in the acting session found:
- `standards`: `a117_rows=0, a118_rows=0` (87 rows total = 71 real + 16 test/junk).
- `worksheet_templates` / CRs / equations / fields / project_standards /
  worksheet_instances matching A-117/A-118 as ENCODED entities: **0 rows.**
- Whole-`C:\` search, any extension: **no A-117 or A-118 file exists.**
- **Legitimate references DO exist and are correct** — `DWA-A-138-1.f_A`
  ("Reduction factor per DWA-A 117", §5.3.3.7), `DWA-A-226.CR-023` + `q_F`
  ("Hydraulische Bemessung nach DWA-A 118", §3.2), plus `doc-dwa-a-118.md` map nodes
  carrying `in_library: false` / `provenance: NR`. **References stay; encodings-of-nothing
  would die — there were none to delete.**

**Scope note, recorded for accuracy.** This session did not produce fabricated A-117/A-118
execution: it reported both as non-existent at every step and never ran a wave on them.
Whether the roster originated in a prior session's unverifiable report or elsewhere is
**outside this session's evidence**, and is recorded as unknown rather than guessed — per
R-5. The rules above stand regardless of origin, which is the point: they make origin
irrelevant, because nothing is trusted that cannot be re-run here.

# The continuous-improvement cycle (STANDING — the campaign's shape)

Binding for the regulatory audit→fix campaign. Governed by `docs/verification-doctrine.md` (SR-1..4)
and `docs/source-pdf-inventory.md`. Ratified by Alvaro 2026-07-27. **The corpus is a living system,
not a queue to drain.**

1. **Every new defect class becomes a validator rule IMMEDIATELY.** The moment any wave surfaces a
   new failure mode, it is encoded as a check in `scripts/reasoning-map/validate.mjs` — in the same
   wave, not deferred to a cleanup pass. The new rule is then **re-run against ALL previously swept
   standards, including DWA-A-138-1 and the FLL set.** A re-catch on an already-certified standard
   is a finding like any other and is worked like any other — seniority earns no exemption.
2. **The triage table is a LIVING artifact.** `wave0-TRIAGE-TABLE.md` is re-rendered after every
   wave from live validator output — never hand-patched, never allowed to go stale. A stale triage
   table is itself a defect.
3. **Tiers move DOWN as well as up.** A certified/harness-ready standard that fails a newly added
   rule **drops tier** and is fixed. Certification is a snapshot under the rules of its day, not a
   permanent grant. Demotions are reported as prominently as promotions.
4. **Periodic full-corpus validator re-runs are part of the cadence** — every few waves, not only
   when something looks wrong. Drift between snapshot and prod is its own finding class.
5. **Every wave report carries the two convergence metrics** (the dashboard):
   - **per-standard cost** — effort/tokens per standard swept. **Should fall** wave over wave as the
     patterns harden. A rise is a signal to fix the brief, not to push harder.
   - **re-catch rate on old standards** — how many previously-swept standards the new rules catch.
     **Should trend to zero.** If it does not fall across a few waves, the *generator* is emitting
     the defect, and the generator gets fixed before more standards are swept.

**Never block a wave on a missing source.** Cap the affected nodes per doctrine, list the standard as
source-absent, and keep moving. **Never fill a source gap from memory.**

# Importing standard workbooks (Pass3c)

## Where the workbooks come from
- Import-ready **Pass3c workbooks** (one structured `.xlsx` per standard) live in
  `C:\Users\Ekowai\Desktop\Supabase data\` (WSL: `/mnt/c/Users/Ekowai/Desktop/Supabase data/`).
  Filenames contain `Pass3c`; fixed/variant files may use `Pass3bc`, `Pass3b3c`, `_FIX`, `-Rev1`.
- Raw source guidelines (PDF/MD, **not** import-ready) live in `C:\Users\Ekowai\Desktop\Guidelines\`.
- `*_Berechnungshilfe.xlsx` are calculation helpers, **not** workbooks — skip them.
- When new or fixed workbooks appear in that folder, import the new/changed ones too. Re-imports
  are safe (idempotent UPSERT; `engineer_verified` is preserved).

## The pipeline
The app is fully DB-driven: once a standard is correctly in the tables it shows up in the picker
and renders with **no** code changes. Data only enters through the importer — never by hand-editing
tables. Each workbook has 7 sheets (Standards, Worksheets, Sections, Fields, Enum_Values, Equations,
Compliance_Requirements). The importer (`scripts/import-pass3c.ts` → `_pass3c-parsers` →
`_pass3c-validate` → `_pass3c-db`) parses → validates → writes transactionally (UPSERT) across 6
tables, with a 2-pass section hierarchy and `enum_values` as JSONB. After import a standard is in the
central library but not attached to any project — add it to a project in the app to create worksheet
instances; fields land as `imported_unverified` for an engineer to verify.

## Push — normal path (when you have DATABASE_URL)
```
pnpm tsx scripts/import-pass3c.ts "<path/Datei_Pass3c.xlsx>" --dry-run   # validate only, no write
pnpm tsx scripts/import-pass3c.ts "<path/Datei_Pass3c.xlsx>"             # real import
```
- Filename must contain `Pass3c` (use `--force-experimental` for `Pass3bc`/`Pass3b3c`).
- `DATABASE_URL` in `.env.local` must point at the right environment. **Prod = Supabase project
  `vadsmshzebefjreqcicl`.** Use the Transaction-Pooler connection string (importer sets `prepare:false`).

## Push — Supabase MCP path (no DATABASE_URL / over SSH)
The DB password isn't in the repo, so when you can't run the importer directly, push via the Supabase
**MCP server** (stdio, configured with a Personal Access Token at `--scope local` so the token stays in
`~/.claude.json`, not the committed `.mcp.json`). The MCP runs as role `postgres` (owns the tables →
bypasses RLS). Mechanics used:
1. Parse + validate locally with the real `parseWorkbook`/`validateWorkbook`. Note: `pnpm tsx` is broken
   in this WSL (esbuild win32 binary) — compile with `tsc` and run with `node` instead.
2. Generate one atomic PL/pgSQL `DO` block per workbook that embeds the parsed data as JSONB and mirrors
   `_pass3c-db.ts` exactly (UPSERT targets, 2-pass section parenting, `enum_values`, **never** overwrites
   `verification_status`).
3. Apply each block. The MCP `execute_sql` tool can't ferry ~100 KB payloads through the model, so POST
   each generated `.sql` to the Management API endpoint the MCP uses anyway —
   `POST https://api.supabase.com/v1/projects/<ref>/database/query` with the PAT — via a small
   `! bash` script (so the large payloads go file→API, not through the model).
4. Verify per standard with COUNT queries (worksheets/sections/fields/equations/compliance) against the
   parsed counts.
