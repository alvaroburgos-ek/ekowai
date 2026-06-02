'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
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

export function StandardsPicker({ projectId, available, active, locale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedToAdd, setSelectedToAdd] = useState<string>('');
  const [removeModal, setRemoveModal] = useState<RemoveModalState>(null);
  const [reason, setReason] = useState('');

  const modalContainerRef = useFocusTrap(removeModal !== null);

  const activeIds = new Set(active.map((a) => a.standard.id));
  const addable = available.filter((s) => !activeIds.has(s.id));

  const handleAdd = () => {
    if (!selectedToAdd) return;
    startTransition(async () => {
      await addStandardToProject(projectId, selectedToAdd);
      setSelectedToAdd('');
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
                className="flex items-center justify-between gap-4 px-3 py-2 border border-hairline rounded-md"
              >
                <div>
                  <div className="text-sm font-medium text-ink">{a.standard.code}</div>
                  <div className="text-xs text-subtext">
                    {pickTitle(a.standard, locale)} · {a.standard.version}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleRemove(a.standard.id, a.standard.code)}
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
          <div className="flex gap-2 items-stretch">
            <div className="flex-1">
              <Select
                value={selectedToAdd}
                onChange={(e) => setSelectedToAdd(e.target.value)}
              >
                <option value="">— Auswählen —</option>
                {addable.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {pickTitle(s, locale)}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={pending || !selectedToAdd}>
              Hinzufügen
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-lg bg-paper border border-hairline-strong p-6 space-y-4">
            <h2 id="remove-std-title" className="text-lg font-semibold text-ink">
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
            <div className="flex justify-end gap-2">
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
