import { describe, it, expect } from 'vitest';
import { A201_08 } from './index';
import { parseWorksheet } from '@/lib/engine/schema';

describe('DWA-A-201 v3.2 worksheet bundle', () => {
  it('A201-08 parses against the contract', () => {
    expect(() => parseWorksheet(A201_08)).not.toThrow();
  });

  it('every threshold ref points to an existing input or computed field', () => {
    const ids = new Set([
      ...A201_08.inputs.map((f) => f.id),
      ...A201_08.computed.map((f) => f.id),
    ]);
    for (const t of A201_08.thresholds) {
      expect(ids.has(t.ref), `threshold ${t.id} → ${t.ref}`).toBe(true);
    }
  });

  it('every section field points to an existing input or computed field', () => {
    const ids = new Set([
      ...A201_08.inputs.map((f) => f.id),
      ...A201_08.computed.map((f) => f.id),
    ]);
    for (const s of A201_08.sections) {
      for (const f of s.fields) {
        expect(ids.has(f), `section ${s.id} → ${f}`).toBe(true);
      }
    }
  });
});
