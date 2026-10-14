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

describe('twin pre-fill badge — cross-standard source (U-10)', () => {
  it('links to the SOURCE standard when the twin sits on another standard (820-2-11 ← DWA-M 820-1 M820-05)', () => {
    const f = { ...FIELD, id: 'fld-fcc', symbol: 'framework_conditions_clarified', labelDe: 'Rahmenbedingungen geklärt', unit: null, dataType: 'boolean' as const };
    initStore({ 'fld-fcc': { type: 'boolean', value: true } });
    render(
      <DynamicField
        field={f}
        locale="de"
        projectId="p1"
        standardCode="DWA-M-820-2"
        docs={[]}
        prefillSource="twin"
        twinSource={{ worksheetCode: 'M820-05', symbol: 'bedarfsplanung_projekt_complete', standardCode: 'DWA-M-820-1' }}
      />,
    );
    const badge = screen.getByTestId('twin-prefill-badge');
    expect(badge).toHaveTextContent('Vorbefüllt ← M820-05 · bedarfsplanung_projekt_complete');
    expect(badge.getAttribute('href')).toBe('/de/projects/p1/standards/DWA-M-820-1/worksheets/M820-05');
  });
});

describe('mapped twin hint (C-2, ruling R-17) — DWA-M 820-3 PZ 6.2-1 ← DWA-M 820-1 M820-05', () => {
  const PZ = {
    ...FIELD,
    id: 'fld-pz621',
    symbol: 'pz_62_1_status',
    labelDe: 'PZ 6.2-1',
    unit: null,
    dataType: 'enum' as const,
    isRequired: true,
    enumValues: [
      { value: 'erreicht', label_de: 'Erreicht', label_en: 'Met' },
      { value: 'teilweise_erreicht', label_de: 'Teilweise erreicht', label_en: 'Partially met' },
      { value: 'nicht_erreicht', label_de: 'Nicht erreicht', label_en: 'Not met' },
    ],
  };

  it('master Ja + own value differs: hint carries the mapped token and Übernehmen copies „erreicht"', () => {
    initStore({ 'fld-pz621': { type: 'enum', value: 'nicht_erreicht' } });
    render(
      <DynamicField field={PZ as never} locale="de" projectId="p1" standardCode="DWA-M-820-3" docs={[]}
        sameSymbolHints={[{ worksheetCode: 'M820-05', value: 'erreicht', viaSymbol: 'bedarfsplanung_projekt_complete' }]} />,
    );
    fireEvent.click(screen.getByText('Übernehmen'));
    expect((useWorksheetStore.getState().values['fld-pz621'] as { value: string }).value).toBe('erreicht');
  });

  it('master Nein: hint shows the answer and the choice note, without Übernehmen', () => {
    initStore({});
    const note = 'Nein in DWA-M 820-1 M820-05 → hier je nach Stand „Teilweise erreicht“ oder „Nicht erreicht“ wählen.';
    render(
      <DynamicField field={PZ as never} locale="de" projectId="p1" standardCode="DWA-M-820-3" docs={[]}
        sameSymbolHints={[{ worksheetCode: 'M820-05', value: false, viaSymbol: 'bedarfsplanung_projekt_complete', applicable: false, note }]} />,
    );
    const hint = screen.getByTestId('same-symbol-hint');
    expect(hint).toHaveTextContent('Bereits in M820-05 (als bedarfsplanung_projekt_complete): Nein');
    expect(hint).toHaveTextContent('Teilweise erreicht');
    expect(screen.queryByText('Übernehmen')).not.toBeInTheDocument();
    expect(useWorksheetStore.getState().pendingFieldIds.has('fld-pz621')).toBe(false);
  });
});

describe('C-2 fix round (review L-3, L-5c)', () => {
  const PZ = {
    ...FIELD,
    id: 'fld-pz621b',
    symbol: 'pz_62_1_status',
    labelDe: 'PZ 6.2-1',
    unit: null,
    dataType: 'enum' as const,
    enumValues: [
      { value: 'erreicht', label_de: 'Erreicht', label_en: 'Met' },
      { value: 'teilweise_erreicht', label_de: 'Teilweise erreicht', label_en: 'Partially met' },
    ],
  };
  const HINT = [{ worksheetCode: 'M820-05', value: 'erreicht', viaSymbol: 'bedarfsplanung_projekt_complete' }];

  it('L-5c: the mapped hint shows the option label „Erreicht“ (EN „Met“), not the token', () => {
    initStore({ 'fld-pz621b': { type: 'enum', value: 'teilweise_erreicht' } });
    const { unmount } = render(<DynamicField field={PZ as never} locale="de" projectId="p1" standardCode="DWA-M-820-3" docs={[]} sameSymbolHints={HINT} />);
    expect(screen.getByTestId('same-symbol-hint')).toHaveTextContent('Bereits in M820-05 (als bedarfsplanung_projekt_complete): Erreicht');
    unmount();
    render(<DynamicField field={PZ as never} locale="en" projectId="p1" standardCode="DWA-M-820-3" docs={[]} sameSymbolHints={HINT} />);
    expect(screen.getByTestId('same-symbol-hint')).toHaveTextContent('(as bedarfsplanung_projekt_complete): Met');
  });

  it('L-3: a read-only (locked) sheet shows the hint but no Übernehmen', () => {
    initStore({ 'fld-pz621b': { type: 'enum', value: 'teilweise_erreicht' } });
    render(<DynamicField field={PZ as never} locale="de" projectId="p1" standardCode="DWA-M-820-3" docs={[]} sameSymbolHints={HINT} readOnly />);
    expect(screen.getByTestId('same-symbol-hint')).toBeInTheDocument();
    expect(screen.queryByText('Übernehmen')).not.toBeInTheDocument();
  });

  it('L-3: „Alle Vorbefüllungen übernehmen“ is offered only on an editable sheet with prefills', async () => {
    const { offerAcceptAllPrefills } = await import('../same-symbol-hint');
    expect(offerAcceptAllPrefills(2, false)).toBe(true);
    expect(offerAcceptAllPrefills(2, true)).toBe(false);
    expect(offerAcceptAllPrefills(0, false)).toBe(false);
  });
});
