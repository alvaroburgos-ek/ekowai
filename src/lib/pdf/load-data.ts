/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * In Plans 1-4 the old calculations/decisions/approvals tables were
 * dropped. This loader needs to be rewritten against the new schema:
 *   worksheet_instances + project_parameters + approval_events.
 *
 * Until Plan 6 retargets it, calling loadProjectReportData throws.
 * The PDF JSX components in src/lib/pdf/document.tsx and sections/*
 * are kept intact because they only consume the shape this loader
 * returns — they don't reference dropped tables directly.
 */

export type ReportData = {
  // Plan 6 fills in the real shape — for now keep an empty placeholder
  // so build-report.tsx still typechecks.
  project: { id: string; name: string };
  parameters: Array<unknown>;
  approvals: Array<unknown>;
};

export async function loadCalculationData(_calcId: string): Promise<ReportData> {
  throw new Error('PDF generation pending Plan 6 reattachment to new schema');
}

export async function loadProjectReportData(_projectId: string): Promise<ReportData> {
  throw new Error('PDF generation pending Plan 6 reattachment to new schema');
}
