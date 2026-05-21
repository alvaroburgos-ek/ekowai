import type { AuditEntry } from '@/lib/db/queries/audit';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-subtext italic">
        Noch keine Aktionen für dieses Projekt aufgezeichnet.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-hairline">
      {entries.map((e, i) => (
        <li key={i} className="py-3 flex items-start gap-4 text-sm">
          <div className="w-32 shrink-0 text-xs text-subtext tabular-nums">
            {formatDate(e.occurredAt)}
          </div>
          <div className="w-32 shrink-0 text-xs text-subtext">
            {e.actorName ?? (e.actorRole ?? 'system')}
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="text-xs uppercase tracking-[0.18em] text-subtext flex gap-2">
              <span
                className={`inline-block px-2 py-0.5 rounded ${
                  e.source === 'approval'
                    ? 'bg-accent-2/10 text-accent-2'
                    : 'bg-paper-2 text-ink-2'
                }`}
              >
                {e.action ?? '—'}
              </span>
              {e.worksheetCode && <span>· {e.worksheetCode}</span>}
              {e.tableName && <span>· {e.tableName}</span>}
            </div>
            <div className="text-sm text-ink">{e.detail}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
