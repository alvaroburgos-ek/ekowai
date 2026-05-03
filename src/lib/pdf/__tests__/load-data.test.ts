// @vitest-environment node
import './_setup-env';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadReportData } from '@/lib/pdf/load-data';
import { db } from '@/lib/db';
import { calculations } from '@/lib/db/schema';

describe('loadReportData', () => {
  let calcId: string;

  beforeAll(async () => {
    const [row] = await db.select().from(calculations).limit(1);
    if (!row) throw new Error('seed required: pnpm tsx scripts/seed-demo.ts');
    calcId = row.id;
  });

  it('returns calc, project, org, decisions, approvals, citedDocs, worksheet, result, cells, actors', async () => {
    const data = await loadReportData(calcId);
    expect(data.calc.id).toBe(calcId);
    expect(data.project).toBeTruthy();
    expect(data.org).toBeTruthy();
    expect(Array.isArray(data.decisions)).toBe(true);
    expect(Array.isArray(data.approvals)).toBe(true);
    expect(Array.isArray(data.citedDocs)).toBe(true);
    expect(data.worksheet).toBeTruthy();
    expect(data.cells).toBeTruthy();
    expect(data.result).toBeTruthy();
    expect(typeof data.actors).toBe('object');
  });

  it('citedDocs ids are strings', async () => {
    const data = await loadReportData(calcId);
    for (const d of data.citedDocs) {
      expect(typeof d.id).toBe('string');
    }
  });

  it('throws calc_not_found for unknown id', async () => {
    await expect(
      loadReportData('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow('calc_not_found');
  });
});
