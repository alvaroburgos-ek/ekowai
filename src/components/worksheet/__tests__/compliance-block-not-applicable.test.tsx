/**
 * Plan 2a, Task 11 — `not_applicable` at the form's compliance block.
 *
 * A requirement whose condition references a symbol hidden by `visible_when`
 * must render as "Nicht anwendbar" (glyph –), be counted in the header chip
 * (`– N n.a.`) and NOT show the "Warum?" explanation block (there is nothing
 * to explain: the engineer cannot see the field). With no hidden symbols the
 * same requirement is a plain `Erfüllt`.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={String(href)}>{children}</a>,
}));
vi.mock('@/lib/actions/project-standards', () => ({ addStandardByCodeToProject: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/components/norm-text/clause-chip', () => ({ ClauseChip: () => null }));

import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { ComplianceBlock } from '../compliance-block';

const fields = [{ id: 'fx', symbol: 'x' }];
const requirements = [
  {
    id: 'cr-1',
    code: 'CR-1',
    titleDe: 'x mindestens 1',
    titleEn: null,
    condition: 'x >= 1',
    description: null,
    clauseReference: null,
    severity: 'block',
    suggestion: null,
  },
];

function renderBlock(hiddenSymbols: ReadonlySet<string>) {
  return render(
    <ComplianceBlock
      requirements={requirements}
      suggestions={[]}
      fields={fields}
      locale="de"
      projectId="proj-1"
      hiddenSymbols={hiddenSymbols}
    />,
  );
}

beforeEach(() => {
  useWorksheetStore.getState().init('inst-1', { fx: { type: 'number', value: 5 } }, {}, {});
});

describe('ComplianceBlock — not_applicable (hidden symbol)', () => {
  it('hidden x ⇒ badge "Nicht anwendbar", header chip "1 n.a.", no "Warum?" block', () => {
    renderBlock(new Set(['x']));
    const badge = screen.getByLabelText('Nicht anwendbar');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('–');
    expect(badge.getAttribute('title')).toBe(
      'Nicht anwendbar — Bedingung bezieht sich auf ein ausgeblendetes Feld',
    );
    expect(screen.getByText(/1 n\.a\./)).toBeTruthy();
    expect(screen.queryByText(/Warum\?/)).toBeNull();
    // Not counted as passed.
    expect(screen.queryByLabelText('Erfüllt')).toBeNull();
    expect(screen.queryByText(/✓ 1/)).toBeNull();
  });

  it('nothing hidden ⇒ the same requirement is "Erfüllt" and no n.a. chip', () => {
    renderBlock(new Set());
    expect(screen.getByLabelText('Erfüllt')).toBeTruthy();
    expect(screen.queryByLabelText('Nicht anwendbar')).toBeNull();
    expect(screen.queryByText(/n\.a\./)).toBeNull();
  });
});

// U-6 (UX pass 820, 2026-10-08): a guarded gate whose guard is not triggered is a vacuous pass — displayed „–
// nicht einschlägig", counted in its own header bucket, never as ✓. The verdict stays pass (no "Warum?" block).
describe('ComplianceBlock — guard not triggered (vacuous pass)', () => {
  const guarded = [{ ...requirements[0], id: 'cr-g', code: 'REQ-15', condition: 'IF x > 10 THEN x <= 20' }];
  const renderGuarded = (locale: 'de' | 'en' = 'de') =>
    render(<ComplianceBlock requirements={guarded} suggestions={[]} fields={fields} locale={locale} projectId="proj-1" />);

  it('x = 5 ⇒ badge „–" titled „Nicht einschlägig …", chip „– 1 nicht einschlägig", no ✓ count', () => {
    renderGuarded();
    const t = 'Nicht einschlägig — die Vorbedingung dieser Prüfung trifft nicht zu';
    const badge = screen.getByLabelText(t);
    expect(badge.textContent).toBe('–');
    expect(badge.getAttribute('title')).toBe(t);
    expect(screen.getByText(/1 nicht einschlägig/)).toBeTruthy();
    expect(screen.queryByLabelText('Erfüllt')).toBeNull();
    expect(screen.queryByText(/✓ 1/)).toBeNull();
    expect(screen.queryByText(/n\.a\./)).toBeNull();
    expect(screen.queryByText(/Warum\?/)).toBeNull();
  });

  it('English locale wording', () => {
    renderGuarded('en');
    expect(screen.getByLabelText('Not triggered — the precondition of this check is not met').textContent).toBe('–');
    // cluster-B review: the EN header chip reads "not triggered", distinct from the hidden-symbol "n.a." chip
    expect(screen.getByText(/1 not triggered/)).toBeTruthy();
    expect(screen.queryByText(/not applicable/)).toBeNull();
  });

  it('guard triggered and satisfied (x = 15) ⇒ a real ✓', () => {
    useWorksheetStore.getState().init('inst-1', { fx: { type: 'number', value: 15 } }, {}, {});
    renderGuarded();
    expect(screen.getByLabelText('Erfüllt').textContent).toBe('✓');
    expect(screen.getByText(/✓ 1/)).toBeTruthy();
    expect(screen.queryByText(/nicht einschlägig/)).toBeNull();
  });
});
