'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavLinksProps {
  locale: string;
  links: { href: string; label: string; badge?: number }[];
}

export function NavLinks({ locale, links }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <>
      {links.map(({ href, label, badge }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'relative pb-0.5 text-sm transition-colors',
              isActive ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
            style={
              isActive
                ? {
                    backgroundImage: 'var(--eko-gradient)',
                    backgroundSize: '100% 1.5px',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'bottom',
                  }
                : undefined
            }
          >
            {label}
            {badge != null && badge > 0 && (
              <span
                aria-label={`${badge} pending`}
                className="absolute -top-2 -right-4 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-white text-[10px] tabular-nums rounded-full"
                style={{ background: 'var(--eko-gradient)' }}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
