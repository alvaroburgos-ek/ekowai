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
