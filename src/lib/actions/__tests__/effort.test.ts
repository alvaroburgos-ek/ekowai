/**
 * Effort-logging unit tests (roadmap v2 §2.9).
 *
 * Covers the pure validation core `parseAddEffortEntry` (hours bounds, zod
 * shapes) + the `computeTotalHours` aggregation. The DB-bound actions
 * (`addEffortEntry` / `deleteEffortEntry` / `listEffortEntries`) mirror the
 * co2-lines pattern and are exercised through the app, following the
 * finalize-gate pure/DB split.
 */
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  parseAddEffortEntry,
  computeTotalHours,
  hoursFromRange,
  HOURS_MAX,
} from '../effort-core';

describe('hoursFromRange — decimal hours from a HH:MM time range', () => {
  it('computes hours rounded to two decimals', () => {
    expect(hoursFromRange('14:00', '16:15')).toBe(2.25);
    expect(hoursFromRange('08:00', '08:50')).toBe(0.83);
    expect(hoursFromRange('09:00', '09:01')).toBe(0.02);
  });

  it('stays within the per-entry bounds for a full day', () => {
    expect(hoursFromRange('00:00', '23:59')).toBeLessThanOrEqual(HOURS_MAX);
    expect(hoursFromRange('00:00', '23:59')).toBe(23.98);
  });
});

const valid = (over: Partial<{
  projectId: string; workDate: string; hours: number; position: string; note?: string;
}> = {}) => ({
  projectId: '11111111-2222-4333-8444-555555555555',
  workDate: '2026-08-01',
  hours: 2.5,
  position: 'Versickerungsnachweis DWA-A 138',
  ...over,
});

describe('parseAddEffortEntry — hours bounds', () => {
  it('accepts hours strictly between 0 and 24', () => {
    expect(parseAddEffortEntry(valid({ hours: 0.25 })).hours).toBe(0.25);
    expect(parseAddEffortEntry(valid({ hours: 8 })).hours).toBe(8);
  });

  it('accepts exactly 24 hours (inclusive upper bound)', () => {
    expect(parseAddEffortEntry(valid({ hours: 24 })).hours).toBe(24);
    expect(HOURS_MAX).toBe(24);
  });

  it('rejects 0 hours (bound is exclusive)', () => {
    expect(() => parseAddEffortEntry(valid({ hours: 0 }))).toThrow(ZodError);
  });

  it('rejects negative hours', () => {
    expect(() => parseAddEffortEntry(valid({ hours: -1 }))).toThrow(ZodError);
  });

  it('rejects more than 24 hours', () => {
    expect(() => parseAddEffortEntry(valid({ hours: 24.5 }))).toThrow(ZodError);
  });

  it('rejects non-finite hours', () => {
    expect(() => parseAddEffortEntry(valid({ hours: Number.NaN }))).toThrow(ZodError);
    expect(() => parseAddEffortEntry(valid({ hours: Number.POSITIVE_INFINITY }))).toThrow(ZodError);
  });

  it('rejects hours passed as a string (no coercion)', () => {
    expect(() =>
      parseAddEffortEntry({ ...valid(), hours: '8' as unknown as number }),
    ).toThrow(ZodError);
  });
});

describe('parseAddEffortEntry — zod shapes', () => {
  it('parses a full valid payload (note optional, trimmed)', () => {
    const r = parseAddEffortEntry(valid({ note: '  Ortstermin  ' }));
    expect(r).toEqual({
      projectId: '11111111-2222-4333-8444-555555555555',
      workDate: '2026-08-01',
      hours: 2.5,
      position: 'Versickerungsnachweis DWA-A 138',
      note: 'Ortstermin',
    });
  });

  it('note is optional', () => {
    expect(parseAddEffortEntry(valid()).note).toBeUndefined();
  });

  it('rejects a non-uuid projectId', () => {
    expect(() => parseAddEffortEntry(valid({ projectId: 'nope' }))).toThrow(ZodError);
  });

  it('rejects a workDate that is not yyyy-mm-dd', () => {
    expect(() => parseAddEffortEntry(valid({ workDate: '01.08.2026' }))).toThrow(ZodError);
    expect(() => parseAddEffortEntry(valid({ workDate: '2026-8-1' }))).toThrow(ZodError);
  });

  it('rejects an unparseable date even in the right shape', () => {
    expect(() => parseAddEffortEntry(valid({ workDate: '2026-99-99' }))).toThrow(ZodError);
  });

  it('rejects an empty or whitespace-only position', () => {
    expect(() => parseAddEffortEntry(valid({ position: '' }))).toThrow(ZodError);
    expect(() => parseAddEffortEntry(valid({ position: '   ' }))).toThrow(ZodError);
  });

  it('trims position', () => {
    expect(parseAddEffortEntry(valid({ position: '  Beratung  ' })).position).toBe('Beratung');
  });

  it('rejects missing required keys', () => {
    const { hours: _hours, ...withoutHours } = valid();
    expect(() => parseAddEffortEntry(withoutHours)).toThrow(ZodError);
  });

  it('accepts an optional roleId uuid (role-based rates)', () => {
    const roleId = '99999999-8888-4777-8666-555555555555';
    expect(
      parseAddEffortEntry({ ...valid(), roleId }).roleId,
    ).toBe(roleId);
    expect(parseAddEffortEntry(valid()).roleId).toBeUndefined();
  });

  it('rejects a non-uuid roleId', () => {
    expect(() =>
      parseAddEffortEntry({ ...valid(), roleId: 'ingenieur' }),
    ).toThrow(ZodError);
  });
});

describe('computeTotalHours', () => {
  it('sums numeric-column strings the way Drizzle returns them', () => {
    expect(computeTotalHours([{ hours: '2.5' }, { hours: '1.25' }, { hours: '8' }]))
      .toBeCloseTo(11.75);
  });

  it('accepts plain numbers too', () => {
    expect(computeTotalHours([{ hours: 2 }, { hours: '3' }])).toBe(5);
  });

  it('returns 0 for an empty list', () => {
    expect(computeTotalHours([])).toBe(0);
  });

  it('counts unparseable values as 0 instead of poisoning the total', () => {
    expect(computeTotalHours([{ hours: 'kaputt' }, { hours: '4' }])).toBe(4);
  });
});
