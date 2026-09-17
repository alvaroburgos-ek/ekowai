// Plan 2a Task 10: the importer forbids visible_when on a produced symbol
// (hidden ⇒ null would blank the consumer worksheet's inherited value).
import { describe, it, expect } from 'vitest';
import { validateVisibleWhenNotOnProducer } from '../_pass3c-validate';

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
