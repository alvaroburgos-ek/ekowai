import 'server-only';
import { db } from '@/lib/db';
import {
  projects,
  orgs,
  standards,
  worksheetTemplates,
  worksheetInstances,
  calculationSnapshots,
  projectParameters,
  fields,
} from '@/lib/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { checkApprovalGate } from '@/lib/actions/approval-gate';
import type { ReportLetterhead } from './assemble-standard-report';

/**
 * Konformitätserklärung data (Stage 4 — deliverable emission).
 *
 * Emittable only when EVERY worksheet of the standard is engineer_approved or
 * final; "konform" additionally requires that no block-severity gate currently
 * fails (re-checked live via the same approval gate the transition uses — the
 * write-lock keeps approved values frozen, but cross-worksheet symbols can
 * move, so we never trust the approve-time verdict alone).
 */

export const APPROVED_STATUSES = new Set<string>(['engineer_approved', 'final']);

export type ConformityWorksheetRow = {
  code: string;
  titleDe: string;
  /** Instance status, or null when the worksheet was never started. */
  status: string | null;
  failingBlockCodes: string[];
};

export type ConformityDecision = {
  eligible: boolean;
  konform: boolean;
  blocking: string[];
};

/** Pure decision core — unit-tested without a DB. */
export function decideConformity(rows: ConformityWorksheetRow[]): ConformityDecision {
  const statusBlocking = rows
    .filter((r) => !r.status || !APPROVED_STATUSES.has(r.status))
    .map((r) => `${r.code}: Status „${r.status ?? 'nicht begonnen'}“ (erfordert engineer_approved/final)`);
  const gateBlocking = rows.flatMap((r) =>
    r.failingBlockCodes.map((c) => `${r.code}: Block-Anforderung ${c} verletzt`),
  );
  const eligible = statusBlocking.length === 0;
  return {
    eligible,
    konform: eligible && gateBlocking.length === 0,
    blocking: [...statusBlocking, ...gateBlocking],
  };
}

export type ConformityData = ConformityDecision & {
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    clientName: string | null;
    location: string | null;
  };
  standard: { code: string; titleDe: string; version: string; issuedYear: number | null };
  worksheets: ConformityWorksheetRow[];
  /** Latest approve-snapshot per worksheet — the frozen state the declaration refers to. */
  snapshots: Array<{ worksheetCode: string; snapshotId: string; takenAt: string }>;
  /** Parameters of THIS standard flagged client_supplied ("Kundenangabe") —
   * summarized on the declaration because the AGB carve out liability for
   * client-supplied input errors. */
  clientSuppliedFields: Array<{ worksheetCode: string; symbol: string; labelDe: string }>;
  letterhead: ReportLetterhead | null;
  generatedAt: string;
};

export async function loadConformityData(
  projectId: string,
  standardCode: string,
): Promise<ConformityData> {
  const [proj] = await db
    .select({
      id: projects.id,
      name: projects.name,
      projectCode: projects.projectCode,
      clientName: projects.clientName,
      location: projects.location,
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

  const [std] = await db
    .select()
    .from(standards)
    .where(eq(standards.code, standardCode))
    .limit(1);
  if (!std) throw new Error(`Standard ${standardCode} not found`);

  const templates = await db
    .select({ id: worksheetTemplates.id, code: worksheetTemplates.code, titleDe: worksheetTemplates.titleDe })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.standardId, std.id))
    .orderBy(worksheetTemplates.orderIndex);

  const templateIds = templates.map((t) => t.id);
  const instances = templateIds.length === 0
    ? []
    : await db
      .select({
        id: worksheetInstances.id,
        worksheetTemplateId: worksheetInstances.worksheetTemplateId,
        status: worksheetInstances.status,
      })
      .from(worksheetInstances)
      .where(
        and(
          eq(worksheetInstances.projectId, projectId),
          inArray(worksheetInstances.worksheetTemplateId, templateIds),
        ),
      );
  const instanceByTemplate = new Map(instances.map((i) => [i.worksheetTemplateId, i]));

  // Live block-gate re-check per approved/final instance (same gate as the
  // approve transition). Un-approved instances are already blocking via status.
  const rows: ConformityWorksheetRow[] = [];
  for (const t of templates) {
    const inst = instanceByTemplate.get(t.id);
    let failingBlockCodes: string[] = [];
    if (inst && APPROVED_STATUSES.has(inst.status)) {
      const gate = await checkApprovalGate(inst.id);
      failingBlockCodes = gate.failingBlockConditions.map((c) => c.code);
    }
    rows.push({
      code: t.code,
      titleDe: t.titleDe,
      status: inst?.status ?? null,
      failingBlockCodes,
    });
  }

  // Latest approve-snapshot per instance.
  const instanceIds = instances.map((i) => i.id);
  const snapRows = instanceIds.length === 0
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
  const templateByInstance = new Map(instances.map((i) => [i.id, i.worksheetTemplateId]));
  const codeByTemplate = new Map(templates.map((t) => [t.id, t.code]));
  const latestByInstance = new Map<string, { id: string; takenAt: Date | null }>();
  for (const s of snapRows) {
    if (!latestByInstance.has(s.worksheetInstanceId)) {
      latestByInstance.set(s.worksheetInstanceId, { id: s.id, takenAt: s.takenAt });
    }
  }
  const snapshots = [...latestByInstance.entries()].map(([instanceId, s]) => ({
    worksheetCode: codeByTemplate.get(templateByInstance.get(instanceId) ?? '') ?? '?',
    snapshotId: s.id,
    takenAt: s.takenAt ? s.takenAt.toISOString() : '',
  }));

  // Kundenangabe summary — every saved parameter of THIS standard flagged
  // client_supplied, joined to its field + worksheet for a readable listing.
  const clientSuppliedRows = templateIds.length === 0
    ? []
    : await db
      .select({
        worksheetCode: worksheetTemplates.code,
        symbol: fields.symbol,
        labelDe: fields.labelDe,
      })
      .from(projectParameters)
      .innerJoin(fields, eq(fields.id, projectParameters.fieldId))
      .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
      .where(
        and(
          eq(projectParameters.projectId, projectId),
          eq(projectParameters.clientSupplied, true),
          inArray(fields.worksheetTemplateId, templateIds),
        ),
      )
      .orderBy(worksheetTemplates.orderIndex, fields.orderIndex);

  const decision = decideConformity(rows);
  return {
    ...decision,
    project: {
      id: proj.id,
      name: proj.name,
      projectCode: proj.projectCode,
      clientName: proj.clientName,
      location: proj.location,
    },
    standard: {
      code: std.code,
      titleDe: std.titleDe,
      version: std.version,
      issuedYear: std.issuedYear ?? null,
    },
    worksheets: rows,
    snapshots,
    clientSuppliedFields: clientSuppliedRows,
    letterhead: proj.org && proj.org.id
      ? {
        orgName: proj.org.name ?? '',
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
    generatedAt: new Date().toISOString(),
  };
}
