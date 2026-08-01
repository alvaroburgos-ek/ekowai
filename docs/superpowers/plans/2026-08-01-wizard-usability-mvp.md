# Wizard Usability MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, this session). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Wizard usable as EKOWAI's working tool: honest gates (F-4 fix), computable formulas (ln/log10/sqrt/exp/abs), SR-1 verification with verbatim quotes + finalize blocking, explainable gates, and deliverable emission (dossier upgrade, Konformitätserklärung, Wertetabelle).

**Architecture:** Engine fixes in `src/lib/eval/arithmetic.ts` + `src/lib/compliance/evaluate.ts` (parse-time routing, no eval-time forks). New pure module `src/lib/compliance/explain.ts` reuses the evaluator's AST. Verification extends existing `verification.ts` actions + `fields/equations` columns. Documents build on the existing `@react-pdf` per-standard report stack.

**Tech Stack:** Next.js 15 App Router, Drizzle/Supabase, vitest 4 (`pnpm vitest run --project unit <paths>`), @react-pdf/renderer.

## Global Constraints

- Owner-approved 2026-08-01: full scope A–E; Stage-1 blocking at **finalize only**.
- `==`/`!=`/`<>` with bare-ident RHS KEEP legacy string semantics (enum gates) — regression-tested.
- `SUM` NOT added. No changes to `evaluateFormula` downgrade regexes' semantics.
- DB changes additive only; staged SQL in `sql/`; prod apply at deploy via Management-API path.
- Commits as `Alvaro <alvaro.burgos@ekowai.com>`. German UI copy matches existing style (hardcoded de where neighbors do).
- Every task: failing test first → minimal impl → targeted vitest green → commit.

---

### Task A: F-4 var-vs-var relational gates → acompare routing

**Files:** Modify `src/lib/compliance/evaluate.ts` (~L244-246 comparison builder). Test `src/lib/compliance/evaluate.arith.test.ts` (extend).

- [ ] A1 failing tests: `V_s >= V_S_min` with {V_s:20, V_S_min:15} → pass; {V_s:10, V_S_min:15} → fail; V_S_min missing → pending listing `V_S_min`; regression `status == some_enum` unchanged (string eq); `x != other_sym` unchanged; literal-RHS `V_s >= 15` unchanged.
- [ ] A2 impl: in `parseComparison`'s compare construction, when op ∈ {`>`,`<`,`>=`,`<=`} and RHS is `aref`, emit the `acompare` node (same shape as existing arithmetic-compare branch) instead of legacy `compare`.
- [ ] A3 run `pnpm vitest run --project unit src/lib/compliance` green; full eval dir green.
- [ ] A4 commit `fix(compliance): F-4 — relational var-vs-var gates resolve RHS identifier (acompare routing); enum ==/!= semantics preserved`.

### Task B: math functions ln/log10/sqrt/exp/abs

**Files:** Modify `src/lib/eval/arithmetic.ts` (SUPPORTED_FUNCTIONS L28, token type L33, tokenizer L75-83, `parsePrimary` L176-195 → arity table). Test `src/lib/eval/arithmetic.test.ts` (extend).

**Interfaces produces:** `evalExpression('ln(x)', {x})` etc.; 1-arg parse `fn(expr)`; existing 2-arg min/max untouched.

- [ ] B1 failing tests: `ln(e)`≈1 via `exp(1)`; `log10(100)`=2; `sqrt(9)`=3; `abs(0-5)`=5; `exp(0)`=1; `ln(0)` throws non-finite; `foo(3)` still throws unsupported; `min(2,3)` regression; DIN-18130-1 Gl.9 shape `(a*L/(A*t))*ln(h1/h2)` computes.
- [ ] B2 impl: `ONE_ARG_FUNCTIONS` map name→fn {ln:Math.log, log10:Math.log10, sqrt:Math.sqrt, exp:Math.exp, abs:Math.abs}; `TWO_ARG` {min,max}; tokenizer accepts any of them; parsePrimary dispatches on arity.
- [ ] B3 also verify `evaluateFormula` path: a formula using `ln` with missing input → manual_required (not error) — add one test in `src/lib/eval/formula.test.ts`.
- [ ] B4 run eval suite green; commit `feat(engine): 1-arg math functions ln/log10/sqrt/exp/abs (closes DIN-18130-1 Gl.9 / Bild-4 class engine gap)`.

### Task C: verification quotes + states + finalize gate

**Files:** Modify `src/lib/db/schema.ts` (fields + equations: add `verificationQuote` text). Create `sql/20260801170000_verification_quote.sql` (+rollback file). Modify `src/lib/actions/verification.ts` (quote param; require for `verified_against_standard`; allow `disputed`/`corrected` statuses), `src/components/worksheet/verify-button.tsx` + `dynamic-field.tsx` label map (add disputed/corrected), `src/lib/actions/worksheet-transition.ts` (finalize gate), new `src/lib/actions/finalize-gate.ts` (pure query+check, mirrors approval-gate style). Tests: `src/lib/actions/__tests__/finalize-gate.test.ts`, extend `verification` tests if present.

**Interfaces produces:** `checkFinalizeGate(instanceId) → { ok, unverifiedFields: {symbol, labelDe, status}[] }`; VERIFIED_OK = `['engineer_verified','verified_against_standard','corrected']` exported from `finalize-gate.ts` (reused by PDF task E).

- [ ] C1 SQL migration (additive): `alter table fields add column if not exists verification_quote text; alter table equations add column if not exists verification_quote text;` + rollback drops. schema.ts columns.
- [ ] C2 failing tests for `checkFinalizeGate`: instance whose used/required fields all verified → ok; one `imported_unverified` field WITH a value → not ok, listed; unverified field with NO value and not required → ignored; `corrected` counts as verified.
- [ ] C3 impl `finalize-gate.ts`; wire into `transitionWorksheet` action `finalize` before status CAS, refusal message lists symbols (German, mirrors approval-gate copy style).
- [ ] C4 `verifyField`/`verifyEquation`: optional `quote`; server-reject `verified_against_standard` without quote; persist `verificationQuote`; statuses `disputed`/`corrected` accepted with note required for `disputed`.
- [ ] C5 UI: VerifyButton quote textarea (optional, hint "Verbatim-Zitat aus der Norm (SR-1)"); dynamic-field label map + chip colors for `disputed` (red) / `corrected` (green).
- [ ] C6 run suites green; commit in two steps (`feat(verification): verbatim quote + disputed/corrected states`, `feat(worksheet): finalize blocked on unverified used fields`).

### Task D: explainable gates

**Files:** Create `src/lib/compliance/explain.ts` + `src/lib/compliance/__tests__/explain.test.ts`. Modify `src/lib/compliance/evaluate.ts` (export parser entry + node types), `src/components/worksheet/compliance-block.tsx` (expandable "Warum?" details on fail/pending).

**Interfaces produces:** `explainCondition(condition: string, lookup: (s:string)=>Value|undefined): GateExplanation` where `GateExplanation = { kind:'manual'|'explained', leaves: ExplainLeaf[] }`, `ExplainLeaf = { text: string; satisfied: boolean|null; actual?: string; required?: string; wouldPass?: string }`. Task E consumes `GateExplanation`.

- [ ] D1 failing tests: failed `V_s >= V_S_min` leaf → actual "V_s = 10", required ">= 15 (V_S_min)", wouldPass string; pass leaf satisfied true; missing symbol leaf satisfied null with "fehlt"; `IF a THEN b` guard-false → vacuous leaf text; AND of two leaves both reported; unparseable → kind manual.
- [ ] D2 impl: export `parseCondition` (AST) from evaluate.ts (rename-free, additive export); explain.ts walks AST mirroring evalNode leaf handling (reuse `toNumber`/`compare` via exports, no logic duplication).
- [ ] D3 UI: in compliance-block, for fail/pending rows render `<details>`-style block listing leaves (actual · required · wouldPass), reusing existing tailwind idiom of the file.
- [ ] D4 suites green; commit `feat(compliance): explainable gates — actual value, threshold, what-would-pass`.

### Task E: deliverable emission

**Files:** Create `src/lib/pdf/load-conformity.ts`, `src/components/pdf/conformity-document.tsx`, route `src/app/api/projects/[id]/standards/[standardCode]/conformity/route.ts`; create `src/lib/pdf/load-valuetable.ts`, `src/components/pdf/valuetable-document.tsx`, route `.../valuetable/route.ts`. Modify `src/lib/pdf/assemble-standard-report.ts` / `standard-report-document.tsx` (snapshot ID header, unverified-fields section, gate explanations), `src/components/worksheet/worksheet-list-sidebar.tsx` + reports tab (buttons). Tests: `src/lib/pdf/__tests__/load-conformity.test.ts`, `load-valuetable.test.ts` (pure builders; DB mocked per existing pdf test idiom).

**Interfaces consumes:** `checkFinalizeGate`/`VERIFIED_OK` (C), `explainCondition` (D), existing `loadStandardReport`, `calculation_snapshots` latest `trigger='approve'` row.

- [ ] E1 failing tests `buildConformityData`: all worksheets approved/final + all block gates pass → `eligible:true`, snapshot id present, standard `version`+`issuedYear` present; one draft worksheet → `eligible:false` with blocking list; failing block gate → not konform, gate listed.
- [ ] E2 impl loaders (SELECT via existing drizzle queries); PDF docs follow `standard-report-document.tsx` structure (letterhead, footer, styles reuse). Conformity: 409 JSON when ineligible. Valuetable: symbol/label/value/unit/clause rows + snapshot id footer.
- [ ] E3 dossier upgrade: snapshot id + takenAt in header; "Unverifizierte Felder" section when list non-empty; explanations under failed/warn gates.
- [ ] E4 sidebar/reports-tab buttons (Konformitätserklärung, Wertetabelle) next to existing report button.
- [ ] E5 suites green; commits `feat(pdf): Konformitätserklärung (standard+edition, snapshot-bound)`, `feat(pdf): Wertetabelle + dossier verification/explanation sections`.

### Task F: full regression + wrap

- [ ] F1 `pnpm test` (full unit project) green; fix fallout.
- [ ] F2 `pnpm lint` + `tsc --noEmit` (or repo's typecheck script) green.
- [ ] F3 Update `_WIZARD-ROADMAP-TRACKER.md` (session log + stage boxes now satisfiable), memory update, final summary with deploy steps (migration apply + vercel).
