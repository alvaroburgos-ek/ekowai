import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects, worksheetTemplates, worksheetInstances, projectDocuments } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  loadWorksheet,
  ensureWorksheetInstance,
  loadProjectParameters,
  loadSameSymbolValues,
} from '@/lib/db/queries/worksheet';
import { readInputsWithSources } from '@/lib/engine/inputs-reader';
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

  const instance = await ensureWorksheetInstance(projectId, ws.template.id);
  const parameters = await loadProjectParameters(projectId, ws.fields.map((f) => f.id));
  const sameSymbol = await loadSameSymbolValues(
    projectId,
    ws.template.standard.id,
    ws.template.id,
    ws.fields.map((f) => f.symbol),
  );

  // All worksheets of this standard for sidebar
  const sidebarWorksheets = await db
    .select({
      code: worksheetTemplates.code,
      titleDe: worksheetTemplates.titleDe,
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
    .orderBy(worksheetTemplates.orderIndex);

  // Convert parameters → initialValues for the store
  const initialValues: Record<string, unknown> = {};
  for (const f of ws.fields) {
    const p = parameters.get(f.id);
    if (!p) continue;
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
  }

  const sameSymbolValuesBySymbol: Record<string, Array<{ worksheetCode: string; value: unknown }>> = {};
  for (const [symbol, arr] of sameSymbol) sameSymbolValuesBySymbol[symbol] = arr;

  // Load project documents for citation picker
  const docs = await db
    .select({
      id: projectDocuments.id,
      title: projectDocuments.title,
      citationLabel: projectDocuments.citationLabel,
    })
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId));

  // Load existing citation sources from project_parameters
  const fieldIds = ws.fields.map((f) => f.id);
  const inputsWithSources = await readInputsWithSources(projectId, fieldIds);
  const initialSources: Record<string, { docId: string; page?: number; note?: string } | null> = {};
  for (const f of ws.fields) {
    initialSources[f.id] = inputsWithSources[f.id]?.source ?? null;
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
          fields={ws.fields.map((f) => ({
            id: f.id, sectionId: f.sectionId, symbol: f.symbol,
            labelDe: f.labelDe, labelEn: f.labelEn, unit: f.unit,
            dataType: f.dataType as 'number' | 'text' | 'enum' | 'date' | 'boolean' | 'json',
            isRequired: f.isRequired,
            enumValues: f.enumValues as Array<{ value: string; label_de: string | null; label_en: string | null }> | null,
            validationRules: f.validationRules as { min?: number; max?: number; maxLength?: number; raw?: string } | null,
            clauseReference: f.clauseReference,
            verificationStatus: f.verificationStatus,
            orderIndex: f.orderIndex,
          })) as never}
          equations={ws.equations.map((e) => ({
            id: e.id, equationNumber: e.equationNumber, formula: e.formula,
            inputSymbols: e.inputSymbols, outputSymbol: e.outputSymbol,
            clauseReference: e.clauseReference, description: e.description,
            verificationStatus: e.verificationStatus,
          }))}
          complianceRequirements={ws.complianceRequirements.map((c) => ({
            id: c.id, code: c.code, titleDe: c.titleDe, condition: c.condition,
            description: c.description, clauseReference: c.clauseReference,
            severity: c.severity,
          }))}
          initialValues={initialValues as never}
          initialSources={initialSources}
          sameSymbolValuesBySymbol={sameSymbolValuesBySymbol}
          docs={docs}
        />
      </main>
    </div>
  );
}
