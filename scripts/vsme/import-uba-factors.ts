/**
 * import-uba-factors.ts
 *
 * Parses UBA emission-factor xlsx (Scope 1 & 2 sheets) into FactorRow[]
 * and provides an upsert importer for the emission_factors table.
 *
 * Supported sheets (enumerated from workbook, matched by prefix):
 *   01_ Stationäre_Verbrennung  — Scope 1
 *   02_ Mobile_Verbrennung      — Scope 1
 *   03_ Industrieprozesse       — Scope 1  (only kg CO2 column, no kg CO2e header)
 *   04_ Kältemittel u.a.        — Scope 1  (no Scope column; GWP AR4 used as kg_co2e)
 *   05_ Strom                   — Scope 2  (also has Scope 3 rows → filtered out)
 *   06_ Wärme                   — Scope 2  (also has Scope 3 rows → filtered out)
 *   11_ Abwasser                — Scope 3 only → no rows kept
 */

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FactorRow = {
  uba_id: string;
  scope: string;
  category: string;
  subcategory: string | null;
  unit: string;
  kg_co2e: number;
  kg_co2: number | null;
  kg_ch4: number | null;
  kg_n2o: number | null;
  source: 'UBA';
  source_version: string;
  dataset_year: number;
  sheet: string;
};

// ---------------------------------------------------------------------------
// Sheet prefixes to process (Scope 1 & 2 per UBA index)
// ---------------------------------------------------------------------------

const SCOPE12_PREFIXES = ['01_', '02_', '03_', '04_', '05_', '06_', '11_'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function findCol(headers: string[], name: string): number {
  const nameLower = name.toLowerCase();
  return headers.findIndex((h) => h.toLowerCase().startsWith(nameLower));
}

// ---------------------------------------------------------------------------
// parseUbaFactors (synchronous — uses pure-Node ZIP reader)
// ---------------------------------------------------------------------------

export function parseUbaFactors(xlsxPath: string, version: string, year: number): FactorRow[] {
  const buf = fs.readFileSync(xlsxPath);
  const entries = readZip(buf);

  // 1. Parse shared strings
  const sharedStrings = parseSharedStrings(entries);

  // 2. Build sheet name → file mapping
  const sheetNameToFile = buildSheetMap(entries);

  // 3. Collect target sheets
  const targetSheets: Array<{ name: string; xml: Buffer }> = [];
  for (const [name, filePath] of sheetNameToFile.entries()) {
    const prefix = SCOPE12_PREFIXES.find((p) => name.startsWith(p));
    if (!prefix) continue;
    const xmlBuf = entries.get(filePath);
    if (!xmlBuf) continue;
    targetSheets.push({ name, xml: xmlBuf });
  }
  targetSheets.sort((a, b) => a.name.localeCompare(b.name));

  const result: FactorRow[] = [];

  for (const { name: sheetName, xml } of targetSheets) {
    const isKaeltemittel = sheetName.startsWith('04_');
    const xmlStr = xml.toString('utf8');
    const sheetRows = parseSheetXml(xmlStr, sharedStrings);

    let currentHeaders: string[] = [];

    for (const rowCells of sheetRows) {
      if (rowCells.length === 0) continue;
      const firstCell = toStr(rowCells[0]);

      if (firstCell === 'ID') {
        currentHeaders = rowCells.map((c) => toStr(c));
        continue;
      }
      if (currentHeaders.length === 0) continue;

      const partial = extractRow(currentHeaders, rowCells, isKaeltemittel);
      if (!partial) continue;

      result.push({
        ...partial,
        source: 'UBA',
        source_version: version,
        dataset_year: year,
        sheet: sheetName,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Row extraction
// ---------------------------------------------------------------------------

function extractRow(
  headers: string[],
  cells: unknown[],
  isKaeltemittel: boolean,
): Omit<FactorRow, 'source' | 'source_version' | 'dataset_year' | 'sheet'> | null {
  const idIdx = findCol(headers, 'ID');
  if (idIdx === -1) return null;

  const rawId = toStr(cells[idIdx]);
  if (!rawId || !/^\d{2}_/.test(rawId)) return null;

  if (isKaeltemittel) {
    // Sheet 04: no Scope column. Use GWP AR4 as kg_co2e. All factors → Scope 1.
    const ar4Idx = headers.findIndex((h) => h.toLowerCase().includes('gwp ar4'));
    if (ar4Idx === -1) return null;
    const co2eVal = toNum(cells[ar4Idx]);
    if (co2eVal === null) return null;

    const nameIdx = headers.findIndex((h) => h.toLowerCase().includes('industrielle'));
    const subcategory = nameIdx !== -1 ? toStr(cells[nameIdx]) || null : null;

    return {
      uba_id: rawId,
      scope: 'Scope 1',
      category: 'Kältemittel',
      subcategory,
      unit: 'kg',
      kg_co2e: co2eVal,
      kg_co2: null,
      kg_ch4: null,
      kg_n2o: null,
    };
  }

  const scopeIdx = findCol(headers, 'Scope');
  if (scopeIdx === -1) return null;
  const scope = toStr(cells[scopeIdx]);

  // Skip Scope 3 rows (unless they're also tagged Scope 2, which doesn't happen but is safe)
  if (!scope) return null;
  if (/Scope 3/.test(scope) && !/Scope 2/.test(scope)) return null;

  const lvl1Idx = findCol(headers, 'Level 1');
  const lvl2Idx = findCol(headers, 'Level 2');
  const unitIdx = findCol(headers, 'Einheit');

  const category = lvl1Idx !== -1 ? toStr(cells[lvl1Idx]) : '';
  const subcategory = lvl2Idx !== -1 ? toStr(cells[lvl2Idx]) || null : null;
  const unit = unitIdx !== -1 ? toStr(cells[unitIdx]).trim() : '';

  // Detect sheet 03 pattern: has "kg CO2" but NOT "kg CO2e"
  const co2eIdx = headers.findIndex(
    (h) => h.toLowerCase().replace(/\s/g, '') === 'kgco2e',
  );
  const co2Idx = headers.findIndex(
    (h) => h.toLowerCase().replace(/\s/g, '') === 'kgco2',
  );
  const ch4Idx = findCol(headers, 'kg CH4');
  const n2oIdx = findCol(headers, 'kg N2O');

  let kg_co2e: number | null = null;
  let kg_co2: number | null = null;

  if (co2eIdx !== -1) {
    kg_co2e = toNum(cells[co2eIdx]);
    kg_co2 = co2Idx !== -1 ? toNum(cells[co2Idx]) : null;
  } else if (co2Idx !== -1) {
    // Sheet 03: only kg CO2 — treat as CO2e (process-only CO2 emissions)
    const raw = toNum(cells[co2Idx]);
    kg_co2e = raw;
    kg_co2 = raw;
  }

  if (kg_co2e === null) return null;
  if (!category && !unit) return null;

  return {
    uba_id: rawId,
    scope,
    category,
    subcategory,
    unit,
    kg_co2e,
    kg_co2,
    kg_ch4: ch4Idx !== -1 ? toNum(cells[ch4Idx]) : null,
    kg_n2o: n2oIdx !== -1 ? toNum(cells[n2oIdx]) : null,
  };
}

// ---------------------------------------------------------------------------
// Pure-Node synchronous ZIP reader (PKZIP / .xlsx)
// ---------------------------------------------------------------------------

/**
 * Reads a ZIP buffer and returns a Map of { normalised-path → Buffer }.
 * Handles DEFLATE (method 8) and STORE (method 0) entries.
 * Reads the Central Directory first to get the correct file list.
 */
function readZip(buf: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();

  // Find End of Central Directory (EOCD) signature 0x06054b50
  const EOCD_SIG = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('Invalid ZIP: EOCD not found');

  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const cdSize = buf.readUInt32LE(eocdOffset + 12);

  // Walk the Central Directory
  const CD_SIG = 0x02014b50;
  let pos = cdOffset;
  const cdEnd = cdOffset + cdSize;

  while (pos < cdEnd) {
    if (buf.readUInt32LE(pos) !== CD_SIG) break;

    const method = buf.readUInt16LE(pos + 10);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const uncompressedSize = buf.readUInt32LE(pos + 24);
    const fileNameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);

    const fileName = buf.toString('utf8', pos + 46, pos + 46 + fileNameLen);
    pos += 46 + fileNameLen + extraLen + commentLen;

    // Read local header to find actual data offset
    const LH_SIG = 0x04034b50;
    if (buf.readUInt32LE(localHeaderOffset) !== LH_SIG) continue;

    const lhFileNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const lhExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + lhFileNameLen + lhExtraLen;

    const compressed = buf.slice(dataOffset, dataOffset + compressedSize);
    let data: Buffer;

    if (method === 0) {
      data = compressed;
    } else if (method === 8) {
      data = zlib.inflateRawSync(compressed);
    } else {
      continue; // unsupported compression method
    }

    // Sanity check
    if (data.length !== uncompressedSize && uncompressedSize > 0) {
      // Use what we got anyway (zip64 edge cases)
    }

    // Normalise path: strip leading slash
    const normName = fileName.replace(/^\//, '');
    entries.set(normName, data);
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Parse xl/sharedStrings.xml from the ZIP entries map
// ---------------------------------------------------------------------------

function parseSharedStrings(entries: Map<string, Buffer>): string[] {
  const shared: string[] = [];
  const ssBuf = entries.get('xl/sharedStrings.xml');
  if (!ssBuf) return shared;

  const xml = ssBuf.toString('utf8');
  const siPattern = /<si>([\s\S]*?)<\/si>/g;
  const tPattern = /<t(?:[^>]*)>([\s\S]*?)<\/t>/g;

  let siMatch;
  while ((siMatch = siPattern.exec(xml)) !== null) {
    const siContent = siMatch[1];
    let text = '';
    let tMatch;
    tPattern.lastIndex = 0;
    while ((tMatch = tPattern.exec(siContent)) !== null) {
      text += unescapeXml(tMatch[1]);
    }
    shared.push(text);
  }

  return shared;
}

// ---------------------------------------------------------------------------
// Build sheet name → xl/worksheets/sheetN.xml path map
// ---------------------------------------------------------------------------

function buildSheetMap(entries: Map<string, Buffer>): Map<string, string> {
  const result = new Map<string, string>();

  const wbBuf = entries.get('xl/workbook.xml');
  if (!wbBuf) return result;
  const wbXml = wbBuf.toString('utf8');

  const relsBuf = entries.get('xl/_rels/workbook.xml.rels');
  if (!relsBuf) return result;
  const relsXml = relsBuf.toString('utf8');

  // Build rId → Target map
  const rIdToTarget = new Map<string, string>();
  const relPat = /<Relationship\s[^>]*Id="([^"]*)"[^>]*Target="([^"]*)"[^>]*\/?>/g;
  let m;
  while ((m = relPat.exec(relsXml)) !== null) {
    rIdToTarget.set(m[1], m[2]);
  }

  // Parse sheet entries — handle both attribute orderings
  const sheetPatterns = [
    /<sheet\s[^>]*?name="([^"]*)"[^>]*?(?:r:id|xmlns:r[^>]*r:id)="([^"]*)"[^>]*?\/?>/g,
    /<sheet\s[^>]*?r:id="([^"]*)"[^>]*?name="([^"]*)"[^>]*?\/?>/g,
  ];

  // Use a more robust extraction: find each <sheet ...> block and extract name + r:id
  const sheetBlockPat = /<sheet\s([^/]*?)\/?>/g;
  let sb;
  while ((sb = sheetBlockPat.exec(wbXml)) !== null) {
    const attrs = sb[1];
    const nameMat = /name="([^"]*)"/.exec(attrs);
    const rIdMat = /r:id="([^"]*)"/.exec(attrs);
    if (!nameMat || !rIdMat) continue;

    const sheetName = unescapeXml(nameMat[1]);
    const rId = rIdMat[1];
    const target = rIdToTarget.get(rId);
    if (!target) continue;

    // target is relative to xl/, e.g. "worksheets/sheet8.xml"
    const fullPath = `xl/${target}`;
    result.set(sheetName, fullPath);
  }

  // Suppress the unused var warning from the first approach
  void sheetPatterns;

  return result;
}

// ---------------------------------------------------------------------------
// Minimal XLSX worksheet XML parser
// ---------------------------------------------------------------------------

function parseSheetXml(xml: string, sharedStrings: string[]): unknown[][] {
  const rows: unknown[][] = [];

  const rowPat = /<row\s[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;

  while ((rowMatch = rowPat.exec(xml)) !== null) {
    const rowNum = parseInt(rowMatch[1], 10);
    const rowContent = rowMatch[2];
    const cells: unknown[] = [];

    const cellPat = /<c\s([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch;

    while ((cellMatch = cellPat.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const cellContent = cellMatch[2];

      const rMatch = /\br="([A-Z]+)\d+"/.exec(attrs);
      if (!rMatch) continue;
      const colIdx = colLettersToIndex(rMatch[1]);

      const tMatch = /\bt="([^"]*)"/.exec(attrs);
      const cellType = tMatch ? tMatch[1] : '';

      let value: unknown = '';
      const vMatch = /<v>([\s\S]*?)<\/v>/.exec(cellContent);
      if (vMatch) {
        if (cellType === 's') {
          const idx = parseInt(vMatch[1], 10);
          value = sharedStrings[idx] ?? '';
        } else {
          value = unescapeXml(vMatch[1]);
        }
      } else {
        const isMatch = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/.exec(cellContent);
        if (isMatch) value = unescapeXml(isMatch[1]);
      }

      while (cells.length <= colIdx) cells.push('');
      cells[colIdx] = value;
    }

    while (rows.length < rowNum) rows.push([]);
    rows[rowNum - 1] = cells;
  }

  return rows;
}

function colLettersToIndex(letters: string): number {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// ---------------------------------------------------------------------------
// importFactors — upserts rows into emission_factors via postgres client
// ---------------------------------------------------------------------------

export async function importFactors(databaseUrl: string, rows: FactorRow[]): Promise<number> {
  if (!process.env.DATABASE_URL) {
    loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require('postgres');
  const sql = postgres(databaseUrl, { prepare: false, max: 1 });

  try {
    let count = 0;
    for (const r of rows) {
      await sql`
        INSERT INTO emission_factors
          (uba_id, scope, category, subcategory, unit, kg_co2e, kg_co2, kg_ch4, kg_n2o,
           source, source_version, dataset_year, sheet)
        VALUES
          (${r.uba_id}, ${r.scope}, ${r.category}, ${r.subcategory ?? null},
           ${r.unit}, ${r.kg_co2e}, ${r.kg_co2 ?? null}, ${r.kg_ch4 ?? null},
           ${r.kg_n2o ?? null}, ${'UBA'}, ${r.source_version}, ${r.dataset_year},
           ${r.sheet ?? null})
        ON CONFLICT (uba_id, source_version)
        DO UPDATE SET
          scope          = EXCLUDED.scope,
          category       = EXCLUDED.category,
          subcategory    = EXCLUDED.subcategory,
          unit           = EXCLUDED.unit,
          kg_co2e        = EXCLUDED.kg_co2e,
          kg_co2         = EXCLUDED.kg_co2,
          kg_ch4         = EXCLUDED.kg_ch4,
          kg_n2o         = EXCLUDED.kg_n2o,
          source_version = EXCLUDED.source_version,
          dataset_year   = EXCLUDED.dataset_year,
          sheet          = EXCLUDED.sheet
      `;
      count++;
    }
    return count;
  } finally {
    await sql.end();
  }
}
