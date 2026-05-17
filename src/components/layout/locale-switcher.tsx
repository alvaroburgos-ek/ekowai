'use client';
import { usePathname, useRouter } from 'next/navigation';
import { locales } from '@/lib/i18n/config';

export function LocaleSwitcher({ current }: { current: 'de' | 'en' }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="flex items-center gap-1 text-[11px] tracking-[0.2em]">
      {locales.map((l, i) => (
        <span key={l} className="flex items-center">
          <button
            onClick={() => {
              if (l === current) return;
              const newPath = pathname.replace(/^\/(de|en)/, `/${l}`);
              router.push(newPath);
            }}
            className={
              l === current
                ? 'text-ink font-medium'
                : 'text-subtext hover:text-ink transition-colors'
            }
          >
            {l.toUpperCase()}
          </button>
          {i < locales.length - 1 && <span className="mx-1.5 text-hairline-strong">/</span>}
        </span>
      ))}
    </div>
  );
}
