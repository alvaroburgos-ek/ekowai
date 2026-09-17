// Plan 2a Task 10: the importer forbids visible_when on a produced symbol
// (hidden ⇒ null would blank the consumer worksheet's inherited value).
import { describe, it, expect } from 'vitest';
import { validateVisibleWhenNotOnProducer, sectionChainFor } from '../_pass3c-validate';

describe('importer: visible_when is forbidden on a field other worksheets consume', () => {
  it('flags a produced symbol with consumer_worksheets and visible_when', () => {
    expect(validateVisibleWhenNotOnProducer({ symbol: 'A_C', visible_when: 'x == 1', consumer_worksheets: ['A138-10'] })).toEqual(['field A_C: visible_when on a symbol consumed by A138-10 is not allowed (hidden ⇒ null would blank the consumer)']);
    expect(validateVisibleWhenNotOnProducer({ symbol: 'A_C', visible_when: null, consumer_worksheets: ['A138-10'] })).toEqual([]);
    expect(validateVisibleWhenNotOnProducer({ symbol: 'z', visible_when: 'x == 1', consumer_worksheets: [] })).toEqual([]);
    expect(validateVisibleWhenNotOnProducer({ symbol: 'z', visible_when: 'x == 1', consumer_worksheets: null })).toEqual([]);
  });
  it('accepts the workbook comma-separated string form (FieldRow.consumer_worksheets)', () => {
    expect(validateVisibleWhenNotOnProducer({ symbol: 'A_C', visible_when: 'x == 1', consumer_worksheets: 'A138-10, A138-13' })).toEqual(['field A_C: visible_when on a symbol consumed by A138-10, A138-13 is not allowed (hidden ⇒ null would blank the consumer)']);
    expect(validateVisibleWhenNotOnProducer({ symbol: 'A_C', visible_when: 'x == 1', consumer_worksheets: '' })).toEqual([]);
  });
});

// Fix round 1: a produced field is also rejected when its SECTION (or any ancestor section) carries visible_when.

describe('importer: a produced field inside a section hidden by visible_when is rejected too', () => {
  const sections = [
    { worksheet_code: 'A138-07', section_code: 'A', parent_section_code: null, title: 'A', order_index: 0, purpose: null, verification_status: null, visible_when: "sewer_system_type == 'misch'" },
    { worksheet_code: 'A138-07', section_code: 'A.1', parent_section_code: 'A', title: 'A.1', order_index: 1, purpose: null, verification_status: null },
    { worksheet_code: 'A138-07', section_code: 'B', parent_section_code: null, title: 'B', order_index: 2, purpose: null, verification_status: null },
    { worksheet_code: 'A138-10', section_code: 'A', parent_section_code: null, title: 'A', order_index: 0, purpose: null, verification_status: null },
  ];
  it('sectionChainFor walks the field\'s section up to the root (same worksheet only; cycle-safe)', () => {
    expect(sectionChainFor(sections, 'A138-07', 'A.1').map((s) => s.section_code)).toEqual(['A.1', 'A']);
    expect(sectionChainFor(sections, 'A138-07', 'B').map((s) => s.section_code)).toEqual(['B']);
    expect(sectionChainFor(sections, 'A138-07', 'nope')).toEqual([]);
    expect(sectionChainFor(sections, 'A138-07', null)).toEqual([]);
    const cyc = [
      { ...sections[0], section_code: 'C1', parent_section_code: 'C2', visible_when: null },
      { ...sections[0], section_code: 'C2', parent_section_code: 'C1', visible_when: null },
    ];
    expect(sectionChainFor(cyc, 'A138-07', 'C1').map((s) => s.section_code)).toEqual(['C1', 'C2']);
  });
  it('ancestor section with visible_when + consumers ⇒ error; no consumers or no hidden ancestor ⇒ ok', () => {
    const chain = sectionChainFor(sections, 'A138-07', 'A.1');
    expect(validateVisibleWhenNotOnProducer({ symbol: 'A_C', visible_when: null, consumer_worksheets: ['A138-10'] }, chain)).toEqual([
      "field A_C: section A carries visible_when but A_C is consumed by A138-10 — not allowed (hidden ⇒ null would blank the consumer)",
    ]);
    expect(validateVisibleWhenNotOnProducer({ symbol: 'A_C', visible_when: null, consumer_worksheets: [] }, chain)).toEqual([]);
    expect(validateVisibleWhenNotOnProducer({ symbol: 'A_C', visible_when: null, consumer_worksheets: ['A138-10'] }, sectionChainFor(sections, 'A138-07', 'B'))).toEqual([]);
    // both the field's own rule and a hidden ancestor ⇒ both messages
    expect(validateVisibleWhenNotOnProducer({ symbol: 'A_C', visible_when: 'x == 1', consumer_worksheets: ['A138-10'] }, chain)).toHaveLength(2);
  });
});
