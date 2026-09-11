/**
 * Monitoring-Journal unit tests (interim — documentation-only precursor to
 * roadmap Stage 8).
 *
 * Covers the pure validation core `parseAddMonitoringEntry` (category enum,
 * date shape, note bounds, optional documentId). The DB-bound actions
 * (`addMonitoringEntry` / `deleteMonitoringEntry` / `listMonitoringEntries`)
 * mirror the effort pattern and are exercised through the app, following the
 * finalize-gate pure/DB split.
 */
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  parseAddMonitoringEntry,
  MONITORING_CATEGORIES,
  MONITORING_CATEGORY_LABELS,
  NOTE_MAX,
  durationMinutes,
  formatDurationMinutes,
  timeRangeLabel,
  buildEffortFromJournal,
} from '../monitoring-core';

const valid = (over: Partial<{
  projectId: string; entryDate: string; category: string; note?: string; documentId?: string;
  standardId?: string; startTime?: string; endTime?: string; logAsEffort?: boolean;
}> = {}) => ({
  projectId: '11111111-2222-4333-8444-555555555555',
  entryDate: '2026-08-01',
  category: 'laborbericht',
  ...over,
});

describe('parseAddMonitoringEntry — category enum', () => {
  it('accepts each of the seven categories', () => {
    for (const c of MONITORING_CATEGORIES) {
      expect(parseAddMonitoringEntry(valid({ category: c })).category).toBe(c);
    }
    expect(MONITORING_CATEGORIES).toHaveLength(7);
  });

  it("includes 'dokumentation' with a German label", () => {
    expect(MONITORING_CATEGORIES).toContain('dokumentation');
    expect(MONITORING_CATEGORY_LABELS['dokumentation' as never]).toBe('Dokumentation');
  });

  it('rejects an unknown category', () => {
    expect(() => parseAddMonitoringEntry(valid({ category: 'probenahme' }))).toThrow(ZodError);
  });

  it('rejects a German display label as a value (labels are UI-only)', () => {
    expect(() => parseAddMonitoringEntry(valid({ category: 'Laborbericht' }))).toThrow(ZodError);
  });

  it('rejects an empty category', () => {
    expect(() => parseAddMonitoringEntry(valid({ category: '' }))).toThrow(ZodError);
  });

  it('has a German label for every category', () => {
    for (const c of MONITORING_CATEGORIES) {
      expect(MONITORING_CATEGORY_LABELS[c]).toBeTruthy();
    }
  });
});

describe('parseAddMonitoringEntry — date', () => {
  it('accepts a yyyy-mm-dd date', () => {
    expect(parseAddMonitoringEntry(valid({ entryDate: '2026-01-31' })).entryDate)
      .toBe('2026-01-31');
  });

  it('rejects an entryDate that is not yyyy-mm-dd', () => {
    expect(() => parseAddMonitoringEntry(valid({ entryDate: '01.08.2026' }))).toThrow(ZodError);
    expect(() => parseAddMonitoringEntry(valid({ entryDate: '2026-8-1' }))).toThrow(ZodError);
  });

  it('rejects an unparseable date even in the right shape', () => {
    expect(() => parseAddMonitoringEntry(valid({ entryDate: '2026-99-99' }))).toThrow(ZodError);
  });
});

describe('parseAddMonitoringEntry — note bounds', () => {
  it('note is optional', () => {
    expect(parseAddMonitoringEntry(valid()).note).toBeUndefined();
  });

  it('trims the note', () => {
    expect(parseAddMonitoringEntry(valid({ note: '  Probenahme Zulauf  ' })).note)
      .toBe('Probenahme Zulauf');
  });

  it('accepts a note of exactly NOTE_MAX characters', () => {
    const note = 'x'.repeat(NOTE_MAX);
    expect(parseAddMonitoringEntry(valid({ note })).note).toBe(note);
    expect(NOTE_MAX).toBe(2000);
  });

  it('rejects a note longer than NOTE_MAX', () => {
    expect(() =>
      parseAddMonitoringEntry(valid({ note: 'x'.repeat(NOTE_MAX + 1) })),
    ).toThrow(ZodError);
  });
});

describe('parseAddMonitoringEntry — ids', () => {
  it('rejects a non-uuid projectId', () => {
    expect(() => parseAddMonitoringEntry(valid({ projectId: 'nope' }))).toThrow(ZodError);
  });

  it('documentId is optional', () => {
    expect(parseAddMonitoringEntry(valid()).documentId).toBeUndefined();
  });

  it('accepts a uuid documentId', () => {
    const documentId = '99999999-8888-4777-a666-555555555555';
    expect(parseAddMonitoringEntry(valid({ documentId })).documentId).toBe(documentId);
  });

  it('rejects a non-uuid documentId', () => {
    expect(() => parseAddMonitoringEntry(valid({ documentId: 'not-a-uuid' }))).toThrow(ZodError);
  });

  it('standardId is optional (guideline link)', () => {
    expect(parseAddMonitoringEntry(valid()).standardId).toBeUndefined();
  });

  it('accepts a uuid standardId', () => {
    const standardId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    expect(parseAddMonitoringEntry(valid({ standardId })).standardId).toBe(standardId);
  });

  it('rejects a non-uuid standardId (a standard CODE is not accepted)', () => {
    expect(() => parseAddMonitoringEntry(valid({ standardId: 'DWA-A-138' }))).toThrow(ZodError);
    expect(() => parseAddMonitoringEntry(valid({ standardId: '' }))).toThrow(ZodError);
  });

  it('rejects missing required keys', () => {
    const { category: _category, ...withoutCategory } = valid();
    expect(() => parseAddMonitoringEntry(withoutCategory)).toThrow(ZodError);
  });
});

describe('parseAddMonitoringEntry — start/end time', () => {
  it('both times are optional (documentation-only entry)', () => {
    const p = parseAddMonitoringEntry(valid());
    expect(p.startTime).toBeUndefined();
    expect(p.endTime).toBeUndefined();
  });

  it('accepts HH:MM times and keeps them', () => {
    const p = parseAddMonitoringEntry(valid({ startTime: '08:30', endTime: '10:45' }));
    expect(p.startTime).toBe('08:30');
    expect(p.endTime).toBe('10:45');
  });

  it('accepts a start time without an end time (open-ended activity)', () => {
    const p = parseAddMonitoringEntry(valid({ startTime: '14:00' }));
    expect(p.startTime).toBe('14:00');
    expect(p.endTime).toBeUndefined();
  });

  it('rejects an end time without a start time', () => {
    expect(() => parseAddMonitoringEntry(valid({ endTime: '16:00' }))).toThrow(ZodError);
  });

  it('rejects malformed times', () => {
    for (const t of ['8:30', '24:00', '10:60', '1030', '10:3', '']) {
      expect(() => parseAddMonitoringEntry(valid({ startTime: t, endTime: '23:59' })))
        .toThrow(ZodError);
    }
  });

  it('rejects end before start and end equal to start', () => {
    expect(() =>
      parseAddMonitoringEntry(valid({ startTime: '10:00', endTime: '09:59' })),
    ).toThrow(ZodError);
    expect(() =>
      parseAddMonitoringEntry(valid({ startTime: '10:00', endTime: '10:00' })),
    ).toThrow(ZodError);
  });
});

describe('parseAddMonitoringEntry — logAsEffort toggle', () => {
  it('defaults to absent', () => {
    expect(parseAddMonitoringEntry(valid()).logAsEffort).toBeUndefined();
  });

  it('accepts true only when both times are set', () => {
    const p = parseAddMonitoringEntry(
      valid({ startTime: '08:00', endTime: '10:00', logAsEffort: true }),
    );
    expect(p.logAsEffort).toBe(true);
  });

  it('rejects true without a complete time range', () => {
    expect(() => parseAddMonitoringEntry(valid({ logAsEffort: true }))).toThrow(ZodError);
    expect(() =>
      parseAddMonitoringEntry(valid({ startTime: '08:00', logAsEffort: true })),
    ).toThrow(ZodError);
  });
});

describe('timeRangeLabel', () => {
  it('renders range + duration, accepting Postgres HH:MM:SS values', () => {
    expect(timeRangeLabel('14:00:00', '16:15:00')).toBe('14:00–16:15 · 2 h 15 min');
    expect(timeRangeLabel('14:00', '16:15')).toBe('14:00–16:15 · 2 h 15 min');
  });

  it('renders an open-ended start and null for untimed entries', () => {
    expect(timeRangeLabel('14:00:00', null)).toBe('ab 14:00');
    expect(timeRangeLabel(null, null)).toBeNull();
  });
});

describe('durationMinutes / formatDurationMinutes', () => {
  it('computes the minutes between two HH:MM times', () => {
    expect(durationMinutes('08:30', '10:45')).toBe(135);
    expect(durationMinutes('00:00', '23:59')).toBe(1439);
  });

  it('formats German duration labels', () => {
    expect(formatDurationMinutes(135)).toBe('2 h 15 min');
    expect(formatDurationMinutes(60)).toBe('1 h');
    expect(formatDurationMinutes(45)).toBe('45 min');
  });
});

describe('buildEffortFromJournal', () => {
  it('maps a timed entry onto an effort payload (hours from the duration)', () => {
    const parsed = parseAddMonitoringEntry(
      valid({
        category: 'begehung',
        startTime: '14:00',
        endTime: '16:15',
        note: 'Baustelle Nordufer',
        logAsEffort: true,
      }),
    );
    expect(buildEffortFromJournal(parsed)).toEqual({
      projectId: parsed.projectId,
      workDate: '2026-08-01',
      hours: 2.25,
      position: 'Journal: Begehung',
      note: 'Baustelle Nordufer',
    });
  });

  it('rounds hours to two decimals', () => {
    const parsed = parseAddMonitoringEntry(
      valid({ startTime: '08:00', endTime: '08:50', logAsEffort: true }),
    );
    expect(buildEffortFromJournal(parsed)?.hours).toBe(0.83);
  });

  it('returns null when the entry has no complete time range', () => {
    expect(buildEffortFromJournal(parseAddMonitoringEntry(valid()))).toBeNull();
    expect(
      buildEffortFromJournal(parseAddMonitoringEntry(valid({ startTime: '09:00' }))),
    ).toBeNull();
  });
});
