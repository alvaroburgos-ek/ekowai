/**
 * Plan 3 Task 27 — ATV-A-704E derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * through the real `evaluateFormula` over rows prepared by the register contract.
 *
 * ATV-A-704E has NO TRANSCRIPT (scanned PDF, no text layer), so the standard prints
 * no worked example this session may read: every pin below is a HAND-CHECKED fixture
 * (the arithmetic is written out in the test name) plus the edge cases that matter —
 * an EMPTY register is never a phantom pass (the mean / maxima read `manual_required`,
 * the counts read 0), an incomplete row never counts, and a FILTERED maximum with no
 * matching row is `manual_required` rather than the false 0 % the brief's
 * `if(…, …, 0)` form would print (both forms compared here).
 *
 * Every entry carries `verification_quote: null` (controller resolution 1): the math
 * is the math of the stored prod EQ-01 … EQ-06 (grade EV) re-expressed over rows, and
 * no source can attest the re-expression — the attestation is the sign-off entry
 * `atv_a704e-U-1 …`, never a quote that cannot be cited.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS, KIND_EQUIVALENCY, KIND_PARALLEL, ROW_PIPETTE } from '../equations/atv_a704e';
import { FIELD_CONFIGS } from '../field-configs/atv_a704e';
import { PROD_EQUATION } from '../field-configs/atv_a704e-quotes';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'ATV-A-704E';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[]) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: () => undefined });
const run = (n: string, registers: Record<string, ReturnType<typeof prep>>): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const manual = (r: EvalState): string => { expect(r.kind, JSON.stringify(r)).toBe('manual_required'); return r.kind === 'manual_required' ? r.reason : ''; };

describe('ATV-A-704E Plan-3 equations', () => {
  it('12 entries (1 on -08, 5 on -09, 2 on -10, 2 on -11, 2 on -12); every output a created derived field of its own worksheet; the only input the register of that worksheet; NO prod output re-produced (EQ-01 … EQ-06 keep theirs); every verification_quote null (controller resolution 1); the only figure is the printed × 100 of the percentage forms; emitter accepts them with no warning', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'ATV-A-704E-08-D1',
      'ATV-A-704E-09-D1', 'ATV-A-704E-09-D2', 'ATV-A-704E-09-D3', 'ATV-A-704E-09-D4', 'ATV-A-704E-09-D5',
      'ATV-A-704E-10-D1', 'ATV-A-704E-10-D2',
      'ATV-A-704E-11-D1', 'ATV-A-704E-11-D2',
      'ATV-A-704E-12-D1', 'ATV-A-704E-12-D2',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    const prodOutputs = new Set(Object.values(PROD_EQUATION).map((e) => e.output_symbol));
    expect([...prodOutputs].sort()).toEqual(['NSS', 'calculated_value', 'deviation_equivalency_pct', 'deviation_parallel_pct', 'deviation_single_pct', 'mean_value']);
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.input_symbols, e.equation_number).toHaveLength(1);
      expect(created.has(`${e.worksheet} ${e.input_symbols[0]}`), `${e.input_symbols[0]} register`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote, `${e.equation_number} quote`).toBeNull(); // controller resolution 1 — no source can attest it
      expect(prodOutputs.has(e.output_symbol), `${e.output_symbol} must not re-produce a prod output`).toBe(false);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(rhs(e.equation_number)).not.toMatch(/AND \(/); // the emitter's legacy CALL regex (Task 21 trap 7)
      // the only literal in any formula is the printed "× 100" of the percentage forms (stored in EQ-02 / EQ-05 / EQ-06 themselves)
      expect(rhs(e.equation_number).replace(/\* 100 \//g, ''), e.equation_number).not.toMatch(/\b\d+(\.\d+)?\b/);
    }
    expect(rhs('ATV-A-704E-09-D3')).toBe('max(max_rows(einzelbestimmungen, single_result) - mean_rows(einzelbestimmungen, single_result), mean_rows(einzelbestimmungen, single_result) - min_rows(einzelbestimmungen, single_result)) * 100 / mean_rows(einzelbestimmungen, single_result)'); // inline mean, never chained on -09-D2 (Task 16 trap 2)
    expect(rhs('ATV-A-704E-10-D1')).toBe(`max_rows(vergleichsmessungen, abs(dev_pct), ${KIND_EQUIVALENCY})`);
    expect(rhs('ATV-A-704E-10-D2')).toBe(`max_rows(vergleichsmessungen, abs(dev_pct), ${KIND_PARALLEL})`);
    expect(rhs('ATV-A-704E-11-D2')).toBe(`max_rows(pruefmittel, pipette_dev_pct, ${ROW_PIPETTE})`);
    // the stored prod formulas this task re-expresses (EV — the only text that exists for this standard)
    expect(PROD_EQUATION['EQ-01'].formula).toBe('mean_value = SUM(single_result_i) / n_determinations');
    expect(PROD_EQUATION['EQ-02'].formula).toBe('deviation_single_pct = 100 * (single_result_i - mean_value) / mean_value');
    expect(PROD_EQUATION['EQ-03'].formula).toBe('calculated_value = (total_volume / sample_volume) * measured_value_diluted_sample');
    expect(PROD_EQUATION['EQ-04'].formula).toBe('NSS = (volume_sample * measured_value_original_sample + volume_standard * concentration_standard) / (volume_sample + volume_standard)');
    expect(PROD_EQUATION['EQ-05'].formula).toBe('deviation_equivalency_pct = 100 * (measured_value_operating - nominal_value_reference) / nominal_value_reference');
    expect(PROD_EQUATION['EQ-06'].formula).toBe('deviation_parallel_pct = 100 * (measured_value_operating - measured_value_reference) / measured_value_reference');
    for (const e of Object.values(PROD_EQUATION)) expect(e.verification_status).toBe('verified_against_standard');
    const { warnings } = emitEquationsSql('atv_a704e', EQUATIONS);
    expect(warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin): 12 ON CONFLICT DO NOTHING inserts', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('atv_a704e', EQUATIONS);
    const files = equationFilesFor('atv_a704e', '20260917102720');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(12);
    expect(up).not.toContain("'ATV-A-704E-09', 'EQ-0"); // EQ-01 … EQ-06 untouched (atv_a704e-R-1)
  });

  it('multiple determination 100 / 110 / 90 mg/l (+ one row without a result): count 3, mean 100, max deviation max(110−100, 100−90) × 100 / 100 = 10 %; the asymmetric set 100 / 130 / 95 gives mean 108,333… and (130 − 108,333…) × 100 / 108,333… = 20 %', () => {
    const reg = prep('ATV-A-704E-09', 'einzelbestimmungen', [
      { id: 'e1', parameter: 'cod', date: '2026-01-05', single_result: 100, unit: 'mg/l' },
      { id: 'e2', parameter: 'cod', date: '2026-01-05', single_result: 110, unit: 'mg/l' },
      { id: 'e3', parameter: 'cod', date: '2026-01-05', single_result: 90, unit: 'mg/l' },
      { id: 'e4', parameter: 'cod', date: '2026-01-05' },
    ]);
    expect(reg.diagnostics ?? []).toEqual([]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(computed(run('ATV-A-704E-09-D1', { einzelbestimmungen: reg }))).toBe(3);
    expect(computed(run('ATV-A-704E-09-D2', { einzelbestimmungen: reg }))).toBe(100);
    expect(computed(run('ATV-A-704E-09-D3', { einzelbestimmungen: reg }))).toBe(10);
    const asym = prep('ATV-A-704E-09', 'einzelbestimmungen', [
      { id: 'a1', parameter: 'bod5', date: '2026-02-01', single_result: 100 },
      { id: 'a2', parameter: 'bod5', date: '2026-02-01', single_result: 130 },
      { id: 'a3', parameter: 'bod5', date: '2026-02-01', single_result: 95 },
    ]);
    expect(computed(run('ATV-A-704E-09-D2', { einzelbestimmungen: asym }))).toBeCloseTo(108.3333333, 6);
    expect(computed(run('ATV-A-704E-09-D3', { einzelbestimmungen: asym }))).toBeCloseTo(20, 9);
  });

  it('an EMPTY determination register (or one with only incomplete rows) is never a phantom 0: count 0 (computed), mean and max deviation "Keine vollständigen Zeilen"', () => {
    for (const reg of [prep('ATV-A-704E-09', 'einzelbestimmungen', []), prep('ATV-A-704E-09', 'einzelbestimmungen', [{ id: 'x' }, { id: 'y', parameter: 'cod', single_result: 5 }])]) {
      expect(computed(run('ATV-A-704E-09-D1', { einzelbestimmungen: reg }))).toBe(0);
      expect(manual(run('ATV-A-704E-09-D2', { einzelbestimmungen: reg }))).toContain('Keine vollständigen Zeilen');
      expect(manual(run('ATV-A-704E-09-D3', { einzelbestimmungen: reg }))).toContain('Keine vollständigen Zeilen');
    }
  });

  it('dilution (EQ-03 per row): 10 ml → 100 ml, measured 12 ⇒ calculated 100/10 × 12 = 120 and (120 − 100)/100 × 100 = +20 %; measured 9 ⇒ 90 and −10 %; a row without the original-sample value is incomplete; max |deviation| = 20; empty ⇒ manual_required', () => {
    const reg = prep('ATV-A-704E-09', 'verduennungsversuche', [
      { id: 'v1', parameter: 'cod', date: '2026-01-05', sample_volume_ml: 10, total_volume_ml: 100, measured_diluted: 12, reference: 100 },
      { id: 'v2', parameter: 'cod', date: '2026-01-06', sample_volume_ml: 10, total_volume_ml: 100, measured_diluted: 9, reference: 100 },
      { id: 'v3', parameter: 'cod', sample_volume_ml: 10, total_volume_ml: 100, measured_diluted: 11 },
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(reg.rows.map((r) => r.values.calculated)).toEqual([120, 90, 110]);
    expect(reg.rows.map((r) => r.values.dev_pct)).toEqual([20, -10, null]);
    expect(computed(run('ATV-A-704E-09-D4', { verduennungsversuche: reg }))).toBe(20);
    expect(manual(run('ATV-A-704E-09-D4', { verduennungsversuche: prep('ATV-A-704E-09', 'verduennungsversuche', []) }))).toContain('Keine vollständigen Zeilen');
  });

  it('standard addition (EQ-04 per row): 90 ml sample at 20 mg/l + 10 ml standard at 200 mg/l ⇒ NSS (90·20 + 10·200)/100 = 38; measured 57 ⇒ +50 %, measured 19 ⇒ −50 %; max |deviation| = 50; empty ⇒ manual_required', () => {
    const reg = prep('ATV-A-704E-09', 'aufstockungsversuche', [
      { id: 's1', parameter: 'p_total', date: '2026-03-01', sample_volume_ml: 90, standard_volume_ml: 10, standard_concentration: 200, measured_original: 20, measured_spiked: 57 },
      { id: 's2', parameter: 'p_total', date: '2026-03-02', sample_volume_ml: 90, standard_volume_ml: 10, standard_concentration: 200, measured_original: 20, measured_spiked: 19 },
      { id: 's3', parameter: 'p_total', sample_volume_ml: 90, standard_volume_ml: 10, standard_concentration: 200, measured_original: 20 },
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(reg.rows.map((r) => r.values.nss_nominal)).toEqual([38, 38, 38]);
    expect(reg.rows.map((r) => r.values.dev_pct)).toEqual([50, -50, null]);
    expect(computed(run('ATV-A-704E-09-D5', { aufstockungsversuche: reg }))).toBe(50);
    expect(manual(run('ATV-A-704E-09-D5', { aufstockungsversuche: prep('ATV-A-704E-09', 'aufstockungsversuche', []) }))).toContain('Keine vollständigen Zeilen');
  });

  it('comparison rows (EQ-05 / EQ-06 per row): equivalency 110 vs 100 ⇒ +10 %, parallel 75 vs 100 ⇒ −25 %, parallel 130 vs 100 ⇒ +30 % → equivalency max 10, parallel max 30; with NO parallel row the filtered maximum is manual_required while the brief\'s if(…, …, 0) form would read a false 0 %', () => {
    const reg = prep('ATV-A-704E-10', 'vergleichsmessungen', [
      { id: 'c1', kind: 'equivalency', parameter: 'cod', date: '2026-04-01', operating_value: 110, reference_value: 100 },
      { id: 'c2', kind: 'parallel', parameter: 'cod', date: '2026-04-02', operating_value: 75, reference_value: 100 },
      { id: 'c3', kind: 'parallel', parameter: 'cod', date: '2026-04-03', operating_value: 130, reference_value: 100 },
      { id: 'c4', kind: 'parallel', parameter: 'cod', operating_value: 120 },
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, false]);
    expect(reg.rows.map((r) => r.values.dev_pct)).toEqual([10, -25, 30, null]);
    expect(computed(run('ATV-A-704E-10-D1', { vergleichsmessungen: reg }))).toBe(10);
    expect(computed(run('ATV-A-704E-10-D2', { vergleichsmessungen: reg }))).toBe(30);
    const onlyEquivalency = prep('ATV-A-704E-10', 'vergleichsmessungen', [{ id: 'c1', kind: 'equivalency', operating_value: 110, reference_value: 100 }]);
    expect(manual(run('ATV-A-704E-10-D2', { vergleichsmessungen: onlyEquivalency }))).toContain('Keine vollständigen Zeilen');
    const ifForm = evaluateFormula({ equationId: 'brief-form', formula: "x = max_rows(vergleichsmessungen, if(kind == 'parallel', abs(dev_pct), 0))", inputSymbols: ['vergleichsmessungen'], outputSymbol: 'x', inputs: [], registers: { vergleichsmessungen: onlyEquivalency }, tableLookup: table });
    expect(ifForm).toMatchObject({ kind: 'computed', value: 0 }); // the phantom 0 the filtered form avoids
    for (const reg0 of [prep('ATV-A-704E-10', 'vergleichsmessungen', [])]) {
      expect(manual(run('ATV-A-704E-10-D1', { vergleichsmessungen: reg0 }))).toContain('Keine vollständigen Zeilen');
      expect(manual(run('ATV-A-704E-10-D2', { vergleichsmessungen: reg0 }))).toContain('Keine vollständigen Zeilen');
    }
  });

  it('Prüfmittel: two pipette rows (0,8 % / 1,5 %) + one photometer row ⇒ count 3 and pipette maximum 1,5; a register without a pipette row leaves the maximum manual_required; hidden type-specific cells: an enum-free number cell is null, an unset boolean reads false', () => {
    const reg = prep('ATV-A-704E-11', 'pruefmittel', [
      { id: 'p1', equipment: 'piston_stroke_pipettes', interval: 'quarterly', last_check: '2026-01-10', pipette_volume_ml: 1, pipette_dev_pct: 0.8 },
      { id: 'p2', equipment: 'piston_stroke_pipettes', interval: 'quarterly', last_check: '2026-01-10', pipette_volume_ml: 0.1, pipette_dev_pct: 1.5 },
      { id: 'p3', equipment: 'photometer', interval: 'annually', last_check: '2026-02-02', photometer_check: true },
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true]);
    expect(reg.rows.map((r) => r.values.heating_dev_c)).toEqual([null, null, null]);
    expect(reg.rows.map((r) => r.values.photometer_check)).toEqual([false, false, true]);
    expect(computed(run('ATV-A-704E-11-D1', { pruefmittel: reg }))).toBe(3);
    expect(computed(run('ATV-A-704E-11-D2', { pruefmittel: reg }))).toBe(1.5);
    const noPipette = prep('ATV-A-704E-11', 'pruefmittel', [{ id: 'p3', equipment: 'photometer', interval: 'annually' }]);
    expect(computed(run('ATV-A-704E-11-D1', { pruefmittel: noPipette }))).toBe(1);
    expect(manual(run('ATV-A-704E-11-D2', { pruefmittel: noPipette }))).toContain('Keine vollständigen Zeilen');
    expect(computed(run('ATV-A-704E-11-D1', { pruefmittel: prep('ATV-A-704E-11', 'pruefmittel', []) }))).toBe(0);
  });

  it('the three counting rows (QS measures, deviations, staff) read the complete rows and 0 on an empty register — a 0 means "nothing recorded", never "nothing happened"', () => {
    const qs = prep('ATV-A-704E-08', 'qs_massnahmen', [
      { id: 'q1', measure: 'multiple_determinations', frequency: '1x/Monat', target_pct: 10, performed_count: 12 },
      { id: 'q2', measure: 'pipettes', frequency: '4x/Jahr', target_pct: 2 },
      { id: 'q3', frequency: '1x/Jahr' },
    ]);
    expect(qs.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(computed(run('ATV-A-704E-08-D1', { qs_massnahmen: qs }))).toBe(2);
    expect(computed(run('ATV-A-704E-08-D1', { qs_massnahmen: prep('ATV-A-704E-08', 'qs_massnahmen', []) }))).toBe(0);
    const abw = prep('ATV-A-704E-12', 'abweichungen', [
      { id: 'd1', date: '2026-05-01', feature: 'Doppelbestimmung streut', iqc_card_ref: 'card_3', cause: 'Pipette', measure: 'Pipette geprüft', result: 'ok' },
      { id: 'd2', cause: 'unklar' },
    ]);
    expect(abw.rows.map((r) => r.complete)).toEqual([true, false]);
    expect(computed(run('ATV-A-704E-12-D1', { abweichungen: abw }))).toBe(1);
    expect(computed(run('ATV-A-704E-12-D1', { abweichungen: prep('ATV-A-704E-12', 'abweichungen', []) }))).toBe(0);
    const staff = prep('ATV-A-704E-12', 'mitarbeiter', [
      { id: 'm1', name: 'A. Muster', qualification: 'Fachkraft für Abwassertechnik', instruction_date: '2026-01-15', training_record: 'DWA-Kurs' },
      { id: 'm2', qualification: 'Praktikum' },
    ]);
    expect(staff.rows.map((r) => r.complete)).toEqual([true, false]);
    expect(computed(run('ATV-A-704E-12-D2', { mitarbeiter: staff }))).toBe(1);
    expect(computed(run('ATV-A-704E-12-D2', { mitarbeiter: prep('ATV-A-704E-12', 'mitarbeiter', []) }))).toBe(0);
  });
});
