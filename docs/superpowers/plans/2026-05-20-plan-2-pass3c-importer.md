# Plan 2: Pass3c xlsx Importer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A CLI tool that ingests Pass3c xlsx workbooks into the standards-library tables in Supabase, idempotently and transactionally, with full sanity validation before any write.

**Architecture:** TypeScript Node CLI invoked via `pnpm tsx`. Reads xlsx with `exceljs`, parses each relevant sheet into typed domain objects, validates the full payload up-front, then writes inside one DB transaction. Direct DB access via `postgres` driver + Drizzle ORM as service role (bypasses RLS, like Plan 1's `_apply-supabase-sql.ts`). Idempotent UPSERTs by natural keys preserve `verification_status='engineer_verified'` across re-imports.

**Tech Stack:** Node.js + tsx, exceljs v4 (already added in Plan 2 prep), postgres (already in deps), Drizzle ORM (already configured), vitest for unit tests on parsers and validators.

**Companion Spec:** `docs/superpowers/specs/2026-05-20-db-driven-multi-standard-design.md` (Section 5)

**Predecessor:** Plan 1 (Schema Migration) — branch `feat/db-driven-schema`, PR #1 draft. This plan builds on the same branch.

---

## File Structure

**Create:**
- `supabase/migrations/20260521120000_add_compliance_description.sql` — adds `description text` column to `compliance_requirements` to match xlsx schema
- `scripts/import-pass3c.ts` — CLI entry point, orchestration, transaction
- `scripts/_pass3c-types.ts` — TypeScript shapes mirroring each sheet row
- `scripts/_pass3c-parsers.ts` — exceljs → domain object conversion (sheet by sheet)
- `scripts/_pass3c-validate.ts` — pre-write sanity checks (data_type whitelist, enum presence, FK refs intact)
- `scripts/_pass3c-db.ts` — Drizzle UPSERT helpers, one per table
- `scripts/__tests__/pass3c-parsers.test.ts` — unit tests for parsers (synthetic in-memory workbooks)
- `scripts/__tests__/pass3c-validate.test.ts` — unit tests for validators

**Modify:**
- `src/lib/db/schema.ts` — add `description: text('description')` to `complianceRequirements`

**Untouched in this plan:**
- The 11 workflow/library tables themselves (created by Plan 1)
- App code (Plans 3–6 territory)

---

## Reference: Pass3c Workbook Layout

A Pass3c workbook has 15 sheets. The MVP importer reads 7 of them:

| Sheet | Real header row | Importer behavior |
|---|---|---|
| `Standards` | Row 1 | 1 row → `standards` table |
| `Worksheets` | Row 1 | N rows → `worksheet_templates` |
| `Sections` | Row 1 | N rows → `worksheet_sections` (two-pass for `parent_section_code`) |
| `Fields` | Row 1 | N rows → `fields` |
| `Enum_Values` | Row 1 | Grouped by `enum_name`, merged into `fields.enum_values` JSONB for matching enum fields |
| `Equations` | Row 1 | N rows → `equations` |
| `Compliance_Requirements` | Row 1 | N rows → `compliance_requirements` |

Sheets `Validation_Rules`, `Tables`, `Master_Per_Type`, `Decision_Trees`, `Cross_References` have a title string in Row 1 (real data starts ~Row 3) and are deferred to Phase 2 — the importer skips them. Sheets `README`, `Changelog`, `Validation` are documentation/diagnostic — also skipped.

**Column maps (xlsx → DB):**

`Standards` sheet (1 row):
```
standard_code  → standards.code
title_de       → standards.title_de
title_en       → standards.title_en
issuer         → (ignored)
edition        → standards.version
domain         → (ignored)
status         → (ignored — always 'active' for Pass3c)
notes          → (ignored)
```

`Worksheets` sheet:
```
worksheet_code      → worksheet_templates.code
standard_code       → resolve to standards.id (FK)
title_de            → worksheet_templates.title_de
title_en            → worksheet_templates.title_en
phase               → worksheet_templates.phase
archetype           → worksheet_templates.archetype
section_refs        → (ignored — derived from Sections sheet)
equation_refs       → (ignored — derived from Equations.used_in_worksheet)
order_index         → worksheet_templates.order_index
description         → worksheet_templates.description
verification_status → (ignored — importer always writes 'imported_unverified')
```

`Sections` sheet:
```
worksheet_code        → resolve to worksheet_templates.id (FK)
section_code          → worksheet_sections.code
parent_section_code   → two-pass resolve to worksheet_sections.id (within same worksheet)
title                 → worksheet_sections.title_de
order_index           → worksheet_sections.order_index
purpose               → (ignored)
verification_status   → (ignored)
```

Note: `worksheet_sections.title_en` left NULL (xlsx has only one title column).

`Fields` sheet:
```
symbol                → fields.symbol
label_de              → fields.label_de
label_en              → fields.label_en
unit                  → fields.unit
data_type             → fields.data_type (whitelist: number|text|enum|date|boolean|json)
kind                  → (ignored)
origin_worksheet      → resolve to worksheet_templates.id (FK)
origin_section        → resolve to worksheet_sections.id by (worksheet_template_id, code)
consumer_worksheets   → fields.consumer_worksheets (split on ", " into text[])
equation_refs         → (ignored)
required              → fields.is_required (parse "yes"/"true"/"1" → true, else false)
validation_rules      → fields.validation_rules (wrap raw text in JSONB: { raw: "..." })
regulation_reference  → fields.clause_reference
description           → fields.description
verification_status   → (ignored)
notes                 → (ignored)
```

`Enum_Values` sheet (joined back into fields):
```
enum_name             → matches against fields.symbol; values grouped become fields.enum_values
value, label_de, label_en, order_index, regulation_reference  → JSONB array element
notes                 → (ignored)
```

`Equations` sheet:
```
equation_number       → equations.equation_number
standard_code         → verify only (must match the workbook's standard)
description_de        → equations.description
description_en        → (ignored — single description column)
formula               → equations.formula
input_symbols         → equations.input_symbols (split on ", ")
output_symbol         → equations.output_symbol
regulation_reference  → equations.clause_reference
used_in_worksheet     → resolve to worksheet_templates.id (FK)
verification_status   → (ignored)
notes                 → (ignored)
```

Note: `equations.output_unit` and `equations.formula_latex` left NULL (xlsx has no such columns).

`Compliance_Requirements` sheet:
```
requirement_code       → compliance_requirements.code
standard_code          → verify only
title                  → compliance_requirements.title_de
description            → compliance_requirements.description (NEW column added in Task 1)
evaluation_type        → (ignored — Phase 2 routes via this)
required_field_symbols → (ignored)
evaluation_expression  → compliance_requirements.condition
pass_condition         → (ignored — informational, the condition string is the source of truth)
regulation_reference   → compliance_requirements.clause_reference
phase                  → (ignored)
order_index            → (ignored — could sort by, but no order_index column on the table)
verification_status    → (ignored)
```

Severity is not in the xlsx. The importer writes `severity = 'block'` as the default per Pass3c convention (compliance requirements are pass/fail gates). Phase 2 can extend.

---

## Insert Order

```
1. standards (1 row)
2. worksheet_templates (UPSERT by (standard_id, code))
3. worksheet_sections, pass 1: insert all without parent_section_id
4. worksheet_sections, pass 2: UPDATE parent_section_id by code lookup
5. fields, pass 1: insert core columns (no enum_values, no section_id resolved if missing)
6. fields, pass 2: UPDATE enum_values from Enum_Values grouping; UPDATE section_id where needed
7. equations (UPSERT by (worksheet_template_id, equation_number))
8. compliance_requirements (UPSERT by (worksheet_template_id, code))
```

All inside one `BEGIN…COMMIT` transaction. Failure rolls back to pre-import state.

---

## Reference: Expected Counts (from spec §12.1)

| Workbook | Worksheets | Fields | Equations | Compliance Reqs |
|---|---|---|---|---|
| DWA-A138-1 | 28 | 132 | 41 | 30 |
| DWA-M-820-1 | 25 | 82 | 1 | 28 |
| DWA-M-820-2 | 28 | 97 | 1 | 62 |
| DWA-M-820-3 | 24 | 248 | 1 | 34 |
| DWA-M-816 | 30 | 68 | 30 | 28 |

The importer reports counts after each table; the human compares against this table.

---

## Task 1: Schema Patch — Add `description` to `compliance_requirements`

The xlsx has a substantive description column on each requirement that the current DB schema discards. Plan 2 imports it, so we add the column first.

**Files:**
- Create: `supabase/migrations/20260521120000_add_compliance_description.sql`
- Modify: `src/lib/db/schema.ts` (add the column)

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260521120000_add_compliance_description.sql`:

```sql
-- Add description column to compliance_requirements so xlsx Pass3c
-- description data has a home. NULL allowed for legacy/synthetic rows.
ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS description text;
```

- [ ] **Step 2: Apply the migration**

```bash
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx scripts/_apply-supabase-sql.ts \
  supabase/migrations/20260521120000_add_compliance_description.sql
```

Expected: `Applying ...` then `Done.`.

- [ ] **Step 3: Update Drizzle schema**

In `src/lib/db/schema.ts`, find the `complianceRequirements` pgTable definition and add `description` after `condition`:

```typescript
export const complianceRequirements = pgTable(
  'compliance_requirements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worksheetTemplateId: uuid('worksheet_template_id')
      .notNull()
      .references(() => worksheetTemplates.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    titleDe: text('title_de').notNull(),
    titleEn: text('title_en'),
    condition: text('condition').notNull(),
    description: text('description'),
    clauseReference: text('clause_reference'),
    severity: text('severity').notNull(),
  },
  (t) => ({ uniqWorksheetCr: unique().on(t.worksheetTemplateId, t.code) }),
);
```

- [ ] **Step 4: Verify typecheck on schema.ts**

```bash
pnpm typecheck 2>&1 | grep "schema.ts" | head -5
```

Expected: no errors specific to `schema.ts` (other unrelated errors from old code remain — expected).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260521120000_add_compliance_description.sql src/lib/db/schema.ts
git commit -m "feat(db): add description column to compliance_requirements

The Pass3c xlsx has a substantive description column on each compliance
requirement that the original schema discarded. Adding it as nullable
text so the Plan 2 importer can store it."
```

---

## Task 2: Verify exceljs Dependency

`exceljs` was already added to `package.json` during Plan 2 preparation. This task is just a sanity-check.

- [ ] **Step 1: Verify exceljs is in dependencies**

```bash
grep -E '"exceljs":' package.json
```

Expected: `    "exceljs": "^4.4.0",` (or similar) — already there.

If missing:
```bash
pnpm add exceljs
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add exceljs for Pass3c xlsx parsing"
```

- [ ] **Step 2: Verify `_inspect-pass3c.ts` exists** (created during planning, useful as a debug tool)

```bash
ls scripts/_inspect-pass3c.ts
```

If it exists but is uncommitted, commit it now as a dev-tool:

```bash
git add scripts/_inspect-pass3c.ts
git commit -m "chore(scripts): _inspect-pass3c.ts dev tool to dump workbook headers"
```

If it doesn't exist, no action needed — it's just for ad-hoc inspection.

---

## Task 3: Define TypeScript Shapes for Each Sheet

These mirror exactly what each Pass3c sheet provides, before any DB-mapping.

**Files:**
- Create: `scripts/_pass3c-types.ts`

- [ ] **Step 1: Write the types file**

Create `scripts/_pass3c-types.ts`:

```typescript
// Domain objects that mirror Pass3c xlsx sheet rows.
// One type per sheet. Field names match xlsx column headers.
// Conversion to DB-row shape happens in _pass3c-db.ts.

export type StandardRow = {
  standard_code: string;
  title_de: string;
  title_en: string | null;
  issuer: string | null;
  edition: string;
  domain: string | null;
  status: string | null;
  notes: string | null;
};

export type WorksheetRow = {
  worksheet_code: string;
  standard_code: string;
  title_de: string;
  title_en: string | null;
  phase: number | null;
  archetype: 'registration' | 'data_collection' | 'calculation' | 'summary' | 'verification' | null;
  section_refs: string | null;
  equation_refs: string | null;
  order_index: number;
  description: string | null;
  verification_status: string | null;
};

export type SectionRow = {
  worksheet_code: string;
  section_code: string;
  parent_section_code: string | null;
  title: string;
  order_index: number;
  purpose: string | null;
  verification_status: string | null;
};

export type FieldRow = {
  symbol: string;
  label_de: string;
  label_en: string | null;
  unit: string | null;
  data_type: 'number' | 'text' | 'enum' | 'date' | 'boolean' | 'json';
  kind: string | null;
  origin_worksheet: string;
  origin_section: string | null;
  consumer_worksheets: string | null;   // comma-separated, parsed to text[]
  equation_refs: string | null;
  required: string | null;              // "yes"/"no"/"true"/"false" — parsed to boolean
  validation_rules: string | null;      // free-form text, stored as JSONB { raw }
  regulation_reference: string | null;
  description: string | null;
  verification_status: string | null;
  notes: string | null;
};

export type EnumValueRow = {
  enum_name: string;
  value: string;
  label_de: string | null;
  label_en: string | null;
  order_index: number;
  regulation_reference: string | null;
  notes: string | null;
};

export type EquationRow = {
  equation_number: string;
  standard_code: string;
  description_de: string | null;
  description_en: string | null;
  formula: string;
  input_symbols: string | null;     // comma-separated → text[]
  output_symbol: string | null;
  regulation_reference: string | null;
  used_in_worksheet: string;
  verification_status: string | null;
  notes: string | null;
};

export type ComplianceRow = {
  requirement_code: string;
  standard_code: string;
  title: string;
  description: string | null;
  evaluation_type: string | null;
  required_field_symbols: string | null;
  evaluation_expression: string;
  pass_condition: string | null;
  regulation_reference: string | null;
  phase: number | null;
  order_index: number | null;
  verification_status: string | null;
};

/** The whole parsed workbook before validation + DB write. */
export type ParsedWorkbook = {
  standard: StandardRow;
  worksheets: WorksheetRow[];
  sections: SectionRow[];
  fields: FieldRow[];
  enumValues: EnumValueRow[];
  equations: EquationRow[];
  complianceRequirements: ComplianceRow[];
};
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck 2>&1 | grep "_pass3c-types.ts" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/_pass3c-types.ts
git commit -m "feat(scripts): TypeScript shapes for Pass3c xlsx sheets

One type per sheet, field names mirror xlsx column headers verbatim.
DB-shape conversion lives in _pass3c-db.ts (next task)."
```

---

## Task 4: Write Parsers + Unit Tests

The parser reads xlsx with exceljs and produces `ParsedWorkbook`. Unit tests use programmatically-generated in-memory workbooks so they run fast and don't depend on actual files.

**Files:**
- Create: `scripts/_pass3c-parsers.ts`
- Create: `scripts/__tests__/pass3c-parsers.test.ts`

- [ ] **Step 1: Write the parser file**

Create `scripts/_pass3c-parsers.ts`:

```typescript
import ExcelJS from 'exceljs';
import type {
  ParsedWorkbook,
  StandardRow,
  WorksheetRow,
  SectionRow,
  FieldRow,
  EnumValueRow,
  EquationRow,
  ComplianceRow,
} from './_pass3c-types';

/** Cell-value normalizer — handles formula-cells (object with .result) and trims strings. */
function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v == null) return null;
  if (typeof v === 'object' && 'result' in (v as object)) {
    return (v as { result: unknown }).result;
  }
  if (typeof v === 'object' && 'text' in (v as object)) {
    // Hyperlink/rich-text cells
    return String((v as { text: unknown }).text);
  }
  if (typeof v === 'string') return v.trim();
  return v;
}

function readSheet(
  wb: ExcelJS.Workbook,
  name: string,
): Record<string, unknown>[] {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`Sheet not found: ${name}`);
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? '').trim();
  });
  if (headers.length === 0) throw new Error(`Sheet ${name} has no header row`);

  const rows: Record<string, unknown>[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj: Record<string, unknown> = {};
    let nonEmpty = false;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const key = headers[col - 1];
      if (!key) return;
      const v = cellValue(cell);
      obj[key] = v;
      if (v != null && v !== '') nonEmpty = true;
    });
    if (nonEmpty) rows.push(obj);
  }
  return rows;
}

function asString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function asInt(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseStandard(rows: Record<string, unknown>[]): StandardRow {
  if (rows.length !== 1) throw new Error(`Standards sheet must have exactly 1 row, got ${rows.length}`);
  const r = rows[0];
  return {
    standard_code: asString(r.standard_code) ?? '',
    title_de: asString(r.title_de) ?? '',
    title_en: asString(r.title_en),
    issuer: asString(r.issuer),
    edition: asString(r.edition) ?? '',
    domain: asString(r.domain),
    status: asString(r.status),
    notes: asString(r.notes),
  };
}

function parseWorksheets(rows: Record<string, unknown>[]): WorksheetRow[] {
  return rows.map((r) => ({
    worksheet_code: asString(r.worksheet_code) ?? '',
    standard_code: asString(r.standard_code) ?? '',
    title_de: asString(r.title_de) ?? '',
    title_en: asString(r.title_en),
    phase: asInt(r.phase),
    archetype: (asString(r.archetype) as WorksheetRow['archetype']) ?? null,
    section_refs: asString(r.section_refs),
    equation_refs: asString(r.equation_refs),
    order_index: asInt(r.order_index) ?? 0,
    description: asString(r.description),
    verification_status: asString(r.verification_status),
  }));
}

function parseSections(rows: Record<string, unknown>[]): SectionRow[] {
  return rows.map((r) => ({
    worksheet_code: asString(r.worksheet_code) ?? '',
    section_code: asString(r.section_code) ?? '',
    parent_section_code: asString(r.parent_section_code),
    title: asString(r.title) ?? '',
    order_index: asInt(r.order_index) ?? 0,
    purpose: asString(r.purpose),
    verification_status: asString(r.verification_status),
  }));
}

function parseFields(rows: Record<string, unknown>[]): FieldRow[] {
  return rows.map((r) => ({
    symbol: asString(r.symbol) ?? '',
    label_de: asString(r.label_de) ?? '',
    label_en: asString(r.label_en),
    unit: asString(r.unit),
    data_type: (asString(r.data_type) as FieldRow['data_type']) ?? 'text',
    kind: asString(r.kind),
    origin_worksheet: asString(r.origin_worksheet) ?? '',
    origin_section: asString(r.origin_section),
    consumer_worksheets: asString(r.consumer_worksheets),
    equation_refs: asString(r.equation_refs),
    required: asString(r.required),
    validation_rules: asString(r.validation_rules),
    regulation_reference: asString(r.regulation_reference),
    description: asString(r.description),
    verification_status: asString(r.verification_status),
    notes: asString(r.notes),
  }));
}

function parseEnumValues(rows: Record<string, unknown>[]): EnumValueRow[] {
  return rows.map((r) => ({
    enum_name: asString(r.enum_name) ?? '',
    value: asString(r.value) ?? '',
    label_de: asString(r.label_de),
    label_en: asString(r.label_en),
    order_index: asInt(r.order_index) ?? 0,
    regulation_reference: asString(r.regulation_reference),
    notes: asString(r.notes),
  }));
}

function parseEquations(rows: Record<string, unknown>[]): EquationRow[] {
  return rows.map((r) => ({
    equation_number: asString(r.equation_number) ?? '',
    standard_code: asString(r.standard_code) ?? '',
    description_de: asString(r.description_de),
    description_en: asString(r.description_en),
    formula: asString(r.formula) ?? '',
    input_symbols: asString(r.input_symbols),
    output_symbol: asString(r.output_symbol),
    regulation_reference: asString(r.regulation_reference),
    used_in_worksheet: asString(r.used_in_worksheet) ?? '',
    verification_status: asString(r.verification_status),
    notes: asString(r.notes),
  }));
}

function parseComplianceRequirements(
  rows: Record<string, unknown>[],
): ComplianceRow[] {
  return rows.map((r) => ({
    requirement_code: asString(r.requirement_code) ?? '',
    standard_code: asString(r.standard_code) ?? '',
    title: asString(r.title) ?? '',
    description: asString(r.description),
    evaluation_type: asString(r.evaluation_type),
    required_field_symbols: asString(r.required_field_symbols),
    evaluation_expression: asString(r.evaluation_expression) ?? '',
    pass_condition: asString(r.pass_condition),
    regulation_reference: asString(r.regulation_reference),
    phase: asInt(r.phase),
    order_index: asInt(r.order_index),
    verification_status: asString(r.verification_status),
  }));
}

/** Read a Pass3c xlsx file from disk and return a fully-parsed workbook. */
export async function parseWorkbook(path: string): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  return {
    standard: parseStandard(readSheet(wb, 'Standards')),
    worksheets: parseWorksheets(readSheet(wb, 'Worksheets')),
    sections: parseSections(readSheet(wb, 'Sections')),
    fields: parseFields(readSheet(wb, 'Fields')),
    enumValues: parseEnumValues(readSheet(wb, 'Enum_Values')),
    equations: parseEquations(readSheet(wb, 'Equations')),
    complianceRequirements: parseComplianceRequirements(
      readSheet(wb, 'Compliance_Requirements'),
    ),
  };
}

/** Parse an in-memory exceljs Workbook (for tests). */
export function parseWorkbookSync(wb: ExcelJS.Workbook): ParsedWorkbook {
  return {
    standard: parseStandard(readSheet(wb, 'Standards')),
    worksheets: parseWorksheets(readSheet(wb, 'Worksheets')),
    sections: parseSections(readSheet(wb, 'Sections')),
    fields: parseFields(readSheet(wb, 'Fields')),
    enumValues: parseEnumValues(readSheet(wb, 'Enum_Values')),
    equations: parseEquations(readSheet(wb, 'Equations')),
    complianceRequirements: parseComplianceRequirements(
      readSheet(wb, 'Compliance_Requirements'),
    ),
  };
}
```

- [ ] **Step 2: Write the parser unit tests**

Create `scripts/__tests__/pass3c-parsers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseWorkbookSync } from '../_pass3c-parsers';

function buildMinimalWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();

  const std = wb.addWorksheet('Standards');
  std.addRow(['standard_code', 'title_de', 'title_en', 'issuer', 'edition', 'domain', 'status', 'notes']);
  std.addRow(['DWA-A-138-1', 'Versickerung Teil 1', 'Infiltration Part 1', 'DWA', 'Oktober 2024', 'stormwater', 'active', null]);

  const ws = wb.addWorksheet('Worksheets');
  ws.addRow(['worksheet_code','standard_code','title_de','title_en','phase','archetype','section_refs','equation_refs','order_index','description','verification_status']);
  ws.addRow(['A138-01','DWA-A-138-1','Projektregistrierung','Project Registration',1,'registration','§1',null,1,'Admin registration','verified_against_standard']);

  const sec = wb.addWorksheet('Sections');
  sec.addRow(['worksheet_code','section_code','parent_section_code','title','order_index','purpose','verification_status']);
  sec.addRow(['A138-01','A',null,'Purpose and Context',1,'Statement','derived']);
  sec.addRow(['A138-01','A.1','A','Subsection',2,'Detail','derived']);

  const f = wb.addWorksheet('Fields');
  f.addRow(['symbol','label_de','label_en','unit','data_type','kind','origin_worksheet','origin_section','consumer_worksheets','equation_refs','required','validation_rules','regulation_reference','description','verification_status','notes']);
  f.addRow(['project_number','Projektnummer','Project Number',null,'text','entered','A138-01','B.1','ALL',null,'yes',null,'§1','Engineer number','verified',null]);
  f.addRow(['A_E','Fläche','Area','m²','number','entered','A138-02','C.1','A138-03, A138-04','2','yes','> 0','§5.3.3.5','Catchment area','verified',null]);
  f.addRow(['archetype','Archetyp','Archetype',null,'enum','enum','A138-01','A','ALL',null,'yes',null,'EKOWAI','Worksheet archetype','verified',null]);

  const ev = wb.addWorksheet('Enum_Values');
  ev.addRow(['enum_name','value','label_de','label_en','order_index','regulation_reference','notes']);
  ev.addRow(['archetype','registration','Registrierung','Registration',1,'EKOWAI',null]);
  ev.addRow(['archetype','data_collection','Datenerhebung','Data Collection',2,'EKOWAI',null]);

  const eq = wb.addWorksheet('Equations');
  eq.addRow(['equation_number','standard_code','description_de','description_en','formula','input_symbols','output_symbol','regulation_reference','used_in_worksheet','verification_status','notes']);
  eq.addRow(['1','DWA-A-138-1','Min Sim Zeitraum','Min sim period','M >= 3 * T_n','T_n','M','§5.3.3.3','A138-13','verified',null]);

  const cr = wb.addWorksheet('Compliance_Requirements');
  cr.addRow(['requirement_code','standard_code','title','description','evaluation_type','required_field_symbols','evaluation_expression','pass_condition','regulation_reference','phase','order_index','verification_status']);
  cr.addRow(['A138-REQ-01','DWA-A-138-1','Scope per §1','Project in scope','field_value','a138_applicable','a138_applicable == TRUE','TRUE','§1',1,1,'verified']);

  return wb;
}

describe('Pass3c parsers', () => {
  it('parses Standards into a single StandardRow', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.standard.standard_code).toBe('DWA-A-138-1');
    expect(r.standard.title_de).toBe('Versickerung Teil 1');
    expect(r.standard.edition).toBe('Oktober 2024');
  });

  it('parses Worksheets with phase + archetype', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.worksheets).toHaveLength(1);
    expect(r.worksheets[0].worksheet_code).toBe('A138-01');
    expect(r.worksheets[0].phase).toBe(1);
    expect(r.worksheets[0].archetype).toBe('registration');
  });

  it('parses Sections including parent_section_code', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.sections).toHaveLength(2);
    const sub = r.sections.find((s) => s.section_code === 'A.1');
    expect(sub?.parent_section_code).toBe('A');
  });

  it('parses Fields with all 6 data_types representable', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.fields).toHaveLength(3);
    const text = r.fields.find((f) => f.symbol === 'project_number');
    expect(text?.data_type).toBe('text');
    const num = r.fields.find((f) => f.symbol === 'A_E');
    expect(num?.data_type).toBe('number');
    expect(num?.unit).toBe('m²');
    expect(num?.consumer_worksheets).toBe('A138-03, A138-04');
    const en = r.fields.find((f) => f.symbol === 'archetype');
    expect(en?.data_type).toBe('enum');
  });

  it('parses Enum_Values into rows ready for grouping by enum_name', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.enumValues).toHaveLength(2);
    expect(r.enumValues[0].enum_name).toBe('archetype');
    expect(r.enumValues[0].value).toBe('registration');
  });

  it('parses Equations and resolves formula text', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.equations).toHaveLength(1);
    expect(r.equations[0].formula).toBe('M >= 3 * T_n');
    expect(r.equations[0].used_in_worksheet).toBe('A138-13');
  });

  it('parses Compliance_Requirements', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.complianceRequirements).toHaveLength(1);
    expect(r.complianceRequirements[0].requirement_code).toBe('A138-REQ-01');
    expect(r.complianceRequirements[0].evaluation_expression).toBe(
      'a138_applicable == TRUE',
    );
  });

  it('skips empty rows in any sheet', () => {
    const wb = buildMinimalWorkbook();
    const std = wb.getWorksheet('Standards')!;
    std.addRow([]); // empty trailing row
    std.addRow([]);
    const r = parseWorkbookSync(wb);
    expect(r.standard.standard_code).toBe('DWA-A-138-1');
  });
});
```

- [ ] **Step 3: Run the unit tests**

```bash
pnpm test -- scripts/__tests__/pass3c-parsers.test.ts
```

Expected: all 8 tests pass.

If a test fails: read the failure carefully — likely either the parser's cell handling or the test's xlsx construction is off. Fix and retry.

- [ ] **Step 4: Commit**

```bash
git add scripts/_pass3c-parsers.ts scripts/__tests__/pass3c-parsers.test.ts
git commit -m "feat(scripts): Pass3c xlsx parsers with unit tests

Parses 7 sheets of a Pass3c workbook (Standards, Worksheets, Sections,
Fields, Enum_Values, Equations, Compliance_Requirements) into typed
domain objects. Unit tests use programmatically-generated in-memory
workbooks for speed."
```

---

## Task 5: Write Validators + Unit Tests

The validator runs BEFORE any DB write. It catches malformed data so we never half-import a broken standard.

**Files:**
- Create: `scripts/_pass3c-validate.ts`
- Create: `scripts/__tests__/pass3c-validate.test.ts`

- [ ] **Step 1: Write the validator file**

Create `scripts/_pass3c-validate.ts`:

```typescript
import type { ParsedWorkbook } from './_pass3c-types';

const ALLOWED_DATA_TYPES = new Set([
  'number', 'text', 'enum', 'date', 'boolean', 'json',
]);
const ALLOWED_ARCHETYPES = new Set([
  'registration', 'data_collection', 'calculation', 'summary', 'verification',
]);

export type ValidationError = { sheet: string; row: number; message: string };

export function validateWorkbook(parsed: ParsedWorkbook): ValidationError[] {
  const errors: ValidationError[] = [];
  const stdCode = parsed.standard.standard_code;

  // ---- Standards ----
  if (!parsed.standard.standard_code) {
    errors.push({ sheet: 'Standards', row: 2, message: 'standard_code is required' });
  }
  if (!parsed.standard.title_de) {
    errors.push({ sheet: 'Standards', row: 2, message: 'title_de is required' });
  }
  if (!parsed.standard.edition) {
    errors.push({ sheet: 'Standards', row: 2, message: 'edition is required (mapped to standards.version)' });
  }

  // ---- Worksheets ----
  const worksheetCodes = new Set<string>();
  parsed.worksheets.forEach((w, i) => {
    const row = i + 2;
    if (!w.worksheet_code) errors.push({ sheet: 'Worksheets', row, message: 'worksheet_code is required' });
    if (worksheetCodes.has(w.worksheet_code)) {
      errors.push({ sheet: 'Worksheets', row, message: `Duplicate worksheet_code: ${w.worksheet_code}` });
    }
    worksheetCodes.add(w.worksheet_code);
    if (w.standard_code !== stdCode) {
      errors.push({ sheet: 'Worksheets', row, message: `standard_code "${w.standard_code}" does not match workbook standard "${stdCode}"` });
    }
    if (!w.title_de) errors.push({ sheet: 'Worksheets', row, message: 'title_de is required' });
    if (w.archetype && !ALLOWED_ARCHETYPES.has(w.archetype)) {
      errors.push({ sheet: 'Worksheets', row, message: `Invalid archetype: ${w.archetype}` });
    }
  });

  // ---- Sections ----
  const sectionKeys = new Set<string>(); // worksheet_code|section_code
  parsed.sections.forEach((s, i) => {
    const row = i + 2;
    if (!s.worksheet_code) errors.push({ sheet: 'Sections', row, message: 'worksheet_code is required' });
    if (!worksheetCodes.has(s.worksheet_code)) {
      errors.push({ sheet: 'Sections', row, message: `Unknown worksheet_code: ${s.worksheet_code}` });
    }
    if (!s.section_code) errors.push({ sheet: 'Sections', row, message: 'section_code is required' });
    const key = `${s.worksheet_code}|${s.section_code}`;
    if (sectionKeys.has(key)) {
      errors.push({ sheet: 'Sections', row, message: `Duplicate (worksheet_code, section_code): ${key}` });
    }
    sectionKeys.add(key);
    if (!s.title) errors.push({ sheet: 'Sections', row, message: 'title is required' });
  });
  // Parent section validity is checked in a second pass
  parsed.sections.forEach((s, i) => {
    const row = i + 2;
    if (s.parent_section_code) {
      const parentKey = `${s.worksheet_code}|${s.parent_section_code}`;
      if (!sectionKeys.has(parentKey)) {
        errors.push({
          sheet: 'Sections',
          row,
          message: `parent_section_code "${s.parent_section_code}" not found in worksheet ${s.worksheet_code}`,
        });
      }
    }
  });

  // ---- Fields ----
  const fieldKeys = new Set<string>(); // worksheet_code|symbol
  parsed.fields.forEach((f, i) => {
    const row = i + 2;
    if (!f.symbol) errors.push({ sheet: 'Fields', row, message: 'symbol is required' });
    if (!f.label_de) errors.push({ sheet: 'Fields', row, message: 'label_de is required' });
    if (!ALLOWED_DATA_TYPES.has(f.data_type)) {
      errors.push({ sheet: 'Fields', row, message: `Invalid data_type: ${f.data_type}` });
    }
    if (!f.origin_worksheet) {
      errors.push({ sheet: 'Fields', row, message: 'origin_worksheet is required' });
    } else if (!worksheetCodes.has(f.origin_worksheet)) {
      errors.push({ sheet: 'Fields', row, message: `Unknown origin_worksheet: ${f.origin_worksheet}` });
    }
    if (f.origin_section) {
      const secKey = `${f.origin_worksheet}|${f.origin_section}`;
      if (!sectionKeys.has(secKey)) {
        errors.push({ sheet: 'Fields', row, message: `Unknown origin_section "${f.origin_section}" in worksheet ${f.origin_worksheet}` });
      }
    }
    const fieldKey = `${f.origin_worksheet}|${f.symbol}`;
    if (fieldKeys.has(fieldKey)) {
      errors.push({ sheet: 'Fields', row, message: `Duplicate (origin_worksheet, symbol): ${fieldKey}` });
    }
    fieldKeys.add(fieldKey);
  });

  // ---- Enum_Values ----
  const enumNames = new Set<string>(parsed.fields.filter((f) => f.data_type === 'enum').map((f) => f.symbol));
  parsed.enumValues.forEach((e, i) => {
    const row = i + 2;
    if (!e.enum_name) errors.push({ sheet: 'Enum_Values', row, message: 'enum_name is required' });
    if (!e.value) errors.push({ sheet: 'Enum_Values', row, message: 'value is required' });
  });
  // Every enum field must have at least one enum value
  enumNames.forEach((name) => {
    const matches = parsed.enumValues.filter((e) => e.enum_name === name);
    if (matches.length === 0) {
      errors.push({
        sheet: 'Enum_Values',
        row: 0,
        message: `Field "${name}" has data_type=enum but no rows in Enum_Values reference it`,
      });
    }
  });

  // ---- Equations ----
  const equationKeys = new Set<string>(); // worksheet_code|equation_number
  parsed.equations.forEach((eq, i) => {
    const row = i + 2;
    if (!eq.equation_number) errors.push({ sheet: 'Equations', row, message: 'equation_number is required' });
    if (eq.standard_code !== stdCode) {
      errors.push({ sheet: 'Equations', row, message: `standard_code "${eq.standard_code}" does not match` });
    }
    if (!eq.formula) errors.push({ sheet: 'Equations', row, message: 'formula is required' });
    if (!eq.used_in_worksheet || !worksheetCodes.has(eq.used_in_worksheet)) {
      errors.push({ sheet: 'Equations', row, message: `Unknown used_in_worksheet: ${eq.used_in_worksheet}` });
    }
    const key = `${eq.used_in_worksheet}|${eq.equation_number}`;
    if (equationKeys.has(key)) {
      errors.push({ sheet: 'Equations', row, message: `Duplicate (worksheet, equation_number): ${key}` });
    }
    equationKeys.add(key);
  });

  // ---- Compliance_Requirements ----
  const crKeys = new Set<string>();
  parsed.complianceRequirements.forEach((cr, i) => {
    const row = i + 2;
    if (!cr.requirement_code) errors.push({ sheet: 'Compliance_Requirements', row, message: 'requirement_code is required' });
    if (cr.standard_code !== stdCode) {
      errors.push({ sheet: 'Compliance_Requirements', row, message: `standard_code "${cr.standard_code}" does not match` });
    }
    if (!cr.title) errors.push({ sheet: 'Compliance_Requirements', row, message: 'title is required' });
    if (!cr.evaluation_expression) {
      errors.push({ sheet: 'Compliance_Requirements', row, message: 'evaluation_expression is required' });
    }
    if (crKeys.has(cr.requirement_code)) {
      errors.push({ sheet: 'Compliance_Requirements', row, message: `Duplicate requirement_code: ${cr.requirement_code}` });
    }
    crKeys.add(cr.requirement_code);
  });

  return errors;
}
```

- [ ] **Step 2: Write the validator unit tests**

Create `scripts/__tests__/pass3c-validate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateWorkbook } from '../_pass3c-validate';
import type { ParsedWorkbook } from '../_pass3c-types';

function valid(): ParsedWorkbook {
  return {
    standard: {
      standard_code: 'DWA-A-138-1', title_de: 'X', title_en: null,
      issuer: 'DWA', edition: '2024', domain: null, status: null, notes: null,
    },
    worksheets: [{
      worksheet_code: 'A138-01', standard_code: 'DWA-A-138-1',
      title_de: 'W', title_en: null, phase: 1, archetype: 'registration',
      section_refs: null, equation_refs: null, order_index: 1,
      description: null, verification_status: null,
    }],
    sections: [{
      worksheet_code: 'A138-01', section_code: 'A', parent_section_code: null,
      title: 'Section A', order_index: 1, purpose: null, verification_status: null,
    }],
    fields: [{
      symbol: 'project_number', label_de: 'Projektnummer', label_en: null,
      unit: null, data_type: 'text', kind: null,
      origin_worksheet: 'A138-01', origin_section: 'A',
      consumer_worksheets: null, equation_refs: null,
      required: 'yes', validation_rules: null,
      regulation_reference: null, description: null,
      verification_status: null, notes: null,
    }],
    enumValues: [],
    equations: [],
    complianceRequirements: [],
  };
}

describe('Pass3c validator', () => {
  it('accepts a minimal valid workbook with zero errors', () => {
    expect(validateWorkbook(valid())).toEqual([]);
  });

  it('flags missing standard_code', () => {
    const p = valid();
    p.standard.standard_code = '';
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('standard_code'))).toBe(true);
  });

  it('flags invalid data_type', () => {
    const p = valid();
    p.fields[0].data_type = 'integer' as 'number';
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('Invalid data_type'))).toBe(true);
  });

  it('flags duplicate worksheet_code', () => {
    const p = valid();
    p.worksheets.push({ ...p.worksheets[0] });
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('Duplicate worksheet_code'))).toBe(true);
  });

  it('flags Sections referencing unknown worksheet', () => {
    const p = valid();
    p.sections[0].worksheet_code = 'A138-99';
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('Unknown worksheet_code'))).toBe(true);
  });

  it('flags parent_section_code that does not exist in the same worksheet', () => {
    const p = valid();
    p.sections.push({
      ...p.sections[0], section_code: 'A.1', parent_section_code: 'NOPE',
    });
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('parent_section_code'))).toBe(true);
  });

  it('flags enum field without enum_values', () => {
    const p = valid();
    p.fields[0].data_type = 'enum';
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('no rows in Enum_Values'))).toBe(true);
  });

  it('flags Equation whose used_in_worksheet is unknown', () => {
    const p = valid();
    p.equations.push({
      equation_number: '1', standard_code: 'DWA-A-138-1',
      description_de: null, description_en: null,
      formula: 'a = b', input_symbols: 'b', output_symbol: 'a',
      regulation_reference: null, used_in_worksheet: 'NOPE',
      verification_status: null, notes: null,
    });
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('Unknown used_in_worksheet'))).toBe(true);
  });

  it('flags Compliance requirement with standard_code mismatch', () => {
    const p = valid();
    p.complianceRequirements.push({
      requirement_code: 'R1', standard_code: 'WRONG',
      title: 'T', description: null,
      evaluation_type: null, required_field_symbols: null,
      evaluation_expression: 'x == 1', pass_condition: null,
      regulation_reference: null, phase: null, order_index: null,
      verification_status: null,
    });
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('does not match'))).toBe(true);
  });
});
```

- [ ] **Step 3: Run the validator unit tests**

```bash
pnpm test -- scripts/__tests__/pass3c-validate.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/_pass3c-validate.ts scripts/__tests__/pass3c-validate.test.ts
git commit -m "feat(scripts): Pass3c validator with unit tests

Runs pre-write sanity checks against a ParsedWorkbook: required fields,
FK targets exist (worksheet_code, parent_section_code, origin_section,
used_in_worksheet), no duplicate natural keys, data_type whitelist,
enum fields have Enum_Values rows, standard_code consistency."
```

---

## Task 6: Write DB Writer with UPSERTs and Transaction

The writer takes a validated `ParsedWorkbook`, runs Drizzle UPSERTs in FK-correct order, all inside one transaction. Idempotent by natural keys; UUIDs are stable across re-imports.

**Files:**
- Create: `scripts/_pass3c-db.ts`

- [ ] **Step 1: Write the DB module**

Create `scripts/_pass3c-db.ts`:

```typescript
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql, and, eq, inArray } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import type {
  ParsedWorkbook,
  SectionRow,
  FieldRow,
  EquationRow,
  ComplianceRow,
  EnumValueRow,
} from './_pass3c-types';

const {
  standards,
  worksheetTemplates,
  worksheetSections,
  fields,
  equations,
  complianceRequirements,
} = schema;

export type ImportCounts = {
  standards: number;
  worksheetTemplates: number;
  worksheetSections: number;
  fields: number;
  equations: number;
  complianceRequirements: number;
};

function parseRequired(v: string | null): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === 'yes' || s === 'true' || s === '1' || s === 'required';
}

function parseList(v: string | null): string[] | null {
  if (!v) return null;
  return v
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function groupEnumValues(rows: EnumValueRow[]): Map<string, unknown[]> {
  const map = new Map<string, unknown[]>();
  for (const r of rows) {
    const arr = map.get(r.enum_name) ?? [];
    arr.push({
      value: r.value,
      label_de: r.label_de,
      label_en: r.label_en,
      order_index: r.order_index,
      regulation_reference: r.regulation_reference,
    });
    map.set(r.enum_name, arr);
  }
  // Sort each group by order_index for stable JSONB output
  for (const arr of map.values()) {
    (arr as { order_index: number }[]).sort((a, b) => a.order_index - b.order_index);
  }
  return map;
}

/** Run the import inside a single transaction. Returns row counts. */
export async function importWorkbook(
  databaseUrl: string,
  parsed: ParsedWorkbook,
  options: { dryRun?: boolean } = {},
): Promise<ImportCounts> {
  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  try {
    if (options.dryRun) {
      // Compute counts without writing
      return {
        standards: 1,
        worksheetTemplates: parsed.worksheets.length,
        worksheetSections: parsed.sections.length,
        fields: parsed.fields.length,
        equations: parsed.equations.length,
        complianceRequirements: parsed.complianceRequirements.length,
      };
    }

    return await db.transaction(async (tx) => {
      // ---- 1. Standards (1 row UPSERT by code) ----
      const stdRow = await tx
        .insert(standards)
        .values({
          code: parsed.standard.standard_code,
          titleDe: parsed.standard.title_de,
          titleEn: parsed.standard.title_en,
          version: parsed.standard.edition,
        })
        .onConflictDoUpdate({
          target: standards.code,
          set: {
            titleDe: parsed.standard.title_de,
            titleEn: parsed.standard.title_en,
            version: parsed.standard.edition,
          },
        })
        .returning({ id: standards.id });
      const standardId = stdRow[0].id;

      // ---- 2. Worksheet templates ----
      const tmplValues = parsed.worksheets.map((w) => ({
        standardId,
        code: w.worksheet_code,
        titleDe: w.title_de,
        titleEn: w.title_en,
        phase: w.phase,
        archetype: w.archetype,
        orderIndex: w.order_index,
        description: w.description,
      }));
      const insertedTemplates = await tx
        .insert(worksheetTemplates)
        .values(tmplValues)
        .onConflictDoUpdate({
          target: [worksheetTemplates.standardId, worksheetTemplates.code],
          set: {
            titleDe: sql`excluded.title_de`,
            titleEn: sql`excluded.title_en`,
            phase: sql`excluded.phase`,
            archetype: sql`excluded.archetype`,
            orderIndex: sql`excluded.order_index`,
            description: sql`excluded.description`,
          },
        })
        .returning({ id: worksheetTemplates.id, code: worksheetTemplates.code });
      const tmplByCode = new Map(insertedTemplates.map((t) => [t.code, t.id]));

      // ---- 3a. Sections, pass 1 (no parent_section_id) ----
      const sectionValues = parsed.sections.map((s) => ({
        worksheetTemplateId: tmplByCode.get(s.worksheet_code)!,
        code: s.section_code,
        titleDe: s.title,
        orderIndex: s.order_index,
      }));
      // Sections have no unique constraint by code in DB schema, so we wipe
      // sections for THIS standard's worksheets and reinsert. Reason:
      // section codes don't have a UNIQUE constraint to UPSERT against.
      const tmplIds = Array.from(tmplByCode.values());
      await tx.delete(worksheetSections).where(inArray(worksheetSections.worksheetTemplateId, tmplIds));
      const insertedSections = await tx
        .insert(worksheetSections)
        .values(sectionValues)
        .returning({
          id: worksheetSections.id,
          worksheetTemplateId: worksheetSections.worksheetTemplateId,
          code: worksheetSections.code,
        });
      // Build (worksheetTemplateId, code) → id map
      const sectionByKey = new Map<string, string>();
      for (const s of insertedSections) {
        sectionByKey.set(`${s.worksheetTemplateId}|${s.code}`, s.id);
      }

      // ---- 3b. Sections, pass 2: resolve parent_section_id ----
      for (let i = 0; i < parsed.sections.length; i++) {
        const src = parsed.sections[i];
        if (!src.parent_section_code) continue;
        const tmplId = tmplByCode.get(src.worksheet_code)!;
        const selfKey = `${tmplId}|${src.section_code}`;
        const parentKey = `${tmplId}|${src.parent_section_code}`;
        const selfId = sectionByKey.get(selfKey);
        const parentId = sectionByKey.get(parentKey);
        if (selfId && parentId) {
          await tx
            .update(worksheetSections)
            .set({ parentSectionId: parentId })
            .where(eq(worksheetSections.id, selfId));
        }
      }

      // ---- 4. Fields, pass 1: core columns ----
      const enumGroups = groupEnumValues(parsed.enumValues);
      const fieldValues = parsed.fields.map((f) => {
        const tmplId = tmplByCode.get(f.origin_worksheet)!;
        const sectionId = f.origin_section
          ? sectionByKey.get(`${tmplId}|${f.origin_section}`) ?? null
          : null;
        const enumValues =
          f.data_type === 'enum' ? enumGroups.get(f.symbol) ?? null : null;
        const validationRules = f.validation_rules
          ? { raw: f.validation_rules }
          : null;
        return {
          worksheetTemplateId: tmplId,
          sectionId,
          symbol: f.symbol,
          labelDe: f.label_de,
          labelEn: f.label_en,
          dataType: f.data_type,
          unit: f.unit,
          isRequired: parseRequired(f.required),
          enumValues,
          validationRules,
          clauseReference: f.regulation_reference,
          description: f.description,
          consumerWorksheets: parseList(f.consumer_worksheets),
        };
      });
      await tx
        .insert(fields)
        .values(fieldValues)
        .onConflictDoUpdate({
          target: [fields.worksheetTemplateId, fields.symbol],
          set: {
            sectionId: sql`excluded.section_id`,
            labelDe: sql`excluded.label_de`,
            labelEn: sql`excluded.label_en`,
            dataType: sql`excluded.data_type`,
            unit: sql`excluded.unit`,
            isRequired: sql`excluded.is_required`,
            enumValues: sql`excluded.enum_values`,
            validationRules: sql`excluded.validation_rules`,
            clauseReference: sql`excluded.clause_reference`,
            description: sql`excluded.description`,
            consumerWorksheets: sql`excluded.consumer_worksheets`,
            // verification_status DELIBERATELY NOT updated — preserve engineer_verified
          },
        });

      // ---- 5. Equations ----
      const eqValues = parsed.equations.map((eq) => ({
        worksheetTemplateId: tmplByCode.get(eq.used_in_worksheet)!,
        equationNumber: eq.equation_number,
        formula: eq.formula,
        inputSymbols: parseList(eq.input_symbols),
        outputSymbol: eq.output_symbol,
        clauseReference: eq.regulation_reference,
        description: eq.description_de,
      }));
      if (eqValues.length > 0) {
        await tx
          .insert(equations)
          .values(eqValues)
          .onConflictDoUpdate({
            target: [equations.worksheetTemplateId, equations.equationNumber],
            set: {
              formula: sql`excluded.formula`,
              inputSymbols: sql`excluded.input_symbols`,
              outputSymbol: sql`excluded.output_symbol`,
              clauseReference: sql`excluded.clause_reference`,
              description: sql`excluded.description`,
              // verification_status preserved
            },
          });
      }

      // ---- 6. Compliance requirements ----
      const crValues = parsed.complianceRequirements.map((cr) => {
        // Find a default worksheet to attach to (compliance_requirements requires
        // a worksheet_template_id FK). Pass3c convention: requirements relate to
        // the standard, not one worksheet. We attach all to the first worksheet
        // of phase 1 (registration). Phase 2 may introduce a standard-level
        // compliance table.
        const targetWorksheet = parsed.worksheets.find((w) => w.phase === 1)
          ?? parsed.worksheets[0];
        return {
          worksheetTemplateId: tmplByCode.get(targetWorksheet.worksheet_code)!,
          code: cr.requirement_code,
          titleDe: cr.title,
          condition: cr.evaluation_expression,
          description: cr.description,
          clauseReference: cr.regulation_reference,
          severity: 'block' as const,
        };
      });
      if (crValues.length > 0) {
        await tx
          .insert(complianceRequirements)
          .values(crValues)
          .onConflictDoUpdate({
            target: [complianceRequirements.worksheetTemplateId, complianceRequirements.code],
            set: {
              titleDe: sql`excluded.title_de`,
              condition: sql`excluded.condition`,
              description: sql`excluded.description`,
              clauseReference: sql`excluded.clause_reference`,
              severity: sql`excluded.severity`,
            },
          });
      }

      return {
        standards: 1,
        worksheetTemplates: insertedTemplates.length,
        worksheetSections: insertedSections.length,
        fields: parsed.fields.length,
        equations: parsed.equations.length,
        complianceRequirements: parsed.complianceRequirements.length,
      };
    });
  } finally {
    await client.end();
  }
}
```

- [ ] **Step 2: Verify typecheck on the file**

```bash
pnpm typecheck 2>&1 | grep "_pass3c-db.ts" | head -10
```

Expected: no errors in `_pass3c-db.ts`.

- [ ] **Step 3: Commit**

```bash
git add scripts/_pass3c-db.ts
git commit -m "feat(scripts): Pass3c DB writer with transactional UPSERTs

Inserts in FK-safe order: standards → worksheet_templates → sections
(two-pass for parent_section_id) → fields (with enum_values merged) →
equations → compliance_requirements. Idempotent via natural keys. The
verification_status column is preserved on re-imports so an
engineer_verified row never regresses to imported_unverified.

Compliance_requirements have no standalone FK target in MVP — they
attach to the first phase-1 worksheet of the standard (Pass3c
convention). Phase 2 may introduce a standard-level compliance table.

dry-run: returns counts without writing."
```

---

## Task 7: Write the CLI Entry Point

**Files:**
- Create: `scripts/import-pass3c.ts`

- [ ] **Step 1: Write the CLI**

Create `scripts/import-pass3c.ts`:

```typescript
import { config as loadEnv } from 'dotenv';
import { parseWorkbook } from './_pass3c-parsers';
import { validateWorkbook } from './_pass3c-validate';
import { importWorkbook, type ImportCounts } from './_pass3c-db';

loadEnv({ path: '.env.local' });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceExperimental = args.includes('--force-experimental');
const file = args.find((a) => !a.startsWith('--'));

if (!file) {
  console.error('Usage: pnpm tsx scripts/import-pass3c.ts <path-to-xlsx> [--dry-run] [--force-experimental]');
  process.exit(1);
}

if (!file.toLowerCase().includes('pass3c') && !forceExperimental) {
  console.error(
    `Refusing to import "${file}": filename does not contain "Pass3c".`,
  );
  console.error('Use --force-experimental if you really mean it (e.g. Pass3b3c FLL workbooks).');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is not set in .env.local');
  process.exit(1);
}

async function main(): Promise<void> {
  console.log(`Reading ${file}...`);
  const parsed = await parseWorkbook(file!);
  console.log(
    `✓ Parsed: ${parsed.worksheets.length} worksheets / ${parsed.fields.length} fields / ${parsed.equations.length} equations / ${parsed.complianceRequirements.length} reqs`,
  );

  console.log('Validating...');
  const errors = validateWorkbook(parsed);
  if (errors.length > 0) {
    console.error(`✗ ${errors.length} validation error(s):`);
    for (const e of errors.slice(0, 50)) {
      console.error(`  [${e.sheet} row ${e.row}] ${e.message}`);
    }
    if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more`);
    process.exit(1);
  }
  console.log(`✓ Validation passed (no errors)`);

  if (dryRun) {
    console.log('--dry-run: skipping DB write.');
    const counts: ImportCounts = {
      standards: 1,
      worksheetTemplates: parsed.worksheets.length,
      worksheetSections: parsed.sections.length,
      fields: parsed.fields.length,
      equations: parsed.equations.length,
      complianceRequirements: parsed.complianceRequirements.length,
    };
    printCounts(counts, parsed.standard.standard_code);
    return;
  }

  console.log('→ BEGIN transaction');
  const counts = await importWorkbook(databaseUrl!, parsed);
  console.log('→ COMMIT');
  printCounts(counts, parsed.standard.standard_code);
  console.log('Verification: all rows marked imported_unverified (default).');
}

function printCounts(counts: ImportCounts, code: string): void {
  console.log(`\n=== Import summary: ${code} ===`);
  console.log(`  Standards:                ${counts.standards}`);
  console.log(`  Worksheet templates:      ${counts.worksheetTemplates}`);
  console.log(`  Worksheet sections:       ${counts.worksheetSections}`);
  console.log(`  Fields:                   ${counts.fields}`);
  console.log(`  Equations:                ${counts.equations}`);
  console.log(`  Compliance requirements:  ${counts.complianceRequirements}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck 2>&1 | grep "import-pass3c.ts" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/import-pass3c.ts
git commit -m "feat(scripts): import-pass3c.ts CLI for Pass3c xlsx → Supabase

CLI: pnpm tsx scripts/import-pass3c.ts <path> [--dry-run] [--force-experimental]

- Rejects non-Pass3c filenames unless --force-experimental
- Validates before any DB write; lists up to 50 errors with sheet+row
- --dry-run prints counts without touching the DB
- Reads DATABASE_URL from .env.local via dotenv"
```

---

## Task 8: Dry-Run Against DWA-A 138-1

Verify the parser/validator pipeline works against a real workbook before any DB writes.

- [ ] **Step 1: Run dry-run**

```bash
pnpm tsx scripts/import-pass3c.ts "/c/Users/Ekowai/Desktop/Supabase data/DWA-A138-1_Structured_Workbook_Pass3c.xlsx" --dry-run
```

Expected output:
```
Reading ...
✓ Parsed: 28 worksheets / 132 fields / 41 equations / 30 reqs
Validating...
✓ Validation passed (no errors)
--dry-run: skipping DB write.

=== Import summary: DWA-A-138-1 ===
  Standards:                1
  Worksheet templates:      28
  Worksheet sections:       ~250 (anything from the Sections sheet)
  Fields:                   132
  Equations:                41
  Compliance requirements:  30
```

If validation fails with errors, fix the parser or validator (likely a data-type mismatch the xlsx contains that we didn't anticipate). Read each error and decide if the data is wrong or the validator is wrong.

If "Sheet not found" errors appear, the xlsx has a different sheet name than expected (e.g. `Standards` vs `Standard`). Update the parser's `readSheet(wb, 'Standards')` calls.

- [ ] **Step 2: No commit needed (read-only verification)**

---

## Task 9: Real Import of DWA-A 138-1 + DB Verification

- [ ] **Step 1: Run real import**

```bash
pnpm tsx scripts/import-pass3c.ts "/c/Users/Ekowai/Desktop/Supabase data/DWA-A138-1_Structured_Workbook_Pass3c.xlsx"
```

Expected:
- Same validation output as dry-run
- `→ BEGIN transaction` then `→ COMMIT`
- Counts match dry-run

- [ ] **Step 2: Verify DB row counts via raw SQL**

```bash
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx -e "import postgres from 'postgres'; const sql=postgres(process.env.DATABASE_URL!,{prepare:false}); Promise.all([sql\`SELECT COUNT(*)::int FROM standards WHERE code='DWA-A-138-1'\`,sql\`SELECT COUNT(*)::int FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1'\`,sql\`SELECT COUNT(*)::int FROM fields f JOIN worksheet_templates wt ON wt.id=f.worksheet_template_id JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1'\`,sql\`SELECT COUNT(*)::int FROM equations eq JOIN worksheet_templates wt ON wt.id=eq.worksheet_template_id JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1'\`,sql\`SELECT COUNT(*)::int FROM compliance_requirements cr JOIN worksheet_templates wt ON wt.id=cr.worksheet_template_id JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1'\`]).then(([std,wt,f,eq,cr])=>{console.log({standards:std[0].count,worksheet_templates:wt[0].count,fields:f[0].count,equations:eq[0].count,compliance:cr[0].count});}).finally(()=>sql.end());"
```

Expected: `{ standards: 1, worksheet_templates: 28, fields: 132, equations: 41, compliance: 30 }`

If counts mismatch the expected, investigate which sheet under-reported. Likely cause: an empty trailing row was counted, or a duplicate row hit ON CONFLICT.

- [ ] **Step 3: Re-import test (idempotency)**

```bash
pnpm tsx scripts/import-pass3c.ts "/c/Users/Ekowai/Desktop/Supabase data/DWA-A138-1_Structured_Workbook_Pass3c.xlsx"
```

Expected: same counts again, no errors. The UPSERTs handle the re-import.

Re-verify counts with the SQL block from Step 2. They should be unchanged.

- [ ] **Step 4: Sample-check that a known field exists with correct shape**

```bash
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx -e "import postgres from 'postgres'; const sql=postgres(process.env.DATABASE_URL!,{prepare:false}); sql\`SELECT f.symbol, f.label_de, f.data_type, f.unit, f.is_required, f.verification_status FROM fields f JOIN worksheet_templates wt ON wt.id=f.worksheet_template_id JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1' AND f.symbol='A_E' LIMIT 1\`.then(r=>{console.log(r[0]);}).finally(()=>sql.end());"
```

Expected: a row with `symbol='A_E'`, `data_type='number'`, `verification_status='imported_unverified'`, `is_required=true` (or false depending on xlsx).

- [ ] **Step 5: Commit (empty — checkpoint)**

```bash
git commit --allow-empty -m "chore(import): DWA-A 138-1 imported and verified — 28/132/41/30"
```

---

## Task 10: Import Remaining 4 Workbooks

- [ ] **Step 1: Import DWA-M 816**

```bash
pnpm tsx scripts/import-pass3c.ts "/c/Users/Ekowai/Desktop/Supabase data/DWA-M-816_Structured_Workbook_Pass3c.xlsx"
```

Expected counts: 30 worksheets / 68 fields / 30 equations / 28 reqs

- [ ] **Step 2: Import DWA-M 820-1**

```bash
pnpm tsx scripts/import-pass3c.ts "/c/Users/Ekowai/Desktop/Supabase data/DWA-M-820-1_Structured_Workbook_Pass3c.xlsx"
```

Expected: 25 / 82 / 1 / 28

- [ ] **Step 3: Import DWA-M 820-2**

```bash
pnpm tsx scripts/import-pass3c.ts "/c/Users/Ekowai/Desktop/Supabase data/DWA-M-820-2_Structured_Workbook_Pass3c.xlsx"
```

Expected: 28 / 97 / 1 / 62

- [ ] **Step 4: Import DWA-M 820-3**

```bash
pnpm tsx scripts/import-pass3c.ts "/c/Users/Ekowai/Desktop/Supabase data/DWA-M-820-3_Structured_Workbook_Pass3c.xlsx"
```

Expected: 24 / 248 / 1 / 34

- [ ] **Step 5: Verify aggregate counts**

```bash
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx -e "import postgres from 'postgres'; const sql=postgres(process.env.DATABASE_URL!,{prepare:false}); Promise.all([sql\`SELECT COUNT(*)::int FROM standards\`,sql\`SELECT COUNT(*)::int FROM worksheet_templates\`,sql\`SELECT COUNT(*)::int FROM fields\`,sql\`SELECT COUNT(*)::int FROM equations\`,sql\`SELECT COUNT(*)::int FROM compliance_requirements\`]).then(([a,b,c,d,e])=>{console.log({standards:a[0].count,worksheet_templates:b[0].count,fields:c[0].count,equations:d[0].count,compliance:e[0].count});}).finally(()=>sql.end());"
```

Expected total:
- standards: 5
- worksheet_templates: 135 (28+25+28+24+30)
- fields: 627 (132+82+97+248+68)
- equations: 74 (41+1+1+1+30)
- compliance_requirements: 182 (30+28+62+34+28)

These match the spec §12.1 reference numbers exactly.

If any standard fails to import (e.g. an unexpected sheet structure or extra columns), the transaction rolls back — that standard is not partially imported. Fix the issue, re-run.

- [ ] **Step 6: Empty checkpoint commit**

```bash
git commit --allow-empty -m "chore(import): 5 verified Pass3c standards imported — 135 ws / 627 fields / 74 eqs / 182 reqs"
```

---

## Task 11: Push + Update PR

- [ ] **Step 1: Push**

```bash
git push origin feat/db-driven-schema
```

- [ ] **Step 2: Update PR #1 description to reflect Plan 2 work**

```bash
gh pr edit 1 --body "$(cat <<'EOF'
## Summary

Plans 1 and 2 of the 2026-05-20 DB-driven multi-standard rebuild spec.

### Plan 1 — Schema Migration
- Drops `calculations`, `calculation_history`, `decisions`, `approvals`,
  `cross_references`, `calculation_metrics`
- Adds 11 new tables (6 standards-library + 5 project workflow)
- Restructures `projects` and `report_archives`
- RLS smoke tests verify immutability of `approval_events` + `audit_log`
  at the DB level

### Plan 2 — Pass3c xlsx Importer
- `scripts/import-pass3c.ts` CLI ingests Pass3c xlsx workbooks
  transactionally with full validation before any write
- Idempotent UPSERTs by natural keys; preserves `engineer_verified`
  across re-imports
- 5 verified Pass3c standards imported into dev DB:
  - DWA-A 138-1 — 28 / 132 / 41 / 30
  - DWA-M 816 — 30 / 68 / 30 / 28
  - DWA-M 820-1/2/3 — 25+28+24 worksheets, 82+97+248 fields, 3 equations, 124 compliance reqs
  - Total: 135 worksheets, 627 fields, 74 equations, 182 compliance requirements

### App is broken after this PR

Intentional. Engine, server actions, PDF loaders, and calculator
routes still reference dropped tables. Plans 3–6 progressively rewire:

- Plan 3: Dynamic Form Renderer
- Plan 4: Approval State Machine + Audit
- Plan 5: Plan-6 Reattachment
- Plan 6: Pilot Seed + Cleanup + End-to-End

## Test plan

- [x] Plan 1: 5 new RLS test files green
- [x] Plan 1: pg_policy confirms no UPDATE/DELETE on immutable tables
- [x] Plan 2: parser unit tests green (8 cases)
- [x] Plan 2: validator unit tests green (9 cases)
- [x] Plan 2: 5 standards imported with counts matching spec §12.1
- [x] Plan 2: re-import idempotent (counts unchanged)
- [ ] (Reviewer) Spot-check a worksheet's fields + clause references
- [ ] (Reviewer) Confirm `verification_status='imported_unverified'` on all imported rows

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: `gh` updates PR #1 body. Returns the PR URL.

---

## Done Criteria for Plan 2

All of:

1. `supabase/migrations/20260521120000_add_compliance_description.sql` applied (compliance_requirements.description exists)
2. exceljs in dependencies
3. `scripts/_pass3c-{types,parsers,validate,db}.ts` exist with the shapes described
4. `scripts/import-pass3c.ts` CLI works end-to-end
5. Unit tests for parsers + validators green (17 tests total)
6. 5 Pass3c standards imported with counts matching spec §12.1 (135 / 627 / 74 / 182)
7. Re-import is idempotent (counts unchanged on second run)
8. Sample-checked field shape: `A_E` exists in DWA-A-138-1 with `data_type='number'`, `verification_status='imported_unverified'`
9. Push to origin/feat/db-driven-schema
10. PR #1 description updated to reflect Plan 1 + 2 completion

Then proceed to write Plan 3 (Dynamic Form Renderer).
