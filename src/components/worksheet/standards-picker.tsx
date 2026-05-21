'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { addStandardToProject, removeStandardFromProject } from '@/lib/actions/project-standards';

type Standard = {
  id: string;
  code: string;
  titleDe: string;
  version: string;
};

type Props = {
  projectId: string;
  available: Standard[];
  active: Array<{ projectStandardId: string; standard: Standard }>;
};

export function StandardsPicker({ projectId, available, active }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedToAdd, setSelectedToAdd] = useState<string>('');

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

  const handleRemove = (standardId: string) => {
    const reason = window.prompt('Grund für die Entfernung?');
    if (!reason || !reason.trim()) return;
    startTransition(async () => {
      await removeStandardFromProject(projectId, standardId, reason);
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
                    {a.standard.titleDe} · {a.standard.version}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleRemove(a.standard.id)}
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
          <div className="flex gap-2">
            <select
              value={selectedToAdd}
              onChange={(e) => setSelectedToAdd(e.target.value)}
              className="flex-1 rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="">— Auswählen —</option>
              {addable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.titleDe}
                </option>
              ))}
            </select>
            <Button onClick={handleAdd} disabled={pending || !selectedToAdd}>
              Hinzufügen
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
