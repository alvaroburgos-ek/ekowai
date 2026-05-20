import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseWorkbookSync } from '../_pass3c-parsers';

function buildMinimalWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();

  const std = wb.addWorksheet('Standards');
  std.addRow(['standard_code', 'title_de', 'title_en', 'issuer', 'edition', 'domain', 'status', 'notes']);
  std.addRow(['DWA-A-138-1', 'Versickerung Teil 1', 'Infiltration Part 1', 'DWA', 'Oktober 2024', 'stormwater', 'active', null]);

  const ws = wb.addWorksheet('Worksheets');
  ws.addRow(['worksheet_code','standard_code','title_de','title_en','phase','archetype','section_refs','equation_refs','order_index','description','verification_status']);
  ws.addRow(['A138-01','DWA-A-138-1','Projektregistrierung','Project Registration',1,'registration','§1',null,1,'Admin registration','verified_against_standard']);

  const sec = wb.addWorksheet('Sections');
  sec.addRow(['worksheet_code','section_code','parent_section_code','title','order_index','purpose','verification_status']);
  sec.addRow(['A138-01','A',null,'Purpose and Context',1,'Statement','derived']);
  sec.addRow(['A138-01','A.1','A','Subsection',2,'Detail','derived']);

  const f = wb.addWorksheet('Fields');
  f.addRow(['symbol','label_de','label_en','unit','data_type','kind','origin_worksheet','origin_section','consumer_worksheets','equation_refs','required','validation_rules','regulation_reference','description','verification_status','notes']);
  f.addRow(['project_number','Projektnummer','Project Number',null,'text','entered','A138-01','B.1','ALL',null,'yes',null,'§1','Engineer number','verified',null]);
  f.addRow(['A_E','Fläche','Area','m²','number','entered','A138-02','C.1','A138-03, A138-04','2','yes','> 0','§5.3.3.5','Catchment area','verified',null]);
  f.addRow(['archetype','Archetyp','Archetype',null,'enum','enum','A138-01','A','ALL',null,'yes',null,'EKOWAI','Worksheet archetype','verified',null]);

  const ev = wb.addWorksheet('Enum_Values');
  ev.addRow(['enum_name','value','label_de','label_en','order_index','regulation_reference','notes']);
  ev.addRow(['archetype','registration','Registrierung','Registration',1,'EKOWAI',null]);
  ev.addRow(['archetype','data_collection','Datenerhebung','Data Collection',2,'EKOWAI',null]);

  const eq = wb.addWorksheet('Equations');
  eq.addRow(['equation_number','standard_code','description_de','description_en','formula','input_symbols','output_symbol','regulation_reference','used_in_worksheet','verification_status','notes']);
  eq.addRow(['1','DWA-A-138-1','Min Sim Zeitraum','Min sim period','M >= 3 * T_n','T_n','M','§5.3.3.3','A138-13','verified',null]);

  const cr = wb.addWorksheet('Compliance_Requirements');
  cr.addRow(['requirement_code','standard_code','title','description','evaluation_type','required_field_symbols','evaluation_expression','pass_condition','regulation_reference','phase','order_index','verification_status']);
  cr.addRow(['A138-REQ-01','DWA-A-138-1','Scope per §1','Project in scope','field_value','a138_applicable','a138_applicable == TRUE','TRUE','§1',1,1,'verified']);

  return wb;
}

describe('Pass3c parsers', () => {
  it('parses Standards into a single StandardRow', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.standard.standard_code).toBe('DWA-A-138-1');
    expect(r.standard.title_de).toBe('Versickerung Teil 1');
    expect(r.standard.edition).toBe('Oktober 2024');
  });

  it('parses Worksheets with phase + archetype', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.worksheets).toHaveLength(1);
    expect(r.worksheets[0].worksheet_code).toBe('A138-01');
    expect(r.worksheets[0].phase).toBe(1);
    expect(r.worksheets[0].archetype).toBe('registration');
  });

  it('parses Sections including parent_section_code', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.sections).toHaveLength(2);
    const sub = r.sections.find((s) => s.section_code === 'A.1');
    expect(sub?.parent_section_code).toBe('A');
  });

  it('parses Fields with all 6 data_types representable', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.fields).toHaveLength(3);
    const text = r.fields.find((f) => f.symbol === 'project_number');
    expect(text?.data_type).toBe('text');
    const num = r.fields.find((f) => f.symbol === 'A_E');
    expect(num?.data_type).toBe('number');
    expect(num?.unit).toBe('m²');
    expect(num?.consumer_worksheets).toBe('A138-03, A138-04');
    const en = r.fields.find((f) => f.symbol === 'archetype');
    expect(en?.data_type).toBe('enum');
  });

  it('parses Enum_Values into rows ready for grouping by enum_name', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.enumValues).toHaveLength(2);
    expect(r.enumValues[0].enum_name).toBe('archetype');
    expect(r.enumValues[0].value).toBe('registration');
  });

  it('parses Equations and resolves formula text', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.equations).toHaveLength(1);
    expect(r.equations[0].formula).toBe('M >= 3 * T_n');
    expect(r.equations[0].used_in_worksheet).toBe('A138-13');
  });

  it('parses Compliance_Requirements', () => {
    const r = parseWorkbookSync(buildMinimalWorkbook());
    expect(r.complianceRequirements).toHaveLength(1);
    expect(r.complianceRequirements[0].requirement_code).toBe('A138-REQ-01');
    expect(r.complianceRequirements[0].evaluation_expression).toBe(
      'a138_applicable == TRUE',
    );
  });

  it('skips empty rows in any sheet', () => {
    const wb = buildMinimalWorkbook();
    const std = wb.getWorksheet('Standards')!;
    std.addRow([]);
    std.addRow([]);
    const r = parseWorkbookSync(wb);
    expect(r.standard.standard_code).toBe('DWA-A-138-1');
  });

  it('readSheet skips a title banner row and finds the real header (sentinel-driven)', () => {
    const wb = new ExcelJS.Workbook();

    // Standards sheet — normal
    const std = wb.addWorksheet('Standards');
    std.addRow(['standard_code', 'title_de', 'title_en', 'issuer', 'edition', 'domain', 'status', 'notes']);
    std.addRow(['DWA-A-138-1', 'Versickerung Teil 1', null, 'DWA', 'Oktober 2024', null, null, null]);

    // Worksheets — normal
    const ws = wb.addWorksheet('Worksheets');
    ws.addRow(['worksheet_code','standard_code','title_de','title_en','phase','archetype','section_refs','equation_refs','order_index','description','verification_status']);
    ws.addRow(['A138-01','DWA-A-138-1','Projektregistrierung',null,1,'registration',null,null,1,null,null]);

    // Sections — normal
    const sec = wb.addWorksheet('Sections');
    sec.addRow(['worksheet_code','section_code','parent_section_code','title','order_index','purpose','verification_status']);
    sec.addRow(['A138-01','A',null,'Section A',1,null,null]);

    // Fields — normal
    const f = wb.addWorksheet('Fields');
    f.addRow(['symbol','label_de','label_en','unit','data_type','kind','origin_worksheet','origin_section','consumer_worksheets','equation_refs','required','validation_rules','regulation_reference','description','verification_status','notes']);
    f.addRow(['project_number','Projektnummer',null,null,'text',null,'A138-01','A',null,null,'yes',null,null,null,null,null]);

    // Enum_Values — normal
    const ev = wb.addWorksheet('Enum_Values');
    ev.addRow(['enum_name','value','label_de','label_en','order_index','regulation_reference','notes']);

    // Equations — normal
    const eq = wb.addWorksheet('Equations');
    eq.addRow(['equation_number','standard_code','description_de','description_en','formula','input_symbols','output_symbol','regulation_reference','used_in_worksheet','verification_status','notes']);

    // Compliance_Requirements — has a title banner on rows 1–2 before the real header
    const cr = wb.addWorksheet('Compliance_Requirements');
    cr.addRow(['DWA-A 138-1 — ATOMIC VALIDATION RULES']);   // banner row 1
    cr.addRow(['Some descriptive text', 'another bit']);    // banner row 2 (2 distinct values but no sentinels)
    cr.addRow(['requirement_code','standard_code','title','description','evaluation_type','required_field_symbols','evaluation_expression','pass_condition','regulation_reference','phase','order_index','verification_status']);
    cr.addRow(['R-1','DWA-A-138-1','T','D','field_value','x','x == 1','TRUE','§1',1,1,'verified']);

    const r = parseWorkbookSync(wb);
    expect(r.complianceRequirements[0].requirement_code).toBe('R-1');
  });
});
