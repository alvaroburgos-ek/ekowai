/**
 * Maintenance-schedule pure-core tests: month arithmetic (incl. day clamp),
 * all four due-states, and standard-scoped journal matching. The core is
 * clock-free (`today` param), so every case is fully deterministic.
 */
import { describe, it, expect } from 'vitest';
import {
  addMonthsClamped,
  dueStatus,
  DUE_SOON_DAYS,
  type JournalEntryLike,
  type MaintenanceTaskLike,
} from '../schedule';

const STD_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const STD_B = 'bbbbbbbb-0000-4000-8000-000000000002';

const task = (over: Partial<MaintenanceTaskLike> = {}): MaintenanceTaskLike => ({
  intervalMonths: 6,
  category: 'wartung',
  standardId: STD_A,
  ...over,
});

const entry = (over: Partial<JournalEntryLike> = {}): JournalEntryLike => ({
  entryDate: '2026-01-15',
  category: 'wartung',
  standardId: STD_A,
  ...over,
});

describe('addMonthsClamped — month arithmetic', () => {
  it('adds whole months within a year', () => {
    expect(addMonthsClamped('2026-01-15', 6)).toBe('2026-07-15');
  });

  it('rolls over the year boundary', () => {
    expect(addMonthsClamped('2026-11-10', 3)).toBe('2027-02-10');
    expect(addMonthsClamped('2026-01-15', 12)).toBe('2027-01-15');
  });

  it('clamps Jan 31 + 1 month to the end of February', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('clamps to Feb 29 in a leap year', () => {
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('clamps a 31st onto a 30-day month', () => {
    expect(addMonthsClamped('2026-03-31', 1)).toBe('2026-04-30');
  });

  it('does NOT restore the original day after a clamp chain input', () => {
    // Clamping is per-target-month from the given date, no memory of day 31.
    expect(addMonthsClamped('2026-02-28', 1)).toBe('2026-03-28');
  });

  it('handles fractional months deterministically (whole + days)', () => {
    // 1.5 → 1 month + 15 days.
    expect(addMonthsClamped('2026-01-01', 1.5)).toBe('2026-02-16');
  });

  it('rejects a non-ISO date', () => {
    expect(() => addMonthsClamped('31.01.2026', 1)).toThrow();
  });
});

describe('dueStatus — the four states', () => {
  it("'ok' when the due date is comfortably in the future", () => {
    const s = dueStatus(task(), [entry({ entryDate: '2026-06-01' })], '2026-07-01');
    expect(s).toEqual({ lastDone: '2026-06-01', dueDate: '2026-12-01', state: 'ok' });
  });

  it(`'due' within ${DUE_SOON_DAYS} days before the due date`, () => {
    // dueDate = 2026-07-15; today 30 days before → due.
    const s = dueStatus(task(), [entry()], '2026-06-15');
    expect(s.dueDate).toBe('2026-07-15');
    expect(s.state).toBe('due');
  });

  it("'due' exactly ON the due date (only PAST it is overdue)", () => {
    expect(dueStatus(task(), [entry()], '2026-07-15').state).toBe('due');
  });

  it(`'ok' exactly ${DUE_SOON_DAYS + 1} days before the due date`, () => {
    expect(dueStatus(task(), [entry()], '2026-06-14').state).toBe('ok');
  });

  it("'overdue' one day past the due date", () => {
    expect(dueStatus(task(), [entry()], '2026-07-16').state).toBe('overdue');
  });

  it("'overdue' with lastDone null when never done but interval exists", () => {
    expect(dueStatus(task(), [], '2026-08-01')).toEqual({
      lastDone: null,
      dueDate: null,
      state: 'overdue',
    });
  });

  it("'unscheduled' when intervalMonths is null (no due date ever)", () => {
    const s = dueStatus(
      task({ intervalMonths: null }),
      [entry({ entryDate: '2026-01-15' })],
      '2026-08-01',
    );
    expect(s).toEqual({ lastDone: '2026-01-15', dueDate: null, state: 'unscheduled' });
  });

  it("'unscheduled' wins even when never done (no interval → never late)", () => {
    expect(dueStatus(task({ intervalMonths: null }), [], '2026-08-01').state).toBe(
      'unscheduled',
    );
  });
});

describe('dueStatus — lastDone selection + standard-scoped matching', () => {
  it('picks the NEWEST matching entry, regardless of array order', () => {
    const s = dueStatus(
      task(),
      [
        entry({ entryDate: '2026-03-01' }),
        entry({ entryDate: '2026-05-01' }),
        entry({ entryDate: '2026-04-01' }),
      ],
      '2026-06-01',
    );
    expect(s.lastDone).toBe('2026-05-01');
    expect(s.dueDate).toBe('2026-11-01');
  });

  it('ignores entries of another category', () => {
    const s = dueStatus(
      task(),
      [entry({ category: 'begehung', entryDate: '2026-06-01' }), entry()],
      '2026-06-01',
    );
    expect(s.lastDone).toBe('2026-01-15');
  });

  it('ignores entries linked to a DIFFERENT standard', () => {
    const s = dueStatus(
      task(),
      [entry({ standardId: STD_B, entryDate: '2026-06-01' })],
      '2026-08-01',
    );
    expect(s).toEqual({ lastDone: null, dueDate: null, state: 'overdue' });
  });

  it('ignores entries WITHOUT a standard link (null never ticks a duty off)', () => {
    const s = dueStatus(
      task(),
      [entry({ standardId: null, entryDate: '2026-06-01' })],
      '2026-08-01',
    );
    expect(s.lastDone).toBeNull();
    expect(s.state).toBe('overdue');
  });

  it('uses the clamped due date from a month-end lastDone', () => {
    const s = dueStatus(
      task({ intervalMonths: 1 }),
      [entry({ entryDate: '2026-01-31' })],
      '2026-03-01',
    );
    expect(s.dueDate).toBe('2026-02-28');
    expect(s.state).toBe('overdue');
  });

  it('rejects a non-ISO today', () => {
    expect(() => dueStatus(task(), [], 'heute')).toThrow();
  });
});
