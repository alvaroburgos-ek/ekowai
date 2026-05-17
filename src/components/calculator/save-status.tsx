'use client';

import { useEffect, useRef } from 'react';
import { useCalculatorStore } from '@/lib/state/calculator-store';
import { saveCalculation } from '@/lib/actions/calculation';
import { useTranslations } from 'next-intl';

export function SaveStatus({ locale }: { locale: 'de' | 'en' }) {
  const t = useTranslations('calc');
  const inputs = useCalculatorStore((s) => s.inputs);
  const calcId = useCalculatorStore((s) => s.calcId);
  const status = useCalculatorStore((s) => s.saveStatus);
  const lastSavedAt = useCalculatorStore((s) => s.lastSavedAt);
  const markSaving = useCalculatorStore((s) => s.markSaving);
  const markSaved = useCalculatorStore((s) => s.markSaved);
  const markOffline = useCalculatorStore((s) => s.markOffline);
  const markError = useCalculatorStore((s) => s.markError);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== 'dirty' || !calcId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!navigator.onLine) {
        markOffline();
        return;
      }
      markSaving();
      try {
        const r = await saveCalculation({ calcId, inputs });
        if (r.ok) markSaved(r.computedAt);
        else markError();
      } catch {
        markError();
      }
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [inputs, status, calcId, markSaving, markSaved, markOffline, markError]);

  let label: string | null = null;
  if (status === 'saving') label = t('saving');
  else if (status === 'saved')
    label = lastSavedAt
      ? `${t('savedAt')} ${new Date(lastSavedAt).toLocaleTimeString(locale)}`
      : t('saved');
  else if (status === 'offline') label = t('offlineQueued');
  else if (status === 'error') label = t('saveError');
  else if (status === 'dirty') label = t('unsaved');

  const errorTone = status === 'error' ? 'text-error' : 'text-subtext';

  return label ? (
    <span className={`text-xs ${errorTone}`}>
      {label}
    </span>
  ) : null;
}
