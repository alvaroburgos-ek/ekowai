/**
 * Tests for the read-only source-form reference panel (worksheet wiring).
 *
 * The panel is a presentational, NON-GATING reference shown alongside the
 * worksheet form. It must:
 *  - render nothing for standards that have no source FORM_TEMPLATE,
 *  - render the FORM_TEMPLATE(s) for standards that do (keyed by exact code),
 *  - stay collapsed by default (reference, not the primary input surface),
 *  - preserve GAP markers (never hide / fabricate unencoded fields),
 *  - keep the informative / non-gating banner for informative layouts,
 *  - localize only its own chrome (de/en), leaving source labels verbatim.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SourceFormReferencePanel } from '../SourceFormReferencePanel';

describe('SourceFormReferencePanel', () => {
  it('renders nothing for a standard with no source form template', () => {
    const { container } = render(
      <SourceFormReferencePanel standardCode="DWA-A-138-1" locale="de" />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('source-form-reference-panel')).not.toBeInTheDocument();
  });

  it('renders the panel for a standard that ships a FORM_TEMPLATE (ATV-A-704E)', () => {
    render(<SourceFormReferencePanel standardCode="ATV-A-704E" locale="en" />);
    const panel = screen.getByTestId('source-form-reference-panel');
    expect(panel).toBeInTheDocument();
    // the actual template renders inside
    expect(within(panel).getByTestId('form-template')).toBeInTheDocument();
    expect(
      within(panel).getByRole('heading', { level: 2, name: /IGC-Card 8|sampling|Probenahme/i }),
    ).toBeInTheDocument();
  });

  it('is collapsed by default (details element, not open)', () => {
    const { container } = render(
      <SourceFormReferencePanel standardCode="ATV-A-704E" locale="en" />,
    );
    const details = container.querySelector('details');
    expect(details).toBeInTheDocument();
    expect(details).not.toHaveAttribute('open');
  });

  it('preserves GAP markers for ATV-A-704E (unencoded fields surfaced, not hidden)', () => {
    render(<SourceFormReferencePanel standardCode="ATV-A-704E" locale="en" />);
    expect(screen.getAllByTestId('gap-marker').length).toBeGreaterThan(0);
  });

  it('keeps the informative / non-gating banner for ISO-14019-1', () => {
    render(<SourceFormReferencePanel standardCode="ISO-14019-1" locale="en" />);
    const banner = screen.getByTestId('informative-banner');
    expect(banner).toHaveAttribute('role', 'note');
    expect(banner.textContent?.toLowerCase()).toContain('does not gate');
  });

  it('renders the Spanish source labels verbatim for ISO-5667-6', () => {
    render(<SourceFormReferencePanel standardCode="ISO-5667-6" locale="de" />);
    expect(screen.getByTestId('source-form-reference-panel')).toBeInTheDocument();
    // source label stays in its source language regardless of UI locale
    expect(screen.getByText(/Nombre del río/)).toBeInTheDocument();
  });

  it('localizes its own chrome: English summary for locale en', () => {
    render(<SourceFormReferencePanel standardCode="ATV-A-704E" locale="en" />);
    const summary = screen.getByTestId('source-form-reference-summary');
    expect(summary.textContent).toMatch(/source form reference/i);
  });

  it('localizes its own chrome: German summary for locale de', () => {
    render(<SourceFormReferencePanel standardCode="ATV-A-704E" locale="de" />);
    const summary = screen.getByTestId('source-form-reference-summary');
    expect(summary.textContent).toMatch(/Quellformular/i);
  });

  it('marks itself read-only / non-gating in its description', () => {
    render(<SourceFormReferencePanel standardCode="ATV-A-704E" locale="en" />);
    const panel = screen.getByTestId('source-form-reference-panel');
    expect(panel.textContent?.toLowerCase()).toMatch(/read-only|reference only/);
  });
});
