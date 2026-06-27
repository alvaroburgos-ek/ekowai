import { describe, it, expect } from 'vitest';
import { resolveSelectedTable, type RainfallCarrier } from '../rainfall-tables';

const CARRIER: RainfallCarrier = {
  tables: [
    { id: 'k1', name: 'KOSTRA', source: 'KOSTRA-DWD-2020', rows: [{ D_min: 10, r_D_n: 220 }] },
    { id: 'l1', name: 'Lokal 531', source: 'DWA-A-531-local', rows: [{ D_min: 10, r_D_n: 240 }] },
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
