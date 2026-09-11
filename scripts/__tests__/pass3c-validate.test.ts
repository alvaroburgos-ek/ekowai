import { describe, it, expect } from 'vitest';
import { validateWorkbook } from '../_pass3c-validate';
import type { ParsedWorkbook } from '../_pass3c-types';

function valid(): ParsedWorkbook {
  return {
    standard: {
      standard_code: 'DWA-A-138-1', title_de: 'X', title_en: null,
      issuer: 'DWA', edition: '2024', domain: null, status: null, notes: null,
    },
    worksheets: [{
      worksheet_code: 'A138-01', standard_code: 'DWA-A-138-1',
      title_de: 'W', title_en: null, phase: 1, archetype: 'registration',
      section_refs: null, equation_refs: null, order_index: 1,
      description: null, verification_status: null,
    }],
    sections: [{
      worksheet_code: 'A138-01', section_code: 'A', parent_section_code: null,
      title: 'Section A', order_index: 1, purpose: null, verification_status: null,
    }],
    fields: [{
      symbol: 'project_number', label_de: 'Projektnummer', label_en: null,
      unit: null, data_type: 'text', kind: null,
      origin_worksheet: 'A138-01', origin_section: 'A',
      consumer_worksheets: null, equation_refs: null,
      required: 'yes', validation_rules: null,
      regulation_reference: null, description: null,
      verification_status: null, notes: null,
      owner: null, xbrl_element_id: null,
    }],
    enumValues: [],
    equations: [],
    complianceRequirements: [],
  };
}

describe('Pass3c validator', () => {
  it('accepts a minimal valid workbook with zero errors', () => {
    expect(validateWorkbook(valid())).toEqual([]);
  });

  it('flags missing standard_code', () => {
    const p = valid();
    p.standard.standard_code = '';
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('standard_code'))).toBe(true);
  });

  it('flags invalid data_type', () => {
    const p = valid();
    p.fields[0].data_type = 'integer' as 'number';
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('Invalid data_type'))).toBe(true);
  });

  it('flags duplicate worksheet_code', () => {
    const p = valid();
    p.worksheets.push({ ...p.worksheets[0] });
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('Duplicate worksheet_code'))).toBe(true);
  });

  it('flags Sections referencing unknown worksheet', () => {
    const p = valid();
    p.sections[0].worksheet_code = 'A138-99';
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('Unknown worksheet_code'))).toBe(true);
  });

  it('flags parent_section_code that does not exist in the same worksheet', () => {
    const p = valid();
    p.sections.push({
      ...p.sections[0], section_code: 'A.1', parent_section_code: 'NOPE',
    });
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('parent_section_code'))).toBe(true);
  });

  it('does not block import when enum field has no matching enum_values (soft data gap)', () => {
    const p = valid();
    p.fields[0].data_type = 'enum';
    const errs = validateWorkbook(p);
    // Enum-name mismatch is a data-quality gap, not a blocker — the importer
    // logs a warning at write time and stores the field with enum_values = null.
    expect(errs.filter((e) => e.message.includes('no rows in Enum_Values'))).toEqual([]);
  });

  it('flags Equation whose used_in_worksheet is unknown', () => {
    const p = valid();
    p.equations.push({
      equation_number: '1', standard_code: 'DWA-A-138-1',
      description_de: null, description_en: null,
      formula: 'a = b', input_symbols: 'b', output_symbol: 'a',
      regulation_reference: null, used_in_worksheet: 'NOPE',
      verification_status: null, notes: null,
    });
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('Unknown used_in_worksheet'))).toBe(true);
  });

  it('flags Compliance requirement with standard_code mismatch', () => {
    const p = valid();
    p.complianceRequirements.push({
      requirement_code: 'R1', standard_code: 'WRONG',
      worksheet_code: null,
      title: 'T', description: null,
      evaluation_type: null, required_field_symbols: null,
      evaluation_expression: 'x == 1', pass_condition: null,
      severity: null,
      regulation_reference: null, phase: null, order_index: null,
      verification_status: null,
    });
    const errs = validateWorkbook(p);
    expect(errs.some((e) => e.message.includes('does not match'))).toBe(true);
  });
});
