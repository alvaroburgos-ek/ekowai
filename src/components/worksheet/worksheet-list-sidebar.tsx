import Link from 'next/link';
import { FileDown } from 'lucide-react';

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-ink/20',
  submitted_for_review: 'bg-accent-2',
  engineer_approved: 'bg-success',
  final: 'bg-accent',
  deactivated: 'bg-ink/10',
};

type WorksheetEntry = {
  code: string;
  titleDe: string;
  titleEn: string | null;
  phase: number | null;
  archetype: string | null;
  status: 'draft' | 'submitted_for_review' | 'engineer_approved' | 'final' | 'deactivated' | null;
  /** Number of required, active fields on this worksheet template. */
  totalRequired: number;
  /** Number of required fields with a non-null value in the current project. */
  filledRequired: number;
};

type Props = {
  projectId: string;
  standardCode: string;
  worksheets: WorksheetEntry[];
  locale: 'de' | 'en';
  activeWorksheetCode?: string;
};

export function WorksheetListSidebar({
  projectId,
  standardCode,
  worksheets,
  locale,
  activeWorksheetCode,
}: Props) {
  // Group by phase
  const byPhase = new Map<number | null, WorksheetEntry[]>();
  for (const w of worksheets) {
    const arr = byPhase.get(w.phase) ?? [];
    arr.push(w);
    byPhase.set(w.phase, arr);
  }
  const phases = Array.from(byPhase.keys()).sort((a, b) => {
    if (a == null) return 1;
    if (b == null) return -1;
    return a - b;
  });

  return (
    <nav className="space-y-6 sticky top-6">
      <a
        href={`/api/projects/${projectId}/standards/${standardCode}/report`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-2 transition-colors"
      >
        <FileDown className="size-3.5" aria-hidden />
        Bericht als PDF
      </a>
      {phases.map((phase) => (
        <div key={String(phase)} className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.25em] text-subtext">
            Phase {phase ?? '—'}
          </div>
          <ul className="space-y-1">
            {byPhase.get(phase)?.map((w) => {
              const isActive = w.code === activeWorksheetCode;
              const isComplete = w.totalRequired > 0 && w.filledRequired >= w.totalRequired;
              return (
                <li key={w.code}>
                  <Link
                    href={`/${locale}/projects/${projectId}/standards/${standardCode}/worksheets/${w.code}`}
                    className={`block px-2 py-1 text-sm rounded ${
                      isActive
                        ? 'bg-accent/10 text-ink font-medium'
                        : 'text-subtext hover:text-ink hover:bg-paper-2/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[w.status ?? 'draft']}`}
                        aria-label={`Status: ${w.status ?? 'draft'}`}
                      />
                      <span className="font-mono text-[11px] shrink-0">{w.code}</span>
                      <span className="truncate flex-1">
                        {locale === 'de' ? w.titleDe : w.titleEn ?? w.titleDe}
                      </span>
                      {w.totalRequired > 0 && (
                        <span
                          className={`tabular-nums text-[10px] shrink-0 ${isComplete ? 'text-success' : 'text-subtext'}`}
                          title={`${w.filledRequired} von ${w.totalRequired} Pflichtfeldern befüllt`}
                        >
                          {w.filledRequired}/{w.totalRequired}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
