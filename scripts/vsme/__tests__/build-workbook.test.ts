import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildVsmeRows, buildVsmeWorkbook } from '../build-workbook';
import { parseWorkbookSync } from '../../_pass3c-parsers';
import { TAXONOMY_DIR } from '../_setup';

describe('buildVsmeRows', () => {
  const r = buildVsmeRows(TAXONOMY_DIR);
  it('one standard VSME', () => {
    expect(r.standards).toHaveLength(1);
    expect(r.standards[0].code).toBe('VSME');
  });
  it('emits worksheets for B03 (energy) and B07 (circular)', () => {
    const codes = r.worksheets.map((w: any) => w.worksheet_code);
    expect(codes.some((c: string) => c.includes('B03'))).toBe(true);
    expect(codes.some((c: string) => c.includes('B07'))).toBe(true);
  });
  it('every field has owner + xbrl_element_id; ~100-160 fields', () => {
    expect(r.fields.length).toBeGreaterThan(90);
    expect(r.fields.length).toBeLessThan(200);
    for (const f of r.fields) {
      expect(['ekowai_env','client_supplied','general']).toContain(f.owner);
      expect(f.xbrl_element_id).toMatch(/^vsme_/);
    }
  });
  it('B06 water fields are ekowai_env', () => {
    const water = r.fields.filter((f: any) => f.origin_worksheet.includes('B06'));
    expect(water.length).toBeGreaterThan(0);
    expect(water.every((f: any) => f.owner === 'ekowai_env')).toBe(true);
  });
  it('archetypes are valid', () => {
    const ok = new Set(['registration','data_collection','calculation','summary','verification']);
    expect(r.worksheets.every((w: any) => ok.has(w.archetype))).toBe(true);
  });
  it('emits ≥1 compliance requirements with evaluation_type field_presence', () => {
    expect(r.compliance_requirements.length).toBeGreaterThanOrEqual(1);
    for (const cr of r.compliance_requirements) {
      expect(cr.evaluation_type).toBe('field_presence');
      expect(cr.severity).toBe('block');
    }
  });
});

describe('buildVsmeWorkbook round-trip', () => {
  it('xlsx parses through the real pass3c parser', async () => {
    const buffer = await buildVsmeWorkbook(TAXONOMY_DIR);

    // Load into ExcelJS and parse with the real importer parser.
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const parsed = parseWorkbookSync(wb);

    // Fields sanity: >90 fields, all valid owners, at least one vsme_ xbrl_element_id.
    expect(parsed.fields.length).toBeGreaterThan(90);
    const validOwners = new Set(['ekowai_env', 'client_supplied', 'general']);
    for (const f of parsed.fields) {
      expect(validOwners).toContain(f.owner);
    }
    expect(parsed.fields.some((f) => /^vsme_/.test(f.xbrl_element_id ?? ''))).toBe(true);
  });
});
