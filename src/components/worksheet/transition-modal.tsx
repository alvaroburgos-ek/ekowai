'use client';
import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { transitionWorksheet } from '@/lib/actions/worksheet-transition';
import { useRouter } from 'next/navigation';
import type { TransitionEvent } from '@/lib/state-machine';
import { useFocusTrap } from '@/lib/hooks/use-focus-trap';

type Props = {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  eventType: Exclude<TransitionEvent, 'deactivate' | 'reactivate'>;
  actionLabel: string;
  destructive?: boolean;
};

export function TransitionModal({
  open,
  onClose,
  instanceId,
  eventType,
  actionLabel,
  destructive,
}: Props) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const containerRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await transitionWorksheet({
        instanceId,
        eventType,
        comment,
      });
      if (result.ok) {
        setComment('');
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transition-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-lg bg-paper border border-hairline-strong p-6 space-y-4 shadow-lg">
        <h2 id="transition-modal-title" className="text-lg font-semibold text-ink">
          {actionLabel}
        </h2>
        <p className="text-sm text-subtext">
          Kommentar (Pflicht — wird permanent im Auditprotokoll gespeichert):
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          autoFocus
        />
        {error && (
          <div className="text-sm text-error bg-error/10 px-3 py-2 rounded-md">{error}</div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pending || !comment.trim()}
            variant={destructive ? 'ghost' : 'primary'}
          >
            {pending ? 'Verarbeite...' : actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
