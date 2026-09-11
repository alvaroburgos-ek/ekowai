// @vitest-environment node
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildVsmeXlsx } from '@/lib/export/build-vsme-xlsx';
import type { VsmeExportData } from '@/lib/export/vsme-export-data';

const fixture: VsmeExportData = {
  projectName: 'Test GmbH',
  fields: [
    {
      worksheetCode: 'VSME-B03',
      worksheetTitle: 'Klimawandel',
      symbol: 'GrossScope1GreenhouseGasEmissions',
      xbrlElementId: 'vsme_GrossScope1GreenhouseGasEmissions',
      labelDe: 'Brutto-Scope-1-THG-Emissionen',
      labelEn: 'Gross Scope 1 GHG Emissions',
      owner: 'ekowai_env',
      dataType: 'decimal',
      unit: 'tCO2e',
      value: '42.5',
      citationSources: [{ source: 'IPCC 2023', page: 12 }],
    },
    {
      worksheetCode: 'VSME-B01',
      worksheetTitle: 'Allgemeine Angaben',
      symbol: 'NameOfUndertaking',
      xbrlElementId: null,
      labelDe: 'Name des Unternehmens',
      labelEn: 'Name of Undertaking',
      owner: 'ekowai_env',
      dataType: 'text',
      unit: null,
      value: 'Test GmbH',
      citationSources: [],
    },
  ],
  co2Lines: [
    {
      scope: 'Scope 1',
      category: 'Stationäre Verbrennung',
      subcategory: 'Erdgas',
      amount: '100',
      unit: 'm3',
      factorUbaId: 'UBA-NG-001',
      factorSourceVersion: '2023-v1',
      computedTco2e: '20.1',
    },
  ],
  totals: {
    scope1: 42.5,
    scope2Location: 10.0,
    totalLocation: 52.5,
  },
};

describe('buildVsmeXlsx', () => {
  it('returns a Buffer', async () => {
    const buf = await buildVsmeXlsx(fixture, 'de');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('workbook contains all four expected sheet names', async () => {
    const buf = await buildVsmeXlsx(fixture, 'de');
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const names = wb.worksheets.map((ws) => ws.name);
    expect(names).toContain('Datapoints');
    expect(names).toContain('CO2 Activity');
    expect(names).toContain('Totals');
    expect(names).toContain('Citations');
  });

  it('Datapoints header row includes XBRL Element ID', async () => {
    const buf = await buildVsmeXlsx(fixture, 'de');
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Datapoints')!;
    const headerRow = ws.getRow(1);
    const headerValues = headerRow.values as (string | undefined)[];
    expect(headerValues).toContain('XBRL Element ID');
  });

  it('Datapoints header row includes Owner and Value', async () => {
    const buf = await buildVsmeXlsx(fixture, 'de');
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Datapoints')!;
    const headerRow = ws.getRow(1);
    const headerValues = headerRow.values as (string | undefined)[];
    expect(headerValues).toContain('Owner');
    expect(headerValues).toContain('Value');
  });

  it('Datapoints data row for first field carries value and xbrlElementId', async () => {
    const buf = await buildVsmeXlsx(fixture, 'de');
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Datapoints')!;
    // Row 1 = header, Row 2 = first field
    const dataRow = ws.getRow(2);
    const rowValues = (dataRow.values as unknown[]).map((v) =>
      v != null ? String(v) : '',
    );
    expect(rowValues).toContain('42.5');
    expect(rowValues).toContain('vsme_GrossScope1GreenhouseGasEmissions');
  });

  it('CO2 Activity sheet has header and one data row', async () => {
    const buf = await buildVsmeXlsx(fixture, 'de');
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('CO2 Activity')!;
    expect(ws.rowCount).toBeGreaterThanOrEqual(2);
    const headerValues = (ws.getRow(1).values as unknown[]).map(String);
    expect(headerValues).toContain('Scope');
    expect(headerValues).toContain('tCO2e');
  });

  it('CO2 Activity Amount and tCO2e cells are native numbers', async () => {
    const buf = await buildVsmeXlsx(fixture, 'de');
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('CO2 Activity')!;
    // Row 2 = first data row; columns: Scope=1 Category=2 Subcategory=3 Amount=4 Unit=5 Factor=6 FactorVersion=7 tCO2e=8
    const amountCell = ws.getRow(2).getCell(4);
    expect(typeof amountCell.value).toBe('number');
    expect(amountCell.value).toBe(100);

    const tco2eCell = ws.getRow(2).getCell(8);
    expect(typeof tco2eCell.value).toBe('number');
    expect(tco2eCell.value).toBe(20.1);
  });

  it('Totals sheet contains scope1 value as a native number', async () => {
    const buf = await buildVsmeXlsx(fixture, 'de');
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Totals')!;
    expect(ws.rowCount).toBeGreaterThanOrEqual(3);

    // Row 2 = Scope 1, Row 3 = Scope 2 (location), Row 4 = Total (location)
    const scope1ValueCell = ws.getRow(2).getCell(2);
    expect(typeof scope1ValueCell.value).toBe('number');
    expect(scope1ValueCell.value).toBe(42.5);

    const scope2ValueCell = ws.getRow(3).getCell(2);
    expect(typeof scope2ValueCell.value).toBe('number');
    expect(scope2ValueCell.value).toBe(10.0);

    const totalValueCell = ws.getRow(4).getCell(2);
    expect(typeof totalValueCell.value).toBe('number');
    expect(totalValueCell.value).toBe(52.5);
  });

  it('Citations sheet has exactly 1 data row (only field with citationSources)', async () => {
    const buf = await buildVsmeXlsx(fixture, 'de');
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Citations')!;
    // Row 1 = header, Row 2 = one citation row
    expect(ws.rowCount).toBe(2);
  });

  it('Citations data row contains serialised JSON', async () => {
    const buf = await buildVsmeXlsx(fixture, 'de');
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Citations')!;
    const dataRow = ws.getRow(2);
    const rowValues = (dataRow.values as unknown[]).map((v) =>
      v != null ? String(v) : '',
    );
    // At least one cell should contain a JSON array string
    const hasJson = rowValues.some((v) => v.startsWith('[') || v.startsWith('{'));
    expect(hasJson).toBe(true);
  });

  it('uses locale en label when locale is en', async () => {
    const buf = await buildVsmeXlsx(fixture, 'en');
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Datapoints')!;
    const dataRow = ws.getRow(2);
    const rowValues = (dataRow.values as unknown[]).map((v) =>
      v != null ? String(v) : '',
    );
    // English label for first field
    expect(rowValues).toContain('Gross Scope 1 GHG Emissions');
  });
});
