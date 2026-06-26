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
  it('assigns concepts to their FULL role worksheet — every emitted worksheet owns ≥1 field', () => {
    // Structural-gap fix: concepts land on their exact presentation role
    // (e.g. VSME-B03.200), not a 3-char-prefix-collapsed VSME-B03.000.
    const withFields = new Set(r.fields.map((f: any) => f.origin_worksheet));
    const empties = r.worksheets
      .map((w: any) => w.worksheet_code)
      .filter((c: string) => !withFields.has(c));
    expect(empties).toEqual([]); // no permanently-empty tabs
    // 40 worksheets after suppressing the single re-presentation-only role
    // ([C03.100] GHG Reduction Targets, which owns no scalar of its own); 143 fields.
    expect(r.worksheets).toHaveLength(40);
    expect(r.fields).toHaveLength(143);
    // C03.100 must NOT be emitted (re-presentation-only, suppressed).
    expect(r.worksheets.map((w: any) => w.worksheet_code)).not.toContain('VSME-C03.100');
  });
  it('B3 §30 GHG disclosures live on B03.200 (Estimated GHG Emissions), not C03', () => {
    // The eight Gross.../Total...GHGEmissions concepts are presented under BOTH
    // [B03.200] (Basic Module B3 ¶30) and [C03.100]; B3 is their primary home.
    const ghg = [
      'GrossScope1GreenhouseGasEmissions',
      'GrossLocationBasedScope2GreenhouseGasEmissions',
      'GrossMarketBasedScope2GreenhouseGasEmissions',
      'GrossScope3GreenhouseGasEmissions',
      'TotalGrossLocationBasedScope1AndScope2GHGEmissions',
      'TotalGrossMarketBasedScope1AndScope2GHGEmissions',
      'TotalGrossLocationBasedGHGEmissions',
      'TotalGrossMarketBasedGHGEmissions',
    ];
    for (const sym of ghg) {
      const f = r.fields.find((x: any) => x.symbol === sym);
      expect(f, sym).toBeDefined();
      expect(f!.origin_worksheet, sym).toBe('VSME-B03.200');
    }
    // and none of them ended up on a C03 worksheet
    const onC03 = r.fields.filter(
      (x: any) => ghg.includes(x.symbol) && x.origin_worksheet.startsWith('VSME-C03'),
    );
    expect(onC03).toHaveLength(0);
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
  it('emits the curated compliance requirement set (block + warn)', () => {
    const crs = r.compliance_requirements;
    // Curated set: source-cited mandatory ⇒ block, conditional/voluntary ⇒ warn.
    expect(crs.length).toBeGreaterThanOrEqual(20);
    const block = crs.filter((c: any) => c.severity === 'block');
    const warn = crs.filter((c: any) => c.severity === 'warn');
    expect(block.length).toBe(9);
    expect(warn.length).toBeGreaterThanOrEqual(15);
    for (const cr of crs) {
      // every row carries an explicit, source-cited clause + a gate condition
      expect(cr.evaluation_type).toBe('field_presence');
      expect(['block', 'warn']).toContain(cr.severity);
      expect(cr.regulation_reference).toMatch(/^VSME /);
      expect((cr.evaluation_expression ?? '').length).toBeGreaterThan(0);
    }
    // the firmest gate (B1 module option) must be present and blocking
    const b1 = crs.find((c: any) => c.requirement_code === 'VSME-CR-B01-01');
    expect(b1?.severity).toBe('block');
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
