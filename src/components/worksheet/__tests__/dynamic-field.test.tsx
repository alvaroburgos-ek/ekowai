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
