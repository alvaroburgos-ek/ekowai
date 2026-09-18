/**
 * Plan 3 Task 11 — DWA-M-205 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, lookup_fills sit on the worksheet of their keys,
 * visibility never lands on a consumed or gate-bearing producer (pinned against
 * the capture, incl. the refusals that went to STAGED), the register row exprs
 * read the symbols M205-10 really inherits, and the committed migration equals a
 * fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, TAB4_FILL_SYMBOLS, ALT, NEU, BEWAESSERUNG, THERMISCH, KATALYTISCH, CLO2, NICHT_CLO2, LIMIT_T2_EXPR, LIMIT_T3_EXPR, LIMIT_EXPR, OK_EXPR, SENSOREN_MIN_EXPR, DOSIS_OK_EXPR } from '../field-configs/m205';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric, parseExpression, extractSymbols } from '@/lib/expr';
import { tabelle1AsTable, tabelle2AsTable, tabelle3AsTable, tabelle4AsTable, s4123AsTable, s33LogredAsTable, s4332AsTable, s442AsTable, s4334AsTable, TAB2_PROD_TOKENS } from '../regulation-tables-seed-m205';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/m205.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'DWA-M-205';
const ws = (code: string) => FIELD_CONFIGS.filter((e) => e.worksheet === code).map((e) => e.symbol);

describe('DWA-M-205 field configs (Plan 3 Task 11)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules', () => {
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

  it('counts: 49 field entries (37 create, 12 update), widgets by kind, visibility list', () => {
    expect(FIELD_CONFIGS).toHaveLength(49);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(37);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual([
      'M205-04 gesamtcoliforme', 'M205-04 faekalcoliforme', 'M205-04 strep_faecalis', 'M205-04 gewaessertyp', 'M205-04 guetekategorie',
      'M205-05 fkstrep', 'M205-05 toc', 'M205-18 verbrennung_haltezeit_s',
      'M205-21 clo2_konzentration', 'M205-21 chlor_kontaktzeit', 'M205-21 chlor_ph', 'M205-21 restchlor_betrieb',
    ]);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['M205-10 leitorganismen', 'M205-11 bestrahlungsgerinne', 'M205-14 membranmodule', 'M205-17 ozongeneratoren', 'M205-21 chlorungsmittel', 'M205-24 proben_desinfektion']);
    expect(byWidget('lookup_fill')).toEqual([
      'M205-05 log_reduktion_empfehlung', ...TAB4_FILL_SYMBOLS.map((s) => `M205-05 ${s}`),
      'M205-10 uv_dosis_min', 'M205-10 uv_dosis_max', 'M205-17 spez_energie_ozon_tab',
      'M205-18 temperatur_ozonentfernung_min', 'M205-18 temperatur_ozonentfernung_max', 'M205-18 verbrennung_haltezeit_min',
    ]);
    expect(byWidget('select_one')).toEqual(['M205-04 gewaessertyp', 'M205-04 guetekategorie', 'M205-05 bewirtschaftung']);
    expect(byWidget('select_many')).toEqual([]);
    expect(byWidget('derived')).toHaveLength(16); // one per equation
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`)).toEqual([
      `M205-04 gesamtcoliforme :: ${ALT}`, `M205-04 faekalcoliforme :: ${ALT}`, `M205-04 strep_faecalis :: ${ALT}`,
      `M205-04 gewaessertyp :: ${NEU}`, `M205-04 guetekategorie :: ${NEU}`,
      `M205-05 fkstrep :: ${BEWAESSERUNG}`, `M205-05 toc :: ${BEWAESSERUNG}`,
      `M205-18 temperatur_ozonentfernung_max :: ${KATALYTISCH}`, `M205-18 verbrennung_haltezeit_min :: ${THERMISCH}`, `M205-18 verbrennung_haltezeit_s :: ${THERMISCH}`,
      `M205-21 clo2_konzentration :: ${CLO2}`, `M205-21 chlor_kontaktzeit :: ${NICHT_CLO2}`, `M205-21 chlor_ph :: ${NICHT_CLO2}`, `M205-21 restchlor_betrieb :: ${NICHT_CLO2}`,
    ]);
  });

  it('G-A3 key-string equality: table keys equal the driving prod enum / created-select value strings exactly (the one printed cell without a prod token is m205-E-1)', () => {
    expect(enumValues('M205-04 eg_badegewaesser_richtlinie')).toEqual(['alt', 'neu']);
    expect(enumValues('M205-02 eg_badegewaesser_richtlinie')).toEqual(['alt', 'neu']); // the copy M205-10 inherits
    expect(enumValues('M205-09 verfahren')).toEqual(['uv', 'membran', 'ozon', 'chlorung', 'paa', 'h2o2']);
    // TABELLE2.gewaesserklasse ⊆ prod tokens ∪ {kueste_ausreichend}
    for (const r of tabelle2AsTable().rows) expect([...TAB2_PROD_TOKENS, 'kueste_ausreichend']).toContain(r.keys.gewaesserklasse);
    expect(enumValues('M205-02 gewaesserklasse')).toEqual([...TAB2_PROD_TOKENS]);
    // TABELLE2.parameter / TABELLE3 keys = the register's enum column options / prod eignungsklasse tokens
    const cols = registerCfg('M205-10', 'leitorganismen').columns;
    expect(cols.find((c) => c.key === 'parameter_t2')!.options).toEqual(['enterokokken', 'e_coli']);
    expect(new Set(tabelle2AsTable().rows.map((r) => r.keys.parameter))).toEqual(new Set(['enterokokken', 'e_coli']));
    expect(tabelle3AsTable().rows.map((r) => r.keys.eignungsklasse)).toEqual(enumValues('M205-02 eignungsklasse_bewaesserung'));
    expect(tabelle1AsTable().rows.map((r) => r.keys.parameter)).toEqual(['gesamtcoliforme', 'faekalcoliforme', 'strep_faecalis', 'salmonellen', 'darmviren']); // lookup_key column: the table's own row keys
    // TABELLE4 / S4_1_2_3 / S4_3_3_2 / S4_4_2 / S4_3_3_4 keyed on prod enums of the fill's worksheet
    expect(tabelle4AsTable().rows.map((r) => r.keys.strahlertyp)).toEqual(enumValues('M205-05 strahlertyp'));
    for (const r of s4123AsTable().rows) expect(enumValues('M205-10 uv_dosis_zielband')).toContain(r.keys.zielband);
    expect(new Set(s4332AsTable().rows.map((r) => r.keys.einsatzgas))).toEqual(new Set(enumValues('M205-17 ozon_einsatzgas')));
    expect(s442AsTable().rows.map((r) => r.keys.chlormittel)).toEqual(enumValues('M205-21 chlormittel_typ'));
    expect(registerCfg('M205-21', 'chlorungsmittel').columns.find((c) => c.key === 'mittel')!.options).toEqual(enumValues('M205-21 chlormittel_typ'));
    expect(s4334AsTable().rows.map((r) => r.keys.verbrennung_typ)).toEqual(enumValues('M205-18 verbrennung_typ'));
    // S3_3_LOGRED = prod nutzung × the created select
    const bew = byKey('M205-05', 'bewirtschaftung').enum_values as Array<{ value: string }>;
    for (const r of s33LogredAsTable().rows) { expect(enumValues('M205-05 nutzung')).toContain(r.keys.nutzung); expect(bew.map((o) => o.value)).toContain(r.keys.bewirtschaftung); }
    // membranmodule.verfahren = prod membranverfahren tokens
    expect(registerCfg('M205-14', 'membranmodule').columns.find((c) => c.key === 'verfahren')!.options).toEqual(enumValues('M205-14 membranverfahren'));
    // ct target tokens
    expect(enumValues('M205-17 ct_wert_zielorganismus')).toEqual(['e_coli', 'cryptosporidien']);
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns in order, value column exists, data_type number|text (amendment C), keys live on the same worksheet; no existing input is re-bound', () => {
    const tables = { TABELLE4: tabelle4AsTable(), S4_1_2_3: s4123AsTable(), S3_3_LOGRED: s33LogredAsTable(), S4_3_3_2: s4332AsTable(), S4_3_3_4: s4334AsTable() } as const;
    const symbolsOn = (w: string) => new Set([
      ...Object.keys(prior).filter((k) => k.startsWith(`${w} `)).map((k) => k.slice(w.length + 1)),
      ...FIELD_CONFIGS.filter((e) => e.worksheet === w && e.create).map((e) => e.symbol),
    ]);
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      const t = tables[e.lookup!.table_code as keyof typeof tables];
      expect(t, `${e.symbol} table`).toBeDefined();
      expect(e.lookup!.keys.map((k) => k.column)).toEqual(t.key_columns);
      expect(t.value_columns.map((c) => c.name)).toContain(e.lookup!.value);
      expect(e.create, `${e.symbol} is a created twin`).toBeDefined(); // E-2 rule: never re-bind an existing input
      expect(['number', 'text']).toContain(e.create!.data_type);
      for (const k of e.lookup!.keys) expect(symbolsOn(e.worksheet).has(k.from_symbol), `${e.symbol} key ${k.from_symbol} on ${e.worksheet}`).toBe(true);
    }
    // the six Tab.-4 fills are TEXT twins (ranges — SR-2, m205-R-4) of the existing numeric inputs on M205-05
    for (const s of TAB4_FILL_SYMBOLS) {
      expect(byKey('M205-05', s).create!.data_type).toBe('text');
      expect(priorRow(`M205-05 ${s.replace(/_tab4$/, '')}`).data_type).toBe('number');
    }
    // spez_energie_ozon is consumed on -07 (M205-11) and -19 (M205-26) → twin on -17 beside the key (m205-E-3 / R-1)
    expect(priorRow('M205-07 spez_energie_ozon').consumer_worksheets).toEqual(['M205-11']);
    expect(priorRow('M205-19 spez_energie_ozon').consumer_worksheets).toEqual(['M205-26']);
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'spez_energie_ozon')).toBeUndefined();
    expect(byKey('M205-10', 'uv_dosis_min').lookup!.role).toBe('limit');
    expect(byKey('M205-18', 'temperatur_ozonentfernung_min').lookup!.role).toBe('limit');
  });

  it('leitorganismen register (M205-10): discriminator columns per Zieltabelle, Tab.-2 / Tab.-3 rows read the symbols M205-10 inherits from M205-02, footer = the two -10 outputs; no override block', () => {
    const cfg = registerCfg('M205-10', 'leitorganismen');
    const vis = (k: string) => cfg.columns.find((c) => c.key === k)?.visible_when;
    for (const k of ['parameter_t1', 'g_wert_t1', 'g_pct_t1', 'i_wert_t1', 'i_pct_t1', 'wert_typ']) expect(vis(k), k).toBe("quelle == 't1'");
    for (const k of ['parameter_t2', 'limit_t2', 'pct_t2', 'methode_t2']) expect(vis(k), k).toBe("quelle == 't2'");
    for (const k of ['parameter_t3', 'limit_t3', 'text_t3']) expect(vis(k), k).toBe("quelle == 't3'");
    for (const k of ['organismus_behoerde', 'limit_behoerde', 'perzentil_behoerde']) expect(vis(k), k).toBe("quelle == 'behoerde'");
    for (const k of ['quelle', 'limit', 'perzentil', 'messwert', 'ok']) expect(vis(k), k).toBeUndefined();
    expect(cfg.columns.find((c) => c.key === 'quelle')!.discriminator).toBe(true);
    expect(cfg.columns.filter((c) => c.type === 'lookup_key').map((c) => c.key)).toEqual(['parameter_t1']); // one lookup_key → TABELLE1 (anhaltswert) would bind the toggle; no override block
    expect(cfg.override).toBeUndefined();
    expect(cfg.columns.find((c) => c.key === 'limit_t2')!.expr).toBe(LIMIT_T2_EXPR);
    expect(cfg.columns.find((c) => c.key === 'limit_t3')!.expr).toBe(LIMIT_T3_EXPR);
    expect(cfg.columns.find((c) => c.key === 'limit')!.expr).toBe(LIMIT_EXPR);
    expect(cfg.columns.find((c) => c.key === 'ok')!.expr).toBe(OK_EXPR);
    expect(cfg.footer).toEqual(['leitorganismen_count', 'leitorganismen_verletzungen']);
    // the worksheet symbols the row exprs read are inherited on M205-10 (capture: consumer_worksheets of the M205-02 copies)
    const wsSymbols = [...extractSymbols(parseExpression(LIMIT_T2_EXPR)!), ...extractSymbols(parseExpression(LIMIT_T3_EXPR)!)].filter((s) => !['parameter_t2', 'parameter_t3'].includes(s));
    expect(new Set(wsSymbols)).toEqual(new Set(['gewaesserklasse', 'eignungsklasse_bewaesserung']));
    expect(priorRow('M205-02 gewaesserklasse').consumer_worksheets).toEqual(['M205-10']);
    expect(priorRow('M205-02 eignungsklasse_bewaesserung').consumer_worksheets).toEqual(['M205-10']);
    expect(priorRow('M205-02 eg_badegewaesser_richtlinie').consumer_worksheets).toEqual(['M205-10']);
    // the brief's gewaessertyp / guetekategorie live on M205-04 only, consumer-free — not usable in row scope on -10
    expect(priorRow('M205-04 gewaessertyp').consumer_worksheets).toBeNull();
    expect(priorRow('M205-04 guetekategorie').consumer_worksheets).toBeNull();
    expect(priorRow('M205-10 gewaessertyp')).toBeUndefined();
    // the 14 Tab.-2 gates read e_coli_ablauf / enterokokken_ablauf — both on M205-10, consumer-free (G-1 rewrite target)
    expect(priorRow('M205-10 e_coli_ablauf').consumer_worksheets).toBeNull();
    expect(priorRow('M205-10 enterokokken_ablauf').consumer_worksheets).toBeNull();
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) expect((r.ui_config as RegisterUiConfig).override).toBeUndefined();
    // fix round 1: the channel register carries the bank count (L590 per Bestrahlungsbank) and the chlorination register the sand-filter switch (L984, Chlordioxid only)
    const ger = registerCfg('M205-11', 'bestrahlungsgerinne');
    expect(ger.columns.find((c) => c.key === 'banks')).toMatchObject({ type: 'number', required: true, min: 1 });
    expect(ger.columns.find((c) => c.key === 'sensoren_min')!.expr).toBe(SENSOREN_MIN_EXPR);
    expect(SENSOREN_MIN_EXPR).toBe('max(banks, if(zuschaltbar == true, 2, 1))');
    const chl = registerCfg('M205-21', 'chlorungsmittel');
    expect(chl.columns.find((c) => c.key === 'sandfiltriert')).toMatchObject({ type: 'enum', options: ['ja', 'nein'], required: true, visible_when: "mittel == 'chlordioxid'" });
    expect(chl.columns.find((c) => c.key === 'dosis_ok')!.expr).toBe(DOSIS_OK_EXPR);
    expect(chl.columns.map((c) => c.key)).toEqual(['mittel', 'dosis', 'dosis_unit', 'dosis_min', 'dosis_max', 'sandfiltriert', 'dosis_min_eff', 'dosis_max_eff', 'dosis_ok', 'kontaktzeit_ist', 'kontaktzeit_text', 'restchlor']);
  });

  it('visibility never lands on a consumed or gate-bearing producer; the refused / withheld targets are pinned (m205-C-4, G-6, G-7); created fields sit in captured sections', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const row = priorRow(`${e.worksheet} ${e.symbol}`);
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect(row.consumer_worksheets ?? [], `${e.worksheet} ${e.symbol} consumers`).toEqual([]);
    }
    // consumed twins the brief wanted hidden — untouched (C-4)
    for (const [w, s] of [['M205-21', 'clo2_dosis'], ['M205-21', 'freies_chlor'], ['M205-21', 'kontaktzeit_chlor'], ['M205-21', 'entchlorungsstufe'], ['M205-21', 'ph_chlorung'], ['M205-17', 'ozon_pro_doc'], ['M205-20', 'bromat_bildung'], ['M205-07', 'bromat_bildung'], ['M205-07', 'ozon_pro_doc']] as const) {
      expect((priorRow(`${w} ${s}`).consumer_worksheets ?? []).length, `${w} ${s}`).toBeGreaterThan(0);
      expect(FIELD_CONFIGS.find((e) => e.worksheet === w && e.symbol === s)).toBeUndefined();
    }
    // wiederverkeimungsbeurteilung (M205-07) is consumer-free but read by the block gate CR-31 — a rule would turn the gate not_applicable → G-6, not emitted
    expect(priorRow('M205-07 wiederverkeimungsbeurteilung').consumer_worksheets).toBeNull();
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'wiederverkeimungsbeurteilung')).toBeUndefined();
    // verfahren (M205-09) reaches no worksheet — every section rule keyed on it would be pending, and every field-bearing section of -10…-23 holds a consumed producer (C-1 / C-2)
    expect(priorRow('M205-09 verfahren').consumer_worksheets).toBeNull();
    expect(() => emitFieldConfigSql('m205', [], [{ standard: STD, worksheet: 'M205-10', section_code: 'B', visible_when: "verfahren == 'uv'", verification_quote: 'q' }], prior)).toThrow(/strahlertyp/);
    expect(() => emitFieldConfigSql('m205', [], [{ standard: STD, worksheet: 'M205-21', section_code: 'B', visible_when: "verfahren == 'chlorung'", verification_quote: 'q' }], prior)).toThrow(/consumed/);
    // behandlungsziel (M205-03) is consumer-free → the two -05 rules are pending (visible) until C-3
    expect(priorRow('M205-03 behandlungsziel').consumer_worksheets).toBeNull();
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
      expect(['B', 'C', 'D']).toContain(e.create!.section_code);
    }
    expect(ws('M205-16')).toEqual([]); // the empty worksheet gets nothing
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    const { up, down } = emitFieldConfigSql('m205', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('m205', '20260917101110');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(12);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(37);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
