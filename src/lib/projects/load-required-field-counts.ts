import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { fields, projectParameters, worksheetSections, worksheetTemplates } from '@/lib/db/schema';
import { loadOwnStandardScope, loadProjectWideEntries } from '@/lib/actions/approval-gate';
import {
  countRequiredFieldsByTemplate,
  hiddenFieldIdsByTemplate,
  type RequiredFieldCountArgs,
  type RequiredFieldCounts,
} from './required-field-counts';

export type RequiredFieldState = {
  /** C-7 per-template counts (+ U-1: a stale own answer counts as open). */
  counts: Map<string, RequiredFieldCounts>;
  /** U-2: per template, the active fields hidden by `visible_when` under the saved values. */
  hiddenByTemplate: Map<string, Set<string>>;
};

async function loadCountArgs(projectId: string, standardId: string): Promise<RequiredFieldCountArgs | null> {
  const templates = await db
    .select({ id: worksheetTemplates.id })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.standardId, standardId));
  const templateIds = templates.map((t) => t.id);
  if (templateIds.length === 0) return null;

  const [tmplFields, tmplSections, projectEntries, ownScope] = await Promise.all([
    db
      .select({
        id: fields.id,
        symbol: fields.symbol,
        labelDe: fields.labelDe,
        dataType: fields.dataType,
        isRequired: fields.isRequired,
        templateId: fields.worksheetTemplateId,
        sectionId: fields.sectionId,
        visibleWhen: fields.visibleWhen,
      })
      .from(fields)
      .where(and(inArray(fields.worksheetTemplateId, templateIds), eq(fields.active, true))),
    db
      .select({
        id: worksheetSections.id,
        parentSectionId: worksheetSections.parentSectionId,
        visibleWhen: worksheetSections.visibleWhen,
        templateId: worksheetSections.worksheetTemplateId,
      })
      .from(worksheetSections)
      .where(inArray(worksheetSections.worksheetTemplateId, templateIds)),
    loadProjectWideEntries(projectId),
    loadOwnStandardScope(standardId),
  ]);

  const fieldIds = tmplFields.map((f) => f.id);
  const params = fieldIds.length === 0
    ? []
    : await db
      .select()
      .from(projectParameters)
      .where(and(eq(projectParameters.projectId, projectId), inArray(projectParameters.fieldId, fieldIds)));
  const paramByFieldId = new Map(params.map((p) => [p.fieldId, p]));

  return { templateIds, fields: tmplFields, sections: tmplSections, paramByFieldId, projectEntries, ownScope };
}

/**
 * C-7: per-template required-field counts of ONE standard in a project, by the approval gate's rule
 * (`countRequiredFieldsByTemplate`): hidden (`visible_when`) required fields are neither total nor open.
 * Replaces the plain-SQL counts of the worksheet sidebar and `get_standard_progress`.
 */
export async function loadRequiredFieldCounts(projectId: string, standardId: string): Promise<Map<string, RequiredFieldCounts>> {
  const args = await loadCountArgs(projectId, standardId);
  return args ? countRequiredFieldsByTemplate(args) : new Map();
}

/**
 * The counts AND the per-template hidden-field sets from ONE load of the rows (U-2: the worksheet page needs both and
 * must not query twice).
 */
export async function loadRequiredFieldState(projectId: string, standardId: string): Promise<RequiredFieldState> {
  const args = await loadCountArgs(projectId, standardId);
  if (!args) return { counts: new Map(), hiddenByTemplate: new Map() };
  return { counts: countRequiredFieldsByTemplate(args), hiddenByTemplate: hiddenFieldIdsByTemplate(args) };
}
