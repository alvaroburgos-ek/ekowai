/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * Previously rendered report_archives with signed download URLs.
 * The query was rewritten to return [] in Plan 5 (dropped approval_id
 * column). Plan 6 implements the new query and rebuilds this component.
 */

export async function ReportsHistory({ projectId: _projectId }: { projectId: string }) {
  return (
    <p className="font-mono text-[11px] text-subtext py-4">
      Noch keine archivierten Berichte. Berichte werden bei Freigabe
      automatisch erstellt.
    </p>
  );
}
