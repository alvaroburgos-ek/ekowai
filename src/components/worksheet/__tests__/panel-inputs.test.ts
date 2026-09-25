/**
 * panel-inputs.ts = origin/main's worksheet-form memos (design window, Tab. 3, guideline tables, site portal links),
 * moved verbatim out of the form when origin/main was merged into feat/guideline-to-tool (2026-09-25). Pins the
 * behaviour main's form had: which worksheet shows which panel, the rain rows / compare column the design window
 * scans, the Q_Dr ⇒ 0 scalar default, the Tab. 8 A_C band and the site-coordinate pair.
 */
import { describe, it, expect } from 'vitest';
import type { FieldValue } from '@/lib/state/worksheet-store';
import { designWindowInputs, tab3Inputs, guidelineTableInputs, sitePortalFieldIds, type PanelField } from '../panel-inputs';

const field = (symbol: string, dataType = 'number', inheritedFromWorksheet?: string): PanelField => ({
  id: `f-${symbol}`, symbol, dataType, inheritedFromWorksheet,
});
const bySymbol = (fs: PanelField[]) => new Map(fs.map((f) => [f.symbol, f]));

const KOSTRA = {
  tables: [{
    id: 'tbl-1', name: 'KOSTRA', source: 'kostra_dwd_2020', columns: [1, 2, 3, 5, 10],
    rows: [
      { D_min: 5, r: { '2': 250, '5': 320 } },
      { D_min: 10, r: { '2': 180, '5': 230 } },
    ],
  }],
};

describe('designWindowInputs (origin/main 5f67b98)', () => {
  const fields = [field('r_D_n_table', 'json', 'A138-04'), field('rainfall_table_ref', 'text'), field('A_C'), field('k_i'), field('A_S')];
  const values: Record<string, FieldValue> = {
    'f-r_D_n_table': { type: 'json', value: KOSTRA },
    'f-rainfall_table_ref': { type: 'text', value: 'tbl-1' },
    'f-A_C': { type: 'number', value: 1200 },
    'f-k_i': { type: 'number', value: 1e-5 },
  };

  it('is null on a worksheet without a design window', () => {
    expect(designWindowInputs({ worksheetCode: 'A138-07', fields, fieldBySymbol: bySymbol(fields), values, designReturnPeriod: 5 })).toBeNull();
  });

  it('A138-16: rows of the design column, the next lower populated column for comparison, Q_Dr absent ⇒ 0', () => {
    const r = designWindowInputs({ worksheetCode: 'A138-16', fields, fieldBySymbol: bySymbol(fields), values, designReturnPeriod: 5 });
    expect(r).not.toBeNull();
    expect(r!.facility).toBe('flaeche');
    expect(r!.T).toBe(5);
    expect(r!.rows).toEqual([{ D_min: 5, r_D_n: 320 }, { D_min: 10, r_D_n: 230 }]);
    expect(r!.compareRows?.T).toBe(2);
    expect(r!.compareRows?.rows).toEqual([{ D_min: 5, r_D_n: 250 }, { D_min: 10, r_D_n: 180 }]);
    expect(r!.scalars.A_C).toBe(1200);
    expect(r!.scalars.Q_Dr).toBe(0);
    expect(r!.scalars.f_A).toBe(1);
  });

  it('is null when another facility is chosen or the project holds no rainfall table; an unset ref falls back to the first table', () => {
    const withChoice = [...fields, field('facility_type_selected', 'enum')];
    const chosenMulde = { ...values, 'f-facility_type_selected': { type: 'enum', value: 'mulde' } as FieldValue };
    expect(designWindowInputs({ worksheetCode: 'A138-16', fields: withChoice, fieldBySymbol: bySymbol(withChoice), values: chosenMulde, designReturnPeriod: 5 })).toBeNull();
    const noRef = { ...values, 'f-rainfall_table_ref': { type: 'text', value: null } as FieldValue };
    expect(designWindowInputs({ worksheetCode: 'A138-16', fields, fieldBySymbol: bySymbol(fields), values: noRef, designReturnPeriod: 5 })?.rows).toHaveLength(2);
    const noTables = { ...values, 'f-r_D_n_table': { type: 'json', value: { tables: [] } } as FieldValue };
    expect(designWindowInputs({ worksheetCode: 'A138-16', fields, fieldBySymbol: bySymbol(fields), values: noTables, designReturnPeriod: 5 })).toBeNull();
  });
});

describe('tab3Inputs / guidelineTableInputs / sitePortalFieldIds', () => {
  it('Tab. 3 only on A138-02, with the determination field id', () => {
    const fs = [field('gw_clearance'), field('feasibility_determination', 'enum')];
    expect(tab3Inputs('A138-03', bySymbol(fs))).toBeNull();
    const t = tab3Inputs('A138-02', bySymbol(fs))!;
    expect(t.determinationFieldId).toBe('f-feasibility_determination');
    expect(t.metas.gw_clearance).toEqual({ id: 'f-gw_clearance', dataType: 'number', inheritedFrom: undefined });
  });

  it('Tab. 8 on A138-08 carries the A_C band from the (inherited) A_C', () => {
    const fs = [field('A_C', 'number', 'A138-07')];
    const le = guidelineTableInputs('A138-08', bySymbol(fs), { 'f-A_C': { type: 'number', value: 800 } });
    expect(le.map((g) => g.code)).toEqual(['TAB8']);
    expect(le[0].extra).toEqual({ ac_band: 'le800' });
    expect(le[0].metas.A_C).toEqual({ id: 'f-A_C', dataType: 'number', inheritedFrom: 'A138-07' });
    expect(guidelineTableInputs('A138-08', bySymbol(fs), { 'f-A_C': { type: 'number', value: 801 } })[0].extra).toEqual({ ac_band: 'gt800' });
    expect(guidelineTableInputs('A138-08', bySymbol(fs), {})[0].extra).toEqual({});
    expect(guidelineTableInputs('A138-07', bySymbol(fs), {})).toEqual([]);
  });

  it('site portal links need BOTH coordinates', () => {
    expect(sitePortalFieldIds([field('site_lat'), field('site_lon')])).toEqual({ latFieldId: 'f-site_lat', lonFieldId: 'f-site_lon' });
    expect(sitePortalFieldIds([field('site_lat')])).toBeNull();
  });
});
