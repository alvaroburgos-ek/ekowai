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
} from '../monitoring-core';

const valid = (over: Partial<{
  projectId: string; entryDate: string; category: string; note?: string; documentId?: string;
  standardId?: string;
}> = {}) => ({
  projectId: '11111111-2222-4333-8444-555555555555',
  entryDate: '2026-08-01',
  category: 'laborbericht',
  ...over,
});

describe('parseAddMonitoringEntry — category enum', () => {
  it('accepts each of the six categories', () => {
    for (const c of MONITORING_CATEGORIES) {
      expect(parseAddMonitoringEntry(valid({ category: c })).category).toBe(c);
    }
    expect(MONITORING_CATEGORIES).toHaveLength(6);
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
