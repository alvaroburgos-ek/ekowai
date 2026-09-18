/**
 * Plan 3 Task 9 — DWA-M-820-3 field configs: every entry parses through the zod
 * contract, the twelve registers bind the seeded catalogues with the printed
 * item ranges (G-A3 / the prod VR totals), the emitter accepts the module
 * against the captured prior, no rule lands on a consumed producer (the
 * withheld rules ARE refused for the reasons the sign-off blocks give), the
 * capture facts the design rests on are pinned (project_type tokens; the
 * "ALL" consumer list that loadInheritedFields cannot resolve — m820_3-C-1;
 * every existing field consumed; no orphans), and the committed migration
 * equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY, QE_WORKSHEETS, PROJECT_TYPE_TOKENS, RATING_TOKENS, ANNEX_A, ANNEX_B, outputSymbols, registerSymbol, inTeilExpr, rangeCond, SEKTOR_OPTIONS, ANWENDUNGSHINWEIS_OPTIONS,
} from '../field-configs/m820_3';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { m8203SeedTables } from '../regulation-tables-seed-m820_3';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/m820_3.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null; section_id_is_null?: boolean };
const priorRow = (key: string) => (prior as Record<string, Row>)[key];
const fieldKeys = Object.keys(prior).filter((k) => k.includes(' ') && k !== 'sections' && k !== 'equations' && k !== '_meta');
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const table = (code: string) => m8203SeedTables().find((t) => t.table_code === code)!;

describe('DWA-M-820-3 field configs (Plan 3 Task 9)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; every entry is a create', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      expect(e.create, `${e.symbol} is additive`).toBeDefined();
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

  it('counts: 129 created entries — 2 select_many, 12 registers, 115 derived outputs; 126 project_type rules (all on created fields); 0 UPDATE entries; 0 section rules', () => {
    expect(FIELD_CONFIGS).toHaveLength(129);
    expect(FIELD_CONFIGS.filter((e) => !e.create)).toEqual([]);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('select_many')).toEqual(['M8203-01 sektoren', 'M8203-02 anwendungshinweise']);
    expect(byWidget('register')).toEqual(QE_WORKSHEETS.map((w) => `${w.ws} ${registerSymbol(w)}`));
    expect(byWidget('derived')).toHaveLength(12 * 9 + 7);
    expect(byWidget('select_one')).toEqual([]);
    expect(byWidget('lookup_fill')).toEqual([]);
    expect(byWidget('scalar')).toEqual([]);
    const rules = FIELD_CONFIGS.filter((e) => e.visible_when);
    expect(rules).toHaveLength(126); // every created field except projektstopp_code (M8203-24) and the two select_many sets (129 - 3)
    expect(rules.every((e) => e.visible_when === ANNEX_A || e.visible_when === ANNEX_B)).toBe(true);
    expect(FIELD_CONFIGS.filter((e) => !e.visible_when).map((e) => e.symbol)).toEqual(['sektoren', 'anwendungshinweise', 'projektstopp_code']);
    for (const w of QE_WORKSHEETS) {
      const own = FIELD_CONFIGS.filter((e) => e.worksheet === w.ws);
      expect(own, w.ws).toHaveLength(10);
      expect(own.every((e) => e.visible_when === (w.annex === 'A' ? ANNEX_A : ANNEX_B)), w.ws).toBe(true);
      expect(own[0].create!.section_code).toBe('C');
      for (const d of own.slice(1)) expect(d.create!.section_code).toBe('D');
    }
    expect(ANNEX_A).toBe("project_type IN {'gesamtsystem', 'both'}");
    expect(ANNEX_B).toBe("project_type IN {'einzelprojekt', 'both'}");
  });

  it('G-A3: the annex rules use the captured project_type tokens (both, NOT the brief\'s beide); registers bind the seeded catalogues with the printed Nr. ranges; select_many option lists', () => {
    expect(enumValues('M8203-01 project_type')).toEqual([...PROJECT_TYPE_TOKENS]);
    expect([...PROJECT_TYPE_TOKENS]).toEqual(['gesamtsystem', 'einzelprojekt', 'both']);
    for (const w of QE_WORKSHEETS) {
      const cfg = registerCfg(w.ws, registerSymbol(w));
      const keys = cfg.columns.map((c) => c.key);
      expect(keys.slice(0, 6), w.ws).toEqual(['nr', 'kriterium', 'hinweise', 'rating', 'evidence', 'remark']);
      expect(cfg.columns[0]).toMatchObject({ type: 'lookup_key', required: true, lookup: expect.objectContaining({ table_code: w.table }) });
      expect(cfg.columns[1]).toMatchObject({ type: 'lookup_value', lookup: { table_code: w.table, key_column: 'nr', value: 'kriterium' } });
      expect(cfg.columns[2]).toMatchObject({ type: 'lookup_value', lookup: { table_code: w.table, key_column: 'nr', value: 'hinweise' } });
      expect(cfg.columns[3]).toMatchObject({ type: 'enum', required: true, options: [...RATING_TOKENS] });
      expect(cfg.override).toBeUndefined(); // no override block — the catalogue rows are picked, never rewritten (X-1 for additions)
      expect(cfg.footer).toEqual([outputSymbols(w).rated, outputSymbols(w).y, outputSymbols(w).p, outputSymbols(w).n, outputSymbols(w).na, outputSymbols(w).share_y, outputSymbols(w).share_p, outputSymbols(w).share_n, outputSymbols(w).share_na]);
      // the bound table exists with the whole printed catalogue; the worksheet's range is inside it and its size equals the prod VR total
      const t = table(w.table);
      expect(t.rows.map((r) => r.keys.nr)).toEqual(t.rows.map((_, i) => `n${i + 1}`));
      expect(w.from).toBeGreaterThanOrEqual(1);
      expect(w.to).toBeLessThanOrEqual(t.rows.length);
      if (w.split) {
        expect(keys).toHaveLength(7);
        expect(cfg.columns[6]).toMatchObject({ key: 'in_teil', type: 'derived', expr: inTeilExpr(w), display: 'badge' });
        expect(cfg.columns[0].lookup).toEqual({ table_code: w.table, group_by: 'group_label' });
        expect(rangeCond(w, "rating == 'y'")).toBe("rating == 'y' AND in_teil == 1");
      } else {
        expect(keys).toHaveLength(6);
        expect(w.from).toBe(1);
        expect(w.to).toBe(t.rows.length);
        expect(rangeCond(w, "rating == 'y'")).toBe("rating == 'y'");
      }
    }
    // the prod VR totals per worksheet (read in-session) equal the encoded ranges: 15 / 8 / 12 / 3 / 15 / 21 / 19 / 17 / 33 / 34 / 10 / 6
    expect(QE_WORKSHEETS.map((w) => w.to - w.from + 1)).toEqual([15, 8, 12, 3, 15, 21, 19, 17, 33, 34, 10, 6]);
    expect(QE_WORKSHEETS.map((w) => `${w.ws}:${w.table}`)).toEqual(['M8203-07:QE_A1', 'M8203-08:QE_A2', 'M8203-09:QE_A3', 'M8203-10:QE_A4', 'M8203-11:QE_B1', 'M8203-12:QE_B2', 'M8203-13:QE_B2', 'M8203-14:QE_B3', 'M8203-15:QE_B3', 'M8203-16:QE_B4', 'M8203-17:QE_B5', 'M8203-18:QE_B6']);
    expect(SEKTOR_OPTIONS.map((o) => o.label_de)).toEqual(['Wasserwirtschaft', 'Wasserbau', 'Abwasser', 'Abfall']); // L196
    expect(ANWENDUNGSHINWEIS_OPTIONS.map((o) => o.label_de.slice(0, 40))).toEqual([
      'Im konkreten Projekt werden aus den Qual', 'Es wird darauf hingewiesen, dass die ber', 'Die Qualitätselemente unterstützen die B', 'Die vollständige Ablaufstruktur für Proj',
    ]); // L200 / L202 / L204 / L206 without the OCR'd bullet glyph
    expect(byKey('M8203-01', 'sektoren').enum_values).toBe(SEKTOR_OPTIONS);
    expect(byKey('M8203-02', 'anwendungshinweise').enum_values).toBe(ANWENDUNGSHINWEIS_OPTIONS);
    expect(byKey('M8203-01', 'sektoren').create!.data_type).toBe('json');
  });

  it('capture facts the design rests on: every existing field is consumed (no UPDATE rule possible); "ALL" is not a worksheet code (m820_3-C-1); 0 orphans; 0 equations; sections A B C D F J K L M', () => {
    expect(fieldKeys).toHaveLength(250);
    expect(Object.keys(prior.sections ?? {})).toHaveLength(216);
    expect(Object.keys(prior.equations ?? {})).toHaveLength(0);
    expect(fieldKeys.filter((k) => priorRow(k).section_id_is_null)).toEqual([]);
    const unconsumed = fieldKeys.filter((k) => (priorRow(k).consumer_worksheets ?? []).length === 0);
    expect(unconsumed).toEqual(['M8203-24 overall_quality_verdict', 'M8203-24 projektstopp_required', 'M8203-24 signoff_client', 'M8203-24 signoff_engineer']);
    // the driver of every emitted rule is declared for "ALL" — a string loadInheritedFields never matches (code = ANY(consumer_worksheets))
    expect(priorRow('M8203-01 project_type').consumer_worksheets).toEqual(['ALL']);
    expect(priorRow('M8203-01 applicable_lph').consumer_worksheets).toEqual(['ALL']);
    for (const code of ['M8203-07', 'M8203-12', 'M8203-22', 'M8203-24']) expect(priorRow('M8203-01 project_type').consumer_worksheets).not.toContain(code);
    // the QE count inputs and the Phasenziele are consumed producers (why the count twins are created and D-1 is staged)
    for (const w of QE_WORKSHEETS) for (const s of ['y', 'p', 'n', 'na', 'total']) expect(priorRow(`${w.ws} ${w.prefix}_items_${s}`).consumer_worksheets, `${w.prefix}_items_${s}`).toContain(w.annex === 'A' ? 'M8203-22' : 'M8203-23');
    for (const ws of ['M8203-04', 'M8203-05', 'M8203-06', 'M8203-11', 'M8203-12', 'M8203-14', 'M8203-16', 'M8203-17', 'M8203-18']) {
      const pz = fieldKeys.filter((k) => k.startsWith(`${ws} pz_`));
      expect(pz.length, ws).toBeGreaterThan(0);
      for (const k of pz) expect(priorRow(k).consumer_worksheets, k).toContain('M8203-24');
    }
    expect(fieldKeys.filter((k) => / pz_/.test(k))).toHaveLength(67);
    for (const k of fieldKeys.filter((k) => / pz_/.test(k))) expect(enumValues(k)).toEqual(['erreicht', 'teilweise_erreicht', 'nicht_erreicht', 'nicht_zutreffend']);
    for (const ws of ['M8203-07', 'M8203-22', 'M8203-24']) expect(['A', 'B', 'C', 'D', 'F', 'J', 'K', 'L', 'M'].map((c) => `${ws} ${c}` in prior.sections!)).toEqual([true, true, true, true, true, true, true, true, true]);
  });

  it('visibility never lands on a consumed producer; the brief\'s rules on EXISTING fields / sections ARE refused by the emitter (C-2 / C-3 / C-4); created fields sit in captured sections and do not exist in prod', () => {
    for (const e of FIELD_CONFIGS) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
      expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.worksheet} ${e.symbol} must not exist in prod`).toBeUndefined();
      if (e.visible_when) expect(producerChain(prior, e.worksheet, e.symbol, { skipDirect: true }), `${e.worksheet} ${e.symbol}`).toBeNull();
    }
    const refusedField = (ws: string, sym: string, rule: string) => () => emitFieldConfigSql('m820_3', [{ standard: 'DWA-M-820-3', worksheet: ws, symbol: sym, widget: 'scalar', ui_config: null, visible_when: rule, verification_quote: 'x' }], [], prior);
    const refusedSection = (ws: string, code: string, rule: string) => () => emitFieldConfigSql('m820_3', [], [{ standard: 'DWA-M-820-3', worksheet: ws, section_code: code, visible_when: rule, verification_quote: 'x' }], prior);
    // C-2 / C-3: the Phasenziel and QE sections of M8203-04 … -18 hold consumed producers
    for (const ws of ['M8203-04', 'M8203-05', 'M8203-06']) expect(refusedSection(ws, 'C', ANNEX_A), ws).toThrow(/consumed by/);
    for (const ws of ['M8203-07', 'M8203-08', 'M8203-09', 'M8203-10']) expect(refusedSection(ws, 'F', ANNEX_A), ws).toThrow(/consumed by/);
    for (const ws of ['M8203-11', 'M8203-12', 'M8203-14', 'M8203-16', 'M8203-17', 'M8203-18']) expect(refusedSection(ws, 'B', ANNEX_B), ws).toThrow(/consumed by/);
    for (const ws of ['M8203-11', 'M8203-12', 'M8203-13', 'M8203-14', 'M8203-15', 'M8203-16', 'M8203-17', 'M8203-18']) expect(refusedSection(ws, 'F', ANNEX_B), ws).toThrow(/consumed by/);
    // the field-free sections would be accepted but are not observable (Task 8 lesson) — pinned: 0 captured fields there
    for (const ws of ['M8203-07', 'M8203-12', 'M8203-22']) for (const code of ['A', 'D', 'J', 'K', 'L', 'M']) expect(fieldKeys.filter((k) => k.startsWith(`${ws} `) && priorRow(k).section_code === code), `${ws} ${code}`).toEqual([]);
    // C-4: the BIM block (§7.2.2) — every M8203-19 boolean is consumed by M8203-24
    for (const sym of ['aia_available', 'bap_defined', 'cde_platform_defined', 'digital_twin_after_project']) expect(refusedField('M8203-19', sym, 'bim_project_definition_complete == true'), sym).toThrow(/consumed by/);
    // the brief's projektstopp_review_triggered stays visible (consumed by -24 anyway)
    expect(refusedField('M8203-02', 'projektstopp_review_triggered', 'projektstopp_code == 1')).toThrow(/consumed by/);
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'projektstopp_review_triggered')).toBeUndefined();
    // the existing count fields are never touched (D-1 staged)
    for (const w of QE_WORKSHEETS) for (const s of ['y', 'p', 'n', 'na', 'total', 'fulfilment_pct']) expect(FIELD_CONFIGS.find((e) => e.symbol === `${w.prefix}_items_${s}` || e.symbol === `${w.prefix}_${s}`), `${w.prefix} ${s}`).toBeUndefined();
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'bild1_schritte')).toBeUndefined(); // Bild 1 is an image (U-2)
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'applicable_lph')).toBeUndefined(); // Plan-1 config untouched (I-1 pending pair)
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    const { up, down } = emitFieldConfigSql('m820_3', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('m820_3', '20260917100910');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(0);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(129);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(down).not.toMatch(/worksheet_sections/);
    expect((down.match(/^DELETE FROM fields/gm) ?? []).length).toBe(129);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
