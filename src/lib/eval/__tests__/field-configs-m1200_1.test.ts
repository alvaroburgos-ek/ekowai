/**
 * Plan 3 Task 5 — DWA-M-1200-1 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, the emitter accepts the module against the
 * captured prior, no rule lands on a consumed producer (every entry is a
 * `create`; the brief's rules on existing fields are pinned as REFUSED by the
 * transitive guard — m1200_1-C-3), and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, AEROSOL, WEIDE, LEISTUNGSZIELE, GEFAHR_TOKENS, PROBE_PARAMETER_TOKENS } from '../field-configs/m1200_1';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { GUETEKLASSE_TOKENS, FILTRATION_TOKENS, WAHRSCHEINLICHKEIT_TOKENS, SCHADENSAUSMASS_TOKENS, SCHUTZGUT_CODES, tab8AsTable, tab8NoteFAsTable, tab7ClassAsTable, tab23AsTable, tab27AsTable, tab18AsTable } from '../regulation-tables-seed-m1200_1';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/m1200_1.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const cons = (k: string) => priorRow(k).consumer_worksheets ?? [];

describe('DWA-M-1200-1 field configs (Plan 3 Task 5)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      expect(e.create, `${e.symbol} is a create`).toBeDefined();
      expect(e.create!.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
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

  it('counts: 40 create entries — 6 registers, 24 lookup_fills, 8 derived outputs, 2 attestations; 9 field rules; 0 section rules', () => {
    expect(FIELD_CONFIGS).toHaveLength(40);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(40);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['M12001-08 kulturen_tab7', 'M12001-07 risiko_zeilen', 'M12001-14 stoerfaelle', 'M12001-16 flaechenverzeichnis', 'M12001-09 routineproben', 'M12001-13 messstellen']);
    expect(byWidget('lookup_fill')).toEqual([
      'M12001-09 e_coli_limit', 'M12001-09 enterokokken_limit', 'M12001-09 bsb5_limit', 'M12001-09 afs_limit', 'M12001-09 truebung_limit', 'M12001-09 legionella_limit', 'M12001-09 nematoden_limit',
      'M12001-09 log10_e_coli_ziel', 'M12001-09 log10_somatische_coliphagen_ziel', 'M12001-09 log10_f_coliphagen_ziel', 'M12001-09 log10_clostridium_ziel', 'M12001-09 log10_sulfatreduzierer_ziel',
      'M12001-09 validierung_min_share_pct', 'M12001-09 routine_min_share_pct', 'M12001-09 truebung_avg_limit', 'M12001-09 truebung_5pct_limit', 'M12001-09 truebung_never_limit',
      'M12001-12 beprobung_frequenz_e_coli_tab27', 'M12001-12 beprobung_frequenz_enterokokken_tab27', 'M12001-12 beprobung_frequenz_bsb5_tab27', 'M12001-12 beprobung_frequenz_afs_tab27', 'M12001-12 beprobung_frequenz_truebung_tab27', 'M12001-12 beprobung_frequenz_legionella_tab27', 'M12001-12 beprobung_frequenz_nematoden_tab27',
    ]);
    expect(byWidget('derived')).toEqual(['M12001-08 gueteklasse_code', 'M12001-07 ausgangsrisiko_max_code', 'M12001-07 restrisiko_max_code', 'M12001-14 stoerfall_max_code', 'M12001-16 anwendungsbereich_count_calc', 'M12001-16 zusatzwasserbedarf_jahr_calc', 'M12001-09 compliance_quote_calc', 'M12001-09 pfas20_limit_ng_l']);
    expect(byWidget('attestation')).toEqual(['M12001-09 toc_korrelation_nachgewiesen', 'M12001-09 truebung_kontinuierlich_ueberwacht']);
    expect(byWidget('select_one')).toEqual([]);
    expect(byWidget('select_many')).toEqual([]);
    const rules = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(rules).toEqual([
      `M12001-09 legionella_limit :: ${AEROSOL}`, `M12001-09 nematoden_limit :: ${WEIDE}`,
      `M12001-09 log10_e_coli_ziel :: ${LEISTUNGSZIELE}`, `M12001-09 log10_somatische_coliphagen_ziel :: ${LEISTUNGSZIELE}`, `M12001-09 log10_f_coliphagen_ziel :: ${LEISTUNGSZIELE}`, `M12001-09 log10_clostridium_ziel :: ${LEISTUNGSZIELE}`, `M12001-09 log10_sulfatreduzierer_ziel :: ${LEISTUNGSZIELE}`,
      `M12001-09 validierung_min_share_pct :: ${LEISTUNGSZIELE}`,
      `M12001-12 beprobung_frequenz_legionella_tab27 :: ${AEROSOL}`,
    ]);
    // the yes/no drivers are prod ENUMS ja/nein — never `== true`
    expect(AEROSOL).toBe("aerosolrisiko == 'ja'");
    expect(enumValues('M12001-06 aerosolrisiko')).toEqual(['ja', 'nein']);
    expect(enumValues('M12001-08 anwendung_weide_oder_futterpflanzen')).toEqual(['ja', 'nein']);
    // never touched: the pending I-1 pair (m1200_1-E-1) and the consumed producers of the brief's Step 4 (m1200_1-C-3)
    for (const sym of ['indikatorchemikalien_kat1', 'indikatorchemikalien_kat2', 'legionella_value', 'nematoden_value', 'log10_e_coli', 'log10_coliphagen', 'log10_clostridium', 'validierungs_compliance_pct', 'truebung_max_value', 'bsb5_value', 'afs_value', 'pfas20_value', 'beschilderung_urbane_flaechen', 'beprobung_frequenz_e_coli', 'gueteklasse_zugeordnet', 'restrisiko_niveau', 'risikoniveau_ausgangs']) {
      expect(FIELD_CONFIGS.find((e) => e.symbol === sym), sym).toBeUndefined();
    }
  });

  it('G-A3 key-string equality: table keys equal the captured prod enum value strings; register enum columns carry prod tokens; lookup_key columns bind seeded tables', () => {
    expect([...GUETEKLASSE_TOKENS]).toEqual(enumValues('M12001-08 gueteklasse_zugeordnet'));
    expect([...FILTRATION_TOKENS]).toEqual(enumValues('M12001-10 filtration_typ'));
    expect([...WAHRSCHEINLICHKEIT_TOKENS]).toEqual(enumValues('M12001-07 eintrittswahrscheinlichkeit'));
    expect([...SCHADENSAUSMASS_TOKENS]).toEqual(enumValues('M12001-07 schadensausmass'));
    for (const t of [tab8AsTable(), tab7ClassAsTable(), tab27AsTable()]) expect(t.rows.map((r) => r.keys.klasse), t.table_code).toEqual([...GUETEKLASSE_TOKENS]);
    expect(tab8NoteFAsTable().rows.map((r) => r.keys.filtration_typ)).toEqual([...FILTRATION_TOKENS]);
    expect(new Set(tab23AsTable().rows.map((r) => r.keys.wahrscheinlichkeit))).toEqual(new Set(WAHRSCHEINLICHKEIT_TOKENS));
    expect(new Set(tab23AsTable().rows.map((r) => r.keys.schadensausmass))).toEqual(new Set(SCHADENSAUSMASS_TOKENS));
    expect(new Set(tab23AsTable().rows.map((r) => r.values.risikoniveau))).toEqual(new Set(enumValues('M12001-07 risikoniveau_ausgangs')));
    expect(tab18AsTable().rows.map((r) => r.keys.schutzgut_code)).toEqual([...SCHUTZGUT_CODES]);
    for (const [ws, sym] of [['M12001-07', 'risiko_zeilen'], ['M12001-14', 'stoerfaelle']] as const) {
      const cols = registerCfg(ws, sym).columns;
      expect(cols.find((c) => c.key === 'wahrscheinlichkeit')!.options).toEqual([...WAHRSCHEINLICHKEIT_TOKENS]);
      expect(cols.find((c) => c.key === 'schadensausmass')!.options).toEqual([...SCHADENSAUSMASS_TOKENS]);
      expect(cols.find((c) => c.key === 'rest_wahrsch')?.options ?? [...WAHRSCHEINLICHKEIT_TOKENS]).toEqual([...WAHRSCHEINLICHKEIT_TOKENS]);
    }
    expect(registerCfg('M12001-07', 'risiko_zeilen').columns.find((c) => c.key === 'schutzgut')!.lookup).toEqual({ table_code: 'TAB18' });
    expect(registerCfg('M12001-07', 'risiko_zeilen').columns.find((c) => c.key === 'expositionsweg')!.lookup).toEqual({ table_code: 'TAB18', key_column: 'schutzgut', value: 'expositionsweg' });
    expect(registerCfg('M12001-08', 'kulturen_tab7').columns.find((c) => c.key === 'klasse_sub')!.lookup).toEqual({ table_code: 'TAB7_CLASS' });
    expect(registerCfg('M12001-16', 'flaechenverzeichnis').columns.find((c) => c.key === 'klasse_sub')!.lookup).toEqual({ table_code: 'TAB7_CLASS' });
    expect(registerCfg('M12001-07', 'risiko_zeilen').columns.find((c) => c.key === 'gefahr')!.options).toEqual([...GEFAHR_TOKENS]);
    expect(registerCfg('M12001-09', 'routineproben').columns.find((c) => c.key === 'parameter')!.options).toEqual([...PROBE_PARAMETER_TOKENS]);
    // the routine-sample register reads the seven created limit symbols of its own worksheet in row scope (G-13)
    const limitExpr = registerCfg('M12001-09', 'routineproben').columns.find((c) => c.key === 'limit')!.expr!;
    for (const sym of ['e_coli_limit', 'enterokokken_limit', 'bsb5_limit', 'afs_limit', 'truebung_limit', 'legionella_limit', 'nematoden_limit']) {
      expect(limitExpr).toContain(sym);
      expect(byKey('M12001-09', sym).create!.data_type).toBe('number');
    }
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns; created targets are number (Tab. 8) / text (Tab. 27); the key symbols are consumed on the fill worksheet', () => {
    const tableKeys: Record<string, string[]> = { TAB8: tab8AsTable().key_columns, TAB8_NOTE_F: tab8NoteFAsTable().key_columns, TAB27: tab27AsTable().key_columns };
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      expect(e.lookup!.keys.map((k) => k.column), e.symbol).toEqual(tableKeys[e.lookup!.table_code]);
      expect(e.create!.data_type).toBe(e.lookup!.table_code === 'TAB27' ? 'text' : 'number');
      expect(e.lookup!.role).toBe(e.lookup!.table_code === 'TAB27' ? 'value' : 'limit');
    }
    expect(cons('M12001-08 gueteklasse_zugeordnet')).toEqual(expect.arrayContaining(['M12001-09', 'M12001-12']));
    expect(cons('M12001-10 filtration_typ')).toContain('M12001-09');
    expect(cons('M12001-06 aerosolrisiko')).toEqual(expect.arrayContaining(['M12001-09', 'M12001-12']));
    expect(cons('M12001-08 anwendung_weide_oder_futterpflanzen')).toContain('M12001-09');
    expect(cons('M12001-08 anwendung_weide_oder_futterpflanzen')).not.toContain('M12001-12'); // hence no WEIDE rule on the -12 Nematoden fill (m1200_1-C-1)
    expect(byKey('M12001-12', 'beprobung_frequenz_nematoden_tab27').visible_when).toBeNull();
    // the existing e-coli frequency enum keeps its prod options (D-1) and is not re-bound (m1200_1-E-3)
    expect(enumValues('M12001-12 beprobung_frequenz_e_coli')).toEqual(['1x_pro_woche', '2x_pro_monat']);
  });

  it('producer guard: every created entry passes producerChain (skipDirect); the brief\'s rules on existing fields would be REFUSED (consumed producers — m1200_1-C-3) or never resolve (-19, m1200_1-C-1)', () => {
    for (const e of FIELD_CONFIGS) {
      expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.worksheet} ${e.symbol} must not exist in prod`).toBeUndefined();
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
      if (e.visible_when) expect(producerChain(prior, e.worksheet, e.symbol, { skipDirect: true }), `${e.worksheet} ${e.symbol}`).toBeNull();
    }
    expect(Object.keys(prior.equations ?? {})).toEqual(['M12001-07 EQ-001']);
    expect(prior.equations!['M12001-07 EQ-001']).toMatchObject({ output_symbol: 'risikoniveau_ausgangs', input_symbols: ['eintrittswahrscheinlichkeit', 'schadensausmass'] });
    // the brief's Step-4 targets are consumed producers (direct rule) — pinned so the withheld list on the sign-off sheet stays true to the capture
    expect(cons('M12001-09 legionella_value')).toEqual(['M12001-12']);
    expect(cons('M12001-09 nematoden_value')).toEqual(['M12001-12']);
    for (const sym of ['log10_e_coli', 'log10_coliphagen', 'log10_clostridium', 'truebung_max_value', 'bsb5_value', 'afs_value']) expect(cons(`M12001-09 ${sym}`), sym).toContain('M12001-12');
    expect(cons('M12001-09 pfas20_value')).toEqual(expect.arrayContaining(['M12001-12', 'M12001-13']));
    expect(cons('M12001-12 validierungs_compliance_pct')).toEqual(['M12001-15']);
    expect(cons('M12001-10 indikatorchemikalien_kat1')).toEqual(['M12001-13']);
    expect(cons('M12001-19 beschilderung_urbane_flaechen')).toEqual([]);
    expect(cons('M12001-08 anwendungsbereich_kategorie')).not.toContain('M12001-19');
    // EQ-001's scalar inputs on -07 are consumer-free (the register supersedes them — m1200_1-R-1); its output is consumed by -10
    expect(cons('M12001-07 eintrittswahrscheinlichkeit')).toEqual([]);
    expect(cons('M12001-07 risikoniveau_ausgangs')).toEqual(['M12001-10']);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    const { up, down } = emitFieldConfigSql('m1200_1', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('m1200_1', '20260917100510');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(0);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(40);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/enum_values = /); // D-1: no prod enum touched
  });
});
