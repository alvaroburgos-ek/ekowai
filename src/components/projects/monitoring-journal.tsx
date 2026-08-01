'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addMonitoringEntry, deleteMonitoringEntry } from '@/lib/actions/monitoring';
import type { MonitoringEntryView } from '@/lib/actions/monitoring';
import {
  MONITORING_CATEGORIES,
  MONITORING_CATEGORY_LABELS,
  NOTE_MAX,
} from '@/lib/actions/monitoring-core';
import type { MonitoringCategory } from '@/lib/actions/monitoring-core';

/** Local ISO date (yyyy-mm-dd) for the date input's default — not UTC-shifted. */
function todayLocalIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('de-DE');
}

function categoryLabel(category: string): string {
  return MONITORING_CATEGORY_LABELS[category as MonitoringCategory] ?? category;
}

export type MonitoringDocumentOption = {
  id: string;
  title: string;
  citationLabel: string;
};

/** Lightweight guideline option (the project's attached standards). */
export type MonitoringStandardOption = {
  id: string;
  code: string;
  titleDe: string;
};

/**
 * Monitoring-Journal panel (interim — documentation-only precursor to
 * roadmap Stage 8). Deliberately captures NO parameter values/units; the
 * time-series schema is frozen later from the owner's Messplan. The server
 * page loads entries via `listMonitoringEntries` and the project's documents
 * (for the optional link) and passes both down; add/delete call the server
 * actions, whose `revalidatePath` refreshes this overview section.
 */
export function MonitoringJournal({
  projectId,
  entries,
  documents,
  standards,
}: {
  projectId: string;
  entries: MonitoringEntryView[];
  documents: MonitoringDocumentOption[];
  /** The project's attached standards — feeds the optional guideline link. */
  standards: MonitoringStandardOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [entryDate, setEntryDate] = useState(todayLocalIso());
  const [category, setCategory] = useState<MonitoringCategory>('laborbericht');
  const [note, setNote] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [standardId, setStandardId] = useState('');
  /** Client-side list filter: '' = alle, else a standards.id. */
  const [filterStandardId, setFilterStandardId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canAdd = entryDate !== '' && note.trim().length <= NOTE_MAX;

  function handleAdd() {
    if (!canAdd) return;
    setError(null);
    startTransition(async () => {
      try {
        await addMonitoringEntry({
          projectId,
          entryDate,
          category,
          note: note.trim() !== '' ? note.trim() : undefined,
          documentId: documentId !== '' ? documentId : undefined,
          standardId: standardId !== '' ? standardId : undefined,
        });
        setNote('');
        setDocumentId('');
        setStandardId('');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteMonitoringEntry(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  // Filter chips: one per standard that HAS entries (dedup by id), plus Alle.
  const filterOptions: { id: string; code: string }[] = [];
  for (const e of entries) {
    if (e.standardId && e.standardCode && !filterOptions.some((f) => f.id === e.standardId)) {
      filterOptions.push({ id: e.standardId, code: e.standardCode });
    }
  }
  const filtered =
    filterStandardId === ''
      ? entries
      : entries.filter((e) => e.standardId === filterStandardId);

  // Entries arrive newest-first; group consecutive rows by entry date.
  const groups: { date: string; items: MonitoringEntryView[] }[] = [];
  for (const e of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.entryDate) last.items.push(e);
    else groups.push({ date: e.entryDate, items: [e] });
  }

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-5 space-y-4">
      {/* Add-row form */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block sm:w-40">
          <span className="text-xs font-medium text-subtext">Datum</span>
          <Input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="mt-1"
            aria-label="Datum"
          />
        </label>
        <label className="block sm:w-44">
          <span className="text-xs font-medium text-subtext">Kategorie</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MonitoringCategory)}
            className="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink"
            aria-label="Kategorie"
          >
            {MONITORING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {MONITORING_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block flex-1">
          <span className="text-xs font-medium text-subtext">Notiz</span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="optional, z. B. Probenahme Zulauf"
            maxLength={NOTE_MAX}
            className="mt-1"
            aria-label="Notiz"
          />
        </label>
        <label className="block flex-1">
          <span className="text-xs font-medium text-subtext">Dokument</span>
          <select
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink"
            aria-label="Dokument"
          >
            <option value="">— kein Dokument —</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {`${d.title} (${d.citationLabel})`}
              </option>
            ))}
          </select>
        </label>
        <label className="block flex-1">
          <span className="text-xs font-medium text-subtext">Regelwerk (optional)</span>
          <select
            value={standardId}
            onChange={(e) => setStandardId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink"
            aria-label="Regelwerk (optional)"
          >
            <option value="">— kein Regelwerk —</option>
            {standards.map((s) => (
              <option key={s.id} value={s.id}>
                {`${s.code} — ${s.titleDe}`}
              </option>
            ))}
          </select>
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

      {/* Regelwerk filter chips — only standards that actually have entries */}
      {filterOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Nach Regelwerk filtern">
          {[{ id: '', code: 'Alle' }, ...filterOptions].map((f) => (
            <button
              key={f.id || 'alle'}
              type="button"
              onClick={() => setFilterStandardId(f.id)}
              aria-pressed={filterStandardId === f.id}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                filterStandardId === f.id
                  ? 'border-accent-2 bg-paper-2 text-ink'
                  : 'border-hairline bg-paper text-subtext hover:text-ink'
              }`}
            >
              {f.code}
            </button>
          ))}
        </div>
      )}

      {/* Entry list, grouped by date (newest first) */}
      {entries.length === 0 ? (
        <p className="text-[11px] text-subtext py-2 italic">
          Noch keine Journal-Einträge erfasst.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-[11px] text-subtext py-2 italic">
          Keine Einträge für dieses Regelwerk.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.date}>
              <div className="text-xs font-medium text-subtext tabular-nums pb-1">
                {fmtDate(g.date)}
              </div>
              <ul className="divide-y divide-hairline border-t border-hairline">
                {g.items.map((e) => (
                  <li
                    key={e.id}
                    className="py-2.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 text-sm"
                  >
                    <div className="sm:w-28 sm:shrink-0">
                      <span className="inline-flex items-center rounded-full border border-hairline bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink">
                        {categoryLabel(e.category)}
                      </span>
                    </div>
                    {e.standardCode && (
                      <div className="sm:shrink-0">
                        <span
                          className="inline-flex items-center rounded-full border border-hairline px-2 py-0.5 text-[10px] font-medium text-subtext"
                          title={e.standardTitleDe ?? undefined}
                        >
                          {e.standardCode}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {e.note && <div className="text-ink break-words">{e.note}</div>}
                      <div className="text-xs text-subtext break-words">
                        {e.documentTitle && (
                          <span className="inline-flex items-center gap-1 mr-2">
                            <FileText className="size-3 shrink-0" aria-hidden />
                            {e.documentTitle}
                          </span>
                        )}
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
            </div>
          ))}
        </div>
      )}

      {/* Interim scope note — this journal documents, it does not measure. */}
      <p className="text-[11px] text-subtext italic">
        Werte/Messreihen folgen mit dem Zeitreihen-Schema (Stage 8) — hier nur
        Dokumentation.
      </p>
    </div>
  );
}
