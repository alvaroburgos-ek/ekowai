import { describe, expect, it } from 'vitest';
import { resolveComplianceWorksheet } from '../_pass3c-compliance-host';

const WS = [
  { worksheet_code: 'VSME-B01.000', phase: 1 },
  { worksheet_code: 'VSME-B03.200', phase: 1 },
  { worksheet_code: 'VSME-B06.000', phase: 1 },
];

describe('resolveComplianceWorksheet', () => {
  it('explicit worksheet_code wins over phase', () => {
    expect(
      resolveComplianceWorksheet({ worksheet_code: 'VSME-B03.200', phase: 1 }, WS),
    ).toEqual({ worksheet_code: 'VSME-B03.200', via: 'explicit' });
  });

  it('absent worksheet_code reproduces the phase fallback exactly (first array match)', () => {
    expect(
      resolveComplianceWorksheet({ worksheet_code: null, phase: 1 }, WS),
    ).toEqual({ worksheet_code: 'VSME-B01.000', via: 'phase' });
  });

  it('null phase falls back to first phase-1 worksheet', () => {
    expect(
      resolveComplianceWorksheet({ worksheet_code: null, phase: null }, WS),
    ).toEqual({ worksheet_code: 'VSME-B01.000', via: 'first_phase1' });
  });

  it('unknown explicit worksheet_code throws — never silently falls back', () => {
    expect(() =>
      resolveComplianceWorksheet({ worksheet_code: 'VSME-B99.999', phase: 1 }, WS),
    ).toThrow(/unknown worksheet_code/);
  });

  it('empty-string worksheet_code is treated as absent', () => {
    expect(
      resolveComplianceWorksheet({ worksheet_code: '', phase: 1 }, WS).via,
    ).toBe('phase');
  });
});
