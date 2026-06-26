import { describe, it, expect } from 'vitest';
import { FORMULA_ENGINE_WHITELIST } from '../whitelist';

describe('engine whitelist — A138-07 single-source', () => {
  it('whitelists the four A138-07 producers', () => {
    for (const k of ['A138-07:2', 'A138-07:2c', 'A138-07:2d', 'A138-07:2e']) {
      expect(FORMULA_ENGINE_WHITELIST.has(k)).toBe(true);
    }
  });
  it('no longer whitelists A138-10:2 (production moved off A138-10)', () => {
    expect(FORMULA_ENGINE_WHITELIST.has('A138-10:2')).toBe(false);
  });
  it('whitelists the reduced-area-split producers Gl. 2f/2g', () => {
    expect(FORMULA_ENGINE_WHITELIST.has('A138-07:2f')).toBe(true);
    expect(FORMULA_ENGINE_WHITELIST.has('A138-07:2g')).toBe(true);
  });
});
