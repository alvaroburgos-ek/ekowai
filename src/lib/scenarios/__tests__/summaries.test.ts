// src/lib/scenarios/__tests__/summaries.test.ts
import { describe, it, expect } from 'vitest';
import { buildSummaries } from '../summaries';

const at = new Date('2026-10-14T10:00:00Z');
describe('buildSummaries', () => {
  it('maps slot, overrides and drift (real value moved away from base)', () => {
    const s = buildSummaries(
      [{ id: 's1', name: 'K5', reason: 'Feldversuch', sortOrder: 3, includeInReport: false, archivedAt: null, createdAt: at }],
      [{
        scenarioId: 's1', fieldId: 'f1', value: { type: 'number', value: 1e-5 }, baseValueAtCreation: { type: 'number', value: 1e-6 }, note: 'Annahme',
        symbol: 'k_f', labelDe: 'k_f', labelEn: null, unit: 'm/s', dataType: 'number', worksheetCode: 'A138-05', standardCode: 'DWA-A-138-1',
      }],
      new Map([['f1', { valueNumber: '2e-6', valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }]]),
    );
    expect(s[0]).toMatchObject({ id: 's1', slot: 3, createdAt: '2026-10-14T10:00:00.000Z', archivedAt: null });
    expect(s[0].overrides[0]).toMatchObject({ drift: true, currentReal: { type: 'number', value: 2e-6 }, baseValueAtCreation: { type: 'number', value: 1e-6 } });
  });
  it('no drift when the real value equals the base, also when both are empty', () => {
    const s = buildSummaries(
      [{ id: 's1', name: 'K', reason: null, sortOrder: 1, includeInReport: true, archivedAt: null, createdAt: at }],
      [
        { scenarioId: 's1', fieldId: 'f1', value: { type: 'number', value: 1 }, baseValueAtCreation: { type: 'number', value: 1e-6 }, note: 'n', symbol: 'k_f', labelDe: 'k_f', labelEn: null, unit: null, dataType: 'number', worksheetCode: 'A138-05', standardCode: 'S' },
        { scenarioId: 's1', fieldId: 'f2', value: { type: 'number', value: 1 }, baseValueAtCreation: null, note: 'n', symbol: 'x', labelDe: 'x', labelEn: null, unit: null, dataType: 'number', worksheetCode: 'A138-05', standardCode: 'S' },
      ],
      new Map([['f1', { valueNumber: '0.000001', valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null }]]),
    );
    expect(s[0].overrides.map((o) => o.drift)).toEqual([false, false]);
  });
});
