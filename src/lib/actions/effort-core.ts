/**
 * Effort-logging pure core (roadmap v2 §2.9).
 *
 * Validation + aggregation without any DB or session dependency, so the
 * rules are unit-testable (mirrors the finalize-gate pure/DB split). The
 * `'use server'` module (`effort.ts`) wraps these with auth + persistence.
 */
import { z } from 'zod';
import { durationMinutes } from './monitoring-core';

/** Hard bounds for a single entry: more than 0, at most 24 hours per day. */
export const HOURS_MIN_EXCLUSIVE = 0;
export const HOURS_MAX = 24;

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format JJJJ-MM-TT vorliegen')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Ungültiges Datum');

export const addEffortEntrySchema = z.object({
  projectId: z.string().uuid(),
  /** ISO date (yyyy-mm-dd) — matches the Postgres `date` column. */
  workDate: isoDateSchema,
  hours: z
    .number('Stunden müssen eine Zahl sein')
    .finite()
    .gt(HOURS_MIN_EXCLUSIVE, 'Stunden müssen größer als 0 sein')
    .max(HOURS_MAX, `Maximal ${HOURS_MAX} Stunden pro Eintrag`),
  /** Free text for now — offer positions come with Slice E1. */
  position: z.string().trim().min(1, 'Position erforderlich').max(200),
  /** Optional rate_roles id — the server verifies it belongs to the org. */
  roleId: z.string().uuid().optional(),
  note: z.string().trim().max(1000).optional(),
});

export type AddEffortEntryInput = z.infer<typeof addEffortEntrySchema>;

/** Parse + validate an add-entry payload. Throws ZodError on invalid input. */
export function parseAddEffortEntry(input: unknown): AddEffortEntryInput {
  return addEffortEntrySchema.parse(input);
}

/** Decimal hours (2 decimals) from a validated HH:MM range (end after
 * start) — the same rounding the journal's als-Aufwand path uses. */
export function hoursFromRange(start: string, end: string): number {
  return Math.round((durationMinutes(start, end) / 60) * 100) / 100;
}

/**
 * Sum entry hours. Drizzle returns `numeric` columns as strings, so both
 * string and number inputs are accepted; non-finite values count as 0.
 */
export function computeTotalHours(
  entries: ReadonlyArray<{ hours: string | number }>,
): number {
  return entries.reduce((sum, e) => {
    const h = typeof e.hours === 'number' ? e.hours : Number(e.hours);
    return sum + (Number.isFinite(h) ? h : 0);
  }, 0);
}
