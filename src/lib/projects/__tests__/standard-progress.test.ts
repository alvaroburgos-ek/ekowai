import { describe, it, expect } from 'vitest';
import { summarizeStandardProgress, type ProgressWorksheet } from '../standard-progress';

const w = (o: Partial<ProgressWorksheet> & { code: string }): ProgressWorksheet => ({
  titleDe: `Blatt ${o.code}`,
  status: 'draft',
  totalRequired: 3,
  filledRequired: 0,
  ...o,
});

describe('summarizeStandardProgress', () => {
  it('counts statuses, treats deactivated as not applicable and excludes it from the denominator', () => {
    const s = summarizeStandardProgress([
      w({ code: 'X-01', status: 'final' }),
      w({ code: 'X-02', status: 'engineer_approved' }),
      w({ code: 'X-03', status: 'deactivated' }),
      w({ code: 'X-04', status: 'draft', filledRequired: 1 }),
      w({ code: 'X-05', status: null }),
    ]);
    expect(s.approved).toBe(2);
    expect(s.notApplicable).toBe(1);
    expect(s.applicable).toBe(4);
    expect(s.open).toBe(2);
    expect(s.declarationReady).toBe(false);
  });

  it('names the next worksheet in order that is not yet approved or not applicable', () => {
    const s = summarizeStandardProgress([
      w({ code: 'X-01', status: 'final' }),
      w({ code: 'X-02', status: 'deactivated' }),
      w({ code: 'X-03', status: 'submitted_for_review' }),
      w({ code: 'X-04', status: 'draft' }),
    ]);
    expect(s.next?.code).toBe('X-03');
    expect(s.next?.reason).toBe('in_review');
  });

  it('next step on a draft names the missing required fields count', () => {
    const s = summarizeStandardProgress([w({ code: 'X-01', status: 'draft', totalRequired: 5, filledRequired: 2 })]);
    expect(s.next).toEqual({ code: 'X-01', titleDe: 'Blatt X-01', reason: 'fill', missingRequired: 3 });
  });

  it('a draft with all required fields filled is ready to submit', () => {
    const s = summarizeStandardProgress([w({ code: 'X-01', status: 'draft', totalRequired: 2, filledRequired: 2 })]);
    expect(s.next?.reason).toBe('submit');
  });

  it('declaration is ready when every applicable worksheet is approved or final', () => {
    const s = summarizeStandardProgress([
      w({ code: 'X-01', status: 'final' }),
      w({ code: 'X-02', status: 'deactivated' }),
      w({ code: 'X-03', status: 'engineer_approved' }),
    ]);
    expect(s.declarationReady).toBe(true);
    expect(s.next).toBeNull();
  });

  it('all worksheets not applicable → nothing to declare', () => {
    const s = summarizeStandardProgress([w({ code: 'X-01', status: 'deactivated' })]);
    expect(s.applicable).toBe(0);
    expect(s.declarationReady).toBe(false);
  });
});
