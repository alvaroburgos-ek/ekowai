import Link from 'next/link';
import { summarizeStandardProgress, type ProgressWorksheet } from '@/lib/projects/standard-progress';

type Props = {
  projectId: string;
  standardCode: string;
  worksheets: ProgressWorksheet[];
  locale: 'de' | 'en';
};

/**
 * "Fortschritt zur Konformitätserklärung" — the next-step panel above the
 * worksheet list. Status-only (cheap on every page load); the live block-gate
 * re-check happens when the declaration itself is requested.
 */
export function StandardProgressPanel({ projectId, standardCode, worksheets, locale }: Props) {
  const p = summarizeStandardProgress(worksheets);
  const de = locale === 'de';
  const pct = p.applicable > 0 ? Math.round((p.approved / p.applicable) * 100) : 0;

  let nextLine: string;
  if (p.declarationReady) {
    nextLine = de
      ? 'Alle zutreffenden Arbeitsblätter genehmigt — Konformitätserklärung kann erzeugt werden.'
      : 'All applicable worksheets approved — the declaration can be issued.';
  } else if (p.applicable === 0) {
    nextLine = de ? 'Alle Arbeitsblätter als nicht zutreffend markiert.' : 'Every worksheet is marked not applicable.';
  } else if (!p.next) {
    nextLine = '';
  } else if (p.next.reason === 'fill') {
    nextLine = de
      ? `Nächster Schritt: ${p.next.code} ausfüllen — ${p.next.missingRequired} Pflichtfeld${p.next.missingRequired === 1 ? '' : 'er'} offen.`
      : `Next: fill ${p.next.code} — ${p.next.missingRequired} required field${p.next.missingRequired === 1 ? '' : 's'} open.`;
  } else if (p.next.reason === 'submit') {
    nextLine = de
      ? `Nächster Schritt: ${p.next.code} ist vollständig — zur Prüfung einreichen.`
      : `Next: ${p.next.code} is complete — submit it for review.`;
  } else {
    nextLine = de
      ? `Nächster Schritt: ${p.next.code} wartet auf Genehmigung.`
      : `Next: ${p.next.code} is awaiting approval.`;
  }

  return (
    <section
      className="rounded-md border border-hairline bg-paper-2/40 p-3 space-y-2"
      data-testid="standard-progress-panel"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.25em] text-subtext">
          {de ? 'Fortschritt zur Konformitätserklärung' : 'Progress to declaration'}
        </div>
        <div className="tabular-nums text-xs font-medium text-ink">
          {p.approved}/{p.applicable}
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-ink/10 overflow-hidden" aria-hidden>
        <div
          className={`h-full rounded-full ${p.declarationReady ? 'bg-success' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-subtext">
        <span>{de ? 'genehmigt' : 'approved'} {p.approved}</span>
        <span>{de ? 'in Prüfung' : 'in review'} {p.inReview}</span>
        <span>{de ? 'offen' : 'open'} {p.open - p.inReview}</span>
        {p.notApplicable > 0 && (
          <span>{de ? 'nicht zutreffend' : 'not applicable'} {p.notApplicable}</span>
        )}
      </div>
      {nextLine && (
        <p className="text-xs text-ink">
          {p.next && !p.declarationReady ? (
            <Link
              href={`/${locale}/projects/${projectId}/standards/${standardCode}/worksheets/${p.next.code}`}
              className="hover:underline"
            >
              {nextLine}
            </Link>
          ) : (
            nextLine
          )}
        </p>
      )}
      {p.declarationReady && (
        <a
          href={`/api/projects/${projectId}/standards/${standardCode}/conformity`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs font-medium text-accent hover:text-accent-2"
        >
          {de ? 'Konformitätserklärung erzeugen →' : 'Issue the declaration →'}
        </a>
      )}
    </section>
  );
}
