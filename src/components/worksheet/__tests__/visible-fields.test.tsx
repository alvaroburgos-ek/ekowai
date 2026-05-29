/**
 * Verifies the deprecated-fields hiding contract.
 *
 * Pile-2 set active=false on four DWA-A 138-1 fields with no source basis
 * and no code consumer. The form must filter them out of rendering while
 * keeping them in the engine's input pool (so saved values aren't lost
 * and dependent equations still fail loud if they reference the symbol).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { visibleFields } from '../visible-fields';

type Field = {
  id: string;
  symbol: string;
  labelDe: string;
  active: boolean;
};

const FIXTURE_A138_11: Field[] = [
  { id: 'f1', symbol: 'a138_k_f_design', labelDe: 'Bemessungs-k_f', active: true },
  { id: 'f2', symbol: 'a138_k_f_min', labelDe: 'Minimum k_f', active: true },
  { id: 'f3', symbol: 'a138_k_f_geo', labelDe: 'Geometrisches Mittel k_f', active: false },
  { id: 'f4', symbol: 'a138_korrekturfaktor', labelDe: 'Korrekturfaktor Schichtung', active: false },
];

const FIXTURE_A138_13: Field[] = [
  { id: 'g1', symbol: 'a138_bemessung_bestanden', labelDe: 'Bemessung bestanden', active: true },
  { id: 'g2', symbol: 'a138_V_Sp_erforderlich', labelDe: 'V_Sp erforderlich', active: true },
  { id: 'g3', symbol: 'a138_speichertyp', labelDe: 'Speichertyp', active: false },
];

const FIXTURE_A138_16: Field[] = [
  { id: 'h1', symbol: 'a138_A_s_dim', labelDe: 'A_S Bemessungsfläche', active: true },
  { id: 'h2', symbol: 'a138_A_s_erf', labelDe: 'A_S erforderlich', active: true },
  { id: 'h3', symbol: 'a138_A_u', labelDe: 'A_u', active: false },
];

describe('visibleFields() — pure filter', () => {
  it('keeps active fields, drops active=false', () => {
    const out = visibleFields(FIXTURE_A138_11);
    expect(out.map((f) => f.symbol)).toEqual(['a138_k_f_design', 'a138_k_f_min']);
  });

  it('A138-11: removes the two Pile-2 deprecations (k_f_geo, korrekturfaktor)', () => {
    const out = visibleFields(FIXTURE_A138_11).map((f) => f.symbol);
    expect(out).not.toContain('a138_k_f_geo');
    expect(out).not.toContain('a138_korrekturfaktor');
  });

  it('A138-13: removes a138_speichertyp', () => {
    const out = visibleFields(FIXTURE_A138_13).map((f) => f.symbol);
    expect(out).not.toContain('a138_speichertyp');
  });

  it('A138-16: removes a138_A_u', () => {
    const out = visibleFields(FIXTURE_A138_16).map((f) => f.symbol);
    expect(out).not.toContain('a138_A_u');
  });

  it('returns a new array — does not mutate the input', () => {
    const input = [...FIXTURE_A138_11];
    visibleFields(input);
    expect(input.map((f) => f.symbol)).toEqual(FIXTURE_A138_11.map((f) => f.symbol));
  });
});

// ---- DOM render assertion --------------------------------------------------
// Renders a tiny component that mirrors the form's render path:
//   visibleFields(fields).map(f => <li>{f.labelDe}</li>)
// and asserts the active=false rows do not appear in the DOM.
function FieldsList({ fields }: { fields: Field[] }) {
  return (
    <ul>
      {visibleFields(fields).map((f) => (
        <li key={f.id} data-symbol={f.symbol}>
          {f.labelDe}
        </li>
      ))}
    </ul>
  );
}

describe('Worksheet form render path — active=false hidden', () => {
  it('renders only active fields from the A138-11 fixture', () => {
    render(<FieldsList fields={FIXTURE_A138_11} />);
    // Active fields appear
    expect(screen.getByText('Bemessungs-k_f')).toBeInTheDocument();
    expect(screen.getByText('Minimum k_f')).toBeInTheDocument();
    // Deprecated fields do NOT appear
    expect(screen.queryByText('Geometrisches Mittel k_f')).not.toBeInTheDocument();
    expect(screen.queryByText('Korrekturfaktor Schichtung')).not.toBeInTheDocument();
    // Symbol attribute confirms the right rows landed (defensive)
    expect(document.querySelector('[data-symbol="a138_k_f_geo"]')).toBeNull();
    expect(document.querySelector('[data-symbol="a138_korrekturfaktor"]')).toBeNull();
  });

  it('renders only active fields from the A138-13 fixture', () => {
    render(<FieldsList fields={FIXTURE_A138_13} />);
    expect(screen.getByText('Bemessung bestanden')).toBeInTheDocument();
    expect(screen.queryByText('Speichertyp')).not.toBeInTheDocument();
    expect(document.querySelector('[data-symbol="a138_speichertyp"]')).toBeNull();
  });

  it('renders only active fields from the A138-16 fixture', () => {
    render(<FieldsList fields={FIXTURE_A138_16} />);
    expect(screen.getByText('A_S Bemessungsfläche')).toBeInTheDocument();
    expect(screen.queryByText('A_u')).not.toBeInTheDocument();
    expect(document.querySelector('[data-symbol="a138_A_u"]')).toBeNull();
  });

  it('an empty fields list renders an empty list (no crash)', () => {
    render(<FieldsList fields={[]} />);
    expect(document.querySelectorAll('li')).toHaveLength(0);
  });
});
