# DB-driven Multi-Standard Architecture — Walking Skeleton MVP

**Status:** Design accepted, ready for implementation planning
**Date:** 2026-05-20
**Author:** Brainstorming session (Alvaro Burgos + Claude)
**Companion specs:** `EKOWAI_Platform_Technical_Specification_v1.0.md`, `EKOWAI_System_Requirements_v1.1.md` (on desktop)
**Pilot project:** PLT-HS-01 (Blumen Forscheln, Heinsberg NRW — natural pond under FLL + DWA-A 138-1 + DWA-M 820-1/2/3)

---

## 1. Context

The ekowai-wizard is today a DWA-A 201 specialist tool: 22 worksheets are bundled as JSON files (`src/lib/worksheets/DWA-A-201/v3.1/*.json`), build-time imported from the EKOWAI-Agent Python repo. A bespoke TypeScript engine drives input/threshold/equation logic per worksheet, with `calculations`, `decisions`, `approvals` tables holding project data.

The user now has **15 structured "Pass3c" Excel workbooks** on their desktop, covering different standards (DWA-A 138-1, DWA-M 816/820-1/2/3, DWA-A 102-2/178/262E, DIN-276, FLL-GAR/Naturteich/Rhizom, etc.). Five of them are spec-confirmed verified-ready (DWA-A 138-1 + DWA-M 816 + DWA-M 820-1/2/3 = 135 worksheets, 627 fields, 74 equations, 182 compliance requirements). Each workbook follows the same canonical 15-sheet structure (`Standards`, `Worksheets`, `Sections`, `Fields`, `Equations`, `Compliance_Requirements`, `Decision_Trees`, `Enum_Values`, `Validation_Rules`, etc.).

The companion spec describes a multi-standard regulatory engineering platform with a DB-driven standards library. Pivoting the wizard to this model means **discarding the bundled-JSON DWA-A 201 worksheets** and rebuilding the engine around a generic, DB-driven form renderer that reads any standard's worksheets, fields, equations, and compliance requirements from Postgres rows.

## 2. Three strategic decisions made

| Decision | Choice | Alternatives considered |
|---|---|---|
| **Storage model** | DB-driven — Pass3c workbooks imported into 6 standards-library tables in Supabase | Bundled JSONs (skips Phase 2 scale), Inkremental Migration (defer DB-driven indefinitely) |
| **Codebase handling** | Fresh Start in the same repo — drop old tables, rebuild schema, port Plan-6 features to new data layer | Parallel schemas with feature flags, New repo `ekowai-platform` (Spec verbatim — discarded Wizard infra) |
| **MVP scope** | Walking Skeleton (Spec §11 Week 4 milestone) — schema + import + dynamic forms + approval state machine + audit log + basic PDF | Phase 1 Full (decision trees + compliance + staleness + deviation gate + client portal — 6–8 weeks), End-to-End-with-Paula (above + FLL standards + Skribble + C1 Planungsbericht template — 10–14 weeks) |

Each decision was made by the user explicitly after presented alternatives with trade-offs.

## 3. Architecture

Three layers per the companion spec, mapped onto Next.js 16:

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — STANDARDS LIBRARY                                    │
│  Supabase Postgres, 6 new tables, read-only after import        │
│  Content: 5 verified Pass3c workbooks (initially) → 135         │
│  worksheets, 627 fields, 74 equations, 182 compliance reqs.     │
│  Populated by `pnpm tsx scripts/import-pass3c.ts <file>`.       │
└─────────────────────────────────────────────────────────────────┘
                       ↓ form renderer + state machine read
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2 — PROJECT WORKFLOW (Next.js 16 App Router)             │
│  Kept: Drizzle, RLS, Magic-Link Auth, Routing Middleware,       │
│        Org model, Resend, DeepSeek/Kimi rationale, Plan-6       │
│        Documents/Citations/Archives, design overhaul (Poppins,  │
│        Brand green, pill badges, no monospace)                  │
│  New: generic DB-driven form renderer (all data_types),         │
│       project_parameters as central value store,                │
│       worksheet_instances with state machine,                   │
│       immutable approval_events + audit_log                     │
│  Plan-6 re-anchored: citations now reference project_parameters │
│       instead of calculations.inputs                            │
└─────────────────────────────────────────────────────────────────┘
                       ↓ structured + approved data
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3 — OUTPUTS                                              │
│  PDF via @react-pdf (Plan-6 components, re-wired)               │
│  report_archives snapshots project_parameters on finalize       │
│  Typst/LaTeX migration: explicitly NOT in MVP (Phase 3 if and   │
│  when @react-pdf hits a wall)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### What survives from the current wizard

- Next.js 16 App Router, Drizzle, Supabase, RLS patterns
- Magic-Link Auth, Routing Middleware (locale + session refresh + public-route allowlist + dev-autologin)
- Org / org_members multi-tenant model
- `project_documents`, `report_archives`, `org_letterheads` (Plan 6)
- Citation system UI components (`SourceBadge`, `CitationPicker`, `DocumentList`, `UploadDialog`)
- PDF builder (`src/lib/pdf/*`) — re-wired to new schema
- Letterhead system, Email templates, DeepSeek/Kimi rationale-draft route, Resend
- Design (Poppins + brand green + pill badges + logo)

### What gets removed

- `src/lib/worksheets/DWA-A-201/v3.1/*.json` (22 worksheet files + `_knowledge.json`)
- `src/lib/worksheets/DWA-A-201/v3.2/*.json` (5 partial files)
- `src/lib/engine/{validate,evaluate,compliance,decisions,index}.ts` — A-201-specific logic (types and `inputs-reader.ts` are kept and refactored)
- `scripts/{import-from-ekowai-agent,extract-regulation-knowledge,seed-demo,seed-multi-project,wipe-test-data}.ts`
- DB tables `calculations`, `decisions`, `approvals` (with cascade implications below)
- `src/components/calculator/{decision-modal,compliance-badge,compliance-summary,worksheet-picker,results-panel}.tsx` — `results-panel` is parked for Phase 2 revival when calculations come back
- Server actions `src/lib/actions/{approval,calculation}.ts` — replaced by `worksheet-transition.ts`, `worksheet.ts`
- Client store `src/lib/state/calculator-store.ts` — replaced by `worksheet-store.ts`
- Calculator routes under `src/app/[locale]/(app)/projects/[id]/calc/` — replaced by `standards/[code]/worksheets/[code]/`

## 4. Database schema (17 tables in system: 11 new + 6 existing — 4 dropped)

### 4.1 Standards Library (6 new tables, read-only after import)

```sql
-- One row per regulatory standard
create table standards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- 'DWA-A-138-1'
  title_de text not null,
  title_en text,
  version text not null,                -- 'Pass3c'
  issued_year int,
  created_at timestamptz not null default now()
);

-- 135 worksheets across the 5 initial standards
create table worksheet_templates (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references standards on delete cascade,
  code text not null,                  -- 'A138-1-04'
  title_de text not null,
  title_en text,
  phase int,                            -- sidebar grouping
  archetype text check (archetype in
    ('registration','data_collection','calculation','summary','verification')),
  order_index int not null default 0,
  description text,
  unique (standard_id, code)
);

create table worksheet_sections (
  id uuid primary key default gen_random_uuid(),
  worksheet_template_id uuid not null references worksheet_templates on delete cascade,
  parent_section_id uuid references worksheet_sections,   -- self-ref, 2-level nesting
  code text,
  title_de text not null,
  title_en text,
  order_index int not null default 0
);

-- 627 parameter definitions — the heart
create table fields (
  id uuid primary key default gen_random_uuid(),
  worksheet_template_id uuid not null references worksheet_templates on delete cascade,
  section_id uuid references worksheet_sections,
  symbol text not null,                -- 'A_E', 'EW', 'T_42'
  label_de text not null,
  label_en text,
  data_type text not null check (data_type in
    ('number','text','enum','date','boolean','json')),
  unit text,                            -- 'm²', null
  is_required boolean not null default false,
  enum_values jsonb,                   -- [{value, labelDe, labelEn}] for enum
  validation_rules jsonb,              -- {min, max, regex, maxLength, ...}
  clause_reference text,               -- 'A 138-1 §5.2.3'
  description text,
  consumer_worksheets text[],          -- for Phase 2 staleness — populated now, not used
  order_index int not null default 0,
  verification_status text not null default 'imported_unverified'
    check (verification_status in ('imported_unverified','engineer_verified')),
  unique (worksheet_template_id, symbol)
);

-- 74 equations (displayed only in MVP — not evaluated)
create table equations (
  id uuid primary key default gen_random_uuid(),
  worksheet_template_id uuid not null references worksheet_templates on delete cascade,
  equation_number text not null,       -- 'E.5.1', 'Gl. 12'
  formula text not null,               -- 'V_sp = A_E * h_red'
  formula_latex text,
  input_symbols text[],                -- ['A_E', 'h_red']
  output_symbol text,
  output_unit text,
  clause_reference text,
  description text,
  verification_status text not null default 'imported_unverified'
    check (verification_status in ('imported_unverified','engineer_verified')),
  unique (worksheet_template_id, equation_number)
);

-- 182 pass/fail requirements (imported and listed in MVP, not evaluated)
create table compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  worksheet_template_id uuid not null references worksheet_templates on delete cascade,
  code text not null,                  -- 'CR-A138-1-23'
  title_de text not null,
  title_en text,
  condition text not null,             -- 'kf >= 1e-6 AND A_E <= 500' (evaluated in Phase 2)
  clause_reference text,
  severity text not null check (severity in ('block','warn','info')),
  unique (worksheet_template_id, code)
);
```

### 4.2 Project Workflow (5 new tables)

```sql
-- Junction table per Spec REQ-PSTD-01
create table project_standards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  standard_id uuid not null references standards,
  status text not null default 'active' check (status in ('active','removed')),
  added_at timestamptz not null default now(),
  added_by uuid references auth.users,
  removed_at timestamptz,
  removed_by uuid references auth.users,
  removal_reason text,
  unique (project_id, standard_id)
);

-- One row per (project × worksheet_template) with state machine
create table worksheet_instances (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  worksheet_template_id uuid not null references worksheet_templates,
  status text not null default 'draft' check (status in
    ('draft','submitted_for_review','engineer_approved','final','deactivated')),
  -- Phase 2 adds: 'sent_to_customer','customer_approved','modification_requested'
  is_stale boolean not null default false,    -- column present, MVP does not set
  staleness_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, worksheet_template_id)
);

-- The central value store
create table project_parameters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  field_id uuid not null references fields,
  source_worksheet_instance_id uuid references worksheet_instances,
  -- polymorphic value columns per data_type:
  value_number numeric,
  value_text text,
  value_enum text,
  value_date date,
  value_boolean boolean,
  value_json jsonb,
  source_type text not null default 'entered' check (source_type in
    ('entered','calculated','computed','derived')),
  citation_source jsonb,    -- { docId, page?, note?, attached_by, attached_at } per Plan-6 re-anchor
  entered_by uuid not null references auth.users,
  entered_at timestamptz not null default now(),
  is_stale boolean not null default false,
  unique (project_id, field_id)
);

-- Immutable workflow chain — INSERT + SELECT only
create table approval_events (
  id uuid primary key default gen_random_uuid(),
  worksheet_instance_id uuid not null references worksheet_instances on delete restrict,
  event_type text not null check (event_type in
    ('submit','engineer_approve','engineer_reject','finalize','reopen',
     'deactivate','reactivate')),
  from_status text not null,
  to_status text not null,
  actor_id uuid not null references auth.users on delete restrict,
  actor_role text not null check (actor_role in ('engineer','customer','system')),
  comment text not null check (length(trim(comment)) > 0),
  occurred_at timestamptz not null default now()
);

-- Immutable universal change log — INSERT + SELECT only
create table audit_log (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users on delete restrict,
  actor_role text check (actor_role in ('engineer','customer','system')),
  project_id uuid references projects on delete restrict,
  org_id uuid references orgs on delete restrict,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('insert','update','delete','transition')),
  changes jsonb not null
);
```

### 4.3 Tables kept (6 existing)

- `orgs` — multi-tenant root
- `org_members` — user ↔ org with role
- `projects` — restructured: drop A-201-specific columns, add `site_location`, ensure `project_code` exists
- `org_letterheads` — Plan-6 letterhead per org
- `project_documents` — Plan-6 file uploads (no schema change)
- `report_archives` — Plan-6, **schema modified**: drop `approval_id`, add `approval_event_id` + `worksheet_instance_id`

### 4.4 Tables dropped

- `calculations` (replaced by `project_parameters` + `worksheet_instances`)
- `decisions` (replaced — decision-class is computed at runtime in Phase 2)
- `approvals` (replaced by `approval_events` + `worksheet_instances.status`)
- `calculation_history` if present

### 4.5 RLS posture

| Tables | Policies |
|---|---|
| Standards library (6 tables) | SELECT for `authenticated`, write only via service role |
| Project workflow + Plan-6 tables | INSERT/SELECT/UPDATE/DELETE scoped per `org_id` via `org_members` lookup |
| `approval_events`, `audit_log` | **INSERT + SELECT only**, no UPDATE policy, no DELETE policy — enforced at DB level, not bypassable from app code |

### 4.6 Indices

```sql
create index idx_fields_worksheet on fields(worksheet_template_id, order_index);
create index idx_fields_symbol on fields(symbol);    -- for cross-worksheet symbol lookup
create index idx_equations_worksheet on equations(worksheet_template_id);
create index idx_compliance_worksheet on compliance_requirements(worksheet_template_id);
create index idx_worksheet_instances_project on worksheet_instances(project_id, status);
create index idx_project_parameters_project_field on project_parameters(project_id, field_id);
create index idx_project_parameters_source_instance on project_parameters(source_worksheet_instance_id);
create index idx_approval_events_instance on approval_events(worksheet_instance_id);
create index idx_approval_events_actor on approval_events(actor_id);
create index idx_audit_log_project on audit_log(project_id, occurred_at desc);
create index idx_audit_log_actor on audit_log(actor_id, occurred_at desc);
create index idx_audit_log_table on audit_log(table_name, record_id);
create index idx_project_standards_project on project_standards(project_id);
create index idx_project_standards_active on project_standards(project_id) where status = 'active';
```

## 5. xlsx Importer

### 5.1 CLI

```bash
pnpm tsx scripts/import-pass3c.ts <path-to-workbook>
pnpm tsx scripts/import-pass3c.ts <path-to-workbook> --dry-run
```

One workbook = one transaction. Idempotent via natural keys (`standards.code`, `worksheet_templates.(standard_id, code)`, `fields.(worksheet_template_id, symbol)`, etc.). UUIDs are stable across re-imports. `verification_status` is preserved on re-import (does not regress `engineer_verified` to `imported_unverified`).

### 5.2 Sheet-to-table mapping

| xlsx Sheet | Target | MVP? |
|---|---|---|
| `Standards` | `standards` (1 row) | ✓ |
| `Worksheets` | `worksheet_templates` | ✓ |
| `Sections` | `worksheet_sections` | ✓ |
| `Fields` | `fields` (core columns) | ✓ |
| `Enum_Values` | merged into `fields.enum_values` JSONB | ✓ |
| `Validation_Rules` | merged into `fields.validation_rules` JSONB | ✓ |
| `Equations` | `equations` | ✓ |
| `Compliance_Requirements` | `compliance_requirements` | ✓ |
| `Decision_Trees` | (`tree_nodes` table — Phase 2) | NO |
| `Cross_References` | (`field_bindings` table — Phase 2) | NO |
| `Tables` | (`project_parameter_rows` schema — Phase 2) | NO |
| `Master_Per_Type` | reference pool, used inline only | NO |
| `Validation` | pre-import sanity check (row counts) | ✓ — diagnostics only |
| `README`, `Changelog` | not persisted | NO |

### 5.3 Insert order (FK dependency)

1. `standards` → 2. `worksheet_templates` → 3. `worksheet_sections` → 4. `fields` (core) → 5. UPDATE `fields` with merged `enum_values` + `validation_rules` → 6. `equations` → 7. `compliance_requirements`

### 5.4 Edge cases

- **FLL Pass3b3c workbooks:** rejected unless `--force-experimental` flag is passed. MVP imports only Pass3c.
- **Duplicate worksheet codes across standards** (e.g. M820-1 and M820-2 share some codes): allowed, because uniqueness is `(standard_id, code)`. Warning logged for future Phase-2 `field_bindings`.
- **Unknown `data_type`:** whitelist enforced (`number | text | enum | date | boolean | json`). Anything else fails the import loud.
- **Enum field without enum_values:** pre-import sanity check fails.
- **Field rename across re-imports:** importer warns about DB rows whose `symbol` is no longer in the xlsx. Does not auto-delete (would orphan `project_parameters`). Engineer handles renames via explicit migration.

### 5.5 Files

```
scripts/
├─ import-pass3c.ts           # CLI entry
├─ _pass3c-types.ts           # TypeScript shapes mirroring each sheet
├─ _pass3c-parsers.ts         # exceljs → domain objects
├─ _pass3c-validate.ts        # pre-write sanity checks
└─ _pass3c-db.ts              # Drizzle UPSERT helpers
```

Library: `exceljs` (better TypeScript support and async API than `xlsx`/SheetJS).

## 6. Dynamic Form Renderer

### 6.1 Route

```
/[locale]/(app)/projects/[id]/standards/[code]/worksheets/[code]/page.tsx
```

One route handles every worksheet of every standard. No per-standard specialization.

### 6.2 Data loading (Server Component)

```ts
const ws = await loadWorksheet(standardCode, worksheetCode);
//   → { template, sections[], fields[], equations[], compliance_requirements[] }

const instance = await ensureWorksheetInstance(projectId, ws.template.id);
//   → lazy-creates if not exists

const params = await loadProjectParameters(projectId, ws.fields.map(f => f.id));
//   → Map<field_id, ProjectParameter>

const overlaps = await loadSameSymbolValues(projectId, ws.fields, ws.template.standard_id);
//   → Map<symbol, [{ worksheet_code, value, entered_at }]> for cross-worksheet UX hint
```

### 6.3 Component hierarchy

```
WorksheetPage (Server)
└─ WorksheetForm (Client, "use client")
   ├─ WorksheetHeader  (title + status badge + phase chip)
   ├─ SectionGroup     (nestable via parent_section_id)
   │  └─ DynamicField  (per field of section)
   ├─ EquationsBlock   (formulas displayed, not evaluated in MVP)
   ├─ ComplianceBlock  (requirements listed as clauses, no pass/fail in MVP)
   └─ ApprovalBar      (state-machine buttons per instance.status)
```

### 6.4 `<DynamicField>` — data_type dispatch

| data_type | Component | Notes |
|---|---|---|
| `number` | `<NumberInput>` with unit suffix, `tabular-nums` | de-DE locale parsing (comma decimal) |
| `text` | `<TextInput>` or `<Textarea>` if `validation_rules.maxLength > 200` | |
| `enum` | `<SegmentedControl>` (existing) if ≤ 4 options, else `<Select>` (native) | |
| `date` | `<DateInput type="date">` | HTML5 native |
| `boolean` | `<SegmentedControl>` with Ja/Nein options | consistent with dense forms |
| `json` | `<TableInput>` placeholder badge "Mehrzeilige Eingabe — Phase 2" | write-blocked in MVP |

Field structure mirrors the merged `input-field.tsx`:

```
Label (Poppins sm font-medium)
[Clause reference] · [Unit] (uppercase tracking)
[──── Input control ────]
[⊕ SourceBadge — clickable citation trigger]
```

`<SourceBadge>` and `<CitationPicker>` from Plan-6 are unchanged. They now operate on `project_parameters.citation_source` instead of `calculations.inputs[symbol].source`.

### 6.5 Cross-worksheet symbol overlap (MVP UX)

When `loadSameSymbolValues` returns a value for the same `symbol` from another worksheet, the field renders a subtle hint:

> "Bereits in Arbeitsblatt 04 eingetragen: 1.800 m² · [Übernehmen]"

Click → server action copies the value to this `(project_id, field_id)` with `source_type='derived'` and an audit_log entry. **No automatic propagation.** Phase 2 introduces `field_bindings` for explicit, auditable auto-propagation via Postgres triggers.

### 6.6 Save flow

Auto-save with 1s debounce → server action `saveWorksheet(instanceId, values)`:

1. Auth: instance loaded via RLS (org member)
2. Diff: existing `project_parameters` vs new values
3. For each changed field:
   - UPSERT `project_parameters` (project_id, field_id) with new value, `entered_by`, `entered_at`
   - INSERT `audit_log` row (`table_name='project_parameters'`, `action='insert'|'update'`, `changes={before, after}`)
4. UPDATE `worksheet_instances.updated_at`
5. If instance is in approved/sent/final state: UI warning that edit will require re-review (Phase 2 staleness cascade automates this)

### 6.7 Validation

- Client-side: HTML5 (`min`, `max`, `required`)
- Server-side: pre-UPSERT check against `fields.validation_rules` JSONB (min/max/regex/maxLength)
- Generic expression validation (`A_E <= 200 OR t_f <= 15`) is Phase 2 with the safe expression evaluator

### 6.8 Equations display

KaTeX-rendered formula + clause reference + verification badge. **Not evaluated in MVP.** Engineer enters the computed result as a `project_parameter` with `source_type='calculated'` manually.

## 7. Approval State Machine + Audit

### 7.1 MVP state machine (4 states)

```
draft  ←─reopen─┐    ←─engineer_reject─┐
  ↓ submit     │                       │
submitted_for_review ──engineer_approve→ engineer_approved ──finalize→ final
                                            └─reopen─┘            └─reopen─┘
```

Plus `deactivated` (terminal, triggered when the corresponding `project_standards` row goes to `status='removed'`).

Phase 2 adds: `sent_to_customer`, `customer_approved`, `modification_requested`, and event types `send_to_customer`, `customer_approve`, `customer_reject`, `customer_request_modification`.

### 7.2 Transition server action (atomic)

```ts
async function transitionWorksheet(instanceId, eventType, comment) {
  const trimmedComment = comment.trim();
  if (!trimmedComment) throw new Error('Kommentar erforderlich.');

  return db.transaction(async (tx) => {
    // 1. Load current instance via RLS
    // 2. Validate transition allowed from current.status
    // 3. UPDATE worksheet_instances (status + updated_at)
    // 4. INSERT approval_events (event_type, from/to, actor, comment)
    // 5. INSERT audit_log (table='worksheet_instances', action='transition', changes={...})
  });
}
```

Two writes for two concerns: `approval_events` is the workflow-specific chain (with `from_status`/`to_status`), `audit_log` is the universal change log. Both immutable.

### 7.3 RLS on approval_events

```sql
alter table approval_events enable row level security;

create policy "approval_events_insert"
  on approval_events for insert
  with check (
    actor_id = auth.uid()
    and worksheet_instance_id in (
      select wi.id from worksheet_instances wi
      join projects p on p.id = wi.project_id
      join org_members om on om.org_id = p.org_id
      where om.user_id = auth.uid()
    )
  );

create policy "approval_events_select"
  on approval_events for select
  using (
    worksheet_instance_id in (
      select wi.id from worksheet_instances wi
      join projects p on p.id = wi.project_id
      join org_members om on om.org_id = p.org_id
      where om.user_id = auth.uid()
    )
  );

-- NO UPDATE POLICY, NO DELETE POLICY → buchstäblich kein Code-Pfad kann ändern oder löschen
```

`audit_log` follows the same pattern (no UPDATE, no DELETE).

### 7.4 UI

`<ApprovalBar>` component renders buttons based on `instance.status`:

- `draft` → [Zur internen Prüfung einreichen]
- `submitted_for_review` → [Genehmigen] [Zurückgeben]
- `engineer_approved` → [Finalisieren] [Wieder öffnen]
- `final` → [Wieder öffnen ⚠ löst Re-Review aus]
- `deactivated` → no actions (reactivate via `project_standards` UI)

Each button opens a modal with mandatory comment field. Submit → server action → `router.refresh()` (no optimistic update).

### 7.5 Audit log view

Read-only tab: `/projects/[id]/audit` — shows UNION of `approval_events` + `audit_log` for the project, ordered by `occurred_at desc`. Filterable by actor, action type, date range. Exportable as CSV.

## 8. Migration + Plan-6 Reattachment

### 8.1 Phases

```
Phase 0: pg_dump current Supabase to local snapshot
Phase 1: SQL migration (1 file, atomic BEGIN…COMMIT)
Phase 2: Code refactor (large)
Phase 3: Importer + seed
```

### 8.2 PR strategy

Single feature branch `feat/db-driven-rebuild` from main. Draft PR for Vercel preview deploy as end-to-end sanity check. PR marked "ready for review" only when all green. Avoid PR sequencing that leaves main red between merges.

### 8.3 SQL migration

One file: `supabase/migrations/20260520120000_db_driven_rebuild.sql`. Hand-written plain SQL (not Drizzle-generated), because:
- Drop-and-create order with CASCADE is delicate
- RLS policies want to be explicit and readable, not reconstructed from Drizzle JSON snapshots
- Migration is not reversible (demo data is gone anyway)

Drizzle `schema.ts` is updated **after** the migration applies. `drizzle-kit pull` as sanity check that Drizzle and DB agree.

### 8.4 Plan-6 reattachment

| Plan-6 component | Required change |
|---|---|
| `project_documents` table | None — hangs only on `project_id` |
| `report_archives` table | Drop `approval_id`, add `approval_event_id` + `worksheet_instance_id` |
| `archiveOnApprove` action | Renamed to `archiveOnFinalize`, triggered only on `finalize` event (not on every approval) |
| `<DocumentList>`, `<UploadDialog>` | No change |
| `<SourceBadge>`, `<CitationPicker>` | No UI change — server actions write `project_parameters.citation_source` instead of `calculations.inputs.<symbol>.source` |
| `src/lib/actions/citations.ts` | Refactor: target `project_parameters.citation_source` |
| `src/lib/actions/documents.ts` | No change |
| `src/lib/engine/inputs-reader.ts` | Refactor: signature `readParametersWithSources(projectId, fields)` returns `Record<field_id, {value, source?}>` |
| `src/lib/pdf/load-data.ts` | Substantial rewrite: read from `worksheet_instances` + `project_parameters` + `approval_events` instead of `calculations` + `decisions` + `approvals` |
| `src/lib/pdf/document.tsx`, `sections/*.tsx` | Per-section adjustments (see table below) |
| `src/lib/pdf/build-report.tsx` | Signature changes to `loadProjectReportData(projectId)` |
| `/api/calculations/[id]/pdf/route.ts` | Renamed to `/api/projects/[id]/report/pdf/route.ts` |

### 8.5 PDF section by section

| PDF section | OLD source | NEW source |
|---|---|---|
| `cover.tsx` | `projects` + `org_letterheads` | unchanged |
| `grundlagen.tsx` | `project.standard_code` (single) | `project_standards` (multi), list active standards |
| `inputs.tsx` | `calculation.inputs` JSONB grouped by worksheet | `project_parameters` JOIN `fields` JOIN `worksheet_templates`, grouped by worksheet |
| `computed.tsx` | `calculation.output` | `project_parameters WHERE source_type IN ('calculated','computed')` |
| `compliance.tsx` | live compliance evaluation | `compliance_requirements` listed, no pass/fail in MVP |
| `decisions.tsx` | `decisions` table | empty in MVP (Phase 2 reactivates) |
| `approvals.tsx` | `approvals` table | `approval_events` JOIN `auth.users` for actor names |
| `appendix-divider.tsx`, `footer.tsx`, `watermark.tsx` | — | unchanged |

### 8.6 Tests retained from Plan-6

| Test file | Change |
|---|---|
| `tests/rls/project-documents.test.ts` | unchanged |
| `tests/rls/report-archives.test.ts` | adjust for new FK columns |
| `src/lib/actions/__tests__/citations.test.ts` | fixtures adjusted (target `project_parameters`) |
| `src/lib/actions/__tests__/documents.test.ts` | unchanged |
| `src/lib/pdf/__tests__/load-data.test.ts` | full rewrite (data source changed) |
| `src/lib/pdf/__tests__/document.snapshot.test.tsx` | snapshot regenerated |
| `src/lib/engine/__tests__/inputs-reader.test.ts` | fixtures adjusted |

Expectation: ~80% of Plan-6 test logic survives; fixtures + type imports change.

### 8.7 Demo + seed

```bash
pnpm tsx scripts/wipe-all-data.ts --yes
pnpm tsx scripts/import-pass3c.ts "...DWA-A138-1...xlsx"
pnpm tsx scripts/import-pass3c.ts "...DWA-M-820-1...xlsx"
pnpm tsx scripts/import-pass3c.ts "...DWA-M-820-2...xlsx"
pnpm tsx scripts/import-pass3c.ts "...DWA-M-820-3...xlsx"
pnpm tsx scripts/import-pass3c.ts "...DWA-M-816...xlsx"
pnpm tsx scripts/seed-pilot-project.ts
```

The pilot project:
- Org "EKOWAI" (existing `leadership@ekowai.com` stays)
- Project "PLT-HS-01 / Blumen Forscheln / Heinsberg NRW"
- `project_standards`: 4 active (138-1, 820-1, 820-2, 820-3)
- `worksheet_instances` instantiated for all 106 worksheets across these 4 standards, all `draft`
- No `project_parameters` (engineer enters via UI)

## 9. Phase 2 roadmap (explicitly NOT in MVP)

### Phase 2 — Close the Spec §4 gap (~6–8 weeks after MVP)

- **Field bindings + auto-prefill** — `field_bindings` table, Postgres trigger or server-side post-write hook, REQ-STD-05 + REQ-FORM-05
- **Multi-row tables** — `data_type='json'` becomes `<TableInput>`, schema `project_parameter_rows`
- **Engineer verification UI** — admin route to flip `imported_unverified` → `engineer_verified`
- **Compliance evaluation engine** — safe TS expression evaluator with whitelist (no `eval()`), live pass/fail per worksheet, REQ-DEC-*
- **Decision Tree Renderer** — generic component traversing `tree_nodes`, REQ-TREE-*
- **Staleness cascade** — when `project_parameter` changes, flag downstream `worksheet_instances.is_stale = true` via trigger or server-side, REQ-STALE-*
- **Deviation gate UI** — without Skribble (audit-trail suffices for now), REQ-DEV-*
- **Per-parameter attachments** — separate `parameter_attachments` table
- **PDF**: `<Compliance>` populated with real pass/fail, `<Decisions>` revived
- **Standards expansion**: DWA-M 102-4, DWA-A 102-2, DWA-A 272E

### Phase 3 — Engineering-grade + SaaS preparation

- Skribble eIDAS integration (REQ-DEV-02)
- Python FastAPI calculation engine (sympy, REQ-CALC-*)
- Client portal (REQ-PORTAL-*, RLS scoped to customer role)
- FLL workbooks (when Pass3c-verified)
- DIN-276
- Typst/LaTeX PDF (REQ-RPT-04) — only if @react-pdf actually fails for formal Engineering deliverables

### Phase 4+ — Scale

- Multi-tenant SaaS (€149/mo solo practitioner)
- Self-hosted Supabase (EU)
- Mollie + Wise integrations
- Mobile field-data forms
- ActiveScore
- Dify for CDR drafting / phase-gate checks (situational)

### Explicitly NOT in stack (Spec-rejected)

| Tool | Reason |
|---|---|
| Lovable | Spec v1.1 §8.1 — Developer + Claude Code work directly with code |
| Tally / Make / Baserow | Spec §8.2 — replaced by Next.js + Supabase |
| Replit Agent | Spec §8.5 — documented prod-DB-wipe July 2025 |
| Base44 / Emergent | Lock-in or immaturity for audit-relevant platform |
| Firebase / PlanetScale | Wrong data model (NoSQL / no RLS) |
| `eval()` for conditions | Phase 2 evaluator is explicitly safe (whitelist) |

## 10. MVP "Done" definition (Spec §11 Week 4 adapted)

Walking Skeleton is complete when all 7 of the following work end-to-end with at least DWA-A 138-1 imported:

1. Alvaro logs in (Magic-Link via Supabase Auth + Resend SMTP)
2. Alvaro creates PLT-HS-01 (project + customer Blumen Forscheln + site Heinsberg NRW)
3. Alvaro adds DWA-A 138-1 as applicable standard → 28 `worksheet_instances` auto-instantiated
4. Alvaro opens e.g. worksheet `A138-1-04`, sees fields rendered generically from the DB
5. Alvaro enters values (all data_types: number + text + enum + boolean + date), auto-save writes `project_parameters` + `audit_log`
6. Alvaro submits → approves → finalizes the worksheet. `approval_events` shows 3 rows. `worksheet_instances.status = 'final'`
7. Alvaro generates PDF, sees entered values, compliance clauses listed (no pass/fail eval), approval history rendered

When all 7 work and PLT-HS-01 is started with real C1 Planungsbericht data, MVP is done and Phase 2 begins.

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Vercel CI on rebuild branch stays red until full code refactor done | Draft PR, branch protection NOT requiring green CI on the draft, switch to "ready for review" only when green |
| Supabase Auth sessions survive the wipe, users see empty project list with stale session | Acceptable in dev; before any production cutover, hard-logout all users |
| Live demo URL `ekowai-wizard.vercel.app` shows last green build during rebuild | If anyone needs the legacy demo, alias the last successful build to `ekowai-wizard-legacy.vercel.app` |
| Pass3c data has subtle gaps that only surface during pilot data entry | Expected — that's the point of Paula's pilot. Re-import workflow is idempotent, so corrections are cheap |
| Field rename across re-imports orphans `project_parameters` rows | Importer warns; explicit rename migration required (not auto-deleted) |
| Plan-6 PDF snapshot tests break after rewire | Regenerate snapshots; ~80% of test logic survives, fixture changes |
| Drizzle and SQL migration drift after hand-written migration | `drizzle-kit pull` after migration applies, verify schema diff is empty |
| Equation verification status incorrectly marked `engineer_verified` post-import | Importer always writes `imported_unverified` for new rows; explicit admin action required to verify; cannot accidentally regress |

## 12. Memory updates (after spec accepted)

- `feedback_design_constraints.md` — Engineering Editorial + monospace is **out**; Poppins + brand green + pill badges + logo are the new line (commits `dfc1182`, `179a53a`)
- `project_ekowai_wizard_state.md` — Plan 6 merged to main (`86fe573`); pivot from DWA-A 201 specialist to multi-standard DB-driven platform; pilot is PLT-HS-01 (Paula / Heinsberg)
- `reference_ekowai_agent_corpus.md` — supplement: structured Pass3c workbooks on Desktop (`C:\Users\Ekowai\Desktop\Supabase data\`) are the canonical content source going forward, replacing the per-standard markdown extraction pipeline for the 5 verified standards
- `project_pass3c_workbooks.md` (new) — list of available workbooks, which are Pass3c-verified vs Pass3b3c-experimental
- Hannes Oster has push access to `alvaroburgos-ek/ekowai` since 2026-05-20 (write permission, not admin)
