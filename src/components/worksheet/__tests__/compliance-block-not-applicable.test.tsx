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
