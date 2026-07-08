import { describe, it, expect } from 'vitest';
import { MATERIALIZE_REGISTRY, producerFiredEntries } from '../materialize-registry';

describe('asm registry entry', () => {
  const asm = MATERIALIZE_REGISTRY.find((e) => e.id === 'asm');
  it('exists and targets A138-12', () => {
    expect(asm).toBeTruthy();
    expect(asm!.consumerTemplateCode).toBe('A138-12');
  });
  it('fires on a geometry input or facility_type_selected change', () => {
    const fired = producerFiredEntries(new Set(['h_M']), new Set());
    expect(fired.some((e) => e.id === 'asm')).toBe(true);
    const fired2 = producerFiredEntries(new Set(['facility_type_selected']), new Set());
    expect(fired2.some((e) => e.id === 'asm')).toBe(true);
  });
  it('does not double-fire when already owner-fired', () => {
    const fired = producerFiredEntries(new Set(['A_S_min']), new Set(['asm']));
    expect(fired.some((e) => e.id === 'asm')).toBe(false);
  });
});
