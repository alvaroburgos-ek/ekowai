// src/lib/eval/__tests__/asm-invalidation.test.ts
// Task 8: unit tests for asmInvalidationOnTypeChange.
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
});
