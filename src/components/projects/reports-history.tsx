import { listProjectArchives } from '@/lib/db/queries/report-archives';
import { getArchiveSignedUrl } from '@/lib/storage/report-archives';

export async function ReportsHistory({ projectId }: { projectId: string }) {
  const rows = await listProjectArchives(projectId);
  if (rows.length === 0) {
    return (
      <p className="font-mono text-[11px] text-subtext py-4">
        Noch keine archivierten Berichte. Berichte werden bei Freigabe
        automatisch erstellt.
      </p>
    );
  }

  // Resolve signed URLs in parallel
  const items = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      url: await getArchiveSignedUrl(r.archive.filePath).catch(() => null),
    })),
  );

  return (
    <ul className="divide-y divide-hairline">
      {items.map((r) => (
        <li
          key={r.archive.id}
          className="py-3 flex items-baseline justify-between gap-4"
        >
          <div>
            <div className="font-medium">{r.calc.name}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtext">
              {r.calc.worksheetId} ·{' '}
              {r.archive.generatedAt.toLocaleDateString('de-DE')}
            </div>
            <div className="font-mono text-[10px] text-subtext tabular-nums">
              SHA-256 {r.archive.sha256.slice(0, 16)}…
            </div>
          </div>
          {r.url ? (
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] uppercase tracking-[0.2em] underline hover:text-accent"
            >
              Öffnen
            </a>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-error">
              Nicht verfügbar
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
