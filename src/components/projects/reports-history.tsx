type Entry = {
  id: string;
  generatedAt: Date;
  filePath: string;
  worksheetCode: string | null;
  worksheetTitleDe: string | null;
  generatedByName: string | null;
};

export function ReportsHistory({
  entries,
  projectId,
}: {
  entries: Entry[];
  projectId: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-[11px] text-subtext py-4 italic">
        Noch keine archivierten Berichte. Berichte werden bei Freigabe automatisch erstellt.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-hairline">
      {entries.map((e) => (
        <li key={e.id} className="py-3 flex items-center gap-4 text-sm">
          <div className="w-36 text-xs text-subtext tabular-nums">
            {e.generatedAt.toLocaleString('de-DE')}
          </div>
          <div className="flex-1">
            <div className="font-medium text-ink">
              {e.worksheetCode ?? '—'} · {e.worksheetTitleDe ?? 'Bericht'}
            </div>
            <div className="text-xs text-subtext">
              durch {e.generatedByName ?? '—'}
            </div>
          </div>
          <a
            href={
              e.filePath && e.filePath !== 'pending'
                ? e.filePath
                : `/api/projects/${projectId}/report/pdf`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent underline"
          >
            {e.filePath && e.filePath !== 'pending' ? 'PDF öffnen' : 'Live-PDF (Snapshot ausstehend)'}
          </a>
        </li>
      ))}
    </ul>
  );
}
