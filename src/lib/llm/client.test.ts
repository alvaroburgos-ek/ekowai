import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./mistral', () => ({
  mistralLargeProvider: { name: 'mistral-large', draftRationale: vi.fn() },
  mistralSmallProvider: { name: 'mistral-small', draftRationale: vi.fn() },
}));
vi.mock('./prompts/rationale-de', () => ({ promptDe: () => 'PROMPT_DE' }));
vi.mock('./prompts/rationale-en', () => ({ promptEn: () => 'PROMPT_EN' }));

import { draftRationale } from './client';
import { mistralLargeProvider, mistralSmallProvider } from './mistral';

const fixtureReq = {
  worksheetId: 'A201-08',
  regulation: 'DWA-A-201',
  regulationVersion: 'v3.2',
  inputs: {},
  computed: {},
  locale: 'de' as const,
};

beforeEach(() => vi.clearAllMocks());

describe('draftRationale', () => {
  it('uses primary on success', async () => {
    vi.mocked(mistralLargeProvider.draftRationale).mockResolvedValue('LARGE_OUT');
    const r = await draftRationale(fixtureReq);
    expect(r).toEqual({ text: 'LARGE_OUT', provider: 'mistral-large' });
    expect(mistralSmallProvider.draftRationale).not.toHaveBeenCalled();
  });

  it('falls back on primary error', async () => {
    vi.mocked(mistralLargeProvider.draftRationale).mockRejectedValue(new Error('rate-limited'));
    vi.mocked(mistralSmallProvider.draftRationale).mockResolvedValue('SMALL_OUT');
    const r = await draftRationale(fixtureReq);
    expect(r).toEqual({ text: 'SMALL_OUT', provider: 'mistral-small' });
  });
});
