import { describe, it, expect } from 'vitest';
import { resolveSelectedTable, type RainfallCarrier, RETURN_PERIODS } from '../rainfall-tables';

// Updated fixture to 2D grid row shape (r:{} + columns) — test intent is unchanged:
// resolveSelectedTable picks by id or falls back to primary.
const CARRIER: RainfallCarrier = {
  tables: [
    { id: 'k1', name: 'KOSTRA', source: 'KOSTRA-DWD-2020', columns: [...RETURN_PERIODS], rows: [{ D_min: 10, r: {} }] },
    { id: 'l1', name: 'Lokal 531', source: 'DWA-A-531-local', columns: [...RETURN_PERIODS], rows: [{ D_min: 10, r: {} }] },
  ],
};

describe('resolveSelectedTable', () => {
  it('returns the table matching the ref', () => {
    expect(resolveSelectedTable(CARRIER, 'l1')?.id).toBe('l1');
  });
  it('defaults to the primary (first) table when ref is null/unset', () => {
    expect(resolveSelectedTable(CARRIER, null)?.id).toBe('k1');
  });
  it('defaults to the primary table when ref is stale (no match)', () => {
    expect(resolveSelectedTable(CARRIER, 'gone')?.id).toBe('k1');
  });
  it('returns null when there are no tables', () => {
    expect(resolveSelectedTable({ tables: [] }, 'k1')).toBeNull();
  });
});
