import 'server-only';
import { db } from '@/lib/db';
import {
  standards,
  worksheetTemplates,
  worksheetSections,
  fields,
  equations,
  complianceRequirements,
  complianceSuggestions,
  worksheetInstances,
  projectParameters,
  projectStandards,
  projects,
  orgMembers,
} from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

/** Resolve a standard + worksheet by codes, throwing if not found. */
export async function loadWorksheet(standardCode: string, worksheetCode: string) {
  const rows = await db
    .select({
      template: {
        id: worksheetTemplates.id,
        code: worksheetTemplates.code,
        titleDe: worksheetTemplates.titleDe,
        titleEn: worksheetTemplates.titleEn,
        phase: worksheetTemplates.phase,
        archetype: worksheetTemplates.archetype,
        description: worksheetTemplates.description,
      },
      standard: {
        id: standards.id,
        code: standards.code,
        titleDe: standards.titleDe,
      },
    })
    .from(worksheetTemplates)
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(
      and(
        eq(standards.code, standardCode),
        eq(worksheetTemplates.code, worksheetCode),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  const { template, standard } = rows[0];

  const [secList, fieldList, eqList, crList] = await Promise.all([
    db
      .select()
      .from(worksheetSections)
      .where(eq(worksheetSections.worksheetTemplateId, template.id))
      .orderBy(worksheetSections.orderIndex),
    db
      .select()
      .from(fields)
      .where(eq(fields.worksheetTemplateId, template.id))
      .orderBy(fields.orderIndex),
    db
      .select()
      .from(equations)
      .where(eq(equations.worksheetTemplateId, template.id)),
    db
      .select()
      .from(complianceRequirements)
      .where(eq(complianceRequirements.worksheetTemplateId, template.id)),
  ]);

  // Pull suggestion rows for the loaded REQs in a follow-up batch. Keyed by
  // requirement_id so the renderer can group them under the failing REQ.
  let suggestionList: Array<typeof complianceSuggestions.$inferSelect> = [];
  if (crList.length > 0) {
    suggestionList = await db
      .select()
      .from(complianceSuggestions)
      .where(inArray(complianceSuggestions.requirementId, crList.map((c) => c.id)))
      .orderBy(complianceSuggestions.orderIndex);
  }

  return {
    template: { ...template, standard },
    sections: secList,
    fields: fieldList,
    equations: eqList,
    complianceRequirements: crList,
    complianceSuggestions: suggestionList,
  };
}

/** Ensure a worksheet_instance exists for (project, template). Lazy-create as 'draft'.
 * Race-safe: uses INSERT … ON CONFLICT DO NOTHING to avoid duplicate-key errors
 * when two requests arrive simultaneously. */
export async function ensureWorksheetInstance(
  projectId: string,
  templateId: string,
) {
  const inserted = await db
    .insert(worksheetInstances)
    .values({ projectId, worksheetTemplateId: templateId })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) return inserted[0];

  // Row already existed — fetch it
  const [existing] = await db
    .select()
    .from(worksheetInstances)
    .where(
      and(
        eq(worksheetInstances.projectId, projectId),
        eq(worksheetInstances.worksheetTemplateId, templateId),
      ),
    )
    .limit(1);
  return existing;
}

/**
 * Cross-worksheet inheritance: load all "consumed" fields from OTHER worksheet
 * templates in the same standard whose `consumer_worksheets` array declares
 * the current worksheet as a consumer.
 *
 * The producing worksheet's field IS the value carrier — there is exactly one
 * project_parameters row per (project_id, field_id). A downstream worksheet
 * that consumes a symbol reads that same row, so saving on the origin
 * propagates immediately.
 *
 * Pile-2-deactivated rows (`active=false`) are excluded — they're hidden
 * from the form everywhere.
 *
 * Returns the origin field rows annotated with the producing worksheet code,
 * so the UI can render an attribution badge ("← A138-10").
 */
export type InheritedField = typeof fields.$inferSelect & {
  originWorksheetCode: string;
};

export async function loadInheritedFields(
  currentTemplateId: string,
  currentStandardId: string,
  currentWorksheetCode: string,
): Promise<InheritedField[]> {
  const rows = await db
    .select({
      field: fields,
      originCode: worksheetTemplates.code,
    })
    .from(fields)
    .innerJoin(
      worksheetTemplates,
      eq(worksheetTemplates.id, fields.worksheetTemplateId),
    )
    .where(
      and(
        eq(worksheetTemplates.standardId, currentStandardId),
        sql`${currentWorksheetCode} = ANY(${fields.consumerWorksheets})`,
        sql`${fields.worksheetTemplateId} <> ${currentTemplateId}`,
        eq(fields.active, true),
      ),
    );
  return rows.map((r) => ({ ...r.field, originWorksheetCode: r.originCode }));
}

/** Load project_parameters for the given field IDs in one query. */
export async function loadProjectParameters(
  projectId: string,
  fieldIds: string[],
): Promise<Map<string, typeof projectParameters.$inferSelect>> {
  if (fieldIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(projectParameters)
    .where(
      and(
        eq(projectParameters.projectId, projectId),
        inArray(projectParameters.fieldId, fieldIds),
      ),
    );
  return new Map(rows.map((r) => [r.fieldId, r]));
}

export type SameSymbolEntry = {
  worksheetCode: string;
  value: unknown;
  dataType: string;
  updatedAt: Date | null;
  /** Stage order of the source standard within the project. Lower = upstream;
   * null = unsequenced. Drives inheritance priority. */
  sourceStageOrder: number | null;
  /** True if the source standard sits on the ancestor chain (parent, grand-
   * parent, …) of the current standard — used for hierarchical inheritance
   * (series, parallel, sub-standard all inherit from their parent). */
  isFromAncestor: boolean;
};

/** For each field symbol on this worksheet, find values already entered for
 * the same symbol elsewhere **in the same project** (any standard). Used both
 * to drive the "← [worksheet]" inheritance hint and to pre-populate fields
 * the engineer hasn't yet entered for this worksheet.
 *
 * Entries are sorted so the caller can pick `[0]` for inheritance:
 *   1. Source standard is on the current standard's parent chain — parent
 *      values always win, satisfying the series / parallel / sub-standard
 *      "inherit from parent" rule.
 *   2. Source standard's `stage_order` ascending (NULL last) — output from
 *      an earlier stage wins, matching the user's stage-N → stage-N+1
 *      parameter-flow expectation.
 *   3. Most-recently entered first (fallback within a stage). */
export async function loadSameSymbolValues(
  projectId: string,
  currentTemplateId: string,
  symbols: string[],
): Promise<Map<string, SameSymbolEntry[]>> {
  if (symbols.length === 0) return new Map();
  // All OTHER fields in the project with matching symbols (any standard).
  // Join project_standards so we know the source standard's stage_order
  // within the project (null for standards not on the project — they're
  // filtered out by the project_parameters join in the next step).
  const otherFields = await db
    .select({
      fieldId: fields.id,
      symbol: fields.symbol,
      dataType: fields.dataType,
      worksheetCode: worksheetTemplates.code,
      sourceStandardId: worksheetTemplates.standardId,
    })
    .from(fields)
    .innerJoin(
      worksheetTemplates,
      eq(worksheetTemplates.id, fields.worksheetTemplateId),
    )
    .where(
      and(
        inArray(fields.symbol, symbols),
        sql`${fields.worksheetTemplateId} <> ${currentTemplateId}`,
      ),
    );

  if (otherFields.length === 0) return new Map();

  const otherFieldIds = otherFields.map((f) => f.fieldId);

  // Look up the current worksheet's standardId so we can walk the ancestor
  // chain on project_standards (parent_standard_id refs project_standards.id,
  // not standards.id, so we resolve via the project_standards row).
  const [currentWs] = await db
    .select({ standardId: worksheetTemplates.standardId })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.id, currentTemplateId))
    .limit(1);
  const currentStandardId = currentWs?.standardId ?? null;

  const [params, projStds] = await Promise.all([
    db
      .select()
      .from(projectParameters)
      .where(
        and(
          eq(projectParameters.projectId, projectId),
          inArray(projectParameters.fieldId, otherFieldIds),
        ),
      ),
    db
      .select({
        id: projectStandards.id,
        standardId: projectStandards.standardId,
        stageOrder: projectStandards.stageOrder,
        parentStandardId: projectStandards.parentStandardId,
      })
      .from(projectStandards)
      .where(
        and(
          eq(projectStandards.projectId, projectId),
          eq(projectStandards.status, 'active'),
        ),
      ),
  ]);
  const stageByStandardId = new Map(projStds.map((p) => [p.standardId, p.stageOrder]));

  // Build the ancestor set of the current standard. Walk parent_standard_id
  // (which points at another project_standards row) up to the root.
  const psById = new Map(projStds.map((p) => [p.id, p]));
  const psByStandardId = new Map(projStds.map((p) => [p.standardId, p]));
  const ancestorStandardIds = new Set<string>();
  if (currentStandardId) {
    const currentPs = psByStandardId.get(currentStandardId);
    let cursor = currentPs?.parentStandardId ?? null;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const node = psById.get(cursor);
      if (!node) break;
      ancestorStandardIds.add(node.standardId);
      cursor = node.parentStandardId;
    }
  }

  const fieldById = new Map(otherFields.map((f) => [f.fieldId, f]));
  const out = new Map<string, SameSymbolEntry[]>();
  for (const p of params) {
    const meta = fieldById.get(p.fieldId);
    if (!meta) continue;
    const value =
      p.valueNumber ?? p.valueText ?? p.valueEnum ?? p.valueDate ?? p.valueBoolean ?? p.valueJson;
    if (value == null) continue;
    const arr = out.get(meta.symbol) ?? [];
    arr.push({
      worksheetCode: meta.worksheetCode,
      value,
      dataType: meta.dataType,
      updatedAt: p.enteredAt,
      sourceStageOrder: stageByStandardId.get(meta.sourceStandardId) ?? null,
      isFromAncestor: ancestorStandardIds.has(meta.sourceStandardId),
    });
    out.set(meta.symbol, arr);
  }
  // Sort each bucket: ancestor chain first, then earliest stage, then most-
  // recently entered.
  for (const arr of out.values()) {
    arr.sort((a, b) => {
      if (a.isFromAncestor !== b.isFromAncestor) return a.isFromAncestor ? -1 : 1;
      const aStage = a.sourceStageOrder ?? Number.MAX_SAFE_INTEGER;
      const bStage = b.sourceStageOrder ?? Number.MAX_SAFE_INTEGER;
      if (aStage !== bStage) return aStage - bStage;
      const at = a.updatedAt?.getTime() ?? 0;
      const bt = b.updatedAt?.getTime() ?? 0;
      return bt - at;
    });
  }
  return out;
}

/** Eagerly create one worksheet_instance per template of a given standard for a project.
 * Called when a standard is added to a project. */
export async function instantiateWorksheetInstancesForStandard(
  projectId: string,
  standardId: string,
): Promise<number> {
  const templates = await db
    .select({ id: worksheetTemplates.id })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.standardId, standardId));
  if (templates.length === 0) return 0;

  // INSERT … ON CONFLICT DO NOTHING for (project_id, worksheet_template_id)
  await db
    .insert(worksheetInstances)
    .values(templates.map((t) => ({ projectId, worksheetTemplateId: t.id })))
    .onConflictDoNothing();
  return templates.length;
}

/** Confirm the user is a member of the org that owns this project.
 *  `db` runs as postgres and bypasses RLS, so the join is the real check. */
export async function userHasProjectAccess(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, projectId), eq(orgMembers.userId, userId)))
    .limit(1);
  return rows.length === 1;
}

/** Load the surface-inventory SOURCE (A138-07) instance status + carrier value
 * for a consumer worksheet render. Returns null when the current worksheet is
 * itself the owner of `surface_inventory`, or no source row exists. */
export async function loadSurfaceSource(
  projectId: string,
  standardId: string,
  currentWorksheetCode: string,
): Promise<{ status: string; carrier: unknown } | null> {
  const ownerField = await db
    .select({ fieldId: fields.id, ownerCode: worksheetTemplates.code, templateId: worksheetTemplates.id })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .where(and(
      eq(worksheetTemplates.standardId, standardId),
      eq(fields.symbol, 'surface_inventory'),
      eq(fields.active, true),
    ))
    .limit(1);
  if (ownerField.length === 0) return null;
  const owner = ownerField[0];
  if (owner.ownerCode === currentWorksheetCode) return null; // current sheet IS the source

  const [inst, param] = await Promise.all([
    db
      .select({ status: worksheetInstances.status })
      .from(worksheetInstances)
      .where(and(eq(worksheetInstances.projectId, projectId), eq(worksheetInstances.worksheetTemplateId, owner.templateId)))
      .limit(1),
    db
      .select({ value: projectParameters.valueJson })
      .from(projectParameters)
      .where(and(eq(projectParameters.projectId, projectId), eq(projectParameters.fieldId, owner.fieldId)))
      .limit(1),
  ]);
  return { status: inst[0]?.status ?? 'draft', carrier: param[0]?.value ?? null };
}
