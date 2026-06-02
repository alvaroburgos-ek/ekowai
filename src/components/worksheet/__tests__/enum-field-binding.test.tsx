/**
 * Regression test for the contaminated_land_status non-functional-enum
 * bug — and for the underlying contract.
 *
 * BUG (Pile-9): the Pass3c importer left `fields.enum_values` NULL for
 * `contaminated_land_status` and 18 other enum fields. DynamicField does
 * `field.enumValues ?? []`; when NULL the SegmentedControl receives an
 * empty options array, renders zero buttons, and the engineer cannot
 * select a value. Pile-9 SQL populates the missing JSONB.
 *
 * CONTRACT TESTED HERE (independent of any specific field): given a
 * populated `enumValues` array, DynamicField renders one button per
 * option AND clicking a button writes the selected value into the
 * worksheet store. Given a null `enumValues`, the control renders no
 * buttons (and the field is therefore non-functional).
 *
 * The test uses the contamination_status fixture so a future regression
 * (e.g. another importer flattening the column to NULL) fails this
 * test with the original symptom.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
// DynamicField → CitationPicker → server actions in @/lib/actions/citations
// and @/lib/actions/documents → @/lib/db → src/env.ts (which validates env at
// import time). Stub the two server-action modules at the boundary so the
// db / env modules are never reached. The picker UI itself is not exercised
// by this test — we only care about the enum SegmentedControl.
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

const FIELD_ID = 'fixture-contaminated-land-status';
const SYMBOL = 'contaminated_land_status';

const POPULATED_ENUM = [
  { value: 'none', label_de: 'Keine', label_en: 'None' },
  { value: 'nearby', label_de: 'In der Nähe', label_en: 'Nearby' },
  { value: 'present', label_de: 'Vorhanden', label_en: 'Present' },
];

const FIELD_BASE = {
  id: FIELD_ID,
  symbol: SYMBOL,
  labelDe: 'Altlasten-Status',
  labelEn: 'Contaminated Land Status',
  unit: null,
  dataType: 'enum' as const,
  isRequired: true,
  validationRules: { raw: 'see Enum_Values: contamination_status' },
  clauseReference: '§5.1.2, BBodSchG',
  verificationStatus: 'verified_against_standard',
  description: 'None / Nearby / Present.',
};

function initStore() {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', {}, {}, {});
  });
}

function getStoredEnum(): string | null {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  if (v?.type !== 'enum') return null;
  return v.value;
}

beforeEach(() => initStore());

describe('contaminated_land_status — enum_values binding (Pile-9 regression)', () => {
  it('FIX — populated enum_values renders three selectable buttons (None / Nearby / Present)', () => {
    render(
      <DynamicField
        field={{ ...FIELD_BASE, enumValues: POPULATED_ENUM }}
        locale="en"
        projectId="fixture-project"
        docs={[]}
      />,
    );
    expect(screen.getByRole('button', { name: 'None' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nearby' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Present' })).toBeInTheDocument();
  });

  it('FIX — German locale picks the de labels', () => {
    render(
      <DynamicField
        field={{ ...FIELD_BASE, enumValues: POPULATED_ENUM }}
        locale="de"
        projectId="fixture-project"
        docs={[]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Keine' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In der Nähe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vorhanden' })).toBeInTheDocument();
  });

  it('FIX — clicking an option writes the value into the worksheet store', async () => {
    const user = userEvent.setup();
    render(
      <DynamicField
        field={{ ...FIELD_BASE, enumValues: POPULATED_ENUM }}
        locale="en"
        projectId="fixture-project"
        docs={[]}
      />,
    );
    expect(getStoredEnum()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Nearby' }));
    expect(getStoredEnum()).toBe('nearby');
    await user.click(screen.getByRole('button', { name: 'Present' }));
    expect(getStoredEnum()).toBe('present');
  });

  it('FIX — pressed-state moves to the clicked option', async () => {
    const user = userEvent.setup();
    render(
      <DynamicField
        field={{ ...FIELD_BASE, enumValues: POPULATED_ENUM }}
        locale="en"
        projectId="fixture-project"
        docs={[]}
      />,
    );
    const present = screen.getByRole('button', { name: 'Present' });
    await user.click(present);
    expect(present).toHaveAttribute('aria-pressed', 'true');
    const none = screen.getByRole('button', { name: 'None' });
    expect(none).toHaveAttribute('aria-pressed', 'false');
  });

  it('BUG REGRESSION — when enum_values is NULL the field renders ZERO option buttons', () => {
    // Exactly the broken pre-Pile-9 production state. The description text
    // "None / Nearby / Present." is still visible to the engineer, but no
    // button is rendered to select any of them.
    render(
      <DynamicField
        field={{ ...FIELD_BASE, enumValues: null }}
        locale="en"
        projectId="fixture-project"
        docs={[]}
      />,
    );
    expect(screen.queryByRole('button', { name: 'None' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nearby' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Present' })).not.toBeInTheDocument();
    // The description text is still in the DOM — this is the text the
    // engineer reported "seeing" in the preview, even though no control
    // existed below it.
    expect(screen.getByText('None / Nearby / Present.')).toBeInTheDocument();
  });

  it('BUG REGRESSION — null enum_values means store stays null even after click attempts', async () => {
    const user = userEvent.setup();
    render(
      <DynamicField
        field={{ ...FIELD_BASE, enumValues: null }}
        locale="en"
        projectId="fixture-project"
        docs={[]}
      />,
    );
    expect(getStoredEnum()).toBeNull();
    // No clickable target — confirm by counting all buttons inside the
    // field's radiogroup. With null enum_values there are zero buttons,
    // which is the exact failure mode the engineer reported.
    const radiogroup = screen.getByRole('radiogroup');
    expect(radiogroup.querySelectorAll('button')).toHaveLength(0);
    // Sanity: clicking the radiogroup container does nothing.
    await user.click(radiogroup);
    expect(getStoredEnum()).toBeNull();
  });
});
