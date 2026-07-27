@AGENTS.md

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
