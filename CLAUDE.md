@AGENTS.md

# Deploy workflow — staging-first

Default working branch is **`staging`**, not `main`. Do the work and deploy it on
`staging` first (push to `staging` → Vercel auto-deploy), then Nacho reviews it on Slack.
Promote to `main` (production) **only after Nacho's OK**. When Johannes says "deploy"
without qualification, deploy to `staging`. Never push to `main` unless he explicitly
says it's approved for production.
# Verification Doctrine (BINDING — read `docs/verification-doctrine.md` in full)

All regulation-encoding, harness, and verification work follows the doctrine in
**`docs/verification-doctrine.md`**. It is codified as a file so no session or subagent depends on
chat memory. **Every subagent brief must paste that doctrine VERBATIM, never summarized.** Core:

- **SR-1** — a value is applied only if quoted **verbatim from the standard's own text/table this
  session**; logs/prior-chats/bring-up numbers are never sources; a proven computation ≠ a proven
  input; the orchestrator rejects source-less fixes.
- **SR-2** — ranges are surfaced as explicit engineer selections, never auto-picked.
- **SR-3** — the rendered PDF is ground truth (**PDF > markdown > encoding > ledger > chat**); a VA
  claim without a PDF-page ref is invalid.
- **SR-4** — schema/infrastructure changes needed to fulfill an **approved mandate are
  AUTO-APPROVED**: pick the option consistent with production reality + the mandate, log the decision
  + rationale in the ledger, proceed. Never stop to ask for this class. The ONLY stop-conditions
  remain: prod applies OUTSIDE an approved mandate, changes to ratified designs, irreversibles.
- **data_class** on every value node: `standard_fixed` (PDF-page required) / `standard_range`
  (SR-2 selection) / `engineer_input` / `derived` (trace required), with the #22 and F-7 validator rules.
- **Process** — raw output for every claim; sequential subagent-per-task with orchestrator
  verification; findings over fixes (staged written-not-applied, batched per standard); no prod
  hand-edits (Management-API path, secrets never printed); honest residue is a deliverable.
- **Source PDFs + reader pipeline** (scoop `pdftotext -layout` via PowerShell; WSL is blind to the
  FLL PDF folder) and **prod ref `vadsmshzebefjreqcicl`** are recorded in the doctrine doc.

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
