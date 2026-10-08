/** U-5 (UX pass 820, 2026-10-08): pure helpers behind the „keine Fragen" notice. */
import { describe, it, expect } from 'vitest';
import { allOwnFieldsHidden, hiddenSheetDrivers } from '../hidden-drivers';

const f = (id: string, symbol: string, over: Record<string, unknown> = {}) => ({
  id, symbol, sectionId: null as string | null, visibleWhen: null as string | null, active: true, ...over,
});

describe('allOwnFieldsHidden', () => {
  it('true only when ≥1 active own field and every active one is hidden; inactive fields ignored', () => {
    expect(allOwnFieldsHidden([f('a', 'a'), f('b', 'b', { active: false })], new Set(['a']))).toBe(true);
    expect(allOwnFieldsHidden([f('a', 'a'), f('b', 'b')], new Set(['a']))).toBe(false);
    expect(allOwnFieldsHidden([], new Set())).toBe(false);
    expect(allOwnFieldsHidden([f('b', 'b', { active: false })], new Set())).toBe(false);
  });
});

describe('hiddenSheetDrivers', () => {
  it('distinct driver symbols from field and hidden-section rules, enum tokens / keywords excluded, hidden own symbols skipped', () => {
    const fields = [
      f('a', 'a', { visibleWhen: "procurement_procedure != 'direktvergabe' AND lot_count > 1" }),
      f('b', 'b', { visibleWhen: 'procurement_procedure IN {offen, nicht_offen}' }),
      f('c', 'c', { sectionId: 's2' }),
      f('d', 'd', { visibleWhen: 'a IS NOT NULL' }), // driver `a` is itself hidden here ⇒ skipped
    ];
    const sections = [
      { id: 's1', parentSectionId: null, visibleWhen: 'framework_agreement == true' },
      { id: 's2', parentSectionId: 's1', visibleWhen: null },
    ];
    const vis = { hiddenFieldIds: new Set(['a', 'b', 'c', 'd']), hiddenSectionIds: new Set(['s1', 's2']), hiddenSymbols: new Set(['a', 'b', 'c', 'd']) };
    expect(hiddenSheetDrivers(fields, sections, vis)).toEqual(['procurement_procedure', 'lot_count', 'framework_agreement']);
  });

  it('caps at max (default 5) and ignores visible / inactive fields and unparseable rules', () => {
    const fields = [
      f('a', 'a', { visibleWhen: 'p1 == 1 AND p2 == 1 AND p3 == 1 AND p4 == 1 AND p5 == 1 AND p6 == 1' }),
      f('v', 'v', { visibleWhen: 'q == 1' }), // not hidden
      f('i', 'i', { visibleWhen: 'r == 1', active: false }),
      f('u', 'u', { visibleWhen: '((( not parseable' }),
    ];
    const vis = { hiddenFieldIds: new Set(['a', 'i', 'u']), hiddenSectionIds: new Set<string>(), hiddenSymbols: new Set(['a', 'i', 'u']) };
    expect(hiddenSheetDrivers(fields, [], vis)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(hiddenSheetDrivers(fields, [], vis, 2)).toEqual(['p1', 'p2']);
  });
});
