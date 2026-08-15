import type { DeliverableView } from '@/lib/actions/deliverables';
import { deliverableKindLabel } from '@/lib/deliverables/kinds';

/** de-DE date for a timestamptz value. */
function fmtDate(d: Date): string {
  return d.toLocaleDateString('de-DE');
}

/** de-DE time (HH:MM) for a timestamptz value. */
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Leistungsregister panel (roadmap Stage 10, AGB §3(2)) — READ-ONLY list of
 * every emitted deliverable of the project. Rows are written exclusively by
 * the PDF/export routes (recordDeliverable) after a successful buffer build;
 * there is deliberately no add/delete UI — the register documents, it is not
 * edited. Server component: the overview page loads entries via
 * `listDeliverables` and threads the effort total it ALREADY loads (the
 * hours-per-deliverable calibration seed) — no re-query here.
 */
export function DeliverableRegister({
  entries,
  totalHours,
}: {
  entries: DeliverableView[];
  /** Effort total from the overview page's existing listEffortEntries load. */
  totalHours: number;
}) {
  // Entries arrive newest-first; group consecutive rows by calendar day.
  const groups: { date: string; items: DeliverableView[] }[] = [];
  for (const e of entries) {
    const date = fmtDate(e.emittedAt);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(e);
    else groups.push({ date, items: [e] });
  }

  // Per-kind count summary (order of first appearance, newest-first).
  const kindCounts: { kind: string; count: number }[] = [];
  for (const e of entries) {
    const existing = kindCounts.find((k) => k.kind === e.kind);
    if (existing) existing.count += 1;
    else kindCounts.push({ kind: e.kind, count: 1 });
  }

  return (
    <div
      className="rounded-2xl border border-hairline bg-paper p-5 space-y-4"
      data-testid="deliverable-register"
    >
      {entries.length === 0 ? (
        <p className="text-[11px] text-subtext py-2 italic">
          Noch keine Leistungen emittiert — das Register füllt sich automatisch
          mit jedem erzeugten Dokument (PDF/Export).
        </p>
      ) : (
        <>
          {/* Per-kind count summary */}
          <p className="text-xs text-subtext">
            {kindCounts
              .map((k) => `${deliverableKindLabel(k.kind)} × ${k.count}`)
              .join(' · ')}
          </p>

          {/* Entry list, grouped by day (newest first) */}
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.date}>
                <div className="text-xs font-medium text-subtext tabular-nums pb-1">
                  {g.date}
                </div>
                <ul className="divide-y divide-hairline border-t border-hairline">
                  {g.items.map((e) => (
                    <li
                      key={e.id}
                      className="py-2.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 text-sm"
                    >
                      <div className="sm:w-16 sm:shrink-0 text-xs text-subtext tabular-nums">
                        {fmtTime(e.emittedAt)}
                      </div>
                      <div className="sm:w-44 sm:shrink-0">
                        <span className="inline-flex items-center rounded-full border border-hairline bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink">
                          {deliverableKindLabel(e.kind)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 text-ink break-words">
                        {e.title}
                      </div>
                      {e.standardCode && (
                        <div className="sm:shrink-0">
                          <span className="inline-flex items-center rounded-full border border-hairline px-2 py-0.5 text-[10px] font-medium text-subtext">
                            {e.standardCode}
                          </span>
                        </div>
                      )}
                      {e.snapshotId && (
                        <div
                          className="sm:shrink-0 text-[10px] text-subtext tabular-nums"
                          title={`Snapshot ${e.snapshotId}`}
                        >
                          {`Snapshot ${e.snapshotId.slice(0, 8)}`}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Hours-per-deliverable calibration seed — effort total threaded from
          the page's existing load, never re-queried here. */}
      <p className="text-xs text-subtext border-t border-hairline pt-3">
        {`Erfasste Stunden im Projekt: ${totalHours.toLocaleString('de-DE')} h`}
      </p>
    </div>
  );
}
