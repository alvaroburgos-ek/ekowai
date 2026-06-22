import { describe, it, expect } from 'vitest';
import {
  VERIFICATION_STATUSES,
  DONE_STATES,
  DEFAULT_STATUS,
  VERIFIED,
  isDone,
} from '../status';

describe('verification status vocabulary', () => {
  it('enumerates exactly the six canonical states', () => {
    expect([...VERIFICATION_STATUSES].sort()).toEqual(
      [
        'derived_from_structural_mapping',
        'imported_unverified',
        'inferred_from_worksheet',
        'needs_engineer_review',
        'verified_against_standard',
        'verified_via_cross_reference',
      ].sort(),
    );
  });

  it('does not contain the retired engineer_verified value', () => {
    expect(VERIFICATION_STATUSES).not.toContain('engineer_verified');
  });

  it('counts only the two verified_* states as done', () => {
    expect(isDone('verified_against_standard')).toBe(true);
    expect(isDone('verified_via_cross_reference')).toBe(true);
    expect(isDone('needs_engineer_review')).toBe(false);
    expect(isDone('imported_unverified')).toBe(false);
    expect(isDone('derived_from_structural_mapping')).toBe(false);
    expect(isDone('inferred_from_worksheet')).toBe(false);
    expect(isDone('engineer_verified')).toBe(false);
  });

  it('exposes sane defaults', () => {
    expect(DEFAULT_STATUS).toBe('imported_unverified');
    expect(VERIFIED).toBe('verified_against_standard');
    expect(DONE_STATES.has(VERIFIED)).toBe(true);
  });
});
