/**
 * DWA-M 820-3 structure block, review fix round 1 (I-c): the worksheet page prefills a field from the same symbol on another
 * worksheet of ANY standard of the project. An enum field must never be prefilled with a token outside its own option list
 * (DWA-M 820-1 `project_type` = `projekt` beside DWA-M 820-3 `project_type`); everything else keeps the cross-standard prefill.
 */
import { describe, it, expect } from 'vitest';
import { coerceSameSymbolValue } from '../same-symbol-prefill';

const M8203_PROJECT_TYPE = [{ value: 'gesamtsystem' }, { value: 'einzelprojekt' }, { value: 'both' }];

describe('coerceSameSymbolValue — enum token guard', () => {
  it('a foreign token (820-1 "projekt") is NOT prefilled into the 820-3 enum', () => {
    expect(coerceSameSymbolValue('enum', 'projekt', M8203_PROJECT_TYPE)).toBeNull();
  });
  it('an own token is prefilled', () => {
    expect(coerceSameSymbolValue('enum', 'einzelprojekt', M8203_PROJECT_TYPE)).toEqual({ type: 'enum', value: 'einzelprojekt' });
  });
  it('an enum without an option list keeps the old behaviour', () => {
    expect(coerceSameSymbolValue('enum', 'projekt', null)).toEqual({ type: 'enum', value: 'projekt' });
    expect(coerceSameSymbolValue('enum', 'projekt', [])).toEqual({ type: 'enum', value: 'projekt' });
  });
  it('other data types keep the cross-standard prefill unchanged', () => {
    expect(coerceSameSymbolValue('number', '4.5')).toEqual({ type: 'number', value: 4.5 });
    expect(coerceSameSymbolValue('text', 'Forscheln')).toEqual({ type: 'text', value: 'Forscheln' });
    expect(coerceSameSymbolValue('boolean', true)).toEqual({ type: 'boolean', value: true });
    expect(coerceSameSymbolValue('date', '2026-10-06')).toEqual({ type: 'date', value: '2026-10-06' });
    expect(coerceSameSymbolValue('number', 'x')).toBeNull();
  });
});
