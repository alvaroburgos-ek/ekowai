# VSME Gate Repair + Source Verifiability (SP-1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 23 dead VSME compliance gates fire on their owning worksheets, lock derived values, encode the missing B03.300 GHG-intensity equations, ingest the VSME PDF as norm-text, and backfill `source_quote` verbatim — then deliver to prod.

**Architecture:** The root fix goes in the shared Pass3c importer (compliance rows gain an explicit `worksheet_code`, resolved before the phase fallback, plus a standard-scoped delete-stale pass). VSME then *emits* ownership derived from where each gated field lives. Prod is updated by re-running the importer (the canonical data path), not by hand-written SQL — except `source_quote`, which follows the existing `scripts/migrations/*_gate_enforcement.sql` family.

**Tech Stack:** TypeScript, Next.js 15, Drizzle, Vitest (`--project unit`), xlsx (Pass3c workbook), Supabase Postgres (prod ref `vadsmshzebefjreqcicl`), Vercel CLI.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-27-vsme-gate-repair-design.md`. Doctrine: `docs/verification-doctrine.md` (SR-1..SR-4) is BINDING; every subagent brief pastes it verbatim.
- **Worktree:** `C:\Users\Ekowai\_wt-vsme-gates`, branch `feat/vsme-gate-repair`. Baseline: 129 files / 1226 tests green.
- **Git identity:** `Alvaro <alvaro.burgos@ekowai.com>` (repo default — do not use the global CLAUDE.md email).
- **HARD CONSTRAINT (Alvaro, from `scripts/migrations/20260708290000_dwa_a_201_gate_rehome.sql`):** a gate may only be re-homed where the move makes it **worksheet-LOCAL** (every symbol its condition reads is a field on the target worksheet). If a gate would still read a cross-worksheet symbol after re-home → **STOP + REPORT** that CR; do not invent engine behavior.
- **Never touch `verification_status`.** The flip to `engineer_verified` is Alvaro's sign-off.
- **Never edit `data/norm-text/*` by hand** once generated (README rule); regeneration is script-only.
- **VSME PDF page convention:** `printed = physical`, offset 0, 66 pages (derived from THIS pdf; do not inherit FLL/138 `-2`).
- **Prod counts guard:** VSME has **143 fields / 40 worksheets / 10 equations / 31 CRs** in prod. If any step observes >143 fields, STOP and reconcile (the reasoning map's `x154` is suspect).
- **APPLY-PATH TRAP:** `.env.local` `DATABASE_URL` points at LOCAL. Prod writes go through the Management-API helper only, at the rollout task, never earlier.
- **Windows:** run tests with `npx vitest run --project unit <paths>`; pnpm store is `--store-dir C:/Users/Ekowai/AppData/Local/pnpm/store/v3b` if an install is ever needed.

---

### Task 1: Pure host-resolution helper for compliance rows

**Files:**
- Create: `scripts/_pass3c-compliance-host.ts`
- Test: `scripts/__tests__/pass3c-compliance-host.test.ts`

**Interfaces:**
- Produces: `resolveComplianceWorksheet(cr: { worksheet_code: string | null; phase: number | null }, worksheets: Array<{ worksheet_code: string; phase: number | null }>): { worksheet_code: string; via: 'explicit' | 'phase' | 'first_phase1' }` — throws `Error` with message starting `unknown worksheet_code` when `cr.worksheet_code` is set but matches nothing.
- Consumed by Tasks 2 and 3.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/__tests__/pass3c-compliance-host.test.ts
import { describe, expect, it } from 'vitest';
import { resolveComplianceWorksheet } from '../_pass3c-compliance-host';

const WS = [
  { worksheet_code: 'VSME-B01.000', phase: 1 },
  { worksheet_code: 'VSME-B03.200', phase: 1 },
  { worksheet_code: 'VSME-B06.000', phase: 1 },
];

describe('resolveComplianceWorksheet', () => {
  it('explicit worksheet_code wins over phase', () => {
    expect(
      resolveComplianceWorksheet({ worksheet_code: 'VSME-B03.200', phase: 1 }, WS),
    ).toEqual({ worksheet_code: 'VSME-B03.200', via: 'explicit' });
  });

  it('absent worksheet_code reproduces the phase fallback exactly (first array match)', () => {
    expect(
      resolveComplianceWorksheet({ worksheet_code: null, phase: 1 }, WS),
    ).toEqual({ worksheet_code: 'VSME-B01.000', via: 'phase' });
  });

  it('null phase falls back to first phase-1 worksheet', () => {
    expect(
      resolveComplianceWorksheet({ worksheet_code: null, phase: null }, WS),
    ).toEqual({ worksheet_code: 'VSME-B01.000', via: 'first_phase1' });
  });

  it('unknown explicit worksheet_code throws — never silently falls back', () => {
    expect(() =>
      resolveComplianceWorksheet({ worksheet_code: 'VSME-B99.999', phase: 1 }, WS),
    ).toThrow(/unknown worksheet_code/);
  });

  it('empty-string worksheet_code is treated as absent', () => {
    expect(
      resolveComplianceWorksheet({ worksheet_code: '', phase: 1 }, WS).via,
    ).toBe('phase');
  });
});
```

- [ ] **Step 2: Run it — expect FAIL (module not found)**

Run: `npx vitest run --project unit scripts/__tests__/pass3c-compliance-host.test.ts`

- [ ] **Step 3: Implement**

```ts
// scripts/_pass3c-compliance-host.ts
/**
 * Resolve which worksheet a compliance requirement is hosted on.
 *
 * Order: explicit `worksheet_code` (typo = hard error, because the silent
 * phase-fallback is exactly how the VSME B01-collapse shipped) → first
 * worksheet with the row's `phase` (legacy behaviour, byte-for-byte) →
 * first phase-1 worksheet → first worksheet.
 */
export function resolveComplianceWorksheet(
  cr: { worksheet_code: string | null; phase: number | null },
  worksheets: Array<{ worksheet_code: string; phase: number | null }>,
): { worksheet_code: string; via: 'explicit' | 'phase' | 'first_phase1' } {
  const explicit = cr.worksheet_code?.trim();
  if (explicit) {
    const hit = worksheets.find((w) => w.worksheet_code === explicit);
    if (!hit) {
      throw new Error(
        `unknown worksheet_code "${explicit}" on compliance requirement — `
        + `known: ${worksheets.map((w) => w.worksheet_code).join(', ')}`,
      );
    }
    return { worksheet_code: hit.worksheet_code, via: 'explicit' };
  }
  const byPhase = cr.phase != null ? worksheets.find((w) => w.phase === cr.phase) : undefined;
  if (byPhase) return { worksheet_code: byPhase.worksheet_code, via: 'phase' };
  const first = worksheets.find((w) => w.phase === 1) ?? worksheets[0];
  return { worksheet_code: first.worksheet_code, via: 'first_phase1' };
}
```

- [ ] **Step 4: Run the test — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add scripts/_pass3c-compliance-host.ts scripts/__tests__/pass3c-compliance-host.test.ts
git commit -m "feat(pass3c): pure compliance host resolver — explicit worksheet_code before phase fallback"
```

---

### Task 2: Wire the importer — types, parser, validator, db, delete-stale

**Files:**
- Modify: `scripts/_pass3c-types.ts` (ComplianceRow, ~line 85)
- Modify: `scripts/_pass3c-parsers.ts` (`parseComplianceRequirements`, ~line 220)
- Modify: `scripts/_pass3c-validate.ts` (~line 139)
- Modify: `scripts/_pass3c-db.ts` (~lines 557-600)
- Test: `scripts/__tests__/pass3c-compliance-validate.test.ts`

**Interfaces:**
- Consumes: `resolveComplianceWorksheet` from Task 1.
- Produces: `ComplianceRow.worksheet_code: string | null`; validator emits error string `Compliance_Requirements: unknown worksheet_code "<code>" on <requirement_code>`; db layer deletes stale compliance rows scoped to the imported standard's templates.

- [ ] **Step 1: Add the column to the type**

In `scripts/_pass3c-types.ts` `ComplianceRow`, after `standard_code`:

```ts
  /** Optional explicit host worksheet. Absent → legacy phase fallback. */
  worksheet_code: string | null;
```

- [ ] **Step 2: Read it in the parser**

In `parseComplianceRequirements` (`scripts/_pass3c-parsers.ts`), alongside the existing keys:

```ts
      worksheet_code: asString(r.worksheet_code),
```

(Header sentinels `['requirement_code', 'evaluation_expression']` unchanged.)

- [ ] **Step 3: Write the failing validator test**

```ts
// scripts/__tests__/pass3c-compliance-validate.test.ts
import { describe, expect, it } from 'vitest';
import { validateWorkbook } from '../_pass3c-validate';

// Minimal parsed-workbook fixture: clone the shape other validator tests use.
// One standard, two worksheets, one CR pointing at a bogus worksheet.
function fixture(worksheetCode: string | null) {
  return {
    standards: [{ standard_code: 'TST', title_de: 'T', title_en: 'T', version: '1', issued_year: 2026 }],
    worksheets: [
      { worksheet_code: 'TST-01', standard_code: 'TST', title: 'A', phase: 1, archetype: null, order_index: 1 },
      { worksheet_code: 'TST-02', standard_code: 'TST', title: 'B', phase: 1, archetype: null, order_index: 2 },
    ],
    sections: [],
    fields: [],
    enum_values: [],
    equations: [],
    complianceRequirements: [{
      requirement_code: 'TST-CR-01', standard_code: 'TST', worksheet_code: worksheetCode,
      title: 'x', description: null, evaluation_type: null, required_field_symbols: 'A',
      evaluation_expression: 'A IS NOT NULL', pass_condition: null, severity: 'block',
      regulation_reference: null, phase: 1, order_index: 1, verification_status: null,
    }],
  } as never;
}

describe('compliance worksheet_code validation', () => {
  it('unknown worksheet_code is an import ERROR, not a silent fallback', () => {
    const res = validateWorkbook(fixture('TST-99'));
    expect(res.errors.join('\n')).toMatch(/unknown worksheet_code "TST-99" on TST-CR-01/);
  });
  it('valid worksheet_code passes', () => {
    expect(validateWorkbook(fixture('TST-02')).errors.join('\n')).not.toMatch(/worksheet_code/);
  });
  it('absent worksheet_code stays valid (legacy path)', () => {
    expect(validateWorkbook(fixture(null)).errors.join('\n')).not.toMatch(/worksheet_code/);
  });
});
```

NOTE: match the fixture to the real `ParsedWorkbook` shape in `_pass3c-types.ts` — copy an existing validator-test fixture if one exists rather than trusting the sketch above; the assertion strings are the contract.

- [ ] **Step 4: Run it — expect FAIL**
- [ ] **Step 5: Implement validator check** (in `_pass3c-validate.ts`, in the compliance loop ~line 141)

```ts
    if (cr.worksheet_code && cr.worksheet_code.trim()) {
      const known = parsed.worksheets.some((w) => w.worksheet_code === cr.worksheet_code!.trim());
      if (!known) {
        errors.push(
          `Compliance_Requirements: unknown worksheet_code "${cr.worksheet_code}" on ${cr.requirement_code}`,
        );
      }
    }
```

- [ ] **Step 6: Use the resolver in `_pass3c-db.ts`**

Replace the resolution block (~557-563) with:

```ts
  const crValues = parsed.complianceRequirements.map((cr) => {
    const host = resolveComplianceWorksheet(cr, parsed.worksheets);
    const targetWorksheet = parsed.worksheets.find((w) => w.worksheet_code === host.worksheet_code)!;
    // ... rest of the existing mapping unchanged (condition synthesis, severity) ...
```

- [ ] **Step 7: Delete-stale pass, scoped to this standard**

After the compliance UPSERT in the same transaction (model on the section wipe at `_pass3c-db.ts:335-341`):

```ts
  // Stale-row cleanup: the UPSERT key is (worksheet_template_id, code), so a
  // re-hosted requirement would otherwise leave its old row orphaned on the
  // previous worksheet — 54 rows instead of 31. Scoped to THIS standard's
  // templates; other standards are untouchable by construction.
  const templateIds = [...tmplByCode.values()];
  const existing = await tx
    .select({ id: complianceRequirements.id, wtId: complianceRequirements.worksheetTemplateId, code: complianceRequirements.code })
    .from(complianceRequirements)
    .where(inArray(complianceRequirements.worksheetTemplateId, templateIds));
  const incoming = new Set(crValues.map((v) => `${v.worksheetTemplateId}:${v.code}`));
  const staleIds = existing.filter((r) => !incoming.has(`${r.wtId}:${r.code}`)).map((r) => r.id);
  if (staleIds.length > 0) {
    await tx.delete(complianceRequirements).where(inArray(complianceRequirements.id, staleIds));
    console.log(`  compliance: deleted ${staleIds.length} stale row(s) after re-hosting`);
  }
```

Check `compliance_suggestions` FK: if it references `compliance_requirements.id` without `ON DELETE CASCADE`, delete suggestions for `staleIds` first in the same transaction.

- [ ] **Step 8: Run the full importer test set + typecheck**

Run: `npx vitest run --project unit scripts/ && npx tsc --noEmit`

- [ ] **Step 9: Commit**

```bash
git add scripts/_pass3c-types.ts scripts/_pass3c-parsers.ts scripts/_pass3c-validate.ts scripts/_pass3c-db.ts scripts/__tests__/pass3c-compliance-validate.test.ts
git commit -m "feat(pass3c): explicit compliance worksheet_code + standard-scoped delete-stale"
```

---

### Task 3: VSME emits ownership — derived from where the gated fields live

**Files:**
- Modify: `scripts/vsme/requirements.ts` (Req type + `buildComplianceRows`, lines 62-82 and 718-749)
- Modify: `scripts/vsme/build-workbook.ts` (`ComplianceRow` type line 388-402; the call site of `buildComplianceRows`; the Compliance_Requirements sheet writer)
- Test: extend `scripts/vsme/__tests__/build-workbook.test.ts`

**Interfaces:**
- Consumes: `buildVsmeRows` already computes each field's origin worksheet (`FieldsRow.origin_worksheet`).
- Produces: `buildComplianceRows(fieldWorksheetBySymbol: Map<string, string>): ComplianceRow[]` — signature CHANGE from `Set<string>`. Every emitted row has `worksheet_code` = the single worksheet owning **all** its referenced symbols.

**Derivation rule (this is the core):** host = the worksheet where the gated *fields* live — NOT the `module` tag. Example: `VSME-CR-B03-02` gates `GrossScope1GreenhouseGasEmissions`, which lives on `VSME-B03.200`, not `VSME-B03.000`. If a CR's symbols span more than one worksheet, that CR is a **STOP + REPORT** per the hard constraint — emit it with `worksheet_code: null` (legacy hosting), log it loudly, and list it in the task report for Alvaro. Do not guess a host.

- [ ] **Step 1: Write the failing test** (extend `scripts/vsme/__tests__/build-workbook.test.ts`)

```ts
  it('every compliance row is hosted where ALL its gated symbols live (gate reachability)', () => {
    const rows = buildVsmeRows(TAXONOMY_DIR);
    const fieldWs = new Map(rows.fields.map((f) => [f.symbol, f.origin_worksheet]));
    const unreachable: string[] = [];
    for (const cr of rows.compliance_requirements) {
      const syms = cr.required_field_symbols.split(',').map((s) => s.trim()).filter(Boolean);
      const hosts = new Set(syms.map((s) => fieldWs.get(s)));
      if (hosts.size === 1) {
        // single-owner CR: MUST be explicitly hosted there
        if (cr.worksheet_code !== [...hosts][0]) unreachable.push(`${cr.requirement_code} → ${cr.worksheet_code} but fields on ${[...hosts][0]}`);
      } else {
        // multi-worksheet CR: STOP case — must NOT carry a fabricated host
        if (cr.worksheet_code != null) unreachable.push(`${cr.requirement_code} spans ${[...hosts].join('+')} yet claims ${cr.worksheet_code}`);
      }
    }
    expect(unreachable).toEqual([]);
    // and the collapse itself is gone: not everything on B01.000
    const hostSet = new Set(rows.compliance_requirements.map((c) => c.worksheet_code ?? 'LEGACY'));
    expect(hostSet.size).toBeGreaterThan(1);
  });
```

- [ ] **Step 2: Run — expect FAIL** (`worksheet_code` doesn't exist yet ⇒ everything `undefined`)
- [ ] **Step 3: Implement**

In `requirements.ts`: change the signature and derive the host:

```ts
export function buildComplianceRows(fieldWorksheetBySymbol: Map<string, string>): ComplianceRow[] {
  const out: ComplianceRow[] = [];
  let order = 1;
  for (const r of VSME_REQUIREMENTS) {
    const syms = r.fields.split(',').map((s) => s.trim()).filter(Boolean);
    const missing = syms.filter((s) => !fieldWorksheetBySymbol.has(s));
    if (missing.length > 0) {
      console.warn(`[requirements] SKIP ${r.code} — field symbol(s) not in workbook: ${missing.join(', ')}`);
      continue;
    }
    const hosts = [...new Set(syms.map((s) => fieldWorksheetBySymbol.get(s)!))];
    let worksheetCode: string | null;
    if (hosts.length === 1) {
      worksheetCode = hosts[0];
    } else {
      // HARD CONSTRAINT: never fabricate a host for a cross-worksheet gate.
      console.warn(`[requirements] STOP-REPORT ${r.code} — symbols span ${hosts.join(' + ')}; left on legacy hosting`);
      worksheetCode = null;
    }
    out.push({
      requirement_code: r.code,
      standard_code: 'VSME',
      worksheet_code: worksheetCode,
      // ... every other property EXACTLY as today (title/description/…/phase: 1/…)
    });
  }
  return out;
}
```

Update `build-workbook.ts`: add `worksheet_code: string | null` to its `ComplianceRow`, pass `new Map(fields.map(f => [f.symbol, f.origin_worksheet]))` at the call site, and confirm the sheet writer emits the new key as a column (if it uses `json_to_sheet`-style header inference, no change; if headers are listed explicitly, append `worksheet_code`).

- [ ] **Step 4: Run all VSME script tests — expect PASS**

Run: `npx vitest run --project unit scripts/vsme/`

- [ ] **Step 5: Record the expected host distribution.** Add to the same test file a snapshot-style assertion of the 31 codes → hosts (write it from the actual output after eyeballing against `reasoning-maps/VSME/_index.md`'s dead-gate list — CR-B03-01→B03.000, CR-B03-02/03→B03.200, CR-B06-01→B06.000, etc.). This freezes the re-host so a future refactor can't silently regress it. If any multi-worksheet STOP cases appeared in Step 3, list them verbatim in the task report.

- [ ] **Step 6: Commit**

```bash
git add scripts/vsme/requirements.ts scripts/vsme/build-workbook.ts scripts/vsme/__tests__/build-workbook.test.ts
git commit -m "feat(vsme): host compliance gates on their owning worksheets (23 dead gates -> live)"
```

---

### Task 4: Derived-editable diagnosis + fix (dp-vsme-02)

**Files:**
- Test: `src/components/worksheet/__tests__/render-vsme-derived-readonly.test.tsx` (new)
- Possibly modify: `src/components/worksheet/worksheet-form.tsx` / nothing — **cause-driven**

**Hypothesis to test (from the code read, and the reasoning map's own caveat that it was generated "from artifacts only", i.e. DB, not runtime):** same-sheet equation outputs (e.g. `TotalWasteGeneratedMass` on B07.200) are *already* locked at runtime by `computeComputedSymbols`; the genuinely editable derived values are (a) `NumberOfEmployees` on B01.000 — its producing equation lives on B08.000, so B01's form never sees it — and (b) the 4 intensity fields (no equation at all; fixed by Task 5).

- [ ] **Step 1: Write the two-sided diagnosis test.** Model it on `src/components/worksheet/__tests__/render-computed-symbols-isComputed.test.tsx` (same render harness, VSME fixtures):
  - render B07.200 with its two waste equations → assert the `TotalWasteGeneratedMass` input has `readOnly` (documents that same-sheet outputs are already safe);
  - render B01.000 (equations = B01's own only, which per prod is `NumberOfEmployees` — **note prod hosts eq-vsme-01 on B01.000 per today's query; the map said B08.000; the test settles it**) → assert `NumberOfEmployees` is `readOnly`.
- [ ] **Step 2: Run it.** Whichever assertion fails identifies the real defect. Three outcomes:
  - **Both pass** → runtime lock is fine; dp-vsme-02's residue is only the no-equation fields (Task 5) and the B07.400 totals. Record; no code change.
  - **B01 fails because the equation is hosted elsewhere** → the fix is data, not code: the equation's host must be the worksheet owning its output field (single-source invariant). Fix in `scripts/vsme/calculations.ts` host assignment, regression-test in `scripts/vsme/__tests__/`.
  - **B01 fails despite a local equation** (home-exclusion via `inheritedFromBySymbol`) → surgical fix in `computeComputedSymbols` options at the VSME call site; do NOT touch the A138 paths (`extraSymbols` groups stay as-is). Re-run the 10 worksheet render tests.
- [ ] **Step 3: B07.400 material totals:** check whether `TotalWasteGeneratedMass/Volume`-analogous totals on B07.400 have equations in prod (today's query shows none). If none, they are hand-entry by design *or* missing equations — check the XBRL calculation linkbase (`vsme-calculation.xml`) for a summation arc; if the linkbase has one that `calculations.ts` skipped as "duplicate", report as a finding; do not invent an equation the taxonomy doesn't declare.
- [ ] **Step 4: Run full unit suite; commit**

```bash
git add -A src/components/worksheet scripts/vsme
git commit -m "fix(vsme): derived outputs render read-only — cause-driven per diagnosis test"
```

---

### Task 5: B03.300 intensity equations (para 31)

**Files:**
- Modify: `scripts/vsme/build-workbook.ts` (append 4 hand-authored `EquationsRow`s after the linkbase-generated ones)
- Modify: `src/lib/eval/equation-profiles.ts` (4 entries with `expectedUnits`)
- Test: extend `scripts/vsme/__tests__/build-workbook.test.ts`; new formula test `src/lib/eval/__tests__/vsme-intensity.test.ts`

**The four equations** (output ↔ formula; all `used_in_worksheet: 'VSME-B03.300'`, `regulation_reference: 'VSME B3 para 31'`):

```
Scope1AndScope2GreenhouseGasEmissionsIntensityValueLocationBased = TotalGrossLocationBasedScope1AndScope2GHGEmissions / Turnover
Scope1AndScope2GreenhouseGasEmissionsIntensityValueMarketBased   = TotalGrossMarketBasedScope1AndScope2GHGEmissions / Turnover
TotalLocationBasedGreenhouseGasEmissionsIntensityValue           = TotalGrossLocationBasedGHGEmissions / Turnover
TotalMarketBasedGreenhouseGasEmissionsIntensityValue             = TotalGrossMarketBasedGHGEmissions / Turnover
```

**SR-1 gate:** before writing the formulas, quote para 31 verbatim from the rendered PDF (p.9): the backfill task extracts it anyway; this task's report must carry the quote + page ref. Also read `Turnover`'s encoded unit from the workbook build (field on `VSME-B01.000`). Para 31 says "'turnover (in Euro)'" — if the encoded unit is missing or is not EUR, that is a **finding for Alvaro**, not a silent assumption; the profile's `expectedUnits` then enforces whatever is ratified.

**Cross-worksheet inputs — known risk:** the dividends live on B03.200/B01.000, the outputs on B03.300. Check how A138 cross-sheet inputs reach a consuming worksheet's engine (fields declare `consumer_worksheets`; `src/lib/eval` inheritance). Add `VSME-B03.300` to `consumer_worksheets` of the 4 totals + `Turnover` in the workbook build. **If at runtime the inputs still do not resolve on B03.300 (the `project_engine_output_materialization` gap), the equations stay encoded (they are correct data) but the task report marks runtime-blocked-on-materialization and this workstream does NOT absorb that fix — per spec §4.2.**

- [ ] **Step 1: Failing workbook test** — assert 14 equations (10 + 4), each intensity row present with the exact formula strings above, and `consumer_worksheets` on the 5 input fields contains `VSME-B03.300`.
- [ ] **Step 2: Implement in `build-workbook.ts`** (append rows; mirror the existing `EquationsRow` shape at line ~371-386).
- [ ] **Step 3: Formula unit test** (`src/lib/eval/__tests__/vsme-intensity.test.ts`): evaluate `X / Turnover` with the project's `evaluateFormula` path — assert correct division; `Turnover = 0` → `manual_required` (message `/Division durch Null/`); unit mismatch (declare `Turnover: 'EUR'` in profile, feed a field-unit `kEUR`) → `manual_required` with `unitConflicts`. Copy the harness style from an existing `formula-*.test.ts`.
- [ ] **Step 4: Profile entries** — first read `src/lib/eval/equation-profiles.ts` header to get the exact key convention (the denylist uses `${worksheetCode}:${equationNumber}`), then add 4 entries following the `A_NB` precedent, each with `expectedUnits: { <emissionSymbol>: 'tCO2eq', Turnover: 'EUR' }` and output unit `tCO2eq/EUR`.
- [ ] **Step 5: Run all; commit**

```bash
git add scripts/vsme/build-workbook.ts src/lib/eval/equation-profiles.ts scripts/vsme/__tests__ src/lib/eval/__tests__
git commit -m "feat(vsme): B03.300 GHG-intensity equations (para 31) with unit-guarded division"
```

---

### Task 6: Norm-text — VSME.md + paragraph addressing

**Files:**
- Create: `scripts/vsme/convert-norm-text.ts` (PDF text → `data/norm-text/VSME.md`)
- Create: `data/norm-text/VSME.md` (generated, committed)
- Modify: `src/lib/norm-text/extract-section.ts` (ATX headings + paragraph queries)
- Modify: `src/lib/norm-text/source-map.ts` (`'VSME': 'VSME.md'`)
- Modify: `data/norm-text/README.md` (provenance row)
- Test: `src/lib/norm-text/__tests__/extract-section-vsme.test.ts` (new; put it beside existing extract-section tests)

**Conversion:** `pdftotext -layout` (scoop, PowerShell — WSL is blind to the Desktop folder) on `C:\Users\Ekowai\Desktop\environmental-reporting service\01_Referenz\VSME Standard.pdf`, then the converter script normalizes to markdown: module headings as ATX (`## B1 — Basis for preparation`… exact titles from the PDF), body paragraphs preserved verbatim, paragraph numbers (`24.`) kept at line start. Strip running headers/footers ("Page N of 66") — nothing else. Generated file is read-only thereafter.

**Parser extension — two additions, zero behavior change for existing docs:**

1. `HEADING_RE` alternative for ATX: `^(#{1,6})\s+(.*)$`, `depth = #-count`, then the existing number/appendix classification runs on the heading text.
2. Third query kind:

```ts
export type ClauseQuery =
  | { kind: 'numbered'; number: string }
  | { kind: 'appendix'; letter: string }
  | { kind: 'paragraph'; module: string; para: string };

// in parseClauseReference, before returning null:
//   "VSME B1 para 24(a)" | "VSME B3 para 30" | "VSME C9 para 65"
const pMatch = /^VSME\s+([BCD]\d{1,2})\s+para\s+(\d+)/i.exec(trimmed);
if (pMatch) return { kind: 'paragraph', module: pMatch[1].toUpperCase(), para: pMatch[2] };
```

Paragraph extraction: locate the module's ATX heading (heading text starts with the module code), then within that section slice from the line matching `^\s*<para>\.\s` to the next `^\s*\d+\.\s` or next heading. **No match → `{ found: false }` — never approximate to the module heading** (module doctrine, `extract-section.ts:14-19`).

- [ ] **Step 1: Failing tests** — using the reasoning map's already-verified quotes as fixtures: `parseClauseReference('VSME B1 para 24(a)')` → paragraph kind; extraction of `VSME B3 para 30` from a fixture string returns text containing "GHG Protocol Corporate Standard (version 2004)"; `VSME B3 para 99` → `{found:false}`; existing `§5.3.3.5`/`Anhang A` behaviour byte-identical (re-run existing extract-section tests).
- [ ] **Step 2: Implement parser extension; run tests.**
- [ ] **Step 3: Write + run the converter; commit the generated `VSME.md`.** Spot-check paragraphs 24/29/30/31/41/65 against the printed pages 8/9/10/14 (offset 0).
- [ ] **Step 4: Register in `source-map.ts`; add README provenance row; confirm the worksheet page wraps VSME in `NormTextProvider`** (it's generic — `standardCode` is threaded from the DB; verify only, expect no change).
- [ ] **Step 5: Full suite; commit**

```bash
git add scripts/vsme/convert-norm-text.ts data/norm-text/VSME.md data/norm-text/README.md src/lib/norm-text
git commit -m "feat(vsme): norm-text ingest — ATX + paragraph addressing, never-approximate preserved"
```

---

### Task 7: source_quote backfill (dp-vsme-03) — staged SQL, written-not-applied

**Files:**
- Create: `scripts/migrations/20260727120000_vsme_source_quotes.sql`
- Create: `scripts/migrations/rollback-20260727120000_vsme_source_quotes.sql`
- Create: `scripts/vsme/verify-source-quotes.ts` (count + spot-check verifier)

**Mechanism:** follow the `*_gate_enforcement.sql` family. One `UPDATE … SET source_quote = <verbatim>` per row, keyed by `(standard VSME, worksheet code, symbol/code)`. Quotes come from `data/norm-text/VSME.md` (Task 6 output = the rendered PDF text), each carrying its printed page, e.g.:

```sql
-- fields: VSME-B03.200 / GrossScope1GreenhouseGasEmissions — p.9 para 30(a)
UPDATE fields f SET source_quote = '30. … the Scope 1 GHG emissions in tCO2eq … [p.9]'
FROM worksheet_templates wt, standards s
WHERE f.worksheet_template_id = wt.id AND wt.standard_id = s.id
  AND s.code = 'VSME' AND wt.code = 'VSME-B03.200'
  AND f.symbol = 'GrossScope1GreenhouseGasEmissions'
  AND f.source_quote IS NULL;   -- idempotent; never overwrites an existing quote
```

**Scale:** 184 rows (143 fields + 10 equations + 31 CRs). Parallelise authoring across subagents **by module** (B01…D99); every subagent brief pastes the doctrine verbatim and quotes only from `VSME.md` with the printed page. `verification_status` is NOT touched anywhere in this file. If any agent cannot find a paragraph backing a row, the row is **left NULL and listed in the residue report** — honest residue is a deliverable. Disclosure-input fields quote the disclosure paragraph that mandates them (VA is earned from the paragraph, per the map's "character of this standard").
**Stop rule:** >143 field rows encountered → STOP, reconcile with Alvaro.

- [ ] **Step 1: Write `verify-source-quotes.ts`** (reads DB, prints `quoted/total` per table + 5 random spot-checks against `VSME.md`; exits non-zero if a quote isn't a substring of the norm-text).
- [ ] **Step 2: Author the SQL in module batches; run the verifier against LOCAL after each batch** (local DB apply is fine; prod stays untouched).
- [ ] **Step 3: Rollback file** (`UPDATE … SET source_quote = NULL WHERE s.code='VSME' AND source_quote IS NOT NULL` — scoped identically).
- [ ] **Step 4: Commit**

```bash
git add scripts/migrations/20260727120000_vsme_source_quotes.sql scripts/migrations/rollback-20260727120000_vsme_source_quotes.sql scripts/vsme/verify-source-quotes.ts
git commit -m "feat(vsme): verbatim source_quote backfill (staged, written-not-applied; residue honest)"
```

---

### Task 8: Housekeeping + full verification

**Files:**
- Modify: `src/lib/db/queries/emission-factors-catalog.ts:24` (comment `≈414` → `281 (prod-verified 2026-07-27)`)
- Modify: `src/components/vsme/worklist.tsx` + `src/lib/db/queries/vsme-worklist.ts` — deduplicate the twice-declared `WorklistRow` (export from the query file, import in the component; shape unchanged)

- [ ] **Step 1: Make both edits.**
- [ ] **Step 2: Full gate:** `npx vitest run --project unit && npx tsc --noEmit && pnpm lint`
  Expected: ≥ baseline 1226 passing + every test added above; zero type or lint errors.
- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(vsme): stale factor-count comment + WorklistRow dedup; full gate green"
```

---

### Task 9: Merge to main

Use **superpowers:finishing-a-development-branch**: re-run the full gate on the final SHA, request code review per house flow, then merge `feat/vsme-gate-repair` → `main` (no fast-forward surprises; keep the branch until prod verify). Do not delete the worktree yet.

---

### Task 10: Prod rollout (Alvaro is told BEFORE each write)

Order is fixed; each step verifies before the next. **All prod writes happen only after telling Alvaro in-channel that the write is about to happen.**

- [ ] **Step 1 — Pre-flight (read-only):** snapshot prod compliance rows to the scratchpad: `select id, wt.code, cr.code, severity from compliance_requirements cr join worksheet_templates wt … where s.code='VSME'` → save as rollback evidence. Confirm still 31 rows / 40 draft instances / 1 param.
- [ ] **Step 2 — Data: regenerate + import the VSME workbook against PROD** via the documented Management-API path (CLAUDE.md "Push — Supabase MCP path"; `--dry-run` equivalent first: run `parseWorkbook`+`validateWorkbook` locally and print the resolution table). Expected effect: same 143 fields, 14 equations (10+4), 31 CRs now distributed across their owning worksheets, 0 stale rows left on B01.000 beyond its own 8+any legitimate.
- [ ] **Step 3 — Verify hosting:** re-run the Task 3 host-distribution query against prod; diff against the frozen snapshot test. Any mismatch → apply rollback (restore snapshot hosts by id) and stop.
- [ ] **Step 4 — Data: apply `20260727120000_vsme_source_quotes.sql`** via the same path; run `verify-source-quotes.ts` against prod; record `quoted/total` + residue list.
- [ ] **Step 5 — Code deploy:** from the worktree on merged `main`:

```bash
vercel --prod          # project: ekowai-wizard-preview (no auto-deploy on merge)
vercel alias set <new-deployment-url> <the -hannesoster- alias>   # MUST re-point after every prod deploy
```

- [ ] **Step 6 — Smoke (in prod):** open the VSME project → B03.200 worksheet shows its CRs in the gate panel; B03.300 renders intensity fields read-only-or-manual_required; a field's clause chip opens the VSME norm-text pane with the verbatim paragraph; CO₂ page loads; `/vsme/worklist` loads.
- [ ] **Step 7 — Ledger + close-out:** milestone report with model+CLI+effort header, prod counts before/after, residue list, and the STOP-report list (cross-worksheet CRs, materialization-blocked equations, any unit finding on `Turnover`) → vault + `.superpowers/sdd/`.

**Rollback paths:** hosting = restore snapshot `worksheet_template_id` by id (Step 1 evidence); quotes = `rollback-20260727120000…sql`; deploy = `vercel alias set` back to the previous deployment URL.
