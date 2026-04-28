import { describe, it, expect } from 'vitest';
import { ALL_WORKSHEETS } from './index';
import { parseWorksheet } from '@/lib/engine/schema';

describe('DWA-A-201 v3.1 worksheet bundle (imported from EKOWAI-Agent)', () => {
  it('bundle contains 22 worksheets', () => {
    expect(ALL_WORKSHEETS).toHaveLength(22);
  });

  it.each(ALL_WORKSHEETS.map((w) => [w.id, w]))(
    'worksheet %s parses against the contract',
    (_id, w) => {
      expect(() => parseWorksheet(w)).not.toThrow();
    },
  );

  it.each(ALL_WORKSHEETS.map((w) => [w.id, w]))(
    'worksheet %s — every threshold ref points to an existing field',
    (_id, w) => {
      const ids = new Set([
        ...w.inputs.map((f) => f.id),
        ...w.computed.map((f) => f.id),
      ]);
      for (const t of w.thresholds) {
        expect(ids.has(t.ref), `threshold ${t.id} → ${t.ref}`).toBe(true);
      }
    },
  );

  it.each(ALL_WORKSHEETS.map((w) => [w.id, w]))(
    'worksheet %s — every section field points to an existing field',
    (_id, w) => {
      const ids = new Set([
        ...w.inputs.map((f) => f.id),
        ...w.computed.map((f) => f.id),
      ]);
      for (const s of w.sections) {
        for (const f of s.fields) {
          expect(ids.has(f), `section ${s.id} → ${f}`).toBe(true);
        }
      }
    },
  );

  it('IDs are unique across the bundle', () => {
    const ids = ALL_WORKSHEETS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all worksheets are in preview status (until engineer-validated)', () => {
    for (const w of ALL_WORKSHEETS) {
      expect(w.status).toBe('preview');
    }
  });
});
