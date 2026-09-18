/**
 * Plan 3 Task 16 — DWA-M-1200-2 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, the emitter accepts the module against the
 * captured prior in the DEFAULT (refuse) mode, every UPDATE lands on a
 * consumer-free field no same-worksheet gate reads (or IF-guarded by the same
 * driver), the brief's withheld rules are pinned as REFUSED (m1200_2-C-2 … -C-4),
 * and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, ORGANISMEN, ORG_OUTPUTS, ZIEL_EXPR, LEISTUNGSZIELE, KLASSEN_A_BIS_C, KLASSE_A, KLASSEN_B1_C1, AEROSOL, WEIDE, UMFAENGLICH_MC, UMFAENGLICH_BASIS, MEMBRAN_MF_UF_MBR, MEMBRAN_ALLE, LANGSAMSAND, SCHNELLSAND, UV, OZON, CHLOR, CHLOR_CLO2, CLO2, PFA, CHEMISCH, SEKUNDAER } from '../field-configs/m1200_2';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { KLASSE_TOKENS, ORGANISMUS_TOKENS, STUFE_TOKENS, TAB6_TOKENS, KOSTEN_TOKENS, PROBE_PARAMETER_TOKENS, tab3AsTable, s333AsTable, anhangC1AsTable, tabB2AsTable, tab6AsTable, s82KostenAsTable, tabE1LeistungAsTable } from '../regulation-tables-seed-m1200_2';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders, quotedLiteralCollisionWarnings } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/m1200_2.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const cons = (k: string) => priorRow(k).consumer_worksheets ?? [];
const creates = FIELD_CONFIGS.filter((e) => e.create);
const updates = FIELD_CONFIGS.filter((e) => !e.create);

describe('DWA-M-1200-2 field configs (Plan 3 Task 16)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      if (e.widget === 'register') {
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 103 entries = 82 create (5 registers, 14 lookup_fills, 63 derived outputs) + 21 UPDATE; 5 organisms × 9 outputs on -05', () => {
    expect(FIELD_CONFIGS).toHaveLength(103);
    expect(creates).toHaveLength(82);
    expect(updates).toHaveLength(21);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['M12002-05 validierungsproben', 'M12002-06 routineproben_1200_2', 'M12002-12 verfahrenskette_stufen', 'M12002-13 betriebsparameter', 'M12002-15 kostenpositionen']);
    expect(byWidget('lookup_fill')).toEqual([
      'M12002-02 zielvorgabe_aufbereitung_tab3', 'M12002-02 e_coli_limit_1200_2', 'M12002-02 enterokokken_limit_1200_2', 'M12002-02 bsb5_limit_1200_2', 'M12002-02 bsb5_anforderung_tab3', 'M12002-02 afs_limit_1200_2', 'M12002-02 truebung_limit_1200_2', 'M12002-02 legionella_limit_1200_2', 'M12002-02 nematoden_limit_1200_2',
      'M12002-04 leistungsziel_ecoli_tab3', 'M12002-04 leistungsziel_somat_coliphagen_tab3', 'M12002-04 leistungsziel_fspez_coliphagen_tab3', 'M12002-04 leistungsziel_clostridium_tab3', 'M12002-04 leistungsziel_sulfatreduzierer_tab3',
    ]);
    expect(byWidget('derived')).toHaveLength(63);
    expect(byWidget('derived').filter((k) => k.startsWith('M12002-05 '))).toHaveLength(50);
    for (const o of ORGANISMEN) for (const d of ORG_OUTPUTS) expect(byKey('M12002-05', d.sym(o.stem))?.create?.section_code, d.sym(o.stem)).toBe('M12002-05-D');
    expect(byWidget('select_many')).toEqual([]);
    // the UPDATE set (rules on existing fields) — every one consumer-free in the capture, no same-worksheet gate reads it unguarded
    expect(updates.map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`)).toEqual([
      `M12002-05 confidence_alpha :: ${UMFAENGLICH_MC}`, `M12002-05 k_faktor_normal :: ${UMFAENGLICH_BASIS}`, `M12002-05 perzentil_10_log10 :: ${KLASSE_A}`, `M12002-05 perzentil_50_log10 :: ${KLASSEN_B1_C1}`,
      `M12002-09 mbr_porendurchmesser :: ${MEMBRAN_MF_UF_MBR}`, `M12002-09 filtergeschw_langsam :: ${LANGSAMSAND}`, `M12002-09 filtergeschw_schnellsand :: ${SCHNELLSAND}`,
      `M12002-11 uv_dosis :: ${UV}`, `M12002-11 uv_dosis_referenz :: ${UV}`, `M12002-11 ozon_dosis_spez :: ${OZON}`, `M12002-11 reaktor_hydraulik_charakterisiert :: ${CHEMISCH}`, `M12002-11 ct_wert :: ${CHLOR_CLO2}`, `M12002-11 clo2_restkonz :: ${CLO2}`, `M12002-11 perameisensaeure_konz :: ${PFA}`,
      `M12002-13 messhauefigkeit_integritaet :: ${MEMBRAN_MF_UF_MBR}`, `M12002-13 transmembrandruck :: ${MEMBRAN_ALLE}`, `M12002-13 permeatfluss :: ${MEMBRAN_ALLE}`, `M12002-13 uv_transmission :: ${UV}`, `M12002-13 delta_sak254 :: ${OZON}`, `M12002-13 restchlor_freies :: ${CHLOR}`,
      `M12002-14 sekundaerdesinfektion_verfahren :: ${SEKUNDAER}`,
    ]);
    for (const e of updates) {
      expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.worksheet} ${e.symbol} exists in prod`).toBeDefined();
      expect(cons(`${e.worksheet} ${e.symbol}`), `${e.symbol} consumers`).toEqual([]);
      expect(gateReaders(prior, e.worksheet, e.symbol, e.visible_when!), `${e.symbol} gate readers`).toEqual([]);
      expect(producerChain(prior, e.worksheet, e.symbol), `${e.symbol} producer chain`).toBeNull();
      expect(e.enum_values === undefined || e.enum_values === 'keep_prod', `${e.symbol} D-1`).toBe(true);
    }
    // the yes/no drivers are prod BOOLEANS, the class / method drivers prod enums
    expect(priorRow('M12002-02 aerosol_risk').data_type).toBe('boolean');
    expect(priorRow('M12002-02 weide_oder_futter').data_type).toBe('boolean');
    expect(priorRow('M12002-14 sekundaerdesinfektion_erforderlich').data_type).toBe('boolean');
    expect(AEROSOL).toBe('aerosol_risk == true');
    expect(WEIDE).toBe('weide_oder_futter == true');
  });

  it('G-A3 key-string equality: table keys equal the captured prod enum value strings; register enum / lookup columns bind seeded tables; created fills are number / text on TAB3', () => {
    expect([...KLASSE_TOKENS]).toEqual(enumValues('M12002-02 wassergueteklasse'));
    for (const t of [tab3AsTable()]) expect(t.rows.map((r) => r.keys.klasse), t.table_code).toEqual([...KLASSE_TOKENS]);
    for (const t of [s333AsTable(), anhangC1AsTable()]) for (const r of t.rows) expect(KLASSE_TOKENS).toContain(r.keys.klasse);
    expect(enumValues('M12002-05 validierungsmonitoring_typ')).toEqual(['vereinfacht', 'umfaenglich', 'umfaenglich_basis', 'umfaenglich_montecarlo']);
    expect(enumValues('M12002-09 filtrationsverfahren')).toEqual(expect.arrayContaining(['mf', 'uf', 'nf', 'uo', 'mbr', 'langsamsand', 'raumfilter', 'schnellsand']));
    expect(enumValues('M12002-11 desinfektionsverfahren')).toEqual(['uv', 'ozon', 'clo2', 'chlor', 'pes', 'pfa', 'h2o2', 'membran']);
    expect(enumValues('M12002-13 messhauefigkeit')).toEqual(['online', 'taeglich', 'woechentlich', 'monatlich']);
    expect(enumValues('M12002-13 messhauefigkeit_integritaet')).toEqual(['online', 'taeglich', 'woechentlich', 'monatlich']);
    const v = registerCfg('M12002-05', 'validierungsproben').columns;
    expect(v.find((c) => c.key === 'organismus')!.options).toEqual([...ORGANISMUS_TOKENS]);
    expect(v.find((c) => c.key === 'ziel')!.expr).toBe(ZIEL_EXPR);
    expect(tabE1LeistungAsTable().rows.map((r) => r.keys.organismus)).toEqual(ORGANISMUS_TOKENS.slice(0, 4));
    const k = registerCfg('M12002-12', 'verfahrenskette_stufen').columns;
    expect(k.find((c) => c.key === 'stufe')!.lookup).toEqual({ table_code: 'TABB2' });
    expect(k.find((c) => c.key === 'credit_viren')!.lookup).toEqual({ table_code: 'TABB2', key_column: 'stufe', value: 'viren_erreichbar' });
    expect(tabB2AsTable().rows.map((r) => r.keys.stufe)).toEqual([...STUFE_TOKENS]);
    expect(registerCfg('M12002-12', 'verfahrenskette_stufen').override).toEqual({ flag_key: 'credit_abweichend', applies_to: ['credit_viren', 'credit_protozoen', 'credit_bakterien'], policy: 'anhaltswert' });
    const b = registerCfg('M12002-13', 'betriebsparameter').columns;
    expect(b.find((c) => c.key === 'stufe')!.lookup).toEqual({ table_code: 'TAB6' });
    expect(b.find((c) => c.key === 'messhaeufigkeit')!.options).toEqual(enumValues('M12002-13 messhauefigkeit'));
    expect(tab6AsTable().rows.map((r) => r.keys.stufe)).toEqual([...TAB6_TOKENS]);
    expect(registerCfg('M12002-15', 'kostenpositionen').columns.find((c) => c.key === 'stufe')!.lookup).toEqual({ table_code: 'S8_2_KOSTEN' });
    expect(s82KostenAsTable().rows.map((r) => r.keys.stufe)).toEqual([...KOSTEN_TOKENS]);
    expect(registerCfg('M12002-06', 'routineproben_1200_2').columns.find((c) => c.key === 'parameter')!.options).toEqual([...PROBE_PARAMETER_TOKENS]);
    // lookup_fill bindings: keys[].column = TAB3 key column, driver = wassergueteklasse, target typed number (limits) / text (printed cells)
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      expect(e.lookup!.table_code).toBe('TAB3');
      expect(e.lookup!.keys).toEqual([{ column: 'klasse', from_symbol: 'wassergueteklasse' }]);
      expect(['number', 'text']).toContain(e.create!.data_type);
      expect(e.lookup!.role).toBe(e.create!.data_type === 'number' ? 'limit' : 'value');
    }
    expect(cons('M12002-02 wassergueteklasse')).toEqual(['M12002-04', 'M12002-05', 'M12002-11', 'M12002-12']); // NOT -06 / -13 → m1200_2-C-1
    expect(byKey('M12002-04', 'leistungsziel_ecoli_tab3').visible_when).toBe(LEISTUNGSZIELE);
    expect(byKey('M12002-02', 'enterokokken_limit_1200_2').visible_when).toBe(KLASSEN_A_BIS_C);
    expect(byKey('M12002-02', 'legionella_limit_1200_2').visible_when).toBe(AEROSOL);
    expect(byKey('M12002-02', 'nematoden_limit_1200_2').visible_when).toBe(WEIDE);
    expect(byKey('M12002-05', 'validierungsproben').visible_when).toBe(LEISTUNGSZIELE);
  });

  it('guards: every create passes producerChain / gateReaders; the withheld rules are REFUSED (section -04 B / -05 B / -05 D producers, flux_membran, legionella / intest_nematoden — m1200_2-C-2 … -C-4)', () => {
    for (const e of creates) {
      expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.worksheet} ${e.symbol} must not exist in prod`).toBeUndefined();
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
      if (e.visible_when) {
        expect(producerChain(prior, e.worksheet, e.symbol, { skipDirect: true }), `${e.worksheet} ${e.symbol}`).toBeNull();
        expect(gateReaders(prior, e.worksheet, e.symbol, e.visible_when), `${e.worksheet} ${e.symbol}`).toEqual([]);
      }
    }
    expect(Object.keys(prior.equations ?? {})).toEqual(['M12002-05 Gl. 1', 'M12002-05 Gl. C.2-1', 'M12002-05 Gl. C.2-2', 'M12002-05 Gl. C.2-3']);
    expect(Object.keys(prior.gates ?? {})).toHaveLength(15);
    // C-2: the brief's section rules — -04 B holds the consumed leistungsziel_log10; -05 B holds the Gl.-1 inputs (chain to the consumed log10_reduktion) and the REQ-05 drivers; -05 D the consumed output
    expect(cons('M12002-04 leistungsziel_log10')).toEqual(['M12002-05', 'M12002-12']);
    expect(producerChain(prior, 'M12002-05', 'c_zulauf')).toBe('c_zulauf → Gl. 1 log10_reduktion (consumed by M12002-04, M12002-12)');
    expect(producerChain(prior, 'M12002-05', 'log10_reduktion')).toBe('log10_reduktion (consumed by M12002-04, M12002-12)');
    expect(gateReaders(prior, 'M12002-05', 'validierungsmonitoring_typ', LEISTUNGSZIELE).map((g) => g.code)).toEqual(['REQ-05']);
    expect(gateReaders(prior, 'M12002-05', 'probenanzahl_zulauf', LEISTUNGSZIELE).map((g) => g.code)).toEqual(['REQ-05']);
    expect(() => emitFieldConfigSql('m1200_2', FIELD_CONFIGS, [{ standard: 'DWA-M-1200-2', worksheet: 'M12002-05', section_code: 'M12002-05-B', visible_when: LEISTUNGSZIELE, verification_quote: 'x' }], prior)).toThrow(/M12002-05-B/);
    expect(() => emitFieldConfigSql('m1200_2', FIELD_CONFIGS, [{ standard: 'DWA-M-1200-2', worksheet: 'M12002-04', section_code: 'M12002-04-B', visible_when: LEISTUNGSZIELE, verification_quote: 'x' }], prior)).toThrow(/leistungsziel_log10/);
    // C-3 / C-4: consumed producers on -09 / -06
    expect(cons('M12002-09 flux_membran')).toEqual(['M12002-13']);
    expect(producerChain(prior, 'M12002-09', 'flux_membran')).toBe('flux_membran (consumed by M12002-13)');
    expect(cons('M12002-06 legionella')).toEqual(['M12002-02']);
    expect(cons('M12002-06 intest_nematoden')).toEqual(['M12002-02']);
    expect(cons('M12002-02 aerosol_risk')).toEqual(['M12002-13']); // the driver never reaches -06 either
    // the REQ-12 IF guard admits the one -14 rule (same driver / op / literal)
    expect(prior.gates!['M12002-14 REQ-12'].condition).toBe('IF sekundaerdesinfektion_erforderlich == true THEN sekundaerdesinfektion_verfahren IS NOT EMPTY');
    expect(gateReaders(prior, 'M12002-14', 'sekundaerdesinfektion_verfahren', SEKUNDAER)).toEqual([]);
    expect(gateReaders(prior, 'M12002-14', 'sekundaerdesinfektion_verfahren', "sekundaerdesinfektion_erforderlich == false").map((g) => g.code)).toEqual(['REQ-12']);
    // gate facts behind the G-blocks (read in-session; the STAGED file cites them)
    expect(prior.gates!['M12002-03 REQ-06'].symbols).toEqual(['leistungsziel_log10', 'perzentil_10_log10', 'perzentil_50_log10', 'wassergueteklasse']); // on -03, where none of them resolves (m1200_2-G-2)
    expect(prior.gates!['M12002-08 REQ-09'].condition).toBe("IF wassergueteklasse IN {'A','B-1','B-2','C-1','C-2'} THEN truebung_ablauf <= 2"); // on the EMPTY -08 (m1200_2-G-3)
    expect(cons('M12002-06 truebung_ablauf')).not.toContain('M12002-08');
    expect(prior.gates!['M12002-13 REQ-11'].condition).toBe('messhauefigkeit == online AND alarm_verzoegerung_min <= 30');
    expect(prior.gates!['M12002-13 REQ-03'].condition).toBe('perzentil_konformitaet >= 90');
    expect(prior.gates!['M12002-05 REQ-05'].condition).toBe("validierungsmonitoring_typ == 'vereinfacht' AND probenanzahl_zulauf >= 16");
    expect(prior.gates!['M12002-05 REQ-04'].condition).toBe('log10_reduktion >= leistungsziel_log10');
    // the quoted-literal lint: three warnings on -06 (parameter tokens 'e_coli' / 'legionella' equal prod symbols of -06) — harmless under the Task 13b rule, recorded as m1200_2-X-4
    const lint = quotedLiteralCollisionWarnings(FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(lint).toHaveLength(3);
    for (const w of lint) expect(w).toMatch(/M12002-06 routineproben_1200_2\.(limit|ok): expr compares against the quoted literal '(e_coli|legionella)'/);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior in the default (refuse) mode (freshness pin)', () => {
    const { up, down, warnings } = emitFieldConfigSql('m1200_2', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toHaveLength(3);
    const files = fieldConfigFilesFor('m1200_2', '20260917101610');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(21);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(82);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/enum_values = /); // D-1: no prod enum touched
  });
});
