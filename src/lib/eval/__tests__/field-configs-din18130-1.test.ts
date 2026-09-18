/**
 * Plan 3 Task 10 — DIN-18130-1 field configs: every entry parses through the
 * zod contract, the key-string equality rule (G-A3) holds against the captured
 * prod enums / booleans and the seeded tables, lookup_fills sit on the worksheet
 * of their keys, visibility never lands on a consumed producer (pinned against
 * the capture, incl. the refusals that went to STAGED), and the committed
 * migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, PFLICHTANGABEN, KONSTANT, VERAENDERLICH } from '../field-configs/din18130_1';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig, type SelectManyUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { tab3AsTable, tab4AsTable, tab5AsTable, s58AsTable, s58KornAsTable, TAB5_BODENARTEN } from '../regulation-tables-seed-din18130_1';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/din18130_1.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'DIN-18130-1';

describe('DIN-18130-1 field configs (Plan 3 Task 10)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      if (e.widget === 'register') {
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 27 field entries (24 create, 3 update), widgets by kind, visibility list', () => {
    expect(FIELD_CONFIGS).toHaveLength(27);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(24);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual(['DIN-18130-1-01 A_min', 'DIN-18130-1-02 u_0', 'DIN-18130-1-05 i_bereich']);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['DIN-18130-1-03 ablesungen', 'DIN-18130-1-04 versuche']);
    expect(byWidget('lookup_fill')).toEqual([
      'DIN-18130-1-01 A_min', 'DIN-18130-1-01 groesstkorn_verhaeltnis',
      'DIN-18130-1-02 tab5_erreichbare_klasse', 'DIN-18130-1-02 tab5_geeignet', 'DIN-18130-1-02 tab5_sb', 'DIN-18130-1-02 tab5_u0',
      'DIN-18130-1-02 versuchsklasse_tab4', 'DIN-18130-1-02 u_0',
    ]);
    expect(byWidget('select_one')).toEqual(['DIN-18130-1-01 bindig_grobkoernig', 'DIN-18130-1-02 bodenart_tab5', 'DIN-18130-1-02 messung_gefaelle', 'DIN-18130-1-02 s_r_band']);
    expect(byWidget('select_many')).toEqual(['DIN-18130-1-05 pflichtangaben']);
    expect(byWidget('attestation')).toEqual(['DIN-18130-1-02 stroemung_stationaer']);
    expect(byWidget('scalar')).toEqual(['DIN-18130-1-02 filterstein_k', 'DIN-18130-1-02 probe_durchmesser_mm', 'DIN-18130-1-05 i_bereich']);
    expect(byWidget('derived')).toEqual([
      'DIN-18130-1-03 k_T_mean', 'DIN-18130-1-03 alpha_calc', 'DIN-18130-1-03 k_10_calc', 'DIN-18130-1-03 i_max_calc', 'DIN-18130-1-03 i_min_calc',
      'DIN-18130-1-04 k_10_runs_mean', 'DIN-18130-1-04 versuche_count', 'DIN-18130-1-04 bereich_code',
    ]);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`)).toEqual([
      'DIN-18130-1-02 s_r_band :: saettigung_aufgebracht == true',
      "DIN-18130-1-02 filterstein_k :: versuchsanordnung == 'TX'",
      "DIN-18130-1-02 probe_durchmesser_mm :: versuchsanordnung == 'KD'",
      "DIN-18130-1-05 i_bereich :: gefaelle_typ == 'veraenderlich'",
    ]);
  });

  it('G-A3 key-string equality: table keys equal the driving enum / boolean / created-select value strings exactly', () => {
    // TAB5.anordnung = prod versuchsanordnung tokens (KD/ZY/TX, upper case as captured)
    expect(enumValues('DIN-18130-1-02 versuchsanordnung')).toEqual(['KD', 'ZY', 'TX']);
    for (const r of tab5AsTable().rows) expect(['KD', 'ZY', 'TX']).toContain(r.keys.anordnung);
    // TAB5.bodenart = the created select's options, in printed order
    const bodenart = byKey('DIN-18130-1-02', 'bodenart_tab5').enum_values as Array<{ value: string }>;
    expect(bodenart.map((o) => o.value)).toEqual(TAB5_BODENARTEN.map((b) => b.value));
    for (const r of tab5AsTable().rows) expect(bodenart.map((o) => o.value)).toContain(r.keys.bodenart);
    // TAB4 keys = stringified prod booleans; both drivers are booleans on -02 (String(true) = 'true')
    expect(priorRow('DIN-18130-1-02 saettigung_aufgebracht').data_type).toBe('boolean');
    expect(byKey('DIN-18130-1-02', 'stroemung_stationaer').create?.data_type).toBe('boolean');
    expect(tab4AsTable().rows.map((r) => `${r.keys.saettigung}|${r.keys.stationaer}`)).toEqual(['true|true', 'true|false', 'false|true', 'false|false']);
    // TAB3.s_r_band = the created select's options
    const band = byKey('DIN-18130-1-02', 's_r_band').enum_values as Array<{ value: string }>;
    expect(tab3AsTable().rows.map((r) => r.keys.s_r_band)).toEqual(band.map((o) => o.value));
    // S5_8.bodenklasse = the created select's options; S5_8_KORN keyed on the prod boolean ungleichfoermig
    const bk = byKey('DIN-18130-1-01', 'bindig_grobkoernig').enum_values as Array<{ value: string }>;
    expect(s58AsTable().rows.map((r) => r.keys.bodenklasse)).toEqual(bk.map((o) => o.value));
    expect(priorRow('DIN-18130-1-01 ungleichfoermig').data_type).toBe('boolean');
    expect(s58KornAsTable().rows.map((r) => r.keys.ungleichfoermig)).toEqual(['true', 'false']);
    // the select_many options are the 14 printed §8.4 items (5 + 9), grouped as printed
    const chk = byKey('DIN-18130-1-05', 'pflichtangaben');
    expect((chk.enum_values as Array<{ value: string }>).map((o) => o.value)).toEqual(PFLICHTANGABEN.map((p) => p.value));
    expect(PFLICHTANGABEN).toHaveLength(14);
    const ui = parseFieldConfig({ widget: 'select_many', uiConfig: chk.ui_config, lookup: null, visibleWhen: null }).ui as SelectManyUiConfig;
    expect(ui.groups!.map((g) => [g.label, g.options.length])).toEqual([['1) Angaben zum Versuch', 5], ['2) Angaben zur Probe', 9]]);
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns in order, value column exists, data_type number|text (amendment C), keys live on the same worksheet', () => {
    const tables = { TAB3: tab3AsTable(), TAB4: tab4AsTable(), TAB5: tab5AsTable(), S5_8: s58AsTable(), S5_8_KORN: s58KornAsTable() } as const;
    const symbolsOn = (ws: string) => new Set([
      ...Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1)),
      ...FIELD_CONFIGS.filter((e) => e.worksheet === ws && e.create).map((e) => e.symbol),
    ]);
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      const t = tables[e.lookup!.table_code as keyof typeof tables];
      expect(t, `${e.symbol} table`).toBeDefined();
      expect(e.lookup!.keys.map((k) => k.column)).toEqual(t.key_columns);
      expect(t.value_columns.map((c) => c.name)).toContain(e.lookup!.value);
      const dt = e.create?.data_type ?? priorRow(`${e.worksheet} ${e.symbol}`).data_type;
      expect(['number', 'text', 'enum']).toContain(dt);
      for (const k of e.lookup!.keys) expect(symbolsOn(e.worksheet).has(k.from_symbol), `${e.symbol} key ${k.from_symbol} on ${e.worksheet}`).toBe(true);
    }
    expect(byKey('DIN-18130-1-01', 'A_min').lookup!.role).toBe('limit');
    expect(priorRow('DIN-18130-1-01 A_min').data_type).toBe('number');
    expect(priorRow('DIN-18130-1-02 u_0').data_type).toBe('number');
    // the two-key fills on -02 read the prod select versuchsanordnung + the created bodenart_tab5 (a138 trap 1: keys on the fill's worksheet)
    expect(byKey('DIN-18130-1-02', 'tab5_erreichbare_klasse').lookup!.keys.map((k) => k.from_symbol)).toEqual(['bodenart_tab5', 'versuchsanordnung']);
    expect(byKey('DIN-18130-1-02', 'versuchsklasse_tab4').lookup!.keys.map((k) => k.from_symbol)).toEqual(['saettigung_aufgebracht', 'stroemung_stationaer']);
    // the -01 versuchsklasse enum keeps its input (its drivers live on -02; re-point STAGED din18130_1-E-1)
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'versuchsklasse')).toBeUndefined();
    expect(priorRow('DIN-18130-1-01 versuchsklasse').consumer_worksheets).toEqual(['DIN-18130-1-02', 'DIN-18130-1-05']);
  });

  it('ablesungen register: konstant vs veränderlich columns switch on the inherited gefaelle_typ (tokens as captured); k/h/i exprs are the printed Gl. 8 (Q = V_w/t), Gl. 9 and Tab. 11 forms; footer = the four -03 outputs', () => {
    expect(enumValues('DIN-18130-1-02 gefaelle_typ')).toEqual(['konstant', 'veraenderlich']);
    expect(priorRow('DIN-18130-1-02 gefaelle_typ').consumer_worksheets).toEqual(['DIN-18130-1-03', 'DIN-18130-1-04']);
    const cols = registerCfg('DIN-18130-1-03', 'ablesungen').columns;
    const vis = (k: string) => cols.find((c) => c.key === k)?.visible_when;
    for (const k of ['h_o', 'h_u', 'p_o', 'p_u', 'v_w']) expect(vis(k), k).toBe(KONSTANT);
    for (const k of ['h_1', 'h_2']) expect(vis(k), k).toBe(VERAENDERLICH);
    for (const k of ['nr', 't_s', 't_c']) expect(vis(k), k).toBeUndefined();
    expect(cols.find((c) => c.key === 'h_row')?.expr).toBe('h_o - h_u + (p_o - p_u) / gamma_w');
    expect(cols.find((c) => c.key === 'k_row')?.expr).toBe("if(gefaelle_typ == 'konstant', v_w * l / (A * h_row * t_s), a * l_0 / (A * t_s) * ln(h_1 / h_2))");
    expect(cols.find((c) => c.key === 'alpha_row')?.expr).toBe('1.359 / (1 + 0.0337 * t_c + 0.00022 * t_c^2)');
    expect(cols.find((c) => c.key === 'k10_row')?.expr).toBe('k_row * alpha_row');
    expect(registerCfg('DIN-18130-1-03', 'ablesungen').footer).toEqual(['k_T_mean', 'k_10_calc', 'i_max_calc', 'i_min_calc']);
    // the worksheet symbols the row exprs read exist on -03 (own fields) — gamma_w, l, l_0, A, a
    for (const s of ['gamma_w', 'l', 'l_0', 'A', 'a']) expect(priorRow(`DIN-18130-1-03 ${s}`), s).toBeDefined();
    const runs = registerCfg('DIN-18130-1-04', 'versuche');
    expect(runs.columns.find((c) => c.key === 'n_pore_row')?.expr).toBe('e / (1 + e)');
    expect(runs.footer).toEqual(['k_10_runs_mean', 'versuche_count']);
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) expect((r.ui_config as RegisterUiConfig).override).toBeUndefined(); // no lookup_key pair → no override block
  });

  it('visibility never lands on a consumed producer; the refused targets are pinned as consumed / chained (din18130_1-C-2); created fields sit in captured sections', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const row = priorRow(`${e.worksheet} ${e.symbol}`);
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect(row.consumer_worksheets ?? []).toEqual([]);
    }
    // every -03 measurement scalar the brief wanted hidden is consumed by -04 → no rule (C-2)
    for (const s of ['h_o', 'h_u', 'p_o', 'p_u', 'V_w', 'h_1', 'h_2', 't', 'a', 'l', 'l_0', 'A']) {
      expect(priorRow(`DIN-18130-1-03 ${s}`).consumer_worksheets, s).toEqual(['DIN-18130-1-04']);
      expect(FIELD_CONFIGS.find((e) => e.worksheet === 'DIN-18130-1-03' && e.symbol === s)).toBeUndefined();
    }
    expect(priorRow('DIN-18130-1-02 u_0').consumer_worksheets).toEqual(['DIN-18130-1-05']);           // no visible_when on u_0 (lookup_fill only)
    expect(byKey('DIN-18130-1-02', 'u_0').visible_when).toBeUndefined();
    expect(priorRow('DIN-18130-1-02 statische_belastung').consumer_worksheets).toEqual(['DIN-18130-1-05']); // G-8, not a rule
    expect(priorRow('DIN-18130-1-01 alpha').consumer_worksheets).toEqual(['DIN-18130-1-04']);              // D-1, stays visible
    // h_0 / gamma_org are consumer-free but feed Gl. 7 whose h is consumed by -04 → the transitive guard refuses
    expect(producerChain(prior, 'DIN-18130-1-02', 'h_0')).toMatch(/h_0 → Gl\.7 h \(consumed by DIN-18130-1-04\)/);
    expect(() => emitFieldConfigSql('din18130_1', [{ standard: STD, worksheet: 'DIN-18130-1-02', symbol: 'h_0', widget: 'scalar', ui_config: null, visible_when: VERAENDERLICH, verification_quote: 'q' }], [], prior)).toThrow(/h_0 → Gl\.7 h/);
    // section -04 G holds the consumed k (three producers); -04 H holds no field at all (an inert rule) — both C-2
    expect(() => emitFieldConfigSql('din18130_1', [], [{ standard: STD, worksheet: 'DIN-18130-1-04', section_code: 'G', visible_when: KONSTANT, verification_quote: 'q' }], prior)).toThrow(/k/);
    expect(Object.entries(prior).filter(([k, v]) => k.startsWith('DIN-18130-1-04 ') && (v as Row).section_code === 'H')).toHaveLength(0);
    // i_bereich's driver gefaelle_typ is not consumed on -05 → the rule is `pending` (visible, inert) until din18130_1-C-1
    expect(priorRow('DIN-18130-1-02 gefaelle_typ').consumer_worksheets).not.toContain('DIN-18130-1-05');
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
    }
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    const { up, down } = emitFieldConfigSql('din18130_1', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('din18130_1', '20260917101010');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(3);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(24);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
