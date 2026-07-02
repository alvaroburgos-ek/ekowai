/**
 * B1 Task 4 — A138-12 Tab.6 loading-check fields read-only, four-state render.
 *
 * CONTRACT:
 * - ac_as_ratio, ac_as_ratio_limit, ac_as_ratio_check, ac_as_ratio_check_reason
 *   are DERIVED fields (T3 materialize); they must be read-only (isComputed=true)
 *   on A138-12 via the LOADING_CHECK_SYMBOLS set in computedSymbols.
 * - ac_as_ratio: number input → readOnly, does not write to store.
 * - ac_as_ratio_limit: number input → readOnly; when null renders a null-state
 *   label ("— (kein Tab.6-Grenzwert)").
 * - ac_as_ratio_check: text status field → four distinct visual states:
 *     pass          → green badge "bestanden"
 *     fail          → red badge "nicht bestanden"
 *     not_applicable → amber badge "nicht anwendbar" + reason text
 *     indeterminate  → grey badge "unbestimmt" + reason text
 * - ac_as_ratio_check_reason: text field → read-only; the reason text must be
 *   visible when status is not_applicable or indeterminate, so the two N/A
 *   causes ("keine Anforderung nach Tab.6" vs "behördlich abzustimmen") are
 *   distinguishable by the engineer.
 * - flaechengruppe (A138-06 user input) must NOT be in computedSymbols — it
 *   stays editable (regression guard).
 * - An ordinary editable A138-12 field (e.g. A_E) still writes to store
 *   normally (regression baseline).
 *
 * Field IDs: canonical placeholder UUIDs — the actual DB UUIDs are irrelevant
 * for these render-layer tests; what matters is the symbol matching.
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
import { AcAsRatioCheckStatus } from '../ac-as-ratio-check-status';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

// Canonical placeholder field IDs for A138-12 loading-check fields
const AC_AS_RATIO_FIELD_ID       = 'd1381200-0000-4000-8000-000000000001';
const AC_AS_RATIO_LIMIT_FIELD_ID = 'd1381200-0000-4000-8000-000000000002';
const AC_AS_RATIO_CHECK_FIELD_ID = 'd1381200-0000-4000-8000-000000000003';
const AC_AS_RATIO_REASON_FIELD_ID = 'd1381200-0000-4000-8000-000000000004';
const A_E_FIELD_ID               = 'd1381200-0000-4000-8000-000000000005'; // editable

const AC_AS_RATIO_FIELD = {
  id: AC_AS_RATIO_FIELD_ID,
  symbol: 'ac_as_ratio',
  labelDe: 'Verhältnis A_C / A_S,m',
  labelEn: 'Ratio A_C / A_S,m',
  unit: null,
  dataType: 'number' as const,
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
};

const AC_AS_RATIO_LIMIT_FIELD = {
  id: AC_AS_RATIO_LIMIT_FIELD_ID,
  symbol: 'ac_as_ratio_limit',
  labelDe: 'Grenzwert A_C / A_S,m (Tab.6)',
  labelEn: 'Limit A_C / A_S,m (Tab.6)',
  unit: null,
  dataType: 'number' as const,
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
};

const AC_AS_RATIO_CHECK_FIELD = {
  id: AC_AS_RATIO_CHECK_FIELD_ID,
  symbol: 'ac_as_ratio_check',
  labelDe: 'Prüfergebnis Tab.6',
  labelEn: 'Tab.6 check result',
  unit: null,
  dataType: 'text' as const,
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
};

const AC_AS_RATIO_REASON_FIELD = {
  id: AC_AS_RATIO_REASON_FIELD_ID,
  symbol: 'ac_as_ratio_check_reason',
  labelDe: 'Begründung Prüfergebnis Tab.6',
  labelEn: 'Tab.6 check reason',
  unit: null,
  dataType: 'text' as const,
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'inferred_from_worksheet',
  description: null,
};

const A_E_FIELD = {
  id: A_E_FIELD_ID,
  symbol: 'A_E',
  labelDe: 'Einzugsfläche A_E',
  labelEn: 'Catchment area A_E',
  unit: 'm²',
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
    useWorksheetStore.getState().init('a138-12-fixture', initial as never, {}, {});
  });
}

beforeEach(() => initStore());

// ---------------------------------------------------------------------------
// 1. Read-only guard on the four derived fields
// ---------------------------------------------------------------------------

describe('A138-12 ac_as_ratio — isComputed=true renders read-only', () => {
  it('number input has readOnly attribute when isComputed=true', () => {
    render(
      <DynamicField
        field={AC_AS_RATIO_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-12"
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
        field={AC_AS_RATIO_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-12"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-readonly', 'true');
  });

  it('typing into isComputed=true does NOT write to store', async () => {
    const user = userEvent.setup();
    initStore();
    render(
      <DynamicField
        field={AC_AS_RATIO_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-12"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('spinbutton');
    await user.type(input, '42');
    const stored = useWorksheetStore.getState().values[AC_AS_RATIO_FIELD_ID];
    expect(stored).toBeUndefined();
  });
});

describe('A138-12 ac_as_ratio_limit — isComputed=true renders read-only', () => {
  it('number input has readOnly attribute when isComputed=true', () => {
    render(
      <DynamicField
        field={AC_AS_RATIO_LIMIT_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-12"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('readonly');
  });

  it('typing into isComputed=true ac_as_ratio_limit does NOT write to store', async () => {
    const user = userEvent.setup();
    initStore();
    render(
      <DynamicField
        field={AC_AS_RATIO_LIMIT_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-12"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('spinbutton');
    await user.type(input, '3');
    const stored = useWorksheetStore.getState().values[AC_AS_RATIO_LIMIT_FIELD_ID];
    expect(stored).toBeUndefined();
  });
});

describe('A138-12 ac_as_ratio_check — isComputed=true renders read-only text', () => {
  it('text input has readOnly attribute when isComputed=true', () => {
    render(
      <DynamicField
        field={AC_AS_RATIO_CHECK_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-12"
        docs={[]}
        isComputed={true}
      />,
    );
    // text type renders an <input type="text">
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
  });

  it('typing into isComputed=true ac_as_ratio_check does NOT write to store', async () => {
    const user = userEvent.setup();
    initStore();
    render(
      <DynamicField
        field={AC_AS_RATIO_CHECK_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-12"
        docs={[]}
        isComputed={true}
      />,
    );
    const input = screen.getByRole('textbox');
    await user.type(input, 'pass');
    const stored = useWorksheetStore.getState().values[AC_AS_RATIO_CHECK_FIELD_ID];
    expect(stored).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Regression: editable field on A138-12 still writes to store
// ---------------------------------------------------------------------------

describe('A138-12 A_E — editable field still writes to store', () => {
  it('isComputed=false: typing writes to store normally', async () => {
    const user = userEvent.setup();
    initStore();
    render(
      <DynamicField
        field={A_E_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-12"
        docs={[]}
        isComputed={false}
      />,
    );
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '500');
    const stored = useWorksheetStore.getState().values[A_E_FIELD_ID];
    expect(stored?.type).toBe('number');
    expect((stored as { type: 'number'; value: number | null }).value).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// 3. AcAsRatioCheckStatus component — four distinct visual states
// ---------------------------------------------------------------------------

describe('AcAsRatioCheckStatus — four-state render', () => {
  it('pass → renders "bestanden" with success styling', () => {
    render(<AcAsRatioCheckStatus status="pass" reason={null} />);
    expect(screen.getByText(/bestanden/i)).toBeInTheDocument();
    // Should NOT show "nicht" (fail/not_applicable etc.)
    expect(screen.queryByText(/nicht bestanden/i)).not.toBeInTheDocument();
    // Check data-testid for state discrimination
    const badge = screen.getByTestId('ac-as-ratio-check-badge');
    expect(badge).toHaveAttribute('data-status', 'pass');
  });

  it('fail → renders "nicht bestanden" with error styling', () => {
    render(<AcAsRatioCheckStatus status="fail" reason={null} />);
    expect(screen.getByText(/nicht bestanden/i)).toBeInTheDocument();
    const badge = screen.getByTestId('ac-as-ratio-check-badge');
    expect(badge).toHaveAttribute('data-status', 'fail');
  });

  it('not_applicable → renders "nicht anwendbar" with amber styling', () => {
    render(<AcAsRatioCheckStatus status="not_applicable" reason="keine Anforderung nach Tab.6" />);
    expect(screen.getByText(/nicht anwendbar/i)).toBeInTheDocument();
    const badge = screen.getByTestId('ac-as-ratio-check-badge');
    expect(badge).toHaveAttribute('data-status', 'not_applicable');
  });

  it('not_applicable → reason text is visible (keine Anforderung)', () => {
    render(<AcAsRatioCheckStatus status="not_applicable" reason="keine Anforderung nach Tab.6" />);
    expect(screen.getByText(/keine Anforderung nach Tab\.6/i)).toBeInTheDocument();
  });

  it('not_applicable → reason text is visible (behördlich)', () => {
    render(<AcAsRatioCheckStatus status="not_applicable" reason="behördlich abzustimmen (*)" />);
    expect(screen.getByText(/beh.*rdlich abzustimmen/i)).toBeInTheDocument();
  });

  it('indeterminate → renders "unbestimmt" with neutral styling', () => {
    render(<AcAsRatioCheckStatus status="indeterminate" reason="Flächengruppe erforderlich" />);
    expect(screen.getByText(/unbestimmt/i)).toBeInTheDocument();
    const badge = screen.getByTestId('ac-as-ratio-check-badge');
    expect(badge).toHaveAttribute('data-status', 'indeterminate');
  });

  it('indeterminate → reason text is visible', () => {
    render(<AcAsRatioCheckStatus status="indeterminate" reason="A_C bzw. A_S,m fehlt" />);
    expect(screen.getByText(/A_C bzw\. A_S,m fehlt/i)).toBeInTheDocument();
  });

  it('not_applicable without reason does not crash', () => {
    render(<AcAsRatioCheckStatus status="not_applicable" reason={null} />);
    expect(screen.getByText(/nicht anwendbar/i)).toBeInTheDocument();
  });

  it('indeterminate without reason does not crash', () => {
    render(<AcAsRatioCheckStatus status="indeterminate" reason={null} />);
    expect(screen.getByText(/unbestimmt/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Null-state for ac_as_ratio_limit
// ---------------------------------------------------------------------------

describe('AcAsRatioCheckStatus — null limit display', () => {
  it('renders null-limit label when status is not_applicable', () => {
    render(
      <AcAsRatioCheckStatus
        status="not_applicable"
        reason="keine Anforderung nach Tab.6"
        limitIsNull={true}
      />,
    );
    // The null-limit label must be present somewhere in the component output
    expect(screen.getByTestId('ac-as-ratio-limit-null')).toBeInTheDocument();
  });
});
