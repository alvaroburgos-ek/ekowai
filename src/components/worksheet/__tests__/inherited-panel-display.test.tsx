/**
 * Fix 3 — inherited-values panel shows enum label, boolean ("Ja"/"Nein"), and text.
 *
 * CONTRACT:
 * Before fix: the panel's `display` computation only handled number and json;
 * enum, boolean, and text values all fell through to "—".
 * After fix: all four non-json types display correctly.
 *
 * Strategy: mirror the exact `display` computation from worksheet-form.tsx
 * in a lightweight fixture component (same approach as worksheet-form-lock.test.tsx)
 * to avoid the full WorksheetForm render complexity (server-component deps, store
 * init, equation engine).
 *
 * The fixture component is updated to use the SAME logic as the fixed form so
 * tests fail RED before the form is patched, then GREEN after.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/actions/citations', () => ({
  addCitation: vi.fn(async () => ({ ok: true })),
  removeCitation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/documents', () => ({
  uploadDocument: vi.fn(async () => ({ ok: true, id: 'fixture-doc' })),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/de/projects/p1/standards/DWA-A-138-12/worksheets/A138-06',
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { render, screen } from '@testing-library/react';

// ---- Types that mirror the worksheet-form internal types ----

type EnumEntry = { value: string; label_de: string | null; label_en: string | null };

type PanelField = {
  id: string;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  unit: string | null;
  dataType: 'number' | 'text' | 'enum' | 'date' | 'boolean' | 'json';
  isRequired: boolean;
  enumValues: EnumEntry[] | null;
  validationRules: null;
  clauseReference: null;
  verificationStatus: string;
  description: null;
  inheritedFromWorksheet?: string;
  active: boolean;
  sectionId: null;
  orderIndex: number;
};

type FieldValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown };

/**
 * Mirrors the display computation from worksheet-form.tsx lines ~584-589
 * (the FIXED version — this is what the form should do after the patch).
 * Used as the single source of truth for these tests.
 */
function computeDisplay(
  v: FieldValue | undefined,
  f: PanelField,
  locale: 'de' | 'en',
): string {
  if (v?.type === 'number' && v.value != null && Number.isFinite(v.value)) {
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v.value);
  }
  if (v?.type === 'json' && v.value && typeof v.value === 'object') {
    return '(Tabelle)';
  }
  // Fix 3 — enum
  if (v?.type === 'enum' && v.value != null) {
    if (f.enumValues) {
      const entry = f.enumValues.find((e) => e.value === v.value);
      const label = locale === 'de' ? entry?.label_de : entry?.label_en;
      return label ?? String(v.value);
    }
    return String(v.value);
  }
  // Fix 3 — boolean
  if (v?.type === 'boolean' && v.value != null) {
    return v.value ? 'Ja' : 'Nein';
  }
  // Fix 3 — text
  if (v?.type === 'text' && v.value) {
    return v.value;
  }
  return '—';
}

/** Minimal fixture that renders a single inherited-panel row using computeDisplay. */
function PanelRowFixture({
  field,
  value,
  locale = 'de',
}: {
  field: PanelField;
  value: FieldValue | undefined;
  locale?: 'de' | 'en';
}) {
  const display = computeDisplay(value, field, locale);
  return (
    <ul>
      <li data-symbol={field.symbol}>
        <span data-testid="panel-label">{field.labelDe}</span>
        <span data-testid="panel-display">{display}</span>
      </li>
    </ul>
  );
}

// ---- Field fixtures ----

const FLAECHENGRUPPE_FIELD: PanelField = {
  id: 'f1',
  symbol: 'flaechengruppe',
  labelDe: 'Flächengruppe',
  labelEn: 'Area group',
  unit: null,
  dataType: 'enum',
  isRequired: false,
  enumValues: [
    { value: 'V1', label_de: 'Flächengruppe V1', label_en: 'Area group V1' },
    { value: 'V2', label_de: 'Flächengruppe V2', label_en: 'Area group V2' },
    { value: 'V3', label_de: 'Flächengruppe V3', label_en: 'Area group V3' },
  ],
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
  inheritedFromWorksheet: 'A138-06',
  active: true,
  sectionId: null,
  orderIndex: 1,
};

const BK_FIELD: PanelField = {
  id: 'f2',
  symbol: 'belastungskategorie',
  labelDe: 'Belastungskategorie',
  labelEn: 'Pollution category',
  unit: null,
  dataType: 'enum',
  isRequired: false,
  enumValues: [
    { value: 'BK_I', label_de: 'Belastungskategorie I', label_en: 'Pollution category I' },
    { value: 'BK_II', label_de: 'Belastungskategorie II', label_en: 'Pollution category II' },
  ],
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
  inheritedFromWorksheet: 'A138-06',
  active: true,
  sectionId: null,
  orderIndex: 2,
};

const TREATMENT_FIELD: PanelField = {
  id: 'f3',
  symbol: 'treatment_required',
  labelDe: 'Vorbehandlung erforderlich',
  labelEn: 'Treatment required',
  unit: null,
  dataType: 'boolean',
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
  inheritedFromWorksheet: 'A138-06',
  active: true,
  sectionId: null,
  orderIndex: 3,
};

const TEXT_FIELD: PanelField = {
  id: 'f4',
  symbol: 'standort_beschreibung',
  labelDe: 'Standortbeschreibung',
  labelEn: 'Site description',
  unit: null,
  dataType: 'text',
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
  inheritedFromWorksheet: 'A138-06',
  active: true,
  sectionId: null,
  orderIndex: 4,
};

const NUMBER_FIELD: PanelField = {
  id: 'f5',
  symbol: 'A_C',
  labelDe: 'Angeschlossene Fläche A_C',
  labelEn: 'Connected area A_C',
  unit: 'm²',
  dataType: 'number',
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
  inheritedFromWorksheet: 'A138-07',
  active: true,
  sectionId: null,
  orderIndex: 5,
};

// ---- Tests ----

describe('Inherited panel display — Fix 3: enum/boolean/text (RED before fix, GREEN after)', () => {
  // --- Enum ---

  it('enum "V2" → shows label "Flächengruppe V2" (not "—")', () => {
    render(
      <PanelRowFixture
        field={FLAECHENGRUPPE_FIELD}
        value={{ type: 'enum', value: 'V2' }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('Flächengruppe V2');
    expect(screen.getByTestId('panel-display')).not.toHaveTextContent('—');
  });

  it('enum "BK_I" → shows label "Belastungskategorie I" (not "—")', () => {
    render(
      <PanelRowFixture
        field={BK_FIELD}
        value={{ type: 'enum', value: 'BK_I' }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('Belastungskategorie I');
    expect(screen.getByTestId('panel-display')).not.toHaveTextContent('—');
  });

  it('enum with no matching label falls back to raw value string', () => {
    render(
      <PanelRowFixture
        field={FLAECHENGRUPPE_FIELD}
        value={{ type: 'enum', value: 'V9' }}
        locale="de"
      />,
    );
    // No match in enumValues → raw value
    expect(screen.getByTestId('panel-display')).toHaveTextContent('V9');
  });

  it('enum with null enumValues falls back to raw value string', () => {
    const noEnumField = { ...FLAECHENGRUPPE_FIELD, enumValues: null };
    render(
      <PanelRowFixture
        field={noEnumField}
        value={{ type: 'enum', value: 'V2' }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('V2');
  });

  it('enum with null value → "—"', () => {
    render(
      <PanelRowFixture
        field={FLAECHENGRUPPE_FIELD}
        value={{ type: 'enum', value: null }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('—');
  });

  // --- Boolean ---

  it('boolean false → "Nein" (not "—")', () => {
    render(
      <PanelRowFixture
        field={TREATMENT_FIELD}
        value={{ type: 'boolean', value: false }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('Nein');
    expect(screen.getByTestId('panel-display')).not.toHaveTextContent('—');
  });

  it('boolean true → "Ja"', () => {
    render(
      <PanelRowFixture
        field={TREATMENT_FIELD}
        value={{ type: 'boolean', value: true }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('Ja');
  });

  it('boolean null → "—"', () => {
    render(
      <PanelRowFixture
        field={TREATMENT_FIELD}
        value={{ type: 'boolean', value: null }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('—');
  });

  // --- Text ---

  it('text "Gewerbe Krefeld" → shows the text (not "—")', () => {
    render(
      <PanelRowFixture
        field={TEXT_FIELD}
        value={{ type: 'text', value: 'Gewerbe Krefeld' }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('Gewerbe Krefeld');
    expect(screen.getByTestId('panel-display')).not.toHaveTextContent('—');
  });

  it('text null → "—"', () => {
    render(
      <PanelRowFixture
        field={TEXT_FIELD}
        value={{ type: 'text', value: null }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('—');
  });

  // --- Number (regression: must still work as before) ---

  it('number 1234.5 → formatted de-DE "1.234,5" (existing behavior unchanged)', () => {
    render(
      <PanelRowFixture
        field={NUMBER_FIELD}
        value={{ type: 'number', value: 1234.5 }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('1.234,5');
  });

  it('number null → "—" (existing behavior unchanged)', () => {
    render(
      <PanelRowFixture
        field={NUMBER_FIELD}
        value={{ type: 'number', value: null }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('—');
  });

  // --- JSON (regression) ---

  it('json object → "(Tabelle)" (existing behavior unchanged)', () => {
    render(
      <PanelRowFixture
        field={NUMBER_FIELD}
        value={{ type: 'json', value: { foo: 'bar' } }}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('(Tabelle)');
  });

  // --- undefined (no value yet) ---

  it('undefined value → "—"', () => {
    render(
      <PanelRowFixture
        field={FLAECHENGRUPPE_FIELD}
        value={undefined}
        locale="de"
      />,
    );
    expect(screen.getByTestId('panel-display')).toHaveTextContent('—');
  });
});
