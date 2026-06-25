import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects, worksheetTemplates, worksheetInstances, projectDocuments, profiles } from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { currentUserIsPlatformEngineer } from '@/lib/auth/platform-engineer';
import {
  loadWorksheet,
  ensureWorksheetInstance,
  loadProjectParameters,
  loadSameSymbolValues,
  loadInheritedFields,
  loadSurfaceSource,
} from '@/lib/db/queries/worksheet';
import { countSnapshotsForInstance } from '@/lib/db/queries/snapshots';
import { mergeInheritedFields } from '@/lib/eval/merge-inherited-fields';
import { WorksheetForm } from '@/components/worksheet/worksheet-form';
import { WorksheetListSidebar } from '@/components/worksheet/worksheet-list-sidebar';
import { BackLink } from '@/components/ui/back-link';
import { NormTextProvider } from '@/components/norm-text/norm-text-context';
import { resolveFromSiteProfile, SITE_PROFILE_BY_SYMBOL } from '@/lib/site-profile/symbol-map';

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
  // Ambiguous symbols (>1 inherited producer for the same symbol) are
  // recorded in mergeResult.ambiguousSymbols — the engine reads that map and
  // emits manual_required for any equation that consumes such a symbol,
  // rather than silently picking a producer.
  const inheritedRaw = await loadInheritedFields(
    ws.template.id,
    ws.template.standard.id,
    worksheetCode,
  );
  const mergeResult = mergeInheritedFields(ws.fields, inheritedRaw);
  const mergedFields = mergeResult.fields;
  const ambiguousSymbols = mergeResult.ambiguousSymbols;

  const fieldIds = mergedFields.map((f) => f.id);
  const fieldSymbols = mergedFields.map((f) => f.symbol);

  // Parallelise all queries that depend on ws.template.id but not on each other
  const [instance, parameters, sameSymbol, sidebarWorksheets, docs, fieldCounts] = await Promise.all([
    ensureWorksheetInstance(projectId, ws.template.id),
    loadProjectParameters(projectId, fieldIds),
    loadSameSymbolValues(projectId, ws.template.id, fieldSymbols),
    // All worksheets of this standard for sidebar
    db
      .select({
        id: worksheetTemplates.id,
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
    // Per-worksheet required-field totals and filled-count for the sidebar.
    // Single SQL avoids round-tripping fields-per-template through Drizzle.
    db.execute<{
      worksheet_template_id: string;
      total_required: number;
      filled_required: number;
    }>(sql`
      SELECT
        wt.id AS worksheet_template_id,
        COUNT(*) FILTER (WHERE f.is_required AND f.active)::int AS total_required,
        COUNT(*) FILTER (
          WHERE f.is_required AND f.active
          AND (
            pp.value_number  IS NOT NULL OR
            pp.value_text    IS NOT NULL OR
            pp.value_enum    IS NOT NULL OR
            pp.value_date    IS NOT NULL OR
            pp.value_boolean IS NOT NULL OR
            pp.value_json    IS NOT NULL
          )
        )::int AS filled_required
      FROM worksheet_templates wt
      LEFT JOIN fields f ON f.worksheet_template_id = wt.id
      LEFT JOIN project_parameters pp
        ON pp.field_id = f.id AND pp.project_id = ${projectId}
      WHERE wt.standard_id = ${ws.template.standard.id}
      GROUP BY wt.id
    `),
  ]);

  // Count prior snapshots — drives the "Änderungen seit letzter Version"
  // affordance in the approval bar. Single COUNT-ish query is cheap and the
  // index on (worksheet_instance_id, taken_at) keeps it O(log n).
  const priorSnapshotCount = await countSnapshotsForInstance(instance.id);

  // Load surface-inventory source (A138-07) status + carrier for consumer
  // worksheets (e.g. A138-10). Returns null when the current worksheet IS the
  // owner of surface_inventory, or the standard has no surface_inventory field.
  const surfaceSource = await loadSurfaceSource(projectId, ws.template.standard.id, worksheetCode);

  // Platform-engineer gating + verifier-label resolution. We batch-load the
  // profile emails of all distinct verifiers touched by this worksheet's
  // fields + equations so the chip can render "bestätigt von X" without
  // round-tripping per row.
  const isPlatformEngineer = await currentUserIsPlatformEngineer();
  const verifierIds = new Set<string>();
  for (const f of mergedFields) {
    if ('verifiedByUserId' in f && f.verifiedByUserId) verifierIds.add(f.verifiedByUserId as string);
  }
  for (const e of ws.equations) {
    if (e.verifiedByUserId) verifierIds.add(e.verifiedByUserId);
  }
  const verifierLabels = new Map<string, string>();
  if (verifierIds.size > 0) {
    const rows = await db
      .select({ id: profiles.id, email: profiles.email, fullName: profiles.fullName })
      .from(profiles)
      .where(inArray(profiles.id, Array.from(verifierIds)));
    for (const r of rows) {
      verifierLabels.set(r.id, r.fullName ?? r.email);
    }
  }

  // Convert parameters → initialValues for the store. Resolution order
  // (first hit wins; engineer can always override by typing):
  //   1. Local project_parameters row (engineer's own value).
  //   2. Upstream same-symbol value from another worksheet — but ONLY when
  //      the upstream values are unambiguous (single entry, or all equal).
  //      This is the Item-3 refinement: blindly picking [0] when multiple
  //      worksheets disagree silently picks one, hiding the conflict.
  //   3. Project-level site profile (projects.site_profile) via the symbol map.
  //   4. Standard-recommended default_value on the field row.
  const initialValues: Record<string, unknown> = {};
  const inheritedFromBySymbol: Record<string, string> = {};
  const prefillSourceByFieldId: Record<string, 'standard_default' | 'site_profile'> = {};
  const siteProfileKeyByFieldId: Record<string, string> = {};
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

    // 2. Try same-symbol upstream — unambiguous only.
    const upstreams = sameSymbol.get(f.symbol);
    if (upstreams && upstreams.length > 0) {
      const ambiguous = upstreams.length > 1 && !upstreams.every((u) => sameSymbolValueEqual(u.value, upstreams[0].value));
      if (!ambiguous) {
        const upstream = upstreams[0];
        const coerced = coerceSameSymbolValue(f.dataType, upstream.value);
        if (coerced) {
          initialValues[f.id] = coerced;
          inheritedFromBySymbol[f.symbol] = upstream.worksheetCode;
          continue;
        }
      }
    }

    // 3. Site profile — resolved via the symbol map; coerced inside the helper.
    const site = resolveFromSiteProfile(project.siteProfile, f.symbol);
    if (site && site.value != null && site.type === f.dataType) {
      initialValues[f.id] = { type: site.type, value: site.value };
      prefillSourceByFieldId[f.id] = 'site_profile';
      const entry = SITE_PROFILE_BY_SYMBOL.get(f.symbol);
      if (entry) siteProfileKeyByFieldId[f.id] = entry.key;
      continue;
    }

    // 4. Field's standard-recommended default_value.
    const dv = f.defaultValue as { type?: string; value?: unknown } | null | undefined;
    if (dv && dv.type === f.dataType && dv.value != null) {
      initialValues[f.id] = { type: dv.type, value: dv.value };
      prefillSourceByFieldId[f.id] = 'standard_default';
    }
  }

  const countsByTemplateId = new Map<string, { total_required: number; filled_required: number }>();
  // db.execute returns either Array or { rows: Array }; cover both shapes.
  type FcRow = { worksheet_template_id: string; total_required: number; filled_required: number };
  const fcRaw = fieldCounts as { rows?: FcRow[] } | FcRow[];
  const fcRows: FcRow[] = Array.isArray(fcRaw) ? fcRaw : fcRaw.rows ?? [];
  for (const r of fcRows) {
    countsByTemplateId.set(r.worksheet_template_id, {
      total_required: Number(r.total_required),
      filled_required: Number(r.filled_required),
    });
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
    <NormTextProvider standardCode={standardCode}>
    <div className="space-y-6">
    {/* The project standard route only redirects to the first worksheet, so
        "back" goes to the project overview (which lists the standard and its
        worksheets); the sidebar handles navigation within the standard. */}
    <BackLink
      href={`/${locale}/projects/${id}`}
      label="Zurück zur Projektübersicht"
    />
    <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 lg:gap-12">
      <aside>
        <WorksheetListSidebar
          projectId={projectId}
          standardCode={standardCode}
          worksheets={sidebarWorksheets.map((w) => {
            const counts = countsByTemplateId.get(w.id);
            return {
              ...w,
              status: (w.status ?? null) as 'draft' | 'submitted_for_review' | 'engineer_approved' | 'final' | 'deactivated' | null,
              totalRequired: counts?.total_required ?? 0,
              filledRequired: counts?.filled_required ?? 0,
            };
          })}
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
          fields={mergedFields.map((f) => {
            const verifiedByUserId = (f as typeof f & { verifiedByUserId?: string | null }).verifiedByUserId ?? null;
            const verifiedAt = (f as typeof f & { verifiedAt?: Date | null }).verifiedAt ?? null;
            const verificationNote = (f as typeof f & { verificationNote?: string | null }).verificationNote ?? null;
            return {
              id: f.id, sectionId: f.sectionId, symbol: f.symbol,
              labelDe: f.labelDe, labelEn: f.labelEn, unit: f.unit,
              dataType: f.dataType as 'number' | 'text' | 'enum' | 'date' | 'boolean' | 'json',
              isRequired: f.isRequired,
              enumValues: f.enumValues as Array<{ value: string; label_de: string | null; label_en: string | null }> | null,
              validationRules: f.validationRules as { min?: number; max?: number; maxLength?: number; raw?: string } | null,
              clauseReference: f.clauseReference,
              description: f.description,
              verificationStatus: f.verificationStatus,
              orderIndex: f.orderIndex,
              active: f.active,
              inheritedFromWorksheet: f.inheritedFromWorksheet,
              verifiedByLabel: verifiedByUserId ? verifierLabels.get(verifiedByUserId) ?? null : null,
              verifiedAt: verifiedAt ? verifiedAt.toISOString() : null,
              verificationNote,
            };
          }) as never}
          equations={ws.equations.map((e) => ({
            id: e.id, equationNumber: e.equationNumber, formula: e.formula,
            inputSymbols: e.inputSymbols, outputSymbol: e.outputSymbol,
            clauseReference: e.clauseReference, description: e.description,
            verificationStatus: e.verificationStatus,
            verifiedByLabel: e.verifiedByUserId ? verifierLabels.get(e.verifiedByUserId) ?? null : null,
            verifiedAt: e.verifiedAt ? e.verifiedAt.toISOString() : null,
            verificationNote: e.verificationNote,
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
          ambiguousSymbols={Object.fromEntries(ambiguousSymbols)}
          prefillSourceByFieldId={prefillSourceByFieldId}
          siteProfileKeyByFieldId={siteProfileKeyByFieldId}
          standardCode={standardCode}
          docs={docs}
          priorSnapshotCount={priorSnapshotCount}
          diffHref={`/${localeTyped}/projects/${projectId}/standards/${standardCode}/worksheets/${worksheetCode}/diff`}
          isPlatformEngineer={isPlatformEngineer}
          surfaceSource={surfaceSource}
        />
      </main>
    </div>
    </div>
    </NormTextProvider>
  );
}

/** True when two same-symbol values agree (loose number equality, exact for
 * the other types). Used to decide whether auto-fill is unambiguous. */
function sameSymbolValueEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-9;
  }
  // Numeric strings from `numeric` columns come through as strings — compare
  // by Number when both coerce cleanly.
  const na = typeof a === 'string' ? Number(a) : NaN;
  const nb = typeof b === 'string' ? Number(b) : NaN;
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) < 1e-9;
  return false;
}

function coerceSameSymbolValue(
  dataType: string,
  v: unknown,
): { type: 'number' | 'text' | 'enum' | 'date' | 'boolean' | 'json'; value: unknown } | null {
  switch (dataType) {
    case 'number': {
      const n = typeof v === 'number' ? v : Number(v as string);
      return Number.isFinite(n) ? { type: 'number', value: n } : null;
    }
    case 'text':
      return typeof v === 'string' || typeof v === 'number'
        ? { type: 'text', value: String(v) }
        : null;
    case 'enum':
      return typeof v === 'string' ? { type: 'enum', value: v } : null;
    case 'date':
      return typeof v === 'string' ? { type: 'date', value: v } : null;
    case 'boolean':
      return typeof v === 'boolean' ? { type: 'boolean', value: v } : null;
    case 'json':
      return { type: 'json', value: v };
    default:
      return null;
  }
}
