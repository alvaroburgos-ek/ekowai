/**
 * O-5 (UX follow-up 2026-10-14): the "Bereits in …" hint names every source sheet but shows each distinct value only
 * once. Seen on the Forscheln record: „Bereits in M8203-01, M820-01: PLT-HS-01, PLT-HS-01 Übernehmen".
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('@/lib/actions/citations', () => ({
  addCitation: vi.fn(async () => ({ ok: true })),
  removeCitation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/documents', () => ({ uploadDocument: vi.fn(async () => ({ ok: true, id: 'd' })) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { render, screen, act } from '@testing-library/react';
import { DynamicField } from '../dynamic-field';
import { groupSameSymbolHints } from '../same-symbol-hint';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const fmt = (v: unknown) => String(v);

describe('groupSameSymbolHints (pure)', () => {
  it('identical values: one group listing every sheet, the value once', () => {
    expect(
      groupSameSymbolHints(
        [{ worksheetCode: 'M8203-01', value: 'PLT-HS-01' }, { worksheetCode: 'M820-01', value: 'PLT-HS-01' }],
        fmt,
        'de',
      ),
    ).toEqual([{ sheets: ['M8203-01', 'M820-01'], value: 'PLT-HS-01' }]);
  });

  it('different values: one group per distinct value, first-seen order, sheets kept with their value', () => {
    expect(
      groupSameSymbolHints(
        [
          { worksheetCode: 'A', value: 1 },
          { worksheetCode: 'B', value: 2 },
          { worksheetCode: 'C', value: 1 },
        ],
        fmt,
        'de',
      ),
    ).toEqual([
      { sheets: ['A', 'C'], value: '1' },
      { sheets: ['B'], value: '2' },
    ]);
  });

  it('equality is on the DISPLAYED value; the twin alias stays on the sheet label', () => {
    expect(
      groupSameSymbolHints(
        [{ worksheetCode: 'A138-07', value: 162.2, viaSymbol: 'A_C' }, { worksheetCode: 'A138-08', value: 162.2 }],
        fmt,
        'de',
      ),
    ).toEqual([{ sheets: ['A138-07 (als A_C)', 'A138-08'], value: '162.2' }]);
    expect(groupSameSymbolHints([{ worksheetCode: 'A138-07', value: 1, viaSymbol: 'A_C' }], fmt, 'en')).toEqual([
      { sheets: ['A138-07 (as A_C)'], value: '1' },
    ]);
  });
});

const FIELD = {
  id: 'fld-plant', symbol: 'plant_id', labelDe: 'Anlagenkennung', labelEn: null, unit: null,
  dataType: 'text' as const, isRequired: false, enumValues: null, validationRules: null,
  clauseReference: null, verificationStatus: 'engineer_verified', description: null,
};

describe('DynamicField same-symbol hint (O-5)', () => {
  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('inst', { 'fld-plant': { type: 'text', value: 'X' } }, {}, {}); });
  });

  it('„Bereits in M8203-01, M820-01: PLT-HS-01" — the identical value is shown once', () => {
    render(
      <DynamicField
        field={FIELD} locale="de" projectId="p" standardCode="DWA-M-820-2" docs={[]}
        sameSymbolHints={[{ worksheetCode: 'M8203-01', value: 'PLT-HS-01' }, { worksheetCode: 'M820-01', value: 'PLT-HS-01' }]}
      />,
    );
    const hint = screen.getByTestId('same-symbol-hint');
    expect(hint.textContent).toBe('Bereits in M8203-01, M820-01: PLT-HS-01 Übernehmen');
  });

  it('distinct values stay listed, each with its sheets', () => {
    render(
      <DynamicField
        field={FIELD} locale="de" projectId="p" standardCode="DWA-M-820-2" docs={[]}
        sameSymbolHints={[{ worksheetCode: 'M8203-01', value: 'PLT-HS-01' }, { worksheetCode: 'M820-01', value: 'PLT-HS-02' }]}
      />,
    );
    expect(screen.getByTestId('same-symbol-hint').textContent).toBe('Bereits in M8203-01: PLT-HS-01; M820-01: PLT-HS-02 Übernehmen');
  });
});
