import { describe, it, expect } from 'vitest';
import {
  normalizeSurfaceCarrier,
  rowKind,
  rowComplete,
  rowMismatch,
  type SurfaceRow,
} from '../surface-inventory';

const byLabel = (rows: SurfaceRow[], label: string) =>
  rows.find((r) => r.label === label)!;

describe('normalizeSurfaceCarrier — migration', () => {
  it('maps old asphalt → schwarzdecke_asphalt, clean and complete (c_i preserved)', () => {
    const { rows } = normalizeSurfaceCarrier({
      rows: [{ id: 'a', label: 'Parkplatz', surface_type: 'asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0 }],
    });
    const r = byLabel(rows, 'Parkplatz');
    expect(r.tab9_value).toBe('schwarzdecke_asphalt');
    expect(r.c_i).toBe(0.9);
    expect(r.c_s).toBe(1.0);
    expect(r.coeff_override).toBe(false);
    expect(rowComplete(r)).toBe(true);
    expect(rowKind(r)).toBe('paved');
  });

  it('maps old rasen → park_flach and backfills a null c_s from Tab. 9 (0.2)', () => {
    const { rows } = normalizeSurfaceCarrier({
      rows: [{ id: 't', label: 'Testfläche', surface_type: 'rasen', area_m2: 100, c_i: 0.1, c_s: null }],
    });
    const r = byLabel(rows, 'Testfläche');
    expect(r.tab9_value).toBe('park_flach');
    expect(r.c_i).toBe(0.1);
    expect(r.c_s).toBe(0.2);
    expect(r.coeff_override).toBe(false);
    expect(rowComplete(r)).toBe(true);
    expect(rowKind(r)).toBe('unpaved');
  });

  it('drops an unmapped/ambiguous old type (dach 0.9/1.0) to reselection, preserving c_i/c_s', () => {
    const { rows } = normalizeSurfaceCarrier({
      rows: [{ id: 'g', label: 'Gewächshausdach', surface_type: 'dach', area_m2: 3786.8, c_i: 0.9, c_s: 1.0 }],
    });
    const r = byLabel(rows, 'Gewächshausdach');
    expect(r.tab9_value).toBeNull();   // 0.9/1.0 matches >1 entry ⇒ ambiguous ⇒ no auto-map
    expect(r.c_i).toBe(0.9);            // never silently changed
    expect(r.c_s).toBe(1.0);
    expect(rowComplete(r)).toBe(false); // tab9_value null ⇒ not complete
    expect(rowKind(r)).toBeNull();
  });

  it('auto-maps an old row whose (c_i,c_s) UNIQUELY matches one entry (0.8/0.8 → dach_flach_kies)', () => {
    const { rows } = normalizeSurfaceCarrier({
      rows: [{ id: 'k', label: 'Kiesdach', surface_type: 'sonstige', area_m2: 50, c_i: 0.8, c_s: 0.8 }],
    });
    const r = byLabel(rows, 'Kiesdach');
    expect(r.tab9_value).toBe('dach_flach_kies');
    expect(r.coeff_override).toBe(false);
  });

  it('flags a mapped row whose stored c_i differs from Tab. 9 as override (keeps stored c_i)', () => {
    const { rows } = normalizeSurfaceCarrier({
      rows: [{ id: 'o', label: 'Sonder-Asphalt', surface_type: 'asphalt', area_m2: 10, c_i: 0.85, c_s: 1.0 }],
    });
    const r = byLabel(rows, 'Sonder-Asphalt');
    expect(r.tab9_value).toBe('schwarzdecke_asphalt');
    expect(r.c_i).toBe(0.85);          // stored value preserved
    expect(r.coeff_override).toBe(true);
    expect(rowMismatch(r)).toBe(true);
  });

  it('passes already-new rows through unchanged (idempotent)', () => {
    const input = {
      rows: [{ id: 'n', label: 'Neu', tab9_value: 'park_flach', area_m2: 100, c_i: 0.1, c_s: 0.2, coeff_override: false }],
    };
    const once = normalizeSurfaceCarrier(input);
    const twice = normalizeSurfaceCarrier(once);
    expect(twice).toEqual(once);
    expect(once.rows[0]).toMatchObject({ tab9_value: 'park_flach', c_i: 0.1, c_s: 0.2, coeff_override: false });
  });

  it('returns an empty carrier for junk input', () => {
    expect(normalizeSurfaceCarrier(null)).toEqual({ rows: [] });
    expect(normalizeSurfaceCarrier({ nope: 1 })).toEqual({ rows: [] });
  });
});
