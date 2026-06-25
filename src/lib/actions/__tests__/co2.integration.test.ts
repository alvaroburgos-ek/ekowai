// @vitest-environment node
import '../../db/__tests__/_setup-env';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { recomputeB3Co2 } from '../co2';
// Helper: create a throwaway org/project/worksheet_instance + 2 activity lines, return ids.
import { seedCo2Fixture, cleanupCo2Fixture } from './_co2-fixture';

describe('recomputeB3Co2 persists B3 totals to project_parameters (C1)', () => {
  let ctx: Awaited<ReturnType<typeof seedCo2Fixture>>;

  beforeAll(async () => {
    ctx = await seedCo2Fixture(db);
  });

  afterAll(async () => {
    if (ctx?.cleanup) await ctx.cleanup();
  });

  it('computes and PERSISTS Scope 1 total with provenance', async () => {
    const totals = await recomputeB3Co2(ctx.projectId, ctx.worksheetInstanceId, ctx.userId);
    expect(totals.scope1).toBeGreaterThan(0);

    // READ BACK from the DB — proves persistence, not in-memory.
    const r = await db.execute(sql`
      select pp.value_number, pp.source_type, pp.citation_sources
      from project_parameters pp join fields f on pp.field_id = f.id
      where pp.project_id = ${ctx.projectId} and f.symbol = 'GrossScope1GreenhouseGasEmissions'`);
    const row = (r as any)[0];
    expect(Number(row.value_number)).toBeCloseTo(totals.scope1, 6);
    expect(row.source_type).toBe('computed');
    expect(Array.isArray(row.citation_sources)).toBe(true);
    expect(row.citation_sources.length).toBeGreaterThan(0);
    expect(row.citation_sources[0]).toHaveProperty('ubaId');
  });

  it('persists Scope 2 (location-based) total with provenance', async () => {
    const totals = await recomputeB3Co2(ctx.projectId, ctx.worksheetInstanceId, ctx.userId);
    expect(totals.scope2Location).toBeGreaterThan(0);

    const r = await db.execute(sql`
      select pp.value_number, pp.source_type, pp.citation_sources
      from project_parameters pp join fields f on pp.field_id = f.id
      where pp.project_id = ${ctx.projectId} and f.symbol = 'GrossLocationBasedScope2GreenhouseGasEmissions'`);
    const row = (r as any)[0];
    expect(Number(row.value_number)).toBeCloseTo(totals.scope2Location, 6);
    expect(row.source_type).toBe('computed');
  });

  it('persists total (Scope 1 + Scope 2) with correct sum', async () => {
    const totals = await recomputeB3Co2(ctx.projectId, ctx.worksheetInstanceId, ctx.userId);
    expect(totals.totalLocation).toBeCloseTo(totals.scope1 + totals.scope2Location, 6);

    const r = await db.execute(sql`
      select pp.value_number
      from project_parameters pp join fields f on pp.field_id = f.id
      where pp.project_id = ${ctx.projectId} and f.symbol = 'TotalGrossLocationBasedScope1AndScope2GHGEmissions'`);
    const row = (r as any)[0];
    expect(Number(row.value_number)).toBeCloseTo(totals.totalLocation, 6);
  });

  it('returns correct lineCount', async () => {
    const totals = await recomputeB3Co2(ctx.projectId, ctx.worksheetInstanceId, ctx.userId);
    expect(totals.lineCount).toBe(2);
  });
});
