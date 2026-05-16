'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCalculatorStore } from '@/lib/state/calculator-store';
import { submitForReview } from '@/lib/actions/approval';
import { Button } from '@/components/ui/button';

export function SubmitButton({
  calcId,
  resubmit = false,
}: {
  calcId: string;
  resubmit?: boolean;
}) {
  const t = useTranslations('approval');
  const router = useRouter();
  const result = useCalculatorStore((s) => s.result);
  const worksheet = useCalculatorStore((s) => s.worksheet);
  const inputs = useCalculatorStore((s) => s.inputs);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const compliance = result?.compliance.status;
  const violations = result?.compliance.violations ?? [];

  // Open decision points (best effort — server-side check is authoritative)
  const recordedDecisionIds = new Set<string>(); // we don't have store of recorded; assume server validates
  const openDecisions =
    worksheet && result
      ? worksheet.decisionPoints.filter((dp) => {
          if (recordedDecisionIds.has(dp.id)) return false;
          // dp.triggerWhen evaluation requires the engine helper. The server
          // is authoritative; we just guess open count here for UX hint.
          return true;
        }).length
      : 0;

  const blocking = compliance === 'blocking_violation';
  const violationCount = violations.filter((v) => v.severity === 'blocking').length;

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await submitForReview({ calcId });
      if (r.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(t(`submitError.${r.error}`) || r.error);
      }
    });
  }

  if (success) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-success">
        ● {t('submitted')}
      </span>
    );
  }

  // Blocking violation — show explanatory state, button disabled.
  if (blocking) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <Button disabled variant="outline">
          {t('blockedLabel')}
        </Button>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-error tabular-nums max-w-[18rem] text-right leading-relaxed">
          {violationCount > 0
            ? `${String(violationCount).padStart(2, '0')} ${t('violationsBlock')}`
            : t('blockGeneric')}
        </p>
      </div>
    );
  }

  const label = pending
    ? t('submitting')
    : resubmit
      ? t('resubmitForReview')
      : t('submitForReview');

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={submit} disabled={pending}>
        {label}
      </Button>
      {error && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-error max-w-[18rem] text-right leading-relaxed">
          {error}
        </p>
      )}
      {!error && openDecisions > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-warning tabular-nums">
          {String(openDecisions).padStart(2, '0')} {t('decisionsHint')}
        </p>
      )}
    </div>
  );
}
