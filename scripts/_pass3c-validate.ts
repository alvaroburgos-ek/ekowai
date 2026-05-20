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
        errors.push({ sheet: 'Fields', row, message: `Unknown origin_section "${f.origin_section}" in worksheet ${f.origin_worksheet}` });
      }
    }
    const fieldKey = `${f.origin_worksheet}|${f.symbol}`;
    if (fieldKeys.has(fieldKey)) {
      errors.push({ sheet: 'Fields', row, message: `Duplicate (origin_worksheet, symbol): ${fieldKey}` });
    }
    fieldKeys.add(fieldKey);
  });

  // ---- Enum_Values ----
  const enumNames = new Set<string>(parsed.fields.filter((f) => f.data_type === 'enum').map((f) => f.symbol));
  parsed.enumValues.forEach((e, i) => {
    const row = i + 2;
    if (!e.enum_name) errors.push({ sheet: 'Enum_Values', row, message: 'enum_name is required' });
    if (!e.value) errors.push({ sheet: 'Enum_Values', row, message: 'value is required' });
  });
  // Every enum field must have at least one enum value
  enumNames.forEach((name) => {
    const matches = parsed.enumValues.filter((e) => e.enum_name === name);
    if (matches.length === 0) {
      errors.push({
        sheet: 'Enum_Values',
        row: 0,
        message: `Field "${name}" has data_type=enum but no rows in Enum_Values reference it`,
      });
    }
  });

  // ---- Equations ----
  const equationKeys = new Set<string>(); // worksheet_code|equation_number
  parsed.equations.forEach((eq, i) => {
    const row = i + 2;
    if (!eq.equation_number) errors.push({ sheet: 'Equations', row, message: 'equation_number is required' });
    if (eq.standard_code !== stdCode) {
      errors.push({ sheet: 'Equations', row, message: `standard_code "${eq.standard_code}" does not match` });
    }
    if (!eq.formula) errors.push({ sheet: 'Equations', row, message: 'formula is required' });
    if (!eq.used_in_worksheet || !worksheetCodes.has(eq.used_in_worksheet)) {
      errors.push({ sheet: 'Equations', row, message: `Unknown used_in_worksheet: ${eq.used_in_worksheet}` });
    }
    const key = `${eq.used_in_worksheet}|${eq.equation_number}`;
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
    if (!cr.evaluation_expression) {
      errors.push({ sheet: 'Compliance_Requirements', row, message: 'evaluation_expression is required' });
    }
    if (crKeys.has(cr.requirement_code)) {
      errors.push({ sheet: 'Compliance_Requirements', row, message: `Duplicate requirement_code: ${cr.requirement_code}` });
    }
    crKeys.add(cr.requirement_code);
  });

  return errors;
}
