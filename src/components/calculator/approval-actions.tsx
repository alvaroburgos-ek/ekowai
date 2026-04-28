'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  approveCalculation,
  rejectCalculation,
  requestChanges,
} from '@/lib/actions/approval';
import { Button } from '@/components/ui/button';

export function ApprovalActions({ calcId }: { calcId: string }) {
  const t = useTranslations('approval');
  const [comment, setComment] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'approved' | 'rejected' | 'changes_requested' | null>(null);

  function act(verb: 'approved' | 'rejected' | 'changes_requested') {
    setError(null);
    const fn =
      verb === 'approved'
        ? approveCalculation
        : verb === 'rejected'
          ? rejectCalculation
          : requestChanges;
    startTransition(async () => {
      const r = await fn({ calcId, comment: comment || undefined });
      if (r.ok) setDone(verb);
      else setError(t(`reviewError.${r.error}`) || r.error);
    });
  }

  if (done) return <p className="text-xs text-emerald-700">{t(`status.${done}`)}</p>;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{t('reviewTitle')}</h3>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder={t('commentPlaceholder')}
        className="block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-700"
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => act('approved')} disabled={pending}>
          {t('approve')}
        </Button>
        <Button variant="ghost" onClick={() => act('changes_requested')} disabled={pending}>
          {t('requestChanges')}
        </Button>
        <Button variant="ghost" onClick={() => act('rejected')} disabled={pending}>
          {t('reject')}
        </Button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </section>
  );
}
