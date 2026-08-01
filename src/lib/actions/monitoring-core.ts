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
  'sonstiges',
] as const;

export type MonitoringCategory = (typeof MONITORING_CATEGORIES)[number];

/** German display labels for the six categories (badge + select). */
export const MONITORING_CATEGORY_LABELS: Record<MonitoringCategory, string> = {
  laborbericht: 'Laborbericht',
  messung: 'Messung',
  begehung: 'Begehung',
  wartung: 'Wartung',
  foto: 'Foto',
  sonstiges: 'Sonstiges',
};

/** Hard bound for the free-text note. */
export const NOTE_MAX = 2000;

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format JJJJ-MM-TT vorliegen')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Ungültiges Datum');

export const addMonitoringEntrySchema = z.object({
  projectId: z.string().uuid(),
  /** ISO date (yyyy-mm-dd) — matches the Postgres `date` column. */
  entryDate: isoDateSchema,
  category: z.enum(MONITORING_CATEGORIES, 'Ungültige Kategorie'),
  note: z.string().trim().max(NOTE_MAX, `Maximal ${NOTE_MAX} Zeichen`).optional(),
  /** Optional link to an uploaded document (project_documents.id). */
  documentId: z.string().uuid().optional(),
});

export type AddMonitoringEntryInput = z.infer<typeof addMonitoringEntrySchema>;

/** Parse + validate an add-entry payload. Throws ZodError on invalid input. */
export function parseAddMonitoringEntry(input: unknown): AddMonitoringEntryInput {
  return addMonitoringEntrySchema.parse(input);
}
