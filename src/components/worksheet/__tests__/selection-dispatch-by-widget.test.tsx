import { describe, it, expect } from 'vitest';
import { resolveSelectionConfig, SELECTION_CONFIGS } from '@/lib/eval/selection-fields';

describe('resolveSelectionConfig', () => {
  const base = { dataType: 'json', enumValues: null, lookup: null, visibleWhen: null };
  it('widget NULL ⇒ TS registry by symbol (legacy)', () => {
    expect(resolveSelectionConfig({ ...base, symbol: 'applicable_legal_bases', widget: null, uiConfig: null })).toEqual(SELECTION_CONFIGS.applicable_legal_bases);
  });
  it('DB widget wins over the TS registry', () => {
    const r = resolveSelectionConfig({ ...base, symbol: 'applicable_legal_bases', widget: 'select_many', uiConfig: { title: 'DB title' }, enumValues: [{ value: 'a', label_de: 'a', order_index: 0 }] });
    expect(r && r.kind === 'checklist' ? [r.title, r.options] : null).toEqual(['DB title', ['a']]);
  });
  it('a non-selection widget yields null even when the symbol is in the registry', () => {
    expect(resolveSelectionConfig({ ...base, symbol: 'applicable_legal_bases', widget: 'scalar', uiConfig: null })).toBeNull();
  });
});
