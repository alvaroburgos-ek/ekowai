import type { ParsedWorkbook } from './_pass3c-types';

const ALLOWED_DATA_TYPES = new Set([
  'number', 'text', 'enum', 'date', 'boolean', 'json',
]);
const ALLOWED_ARCHETYPES = new Set([
  'registration', 'data_collection', 'calculation', 'summary', 'verification',
]);

export type ValidationError = { sheet: string; row: number; message: string };

export function validateWorkbook(parsed: ParsedWorkbook): ValidationError[] {
  const errors: ValidationError[] = [];
  const stdCode = parsed.standard.standard_code;

  // ---- Standards ----
  if (!parsed.standard.standard_code) {
    errors.push({ sheet: 'Standards', row: 2, message: 'standard_code is required' });
  }
  if (!parsed.standard.title_de) {
    errors.push({ sheet: 'Standards', row: 2, message: 'title_de is required' });
  }
  if (!parsed.standard.edition) {
    errors.push({ sheet: 'Standards', row: 2, message: 'edition is required (mapped to standards.version)' });
  }

  // ---- Worksheets ----
  const worksheetCodes = new Set<string>();
  parsed.worksheets.forEach((w, i) => {
    const row = i + 2;
    if (!w.worksheet_code) errors.push({ sheet: 'Worksheets', row, message: 'worksheet_code is required' });
    if (worksheetCodes.has(w.worksheet_code)) {
      errors.push({ sheet: 'Worksheets', row, message: `Duplicate worksheet_code: ${w.worksheet_code}` });
    }
    worksheetCodes.add(w.worksheet_code);
    if (w.standard_code !== stdCode) {
      errors.push({ sheet: 'Worksheets', row, message: `standard_code "${w.standard_code}" does not match workbook standard "${stdCode}"` });
    }
    if (!w.title_de) errors.push({ sheet: 'Worksheets', row, message: 'title_de is required' });
    if (w.archetype && !ALLOWED_ARCHETYPES.has(w.archetype)) {
      errors.push({ sheet: 'Worksheets', row, message: `Invalid archetype: ${w.archetype}` });
    }
  });

  // ---- Sections ----
  const sectionKeys = new Set<string>(); // worksheet_code|section_code
  parsed.sections.forEach((s, i) => {
    const row = i + 2;
    if (!s.worksheet_code) errors.push({ sheet: 'Sections', row, message: 'worksheet_code is required' });
    if (!worksheetCodes.has(s.worksheet_code)) {
      errors.push({ sheet: 'Sections', row, message: `Unknown worksheet_code: ${s.worksheet_code}` });
    }
    if (!s.section_code) errors.push({ sheet: 'Sections', row, message: 'section_code is required' });
    const key = `${s.worksheet_code}|${s.section_code}`;
    if (sectionKeys.has(key)) {
      errors.push({ sheet: 'Sections', row, message: `Duplicate (worksheet_code, section_code): ${key}` });
    }
    sectionKeys.add(key);
    if (!s.title) errors.push({ sheet: 'Sections', row, message: 'title is required' });
  });
  // Parent section validity is checked in a second pass
  parsed.sections.forEach((s, i) => {
    const row = i + 2;
    if (s.parent_section_code) {
      const parentKey = `${s.worksheet_code}|${s.parent_section_code}`;
      if (!sectionKeys.has(parentKey)) {
        errors.push({
          sheet: 'Sections',
          row,
          message: `parent_section_code "${s.parent_section_code}" not found in worksheet ${s.worksheet_code}`,
        });
      }
    }
  });

  // ---- Fields ----
  const fieldKeys = new Set<string>(); // worksheet_code|symbol
  parsed.fields.forEach((f, i) => {
    const row = i + 2;
    if (!f.symbol) errors.push({ sheet: 'Fields', row, message: 'symbol is required' });
    if (!f.label_de) errors.push({ sheet: 'Fields', row, message: 'label_de is required' });
    if (!ALLOWED_DATA_TYPES.has(f.data_type)) {
      errors.push({ sheet: 'Fields', row, message: `Invalid data_type: ${f.data_type}` });
    }
    if (!f.origin_worksheet) {
      errors.push({ sheet: 'Fields', row, message: 'origin_worksheet is required' });
    } else if (!worksheetCodes.has(f.origin_worksheet)) {
      errors.push({ sheet: 'Fields', row, message: `Unknown origin_worksheet: ${f.origin_worksheet}` });
    }
    if (f.origin_section) {
      const secKey = `${f.origin_worksheet}|${f.origin_section}`;
      if (!sectionKeys.has(secKey)) {
        // Not a hard error: Pass3c workbooks sometimes reference sub-section codes (e.g. "B.1")
        // that are absent from the Sections sheet. The importer silently sets section_id=null
        // for these fields. Tracked as a data-completeness concern only.
      }
    }
    const fieldKey = `${f.origin_worksheet}|${f.symbol}`;
    if (fieldKeys.has(fieldKey)) {
      errors.push({ sheet: 'Fields', row, message: `Duplicate (origin_worksheet, symbol): ${fieldKey}` });
    }
    fieldKeys.add(fieldKey);
  });

  // ---- Enum_Values ----
  parsed.enumValues.forEach((e, i) => {
    const row = i + 2;
    if (!e.enum_name) errors.push({ sheet: 'Enum_Values', row, message: 'enum_name is required' });
    if (!e.value) errors.push({ sheet: 'Enum_Values', row, message: 'value is required' });
  });
  // NOTE: We do NOT require every enum field to have matching Enum_Values rows here.
  // Pass3c workbooks may use abbreviated enum_name keys that differ from field symbols
  // (e.g. field "water_protection_zone" → enum_name "protection_zone"). This is a
  // data-completeness concern tracked separately, not a hard validation block.

  // ---- Equations ----
  const equationKeys = new Set<string>(); // worksheet_code|equation_number
  parsed.equations.forEach((eq, i) => {
    const row = i + 2;
    if (!eq.equation_number) errors.push({ sheet: 'Equations', row, message: 'equation_number is required' });
    if (eq.standard_code !== stdCode) {
      errors.push({ sheet: 'Equations', row, message: `standard_code "${eq.standard_code}" does not match` });
    }
    if (!eq.formula) errors.push({ sheet: 'Equations', row, message: 'formula is required' });
    // used_in_worksheet may be a comma-separated list in Pass3c workbooks (e.g. "A138-13, A138-25").
    // The parser takes the first value; validate that first value exists.
    const primaryWorksheet = eq.used_in_worksheet?.split(',')[0].trim() ?? '';
    if (!primaryWorksheet || !worksheetCodes.has(primaryWorksheet)) {
      errors.push({ sheet: 'Equations', row, message: `Unknown used_in_worksheet: ${eq.used_in_worksheet}` });
    }
    const key = `${primaryWorksheet}|${eq.equation_number}`;
    if (equationKeys.has(key)) {
      errors.push({ sheet: 'Equations', row, message: `Duplicate (worksheet, equation_number): ${key}` });
    }
    equationKeys.add(key);
  });

  // ---- Compliance_Requirements ----
  const crKeys = new Set<string>();
  parsed.complianceRequirements.forEach((cr, i) => {
    const row = i + 2;
    if (!cr.requirement_code) errors.push({ sheet: 'Compliance_Requirements', row, message: 'requirement_code is required' });
    if (cr.standard_code !== stdCode) {
      errors.push({ sheet: 'Compliance_Requirements', row, message: `standard_code "${cr.standard_code}" does not match` });
    }
    if (!cr.title) errors.push({ sheet: 'Compliance_Requirements', row, message: 'title is required' });
    // evaluation_expression is optional for two types:
    //  - field_presence: the required_field_symbols ARE the expression;
    //  - manual: a human/cross-reference check (e.g. "nach DWA-A 202") with no machine-evaluable
    //    expression. The app's compliance engine renders these as { kind: 'manual' } and the importer
    //    maps the blank expression to a non-blocking condition. Require an expression for all other types.
    if (!cr.evaluation_expression && cr.evaluation_type !== 'field_presence' && cr.evaluation_type !== 'manual') {
      errors.push({ sheet: 'Compliance_Requirements', row, message: 'evaluation_expression is required' });
    }
    if (crKeys.has(cr.requirement_code)) {
      errors.push({ sheet: 'Compliance_Requirements', row, message: `Duplicate requirement_code: ${cr.requirement_code}` });
    }
    crKeys.add(cr.requirement_code);
  });

  return errors;
}
