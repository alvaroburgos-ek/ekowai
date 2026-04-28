'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useCalculatorStore } from '@/lib/state/calculator-store';
import { submitForReview } from '@/lib/actions/approval';
import { Button } from '@/components/ui/button';

export function SubmitButton({ calcId }: { calcId: string }) {
  const t = useTranslations('approval');
  const result = useCalculatorStore((s) => s.result);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const blocking = result?.compliance.status === 'blocking_violation';

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await submitForReview({ calcId });
      if (r.ok) setSuccess(true);
      else setError(t(`submitError.${r.error}`));
    });
  }

  if (success) {
    return <span className="text-xs text-emerald-700">{t('submitted')}</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={submit} disabled={pending || blocking}>
        {pending ? t('submitting') : t('submitForReview')}
      </Button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
