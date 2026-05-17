'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function OfflineBadge() {
  const [online, setOnline] = useState(true);
  const t = useTranslations('calc');
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (online) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-warning bg-warning-soft/60">
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {t('offline')}
    </span>
  );
}
