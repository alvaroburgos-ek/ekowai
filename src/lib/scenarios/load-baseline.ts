// src/lib/scenarios/load-baseline.ts
import 'server-only';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  standards, worksheetTemplates, worksheetInstances, fields, worksheetSections, equations, complianceRequirements,
  projectParameters, projectScenarioSettings,
} from '@/lib/db/schema';
import { ensureRegulationTablesLoaded } from '@/lib/db/queries/regulation-tables';
import { isAttestationCondition } from '@/lib/eval/attestation';
import { isMissingRelationError } from './missing-table';
import type { ScenarioBaseline } from './baseline';

/** What the report path loads (src/lib/pdf/load-data.ts), for ONE standard, as the runner's input (spec §3). */
export async function loadScenarioBaseline(projectId: string, standardCode: string): Promise<ScenarioBaseline | null> {
  const [std] = await db.select({ id: standards.id, code: standards.code }).from(standards).where(eq(standards.code, standardCode)).limit(1);
  if (!std) return null;
  await ensureRegulationTablesLoaded(std.code);

  const inst = await db
    .select({
      instanceId: worksheetInstances.id, templateId: worksheetTemplates.id, code: worksheetTemplates.code,
      titleDe: worksheetTemplates.titleDe, titleEn: worksheetTemplates.titleEn, phase: worksheetTemplates.phase,
      orderIndex: worksheetTemplates.orderIndex,
    })
    .from(worksheetInstances)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .where(and(eq(worksheetInstances.projectId, projectId), eq(worksheetTemplates.standardId, std.id), ne(worksheetInstances.status, 'deactivated')));
  if (inst.length === 0) return null;
  const templateIds = inst.map((i) => i.templateId);

  const fieldRows = await db
    .select({
      id: fields.id, templateId: fields.worksheetTemplateId, templateCode: worksheetTemplates.code, symbol: fields.symbol,
      labelDe: fields.labelDe, labelEn: fields.labelEn, unit: fields.unit, dataType: fields.dataType, isRequired: fields.isRequired,
      sectionId: fields.sectionId, visibleWhen: fields.visibleWhen, widget: fields.widget, uiConfig: fields.uiConfig,
      consumerWorksheets: fields.consumerWorksheets, enumValues: fields.enumValues, validationRules: fields.validationRules,
    })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .where(and(eq(worksheetTemplates.standardId, std.id), eq(fields.active, true)));
  const sectionRows = await db
    .select({ id: worksheetSections.id, templateId: worksheetSections.worksheetTemplateId, parentSectionId: worksheetSections.parentSectionId, visibleWhen: worksheetSections.visibleWhen })
    .from(worksheetSections)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetSections.worksheetTemplateId))
    .where(eq(worksheetTemplates.standardId, std.id));
  const eqRows = await db.select().from(equations).where(inArray(equations.worksheetTemplateId, templateIds));
  const crRows = await db.select().from(complianceRequirements).where(inArray(complianceRequirements.worksheetTemplateId, templateIds));
  const fieldIds = fieldRows.map((f) => f.id);
  const params = fieldIds.length === 0 ? [] : await db.select().from(projectParameters)
    .where(and(eq(projectParameters.projectId, projectId), inArray(projectParameters.fieldId, fieldIds)));

  return {
    projectId, standardId: std.id, standardCode: std.code,
    sheets: inst.map((i) => ({
      instanceId: i.instanceId, templateId: i.templateId, code: i.code, titleDe: i.titleDe, titleEn: i.titleEn ?? null,
      phase: i.phase ?? null, orderIndex: i.orderIndex,
      equations: eqRows.filter((e) => e.worksheetTemplateId === i.templateId).map((e) => ({
        id: e.id, equationNumber: e.equationNumber, formula: e.formula, inputSymbols: e.inputSymbols, outputSymbol: e.outputSymbol, outputUnit: e.outputUnit,
      })),
      compliance: crRows.filter((c) => c.worksheetTemplateId === i.templateId).map((c) => ({
        id: c.id, code: c.code, titleDe: c.titleDe, condition: c.condition, severity: c.severity, description: c.description,
        requiresAttestation: isAttestationCondition(c.condition),
      })),
    })),
    fields: fieldRows.map((f) => ({
      ...f, labelEn: f.labelEn ?? null, unit: f.unit ?? null, sectionId: f.sectionId ?? null, visibleWhen: f.visibleWhen ?? null,
      widget: f.widget ?? null, uiConfig: f.uiConfig ?? null, consumerWorksheets: (f.consumerWorksheets as string[] | null) ?? null,
      enumValues: (f.enumValues as Array<{ value: string; label_de: string | null; label_en: string | null }> | null) ?? null,
      validationRules: (f.validationRules as { min?: number; max?: number; maxLength?: number; extensible?: boolean } | null) ?? null,
    })),
    sections: sectionRows.map((s) => ({ ...s, parentSectionId: s.parentSectionId ?? null, visibleWhen: s.visibleWhen ?? null })),
    stored: Object.fromEntries(params.map((p) => [p.fieldId, {
      fieldId: p.fieldId, valueNumber: p.valueNumber == null ? null : Number(p.valueNumber), valueText: p.valueText,
      valueEnum: p.valueEnum, valueBoolean: p.valueBoolean, valueDate: p.valueDate, valueJson: p.valueJson, sourceType: p.sourceType,
    }])),
  };
}

/** „Fälle aktiv" (spec §7). Absent table ⇒ false (code tolerates the unapplied migration). */
export async function loadScenariosEnabled(projectId: string): Promise<boolean> {
  try {
    const [row] = await db.select({ enabled: projectScenarioSettings.enabled }).from(projectScenarioSettings)
      .where(eq(projectScenarioSettings.projectId, projectId)).limit(1);
    return row?.enabled === true;
  } catch (e) {
    if (isMissingRelationError(e)) return false;
    throw e;
  }
}
