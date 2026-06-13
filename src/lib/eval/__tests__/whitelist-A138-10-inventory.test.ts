import { describe, it, expect } from 'vitest';
import { FORMULA_ENGINE_WHITELIST } from '../whitelist';
import { equationProfiles } from '../equation-profiles';

/**
 * Pile-14 — read-only A138-10 inventory-derived equations.
 *
 * The orchestrator creates three DB rows on worksheet A138-10 carrying
 * equation_number 2a / 2b / 2c (ΣSealed / ΣUnsealed / C_m), each backed by
 * an already-registered aggregator UUID. For the engine to evaluate them
 * their `${worksheetCode}:${equationNumber}` keys must be on the runtime
 * whitelist, and their profiles must be `displayOnly` (no write-back) since
 * they only recompute from the inherited `surface_inventory` carrier.
 *
 * A138-10's A_C aggregator (1a48af79) recomputes from the same carrier but
 * DOES write A_C back — so it must NOT be displayOnly.
 */

const SIGMA_SEALED_ID = 'd1a38110-0000-0000-0000-000000000001';
const SIGMA_UNSEALED_ID = 'd1a38110-0000-0000-0000-000000000002';
const C_M_ID = 'd1a38110-0000-0000-0000-000000000003';
const A_C_ID = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';

describe('Pile-14 A138-10 inventory-derived whitelist wiring', () => {
  it('whitelists A138-10:2a / 2b / 2c (ΣSealed / ΣUnsealed / C_m)', () => {
    expect(FORMULA_ENGINE_WHITELIST.has('A138-10:2a')).toBe(true);
    expect(FORMULA_ENGINE_WHITELIST.has('A138-10:2b')).toBe(true);
    expect(FORMULA_ENGINE_WHITELIST.has('A138-10:2c')).toBe(true);
  });
});

describe('Pile-14 A138-10 inventory-derived equation profiles', () => {
  it('ΣSealed / ΣUnsealed / C_m are displayOnly (no write-back)', () => {
    expect(equationProfiles[SIGMA_SEALED_ID]?.displayOnly).toBe(true);
    expect(equationProfiles[SIGMA_UNSEALED_ID]?.displayOnly).toBe(true);
    expect(equationProfiles[C_M_ID]?.displayOnly).toBe(true);
  });

  it('the three Σ/C_m profiles carry empty expectedUnits (aggregator owns row-level units)', () => {
    expect(equationProfiles[SIGMA_SEALED_ID]?.expectedUnits).toEqual({});
    expect(equationProfiles[SIGMA_UNSEALED_ID]?.expectedUnits).toEqual({});
    expect(equationProfiles[C_M_ID]?.expectedUnits).toEqual({});
  });

  it('A_C (1a48af79) has a profile that is NOT displayOnly (keeps writing back)', () => {
    expect(equationProfiles[A_C_ID]).toBeDefined();
    expect(equationProfiles[A_C_ID]?.displayOnly).toBeFalsy();
  });
});
