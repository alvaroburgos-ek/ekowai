import { describe, it, expect } from 'vitest';
import {
  EQUATION_MANUAL_DENYLIST,
  shouldEngineEvaluate,
} from '../equation-manual-denylist';

describe('equation-manual-denylist', () => {
  it('denies the A138-18:18 magnitude-trap equation (×10³ omitted in stored formula)', () => {
    expect(EQUATION_MANUAL_DENYLIST.has('A138-18:18')).toBe(true);
    expect(shouldEngineEvaluate('A138-18', '18')).toBe(false);
  });

  it('denies the 7 faithfulness-scan candidates (unconfirmable = NR = blank, not folded)', () => {
    const suspectedMissingFactor = ['A226-07:24', 'A226-07:25', 'A226-06:17', 'M2291-04:23'];
    const lumpedConstant = ['A131-04:24', 'A131-05:36', 'M2292-08:B1'];
    for (const key of [...suspectedMissingFactor, ...lumpedConstant]) {
      expect(EQUATION_MANUAL_DENYLIST.has(key)).toBe(true);
    }
    // spot-check the gate resolves the composite keys correctly
    expect(shouldEngineEvaluate('A226-07', '24')).toBe(false);
    expect(shouldEngineEvaluate('A131-04', '24')).toBe(false);
    expect(shouldEngineEvaluate('M2292-08', 'B1')).toBe(false);
  });

  it('routes an ordinary non-138 equation to the engine', () => {
    expect(shouldEngineEvaluate('DIN-276-09', 'KG1-01')).toBe(true);
    expect(shouldEngineEvaluate('A1022-18', '11')).toBe(true);
  });

  it('routes ordinary 138 equations to the engine (138 unchanged by the deny-set)', () => {
    expect(shouldEngineEvaluate('A138-07', '2')).toBe(true);
    expect(shouldEngineEvaluate('A138-13', '8')).toBe(true);
  });

  it('every deny-set key is a well-formed WSCODE:EQNUM string', () => {
    for (const key of EQUATION_MANUAL_DENYLIST) {
      expect(key).toMatch(/^[A-Za-z0-9-]+:\S+$/);
      expect(key.split(':').length).toBe(2);
    }
  });
});
