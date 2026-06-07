'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  LogOut,
  FolderKanban,
  Inbox,
  Library,
  Building2,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocaleSwitcher } from './locale-switcher';

const ICONS: Record<string, LucideIcon> = {
  projects: FolderKanban,
  inbox: Inbox,
  leads: UserRoundPlus,
  standards: Library,
  org: Building2,
};

export type MobileNavLink = {
  href: string;
  label: string;
  badge?: number;
  iconKey?: string;
};

/**
 * Mobile-only nav: a hamburger that opens a right-hand slide-in drawer with
 * the full link list, locale switcher and logout. Keeps the top bar to just
 * logo + hamburger on small screens so nothing overflows.
 */
export function MobileNav({
  locale,
  links,
  logoutLabel,
}: {
  locale: 'de' | 'en';
  links: MobileNavLink[];
  logoutLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Portal only after mount so server + first client render match (the
  // overlay/drawer render into document.body, escaping the sticky header's
  // backdrop-filter — which would otherwise become the containing block for
  // these position:fixed nodes and clip the drawer to the header's height).
  const [mounted, setMounted] = useState(false);
  // Mount-once flag for SSR-safe portals — server and first client render both
  // see mounted=false (matching markup), then the portal appears post-hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Close the drawer whenever the route changes (link tap). React-recommended
  // "reset state on prop change" pattern — adjust during render, not in an
  // effect, so there's no extra commit/flash.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  // Lock body scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-full p-2 text-ink hover:bg-paper-2 transition-colors"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {mounted &&
        createPortal(
          <div className="md:hidden">
            {/* Overlay */}
            <div
              onClick={() => setOpen(false)}
              className={cn(
                'fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm transition-opacity duration-200',
                open ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              aria-hidden
            />

            {/* Drawer */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className={cn(
                'fixed inset-y-0 right-0 z-[61] flex h-[100dvh] w-[82%] max-w-xs flex-col bg-paper shadow-2xl',
                'transition-transform duration-200 ease-out',
                open ? 'translate-x-0' : 'translate-x-full',
              )}
            >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <span className="text-[10px] uppercase tracking-[0.25em] text-subtext">
            Menü
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Menü schließen"
            className="inline-flex items-center justify-center rounded-full p-2 text-subtext hover:bg-paper-2 hover:text-ink transition-colors"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {links.map(({ href, label, badge, iconKey }) => {
              const isActive =
                pathname === href || pathname.startsWith(href + '/');
              const Icon = iconKey ? ICONS[iconKey] : undefined;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors',
                      isActive
                        ? 'bg-paper-2 text-ink'
                        : 'text-ink-2 hover:bg-paper-2/60 hover:text-ink',
                    )}
                  >
                    {Icon && <Icon className="size-5 shrink-0" aria-hidden />}
                    <span className="flex-1 truncate">{label}</span>
                    {badge != null && badge > 0 && (
                      <span
                        aria-label={`${badge} offen`}
                        className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums text-white"
                        style={{ background: 'var(--eko-gradient)' }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-4">
          <LocaleSwitcher current={locale} />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-subtext hover:bg-paper-2 hover:text-ink transition-colors"
            >
              <LogOut className="size-4" aria-hidden />
              {logoutLabel}
            </button>
          </form>
        </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
