import 'server-only';

/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * buildReport previously loaded data from the calculations table (dropped
 * in Plan 1) and rendered the PDF document with that data. Plan 6
 * rebuilds this against worksheet_instances + project_parameters +
 * approval_events.
 *
 * Until then this stub throws at runtime so the type import chain
 * (document.tsx, sections/*) doesn't need to compile against a moving
 * ReportData type.
 */

export async function buildReport(_calcId: string): Promise<Buffer> {
  throw new Error('PDF generation pending Plan 6 reattachment to new schema');
}
