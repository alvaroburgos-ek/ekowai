'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderKanban,
  Inbox,
  Library,
  Building2,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
  projects: FolderKanban,
  inbox: Inbox,
  leads: UserRoundPlus,
  standards: Library,
  org: Building2,
};

interface NavLinksProps {
  locale: string;
  links: { href: string; label: string; badge?: number; iconKey?: string }[];
}

export function NavLinks({ links }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <>
      {links.map(({ href, label, badge, iconKey }) => {
        const isActive = pathname.startsWith(href);
        const Icon = iconKey ? ICONS[iconKey] : undefined;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'relative inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-paper-2 text-ink shadow-soft'
                : 'text-ink-2 hover:bg-paper-2/60 hover:text-ink',
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
            {label}
            {badge != null && badge > 0 && (
              <span
                aria-label={`${badge} pending`}
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-white text-[10px] tabular-nums rounded-full"
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
