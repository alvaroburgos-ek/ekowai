# VSME gate repair and source verifiability (SP-1)

- **Status:** proposed — awaiting Alvaro's approval
- **Date:** 2026-07-27
- **Branch:** `feat/vsme-gate-repair`
- **Worktree:** `C:\Users\Ekowai\_wt-vsme-gates`
- **Supersedes nothing.** Extends `2026-06-25-vsme-reporting-design.md` (design-locked, approved 2026-06-25).
- **Executes:** `dp-vsme-01`, `dp-vsme-02`, `dp-vsme-03` from the reasoning-map ratification batch.

## 1. Problem

VSME shipped to prod on 2026-06-26 and encodes the complete EFRAG standard — 40 worksheets,
143 fields, 10 equations, 31 compliance requirements, 281 emission factors. The encoding is
broad. Its *enforcement* is not.

Three defects, all found independently by the reasoning-map pass (`reasoning-maps/VSME/_index.md`,
tier **FIX-FIRST**) and by reading the code:

1. **23 of 31 compliance gates cannot fire; 9 of those are `severity='block'`.**
   Every requirement is hosted on `VSME-B01.000`. The gate evaluator is worksheet-local, so a
   requirement gating a symbol owned by another worksheet never sees a value. The standard's
   mandatory disclosures do not enforce.
2. **15 derived values are hand-enterable**, and the four B03.300 GHG-intensity fields have no
   equation at all despite para 31 defining them.
3. **`source_quote` is NULL on all 184 rows** (143 fields, 10 equations, 31 requirements) and every
   field is `imported_unverified`, so nothing can be engineer-verified.

## 2. Evidence

Prod (`vadsmshzebefjreqcicl`), read-only query, 2026-07-27:

| Check | Value |
|---|---|
| VSME projects | 1 |
| Worksheet instances | 40, **all `draft`** |
| Parameter values entered | 1 |
| CO₂ activity lines | 0 |
| CR hosting | 31 on `VSME-B01.000`, 9 `block` |
| Emission factors | 281 |
| Fields | 143, all `imported_unverified` |

**Blast radius is zero.** No worksheet has been approved, so making gates enforce cannot
invalidate prior work. This is the cheapest possible moment to fix enforcement.

Incidentally resolved: the `≈414 rows` comment at
`src/lib/db/queries/emission-factors-catalog.ts:24` is stale. Prod holds 281.

**Count discrepancy, recorded not resolved.** `reasoning-maps/VSME/_index.md` states `fields x154`
(captured 2026-07-24). Today's unfiltered prod count is **143**, which matches
`docs/superpowers/vsme-audit-remediation.md`. This spec uses 143. The map's 154 is treated as
suspect and is not relied on anywhere here; reconciling it is a finding for Alvaro, not a
prerequisite for this work. If the backfill encounters more than 143 field rows, that is a signal
to stop and reconcile rather than proceed.

## 3. Scope

**In scope (SP-1):** gate re-hosting, derived-field lock, the missing intensity equations,
VSME norm-text ingest, verbatim `source_quote` backfill, and the tests that prove each.

**Out of scope:** the guided delivery workflow (SP-2, its own spec); the EFRAG Digital Template
export (SP-3); the method/legal citation layer (SP-4). Also out: flipping
`verification_status` to `engineer_verified` — that is Alvaro's sign-off, not this work's.

## 4. Design

### 4.1 Gate re-hosting

The root cause is standard-agnostic and belongs in the shared importer, not in a VSME patch.

`scripts/_pass3c-db.ts:557-563` resolves a requirement's host worksheet by phase:

```ts
const firstPhase1 = parsed.worksheets.find((w) => w.phase === 1) ?? parsed.worksheets[0];
const matchingByPhase = cr.phase != null
  ? parsed.worksheets.find((w) => w.phase === cr.phase)
  : undefined;
const targetWorksheet = matchingByPhase ?? firstPhase1;
```

`find` returns the first array match — array order, not ownership. Every VSME worksheet is
phase 1, so all 31 requirements collapse onto `VSME-B01.000`.

Compliance is the only row type missing an ownership column: `EquationRow` carries
`used_in_worksheet`, `FieldRow` carries `origin_worksheet`, `ComplianceRow`
(`scripts/_pass3c-types.ts:85-99`) carries neither.

**Change — four edits, backward compatible.** Absent `worksheet_code` reproduces today's
behaviour exactly, so no other standard moves.

1. `_pass3c-types.ts` — add `worksheet_code: string | null` to `ComplianceRow`.
2. `_pass3c-parsers.ts:223` — read it in `parseComplianceRequirements`. Header sentinels
   (`:249`) are unchanged.
3. `_pass3c-db.ts:560` — resolve `explicit ?? matchingByPhase ?? firstPhase1`.
4. `_pass3c-validate.ts:141` — **error** when `worksheet_code` is set but matches no worksheet,
   mirroring the existing equation `used_in_worksheet` check. A typo must fail the import, not
   silently fall back to `VSME-B01.000` — that silent fallback is how this bug shipped.

Then VSME emits it: `scripts/vsme/requirements.ts` already carries a `module` tag on `Req`
(`:66-69`) marked "documentation only", which yields the owning worksheet mechanically.
`build-workbook.ts` writes the new column into the Compliance_Requirements sheet.

**The stale-row trap.** The UPSERT key is `(worksheet_template_id, code)`
(`uniqWorksheetCr`, `schema.ts:261`). Re-importing a *moved* requirement inserts a new row and
orphans the old one — 54 requirements instead of 31, with the dead originals still attached to
B01.000 and still failing. The importer has no delete-stale pass for compliance.

Add one, scoped to the standard being imported, modelled on the section wipe-and-reinsert at
`_pass3c-db.ts:335-341`: within the transaction, delete `compliance_requirements` rows for this
standard whose `(worksheet_template_id, code)` is absent from the incoming set. Scoping to the
standard is essential — a global sweep would delete other standards' requirements.

**Prod path.** The importer fix is durable but does not by itself move existing prod rows.
Ship an idempotent migration that re-parents the 23 rows by `code`, following the
`scripts/vsme/prod-cutover/` precedent. It must be generated from the importer's own resolution
output, not hand-written, so the two cannot drift.

### 4.2 Derived fields and the intensity equations

There is no `is_derived` column. Derived-ness is inferred at runtime from
`equations.output_symbol`, driving two independent halves:

- **render** — `computeComputedSymbols` (`src/lib/eval/computed-symbols.ts:43-70`) →
  `isComputed` (`worksheet-form.tsx:290-297`, `:576`) → locked input in `dynamic-field.tsx`.
- **persistence** — `derivedOutputSymbols` (`src/lib/eval/derived-output-symbols.ts:26-37`) →
  `source_type='derived'` in `saveWorksheet` (`worksheet.ts:135-142`, `:308-312`).

Declaring an equation therefore earns both halves with no code change. That is the mechanism to
reuse.

**Diagnose before patching.** The ten VSME equation outputs *are* already equation outputs, yet
the reasoning map records them as editable. Two candidate causes, which need different fixes:

- the home-exclusion in `computeComputedSymbols` (`if (inheritedFromBySymbol[out]) return`)
  suppressing the lock for symbols whose home is elsewhere; and/or
- cross-sheet hosting — `eq-vsme-01` sits on `B08.000` but writes `NumberOfEmployees`, a
  `B01.000` field, which also depends on cross-worksheet materialization
  (`project_engine_output_materialization`, a known open workstream).

The first implementation step is a failing test that reproduces the editable-derived state, so
the fix is driven by an observed cause rather than an assumed one. **If the cause turns out to be
the materialization gap, that is a separate workstream and this spec will say so rather than
absorb it.**

**The four B03.300 intensity fields** are unambiguous: para 31 defines GHG intensity as gross GHG
emissions ÷ turnover in Euro, and no equation encodes it, so they are pure hand-entry.

Division is fully supported (`src/lib/eval/arithmetic.ts:124-139`) and fails safe: division by
zero throws and is downgraded to `manual_required` (`formula.ts:243-253`), never `Infinity`. A
missing or zero turnover therefore blanks the field with an actionable badge.

**Mandatory guard:** the engine computes any syntactically valid ratio but cannot detect a
dimensionally unfaithful one. A turnover stored in kEUR would silently yield a 1000× error.
These equations must declare `expectedUnits` in `equation-profiles.ts`; profile units win over
`fields.unit` (`formula.ts:174-177`) and a mismatch yields `manual_required` with an
`unitConflicts` payload (`:198-205`). This is precisely how `A_NB = Q_bem / q_A` was caught
missing its ×3.6 conversion.

Per SR-2, the unit of the turnover field is read from the encoding, not assumed. If it is not
recorded, that is a finding for Alvaro, not a guess.

### 4.3 Norm-text for the VSME PDF

Two blockers, both in the parser, and both currently **silent**:

- `HEADING_RE` (`extract-section.ts:48-50`) matches only pandoc LaTeX macros
  (`\section*{}`/`\subsection*{}`/`\subsubsection*{}`). A markdown ATX heading yields zero
  headings and every lookup returns `{found:false}` with no error.
- `parseClauseReference` (`:145-167`) accepts `§5.3.3.5` and `Anhang A`. VSME references are
  paragraph-shaped — `VSME B1 para 24(a)` — and return `null`.

VSME is paragraph-numbered, not clause-numbered, so converting it into the LaTeX shape fights the
document. Extend the parser instead:

- accept ATX headings, mapping `#`-count to `depth` alongside the existing dot-segment rule;
- add a third `ClauseQuery` kind for paragraph references.

The module's governing rule is preserved without exception: a non-match returns `{found:false}`
and **never approximates** to the enclosing module heading. Registration is one line in
`NORM_TEXT_SOURCE_MAP` (`source-map.ts:18`), which also serves as the path-traversal guard.

Page convention is already derived from this PDF and must not be inherited from FLL/138:
`printed = physical`, offset 0, 66 pages.

### 4.4 Verbatim backfill

184 rows get `source_quote` populated verbatim from the rendered PDF per SR-3, quoting from
`pdftotext -layout` output with the page convention above. This parallelises across agents by
worksheet.

`verification_status` is **not** touched. Quotes are evidence; the flip to `engineer_verified` is
Alvaro's sign-off, consistent with the guardrail in `00-Method-Overview.md` that standards stay
`imported_unverified` until an engineer flips them.

## 5. Error handling

| Failure | Behaviour |
|---|---|
| `worksheet_code` names an unknown worksheet | Import **fails** with a named error. No silent fallback. |
| Intensity divisor missing or zero | `manual_required` + badge. Never `Infinity`, never a bogus number. |
| Declared vs. actual unit mismatch | `manual_required` + `unitConflicts`. Never a silent 1000×. |
| Clause reference has no exact heading match | `{found:false}`. Never an approximate section. |
| Migration re-run | Idempotent; re-parents by `code`, no duplicate rows. |

## 6. Testing

The assertion that matters is **gate reachability**: every one of the 31 requirements resolves
its gated symbols on its own host worksheet. Currently 8/31; target 31/31. This test is the
regression guard for the whole class of defect and should fail before the fix and pass after.

Also: importer resolution (explicit wins over phase; absent falls back unchanged); delete-stale
(a moved requirement leaves no orphan and other standards are untouched); intensity equations
including the kEUR mismatch case and division-by-zero; paragraph-reference parsing including the
never-approximate rule; and a guard that VSME field count stays 143 across re-import.

Baseline for this branch: **129 files, 1226 tests passing, 1 expected fail.**

## 7. Rollout

Alvaro has authorised delivery to prod. Order: merge to `main` → apply the migration → deploy
→ re-point the `-hannesoster-` alias (this project has no auto-deploy on merge, and the custom
alias must be re-pointed after every prod deploy). Alvaro is told before the migration lands,
not after.

Rollback: a paired `scripts/rollback-*.sql` restoring the prior `worksheet_template_id` values,
following the `20260625170000` precedent.

## 8. Known-open, deliberately not fixed here

- `src/lib/actions/co2.ts:102` silently skips activity lines whose emission factor does not
  resolve, so totals can read low with no user-visible warning. Real, separate, worth a fix.
- The stale `≈414` comment at `emission-factors-catalog.ts:24` (prod holds 281) — trivial, folded
  in only if it is touched anyway.
- Cross-worksheet materialization (`project_engine_output_materialization`) remains open and may
  surface in §4.2 diagnosis.

## 9. Environment note

The shared pnpm store at `%LOCALAPPDATA%\pnpm\store\v3` contains files with broken ACLs
(`lucide-react` among them), which made 10 test files fail on `main` before this work started.
Both the main checkout and this worktree were rebound to a fresh durable store at
`…\pnpm\store\v3b`. The damaged store is left on disk, untouched.
