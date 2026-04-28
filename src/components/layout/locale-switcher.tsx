'use client';
import { usePathname, useRouter } from 'next/navigation';
import { locales } from '@/lib/i18n/config';

export function LocaleSwitcher({ current }: { current: 'de' | 'en' }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => {
        const newLocale = e.target.value;
        const newPath = pathname.replace(/^\/(de|en)/, `/${newLocale}`);
        router.push(newPath);
      }}
      className="text-sm border border-slate-300 rounded px-2 py-1 bg-white text-slate-700"
    >
      {locales.map((l) => (
        <option key={l} value={l}>{l.toUpperCase()}</option>
      ))}
    </select>
  );
}
