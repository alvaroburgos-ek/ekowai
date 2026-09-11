import ExcelJS from 'exceljs';
import type {
  ParsedWorkbook,
  StandardRow,
  WorksheetRow,
  SectionRow,
  FieldRow,
  EnumValueRow,
  EquationRow,
  ComplianceRow,
} from './_pass3c-types';

/** Cell-value normalizer — handles formula-cells (object with .result) and trims strings. */
function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v == null) return null;
  if (typeof v === 'object' && 'result' in (v as object)) {
    return (v as { result: unknown }).result;
  }
  if (typeof v === 'object' && 'text' in (v as object)) {
    // Hyperlink/rich-text cells
    return String((v as { text: unknown }).text);
  }
  if (typeof v === 'string') return v.trim();
  return v;
}

function readSheet(
  wb: ExcelJS.Workbook,
  name: string,
  sentinels: string[] = [],
): Record<string, unknown>[] {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`Sheet not found: ${name}`);

  // Auto-detect header row: scan rows 1–6 for the first row where all cell values are
  // distinct strings (not a merged/repeated banner). This handles Pass3c workbooks where
  // some sheets (e.g. Compliance_Requirements) have a title banner in rows 1–3 before the
  // actual column headers on row 4.
  // Additionally, if sentinels are provided, the header row must contain all of them —
  // this prevents a title banner that happens to have 2+ distinct strings from being
  // misidentified as the header.
  let headerRowIdx = 1;
  let headers: string[] = [];
  for (let probe = 1; probe <= 6; probe++) {
    const probeRow = ws.getRow(probe);
    const probeHeaders: string[] = [];
    probeRow.eachCell({ includeEmpty: false }, (cell, col) => {
      probeHeaders[col - 1] = String(cell.value ?? '').trim();
    });
    if (probeHeaders.length < 2) continue;
    // A valid header row has all distinct values (banners repeat the same merged value)
    const unique = new Set(probeHeaders.filter(Boolean));
    const hasAllSentinels = sentinels.every((s) => probeHeaders.includes(s));
    if (hasAllSentinels && unique.size === probeHeaders.filter(Boolean).length) {
      headerRowIdx = probe;
      headers = probeHeaders;
      break;
    }
  }
  if (headers.length === 0) {
    if (sentinels.length > 0) {
      throw new Error(
        `Sheet ${name} has no header row containing sentinels ${sentinels.join(', ')}`,
      );
    }
    throw new Error(`Sheet ${name} has no header row`);
  }

  const rows: Record<string, unknown>[] = [];
  for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj: Record<string, unknown> = {};
    let nonEmpty = false;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const key = headers[col - 1];
      if (!key) return;
      const v = cellValue(cell);
      obj[key] = v;
      if (v != null && v !== '') nonEmpty = true;
    });
    if (nonEmpty) rows.push(obj);
  }
  return rows;
}

function asString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function asInt(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseStandard(rows: Record<string, unknown>[]): StandardRow {
  if (rows.length !== 1) throw new Error(`Standards sheet must have exactly 1 row, got ${rows.length}`);
  const r = rows[0];
  return {
    standard_code: asString(r.standard_code) ?? '',
    title_de: asString(r.title_de) ?? '',
    title_en: asString(r.title_en),
    issuer: asString(r.issuer),
    edition: asString(r.edition) ?? '',
    domain: asString(r.domain),
    status: asString(r.status),
    notes: asString(r.notes),
  };
}

function parseWorksheets(rows: Record<string, unknown>[]): WorksheetRow[] {
  return rows.map((r) => ({
    worksheet_code: asString(r.worksheet_code) ?? '',
    standard_code: asString(r.standard_code) ?? '',
    title_de: asString(r.title_de) ?? '',
    title_en: asString(r.title_en),
    phase: asInt(r.phase),
    archetype: (asString(r.archetype) as WorksheetRow['archetype']) ?? null,
    section_refs: asString(r.section_refs),
    equation_refs: asString(r.equation_refs),
    order_index: asInt(r.order_index) ?? 0,
    description: asString(r.description),
    verification_status: asString(r.verification_status),
  }));
}

function parseSections(rows: Record<string, unknown>[]): SectionRow[] {
  return rows.map((r) => ({
    worksheet_code: asString(r.worksheet_code) ?? '',
    section_code: asString(r.section_code) ?? '',
    parent_section_code: asString(r.parent_section_code),
    title: asString(r.title) ?? '',
    order_index: asInt(r.order_index) ?? 0,
    purpose: asString(r.purpose),
    verification_status: asString(r.verification_status),
  }));
}

function parseFields(rows: Record<string, unknown>[]): FieldRow[] {
  return rows.map((r) => ({
    symbol: asString(r.symbol) ?? '',
    label_de: asString(r.label_de) ?? '',
    label_en: asString(r.label_en),
    unit: asString(r.unit),
    data_type: (asString(r.data_type) as FieldRow['data_type']) ?? 'text',
    kind: asString(r.kind),
    origin_worksheet: asString(r.origin_worksheet) ?? '',
    origin_section: asString(r.origin_section),
    consumer_worksheets: asString(r.consumer_worksheets),
    equation_refs: asString(r.equation_refs),
    required: asString(r.required),
    validation_rules: asString(r.validation_rules),
    regulation_reference: asString(r.regulation_reference),
    description: asString(r.description),
    verification_status: asString(r.verification_status),
    notes: asString(r.notes),
    owner: asString(r.owner),
    xbrl_element_id: asString(r.xbrl_element_id),
  }));
}

function parseEnumValues(rows: Record<string, unknown>[]): EnumValueRow[] {
  return rows.map((r) => ({
    enum_name: asString(r.enum_name) ?? '',
    value: asString(r.value) ?? '',
    label_de: asString(r.label_de),
    label_en: asString(r.label_en),
    order_index: asInt(r.order_index) ?? 0,
    regulation_reference: asString(r.regulation_reference),
    notes: asString(r.notes),
  }));
}

/** Values that indicate a placeholder / "no equations" row in the Equations sheet. */
const PLACEHOLDER_VALUES = new Set(['—', 'n/a', 'N/A', '(none)', 'none', '']);

function isPlaceholderEquation(r: Record<string, unknown>): boolean {
  // Skip rows that are intentional placeholder rows (used when a standard has no equations).
  const eqNum = asString(r.equation_number) ?? '';
  const formula = asString(r.formula) ?? '';
  const worksheet = asString(r.used_in_worksheet) ?? '';
  return (
    PLACEHOLDER_VALUES.has(eqNum) ||
    PLACEHOLDER_VALUES.has(formula) ||
    PLACEHOLDER_VALUES.has(worksheet)
  );
}

function parseEquations(rows: Record<string, unknown>[]): EquationRow[] {
  return rows
    .filter((r) => !isPlaceholderEquation(r))
    .map((r) => {
      // Pass3c equations can list multiple consumer worksheets ("A138-13, A138-25").
      // We attach the equation to the first worksheet only — the DB FK is single-valued.
      // TODO(plan-3): if the evaluator needs to surface an equation on all consumer
      // worksheets, introduce equation_worksheet_bindings junction table.
      const rawWorksheet = asString(r.used_in_worksheet) ?? '';
      const used_in_worksheet = rawWorksheet.includes(',')
        ? rawWorksheet.split(',')[0].trim()
        : rawWorksheet;
      return {
        equation_number: asString(r.equation_number) ?? '',
        standard_code: asString(r.standard_code) ?? '',
        description_de: asString(r.description_de),
        description_en: asString(r.description_en),
        formula: asString(r.formula) ?? '',
        input_symbols: asString(r.input_symbols),
        output_symbol: asString(r.output_symbol),
        regulation_reference: asString(r.regulation_reference),
        used_in_worksheet,
        verification_status: asString(r.verification_status),
        notes: asString(r.notes),
      };
    });
}

function parseComplianceRequirements(
  rows: Record<string, unknown>[],
): ComplianceRow[] {
  return rows.map((r) => ({
    requirement_code: asString(r.requirement_code) ?? '',
    standard_code: asString(r.standard_code) ?? '',
    worksheet_code: asString(r.worksheet_code),
    title: asString(r.title) ?? '',
    description: asString(r.description),
    evaluation_type: asString(r.evaluation_type),
    required_field_symbols: asString(r.required_field_symbols),
    evaluation_expression: asString(r.evaluation_expression),  // may be null for field_presence type
    pass_condition: asString(r.pass_condition),
    severity: asString(r.severity),  // optional column; 'warn' = advisory, else → 'block'
    regulation_reference: asString(r.regulation_reference),
    phase: asInt(r.phase),
    order_index: asInt(r.order_index),
    verification_status: asString(r.verification_status),
  }));
}

function parseWorkbookFromWb(wb: ExcelJS.Workbook): ParsedWorkbook {
  return {
    standard: parseStandard(readSheet(wb, 'Standards', ['standard_code'])),
    worksheets: parseWorksheets(readSheet(wb, 'Worksheets', ['worksheet_code', 'standard_code'])),
    sections: parseSections(readSheet(wb, 'Sections', ['worksheet_code', 'section_code'])),
    fields: parseFields(readSheet(wb, 'Fields', ['symbol', 'data_type'])),
    enumValues: parseEnumValues(readSheet(wb, 'Enum_Values', ['enum_name', 'value'])),
    equations: parseEquations(readSheet(wb, 'Equations', ['equation_number', 'formula'])),
    complianceRequirements: parseComplianceRequirements(
      readSheet(wb, 'Compliance_Requirements', ['requirement_code', 'evaluation_expression']),
    ),
  };
}

/** Read a Pass3c xlsx file from disk and return a fully-parsed workbook. */
export async function parseWorkbook(path: string): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  return parseWorkbookFromWb(wb);
}

/** Parse an in-memory exceljs Workbook (for tests). */
export function parseWorkbookSync(wb: ExcelJS.Workbook): ParsedWorkbook {
  return parseWorkbookFromWb(wb);
}
