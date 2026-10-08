/**
 * U-1 (2026-10-08, ruling R-12) — a value saved while its question was hidden (`is_stale`) reappears with a warning
 * badge instead of silently pre-answered; touching (or confirming) the field removes the badge.
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

const FIELD = {
  id: 'f-abn',
  symbol: 'abnahme_note',
  labelDe: 'Abnahme-Notiz',
  labelEn: 'Acceptance note',
  unit: null,
  dataType: 'text' as const,
  isRequired: true,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'engineer_verified',
  description: null,
};

beforeEach(() => {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', { 'f-abn': { type: 'text', value: 'Nein' } } as never, {}, {});
  });
});

const renderField = (props: { isStale?: boolean; locale?: 'de' | 'en'; readOnly?: boolean }) =>
  render(
    <DynamicField
      field={FIELD}
      locale={props.locale ?? 'de'}
      projectId="p1"
      standardCode="DWA-M-820-2"
      docs={[]}
      isStale={props.isStale}
      readOnly={props.readOnly}
    />,
  );

describe('DynamicField — stale answer badge (U-1)', () => {
  it('isStale: shows the DE badge with an explaining title', () => {
    renderField({ isStale: true });
    const badge = screen.getByTestId('stale-answer-badge');
    expect(badge).toHaveTextContent('Antwort älter als die Auswahl — bitte bestätigen');
    expect(badge.getAttribute('title')).toMatch(/ausgeblendet/);
  });

  it('EN locale: English badge text', () => {
    renderField({ isStale: true, locale: 'en' });
    expect(screen.getByTestId('stale-answer-badge')).toHaveTextContent('Answer predates the current selection — please confirm');
  });

  it('not stale: no badge', () => {
    renderField({ isStale: false });
    expect(screen.queryByTestId('stale-answer-badge')).toBeNull();
  });

  it('typing into the field removes the badge', async () => {
    const user = userEvent.setup();
    renderField({ isStale: true });
    await user.type(screen.getByRole('textbox'), 'x');
    expect(screen.queryByTestId('stale-answer-badge')).toBeNull();
  });

  it('"Bestätigen" marks the unchanged value pending (the autosave persists it) and removes the badge', async () => {
    const user = userEvent.setup();
    renderField({ isStale: true });
    await user.click(screen.getByTestId('stale-answer-confirm'));
    expect(useWorksheetStore.getState().pendingFieldIds.has('f-abn')).toBe(true);
    expect(useWorksheetStore.getState().values['f-abn']).toEqual({ type: 'text', value: 'Nein' });
    expect(screen.queryByTestId('stale-answer-badge')).toBeNull();
  });

  it('read-only (approved sheet): badge without the confirm button', () => {
    renderField({ isStale: true, readOnly: true });
    expect(screen.getByTestId('stale-answer-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('stale-answer-confirm')).toBeNull();
  });
});
