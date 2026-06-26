// @vitest-environment node
import '../../../src/lib/db/__tests__/_setup-env';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { seedVsme } from '../seed-vsme';

describe('VSME seed (local)', () => {
  beforeAll(async () => { await seedVsme({ dryRun: false }); });
  it('inserts the VSME standard', async () => {
    const r = await db.execute(sql`select count(*)::int n from standards where code='VSME'`);
    expect((r as any)[0].n).toBe(1);
  });
  it('inserts ~100-160 VSME fields, all owner-tagged', async () => {
    const r = await db.execute(sql`select count(*)::int n, count(owner)::int o from fields f join worksheet_templates w on f.worksheet_template_id=w.id join standards s on w.standard_id=s.id where s.code='VSME'`);
    const { n, o } = (r as any)[0];
    expect(n).toBeGreaterThan(90); expect(n).toBeLessThan(200); expect(o).toBe(n);
  });
  it('loads UBA factors incl. the grid electricity factor', async () => {
    const r = await db.execute(sql`select count(*)::int n from emission_factors where uba_id='05_20_01_001_01'`);
    expect((r as any)[0].n).toBe(1);
  });
});
