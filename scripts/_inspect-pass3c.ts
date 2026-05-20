import ExcelJS from 'exceljs';

const file = process.argv[2];
if (!file) throw new Error('Usage: tsx _inspect-pass3c.ts <path>');

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);

  console.log(`\n=== Workbook: ${file} ===`);
  console.log(`Sheets: ${wb.worksheets.map((s) => s.name).join(', ')}\n`);

  for (const ws of wb.worksheets) {
    if (ws.name === 'README' || ws.name === 'Changelog') continue;
    console.log(`--- Sheet: ${ws.name} (rows: ${ws.rowCount}, cols: ${ws.columnCount}) ---`);
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(String(cell.value ?? '').trim());
    });
    console.log(`Headers: ${headers.join(' | ')}`);
    // Sample 1-2 data rows
    for (let i = 2; i <= Math.min(3, ws.rowCount); i++) {
      const r = ws.getRow(i);
      const vals: string[] = [];
      r.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        const s =
          v == null
            ? ''
            : typeof v === 'object' && 'result' in (v as object)
              ? String((v as { result: unknown }).result)
              : String(v).slice(0, 60);
        vals.push(s);
      });
      console.log(`  Row ${i}: ${vals.join(' | ')}`);
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
