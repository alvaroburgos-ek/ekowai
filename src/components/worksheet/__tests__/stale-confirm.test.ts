/**
 * M-3 usability (fix round 4): the fields the „alle bestätigen" bar re-saves — visible, own, stale, valued, untouched.
 */
import { describe, it, expect } from 'vitest';
import { staleConfirmCandidates } from '../stale-confirm';

const fields = [
  { id: 'a', dataType: 'boolean', active: true },
  { id: 'b', dataType: 'text', active: true },
  { id: 'hidden', dataType: 'boolean', active: true },
  { id: 'inherited', dataType: 'boolean', active: true, inheritedFromWorksheet: 'M820-10' },
  { id: 'json', dataType: 'json', active: true },
  { id: 'empty', dataType: 'text', active: true },
  { id: 'fresh', dataType: 'text', active: true },
  { id: 'inactive', dataType: 'text', active: false },
];
const stale = { a: true, b: true, hidden: true, inherited: true, json: true, empty: true, inactive: true };
const values = {
  a: { type: 'boolean', value: false }, b: { type: 'text', value: 'x' }, hidden: { type: 'boolean', value: true },
  inherited: { type: 'boolean', value: true }, json: { type: 'json', value: {} }, fresh: { type: 'text', value: 'y' },
  inactive: { type: 'text', value: 'z' },
};
const run = (o: { pending?: string[]; touched?: string[] } = {}) => staleConfirmCandidates({
  fields,
  hiddenFieldIds: new Set(['hidden']),
  staleByFieldId: stale,
  values,
  pendingFieldIds: new Set(o.pending ?? []),
  touched: new Set(o.touched ?? []),
});

describe('staleConfirmCandidates', () => {
  it('only visible, own, active, non-json, valued, stale fields', () => {
    expect(run()).toEqual(['a', 'b']);
  });
  it('a pending or already-touched field leaves the list (its save clears the flag)', () => {
    expect(run({ pending: ['a'] })).toEqual(['b']);
    expect(run({ touched: ['b'] })).toEqual(['a']);
  });
  it('no stale map ⇒ nothing', () => {
    expect(staleConfirmCandidates({ fields, hiddenFieldIds: new Set(), values, pendingFieldIds: new Set(), touched: new Set() })).toEqual([]);
  });
});
