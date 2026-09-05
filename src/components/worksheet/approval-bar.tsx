'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusPill } from './status-pill';
import { TransitionModal } from './transition-modal';
import {
  userActionsFor,
  type TransitionEvent,
  type WorksheetStatus,
} from '@/lib/state-machine';

type Props = {
  instanceId: string;
  status: WorksheetStatus;
  locale: 'de' | 'en';
  /** Number of calculation snapshots that exist for this instance. When ≥1
   * we render an "Änderungen seit letzter Version" link to the diff page,
   * so reviewers can see what changed before approving. */
  priorSnapshotCount?: number;
  /** Where to link the "Änderungen seit letzter Version" affordance. Only
   * rendered when priorSnapshotCount ≥ 1. */
  diffHref?: string;
};

export function ApprovalBar({
  instanceId,
  status,
  locale,
  priorSnapshotCount = 0,
  diffHref,
}: Props) {
  const actions = userActionsFor(status);
  const [modal, setModal] = useState<null | {
    event: TransitionEvent;
    label: string;
    destructive?: boolean;
  }>(null);

  return (
    <section className="border-t border-hairline pt-6 mt-8 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext">Status</div>
        <StatusPill status={status} />
        {status === 'deactivated' && (
          <span className="text-xs text-subtext">
            {locale === 'de'
              ? 'zählt nicht für die Konformitätserklärung'
              : 'not counted for the declaration'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {priorSnapshotCount >= 1 && diffHref && (
          <Link
            href={diffHref}
            className="text-xs text-accent hover:underline"
            data-testid="approval-bar-diff-link"
          >
            {locale === 'de'
              ? 'Änderungen seit letzter Version'
              : 'Changes since last version'}
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        {actions.length === 0 ? (
          <span className="text-xs text-subtext italic">—</span>
        ) : (
          actions.map((a) => (
            <Button
              key={a.event}
              variant={a.destructive ? 'ghost' : 'primary'}
              size="sm"
              onClick={() =>
                setModal({
                  event: a.event,
                  label: locale === 'de' ? a.labelDe : a.labelEn,
                  destructive: a.destructive,
                })
              }
            >
              {locale === 'de' ? a.labelDe : a.labelEn}
              {a.destructive && status === 'final' && ' ⚠'}
            </Button>
          ))
        )}
      </div>

      {modal && (
        <TransitionModal
          open
          onClose={() => setModal(null)}
          instanceId={instanceId}
          eventType={modal.event}
          actionLabel={modal.label}
          destructive={modal.destructive}
        />
      )}
    </section>
  );
}
