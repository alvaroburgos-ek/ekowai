/**
 * Fix-wave item 2 (Plan 2a final review): the legacy arithmetic engine
 * (arithmetic.ts@da79b99) raised `Funktionsaufruf "X(...)" wird nicht
 * unterstützt` / `Unbekanntes Symbol "y"` EAGERLY, before later garbage
 * (`;`, `*)`, juxtaposed identifiers) was reached, and formula.ts mapped
 * those to `manual_required`. The unified tokenizer reports the garbage
 * first, so 21 corpus equations (DWA-M-816 ×19, DWA-A-272E RULE-11,
 * DWA-M-1200-1 EQ-001) flipped manual_required → error. The catch block
 * now triages a parse failure the way the legacy engine would have.
 *
 * Formula strings are copied verbatim from the 2026-08-01 encoding
 * snapshot (scripts/reasoning-map/snapshot/encoding-snapshot.json).
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../formula';

const REQ = (formula: string, syms: string[], equationId = 'test') => ({
  equationId, formula, inputSymbols: syms, outputSymbol: 'out',
  inputs: syms.map((symbol) => ({ symbol, value: 2, unit: null })),
});

describe('parse-failure triage keeps the legacy manual_required classification', () => {
  it('DWA-M-816 1b: unsupported call reported before the `;` garbage', () => {
    const r = evaluateFormula(REQ('BW = c_0 * RBF_0(n; q)', ['c_0', 'RBF_0', 'q']));
    expect(r).toMatchObject({ kind: 'manual_required', reason: 'Funktionsaufruf "RBF_0(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.' });
  });
  it('DWA-M-816 A.1: LHS with `;` cannot be stripped — the whole line is triaged', () => {
    const r = evaluateFormula(REQ('RBF_0(n; q) = (1 - 1 / q^n) / (q - 1)    q != 1', ['n', 'q']));
    expect(r).toMatchObject({ kind: 'manual_required', reason: 'Funktionsaufruf "RBF_0(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.' });
  });
  it('DWA-M-816 11: `q*)` inside the call', () => {
    const r = evaluateFormula(REQ('BW_Erloese(q*) = BW_Aufwendungen(q*)', ['BW_Erloese', 'BW_Aufwendungen']));
    expect(r).toMatchObject({ kind: 'manual_required', reason: 'Funktionsaufruf "BW_Erloese(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.' });
  });
  it('DWA-M-816 5a: unknown symbol reported before the juxtaposed identifiers', () => {
    const r = evaluateFormula(REQ('Z = SUM_k c_k * t^k * p^t', ['c_k', 't', 'p']));
    expect(r).toMatchObject({ kind: 'manual_required', reason: 'Unbekanntes Symbol "SUM_k" im Ausdruck.' });
  });
  it('DWA-A-272E RULE-11: prose-shaped rule with a pseudo call', () => {
    const r = evaluateFormula(REQ('treatment_process valid_for (material_flow_class, treatment_objective)', ['material_flow_class', 'treatment_objective', 'treatment_process']));
    expect(r).toMatchObject({ kind: 'manual_required', reason: 'Funktionsaufruf "valid_for(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.' });
  });
  it('DWA-M-1200-1 EQ-001: arity failure of a supported call is manual, not error', () => {
    const r = evaluateFormula(REQ('risikoniveau_ausgangs = lookup(eintrittswahrscheinlichkeit, schadensausmass)', ['eintrittswahrscheinlichkeit', 'schadensausmass']));
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') expect(r.reason).toMatch(/Argument\(e\) in lookup/);
  });
});

describe('parse-failure triage keeps genuine hard errors as error', () => {
  it('DWA-M-708 E-CH4-Yield: a unit remark after a complete number (legacy: Unerwartetes Token am Ende)', () => {
    expect(evaluateFormula(REQ('Y_CH4 = 0.35 (Nm3 CH4 per kg CSB_el)', [])).kind).toBe('error');
  });
  it('DWA-M-708 E-CH4-Heizwert: `=` chain (legacy: Unerwartetes Zeichen)', () => {
    expect(evaluateFormula(REQ('H_CH4 = 36 (MJ per m3 CH4) = 10 (kWh per m3) = 12.6 (MJ per kg CSB_el)', [])).kind).toBe('error');
  });
  it('DWA-M-732 Gl-M732-03: `..` range (legacy: Ungültige Zahl)', () => {
    expect(evaluateFormula(REQ('n_CO2_neutral = 0.60 .. 0.70 * n_CO2', ['n_CO2'])).kind).toBe('error');
  });
  it('DWA-M-816 6a / 6a_TR: `:` / `;` after a normalised accessor (legacy: Unerwartetes Zeichen)', () => {
    expect(evaluateFormula(REQ('Z(t):  Z_1(t)  mit t = 1, ..., n_1  und nachfolgend  Z_2(t)  mit t = n_1+1, ..., n_1 + n_2', ['Z_1', 'Z_2', 'n_1', 'n_2', 't'])).kind).toBe('error');
    expect(evaluateFormula(REQ('Z_TR(t);  t = 1, ..., n_A - n_B  bei einem Vorlauf von n_B Jahren', ['Z_TR', 'n_A', 'n_B', 't'])).kind).toBe('error');
  });
  it('ISO-5667-6 A.1: decimal comma (legacy: Unerwartetes Token am Ende)', () => {
    expect(evaluateFormula(REQ('l = 0,13 * b^2 * c * (0,7*c + 2*g) / (g*d)', ['b', 'c', 'g', 'd'])).kind).toBe('error');
  });
  it('a supported call whose arguments are well-formed still computes', () => {
    expect(evaluateFormula(REQ('y = max(a, b) + sqrt(c)', ['a', 'b', 'c'])).kind).toBe('computed');
  });
});
