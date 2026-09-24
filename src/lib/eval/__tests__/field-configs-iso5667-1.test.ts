/**
 * Plan 3 Task 28 — ISO-5667-1 field configs: every entry parses through the zod contract, the
 * key-string equality rule (G-A3) holds against the captured prod enums and the seeded tables, no
 * register column is keyed `id` (amendment P) or shadows a prod symbol of its worksheet, every
 * driver resolves on its rule's worksheet, D-1 is honoured on every existing enum, the `K_table`
 * lookup_fill binds the seeded table with a number data_type (amendment C), and every rule that went
 * to a STAGED G-/C-block is asserted THROUGH THE EMITTER'S OWN GUARDS (refused, not merely claimed).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY,
  WATER_SITUATION_TOKENS, COOLING_TOKENS, VARIABILITY_TOKENS, TARGET_STATISTIC_TOKENS,
  FLOW_CHARACTER_TOKENS, FLOW_ASPECT_TOKENS, FLOW_METHOD_TOKENS, FLOW_MODE_TOKENS, PROGRAMME_TYPE_TOKENS,
  SLUDGE_PIPE_OK_EXPR, METHOD_OK_EXPR,
} from '../field-configs/iso5667_1';
import type { FieldConfigEntry, PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { evalCondition, parseCondition, parseNumeric } from '@/lib/expr';
import { s164KAsTable, s21AsTable, s1212AsTable } from '../regulation-tables-seed-iso5667_1';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/iso5667_1.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const STD = 'ISO-5667-1';
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prodSymbols = (ws: string) => Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1));
const rule = (ws: string, sym: string, visible_when: string, widget: FieldConfigEntry['widget'] = 'scalar'): FieldConfigEntry =>
  ({ standard: STD, worksheet: ws, symbol: sym, widget, ui_config: null, visible_when, verification_quote: 'q' });
const refusal = (e: FieldConfigEntry): string => {
  try { emitFieldConfigSql('iso5667_1', [e], [], prior); return 'ACCEPTED'; } catch (err) { return (err as Error).message; }
};

describe('ISO-5667-1 field configs (Plan 3 Task 28)', () => {
  it('every entry parses; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules; no register column keyed `id` (amendment P) or shadowing a prod symbol of its worksheet', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      if (e.widget === 'register') {
        const syms = prodSymbols(e.worksheet);
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          expect(c.key, `${e.symbol}.${c.key}`).not.toBe('id');
          expect(syms, `${e.symbol}.${c.key} shadows a prod symbol of ${e.worksheet}`).not.toContain(c.key);
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 25 entries (15 create, 10 update), four registers, one lookup_fill twin, ten visible_when rules', () => {
    expect(FIELD_CONFIGS).toHaveLength(25);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(15);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual([
      'ISO-5667-1-04 volatiles_minimal_suction',
      'ISO-5667-1-05 cooling_system_type',
      'ISO-5667-1-05 manhole_sampled_without_entry',
      'ISO-5667-1-05 composite_multipoint_sample',
      'ISO-5667-1-05 upstream_downstream_sampling',
      'ISO-5667-1-06 control_limits',
      'ISO-5667-1-07 confidence_level',
      'ISO-5667-1-08 flow_direction',
      'ISO-5667-1-08 flow_velocity',
      'ISO-5667-1-08 discharge_rate',
    ]);
    expect(FIELD_CONFIGS.filter((e) => e.widget === 'register').map((e) => e.symbol)).toEqual(['determinands', 'sites_1', 'historical_results', 'flow_measurements']);
    expect(FIELD_CONFIGS.filter((e) => e.widget === 'lookup_fill').map((e) => e.symbol)).toEqual(['K_table']);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.symbol} ← ${e.visible_when}`)).toEqual([
      "volatiles_minimal_suction ← determinand_volatile == true",
      "cooling_system_type ← water_situation_type == 'cooling_system'",
      "manhole_sampled_without_entry ← water_situation_type == 'commercial_effluent'",
      "composite_multipoint_sample ← water_situation_type == 'wastewater'",
      "upstream_downstream_sampling ← water_situation_type == 'river_stream'",
      "control_limits ← programme_type == 'quality_control'",
      "sampling_time_note ← variability_profile == 'wide_rapid'",
      "flow_direction ← flow_aspect == 'direction'",
      "flow_velocity ← flow_aspect IN {'velocity', 'discharge'}",
      "discharge_rate ← flow_aspect == 'discharge'",
    ]);
  });

  it('D-1: every entry on an EXISTING enum field ships `keep_prod`; the exported token lists equal prod byte-for-byte; the brief-named tokens `cyclic` / `heterogeneous` / `sewer` do NOT exist in prod', () => {
    for (const e of FIELD_CONFIGS) {
      if (e.create) continue;
      const pr = priorRow(`${e.worksheet} ${e.symbol}`);
      if (pr?.enum_values != null) expect(e.enum_values, `${e.symbol} D-1`).toBe('keep_prod');
    }
    expect([...WATER_SITUATION_TOKENS]).toEqual(enumValues('ISO-5667-1-05 water_situation_type'));
    expect([...COOLING_TOKENS]).toEqual(enumValues('ISO-5667-1-05 cooling_system_type'));
    expect([...VARIABILITY_TOKENS]).toEqual(enumValues('ISO-5667-1-02 variability_profile'));
    expect([...TARGET_STATISTIC_TOKENS]).toEqual(enumValues('ISO-5667-1-06 target_statistic'));
    expect([...FLOW_CHARACTER_TOKENS]).toEqual(enumValues('ISO-5667-1-04 flow_character'));
    expect([...FLOW_ASPECT_TOKENS]).toEqual(enumValues('ISO-5667-1-08 flow_aspect'));
    expect([...FLOW_METHOD_TOKENS]).toEqual(enumValues('ISO-5667-1-08 flow_measurement_method'));
    expect([...FLOW_MODE_TOKENS]).toEqual(enumValues('ISO-5667-1-08 flow_measurement_mode'));
    expect([...PROGRAMME_TYPE_TOKENS]).toEqual(enumValues('ISO-5667-1-06 programme_type'));
    // the three tokens the brief named and prod does not have (recorded with the failing greps in the report)
    expect(VARIABILITY_TOKENS).not.toContain('cyclic');
    expect(FLOW_CHARACTER_TOKENS).not.toContain('heterogeneous');
    expect(WATER_SITUATION_TOKENS).not.toContain('sewer');
  });

  it('G-A3: every register enum column and every table key equals the prod token set; the S21 / S12_1_2 lookups in the row exprs name seeded tables and columns', () => {
    const sites = registerCfg('ISO-5667-1-05', 'sites_1');
    expect(sites.columns.find((c) => c.key === 'situation_type')!.options).toEqual([...WATER_SITUATION_TOKENS]);
    expect(sites.columns.find((c) => c.key === 'cooling_type')!.options).toEqual([...COOLING_TOKENS]);
    expect(sites.columns.find((c) => c.key === 'flow_character')!.options).toEqual([...FLOW_CHARACTER_TOKENS]);
    expect(sites.columns.find((c) => c.key === 'situation_type')!.discriminator).toBe(true);
    const det = registerCfg('ISO-5667-1-02', 'determinands');
    expect(det.columns.find((c) => c.key === 'variability')!.options).toEqual([...VARIABILITY_TOKENS]);
    expect(det.columns.find((c) => c.key === 'target_statistic')!.options).toEqual([...TARGET_STATISTIC_TOKENS]);
    const flow = registerCfg('ISO-5667-1-08', 'flow_measurements');
    expect(flow.columns.find((c) => c.key === 'aspect')!.options).toEqual([...FLOW_ASPECT_TOKENS]);
    expect(flow.columns.find((c) => c.key === 'method')!.options).toEqual([...FLOW_METHOD_TOKENS]);
    expect(flow.columns.find((c) => c.key === 'mode')!.options).toEqual([...FLOW_MODE_TOKENS]);
    // the S21 keys really are (flow_aspect token, flow_measurement_method token)
    const s21 = s21AsTable();
    for (const r of s21.rows) {
      expect(FLOW_ASPECT_TOKENS, `S21 aspect ${r.keys.aspect}`).toContain(r.keys.aspect);
      expect(FLOW_METHOD_TOKENS, `S21 method ${r.keys.method}`).toContain(r.keys.method);
    }
    // the row exprs read the seeded tables by their real codes and columns
    expect(METHOD_OK_EXPR).toContain("lookup('S21', aspect, method, 'valid')");
    expect(s21.value_columns.map((c) => c.name)).toContain('valid');
    expect(SLUDGE_PIPE_OK_EXPR).toContain("lookup('S12_1_2', 'sludge_pipe', 'min_diameter_mm')");
    expect(s1212AsTable().value_columns.map((c) => c.name)).toContain('min_diameter_mm');
    expect(s1212AsTable().rows.map((r) => r.row_key)).toContain('sludge_pipe');
    // no figure is typed into a row expr — 1 / 0 are the structural verdict values
    expect(SLUDGE_PIPE_OK_EXPR.replace(/if\(|, 1, 0\)/g, '')).not.toMatch(/\b\d+(\.\d+)?\b/);
    expect(METHOD_OK_EXPR.replace(/if\(|, 1, 0\)|== 1|S12_1_2|S21/g, '')).not.toMatch(/\b\d+(\.\d+)?\b/);
  });

  it('the K_table lookup_fill binds S16_4_K on the prod `confidence_level` tokens, role value, data_type number (amendment C); prod `K` is NOT re-bound (amendment J — a locked table would make the required field untypeable)', () => {
    const e = byKey('ISO-5667-1-07', 'K_table');
    expect(e.create!.data_type).toBe('number');
    expect(e.lookup).toEqual({ table_code: 'S16_4_K', edition: '1980', role: 'value', keys: [{ column: 'confidence_level', from_symbol: 'confidence_level' }], value: 'k' });
    const t = s164KAsTable();
    expect(t.key_columns).toEqual(['confidence_level']);
    expect(t.rows.map((r) => r.keys.confidence_level)).toEqual(enumValues('ISO-5667-1-07 confidence_level'));
    expect(t.value_columns.map((c) => c.name)).toContain('k');
    // `K` itself keeps its prod shape — no entry touches it
    expect(FIELD_CONFIGS.find((x) => x.symbol === 'K')).toBeUndefined();
    // and `confidence_level` is only re-widgeted to select_one, never re-optioned
    expect(byKey('ISO-5667-1-07', 'confidence_level').enum_values).toBe('keep_prod');
    expect(byKey('ISO-5667-1-07', 'confidence_level').visible_when).toBeUndefined();
  });

  it('every emitted rule drives off a symbol that resolves on its own worksheet (same worksheet, or inherited via consumer_worksheets)', () => {
    const DRIVER_HOME: Record<string, string> = {
      determinand_volatile: 'ISO-5667-1-04', water_situation_type: 'ISO-5667-1-05',
      programme_type: 'ISO-5667-1-06', variability_profile: 'ISO-5667-1-02', flow_aspect: 'ISO-5667-1-08',
    };
    for (const e of FIELD_CONFIGS) {
      if (!e.visible_when) continue;
      const driver = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(e.visible_when)![1];
      const home = DRIVER_HOME[driver];
      expect(home, `${e.symbol}: unknown driver ${driver}`).toBeDefined();
      if (home === e.worksheet) continue;
      const cons = priorRow(`${home} ${driver}`)?.consumer_worksheets ?? [];
      expect(cons.includes(e.worksheet) || cons.includes('ALL'), `${e.symbol}: ${driver} is not inherited on ${e.worksheet}`).toBe(true);
    }
  });

  it('the rules that went to STAGED are REFUSED by the emitter (asserted, not claimed): G-1 CR-012/013, G-2 CR-016/017/018 + the -08 consumer, G-3 CR-022, C-1 the -07 consumer, and the TRANSITIVE refusal on sigma → Gl.3 n', () => {
    expect(refusal(rule('ISO-5667-1-04', 'pipe_nominal_bore', "flow_character == 'laminar_pipe'")))
      .toBe('ISO-5667-1-04 pipe_nominal_bore: visible_when hides pipe_nominal_bore read by gate CR-012 (block: "pipe_nominal_bore >= 25") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block');
    expect(refusal(rule('ISO-5667-1-04', 'isokinetic_sampling', "flow_character == 'laminar_pipe'", 'attestation')))
      .toBe('ISO-5667-1-04 isokinetic_sampling: visible_when hides isokinetic_sampling read by gate CR-013 (warn: "isokinetic_sampling IS NOT NULL") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block');
    expect(refusal(rule('ISO-5667-1-05', 'groundwater_purged', "water_situation_type == 'groundwater'", 'attestation')))
      .toBe('ISO-5667-1-05 groundwater_purged: visible_when hides groundwater_purged read by gate CR-016 (block: "groundwater_purged IS NOT NULL AND sampling_depth IS NOT NULL") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block');
    expect(refusal(rule('ISO-5667-1-05', 'sampling_depth', "water_situation_type == 'groundwater'")))
      .toBe('ISO-5667-1-05 sampling_depth: visible_when hides sampling_depth read by gate CR-016 (block: "groundwater_purged IS NOT NULL AND sampling_depth IS NOT NULL") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block');
    expect(refusal(rule('ISO-5667-1-05', 'sludge_pipe_diameter', "water_situation_type == 'wastewater_sludge'")))
      .toBe('ISO-5667-1-05 sludge_pipe_diameter: visible_when hides sludge_pipe_diameter read by gate CR-017 (block: "sludge_pipe_diameter >= 50") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block');
    expect(refusal(rule('ISO-5667-1-05', 'automatic_sampler_protection', "water_situation_type == 'stormwater'", 'attestation')))
      .toBe('ISO-5667-1-05 automatic_sampler_protection: visible_when hides automatic_sampler_protection read by gate CR-018 (warn: "automatic_sampler_protection IS NOT NULL") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block');
    // flow_proportional_sampling trips the PRODUCER guard first (consumed by -08); CR-019 also reads it
    expect(refusal(rule('ISO-5667-1-05', 'flow_proportional_sampling', "water_situation_type == 'stormwater'", 'attestation')))
      .toBe('ISO-5667-1-05 flow_proportional_sampling: visible_when on a symbol consumed by another worksheet — hides flow_proportional_sampling (consumed by ISO-5667-1-08) (hiding a producer, or an input of a producer, hides the inherited value; STAGE the consumer edit instead)');
    expect(refusal(rule('ISO-5667-1-06', 'abnormal_frequency_increase', 'abnormal_conditions == true', 'attestation')))
      .toBe('ISO-5667-1-06 abnormal_frequency_increase: visible_when hides abnormal_frequency_increase read by gate CR-022 (warn: "abnormal_frequency_increase IS NOT NULL") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block');
    expect(refusal({ ...rule('ISO-5667-1-06', 'target_statistic', "programme_type == 'quality_characterization'", 'select_one'), enum_values: 'keep_prod' }))
      .toBe('ISO-5667-1-06 target_statistic: visible_when on a symbol consumed by another worksheet — hides target_statistic (consumed by ISO-5667-1-07) (hiding a producer, or an input of a producer, hides the inherited value; STAGE the consumer edit instead)');
    // TRANSITIVE (amendment H): sigma is not consumed itself — it feeds prod equation 3, whose `n` is
    expect(refusal(rule('ISO-5667-1-07', 'sigma', "confidence_level == '95'")))
      .toBe('ISO-5667-1-07 sigma: visible_when on a symbol consumed by another worksheet — hides sigma → Gl.3 n (consumed by ISO-5667-1-06) (hiding a producer, or an input of a producer, hides the inherited value; STAGE the consumer edit instead)');
  });

  it('the committed field-config migration + rollback equal a fresh emit (freshness pin), 15 INSERTs + 10 UPDATEs, no section UPDATE, no gate-guard escape', () => {
    const { up, down, warnings } = emitFieldConfigSql('iso5667_1', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('iso5667_1', '20260917102810');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^INSERT INTO fields /gm) ?? []).length).toBe(15);
    expect((up.match(/^UPDATE fields /gm) ?? []).length).toBe(10);
    expect(up).not.toContain('UPDATE worksheet_sections');
    expect(up).not.toContain('GATE-REFUSAL');
    // amendment J is visible in the migration: `K` is never named as an UPDATE target
    expect(up).not.toMatch(/f\.symbol = 'K'/);
  });

  it('fix round 1 — every staged `IF … THEN` gate body parses, and a COMPOUND body (AND / OR) is PARENTHESISED (amendment M / corpus consistency); parenthesising CR-016 does not change what it evaluates to', () => {
    const staged = readFileSync(join(ROOT, 'scripts/verification/iso5667_1-STAGED-plan3-rulings.sql'), 'utf8');
    // every proposed rewrite in the STAGED file, un-escaped from its SQL string literal
    const conditions = [...staged.matchAll(/^--\s+condition = '(IF .*)',$/gm)].map((m) => m[1].replace(/''/g, "'"));
    expect(conditions).toHaveLength(7);
    for (const c of conditions) {
      expect(parseCondition(c), `does not parse: ${c}`).not.toBeNull();
      const body = c.slice(c.indexOf(' THEN ') + ' THEN '.length);
      const compound = /\s(AND|OR)\s/.test(body.replace(/^\(([\s\S]*)\)$/, '$1'));
      expect(body.startsWith('(') && body.endsWith(')'), `compound body must be parenthesised, simple body must not: ${c}`).toBe(compound);
    }
    // exactly one compound body in this file — CR-016
    expect(conditions.filter((c) => c.includes(' THEN ('))).toEqual([
      "IF water_situation_type == 'groundwater' THEN (groundwater_purged IS NOT NULL AND sampling_depth IS NOT NULL)",
    ]);
    // …and the parentheses are cosmetic: identical verdicts on every state that matters
    const BARE = "IF water_situation_type == 'groundwater' THEN groundwater_purged IS NOT NULL AND sampling_depth IS NOT NULL";
    const PAREN = conditions.find((c) => c.includes(' THEN ('))!;
    const states: Array<[string, Record<string, unknown>]> = [
      ['river_stream (guard false)', { water_situation_type: 'river_stream', groundwater_purged: null, sampling_depth: null }],
      ['groundwater, both null', { water_situation_type: 'groundwater', groundwater_purged: null, sampling_depth: null }],
      ['groundwater, both set', { water_situation_type: 'groundwater', groundwater_purged: true, sampling_depth: 12.5 }],
      ['groundwater, one set', { water_situation_type: 'groundwater', groundwater_purged: true, sampling_depth: null }],
    ];
    const verdicts = states.map(([, values]) => {
      const symbol = (s: string) => (Object.hasOwn(values, s) ? (values[s] as never) : undefined);
      return [evalCondition(BARE, { symbol }), evalCondition(PAREN, { symbol })] as const;
    });
    for (const [i, [a, b]] of verdicts.entries()) expect(b, states[i][0]).toEqual(a);
    expect(verdicts.map(([a]) => a.kind)).toEqual(['pass', 'fail', 'pass', 'fail']);
  });
});
