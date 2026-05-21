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
      <p className="font-mono text-[11px] text-subtext py-4 italic">
        Noch keine archivierten Berichte. Berichte werden bei Freigabe automatisch erstellt.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-hairline">
      {entries.map((e) => (
        <li key={e.id} className="py-3 flex items-center gap-4 text-sm">
          <div className="w-36 text-xs text-subtext tabular-nums font-mono">
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
            href={`/api/projects/${projectId}/report/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent underline"
          >
            PDF öffnen
          </a>
        </li>
      ))}
    </ul>
  );
}
