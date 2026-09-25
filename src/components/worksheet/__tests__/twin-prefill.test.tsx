/**
 * Twin pre-fill (TWIN_SYMBOLS): the field badge, the "Bereits in … (als X)"
 * hint with Übernehmen, and the "Alle Vorbefüllungen übernehmen" derivation
 * (render-only values become pending → persisted on the next autosave).
 * WorksheetForm itself is not rendered here (see worksheet-form-lock.test.tsx
 * for why); the bar's logic is exercised against the store directly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('@/lib/actions/citations', () => ({
  addCitation: vi.fn(async () => ({ ok: true })),
  removeCitation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/documents', () => ({
  uploadDocument: vi.fn(async () => ({ ok: true, id: 'fixture-doc' })),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { render, screen, act, fireEvent } from '@testing-library/react';
import { DynamicField } from '../dynamic-field';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const FIELD_ID = 'fld-A_C_final';
const FIELD = {
  id: FIELD_ID,
  symbol: 'A_C_final',
  labelDe: 'Bemessungswert A_C (final)',
  labelEn: null,
  unit: 'm²',
  dataType: 'number' as const,
  isRequired: true,
  enumValues: null,
  validationRules: null,
  clauseReference: '§5.3.3.5, §6',
  verificationStatus: 'imported_unverified',
  description: null,
};

function initStore(initial: Record<string, unknown> = {}) {
  act(() => {
    useWorksheetStore.getState().init('inst-twin', initial as never, {}, {});
  });
}

beforeEach(() => initStore());

describe('twin pre-fill badge', () => {
  it('shows "Vorbefüllt ← A138-07 · A_C" linking to the source worksheet while untouched', () => {
    initStore({ [FIELD_ID]: { type: 'number', value: 162.2 } });
    render(
      <DynamicField
        field={FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        prefillSource="twin"
        twinSource={{ worksheetCode: 'A138-07', symbol: 'A_C' }}
      />,
    );
    const badge = screen.getByTestId('twin-prefill-badge');
    expect(badge).toHaveTextContent('Vorbefüllt ← A138-07 · A_C');
    expect(badge.getAttribute('href')).toBe('/de/projects/p1/standards/DWA-A-138-1/worksheets/A138-07');
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('162.2');
  });

  it('hides the badge once the engineer edits the field (dirty)', () => {
    initStore({ [FIELD_ID]: { type: 'number', value: 162.2 } });
    render(
      <DynamicField field={FIELD} locale="de" projectId="p1" standardCode="DWA-A-138-1" docs={[]} prefillSource="twin" twinSource={{ worksheetCode: 'A138-07', symbol: 'A_C' }} />,
    );
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '160' } });
    expect(screen.queryByTestId('twin-prefill-badge')).not.toBeInTheDocument();
  });
});

describe('twin hint with Übernehmen (local value differs from the upstream twin)', () => {
  it('names the source symbol and copies the upstream value into the store', () => {
    initStore({ [FIELD_ID]: { type: 'number', value: 160 } });
    render(
      <DynamicField
        field={FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        sameSymbolHints={[{ worksheetCode: 'A138-07', value: 162.2, viaSymbol: 'A_C' }]}
      />,
    );
    expect(screen.getByText(/Bereits in A138-07 \(als A_C\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Übernehmen'));
    const v = useWorksheetStore.getState().values[FIELD_ID] as { value: number };
    expect(v.value).toBe(162.2);
    expect(useWorksheetStore.getState().pendingFieldIds.has(FIELD_ID)).toBe(true);
  });
});

describe('"Alle Vorbefüllungen übernehmen" derivation', () => {
  it('a render-only twin value is not pending; accepting marks it pending with the same value', () => {
    initStore({ [FIELD_ID]: { type: 'number', value: 162.2 }, 'fld-other': { type: 'number', value: 1 } });
    const twinSourceByFieldId = { [FIELD_ID]: { worksheetCode: 'A138-07', symbol: 'A_C' } };
    const st = useWorksheetStore.getState();
    const candidates = Object.keys(twinSourceByFieldId).filter((id) => st.values[id] != null && !st.pendingFieldIds.has(id));
    expect(candidates).toEqual([FIELD_ID]);
    act(() => { for (const id of candidates) st.setField(id, st.values[id]); });
    const after = useWorksheetStore.getState();
    expect(after.pendingFieldIds.has(FIELD_ID)).toBe(true);
    expect(after.pendingFieldIds.has('fld-other')).toBe(false);
    expect((after.values[FIELD_ID] as { value: number }).value).toBe(162.2);
  });
});
