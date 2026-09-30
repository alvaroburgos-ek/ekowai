/**
 * B2 — the Σ badge marks a genuine sum, never a symbol-name suffix.
 * `water_test_p_total` is P_total (a concentration): no equation ⇒ no Σ.
 * Signals that DO raise it: `sumOutput` from the caller (equation formula is a
 * sum_rows( / sum( ) or an explicit `ui_config.sum_badge: true`.
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

import { render, act } from '@testing-library/react';
import { DynamicField } from '../dynamic-field';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const FIELD_ID = 'fixture-p-total';
const P_TOTAL = {
  id: FIELD_ID,
  symbol: 'water_test_p_total',
  labelDe: 'Gesamt-Phosphor (Füllwasser)',
  labelEn: null,
  unit: 'mg/l',
  dataType: 'number' as const,
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: null,
  verificationStatus: 'engineer_verified',
  description: null,
};

beforeEach(() => {
  act(() => { useWorksheetStore.getState().init('fixture-instance', {}, {}, {}); });
});

function labelOf(container: HTMLElement): string {
  return container.querySelector('label')?.textContent?.trim() ?? '';
}

describe('DynamicField — Σ badge (B2)', () => {
  it('a field with symbol water_test_p_total and no equation shows no Σ', () => {
    const { container } = render(<DynamicField field={P_TOTAL} locale="de" projectId="p" standardCode="FLL-NT" docs={[]} />);
    expect(labelOf(container)).toBe('Gesamt-Phosphor (Füllwasser)');
    expect(labelOf(container)).not.toMatch(/Σ/);
    expect(container.firstElementChild?.className).not.toMatch(/border-t/);
  });
  it('an equation output that is not a sum (isComputed only) shows no Σ either', () => {
    const { container } = render(<DynamicField field={P_TOTAL} locale="de" projectId="p" standardCode="FLL-NT" docs={[]} isComputed />);
    expect(labelOf(container)).not.toMatch(/Σ/);
  });
  it('sumOutput (the producing equation is a sum_rows/sum) raises the Σ badge', () => {
    const { container } = render(<DynamicField field={{ ...P_TOTAL, symbol: 'A_sum' }} locale="de" projectId="p" standardCode="FLL-NT" docs={[]} isComputed sumOutput />);
    expect(labelOf(container)).toMatch(/^Σ\s*Gesamt-Phosphor/);
    expect(container.firstElementChild?.className).toMatch(/border-t/);
  });
  it('an explicit ui_config.sum_badge raises the Σ badge without any suffix', () => {
    const { container } = render(<DynamicField field={{ ...P_TOTAL, symbol: 'A_ges', uiConfig: { sum_badge: true } }} locale="de" projectId="p" standardCode="FLL-NT" docs={[]} />);
    expect(labelOf(container)).toMatch(/^Σ/);
  });
});
