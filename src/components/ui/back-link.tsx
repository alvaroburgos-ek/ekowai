import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact "back to X" affordance for deep pages (project sub-routes, standard
 * and worksheet detail views) that sit outside the project tab bar. Keeps the
 * app navigable without forcing the user back through the top-level nav.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-1.5 text-xs font-medium text-subtext',
        'hover:text-accent-2 transition-colors',
        className,
      )}
    >
      <ChevronLeft
        className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
