// @vitest-environment node
import './_setup-env';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildReport } from '@/lib/pdf/build-report';
import { db } from '@/lib/db';
import { calculations } from '@/lib/db/schema';

describe('buildReport', () => {
  let calcId: string;
  beforeAll(async () => {
    const [c] = await db.select().from(calculations).limit(1);
    if (!c) throw new Error('seed required: pnpm tsx scripts/seed-demo.ts');
    calcId = c.id;
  });

  it('produces a valid PDF buffer', async () => {
    const buf = await buildReport(calcId);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(2000);
  });
});
