// @vitest-environment node
import '../../../../../../lib/db/__tests__/_setup-env';
import { describe, it, expect } from 'vitest';
import { loadVsmeExportData } from '@/lib/export/vsme-export-data';
import { buildVsmeXlsx } from '@/lib/export/build-vsme-xlsx';

const NON_EXISTENT_PROJECT = '00000000-0000-0000-0000-000000000002';

describe('VSME export route — buffer path (integration)', () => {
  it('buildVsmeXlsx(await loadVsmeExportData(...), "de") returns a non-empty Buffer', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    const buf = await buildVsmeXlsx(data, 'de');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('returned xlsx Buffer starts with PK magic bytes (valid zip/xlsx)', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    const buf = await buildVsmeXlsx(data, 'de');
    // xlsx is a zip archive; first 2 bytes are 0x50 0x4B ("PK")
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it('buildVsmeXlsx with locale "en" also returns a non-empty Buffer', async () => {
    const data = await loadVsmeExportData(NON_EXISTENT_PROJECT);
    const buf = await buildVsmeXlsx(data, 'en');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });
});
