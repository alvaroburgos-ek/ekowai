/** U-8 (UX pass 820, 2026-10-08): the „Quelle ungeprüft" badge is shown to platform engineers only; everyone else gets
 * the status as the hover title of the clause chip (or of the label when the field has no clause reference). */
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/actions/citations', () => ({ addCitation: vi.fn(async () => ({ ok: true })), removeCitation: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/documents', () => ({ uploadDocument: vi.fn(async () => ({ ok: true, id: 'd' })) }));
vi.mock('@/lib/actions/verification', () => ({}));
vi.mock('../verify-button', () => ({ VerifyButton: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
import { render, screen, act } from '@testing-library/react';
import { DynamicField } from '../dynamic-field';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const field = (over: Record<string, unknown> = {}) => ({
  id: 'f1', symbol: 'x', labelDe: 'Feld X', labelEn: null, unit: null, dataType: 'number' as const, isRequired: false,
  enumValues: null, validationRules: null, clauseReference: '§ 6.4', verificationStatus: 'imported_unverified', description: null,
  ...over,
});

beforeEach(() => { act(() => { useWorksheetStore.getState().init('inst-vb', {}, {}, {}); }); });

describe('DynamicField verification badge (U-8)', () => {
  it('platform engineer sees the badge', () => {
    render(<DynamicField field={field()} locale="de" projectId="p" standardCode="S" docs={[]} isPlatformEngineer />);
    expect(screen.getByText('Quelle ungeprüft')).toBeInTheDocument();
  });

  it('other engineers see no badge; the clause chip carries the status as title', () => {
    render(<DynamicField field={field()} locale="de" projectId="p" standardCode="S" docs={[]} />);
    expect(screen.queryByText('Quelle ungeprüft')).toBeNull();
    expect(screen.getByText('§ 6.4').getAttribute('title')).toMatch(/^Quelle ungeprüft — /);
  });

  it('without a clause reference the label carries the title', () => {
    render(<DynamicField field={field({ clauseReference: null })} locale="de" projectId="p" standardCode="S" docs={[]} />);
    expect(screen.queryByText('Quelle ungeprüft')).toBeNull();
    expect(screen.getByText('Feld X').closest('label')?.getAttribute('title')).toMatch(/^Quelle ungeprüft — /);
  });

  it('engineer_verified: no badge, no status title', () => {
    render(<DynamicField field={field({ verificationStatus: 'engineer_verified' })} locale="de" projectId="p" standardCode="S" docs={[]} />);
    expect(screen.getByText('§ 6.4').getAttribute('title')).toBeNull();
  });
});
