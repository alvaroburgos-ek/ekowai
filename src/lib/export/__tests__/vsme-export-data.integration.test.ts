// @vitest-environment node
import '../../db/__tests__/_setup-env';
import { describe, it, expect } from 'vitest';
import { loadVsmeExportData } from '@/lib/export/vsme-export-data';

const NON_EXISTENT_PROJECT = '00000000-0000-0000-0000-000000000002';

describe('loadVsmeExportData (integration)', () => {
  it('returns fields.length between 100 and 200 (≈143 seeded VSME fields)', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    expect(data.fields.length).toBeGreaterThanOrEqual(100);
    expect(data.fields.length).toBeLessThanOrEqual(200);
  });

  it('has at least one field with owner === "ekowai_env"', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    const envField = data.fields.find((f) => f.owner === 'ekowai_env');
    expect(envField).toBeDefined();
  });

  it('co2Lines is an array', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    expect(Array.isArray(data.co2Lines)).toBe(true);
  });

  it('totals.scope1 is a number', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    expect(typeof data.totals.scope1).toBe('number');
  });

  it('totals.scope2Location is a number', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    expect(typeof data.totals.scope2Location).toBe('number');
  });

  it('totals.totalLocation is a number', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    expect(typeof data.totals.totalLocation).toBe('number');
  });

  it('fields each have worksheetCode, worksheetTitle, symbol, labelDe, owner, dataType', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    const f = data.fields[0];
    expect(typeof f.worksheetCode).toBe('string');
    expect(typeof f.worksheetTitle).toBe('string');
    expect(typeof f.symbol).toBe('string');
    expect(typeof f.labelDe).toBe('string');
    expect(typeof f.owner).toBe('string');
    expect(typeof f.dataType).toBe('string');
  });

  it('fields each have citationSources as an array', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    expect(Array.isArray(data.fields[0].citationSources)).toBe(true);
  });

  it('projectName is a string (empty for non-existent project)', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    expect(typeof data.projectName).toBe('string');
  });
});
