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
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 border border-warning text-warning">
      {t('offline')}
    </span>
  );
}
