# Wizard Usability MVP — design

Date: 2026-08-01 · Owner-approved scope: **full A–E**, Stage-1 blocking rule at **finalize only**.
Branch `feat/wizard-usability-mvp` (worktree `_wt-usability`). Ledger: model claude-fable-5 · CLI 2.1.218 · effort high.

Goal (per `reasoning-maps/_WIZARD-ROADMAP-TRACKER.md`): make the Wizard usable as EKOWAI's
working tool — Stage 1 (verification), Stage 3 (explainable gates), Stage 4 (deliverable
emission) plus the two engine gaps the audit campaign proved (F-4 gate bug, missing math
functions). Stage 2 (Blumen Forschel end-to-end run) is a usage activity after this ships.

## A. Engine — F-4 var-vs-var relational gates (`src/lib/compliance/evaluate.ts`)

Today `parseComparison` routes `ident OP simple-operand` into the legacy `compare` node and
`operandToLiteral` (L358-367) stringifies a bare-ident RHS (`aref → its symbol name`), so
`V_s >= V_S_min` compares against the string `"V_S_min"` → numeric ops always `false`.

**Fix (parse-time routing):** in the comparison builder (L244-246), when the operator is
relational (`>` `<` `>=` `<=`) and the RHS is an `aref`, build an `acompare` node (the existing
arithmetic-compare path, which resolves both sides through `lookup`) instead of the legacy
`compare`. `==`/`!=`/`<>` with a bare-ident RHS KEEP the legacy string-literal semantics —
that is how enum gates (`status == some_enum_value`) work and must not change.

Effect: relational var-vs-var block/warn gates evaluate honestly (pass when compliant, fail
when violated, pending when a side is missing). Enforcement change — owner-approved 2026-08-01.

## B. Engine — math functions (`src/lib/eval/arithmetic.ts`)

Add 1-arg functions `ln`, `log10`, `sqrt`, `exp`, `abs` alongside 2-arg `min`/`max`:
extend `SUPPORTED_FUNCTIONS` + token type, tokenizer whitelist branch, and `parsePrimary`
with an arity table (1-arg vs 2-arg). Domain errors fail loud (`ln(x)` with `x <= 0` →
non-finite → existing L216 guard). `SUM`/aggregation stays OUT (needs an index/rows design —
ruling on the sheet). `evaluateFormula`'s manual_required downgrade regexes unchanged.

## C. Stage 1 — verification workflow completion

Already exists: `fields.verification_status` (+ verifier/at/note), `verifyField`/`verifyEquation`
actions gated by platform-engineer, verify UI chips. Missing per the tracker:

1. **Verbatim quote (SR-1):** new nullable text column `verification_quote` on `fields` and
   `equations` (schema.ts + staged SQL migration `sql/20260801*_verification_quote.sql`,
   additive, applied to prod at deploy). `verifyField`/`verifyEquation` accept a `quote`
   param; `verified_against_standard` REQUIRES a non-empty quote (server-enforced);
   `engineer_verified` accepts one optionally. VerifyButton gets a quote textarea.
2. **States:** allow `disputed` and `corrected` in the status set + label maps + transitions
   (`imported_unverified → engineer_verified/verified_against_standard → disputed → corrected`).
   No DB change needed (text column).
3. **Blocking rule (finalize only):** in `transitionWorksheet`, action `finalize`: load the
   worksheet's OWN template fields that carry a value in `project_parameters` or are
   `is_required`; if any has `verification_status` NOT IN (`engineer_verified`,
   `verified_against_standard`, `corrected`) → refuse with the named field list (same shape
   as the approval gate). Approve/submit unchanged (owner decision).
4. Report surfaces the same list (see E).

## D. Stage 3 — explainable gates

New pure module `src/lib/compliance/explain.ts`: `explainCondition(conditionText, lookup, opts)`
returns per-leaf details `{ kind: 'compare'|'acompare'|'exists'|'membership'|'truthy'|'guard',
symbol(s), actual, op, required, satisfied, wouldPass?: string }` by walking the same AST the
evaluator uses (export the parser/AST from evaluate.ts; no logic fork). `wouldPass` is
generated for failed numeric leaves: "<symbol> = <actual> <unit?> — erforderlich <op> <required>"
(de/en). Guard leaves report vacuous-pass vs active branch.

Rendering: `compliance-block.tsx` — on fail/pending, an expandable "Warum?" row under the gate
showing per-leaf actual/required and the wouldPass line; clause chip stays. The same payload is
consumed by the PDF compliance section (E) so screen and dossier explain identically.

## E. Stage 4 — deliverable emission (on the existing `@react-pdf` stack)

1. **Berechnungsdossier upgrade** (per-standard report `build-standard-report.tsx`): add
   (a) snapshot ID + takenAt of the latest approve-snapshot on the header/footer,
   (b) an "Unverifizierte Felder" section (the C.3 list) when non-empty,
   (c) gate explanations (D) for failed/warn gates.
2. **NEW Konformitätserklärung**: route `/api/projects/[id]/standards/[standardCode]/conformity`
   → one-page PDF: project, standard `code + titleDe + version + issuedYear`, worksheet list w/
   status, block-gate summary (all pass = konform / list of failures), snapshot ID, date +
   signature block. Only emittable when every worksheet of that standard is `engineer_approved`
   or `final` — otherwise 409 with the blocking list.
3. **NEW Wertetabelle**: route `.../valuetable` → compact PDF table (symbol · label · value ·
   unit · source clause) of the standard's key values (equation outputs + required fields with
   values), snapshot ID in the footer for the CAD title block.
4. Buttons on the standard's worksheet sidebar / reports tab. Behörden-Checkliste + Prüf-Memo:
   deferred (follow-up).

## Non-goals

Stage 5 edition lifecycle (`superseded_by`), Stage 6 golden tests, SUM aggregation, priority-
queue UI (the tracker's use-order rule is process, served by the blocking rule), prod
ratification-sheet items (block-mishome re-homes etc. — stay on the sheet).

## Testing

TDD per area: unit tests for A (var-vs-var pass/fail/pending + enum `==` regression),
B (each fn + domain errors + Gl.9 shape), C (transition-finalize gate incl. allow-list
statuses; verify actions quote requirement), D (explain leaves incl. guard/missing), E
(pure builders: conformity eligibility, valuetable rows; PDF sections render without throw).
Regression: full `pnpm test` unit project green before merge.

## Rollout

Additive SQL migration applied to prod via the Management-API path at deploy; manual
`vercel --prod` + campaign alias re-point per deploy memory; owner browser pass queued.
