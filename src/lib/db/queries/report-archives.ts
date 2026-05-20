import 'server-only';

/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * report_archives schema was modified in Plan 1 (dropped approval_id,
 * added approval_event_id + worksheet_instance_id). Plan 6 implements
 * the new queries.
 */

export async function listReportArchivesForProject(
  _projectId: string,
): Promise<Array<unknown>> {
  return [];
}

// Legacy name used by reports-history.tsx — alias for compile compat.
export const listProjectArchives = listReportArchivesForProject;
