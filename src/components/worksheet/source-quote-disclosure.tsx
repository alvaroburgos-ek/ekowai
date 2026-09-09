'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';

/**
 * Shows the guideline's own sentence behind a field, on demand.
 *
 * DWA-A 138-1's surface picker is the most usable surface in the Wizard because
 * the number and its origin sit together: you pick a surface type and it shows
 * "Tab. 9: 0,9 / 1,0". Every other field now has the same kind of evidence —
 * 7 100 fields carry the printed sentence they were verified against — but
 * `verification_quote` appeared nowhere in the UI, so an engineer filling a form
 * had to trust a label or open the PDF.
 *
 * Collapsed by default: provenance should be one click away, not in the way of
 * the person typing. The status is shown with the quote because "verified
 * against the standard" and "needs engineer review" are very different claims,
 * and one of the campaign's findings was a whole standard whose source turned
 * out to be an NGO scoping paper rather than the standard it named.
 */

type Props = {
  quote: string;
  clauseReference?: string | null;
  verificationStatus?: string | null;
  locale: 'de' | 'en';
};

const T = {
  de: {
    show: 'Quelle',
    hide: 'Quelle ausblenden',
    aria: 'Wortlaut aus der Richtlinie anzeigen',
    status: {
      verified_against_standard: 'wörtlich gegen die Richtlinie geprüft',
      engineer_verified: 'vom Ingenieur bestätigt',
      corrected: 'korrigiert und geprüft',
      inferred_from_worksheet: 'App-Angabe, nicht aus der Richtlinie',
      needs_engineer_review: 'Prüfung durch Ingenieur offen',
      imported_unverified: 'importiert, ungeprüft',
      disputed: 'strittig',
    } as Record<string, string>,
  },
  en: {
    show: 'Source',
    hide: 'Hide source',
    aria: 'Show the wording from the guideline',
    status: {
      verified_against_standard: 'checked word for word against the guideline',
      engineer_verified: 'confirmed by the engineer',
      corrected: 'corrected and checked',
      inferred_from_worksheet: 'app data, not from the guideline',
      needs_engineer_review: 'engineer review outstanding',
      imported_unverified: 'imported, unchecked',
      disputed: 'disputed',
    } as Record<string, string>,
  },
} as const;

/** Statuses that mean the wording really was checked against the source. */
const TRUSTED = new Set(['verified_against_standard', 'engineer_verified', 'corrected']);

export function SourceQuoteDisclosure({ quote, clauseReference, verificationStatus, locale }: Props) {
  const [open, setOpen] = useState(false);
  const t = T[locale];
  const trimmed = quote.trim();
  if (!trimmed) return null;

  const statusLabel = verificationStatus ? t.status[verificationStatus] ?? verificationStatus : null;
  const trusted = verificationStatus ? TRUSTED.has(verificationStatus) : false;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t.aria}
        className="inline-flex items-center gap-1 text-[11px] text-ink/50 hover:text-ink/80 hover:underline"
      >
        <BookOpen className="size-3" aria-hidden />
        {open ? t.hide : t.show}
      </button>

      {open ? (
        <figure className="mt-1 rounded border border-ink/10 bg-ink/[0.02] px-2 py-1.5">
          <blockquote className="text-[11px] leading-relaxed text-ink/75">{trimmed}</blockquote>
          <figcaption className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-ink/45">
            {clauseReference ? <span>{clauseReference}</span> : null}
            {statusLabel ? (
              <span className={trusted ? 'text-success' : 'text-accent-2'}>{statusLabel}</span>
            ) : null}
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}
