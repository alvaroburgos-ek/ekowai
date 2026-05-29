import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects, worksheetTemplates, worksheetInstances, projectDocuments } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  loadWorksheet,
  ensureWorksheetInstance,
  loadProjectParameters,
  loadSameSymbolValues,
  loadInheritedFields,
} from '@/lib/db/queries/worksheet';
import { mergeInheritedFields } from '@/lib/eval/merge-inherited-fields';
import { WorksheetForm } from '@/components/worksheet/worksheet-form';
import { WorksheetListSidebar } from '@/components/worksheet/worksheet-list-sidebar';

export default async function WorksheetPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; standardCode: string; worksheetCode: string }>;
}) {
  const { locale, id, standardCode, worksheetCode } = await params;
  const localeTyped = locale === 'en' ? 'en' : 'de';
  const projectId = id;

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) notFound();

  const ws = await loadWorksheet(standardCode, worksheetCode);
  if (!ws) notFound();

  // Pull inherited fields from upstream worksheets in the same standard that
  // declared this worksheet as a consumer (via fields.consumer_worksheets).
  // Merge order: own fields first, then inherited (own wins on symbol collision).
  const inheritedRaw = await loadInheritedFields(
    ws.template.id,
    ws.template.standard.id,
    worksheetCode,
  );
  const mergedFields = mergeInheritedFields(ws.fields, inheritedRaw);

  const fieldIds = mergedFields.map((f) => f.id);
  const fieldSymbols = mergedFields.map((f) => f.symbol);

  // Parallelise all queries that depend on ws.template.id but not on each other
  const [instance, parameters, sameSymbol, sidebarWorksheets, docs] = await Promise.all([
    ensureWorksheetInstance(projectId, ws.template.id),
    loadProjectParameters(projectId, fieldIds),
    loadSameSymbolValues(projectId, ws.template.id, fieldSymbols),
    // All worksheets of this standard for sidebar
    db
      .select({
        code: worksheetTemplates.code,
        titleDe: worksheetTemplates.titleDe,
        titleEn: worksheetTemplates.titleEn,
        phase: worksheetTemplates.phase,
        archetype: worksheetTemplates.archetype,
        status: worksheetInstances.status,
      })
      .from(worksheetTemplates)
      .leftJoin(
        worksheetInstances,
        and(
          eq(worksheetInstances.worksheetTemplateId, worksheetTemplates.id),
          eq(worksheetInstances.projectId, projectId),
        ),
      )
      .where(eq(worksheetTemplates.standardId, ws.template.standard.id))
      .orderBy(worksheetTemplates.orderIndex),
    // Project documents for citation picker
    db
      .select({
        id: projectDocuments.id,
        title: projectDocuments.title,
        citationLabel: projectDocuments.citationLabel,
      })
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId)),
  ]);

  // Convert parameters → initialValues for the store. Fields without a local
  // saved value fall back to a same-symbol value from another worksheet (the
  // most-recently-updated wins) — engineer can still override by typing.
  const initialValues: Record<string, unknown> = {};
  const inheritedFromBySymbol: Record<string, string> = {};
  for (const f of mergedFields) {
    const p = parameters.get(f.id);
    if (p) {
      switch (f.dataType) {
        case 'number':
          initialValues[f.id] = { type: 'number', value: p.valueNumber == null ? null : Number(p.valueNumber) };
          break;
        case 'text':
          initialValues[f.id] = { type: 'text', value: p.valueText };
          break;
        case 'enum':
          initialValues[f.id] = { type: 'enum', value: p.valueEnum };
          break;
        case 'date':
          initialValues[f.id] = { type: 'date', value: p.valueDate };
          break;
        case 'boolean':
          initialValues[f.id] = { type: 'boolean', value: p.valueBoolean };
          break;
        case 'json':
          initialValues[f.id] = { type: 'json', value: p.valueJson };
          break;
      }
      continue;
    }
    // No local param — try to inherit from another worksheet.
    const upstream = sameSymbol.get(f.symbol)?.[0];
    if (!upstream) continue;
    const v = upstream.value;
    let coerced: { type: string; value: unknown } | null = null;
    switch (f.dataType) {
      case 'number': {
        const n = typeof v === 'number' ? v : Number(v as string);
        if (Number.isFinite(n)) coerced = { type: 'number', value: n };
        break;
      }
      case 'text':
        if (typeof v === 'string' || typeof v === 'number') coerced = { type: 'text', value: String(v) };
        break;
      case 'enum':
        if (typeof v === 'string') coerced = { type: 'enum', value: v };
        break;
      case 'date':
        if (typeof v === 'string') coerced = { type: 'date', value: v };
        break;
      case 'boolean':
        if (typeof v === 'boolean') coerced = { type: 'boolean', value: v };
        break;
      case 'json':
        coerced = { type: 'json', value: v };
        break;
    }
    if (coerced) {
      initialValues[f.id] = coerced;
      inheritedFromBySymbol[f.symbol] = upstream.worksheetCode;
    }
  }

  const sameSymbolValuesBySymbol: Record<string, Array<{ worksheetCode: string; value: unknown }>> = {};
  for (const [symbol, arr] of sameSymbol) {
    sameSymbolValuesBySymbol[symbol] = arr.map(({ worksheetCode, value }) => ({ worksheetCode, value }));
  }

  // Build citations map: field_id → Citation[] (from project_parameters.citation_sources)
  type Citation = { id: string; docId: string; page: number | null; note: string | null };
  const initialCitations: Record<string, Citation[]> = {};
  for (const f of mergedFields) {
    const p = parameters.get(f.id);
    if (!p) continue;
    const arr = (p.citationSources as Citation[] | null) ?? [];
    if (arr.length > 0) initialCitations[f.id] = arr;
  }

  // Fix 4: extract citation sources directly from already-loaded parameters Map
  // (avoids the redundant readInputsWithSources round-trip to the same rows)
  const initialSources: Record<string, { docId: string; page?: number; note?: string } | null> = {};
  for (const f of mergedFields) {
    const p = parameters.get(f.id);
    initialSources[f.id] = (p?.citationSource as { docId: string; page?: number; note?: string } | null) ?? null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-12">
      <aside>
        <WorksheetListSidebar
          projectId={projectId}
          standardCode={standardCode}
          worksheets={sidebarWorksheets.map((w) => ({ ...w, status: (w.status ?? null) as 'draft' | 'submitted_for_review' | 'engineer_approved' | 'final' | 'deactivated' | null }))}
          locale={localeTyped}
          activeWorksheetCode={worksheetCode}
        />
      </aside>
      <main>
        <WorksheetForm
          locale={localeTyped}
          projectId={projectId}
          worksheet={{ template: ws.template }}
          instance={{ id: instance.id, status: instance.status as 'draft' | 'submitted_for_review' | 'engineer_approved' | 'final' | 'deactivated' }}
          sections={ws.sections.map((s) => ({
            id: s.id, code: s.code, titleDe: s.titleDe, titleEn: s.titleEn,
            orderIndex: s.orderIndex, parentSectionId: s.parentSectionId,
          }))}
          fields={mergedFields.map((f) => ({
            id: f.id, sectionId: f.sectionId, symbol: f.symbol,
            labelDe: f.labelDe, labelEn: f.labelEn, unit: f.unit,
            dataType: f.dataType as 'number' | 'text' | 'enum' | 'date' | 'boolean' | 'json',
            isRequired: f.isRequired,
            enumValues: f.enumValues as Array<{ value: string; label_de: string | null; label_en: string | null }> | null,
            validationRules: f.validationRules as { min?: number; max?: number; maxLength?: number; raw?: string } | null,
            clauseReference: f.clauseReference,
            verificationStatus: f.verificationStatus,
            orderIndex: f.orderIndex,
            active: f.active,
            inheritedFromWorksheet: f.inheritedFromWorksheet,
          })) as never}
          equations={ws.equations.map((e) => ({
            id: e.id, equationNumber: e.equationNumber, formula: e.formula,
            inputSymbols: e.inputSymbols, outputSymbol: e.outputSymbol,
            clauseReference: e.clauseReference, description: e.description,
            verificationStatus: e.verificationStatus,
          }))}
          complianceRequirements={ws.complianceRequirements.map((c) => ({
            id: c.id, code: c.code,
            titleDe: c.titleDe, titleEn: c.titleEn,
            condition: c.condition,
            description: c.description, clauseReference: c.clauseReference,
            severity: c.severity,
            suggestion: c.suggestion,
          }))}
          complianceSuggestions={ws.complianceSuggestions.map((s) => ({
            id: s.id,
            requirementId: s.requirementId,
            suggestionType: s.suggestionType as 'alternative_worksheet' | 'alternative_standard' | 'upstream_treatment' | 'design_change',
            targetStandardCode: s.targetStandardCode,
            targetWorksheetCode: s.targetWorksheetCode,
            suggestionDe: s.suggestionDe,
            suggestionEn: s.suggestionEn,
            condition: s.condition,
          }))}
          initialValues={initialValues as never}
          initialSources={initialSources}
          initialCitations={initialCitations}
          sameSymbolValuesBySymbol={sameSymbolValuesBySymbol}
          inheritedFromBySymbol={inheritedFromBySymbol}
          docs={docs}
        />
      </main>
    </div>
  );
}
