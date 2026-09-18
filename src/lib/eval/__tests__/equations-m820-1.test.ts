/**
 * Plan 3 Task 18 — DWA-M-820-1 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the real `evaluateFormula` over rows prepared by the
 * register contract (TS fallback tables, no migration applied). Pinned against
 * the printed figures: Tab. D.1 bands (L1465–L1470), the 139.000 / 214.000 €
 * thresholds (L1329 / L1330), the § 3 Abs. 9 VgV constants (L1366), the two-year
 * interval (L1255), the ±25 % example (L555), the § 8.6 "erreicht oder übersteigt"
 * boundary (L864) and the § 45 Abs. 2 VgV / Faktor-1,5 pair (L1623).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS, tabD1Chain, STAKEHOLDER_KATEGORIEN_EXPR } from '../equations/m820_1';
import { FIELD_CONFIGS } from '../field-configs/m820_1';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-M-820-1';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[]) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: () => undefined }, {});
const run = (n: string, opts: { inputs?: Array<{ symbol: string; value: number | string | null; unit: string | null }>; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const reason = (r: EvalState): string => (r.kind === 'manual_required' ? r.reason : `<${r.kind}>`);
const num = (symbol: string, value: number | string | null, unit: string | null = null) => ({ symbol, value, unit });

describe('DWA-M-820-1 Plan-3 equations', () => {
  it('36 entries, every output has a created derived field on the same worksheet, every input is a symbol or register, no new output is chained, no prod symbol re-produced; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'M820-03-D1', 'M820-03-D2',
      'M820-09-D1', 'M820-09-D2', 'M820-09-D3', 'M820-09-D4', 'M820-09-D5', 'M820-09-D6', 'M820-09-D7', 'M820-09-D8', 'M820-09-D9', 'M820-09-D10', 'M820-09-D11', 'M820-09-D12', 'M820-09-D13', 'M820-09-D14', 'M820-09-D15',
      'M820-13-D1',
      'M820-14-D1', 'M820-14-D2', 'M820-14-D3',
      'M820-16-D1', 'M820-16-D2', 'M820-16-D3', 'M820-16-D4',
      'M820-18-D1', 'M820-18-D2', 'M820-18-D3', 'M820-18-D4',
      'M820-20-D1', 'M820-20-D2', 'M820-20-D3',
      'M820-22-D1', 'M820-22-D2', 'M820-22-D3', 'M820-22-D4',
    ]);
    const created = new Map(FIELD_CONFIGS.filter((f) => f.create).map((f) => [`${f.worksheet} ${f.symbol}`, f.widget]));
    for (const e of EQUATIONS) {
      expect(created.get(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe('derived');
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    // single-source: no Plan-3 equation outputs a prod symbol (the typed threshold / counts / sums / booleans keep their fields — D-blocks)
    const prodInputs = ['eu_threshold_value', 'oberschwellig_check', 'threshold_status', 'cost_estimate_near_threshold', 'loseausnahme_applicable', 'lot_value_threshold_services', 'lot_value_threshold_construction', 'lot_share_threshold_pct', 'eu_threshold_review_interval_years', 'price_weight_percent', 'qualitaets_kriterien_anzahl', 'bewertungskommission_size', 'bewertungskommission_chairperson', 'applicant_count', 'shortlisted_count', 'final_offers_count', 'winning_bidder', 'negotiation_rounds', 'required_standstill_days', 'liability_insurance_personenschaden', 'liability_insurance_sonstige', 'haftpflicht_versicherungssumme', 'contract_invalidity_135_gwb_risk'];
    for (const e of EQUATIONS) expect(prodInputs).not.toContain(e.output_symbol);
    // a prod boolean is never a formula input (engineInputValue → missing): the § 134 / E.1.4.1 switches are lookup_fill twins
    for (const e of EQUATIONS) for (const s of ['information_letters_sent', 'electronic_transmission', 'large_long_project', 'festpreis_used', 'oberschwellig_check']) expect(e.input_symbols, `${e.equation_number} reads boolean ${s}`).not.toContain(s);
    // the only new-output inputs are the two lookup_fill twins (persisted values, not equation outputs)
    const newOutputs = new Set(EQUATIONS.map((e) => e.output_symbol));
    for (const e of EQUATIONS) for (const s of e.input_symbols) expect(newOutputs.has(s), `${e.equation_number} reads new output ${s}`).toBe(false);
    expect(eq('M820-09-D3').input_symbols).toContain('eu_threshold_value_anhb23');
    expect(eq('M820-13-D1').input_symbols).toContain('min_annual_revenue_multiplier_max');
    // register-fed rows live on their register's worksheet
    for (const e of EQUATIONS) for (const s of e.input_symbols) {
      const f = FIELD_CONFIGS.find((x) => x.symbol === s);
      if (f?.widget === 'register') expect(f.worksheet, `${e.equation_number} register ${s}`).toBe(e.worksheet);
    }
    expect(() => emitEquationsSql('m820_1', EQUATIONS)).not.toThrow();
    expect(emitEquationsSql('m820_1', EQUATIONS).warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('m820_1', EQUATIONS);
    const files = equationFilesFor('m820_1', '20260917101820');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(36);
  });

  it('M820-09-D1 / D2 / D3 (L864 / L555 / L1327): "erreicht oder übersteigt" is inclusive; ±25 % band; typed vs Anh. B.2.3 consistency', () => {
    const fee = (v: number) => num('estimated_engineering_fee', v, 'EUR');
    const thr = (v: number) => num('eu_threshold_value', v, 'EUR');
    expect(computed(run('M820-09-D1', { inputs: [fee(214000), thr(214000)] }))).toBe(1);
    expect(computed(run('M820-09-D1', { inputs: [fee(213999), thr(214000)] }))).toBe(0);
    expect(computed(run('M820-09-D1', { inputs: [fee(139000), thr(139000)] }))).toBe(1);
    expect(run('M820-09-D1', { inputs: [fee(214000), num('eu_threshold_value', null, 'EUR')] }).kind).toBe('manual_required');
    const unc = (v: number) => num('cost_estimate_uncertainty_pct', v, '%');
    expect(computed(run('M820-09-D2', { inputs: [fee(200000), thr(214000), unc(25)] }))).toBe(1); // 6,5 % ≤ 25 %
    expect(computed(run('M820-09-D2', { inputs: [fee(100000), thr(214000), unc(25)] }))).toBe(0); // 53 % > 25 %
    expect(computed(run('M820-09-D2', { inputs: [fee(160500), thr(214000), unc(25)] }))).toBe(1); // exactly 25 %
    expect(run('M820-09-D2', { inputs: [fee(200000), thr(214000)] }).kind).toBe('manual_required'); // the uncertainty is a typed input (M820-04)
    expect(computed(run('M820-09-D3', { inputs: [thr(214000), num('eu_threshold_value_anhb23', 214000, 'EUR')] }))).toBe(1);
    expect(computed(run('M820-09-D3', { inputs: [thr(139000), num('eu_threshold_value_anhb23', 214000, 'EUR')] }))).toBe(0);
  });

  it('M820-09-D4 … D7: the four printed constants compute with no input (80000 / 1000000 / 20 / 2)', () => {
    expect(eq('M820-09-D4').input_symbols).toEqual([]);
    expect(computed(run('M820-09-D4', {}))).toBe(80000);
    expect(computed(run('M820-09-D5', {}))).toBe(1000000);
    expect(computed(run('M820-09-D6', {}))).toBe(20);
    expect(computed(run('M820-09-D7', {}))).toBe(2);
  });

  it('M820-09-D8 … D15 over the lot register (L1366): row bound by kind, Σ, share (on the -01 fee, L1368 — fix round 1), max, violations, the code, the Σ-vs-fee check; empty register ⇒ code open, counts 0', () => {
    const fee = (v: number) => num('estimated_engineering_fee', v, 'EUR');
    const lose = prep('M820-09', 'lose', [
      { id: '1', los: 'Objektplanung', art: 'dienstleistung', netto_wert_eur: 150000 },
      { id: '2', los: 'Tragwerk', art: 'dienstleistung', netto_wert_eur: 30000, ausnahme: true },
      { id: '3', los: 'Vermessung', art: 'dienstleistung', netto_wert_eur: 20000, ausnahme: true },
      { id: '4', los: 'Rohbau', art: 'bau', netto_wert_eur: 900000, ausnahme: false },
    ]);
    expect(lose.rows.map((r) => [r.values.grenze_eur, r.values.unter_grenze, r.complete])).toEqual([[80000, 0, true], [80000, 1, true], [80000, 1, true], [1000000, 1, true]]);
    const R = { lose };
    expect(computed(run('M820-09-D8', { registers: R }))).toBe(4);
    expect(computed(run('M820-09-D9', { registers: R }))).toBe(1100000);
    expect(computed(run('M820-09-D10', { registers: R }))).toBe(50000);
    // amendment K (fix round 1): the share reads the EXISTING -01 fee (L1368 "Gesamtauftragswerts"), not the register Σ
    expect(eq('M820-09-D11').input_symbols).toEqual(['lose', 'estimated_engineering_fee']);
    expect(eq('M820-09-D14').input_symbols).toEqual(['lose', 'estimated_engineering_fee']);
    expect(computed(run('M820-09-D11', { registers: R, inputs: [fee(1100000)] }))).toBeCloseTo(4.5454545, 5);
    expect(computed(run('M820-09-D11', { registers: R, inputs: [fee(1000000)] }))).toBe(5);
    expect(run('M820-09-D11', { registers: R }).kind).toBe('manual_required'); // the fee is a required input
    expect(computed(run('M820-09-D12', { registers: R }))).toBe(30000);
    expect(computed(run('M820-09-D13', { registers: R }))).toBe(0);
    expect(computed(run('M820-09-D14', { registers: R, inputs: [fee(1100000)] }))).toBe(1);
    // D15: Σ Lose vs the fee (tolerance 0,005 EUR)
    expect(computed(run('M820-09-D15', { registers: R, inputs: [fee(1100000)] }))).toBe(1);
    expect(computed(run('M820-09-D15', { registers: R, inputs: [fee(1100000.004)] }))).toBe(1);
    expect(computed(run('M820-09-D15', { registers: R, inputs: [fee(1000000)] }))).toBe(0);
    expect(eq('M820-09-D15').input_symbols).not.toContain('lose_gesamt_eur'); // Σ inline — never chained on a new output
    // an excepted Dienstleistungs-Los AT the bound (80000) violates "unter" (strict, m820_1-J-6)
    const atBound = prep('M820-09', 'lose', [{ id: '1', los: 'A', art: 'dienstleistung', netto_wert_eur: 320000 }, { id: '2', los: 'B', art: 'dienstleistung', netto_wert_eur: 80000, ausnahme: true }]);
    expect(atBound.rows[1].values.unter_grenze).toBe(0);
    expect(computed(run('M820-09-D13', { registers: { lose: atBound } }))).toBe(1);
    expect(computed(run('M820-09-D14', { registers: { lose: atBound }, inputs: [fee(400000)] }))).toBe(0);
    // a Bau-Los under 1 Mio. € but the share above 20 %
    const share = prep('M820-09', 'lose', [{ id: '1', los: 'A', art: 'dienstleistung', netto_wert_eur: 100000 }, { id: '2', los: 'B', art: 'bau', netto_wert_eur: 900000, ausnahme: true }]);
    expect(share.rows[1].values.unter_grenze).toBe(1);
    expect(computed(run('M820-09-D11', { registers: { lose: share }, inputs: [fee(1000000)] }))).toBe(90);
    expect(computed(run('M820-09-D14', { registers: { lose: share }, inputs: [fee(1000000)] }))).toBe(0);
    // exactly 20 % passes ("nicht übersteigt")
    const twenty = prep('M820-09', 'lose', [{ id: '1', los: 'A', art: 'dienstleistung', netto_wert_eur: 80000 }, { id: '2', los: 'B', art: 'dienstleistung', netto_wert_eur: 20000, ausnahme: true }]);
    expect(computed(run('M820-09-D14', { registers: { lose: twenty }, inputs: [fee(100000)] }))).toBe(1);
    // empty register: counts 0, Σ / code open (never a phantom pass)
    const empty = prep('M820-09', 'lose', []);
    expect(computed(run('M820-09-D8', { registers: { lose: empty } }))).toBe(0);
    expect(computed(run('M820-09-D13', { registers: { lose: empty } }))).toBe(0);
    expect(run('M820-09-D9', { registers: { lose: empty } }).kind).toBe('manual_required');
    expect(run('M820-09-D14', { registers: { lose: empty }, inputs: [fee(1000000)] }).kind).toBe('manual_required');
    expect(run('M820-09-D15', { registers: { lose: empty }, inputs: [fee(1000000)] }).kind).toBe('manual_required');
  });

  it('M820-13-D1 (L1623): 1,5 ≤ 1,5 passes, 1,8 > 1,5 fails, 2 ≤ 2 passes for the regular case', () => {
    const m = (v: number) => num('min_annual_revenue_multiplier', v);
    const max = (v: number) => num('min_annual_revenue_multiplier_max', v);
    expect(computed(run('M820-13-D1', { inputs: [m(1.5), max(1.5)] }))).toBe(1);
    expect(computed(run('M820-13-D1', { inputs: [m(1.8), max(1.5)] }))).toBe(0);
    expect(computed(run('M820-13-D1', { inputs: [m(2), max(2)] }))).toBe(1);
    expect(run('M820-13-D1', { inputs: [m(2)] }).kind).toBe('manual_required'); // the fill is empty until large_long_project is answered
  });

  it('M820-14-D1 … D3 over the award register: Σ 100 %, Preis row 20 %, two quality criteria; no Preis row ⇒ 0; a row without weight is incomplete (required) and drops out', () => {
    const award = prep('M820-14', 'award_criteria_list', [
      { id: '1', kriterium: 'Schlüsselpersonal', gewichtung: 60 },
      { id: '2', kriterium: 'Preis', gewichtung: 20 },
      { id: '3', kriterium: 'Analyse der Aufgabenstellung durch den Bieter', gewichtung: 20 },
    ]);
    expect(award.rows.map((r) => [r.values.ist_preis, r.complete])).toEqual([[0, true], [1, true], [0, true]]);
    expect(computed(run('M820-14-D1', { registers: { award_criteria_list: award } }))).toBe(100);
    expect(computed(run('M820-14-D2', { registers: { award_criteria_list: award } }))).toBe(20);
    expect(computed(run('M820-14-D3', { registers: { award_criteria_list: award } }))).toBe(2);
    const noPrice = prep('M820-14', 'award_criteria_list', [{ id: '1', kriterium: 'Schlüsselpersonal', gewichtung: 70 }, { id: '2', kriterium: 'Örtliche Bauüberwachung', gewichtung: 30 }]);
    expect(computed(run('M820-14-D2', { registers: { award_criteria_list: noPrice } }))).toBe(0);
    const noWeight = prep('M820-14', 'award_criteria_list', [{ id: '1', kriterium: 'Preis' }, { id: '2', kriterium: 'Schlüsselpersonal', gewichtung: 80 }]);
    expect(noWeight.rows.map((r) => r.complete)).toEqual([false, true]);
    expect(computed(run('M820-14-D1', { registers: { award_criteria_list: noWeight } }))).toBe(80);
  });

  it('M820-16-D1 … D4 over the commission register (L843 / L844): size 3, one chair, two voting, odd; empty ⇒ 0 / 0 / 0 / 0', () => {
    const kom = prep('M820-16', 'bewertungskommission_members', [
      { id: '1', name: 'A', vorsitz: true, stimmberechtigt: true },
      { id: '2', name: 'B', stimmberechtigt: true },
      { id: '3', name: 'C' },
    ]);
    const R = { bewertungskommission_members: kom };
    expect(computed(run('M820-16-D1', { registers: R }))).toBe(3);
    expect(computed(run('M820-16-D2', { registers: R }))).toBe(1);
    expect(computed(run('M820-16-D3', { registers: R }))).toBe(2);
    expect(computed(run('M820-16-D4', { registers: R }))).toBe(1);
    const four = prep('M820-16', 'bewertungskommission_members', [{ id: '1', name: 'A' }, { id: '2', name: 'B' }, { id: '3', name: 'C' }, { id: '4', name: 'D' }]);
    expect(computed(run('M820-16-D4', { registers: { bewertungskommission_members: four } }))).toBe(0);
    const empty = prep('M820-16', 'bewertungskommission_members', []);
    expect(computed(run('M820-16-D1', { registers: { bewertungskommission_members: empty } }))).toBe(0);
    expect(computed(run('M820-16-D4', { registers: { bewertungskommission_members: empty } }))).toBe(0);
  });

  it('M820-18-D1 … D4 over the Bewerber register (Anh. F): 3 applicants, 2 shortlisted, 2 final offers, 1 winner; unset boxes count as false', () => {
    const bw = prep('M820-18', 'bewerber', [
      { id: '1', name: 'A', formal_ok: true, shortlisted: true, final_offer: true, winner: true },
      { id: '2', name: 'B', formal_ok: true, shortlisted: true, final_offer: true },
      { id: '3', name: 'C', formal_ok: false },
    ]);
    const R = { bewerber: bw };
    expect(computed(run('M820-18-D1', { registers: R }))).toBe(3);
    expect(computed(run('M820-18-D2', { registers: R }))).toBe(2);
    expect(computed(run('M820-18-D3', { registers: R }))).toBe(2);
    expect(computed(run('M820-18-D4', { registers: R }))).toBe(1);
    const empty = prep('M820-18', 'bewerber', []);
    for (const n of ['M820-18-D1', 'M820-18-D2', 'M820-18-D3', 'M820-18-D4']) expect(computed(run(n, { registers: { bewerber: empty } }))).toBe(0);
  });

  it('M820-20-D1 … D3 over the negotiation register (§ 8.10.3.4 / Anh. F Nr. 8): max round 2, three talks, two unsigned; empty ⇒ rounds open (never 0), count 0', () => {
    const vr = prep('M820-20', 'verhandlungsrunden', [
      { id: '1', runde: 1, bieter: 'X', datum: '2026-09-01', protokoll_signiert: true },
      { id: '2', runde: 1, bieter: 'Y' },
      { id: '3', runde: 2, bieter: 'X' },
    ]);
    const R = { verhandlungsrunden: vr };
    expect(computed(run('M820-20-D1', { registers: R }))).toBe(2);
    expect(computed(run('M820-20-D2', { registers: R }))).toBe(3);
    expect(computed(run('M820-20-D3', { registers: R }))).toBe(2);
    const empty = prep('M820-20', 'verhandlungsrunden', []);
    expect(run('M820-20-D1', { registers: { verhandlungsrunden: empty } }).kind).toBe('manual_required');
    expect(computed(run('M820-20-D2', { registers: { verhandlungsrunden: empty } }))).toBe(0);
  });

  it('M820-03-D1 / D2 over the stakeholder register (§5): count, categories covered 2 of 5; a row without kategorie is incomplete and does not count', () => {
    const st = prep('M820-03', 'stakeholder_list', [
      { id: '1', beteiligter: 'Stadt X', kategorie: 'auftraggeber' },
      { id: '2', beteiligter: 'Büro Y', kategorie: 'auftragnehmer' },
      { id: '3', beteiligter: 'Büro Z', kategorie: 'auftragnehmer' },
      { id: '4', beteiligter: 'alt' },
    ]);
    expect(st.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(computed(run('M820-03-D1', { registers: { stakeholder_list: st } }))).toBe(3);
    expect(computed(run('M820-03-D2', { registers: { stakeholder_list: st } }))).toBe(2);
    expect(STAKEHOLDER_KATEGORIEN_EXPR.split(' + ')).toHaveLength(5);
    const all = prep('M820-03', 'stakeholder_list', ['auftraggeber', 'auftragnehmer', 'ausfuehrende_firmen', 'behoerden', 'oeffentlichkeit'].map((k, i) => ({ id: String(i), beteiligter: k, kategorie: k })));
    expect(computed(run('M820-03-D2', { registers: { stakeholder_list: all } }))).toBe(5);
    expect(computed(run('M820-03-D2', { registers: { stakeholder_list: prep('M820-03', 'stakeholder_list', []) } }))).toBe(0);
  });

  it('M820-22-D1 / D2 (Tab. D.1, L1465–L1470): every band boundary inclusive ("bis"), every figure from the table, > 50 Mio. € open (J-2); D3 / D4 compare the required sums', () => {
    const cost = (v: number) => num('estimated_construction_cost', v, 'EUR');
    const expectBand = (c: number, personen: number, sonstige: number) => {
      expect(computed(run('M820-22-D1', { inputs: [cost(c)] })), `personen @ ${c}`).toBe(personen);
      expect(computed(run('M820-22-D2', { inputs: [cost(c)] })), `sonstige @ ${c}`).toBe(sonstige);
    };
    expectBand(400000, 1500000, 250000);
    expectBand(500000, 1500000, 250000);   // "bis 0,5 Mio. €" inclusive
    expectBand(500001, 1500000, 500000);
    expectBand(1500000, 1500000, 500000);
    expectBand(4000000, 1500000, 1000000);
    expectBand(10000000, 2000000, 2000000);
    expectBand(25000000, 3000000, 3000000);
    expectBand(50000000, 3000000, 5000000);
    const over = run('M820-22-D1', { inputs: [cost(50000001)] });
    expect(over.kind).toBe('manual_required');
    expect(reason(over)).toContain('gt50'); // no printed row above 50 Mio. € — never a guessed figure
    expect(tabD1Chain('personen_mio')).not.toMatch(/\d\.\d+\s*\*\s*1000000/); // no band figure is typed into the formula — every bound is a lookup()
    expect((tabD1Chain('personen_mio').match(/lookup\('TABD1'/g) ?? []).length).toBe(13); // 6 bounds + 6 sums + the deliberate gt50 miss
    // D3 / D4: the required sums (typed on M820-13, inherited on -22) against the Anhaltswert
    expect(computed(run('M820-22-D3', { inputs: [num('liability_insurance_personenschaden', 1500000, 'EUR'), cost(4000000)] }))).toBe(1);
    expect(computed(run('M820-22-D3', { inputs: [num('liability_insurance_personenschaden', 1000000, 'EUR'), cost(4000000)] }))).toBe(0);
    expect(computed(run('M820-22-D4', { inputs: [num('liability_insurance_sonstige', 5000000, 'EUR'), cost(30000000)] }))).toBe(1);
    expect(computed(run('M820-22-D4', { inputs: [num('liability_insurance_sonstige', 2000000, 'EUR'), cost(30000000)] }))).toBe(0);
  });
});
