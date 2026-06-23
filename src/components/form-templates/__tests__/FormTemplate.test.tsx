/**
 * Tests for the source-form template layer (detection PHASE 2).
 *
 * Verifies each FORM_TEMPLATE spec renders in SOURCE order with grouping, the
 * sign-off block, repeating grids, gap markers for unencoded fields (anti-
 * fabrication), and the informative/non-gating banner where applicable.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FormTemplate } from '../FormTemplate';
import { atvA704eIqcCard8, iso14019Table_G1, iso5667_6AnnexB } from '../specs';
import type { FormTemplateSpec } from '../types';

function sectionTitles(): string[] {
  return screen.getAllByTestId('section').map((s) => s.querySelector('h3')?.textContent ?? '');
}

describe('FormTemplate — generic invariants', () => {
  const specs: FormTemplateSpec[] = [atvA704eIqcCard8, iso14019Table_G1, iso5667_6AnnexB];
  it('renders title, source location, and sections in source order for every spec', () => {
    for (const spec of specs) {
      const { unmount } = render(<FormTemplate spec={spec} />);
      expect(screen.getByRole('heading', { level: 2, name: spec.title })).toBeInTheDocument();
      expect(screen.getByTestId('source-location').textContent).toContain(spec.sourceLocation);
      expect(sectionTitles()).toEqual(spec.sections.map((s) => s.title));
      unmount();
    }
  });

  it('every field with encodedSymbol===null renders a gap marker (no silent fabrication)', () => {
    for (const spec of specs) {
      const { unmount } = render(<FormTemplate spec={spec} />);
      // count flat null fields (grids use "*" markers, asserted separately)
      const flatNull = spec.sections
        .flatMap((s) => s.fields ?? [])
        .filter((f) => f.encodedSymbol === null).length
        + (spec.signoff ?? []).filter((f) => f.encodedSymbol === null).length;
      const markers = screen.queryAllByTestId('gap-marker').length;
      expect(markers).toBeGreaterThanOrEqual(flatNull > 0 ? 1 : 0);
      if (flatNull > 0) expect(markers).toBe(flatNull);
      unmount();
    }
  });
});

describe('ATV-A-704E — IGC-Card 8 sampling log', () => {
  it('renders the source section order incl. the on-site grid', () => {
    render(<FormTemplate spec={atvA704eIqcCard8} />);
    expect(sectionTitles()).toEqual([
      'Information on the sampling',
      'Method of sampling',
      'Sample count & handling',
      'On-site assessment / measurements',
    ]);
  });
  it('renders the on-site repeating grid with parameter rows (pH, conductivity)', () => {
    render(<FormTemplate spec={atvA704eIqcCard8} />);
    expect(screen.getByTestId('repeating-grid')).toBeInTheDocument();
    expect(screen.getByText(/pH value/)).toBeInTheDocument();
    expect(screen.getByText(/Conductivity at 20\.0 °C/)).toBeInTheDocument();
  });
  it('has a sign-off block with the signature line', () => {
    render(<FormTemplate spec={atvA704eIqcCard8} />);
    expect(screen.getByTestId('signoff')).toBeInTheDocument();
    expect(screen.getByText('Sampling carried out by')).toBeInTheDocument();
  });
  it('is NOT marked informative (it is a normative sampling log)', () => {
    render(<FormTemplate spec={atvA704eIqcCard8} />);
    expect(screen.queryByTestId('informative-banner')).not.toBeInTheDocument();
  });
  it('surfaces unencoded fields as gaps (header + grid not captured)', () => {
    render(<FormTemplate spec={atvA704eIqcCard8} />);
    expect(screen.getAllByTestId('gap-marker').length).toBeGreaterThan(0);
    expect(screen.getByText('Number of samples taken:')).toBeInTheDocument();
  });
});

describe('ISO-14019-1 — Table G.1 AUP report content', () => {
  it('is marked informative / non-gating', () => {
    render(<FormTemplate spec={iso14019Table_G1} />);
    const banner = screen.getByTestId('informative-banner');
    expect(banner).toHaveAttribute('role', 'note');
    expect(banner.textContent?.toLowerCase()).toContain('does not gate');
  });
  it('renders the seven Table G.1 element groups in source order', () => {
    render(<FormTemplate spec={iso14019Table_G1} />);
    expect(sectionTitles()).toEqual([
      'Title',
      'Content and roles',
      'Methodology',
      'Procedures and results',
      'Caveats to the methodology',
      'Caveats to the AUP report',
    ]);
  });
  it('has the Body sign-off block (date, address, signature)', () => {
    render(<FormTemplate spec={iso14019Table_G1} />);
    const signoff = screen.getByTestId('signoff');
    expect(within(signoff).getByText('Date of the report:')).toBeInTheDocument();
    expect(within(signoff).getByText(/Body's address/)).toBeInTheDocument();
    expect(within(signoff).getByText(/Body's signature/)).toBeInTheDocument();
  });
});

describe('ISO-5667-6 — Annex B sampling form', () => {
  it('renders checkbox option groups (e.g. Color options as checkboxes)', () => {
    render(<FormTemplate spec={iso5667_6AnnexB} />);
    expect(screen.getByRole('checkbox', { name: 'café' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'verde-azul' })).toBeInTheDocument();
  });
  it('renders the Tabla B.2 preservation log as a repeating grid', () => {
    render(<FormTemplate spec={iso5667_6AnnexB} />);
    expect(screen.getByTestId('repeating-grid')).toBeInTheDocument();
    expect(screen.getByText(/Pre-tratamiento/)).toBeInTheDocument();
  });
  it('cites Anexo B and has the Fecha/firma sign-off', () => {
    render(<FormTemplate spec={iso5667_6AnnexB} />);
    expect(screen.getByTestId('source-location').textContent).toContain('Anexo B');
    expect(screen.getByText('Fecha / firma')).toBeInTheDocument();
  });
});
