import { describe, it, expect } from 'vitest';
import { compareSameSymbolEntries, type SameSymbolEntry } from '../worksheet';

/**
 * §10c (E1-C) — loadSameSymbolValues is a deliberately cross-standard render-path
 * resolver (project_standards stage_order + ancestor chain). Blind join-scoping
 * would break parent/child inheritance; the correct fix is a current-standard-first
 * tiebreak so a FOREIGN guideline reusing a symbol can't leak via an earlier stage.
 */
const base = { worksheetCode: 'ws', value: 1, dataType: 'number', updatedAt: null as Date | null };

describe('§10c same-symbol precedence — current-standard-first tiebreak', () => {
  it('current-standard field WINS over a foreign standard with an EARLIER stage (the leak the fix prevents)', () => {
    const current: SameSymbolEntry = { ...base, sourceStageOrder: 2, isFromAncestor: false, isFromCurrentStandard: true };
    const foreignEarlier: SameSymbolEntry = { ...base, sourceStageOrder: 1, isFromAncestor: false, isFromCurrentStandard: false };

    const scoped = [foreignEarlier, current].sort(compareSameSymbolEntries);
    expect(scoped[0]).toBe(current); // current wins despite the worse stage

    // PRE-FIX (stage-only precedence): the foreign standard (stage 1) would win → leak.
    const stageOnly = [foreignEarlier, current].sort((a, b) => (a.sourceStageOrder! - b.sourceStageOrder!));
    expect(stageOnly[0]).toBe(foreignEarlier);
  });

  it('ancestor inheritance PRESERVED: with no current-standard field, ancestor beats non-ancestor', () => {
    const ancestor: SameSymbolEntry = { ...base, sourceStageOrder: 3, isFromAncestor: true, isFromCurrentStandard: false };
    const nonAncestor: SameSymbolEntry = { ...base, sourceStageOrder: 1, isFromAncestor: false, isFromCurrentStandard: false };
    const sorted = [nonAncestor, ancestor].sort(compareSameSymbolEntries);
    expect(sorted[0]).toBe(ancestor);
  });

  it('no-op for single-standard: all current-standard → falls through to stage then recency', () => {
    const early: SameSymbolEntry = { ...base, sourceStageOrder: 1, isFromAncestor: false, isFromCurrentStandard: true };
    const late: SameSymbolEntry = { ...base, sourceStageOrder: 2, isFromAncestor: false, isFromCurrentStandard: true };
    const sorted = [late, early].sort(compareSameSymbolEntries);
    expect(sorted[0]).toBe(early); // earliest stage wins among same-standard fields (unchanged)
  });
});
