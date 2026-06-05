import { describe, it, expect } from 'vitest';
import { computeProjectVerdict } from '../project-verdict';

describe('computeProjectVerdict', () => {
  it('compliant when all block reqs pass and no deviations', () => {
    expect(computeProjectVerdict({ blockFailingCodes: [], deviatedCodes: [] })).toBe('compliant');
  });
  it('compliant_with_documented_deviations when every failing block is deviated and >=1 deviation', () => {
    expect(computeProjectVerdict({ blockFailingCodes: ['REQ-03'], deviatedCodes: ['REQ-03'] })).toBe('compliant_with_documented_deviations');
  });
  it('non_compliant when a failing block has no deviation', () => {
    expect(computeProjectVerdict({ blockFailingCodes: ['REQ-03','REQ-04'], deviatedCodes: ['REQ-03'] })).toBe('non_compliant');
  });
  it('compliant_with_documented_deviations even if a deviation exists for a non-failing code, as long as no failing is uncovered', () => {
    expect(computeProjectVerdict({ blockFailingCodes: [], deviatedCodes: ['REQ-09'] })).toBe('compliant_with_documented_deviations');
  });
});
