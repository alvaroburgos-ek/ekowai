/**
 * Regression: the "Vorgelagerte Werte" (inherited values) panel must render
 * the value of EVERY field type, not just number + json.
 *
 * The bug: the panel's inline display ternary handled only `number` and
 * `json`; text/enum/date/boolean fell through to "—". So a text inherited
 * symbol with a real saved value (e.g. kostra_grid_cell = "137089",
 * site_address = "Kempener Str 121") rendered as "—" even though the value
 * was present in the store — while number inherited symbols (site_lat,
 * site_lon, n, T_n) rendered fine. Display-only; the eval/gate read the true
 * store value regardless.
 */
import { describe, it, expect } from 'vitest';
import { formatInheritedValue } from '../format-inherited-value';

describe('formatInheritedValue — every field type renders its value', () => {
  it('renders a TEXT value (the bug: was "—")', () => {
    expect(formatInheritedValue({ type: 'text', value: '137089' }, null)).toBe('137089');
    expect(formatInheritedValue({ type: 'text', value: 'Kempener Str 121, 5' }, null)).toBe(
      'Kempener Str 121, 5',
    );
  });

  it('renders an ENUM value', () => {
    expect(formatInheritedValue({ type: 'enum', value: 'BK_I' }, null)).toBe('BK_I');
  });

  it('renders a DATE value', () => {
    expect(formatInheritedValue({ type: 'date', value: '2026-06-04' }, null)).toBe('2026-06-04');
  });

  it('renders a BOOLEAN value', () => {
    expect(formatInheritedValue({ type: 'boolean', value: true }, null)).toBe('Ja');
    expect(formatInheritedValue({ type: 'boolean', value: false }, null)).toBe('Nein');
  });

  it('still formats NUMBER values (de-DE, ≤4 fraction digits) with unit', () => {
    expect(formatInheritedValue({ type: 'number', value: 0.2 }, null)).toBe('0,2');
    expect(formatInheritedValue({ type: 'number', value: 5 }, 'a')).toBe('5 a');
    // 51.0788297 → "51,0788"
    expect(formatInheritedValue({ type: 'number', value: 51.0788297 }, null)).toBe('51,0788');
  });

  it('still shows (Tabelle) for json carriers', () => {
    expect(formatInheritedValue({ type: 'json', value: { rows: [] } }, null)).toBe('(Tabelle)');
  });

  it('shows "—" only for genuinely empty values', () => {
    expect(formatInheritedValue(undefined, null)).toBe('—');
    expect(formatInheritedValue({ type: 'text', value: null }, null)).toBe('—');
    expect(formatInheritedValue({ type: 'text', value: '' }, null)).toBe('—');
    expect(formatInheritedValue({ type: 'number', value: null }, null)).toBe('—');
  });
});
