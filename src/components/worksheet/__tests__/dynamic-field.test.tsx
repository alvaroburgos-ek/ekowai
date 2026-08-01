/**
 * Tests for DynamicField `readOnly` prop (Task 4 — worksheet write-lock UI).
 *
 * CONTRACT:
 * - When `readOnly` is true, all editable controls are read-only/disabled and
 *   changes do NOT write to the worksheet store.
 * - When `readOnly` is false (default), editing works normally.
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

import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DynamicField } from '../dynamic-field';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const FIELD_ID = 'fixture-number-field';

const NUMBER_FIELD = {
  id: FIELD_ID,
  symbol: 'test_number',
  labelDe: 'Testzahl',
  labelEn: 'Test Number',
  unit: null,
  dataType: 'number' as const,
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'engineer_verified',
  description: null,
};

function initStore(initial: Record<string, unknown> = {}) {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', initial as never, {}, {});
  });
}

function getStoredNumber(): number | null | undefined {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  if (!v || v.type !== 'number') return undefined;
  return v.value;
}

beforeEach(() => initStore());

describe('DynamicField — readOnly prop (worksheet write-lock)', () => {
  it('readOnly=true: number input has readOnly attribute', () => {
    render(
      <DynamicField
        field={NUMBER_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        readOnly
      />,
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('readonly');
  });

  it('readOnly=true: typing into number input does NOT call setField (store unchanged)', async () => {
    const user = userEvent.setup();
    render(
      <DynamicField
        field={NUMBER_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        readOnly
      />,
    );
    const input = screen.getByRole('spinbutton');
    await user.type(input, '42');
    // Store value must remain undefined (unchanged from init)
    expect(getStoredNumber()).toBeUndefined();
  });

  it('readOnly=false (default): typing into number input writes to store', async () => {
    const user = userEvent.setup();
    render(
      <DynamicField
        field={NUMBER_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
      />,
    );
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '99');
    expect(getStoredNumber()).toBe(99);
  });

  it('readOnly=true: text input is readOnly', () => {
    const textField = { ...NUMBER_FIELD, id: 'tf', symbol: 'txt', dataType: 'text' as const };
    initStore();
    render(
      <DynamicField
        field={textField}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        readOnly
      />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
  });

  it('readOnly=true: text input does NOT update store on type', async () => {
    const user = userEvent.setup();
    const textField = { ...NUMBER_FIELD, id: 'tf2', symbol: 'txt2', dataType: 'text' as const };
    initStore();
    render(
      <DynamicField
        field={textField}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        readOnly
      />,
    );
    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');
    const v = useWorksheetStore.getState().values['tf2'];
    expect(v).toBeUndefined();
  });
});

/**
 * CHECKLIST mode (options-as-selection tranche 2).
 *
 * CONTRACT:
 * - A json-typed field WITH populated enumValues renders one checkbox per
 *   option (multi-select checklist), sorted by order_index.
 * - Toggling stores the selection as a JSON string array (option values) via
 *   the store's json value path ({ type: 'json', value: string[] }).
 * - A json-typed field WITHOUT enumValues keeps the "Phase 2" placeholder.
 * - readOnly disables the checkboxes and blocks store writes.
 */
const CHECKLIST_FIELD_ID = 'fixture-json-checklist-field';

const CHECKLIST_FIELD = {
  ...NUMBER_FIELD,
  id: CHECKLIST_FIELD_ID,
  symbol: 'indikatorchemikalien_kat2',
  labelDe: 'Indikatorchemikalien Kategorie 2',
  dataType: 'json' as const,
  enumValues: [
    { value: 'gabapentin', label_de: 'Gabapentin', label_en: null, order_index: 3 },
    { value: 'benzotriazol', label_de: 'Benzotriazol', label_en: null, order_index: 1 },
    { value: 'candesartan', label_de: 'Candesartan', label_en: null, order_index: 4 },
  ],
};

function getStoredJson(): unknown {
  const v = useWorksheetStore.getState().values[CHECKLIST_FIELD_ID];
  if (!v || v.type !== 'json') return undefined;
  return v.value;
}

describe('DynamicField — json checklist (options-as-selection tranche 2)', () => {
  it('json field with enumValues renders one checkbox per option, sorted by order_index', () => {
    render(
      <DynamicField
        field={CHECKLIST_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-M-1200-1"
        docs={[]}
      />,
    );
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    // Sorted by order_index (1, 3, 4), not array order
    expect(screen.getByTestId('json-checklist').textContent).toMatch(
      /Benzotriazol[\s\S]*Gabapentin[\s\S]*Candesartan/,
    );
    // No "Phase 2" placeholder when options exist
    expect(screen.queryByText(/Phase 2/)).toBeNull();
  });

  it('json field WITHOUT enumValues keeps the disabled "Phase 2" placeholder', () => {
    render(
      <DynamicField
        field={{ ...CHECKLIST_FIELD, id: 'json-no-opts', enumValues: null }}
        locale="de"
        projectId="p1"
        standardCode="DWA-M-1200-1"
        docs={[]}
      />,
    );
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByText('Mehrzeilige Eingabe — Phase 2')).toBeInTheDocument();
  });

  it('pre-existing store array renders as checked boxes', () => {
    initStore({ [CHECKLIST_FIELD_ID]: { type: 'json', value: ['benzotriazol', 'candesartan'] } });
    render(
      <DynamicField
        field={CHECKLIST_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-M-1200-1"
        docs={[]}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Benzotriazol' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Gabapentin' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Candesartan' })).toBeChecked();
  });

  it('checking a box stores a JSON string array in the store', async () => {
    const user = userEvent.setup();
    render(
      <DynamicField
        field={CHECKLIST_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-M-1200-1"
        docs={[]}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Gabapentin' }));
    expect(getStoredJson()).toEqual(['gabapentin']);
    await user.click(screen.getByRole('checkbox', { name: 'Benzotriazol' }));
    // Stored in option order (order_index), not click order
    expect(getStoredJson()).toEqual(['benzotriazol', 'gabapentin']);
  });

  it('unchecking removes the value from the stored array', async () => {
    const user = userEvent.setup();
    initStore({ [CHECKLIST_FIELD_ID]: { type: 'json', value: ['benzotriazol', 'gabapentin'] } });
    render(
      <DynamicField
        field={CHECKLIST_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-M-1200-1"
        docs={[]}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Benzotriazol' }));
    expect(getStoredJson()).toEqual(['gabapentin']);
  });

  it('readOnly=true: checkboxes disabled and clicking does NOT write to store', async () => {
    const user = userEvent.setup();
    render(
      <DynamicField
        field={CHECKLIST_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-M-1200-1"
        docs={[]}
        readOnly
      />,
    );
    const box = screen.getByRole('checkbox', { name: 'Gabapentin' });
    expect(box).toBeDisabled();
    await user.click(box);
    expect(getStoredJson()).toBeUndefined();
  });
});
