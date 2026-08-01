/**
 * Maintenance-schedule pure core — due-state of a library maintenance duty
 * (maintenance_schedules) against a project's Monitoring-Journal entries.
 *
 * Deliberately DB- and clock-free: `today` is a parameter (never Date.now),
 * all dates are ISO `yyyy-mm-dd` strings, so every rule is unit-testable
 * (mirrors monitoring-core / effort-core). The `'use server'` module
 * (`src/lib/actions/monitoring.ts`, listMaintenancePlan) wraps this with
 * auth + persistence.
 */

/** A duty ticks off when a journal entry is within this window BEFORE due. */
export const DUE_SOON_DAYS = 30;

export type DueState = 'ok' | 'due' | 'overdue' | 'unscheduled';

/** The slice of a maintenance_schedules row the due-state rule needs. */
export type MaintenanceTaskLike = {
  /** Interval in months; null when the source prints no fixed number. */
  intervalMonths: number | null;
  /** One of the six monitoring categories (monitoring-core.ts). */
  category: string;
  /** The owning standard (standards.id) — duties are standard-scoped. */
  standardId: string;
};

/** The slice of a monitoring_entries row the due-state rule needs. */
export type JournalEntryLike = {
  /** ISO date (yyyy-mm-dd). */
  entryDate: string;
  category: string;
  /** The entry's optional guideline link; null = not standard-scoped. */
  standardId: string | null;
};

export type DueStatus = {
  /** Newest matching journal entry date (ISO) or null when never done. */
  lastDone: string | null;
  /** lastDone + intervalMonths (ISO) or null (never done / no interval). */
  dueDate: string | null;
  state: DueState;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function daysInMonth(year: number, month1: number): number {
  // Day 0 of the NEXT month = last day of `month1` (1-based month).
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/**
 * Add whole months to an ISO date, clamping the day to the target month's
 * length (2026-01-31 + 1 → 2026-02-28; 2024-01-31 + 1 → 2024-02-29).
 * Fractional months are handled as whole months + round(fraction × 30) days
 * (e.g. 1.5 → 1 month + 15 days), so a numeric interval like 0.5 still
 * yields a deterministic date.
 */
export function addMonthsClamped(iso: string, months: number): string {
  if (!ISO_DATE.test(iso)) throw new Error(`Ungültiges ISO-Datum: ${iso}`);
  const [y, m, d] = iso.split('-').map(Number);
  const whole = Math.trunc(months);
  const extraDays = Math.round((months - whole) * 30);

  const monthIndex0 = m - 1 + whole; // 0-based month, may over/underflow
  const targetYear = y + Math.floor(monthIndex0 / 12);
  const targetMonth1 = ((monthIndex0 % 12) + 12) % 12 + 1;
  const clampedDay = Math.min(d, daysInMonth(targetYear, targetMonth1));

  // Day arithmetic for the fractional remainder via UTC epoch (calendar-safe).
  const t = Date.UTC(targetYear, targetMonth1 - 1, clampedDay) + extraDays * 86_400_000;
  const out = new Date(t);
  return `${pad(out.getUTCFullYear(), 4)}-${pad(out.getUTCMonth() + 1, 2)}-${pad(
    out.getUTCDate(),
    2,
  )}`;
}

/** Whole-day difference b − a for ISO dates (positive when b is later). */
function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

/**
 * Due-state of one maintenance duty against a project's journal.
 *
 * - `lastDone` = newest journal entry whose category matches AND whose
 *   standardId === the task's standardId (an entry without a guideline link,
 *   or linked to another standard, never ticks a duty off).
 * - `intervalMonths === null` → 'unscheduled' (no dueDate; lastDone still
 *   reported when present).
 * - never done + has interval → 'overdue' with lastDone/dueDate null (a duty
 *   the standard prescribes and the project has never documented is late).
 * - otherwise `dueDate = lastDone + intervalMonths` (clamped month
 *   arithmetic): past dueDate → 'overdue'; within DUE_SOON_DAYS before it →
 *   'due'; else 'ok'.
 */
export function dueStatus(
  task: MaintenanceTaskLike,
  entries: JournalEntryLike[],
  today: string,
): DueStatus {
  if (!ISO_DATE.test(today)) throw new Error(`Ungültiges ISO-Datum: ${today}`);

  let lastDone: string | null = null;
  for (const e of entries) {
    if (e.category !== task.category) continue;
    if (e.standardId !== task.standardId) continue;
    if (!ISO_DATE.test(e.entryDate)) continue;
    if (lastDone === null || e.entryDate > lastDone) lastDone = e.entryDate;
  }

  if (task.intervalMonths === null) {
    return { lastDone, dueDate: null, state: 'unscheduled' };
  }

  if (lastDone === null) {
    // Prescribed but never documented → late by definition.
    return { lastDone: null, dueDate: null, state: 'overdue' };
  }

  const dueDate = addMonthsClamped(lastDone, task.intervalMonths);
  const untilDue = diffDays(today, dueDate); // days from today until due
  const state: DueState =
    untilDue < 0 ? 'overdue' : untilDue <= DUE_SOON_DAYS ? 'due' : 'ok';
  return { lastDone, dueDate, state };
}
