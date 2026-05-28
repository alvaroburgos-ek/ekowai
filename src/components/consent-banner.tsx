'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'ekowai.consent.v1';

const listeners = new Set<() => void>();
const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
const getSnapshot = () => window.localStorage.getItem(STORAGE_KEY) === 'accepted';
// SSR: assume accepted so the banner doesn't flash on first paint
const getServerSnapshot = () => true;

export function ConsentBanner() {
  const t = useTranslations('consent');
  const accepted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (accepted) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-lg space-y-2">
      <p className="text-sm text-slate-700">{t('message')}</p>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, 'accepted');
            listeners.forEach((l) => l());
          }}
        >
          {t('accept')}
        </Button>
      </div>
    </div>
  );
}
