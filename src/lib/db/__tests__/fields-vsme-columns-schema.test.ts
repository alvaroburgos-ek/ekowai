// @vitest-environment node
import './_setup-env';
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { fields } from '@/lib/db/schema';

describe('fields VSME columns', () => {
  it('exposes owner and xbrlElementId columns', async () => {
    const rows = await db
      .select({
        id: fields.id,
        owner: fields.owner,
        xbrlElementId: fields.xbrlElementId,
      })
      .from(fields)
      .limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});
