'use client';

import type { JSX } from 'react';
import { cn } from '@/lib/utils';

/**
 * Ownership pill — the single source of truth for VSME "who owns this data point"
 * colour + label. Consumed by the Worklist, Report Overview and CO₂ table.
 *
 * - ekowai_env      → EKOWAI produces it (brand green)
 * - client_supplied → customer must deliver it (accent blue)
 * - general         → shared / metadata (neutral)
 */
export type Owner = 'ekowai_env' | 'client_supplied' | 'general';

const OWNER_LABELS: Record<Owner, { de: string; en: string }> = {
  ekowai_env: { de: 'EKOWAI', en: 'EKOWAI' },
  client_supplied: { de: 'Kunde', en: 'Client' },
  general: { de: 'Allgemein', en: 'General' },
};

const OWNER_STYLES: Record<Owner, string> = {
  ekowai_env: 'bg-success-soft text-success',
  client_supplied: 'bg-accent-soft text-accent-2',
  general: 'bg-paper-2 text-subtext border border-hairline',
};

const OWNER_DOT: Record<Owner, string> = {
  ekowai_env: 'bg-eko-green',
  client_supplied: 'bg-accent',
  general: 'bg-subtext',
};

export function OwnerBadge({
  owner,
  locale = 'de',
}: {
  owner: Owner;
  locale?: 'de' | 'en';
}): JSX.Element {
  // Defensive fallback so an unexpected owner string never crashes the row.
  const safe: Owner = owner in OWNER_LABELS ? owner : 'general';
  const label = OWNER_LABELS[safe][locale];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap',
        OWNER_STYLES[safe],
      )}
    >
      <span className={cn('size-1.5 rounded-full', OWNER_DOT[safe])} aria-hidden />
      {label}
    </span>
  );
}
