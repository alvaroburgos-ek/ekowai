import { describe, it, expect } from 'vitest';
import { DeviationInputSchema } from '../deviations';

describe('DeviationInputSchema', () => {
  it('rejects blank justification', () => {
    const r = DeviationInputSchema.safeParse({ projectId: crypto.randomUUID(), requirementId: crypto.randomUUID(), justification: '', basisCitations: [] });
    expect(r.success).toBe(false);
  });
  it('requires a non-empty basis', () => {
    const r = DeviationInputSchema.safeParse({ projectId: crypto.randomUUID(), requirementId: crypto.randomUUID(), justification: 'literature k_f accepted; FLL §4.10 basis', basisCitations: [] });
    expect(r.success).toBe(false);
  });
  it('accepts a justification + at least one basis citation', () => {
    const r = DeviationInputSchema.safeParse({ projectId: crypto.randomUUID(), requirementId: crypto.randomUUID(), justification: 'literature k_f accepted; FLL §4.10 basis', basisCitations: [{ id: '1', docId: 'label:§4.10', page: null, note: null }] });
    expect(r.success).toBe(true);
  });
});
