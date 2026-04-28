import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./deepseek', () => ({
  deepseekProvider: { name: 'deepseek', draftRationale: vi.fn() },
}));
vi.mock('./kimi', () => ({
  kimiProvider: { name: 'kimi', draftRationale: vi.fn() },
}));
vi.mock('./prompts/rationale-de', () => ({ promptDe: () => 'PROMPT_DE' }));
vi.mock('./prompts/rationale-en', () => ({ promptEn: () => 'PROMPT_EN' }));

import { draftRationale } from './client';
import { deepseekProvider } from './deepseek';
import { kimiProvider } from './kimi';

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
    vi.mocked(deepseekProvider.draftRationale).mockResolvedValue('DEEP_OUT');
    const r = await draftRationale(fixtureReq);
    expect(r).toEqual({ text: 'DEEP_OUT', provider: 'deepseek' });
    expect(kimiProvider.draftRationale).not.toHaveBeenCalled();
  });

  it('falls back on primary error', async () => {
    vi.mocked(deepseekProvider.draftRationale).mockRejectedValue(new Error('rate-limited'));
    vi.mocked(kimiProvider.draftRationale).mockResolvedValue('KIMI_OUT');
    const r = await draftRationale(fixtureReq);
    expect(r).toEqual({ text: 'KIMI_OUT', provider: 'kimi' });
  });
});
