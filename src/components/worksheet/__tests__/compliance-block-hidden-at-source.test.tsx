/**
 * Fix round 3 of UX cluster A (controller ruling R-16) — form level. The worksheet form unions the page's
 * `hiddenAtSourceSymbols` into the compliance block's hiddenSymbols with `gateHiddenSymbols` (minus its own fields), so
 * 820-2-22 REQ-46 — reading `testbetrieb_vs_abnahme_choice`, asked on 820-2-18 only when `bauleistungen_vergeben ==
 * true` — renders „–" (Nicht anwendbar) exactly as the approval gate decides, instead of an open/pending badge.
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
import { gateHiddenSymbols } from '@/lib/projects/required-field-counts';

// The page dropped the hidden-at-source inherited choice, so only the own field is in the form.
const fields = [{ id: 'f-tb', symbol: 'testbetrieb_planned' }];
const requirements = [
  {
    id: 'cr-46',
    code: 'REQ-46',
    titleDe: 'Testbetrieb geplant',
    titleEn: null,
    condition: "IF testbetrieb_vs_abnahme_choice == 'testbetrieb' OR testbetrieb_vs_abnahme_choice == 'mischform' THEN (testbetrieb_planned == true)",
    description: null,
    clauseReference: null,
    severity: 'block',
    suggestion: null,
  },
];

function renderBlock(hiddenSymbols: ReadonlySet<string>) {
  return render(
    <ComplianceBlock requirements={requirements} suggestions={[]} fields={fields} locale="de" projectId="proj-1" hiddenSymbols={hiddenSymbols} />,
  );
}

beforeEach(() => {
  useWorksheetStore.getState().init('inst-22', { 'f-tb': { type: 'boolean', value: false } }, {}, {});
});

describe('ComplianceBlock — hidden at source (R-16)', () => {
  it('bauleistungen_vergeben = false: the form union makes REQ-46 „–" (Nicht anwendbar), as the gate decides', () => {
    // worksheet-form.tsx: gateHiddenSymbols(visibility.hiddenSymbols, hiddenAtSourceSymbols, ownFieldSymbols)
    renderBlock(gateHiddenSymbols(new Set(), ['testbetrieb_vs_abnahme_choice'], new Set(['testbetrieb_planned'])));
    expect(screen.getByLabelText('Nicht anwendbar')).toBeTruthy();
  });

  it('without the union the same gate is NOT „–" (the divergence R-16 removes)', () => {
    renderBlock(new Set());
    expect(screen.queryByLabelText('Nicht anwendbar')).toBeNull();
  });
});
