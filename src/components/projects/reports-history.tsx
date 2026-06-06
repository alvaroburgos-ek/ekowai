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
        <li
          key={e.id}
          className="py-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4 text-sm"
        >
          <div className="sm:w-36 sm:shrink-0 text-xs text-subtext tabular-nums">
            {e.generatedAt.toLocaleString('de-DE')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-ink break-words">
              {e.worksheetCode ?? '—'} · {e.worksheetTitleDe ?? 'Bericht'}
            </div>
            <div className="text-xs text-subtext break-words">
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
            className="text-xs text-accent underline sm:shrink-0"
          >
            {e.filePath && e.filePath !== 'pending' ? 'PDF öffnen' : 'Live-PDF (Snapshot ausstehend)'}
          </a>
        </li>
      ))}
    </ul>
  );
}
