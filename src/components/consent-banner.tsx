'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'ekowai.consent.v1';

export function ConsentBanner() {
  const t = useTranslations('consent');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.localStorage.getItem(STORAGE_KEY)) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-lg space-y-2">
      <p className="text-sm text-slate-700">{t('message')}</p>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, 'accepted');
            setShow(false);
          }}
        >
          {t('accept')}
        </Button>
      </div>
    </div>
  );
}
