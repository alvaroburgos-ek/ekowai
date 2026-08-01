'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addEffortEntry, deleteEffortEntry } from '@/lib/actions/effort';
import type { EffortEntryView, EffortRoleOption } from '@/lib/actions/effort';

/** Local ISO date (yyyy-mm-dd) for the date input's default — not UTC-shifted. */
function todayLocalIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function fmtHours(h: string | number): string {
  const n = typeof h === 'number' ? h : Number(h);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('de-DE');
}

/**
 * Effort log panel (roadmap v2 §2.9 — dependency for the Angebots-Engine).
 * The server page loads entries + total via `listEffortEntries` and passes
 * them down; add/delete call the server actions, whose `revalidatePath`
 * refreshes this overview section.
 */
export function EffortLog({
  projectId,
  entries,
  totalHours,
  roles,
}: {
  projectId: string;
  entries: EffortEntryView[];
  totalHours: number;
  /** Active paid roles (rate_roles) for the optional role select. */
  roles: EffortRoleOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [workDate, setWorkDate] = useState(todayLocalIso());
  const [hours, setHours] = useState('');
  const [position, setPosition] = useState('');
  /** '' = no role (org default rate); otherwise a rate_roles id. */
  const [roleId, setRoleId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hoursNum = Number(hours.replace(',', '.'));
  const canAdd =
    workDate !== ''
    && hours.trim() !== ''
    && Number.isFinite(hoursNum)
    && hoursNum > 0
    && hoursNum <= 24
    && position.trim() !== '';

  function handleAdd() {
    if (!canAdd) return;
    setError(null);
    startTransition(async () => {
      try {
        await addEffortEntry({
          projectId,
          workDate,
          hours: hoursNum,
          position: position.trim(),
          roleId: roleId !== '' ? roleId : undefined,
          note: note.trim() !== '' ? note.trim() : undefined,
        });
        setHours('');
        setPosition('');
        setRoleId('');
        setNote('');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteEffortEntry(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-5 space-y-4">
      {/* Total hours headline */}
      <div className="flex items-baseline gap-2">
        <span className="tabular-nums text-2xl font-semibold text-ink">
          {fmtHours(totalHours)}
        </span>
        <span className="text-sm text-subtext">Stunden gesamt</span>
      </div>

      {/* Add-row form */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block sm:w-40">
          <span className="text-xs font-medium text-subtext">Datum</span>
          <Input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className="mt-1"
            aria-label="Datum"
          />
        </label>
        <label className="block sm:w-28">
          <span className="text-xs font-medium text-subtext">Stunden</span>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            max="24"
            step="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="0"
            className="mt-1 tabular-nums"
            aria-label="Stunden"
          />
        </label>
        <label className="block flex-1">
          <span className="text-xs font-medium text-subtext">Position</span>
          <Input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="z. B. Versickerungsnachweis DWA-A 138"
            className="mt-1"
            aria-label="Position"
          />
        </label>
        <label className="block sm:w-44">
          <span className="text-xs font-medium text-subtext">Rolle (optional)</span>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink"
            aria-label="Rolle (optional)"
          >
            <option value="">— keine —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block flex-1">
          <span className="text-xs font-medium text-subtext">Notiz</span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="optional"
            className="mt-1"
            aria-label="Notiz"
          />
        </label>
        <Button
          size="sm"
          type="button"
          onClick={handleAdd}
          disabled={isPending || !canAdd}
          className="shrink-0"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Plus aria-hidden />}
          Erfassen
        </Button>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      {/* Entry list */}
      {entries.length === 0 ? (
        <p className="text-[11px] text-subtext py-2 italic">
          Noch keine Aufwände erfasst.
        </p>
      ) : (
        <ul className="divide-y divide-hairline">
          {entries.map((e) => (
            <li
              key={e.id}
              className="py-2.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 text-sm"
            >
              <div className="sm:w-24 sm:shrink-0 text-xs text-subtext tabular-nums">
                {fmtDate(e.workDate)}
              </div>
              <div className="sm:w-20 sm:shrink-0 tabular-nums font-medium text-ink">
                {fmtHours(e.hours)} h
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-ink break-words">{e.position}</div>
                <div className="text-xs text-subtext break-words">
                  {e.roleName ? `${e.roleName} · ` : ''}
                  {e.note ? `${e.note} · ` : ''}
                  {e.userName ?? '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(e.id)}
                disabled={isPending}
                className="self-start sm:self-center shrink-0 rounded-lg p-1.5 text-subtext hover:bg-paper-2 hover:text-error transition-colors disabled:opacity-50"
                aria-label="Eintrag löschen"
                title="Eintrag löschen"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
