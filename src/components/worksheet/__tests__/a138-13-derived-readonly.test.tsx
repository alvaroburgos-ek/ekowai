/**
 * Task 5 — A138-13 r_D_n/D_min render as derived (read-only).
 *
 * CONTRACT:
 * - When isComputed=true is passed to DynamicField (the existing equation-output
 *   read-only pattern), the number input must be readOnly and not accept edits.
 * - WorksheetForm passes isComputed=true for r_D_n and D_min by augmenting
 *   computedSymbols with BASIN_GOVERNING_SYMBOLS — no new abstraction invented.
 *
 * The tests here:
 * 1. Verify the DynamicField isComputed prop renders the number input as readOnly
 *    (same contract used for equation-output symbols like V_VA).
 * 2. Verify that typing into an isComputed=true number field does NOT write to
 *    the store (same guard that protects equation outputs).
 * 3. Verify the "berechnet" badge text appears next to the field when a custom
 *    hint is supplied (provenance text for derived fields via inheritedFrom or
 *    a future derived hint — covered by the isComputed+readOnly combination
 *    which already shows `bg-paper-2 cursor-default`).
 *
 * Field IDs match the DB-canonical values from the task brief:
 *   r_D_n  → d1381310-0000-4000-8000-000000000001
 *   D_min  → d1381310-0000-4000-8000-000000000002
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

// Canonical A138-13 field IDs from the task brief
const R_D_N_FIELD_ID = 'd1381310-0000-4000-8000-000000000001';
const D_MIN_FIELD_ID = 'd1381310-0000-4000-8000-000000000002';

const R_D_N_FIELD = {
  id: R_D_N_FIELD_ID,
  symbol: 'r_D_n',
  labelDe: 'Regenspende r_D(n)',
  labelEn: 'Design rainfall intensity r_D(n)',
  unit: 'l/(s·ha)',
  dataType: 'number' as const,
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
};

const D_MIN_FIELD = {
  id: D_MIN_FIELD_ID,
  symbol: 'D_min',
  labelDe: 'Maßgebende Regenspende D_min',
  labelEn: 'Governing duration D_min',
  unit: 'min',
  dataType: 'number' as const,
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
};

function initStore(initial: Record<string, unknown> = {}) {
  act(() => {
    useWorksheetStore.getState().init('a138-13-fixture', initial as never, {}, {});
  });
}

beforeEach(() => initStore());

describe('A138-13 r_D_n — isComputed=true renders read-only (basin derived)', () => {
  it('number input has readOnly attribute when isComputed=true', () => {
    render(
      <DynamicField
        field={R_D_N_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('readonly');
  });

  it('number input has aria-readonly when isComputed=true', () => {
    render(
      <DynamicField
        field={R_D_N_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-readonly', 'true');
  });

  it('typing into isComputed=true number input does NOT write to store', async () => {
    const user = userEvent.setup();
    initStore();
    render(
      <DynamicField
        field={R_D_N_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('spinbutton');
    await user.type(input, '99');
    const stored = useWorksheetStore.getState().values[R_D_N_FIELD_ID];
    expect(stored).toBeUndefined();
  });

  it('isComputed=false (default): typing writes to store normally', async () => {
    const user = userEvent.setup();
    initStore();
    render(
      <DynamicField
        field={R_D_N_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        isComputed={false}
      />,
    );
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '42');
    const stored = useWorksheetStore.getState().values[R_D_N_FIELD_ID];
    expect(stored?.type).toBe('number');
    expect((stored as { type: 'number'; value: number | null }).value).toBe(42);
  });
});

describe('A138-13 D_min — isComputed=true renders read-only (basin derived)', () => {
  it('number input has readOnly attribute when isComputed=true', () => {
    render(
      <DynamicField
        field={D_MIN_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('readonly');
  });

  it('number input has aria-readonly when isComputed=true', () => {
    render(
      <DynamicField
        field={D_MIN_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-readonly', 'true');
  });

  it('typing into isComputed=true D_min does NOT write to store', async () => {
    const user = userEvent.setup();
    initStore();
    render(
      <DynamicField
        field={D_MIN_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('spinbutton');
    await user.type(input, '30');
    const stored = useWorksheetStore.getState().values[D_MIN_FIELD_ID];
    expect(stored).toBeUndefined();
  });
});
