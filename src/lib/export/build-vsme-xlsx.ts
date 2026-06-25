import ExcelJS from 'exceljs';
import type { VsmeExportData } from './vsme-export-data';

/**
 * Build a 4-sheet VSME export workbook and return it as a Node Buffer.
 *
 * Sheets:
 *  - Datapoints    : one row per field (worksheet, label, xbrl id, owner, value, unit)
 *  - CO2 Activity  : one row per co2Line
 *  - Totals        : Scope 1 / Scope 2 (location) / Total (location)
 *  - Citations     : fields that have ≥1 citationSources entry
 */
export async function buildVsmeXlsx(
  data: VsmeExportData,
  locale: 'de' | 'en',
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EKOWAI Wizard';
  wb.created = new Date();

  // ── Datapoints ──────────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Datapoints');
    ws.columns = [
      { header: 'Worksheet', key: 'worksheet', width: 20 },
      { header: 'Datapoint', key: 'datapoint', width: 40 },
      { header: 'XBRL Element ID', key: 'xbrlElementId', width: 40 },
      { header: 'Owner', key: 'owner', width: 18 },
      { header: 'Value', key: 'value', width: 20 },
      { header: 'Unit', key: 'unit', width: 12 },
    ];

    // Bold header
    ws.getRow(1).font = { bold: true };

    for (const f of data.fields) {
      const label = locale === 'en' && f.labelEn != null ? f.labelEn : f.labelDe;
      ws.addRow({
        worksheet: f.worksheetCode,
        datapoint: label,
        xbrlElementId: f.xbrlElementId ?? '',
        owner: f.owner,
        value: f.value ?? '',
        unit: f.unit ?? '',
      });
    }
  }

  // ── CO2 Activity ────────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('CO2 Activity');
    ws.columns = [
      { header: 'Scope', key: 'scope', width: 14 },
      { header: 'Category', key: 'category', width: 28 },
      { header: 'Subcategory', key: 'subcategory', width: 24 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Factor (UBA ID)', key: 'factorUbaId', width: 18 },
      { header: 'Factor Version', key: 'factorSourceVersion', width: 16 },
      { header: 'tCO2e', key: 'computedTco2e', width: 14 },
    ];

    ws.getRow(1).font = { bold: true };

    for (const line of data.co2Lines) {
      ws.addRow({
        scope: line.scope,
        category: line.category,
        subcategory: line.subcategory ?? '',
        amount: line.amount,
        unit: line.unit,
        factorUbaId: line.factorUbaId,
        factorSourceVersion: line.factorSourceVersion,
        computedTco2e: line.computedTco2e ?? '',
      });
    }
  }

  // ── Totals ──────────────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Totals');
    ws.columns = [
      { header: 'Category', key: 'category', width: 28 },
      { header: 'Value (tCO2e)', key: 'value', width: 16 },
    ];

    ws.getRow(1).font = { bold: true };

    ws.addRow({ category: 'Scope 1', value: String(data.totals.scope1) });
    ws.addRow({ category: 'Scope 2 (location)', value: String(data.totals.scope2Location) });
    ws.addRow({ category: 'Total (location)', value: String(data.totals.totalLocation) });
  }

  // ── Citations ───────────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Citations');
    ws.columns = [
      { header: 'Datapoint', key: 'datapoint', width: 40 },
      { header: 'XBRL Element ID', key: 'xbrlElementId', width: 40 },
      { header: 'Citations (JSON)', key: 'citations', width: 60 },
    ];

    ws.getRow(1).font = { bold: true };

    for (const f of data.fields) {
      if (!Array.isArray(f.citationSources) || f.citationSources.length === 0) continue;
      const label = locale === 'en' && f.labelEn != null ? f.labelEn : f.labelDe;
      ws.addRow({
        datapoint: label,
        xbrlElementId: f.xbrlElementId ?? '',
        citations: JSON.stringify(f.citationSources),
      });
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
