/**
 * Plan 3 Task 7 — FLL-GAR-2023 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, the emitter accepts the module against the
 * captured prior (one UPDATE entry, 59 `create`), the withheld rules of the
 * brief are pinned as REFUSED by the transitive guard (fll_gar-C-2 … -C-4), the
 * master switch `abdichtungs_art` is pinned as NOT inherited (fll_gar-C-1), and
 * the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, PRODUCER_SECTIONS, STAHL_UNLEGIERT, EIS, PE_PELD, PE_PEHD, ROLLE_TOKENS, ZONE_TOKENS, PRUEFUNG_TOKENS, TAB18_MATERIALS, OUT_OF_SCOPE_TOKENS } from '../field-configs/fll_gar';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import {
  ABDICHTUNGS_ART_TOKENS, MATERIAL_WORKSHEET, FUEGEVERFAHREN_TOKENS, BAHN_MATERIAL_TOKENS, ABSCHLUSS_ANWENDUNGSFALL_TOKENS, BAUGRUND_KLASSE_TOKENS, SWK_TOKENS, MISCHGUTART_TOKENS, MINERAL_TYP_TOKENS,
  tab1AsTable, tab1AsphaltAsTable, tab4AsTable, tab7AsTable, tab8AsTable, tab12AsTable, tab13AsTable, tab16AsTable, tab22AsTable, tab22UeberlappungAsTable, tab25AsTable, tab26AsTable, tab27AsTable, fllGarSeedTables,
} from '../regulation-tables-seed-fll_gar';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/fll_gar.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null; widget?: string | null };
const priorRow = (key: string) => (prior as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const col = (ws: string, sym: string, key: string) => registerCfg(ws, sym).columns.find((c) => c.key === key)!;
const cons = (k: string) => priorRow(k).consumer_worksheets ?? [];
const tableKeyColumns = Object.fromEntries(fllGarSeedTables().map((t) => [t.table_code, t.key_columns]));

describe('FLL-GAR-2023 field configs (Plan 3 Task 7)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; created selects list options', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      if (e.widget === 'select_one') expect(Array.isArray(e.enum_values) && e.enum_values.length > 0, `${e.symbol} options`).toBe(true);
      if (e.widget === 'register') {
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
      }
    }
    for (const s of SECTION_VISIBILITY) expect(parseCondition(s.visible_when), `${s.worksheet} ${s.section_code}`).not.toBeNull();
  });

  it('counts: 60 entries — 59 create (9 registers, 7 select_one, 20 lookup_fill, 19 derived outputs, 3 scalar inputs, 1 attestation) + 1 UPDATE (verzinkung_dicke_um scalar; the nahtbreite_min_mm re-bind is STAGED, E-2); 4 field rules; 104 section rules', () => {
    expect(FIELD_CONFIGS).toHaveLength(60);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(59);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual(['FLL-GAR-19 verzinkung_dicke_um']);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['FLL-GAR-07 boeschungsabschnitte', 'FLL-GAR-09 abdichtungslagen', 'FLL-GAR-16 naehte', 'FLL-GAR-23 randabschnitte', 'FLL-GAR-24 durchdringungen', 'FLL-GAR-24 pflanzenarten', 'FLL-GAR-25 pruefungen', 'FLL-GAR-27 einzugsflaechen_not', 'FLL-GAR-28 wartungsmassnahmen']);
    expect(byWidget('select_one')).toEqual(['FLL-GAR-05 neurissbildung', 'FLL-GAR-10 mineral_typ', 'FLL-GAR-13 mischgutart', 'FLL-GAR-16 bahn_vorkonfektioniert', 'FLL-GAR-18 pe_werkstoff', 'FLL-GAR-22 baugrund_klasse_18196', 'FLL-GAR-22 swk_klasse']);
    expect(byWidget('lookup_fill')).toEqual([
      'FLL-GAR-07 boeschungsneigung_limit', 'FLL-GAR-10 schichtdicke_abdichtung_min', 'FLL-GAR-10 schichtdicke_auflast_min',
      'FLL-GAR-12 festigkeitsklasse_soll', 'FLL-GAR-12 expositionsklassen_soll', 'FLL-GAR-12 feuchtigkeitsklasse_soll', 'FLL-GAR-12 c_nom_min', 'FLL-GAR-12 bauteildicke_min',
      'FLL-GAR-13 asph_dicke_min', 'FLL-GAR-13 asph_dicke_max', 'FLL-GAR-13 asph_neigung_max_1m',
      'FLL-GAR-14 bentonit_flaecheneinheit_min', 'FLL-GAR-14 quellvermoegen_min', 'FLL-GAR-14 gtd_auflast_min_m',
      'FLL-GAR-16 naht_ueberlappung_min_mm', 'FLL-GAR-18 peld_nenndicke_min_mm', 'FLL-GAR-18 pehd_nenndicke_min_mm',
      'FLL-GAR-22 sl_schutzlage_unten_sand_min_cm', 'FLL-GAR-22 sl_schutzlage_unten_werkstoffe_tab26', 'FLL-GAR-22 sl_schutzlage_oben_flaechengewicht_min',
    ]);
    expect(byWidget('derived')).toHaveLength(19);
    expect(byWidget('scalar')).toEqual(['FLL-GAR-05 rissbreite_erwartet_mm', 'FLL-GAR-05 rissversatz_erwartet_mm', 'FLL-GAR-14 ungleichfoermigkeit_u', 'FLL-GAR-19 verzinkung_dicke_um']);
    expect(byWidget('attestation')).toEqual(['FLL-GAR-05 eisdruck_randschutz_vorgesehen']);
    const rules = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(rules).toEqual([
      `FLL-GAR-05 eisdruck_randschutz_vorgesehen :: ${EIS}`,
      `FLL-GAR-18 peld_nenndicke_min_mm :: ${PE_PELD}`, `FLL-GAR-18 pehd_nenndicke_min_mm :: ${PE_PEHD}`,
      `FLL-GAR-19 verzinkung_dicke_um :: ${STAHL_UNLEGIERT}`,
    ]);
    expect(SECTION_VISIBILITY).toHaveLength(12 * 9 - PRODUCER_SECTIONS.length);
    for (const tok of ABDICHTUNGS_ART_TOKENS) {
      const ws = MATERIAL_WORKSHEET[tok];
      const own = SECTION_VISIBILITY.filter((s) => s.worksheet === ws);
      expect(own.every((s) => s.visible_when === `abdichtungs_art == '${tok}'`), ws).toBe(true);
      expect(own.map((s) => s.section_code)).toEqual(['A', 'B', 'C', 'D', 'F', 'J', 'K', 'L', 'M'].filter((c) => !PRODUCER_SECTIONS.some(([w, cc]) => w === ws && cc === c)));
    }
    // never touched: the consumed producers of the brief's Step 4 (fll_gar-C-3 / -C-4), the prod inputs the fills sit next to, the Anhang-2 symbols
    for (const sym of ['wassereinwirkungsklasse', 'rissklasse', 'standortklasse', 'anzahl_lagen', 'wurzel_rhizomfestigkeit_required', 'abdichtungs_art', 'nahtbreite_min_mm', 'standort_tab18', 's_klasse_code', 'gewaesser_in_scope', 'schichtdicke_abdichtung_cm', 'schichtdicke_auflast_cm', 'bauteildicke_cm', 'naht_ueberlappung_kunststoff_mm', 'bahnendicke_mm', 'groesstkorn_auflast_mm', 'A', 'C', 'Q_NOT', 'g_prime', 'freibord_zu_gelaende_cm', 'freibord_zu_bauwerk_cm', 'bep_durchdringungen_anzahl', 'baugrund_typ']) {
      expect(FIELD_CONFIGS.find((e) => e.symbol === sym), sym).toBeUndefined();
    }
  });

  it('G-A3 key-string equality: table keys and register enum columns carry the captured prod tokens; lookup_key / lookup_value columns bind seeded tables', () => {
    expect([...ABDICHTUNGS_ART_TOKENS]).toEqual(enumValues('FLL-GAR-09 abdichtungs_art'));
    expect([...TAB18_MATERIALS].every((t) => (ABDICHTUNGS_ART_TOKENS as readonly string[]).includes(t))).toBe(true);
    expect([...OUT_OF_SCOPE_TOKENS].every((t) => enumValues('FLL-GAR-02 gewaesser_type').includes(t))).toBe(true);
    expect(enumValues('FLL-GAR-19 stahl_typ')).toContain('unlegiert');
    expect(priorRow('FLL-GAR-05 eisbildung_moeglich').data_type).toBe('boolean');
    expect(col('FLL-GAR-09', 'abdichtungslagen', 'material').options).toEqual([...ABDICHTUNGS_ART_TOKENS]);
    expect(col('FLL-GAR-09', 'abdichtungslagen', 'rolle').options).toEqual([...ROLLE_TOKENS]);
    expect(col('FLL-GAR-09', 'abdichtungslagen', 'rolle').discriminator).toBe(true);
    expect(col('FLL-GAR-09', 'abdichtungslagen', 'baugrund').lookup).toEqual({ table_code: 'TAB26', group_by: 'group_label' });
    expect(col('FLL-GAR-09', 'abdichtungslagen', 'sand_min_cm').lookup).toEqual({ table_code: 'TAB26', key_column: 'baugrund', value: 'sand_min_cm' });
    expect(col('FLL-GAR-09', 'abdichtungslagen', 'swk').lookup).toEqual({ table_code: 'TAB27' });
    expect(col('FLL-GAR-09', 'abdichtungslagen', 'fg_min').lookup).toEqual({ table_code: 'TAB27', key_column: 'swk', value: 'flaechengewicht_min_g_m2' });
    for (const k of ['material', 'baugrund', 'sand_min_cm', 'werkstoffe_tab26', 'swk', 'fg_min', 'flaechengewicht_g_m2']) expect(col('FLL-GAR-09', 'abdichtungslagen', k).visible_when, k).toBeDefined();
    expect(col('FLL-GAR-07', 'boeschungsabschnitte', 'zone').options).toEqual([...ZONE_TOKENS]);
    expect(col('FLL-GAR-16', 'naehte', 'fuegeverfahren').options).toEqual([...FUEGEVERFAHREN_TOKENS]);
    expect(col('FLL-GAR-16', 'naehte', 'material').options).toEqual([...BAHN_MATERIAL_TOKENS]);
    expect(col('FLL-GAR-23', 'randabschnitte', 'anwendungsfall').options).toEqual([...ABSCHLUSS_ANWENDUNGSFALL_TOKENS]);
    expect(col('FLL-GAR-25', 'pruefungen', 'typ').options).toEqual([...PRUEFUNG_TOKENS]);
    // created selects = the seeded key vocabularies
    const opts = (ws: string, sym: string) => (byKey(ws, sym).enum_values as Array<{ value: string }>).map((e) => e.value);
    expect(opts('FLL-GAR-10', 'mineral_typ')).toEqual([...MINERAL_TYP_TOKENS]);
    expect(opts('FLL-GAR-10', 'mineral_typ')).toEqual(tab4AsTable().rows.map((r) => r.row_key));
    expect(opts('FLL-GAR-13', 'mischgutart')).toEqual([...MISCHGUTART_TOKENS]);
    expect(opts('FLL-GAR-13', 'mischgutart')).toEqual(tab12AsTable().rows.map((r) => r.row_key));
    expect(opts('FLL-GAR-13', 'mischgutart')).toEqual(tab1AsphaltAsTable().rows.map((r) => r.row_key));
    expect(opts('FLL-GAR-22', 'baugrund_klasse_18196')).toEqual(BAUGRUND_KLASSE_TOKENS);
    expect(opts('FLL-GAR-22', 'baugrund_klasse_18196')).toEqual(tab26AsTable().rows.map((r) => r.row_key));
    expect(opts('FLL-GAR-22', 'swk_klasse')).toEqual([...SWK_TOKENS]);
    expect(opts('FLL-GAR-22', 'swk_klasse')).toEqual(tab27AsTable().rows.map((r) => r.row_key));
    expect(opts('FLL-GAR-05', 'neurissbildung')).toEqual(['ausgeschlossen', 'moeglich']);
    expect(opts('FLL-GAR-18', 'pe_werkstoff')).toEqual(['PELD', 'PEHD']);
    expect(opts('FLL-GAR-16', 'bahn_vorkonfektioniert')).toEqual(['ja', 'nein']);
    // lifted labels
    expect((byKey('FLL-GAR-05', 'neurissbildung').enum_values as Array<{ label_de: string }>)[0].label_de).toBe('keine Rissbreitenveränderung bzw. Neurissbildung'); // L3677
    expect((byKey('FLL-GAR-18', 'pe_werkstoff').enum_values as Array<{ label_de: string }>).map((e) => e.label_de)).toEqual(['Polyethylen mit geringer Dichte (PELD)', 'Polyethylen mit hoher Dichte (PEHD)']); // L4455–L4456
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns in order; the driving symbols exist on the fill worksheet (prod or created); data types number|text; the Tab.-22 re-bind of the consumed Mindestnahtbreite is NOT emitted (E-2)', () => {
    const created = new Set(FIELD_CONFIGS.filter((e) => e.create).map((e) => `${e.worksheet} ${e.symbol}`));
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      expect(e.lookup!.keys.map((k) => k.column), e.symbol).toEqual(tableKeyColumns[e.lookup!.table_code]);
      const dt = e.create?.data_type ?? priorRow(`${e.worksheet} ${e.symbol}`).data_type;
      expect(['number', 'text']).toContain(dt);
      for (const k of e.lookup!.keys) {
        const onWorksheet = priorRow(`${e.worksheet} ${k.from_symbol}`) != null || created.has(`${e.worksheet} ${k.from_symbol}`);
        if (e.symbol === 'boeschungsneigung_limit') expect(onWorksheet, 'abdichtungs_art is NOT on -07 (fll_gar-C-1)').toBe(false);
        else expect(onWorksheet, `${e.symbol} key ${k.from_symbol}`).toBe(true);
      }
    }
    // the two boolean-keyed tables use String(boolean) tokens
    expect(tab16AsTable().rows.map((r) => r.keys.beschichtung)).toEqual(['false', 'false', 'true', 'true']);
    expect(tab22UeberlappungAsTable().rows.map((r) => r.keys.polymerbitumen)).toEqual(['false', 'true']);
    expect(priorRow('FLL-GAR-14 gtd_polyolefin_beschichtung').data_type).toBe('boolean');
    expect(priorRow('FLL-GAR-16 polymerbitumen_beschichtung').data_type).toBe('boolean');
    // prod-token-keyed tables ↔ the fills' key symbols
    expect(tab7AsTable().rows.map((r) => r.keys.anwendungsfall)).toEqual(enumValues('FLL-GAR-12 anwendungsfall_concrete'));
    expect(new Set(tab8AsTable().rows.map((r) => r.keys.bauteil))).toEqual(new Set(enumValues('FLL-GAR-12 bauteil_type')));
    expect(new Set(tab8AsTable().rows.map((r) => r.keys.ausfuehrung))).toEqual(new Set(enumValues('FLL-GAR-12 beton_ausfuehrungsart')));
    expect(tab13AsTable().rows.map((r) => r.keys.bentonit_typ)).toEqual(enumValues('FLL-GAR-14 bentonit_type'));
    expect(tab25AsTable().rows.map((r) => r.keys.beanspruchung)).toEqual(enumValues('FLL-GAR-18 pe_beanspruchung_klasse'));
    expect(new Set(tab22AsTable().rows.map((r) => r.keys.material))).toEqual(new Set(enumValues('FLL-GAR-16 bahn_material_naht')));
    expect(tab1AsTable().rows.every((r) => (ABDICHTUNGS_ART_TOKENS as readonly string[]).includes(r.keys.abdichtungs_art))).toBe(true);
    // the consumed "Mindestnahtbreite" stays untouched — its re-bind is a ruling (fll_gar-E-2, STAGED)
    expect(priorRow('FLL-GAR-16 nahtbreite_min_mm')).toMatchObject({ data_type: 'number', widget: null });
    expect(cons('FLL-GAR-16 nahtbreite_min_mm')).toEqual(['FLL-GAR-15', 'FLL-GAR-18']);
    expect(FIELD_CONFIGS.some((e) => e.symbol === 'nahtbreite_min_mm')).toBe(false);
  });

  it('the master switch is NOT inherited (fll_gar-C-1): abdichtungs_art consumer_worksheets is the unresolvable range string; rules keyed on it are inert until the consumer edit', () => {
    expect(cons('FLL-GAR-09 abdichtungs_art')).toEqual(['FLL-GAR-10..21']);
    for (const ws of Object.values(MATERIAL_WORKSHEET)) expect(cons('FLL-GAR-09 abdichtungs_art')).not.toContain(ws);
    expect(cons('FLL-GAR-09 abdichtungs_art')).not.toContain('FLL-GAR-07');
    expect(cons('FLL-GAR-01 planer')).toEqual(['All']); // the same class of unresolvable token (observation)
  });

  it('producer guard: every created rule passes producerChain (skipDirect); the 104 section rules pass; the four producer sections and the brief\'s rules on existing fields would be REFUSED (fll_gar-C-2 … -C-4)', () => {
    for (const e of FIELD_CONFIGS) {
      if (e.create) {
        expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.worksheet} ${e.symbol} must not exist in prod`).toBeUndefined();
        expect(`${e.worksheet} ${e.create.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create.section_code}`).toBe(true);
      }
      if (e.visible_when) expect(producerChain(prior, e.worksheet, e.symbol, { skipDirect: !!e.create }), `${e.worksheet} ${e.symbol}`).toBeNull();
    }
    for (const s of SECTION_VISIBILITY) expect(`${s.worksheet} ${s.section_code}` in prior.sections!, `${s.worksheet} ${s.section_code}`).toBe(true);
    // the four withheld sections hold consumed producers (fll_gar-C-2)
    const refusal = (worksheet: string, section_code: string) => {
      const tok = (Object.keys(MATERIAL_WORKSHEET) as Array<keyof typeof MATERIAL_WORKSHEET>).find((t) => MATERIAL_WORKSHEET[t] === worksheet)!;
      return () => emitFieldConfigSql('fll_gar', [], [{ standard: 'FLL-GAR-2023', worksheet, section_code, visible_when: `abdichtungs_art == '${tok}'`, verification_quote: 'x' }], prior);
    };
    expect(refusal('FLL-GAR-10', 'C')).toThrow(/kf_abdichtung|kornanteil_unter_2micron|schichtdicke_abdichtung_cm|schichtdicke_auflast_cm|verdichtungsgrad_Dpr/);
    // FLL-GAR-12 C's only prod "producer" is bauteildicke_cm, and its consumer_worksheets lists ONLY FLL-GAR-12 itself (a prod data oddity, fix round 2) —
    // since Task 12b the guard strips the owner worksheet before deciding, so this is no longer a producer and the section is NOT refused (fll_gar-C-2 candidate
    // for re-emit on FLL-GAR-12 C specifically; the other three withheld sections are untouched by this ruling and stay refused).
    expect(producerChain(prior, 'FLL-GAR-12', 'bauteildicke_cm')).toBeNull();
    expect(refusal('FLL-GAR-12', 'C')).not.toThrow();
    expect(refusal('FLL-GAR-14', 'C')).toThrow(/gtd_auflast_funktion \(consumed by FLL-GAR-22\)/);
    expect(refusal('FLL-GAR-16', 'C')).toThrow(/bahnendicke_mm|fuegeverfahren|nahtbreite_min_mm/);
    // the brief's Step-4 rules on existing fields (fll_gar-C-3 / -C-4)
    for (const sym of ['wassereinwirkungsklasse', 'rissklasse', 'standortklasse']) expect(producerChain(prior, 'FLL-GAR-05', sym), sym).toMatch(/consumed by FLL-GAR-1[2567]/);
    expect(cons('FLL-GAR-05 rissklasse')).toEqual(['FLL-GAR-12', 'FLL-GAR-15', 'FLL-GAR-16']);
    expect(producerChain(prior, 'FLL-GAR-09', 'anzahl_lagen')).toMatch(/consumed by FLL-GAR-15/);
    expect(producerChain(prior, 'FLL-GAR-09', 'wurzel_rhizomfestigkeit_required')).toMatch(/consumed by FLL-GAR-10\.\.21, FLL-GAR-24/);
    // the four captured equations (Anhang 2 / Anhang 1) and their consumer-free outputs
    expect(Object.keys(prior.equations ?? {}).sort()).toEqual(['FLL-GAR-22 2a', 'FLL-GAR-22 2b', 'FLL-GAR-22 2c', 'FLL-GAR-27 1']);
    expect(prior.equations!['FLL-GAR-27 1']).toMatchObject({ output_symbol: 'Q_NOT', input_symbols: ['r_5_100', 'r_5_5', 'C', 'A'] });
    expect(producerChain(prior, 'FLL-GAR-27', 'A')).toBeNull();
    expect(producerChain(prior, 'FLL-GAR-19', 'verzinkung_dicke_um')).toBeNull();
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    const { up, down } = emitFieldConfigSql('fll_gar', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('fll_gar', '20260917100710');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(1);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(59);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(104);
    expect(up).not.toMatch(/SET [^\n]*enum_values = /); // D-1: no prod enum touched (created rows carry their own lists)
    expect(down).not.toMatch(/nahtbreite_min_mm/);
    expect(down).toMatch(/AND f.symbol = 'verzinkung_dicke_um' AND w.code = 'FLL-GAR-19'/);
  });
});
