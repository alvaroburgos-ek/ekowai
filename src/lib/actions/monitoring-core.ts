/**
 * Monitoring-Journal pure core (interim — documentation-only precursor to
 * roadmap Stage 8).
 *
 * Deliberately validates NO parameter values/units — the time-series schema
 * is frozen later from the owner's Messplan. Validation without any DB or
 * session dependency, so the rules are unit-testable (mirrors effort-core).
 * The `'use server'` module (`monitoring.ts`) wraps these with auth +
 * persistence.
 */
import { z } from 'zod';

/** App-side category vocabulary — plain text in the DB, enum here. */
export const MONITORING_CATEGORIES = [
  'laborbericht',
  'messung',
  'begehung',
  'wartung',
  'foto',
  'dokumentation',
  'sonstiges',
] as const;

export type MonitoringCategory = (typeof MONITORING_CATEGORIES)[number];

/** German display labels for the categories (badge + select). */
export const MONITORING_CATEGORY_LABELS: Record<MonitoringCategory, string> = {
  laborbericht: 'Laborbericht',
  messung: 'Messung',
  begehung: 'Begehung',
  wartung: 'Wartung',
  foto: 'Foto',
  dokumentation: 'Dokumentation',
  sonstiges: 'Sonstiges',
};

/** Hard bound for the free-text note. */
export const NOTE_MAX = 2000;

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format JJJJ-MM-TT vorliegen')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Ungültiges Datum');

/** HH:MM (24 h) — matches the Postgres `time` columns. */
const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Uhrzeit muss im Format HH:MM vorliegen');

export const addMonitoringEntrySchema = z
  .object({
    projectId: z.string().uuid(),
    /** ISO date (yyyy-mm-dd) — matches the Postgres `date` column. */
    entryDate: isoDateSchema,
    category: z.enum(MONITORING_CATEGORIES, 'Ungültige Kategorie'),
    note: z.string().trim().max(NOTE_MAX, `Maximal ${NOTE_MAX} Zeichen`).optional(),
    /** Optional link to an uploaded document (project_documents.id). */
    documentId: z.string().uuid().optional(),
    /**
     * Optional link to a guideline (standards.id). Must be one of the project's
     * attached standards — that cross-check needs the DB and lives in
     * `monitoring.ts` (addMonitoringEntry); here only the uuid shape.
     */
    standardId: z.string().uuid().optional(),
    /** Optional activity times — an open-ended start (no end) is allowed. */
    startTime: hhmmSchema.optional(),
    endTime: hhmmSchema.optional(),
    /**
     * Additionally record the duration as working hours (effort_entries →
     * Margin Guard). Requires a COMPLETE time range; the DB write happens in
     * `monitoring.ts` via `buildEffortFromJournal`.
     */
    logAsEffort: z.boolean().optional(),
  })
  .refine((v) => !(v.endTime && !v.startTime), {
    message: 'Endzeit ohne Beginn ist nicht möglich',
    path: ['endTime'],
  })
  .refine(
    (v) => !(v.startTime && v.endTime) || v.endTime > v.startTime,
    { message: 'Ende muss nach dem Beginn liegen', path: ['endTime'] },
  )
  .refine((v) => !v.logAsEffort || (v.startTime !== undefined && v.endTime !== undefined), {
    message: 'Aufwand erfassen erfordert Beginn und Ende',
    path: ['logAsEffort'],
  });

export type AddMonitoringEntryInput = z.infer<typeof addMonitoringEntrySchema>;

/** Parse + validate an add-entry payload. Throws ZodError on invalid input. */
export function parseAddMonitoringEntry(input: unknown): AddMonitoringEntryInput {
  return addMonitoringEntrySchema.parse(input);
}

/** Minutes between two validated HH:MM times (end after start). */
export function durationMinutes(start: string, end: string): number {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return toMin(end) - toMin(start);
}

/** German duration label: 135 → "2 h 15 min", 60 → "1 h", 45 → "45 min". */
export function formatDurationMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Shared display label for a stored time range ('HH:MM:SS' from Postgres or
 * 'HH:MM'): "14:00–16:15 · 2 h 15 min", "ab 14:00" (open-ended), or null. */
export function timeRangeLabel(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const s = start.slice(0, 5);
  if (!end) return `ab ${s}`;
  const e = end.slice(0, 5);
  return `${s}–${e} · ${formatDurationMinutes(durationMinutes(s, e))}`;
}

/** Effort payload derived from a timed journal entry (duration is never
 * stored — it becomes the effort entry's hours, rounded to 2 decimals).
 * Null when the entry has no complete time range. */
export function buildEffortFromJournal(entry: AddMonitoringEntryInput): {
  projectId: string;
  workDate: string;
  hours: number;
  position: string;
  note: string | undefined;
} | null {
  if (!entry.startTime || !entry.endTime) return null;
  const hours =
    Math.round((durationMinutes(entry.startTime, entry.endTime) / 60) * 100) / 100;
  return {
    projectId: entry.projectId,
    workDate: entry.entryDate,
    hours,
    position: `Journal: ${MONITORING_CATEGORY_LABELS[entry.category]}`,
    note: entry.note !== undefined && entry.note !== '' ? entry.note : undefined,
  };
}
