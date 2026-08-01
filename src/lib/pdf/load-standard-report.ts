import 'server-only';
import { db } from '@/lib/db';
import {
  projects,
  orgs,
  standards,
  worksheetTemplates,
  worksheetInstances,
  worksheetSections,
  fields,
  equations as equationsTable,
  complianceRequirements,
  projectParameters,
  projectDocuments,
  approvalEvents,
  auditLog,
  profiles,
  calculationSnapshots,
} from '@/lib/db/schema';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { assembleStandardReport, type StandardReportData } from './assemble-standard-report';

export type {
  StandardReportData,
  ReportField,
  ReportFieldCitation,
  ReportSection,
  ReportEquation,
  ReportCompliance,
  ReportWorksheet,
  ReportLetterhead,
  ReportSiteProfile,
  ReportProjectHeader,
  CitationIndexEntry,
  AuditExcerptEntry,
  StoredCitation,
} from './assemble-standard-report';
export { PDF_138_FROZEN_GATE } from './assemble-standard-report';

/**
 * Load the full per-standard snapshot for the PDF.
 *
 * Splits cleanly into a DB-fetch phase and a pure-assembly phase. The
 * assembly phase is exported separately (`assembleStandardReport`) so the
 * data-shape contract can be unit-tested without a live database.
 *
 * Throws when the project or standard doesn't exist (the route handler maps
 * that to a 404). RLS is enforced at the DB layer by the same db client every
 * other server path uses.
 */
export async function loadStandardReportData(
  projectId: string,
  standardCode: string,
): Promise<StandardReportData> {
  // 1. Project + org (for letterhead) — single round-trip.
  const [proj] = await db
    .select({
      id: projects.id,
      name: projects.name,
      projectCode: projects.projectCode,
      clientName: projects.clientName,
      location: projects.location,
      siteProfile: projects.siteProfile,
      createdAt: projects.createdAt,
      org: {
        id: orgs.id,
        name: orgs.name,
        logoUrl: orgs.logoUrl,
        addressLine1: orgs.addressLine1,
        addressLine2: orgs.addressLine2,
        postalCode: orgs.postalCode,
        city: orgs.city,
        phone: orgs.phone,
        email: orgs.email,
        website: orgs.website,
      },
    })
    .from(projects)
    .leftJoin(orgs, eq(orgs.id, projects.orgId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj) throw new Error(`Project ${projectId} not found`);

  // 2. Standard.
  const [std] = await db
    .select()
    .from(standards)
    .where(eq(standards.code, standardCode))
    .limit(1);
  if (!std) throw new Error(`Standard ${standardCode} not found`);

  // 3. Worksheet templates (in order).
  const templates = await db
    .select()
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.standardId, std.id))
    .orderBy(worksheetTemplates.orderIndex);

  const templateIds = templates.map((t) => t.id);

  // 4. Worksheet instances for this project + these templates.
  const instances = templateIds.length === 0
    ? []
    : await db
        .select()
        .from(worksheetInstances)
        .where(
          and(
            eq(worksheetInstances.projectId, projectId),
            inArray(worksheetInstances.worksheetTemplateId, templateIds),
          ),
        );

  // 5. Sections, fields, equations, compliance reqs — all batched.
  const [allSections, allFields, allEquations, allCompliance] = templateIds.length === 0
    ? [[], [], [], []]
    : await Promise.all([
        db
          .select()
          .from(worksheetSections)
          .where(inArray(worksheetSections.worksheetTemplateId, templateIds))
          .orderBy(worksheetSections.orderIndex),
        db
          .select()
          .from(fields)
          .where(
            and(
              inArray(fields.worksheetTemplateId, templateIds),
              eq(fields.active, true),
            ),
          )
          .orderBy(fields.orderIndex),
        db
          .select()
          .from(equationsTable)
          .where(inArray(equationsTable.worksheetTemplateId, templateIds)),
        db
          .select()
          .from(complianceRequirements)
          .where(inArray(complianceRequirements.worksheetTemplateId, templateIds)),
      ]);

  // 6. project_parameters keyed by fieldId.
  const allFieldIds = allFields.map((f) => f.id);
  const params = allFieldIds.length === 0
    ? []
    : await db
        .select()
        .from(projectParameters)
        .where(
          and(
            eq(projectParameters.projectId, projectId),
            inArray(projectParameters.fieldId, allFieldIds),
          ),
        );

  // 6b. Latest approve-snapshots (ordered DESC; assembler takes first per instance).
  const instanceIds = instances.map((i) => i.id);
  const snapshotRows = instanceIds.length === 0
    ? []
    : await db
        .select({
          id: calculationSnapshots.id,
          worksheetInstanceId: calculationSnapshots.worksheetInstanceId,
          takenAt: calculationSnapshots.takenAt,
        })
        .from(calculationSnapshots)
        .where(
          and(
            inArray(calculationSnapshots.worksheetInstanceId, instanceIds),
            eq(calculationSnapshots.trigger, 'approve'),
          ),
        )
        .orderBy(desc(calculationSnapshots.takenAt));

  // 7. project_documents for citation resolution.
  const allDocs = await db
    .select()
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId));

  // 8. Audit excerpt (last 25 events scoped to this project + standard).
  const approvalRows = await db
    .select({
      occurredAt: approvalEvents.occurredAt,
      actorId: approvalEvents.actorId,
      actorRole: approvalEvents.actorRole,
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
    .where(
      and(
        eq(worksheetInstances.projectId, projectId),
        eq(worksheetTemplates.standardId, std.id),
      ),
    )
    .orderBy(desc(approvalEvents.occurredAt))
    .limit(25);

  const auditRows = await db
    .select({
      occurredAt: auditLog.occurredAt,
      actorId: auditLog.actorId,
      actorRole: auditLog.actorRole,
      tableName: auditLog.tableName,
      action: auditLog.action,
      changes: auditLog.changes,
      actorName: profiles.fullName,
    })
    .from(auditLog)
    .leftJoin(profiles, eq(profiles.id, auditLog.actorId))
    .where(eq(auditLog.projectId, projectId))
    .orderBy(desc(auditLog.occurredAt))
    .limit(25);

  // ---------------------------------------------------------------------------
  // Hand everything to the pure assembler.
  // ---------------------------------------------------------------------------
  return assembleStandardReport({
    project: {
      id: proj.id,
      name: proj.name,
      projectCode: proj.projectCode,
      clientName: proj.clientName,
      location: proj.location,
      siteProfile: proj.siteProfile as Record<string, unknown> | null,
      createdAt: proj.createdAt,
    },
    org: proj.org && proj.org.id
      ? {
          id: proj.org.id,
          name: proj.org.name,
          logoUrl: proj.org.logoUrl,
          addressLine1: proj.org.addressLine1,
          addressLine2: proj.org.addressLine2,
          postalCode: proj.org.postalCode,
          city: proj.org.city,
          phone: proj.org.phone,
          email: proj.org.email,
          website: proj.org.website,
        }
      : null,
    standard: {
      id: std.id,
      code: std.code,
      titleDe: std.titleDe,
      version: std.version,
      supersededBy: std.supersededBy,
    },
    templates,
    instances,
    sections: allSections,
    fields: allFields,
    equations: allEquations,
    compliance: allCompliance,
    parameters: params,
    documents: allDocs,
    approvals: approvalRows,
    audits: auditRows,
    snapshots: snapshotRows,
    now: new Date(),
  });
}
