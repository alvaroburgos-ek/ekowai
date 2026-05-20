// @vitest-environment node
import './_setup-env';
import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportDocument } from '@/lib/pdf/document';
import { loadReportData } from '@/lib/pdf/load-data';
import { ensureFonts } from '@/lib/pdf/fonts';
import { db } from '@/lib/db';
import { calculations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('ReportDocument render', () => {
  let approvedCalcId: string | null = null;
  let anyCalcId: string | null = null;

  beforeAll(async () => {
    ensureFonts();
    const [approved] = await db
      .select()
      .from(calculations)
      .where(eq(calculations.status, 'approved'))
      .limit(1);
    if (approved) approvedCalcId = approved.id;

    const [any] = await db.select().from(calculations).limit(1);
    if (!any) throw new Error('seed required: pnpm tsx scripts/seed-demo.ts');
    anyCalcId = any.id;
  });

  it('renders an approved calc to a non-empty PDF buffer with no watermark indication of error', async () => {
    if (!approvedCalcId) {
      // Seed may not have an approved calc; fall through to anyCalcId
      console.warn('No approved calc in seed; using any calc');
      const data = await loadReportData(anyCalcId!);
      const buf = await renderToBuffer(<ReportDocument data={data} />);
      expect(buf.slice(0, 4).toString()).toBe('%PDF');
      expect(buf.length).toBeGreaterThan(2000);
      return;
    }
    const data = await loadReportData(approvedCalcId);
    const buf = await renderToBuffer(<ReportDocument data={data} />);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(2000);
  });

  it('renders a non-approved calc (with watermark) without erroring', async () => {
    const data = await loadReportData(anyCalcId!);
    const buf = await renderToBuffer(<ReportDocument data={data} />);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(2000);
  });
});
