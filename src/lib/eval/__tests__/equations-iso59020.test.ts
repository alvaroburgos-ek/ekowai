/**
 * Plan 3 Task 21 — ISO-59020 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * through the real `evaluateFormula` over rows prepared by the register contract
 * (TS fallback TABLE3, no migration applied). The standard prints no worked
 * example for the aggregates; the pins are the printed FORMS (A.1 … A.8 per row,
 * the Annex-G.2 sum-then-divide across rows, the A.2.1 / A.3.1 "100 % minus the
 * circular shares", the A.3.4 "0 % should be recorded") on chosen inputs, plus
 * the engine facts the design rests on (an optional blank required cell makes
 * the row INCOMPLETE — never a silent 0; an empty register is manual_required
 * for Σ and 0 for counts; a boolean table cell compares `== true`).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/iso59020';
import { FIELD_CONFIGS } from '../field-configs/iso59020';
import { table3AsTable } from '../regulation-tables-seed-iso59020';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig, type RegisterColumn } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'ISO-59020';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const scope = (ws: Record<string, Value>) => (s: string): Value | undefined => (s in ws ? ws[s] : undefined);
const prep = (ws: string, sym: string, rows: unknown[], symbols: Record<string, Value> = {}) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: scope(symbols) });
const run = (n: string, registers: Record<string, ReturnType<typeof prep>>): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const manual = (r: EvalState): string => { expect(r.kind, JSON.stringify(r)).toBe('manual_required'); return r.kind === 'manual_required' ? r.reason : ''; };

const INFLOWS = [
  { id: '1', label: 'Stahl', m_ti: 1000, m_reui: 200, m_reci: 500, m_reni: 0 },
  { id: '2', label: 'Holz', m_ti: 400, m_reui: 0, m_reci: 0, m_reni: 300 },
];
const OUTFLOWS = [
  { id: 'a', label: 'Produkt', m_to: 1000, m_reuo: 100, traceable_recycling: true, m_reco: 300, m_reno: 0, t_lp: 12, t_ialp: 10 },
  { id: 'b', label: 'Reststoff', m_to: 500, m_reuo: 0, m_reno: 100 },
];
const ENERGY = [
  { id: 'e1', label: 'Strom', unit: 'MJ', ei_rene: 300, eo_rene: 0, ei_te: 1000, eo_te: 0 },
  { id: 'e2', label: 'Wärme', unit: 'kWh', ei_rene: 50, eo_rene: 10, ei_te: 200, eo_te: 40 },
  { id: 'e3', label: 'Durchlauf', unit: 'MJ', ei_rene: 0, eo_rene: 0, ei_te: 100, eo_te: 100 },
];

describe('ISO-59020 Plan-3 equations', () => {
  it('47 entries, every output has a created derived field on its worksheet, every input is the register of that worksheet; no prod output re-produced; emitter accepts them with no lint warning', () => {
    expect(EQUATIONS).toHaveLength(47);
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      ...Array.from({ length: 11 }, (_, i) => `ISO-59020-04-D${i + 1}`),
      ...Array.from({ length: 11 }, (_, i) => `ISO-59020-05-D${i + 1}`),
      ...Array.from({ length: 12 }, (_, i) => `ISO-59020-06-D${i + 1}`),
      ...Array.from({ length: 7 }, (_, i) => `ISO-59020-07-D${i + 1}`),
      ...Array.from({ length: 5 }, (_, i) => `ISO-59020-08-D${i + 1}`),
      'ISO-59020-09-D1',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    const registers = new Set(FIELD_CONFIGS.filter((f) => f.widget === 'register').map((f) => `${f.worksheet} ${f.symbol}`));
    const PROD_OUTPUTS = ['pct_REUI_X', 'pct_RECI_X', 'pct_RENI_X', 'RLP_X', 'pct_REUO_X', 'pct_RECO_X', 'pct_RENO_X', 'pct_ECONRE_X', 'pct_CWW', 'pct_CDW', 'RWRR', 'RMP', 'IRII', 'pct_linear_inflow', 'pct_linear_outflow', 'mandatory_core_indicators_included'];
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.input_symbols).toHaveLength(1);
      expect(registers.has(`${e.worksheet} ${e.input_symbols[0]}`), `${e.equation_number} register input`).toBe(true); // every row is register-fed (materialised on save)
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(PROD_OUTPUTS).not.toContain(e.output_symbol); // A.1 … A.13 keep their verified rows (R-1 is STAGED)
    }
    // the only typed figure: the "6" of -04-D5 = the number of Mandatory rows printed in Table 3
    expect(rhs('ISO-59020-04-D5')).toContain('== 6');
    expect(table3AsTable().rows.filter((r) => r.values.mandatory === true)).toHaveLength(6);
    for (const e of EQUATIONS.filter((x) => x.equation_number !== 'ISO-59020-04-D5')) expect(rhs(e.equation_number).replace(/\* 100|== 0|== 1|, 0\)|== true|== false/g, '')).not.toMatch(/\b\d+\b/);
    const { warnings } = emitEquationsSql('iso59020', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('iso59020', EQUATIONS);
    const files = equationFilesFor('iso59020', '20260917102120');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(47);
  });

  it('-05 inflows: Formula (A.1) – (A.3) per row (Stahl 20 / 50 / 0 %, linear 30 % = 300 kg; Holz 0 / 0 / 75 %, linear 25 %), mass-weighted Σ (14,29 / 35,71 / 21,43 / 28,57 %), Σ masses 1400 / 200 / 500 / 300 / 400 kg, count 2, unbalanced 0; a row whose circular masses exceed mTI is unbalanced (linear −10); a blank REQUIRED mass leaves the row INCOMPLETE (excluded, never a silent 0); an empty register is manual_required for Σ and 0 for the count', () => {
    const reg = prep('ISO-59020-05', 'inflows', INFLOWS);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows[0].values).toMatchObject({ pct_reui: 20, pct_reci: 50, pct_reni: 0, pct_linear: 30, m_linear: 300, balanced: 1 });
    expect(reg.rows[1].values).toMatchObject({ pct_reui: 0, pct_reci: 0, pct_reni: 75, pct_linear: 25, m_linear: 100, balanced: 1 });
    expect(computed(run('ISO-59020-05-D1', { inflows: reg }))).toBe(2);
    expect(computed(run('ISO-59020-05-D2', { inflows: reg }))).toBe(1400);
    expect(computed(run('ISO-59020-05-D3', { inflows: reg }))).toBe(200);
    expect(computed(run('ISO-59020-05-D4', { inflows: reg }))).toBe(500);
    expect(computed(run('ISO-59020-05-D5', { inflows: reg }))).toBe(300);
    expect(computed(run('ISO-59020-05-D6', { inflows: reg }))).toBe(400);
    expect(computed(run('ISO-59020-05-D7', { inflows: reg }))).toBeCloseTo(200 / 1400 * 100, 6); // 14,2857
    expect(computed(run('ISO-59020-05-D8', { inflows: reg }))).toBeCloseTo(500 / 1400 * 100, 6); // 35,7143
    expect(computed(run('ISO-59020-05-D9', { inflows: reg }))).toBeCloseTo(300 / 1400 * 100, 6); // 21,4286
    expect(computed(run('ISO-59020-05-D10', { inflows: reg }))).toBeCloseTo(400 / 1400 * 100, 6); // 28,5714 = 100 − (14,29 + 35,71 + 21,43)
    expect(computed(run('ISO-59020-05-D11', { inflows: reg }))).toBe(0);
    // unbalanced row + blank required cell
    const reg2 = prep('ISO-59020-05', 'inflows', [...INFLOWS, { id: '3', label: 'zu viel', m_ti: 100, m_reui: 60, m_reci: 50, m_reni: 0 }, { id: '4', label: 'ohne mREUI', m_ti: 100, m_reci: 10, m_reni: 0 }]);
    expect(reg2.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(reg2.rows[2].values).toMatchObject({ pct_linear: -10, m_linear: -10, balanced: 0 });
    expect(reg2.rows[3].values).toMatchObject({ m_reui: null, pct_reui: null, pct_linear: null, balanced: null });
    expect(computed(run('ISO-59020-05-D11', { inflows: reg2 }))).toBe(1);
    expect(computed(run('ISO-59020-05-D1', { inflows: reg2 }))).toBe(3);      // the incomplete row never counts
    expect(computed(run('ISO-59020-05-D2', { inflows: reg2 }))).toBe(1500);   // … nor sums
    // a zero-mass row: the percentages are null (division by zero, silent) and the row stays complete
    const reg3 = prep('ISO-59020-05', 'inflows', [{ id: 'z', label: 'null', m_ti: 0, m_reui: 0, m_reci: 0, m_reni: 0 }]);
    expect(reg3.rows[0]).toMatchObject({ complete: true, values: { pct_reui: null, balanced: 1 } });
    expect(reg3.diagnostics).toBeUndefined();
    expect(manual(run('ISO-59020-05-D7', { inflows: reg3 }))).toMatch(/Division durch Null/);
    const empty = prep('ISO-59020-05', 'inflows', []);
    expect(manual(run('ISO-59020-05-D2', { inflows: empty }))).toMatch(/Keine vollständigen Zeilen/);
    expect(manual(run('ISO-59020-05-D7', { inflows: empty }))).toMatch(/Keine vollständigen Zeilen/);
    expect(computed(run('ISO-59020-05-D1', { inflows: empty }))).toBe(0);
    expect(computed(run('ISO-59020-05-D11', { inflows: empty }))).toBe(0);
  });

  it('-06 outflows: Formula (A.4) – (A.7) per row (Produkt 10 / 30 / 0 %, linear 60 %, RLP 1,2; Reststoff without traceable recycling data reads PRECO 0 % (A.3.4), mRECO hidden, complete); Σ 1500 / 100 / 300 / 100 / 1000 kg; mass-weighted 6,67 / 20 / 6,67 / 66,67 %; untraceable 1; a traceable row with a blank mRECO is incomplete', () => {
    const reg = prep('ISO-59020-06', 'outflows', OUTFLOWS);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows[0].values).toMatchObject({ pct_reuo: 10, pct_reco: 30, pct_reno: 0, pct_linear: 60, m_linear: 600, rlp: 1.2, balanced: 1 });
    expect(reg.rows[1].values).toMatchObject({ traceable_recycling: false, m_reco: null, pct_reuo: 0, pct_reco: 0, pct_reno: 20, pct_linear: 80, m_linear: 400, rlp: null, balanced: 1 });
    expect(computed(run('ISO-59020-06-D1', { outflows: reg }))).toBe(2);
    expect(computed(run('ISO-59020-06-D2', { outflows: reg }))).toBe(1500);
    expect(computed(run('ISO-59020-06-D3', { outflows: reg }))).toBe(100);
    expect(computed(run('ISO-59020-06-D4', { outflows: reg }))).toBe(300);
    expect(computed(run('ISO-59020-06-D5', { outflows: reg }))).toBe(100);
    expect(computed(run('ISO-59020-06-D6', { outflows: reg }))).toBe(1000);
    expect(computed(run('ISO-59020-06-D7', { outflows: reg }))).toBeCloseTo(100 / 1500 * 100, 6);
    expect(computed(run('ISO-59020-06-D8', { outflows: reg }))).toBe(20);
    expect(computed(run('ISO-59020-06-D9', { outflows: reg }))).toBeCloseTo(100 / 1500 * 100, 6);
    expect(computed(run('ISO-59020-06-D10', { outflows: reg }))).toBeCloseTo(1000 / 1500 * 100, 6);
    expect(computed(run('ISO-59020-06-D11', { outflows: reg }))).toBe(0);
    expect(computed(run('ISO-59020-06-D12', { outflows: reg }))).toBe(1);
    const reg2 = prep('ISO-59020-06', 'outflows', [...OUTFLOWS, { id: 'c', label: 'offen', m_to: 500, m_reuo: 0, m_reno: 100, traceable_recycling: true }]);
    expect(reg2.rows[2]).toMatchObject({ complete: false, values: { pct_reco: null, pct_linear: null, balanced: null } });
    expect(computed(run('ISO-59020-06-D1', { outflows: reg2 }))).toBe(2);
    expect(computed(run('ISO-59020-06-D8', { outflows: reg2 }))).toBe(20);
    // over-balanced row
    const reg3 = prep('ISO-59020-06', 'outflows', [{ id: 'o', label: 'zu viel', m_to: 100, m_reuo: 80, traceable_recycling: true, m_reco: 30, m_reno: 0 }]);
    expect(reg3.rows[0].values).toMatchObject({ balanced: 0, pct_linear: -10 });
    expect(computed(run('ISO-59020-06-D11', { outflows: reg3 }))).toBe(1);
  });

  it('-07 energy flows: Formula (A.8) per row with · 100 (Strom 30 %, Wärme 25 %; a zero net-consumption row reads a null cell and stays complete); Σ 350 / 10 / 1300 / 140 in the common unit; (A.8) over the sums = 29,31 %; the kWh row mismatches the worksheet\'s MJ (1); without energy_unit_common every row mismatches (3)', () => {
    const reg = prep('ISO-59020-07', 'energy_flows', ENERGY, { energy_unit_common: 'MJ' });
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows[0].values).toMatchObject({ net_consumed: 1000, pct_econre: 30, unit_ok: 1 });
    expect(reg.rows[1].values).toMatchObject({ net_consumed: 160, pct_econre: 25, unit_ok: 0 });
    expect(reg.rows[2].values).toMatchObject({ net_consumed: 0, pct_econre: null, unit_ok: 1 });
    expect(computed(run('ISO-59020-07-D1', { energy_flows: reg }))).toBe(3);
    expect(computed(run('ISO-59020-07-D2', { energy_flows: reg }))).toBe(350);
    expect(computed(run('ISO-59020-07-D3', { energy_flows: reg }))).toBe(10);
    expect(computed(run('ISO-59020-07-D4', { energy_flows: reg }))).toBe(1300);
    expect(computed(run('ISO-59020-07-D5', { energy_flows: reg }))).toBe(140);
    expect(computed(run('ISO-59020-07-D6', { energy_flows: reg }))).toBeCloseTo(340 / 1160 * 100, 6); // 29,3103
    expect(computed(run('ISO-59020-07-D7', { energy_flows: reg }))).toBe(1);
    const unset = prep('ISO-59020-07', 'energy_flows', ENERGY, {});
    expect(unset.rows.map((r) => r.values.unit_ok)).toEqual([0, 0, 0]);
    expect(computed(run('ISO-59020-07-D7', { energy_flows: unset }))).toBe(3);
    // Σ in = Σ out ⇒ (A.8) over the sums divides by zero ⇒ manual_required (never a phantom %)
    const flat = prep('ISO-59020-07', 'energy_flows', [ENERGY[2]], { energy_unit_common: 'MJ' });
    expect(manual(run('ISO-59020-07-D6', { energy_flows: flat }))).toMatch(/Division durch Null/);
  });

  it('-04 indicators over the seeded TABLE3: a Mandatory row neither selected nor N/A is missing (A.2.3 ⇒ mandatory_missing 1), an N/A row without explanation is unjustified (A.2.4 ⇒ 1), covered 5 of 6 ⇒ code 0; with all six Mandatory rows selected or justified ⇒ covered 6, missing 0, code 1; per-category selection counts; a row without an indicator is incomplete; empty register ⇒ 0 / 0 / 0 / 0 / code 0 (never a phantom pass)', () => {
    const rows = [
      { id: '1', indicator: 'A.2.2_reused_content_inflow', selected: true, value: 20, unit: '%' },
      { id: '2', indicator: 'A.2.3_recycled_content_inflow' },
      { id: '3', indicator: 'A.2.4_renewable_content_inflow', not_applicable: true },
      { id: '4', indicator: 'A.3.3_reused_from_outflow', not_applicable: true, justification: 'Kein Abfluss zur Wiederverwendung' },
      { id: '5', indicator: 'A.3.4_recycled_from_outflow', selected: true },
      { id: '6', indicator: 'A.3.5_biological_recirculation', selected: true },
      { id: '7', indicator: 'A.4.2_renewable_energy', selected: true },
      { id: '8', indicator: 'A.5.2_water_circular_sources' },
      { id: '9' },
    ];
    const reg = prep('ISO-59020-04', 'indicators', rows);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true, true, true, true, true, false]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows[0].values).toMatchObject({ category: 'Resource Inflows', category_code: 'resource_inflow', mandatory_optional: 'Mandatory', principle: 'Retaining resource value', mandatory_flag: 1, ok: 1, na_justified: 1 });
    expect(reg.rows[1].values).toMatchObject({ mandatory_flag: 1, ok: 0, na_justified: 1 });
    expect(reg.rows[2].values).toMatchObject({ mandatory_flag: 1, ok: 1, na_justified: 0 });
    expect(reg.rows[3].values).toMatchObject({ mandatory_flag: 1, ok: 1, na_justified: 1 });
    expect(reg.rows[6].values).toMatchObject({ category_code: 'energy', mandatory_flag: 0, ok: 1 });
    expect(reg.rows[7].values).toMatchObject({ category_code: 'water', mandatory_flag: 0, ok: 1 }); // optional, not selected: fine
    expect(reg.rows[8].values).toMatchObject({ indicator: null, mandatory_flag: null, ok: null });
    expect(computed(run('ISO-59020-04-D1', { indicators: reg }))).toBe(8);
    expect(computed(run('ISO-59020-04-D2', { indicators: reg }))).toBe(1);
    expect(computed(run('ISO-59020-04-D3', { indicators: reg }))).toBe(1);
    expect(computed(run('ISO-59020-04-D4', { indicators: reg }))).toBe(5);
    expect(computed(run('ISO-59020-04-D5', { indicators: reg }))).toBe(0);
    expect(computed(run('ISO-59020-04-D6', { indicators: reg }))).toBe(1);
    expect(computed(run('ISO-59020-04-D7', { indicators: reg }))).toBe(2);
    expect(computed(run('ISO-59020-04-D8', { indicators: reg }))).toBe(1);
    expect(computed(run('ISO-59020-04-D9', { indicators: reg }))).toBe(0);
    expect(computed(run('ISO-59020-04-D10', { indicators: reg }))).toBe(0);
    const full = prep('ISO-59020-04', 'indicators', table3AsTable().rows.filter((r) => r.values.mandatory === true).map((r, i) => ({ id: String(i), indicator: r.row_key, selected: i !== 2, not_applicable: i === 2, justification: i === 2 ? 'nur nicht-erneuerbare Rohstoffe' : undefined })));
    expect(computed(run('ISO-59020-04-D2', { indicators: full }))).toBe(0);
    expect(computed(run('ISO-59020-04-D4', { indicators: full }))).toBe(6);
    expect(computed(run('ISO-59020-04-D5', { indicators: full }))).toBe(1);
    expect(computed(run('ISO-59020-04-D6', { indicators: full }))).toBe(2); // A.2.4 is N/A, not selected
    const empty = prep('ISO-59020-04', 'indicators', []);
    for (const n of ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10']) expect(computed(run(`ISO-59020-04-${n}`, { indicators: empty })), n).toBe(0);
    // additional indicators
    const add = prep('ISO-59020-04', 'additional_indicators', [{ id: 'x', name: 'B.4.3 Energy intensity', value: 1.2, unit: 'MJ/kg' }, { id: 'y', definition: 'ohne Namen' }]);
    expect(add.rows.map((r) => r.complete)).toEqual([true, false]);
    expect(computed(run('ISO-59020-04-D11', { additional_indicators: add }))).toBe(1);
  });

  it('G-15 engine fact: a BOOLEAN table cell filled into a lookup_value column compares `== true` (1), never `== 1` (0) — the module reads the printed "Mandatory" string instead', () => {
    const cols: RegisterColumn[] = [
      { key: 'indicator', label: 'i', type: 'lookup_key', required: true, lookup: { table_code: 'TABLE3' } },
      { key: 'mandatory', label: 'm', type: 'lookup_value', lookup: { table_code: 'TABLE3', key_column: 'indicator', value: 'mandatory' } },
      { key: 'eq_true', label: 'a', type: 'derived', expr: 'if(mandatory == true, 1, 0)' },
      { key: 'eq_one', label: 'b', type: 'derived', expr: 'if(mandatory == 1, 1, 0)' },
    ];
    const r = prepareRegisterRows({ rows: [{ id: '1', indicator: 'A.2.2_reused_content_inflow' }, { id: '2', indicator: 'A.4.2_renewable_energy' }] }, cols, { table, tableRows });
    expect(r.rows.map((x) => [x.values.mandatory, x.values.eq_true, x.values.eq_one])).toEqual([[true, 1, 0], [false, 0, 0]]);
  });

  it('-08 data sources: three printed pairs as required enums (a row without them is incomplete), untraceable / secondary / generic / background counts; -09 complementary methods count', () => {
    const ds = prep('ISO-59020-08', 'data_sources', [
      { id: '1', component: 'Glasschmelze', source: 'Lieferabrufe', origin: 'primary', scope: 'foreground', specificity: 'specific', traceable: true, documented: true },
      { id: '2', component: 'Rücknahmesystem', source: 'Branchenstatistik', origin: 'secondary', scope: 'background', specificity: 'generic' },
      { id: '3', component: 'ohne Einordnung' },
    ]);
    expect(ds.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(ds.rows.map((r) => r.values.conservative)).toEqual([0, 1, null]);
    expect(computed(run('ISO-59020-08-D1', { data_sources: ds }))).toBe(2);
    expect(computed(run('ISO-59020-08-D2', { data_sources: ds }))).toBe(1);
    expect(computed(run('ISO-59020-08-D3', { data_sources: ds }))).toBe(1);
    expect(computed(run('ISO-59020-08-D4', { data_sources: ds }))).toBe(1);
    expect(computed(run('ISO-59020-08-D5', { data_sources: ds }))).toBe(1);
    const cm = prep('ISO-59020-09', 'complementary_methods', [{ id: '1', method: 'ISO 14044', aspect: 'environmental' }, { id: '2', method: 'ISO 26000', aspect: 'social' }, { id: '3', aspect: 'economic' }]);
    expect(cm.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(computed(run('ISO-59020-09-D1', { complementary_methods: cm }))).toBe(2);
  });
});
