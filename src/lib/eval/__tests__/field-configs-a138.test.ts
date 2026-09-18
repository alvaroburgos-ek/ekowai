/**
 * Plan 3 Task 1 — DWA-A-138-1 field configs: every entry parses through the
 * zod contract, the key-string equality rule (G-A3) holds against the captured
 * prod enums, the emitter accepts the module against the captured prior, and
 * the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY } from '../field-configs/a138';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig } from '../field-config';
import { parseCondition } from '@/lib/expr';
import { tab5AsTable, tab7AsTable, tab8AsTable, tab11AsTable, tab14AsTable, s642QvsAsTable, TAB5_BK_TOKENS } from '../regulation-tables-seed-a138';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/a138.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const enumValues = (key: string): string[] => ((prior as Record<string, { enum_values?: unknown }>)[key]?.enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;

describe('DWA-A-138-1 field configs (Plan 3 Task 1)', () => {
  it('every entry parses through parseFieldConfig; visible_when parses; create descriptions carry the rollback selector', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
    }
    for (const s of SECTION_VISIBILITY) expect(parseCondition(s.visible_when), `${s.worksheet} ${s.section_code}`).not.toBeNull();
  });

  it('counts: 15 field entries (12 create, 3 update), widgets by kind, 49 section rules over A138-16…22 (k_f_FS + A138-20 B refused by the transitive guard, fix round 1)', () => {
    expect(FIELD_CONFIGS).toHaveLength(15);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(12);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('lookup_fill')).toEqual(['A138-06 belastungskategorie', 'A138-06 a138_tier', 'A138-06 eta_afs63_required', 'A138-06 eta_geloest_required']);
    expect(byWidget('select_one')).toEqual(['A138-08 schutzkategorie', 'A138-18 schuettmaterial']);
    expect(byWidget('register')).toEqual(['A138-05 kf_test_sites', 'A138-05 soil_layers']);
    expect(byWidget('derived')).toEqual(['A138-08 n_limit', 'A138-05 k_f_sites_min', 'A138-05 k_f_layer_min', 'A138-02 feasibility_code', 'A138-26 A_C_s_flood']);
    // k_f_FS (A138-21) and A138-20 B were refused by the TRANSITIVE producer guard (Task 3 fix round 1): k_f_FS → Gl.40 h_S, Q_Dr_max/Q_Dr_min → Gl.33 Q_Dr — STAGED a138-C-6 / C-7
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual(['A138-21 A_S_FS', 'A138-20 n_R_MRS']);
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'k_f_FS')).toBeUndefined();
    expect(SECTION_VISIBILITY.find((s) => s.worksheet === 'A138-20' && s.section_code === 'B')).toBeUndefined();
    expect(SECTION_VISIBILITY).toHaveLength(49);
    expect(new Set(SECTION_VISIBILITY.map((s) => s.worksheet))).toEqual(new Set(['A138-16', 'A138-17', 'A138-18', 'A138-19', 'A138-20', 'A138-21', 'A138-22']));
  });

  it('G-A3 key-string equality: table keys equal the driving enum value strings exactly', () => {
    // TAB5 keys ⊆ prod flaechengruppe enum; bk cells ∈ prod belastungskategorie enum (the lookup_fill writes an enum value, I-1)
    expect(tab5AsTable().rows.map((r) => r.keys.flaechengruppe)).toEqual(enumValues('A138-06 flaechengruppe'));
    expect(enumValues('A138-06 belastungskategorie')).toEqual([...TAB5_BK_TOKENS]);
    for (const r of tab5AsTable().rows) expect(enumValues('A138-06 belastungskategorie')).toContain(r.values.bk);
    // TAB7 keys ⊆ the TAB5 tier tokens the a138_tier lookup_fill stores
    const tiers = new Set(tab5AsTable().rows.map((r) => r.values.tier));
    for (const r of tab7AsTable().rows) expect(tiers.has(r.keys.tier), r.row_key).toBe(true);
    // TAB8 first key = the created schutzkategorie options; TAB14 keys = prod facility_type_selected enum; S6_4_2_QVS keys = created schuettmaterial options
    const sk = byKey('A138-08', 'schutzkategorie').enum_values as Array<{ value: string }>;
    expect([...new Set(tab8AsTable().rows.map((r) => r.keys.schutzkategorie))]).toEqual(sk.map((o) => o.value));
    expect(new Set(tab14AsTable().rows.map((r) => r.keys.facility_type))).toEqual(new Set(enumValues('A138-15 facility_type_selected'))); // Tab. 14 column order (L2252), prod enum order differs
    const sm = byKey('A138-18', 'schuettmaterial').enum_values as Array<{ value: string }>;
    expect(s642QvsAsTable().rows.map((r) => r.keys.schuettmaterial)).toEqual(sm.map((o) => o.value));
    // section rules use prod facility tokens only
    const facilityTokens = new Set(enumValues('A138-15 facility_type_selected'));
    for (const s of SECTION_VISIBILITY) {
      const m = /^facility_type_selected == '([^']+)'$/.exec(s.visible_when)!;
      expect(m, s.visible_when).not.toBeNull();
      expect(facilityTokens.has(m[1]), m[1]).toBe(true);
    }
    // the register's lookup_key column is bound to TAB11 whose keys are the 6 printed rows
    const reg = byKey('A138-05', 'kf_test_sites').ui_config as { columns: Array<{ key: string; lookup?: { table_code: string; key_column?: string; value?: string } }> };
    expect(reg.columns.find((c) => c.key === 'method')?.lookup).toEqual({ table_code: 'TAB11' });
    expect(reg.columns.find((c) => c.key === 'f_methode_row')?.lookup).toEqual({ table_code: 'TAB11', key_column: 'method', value: 'f_methode' });
    expect(tab11AsTable().rows).toHaveLength(6);
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns in order; data_type number|text|enum (amendment C)', () => {
    const tables = { TAB5: tab5AsTable(), TAB7: tab7AsTable() };
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      const t = tables[e.lookup!.table_code as keyof typeof tables];
      expect(t, e.lookup!.table_code).toBeDefined();
      expect(e.lookup!.keys.map((k) => k.column)).toEqual(t.key_columns);
      expect(t.value_columns.map((c) => c.name)).toContain(e.lookup!.value);
      const dt = e.create?.data_type ?? (prior as Record<string, { data_type?: string }>)[`${e.worksheet} ${e.symbol}`]?.data_type;
      expect(['number', 'text', 'enum']).toContain(dt);
    }
    // D-1: the existing enum keeps prod's list
    expect(byKey('A138-06', 'belastungskategorie').enum_values).toBe('keep_prod');
  });

  it('visibility never lands on a consumed producer (the emitter refuses it — pinned here against the capture)', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when)) {
      const row = (prior as Record<string, { consumer_worksheets?: string[] | null }>)[`${e.worksheet} ${e.symbol}`];
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect(row.consumer_worksheets ?? []).toEqual([]);
    }
    // cross-worksheet drivers are consumed on every worksheet whose rule reads them
    const facilityConsumers = new Set((prior as Record<string, { consumer_worksheets?: string[] | null }>)['A138-15 facility_type_selected'].consumer_worksheets);
    for (const s of SECTION_VISIBILITY) expect(facilityConsumers.has(s.worksheet), s.worksheet).toBe(true);
    expect(facilityConsumers.has('A138-20')).toBe(true); // n_R_MRS rule
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    // Task 12c: the re-captured prior carries `gates`; the module still holds 1 rule the gate-aware guard refuses
    // (A138-21 A_S_FS ← REQ-33) — listed in
    // .superpowers/sdd/2026-09-16-guideline-to-tool-plan-3-encode-29-standards/task-12c-refusals.md for the fix round
    // (move to STAGED or sign off as a G-block). Until then the pin emits in warn mode and pins the EXACT count so a
    // fix round that clears them must flip this back to the default (refuse) mode.
    expect(() => emitFieldConfigSql('a138', FIELD_CONFIGS, SECTION_VISIBILITY, prior)).toThrow(/read by gate .* — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block/);
    const { up, down, warnings } = emitFieldConfigSql('a138', FIELD_CONFIGS, SECTION_VISIBILITY, prior, { gate_guard: 'warn' });
    expect(warnings.filter((w) => w.startsWith('GATE-REFUSAL (warn mode) '))).toHaveLength(1);
    const files = fieldConfigFilesFor('a138', '20260917100110');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(3);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(12);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(49);
    // D-1: enum_values is never written on an UPDATE here
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m);
  });
});
