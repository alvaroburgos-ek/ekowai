'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { locales } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

export function LocaleSwitcher({ current }: { current: 'de' | 'en' }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-paper-2 p-1 text-xs">
      <Languages className="size-3.5 ml-1.5 text-subtext" aria-hidden />
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => {
            if (l === current) return;
            const newPath = pathname.replace(/^\/(de|en)/, `/${l}`);
            router.push(newPath);
          }}
          className={cn(
            'rounded-full px-2 py-0.5 font-medium transition-colors',
            l === current
              ? 'bg-paper text-ink shadow-soft'
              : 'text-subtext hover:text-ink',
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
