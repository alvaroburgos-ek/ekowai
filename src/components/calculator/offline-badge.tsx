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
    <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">{t('offline')}</span>
  );
}
