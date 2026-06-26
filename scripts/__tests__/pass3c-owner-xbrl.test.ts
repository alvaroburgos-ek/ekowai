import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseWorkbookSync } from '../_pass3c-parsers';

function wbWithField(extra: Record<string, unknown>): ReturnType<typeof parseWorkbookSync> {
  const wb = new ExcelJS.Workbook();

  const std = wb.addWorksheet('Standards');
  std.addRow(['standard_code', 'title_de', 'title_en', 'issuer', 'edition', 'domain', 'status', 'notes']);
  std.addRow(['TESTVSME', 't', 't', null, '', null, null, null]);

  const ws = wb.addWorksheet('Worksheets');
  ws.addRow(['worksheet_code', 'standard_code', 'title_de', 'title_en', 'phase', 'archetype', 'section_refs', 'equation_refs', 'order_index', 'description', 'verification_status']);
  ws.addRow(['W1', 'TESTVSME', 'w', null, null, 'data_collection', null, null, 1, null, null]);

  const sec = wb.addWorksheet('Sections');
  sec.addRow(['worksheet_code', 'section_code', 'parent_section_code', 'title', 'order_index', 'purpose', 'verification_status']);

  const fieldHeaders = ['symbol', 'label_de', 'label_en', 'unit', 'data_type', 'kind', 'origin_worksheet', 'origin_section', 'consumer_worksheets', 'equation_refs', 'required', 'validation_rules', 'regulation_reference', 'description', 'verification_status', 'notes', 'owner', 'xbrl_element_id'];
  const fieldValues = ['f1', 'F', null, null, 'text', null, 'W1', null, null, null, null, null, null, null, null, null, extra.owner ?? null, extra.xbrl_element_id ?? null];
  const f = wb.addWorksheet('Fields');
  f.addRow(fieldHeaders);
  f.addRow(fieldValues);

  const ev = wb.addWorksheet('Enum_Values');
  ev.addRow(['enum_name', 'value', 'label_de', 'label_en', 'order_index', 'regulation_reference', 'notes']);

  const eq = wb.addWorksheet('Equations');
  eq.addRow(['equation_number', 'standard_code', 'description_de', 'description_en', 'formula', 'input_symbols', 'output_symbol', 'regulation_reference', 'used_in_worksheet', 'verification_status', 'notes']);

  const cr = wb.addWorksheet('Compliance_Requirements');
  cr.addRow(['requirement_code', 'standard_code', 'title', 'description', 'evaluation_type', 'required_field_symbols', 'evaluation_expression', 'pass_condition', 'regulation_reference', 'phase', 'order_index', 'verification_status']);

  return parseWorkbookSync(wb);
}

describe('pass3c field owner + xbrl_element_id', () => {
  it('parses owner and xbrl_element_id columns', () => {
    const parsed = wbWithField({ owner: 'ekowai_env', xbrl_element_id: 'vsme_Foo' });
    expect(parsed.fields[0].owner).toBe('ekowai_env');
    expect(parsed.fields[0].xbrl_element_id).toBe('vsme_Foo');
  });
  it('defaults them to null when absent', () => {
    const parsed = wbWithField({});
    expect(parsed.fields[0].owner).toBeNull();
    expect(parsed.fields[0].xbrl_element_id).toBeNull();
  });
});
