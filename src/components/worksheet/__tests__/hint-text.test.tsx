/** U-7 (UX pass 820, 2026-10-08): hints show the first sentence, the rest on „mehr"; short hints show whole. */
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/actions/citations', () => ({ addCitation: vi.fn(async () => ({ ok: true })), removeCitation: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/documents', () => ({ uploadDocument: vi.fn(async () => ({ ok: true, id: 'd' })) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HintText } from '../hint-text';
import { DynamicField } from '../dynamic-field';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const FIRST = 'Die Phase wird aus der Projektstruktur abgeleitet und steuert die folgenden Fragen.';
const REST = 'Bei einer Direktvergabe entfallen die Wettbewerbsblätter; bei einem offenen Verfahren werden z. B. die Bekanntmachung und die Angebotswertung abgefragt. Weitere Hinweise stehen in § 5.2.2.';
const LONG = `${FIRST} ${REST}`;

describe('HintText', () => {
  it('collapsed by default: first sentence + „mehr" (aria-expanded=false); click shows the full text', () => {
    render(<HintText text={LONG} locale="de" testId="h" />);
    const p = screen.getByTestId('h');
    expect(p).toHaveTextContent(`${FIRST} mehr`);
    expect(p).not.toHaveTextContent('Direktvergabe');
    const btn = screen.getByRole('button', { name: 'mehr' });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(p).toHaveTextContent(LONG);
    expect(screen.getByRole('button', { name: 'weniger' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('English toggle wording', () => {
    render(<HintText text={LONG} locale="en" />);
    expect(screen.getByRole('button', { name: 'more' })).toBeInTheDocument();
  });

  it('a short hint shows whole, without a toggle', () => {
    render(<HintText text="Kurzer Hinweis." locale="de" testId="h" />);
    expect(screen.getByTestId('h')).toHaveTextContent('Kurzer Hinweis.');
    expect(screen.queryByTestId('hint-toggle')).toBeNull();
  });

  it('DynamicField renders the field hint collapsed', () => {
    act(() => { useWorksheetStore.getState().init('inst-hint', {}, {}, {}); });
    render(
      <DynamicField
        field={{
          id: 'f1', symbol: 'phase_driver', labelDe: 'Phase', labelEn: null, unit: null, dataType: 'boolean', isRequired: false,
          enumValues: null, validationRules: null, clauseReference: null, verificationStatus: 'engineer_verified', description: LONG,
        }}
        locale="de"
        projectId="p"
        standardCode="DWA-M-820-2"
        docs={[]}
      />,
    );
    expect(screen.getByTestId('field-hint')).toHaveTextContent(`${FIRST} mehr`);
  });
});
