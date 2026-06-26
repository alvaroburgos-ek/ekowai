import { describe, it, expect } from 'vitest';
import { isWorksheetEditable } from '@/lib/state-machine';

// The saveWorksheet + citations write-lock guards refuse writes whenever the
// worksheet is not editable. This pins the predicate they share (the full
// saveWorksheet DB round-trip is exercised by the integration project).
describe('worksheet write-lock predicate (shared by saveWorksheet + citations guards)', () => {
  it('allows writes only in draft / submitted_for_review', () => {
    expect(isWorksheetEditable('draft')).toBe(true);
    expect(isWorksheetEditable('submitted_for_review')).toBe(true);
  });
  it('locks engineer_approved, final, deactivated', () => {
    expect(isWorksheetEditable('engineer_approved')).toBe(false);
    expect(isWorksheetEditable('final')).toBe(false);
    expect(isWorksheetEditable('deactivated')).toBe(false);
  });
});
