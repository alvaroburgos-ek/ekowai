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
      org: proj.org && proj.org.id ? (proj.org as { id: string; name: string; logoUrl: string | null }) : null,
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
      actorName: a.actorName ?? null,
      comment: a.comment,
    })),
  };
}

export async function loadCalculationData(_calcId: string): Promise<ReportData> {
  throw new Error('loadCalculationData is no longer supported — use loadProjectReportData');
}
