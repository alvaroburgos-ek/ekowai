'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addStandardToProject, removeStandardFromProject } from '@/lib/actions/project-standards';
import { useFocusTrap } from '@/lib/hooks/use-focus-trap';

type Standard = {
  id: string;
  code: string;
  titleDe: string;
  titleEn: string | null;
  version: string;
};

type Props = {
  projectId: string;
  available: Standard[];
  active: Array<{ projectStandardId: string; standard: Standard }>;
  locale: 'de' | 'en';
};

function pickTitle(s: Standard, locale: 'de' | 'en'): string {
  if (locale === 'de') return s.titleDe;
  return s.titleEn ?? s.titleDe;
}

type RemoveModalState = { standardId: string; standardCode: string } | null;

/** Issuing body derived from a standard code, e.g. "DWA-A-138-1" → "DWA". */
function issuingBody(code: string): string {
  return code.split('-')[0] || code;
}

export function StandardsPicker({ projectId, available, active, locale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [bodyFilter, setBodyFilter] = useState<string>('');
  const [removeModal, setRemoveModal] = useState<RemoveModalState>(null);
  const [reason, setReason] = useState('');

  const modalContainerRef = useFocusTrap(removeModal !== null);

  const activeIds = new Set(active.map((a) => a.standard.id));
  const addable = useMemo(
    () => available.filter((s) => !activeIds.has(s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [available, active],
  );

  const bodies = useMemo(
    () => Array.from(new Set(addable.map((s) => issuingBody(s.code)))).sort(),
    [addable],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return addable.filter((s) => {
      if (bodyFilter && issuingBody(s.code) !== bodyFilter) return false;
      if (!q) return true;
      return (
        s.code.toLowerCase().includes(q) ||
        pickTitle(s, locale).toLowerCase().includes(q)
      );
    });
  }, [addable, search, bodyFilter, locale]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selectedToAdd.has(s.id));

  const toggleOne = (id: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((s) => next.delete(s.id));
      else filtered.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const handleAdd = () => {
    const ids = addable.filter((s) => selectedToAdd.has(s.id)).map((s) => s.id);
    if (ids.length === 0) return;
    startTransition(async () => {
      for (const id of ids) {
        await addStandardToProject(projectId, id);
      }
      setSelectedToAdd(new Set());
      router.refresh();
    });
  };

  const handleRemove = (standardId: string, standardCode: string) => {
    setRemoveModal({ standardId, standardCode });
    setReason('');
  };

  const confirmRemove = () => {
    if (!removeModal || !reason.trim()) return;
    startTransition(async () => {
      await removeStandardFromProject(projectId, removeModal.standardId, reason);
      setRemoveModal(null);
      setReason('');
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.2em] text-subtext">
          Aktive Regelwerke
        </h3>
        {active.length === 0 ? (
          <p className="text-sm text-subtext italic">Noch keine Regelwerke aktiviert.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((a) => (
              <li
                key={a.projectStandardId}
                className="flex items-center justify-between gap-3 sm:gap-4 px-3 py-2 border border-hairline rounded-md"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink break-words">{a.standard.code}</div>
                  <div className="text-xs text-subtext break-words">
                    {pickTitle(a.standard, locale)} · {a.standard.version}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleRemove(a.standard.id, a.standard.code)}
                  className="shrink-0"
                >
                  Entfernen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.2em] text-subtext">
          Regelwerk hinzufügen
        </h3>
        {addable.length === 0 ? (
          <p className="text-sm text-subtext italic">
            Alle verfügbaren Regelwerke sind bereits aktiv.
          </p>
        ) : (
          <div className="space-y-3">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen (Code oder Titel)…"
              aria-label="Regelwerke durchsuchen"
            />

            {bodies.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setBodyFilter('')}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    bodyFilter === ''
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-hairline text-subtext hover:text-ink'
                  }`}
                >
                  Alle
                </button>
                {bodies.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBodyFilter(b)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      bodyFilter === b
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-hairline text-subtext hover:text-ink'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 text-xs text-subtext">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  disabled={filtered.length === 0}
                  className="h-4 w-4 rounded border-hairline-strong accent-accent"
                />
                Alle auswählen ({filtered.length})
              </label>
              {selectedToAdd.size > 0 && <span>{selectedToAdd.size} ausgewählt</span>}
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-subtext italic">Keine Treffer.</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {filtered.map((s) => {
                  const checked = selectedToAdd.has(s.id);
                  return (
                    <li key={s.id}>
                      <label
                        className={`flex items-start gap-3 px-3 py-2 border rounded-md cursor-pointer transition-colors ${
                          checked
                            ? 'border-accent bg-accent-soft/40'
                            : 'border-hairline hover:border-hairline-strong'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(s.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline-strong accent-accent"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink break-words">
                            {s.code}
                          </span>
                          <span className="block text-xs text-subtext break-words">
                            {pickTitle(s, locale)} · {s.version}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            <Button
              onClick={handleAdd}
              disabled={pending || selectedToAdd.size === 0}
              className="w-full sm:w-auto"
            >
              {selectedToAdd.size > 1
                ? `${selectedToAdd.size} Regelwerke hinzufügen`
                : 'Hinzufügen'}
            </Button>
          </div>
        )}
      </section>

      {removeModal && (
        <div
          ref={modalContainerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-std-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-lg bg-paper border border-hairline-strong p-5 sm:p-6 space-y-4">
            <h2 id="remove-std-title" className="text-lg font-semibold text-ink break-words">
              Regelwerk entfernen: {removeModal.standardCode}
            </h2>
            <p className="text-sm text-subtext">
              Begründung (Pflicht — wird permanent im Auditprotokoll gespeichert):
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              autoFocus
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setRemoveModal(null)} disabled={pending}>
                Abbrechen
              </Button>
              <Button onClick={confirmRemove} disabled={pending || !reason.trim()}>
                Entfernen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
