'use client';
import type { WorksheetStatus } from '@/lib/state-machine';

const STATUS_STYLES: Record<WorksheetStatus, { label: string; className: string }> = {
  draft:                { label: 'Entwurf',     className: 'bg-ink/8 text-ink-2' },
  submitted_for_review: { label: 'In Prüfung',  className: 'bg-accent-2/15 text-accent-2' },
  engineer_approved:    { label: 'Genehmigt',   className: 'bg-success/15 text-success' },
  final:                { label: 'Final',       className: 'bg-accent/15 text-accent' },
  deactivated:          { label: 'Deaktiviert', className: 'bg-paper-2 text-subtext line-through' },
};

export function StatusPill({ status }: { status: WorksheetStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}
