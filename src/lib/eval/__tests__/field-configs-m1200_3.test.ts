/**
 * Plan 3 Task 6 — DWA-M-1200-3 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, the emitter accepts the module against the
 * captured prior (two UPDATE entries for the Plan-1 `bewaesserungstagebuch`
 * register, the other 22 `create`), no rule lands on a consumed producer
 * (the brief's rules on existing fields are pinned as REFUSED by the transitive
 * guard — m1200_3-C-2 … -C-6), the eight M12003-13 section rules pass the
 * section guard while 13-B would be refused (m1200_3-C-1), and the committed
 * migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, SPR, SPR_ROW, FILL_CHLORUNG, FILL_H2O2, FILL_TAB14, FILL_FARBE, PFAD_DATALIST, TAGEBUCH_COLUMNS } from '../field-configs/m1200_3';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import {
  GUETEKLASSE_TOKENS, SPEICHERTYP_TOKENS, LEITUNGSTYP_TOKENS, DESINFEKTION_TOKENS, PFLANZENTYP_TOKENS, BEWAESSERUNGSVERFAHREN_TOKENS, TAB11_PARAMETER_TOKENS,
  tab3MapAsTable, tab789AsTable, tab11AsTable, tab11SalzAsTable, tab6AsTable, tab4AsTable, tab13AsTable, tab14AsTable,
} from '../regulation-tables-seed-m1200_3';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/m1200_3.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null; widget?: string | null };
const priorRow = (key: string) => (prior as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const col = (ws: string, sym: string, key: string) => registerCfg(ws, sym).columns.find((c) => c.key === key)!;
const cons = (k: string) => priorRow(k).consumer_worksheets ?? [];

describe('DWA-M-1200-3 field configs (Plan 3 Task 6)', () => {
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
    for (const s of SECTION_VISIBILITY) expect(parseCondition(s.visible_when), s.section_code).not.toBeNull();
  });

  it('counts: 24 entries — 22 create (6 registers, 7 lookup_fills, 9 derived outputs) + 2 UPDATE (bewaesserungstagebuch on -18 and -04); 4 field rules; 8 section rules on M12003-13', () => {
    expect(FIELD_CONFIGS).toHaveLength(24);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(22);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual(['M12003-18 bewaesserungstagebuch', 'M12003-04 bewaesserungstagebuch']);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['M12003-06 schlaege', 'M12003-08 wasseranalysen', 'M12003-10 speicher_1200_3', 'M12003-11 druckleitungen', 'M12003-18 bewaesserungstagebuch', 'M12003-04 bewaesserungstagebuch', 'M12003-22 desinfektionen', 'M12003-24 expositionspfade']);
    expect(byWidget('lookup_fill')).toEqual(['M12003-08 cl_limit', 'M12003-08 haerte_limit', 'M12003-08 lf_limit', 'M12003-12 farbcode_hex_tab4', 'M12003-22 chlorung_stoss_konz_tab14', 'M12003-22 h2o2_stoss_konz_tab14', 'M12003-22 verweilzeit_min_tab14']);
    expect(byWidget('derived')).toEqual(['M12003-06 flaeche_gesamt_ha', 'M12003-06 abstand_verletzungen', 'M12003-08 analysen_verletzungen', 'M12003-10 speichervolumen_ist_m3', 'M12003-10 bewaesserungshoehe_tab5', 'M12003-10 speichervolumen_calc', 'M12003-11 energie_kwh_a', 'M12003-11 leitungskosten_eur', 'M12003-18 wasserverbrauch_ist_m3']);
    expect(byWidget('select_one')).toEqual([]);
    expect(byWidget('attestation')).toEqual([]);
    const rules = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(rules).toEqual([
      `M12003-12 farbcode_hex_tab4 :: ${FILL_FARBE}`,
      `M12003-22 chlorung_stoss_konz_tab14 :: ${FILL_CHLORUNG}`, `M12003-22 h2o2_stoss_konz_tab14 :: ${FILL_H2O2}`, `M12003-22 verweilzeit_min_tab14 :: ${FILL_TAB14}`,
    ]);
    expect(SECTION_VISIBILITY.map((s) => `${s.worksheet} ${s.section_code}`)).toEqual(['M12003-13 13-A', 'M12003-13 13-C', 'M12003-13 13-D', 'M12003-13 13-F', 'M12003-13 13-J', 'M12003-13 13-K', 'M12003-13 13-L', 'M12003-13 13-M']);
    expect(SECTION_VISIBILITY.every((s) => s.visible_when === SPR)).toBe(true);
    expect(SPR).toBe("bewaesserungsverfahren IN {'beregnung_sprinkler', 'mikrosprueh'}");
    // never touched: the consumed producers of the brief's Step 4 (m1200_3-C-2 … -C-6) and the prod scalars the registers sit next to
    for (const sym of ['frostschutz_menge', 'rueckflussverhinderer_vorhanden', 'systemtrenner_vorhanden', 'freier_auslauf', 'chlorung_stoss_konz', 'h2o2_stoss_konz', 'temp_thermisch', 'dauer_thermisch_min', 'abschaltung_automatisch', 'karenzzeit_klasse_c', 'karenzzeit_klasse_d_weide', 'karenzzeit_klasse_d_ernte', 'karenzzeit_saatgut', 'karenzzeit_weide_laktierend', 'karenzzeit_wochen', 'weidegang_laktierend', 'kontrollfilter_um', 'speichertyp', 'flaeche_groesse', 'faktor', 'min_abstand', 'speichervolumen']) {
      expect(FIELD_CONFIGS.find((e) => e.symbol === sym), sym).toBeUndefined();
    }
  });

  it('G-A3 key-string equality: table keys and register enum columns carry the captured prod tokens; lookup_key / lookup_value columns bind seeded tables', () => {
    expect([...GUETEKLASSE_TOKENS]).toEqual(enumValues('M12003-01 gueteklasse'));
    expect([...SPEICHERTYP_TOKENS]).toEqual(enumValues('M12003-10 speichertyp'));
    expect([...LEITUNGSTYP_TOKENS]).toEqual(enumValues('M12003-11 leitungstyp'));
    expect([...DESINFEKTION_TOKENS]).toEqual(enumValues('M12003-22 desinfektion_methode'));
    expect([...PFLANZENTYP_TOKENS]).toEqual(enumValues('M12003-05 pflanzentyp'));
    expect([...BEWAESSERUNGSVERFAHREN_TOKENS]).toEqual(enumValues('M12003-07 bewaesserungsverfahren'));
    expect(enumValues('M12003-12 kennzeichnung_farbe')).toEqual(['pantone_purple_522c', 'pantone_purple_512c', 'vergleichbar_violett']);
    expect(tab3MapAsTable().rows.map((r) => r.keys.speichertyp)).toEqual([...SPEICHERTYP_TOKENS]);
    expect(tab6AsTable().rows.map((r) => r.keys.leitungstyp)).toEqual([...LEITUNGSTYP_TOKENS]);
    expect(tab4AsTable().rows.map((r) => r.keys.farbe)).toEqual(['pantone_purple_522c', 'pantone_purple_512c']);
    expect(new Set(tab13AsTable().rows.map((r) => r.keys.methode))).toEqual(new Set(DESINFEKTION_TOKENS.filter((t) => t !== 'thermisch')));
    expect(tab14AsTable().rows.map((r) => r.keys.methode)).toEqual(['chlorung', 'h2o2']);
    expect(tab11SalzAsTable().rows.map((r) => r.keys.pflanzentyp)).toEqual([...PFLANZENTYP_TOKENS]);
    // register enum columns
    expect(col('M12003-06', 'schlaege', 'technik').options).toEqual([...BEWAESSERUNGSVERFAHREN_TOKENS]);
    expect(col('M12003-06', 'schlaege', 'pflanzentyp').options).toEqual([...PFLANZENTYP_TOKENS]);
    expect(col('M12003-06', 'schlaege', 'sprinkler_gruppe').options).toEqual(tab789AsTable().rows.map((r) => r.keys.tabelle).filter((t, i, a) => a.indexOf(t) === i));
    expect(col('M12003-08', 'wasseranalysen', 'parameter').options).toEqual([...TAB11_PARAMETER_TOKENS]);
    expect(col('M12003-08', 'wasseranalysen', 'parameter').options).toEqual(tab11AsTable().rows.map((r) => r.keys.parameter));
    expect(col('M12003-10', 'speicher_1200_3', 'speichertyp').options).toEqual([...SPEICHERTYP_TOKENS]);
    expect(col('M12003-11', 'druckleitungen', 'leitungstyp').lookup).toEqual({ table_code: 'TAB6' });
    expect(col('M12003-11', 'druckleitungen', 'material').lookup).toEqual({ table_code: 'TAB6', key_column: 'leitungstyp', value: 'material_eur' });
    expect(col('M12003-11', 'druckleitungen', 'arbeitsdruck').options).toEqual(['2', '4', '6']);
    expect(col('M12003-22', 'desinfektionen', 'methode').options).toEqual([...DESINFEKTION_TOKENS]);
    expect(col('M12003-22', 'desinfektionen', 'moment').options).toEqual(['befuellung', 'speicherung', 'start', 'transport']);
    expect(col('M12003-24', 'expositionspfade', 'technik').options).toEqual([...BEWAESSERUNGSVERFAHREN_TOKENS]);
    expect(PFAD_DATALIST).toEqual([
      'direkte Aufnahme über Inhalation von Aerosolen', 'direkte Aufnahme über Ingestion von Tropfen', 'direkte Aufnahme über dermalen Kontakt',
      'indirekte Aufnahme über Ingestion von Bodenpartikeln und Pflanzenbestandteilen', 'indirekte Aufnahme über dermalen Kontakt mit bewässertem Boden oder Pflanzen',
      'indirekte Aufnahme: Nahrungsaufnahme von mit aufbereiteten Wasser bewässerten pflanzlichen Produkten',
    ]); // L1812–L1818
    expect(col('M12003-24', 'expositionspfade', 'pfad').datalist).toEqual(PFAD_DATALIST);
    // the sprinkler-only columns of `schlaege` hide in row scope on the discriminator
    for (const k of ['sprinkler_gruppe', 'wurfweite_m', 'spritzschutz', 'abstand_ist_m']) expect(col('M12003-06', 'schlaege', k).visible_when, k).toBe(SPR_ROW);
    expect(col('M12003-06', 'schlaege', 'steuerbarer_zugang').visible_when).toBe("sprinkler_gruppe == 't9'");
    expect(col('M12003-06', 'schlaege', 'technik').discriminator).toBe(true);
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns; created targets are number (Tab. 11 / Tab. 14) or text (Tab. 4); the key symbols are in scope on the fill worksheet', () => {
    const tableKeys: Record<string, string[]> = { TAB11_SALZ: tab11SalzAsTable().key_columns, TAB14: tab14AsTable().key_columns, TAB4: tab4AsTable().key_columns };
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      expect(e.lookup!.keys.map((k) => k.column), e.symbol).toEqual(tableKeys[e.lookup!.table_code]);
      expect(e.create!.data_type).toBe(e.lookup!.table_code === 'TAB4' ? 'text' : 'number');
      expect(e.lookup!.role).toBe(e.lookup!.table_code === 'TAB11_SALZ' ? 'limit' : 'value');
    }
    expect(cons('M12003-05 pflanzentyp')).toEqual(expect.arrayContaining(['M12003-08']));        // Tab. 11 fills on -08
    expect(priorRow('M12003-22 desinfektion_methode')).toBeDefined();                                  // Tab. 14 fills next to their driver
    expect(priorRow('M12003-12 kennzeichnung_farbe')).toBeDefined();                                   // Tab. 4 fill next to its driver
    expect(cons('M12003-01 gueteklasse')).toEqual(expect.arrayContaining(['M12003-06', 'M12003-08', 'M12003-13', 'M12003-15', 'M12003-22']));
    expect(cons('M12003-01 gueteklasse')).not.toContain('M12003-10');                                  // hence klasse_ok on -10 needs m1200_3-C-7
    expect(cons('M12003-07 bewaesserungsverfahren')).toContain('M12003-13');                           // the section driver
  });

  it('the Tagebuch upgrade keeps the Plan-1 column keys (stored rows survive), types the numbers, requires the Tab.-2 quantities and adds the Σ footer on -18 only', () => {
    expect(TAGEBUCH_COLUMNS.map((c) => c.key)).toEqual(['start', 'ende', 'empfehlung_mm', 'real_mm', 'flaeche_ha', 'wasser_m3', 'aufbereitet_m3', 'kommentar']); // = the Plan-1 keys
    expect(TAGEBUCH_COLUMNS.filter((c) => 'required' in c && c.required).map((c) => c.key)).toEqual(['start', 'real_mm', 'flaeche_ha', 'wasser_m3']);
    expect(registerCfg('M12003-18', 'bewaesserungstagebuch').footer).toEqual(['wasserverbrauch_ist_m3']);
    expect(registerCfg('M12003-04', 'bewaesserungstagebuch').footer).toBeUndefined();
    expect(col('M12003-18', 'bewaesserungstagebuch', 'start').type).toBe('text'); // the printed example carries a time of day (L554 "17.06.2023 06:00") — m1200_3-J-5
    expect(priorRow('M12003-18 bewaesserungstagebuch')).toMatchObject({ data_type: 'json', widget: null });
    expect(priorRow('M12003-04 bewaesserungstagebuch')).toMatchObject({ data_type: 'json', widget: null });
    expect(cons('M12003-18 bewaesserungstagebuch')).toEqual(expect.arrayContaining(['M12003-19', 'M12003-23', 'M12003-25']));
  });

  it('producer guard: every created rule passes producerChain (skipDirect); the section rules pass validateSection while 13-B would be refused; the brief\'s rules on existing fields would be REFUSED (m1200_3-C-2 … -C-6)', () => {
    for (const e of FIELD_CONFIGS) {
      if (e.create) {
        expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.worksheet} ${e.symbol} must not exist in prod`).toBeUndefined();
        expect(`${e.worksheet} ${e.create.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create.section_code}`).toBe(true);
      }
      if (e.visible_when) expect(producerChain(prior, e.worksheet, e.symbol, { skipDirect: !!e.create }), `${e.worksheet} ${e.symbol}`).toBeNull();
    }
    for (const s of SECTION_VISIBILITY) expect(`${s.worksheet} ${s.section_code}` in prior.sections!, s.section_code).toBe(true);
    // 13-B holds consumed producers — the section rule there is STAGED (m1200_3-C-1)
    expect(() => emitFieldConfigSql('m1200_3', [], [{ standard: 'DWA-M-1200-3', worksheet: 'M12003-13', section_code: '13-B', visible_when: SPR, verification_quote: 'x' }], prior)).toThrow(/abstand_zu_sensitiv|steuerbarer_zugang|abstand_oberflaechengewaesser_eingehalten/);
    // the ten captured helper equations (five, each twice)
    expect(Object.keys(prior.equations ?? {}).sort()).toEqual(['M12003-05 Gl-Helper-1', 'M12003-05 Gl-Helper-2', 'M12003-05 Gl-Helper-3', 'M12003-05 Gl-Helper-4', 'M12003-05 Gl-Helper-5', 'M12003-10 Gl-Helper-1', 'M12003-10 Gl-Helper-2', 'M12003-10 Gl-Helper-3', 'M12003-13 Gl-Helper-5', 'M12003-17 Gl-Helper-4']);
    expect(prior.equations!['M12003-13 Gl-Helper-5']).toMatchObject({ output_symbol: 'min_abstand', input_symbols: ['faktor', 'wurfweite'] });
    // the brief's Step-4 targets are consumed producers (direct rule) — pinned so the withheld list on the sign-off sheet stays true to the capture
    expect(producerChain(prior, 'M12003-17', 'frostschutz_menge')).toMatch(/consumed by M12003-19/);
    for (const sym of ['rueckflussverhinderer_vorhanden', 'systemtrenner_vorhanden', 'freier_auslauf']) expect(producerChain(prior, 'M12003-12', sym), sym).toMatch(/consumed by M12003-19/);
    for (const sym of ['chlorung_stoss_konz', 'h2o2_stoss_konz']) expect(producerChain(prior, 'M12003-22', sym), sym).toMatch(/consumed by M12003-19/);
    for (const sym of ['temp_thermisch', 'dauer_thermisch_min']) expect(producerChain(prior, 'M12003-20', sym), sym).toMatch(/consumed by M12003-19/);
    expect(producerChain(prior, 'M12003-11', 'abschaltung_automatisch')).toMatch(/consumed by M12003-19/);
    for (const sym of ['karenzzeit_klasse_c', 'karenzzeit_klasse_d_weide', 'karenzzeit_klasse_d_ernte', 'karenzzeit_saatgut', 'karenzzeit_weide_laktierend', 'karenzzeit_wochen', 'weidegang_laktierend']) expect(producerChain(prior, 'M12003-15', sym), sym).toMatch(/consumed by M12003-18/);
    expect(cons('M12003-01 anwendungsbereich')).not.toContain('M12003-17'); // the frostschutz driver is not even in scope on -17
    expect(priorRow('M12003-21 kontrollfilter_120')).toBeUndefined();      // the brief's A-only control-filter rule is refuted by L1712 / L1720 (m1200_3-J-4) — nothing created
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    const { up, down } = emitFieldConfigSql('m1200_3', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('m1200_3', '20260917100610');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(2);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(22);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(8);
    expect(up).not.toMatch(/enum_values = /); // D-1: no prod enum touched
    expect(down).toMatch(/UPDATE fields f SET widget = NULL, ui_config = NULL, lookup = NULL FROM .* AND f.symbol = 'bewaesserungstagebuch' AND w.code = 'M12003-18'/); // sign-off C-1 closure: no rule ⇒ visible_when neither written nor restored
    expect(up).not.toContain('visible_when = NULL');
  });
});
