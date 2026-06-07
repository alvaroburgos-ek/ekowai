'use client';

/**
 * Renders a `clause_reference` as a clickable chip that opens the
 * <NormTextPane> for that clause.
 *
 * Falls back to a non-interactive `<span>` when:
 *   - no `<NormTextProvider>` is mounted above (e.g. lists / summary views),
 *   - the clauseRef is empty / null.
 *
 * The visual treatment matches the existing `text-[10px] uppercase
 * tracking-[0.18em] text-subtext` look used throughout the worksheet view so
 * dropping the chip in next to other meta badges (unit, verification status)
 * doesn't disturb the layout.
 */

import { useOpenNormText } from './norm-text-context';

type Props = {
  clauseReference: string | null | undefined;
  /** Optional extra classes (e.g. to tweak spacing in unusual contexts). */
  className?: string;
};

export function ClauseChip({ clauseReference, className }: Props) {
  const open = useOpenNormText();

  if (!clauseReference) return null;

  const base = 'inline-block max-w-full break-words';
  const linkClasses =
    'text-accent hover:text-ink hover:underline underline-offset-2 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-accent rounded-sm';
  const staticClasses = '';

  if (!open) {
    return (
      <span className={`${base} ${staticClasses} ${className ?? ''}`}>
        {clauseReference}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => open(clauseReference)}
      // Same typographic treatment as the surrounding meta line — we only
      // tweak the colour to signal "interactive".
      className={`${base} ${linkClasses} ${className ?? ''}`}
      aria-label={`Normtext zu ${clauseReference} öffnen`}
      data-testid={`clause-chip-${clauseReference}`}
    >
      {clauseReference}
    </button>
  );
}
