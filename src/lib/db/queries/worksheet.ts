import 'server-only';
import { db } from '@/lib/db';
import {
  standards,
  worksheetTemplates,
  worksheetSections,
  fields,
  equations,
  complianceRequirements,
  worksheetInstances,
  projectParameters,
  projects,
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

  return {
    template: { ...template, standard },
    sections: secList,
    fields: fieldList,
    equations: eqList,
    complianceRequirements: crList,
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
};

/** For each field symbol on this worksheet, find values already entered for
 * the same symbol elsewhere **in the same project** (any standard). Used both
 * to drive the "← [worksheet]" inheritance hint and to pre-populate fields
 * the engineer hasn't yet entered for this worksheet.
 *
 * Entries are sorted most-recently-updated first, so callers that pick the
 * first entry (`[0]`) inherit from the freshest source. */
export async function loadSameSymbolValues(
  projectId: string,
  currentTemplateId: string,
  symbols: string[],
): Promise<Map<string, SameSymbolEntry[]>> {
  if (symbols.length === 0) return new Map();
  // All OTHER fields in the project with matching symbols (any standard).
  const otherFields = await db
    .select({
      fieldId: fields.id,
      symbol: fields.symbol,
      dataType: fields.dataType,
      worksheetCode: worksheetTemplates.code,
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
  const params = await db
    .select()
    .from(projectParameters)
    .where(
      and(
        eq(projectParameters.projectId, projectId),
        inArray(projectParameters.fieldId, otherFieldIds),
      ),
    );

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
    });
    out.set(meta.symbol, arr);
  }
  // Sort each bucket: most recently entered first → caller picks [0] for inheritance
  for (const arr of out.values()) {
    arr.sort((a, b) => {
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

/** Confirm the user has access to this project (org member). Returns true/false. */
export async function userHasProjectAccess(
  projectId: string,
  userId: string,
): Promise<boolean> {
  // RLS handles this at query time, but we double-check explicitly so server
  // actions can fail loud instead of returning empty result silently.
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return rows.length === 1;
}
