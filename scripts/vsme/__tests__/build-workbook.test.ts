import { describe, it, expect } from 'vitest';
import { buildVsmeRows } from '../build-workbook';
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
});
