/**
 * Plan 3 Task 18 — DWA-M-820-1 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums / booleans and the seeded tables, the three Plan-1 registers are upgraded
 * IN PLACE with their column keys kept, the emitter accepts the module against the
 * captured prior (default refuse mode — no `--gate-guard=warn`), every rule the
 * gate-aware / producer guards REFUSE is asserted (not discovered) and lives in
 * the STAGED file, and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, AWARD_CRITERIA, STAKEHOLDER_KATEGORIEN, LOS_ARTEN, PREIS_TOKEN } from '../field-configs/m820_1';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { SELECTION_CONFIGS, type RegisterConfig } from '../selection-fields';
import { anhB23AsTable, s81036AsTable, e141UmsatzAsTable, s39VgvAsTable } from '../regulation-tables-seed-m820_1';
import { emitFieldConfigSql, fieldConfigFilesFor, gateReaders, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/m820_1.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const priorRow = (key: string) => (prior as Record<string, { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null }>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'DWA-M-820-1';
const entry = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });

describe('DWA-M-820-1 field configs (Plan 3 Task 18)', () => {
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

  it('counts: 46 field entries (43 create, 3 update = the Plan-1 registers upgraded in place), widgets by kind, exactly one visibility rule (on a created field)', () => {
    expect(FIELD_CONFIGS).toHaveLength(46);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(43);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['M820-03 stakeholder_list', 'M820-09 lose', 'M820-14 award_criteria_list', 'M820-16 bewertungskommission_members', 'M820-18 bewerber', 'M820-20 verhandlungsrunden']);
    expect(byWidget('lookup_fill')).toEqual(['M820-09 eu_threshold_value_anhb23', 'M820-09 eu_threshold_verordnung_anhb23', 'M820-13 min_annual_revenue_multiplier_max', 'M820-23 required_standstill_days_gwb']);
    expect(byWidget('select_one')).toEqual([]);
    expect(byWidget('select_many')).toEqual([]); // no S-block: no select_many on an existing field (amendment N)
    expect(byWidget('derived')).toHaveLength(36); // one per equation row
    expect(byWidget('scalar')).toEqual([]);
    // UPDATE entries = the three Plan-1 registers (no visible_when — a widget / ui_config upgrade is not a hide rule)
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when ?? 'null'}`)).toEqual([
      'M820-03 stakeholder_list :: null',
      'M820-14 award_criteria_list :: null',
      'M820-16 bewertungskommission_members :: null',
    ]);
    // the ONE emitted rule: the created price-weight twin hides under a Festpreis (L1698); the existing price_weight_percent is G-1 / C-3
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`)).toEqual(['M820-14 price_weight_calc_pct :: festpreis_used == false']);
    // the brief's other targets are NOT entries (each on the sheet): price_weight_percent (G-1 / C-3), publication_date / ted_notice_id (C-1),
    // procedure_rationale (C-2), the Bewertungskommission block (J-4), quality_targets_konzept / _projekt (J-5), eu_threshold_value /
    // required_standstill_days re-binds (E-1 / E-2), contract_invalidity_code (I-1)
    for (const sym of ['price_weight_percent', 'publication_date', 'ted_notice_id', 'procedure_rationale', 'bewertungskommission_size', 'bewertungskommission_chairperson', 'quality_targets_konzept', 'quality_targets_projekt', 'eu_threshold_value', 'required_standstill_days', 'contract_invalidity_code', 'liability_insurance_personenschaden', 'liability_insurance_sonstige']) {
      expect(FIELD_CONFIGS.find((e) => e.symbol === sym), sym).toBeUndefined();
    }
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
      expect(['B', 'F']).toContain(e.create!.section_code); // inputs in B, results in F (prod section codes)
    }
  });

  it('G-A3 key-string equality: ANHB23 keys = the prod client_organization_type tokens; the two boolean-keyed tables use the stringified prod booleans; lookup_fill data types are number | text (amendment C)', () => {
    const thr = byKey('M820-09', 'eu_threshold_value_anhb23');
    expect(thr.lookup).toEqual({ table_code: 'ANHB23', role: 'value', keys: [{ column: 'organisation', from_symbol: 'client_organization_type' }], value: 'schwellenwert_eur' });
    expect(thr.create?.data_type).toBe('number');
    expect(anhB23AsTable().key_columns).toEqual(['organisation']);
    expect(anhB23AsTable().rows.map((r) => r.keys.organisation)).toEqual(enumValues('M820-01 client_organization_type'));
    expect(priorRow('M820-01 client_organization_type').consumer_worksheets).toContain('M820-09'); // the driver reaches the twin's worksheet
    const vo = byKey('M820-09', 'eu_threshold_verordnung_anhb23');
    expect(vo.lookup?.value).toBe('verordnung');
    expect(vo.create?.data_type).toBe('text');
    const st = byKey('M820-23', 'required_standstill_days_gwb');
    expect(st.lookup).toEqual({ table_code: 'S8_10_3_6', role: 'value', keys: [{ column: 'uebermittlung', from_symbol: 'electronic_transmission' }], value: 'frist_tage' });
    expect(st.create?.data_type).toBe('number');
    expect(priorRow('M820-23 electronic_transmission').data_type).toBe('boolean');
    expect(s81036AsTable().rows.map((r) => r.keys.uebermittlung).sort()).toEqual(['false', 'true']); // String(boolean) tokens (G-15)
    const um = byKey('M820-13', 'min_annual_revenue_multiplier_max');
    expect(um.lookup).toEqual({ table_code: 'E1_4_1_UMSATZ', role: 'limit', keys: [{ column: 'grossprojekt', from_symbol: 'large_long_project' }], value: 'faktor_max' });
    expect(priorRow('M820-13 large_long_project').data_type).toBe('boolean');
    expect(e141UmsatzAsTable().rows.map((r) => r.keys.grossprojekt).sort()).toEqual(['false', 'true']);
    // the existing inputs are NOT re-bound (amendment J: consumed / gate-bearing → twin + STAGED E-1 / E-2)
    expect(priorRow('M820-09 eu_threshold_value').consumer_worksheets).toEqual(['M820-10']);
    expect(priorRow('M820-23 required_standstill_days').consumer_worksheets).toEqual(['M820-24']);
    expect(prior.gates!['M820-04 REQ-07'].symbols).toContain('eu_threshold_value');
  });

  it('the three Plan-1 registers are upgraded in place: column KEYS kept in order, Preis badge quotes the stored token, kategorie / gewichtung required (0 stored rows in prod), footers name the new outputs', () => {
    const plan1 = (sym: string) => (SELECTION_CONFIGS[sym] as RegisterConfig).columns.map((c) => c.key);
    const keys = (ws: string, sym: string) => registerCfg(ws, sym).columns.filter((c) => c.type !== 'derived').map((c) => c.key);
    // award_criteria_list: same keys + the ist_preis badge; options = the Plan-1 seven (Anh. E.2.2–E.2.8 headings L1659…L1694)
    expect(keys('M820-14', 'award_criteria_list')).toEqual(plan1('award_criteria_list'));
    const award = registerCfg('M820-14', 'award_criteria_list');
    expect(award.columns.find((c) => c.key === 'kriterium')?.options).toEqual([...AWARD_CRITERIA]);
    expect((SELECTION_CONFIGS.award_criteria_list as RegisterConfig).columns.find((c) => c.key === 'kriterium')?.options).toEqual([...AWARD_CRITERIA]);
    expect(award.columns.find((c) => c.key === 'gewichtung')?.required).toBe(true); // an empty weight breaks sum_rows (probed)
    expect(award.columns.find((c) => c.key === 'ist_preis')?.expr).toBe("if(kriterium == 'Preis', 1, 0)");
    expect(PREIS_TOKEN).toBe('Preis');
    expect(award.footer).toEqual(['award_weight_sum_pct', 'price_weight_calc_pct', 'qualitaets_kriterien_count']);
    expect(award.sum_column).toBeUndefined(); // D-2b-5: the legacy client sum retires where an equation row exists
    expect(award.note).not.toContain('Summe der Gewichtungen = 100'); // not printed (F-1); the Plan-1 "Preis und mind. ein qualitatives Kriterium" is refuted by L1696
    // bewertungskommission_members: same keys + vorsitz
    expect(keys('M820-16', 'bewertungskommission_members')).toEqual([...plan1('bewertungskommission_members'), 'vorsitz']);
    expect(registerCfg('M820-16', 'bewertungskommission_members').footer).toEqual(['bewertungskommission_size_calc', 'bewertungskommission_vorsitz_count', 'bewertungskommission_stimmberechtigt_count', 'bewertungskommission_ungerade_code']);
    // stakeholder_list: same keys with kategorie inserted after beteiligter; options = the five §5 tokens
    expect(keys('M820-03', 'stakeholder_list')).toEqual(['beteiligter', 'kategorie', 'rolle', 'verantwortung', 'kommunikation']);
    expect(plan1('stakeholder_list')).toEqual(['beteiligter', 'rolle', 'verantwortung', 'kommunikation']);
    const kat = registerCfg('M820-03', 'stakeholder_list').columns.find((c) => c.key === 'kategorie')!;
    expect(kat.options).toEqual(STAKEHOLDER_KATEGORIEN.map((k) => k.value));
    expect(kat.required).toBe(true); // an unset kategorie makes count_rows(…, kategorie == …) undecidable (probed)
    // lose: the two printed kinds; the row bound reads S3_9_VGV
    const lose = registerCfg('M820-09', 'lose');
    expect(lose.columns.find((c) => c.key === 'art')?.options).toEqual(LOS_ARTEN.map((a) => a.value));
    expect(lose.columns.find((c) => c.key === 'grenze_eur')?.expr).toContain("lookup('S3_9_VGV', 'los_dienstleistung', 'wert')");
    expect(s39VgvAsTable().rows.map((r) => r.keys.konstante)).toEqual(['los_dienstleistung', 'los_bau', 'anteil_pct']);
    expect(lose.footer).toHaveLength(8);
    expect(lose.footer).toContain('lose_gesamt_ok');
    // no register carries an override block (the locked tables are read in row scope; TABD1 / E1_4_1_UMSATZ are lookup_fill / equation targets)
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) expect((r.ui_config as RegisterUiConfig).override).toBeUndefined();
    // bewerber / verhandlungsrunden: the Anh. F columns
    expect(registerCfg('M820-18', 'bewerber').columns.map((c) => c.key)).toEqual(['name', 'formal_ok', 'p123_ok', 'p124_ok', 'eignung_punkte', 'rang', 'shortlisted', 'angebot_punkte', 'final_offer', 'winner']);
    expect(registerCfg('M820-20', 'verhandlungsrunden').columns.map((c) => c.key)).toEqual(['runde', 'bieter', 'datum', 'thema', 'ergebnis', 'protokoll_signiert']);
  });

  it('visibility never lands on a consumed producer or a gate-read symbol; the refused rules of the brief are asserted (not discovered) and STAGED', () => {
    // the one emitted rule sits on a created field; the driver festpreis_used is the worksheet's own field
    expect(priorRow('M820-14 festpreis_used')).toBeDefined();
    // G-1 + C-3: price_weight_percent is read by REQ-15 (`… OR festpreis_used=true`, not an IF guard) AND consumed by -19
    expect(gateReaders(prior, 'M820-14', 'price_weight_percent', 'festpreis_used == false').map((g) => g.code)).toEqual(['REQ-15']);
    expect(priorRow('M820-14 price_weight_percent').consumer_worksheets).toEqual(['M820-19']);
    expect(() => emitFieldConfigSql('m820_1', [entry('M820-14', 'price_weight_percent', 'festpreis_used == false')], [], prior)).toThrow(/price_weight_percent/);
    // C-1: publication_date / ted_notice_id are consumed (REQ-18 IS IF-guarded on the same driver / op / literal — the gate guard alone would pass)
    expect(gateReaders(prior, 'M820-17', 'publication_date', "procurement_procedure == 'vgv_f'")).toEqual([]);
    expect(priorRow('M820-17 publication_date').consumer_worksheets).toEqual(['M820-18']);
    expect(priorRow('M820-17 ted_notice_id').consumer_worksheets).toEqual(['M820-18', 'M820-24']);
    expect(() => emitFieldConfigSql('m820_1', [entry('M820-17', 'publication_date', "procurement_procedure == 'vgv_f'")], [], prior)).toThrow(/consumed by M820-18/);
    // C-2: procedure_rationale is consumed by -24
    expect(priorRow('M820-10 procedure_rationale').consumer_worksheets).toEqual(['M820-24']);
    expect(() => emitFieldConfigSql('m820_1', [entry('M820-10', 'procedure_rationale', "procurement_procedure == 'direktvergabe'")], [], prior)).toThrow(/consumed by M820-24/);
    // J-4: the commission block — bewertungskommission_size is read by REQ-09 (IF-guarded on vgv_f: the gate guard exempts) but the reading is refuted by L843; the register is consumed by -18 / -19
    expect(gateReaders(prior, 'M820-16', 'bewertungskommission_size', "procurement_procedure == 'vgv_f'")).toEqual([]);
    expect(priorRow('M820-16 bewertungskommission_members').consumer_worksheets).toEqual(['M820-18', 'M820-19']);
    // J-5: quality_targets_konzept / _projekt are consumer-free and gate-free — emittable, withheld by the guideline's own words
    expect(priorRow('M820-04 quality_targets_konzept').consumer_worksheets).toBeNull();
    expect(gateReaders(prior, 'M820-04', 'quality_targets_konzept', "project_type == 'konzept'")).toEqual([]);
    expect(producerChain(prior, 'M820-04', 'quality_targets_konzept')).toBeNull();
    // prod has no equations: no transitive chain exists anywhere
    expect(prior.equations).toEqual({});
    expect(Object.keys(prior.gates!)).toHaveLength(26);
    // the five EMPTY gates (manual at runtime — never a refusal, round 2)
    expect(Object.entries(prior.gates!).filter(([, g]) => g.parse_error).map(([k]) => k)).toEqual(['M820-01 REQ-04', 'M820-04 REQ-24', 'M820-10 REQ-11', 'M820-10 REQ-13', 'M820-10 REQ-14']);
    // REQ-07 sits on M820-04 where none of its three symbols resolves (pending on every project) — the G-3 observation
    for (const s of prior.gates!['M820-04 REQ-07'].symbols) expect(priorRow(`M820-04 ${s}`)).toBeUndefined();
    // G-3 Step 1 parse-shape pin (fix round 1): the staged text is an AND of two parenthesised IF guards — prod's REQ-07 shape;
    // without the parentheses the parser folds the second IF into the first guard's body and never enforces it
    const staged = parseCondition("(IF oberschwellig_code == 1 THEN threshold_status == 'oberschwellig') AND (IF oberschwellig_code == 0 THEN threshold_status == 'unterschwellig')")!;
    expect(staged.kind).toBe('and');
    expect(staged.kind === 'and' && [staged.left.kind, staged.right.kind]).toEqual(['guard', 'guard']);
    const unparenthesised = parseCondition("IF oberschwellig_code == 1 THEN threshold_status == 'oberschwellig' AND IF oberschwellig_code == 0 THEN threshold_status == 'unterschwellig'")!;
    expect(unparenthesised.kind).toBe('guard'); // the defect the ruling caught
    expect(prior.gates!['M820-04 REQ-07'].condition.startsWith('(IF ')).toBe(true);
  });

  it('drivers resolve where the twins sit (capture): estimated_construction_cost reaches -22 and NOT -13 (the Tab. D.1 pair lives on -22); the fee and the uncertainty reach -09', () => {
    expect(priorRow('M820-01 estimated_construction_cost').consumer_worksheets).toEqual(['M820-09', 'M820-22']);
    expect(priorRow('M820-01 estimated_engineering_fee').consumer_worksheets).toEqual(['M820-09', 'M820-13']);
    expect(priorRow('M820-04 cost_estimate_uncertainty_pct').consumer_worksheets).toEqual(['M820-05', 'M820-09']);
    expect(priorRow('M820-13 liability_insurance_personenschaden').consumer_worksheets).toEqual(['M820-22']);
    expect(priorRow('M820-13 liability_insurance_sonstige').consumer_worksheets).toEqual(['M820-22']);
    expect(FIELD_CONFIGS.filter((e) => e.symbol.startsWith('liability_')).map((e) => e.worksheet)).toEqual(['M820-22', 'M820-22', 'M820-22', 'M820-22']);
    // no stored rows exist for the three upgraded registers (read-only count 2026-09-18: 9 parameters for the standard, none on a register)
    expect(priorRow('M820-03 stakeholder_list').consumer_worksheets).toEqual(['M820-16', 'M820-20']);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no warnings)', () => {
    const { up, down, warnings } = emitFieldConfigSql('m820_1', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('m820_1', '20260917101810');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(3);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(43);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
