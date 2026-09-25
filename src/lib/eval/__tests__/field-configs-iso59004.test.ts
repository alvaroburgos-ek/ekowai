/**
 * Plan 3 Task 29 — ISO-59004 field configs: every entry parses through the zod contract, the enum token
 * lists equal the captured prod enums byte-for-byte (D-1 / G-A3), no register column is keyed `id`
 * (amendment P) or shadows a prod symbol of its own worksheet, every driver resolves on its rule's
 * worksheet, and every rule that went to a STAGED G-/J-block is asserted THROUGH THE EMITTER'S OWN
 * GUARDS (refused or accepted — never merely claimed).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY,
  ACTION_TOKENS, ACTION_LABELS, CATEGORY_TOKENS, CATEGORY_LABELS, PRINCIPLE_TOKENS, PRINCIPLE_LABELS,
  FEASIBILITY_TOKENS, FEASIBILITY_LABELS, STAGE_TOKENS, LEVEL_TOKENS, CIRCULARITY_ASPECTS,
  PRELIMINARY_EXPR, NOT_IN_PRINTED_ORDER, MULTI_LEVEL,
  WITHHELD_STAGE_RULES, WITHHELD_04_D1_FORMULA, WITHHELD_04_D1_NESTED_FORM, WITHHELD_LIFE_CYCLE_NOTE_RULE, WITHHELD_LIFE_CYCLE_NOTE_ALTERNATIVE,
} from '../field-configs/iso59004';
import type { FieldConfigEntry, PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig, type SelectManyUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { s52AsTable } from '../regulation-tables-seed-iso59004';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/iso59004.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const STD = 'ISO-59004';
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const enumLabels = (key: string): Record<string, string> =>
  Object.fromEntries((priorRow(key).enum_values as Array<{ value: string; label_de: string }>).map((e) => [e.value, e.label_de]));
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const selectManyCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'select_many', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as SelectManyUiConfig;
const prodSymbols = (ws: string) => Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1));
const rule = (ws: string, sym: string, visible_when: string): FieldConfigEntry =>
  ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar', ui_config: null, visible_when, verification_quote: 'q', enum_values: priorRow(`${ws} ${sym}`)?.enum_values != null ? 'keep_prod' : undefined });
const refusal = (e: FieldConfigEntry): string => {
  try { emitFieldConfigSql('iso59004', [e], [], prior); return 'ACCEPTED'; } catch (err) { return (err as Error).message; }
};

describe('ISO-59004 field configs (Plan 3 Task 29)', () => {
  it('every entry parses; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules; no register column keyed `id` (amendment P) or shadowing a prod symbol of its worksheet', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      // iso59004-U-2: no watermark artefact ever reaches a rendered string
      expect(e.verification_quote, `${e.symbol} quote watermark`).not.toMatch(/ (et|oj|Pr|ar oc|ai n|or m) /);
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

  it('counts: 20 entries (14 create, 6 update), three registers, two select_many checklists, NO lookup_fill (iso59004-U-1), exactly two visible_when rules', () => {
    expect(FIELD_CONFIGS).toHaveLength(20);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(14);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual([
      'ISO-59004-04 selected_principle',
      'ISO-59004-05 selected_action',
      'ISO-59004-05 action_category',
      'ISO-59004-06 implementation_stage',
      'ISO-59004-06 implementation_level',
      'ISO-59004-06 feasibility_dimension',
    ]);
    expect(FIELD_CONFIGS.filter((e) => e.widget === 'register').map((e) => e.symbol)).toEqual(['actions', 'goals', 'indicators_59004']);
    expect(FIELD_CONFIGS.filter((e) => e.widget === 'select_many').map((e) => e.symbol)).toEqual(['circularity_aspects', 'principles']);
    expect(FIELD_CONFIGS.filter((e) => e.widget === 'lookup_fill')).toEqual([]);
    expect(FIELD_CONFIGS.filter((e) => e.lookup)).toEqual([]);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.symbol} ← ${e.visible_when}`)).toEqual([
      'life_cycle_justification ← repair_before_remanufacture_before_recycle == false',
      'level_relationships ← operates_across_multiple_levels == true',
    ]);
    expect(NOT_IN_PRINTED_ORDER).toBe('repair_before_remanufacture_before_recycle == false');
    expect(MULTI_LEVEL).toBe('operates_across_multiple_levels == true');
  });

  it('D-1 / G-A3: every entry on an EXISTING enum field ships `keep_prod`; the exported token lists AND labels equal prod byte-for-byte; the brief-named token `recover` does NOT exist in prod', () => {
    for (const e of FIELD_CONFIGS) {
      if (e.create) continue;
      const pr = priorRow(`${e.worksheet} ${e.symbol}`);
      if (pr?.enum_values != null) expect(e.enum_values, `${e.symbol} D-1`).toBe('keep_prod');
    }
    expect([...ACTION_TOKENS]).toEqual(enumValues('ISO-59004-05 selected_action'));
    expect(ACTION_LABELS).toEqual(enumLabels('ISO-59004-05 selected_action'));
    expect([...CATEGORY_TOKENS]).toEqual(enumValues('ISO-59004-05 action_category'));
    expect([...PRINCIPLE_TOKENS]).toEqual(enumValues('ISO-59004-04 selected_principle'));
    expect(PRINCIPLE_LABELS).toEqual(enumLabels('ISO-59004-04 selected_principle'));
    // CATEGORY_LABELS / FEASIBILITY_LABELS only APPEND the clause number to the prod label — the German
    // part is prod's own cell byte-for-byte (prod stores every ISO-59004 label ASCII-transliterated).
    const catProd = enumLabels('ISO-59004-05 action_category');
    for (const t of CATEGORY_TOKENS) expect(CATEGORY_LABELS[t], `${t} label provenance`).toBe(`${catProd[t]} (§6.${CATEGORY_TOKENS.indexOf(t) + 2})`);
    expect(FEASIBILITY_LABELS).toEqual(enumLabels('ISO-59004-06 feasibility_dimension'));
    // …and NO string this task AUTHORED is ASCII-transliterated German (fix round 1)
    const authored = FIELD_CONFIGS.flatMap((e) => [
      e.create?.label_de, e.create?.description,
      ...(e.ui_config ? Object.entries(e.ui_config as Record<string, unknown>).filter(([k]) => ['title', 'subtitle', 'note', 'add_label'].includes(k)).map(([, v]) => String(v)) : []),
      ...(e.widget === 'register' ? (e.ui_config as RegisterUiConfig).columns.flatMap((c) => [c.label, c.aria_label, ...Object.values(c.value_labels ?? {})]) : []),
    ].filter((x): x is string => typeof x === 'string'));
    for (const s of authored) {
      expect(s, `transliterated German: ${s}`).not.toMatch(/(Grundsaetze|Massnahme|Zirkularitaets|Wertschoepfung|Begruendung|Gewaehlte|vorlaeufig|fuenf|ueber|zaehlt|fuer)w*/i);
    }
    expect([...FEASIBILITY_TOKENS]).toEqual(enumValues('ISO-59004-06 feasibility_dimension'));
    expect([...STAGE_TOKENS]).toEqual(enumValues('ISO-59004-06 implementation_stage'));
    expect([...LEVEL_TOKENS]).toEqual(enumValues('ISO-59004-06 implementation_level'));
    // iso59004-J-3 / J-6 — the two tokens the brief named and prod does not have
    expect(ACTION_TOKENS).not.toContain('recover');
    expect(ACTION_TOKENS).toContain('recover_energy');
    expect(LEVEL_TOKENS.some((t) => /multi|more_than_one|across/.test(t))).toBe(false);
  });

  it('the two created checklists: `principles` carries the six prod tokens WITH prod labels (D-9) and equals the seeded S5_2 keys; `circularity_aspects` carries the five printed §3.6.1 EXAMPLE aspects (U-3, allow_custom)', () => {
    const p = byKey('ISO-59004-04', 'principles');
    expect(p.create!.data_type).toBe('json');
    expect(p.enum_values).toEqual(PRINCIPLE_TOKENS.map((t, i) => ({ value: t, label_de: PRINCIPLE_LABELS[t], order_index: i + 1 })));
    expect(selectManyCfg('ISO-59004-04', 'principles').groups![0].options).toEqual([...PRINCIPLE_TOKENS]);
    // the checklist's options ARE the seeded §5.2 rows, one for one, in printed order
    expect(s52AsTable().rows.map((r) => r.row_key)).toEqual([...PRINCIPLE_TOKENS]);
    // …and each seeded printed title is the prod option's English label
    const labelEn = Object.fromEntries((priorRow('ISO-59004-04 selected_principle').enum_values as Array<{ value: string; label_en: string }>).map((e) => [e.value, e.label_en]));
    for (const r of s52AsTable().rows) expect(labelEn[r.row_key], `S5_2 ${r.row_key} title`).toBe(r.values.title);

    const a = byKey('ISO-59004-02', 'circularity_aspects');
    expect(a.create!.data_type).toBe('json');
    expect((a.enum_values as Array<{ value: string }>).map((e) => e.value)).toEqual(CIRCULARITY_ASPECTS.map((c) => c.value));
    expect(CIRCULARITY_ASPECTS.map((c) => c.value)).toEqual(['durability', 'recyclability', 'reusability', 'repairability', 'recoverability']);
    expect(selectManyCfg('ISO-59004-02', 'circularity_aspects').allow_custom).toBe(true);
    // the existing free-text field is NOT touched (iso59004-D-10)
    expect(FIELD_CONFIGS.find((e) => e.worksheet === 'ISO-59004-02' && e.symbol === 'circularity_aspect')).toBeUndefined();
    // …and `defined_term` is not touched at all (iso59004-S-1 is STAGED, never emitted)
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'defined_term')).toBeUndefined();
  });

  it('the `actions` register: prod tokens on both enum columns, the discriminator, the §6.1 badge expr with no typed figure, and NO lookup column (Table 1 unseeded — iso59004-U-1)', () => {
    const cfg = registerCfg('ISO-59004-05', 'actions');
    const col = (k: string) => cfg.columns.find((c) => c.key === k)!;
    expect(cfg.columns.map((c) => c.key)).toEqual(['action', 'category', 'feasibility_dimensions', 'pilot', 'value_creation_model', 'life_cycle_note', 'preliminary']);
    expect(col('action').options).toEqual([...ACTION_TOKENS]);
    expect(col('action').option_labels).toEqual(ACTION_LABELS);
    expect(col('action').discriminator).toBe(true);
    expect(col('action').required).toBe(true);
    expect(col('category').options).toEqual([...CATEGORY_TOKENS]);
    expect(col('category').type).toBe('enum');
    // iso59004-U-1: category is typed by the engineer — no lookup_key / lookup_value anywhere
    expect(cfg.columns.filter((c) => c.type === 'lookup_key' || c.type === 'lookup_value')).toEqual([]);
    expect(cfg.columns.some((c) => c.lookup)).toBe(false);
    // iso59004-I-1: the six §7.4.5 dimensions are a datalist on a TEXT column (no multi-select column type)
    expect(col('feasibility_dimensions').type).toBe('text');
    expect(col('feasibility_dimensions').datalist).toHaveLength(FEASIBILITY_TOKENS.length);
    // iso59004-J-3: the life-cycle note is ALWAYS visible
    expect(col('life_cycle_note').visible_when).toBeUndefined();
    expect(WITHHELD_LIFE_CYCLE_NOTE_RULE).toBe('action IN {recycle, recover, re_mine}');
    expect(WITHHELD_LIFE_CYCLE_NOTE_ALTERNATIVE).toBe("action IN {'repair', 'remanufacture', 'recycle'}");
    expect(parseCondition(WITHHELD_LIFE_CYCLE_NOTE_ALTERNATIVE)).not.toBeNull();
    // §6.1 badge: only the two printed preliminary actions, 1 / 0 the structural verdict values
    expect(PRELIMINARY_EXPR).toBe("if(action == 'refuse' OR action == 'rethink', 1, 0)");
    expect(parseNumeric(PRELIMINARY_EXPR).ok).toBe(true);
    expect(PRELIMINARY_EXPR.replace(/if\(|, 1, 0\)/g, '')).not.toMatch(/\b\d+(\.\d+)?\b/);
    expect(cfg.footer).toEqual(['actions_count', 'refuse_rethink_first', 'pilot_actions_count']);
  });

  it('the `goals` and `indicators_59004` registers: required key column, footers, no typed figure, no column shadowing a -06 prod symbol', () => {
    const g = registerCfg('ISO-59004-06', 'goals');
    expect(g.columns.map((c) => c.key)).toEqual(['goal', 'intermediate_target', 'year', 'indicator']);
    expect(g.columns.find((c) => c.key === 'goal')!.required).toBe(true);
    expect(g.footer).toEqual(['goals_count', 'goals_with_targets']);
    const i = registerCfg('ISO-59004-06', 'indicators_59004');
    expect(i.columns.map((c) => c.key)).toEqual(['indicator', 'baseline', 'target']);
    expect(i.columns.find((c) => c.key === 'indicator')!.required).toBe(true);
    expect(i.footer).toEqual(['indicators_59004_count']);
    // amendment K: every existing prod scalar the registers twin is LEFT ALONE by this module
    for (const sym of ['ce_goals', 'selected_circularity_indicator', 'value_creation_model', 'pilot_project', 'life_cycle_perspective_applied', 'preliminary_action_refuse_rethink', 'all_principles_considered', 'circularity_aspect'])
      expect(FIELD_CONFIGS.find((e) => e.symbol === sym), `${sym} must stay untouched`).toBeUndefined();
  });

  it('every emitted rule drives off a symbol that resolves on its own worksheet', () => {
    const DRIVER_HOME: Record<string, string> = {
      repair_before_remanufacture_before_recycle: 'ISO-59004-05',
      operates_across_multiple_levels: 'ISO-59004-06',
    };
    for (const e of FIELD_CONFIGS) {
      if (!e.visible_when) continue;
      const driver = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(e.visible_when)![1];
      const home = DRIVER_HOME[driver];
      expect(home, `${e.symbol}: unknown driver ${driver}`).toBe(e.worksheet);
    }
    // the second driver is CREATED by this task on the same worksheet as its dependent
    expect(byKey('ISO-59004-06', 'operates_across_multiple_levels').create!.data_type).toBe('boolean');
    expect(byKey('ISO-59004-06', 'operates_across_multiple_levels').create!.section_code).toBe('B');
    expect(byKey('ISO-59004-06', 'level_relationships').create!.section_code).toBe('B');
  });

  it('iso59004-J-4: the eleven `implementation_stage` hides are asserted THROUGH the emitter — eight REFUSED by the gate-aware guard, three would be ACCEPTED and are withheld on the printed §7.1.4 NOTE alone; none of them is in FIELD_CONFIGS', () => {
    expect(WITHHELD_STAGE_RULES).toHaveLength(11);
    for (const w of WITHHELD_STAGE_RULES) {
      const msg = refusal(rule(w.worksheet, w.symbol, w.visible_when));
      if (w.expect_refused) {
        expect(msg, `${w.symbol} must be refused`).not.toBe('ACCEPTED');
        expect(msg, `${w.symbol} gate`).toContain(`gate ${w.gate}`);
        expect(msg).toContain('STAGE as a G-block');
      } else {
        expect(msg, `${w.symbol} would be accepted`).toBe('ACCEPTED');
        expect(w.gate).toBeNull();
      }
      // and NO emitted entry for that symbol carries a visible_when (the three drivers are re-widgeted only)
      expect(FIELD_CONFIGS.find((e) => e.worksheet === w.worksheet && e.symbol === w.symbol)?.visible_when ?? null, `${w.symbol} must not be hidden`).toBeNull();
    }
    expect(WITHHELD_STAGE_RULES.filter((w) => w.expect_refused)).toHaveLength(8);
    // every proposed driver literal is a real prod stage token
    for (const w of WITHHELD_STAGE_RULES) expect(STAGE_TOKENS).toContain(/'([^']+)'/.exec(w.visible_when)![1]);
  });

  it('iso59004-F-1 UNBLOCKED by wave A: the brief\'s AND-chain of contains() now parses — and the equation is STILL not emitted (that needs the owner\'s ratification, not an engine fix)', () => {
    // The formula string itself is unchanged and stays the regression fixture.
    expect(WITHHELD_04_D1_FORMULA).toBe(
      "all_principles_considered_code = if(contains(principles, 'systems_thinking') AND contains(principles, 'value_creation') AND contains(principles, 'value_sharing') AND contains(principles, 'resource_stewardship') AND contains(principles, 'resource_traceability') AND contains(principles, 'ecosystem_resilience'), 1, 0)",
    );
    // This assertion used to read `{ ok: false, message: 'Ausdruck erwartet.' }` — the parser
    // refused an AND-chain of calls (iso59004-I-2). Plan 3 final wave A defect 3 fixed that, so
    // the pin now records the capability rather than the gap; the FIX was right, not the pin.
    const rhs = (f: string) => f.replace(/^[a-z_]+ = /, '');
    expect(parseNumeric(rhs(WITHHELD_04_D1_FORMULA)).ok).toBe(true);
    expect(parseNumeric("if(contains(principles, 'systems_thinking'), 1, 0)").ok).toBe(true);
    expect(parseNumeric(rhs(WITHHELD_04_D1_NESTED_FORM)).ok).toBe(true);
    expect(WITHHELD_04_D1_NESTED_FORM).toContain("if(contains(principles, 'ecosystem_resilience'), 1, 0)");
    // The ENCODING is untouched by the engine wave: no field config was added for the output.
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'all_principles_considered_code')).toBeUndefined();
  });

  it('the committed field-config migration + rollback equal a fresh emit (freshness pin), 14 INSERTs + 6 UPDATEs, no section UPDATE, no gate-guard escape', () => {
    const { up, down, warnings } = emitFieldConfigSql('iso59004', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('iso59004', '20260917102910');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^INSERT INTO fields /gm) ?? []).length).toBe(14);
    expect((up.match(/^UPDATE fields /gm) ?? []).length).toBe(6);
    expect(up).not.toContain('UPDATE worksheet_sections');
    expect(up).not.toContain('GATE-REFUSAL');
    // D-1 is visible in the migration: no UPDATE writes enum_values on an existing enum field
    expect(up).not.toMatch(/^UPDATE fields f SET [^;]*enum_values/m);
    // iso59004-S-1 / U-1: `defined_term` is never named, and no lookup is ever written
    expect(up).not.toMatch(/f\.symbol = 'defined_term'/);
    expect(up).not.toContain("'lookup_fill'");
  });
  it('sign-off C-2 (2026-09-25): no ui_config note claims the engine limit final wave A removed; the completeness code is named as not encoded yet, decided on the sheet (iso59004-F-1)', () => {
    const notes = JSON.stringify(FIELD_CONFIGS.map((e) => e.ui_config ?? null));
    expect(notes).not.toMatch(/nicht materialisierbar|liest keine Checklisten|erreicht den Motor nicht/i);
    expect(notes.split('noch nicht codiert — Entscheidung auf dem Sign-off-Bogen (iso59004-F-1)').length - 1).toBe(1);
  });
});
