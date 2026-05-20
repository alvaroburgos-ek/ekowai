'use client';
import { useState } from 'react';
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
};

export function ApprovalBar({ instanceId, status, locale }: Props) {
  const actions = userActionsFor(status);
  const [modal, setModal] = useState<null | {
    event: Exclude<TransitionEvent, 'deactivate' | 'reactivate'>;
    label: string;
    destructive?: boolean;
  }>(null);

  return (
    <section className="border-t border-hairline pt-6 mt-8 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext">Status</div>
        <StatusPill status={status} />
      </div>

      <div className="flex gap-2">
        {actions.length === 0 ? (
          <span className="text-xs text-subtext italic">
            {status === 'deactivated'
              ? 'Standard entfernt — reaktivieren über Standards-Tab'
              : '—'}
          </span>
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
