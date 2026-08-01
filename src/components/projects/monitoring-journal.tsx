'use client';

import { useRef, useState, useTransition } from 'react';
import { Plus, Trash2, Loader2, FileText, Camera, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addMonitoringEntry, deleteMonitoringEntry } from '@/lib/actions/monitoring';
import { uploadDocument } from '@/lib/actions/documents';
import {
  PHOTO_ACCEPT,
  isMonitoringPhotoTitle,
  monitoringPhotoTitle,
  photoUploadErrorMessage,
  validatePhotoFile,
} from '@/lib/monitoring/photo';
import type {
  MaintenancePlanStandardView,
  MaintenanceTaskView,
  MonitoringEntryView,
} from '@/lib/actions/monitoring';
import type { DueState } from '@/lib/monitoring/schedule';
import { groupMaintenanceTasks } from '@/lib/monitoring/grouping';
import type { MaintenanceTaskGroup } from '@/lib/monitoring/grouping';
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

/** Due-badge styling + German label per state (library due-state core). */
const DUE_BADGE: Record<DueState, { label: string; className: string }> = {
  ok: { label: 'OK', className: 'bg-success-soft text-success' },
  due: { label: 'Fällig', className: 'bg-warning-soft text-warning' },
  overdue: { label: 'Überfällig', className: 'bg-error-soft text-error' },
  unscheduled: { label: 'Ohne Intervall', className: 'bg-paper-2 text-subtext' },
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
  maintenancePlan,
}: {
  projectId: string;
  entries: MonitoringEntryView[];
  documents: MonitoringDocumentOption[];
  /** The project's attached standards — feeds the optional guideline link. */
  standards: MonitoringStandardOption[];
  /**
   * Library maintenance duties of the attached standards (grouped per
   * standard, due-state precomputed server-side). Empty → no Wartungsplan
   * block is rendered at all.
   */
  maintenancePlan: MaintenancePlanStandardView[];
}) {
  const [isPending, startTransition] = useTransition();
  const [entryDate, setEntryDate] = useState(todayLocalIso());
  const [category, setCategory] = useState<MonitoringCategory>('laborbericht');
  const [note, setNote] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [standardId, setStandardId] = useState('');
  /** Photo picked for upload — uploaded via the EXISTING document path on submit. */
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  /** Client-side list filter: '' = alle, else a standards.id. */
  const [filterStandardId, setFilterStandardId] = useState('');
  /**
   * User toggles on Wartungsplan groups, keyed `${standardId}:${groupKey}`.
   * Unset = the group's computed default (open when it matches the chosen
   * Anlagentyp or already has journal-matched duties), so a server refresh
   * keeps sensible defaults while explicit toggles win.
   */
  const [planGroupOverrides, setPlanGroupOverrides] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const canAdd = entryDate !== '' && note.trim().length <= NOTE_MAX;

  function clearPhoto() {
    setPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setPhotoFile(null);
      return;
    }
    const msg = validatePhotoFile(file);
    if (msg) {
      setError(msg);
      clearPhoto();
      return;
    }
    setError(null);
    setPhotoFile(file);
  }

  function handleAdd() {
    if (!canAdd) return;
    setError(null);
    startTransition(async () => {
      try {
        let linkedDocumentId = documentId !== '' ? documentId : undefined;

        // Photo picked → upload it FIRST via the existing document path
        // (same server action + storage bucket as the Documents tab), then
        // link the fresh document to the journal entry.
        if (photoFile) {
          const title = monitoringPhotoTitle(entryDate);
          const fd = new FormData();
          fd.append('file', photoFile);
          fd.append('projectId', projectId);
          // The upload action's `kind` is a FIXED enum (no free text) —
          // photos file under 'other'.
          fd.append('kind', 'other');
          fd.append('title', title);
          fd.append('citationLabel', title);
          const r = await uploadDocument(fd);
          if (!r.ok) {
            setError(photoUploadErrorMessage(r.error));
            return;
          }
          linkedDocumentId = r.documentId;
        }

        await addMonitoringEntry({
          projectId,
          entryDate,
          category,
          note: note.trim() !== '' ? note.trim() : undefined,
          documentId: linkedDocumentId,
          standardId: standardId !== '' ? standardId : undefined,
        });
        setNote('');
        setDocumentId('');
        setStandardId('');
        clearPhoto();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  /**
   * "Erfassen" on a maintenance duty: PREFILL the existing add-form (date
   * today, the duty's category, the duty's standard, note = duty title) —
   * the user reviews and submits via the normal add flow.
   */
  function handlePrefillTask(taskStandardId: string, task: MaintenanceTaskView) {
    setEntryDate(todayLocalIso());
    setCategory(task.category as MonitoringCategory);
    setStandardId(taskStandardId);
    setNote(task.title);
    setError(null);
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
      {/* Wartungsplan — library duties of the attached standards, ABOVE the
          journal. Rendered only when the standards actually have schedule
          rows (the action already omits standards without duties). */}
      {maintenancePlan.length > 0 && (
        <div
          className="rounded-xl border border-hairline bg-paper-2/40 p-4 space-y-4"
          data-testid="maintenance-plan"
        >
          <h3 className="text-sm font-semibold text-ink">Wartungsplan</h3>
          {maintenancePlan.map((s) => {
            // Fold the flat duty list into per-table sub-groups (E.1–E.6);
            // §-titled duties fall into one fallback group. Grouping only
            // reorganises — every duty stays reachable via expand.
            const taskGroups = groupMaintenanceTasks(s.tasks);
            const groupOpen = (
              g: MaintenanceTaskGroup<MaintenanceTaskView>,
            ): boolean => {
              const overrideKey = `${s.standardId}:${g.key ?? 'other'}`;
              const override = planGroupOverrides[overrideKey];
              if (override !== undefined) return override;
              // No Anlagentyp chosen yet → everything collapsed (the hint
              // below points at the worksheet). Otherwise the matched group
              // and groups with journal history start open.
              if (s.facilityTypeValue === null) return false;
              return (
                (g.key !== null && g.key === s.matchedGroup) || g.hasJournalMatch
              );
            };
            return (
              <div key={s.standardId} className="space-y-1">
                <div className="text-xs font-medium text-subtext" title={s.standardTitleDe}>
                  {s.standardCode}
                </div>
                <div className="border-t border-hairline">
                  {taskGroups.map((g) => {
                    const overrideKey = `${s.standardId}:${g.key ?? 'other'}`;
                    const open = groupOpen(g);
                    const isMatched = g.key !== null && g.key === s.matchedGroup;
                    const label =
                      g.label ??
                      (taskGroups.length === 1
                        ? 'Alle Wartungspflichten'
                        : 'Weitere Pflichten');
                    return (
                      <div key={overrideKey} className="border-b border-hairline">
                        <button
                          type="button"
                          onClick={() =>
                            setPlanGroupOverrides((prev) => ({
                              ...prev,
                              [overrideKey]: !open,
                            }))
                          }
                          aria-expanded={open}
                          className="w-full py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-left text-sm hover:bg-paper-2/60 transition-colors"
                          data-testid="maintenance-plan-group"
                        >
                          {open ? (
                            <ChevronDown className="size-3.5 shrink-0 text-subtext" aria-hidden />
                          ) : (
                            <ChevronRight className="size-3.5 shrink-0 text-subtext" aria-hidden />
                          )}
                          <span className="font-medium text-ink break-words">{label}</span>
                          {isMatched && (
                            <span className="inline-flex items-center rounded-full border border-accent-2 bg-paper-2 px-2 py-0.5 text-[10px] font-medium text-ink">
                              passend zum gewählten Anlagentyp
                            </span>
                          )}
                          {/* Due-state tally — the honest summary while collapsed */}
                          {(['overdue', 'due', 'ok', 'unscheduled'] as const).map(
                            (state) =>
                              g.counts[state] > 0 && (
                                <span
                                  key={state}
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${DUE_BADGE[state].className}`}
                                >
                                  {`${g.counts[state]} ${DUE_BADGE[state].label}`}
                                </span>
                              ),
                          )}
                        </button>
                        {open && (
                          <ul className="divide-y divide-hairline border-t border-hairline">
                            {g.tasks.map((t) => {
                              const badge = DUE_BADGE[t.status.state];
                              return (
                                <li
                                  key={t.id}
                                  className="py-2 pl-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 text-sm"
                                >
                                  <div className="flex-1 min-w-0">
                                    <span className="text-ink break-words" title={t.sourceQuote}>
                                      {t.title}
                                    </span>
                                    <span className="ml-2 text-xs text-subtext">
                                      {t.intervalText ?? 'ohne Intervallangabe'}
                                    </span>
                                    {t.clauseReference && (
                                      <span className="ml-2 inline-flex items-center rounded-full border border-hairline px-2 py-0.5 text-[10px] font-medium text-subtext">
                                        {t.clauseReference}
                                      </span>
                                    )}
                                  </div>
                                  <div className="shrink-0">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
                                      title={
                                        t.status.dueDate
                                          ? `Fällig am ${fmtDate(t.status.dueDate)}`
                                          : t.status.lastDone
                                            ? `Zuletzt am ${fmtDate(t.status.lastDone)}`
                                            : 'Noch nie erfasst'
                                      }
                                    >
                                      {badge.label}
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handlePrefillTask(s.standardId, t)}
                                    disabled={isPending}
                                    className="shrink-0 self-start sm:self-center"
                                  >
                                    <Plus aria-hidden />
                                    Erfassen
                                  </Button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {maintenancePlan[0]?.facilityTypeValue == null && (
            <p className="text-[11px] text-subtext italic">
              Anlagentyp im Arbeitsblatt wählen, um den Plan zu fokussieren.
            </p>
          )}
          <p className="text-[11px] text-subtext italic">
            Wartungspflichten stammen wörtlich aus dem jeweiligen Regelwerk
            (Quelle je Eintrag hinterlegt).
          </p>
        </div>
      )}

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
            className="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink disabled:opacity-50"
            aria-label="Dokument"
            disabled={photoFile !== null}
            title={
              photoFile !== null
                ? 'Das Foto wird als neues Dokument angehängt'
                : undefined
            }
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
          <span className="text-xs font-medium text-subtext">
            {category === 'foto' ? 'Foto aufnehmen/hochladen' : 'Foto anhängen (optional)'}
          </span>
          <input
            ref={photoInputRef}
            type="file"
            accept={PHOTO_ACCEPT}
            capture="environment"
            onChange={handlePhotoChange}
            disabled={isPending}
            aria-label={
              category === 'foto' ? 'Foto aufnehmen/hochladen' : 'Foto anhängen'
            }
            className="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-1.5 text-sm text-ink file:mr-2 file:rounded-md file:border-0 file:bg-paper-2 file:px-2 file:py-1 file:text-xs file:font-medium file:text-ink disabled:opacity-50"
          />
          {photoFile && (
            <span className="mt-1 block text-[11px] text-subtext break-words">
              {`${photoFile.name} (${(photoFile.size / (1024 * 1024)).toFixed(1)} MB)`}
            </span>
          )}
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
                            {isMonitoringPhotoTitle(e.documentTitle) ? (
                              <Camera
                                className="size-3 shrink-0"
                                aria-label="Foto"
                                role="img"
                              />
                            ) : (
                              <FileText className="size-3 shrink-0" aria-hidden />
                            )}
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
