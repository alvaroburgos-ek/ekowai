import 'server-only';
import { db } from '@/lib/db';
import {
  approvalEvents,
  auditLog,
  worksheetInstances,
  worksheetTemplates,
  profiles,
  fields,
} from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export type AuditEntry = {
  source: 'approval' | 'audit';
  occurredAt: string;
  actorName: string | null;
  actorId: string | null;
  actorRole: string | null;
  worksheetCode: string | null;
  tableName: string | null;
  action: string | null;
  detail: string;
};

/** Returns a unified timeline of approval_events + audit_log for one project. */
export async function loadProjectAuditTimeline(
  projectId: string,
  limit = 100,
): Promise<AuditEntry[]> {
  const approvals = await db
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
    .innerJoin(
      worksheetInstances,
      eq(worksheetInstances.id, approvalEvents.worksheetInstanceId),
    )
    .innerJoin(
      worksheetTemplates,
      eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId),
    )
    .leftJoin(profiles, eq(profiles.id, approvalEvents.actorId))
    .where(eq(worksheetInstances.projectId, projectId))
    .orderBy(desc(approvalEvents.occurredAt))
    .limit(limit);

  const audits = await db
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
    .limit(limit);

  // Resolve field symbols for audit_log rows that target project_parameters
  const fieldIds = new Set<string>();
  for (const a of audits) {
    if (a.tableName === 'project_parameters' && a.changes && typeof a.changes === 'object') {
      const c = a.changes as { fieldId?: string };
      if (c.fieldId) fieldIds.add(c.fieldId);
    }
  }
  const fieldsBySymbol = new Map<string, string>();
  if (fieldIds.size > 0) {
    const fieldRows = await db
      .select({ id: fields.id, symbol: fields.symbol })
      .from(fields)
      .where(inArray(fields.id, Array.from(fieldIds)));
    for (const r of fieldRows) fieldsBySymbol.set(r.id, r.symbol);
  }

  const entries: AuditEntry[] = [];

  for (const a of approvals) {
    entries.push({
      source: 'approval',
      occurredAt: a.occurredAt.toISOString(),
      actorName: a.actorName ?? null,
      actorId: a.actorId,
      actorRole: a.actorRole,
      worksheetCode: a.worksheetCode,
      tableName: 'worksheet_instances',
      action: a.eventType,
      detail: `${a.fromStatus} → ${a.toStatus} · „${a.comment}"`,
    });
  }
  for (const a of audits) {
    let detail = JSON.stringify(a.changes);
    if (a.tableName === 'project_parameters' && a.changes && typeof a.changes === 'object') {
      const c = a.changes as { fieldId?: string; before?: unknown; after?: unknown };
      const sym = c.fieldId ? fieldsBySymbol.get(c.fieldId) ?? c.fieldId : '?';
      detail = `${sym}: ${formatValue(c.before)} → ${formatValue(c.after)}`;
    } else if (a.tableName === 'worksheet_instances' && a.changes && typeof a.changes === 'object') {
      const c = a.changes as { from?: string; to?: string; eventType?: string };
      detail = `${c.eventType ?? a.action}: ${c.from} → ${c.to}`;
    }
    entries.push({
      source: 'audit',
      occurredAt: a.occurredAt.toISOString(),
      actorName: a.actorName ?? null,
      actorId: a.actorId,
      actorRole: a.actorRole,
      worksheetCode: null,
      tableName: a.tableName,
      action: a.action,
      detail,
    });
  }

  entries.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  return entries.slice(0, limit);
}

function formatValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
