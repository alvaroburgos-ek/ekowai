import { describe, it, expect } from 'vitest';
import { validateFieldConfigColumns } from '../_pass3c-validate';

describe('pass3c validate — widget/ui_config/lookup', () => {
  it('accepts NULL widget and a valid register config', () => {
    expect(validateFieldConfigColumns({ symbol: 'x', widget: null, ui_config: null, lookup: null, visible_when: null })).toEqual([]);
    expect(validateFieldConfigColumns({ symbol: 'x', widget: 'register', ui_config: { title: 't', columns: [{ key: 'a', type: 'text', label: 'A' }] }, lookup: null, visible_when: null })).toEqual([]);
  });
  it('reports the symbol and the path on failure', () => {
    const errs = validateFieldConfigColumns({ symbol: 'e', widget: 'lookup_fill', ui_config: null, lookup: null, visible_when: null });
    expect(errs[0]).toMatch(/field e: .*lookup/);
  });
});
