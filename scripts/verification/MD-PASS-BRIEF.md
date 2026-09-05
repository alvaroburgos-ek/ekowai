# md-verification pass — subagent brief (read completely before doing anything)

You verify ONE standard's encoded fields against the guideline's own markdown transcript and write an
SQL pack. You do NOT apply anything to prod. You do NOT use subagents. You work in
`C:\Users\Ekowai\projects\ekowai-wizard` (Windows paths; Bash tool with `/c/...` paths works for files).

## 0. Owner rulings that govern this pass (2026-09-05, Alvaro)
1. **Markdown is the verification source.** "each pdf has an md version so use that instead so we reduce
   the tokens and the md version is actually from each guideline" and "only when there is no markdown u can
   use the pdf". So: quote from the md file you are given. Grade every quote **[VC]** (SR-3 below still
   defines VA as PDF-confirmed; we are deliberately working at VC).
2. App-metadata fields (client name/address, project id/name, planning date, phase-gate roll-ups, overall
   verdict, workflow flags the guideline never defines) get `verification_status='inferred_from_worksheet'`
   (exempt class, ruled 2026-08-01 for A138) — never a fabricated quote.
3. Anything that changes structure, enforcement or required-ness (phantom-field deactivation, clause
   retags, `is_required` changes, gate re-homes, severity changes, enum edits) goes into a **STAGED file as
   commented SQL with a ☐ RATIFIED marker**, never into the pack.

## 1. Doctrine (verbatim, binding)

# Verification Doctrine (BINDING — paste VERBATIM into every subagent brief, never summarize)

This is the canonical doctrine for all regulation-encoding, harness, and verification work in this
repo. It exists as a FILE so no session or subagent depends on chat memory. Author: Alvaro
(leadership@ekowai.com), codified 2026-07-24.

## Standing Rules

**SR-1 — Verbatim source before apply.** A numeric/data correction is NOT ready to apply unless its
target value is quoted **verbatim from the standard's own text or table, in the same session it is
applied**. Internal logs, prior conversations, bring-up "expected" values, and another engineer's
recollection are NEVER sources. A **proven computation is not a proven input** — a harness that shows
`IF C=x THEN out=y` proves the math, not that x is correct. If a standard defers to another (e.g.
FLL-GAR → DIN 1986-100), the referenced standard becomes the governing table: quote ITS row. If no
verbatim source reads the target value → STOP, surface the discrepancy, do not apply. The
**orchestrator** enforces this and rejects a source-less fix before it reaches the user.

**SR-2 — Range → never auto-pick.** Where the standard gives a range, the system never silently
selects a point value. It either uses an already-source-verified in-range value, or surfaces the
range to the engineer as an explicit selection field. The machine enforces what the standard SAYS;
where the standard leaves a choice, the choice is visible and human.

**SR-3 — Rendered PDF is ground truth.** Authority order is **PDF > markdown > encoding > ledger >
chat**. Every source verification reads the RENDERED PDF; markdown/JSON extractions are searchable
convenience only. **A VA (verified-authoritative) claim without a PDF-page reference is invalid.**
PDF-confirmed = VA; markdown-only = VC; a PDF-vs-markdown disagreement is itself a finding (PDF wins).

**SR-4 — Infra for a mandate is auto-approved.** Schema/infrastructure changes needed to fulfill an
APPROVED mandate are auto-approved: pick the option consistent with production reality + the mandate,
log the decision + rationale in the ledger, and proceed — never stop to ask for this class (e.g. when
a brief's premise doesn't match reality, take the reality-consistent path and continue). The ONLY
stop-conditions are: prod applies OUTSIDE an approved mandate, changes to ratified designs, and
irreversibles.

## Provenance grades
- **EV** — encoded/exists in the DB, unverified against source.
- **VC** — verified against a convenience extraction (markdown/JSON) only; PDF page not confirmed.
- **VA** — verified against the authoritative rendered PDF; **requires a PDF-page ref** + date + build.
- **NR** — not reachable: depends on a document not in the library; caps at NR/VC, visibly.

## data_class (every table/value/field node carries one)
- **standard_fixed** — printed in the guideline, immutable. **PDF-page ref REQUIRED.**
- **standard_range** — bounds fixed by the standard; the point selection is an explicit engineer
  choice (SR-2).
- **engineer_input** — project data the standard never states.
- **derived** — engine-computed only; a compute trace is required.

Equation nodes' `requires::` edges inherit the class of each input, so every calculation chain is
classifiable end-to-end from printed page to computed result. **Validator rules:** standard_fixed
without a PDF page ref = invalid; standard_fixed that is UI-editable = finding; derived that is
hand-enterable = finding (the #22 class); a value inside a standard_range with no selection record =
finding (the F-7 class). Classification happens at map-generation from the PDF + encoding; ambiguous
cases (normative binding table vs. exemplary Anhang worked example, modal verbs) go to Alvaro's
decision batch — never guessed.

## Process
- **Raw output for claims.** Every "it passes / it persists / it fires" claim is backed by pasted raw
  command output (vitest result, SQL read-back, git log), not a summary.
- **Sequential subagent-per-task with orchestrator verification.** One subagent per task; the
  orchestrator independently verifies each result (revert-verify / DB read-back / by-file tsc) BEFORE
  the next launches. All on the session model — no speed-downgrades. Wall-clock is not a metric.
- **Subagent briefs carry this doctrine VERBATIM**, never summarized.
- **Findings over fixes.** Catalogue everything; fix only what is unambiguous under the doctrine
  (PDF-attested). Anything needing a ruling or a range-selection is staged written-not-applied and
  batched to Alvaro per standard at milestone ends — never auto-decided, never skipped, never an
  interruption mid-run.
- **No prod hand-edits.** Data enters via the importer or a gated migration. Prod writes go through
  the Management-API POST path (read-only Supabase MCP for verify); secret VALUES are never printed.
- **Honest residue is a deliverable**, not a footnote — named per item with why.

## Source documents (recorded paths)
- **FLL PDFs:** `C:\Users\Ekowai\Desktop\FLL Guidelines PDF\` — GAR 2023
  (`fll_gewaesserabdichtungsrichtlinien_2023__2 (2).pdf`), TP-Rhizomfestigkeit 2023
  (`fll_tp_rhizomfestigkeit_gewaesserabdichtung_2023 (1).pdf`), Naturteich 2017
  (`guidelines_for_the_planning_construction_and_maintenance_of_private_natural_swimming_pools_2017_p (1).pdf`).
- **DWA-A-138-1 PDF:** `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).pdf`
  (markdown/xlsx siblings in the same folder).

## PDF reader pipeline (Ekowai-PC-01)
WSL `/mnt/c` is BLIND to `C:\Users\Ekowai\Desktop\FLL Guidelines PDF` — use Windows paths, not the
Bash tool. The Read tool's `pdftoppm` is rejected (scoop shim = "unsafe location"). Working path =
call scoop poppler directly via PowerShell:
`& "C:\Users\Ekowai\scoop\shims\pdftotext.exe" -layout "<pdf>" "<out.txt>"` then Select-String / read
the text. For a specific page range add `-f <first> -l <last>`.

## Prod
Prod = Supabase project `vadsmshzebefjreqcicl`. Read-only via Supabase MCP `execute_sql`. Writes via
the Management-API POST helper (`scripts/phase4/_mgmt-apply.mjs` pattern, `$SUPABASE_ACCESS_TOKEN`
from env, never printed). `audit_status` / `verification_status` untouched by fixes.

(End of doctrine.)

## 2. Your inputs (the orchestrator gives you the concrete values)
- `CODE` — the standard code in prod (e.g. `FLL-GAR-2023`).
- `MD` — the markdown transcript path. Read it COMPLETELY (use the Read tool in chunks of ≤1500 lines;
  it may be 3,000–8,000 lines). Printed page numbers usually appear as standalone number lines; cite them
  as "printed p.N". If the md has no page markers, cite the clause only and say so in the note.
- `JSON` — export produced by `node scripts/verification/export-fields.mjs <CODE> <JSON>` (run it
  yourself if the file is missing). It contains `standard`, `worksheets`, `fields` (with `id`, `ws`,
  `symbol`, `label_de`, `data_type`, `unit`, `is_required`, `enum_values`, `clause_reference`,
  `description`, `verification_status`, `verification_quote`, `source_quote`), `equations`, `gates`.

## 3. What to produce (files in `scripts/verification/`)
1. `<slug>-md-verification-pack.sql` — one `update public.fields …` per field whose
   `verification_status` is NOT in ('verified_against_standard','corrected'):
   ```
   -- <symbol>
   update public.fields set verification_status='verified_against_standard', verification_quote='<VERBATIM md sentence(s)> — printed p.N', verification_note='md-verified 2026-09-05 (§x.y, printed p.N) [VC]', verified_at=now() where id='<uuid>' and verification_status not in ('verified_against_standard','corrected');
   ```
   - Quote verbatim from the md (join line breaks; use `[...]` for an omitted run inside ONE clause; join
     two clauses with ` | `). Escape single quotes as `''`. Keep each quote ≤ ~700 characters.
   - The quote must be the sentence/table row that DEFINES or CONSTRAINS the field (the limit, the range,
     the list, the obligation). Table rows: quote the row incl. the table title.
   - If the md cannot support the field → do NOT invent. Put it in the residue list (section 4) with the
     reason (e.g. "no clause in source", "value comes from another standard (NR)", "enum granularity is
     EKOWAI's"). If the field is only partly supported, verify it and add the caveat in `verification_note`.
   - App-metadata fields: one grouped statement setting `verification_status='inferred_from_worksheet'`,
     `verification_note='md-pass 2026-09-05: app/project metadata — the guideline does not define this field; exempt per the 2026-08-01 metadata ruling'`.
   - Equations whose `verification_status` ≠ 'verified_against_standard': `update public.equations set verification_status='verified_against_standard', verification_quote='…', verification_note='md-verified 2026-09-05 (§, p) [VC]', verified_at=now() where id='<uuid>' and verification_status <> 'verified_against_standard';` — quote the printed formula/worked example. If the md has no formula for it → residue, and say so.
   - Header comment block: source md path, page-number convention, counts (examined / quoted / exempt /
     residue / equations), rollback file name.
2. `rollback-<slug>-md-verification-pack.sql` — reverts rows whose `verification_note like 'md-verified 2026-09-05%'`
   or `'md-pass 2026-09-05%'` for THIS standard only (join through worksheet_templates → standards.code).
3. `<slug>-STAGED-rulings.sql` — commented SQL with ☐ RATIFIED markers for: phantom fields (enum-value
   tokens materialised as fields: symbol has no label/clause/description and is never referenced by an
   equation or gate → propose `active=false`), clause_reference retags (with evidence), unit corrections,
   `is_required` review (fields the source makes "should/recommended/for example" or app-only → propose
   false), gate re-homes (gate on worksheet A reading only fields of worksheet B), severity notes (block
   gates anchored on "should/sollte/kann/empfohlen" text → note block→warn). Each block carries its
   evidence quote and the rollback inverse.
4. Dry-run: `node scripts/verification/apply-pack.mjs scripts/verification/<slug>-md-verification-pack.sql --dry-run`
   — paste the raw output in your report. Every statement must report rows=1 (grouped statements =
   the number of ids). A `rows=0` line means a guard mismatch: fix it.
5. Append one line to `scripts/verification/md-packs.order.txt`: `<slug>-md-verification-pack.sql  <CODE>`.

## 4. Report back (this is what the orchestrator reads — keep it factual)
- Counts: fields total / already verified / quoted now / exempt now / residue (with each residue field:
  `ws.symbol — reason`).
- Equations: quoted now / residue.
- Dry-run raw output (verbatim).
- Findings (≤ 12 lines): source-vs-encoding disagreements you saw (wrong limit, wrong unit, wrong
  clause, gate that over/under-enforces, duplicate fields, missing gate for a printed hard limit).
- STAGED file: one line per block.
- Anything the md lacked (no page markers, tables garbled, missing appendix) — name it.

## 5. Rules of conduct
- One standard only. Do not touch other standards' rows. Do not apply anything. Do not commit.
- Never print secrets (.env values). The runner scripts read them internally.
- If `export-fields.mjs` or the dry-run fails, report the raw error; do not work around it.
