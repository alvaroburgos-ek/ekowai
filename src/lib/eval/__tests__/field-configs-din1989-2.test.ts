/**
 * Plan 3 Task 17 — DIN-1989-2 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, the emitter accepts the module against the
 * captured prior (default refuse mode — no `--gate-guard=warn`), every rule the
 * gate-aware / producer guards REFUSE is asserted (not discovered) and lives in
 * the STAGED file, and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, KENNZEICHNUNG_ITEMS } from '../field-configs/din1989_2';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { tab1AsTable, tab2AsTable, tab3AsTable, TAB1_SEDIMENTATIONSVOLUMEN } from '../regulation-tables-seed-din1989_2';
import { emitFieldConfigSql, fieldConfigFilesFor, gateReaders, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/din1989_2.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const priorRow = (key: string) => (prior as Record<string, { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null }>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'DIN-1989-2';
const entry = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });

describe('DIN-1989-2 field configs (Plan 3 Task 17)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no quote is undefined', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      if (e.widget === 'register') {
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 38 field entries (32 create, 6 update), widgets by kind, 29 visibility rules, no section rule', () => {
    expect(FIELD_CONFIGS).toHaveLength(38);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(32);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['DIN-1989-2-02 behaeltnisse', 'DIN-1989-2-03 prueflaeufe', 'DIN-1989-2-03 pruefstoffe']);
    expect(byWidget('lookup_fill')).toEqual(['DIN-1989-2-01 filtertyp_tab1']);
    expect(byWidget('select_one')).toEqual(['DIN-1989-2-01 sedimentationsvolumen']);
    expect(byWidget('select_many')).toEqual(['DIN-1989-2-04 kennzeichnung']);
    expect(byWidget('attestation')).toEqual([
      'DIN-1989-2-02 rueckhalteraum_zugaenglich', 'DIN-1989-2-02 einbau_fallrohr', 'DIN-1989-2-02 temperaturbestaendig_fallrohr', 'DIN-1989-2-03 hersteller_verfahren_dokumentiert',
    ]);
    expect(byWidget('scalar')).toEqual(['DIN-1989-2-03 V_Pruef_leist', 'DIN-1989-2-03 V_Pruef_trenn', 'DIN-1989-2-03 V_pruefmedium_l', 'DIN-1989-2-03 eta_Verw', 'DIN-1989-2-04 werkstoffbezeichnung']);
    expect(byWidget('derived')).toHaveLength(23); // one per equation row
    expect(byWidget('reference')).toEqual([]); // the brief's `reference` for an EN 12056-3 value: the codebase widget is a carrier-row picker (X-1)
    // UPDATE entries = the six existing prod fields that gain a rule (all consumer-free, none read by a same-worksheet gate)
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`)).toEqual([
      "DIN-1989-2-02 rueckhalteraum_zugaenglich :: filtertyp IN {'typ_a', 'typ_b'}",
      'DIN-1989-2-02 temperaturbestaendig_fallrohr :: einbau_fallrohr == true',
      'DIN-1989-2-03 V_Pruef_leist :: DN <= 200',
      'DIN-1989-2-03 V_Pruef_trenn :: DN <= 200',
      "DIN-1989-2-03 eta_Verw :: filtertyp == 'typ_c'",
      "DIN-1989-2-04 werkstoffbezeichnung :: werkstoff_filterelement == 'kunststoff'",
    ]);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when)).toHaveLength(29);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when?.includes('DN <= 200'))).toHaveLength(18); // the DN ≤ 200 test-scope rules (L227 / L403)
    expect(FIELD_CONFIGS.filter((e) => e.visible_when === 'DN > 200').map((e) => e.symbol)).toEqual(['hersteller_verfahren_dokumentiert']);
  });

  it('G-A3 key-string equality: table keys equal the driving enum / register-column value strings exactly; lookup_fill binds the two TAB1 keys in order', () => {
    // TAB1 first key = prod funktionsprinzip tokens; second key = the created select's options; value = prod filtertyp tokens = the twin's enum_values
    const fill = byKey('DIN-1989-2-01', 'filtertyp_tab1');
    expect(fill.lookup!.keys.map((k) => k.column)).toEqual(tab1AsTable().key_columns);
    expect(fill.lookup!.keys.map((k) => k.from_symbol)).toEqual(['funktionsprinzip', 'sedimentationsvolumen']);
    expect(fill.lookup!.value).toBe('typ');
    expect(fill.create?.data_type).toBe('enum'); // amendment C: number | text | enum
    expect(new Set(tab1AsTable().rows.map((r) => r.keys.filterart))).toEqual(new Set(enumValues('DIN-1989-2-01 funktionsprinzip')));
    const sed = byKey('DIN-1989-2-01', 'sedimentationsvolumen').enum_values as Array<{ value: string }>;
    expect(sed.map((o) => o.value)).toEqual([...TAB1_SEDIMENTATIONSVOLUMEN]);
    for (const r of tab1AsTable().rows) expect(sed.map((o) => o.value)).toContain(r.keys.sedimentationsvolumen);
    const twinEnum = (fill.enum_values as Array<{ value: string; label_de: string }>);
    expect(twinEnum.map((o) => o.value)).toEqual(enumValues('DIN-1989-2-01 filtertyp'));
    expect(twinEnum.map((o) => o.label_de)).toEqual(['TYP A', 'TYP B', 'TYP C']);
    for (const r of tab1AsTable().rows) expect(twinEnum.map((o) => o.value)).toContain(r.values.typ);
    // the existing filtertyp is NOT touched (consumed by -02/-03 and read by CR-01 — amendment J: twin + STAGED E-1)
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'filtertyp')).toBeUndefined();
    expect(priorRow('DIN-1989-2-01 filtertyp').consumer_worksheets).toEqual(['DIN-1989-2-02', 'DIN-1989-2-03']);
    // register lookup pairs bind the seeded tables
    const pl = registerCfg('DIN-1989-2-03', 'prueflaeufe').columns;
    expect(pl.find((c) => c.key === 'stufe')?.lookup).toEqual({ table_code: 'TAB2' });
    expect(pl.find((c) => c.key === 'q_pct')?.lookup).toEqual({ table_code: 'TAB2', key_column: 'stufe', value: 'q_pct' });
    expect(pl.find((c) => c.key === 't_min')?.lookup).toEqual({ table_code: 'TAB2', key_column: 'stufe', value: 'pruefzeit_min' });
    expect(tab2AsTable().rows).toHaveLength(7);
    const ps = registerCfg('DIN-1989-2-03', 'pruefstoffe').columns;
    expect(ps.find((c) => c.key === 'stoff')?.lookup).toEqual({ table_code: 'TAB3' });
    for (const k of ['konz', 'stueck', 'fussnote']) expect(ps.find((c) => c.key === k)?.lookup?.table_code).toBe('TAB3');
    for (const c of ps.filter((c) => c.type === 'lookup_value')) expect(tab3AsTable().value_columns.map((v) => v.name)).toContain(c.lookup!.value);
    expect(ps.find((c) => c.key === 'masse_verwurf_g')?.visible_when).toBe("filtertyp == 'typ_c'");
    expect(ps.find((c) => c.key === 'masse_verwurf_g')?.required).toBeUndefined(); // optional — Typ A/B rows stay complete
    expect(ps.find((c) => c.key === 'masse_speicher_g')?.required).toBe(true);
    // locked tables ⇒ no override block on any register
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) expect((r.ui_config as RegisterUiConfig).override).toBeUndefined();
    // the select_many options are the nine printed §7 items
    const chk = byKey('DIN-1989-2-04', 'kennzeichnung').enum_values as Array<{ value: string }>;
    expect(chk.map((o) => o.value)).toEqual(KENNZEICHNUNG_ITEMS.map((k) => k.value));
    expect(chk).toHaveLength(9);
    expect(byKey('DIN-1989-2-04', 'kennzeichnung').create?.data_type).toBe('json'); // amendment N: a created checklist is json
  });

  it('drivers resolve where the rules sit (capture): filtertyp / DN reach -02 and -03, einbausystem reaches -02; werkstoff_filterelement reaches nothing (C-1 pending)', () => {
    expect(priorRow('DIN-1989-2-01 DN').consumer_worksheets).toEqual(['DIN-1989-2-02', 'DIN-1989-2-03']);
    expect(priorRow('DIN-1989-2-01 einbausystem').consumer_worksheets).toEqual(['DIN-1989-2-02']);
    expect(priorRow('DIN-1989-2-01 funktionsprinzip').consumer_worksheets).toEqual(['DIN-1989-2-02']);
    expect(priorRow('DIN-1989-2-02 werkstoff_filterelement').consumer_worksheets).toBeNull();
    expect(byKey('DIN-1989-2-04', 'werkstoffbezeichnung').visible_when).toBe("werkstoff_filterelement == 'kunststoff'"); // emitted, reads pending until din1989_2-C-1
    // the register row rule for the Erdeinbau depth reads the inherited einbausystem token exactly
    expect(registerCfg('DIN-1989-2-02', 'behaeltnisse').columns.find((c) => c.key === 'grifftiefe_cm')?.visible_when).toBe("einbausystem == 'separat_erdeinbau'");
    expect(enumValues('DIN-1989-2-01 einbausystem')).toContain('separat_erdeinbau');
    expect(enumValues('DIN-1989-2-01 filtertyp')).toEqual(['typ_a', 'typ_b', 'typ_c']);
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
    }
  });

  it('visibility never lands on a consumed producer or a gate-read symbol (pinned against the capture); the refused rules are asserted and STAGED', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const key = `${e.worksheet} ${e.symbol}`;
      expect(priorRow(key), `${key} captured`).toBeDefined();
      expect(priorRow(key).consumer_worksheets ?? []).toEqual([]);
      expect(producerChain(prior, e.worksheet, e.symbol)).toBeNull();
      expect(gateReaders(prior, e.worksheet, e.symbol, e.visible_when!)).toEqual([]);
    }
    // G-1: V_Rueck_A is read by CR-03 (unguarded arithmetic compare) — hiding it under typ_a would disarm the gate
    expect(gateReaders(prior, 'DIN-1989-2-02', 'V_Rueck_A', "filtertyp == 'typ_a'").map((g) => g.code)).toEqual(['DIN-1989-2-CR-03']);
    expect(() => emitFieldConfigSql('din1989_2', [entry('DIN-1989-2-02', 'V_Rueck_A', "filtertyp == 'typ_a'")], [], prior)).toThrow(/hides V_Rueck_A read by gate DIN-1989-2-CR-03 \(block: "V_Rueck_A >= Q \* 25"\)/);
    // G-2: the three Typ-B inputs are read by CR-04 / CR-05 / CR-06
    expect(gateReaders(prior, 'DIN-1989-2-02', 'V_Rueck_B', "filtertyp == 'typ_b'").map((g) => g.code)).toEqual(['DIN-1989-2-CR-04']);
    expect(gateReaders(prior, 'DIN-1989-2-02', 'behaeltnis_masse', "filtertyp == 'typ_b'").map((g) => g.code)).toEqual(['DIN-1989-2-CR-05']);
    expect(gateReaders(prior, 'DIN-1989-2-02', 'tiefe_gok_griff', "filtertyp == 'typ_b' AND einbausystem == 'separat_erdeinbau'").map((g) => g.code)).toEqual(['DIN-1989-2-CR-06']);
    // G-7: standsicherheit_eingehalten is read by CR-10
    expect(gateReaders(prior, 'DIN-1989-2-02', 'standsicherheit_eingehalten', "einbausystem == 'separat_erdeinbau'").map((g) => g.code)).toEqual(['DIN-1989-2-CR-10']);
    // G-4: filtertrennwirkung_nachgewiesen is read by CR-08
    expect(gateReaders(prior, 'DIN-1989-2-03', 'filtertrennwirkung_nachgewiesen', 'DN <= 200').map((g) => g.code)).toEqual(['DIN-1989-2-CR-08']);
    // C-2: the Gl. 7–9 inputs feed consumed outputs (transitive producer guard); the outputs themselves are consumed by -04
    expect(producerChain(prior, 'DIN-1989-2-03', 'm_verw')).toBe('m_verw → Gl.9 eta_C (consumed by DIN-1989-2-04)');
    expect(producerChain(prior, 'DIN-1989-2-03', 'm_ges_festst')).toBe('m_ges_festst → Gl.7 eta_Rueck_AB (consumed by DIN-1989-2-04)');
    expect(producerChain(prior, 'DIN-1989-2-03', 'm_sp_verunr')).toBe('m_sp_verunr → Gl.7 eta_Rueck_AB (consumed by DIN-1989-2-04)');
    expect(() => emitFieldConfigSql('din1989_2', [entry('DIN-1989-2-03', 'm_verw', "filtertyp == 'typ_c'")], [], prior)).toThrow(/m_verw → Gl\.9 eta_C \(consumed by DIN-1989-2-04\)/);
    for (const sym of ['eta_Rueck_AB', 'eta_C', 'eta_hyd_bel', 'eta_hydr']) expect(priorRow(`DIN-1989-2-03 ${sym}`).consumer_worksheets).toEqual(['DIN-1989-2-04']);
    for (const sym of ['eta_hydr_unbel_doku', 'eta_hydr_bel_doku']) expect(priorRow(`DIN-1989-2-02 ${sym}`).consumer_worksheets).toEqual(['DIN-1989-2-04']);
    expect(() => emitFieldConfigSql('din1989_2', [entry('DIN-1989-2-03', 'eta_C', "filtertyp == 'typ_c'")], [], prior)).toThrow(/hides eta_C \(consumed by DIN-1989-2-04\)/);
    // eta_Verw (Gl. 8 output) is consumer-free, feeds no equation and no gate reads it — its Typ-C rule IS emitted
    expect(priorRow('DIN-1989-2-03 eta_Verw').consumer_worksheets).toBeNull();
    expect(prior.equations!['DIN-1989-2-03 9'].input_symbols).not.toContain('eta_Verw');
    // no section rule is possible: -02 C and -03 D each hold a gate-read or consumed field
    // -02 C also holds Q (consumed by -03) — the producer guard fires first; the four CR-03…CR-06 reads would refuse it next
    expect(() => emitFieldConfigSql('din1989_2', [], [{ standard: STD, worksheet: 'DIN-1989-2-02', section_code: 'C', visible_when: "filtertyp == 'typ_b'", verification_quote: 'q' }], prior)).toThrow(/Q \(consumed by DIN-1989-2-03\)/);
    expect(() => emitFieldConfigSql('din1989_2', [], [{ standard: STD, worksheet: 'DIN-1989-2-03', section_code: 'D', visible_when: 'DN <= 200', verification_quote: 'q' }], prior)).toThrow(/consumed by another worksheet|read by gate/);
    // the IF-guard exemption that G-4 relies on: with CR-08 rewritten to `IF DN <= 200 THEN …` the rule passes (same driver / op / literal)
    const guarded: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'DIN-1989-2-03 DIN-1989-2-CR-08': { condition: 'IF DN <= 200 THEN filtertrennwirkung_nachgewiesen == true', severity: 'block', symbols: ['DN', 'filtertrennwirkung_nachgewiesen'] } } };
    expect(gateReaders(guarded, 'DIN-1989-2-03', 'filtertrennwirkung_nachgewiesen', 'DN <= 200')).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no warnings)', () => {
    const { up, down, warnings } = emitFieldConfigSql('din1989_2', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('din1989_2', '20260917101710');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(6);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(32);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
