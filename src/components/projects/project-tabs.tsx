'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, FileText, History, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = { href: string; label: string; icon: LucideIcon; matchExact?: boolean };

export function ProjectTabs({ locale, projectId }: { locale: 'de' | 'en'; projectId: string }) {
  const pathname = usePathname();
  const base = `/${locale}/projects/${projectId}`;
  const tabs: Tab[] = [
    { href: base, label: 'Übersicht', icon: FolderKanban, matchExact: true },
    { href: `${base}/documents`, label: 'Dokumente', icon: FileText },
    { href: `${base}/reports`, label: 'Berichtsverlauf', icon: History },
  ];

  return (
    <nav className="flex gap-1 p-1 rounded-full bg-paper-2 border border-hairline w-fit">
      {tabs.map(({ href, label, icon: Icon, matchExact }) => {
        const isActive = matchExact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
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
  );
}
