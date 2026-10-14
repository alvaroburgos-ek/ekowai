/**
 * O-8 (UX follow-up 2026-10-14): under the EN locale the verification labels, the compliance status badges / header
 * chips, the equations heading, the twin pre-fill badge and the "Bereits in …" hint read English. The German texts
 * are unchanged (asserted byte-for-byte here and by the existing DE tests).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/actions/project-standards', () => ({ addStandardByCodeToProject: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/citations', () => ({ addCitation: vi.fn(async () => ({ ok: true })), removeCitation: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/documents', () => ({ uploadDocument: vi.fn(async () => ({ ok: true, id: 'd' })) }));
vi.mock('@/lib/actions/verification', () => ({}));
vi.mock('../verify-button', () => ({ VerifyButton: () => null }));
vi.mock('@/components/norm-text/clause-chip', () => ({
  ClauseChip: ({ title }: { title?: string }) => <span data-testid="clause-chip" title={title} />,
}));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));

import { render, screen, act } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { verificationStatusLabel, verificationStatusTitle, VERIFICATION_LABELS_DE } from '@/lib/verification-status';
import { ComplianceBlock } from '../compliance-block';
import { EquationsBlock } from '../equations-block';
import { DynamicField } from '../dynamic-field';

const STATUSES = Object.keys(VERIFICATION_LABELS_DE);

describe('verification status labels', () => {
  it('DE (default and explicit) is the unchanged German table', () => {
    for (const s of STATUSES) {
      expect(verificationStatusLabel(s)).toBe(VERIFICATION_LABELS_DE[s].short);
      expect(verificationStatusLabel(s, 'de')).toBe(VERIFICATION_LABELS_DE[s].short);
      expect(verificationStatusTitle(s, 'de')).toBe(VERIFICATION_LABELS_DE[s].title);
    }
    expect(verificationStatusLabel('imported_unverified')).toBe('Quelle ungeprüft');
  });
  it('EN has an English label + title for every status; an unknown status falls back to the raw code', () => {
    for (const s of STATUSES) {
      expect(verificationStatusLabel(s, 'en')).not.toBe(VERIFICATION_LABELS_DE[s].short);
      expect(verificationStatusTitle(s, 'en')).not.toBe(VERIFICATION_LABELS_DE[s].title);
    }
    expect(verificationStatusLabel('imported_unverified', 'en')).toBe('Source unverified');
    expect(verificationStatusLabel('weird', 'en')).toBe('weird');
  });
});

const eq = (verificationStatus: string) => ({
  id: 'e1',
  equationNumber: '1',
  formula: 'a = b',
  inputSymbols: null,
  outputSymbol: null,
  clauseReference: null,
  description: null,
  verificationStatus,
});

describe('EquationsBlock EN', () => {
  it('heading + platform-engineer badge in English', () => {
    render(<EquationsBlock isPlatformEngineer locale="en" equations={[eq('imported_unverified')]} />);
    expect(screen.getByText('Equations for this worksheet')).toBeInTheDocument();
    expect(screen.getByText('Source unverified')).toBeInTheDocument();
    expect(screen.queryByText('Gleichungen dieses Arbeitsblatts')).toBeNull();
  });
  it('non-platform hover title in English', () => {
    render(<EquationsBlock locale="en" equations={[eq('imported_unverified')]} />);
    expect(screen.getByText(/^Eq\./).getAttribute('title')).toMatch(/^Source unverified — /);
  });
  it('DE unchanged', () => {
    render(<EquationsBlock locale="de" equations={[eq('imported_unverified')]} />);
    expect(screen.getByText('Gleichungen dieses Arbeitsblatts')).toBeInTheDocument();
    expect(screen.getByText(/^Gl\./).getAttribute('title')).toMatch(/^Quelle ungeprüft — Aus Pass3c-Workbook importiert/);
  });
});

const FIELD = {
  id: 'fx',
  symbol: 'x',
  labelDe: 'Feld X',
  labelEn: 'Field X',
  unit: null,
  dataType: 'number' as const,
  isRequired: false,
  enumValues: null,
  validationRules: null,
  clauseReference: '§ 6.4',
  verificationStatus: 'imported_unverified',
  description: null,
};

describe('DynamicField EN', () => {
  beforeEach(() => {
    act(() => {
      useWorksheetStore.getState().init('i', { fx: { type: 'number', value: 3 } }, {}, {});
    });
  });

  it('verification hover title on the clause chip', () => {
    render(<DynamicField field={FIELD} locale="en" projectId="p" standardCode="S" docs={[]} />);
    expect(screen.getByTestId('clause-chip').getAttribute('title')).toMatch(/^Source unverified — /);
  });
  it('platform-engineer badge', () => {
    render(<DynamicField field={FIELD} locale="en" projectId="p" standardCode="S" docs={[]} isPlatformEngineer />);
    expect(screen.getByText('Source unverified')).toBeInTheDocument();
  });
  it('twin pre-fill badge + tooltip', () => {
    render(
      <DynamicField
        field={FIELD}
        locale="en"
        projectId="p"
        standardCode="S"
        docs={[]}
        prefillSource="twin"
        twinSource={{ worksheetCode: 'A138-07', symbol: 'A_C' }}
      />,
    );
    const badge = screen.getByTestId('twin-prefill-badge');
    expect(badge).toHaveTextContent('Prefilled ← A138-07 · A_C');
    expect(badge.getAttribute('title')).toBe('x = 3 prefilled from A138-07 (A_C) — confirm (Apply) or overwrite.');
  });
  it('same-symbol hint', () => {
    render(
      <DynamicField
        field={FIELD}
        locale="en"
        projectId="p"
        standardCode="S"
        docs={[]}
        sameSymbolHints={[
          { worksheetCode: 'A138-07', value: 4, viaSymbol: 'A_C' },
          { worksheetCode: 'A138-08', value: 4 },
        ]}
      />,
    );
    expect(screen.getByTestId('same-symbol-hint').textContent).toBe('Already entered in A138-07 (as A_C), A138-08: 4 Apply');
  });
  it('DE twin badge + hint unchanged', () => {
    render(
      <DynamicField
        field={FIELD}
        locale="de"
        projectId="p"
        standardCode="S"
        docs={[]}
        prefillSource="twin"
        twinSource={{ worksheetCode: 'A138-07', symbol: 'A_C' }}
        sameSymbolHints={[{ worksheetCode: 'A138-07', value: 4, viaSymbol: 'A_C' }]}
      />,
    );
    expect(screen.getByTestId('twin-prefill-badge').getAttribute('title')).toBe(
      'x = 3 vorbefüllt aus A138-07 (A_C) — bestätigen (Übernehmen) oder überschreiben.',
    );
    expect(screen.getByTestId('same-symbol-hint').textContent).toBe('Bereits in A138-07 (als A_C): 4 Übernehmen');
  });
});

const cr = (code: string, condition: string, severity = 'block') => ({
  id: code,
  code,
  titleDe: code,
  titleEn: null,
  condition,
  description: null,
  clauseReference: null,
  severity,
  suggestion: null,
});
const CF = [
  { id: 'fx', symbol: 'x' },
  { id: 'fy', symbol: 'y' },
  { id: 'fz', symbol: 'z' },
  { id: 'fh', symbol: 'h' },
];

describe('ComplianceBlock EN', () => {
  beforeEach(() => {
    act(() => {
      useWorksheetStore.getState().init('i', { fx: { type: 'number', value: 5 }, fy: { type: 'number', value: 0 } }, {}, {});
    });
  });

  it('heading, status badges, header chip titles and suggestion actions in English', () => {
    render(
      <ComplianceBlock
        requirements={[cr('P', 'x >= 1'), cr('FB', 'y >= 1'), cr('FW', 'y >= 1', 'warn'), cr('PE', 'z >= 1'), cr('NA', 'h >= 1'), cr('B', '>>>')]}
        suggestions={[
          {
            id: 's',
            requirementId: 'FB',
            suggestionType: 'alternative_standard',
            targetStandardCode: 'X',
            targetWorksheetCode: 'X-1',
            suggestionDe: 'tu was',
            suggestionEn: null,
            condition: null,
          },
        ]}
        fields={CF}
        locale="en"
        projectId="p"
        hiddenSymbols={new Set(['h'])}
      />,
    );
    expect(screen.getByText('Compliance requirements')).toBeInTheDocument();
    for (const l of ['Met', 'Not met', 'Recommendation not met', 'Input required', 'Not applicable', 'Condition cannot be evaluated']) {
      expect(screen.getByLabelText(l)).toBeInTheDocument();
    }
    expect(screen.getByTitle('Blocking violations')).toBeInTheDocument();
    expect(screen.getByTitle('Advisory violations')).toBeInTheDocument();
    expect(screen.getAllByTitle('Not applicable — the condition refers to a hidden field').length).toBe(2);
    expect(screen.getAllByText('Why?').length).toBeGreaterThan(0);
    expect(screen.getByText('Add to project')).toBeInTheDocument();
    expect(screen.getByText('Open worksheet →')).toBeInTheDocument();
    for (const de of ['Erfüllt', 'Nicht erfüllt', 'Eingabe erforderlich', 'Nicht anwendbar', 'Bedingung nicht auswertbar']) {
      expect(screen.queryByLabelText(de)).toBeNull();
    }
    for (const de of ['Compliance-Anforderungen', 'Warum?', 'Zu Projekt hinzufügen']) {
      expect(screen.queryByText(de)).toBeNull();
    }
  });
});
