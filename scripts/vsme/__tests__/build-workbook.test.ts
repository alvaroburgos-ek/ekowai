import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildVsmeRows, buildVsmeWorkbook, type ComplianceRow, type EquationsRow, type FieldsRow } from '../build-workbook';
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
  it('every compliance row is hosted where ALL its gated symbols live (gate reachability)', () => {
    const rows = buildVsmeRows(TAXONOMY_DIR);
    const fieldWs = new Map(rows.fields.map((f) => [f.symbol, f.origin_worksheet]));
    const unreachable: string[] = [];
    for (const cr of rows.compliance_requirements) {
      const syms = (cr.required_field_symbols ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const hosts = new Set(syms.map((s) => fieldWs.get(s)));
      if (hosts.size === 1) {
        // single-owner CR: MUST be explicitly hosted there
        if (cr.worksheet_code !== [...hosts][0]) {
          unreachable.push(`${cr.requirement_code} → ${cr.worksheet_code} but fields on ${[...hosts][0]}`);
        }
      } else {
        // multi-worksheet CR: STOP case — must NOT carry a fabricated host
        if (cr.worksheet_code != null) {
          unreachable.push(`${cr.requirement_code} spans ${[...hosts].join('+')} yet claims ${cr.worksheet_code}`);
        }
      }
    }
    expect(unreachable).toEqual([]);
    // and the collapse itself is gone: not everything on B01.000
    const hostSet = new Set(rows.compliance_requirements.map((c: ComplianceRow) => c.worksheet_code ?? 'LEGACY'));
    expect(hostSet.size).toBeGreaterThan(1);
  });
  it('frozen host distribution — 31 compliance rows land on their owning worksheet, not the B01.000 collapse (regression guard)', () => {
    // Captured from actual buildVsmeRows output after the Task-3 fix (2026-07-27).
    // 8 rows legitimately stay on VSME-B01.000 (their gated fields DO live there);
    // the other 23 move off the dead B01.000-collapse onto their real host
    // worksheet. Zero STOP+REPORT (multi-worksheet) cases exist in the current
    // curated set — if a future edit to requirements.ts introduces one, this
    // test will fail loudly rather than silently re-collapsing hosting.
    const EXPECTED_HOSTS: Record<string, string | null> = {
      'VSME-CR-B01-01': 'VSME-B01.000',
      'VSME-CR-B01-02': 'VSME-B01.000',
      'VSME-CR-B01-03': 'VSME-B01.000',
      'VSME-CR-B01-04': 'VSME-B01.000',
      'VSME-CR-B01-05': 'VSME-B01.000',
      'VSME-CR-B01-06': 'VSME-B01.000',
      'VSME-CR-B01-07': 'VSME-B01.000',
      'VSME-CR-B01-08': 'VSME-B01.000',
      'VSME-CR-B01-09': 'VSME-B01.200',
      'VSME-CR-B03-01': 'VSME-B03.000',
      'VSME-CR-B03-02': 'VSME-B03.200',
      'VSME-CR-B03-03': 'VSME-B03.200',
      'VSME-CR-B03-04': 'VSME-B03.300',
      'VSME-CR-B05-01': 'VSME-B05.000',
      'VSME-CR-B06-01': 'VSME-B06.000',
      'VSME-CR-B06-02': 'VSME-B06.000',
      'VSME-CR-B07-01': 'VSME-B07.000',
      'VSME-CR-B07-02': 'VSME-B07.200',
      'VSME-CR-B08-01': 'VSME-B08.000',
      'VSME-CR-B08-02': 'VSME-B08.100',
      'VSME-CR-B08-03': 'VSME-B08.300',
      'VSME-CR-B09-01': 'VSME-B09.000',
      'VSME-CR-B09-02': 'VSME-B09.000',
      'VSME-CR-B09-03': 'VSME-B09.000',
      'VSME-CR-B10-01': 'VSME-B10.000',
      'VSME-CR-B10-02': 'VSME-B10.000',
      'VSME-CR-B11-01': 'VSME-B11.000',
      'VSME-CR-C01-01': 'VSME-C01.000',
      'VSME-CR-C06-01': 'VSME-C06.000',
      'VSME-CR-C08-01': 'VSME-C08.100',
      'VSME-CR-C09-01': 'VSME-C09.000',
    };
    const actual: Record<string, string | null> = {};
    for (const cr of r.compliance_requirements) {
      actual[cr.requirement_code] = cr.worksheet_code;
    }
    expect(Object.keys(actual).sort()).toEqual(Object.keys(EXPECTED_HOSTS).sort());
    expect(actual).toEqual(EXPECTED_HOSTS);
    // exactly 23 rows moved off the legacy VSME-B01.000 collapse.
    const rehosted = r.compliance_requirements.filter(
      (c: ComplianceRow) => c.worksheet_code != null && c.worksheet_code !== 'VSME-B01.000',
    );
    expect(rehosted).toHaveLength(23);
  });
});

describe('B03.300 GHG-intensity equations (VSME para 31, Task 5)', () => {
  const r = buildVsmeRows(TAXONOMY_DIR);

  // VSME para 31 (rendered PDF p.9): "The undertaking shall disclose its GHG
  // intensity calculated by dividing 'gross greenhouse gas (GHG) emissions'
  // disclosed under paragraph 30 by 'turnover (in Euro)' disclosed under
  // paragraph 24(e)(iv)." Four dividends (the B3 ¶30 GHG totals) each divided
  // by the single B1 ¶24(e)(iv) Turnover field.
  const EXPECTED: Array<{ output: string; dividend: string }> = [
    {
      output: 'Scope1AndScope2GreenhouseGasEmissionsIntensityValueLocationBased',
      dividend: 'TotalGrossLocationBasedScope1AndScope2GHGEmissions',
    },
    {
      output: 'Scope1AndScope2GreenhouseGasEmissionsIntensityValueMarketBased',
      dividend: 'TotalGrossMarketBasedScope1AndScope2GHGEmissions',
    },
    {
      output: 'TotalLocationBasedGreenhouseGasEmissionsIntensityValue',
      dividend: 'TotalGrossLocationBasedGHGEmissions',
    },
    {
      output: 'TotalMarketBasedGreenhouseGasEmissionsIntensityValue',
      dividend: 'TotalGrossMarketBasedGHGEmissions',
    },
  ];

  it('emits 14 equations total (10 linkbase-derived + 4 hand-authored B03.300 intensity)', () => {
    expect(r.equations).toHaveLength(14);
  });

  it('each intensity equation is present with the exact formula string, on VSME-B03.300, cited to para 31', () => {
    for (const { output, dividend } of EXPECTED) {
      const eq = r.equations.find((e: EquationsRow) => e.output_symbol === output);
      expect(eq, output).toBeDefined();
      expect(eq!.formula).toBe(`${output} = ${dividend} / Turnover`);
      expect(eq!.used_in_worksheet).toBe('VSME-B03.300');
      expect(eq!.regulation_reference).toBe('VSME B3 para 31');
      expect(eq!.standard_code).toBe('VSME');
      expect(eq!.verification_status).toBe('imported_unverified');
      expect(eq!.input_symbols).toContain(dividend);
      expect(eq!.input_symbols).toContain('Turnover');
    }
  });

  it('the 4 dividend totals + Turnover declare VSME-B03.300 as a consumer_worksheets entry', () => {
    const inputSymbols = [...EXPECTED.map((e) => e.dividend), 'Turnover'];
    for (const sym of inputSymbols) {
      const f = r.fields.find((x: FieldsRow) => x.symbol === sym);
      expect(f, sym).toBeDefined();
      const consumers = (f!.consumer_worksheets ?? '')
        .split(/[,;]/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      expect(consumers, sym).toContain('VSME-B03.300');
    }
  });

  it('does not disturb the 10 linkbase-generated equations', () => {
    const linkbaseNumbers = r.equations
      .filter((e: EquationsRow) => e.equation_number.startsWith('VSME-EQ-') && Number(e.equation_number.slice(-2)) <= 10)
      .map((e: EquationsRow) => e.equation_number);
    expect(linkbaseNumbers).toHaveLength(10);
  });
});

describe('buildVsmeWorkbook round-trip', () => {
  it('xlsx parses through the real pass3c parser', async () => {
    const buffer = await buildVsmeWorkbook(TAXONOMY_DIR);

    // Load into ExcelJS and parse with the real importer parser.
    const wb = new ExcelJS.Workbook();
    // exceljs types `load` against its own ArrayBuffer-shaped Buffer interface;
    // Node Buffers work at runtime, so widen via ArrayBuffer for the typecheck.
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
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
