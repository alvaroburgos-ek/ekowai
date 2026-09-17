/**
 * Plan 3 Task 2 — DIN-1989-1 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, the emitter accepts the module against the
 * captured prior, visibility never lands on a consumed producer, and the
 * committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, INBETRIEBNAHME_PRUEFPUNKTE } from '../field-configs/din1989_1';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { tab1AsTable, tab2AsTable, tab3AsTable, tab4PersonAsTable, tab4FlaecheAsTable, tab4WaschmaschineAsTable, tab5AsTable } from '../regulation-tables-seed-din1989_1';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/din1989_1.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const priorRow = (key: string) => (prior as Record<string, { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null }>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;

describe('DIN-1989-1 field configs (Plan 3 Task 2)', () => {
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
    for (const s of SECTION_VISIBILITY) expect(parseCondition(s.visible_when), `${s.worksheet} ${s.section_code}`).not.toBeNull();
  });

  it('counts: 21 field entries (18 create, 3 update), widgets by kind, one section rule on DIN-1989-1-04 B', () => {
    expect(FIELD_CONFIGS).toHaveLength(21);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(18);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['DIN-1989-1-02 speicher_behaelter', 'DIN-1989-1-04 auffangflaechen', 'DIN-1989-1-04 verbraucher', 'DIN-1989-1-04 bewaesserungsflaechen', 'DIN-1989-1-06 wartungsplan']);
    expect(byWidget('lookup_fill')).toEqual(['DIN-1989-1-02 abdeckung_klasse']);
    expect(byWidget('select_one')).toEqual(['DIN-1989-1-02 belastungsklasse', 'DIN-1989-1-05 kanalart']);
    expect(byWidget('select_many')).toEqual(['DIN-1989-1-05 inbetriebnahme_pruefpunkte']);
    expect(byWidget('attestation')).toEqual(['DIN-1989-1-04 verkuerzt_band_beachtet', 'DIN-1989-1-05 versickerung_bemessung_a138', 'DIN-1989-1-05 whg_erlaubnis']);
    expect(byWidget('derived')).toEqual([
      'DIN-1989-1-02 nennvolumen', 'DIN-1989-1-02 speicher_einzelvolumen_sum', 'DIN-1989-1-02 speicheroeffnung_min_erf',
      'DIN-1989-1-04 sum_a_e', 'DIN-1989-1-04 bw_person', 'DIN-1989-1-04 bw_flaeche', 'DIN-1989-1-04 bw_a_total', 'DIN-1989-1-04 tagesbedarf',
      'DIN-1989-1-06 wartungsplan_rows',
    ]);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`)).toEqual([
      "DIN-1989-1-02 belastungsklasse :: speicher_aufstellung == 'unterirdisch'",
      "DIN-1989-1-02 abdeckung_klasse :: speicher_aufstellung == 'unterirdisch'",
      "DIN-1989-1-04 verkuerzt_band_beachtet :: bemessungsverfahren == 'verkuerzt'",
      'DIN-1989-1-05 versickerung_bemessung_a138 :: ueberlauf_versickerung == true',
      'DIN-1989-1-05 whg_erlaubnis :: ueberlauf_versickerung == true',
    ]);
    // the -04 section-B rule (bemessungsverfahren != 'verkuerzt', L796) was REFUSED by the transitive producer guard (Task 3 fix round 1) — STAGED din1989_1-C-3
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('G-A3 key-string equality: table keys equal the driving enum / register-column value strings exactly', () => {
    // TAB3 keys = prod auffangflaechen_art tokens (DIN-1989-1-02), in prod order
    expect(tab3AsTable().rows.map((r) => r.keys.auffangflaechen_art)).toEqual(enumValues('DIN-1989-1-02 auffangflaechen_art'));
    // TAB1 keys = prod belastungsklasse tokens; the lookup_fill writes a text (data_type text)
    expect(tab1AsTable().rows.map((r) => r.keys.belastungsklasse)).toEqual(enumValues('DIN-1989-1-02 belastungsklasse'));
    expect(byKey('DIN-1989-1-02', 'belastungsklasse').enum_values).toBe('keep_prod');
    // TAB2 first key ⊆ prod speicher_aufstellung tokens (keller has no row) and = the register's enum column options
    const aufstellung = registerCfg('DIN-1989-1-02', 'speicher_behaelter').columns.find((c) => c.key === 'aufstellung')!;
    expect(aufstellung.options).toEqual(['oberirdisch', 'unterirdisch']);
    for (const r of tab2AsTable().rows) expect(aufstellung.options).toContain(r.keys.aufstellung);
    for (const o of aufstellung.options!) expect(enumValues('DIN-1989-1-02 speicher_aufstellung')).toContain(o);
    // register lookup pairs bind the seeded tables
    const auff = registerCfg('DIN-1989-1-04', 'auffangflaechen').columns;
    expect(auff.find((c) => c.key === 'art')?.lookup).toEqual({ table_code: 'TAB3' });
    expect(auff.find((c) => c.key === 'e')?.lookup).toEqual({ table_code: 'TAB3', key_column: 'art', value: 'e' });
    const verb = registerCfg('DIN-1989-1-04', 'verbraucher').columns;
    expect(verb.find((c) => c.key === 'typ')?.lookup).toEqual({ table_code: 'TAB4_PERSON' });
    expect(verb.find((c) => c.key === 'p_d')?.lookup).toEqual({ table_code: 'TAB4_PERSON', key_column: 'typ', value: 'p_d' });
    expect(verb.find((c) => c.key === 'p_d_eff')?.expr).toContain("lookup('TAB4_WASCHMASCHINE', 'waschmaschine', 'p_d_zusatz')");
    expect(tab4WaschmaschineAsTable().rows[0].row_key).toBe('waschmaschine');
    const bew = registerCfg('DIN-1989-1-04', 'bewaesserungsflaechen').columns;
    expect(bew.find((c) => c.key === 'typ')?.lookup).toEqual({ table_code: 'TAB4_FLAECHE' });
    expect(bew.find((c) => c.key === 'bs_a_min')?.lookup).toEqual({ table_code: 'TAB4_FLAECHE', key_column: 'typ', value: 'bs_a_min' });
    expect(bew.find((c) => c.key === 'bs_a_max')?.lookup).toEqual({ table_code: 'TAB4_FLAECHE', key_column: 'typ', value: 'bs_a_max' });
    expect(tab4PersonAsTable().rows).toHaveLength(3);
    expect(tab4FlaecheAsTable().rows).toHaveLength(4);
    const wart = registerCfg('DIN-1989-1-06', 'wartungsplan').columns;
    expect(wart.find((c) => c.key === 'anlagenteil')?.lookup).toEqual({ table_code: 'TAB5' });
    expect(wart.find((c) => c.key === 'inspektion')?.lookup).toEqual({ table_code: 'TAB5', key_column: 'anlagenteil', value: 'inspektion_intervall' });
    expect(tab5AsTable().rows).toHaveLength(17);
    // the select_many options are the 15 printed Anhang B rows
    const chk = byKey('DIN-1989-1-05', 'inbetriebnahme_pruefpunkte').enum_values as Array<{ value: string }>;
    expect(chk.map((o) => o.value)).toEqual(INBETRIEBNAHME_PRUEFPUNKTE.map((p) => p.value));
    expect(chk).toHaveLength(15);
  });

  it('lookup_fill binding: keys[].column equal the table key_columns in order; data_type text (amendment C); register override flags name boolean columns', () => {
    const e = byKey('DIN-1989-1-02', 'abdeckung_klasse');
    expect(e.lookup!.keys.map((k) => k.column)).toEqual(tab1AsTable().key_columns);
    expect(e.lookup!.keys[0].from_symbol).toBe('belastungsklasse');
    expect(tab1AsTable().value_columns.map((c) => c.name)).toContain(e.lookup!.value);
    expect(e.create?.data_type).toBe('text');
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const ui = r.ui_config as RegisterUiConfig;
      if (ui.override) expect(ui.columns.find((c) => c.key === ui.override!.flag_key)?.type).toBe('boolean');
    }
  });

  it('visibility never lands on a consumed producer (pinned against the capture); created fields sit in captured sections', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const row = priorRow(`${e.worksheet} ${e.symbol}`);
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect(row.consumer_worksheets ?? []).toEqual([]);
    }
    // the -04 section B: every captured field is consumer-free DIRECTLY, but each feeds Gl. 1–3 whose outputs (E_R, BW_a) are consumed — the transitive guard refuses the rule (din1989_1-C-3)
    const sectionB = Object.entries(prior).filter(([k, v]) => k.startsWith('DIN-1989-1-04 ') && (v as { section_code?: string | null }).section_code === 'B');
    expect(sectionB.map(([k]) => k.slice('DIN-1989-1-04 '.length)).sort()).toEqual(['A_A', 'A_Bew', 'BS_a', 'P_d', 'e', 'eta', 'h_N', 'n']);
    for (const [, v] of sectionB) expect((v as { consumer_worksheets?: string[] | null }).consumer_worksheets ?? []).toEqual([]);
    expect(producerChain(prior, 'DIN-1989-1-04', 'A_A')).toMatch(/^A_A → Gl\.1 E_R \(consumed by /);
    expect(() => emitFieldConfigSql('din1989_1', [], [{ standard: 'DIN-1989-1', worksheet: 'DIN-1989-1-04', section_code: 'B', visible_when: "bemessungsverfahren != 'verkuerzt'", verification_quote: 'q' }], prior)).toThrow(/A_A → Gl\.1 E_R/);
    // sicherungseinrichtung_typ IS consumed (by -05) — that is why its visibility is STAGED (din1989_1-C-1), not encoded
    expect(priorRow('DIN-1989-1-03 sicherungseinrichtung_typ').consumer_worksheets).toEqual(['DIN-1989-1-05']);
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'sicherungseinrichtung_typ')).toBeUndefined();
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
    }
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    const { up, down } = emitFieldConfigSql('din1989_1', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('din1989_1', '20260917100210');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(3);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(18);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
