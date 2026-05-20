// @vitest-environment node
import './_setup-env';
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { projectDocuments, reportArchives, orgs } from '@/lib/db/schema';

describe('documents schema', () => {
  it('project_documents table is queryable', async () => {
    const rows = await db.select().from(projectDocuments).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('report_archives table is queryable', async () => {
    const rows = await db.select().from(reportArchives).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('orgs has letterhead columns', async () => {
    const rows = await db.select({ vatId: orgs.vatId }).from(orgs).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});
