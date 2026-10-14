/**
 * O-8 completion (UX follow-up round 2, 2026-10-14): the residue of the first O-8 commit plus review L-1 reads English
 * under EN — provenance chips (Norm-Default / Projekt-Standort / Kundenangabe) and their tooltips, the extensible
 * checklist, the text-suggestion and provenance hints, the „→ öffnen" link, the json placeholder, the range hint, the
 * boolean toggle, the same-symbol hint values (Yes/No, decimal point), the platform-engineer verify button, the
 * „Warum?" lines, the save indicator, the orphan-engine heading and the VSME CO₂ hints. Every German text is pinned
 * unchanged next to its English counterpart.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/actions/worksheet', () => ({ saveWorksheet: vi.fn(async () => ({ ok: true, warnings: [] })) }));
vi.mock('@/lib/actions/worksheet-transition', () => ({ transitionWorksheet: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/client-supplied', () => ({ setClientSupplied: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/project-standards', () => ({ addStandardByCodeToProject: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/citations', () => ({ addCitation: vi.fn(async () => ({ ok: true })), removeCitation: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/actions/documents', () => ({ uploadDocument: vi.fn(async () => ({ ok: true, id: 'd' })) }));
vi.mock('@/lib/actions/verification', () => ({
  verifyField: vi.fn(async () => ({ ok: true })),
  unverifyField: vi.fn(async () => ({ ok: true })),
  verifyEquation: vi.fn(async () => ({ ok: true })),
  unverifyEquation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('../equation-engine-card', () => ({ EquationEngineCard: () => null }));
vi.mock('@/components/math/katex-formula', () => ({ KatexFormula: ({ source }: { source: string }) => <span>{source}</span> }));

import { render, screen, act, fireEvent, within } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { formatNumberDe, formatNumberLocale } from '@/lib/format-number-de';
import { explainCondition } from '@/lib/compliance/explain';
import { DynamicField } from '../dynamic-field';
import { VerifyButton } from '../verify-button';
import { ComplianceBlock } from '../compliance-block';
import { WorksheetForm } from '../worksheet-form';

type Loc = 'de' | 'en';
const base = {
  labelEn: null, unit: null, isRequired: false, enumValues: null, validationRules: null, clauseReference: null,
  verificationStatus: 'engineer_verified', description: null,
};
const OPTS = [
  { value: 'a', label_de: 'A', label_en: 'A', order_index: 0 },
  { value: 'b', label_de: 'B', label_en: 'B', order_index: 1 },
];

function seed() {
  act(() => {
    useWorksheetStore.getState().init(
      'i',
      {
        fn: { type: 'number', value: 1.5 },
        fb: { type: 'boolean', value: true },
        fj: { type: 'json', value: ['a', 'custom1'] },
        ft: { type: 'text', value: 'x' },
      },
      {},
      {},
    );
  });
}
const df = (locale: Loc, field: Record<string, unknown>, props: Record<string, unknown> = {}) =>
  render(<DynamicField field={{ ...base, ...field } as never} locale={locale} projectId="p" standardCode="S" docs={[]} {...props} />);

describe('formatNumberLocale', () => {
  it('de is formatNumberDe unchanged; en uses the decimal point, thousands comma and Yes/No', () => {
    for (const v of [true, false, 1.5, 1234.5, 0.0016, 0.0000066, 0, null, 'PLT-HS-01']) {
      expect(formatNumberLocale(v, 'de')).toBe(formatNumberDe(v));
    }
    expect(formatNumberDe(1.5)).toBe('1,5');
    expect(formatNumberDe(true)).toBe('Ja');
    expect(formatNumberLocale(1.5, 'en')).toBe('1.5');
    expect(formatNumberLocale(1234.5, 'en')).toBe('1,234.5');
    expect(formatNumberLocale(0.0016, 'en')).toBe('0.0016');
    expect(formatNumberLocale(0.0000066, 'en')).toBe('6.6·10⁻⁶');
    expect(formatNumberLocale(true, 'en')).toBe('Yes');
    expect(formatNumberLocale(false, 'en')).toBe('No');
    expect(formatNumberLocale('PLT-HS-01', 'en')).toBe('PLT-HS-01');
  });
});

describe('DynamicField provenance chips + tooltips', () => {
  beforeEach(seed);

  it.each([
    ['de', 'Norm-Default', 'n = 1,5 m — Norm-Default. Bestätigen oder überschreiben.'],
    ['en', 'Standard default', 'n = 1.5 m — standard default. Confirm or overwrite.'],
  ] as const)('%s: standard default', (loc, chip, title) => {
    df(loc, { id: 'fn', symbol: 'n', labelDe: 'N', dataType: 'number', unit: 'm' }, { prefillSource: 'standard_default' });
    expect(screen.getByText(chip).getAttribute('title')).toBe(title);
  });

  it.each([
    ['de', 'Projekt-Standort', 'n = 1,5 aus Projekt-Standortprofil (Schlüssel: k1) — bestätigen oder überschreiben.'],
    ['en', 'Project site', 'n = 1.5 from the project site profile (key: k1) — confirm or overwrite.'],
  ] as const)('%s: site profile', (loc, chip, title) => {
    df(loc, { id: 'fn', symbol: 'n', labelDe: 'N', dataType: 'number' }, { prefillSource: 'site_profile', siteProfileKey: 'k1' });
    expect(screen.getByText(chip).getAttribute('title')).toBe(title);
  });

  it.each([
    ['de', 'b = Ja aus A-01 — klicken zum Springen, oder überschreiben durch Eingabe', 'Ja', 'Nein'],
    ['en', 'b = Yes from A-01 — click to jump there, or overwrite by typing', 'Yes', 'No'],
  ] as const)('%s: inherited tooltip + boolean toggle', (loc, title, yes, no) => {
    df(loc, { id: 'fb', symbol: 'b', labelDe: 'B', dataType: 'boolean' }, { inheritedFrom: 'A-01' });
    expect(screen.getByText('← A-01', { exact: false }).getAttribute('title')).toBe(title);
    expect(screen.getByRole('button', { name: yes })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: no })).toBeInTheDocument();
  });

  it.each([
    ['de', 'b = Ja vorbefüllt aus T-1 (b0) — bestätigen (Übernehmen) oder überschreiben.'],
    ['en', 'b = Yes prefilled from T-1 (b0) — confirm (Apply) or overwrite.'],
  ] as const)('%s: twin tooltip value', (loc, title) => {
    df(loc, { id: 'fb', symbol: 'b', labelDe: 'B', dataType: 'boolean' }, { prefillSource: 'twin', twinSource: { worksheetCode: 'T-1', symbol: 'b0' } });
    expect(screen.getByTestId('twin-prefill-badge').getAttribute('title')).toBe(title);
  });

  it.each([
    ['de', '✓ Kundenangabe', 'Kundenangabe: Wert wurde vom Kunden beigestellt, nicht von EKOWAI ermittelt — Haftungsausschluss für Eingabefehler gemäß AGB. Klicken zum Entfernen.', 'Kundenangabe', 'Als Kundenangabe markieren (Wert vom Kunden beigestellt, nicht von EKOWAI ermittelt)'],
    ['en', '✓ Client-supplied', 'Client-supplied: the value was provided by the client, not determined by EKOWAI — liability for input errors excluded per the terms (AGB). Click to remove.', 'Client-supplied', 'Mark as client-supplied (value provided by the client, not determined by EKOWAI)'],
  ] as const)('%s: client-supplied chip', (loc, onText, onTitle, offText, offTitle) => {
    const on = df(loc, { id: 'fn', symbol: 'n', labelDe: 'N', dataType: 'number' }, { clientSupplied: true });
    expect(screen.getByTestId('client-supplied-toggle').textContent).toBe(onText);
    expect(screen.getByTestId('client-supplied-toggle').getAttribute('title')).toBe(onTitle);
    on.unmount();
    df(loc, { id: 'fn', symbol: 'n', labelDe: 'N', dataType: 'number' }, { clientSupplied: false });
    expect(screen.getByTestId('client-supplied-toggle').textContent).toBe(offText);
    expect(screen.getByTestId('client-supplied-toggle').getAttribute('title')).toBe(offTitle);
  });
});

describe('DynamicField hints and inputs', () => {
  beforeEach(seed);

  it.each([
    ['de', '→ öffnen', 'Bereich: 0,5 – 1.000 m'],
    ['en', '→ open', 'Range: 0.5 – 1,000 m'],
  ] as const)('%s: computed-hint link + range hint', (loc, link, range) => {
    df(loc, { id: 'fn', symbol: 'n', labelDe: 'N', dataType: 'number', unit: 'm', validationRules: { min: 0.5, max: 1000 } }, { computedHint: { label: 'L', href: '/x' } });
    expect(within(screen.getByTestId('computed-hint')).getByRole('link').textContent).toBe(link);
    expect(screen.getByText(range)).toBeInTheDocument();
  });

  it.each([
    ['de', 'Herkunftsangabe erforderlich'],
    ['en', 'Source statement required'],
  ] as const)('%s: A_S,m provenance required', (loc, msg) => {
    const { container } = df(loc, { id: 'fp', symbol: 'a_s_m_provenance', labelDe: 'P', dataType: 'text' }, { asmMethod: 'manual' });
    expect(screen.getByText(msg)).toBeInTheDocument();
    expect(container.querySelector(`[title="${msg}"]`)).not.toBeNull();
  });

  it.each([
    ['de', 'Vorschläge aus dem Regelwerk — eigene Eingabe möglich'],
    ['en', 'Suggestions from the standard — own entry possible'],
  ] as const)('%s: text suggestions hint', (loc, msg) => {
    df(loc, { id: 'ft', symbol: 't', labelDe: 'T', dataType: 'text', enumValues: OPTS });
    expect(screen.getByTestId('text-suggestions-hint').textContent).toBe(msg);
  });

  it.each([
    ['de', 'Eigener Eintrag', 'Eigener Eintrag…', 'Hinzufügen', 'custom1 entfernen', 'Eigenen Eintrag entfernen'],
    ['en', 'Own entry', 'Own entry…', 'Add', 'Remove custom1', 'Remove own entry'],
  ] as const)('%s: extensible checklist', (loc, aria, placeholder, add, removeAria, removeTitle) => {
    df(loc, { id: 'fj', symbol: 'j', labelDe: 'J', dataType: 'json', enumValues: OPTS, validationRules: { extensible: true } });
    expect(screen.getByLabelText(aria).getAttribute('placeholder')).toBe(placeholder);
    expect(screen.getByRole('button', { name: add })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: removeAria }).getAttribute('title')).toBe(removeTitle);
  });

  it.each([
    ['de', 'Mehrzeilige Eingabe — Phase 2'],
    ['en', 'Multi-line input — Phase 2'],
  ] as const)('%s: json placeholder', (loc, msg) => {
    df(loc, { id: 'fj2', symbol: 'j2', labelDe: 'J2', dataType: 'json' });
    expect(screen.getByTitle(msg).textContent).toBe(msg);
  });

  it.each([
    ['de', 'Bereits in A: Ja; B: 1,5; C: 1.234,5 Übernehmen'],
    ['en', 'Already entered in A: Yes; B: 1.5; C: 1,234.5 Apply'],
  ] as const)('%s: same-symbol hint values in the viewer locale (review L-1)', (loc, text) => {
    df(loc, { id: 'ft', symbol: 't', labelDe: 'T', dataType: 'text' }, {
      sameSymbolHints: [{ worksheetCode: 'A', value: true }, { worksheetCode: 'B', value: 1.5 }, { worksheetCode: 'C', value: 1234.5 }],
    });
    expect(screen.getByTestId('same-symbol-hint').textContent).toBe(text);
  });
});

describe('VerifyButton (platform engineers)', () => {
  it.each([
    ['de', 'verified_against_standard', '✓ norm-verifiziert von Alvaro am 14.10.2026', 'Rückgängig'],
    ['de', 'corrected', '✓ korrigiert von Alvaro am 14.10.2026', 'Rückgängig'],
    ['de', 'engineer_verified', '✓ bestätigt von Alvaro am 14.10.2026', 'Rückgängig'],
    ['en', 'verified_against_standard', '✓ verified against the standard by Alvaro on 14/10/2026', 'Undo'],
    ['en', 'corrected', '✓ corrected by Alvaro on 14/10/2026', 'Undo'],
    ['en', 'engineer_verified', '✓ confirmed by Alvaro on 14/10/2026', 'Undo'],
  ] as const)('%s %s', (loc, status, line, undo) => {
    render(<VerifyButton target="field" id="x" status={status} verifiedByLabel="Alvaro" verifiedAt="2026-10-14T10:00:00Z" locale={loc} />);
    expect(screen.getByText(line)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: undo })).toBeInTheDocument();
  });

  it.each([
    ['de', '✓ Bestätigen', 'Diesen Eintrag gegen die Quellnorm bestätigen', 'Optionale Notiz (z.B. §5.4 Tab. B.1)', 'Verbatim-Zitat aus der Norm (SR-1) → norm-verifiziert', 'Bestätigen', 'Abbrechen'],
    ['en', '✓ Confirm', 'Confirm this entry against the source standard', 'Optional note (e.g. §5.4 Tab. B.1)', 'Verbatim quote from the standard (SR-1) → verified against the standard', 'Confirm', 'Cancel'],
  ] as const)('%s: unverified → note form', (loc, btn, title, notePh, quotePh, confirm, cancel) => {
    render(<VerifyButton target="field" id="x" status="imported_unverified" locale={loc} />);
    const b = screen.getByRole('button', { name: btn });
    expect(b.getAttribute('title')).toBe(title);
    fireEvent.click(b);
    expect(screen.getByPlaceholderText(notePh)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(quotePh)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: confirm })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: cancel })).toBeInTheDocument();
  });
});

describe('„Warum?" lines (explainCondition)', () => {
  const lookup = (s: string) => ({ x: 5, y: 0 } as Record<string, number>)[s];
  const leaves = (c: string, loc?: Loc) => {
    const e = explainCondition(c, lookup, loc);
    return e.kind === 'explained' ? e.leaves : [];
  };

  it('German stays the default and unchanged', () => {
    expect(leaves('x >= 10')[0]).toMatchObject({ actual: 'x = 5', required: 'erforderlich: >= 10', wouldPass: 'x auf mindestens 10 bringen' });
    expect(leaves('z >= 1')[0]).toMatchObject({ actual: 'z fehlt', required: 'erforderlich: >= 1' });
    expect(leaves('x IN {1, 2}')[0]).toMatchObject({ required: 'erforderlich: einer von {1, 2}', wouldPass: 'x auf einen zulässigen Wert setzen' });
    expect(leaves('z IS NOT NULL')[0]).toMatchObject({ required: 'erforderlich: Wert vorhanden', wouldPass: 'z erfassen/ausfüllen' });
    expect(leaves('IF y >= 1 THEN x >= 10')[0].text).toBe('Bedingung nicht anwendbar — Voraussetzung „y >= 1“ greift nicht');
    expect(leaves('x >= 10', 'de')).toEqual(leaves('x >= 10'));
  });

  it('English under EN', () => {
    expect(leaves('x >= 10', 'en')[0]).toMatchObject({ actual: 'x = 5', required: 'required: >= 10', wouldPass: 'raise x to at least 10' });
    expect(leaves('x <= 1', 'en')[0].wouldPass).toBe('lower x to at most 1');
    expect(leaves('x != 5', 'en')[0].wouldPass).toBe('choose x other than 5');
    expect(leaves('z >= 1', 'en')[0]).toMatchObject({ actual: 'z missing', required: 'required: >= 1' });
    expect(leaves('x IN {1, 2}', 'en')[0]).toMatchObject({ required: 'required: one of {1, 2}', wouldPass: 'set x to a permitted value' });
    expect(leaves('z IS NOT NULL', 'en')[0]).toMatchObject({ required: 'required: value present', wouldPass: 'enter/fill in z' });
    expect(leaves('IF y >= 1 THEN x >= 10', 'en')[0].text).toBe('Condition not applicable — precondition “y >= 1” is not met');
  });

  it('the compliance block renders the lines in the viewer locale', () => {
    act(() => { useWorksheetStore.getState().init('i', { fx: { type: 'number', value: 5 } }, {}, {}); });
    const req = { id: 'C', code: 'C', titleDe: 'C', titleEn: null, condition: 'x >= 10', description: null, clauseReference: null, severity: 'block', suggestion: null };
    const r = render(<ComplianceBlock requirements={[req]} suggestions={[]} fields={[{ id: 'fx', symbol: 'x' }]} locale="en" projectId="p" />);
    expect(screen.getByText('raise x to at least 10', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('required: >= 10')).toBeInTheDocument();
    r.unmount();
    render(<ComplianceBlock requirements={[req]} suggestions={[]} fields={[{ id: 'fx', symbol: 'x' }]} locale="de" projectId="p" />);
    expect(screen.getByText('x auf mindestens 10 bringen', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('erforderlich: >= 10')).toBeInTheDocument();
  });
});

describe('WorksheetForm: save indicator, orphan engine heading, VSME CO₂ hints', () => {
  const mk = (over: Record<string, unknown>) => ({
    ...base, sectionId: null, orderIndex: 0, active: true, widget: null, uiConfig: null, lookup: null, visibleWhen: null, dataType: 'number' as const, ...over,
  });
  const props = (locale: Loc) => ({
    locale,
    projectId: 'p',
    worksheet: { template: { code: 'B03', titleDe: 'CO2', titleEn: null } },
    instance: { id: 'inst-f', status: 'draft' as const },
    sections: [],
    fields: [
      mk({ id: 'g1', symbol: 'GrossScope1GreenhouseGasEmissions', labelDe: 'Scope 1' }),
      mk({ id: 'g2', symbol: 'GrossLocationBasedScope2GreenhouseGasEmissions', labelDe: 'Scope 2', orderIndex: 1 }),
      mk({ id: 'ga', symbol: 'a', labelDe: 'a', orderIndex: 2 }),
    ],
    equations: [{ id: 'eq-o', equationNumber: '1', formula: 'r = a + 1', inputSymbols: ['a'], outputSymbol: 'r', clauseReference: null, description: null, verificationStatus: 'engineer_verified', orderIndex: 0 }],
    complianceRequirements: [],
    complianceSuggestions: [],
    initialValues: { ga: { type: 'number' as const, value: 2 } },
    initialSources: {},
    initialCitations: {},
    sameSymbolValuesBySymbol: {},
    inheritedFromBySymbol: {},
    standardCode: 'VSME',
    docs: [],
    serverComputedFieldIds: ['g1'],
  });

  beforeEach(() => {
    act(() => { useWorksheetStore.getState().init('reset', {}, {}, {}); });
  });

  it.each([
    ['de', ['Wird gespeichert…', 'Gespeichert ✓', '✗ Speichern fehlgeschlagen'], 'Engine-Auswertung (kein Zielfeld)',
      'Automatisch berechnet aus den CO₂-Aktivitätslinien.', 'Dieses Feld berechnet der CO₂-Rechner aus den erfassten Aktivitäten.', '→ CO₂-Rechner öffnen'],
    ['en', ['Saving…', 'Saved ✓', '✗ Save failed'], 'Engine evaluation (no target field)',
      'Calculated automatically from the CO₂ activity lines.', 'The CO₂ calculator computes this field from the recorded activities.', '→ open the CO₂ calculator'],
  ] as const)('%s', (loc, saves, orphan, serverHint, clientHint, link) => {
    render(<WorksheetForm {...(props(loc) as unknown as Parameters<typeof WorksheetForm>[0])} />);
    expect(screen.getByText(orphan)).toBeInTheDocument();
    const hints = screen.getAllByTestId('computed-hint').map((h) => h.textContent);
    expect(hints).toEqual([`${serverHint} ${link}`, `${clientHint} ${link}`]);
    const header = document.querySelector('header') as HTMLElement;
    const states = ['saving', 'saved', 'error'] as const;
    states.forEach((st, i) => {
      act(() => { useWorksheetStore.setState({ saveStatus: st }); });
      expect(header.textContent).toContain(saves[i]);
    });
  });
});
