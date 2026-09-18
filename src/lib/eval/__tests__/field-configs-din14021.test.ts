/**
 * Plan 3 Task 25 — DIN-14021 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3 / D-1) holds against the captured
 * prod enums and the seeded tables (CLAIMMAP keys = the 23 selected_claim_type
 * tokens; register enum columns = the prod claim_scope / communication_channel /
 * comparison_basis lists byte-for-byte), no register column is keyed `id` or shadows
 * a prod symbol of its worksheet (amendment P), every driver resolves on its rule's
 * worksheet, NO visibility rule lands on an existing field (every brief target is
 * refused by the emitter's own guards — asserted, not discovered: producer guard
 * with the EQ-01 / EQ-02 / EQ-03 chains, gate-aware guard naming REQ-11 / -14 / -15 /
 * -16 / -20 … -25 / -46 / -48 / -49), the IF-guard exemption the G-blocks rely on, the
 * `unqualified_claim` absence in the capture (O-1), and the committed migration
 * equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY, CLAIM_TYPES, CLAIM_SCOPES, CHANNELS, COMPARISON_BASES, UNQUALIFIED_TYPES, UNQUALIFIED_SCALAR,
  ROW_UNQUALIFIED, ROW_MOBIUS, ROW_CARBON_NEUTRAL, ROW_COMPARATIVE, ROW_RECOVERED, ROW_RECYCLED, ROW_REDUCED, ROW_RENEWABLE, ROW_CARBON,
  NET_RECOVERED_EXPR, RECYCLED_EXPR, REDUCED_EXPR, RECOVERED_OK_EXPR, RENEWABLE_OK_EXPR, UNQUALIFIED_OK_EXPR, COMPARATIVE_OK_EXPR, TYPE_OK_EXPR,
  DOCUMENTATION_ITEMS, GENERAL_REQUIREMENT_ITEMS,
} from '../field-configs/din14021';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { claimmapAsTable, s653AsTable, s53510AsTable, NUMERIC_BLOCKS } from '../regulation-tables-seed-din14021';
import { Q } from '../regulation-tables-quotes-din14021';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/din14021.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string) => (priorRow(key).enum_values as Array<{ value: string; label_de: string }>).map((e) => ({ value: e.value, label_de: e.label_de }));
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'DIN-14021';
const rule = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });
const prodSymbols = (ws: string) => Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1));

describe('DIN-14021 field configs (Plan 3 Task 25)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules; no register column keyed `id` or shadowing a prod symbol of its worksheet', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      expect(e.create, `${e.symbol} is a create`).toBeDefined();
      expect(e.create!.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
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
    expect(prodSymbols('DIN-14021-01')).toContain('symbol_used'); // the register column is `symbol`, never `symbol_used` (Task 22 trap 4)
  });

  it('counts: 7 field entries, ALL create (1 register, 3 derived outputs, 2 select_many checklists, 1 attestation); 0 UPDATEs on existing fields; the one scalar rule keys on the inherited selected_claim_type; the register carries 15 row-scope rules', () => {
    expect(FIELD_CONFIGS).toHaveLength(7);
    expect(FIELD_CONFIGS.filter((e) => !e.create)).toEqual([]);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['DIN-14021-01 claims']);
    expect(byWidget('derived')).toEqual(['DIN-14021-01 claims_count', 'DIN-14021-01 claims_type_fail', 'DIN-14021-01 specific_requirements_met_code']);
    expect(byWidget('select_many')).toEqual(['DIN-14021-03 general_requirements_items', 'DIN-14021-04 documentation_items']);
    expect(byWidget('attestation')).toEqual(['DIN-14021-05 unqualified_claim']);
    expect(byWidget('select_one')).toEqual([]);
    expect(byWidget('lookup_fill')).toEqual([]);
    const vis = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(vis).toEqual([`DIN-14021-05 unqualified_claim :: ${UNQUALIFIED_SCALAR}`]);
    expect(UNQUALIFIED_SCALAR).toBe("selected_claim_type IN {'renewable_material', 'renewable_energy', 'sustainable', 'carbon_neutral'}");
    expect(priorRow('DIN-14021-01 selected_claim_type').consumer_worksheets).toEqual(['DIN-14021-05']); // inherited on -05 only — the scalar driver resolves there, the register carries its own claim_type column on -01
    const rowRules = registerCfg('DIN-14021-01', 'claims').columns.filter((c) => c.visible_when).map((c) => `${c.key} :: ${c.visible_when}`);
    expect(rowRules).toEqual([
      `mobius :: ${ROW_MOBIUS}`, `unqualified :: ${ROW_UNQUALIFIED}`, `comparison_basis :: ${ROW_COMPARATIVE}`, `comparison_months :: ${ROW_COMPARATIVE}`,
      `r :: ${ROW_RECOVERED}`, `e :: ${ROW_RECOVERED}`, `p :: ${ROW_RECOVERED}`, `net_recovered_pct :: ${ROW_RECOVERED}`,
      `a_mass :: ${ROW_RECYCLED}`, `p_mass :: ${ROW_RECYCLED}`, `recycled_pct :: ${ROW_RECYCLED}`,
      `i_res :: ${ROW_REDUCED}`, `n_res :: ${ROW_REDUCED}`, `reduced_pct :: ${ROW_REDUCED}`,
      `renewable_pct :: ${ROW_RENEWABLE}`, `carbon_footprint :: ${ROW_CARBON}`, `carbon_offset_declared :: ${ROW_CARBON_NEUTRAL}`,
    ]);
    expect(rowRules).toHaveLength(17);
  });

  it('G-A3 / D-1 key-string equality: CLAIMMAP keys = the 23 prod selected_claim_type tokens; the register enum columns = the prod lists (value + label_de byte-for-byte); the two checklists offer the printed lines of their tables; every rule literal is a prod token or a numeric_block value', () => {
    const claimTokens = enumValues('DIN-14021-01 selected_claim_type').map((e) => e.value);
    expect(claimTokens).toHaveLength(23);
    expect(CLAIM_TYPES).toEqual(claimTokens);
    expect(claimmapAsTable().rows.map((r) => r.keys.claim_type)).toEqual(claimTokens);
    expect(enumValues('DIN-14021-01 claim_scope')).toEqual([...CLAIM_SCOPES]);
    expect(enumValues('DIN-14021-01 communication_channel')).toEqual([...CHANNELS]);
    expect(enumValues('DIN-14021-04 comparison_basis')).toEqual([...COMPARISON_BASES]);
    const cols = registerCfg('DIN-14021-01', 'claims').columns;
    const col = (k: string) => cols.find((c) => c.key === k)!;
    expect(col('scope').options).toEqual(CLAIM_SCOPES.map((o) => o.value));
    expect(col('scope').option_labels).toEqual(Object.fromEntries(CLAIM_SCOPES.map((o) => [o.value, o.label_de])));
    expect(col('channel').options).toEqual(CHANNELS.map((o) => o.value));
    expect(col('comparison_basis').options).toEqual(COMPARISON_BASES.map((o) => o.value));
    expect(col('claim_type').type).toBe('lookup_key');
    expect(col('claim_type').lookup).toEqual({ table_code: 'CLAIMMAP' });
    expect(col('claim_type').discriminator).toBe(true);
    expect(col('claim_type').required).toBe(true);
    for (const k of ['clause', 'numeric_block', 'condition_text', 'comparative_required']) {
      expect(col(k).type, k).toBe('lookup_value');
      expect(col(k).lookup!.key_column, k).toBe('claim_type'); // the REGISTER column that holds the key (m1200_1 trap 1)
    }
    expect(col('comparative_required').lookup!.value).toBe('comparative_by_clause');
    // rule literals: claim types in the row rules / the scalar rule are prod tokens; block literals are NUMERIC_BLOCKS values
    for (const t of UNQUALIFIED_TYPES) expect(claimTokens).toContain(t);
    for (const t of ['recyclable', 'recycled_content', 'carbon_neutral', 'sustainable']) expect(claimTokens).toContain(t);
    for (const b of ['recovered_energy', 'recycled_content', 'reduced_resource', 'renewable_material', 'renewable_energy', 'carbon']) expect(NUMERIC_BLOCKS).toContain(b);
    // the checklists: values ARE the printed lines (the checklist renders enum_values[].value — m820_2 trap 1)
    expect(DOCUMENTATION_ITEMS.map((m) => m.value)).toEqual(s653AsTable().rows.map((r) => r.label_de));
    expect(DOCUMENTATION_ITEMS).toHaveLength(7);
    expect(DOCUMENTATION_ITEMS[0].value).toBe('a) Angabe der angewendeten Norm oder des angewendeten Verfahrens;');
    expect(GENERAL_REQUIREMENT_ITEMS.map((m) => m.value)).toEqual(s53510AsTable().rows.map((r) => r.values.heading));
    expect(GENERAL_REQUIREMENT_ITEMS).toHaveLength(8);
    const doc = byKey('DIN-14021-04', 'documentation_items');
    expect((doc.enum_values as Array<{ value: string }>).map((e) => e.value)).toEqual(DOCUMENTATION_ITEMS.map((m) => m.value));
    expect((doc.ui_config as { groups: Array<{ options: string[] }> }).groups[0].options).toEqual(DOCUMENTATION_ITEMS.map((m) => m.value));
    const gen = byKey('DIN-14021-03', 'general_requirements_items');
    expect((gen.enum_values as Array<{ value: string }>).map((e) => e.value)).toEqual(GENERAL_REQUIREMENT_ITEMS.map((m) => m.value));
    // the created fields' data types / sections (captured section codes)
    expect(byKey('DIN-14021-01', 'claims').create).toMatchObject({ section_code: 'B', data_type: 'json' });
    expect(doc.create).toMatchObject({ section_code: 'E', data_type: 'json' });
    expect(gen.create).toMatchObject({ section_code: 'C', data_type: 'json' });
    expect(byKey('DIN-14021-05', 'unqualified_claim').create).toMatchObject({ section_code: 'C', data_type: 'boolean' });
    for (const e of FIELD_CONFIGS) expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
    // O-1: the brief's / prod VR's `unqualified_claim` driver does not exist in the capture (it is CREATED here)
    expect(priorRow('DIN-14021-05 unqualified_claim')).toBeUndefined();
    expect(Object.keys(prior).filter((k) => k.endsWith(' unqualified_claim'))).toEqual([]);
  });

  it('register: the printed per-row formulas (§7.6.3 / §7.8.4 / §7.10.3) and the four printed checks as row exprs; type_ok is declared AFTER the checks it reads; every footer symbol is a created derived output; no override block (locked table); the printed 100 is the only figure beyond the × 100 factors', () => {
    const cfg = registerCfg('DIN-14021-01', 'claims');
    const col = (k: string) => cfg.columns.find((c) => c.key === k)!;
    expect(col('net_recovered_pct').expr).toBe(NET_RECOVERED_EXPR);
    expect(NET_RECOVERED_EXPR).toBe('(r - e) / ((r - e) + p) * 100'); // L1302 \frac{(R-E)}{(R-E)+P} \times 100
    expect(Q.L1300_1303).toContain('\\frac{(R-E)}{(R-E)+P} \\times 100');
    expect(col('recycled_pct').expr).toBe(RECYCLED_EXPR);
    expect(Q.L1480).toBe('$X(\\%)=\\frac{A}{P} \\times 100$');
    expect(col('reduced_pct').expr).toBe(REDUCED_EXPR);
    expect(Q.L1570).toBe('$U(\\%)=\\frac{(I-N)}{I} \\times 100$');
    expect(col('recovered_ok').expr).toBe(RECOVERED_OK_EXPR);
    expect(RECOVERED_OK_EXPR).toContain('r - e > 0'); // L1297 R-E>0
    expect(col('renewable_ok').expr).toBe(RENEWABLE_OK_EXPR);
    expect(RENEWABLE_OK_EXPR).toContain('renewable_pct == 100'); // L1719 / L1763 "100 %"
    expect(col('unqualified_ok').expr).toBe(UNQUALIFIED_OK_EXPR);
    expect(col('comparative_ok').expr).toBe(COMPARATIVE_OK_EXPR);
    expect(col('type_ok').expr).toBe(TYPE_OK_EXPR);
    const idx = (k: string) => cfg.columns.findIndex((c) => c.key === k);
    for (const k of ['recovered_ok', 'renewable_ok', 'unqualified_ok', 'comparative_ok']) expect(idx(k), k).toBeLessThan(idx('type_ok'));
    for (const k of ['r', 'e', 'p']) expect(idx(k)).toBeLessThan(idx('net_recovered_pct'));
    expect(cfg.footer).toEqual(['claims_count', 'claims_type_fail', 'specific_requirements_met_code']);
    const created = new Set(FIELD_CONFIGS.filter((e) => e.create && e.widget === 'derived').map((e) => `${e.worksheet} ${e.symbol}`));
    for (const f of cfg.footer ?? []) expect(created.has(`DIN-14021-01 ${f}`), f).toBe(true);
    expect(cfg.override).toBeUndefined();
    expect(cfg.columns.filter((c) => c.required).map((c) => c.key)).toEqual(['claim_type']);
    // figures: only the printed × 100 factors and the printed 100 % (plus the structural 1 / 0 verdicts)
    for (const c of cfg.columns.filter((x) => x.expr)) {
      const stripped = c.expr!.replace(/\* 100|== 100|, 1, 0\)|, 0, 1\)|, 1\)|== 1|== 0|> 0|, 0,/g, '');
      expect(stripped, `${c.key} figure`).not.toMatch(/\b\d+(\.\d+)?\b/);
    }
  });

  it('NO visibility rule on an existing field is emittable: every brief target is refused by the producer guard (all consumed by -06, the -05 inputs through EQ-01 / EQ-02 / EQ-03) and named by the gate-aware guard (REQ-11 / -14 / -15 / -16 / -20 … -25 / -46 / -48 / -49) — G-19 / G-22 … G-28; the IF-guard exemption rescues the equality hides but never an IN-guard', () => {
    const cases: Array<[string, string, string, string[], RegExp]> = [
      ['DIN-14021-04', 'comparison_basis', 'comparative_claim == true', ['REQ-14', 'REQ-46'], /consumed by DIN-14021-06/],
      ['DIN-14021-04', 'comparison_same_functional_unit', 'comparative_claim == true', ['REQ-15', 'REQ-46'], /consumed by DIN-14021-06/],
      ['DIN-14021-04', 'comparison_time_interval', 'comparative_claim == true', ['REQ-15'], /consumed by DIN-14021-06/],
      ['DIN-14021-04', 'product_packaging_separated', 'comparative_claim == true', ['REQ-16'], /consumed by DIN-14021-06/],
      ['DIN-14021-03', 'mobius_loop_used', "selected_claim_type IN {'recyclable', 'recycled_content'}", ['REQ-11', 'REQ-48'], /consumed by DIN-14021-05, DIN-14021-06/],
      ['DIN-14021-03', 'symbol_distinguishable', 'symbol_used == true', [], /consumed by DIN-14021-06/],
      ['DIN-14021-03', 'natural_object_link', 'symbol_used == true', [], /consumed by DIN-14021-06/],
      ['DIN-14021-05', 'R_energy', "selected_claim_type == 'recovered_energy'", ['REQ-20'], /R_energy → EQ-01 net_recovered_energy_pct \(consumed by DIN-14021-06\)/],
      ['DIN-14021-05', 'E_energy', "selected_claim_type == 'recovered_energy'", ['REQ-20'], /EQ-01/],
      ['DIN-14021-05', 'P_energy', "selected_claim_type == 'recovered_energy'", [], /EQ-01/],
      ['DIN-14021-05', 'A_mass_recycled', "selected_claim_type == 'recycled_content'", ['REQ-21'], /EQ-02 recycled_content_pct/],
      ['DIN-14021-05', 'P_mass_product', "selected_claim_type == 'recycled_content'", ['REQ-21'], /EQ-02/],
      ['DIN-14021-05', 'I_resource_initial', "selected_claim_type == 'reduced_resource_use'", [], /EQ-03 reduced_resource_use_pct/],
      ['DIN-14021-05', 'N_resource_new', "selected_claim_type == 'reduced_resource_use'", [], /EQ-03/],
      ['DIN-14021-05', 'renewable_material_pct', "selected_claim_type == 'renewable_material'", ['REQ-22'], /consumed by DIN-14021-06/],
      ['DIN-14021-05', 'renewable_energy_pct', "selected_claim_type == 'renewable_energy'", ['REQ-23'], /consumed by DIN-14021-06/],
      ['DIN-14021-05', 'carbon_footprint_value', "selected_claim_type IN {'product_carbon_footprint', 'carbon_neutral'}", ['REQ-24', 'REQ-25', 'REQ-49'], /consumed by DIN-14021-06/],
      ['DIN-14021-05', 'carbon_neutral_offset_declared', "selected_claim_type == 'carbon_neutral'", ['REQ-24'], /consumed by DIN-14021-06/],
    ];
    for (const [ws, sym, vw, gates, chain] of cases) {
      expect(priorRow(`${ws} ${sym}`), `${ws} ${sym} captured`).toBeDefined();
      expect(gateReaders(prior, ws, sym, vw).map((g) => g.code), `${sym} gate readers`).toEqual(gates);
      expect(producerChain(prior, ws, sym), `${sym} chain`).toMatch(chain);
      expect(() => emitFieldConfigSql('din14021', [rule(ws, sym, vw)], [], prior), `${sym} refusal`).toThrow(/consumed by another worksheet/);
    }
    // the 20 presence gates REQ-28 … REQ-45 / REQ-47 / REQ-50 share one condition and sit on -01 (they read selected_claim_type only)
    const presence = Object.entries(prior.gates!).filter(([, g]) => g.condition === 'selected_claim_type IS NOT NULL').map(([k]) => k);
    expect(presence).toHaveLength(20);
    expect(presence.every((k) => k.startsWith('DIN-14021-01 '))).toBe(true);
    expect(presence.map((k) => k.slice('DIN-14021-01 '.length))).toEqual(['REQ-28', 'REQ-29', 'REQ-30', 'REQ-31', 'REQ-32', 'REQ-33', 'REQ-34', 'REQ-35', 'REQ-36', 'REQ-37', 'REQ-38', 'REQ-39', 'REQ-40', 'REQ-41', 'REQ-42', 'REQ-43', 'REQ-44', 'REQ-45', 'REQ-47', 'REQ-50']);
    expect(prior.gates!['DIN-14021-03 REQ-26'].condition).toBe('TRUE');
    expect(prior.gates!['DIN-14021-05 REQ-20'].condition).toBe('R_energy - E_energy > 0');
    expect(Object.values(prior.gates!).every((g) => g.severity === 'block')).toBe(true);
    expect(Object.values(prior.gates!).filter((g) => g.parse_error)).toEqual([]);
    // the IF-guard exemption: once REQ-20 reads `IF selected_claim_type == 'recovered_energy' THEN R_energy - E_energy > 0` the gate no longer refuses the R_energy hide (the producer guard still does — C-block)
    const guarded: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'DIN-14021-05 REQ-20': { ...prior.gates!['DIN-14021-05 REQ-20'], condition: "IF selected_claim_type == 'recovered_energy' THEN R_energy - E_energy > 0" } } };
    expect(gateReaders(guarded, 'DIN-14021-05', 'R_energy', "selected_claim_type == 'recovered_energy'")).toEqual([]);
    // … but an IN-guard is never exempt (the emitter's guardExempts accepts compare guards only): the Möbius / carbon-footprint hides stay owner-applied (G-28 / G-27)
    const inGuarded: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'DIN-14021-05 REQ-25': { ...prior.gates!['DIN-14021-05 REQ-25'], condition: "IF selected_claim_type IN {'product_carbon_footprint', 'carbon_neutral'} THEN carbon_footprint_value IS NOT NULL" } } };
    expect(gateReaders(inGuarded, 'DIN-14021-05', 'carbon_footprint_value', "selected_claim_type IN {'product_carbon_footprint', 'carbon_neutral'}").map((g) => g.code)).toContain('REQ-25');
    // the three captured equations
    expect(Object.keys(prior.equations!)).toEqual(['DIN-14021-05 EQ-01', 'DIN-14021-05 EQ-02', 'DIN-14021-05 EQ-03']);
    // no self-consumer entries in this capture
    for (const [k, r] of Object.entries(prior)) {
      if (!k.includes(' ') || ['sections', 'equations', 'gates', '_meta'].includes(k)) continue;
      expect((r as Row).consumer_worksheets ?? [], k).not.toContain(k.split(' ')[0]);
    }
    // the created outputs are consumer-free and gate-free (a create never sets consumers; nothing reads them yet)
    for (const e of FIELD_CONFIGS) expect(gateReaders(prior, e.worksheet, e.symbol, e.visible_when ?? 'x == 1', new Set([`${e.worksheet} ${e.symbol}`]))).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no warnings): 7 INSERTs, 0 UPDATEs, no enum_values UPDATE', () => {
    const { up, down, warnings } = emitFieldConfigSql('din14021', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('din14021', '20260917102510');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(0);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(7);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
    expect(up).not.toContain("claimant's evaluation"); // no English line inside a German span
  });
});
