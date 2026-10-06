/**
 * DWA-M 820-2 registers — the SHIPPED register configs, counter formulas and the REQ-09-2 gate of the staged migration
 * scripts/migrations/20261005200000_m820_2_registers.sql, read out of the file and run through the app's own code:
 *   - parseFieldConfig / resolveRegisterConfig / resolveBespokeEditor (the configs validate, the Tab. A.1 editor stays);
 *   - materializeDerivedOutputs (the save-path materialiser: real expression engine, real register preparation) on sample rows;
 *   - evaluateCondition (the gate engine) both ways.
 * Sources are quoted in the migration header ([K1]…[R3]). Nothing is applied anywhere.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFieldConfig, type RegisterUiConfig } from '@/lib/eval/field-config';
import { resolveRegisterConfig } from '@/lib/eval/register-configs';
import { materializeDerivedOutputs, type FieldValue } from '@/lib/eval/materialize-derived';
import { normalizeRiskCarrier } from '@/lib/eval/risk-register';
import { resolveBespokeEditor, type WorksheetFormField } from '@/components/worksheet/widgets';
import { FIELD_CONFIGS as M820_2_FIELD_CONFIGS } from '@/lib/eval/field-configs/m820_2';
import { evaluateCondition } from '../../evaluate';
import { formulaOf, insertedFieldStatement, insertedGateCondition, insertedUiConfig, jsonbLiterals, literals, updateStatement } from './sql-extract';

const ROOT = resolve(__dirname, '../../../../..');
const FILE = resolve(ROOT, 'scripts/migrations/20261005200000_m820_2_registers.sql');
const DUMP = resolve(ROOT, 'tests/harness/m820-2-registers.dump.json'); // byte copy of the vault 2026-10-05 prod dump
type DumpField = { worksheet: string; symbol: string; widget: string | null; ui_config: unknown };
const dump = JSON.parse(readFileSync(DUMP, 'utf8').replace(/^﻿/, '')) as { fields: DumpField[] };
const live = (ws: string, symbol: string) => dump.fields.find((f) => f.worksheet === ws && f.symbol === symbol)!;

const asRegister = (ui: unknown) => parseFieldConfig({ widget: 'register', uiConfig: ui, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const keys = (ui: RegisterUiConfig) => ui.columns.map((c) => c.key);

/** change_orders ui_config after the block = the live one with the SQL's jsonb_set(columns || A, footer || B) applied. */
function changeOrdersAfter(): RegisterUiConfig {
  // SET part only (the WHERE guard carries its own jsonb literals): columns || <cols>, footer || <footer>
  const set = updateStatement(FILE, 'change_orders').split(/\bFROM\b/)[0];
  const js = jsonbLiterals(set) as unknown[][];
  const cols = js[0];
  const footer = js.filter((a) => a.length > 0 && a.every((x) => typeof x === 'string')).at(-1) as string[];
  const base = live('820-2-21', 'change_orders').ui_config as RegisterUiConfig;
  return asRegister({ ...base, columns: [...base.columns, ...cols], footer: [...(base.footer ?? []), ...footer] });
}
function riskUi(): RegisterUiConfig {
  const [ui] = jsonbLiterals(updateStatement(FILE, 'risk_register'));
  return asRegister(ui);
}

describe('configs validate with the app parser (parseFieldConfig, register schema)', () => {
  it('korrespondenz (820-2-03): the ten brief columns, datum / richtung / betreff required, both boolean columns, footer = the two counters', () => {
    const ui = asRegister(insertedUiConfig(FILE, 'korrespondenz'));
    expect(keys(ui)).toEqual(['datum', 'richtung', 'kanal', 'von', 'an', 'betreff', 'referenz', 'nachverfolgung_noetig', 'faellig_am', 'erledigt']);
    expect(ui.columns.filter((c) => c.required).map((c) => c.key)).toEqual(['datum', 'richtung', 'betreff']);
    expect(ui.columns.find((c) => c.key === 'richtung')?.options).toEqual(['gesendet', 'empfangen']);
    expect(ui.columns.find((c) => c.key === 'kanal')?.options).toEqual(['E-Mail', 'Brief', 'Telefon', 'Besprechung', 'Portal/Plattform', 'Sonstiges']);
    expect(ui.footer).toEqual(['korrespondenz_count', 'korrespondenz_nachverfolgung_offen']);
    expect(ui.placement).toBe('section');
  });
  it('projektschritte (820-2-05) and statusberichte (820-2-06)', () => {
    const ps = asRegister(insertedUiConfig(FILE, 'projektschritte'));
    expect(keys(ps)).toEqual(['datum', 'schritt', 'verantwortlich', 'ergebnis', 'nachweis_referenz', 'status']);
    expect(ps.columns.find((c) => c.key === 'status')?.options).toEqual(['geplant', 'in Arbeit', 'erledigt']);
    const sb = asRegister(insertedUiConfig(FILE, 'statusberichte'));
    expect(keys(sb)).toEqual(['nr', 'datum', 'periode_von', 'periode_bis', 'ampel_kosten', 'ampel_termine', 'ampel_qualitaet', 'ampel_risiken', 'erstellt_von', 'freigegeben_von', 'verteiler', 'referenz']);
    for (const k of ['ampel_kosten', 'ampel_termine', 'ampel_qualitaet', 'ampel_risiken']) expect(sb.columns.find((c) => c.key === k)?.options, k).toEqual(['grün', 'gelb', 'rot']);
  });
  it('change_orders (820-2-21): the six live columns kept in order (keys, types, required) + ausloeser, kostenuebernahme (text, not required)', () => {
    const before = asRegister(live('820-2-21', 'change_orders').ui_config);
    const after = changeOrdersAfter();
    expect(after.columns.slice(0, before.columns.length)).toEqual(before.columns);
    expect(keys(after)).toEqual(['aenderung', 'datum', 'kosten_eur', 'terminwirkung', 'entscheidung', 'status', 'ausloeser', 'kostenuebernahme']);
    expect(after.columns.slice(6).map((c) => [c.type, c.required ?? false])).toEqual([['text', false], ['text', false]]);
    expect(after.footer).toEqual(['change_orders_count', 'change_orders_sum', 'change_orders_open', 'change_orders_ohne_ausloeser_kosten']);
  });
  it('review M-6: the TS generator entry (field-configs/m820_2.ts) carries the same 8 change_orders columns + footer as the migration, so a re-emit cannot drop them', () => {
    const entry = M820_2_FIELD_CONFIGS.find((e) => e.worksheet === '820-2-21' && e.symbol === 'change_orders')!;
    const ts = asRegister(entry.ui_config);
    const after = changeOrdersAfter();
    expect(ts.columns).toEqual(after.columns);
    expect(ts.footer).toEqual(after.footer);
  });
  it('risk_register (820-2-10): today the TS editor table claims it (widget NULL); after the block the DB config keeps the SAME bespoke Tab. A.1 editor', () => {
    const f = (widget: string | null, uiConfig: unknown) => ({ id: 'x', symbol: 'risk_register', dataType: 'json', widget, uiConfig, enumValues: null }) as unknown as WorksheetFormField;
    expect(live('820-2-10', 'risk_register').widget).toBeNull();
    expect(resolveRegisterConfig({ symbol: 'risk_register', dataType: 'json', widget: null })).toBeNull(); // engine sees no register today
    expect(resolveBespokeEditor(f(null, null), null)).toBe('risk_register');
    const ui = riskUi();
    expect(ui.editor).toBe('risk_register');
    expect(keys(ui)).toEqual(['group', 'risk', 'description']);
    const cfg = resolveRegisterConfig({ symbol: 'risk_register', dataType: 'json', widget: 'register', uiConfig: ui });
    expect(cfg?.editor).toBe('risk_register');
    expect(resolveBespokeEditor(f('register', ui), cfg)).toBe('risk_register');
  });
});

describe('review M-3: risk_mitigation_plan on 820-2-10 = the 820-1 Tab. A.2 field (same config, same editor)', () => {
  const dump1 = JSON.parse(readFileSync(resolve(ROOT, 'tests/harness/m820-1-client-route.dump.json'), 'utf8').replace(/^﻿/, '')) as { fields: Array<DumpField & { data_type: string; label_de: string; label_en: string | null }> };
  const live1 = dump1.fields.find((f) => f.worksheet === 'M820-07' && f.symbol === 'risk_mitigation_plan')!;
  it('inserted as json, not required, widget / ui_config NULL like 820-1 M820-07, same labels, section C', () => {
    const st = insertedFieldStatement(FILE, 'risk_mitigation_plan');
    const l = literals(st);
    expect(live1).toMatchObject({ widget: null, ui_config: null, data_type: 'json' });
    expect(l).toEqual(expect.arrayContaining(['C', 'risk_mitigation_plan', live1.label_de, live1.label_en!, 'json']));
    expect(st).toMatch(/'json', NULL, false,/);
    expect(st).toMatch(/'imported_unverified', '[^']*', '[^']*', NULL, NULL, NULL, NULL, NULL, NULL,/); // widget, ui_config, lookup, visible_when, enum_values, consumers
    expect(l.some((x) => x.includes('Zumindest sollten für diejenigen Risiken, welche einen hohen Schaden und eine hohe Eintrittswahrscheinlichkeit aufweisen, Maßnahmenpläne entwickelt werden.'))).toBe(true);
  });
  it('dispatches to the bespoke MitigationPlanEditor (widgets.tsx BESPOKE_BY_SYMBOL while widget IS NULL)', () => {
    const f = { id: 'm', symbol: 'risk_mitigation_plan', dataType: 'json', widget: null, uiConfig: null, enumValues: null } as unknown as WorksheetFormField;
    expect(resolveBespokeEditor(f, null)).toBe('risk_mitigation_plan');
  });
});

// ── counters through the real save-path materialiser ──────────────────────────
type Eq = { id: string; equationNumber: string; formula: string; inputSymbols: string[]; outputSymbol: string };
const eqOf = (num: string, input: string): Eq => {
  const formula = formulaOf(FILE, num);
  return { id: `eq-${num}`, equationNumber: num, formula, inputSymbols: [input], outputSymbol: formula.split(' = ')[0] };
};
function counters(register: string, ui: RegisterUiConfig, eqs: Eq[], rows: unknown[] | undefined) {
  const fields = [
    { id: 'reg', symbol: register, dataType: 'json', unit: null, widget: 'register', uiConfig: ui },
    ...eqs.map((e) => ({ id: `out-${e.outputSymbol}`, symbol: e.outputSymbol, dataType: 'number', unit: null, widget: 'derived', uiConfig: null })),
  ];
  const values: Record<string, FieldValue> = rows === undefined ? {} : { reg: { type: 'json', value: { rows } } };
  const r = materializeDerivedOutputs({ standardCode: 'DWA-M-820-2', worksheetCode: 'x', equations: eqs, fields, valuesByFieldId: values });
  return Object.fromEntries(r.writes.map((w) => [w.symbol, w.value]));
}

describe('derived counters — real engine on sample rows', () => {
  it('the shipped formulas', () => {
    const got = Object.fromEntries(['820-2-03-D1', '820-2-03-D2', '820-2-05-D1', '820-2-05-D2', '820-2-06-D3', '820-2-10-D1', '820-2-21-D4'].map((n) => [n, formulaOf(FILE, n)]));
    console.log('[M820-2 unit] formulas', got);
    expect(got['820-2-03-D2']).toBe('korrespondenz_nachverfolgung_offen = count_rows(korrespondenz, nachverfolgung_noetig == true AND erledigt == false)');
    expect(got['820-2-21-D4']).toBe('change_orders_ohne_ausloeser_kosten = count_rows(change_orders, ausloeser IS NULL OR kostenuebernahme IS NULL)');
  });
  it('korrespondenz: 4 rows (open follow-up, follow-up done, none, incomplete) → count 3, open 1; empty register → 0 / 0', () => {
    const ui = asRegister(insertedUiConfig(FILE, 'korrespondenz'));
    const eqs = [eqOf('820-2-03-D1', 'korrespondenz'), eqOf('820-2-03-D2', 'korrespondenz')];
    const rows = [
      { id: 'a', datum: '2026-08-26', richtung: 'gesendet', betreff: 'permit status', nachverfolgung_noetig: true, erledigt: false },
      { id: 'b', datum: '2026-08-27', richtung: 'empfangen', betreff: 'drawing', nachverfolgung_noetig: true, erledigt: true },
      { id: 'c', datum: '2026-08-28', richtung: 'gesendet', betreff: 'info', nachverfolgung_noetig: false, erledigt: false },
      { id: 'd', datum: '2026-08-29', richtung: 'gesendet', betreff: '', nachverfolgung_noetig: true, erledigt: false },
    ];
    const got = counters('korrespondenz', ui, eqs, rows);
    console.log('[M820-2 unit] korrespondenz', got);
    expect(got).toEqual({ korrespondenz_count: 3, korrespondenz_nachverfolgung_offen: 1 });
    expect(counters('korrespondenz', ui, eqs, [])).toEqual({ korrespondenz_count: 0, korrespondenz_nachverfolgung_offen: 0 });
    // M820 follow-up 1 (item 4, F2 of 21_Fill-Run_M820-2_C1): a register that was never saved is ABSENT, not empty — the save
    // path now writes null ("Fehlende oder leere Eingaben: korrespondenz"), the same verdict as every read path (it used to
    // persist 0 here while the report / MCP recompute said "not computed"). An explicitly empty register stays 0 / 0 (above).
    expect(counters('korrespondenz', ui, eqs, undefined)).toEqual({ korrespondenz_count: null, korrespondenz_nachverfolgung_offen: null });
  });
  it('projektschritte: geplant, in Arbeit, erledigt → count 3, open 2', () => {
    const ui = asRegister(insertedUiConfig(FILE, 'projektschritte'));
    const eqs = [eqOf('820-2-05-D1', 'projektschritte'), eqOf('820-2-05-D2', 'projektschritte')];
    const got = counters('projektschritte', ui, eqs, [
      { id: '1', schritt: 'a', status: 'geplant' }, { id: '2', schritt: 'b', status: 'in Arbeit' }, { id: '3', schritt: 'c', status: 'erledigt' },
    ]);
    console.log('[M820-2 unit] projektschritte', got);
    expect(got).toEqual({ projektschritte_count: 3, projektschritte_offen: 2 });
  });
  it('statusberichte: two reports (lights blank or set) → 2; a row without date not counted', () => {
    const ui = asRegister(insertedUiConfig(FILE, 'statusberichte'));
    const got = counters('statusberichte', ui, [eqOf('820-2-06-D3', 'statusberichte')], [
      { id: '1', nr: 1, datum: '2026-08-29' }, { id: '2', nr: 2, datum: '2026-09-02', ampel_kosten: 'gelb' }, { id: '3', nr: 3 },
    ]);
    expect(got).toEqual({ statusberichte_count: 2 });
  });
  it('change_orders: complete row with both texts → 0; without Auslöser → 1; without both → 1; legacy row (no new keys) → counted', () => {
    const ui = changeOrdersAfter();
    const eqs = [eqOf('820-2-21-D4', 'change_orders')];
    const full = { id: 'a', aenderung: 'A11 routing B', status: 'genehmigt', ausloeser: 'decision round', kostenuebernahme: 'client' };
    expect(counters('change_orders', ui, eqs, [full])).toEqual({ change_orders_ohne_ausloeser_kosten: 0 });
    expect(counters('change_orders', ui, eqs, [{ ...full, ausloeser: '' }])).toEqual({ change_orders_ohne_ausloeser_kosten: 1 });
    expect(counters('change_orders', ui, eqs, [full, { ...full, id: 'b', ausloeser: '', kostenuebernahme: '' }])).toEqual({ change_orders_ohne_ausloeser_kosten: 1 });
    expect(counters('change_orders', ui, eqs, [{ id: 'c', aenderung: 'old', status: 'offen' }])).toEqual({ change_orders_ohne_ausloeser_kosten: 1 });
    expect(counters('change_orders', ui, eqs, [])).toEqual({ change_orders_ohne_ausloeser_kosten: 0 });
  });
  it('risk_register: rows in the bespoke editor shape are counted, and the same json still normalises with its ratings (nothing lost)', () => {
    const ui = riskUi();
    const stored = { rows: [
      { id: 'r1', group: 'Umwelt, Ökologie', risk: 'Altlasten', description: '', ratings: { bauherr: { probability: 9, impact: 5 }, planer: { probability: 9, impact: 5 }, betrieb: { probability: 10, impact: 5 } }, migratedFromSingle: false },
      { id: 'r2', group: '', risk: '', description: 'unnamed', ratings: { bauherr: { probability: null, impact: null }, planer: { probability: null, impact: null }, betrieb: { probability: null, impact: null } }, migratedFromSingle: false },
    ] };
    const got = counters('risk_register', ui, [eqOf('820-2-10-D1', 'risk_register')], stored.rows);
    expect(got).toEqual({ risiken_count: 1 });
    const back = normalizeRiskCarrier(stored);
    expect(back.rows[0].ratings.betrieb).toEqual({ probability: 10, impact: 5 });
  });
});

describe('REQ-09-2 (820-2-21, block) — both ways', () => {
  const cond = insertedGateCondition(FILE, 'REQ-09-2');
  it('ships "change_orders IS EMPTY OR change_orders_ohne_ausloeser_kosten == 0" as a block gate on 820-2-21', () => {
    expect(cond).toBe('change_orders IS EMPTY OR change_orders_ohne_ausloeser_kosten == 0');
    const st = literals(insertedFieldStatement(FILE, 'change_orders_ohne_ausloeser_kosten'));
    expect(st).toContain('derived');
  });
  it('rows stored: counter 0 → pass · counter 1 → fail · counter not yet written → pending; no rows / never filled → pass', () => {
    // the gate lookup maps a json carrier to 'present' (rows > 0) / '' (rows = []) / absent (approval-gate.ts extractValue)
    const r = (carrier: string | undefined, v: number | undefined) =>
      evaluateCondition(cond, (s) => (s === 'change_orders' ? carrier : s === 'change_orders_ohne_ausloeser_kosten' ? v : undefined)).kind;
    const got = [r('present', 0), r('present', 1), r('present', undefined), r('', 0), r(undefined, undefined)];
    console.log('[M820-2 unit] REQ-09-2 present0/present1/present-nocounter/emptyrows/never', got);
    expect(got).toEqual(['pass', 'fail', 'pending', 'pass', 'pass']);
  });
});
