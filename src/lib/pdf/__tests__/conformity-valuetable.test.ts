import { describe, it, expect } from 'vitest';
import { decideConformity, APPROVED_STATUSES } from '../load-conformity';
import { buildValuetableRows } from '../load-valuetable';

describe('decideConformity', () => {
  const ws = (over: Partial<{ code: string; titleDe: string; status: string | null; failingBlockCodes: string[] }> = {}) => ({
    code: 'A138-01',
    titleDe: 'Anwendungsbereich',
    status: 'engineer_approved',
    failingBlockCodes: [] as string[],
    ...over,
  });

  it('eligible + konform when every worksheet is approved/final and no block gate fails', () => {
    const r = decideConformity([ws(), ws({ code: 'A138-02', status: 'final' })]);
    expect(r.eligible).toBe(true);
    expect(r.konform).toBe(true);
    expect(r.blocking).toHaveLength(0);
  });

  it('a draft worksheet makes it ineligible and is named', () => {
    const r = decideConformity([ws(), ws({ code: 'A138-03', status: 'draft' })]);
    expect(r.eligible).toBe(false);
    expect(r.konform).toBe(false);
    expect(r.blocking.join(' ')).toContain('A138-03');
  });

  it('a missing instance (never started) makes it ineligible', () => {
    const r = decideConformity([ws({ status: null })]);
    expect(r.eligible).toBe(false);
    expect(r.blocking.join(' ')).toMatch(/nicht begonnen/);
  });

  it('a failing block gate on an approved worksheet → eligible but NOT konform', () => {
    const r = decideConformity([ws({ failingBlockCodes: ['REQ-04'] })]);
    expect(r.eligible).toBe(true);
    expect(r.konform).toBe(false);
    expect(r.blocking.join(' ')).toContain('REQ-04');
  });

  it('APPROVED_STATUSES is exactly engineer_approved + final', () => {
    expect([...APPROVED_STATUSES].sort()).toEqual(['engineer_approved', 'final']);
  });
});

describe('buildValuetableRows', () => {
  const field = (over: Partial<{
    id: string; symbol: string; labelDe: string; unit: string | null;
    clauseReference: string | null; dataType: string; orderIndex: number;
    worksheetCode: string;
  }> = {}) => ({
    id: 'f1',
    symbol: 'k_f',
    labelDe: 'Durchlässigkeitsbeiwert',
    unit: 'm/s',
    clauseReference: '§5.2',
    dataType: 'number',
    orderIndex: 0,
    worksheetCode: 'A138-05',
    ...over,
  });

  it('emits one row per field with a saved value, formatted', () => {
    const rows = buildValuetableRows(
      [field(), field({ id: 'f2', symbol: 'A_s', labelDe: 'Sickerfläche', unit: 'm²', orderIndex: 1 })],
      new Map([
        ['f1', { valueNumber: '0.0005', valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }],
      ]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      symbol: 'k_f',
      labelDe: 'Durchlässigkeitsbeiwert',
      unit: 'm/s',
      clauseReference: '§5.2',
      worksheetCode: 'A138-05',
    });
    expect(rows[0].value).toContain('0,0005');
  });

  it('renders boolean and enum values readably', () => {
    const rows = buildValuetableRows(
      [
        field({ id: 'b1', symbol: 'ok', dataType: 'boolean', unit: null }),
        field({ id: 'e1', symbol: 'typ', dataType: 'enum', unit: null }),
      ],
      new Map([
        ['b1', { valueNumber: null, valueText: null, valueEnum: null, valueBoolean: true, valueDate: null, valueJson: null }],
        ['e1', { valueNumber: null, valueText: null, valueEnum: 'mulde', valueBoolean: null, valueDate: null, valueJson: null }],
      ]),
    );
    expect(rows.find((r) => r.symbol === 'ok')?.value).toBe('ja');
    expect(rows.find((r) => r.symbol === 'typ')?.value).toBe('mulde');
  });

  it('sorts by worksheet code then orderIndex', () => {
    const rows = buildValuetableRows(
      [
        field({ id: 'x', worksheetCode: 'B', orderIndex: 0, symbol: 's3' }),
        field({ id: 'y', worksheetCode: 'A', orderIndex: 1, symbol: 's2' }),
        field({ id: 'z', worksheetCode: 'A', orderIndex: 0, symbol: 's1' }),
      ],
      new Map([
        ['x', { valueNumber: '1', valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }],
        ['y', { valueNumber: '2', valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }],
        ['z', { valueNumber: '3', valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }],
      ]),
    );
    expect(rows.map((r) => r.symbol)).toEqual(['s1', 's2', 's3']);
  });

  it('skips json carriers (structured, not title-block values)', () => {
    const rows = buildValuetableRows(
      [field({ id: 'j1', dataType: 'json' })],
      new Map([
        ['j1', { valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: { rows: [1] } }],
      ]),
    );
    expect(rows).toHaveLength(0);
  });
});
