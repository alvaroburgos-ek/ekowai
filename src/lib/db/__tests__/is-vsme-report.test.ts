// @vitest-environment node
import './_setup-env';
import { describe, it, expect } from 'vitest';
import { isVsmeReport } from '@/lib/db/queries/is-vsme-report';

describe('isVsmeReport', () => {
  it('returns false for a random non-existent project id', async () => {
    const result = await isVsmeReport('00000000-0000-0000-0000-000000000000');
    expect(result).toBe(false);
  });
});
