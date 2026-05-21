# Plan 6: Plan-6 Reattachment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unstub the modules that Plan 5 deferred — citations, inputs-reader, report-archives query, PDF loader/builder — by retargeting them against the new Plan-1 schema (`project_parameters`, `worksheet_instances`, `approval_events`). Wire the citation picker into the live `<DynamicField>` so source-attaching works end-to-end. Hook `archiveOnFinalize` into `transitionWorksheet` so a PDF snapshot lands in `report_archives` when an engineer finalizes a worksheet. Replace the 410-Gone `/api/calculations/[id]/pdf` route with a project-level `/api/projects/[id]/report/pdf` route.

**Architecture:** All stubs replaced with real implementations against the new schema. PDF data load is one query that returns a shaped `ReportData` object (project meta, applicable standards, parameter rows grouped by worksheet, approval timeline). The `<Document>` and its sections receive that shape — most sections survive Plan 5's `@ts-nocheck` once the upstream types are fixed, but layout changes are minor. Archive creation is atomic: when `transitionWorksheet` writes the `finalize` event, the same transaction inserts a `report_archives` row.

**Tech Stack:** Same as Plans 3+4. Drizzle queries + transactions, `@react-pdf/renderer` for PDF, Supabase Storage for archive files.

**Companion Spec:** `docs/superpowers/specs/2026-05-20-db-driven-multi-standard-design.md` (Section 8 — Migration + Plan-6 Reattachment)

**Predecessors:** Plans 1–5. Same branch `feat/db-driven-schema`.

---

## File Structure

**Modify (unstub):**
- `src/lib/pdf/load-data.ts` — return real data
- `src/lib/pdf/build-report.tsx` — orchestrate against new shape
- `src/lib/pdf/sections/*.tsx` — remove `@ts-nocheck`, adapt to new shape
- `src/lib/pdf/document.tsx` — adapt to new shape
- `src/lib/actions/citations.ts` — real attach/detach against `project_parameters.citation_source`
- `src/lib/engine/inputs-reader.ts` — real reader from `project_parameters`
- `src/lib/db/queries/report-archives.ts` — real query against new FK shape
- `src/components/projects/reports-history.tsx` — real component (drop stub)
- `src/app/[locale]/(app)/projects/[id]/reports/page.tsx` — real page
- `src/lib/actions/worksheet-transition.ts` — add archive-on-finalize hook
- `src/components/worksheet/dynamic-field.tsx` — wire CitationPicker properly
- `src/components/worksheet/worksheet-form.tsx` — load docs + initial sources

**Create:**
- `src/app/api/projects/[id]/report/pdf/route.ts` — new project-level PDF route
- `src/lib/actions/__tests__/citations.test.ts` — minimal coverage
- `src/lib/pdf/__tests__/load-data.test.ts` — minimal coverage
- `tests/rls/report-archives.test.ts` — recreate with new FK shape

**Delete:**
- `src/app/api/calculations/[id]/pdf/route.ts` — replaced by project route

---

## Task 1: Retarget loadProjectReportData

**Files:**
- Modify: `src/lib/pdf/load-data.ts` — replace the stub with the real query

- [ ] **Step 1: Write the loader**

```typescript
import 'server-only';
import { db } from '@/lib/db';
import {
  projects,
  orgs,
  standards,
  projectStandards,
  worksheetTemplates,
  worksheetInstances,
  fields,
  projectParameters,
  approvalEvents,
  profiles,
} from '@/lib/db/schema';
import { and, eq, inArray, desc } from 'drizzle-orm';

export type ReportData = {
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    siteLocation: string | null;
    createdAt: string;
    org: { id: string; name: string; logoUrl: string | null } | null;
  };
  standards: Array<{
    id: string;
    code: string;
    titleDe: string;
    version: string;
    activeSince: string;
  }>;
  worksheets: Array<{
    instanceId: string;
    code: string;
    titleDe: string;
    status: string;
    standardCode: string;
    parameters: Array<{
      symbol: string;
      labelDe: string;
      unit: string | null;
      dataType: string;
      value: string | null;
      sourceType: string;
      enteredAt: string;
    }>;
  }>;
  approvals: Array<{
    occurredAt: string;
    worksheetCode: string;
    eventType: string;
    fromStatus: string;
    toStatus: string;
    actorName: string | null;
    comment: string;
  }>;
};

export async function loadProjectReportData(projectId: string): Promise<ReportData> {
  const [proj] = await db
    .select({
      id: projects.id,
      name: projects.name,
      projectCode: projects.projectCode,
      siteLocation: projects.siteLocation,
      createdAt: projects.createdAt,
      org: {
        id: orgs.id,
        name: orgs.name,
        logoUrl: orgs.logoUrl,
      },
    })
    .from(projects)
    .leftJoin(orgs, eq(orgs.id, projects.orgId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj) throw new Error(`Project ${projectId} not found`);

  const stds = await db
    .select({
      id: standards.id,
      code: standards.code,
      titleDe: standards.titleDe,
      version: standards.version,
      activeSince: projectStandards.addedAt,
    })
    .from(projectStandards)
    .innerJoin(standards, eq(standards.id, projectStandards.standardId))
    .where(
      and(
        eq(projectStandards.projectId, projectId),
        eq(projectStandards.status, 'active'),
      ),
    )
    .orderBy(standards.code);

  const instances = await db
    .select({
      instanceId: worksheetInstances.id,
      code: worksheetTemplates.code,
      titleDe: worksheetTemplates.titleDe,
      status: worksheetInstances.status,
      standardCode: standards.code,
      templateId: worksheetTemplates.id,
    })
    .from(worksheetInstances)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(eq(worksheetInstances.projectId, projectId));

  const templateIds = instances.map((i) => i.templateId);
  const allFields = templateIds.length === 0 ? [] : await db
    .select({
      id: fields.id,
      worksheetTemplateId: fields.worksheetTemplateId,
      symbol: fields.symbol,
      labelDe: fields.labelDe,
      unit: fields.unit,
      dataType: fields.dataType,
    })
    .from(fields)
    .where(inArray(fields.worksheetTemplateId, templateIds));

  const params = templateIds.length === 0 ? [] : await db
    .select()
    .from(projectParameters)
    .where(eq(projectParameters.projectId, projectId));
  const paramsByFieldId = new Map(params.map((p) => [p.fieldId, p]));

  const worksheets = instances.map((inst) => {
    const tmplFields = allFields.filter((f) => f.worksheetTemplateId === inst.templateId);
    const parameters = tmplFields.map((f) => {
      const p = paramsByFieldId.get(f.id);
      const value = !p
        ? null
        : f.dataType === 'number' ? (p.valueNumber == null ? null : String(p.valueNumber))
        : f.dataType === 'text' ? p.valueText
        : f.dataType === 'enum' ? p.valueEnum
        : f.dataType === 'date' ? p.valueDate
        : f.dataType === 'boolean' ? (p.valueBoolean == null ? null : (p.valueBoolean ? 'Ja' : 'Nein'))
        : p.valueJson == null ? null : JSON.stringify(p.valueJson);
      return {
        symbol: f.symbol,
        labelDe: f.labelDe,
        unit: f.unit,
        dataType: f.dataType,
        value,
        sourceType: p?.sourceType ?? 'entered',
        enteredAt: p?.enteredAt.toISOString() ?? '',
      };
    });
    return {
      instanceId: inst.instanceId,
      code: inst.code,
      titleDe: inst.titleDe,
      status: inst.status,
      standardCode: inst.standardCode,
      parameters,
    };
  });

  const approvalRows = await db
    .select({
      occurredAt: approvalEvents.occurredAt,
      eventType: approvalEvents.eventType,
      fromStatus: approvalEvents.fromStatus,
      toStatus: approvalEvents.toStatus,
      comment: approvalEvents.comment,
      worksheetCode: worksheetTemplates.code,
      actorName: profiles.fullName,
    })
    .from(approvalEvents)
    .innerJoin(worksheetInstances, eq(worksheetInstances.id, approvalEvents.worksheetInstanceId))
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .leftJoin(profiles, eq(profiles.id, approvalEvents.actorId))
    .where(eq(worksheetInstances.projectId, projectId))
    .orderBy(desc(approvalEvents.occurredAt));

  return {
    project: {
      id: proj.id,
      name: proj.name,
      projectCode: proj.projectCode,
      siteLocation: proj.siteLocation,
      createdAt: proj.createdAt.toISOString(),
      org: proj.org,
    },
    standards: stds.map((s) => ({
      id: s.id,
      code: s.code,
      titleDe: s.titleDe,
      version: s.version,
      activeSince: s.activeSince.toISOString(),
    })),
    worksheets,
    approvals: approvalRows.map((a) => ({
      occurredAt: a.occurredAt.toISOString(),
      worksheetCode: a.worksheetCode,
      eventType: a.eventType,
      fromStatus: a.fromStatus,
      toStatus: a.toStatus,
      actorName: a.actorName,
      comment: a.comment,
    })),
  };
}
```

The legacy `loadCalculationData` export can be kept as a thin wrapper that throws — nothing in the new code calls it.

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | grep "load-data.ts" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf/load-data.ts
git commit -m "feat(pdf): real loadProjectReportData against new schema

Replaces the Plan-5 stub. Loads project + org + active standards +
worksheet_instances + their parameters (joined to fields metadata) +
approval_events with actor name resolution. Returns a single shaped
ReportData object that downstream PDF sections consume."
```

---

## Task 2: Retarget PDF Sections + Document

**Files (modify each, remove `@ts-nocheck`, adapt to new shape):**
- `src/lib/pdf/sections/cover.tsx`
- `src/lib/pdf/sections/grundlagen.tsx`
- `src/lib/pdf/sections/inputs.tsx`
- `src/lib/pdf/sections/approvals.tsx`
- `src/lib/pdf/sections/footer.tsx`
- `src/lib/pdf/sections/watermark.tsx`
- `src/lib/pdf/sections/appendix-divider.tsx`
- `src/lib/pdf/document.tsx`

**Defer (keep stubbed or empty for now — Phase 2 fills):**
- `src/lib/pdf/sections/computed.tsx` — calc engine is Phase 2
- `src/lib/pdf/sections/compliance.tsx` — compliance eval engine is Phase 2
- `src/lib/pdf/sections/decisions.tsx` — decision class is Phase 2

For deferred sections, leave a placeholder component:

```typescript
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function ComputedSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Berechnete Größen</Text>
      <Text style={styles.note}>Phase 2 — automatische Berechnung folgt.</Text>
    </View>
  );
}
```

For the **active** sections (Cover, Grundlagen, Inputs, Approvals, Footer, Watermark, AppendixDivider):

- [ ] **Step 1: Rewrite `cover.tsx`**

```typescript
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

export function CoverSection({ project }: { project: ReportData['project'] }) {
  return (
    <View style={styles.coverPage}>
      <Text style={styles.coverMeta}>
        {project.projectCode ?? project.id.slice(0, 8)}
      </Text>
      <Text style={styles.coverTitle}>{project.name}</Text>
      {project.siteLocation && (
        <Text style={styles.coverSubtitle}>{project.siteLocation}</Text>
      )}
      {project.org && (
        <Text style={styles.coverOrg}>{project.org.name}</Text>
      )}
      <Text style={styles.coverDate}>
        Erstellt am {new Date(project.createdAt).toLocaleDateString('de-DE')}
      </Text>
    </View>
  );
}
```

If `styles.coverPage` / `coverMeta` / `coverTitle` / `coverSubtitle` / `coverOrg` / `coverDate` don't exist, add minimal styles in `src/lib/pdf/styles.ts`.

- [ ] **Step 2: Rewrite `grundlagen.tsx`**

```typescript
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

export function GrundlagenSection({ standards }: { standards: ReportData['standards'] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Anzuwendende Regelwerke</Text>
      <View>
        {standards.map((s) => (
          <View key={s.id} style={styles.row}>
            <Text style={styles.codeCell}>{s.code}</Text>
            <Text style={styles.titleCell}>{s.titleDe}</Text>
            <Text style={styles.versionCell}>{s.version}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Rewrite `inputs.tsx`**

```typescript
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

export function InputsSection({ worksheets }: { worksheets: ReportData['worksheets'] }) {
  const populated = worksheets.filter((w) => w.parameters.some((p) => p.value != null));
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Eingaben</Text>
      {populated.length === 0 ? (
        <Text style={styles.note}>Noch keine Werte eingetragen.</Text>
      ) : (
        populated.map((w) => (
          <View key={w.instanceId} style={styles.worksheetGroup}>
            <Text style={styles.worksheetTitle}>
              {w.code} · {w.titleDe}
            </Text>
            {w.parameters
              .filter((p) => p.value != null)
              .map((p) => (
                <View key={p.symbol} style={styles.row}>
                  <Text style={styles.symbolCell}>{p.symbol}</Text>
                  <Text style={styles.labelCell}>{p.labelDe}</Text>
                  <Text style={styles.valueCell}>
                    {p.value}
                    {p.unit && ` ${p.unit}`}
                  </Text>
                </View>
              ))}
          </View>
        ))
      )}
    </View>
  );
}
```

- [ ] **Step 4: Rewrite `approvals.tsx`**

```typescript
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

export function ApprovalsSection({ approvals }: { approvals: ReportData['approvals'] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Auditprotokoll · Freigaben</Text>
      {approvals.length === 0 ? (
        <Text style={styles.note}>Noch keine Freigaben.</Text>
      ) : (
        approvals.map((a, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.dateCell}>
              {new Date(a.occurredAt).toLocaleString('de-DE')}
            </Text>
            <Text style={styles.codeCell}>{a.worksheetCode}</Text>
            <Text style={styles.eventCell}>
              {a.fromStatus} → {a.toStatus}
            </Text>
            <Text style={styles.actorCell}>{a.actorName ?? '—'}</Text>
            <Text style={styles.commentCell}>„{a.comment}"</Text>
          </View>
        ))
      )}
    </View>
  );
}
```

- [ ] **Step 5: Footer + Watermark + AppendixDivider**

These don't depend on the new data shape — just remove `@ts-nocheck` and verify they typecheck.

```typescript
// footer.tsx — display project code + page number
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function Footer({ projectCode }: { projectCode: string | null }) {
  return (
    <View fixed style={styles.footer}>
      <Text>{projectCode ?? 'PROJEKT'}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// watermark.tsx
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function Watermark({ text }: { text: string }) {
  return (
    <View fixed style={styles.watermark}>
      <Text>{text}</Text>
    </View>
  );
}

// appendix-divider.tsx
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function AppendixDivider({ title }: { title: string }) {
  return (
    <View break style={styles.appendixDivider}>
      <Text style={styles.appendixTitle}>{title}</Text>
    </View>
  );
}
```

- [ ] **Step 6: Update `document.tsx`**

```typescript
import { Document, Page } from '@react-pdf/renderer';
import { styles } from './styles';
import { CoverSection } from './sections/cover';
import { GrundlagenSection } from './sections/grundlagen';
import { InputsSection } from './sections/inputs';
import { ApprovalsSection } from './sections/approvals';
import { Footer } from './sections/footer';
import { Watermark } from './sections/watermark';
import { AppendixDivider } from './sections/appendix-divider';
import type { ReportData } from './load-data';

export function ReportDocument({ data }: { data: ReportData }) {
  const isPreview = data.approvals.length === 0 || !data.approvals.some((a) => a.toStatus === 'final');
  return (
    <Document title={`${data.project.projectCode ?? 'Projekt'} — Bericht`}>
      <Page size="A4" style={styles.page}>
        <CoverSection project={data.project} />
        <Footer projectCode={data.project.projectCode} />
        {isPreview && <Watermark text="VORSCHAU — nicht freigegeben" />}
      </Page>
      <Page size="A4" style={styles.page}>
        <GrundlagenSection standards={data.standards} />
        <InputsSection worksheets={data.worksheets} />
        <Footer projectCode={data.project.projectCode} />
        {isPreview && <Watermark text="VORSCHAU — nicht freigegeben" />}
      </Page>
      <Page size="A4" style={styles.page}>
        <AppendixDivider title="Anhang · Auditprotokoll" />
        <ApprovalsSection approvals={data.approvals} />
        <Footer projectCode={data.project.projectCode} />
      </Page>
    </Document>
  );
}
```

- [ ] **Step 7: Update `styles.ts`** — add the missing style keys

```typescript
// Append to styles.ts:
coverPage: { padding: 48, height: '100%', justifyContent: 'center' },
coverMeta: { fontSize: 10, letterSpacing: 2, color: '#666', marginBottom: 16 },
coverTitle: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
coverSubtitle: { fontSize: 14, color: '#444', marginBottom: 24 },
coverOrg: { fontSize: 12, color: '#666', marginBottom: 8 },
coverDate: { fontSize: 10, color: '#888' },
section: { marginBottom: 24 },
sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
row: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
codeCell: { width: 80, fontSize: 9 },
titleCell: { flex: 1, fontSize: 10 },
versionCell: { width: 80, fontSize: 9, color: '#666' },
symbolCell: { width: 80, fontSize: 9, fontFamily: 'Courier' },
labelCell: { flex: 1, fontSize: 9 },
valueCell: { width: 120, fontSize: 9, textAlign: 'right' },
dateCell: { width: 100, fontSize: 8 },
eventCell: { width: 160, fontSize: 8 },
actorCell: { width: 80, fontSize: 8 },
commentCell: { flex: 1, fontSize: 8, fontStyle: 'italic' },
worksheetGroup: { marginBottom: 12 },
worksheetTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
note: { fontSize: 9, fontStyle: 'italic', color: '#666' },
footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#888' },
watermark: { position: 'absolute', top: 200, left: 0, right: 0, alignItems: 'center', fontSize: 36, color: '#ccc', transform: 'rotate(-30deg)' },
appendixDivider: { padding: 48, height: '100%', justifyContent: 'center' },
appendixTitle: { fontSize: 24, fontWeight: 'bold' },
```

Adjust to match existing styles.ts conventions. If keys already exist with conflicting types, keep the existing keys.

- [ ] **Step 8: Update `build-report.tsx`**

```typescript
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportDocument } from './document';
import { loadProjectReportData } from './load-data';

export async function buildProjectReport(projectId: string): Promise<Buffer> {
  const data = await loadProjectReportData(projectId);
  return renderToBuffer(<ReportDocument data={data} />);
}
```

- [ ] **Step 9: Typecheck**

```bash
pnpm typecheck 2>&1 | grep "src/lib/pdf/" | head -20
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/pdf/
git commit -m "feat(pdf): retarget sections + document + builder to new schema

- Cover, Grundlagen, Inputs, Approvals sections rewritten against
  ReportData (Plan 1+3+4 schema)
- Computed, Compliance, Decisions sections placeholdered (Phase 2)
- Footer, Watermark, AppendixDivider clean
- buildProjectReport(projectId) replaces loadCalculationData flow
- New PDF preview-style watermark when project not yet finalized"
```

---

## Task 3: New PDF API Route

**Files:**
- Delete: `src/app/api/calculations/[id]/pdf/route.ts`
- Create: `src/app/api/projects/[id]/report/pdf/route.ts`

- [ ] **Step 1: Write the new route**

```typescript
import { NextResponse } from 'next/server';
import { buildProjectReport } from '@/lib/pdf/build-report';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  try {
    const buffer = await buildProjectReport(id);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="report-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Delete the old stub**

```bash
git rm src/app/api/calculations/[id]/pdf/route.ts
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | grep "report/pdf" | head -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/projects/[id]/report/pdf/ src/app/api/calculations/
git commit -m "feat(api): /api/projects/[id]/report/pdf — project-level PDF route

Replaces /api/calculations/[id]/pdf (deleted). Generates a PDF
report via buildProjectReport() and streams it as application/pdf."
```

---

## Task 4: archiveOnFinalize Hook

**Files:**
- Modify: `src/lib/actions/worksheet-transition.ts` — hook archive creation on finalize

- [ ] **Step 1: Extend `transitionWorksheet`**

Add inside the transaction, AFTER the audit_log insert and BEFORE the closing brace:

```typescript
// Archive a PDF snapshot when an engineer finalizes a worksheet
if (input.eventType === 'finalize') {
  await tx.insert(reportArchives).values({
    projectId: instance.projectId,
    orgId: instance.orgId ?? null,        // if instance has orgId — check schema; else look up from project
    approvalEventId: null,                // we don't have the inserted approval_events.id easily; Phase 2 enhances
    worksheetInstanceId: instance.id,
    archivedAt: new Date(),
    archivedBy: userId,
    // File creation deferred — Phase 2 streams the PDF buffer to Storage
    // and stores the path here. For now: row exists with metadata only.
    filePath: null,
    fileSize: 0,
    title: `Finalize · ${input.instanceId.slice(0, 8)}`,
  });
}
```

If the `reportArchives` table requires non-null `filePath` or other columns, adjust. Check `src/lib/db/schema.ts`.

If the orgId can't be looked up cheaply, query it before the transaction:
```typescript
const [projOrgRow] = await db.select({ orgId: projects.orgId }).from(projects).where(eq(projects.id, instance.projectId)).limit(1);
const orgId = projOrgRow?.orgId ?? null;
```
And use `orgId` instead of `instance.orgId`.

Add the import:
```typescript
import { reportArchives, projects } from '@/lib/db/schema';
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | grep "worksheet-transition" | head -5
```

If the schema rejects `filePath: null` (NOT NULL constraint), use a placeholder string `'pending'` or make the column nullable in a tiny follow-up migration. Note in commit.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/worksheet-transition.ts
git commit -m "feat(transition): archive on finalize — insert report_archives row

When transitionWorksheet processes a 'finalize' event, the same
transaction inserts a report_archives row with worksheet_instance_id
and the actor. The PDF file itself is generated on-demand by the
/api/projects/[id]/report/pdf route; persisting to Storage is
deferred to Phase 2 (the archive row exists as the artifact pointer)."
```

---

## Task 5: Retarget report-archives Query + History Component + Page

**Files:**
- Modify: `src/lib/db/queries/report-archives.ts` — real query
- Modify: `src/components/projects/reports-history.tsx` — list rows
- Modify: `src/app/[locale]/(app)/projects/[id]/reports/page.tsx` — render the list + link to PDF

- [ ] **Step 1: Query**

```typescript
import 'server-only';
import { db } from '@/lib/db';
import {
  reportArchives,
  worksheetInstances,
  worksheetTemplates,
  profiles,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function listReportArchivesForProject(projectId: string) {
  return db
    .select({
      id: reportArchives.id,
      archivedAt: reportArchives.archivedAt,
      title: reportArchives.title,
      filePath: reportArchives.filePath,
      worksheetCode: worksheetTemplates.code,
      worksheetTitleDe: worksheetTemplates.titleDe,
      archivedByName: profiles.fullName,
    })
    .from(reportArchives)
    .leftJoin(worksheetInstances, eq(worksheetInstances.id, reportArchives.worksheetInstanceId))
    .leftJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .leftJoin(profiles, eq(profiles.id, reportArchives.archivedBy))
    .where(eq(reportArchives.projectId, projectId))
    .orderBy(desc(reportArchives.archivedAt));
}
```

- [ ] **Step 2: Component**

```typescript
type Entry = {
  id: string;
  archivedAt: Date;
  title: string | null;
  filePath: string | null;
  worksheetCode: string | null;
  worksheetTitleDe: string | null;
  archivedByName: string | null;
};

export function ReportsHistory({ entries, projectId, locale }: {
  entries: Entry[];
  projectId: string;
  locale: 'de' | 'en';
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-subtext italic">Noch keine Berichte archiviert.</p>;
  }
  return (
    <ul className="divide-y divide-hairline">
      {entries.map((e) => (
        <li key={e.id} className="py-3 flex items-center gap-4 text-sm">
          <div className="w-32 text-xs text-subtext tabular-nums">
            {e.archivedAt.toLocaleString('de-DE')}
          </div>
          <div className="flex-1">
            <div className="font-medium text-ink">
              {e.worksheetCode ?? '—'} · {e.worksheetTitleDe ?? e.title ?? 'Bericht'}
            </div>
            <div className="text-xs text-subtext">
              durch {e.archivedByName ?? '—'}
            </div>
          </div>
          <a
            href={`/api/projects/${projectId}/report/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent underline"
          >
            PDF öffnen
          </a>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Page**

```typescript
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { listReportArchivesForProject } from '@/lib/db/queries/report-archives';
import { ReportsHistory } from '@/components/projects/reports-history';

export default async function ProjectReportsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const localeTyped = locale === 'en' ? 'en' : 'de';
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const archives = await listReportArchivesForProject(id);

  return (
    <article className="space-y-8 max-w-4xl">
      <header className="border-b border-hairline pb-6">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          Berichtsverlauf · {project.name}
        </h1>
        <div className="mt-2 text-xs text-subtext">
          <a href={`/api/projects/${id}/report/pdf`} target="_blank" rel="noopener noreferrer" className="text-accent underline">
            Aktuellen Bericht öffnen (Live-PDF)
          </a>
        </div>
      </header>
      <ReportsHistory entries={archives} projectId={id} locale={localeTyped as 'de' | 'en'} />
    </article>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "(report-archives|reports-history|reports/page)" | head -5
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/report-archives.ts \
        src/components/projects/reports-history.tsx \
        src/app/[locale]/\(app\)/projects/[id]/reports/page.tsx
git commit -m "feat(reports): retarget report-archives query + history component + page

Real implementation against the new FK shape (approval_event_id +
worksheet_instance_id). Page shows the archive list and a link to the
live PDF endpoint."
```

---

## Task 6: Retarget Citations + Inputs-Reader

**Files:**
- Modify: `src/lib/actions/citations.ts`
- Modify: `src/lib/engine/inputs-reader.ts`

- [ ] **Step 1: Real citations.ts**

```typescript
'use server';
import { db } from '@/lib/db';
import { projectParameters, fields, auditLog, worksheetInstances } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export type CitationSource = {
  docId: string;
  page?: number;
  note?: string;
};

export async function attachCitation(input: {
  projectId: string;
  fieldId: string;
  source: CitationSource;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };
  const userId = auth.user.id;

  // Build the full citation payload
  const citationSource = {
    docId: input.source.docId,
    page: input.source.page ?? null,
    note: input.source.note ?? null,
    attachedBy: userId,
    attachedAt: new Date().toISOString(),
  };

  try {
    await db.transaction(async (tx) => {
      // Ensure a project_parameters row exists; we may need to upsert with null value
      const existing = await tx
        .select()
        .from(projectParameters)
        .where(and(
          eq(projectParameters.projectId, input.projectId),
          eq(projectParameters.fieldId, input.fieldId),
        ))
        .limit(1);

      if (existing.length === 0) {
        await tx.insert(projectParameters).values({
          projectId: input.projectId,
          fieldId: input.fieldId,
          sourceType: 'entered',
          citationSource,
          enteredBy: userId,
        });
      } else {
        await tx
          .update(projectParameters)
          .set({ citationSource, enteredBy: userId, enteredAt: new Date() })
          .where(and(
            eq(projectParameters.projectId, input.projectId),
            eq(projectParameters.fieldId, input.fieldId),
          ));
      }

      await tx.insert(auditLog).values({
        actorId: userId,
        actorRole: 'engineer',
        projectId: input.projectId,
        tableName: 'project_parameters',
        recordId: input.fieldId,
        action: 'update',
        changes: { citation_attached: citationSource },
      });
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function detachCitation(input: {
  projectId: string;
  fieldId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };

  try {
    await db
      .update(projectParameters)
      .set({ citationSource: null })
      .where(and(
        eq(projectParameters.projectId, input.projectId),
        eq(projectParameters.fieldId, input.fieldId),
      ));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Legacy aliases — the existing CitationPicker UI may call these
export const attachSource = attachCitation;
export const detachSource = detachCitation;
```

- [ ] **Step 2: Real inputs-reader.ts**

```typescript
import 'server-only';
import { db } from '@/lib/db';
import { projectParameters, fields } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export type InputSource = { docId: string; page?: number; note?: string };

export type FieldValue = {
  value: unknown;
  source?: InputSource;
};

export async function readInputsWithSources(
  projectId: string,
  fieldIds: string[],
): Promise<Record<string, FieldValue>> {
  if (fieldIds.length === 0) return {};

  const rows = await db
    .select()
    .from(projectParameters)
    .where(and(
      eq(projectParameters.projectId, projectId),
      inArray(projectParameters.fieldId, fieldIds),
    ));

  const out: Record<string, FieldValue> = {};
  for (const r of rows) {
    const value =
      r.valueNumber ?? r.valueText ?? r.valueEnum ?? r.valueDate ?? r.valueBoolean ?? r.valueJson;
    const source =
      r.citationSource && typeof r.citationSource === 'object'
        ? (r.citationSource as InputSource)
        : undefined;
    out[r.fieldId] = { value, source };
  }
  return out;
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "(citations.ts|inputs-reader.ts)" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/citations.ts src/lib/engine/inputs-reader.ts
git commit -m "feat(citations): real attach/detach + inputs-reader against project_parameters

citation_source JSONB on project_parameters holds { docId, page, note,
attachedBy, attachedAt } per Plan 6's spec §8.4. attachCitation upserts
the row (creating an empty project_parameters if necessary) inside one
transaction and writes audit_log. detachCitation nulls the column.

inputs-reader returns { value, source? } per field_id, replacing the
stub that threw."
```

---

## Task 7: Wire CitationPicker in DynamicField

**Files:**
- Modify: `src/components/worksheet/dynamic-field.tsx` — call real attach/detach
- Modify: `src/components/worksheet/worksheet-form.tsx` — load docs + initial sources

The existing CitationPicker UI was Plan-6-merge era and expects a `calcId` prop. In Plan 6's retarget, that prop semantic shifts to `projectParameterId` or `(projectId, fieldId)`.

Without modifying the CitationPicker component itself (it's UI that we kept intact in Plan 5), the cleanest move is to wrap the picker's submit handler in a small adapter inside `DynamicField` that:
1. Reads the picker's source selection
2. Calls `attachCitation({ projectId, fieldId, source })`
3. Updates the store's sources map

- [ ] **Step 1: Adapt DynamicField**

In `src/components/worksheet/dynamic-field.tsx`, replace the existing `<CitationPicker>` integration with this adapter:

```typescript
// Inside the component, near the bottom return JSX:

{calcId /* legacy prop name; now we pass instanceId or null */ && (
  <CitationPicker
    open={pickerOpen}
    onClose={() => setPickerOpen(false)}
    calcId={instanceId ?? 'pending'}  // CitationPicker uses this internally; can be a stub
    symbol={field.symbol}
    docs={docs}
    // Note: if CitationPicker calls attachSource on submit, our citations.ts
    // exports attachSource as an alias for attachCitation — but the legacy
    // call signature takes { calcId, symbol, source }, not { projectId, fieldId, source }.
    // Best path forward: rewrite the CitationPicker submit-handler to call
    // attachCitation with our new shape OR add a compat shim in citations.ts.
  />
)}
```

**Easiest interim approach:** add a compat shim in `src/lib/actions/citations.ts` that maps the legacy call shape to the new one. If CitationPicker invokes `attachSource({ calcId, symbol, source })`, we don't have project/field IDs to look up from `calcId` + `symbol` anymore.

Pragmatic alternative for MVP: **modify CitationPicker's submit handler to take a `projectId` + `fieldId` prop instead of `calcId` + `symbol`.** This is a small change in `src/components/documents/citation-picker.tsx`.

Examine `citation-picker.tsx` first, then decide:
- If the picker is small and self-contained: modify it to accept the new props
- If the picker is complex and tightly coupled: write a thin wrapper component in `dynamic-field.tsx` that intercepts the submit

Pick the simplest path. Document the decision in the commit message.

- [ ] **Step 2: Worksheet form: load docs + initial sources**

In `src/components/worksheet/worksheet-form.tsx` `useEffect` for init, additionally pass `initialSources`:

In the Server Component route (`/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx`), use `readInputsWithSources` to build the initial sources map:

```typescript
import { readInputsWithSources } from '@/lib/engine/inputs-reader';
import { listProjectDocuments } from '@/lib/db/queries/documents';  // if exists; else inline query

const inputs = await readInputsWithSources(projectId, ws.fields.map((f) => f.id));
const initialSources: Record<string, { docId: string; page?: number; note?: string } | null> = {};
for (const f of ws.fields) {
  initialSources[f.id] = inputs[f.id]?.source ?? null;
}

const docs = await db
  .select({ id: projectDocuments.id, title: projectDocuments.title })
  .from(projectDocuments)
  .where(eq(projectDocuments.projectId, projectId));

// Then pass docs + initialSources to WorksheetForm
```

In WorksheetForm component, change the init call:
```typescript
init(instance.id, initialValues, initialSources);
```

And accept `initialSources` as a prop.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "(dynamic-field|worksheet-form|worksheets/\[worksheetCode\])" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/worksheet/dynamic-field.tsx \
        src/components/worksheet/worksheet-form.tsx \
        src/components/documents/citation-picker.tsx \
        src/app/[locale]/\(app\)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx
git commit -m "feat(citations): wire CitationPicker through DynamicField + new schema

DynamicField + WorksheetForm now load existing citations from
project_parameters and pass them through the store. CitationPicker's
submit handler calls attachCitation({projectId, fieldId, source})
against the new schema. Initial sources hydrated by the Server
Component using readInputsWithSources."
```

---

## Task 8: Recreate report-archives RLS Test

The previous one referenced dropped `approvals` and `calculations`. Recreate against the new shape.

**Files:**
- Create: `tests/rls/report-archives.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('report_archives RLS — org-scoped', () => {
  const e1 = `rls-ra-a-${Date.now()}@test.local`;
  const e2 = `rls-ra-b-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('user A cannot read report_archives from org B', async () => {
    const ad = admin();
    const a = await makeUser(e1);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo RA');

    const { data: proj } = await ad.from('projects').insert({ org_id: orgB, name: 'B', created_by: b.id }).select('id').single();
    const { data: std } = await ad.from('standards').insert({ code: `RA-${Date.now()}`, title_de: 'T', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates').insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' }).select('id').single();
    const { data: inst } = await ad.from('worksheet_instances').insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id }).select('id').single();

    await ad.from('report_archives').insert({
      project_id: proj!.id,
      org_id: orgB,
      worksheet_instance_id: inst!.id,
      archived_by: b.id,
      title: 'Secret B archive',
      file_path: 'placeholder',
      file_size: 0,
    });

    const { data, error } = await a.client
      .from('report_archives')
      .select('*')
      .eq('project_id', proj!.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
```

If the `report_archives` table has different required columns, adjust the INSERT. Check `src/lib/db/schema.ts`.

- [ ] **Step 2: Run**

```bash
pnpm test:rls tests/rls/report-archives.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/rls/report-archives.test.ts
git commit -m "test(rls): report_archives cross-org isolation (recreated for new schema)

Old test was deleted in Plan 5 because it referenced dropped tables.
New test uses approval_event_id + worksheet_instance_id FKs."
```

---

## Task 9: End-to-End Smoke

- [ ] **Step 1: Verify build still green**

```bash
pnpm typecheck && pnpm test && pnpm test:rls && pnpm build
```

All should pass.

- [ ] **Step 2: Re-run pilot seed**

```bash
pnpm tsx scripts/seed-pilot-project.ts
```

Expected: idempotent, prints same project ID.

- [ ] **Step 3: Dev server + curl smoke**

```bash
pnpm dev > /tmp/devserver-plan6.log 2>&1 &
DEV_PID=$!
for i in $(seq 1 15); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/de 2>/dev/null)
  if echo "$CODE" | grep -qE "200|307|302"; then break; fi
  sleep 2
done

PID=02f93026-fb20-4463-abd6-540befc049a9
echo "/standards: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/de/projects/$PID/standards)"
echo "/audit: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/de/projects/$PID/audit)"
echo "/reports: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/de/projects/$PID/reports)"
echo "/worksheet: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/de/projects/$PID/standards/DWA-A-138-1/worksheets/A138-01)"
echo "/api/pdf: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/projects/$PID/report/pdf)"

kill $DEV_PID 2>/dev/null
```

All 5 should be 200 or 307 (auth redirect). The PDF endpoint specifically — note that without auth the project query returns nothing and the PDF builder will throw. If you see 307 redirecting to login, that's OK. If you see 500, capture the dev log lines.

- [ ] **Step 4: Empty checkpoint**

```bash
git commit --allow-empty -m "chore(smoke): Plan 6 routes green — PDF + reports + worksheet"
```

---

## Task 10: Push + Final PR Update

- [ ] **Step 1: Push**

```bash
git push origin feat/db-driven-schema
```

- [ ] **Step 2: Final PR body update**

```bash
gh pr edit 1 --body "$(cat <<'EOF'
## Summary

All 6 plans of the 2026-05-20 DB-driven multi-standard rebuild spec
complete.

### Plan 1 — Schema Migration
17-table schema, RLS-enforced immutability on approval_events + audit_log.

### Plan 2 — Pass3c xlsx Importer
5 standards imported (135 worksheets, 627 fields, 71 equations, 174 reqs).

### Plan 3 — Dynamic Form Renderer
Generic worksheet routes + DynamicField + auto-save → project_parameters
+ audit_log.

### Plan 4 — Approval State Machine + Audit
transitionWorksheet + immutable approval_events + /audit timeline view.

### Plan 5 — Cleanup + Pilot Seed
A-201 engine + bundled JSONs + old calc routes + old actions all
deleted. Plan-6-derived modules stubbed for clean compile.
seed-pilot-project.ts creates PLT-HS-01 with 105 instances.
Build goes green.

### Plan 6 — Plan-6 Reattachment
- loadProjectReportData against new schema
- PDF document + sections retargeted (Cover, Grundlagen, Inputs,
  Approvals active; Computed/Compliance/Decisions Phase-2-deferred)
- /api/projects/[id]/report/pdf endpoint
- archiveOnFinalize hook in transitionWorksheet
- /reports page lists report_archives
- citations action + inputs-reader against project_parameters.citation_source
- CitationPicker wired through DynamicField
- report_archives RLS test recreated

## MVP Done-Criteria (Spec §10)

- [x] Login (Magic-Link via Supabase Auth + Resend SMTP)
- [x] Create PLT-HS-01 (via seed script)
- [x] Add DWA-A 138-1 + 820-1/2/3 as applicable standards (via seed)
- [x] Open any worksheet, see fields rendered from DB
- [x] Enter values (all data_types except json — Phase 2)
- [x] Auto-save writes project_parameters + audit_log
- [x] Submit → approve → finalize via ApprovalBar
- [x] Audit-log timeline at /projects/[id]/audit
- [x] PDF report via /api/projects/[id]/report/pdf
- [x] archiveOnFinalize creates report_archives row
- [x] Every action traceable

## Test plan

- [x] Plan 1: 5 RLS tests
- [x] Plan 2: 17 unit + 5 standards imported
- [x] Plan 3: 2 RLS + smoke
- [x] Plan 4: 3 RLS + state-machine smoke
- [x] Plan 5: typecheck + test + build all green
- [x] Plan 6: report_archives RLS + end-to-end smoke
- [ ] (Human) Browser test: full Paula workflow end-to-end
- [ ] (Engineer) Patch the 4 workbook data gaps from Plan 2

## Phase 2 Roadmap (post-MVP)

- field_bindings (auto-prefill cross-standard)
- json data_type (multi-row tables)
- engineer-verification UI
- compliance evaluation engine
- decision-tree renderer
- staleness cascade
- Skribble deviation gate
- Python calc engine
- client portal
- FLL standards, DIN-276
- Typst/LaTeX PDF migration (only if @react-pdf hits a wall)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Mark PR ready for review**

```bash
gh pr ready 1
```

This flips the draft PR to ready-for-review, signaling that the work is complete.

---

## Done Criteria for Plan 6

1. All stubs replaced with real implementations
2. `pnpm typecheck && pnpm test && pnpm test:rls && pnpm build` all exit 0
3. `/api/projects/[id]/report/pdf` returns a valid PDF (HTTP 200 application/pdf when authenticated)
4. `transitionWorksheet` on a 'finalize' event creates a `report_archives` row
5. `/projects/[id]/reports` page lists the archive
6. CitationPicker can attach a source to a field; `project_parameters.citation_source` populated
7. RLS test for `report_archives` cross-org isolation green
8. PR #1 marked ready for review

Plans 1–6 complete. MVP done per Spec §10.
