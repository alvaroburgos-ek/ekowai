/**
 * The equations block must show each equation's real verification status.
 * It used to print the literal "imported_unverified" for every status other
 * than engineer_verified, so equations verified against the standard (SR-1)
 * were shown to the reader as unverified.
 */
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/actions/verification', () => ({}));
vi.mock('../verify-button', () => ({ VerifyButton: () => null }));
import { render, screen } from '@testing-library/react';
import { EquationsBlock } from '../equations-block';

const eq = (id: string, verificationStatus: string) => ({
  id,
  equationNumber: id,
  formula: 'A_C = A_E \\cdot C_m',
  inputSymbols: null,
  outputSymbol: null,
  clauseReference: null,
  description: null,
  verificationStatus,
});

describe('EquationsBlock verification label', () => {
  it('shows verified_against_standard as verified, never as imported_unverified', () => {
    render(<EquationsBlock isPlatformEngineer equations={[eq('1', 'verified_against_standard')]} />);
    expect(screen.queryByText('imported_unverified')).toBeNull();
    expect(screen.queryByText('Quelle ungeprüft')).toBeNull();
    expect(screen.getByText('Quelle bestätigt')).toBeTruthy();
  });

  it('shows an unverified equation as unverified', () => {
    render(<EquationsBlock isPlatformEngineer equations={[eq('2', 'imported_unverified')]} />);
    expect(screen.getByText('Quelle ungeprüft')).toBeTruthy();
  });

  it('labels each status on its own row', () => {
    render(
      <EquationsBlock
        isPlatformEngineer
        equations={[eq('3', 'verified_against_standard'), eq('4', 'corrected'), eq('5', 'disputed')]}
      />,
    );
    expect(screen.getByText('Quelle bestätigt')).toBeTruthy();
    expect(screen.getByText('Korrigiert')).toBeTruthy();
    expect(screen.getByText('Strittig')).toBeTruthy();
    expect(screen.queryByText('imported_unverified')).toBeNull();
  });
});

describe('EquationsBlock verification badge — platform engineers only (U-8)', () => {
  it('a non-platform engineer sees no badge; the status is the hover title of the equation number', () => {
    render(<EquationsBlock equations={[eq('6', 'imported_unverified')]} />);
    expect(screen.queryByText('Quelle ungeprüft')).toBeNull();
    expect(screen.getByText('Gl. 6').getAttribute('title')).toMatch(/^Quelle ungeprüft — /);
  });

  it('with a clause reference the status moves to the clause chip title', () => {
    render(<EquationsBlock equations={[{ ...eq('7', 'imported_unverified'), clauseReference: '§ 5.3' }]} />);
    expect(screen.queryByText('Quelle ungeprüft')).toBeNull();
    expect(screen.getByText('§ 5.3').getAttribute('title')).toMatch(/^Quelle ungeprüft — /);
  });

  it('engineer_verified carries no status title', () => {
    render(<EquationsBlock equations={[eq('8', 'engineer_verified')]} />);
    expect(screen.getByText('Gl. 8').getAttribute('title')).toBeNull();
  });
});
