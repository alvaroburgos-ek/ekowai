/**
 * Plan 3 Task 24 — VSME derived-value equations: the emitter accepts every entry,
 * the committed migration equals a fresh emit, and each formula computes through
 * the real `evaluateFormula` over rows prepared by the register contract. VSME
 * prints no worked example in prod text; the pins are arithmetic on chosen rows,
 * incl. the edge cases: an EMPTY register is never a phantom pass (counts 0, Σ
 * manual), incomplete rows never count, the Σ over an optional column treats an
 * empty cell as 0, a stored cell under an unticked flag is ignored, and the
 * cross-worksheet scalar inputs (Turnover / the GHG totals / NumberOfEmployees —
 * not inherited today) leave the row manual_required, never a value.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/vsme';
import { FIELD_CONFIGS } from '../field-configs/vsme';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { loadPriorSnapshot } from '../../../../scripts/regulation-tables/emit-field-configs-sql';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'VSME';
const prior = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/vsme.prior.json'));
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[]) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: () => undefined });
type Input = { symbol: string; value: number | string | null; unit: string | null };
const run = (n: string, opts: { inputs?: Input[]; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const manual = (r: EvalState): string => { expect(r.kind, JSON.stringify(r)).toBe('manual_required'); return r.kind === 'manual_required' ? r.reason : ''; };
const priorHas = (ws: string, sym: string) => (prior as unknown as Record<string, unknown>)[`${ws} ${sym}`] !== undefined;

describe('VSME Plan-3 equations', () => {
  it('14 entries; every output is a created derived field on its worksheet; every register input is created on the same worksheet; the 5 cross-worksheet scalar inputs are prod fields of B03.200 / B01.000 (not inherited — C-7 / C-9); no prod output re-produced (EQ-01 … EQ-10, the B04.100 fallbacks); no figure typed; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'VSME-B01.100-D1',
      'VSME-B01.200-D1', 'VSME-B01.200-D2', 'VSME-B01.200-D3',
      'VSME-B02.000-D1',
      'VSME-B03.100-D1',
      'VSME-B03.300-D1', 'VSME-B03.300-D2', 'VSME-B03.300-D3', 'VSME-B03.300-D4',
      'VSME-B07.300-D1', 'VSME-B07.300-D2',
      'VSME-B08.200-D1', 'VSME-B08.200-D2',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    const registers = new Set(FIELD_CONFIGS.filter((f) => f.widget === 'register').map((f) => `${f.worksheet} ${f.symbol}`));
    const crossInputs: string[] = [];
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      for (const s of e.input_symbols) {
        if (registers.has(`${e.worksheet} ${s}`)) continue;
        crossInputs.push(`${e.equation_number} ${s}`);
        expect(priorHas(e.worksheet, s), `${e.equation_number} input ${s} must NOT be on ${e.worksheet} (it is a scalar of another worksheet)`).toBe(false);
      }
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote ?? '').not.toContain('undefined');
      if (e.verification_quote) expect(e.verification_quote).toMatch(/\[prod verification_quote \(Para [0-9]+(\([a-z]\))?, VSME-CR-[A-Z0-9-]+\)\]$/);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(rhs(e.equation_number).replace(/IS NULL, 0, |, 0\)/g, '')).not.toMatch(/\b\d+(\.\d+)?\b/); // no figure typed — the 0 of `if(x IS NULL, 0, x)` / `if(flag, x, 0)` is structural
      expect(e.formula).not.toMatch(/AND \(/);
    }
    expect(crossInputs).toEqual([
      'VSME-B03.300-D1 TotalGrossLocationBasedGHGEmissions', 'VSME-B03.300-D1 Turnover',
      'VSME-B03.300-D2 TotalGrossMarketBasedGHGEmissions', 'VSME-B03.300-D2 Turnover',
      'VSME-B03.300-D3 TotalGrossLocationBasedScope1AndScope2GHGEmissions', 'VSME-B03.300-D3 Turnover',
      'VSME-B03.300-D4 TotalGrossMarketBasedScope1AndScope2GHGEmissions', 'VSME-B03.300-D4 Turnover',
      'VSME-B08.200-D2 NumberOfEmployees',
    ]);
    expect(priorHas('VSME-B01.000', 'Turnover')).toBe(true);
    expect(priorHas('VSME-B01.000', 'NumberOfEmployees')).toBe(true);
    for (const t of ['TotalGrossLocationBasedGHGEmissions', 'TotalGrossMarketBasedGHGEmissions', 'TotalGrossLocationBasedScope1AndScope2GHGEmissions', 'TotalGrossMarketBasedScope1AndScope2GHGEmissions']) expect(priorHas('VSME-B03.200', t), t).toBe(true);
    // the B03.300 totals are EQ-02 … EQ-05 outputs on B03.200 (prod), never re-produced here
    const prodOutputs = new Set(Object.values(prior.equations!).map((x) => x.output_symbol));
    for (const e of EQUATIONS) expect(prodOutputs.has(e.output_symbol), e.output_symbol).toBe(false);
    expect([...prodOutputs]).toEqual(expect.arrayContaining(['NumberOfEmployees', 'TotalGrossLocationBasedGHGEmissions', 'TotalGrossMarketBasedGHGEmissions']));
    expect(EQUATIONS.some((e) => /AmountOfEmissionTo(Air|Water|Soil) =/.test(e.formula))).toBe(false); // Plan 2a B04.100 untouched
    expect(EQUATIONS.some((e) => /EmployeeTurnoverRate|RateOfRecordable/.test(e.output_symbol))).toBe(false); // F-1
    // the quote-less rows are exactly the B2 / B7 / B8-by-country ones (vsme-U-1)
    expect(EQUATIONS.filter((e) => e.verification_quote === null).map((e) => e.equation_number)).toEqual(['VSME-B02.000-D1', 'VSME-B07.300-D1', 'VSME-B07.300-D2', 'VSME-B08.200-D1']);
    const { warnings } = emitEquationsSql('vsme', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('vsme', EQUATIONS);
    const files = equationFilesFor('vsme', '20260917102420');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(14);
    expect(up).not.toMatch(/B04\.100|pollutant_register/);
  });

  it('B01.200 sites: in (2,5 ha, high water-stress 100 m³) + near (1 ha, unflagged but a stored 50 m³) + a plain site + an incomplete row ⇒ 2 sites / 3,5 ha / 100 m³ (the unflagged cell is ignored, the incomplete row never counts); the bare-boolean form computes identically; empty ⇒ count 0, Σ manual (never a phantom 0)', () => {
    const rows = [
      { id: 's1', country: 'DE', address: 'Werk 1', in_biodiversity_area: true, area_ha: 2.5, high_water_stress: true, water_withdrawn_m3: 100 },
      { id: 's2', country: 'FR', address: 'Site 2', near_biodiversity_area: true, area_ha: 1, high_water_stress: false, water_withdrawn_m3: 50 },
      { id: 's3', country: 'DE', address: 'Lager' },
      { id: 's4', country: 'DE', in_biodiversity_area: true, area_ha: 9 }, // no address → incomplete
    ];
    const reg = prep('VSME-B01.200', 'sites', rows);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(reg.rows[2].values.area_ha).toBeNull();
    expect(computed(run('VSME-B01.200-D1', { registers: { sites: reg } }))).toBe(2);
    expect(computed(run('VSME-B01.200-D2', { registers: { sites: reg } }))).toBe(3.5);
    expect(computed(run('VSME-B01.200-D3', { registers: { sites: reg } }))).toBe(100);
    const bare = evaluateFormula({ equationId: 'bare', formula: 'n = count_rows(sites, in_biodiversity_area OR near_biodiversity_area)', inputSymbols: ['sites'], outputSymbol: 'n', inputs: [], registers: { sites: reg }, tableLookup: table });
    expect(computed(bare)).toBe(2);
    const empty = prep('VSME-B01.200', 'sites', []);
    expect(computed(run('VSME-B01.200-D1', { registers: { sites: empty } }))).toBe(0);
    expect(manual(run('VSME-B01.200-D2', { registers: { sites: empty } }))).toMatch(/Keine vollständigen Zeilen/);
    expect(manual(run('VSME-B01.200-D3', { registers: { sites: empty } }))).toMatch(/Keine vollständigen Zeilen/);
  });

  it('B01.100 subsidiaries: two named + one without name ⇒ 2; empty ⇒ 0', () => {
    const reg = prep('VSME-B01.100', 'subsidiaries', [{ id: 'a', name: 'Alpha GmbH', registered_address: 'Krefeld' }, { id: 'b', name: 'Beta SL' }, { id: 'c', registered_address: 'nowhere' }]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(computed(run('VSME-B01.100-D1', { registers: { subsidiaries: reg } }))).toBe(2);
    expect(computed(run('VSME-B01.100-D1', { registers: { subsidiaries: prep('VSME-B01.100', 'subsidiaries', []) } }))).toBe(0);
  });

  it('B02.000 policies: public ticked on 1 of 3 (an unset box is false) ⇒ 1; a row without issue is incomplete; empty ⇒ 0', () => {
    const reg = prep('VSME-B02.000', 'policies', [
      { id: 'p1', issue: 'ClimateChangeMember', public: true, target_set: true },
      { id: 'p2', issue: 'PollutionMember' },
      { id: 'p3', issue: 'OwnWorkforceMember', public: false },
      { id: 'p4', public: true }, // no issue → incomplete, never counts
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(computed(run('VSME-B02.000-D1', { registers: { policies: reg } }))).toBe(1);
    expect(computed(run('VSME-B02.000-D1', { registers: { policies: prep('VSME-B02.000', 'policies', []) } }))).toBe(0);
  });

  it('B03.100 energy carriers: 120,5 + 80 (a row without MWh is incomplete) ⇒ 200,5 MWh; empty ⇒ manual', () => {
    const reg = prep('VSME-B03.100', 'energy_carriers', [{ id: 'e1', carrier: 'electricity', mwh: 120.5 }, { id: 'e2', carrier: 'fuels', mwh: 80 }, { id: 'e3', carrier: 'self_generated' }]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(computed(run('VSME-B03.100-D1', { registers: { energy_carriers: reg } }))).toBe(200.5);
    expect(manual(run('VSME-B03.100-D1', { registers: { energy_carriers: prep('VSME-B03.100', 'energy_carriers', []) } }))).toMatch(/Keine vollständigen Zeilen/);
  });

  it('B03.300 GHG intensity: 1200 tCO2eq / 3 000 000 EUR ⇒ 0,0004 tCO2eq/EUR (×4); a missing Turnover (not inherited today) ⇒ manual "Fehlende oder leere Eingaben"; Turnover 0 ⇒ "Division durch Null"', () => {
    const totals: Record<string, string> = { 'VSME-B03.300-D1': 'TotalGrossLocationBasedGHGEmissions', 'VSME-B03.300-D2': 'TotalGrossMarketBasedGHGEmissions', 'VSME-B03.300-D3': 'TotalGrossLocationBasedScope1AndScope2GHGEmissions', 'VSME-B03.300-D4': 'TotalGrossMarketBasedScope1AndScope2GHGEmissions' };
    for (const [n, total] of Object.entries(totals)) {
      expect(computed(run(n, { inputs: [{ symbol: total, value: 1200, unit: 'tCO2eq' }, { symbol: 'Turnover', value: 3_000_000, unit: 'EUR' }] }))).toBeCloseTo(0.0004, 12);
      expect(manual(run(n, { inputs: [{ symbol: total, value: 1200, unit: 'tCO2eq' }] }))).toMatch(/Fehlende oder leere Eingaben: Turnover/);
      expect(manual(run(n, { inputs: [{ symbol: total, value: 1200, unit: 'tCO2eq' }, { symbol: 'Turnover', value: 0, unit: 'EUR' }] }))).toMatch(/Division durch Null/);
    }
  });

  it('B07.300 materials: steel 10 t / wood 2,5 t + 4 m³ / water 1 m³ ⇒ 12,5 t and 5 m³ (an empty cell counts 0, the row stays complete); a bare Σ over the optional column would be manual (pinned); empty ⇒ manual', () => {
    const reg = prep('VSME-B07.300', 'materials', [{ id: 'm1', name: 'Steel', weight_t: 10 }, { id: 'm2', name: 'Wood', weight_t: 2.5, volume_m3: 4 }, { id: 'm3', name: 'Water', volume_m3: 1 }]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true]);
    expect(computed(run('VSME-B07.300-D1', { registers: { materials: reg } }))).toBe(12.5);
    expect(computed(run('VSME-B07.300-D2', { registers: { materials: reg } }))).toBe(5);
    const bareSum = evaluateFormula({ equationId: 'bare', formula: 't = sum_rows(materials, weight_t)', inputSymbols: ['materials'], outputSymbol: 't', inputs: [], registers: { materials: reg }, tableLookup: table });
    expect(manual(bareSum)).toMatch(/Unbekanntes Symbol "weight_t"/);
    expect(manual(run('VSME-B07.300-D1', { registers: { materials: prep('VSME-B07.300', 'materials', []) } }))).toMatch(/Keine vollständigen Zeilen/);
  });

  it('B08.200 employees by country: 30 + 25 ⇒ 55; delta with NumberOfEmployees 60 ⇒ 5, with 55 ⇒ 0; NumberOfEmployees missing (not inherited today) ⇒ manual; a row without count is incomplete; empty ⇒ Σ manual', () => {
    const reg = prep('VSME-B08.200', 'employees_by_country', [{ id: 'c1', country: 'DE', count: 30 }, { id: 'c2', country: 'FR', count: 25 }, { id: 'c3', country: 'ES' }]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(computed(run('VSME-B08.200-D1', { registers: { employees_by_country: reg } }))).toBe(55);
    expect(computed(run('VSME-B08.200-D2', { registers: { employees_by_country: reg }, inputs: [{ symbol: 'NumberOfEmployees', value: 60, unit: null }] }))).toBe(5);
    expect(computed(run('VSME-B08.200-D2', { registers: { employees_by_country: reg }, inputs: [{ symbol: 'NumberOfEmployees', value: 55, unit: null }] }))).toBe(0);
    expect(manual(run('VSME-B08.200-D2', { registers: { employees_by_country: reg } }))).toMatch(/Fehlende oder leere Eingaben: NumberOfEmployees/);
    expect(manual(run('VSME-B08.200-D1', { registers: { employees_by_country: prep('VSME-B08.200', 'employees_by_country', []) } }))).toMatch(/Keine vollständigen Zeilen/);
  });
});
