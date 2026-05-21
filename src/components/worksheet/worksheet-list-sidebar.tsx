import Link from 'next/link';

type WorksheetEntry = {
  code: string;
  titleDe: string;
  phase: number | null;
  archetype: string | null;
  status: 'draft' | 'submitted_for_review' | 'engineer_approved' | 'final' | 'deactivated' | null;
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
      {phases.map((phase) => (
        <div key={String(phase)} className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.25em] text-subtext">
            Phase {phase ?? '—'}
          </div>
          <ul className="space-y-1">
            {byPhase.get(phase)?.map((w) => {
              const isActive = w.code === activeWorksheetCode;
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
                    <span className="font-mono text-[11px] mr-2">{w.code}</span>
                    {w.titleDe}
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
