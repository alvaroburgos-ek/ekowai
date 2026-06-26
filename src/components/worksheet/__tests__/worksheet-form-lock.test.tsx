/**
 * Task 4 — worksheet write-lock: form-level lock derivation test.
 *
 * Rendering the full WorksheetForm is impractical in the unit environment
 * (it has many server-component dependencies, deep mocking requirements, and
 * relies on the equation engine and store together). Per the task brief:
 *
 * > if rendering the full WorksheetForm is impractical, scope the form test
 * > to asserting the `locked` derivation drives the banner/auto-save and put
 * > input-level assertions in the dynamic-field test — note this in your report.
 *
 * Accordingly, this file:
 *   1. Unit-tests the `isWorksheetEditable` function (the exact function the
 *      form uses to compute `locked`) against every valid status.
 *   2. Renders a lightweight test component that mirrors the banner JSX the
 *      form emits when `locked = !isWorksheetEditable(status)` and asserts
 *      the banner presence/absence + data-testid contract.
 *   3. Smoke-tests that the `readOnly` prop in DynamicField — which the form
 *      passes as `readOnly={locked}` — gates the input (covered more fully in
 *      dynamic-field.test.tsx).
 *
 * The input-level assertions (number input readOnly, store not mutated) live in
 * dynamic-field.test.tsx which renders the component directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
import { isWorksheetEditable, type WorksheetStatus } from '@/lib/state-machine';
import { DynamicField } from '../dynamic-field';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

// ---- 1. isWorksheetEditable derivation ----------------------------------------

describe('isWorksheetEditable — locked derivation (drives WorksheetForm `locked`)', () => {
  it('draft → editable (not locked)', () => {
    expect(isWorksheetEditable('draft')).toBe(true);
  });

  it('submitted_for_review → editable (not locked)', () => {
    expect(isWorksheetEditable('submitted_for_review')).toBe(true);
  });

  it('engineer_approved → NOT editable (locked)', () => {
    expect(isWorksheetEditable('engineer_approved')).toBe(false);
  });

  it('final → NOT editable (locked)', () => {
    expect(isWorksheetEditable('final')).toBe(false);
  });

  it('deactivated → NOT editable (locked)', () => {
    expect(isWorksheetEditable('deactivated')).toBe(false);
  });

  it('locked = !isWorksheetEditable(status): final yields locked=true', () => {
    const locked = !isWorksheetEditable('final' as WorksheetStatus);
    expect(locked).toBe(true);
  });

  it('locked = !isWorksheetEditable(status): draft yields locked=false', () => {
    const locked = !isWorksheetEditable('draft' as WorksheetStatus);
    expect(locked).toBe(false);
  });
});

// ---- 2. Banner JSX contract (mirrors the verbatim banner from the brief) ------

/**
 * Minimal test component that replicates exactly the banner the form renders:
 *   {locked && (
 *     <div role="status" data-testid="worksheet-lock-banner" ...>
 *       Schreibgeschützt (genehmigt/final) — zum Bearbeiten „Wieder öffnen".
 *     </div>
 *   )}
 */
function BannerFixture({ status }: { status: WorksheetStatus }) {
  const locked = !isWorksheetEditable(status);
  return (
    <div>
      {locked && (
        <div
          role="status"
          data-testid="worksheet-lock-banner"
          className="border border-hairline rounded p-3 text-sm bg-paper-2 text-ink"
        >
          Schreibgeschützt (genehmigt/final) — zum Bearbeiten „Wieder öffnen".
        </div>
      )}
      <span data-testid="content">Worksheet content</span>
    </div>
  );
}

describe('Lock banner — presence / absence by status', () => {
  it('final: banner IS present with correct testid and role', () => {
    render(<BannerFixture status="final" />);
    const banner = screen.getByTestId('worksheet-lock-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('role', 'status');
  });

  it('final: banner text contains schreibgeschützt (case-insensitive)', () => {
    render(<BannerFixture status="final" />);
    const banner = screen.getByTestId('worksheet-lock-banner');
    expect(banner.textContent?.toLowerCase()).toMatch(/schreibgeschützt/);
  });

  it('engineer_approved: banner IS present', () => {
    render(<BannerFixture status="engineer_approved" />);
    expect(screen.getByTestId('worksheet-lock-banner')).toBeInTheDocument();
  });

  it('draft: banner is NOT present', () => {
    render(<BannerFixture status="draft" />);
    expect(screen.queryByTestId('worksheet-lock-banner')).not.toBeInTheDocument();
  });

  it('submitted_for_review: banner is NOT present', () => {
    render(<BannerFixture status="submitted_for_review" />);
    expect(screen.queryByTestId('worksheet-lock-banner')).not.toBeInTheDocument();
  });
});

// ---- 3. Smoke: readOnly prop passed as locked gates DynamicField input --------

const NUMBER_FIELD = {
  id: 'form-lock-num',
  symbol: 'form_lock_num',
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

beforeEach(() => {
  act(() => {
    useWorksheetStore.getState().init('form-lock-fixture', {}, {}, {});
  });
});

describe('Smoke: locked=true passes readOnly to DynamicField', () => {
  it('when locked (final): DynamicField input is readOnly', () => {
    const locked = !isWorksheetEditable('final');
    render(
      <DynamicField
        field={NUMBER_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        readOnly={locked}
      />,
    );
    expect(screen.getByRole('spinbutton')).toHaveAttribute('readonly');
  });

  it('when not locked (draft): DynamicField input is NOT readOnly', () => {
    const locked = !isWorksheetEditable('draft');
    render(
      <DynamicField
        field={NUMBER_FIELD}
        locale="de"
        projectId="p1"
        standardCode="DWA-A-138-1"
        docs={[]}
        readOnly={locked}
      />,
    );
    expect(screen.getByRole('spinbutton')).not.toHaveAttribute('readonly');
  });
});
