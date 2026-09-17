/**
 * Plan 3 Task 3 — DWA-A-262E field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, the emitter accepts the module against the
 * captured prior, visibility never lands on a consumed producer, and the
 * committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, FILTER_TYPE_TOKENS, SYSTEM_SIZE_TOKENS, SEWER_TOKENS } from '../field-configs/a262e';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { TABLE1_PRETREATMENT_MAP, tableLimitsAsTable, table15AsTable, table16AsTable, table2CsbAsTable, s42VorbehandlungAsTable, table18OrificeAsTable, table21AsTable } from '../regulation-tables-seed-a262e';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/a262e.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;

describe('DWA-A-262E field configs (Plan 3 Task 3)', () => {
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

  it('counts: 26 field entries (24 create, 2 update), widgets by kind, 125 section rules over 16 worksheets', () => {
    expect(FIELD_CONFIGS).toHaveLength(26);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(24);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['A262-06 ueberlaufbauwerke', 'A262-08 ablaufproben', 'A262-10 filterstufen', 'A262-15 rieselrohre']);
    expect(byWidget('lookup_fill')).toEqual(['A262-07 B_CSB_tab1', 'A262-07 B_BSB5_tab1', 'A262-07 B_TKN_tab1', 'A262-07 V_VB_min', 'A262-26 B_CSB_Grauwasser', 'A262-27 f_A_ANF_CSB_max', 'A262-27 q_F_T_polishing_max', 'A262-27 t_Sicker_polishing_min']);
    expect(byWidget('select_one')).toEqual(['A262-06 entlastung_typ', 'A262-26 grauwasser_quelle', 'A262-27 hf_material', 'A262-27 polishing_temp_band']);
    expect(byWidget('select_many')).toEqual([]);
    expect(byWidget('scalar')).toEqual(['A262-05 m_multiplier']); // q_R_Tr / Q_R_Tr refused by the transitive guard (a262e-C-7)
    expect(byWidget('derived')).toEqual([
      'A262-06 Q_Dr_RUB_sum', 'A262-06 Q_Dr_RU_sum', 'A262-06 Q_krit_sum', 'A262-08 csb_last5_ok', 'A262-08 bsb5_last5_ok',
      'A262-10 A_Fo_gesamt', 'A262-10 filterstufen_area_fail', 'A262-15 L_Rieselr_sum', 'A262-15 rieselrohr_max_len',
    ]);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`)).toEqual([
      "A262-05 m_multiplier :: sewer_system_type == 'separate_sewer'",
    ]);
    expect(SECTION_VISIBILITY).toHaveLength(125);
    const perWs = new Map<string, string[]>();
    for (const s of SECTION_VISIBILITY) perWs.set(s.worksheet, [...(perWs.get(s.worksheet) ?? []), s.section_code]);
    expect(Object.fromEntries(perWs)).toEqual({
      'A262-05': ['A', 'C', 'J', 'K', 'L', 'M'], 'A262-06': ['A', 'C', 'J', 'K', 'L', 'M'],
      'A262-11': ['A', 'B', 'C', 'D', 'F', 'J', 'K', 'L', 'M'], 'A262-12': ['A', 'C', 'D', 'F', 'J', 'K', 'L', 'M'], 'A262-13': ['A', 'B', 'C', 'D', 'F', 'J', 'K', 'L', 'M'],
      'A262-14': ['A', 'C', 'D', 'F', 'J', 'K', 'L', 'M'], 'A262-15': ['A', 'C', 'D', 'F', 'J', 'K', 'L', 'M'], 'A262-16': ['A', 'C', 'D', 'F', 'J', 'K', 'L', 'M'],
      'A262-19': ['A', 'C', 'F', 'J', 'K', 'L', 'M'], 'A262-20': ['A', 'C', 'D', 'F', 'J', 'K', 'L', 'M'], 'A262-21': ['A', 'B', 'C', 'D', 'F', 'J', 'K', 'L', 'M'],
      'A262-22': ['A', 'B', 'C', 'D', 'F', 'J', 'K', 'L', 'M'], 'A262-23': ['A', 'C', 'D', 'F', 'J', 'K', 'L', 'M'],
      'A262-25': ['A', 'C', 'J', 'K', 'L', 'M'], 'A262-26': ['A', 'B', 'C', 'D', 'F', 'J', 'K', 'L', 'M'], 'A262-28': ['A', 'C', 'D', 'J', 'K', 'L', 'M'],
    });
    expect(SECTION_VISIBILITY.find((s) => s.worksheet === 'A262-11')!.visible_when).toBe("system_size_category == 'small_wwts' AND filter_type == 'vf_sand_0_2'");
    expect(SECTION_VISIBILITY.find((s) => s.worksheet === 'A262-23')!.visible_when).toBe("system_size_category == 'municipal_wwtp' AND filter_type == 'vf_lava_sand_0_4'");
  });

  it('G-A3 key-string equality: table keys and register enum options equal the captured prod enum value strings exactly', () => {
    // driver enums as captured on prod
    expect([...FILTER_TYPE_TOKENS]).toEqual(enumValues('A262-10 filter_type'));
    expect([...SYSTEM_SIZE_TOKENS]).toEqual(enumValues('A262-02 system_size_category'));
    expect([...SEWER_TOKENS]).toEqual(enumValues('A262-02 sewer_system_type'));
    // TABLE_LIMITS keys ⊆ the driver tokens; TABLE18_ORIFICE / TABLE21 filter_type keys ⊆ prod tokens
    const limits = tableLimitsAsTable();
    for (const r of limits.rows) {
      expect(FILTER_TYPE_TOKENS).toContain(r.keys.filter_type);
      expect(SYSTEM_SIZE_TOKENS).toContain(r.keys.system_size);
    }
    for (const r of table18OrificeAsTable().rows) expect(FILTER_TYPE_TOKENS).toContain(r.keys.filter_type);
    for (const r of table21AsTable().rows) expect(FILTER_TYPE_TOKENS).toContain(r.keys.filter_type);
    // the register's enum columns carry exactly the prod tokens; the sewer_key badge maps combined_sewer → 'm', everything else → 'tr'
    const cols = registerCfg('A262-10', 'filterstufen').columns;
    expect(cols.find((c) => c.key === 'filter_type')!.options).toEqual([...FILTER_TYPE_TOKENS]);
    expect(cols.find((c) => c.key === 'system_size')!.options).toEqual([...SYSTEM_SIZE_TOKENS]);
    expect(cols.find((c) => c.key === 'sewer')!.options).toEqual([...SEWER_TOKENS]);
    expect(cols.find((c) => c.key === 'sewer_key')!.expr).toBe("if(sewer == 'combined_sewer', 'm', 'tr')");
    expect(new Set(limits.rows.map((r) => r.keys.sewer))).toEqual(new Set(['tr', 'm']));
    expect(cols.filter((c) => c.expr?.includes("lookup('TABLE_LIMITS'"))).toHaveLength(7); // G-1 three-key lookups
    expect(cols.find((c) => c.key === 'filter_type')!.discriminator).toBe(true);
    // Tab. 1 / §4.2 tables: pretreatment keys ⊆ prod pretreatment_selected (rotting_tank has no Tab. 1 row, raw_wastewater_filter no §4.2 volume row)
    const pre = enumValues('A262-07 pretreatment_selected');
    for (const m of TABLE1_PRETREATMENT_MAP) expect(pre).toContain(m.token);
    for (const r of s42VorbehandlungAsTable().rows) expect(pre).toContain(r.keys.pretreatment);
    // created selects drive their tables with identical value strings
    const opts = (ws: string, sym: string) => (byKey(ws, sym).enum_values as Array<{ value: string }>).map((o) => o.value);
    expect(opts('A262-26', 'grauwasser_quelle')).toEqual(table2CsbAsTable().rows.map((r) => r.keys.source));
    expect(opts('A262-27', 'hf_material')).toEqual(table16AsTable().rows.map((r) => r.keys.material));
    expect(opts('A262-27', 'polishing_temp_band')).toEqual(table15AsTable().rows.map((r) => r.keys.temp_band));
    expect(opts('A262-06', 'entlastung_typ')).toEqual(['rueb', 'rue']);
    expect(registerCfg('A262-06', 'ueberlaufbauwerke').columns.find((c) => c.key === 'type')!.options).toEqual(['rueb', 'rue']);
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns in order; created targets are numbers; the one UPDATE binding sits on a captured number', () => {
    const tableKeys: Record<string, string[]> = {
      TABLE1_CSB: ['pretreatment'], TABLE1_BSB5: ['pretreatment'], TABLE1_TKN: ['pretreatment'], S4_2_VORBEHANDLUNG: s42VorbehandlungAsTable().key_columns,
      TABLE2_CSB: table2CsbAsTable().key_columns, TABLE16: table16AsTable().key_columns, TABLE15: table15AsTable().key_columns,
    };
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      expect(e.lookup!.keys.map((k) => k.column), e.symbol).toEqual(tableKeys[e.lookup!.table_code]);
      if (e.create) expect(e.create.data_type, e.symbol).toBe('number');
      else expect(priorRow(`${e.worksheet} ${e.symbol}`).data_type, e.symbol).toBe('number');
    }
    expect(byKey('A262-26', 'B_CSB_Grauwasser').lookup!.keys[0].from_symbol).toBe('grauwasser_quelle');
    expect(byKey('A262-07', 'V_VB_min').lookup).toMatchObject({ role: 'limit', value: 'v_min_l_p' });
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const ui = r.ui_config as RegisterUiConfig;
      if (ui.override) expect(ui.columns.find((c) => c.key === ui.override!.flag_key)?.type).toBe('boolean');
    }
  });

  it('visibility never lands on a consumed producer (pinned against the capture); created fields sit in captured sections; drivers are consumed where a rule can resolve today', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const row = priorRow(`${e.worksheet} ${e.symbol}`);
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect(row.consumer_worksheets ?? []).toEqual([]);
    }
    // no section rule targets a section holding a consumed producer — directly or through a same-worksheet equation chain (transitive guard, fix round 1)
    const producers = new Set(Object.entries(prior).filter(([k, v]) => k.includes(' ') && ((v as Row).consumer_worksheets ?? []).length > 0).map(([k, v]) => `${k.split(' ')[0]} ${(v as Row).section_code}`));
    for (const s of SECTION_VISIBILITY) expect(producers.has(`${s.worksheet} ${s.section_code}`), `${s.worksheet} ${s.section_code}`).toBe(false);
    for (const s of SECTION_VISIBILITY) {
      for (const [k, v] of Object.entries(prior)) {
        if (!k.startsWith(`${s.worksheet} `) || (v as Row).section_code !== s.section_code) continue;
        expect(producerChain(prior, s.worksheet, k.slice(s.worksheet.length + 1)), `${k} in ${s.section_code}`).toBeNull();
      }
    }
    // the two transitive refusals that moved to the STAGED file: A262-06 B (Gl. 6/8/10) and A262-28 B (Gl. 16); A262-05 q_R_Tr / Q_R_Tr (Gl. 4 → Gl. 1)
    expect(producerChain(prior, 'A262-06', 'm_T_aM')).toBe('m_T_aM → Gl.10 Q_F_d_aM (consumed by A262-09)');
    expect(producerChain(prior, 'A262-28', 'RV')).toBe('RV → Gl.16 eta_DN (consumed by A262-33)');
    expect(producerChain(prior, 'A262-05', 'q_R_Tr')).toBe('q_R_Tr → Gl.4 Q_R_Tr → Gl.1 Q_Tr_h_max (consumed by A262-07, A262-09)');
    expect(producerChain(prior, 'A262-05', 'm_multiplier')).toBeNull(); // Gl. 5 outputs 'Q_F + Q_R_Tr' — not a field
    expect(Object.keys(prior.equations ?? {})).toHaveLength(18);
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
    }
    // the A262-29 lining block and lava fines are consumed by A262-31 / A262-23 — that is why they are STAGED (a262e-C-4), not encoded
    expect(priorRow('A262-29 geomembrane_thickness_mm').consumer_worksheets).toEqual(['A262-31']);
    expect(priorRow('A262-29 lava_sand_clay_fraction_pct').consumer_worksheets).toEqual(['A262-23']);
    expect(FIELD_CONFIGS.find((e) => e.worksheet === 'A262-29')).toBeUndefined();
    // drivers: sewer_system_type reaches -05/-06, wastewater_type -26, seasonal_operation -25, enhanced_effluent -28, filter_type every filter worksheet;
    // system_size_category does NOT reach -11…-16 / -19…-23 (a262e-C-2) — the AND still hides on a wrong filter_type
    const cons = (k: string) => priorRow(k).consumer_worksheets ?? [];
    expect(cons('A262-02 sewer_system_type')).toEqual(expect.arrayContaining(['A262-05', 'A262-06']));
    expect(cons('A262-02 wastewater_type')).toContain('A262-26');
    expect(cons('A262-02 seasonal_operation')).toContain('A262-25');
    expect(cons('A262-02 enhanced_effluent')).toContain('A262-28');
    for (const ws of ['A262-11', 'A262-12', 'A262-13', 'A262-14', 'A262-15', 'A262-16', 'A262-19', 'A262-20', 'A262-21', 'A262-22', 'A262-23']) {
      expect(cons('A262-10 filter_type')).toContain(ws);
      expect(cons('A262-02 system_size_category')).not.toContain(ws);
    }
    expect(cons('A262-18 filter_type_KomKA')).toEqual([]); // no consumers → cannot key the municipal worksheets (a262e-E-1)
    expect(cons('A262-07 pretreatment_selected')).not.toContain('A262-09'); // why the Tab.-1 fills are created on A262-07 (a262e-E-3)
    expect(cons('A262-01 EZ')).not.toContain('A262-10'); // a_min_m2 stays null until a262e-C-2
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    const { up, down } = emitFieldConfigSql('a262e', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('a262e', '20260917100310');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(2);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(24);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(125);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
