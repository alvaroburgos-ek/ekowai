// src/lib/eval/__tests__/asm-invalidation.test.ts
// Task 8 / review fix: unit tests for asmInvalidationOnTypeChange.
import { describe, it, expect } from 'vitest';
import { asmInvalidationOnTypeChange } from '../asm-source';

describe('type-change invalidation', () => {
  it('geometry value clears on facility-type change', () => {
    expect(asmInvalidationOnTypeChange('geometry')).toEqual({ clear: true, flagNeedsReconfirm: false });
  });
  it('manual value flags needs-reconfirmation, does not clear', () => {
    expect(asmInvalidationOnTypeChange('manual')).toEqual({ clear: false, flagNeedsReconfirm: true });
  });
  it('direct/soil are facility-agnostic — untouched', () => {
    expect(asmInvalidationOnTypeChange('direct')).toEqual({ clear: false, flagNeedsReconfirm: false });
    expect(asmInvalidationOnTypeChange('soil_estimate')).toEqual({ clear: false, flagNeedsReconfirm: false });
  });

  // Wiring guard: confirm the clear/flagNeedsReconfirm fields are mutually exclusive.
  // The server uses `if (invalidation.clear)` for explicit A_S_m null-write and
  // a separate `if (invalidation.flagNeedsReconfirm)` for the reconfirmation flag —
  // these paths must never both fire for the same method.
  it('clear and flagNeedsReconfirm are mutually exclusive across all methods', () => {
    const methods = ['direct', 'geometry', 'soil_estimate', 'manual'] as const;
    for (const m of methods) {
      const inv = asmInvalidationOnTypeChange(m);
      expect(
        inv.clear && inv.flagNeedsReconfirm,
        `method '${m}': clear and flagNeedsReconfirm must not both be true`,
      ).toBe(false);
    }
  });

  // Acceptance #4 guard: geometry → clear === true (the server will write A_S_m=null).
  // Manual → clear === false (A_S_m is kept; engineer re-confirms via reconfirm flag).
  it('geometry produces clear=true (server writes A_S_m=null on type change)', () => {
    expect(asmInvalidationOnTypeChange('geometry').clear).toBe(true);
  });
  it('manual produces clear=false (server keeps A_S_m, sets reconfirm flag)', () => {
    const inv = asmInvalidationOnTypeChange('manual');
    expect(inv.clear).toBe(false);
    expect(inv.flagNeedsReconfirm).toBe(true);
  });
});
