'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderKanban,
  FileText,
  History,
  ClipboardList,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type Tab = { href: string; label: string; icon: LucideIcon; matchExact?: boolean };

/** Pure function — testable without React or next-intl. */
export function buildProjectTabs(
  base: string,
  t: (k: string) => string,
  isVsme: boolean,
): Tab[] {
  const base_tabs: Tab[] = [
    { href: base, label: t('projects.tabs.overview'), icon: FolderKanban, matchExact: true },
  ];

  if (isVsme) {
    base_tabs.push(
      { href: `${base}/vsme/worklist`, label: t('vsme.tabs.worklist'), icon: ClipboardList },
      { href: `${base}/vsme/emissions`, label: t('vsme.tabs.emissions'), icon: Wind },
    );
  }

  base_tabs.push(
    { href: `${base}/documents`, label: t('projects.tabs.documents'), icon: FileText },
    { href: `${base}/reports`, label: t('projects.tabs.reports'), icon: History },
  );

  return base_tabs;
}

export function ProjectTabs({
  locale,
  projectId,
  isVsme = false,
}: {
  locale: 'de' | 'en';
  projectId: string;
  isVsme?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations();
  const base = `/${locale}/projects/${projectId}`;
  const tabs = buildProjectTabs(base, t, isVsme);

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
      <nav className="flex gap-1 p-1 rounded-full bg-paper-2 border border-hairline w-max sm:w-fit">
        {tabs.map(({ href, label, icon: Icon, matchExact }) => {
          const isActive = matchExact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'bg-paper text-ink shadow-soft'
                  : 'text-subtext hover:text-ink hover:bg-paper/60',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
