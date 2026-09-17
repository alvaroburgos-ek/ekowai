/**
 * Plan 2a, Task 11 — `not_applicable` in the PDF surfaces.
 *
 *   - worksheet-section `badgeFor`: `– n.a.` (open style, never the pass style)
 *   - Prüfmemo `summarizeCompliance`: N.A. is counted separately — neither
 *     "erfüllt" nor "offen/manuell".
 */
import { describe, it, expect } from 'vitest';
import { badgeFor } from '../worksheet-section';
import { summarizeCompliance } from '../pruefmemo-document';

const req = (kind: 'pass' | 'fail' | 'pending' | 'manual' | 'not_applicable') =>
  ({
    result:
      kind === 'pending'
        ? { kind, missingSymbols: ['x'] }
        : kind === 'not_applicable'
          ? { kind, hiddenSymbols: ['x'] }
          : { kind },
  }) as Parameters<typeof badgeFor>[0];

describe('PDF worksheet-section badgeFor', () => {
  it('not_applicable ⇒ "– n.a." with the open (not pass) style', () => {
    const na = badgeFor(req('not_applicable'));
    expect(na.label).toBe('– n.a.');
    expect(na.style).toBe(badgeFor(req('pending')).style);
    expect(na.style).not.toBe(badgeFor(req('pass')).style);
  });
});

describe('Prüfmemo summarizeCompliance', () => {
  it('counts N.A. separately from passed and open', () => {
    const s = summarizeCompliance([
      req('pass'), req('pass'), req('fail'), req('pending'), req('manual'), req('not_applicable'),
    ] as Parameters<typeof summarizeCompliance>[0]);
    expect(s.total).toBe(6);
    expect(s.passed).toBe(2);
    expect(s.failed.length).toBe(1);
    expect(s.open).toBe(2);
    expect(s.notApplicable).toBe(1);
  });
});
