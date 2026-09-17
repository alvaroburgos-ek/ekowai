/**
 * Plan 3 Task 0, fix round 1 — every emitter guard BEYOND the brief's Step-1
 * tests (emit-field-configs-sql.test.ts keeps those verbatim): the
 * always-written invariant, the stricter D-1, the create/select/lookup_fill
 * refusals, duplicate refusals, the "no prior captured" rollback comments,
 * the header options, section-key validation, the section-level producer
 * guard, the prior-snapshot sanity check and the CLI header args.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emitFieldConfigSql, assertPriorSnapshot, loadPriorSnapshot, parseHeaderArgs, type PriorSnapshot, type PriorFieldRow } from '../regulation-tables/emit-field-configs-sql';

const reg = { title: 'T', columns: [{ key: 'a', label: 'A', type: 'text' }] };
const row = (over: Partial<PriorFieldRow> = {}): PriorFieldRow => ({ enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: null, ...over });
const ev = [{ value: 'a', label_de: 'A', order_index: 0 }];
const base = { standard: 'S', worksheet: 'S-01', verification_quote: 'q' };
const bad = (v: unknown) => v as unknown as PriorSnapshot;

describe('emitFieldConfigSql — guards beyond the brief (fix round 1)', () => {
  it('lookup and visible_when are ALWAYS written, as NULL when absent, on every UPDATE; the UPDATE is scoped to active rows', () => {
    const { up } = emitFieldConfigSql('x', [{ ...base, symbol: 'n', widget: 'scalar' }], [], {});
    expect(up).toContain("UPDATE fields f SET widget = 'scalar', ui_config = NULL, lookup = NULL, visible_when = NULL FROM worksheet_templates w");
    expect(up).toContain("AND s.code = 'S' AND f.active;");
  });
  it('stricter D-1: an enum list on an UPDATE entry requires a CAPTURED prior row (an absent row is not evidence of NULL)', () => {
    expect(() => emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'select_one', enum_values: ev }], [], {})).toThrow(/D-1 — enum_values given but no prior snapshot row/);
  });
  it('create: refused when the prior already has the field, when enum_values is keep_prod, and when a select widget lists no options', () => {
    const create = { section_code: null, label_de: 'L', data_type: 'enum' as const, clause_reference: '§1', description: 'Plan 3: x' };
    expect(() => emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'select_one', enum_values: ev, create }], [], { 'S-01 k': row() })).toThrow(/create given but the prior snapshot already has this field/);
    expect(() => emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'select_one', enum_values: 'keep_prod', create }], [], {})).toThrow(/no prod enum_values to keep/);
    expect(() => emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'select_one', create }], [], {})).toThrow(/created select_one needs an enum_values list/);
    expect(emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'select_one', enum_values: ev, create }], [], {}).up).toContain('INSERT INTO fields');
  });
  it('lookup_fill data_type rule (amendment C): number|text|enum only — on create.data_type and on a captured prior data_type', () => {
    const lookup = { table_code: 'TAB9', role: 'value' as const, keys: [{ column: 'k', from_symbol: 'k' }], value: 'cm' };
    const create = (data_type: 'json' | 'number') => ({ section_code: null, label_de: 'L', data_type, clause_reference: '§1', description: 'Plan 3: x' });
    expect(() => emitFieldConfigSql('x', [{ ...base, symbol: 'lim', widget: 'lookup_fill', lookup, create: create('json') }], [], {})).toThrow(/lookup_fill needs data_type number\|text\|enum, got json/);
    expect(emitFieldConfigSql('x', [{ ...base, symbol: 'lim', widget: 'lookup_fill', lookup, create: create('number') }], [], {}).up).toContain("'lookup_fill'");
    expect(() => emitFieldConfigSql('x', [{ ...base, symbol: 'lim', widget: 'lookup_fill', lookup }], [], { 'S-01 lim': row({ data_type: 'boolean' }) })).toThrow(/got boolean/);
    expect(emitFieldConfigSql('x', [{ ...base, symbol: 'lim', widget: 'lookup_fill', lookup }], [], { 'S-01 lim': row({ data_type: 'number' }) }).up).toContain('lookup = ');
  });
  it('duplicate entries are refused — fields by (worksheet, symbol), sections by (worksheet, section_code)', () => {
    const e = { ...base, symbol: 'n', widget: 'scalar' as const };
    expect(() => emitFieldConfigSql('x', [e, { ...e }], [], {})).toThrow(/S-01 n: duplicate entry/);
    const s = { standard: 'S', worksheet: 'S-01', section_code: 'S-01.1', visible_when: 'a == 1', verification_quote: 'q' };
    expect(() => emitFieldConfigSql('x', [], [s, { ...s }], {})).toThrow(/section S-01 S-01.1: duplicate entry/);
  });
  it('rollback: a field or section with no captured prior gets an explicit "no prior snapshot row captured" comment above its restore', () => {
    const { down } = emitFieldConfigSql('x', [{ ...base, symbol: 'n', widget: 'scalar' }], [{ standard: 'S', worksheet: 'S-01', section_code: 'S-01.1', visible_when: 'a == 1', verification_quote: 'q' }], {});
    const lines = down.split('\n');
    const fi = lines.findIndex((l) => l.startsWith('UPDATE fields f SET widget = NULL'));
    expect(lines[fi - 1]).toBe('-- S-01 n: no prior snapshot row captured — restore assumes prod had NULL in these columns; re-capture before applying the rollback.');
    const si = lines.findIndex((l) => l.startsWith('UPDATE worksheet_sections ws SET visible_when = NULL'));
    expect(lines[si - 1]).toMatch(/^-- section S-01 S-01\.1: no prior snapshot row captured/);
    const captured = emitFieldConfigSql('x', [{ ...base, symbol: 'n', widget: 'scalar' }], [], { 'S-01 n': row({ widget: 'scalar', visible_when: 'b == 2' }) }).down;
    expect(captured).not.toContain('no prior snapshot row captured');
    expect(captured).toContain("UPDATE fields f SET widget = 'scalar', ui_config = NULL, lookup = NULL, visible_when = 'b == 2'");
  });
  it('header: provenance PREPENDS a comment line (generated-by line kept); gated adds the GATED line pointing at SIGN-OFF-plan-3 + note lines', () => {
    const { up } = emitFieldConfigSql('x', [], [], {}, { provenance: 'PRIOR FROM HARNESS SEED (prod unreachable 2026-09-17): owner re-captures before applying', gated: 'x-G-1', gated_note: 'why\n\nmore' });
    const lines = up.split('\n');
    expect(lines[0]).toBe('-- PRIOR FROM HARNESS SEED (prod unreachable 2026-09-17): owner re-captures before applying');
    expect(lines[1]).toMatch(/^-- Generated by scripts\/regulation-tables\/emit-field-configs-sql\.ts for x \(Plan 3\)/);
    expect(lines[3]).toBe('-- GATED: do not apply before sign-off x-G-1 is RATIFIED (docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md).');
    expect(lines.slice(4, 7)).toEqual(['-- why', '--', '-- more']);
    expect(lines[7]).toBe('BEGIN;');
    expect(emitFieldConfigSql('x', [], [], {}).up.split('\n')[0]).toMatch(/^-- Generated by/);
  });
  it('select_one/select_many without options (no list, no non-null prior enum_values) is refused; prod options satisfy it', () => {
    expect(() => emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'select_one' }], [], {})).toThrow(/select_one without options — prod enum_values is not captured/);
    expect(() => emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'select_one' }], [], { 'S-01 k': row() })).toThrow(/select_one without options — prod enum_values is null/);
    expect(() => emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'select_one', enum_values: 'keep_prod' }], [], { 'S-01 k': row() })).toThrow(/without options/);
    expect(emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'select_many', ui_config: { title: 'T' } }], [], { 'S-01 k': row({ enum_values: ev }) }).up).toContain("widget = 'select_many'");
    expect(emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'select_one', enum_values: 'keep_prod' }], [], { 'S-01 k': row({ enum_values: ev }) }).up).not.toContain('enum_values = ');
  });
  it('create.section_code must be a captured section when prior.sections is present; a null section_code falls back to the first top-level section', () => {
    const create = (section_code: string | null) => ({ section_code, label_de: 'L', data_type: 'json' as const, clause_reference: '§1', description: 'Plan 3: x' });
    const prior: PriorSnapshot = { sections: { 'S-05 S-05.1': { visible_when: null } } };
    const entry = (section_code: string | null) => ({ ...base, worksheet: 'S-05', symbol: 'r', widget: 'register' as const, ui_config: reg, create: create(section_code) });
    expect(() => emitFieldConfigSql('x', [entry('S-05.9')], [], prior)).toThrow(/create.section_code S-05.9 is not a captured section of S-05/);
    expect(emitFieldConfigSql('x', [entry('S-05.1')], [], prior).up).toContain("ws.code = 'S-05.1'");
    expect(emitFieldConfigSql('x', [entry(null)], [], prior).up).toContain('ws.parent_section_id IS NULL ORDER BY ws.order_index LIMIT 1');
  });
  it('section visibility: an entry whose "<worksheet> <section>" key is absent from a captured prior.sections is refused (0-row UPDATE)', () => {
    const s = { standard: 'S', worksheet: 'S-03', section_code: 'S-03.7', visible_when: "typ == 'b'", verification_quote: 'q' };
    expect(() => emitFieldConfigSql('x', [], [s], { sections: { 'S-03 S-03.2': { visible_when: null } } })).toThrow(/section S-03 S-03.7: not a captured section/);
    expect(emitFieldConfigSql('x', [], [s], {}).up).toContain("ws.code = 'S-03.7'"); // no sections map captured ⇒ not checkable, emitted (rollback carries the no-prior comment)
  });
  it('section visibility: refused when the section contains a symbol consumed by another worksheet (same rule as the symbol-level guard)', () => {
    const s = { standard: 'S', worksheet: 'S-01', section_code: 'S-01.2', visible_when: "typ == 'b'", verification_quote: 'q' };
    const prior: PriorSnapshot = {
      'S-01 A_C': row({ consumer_worksheets: ['S-02', 'S-04'], section_code: 'S-01.2' }),
      'S-01 x': row({ consumer_worksheets: null, section_code: 'S-01.2' }),
      'S-02 A_C': row({ consumer_worksheets: ['S-09'], section_code: 'S-01.2' }), // other worksheet — ignored
      sections: { 'S-01 S-01.2': { visible_when: null }, 'S-01 S-01.3': { visible_when: null } },
    };
    expect(() => emitFieldConfigSql('x', [], [s], prior)).toThrow(/section S-01 S-01\.2: visible_when on a section \(or a descendant of it\) containing a symbol consumed by another worksheet: A_C \(consumed by S-02, S-04\)/);
    expect(emitFieldConfigSql('x', [], [{ ...s, section_code: 'S-01.3' }], prior).up).toContain("ws.code = 'S-01.3'");
  });
  it('section visibility walks the captured section_path: producers in a direct child or a null-coded grandchild are refused; an orphan or a sibling producer is not', () => {
    const target = (section_code: string) => ({ standard: 'S', worksheet: 'S-01', section_code, visible_when: "typ == 'b'", verification_quote: 'q' });
    // hierarchy: A (root) ⊃ A.1 (child) ⊃ <null-coded> (grandchild); B (root, sibling)
    const sections = { 'S-01 A': { visible_when: null, parent_code: null }, 'S-01 A.1': { visible_when: null, parent_code: 'A' }, 'S-01 B': { visible_when: null, parent_code: null } };
    const child: PriorSnapshot = { 'S-01 P': row({ consumer_worksheets: ['S-02'], section_code: 'A.1', section_id_is_null: false, section_path: ['A', 'A.1'] }), sections };
    expect(() => emitFieldConfigSql('x', [], [target('A')], child)).toThrow(/section S-01 A: .*P \(consumed by S-02\)/);
    const grandchild: PriorSnapshot = { 'S-01 P': row({ consumer_worksheets: ['S-02'], section_code: null, section_id_is_null: false, section_path: ['A', 'A.1', null] }), sections };
    expect(() => emitFieldConfigSql('x', [], [target('A')], grandchild)).toThrow(/section S-01 A: .*P \(consumed by S-02\)/);
    expect(() => emitFieldConfigSql('x', [], [target('A.1')], grandchild)).toThrow(/section S-01 A\.1: .*P \(consumed by S-02\)/);
    const orphan: PriorSnapshot = { 'S-01 P': row({ consumer_worksheets: ['S-02'], section_code: null, section_id_is_null: true, section_path: [] }), sections };
    expect(emitFieldConfigSql('x', [], [target('A')], orphan).up).toContain("ws.code = 'A'");
    const sibling: PriorSnapshot = { 'S-01 P': row({ consumer_worksheets: ['S-02'], section_code: 'B', section_id_is_null: false, section_path: ['B'] }), sections };
    expect(emitFieldConfigSql('x', [], [target('A')], sibling).up).toContain("ws.code = 'A'");
    expect(() => emitFieldConfigSql('x', [], [target('B')], sibling)).toThrow(/section S-01 B: .*P \(consumed by S-02\)/);
    // a null-coded child of the target with its OWN consumer-free field is fine; a non-producer in the tree never trips it
    const clean: PriorSnapshot = { 'S-01 x': row({ consumer_worksheets: null, section_code: null, section_id_is_null: false, section_path: ['A', null] }), sections };
    expect(emitFieldConfigSql('x', [], [target('A')], clean).up).toContain("ws.code = 'A'");
  });
  it('with a captured snapshot (_meta present) a field UPDATE entry whose key is absent is refused (0-row UPDATE); without _meta the brief\'s {}-prior behaviour stays', () => {
    const captured: PriorSnapshot = { _meta: { captured_at: 'now' }, 'S-01 k': row() };
    expect(() => emitFieldConfigSql('x', [{ ...base, symbol: 'nope', widget: 'scalar' }], [], captured)).toThrow(/S-01 nope: not a captured active field of S-01 \(its UPDATE would touch 0 rows\)/);
    expect(emitFieldConfigSql('x', [{ ...base, symbol: 'k', widget: 'scalar' }], [], captured).up).toContain("f.symbol = 'k'");
    const create = { section_code: null, label_de: 'L', data_type: 'json' as const, clause_reference: '§1', description: 'Plan 3: x' };
    expect(emitFieldConfigSql('x', [{ ...base, symbol: 'nope', widget: 'register', ui_config: reg, create }], [], captured).up).toContain('INSERT INTO fields');
    expect(emitFieldConfigSql('x', [{ ...base, symbol: 'nope', widget: 'scalar' }], [], {}).up).toContain("f.symbol = 'nope'");
  });
});

describe('assertPriorSnapshot / loadPriorSnapshot — a stringified or truncated capture is refused', () => {
  it('refuses a JSON column that is a string (the prod-query.mjs console.table shape), naming the key and column', () => {
    const b = bad({ 'S-01 k': { ...row(), ui_config: '{"title":"T","columns":[{"key":"a","label":"A","type":"text"}]}' } });
    expect(() => assertPriorSnapshot(b)).toThrow(/prior "S-01 k"\.ui_config must be an object\/array\/null, got string/);
    expect(() => emitFieldConfigSql('x', [], [], b)).toThrow(/"S-01 k"\.ui_config/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 k': { ...row(), lookup: 'x' } }))).toThrow(/"S-01 k"\.lookup must be/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 k': { ...row(), enum_values: '[{"value":"a"}]' } }))).toThrow(/"S-01 k"\.enum_values must be/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 k': { ...row(), enum_values: 5 } }))).toThrow(/got number/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 k': { ...row(), consumer_worksheets: 'S-02' } }))).toThrow(/consumer_worksheets must be an array/);
    expect(() => assertPriorSnapshot(bad({ sections: { 'S-01 S-01.1': { visible_when: 5 } } }))).toThrow(/prior\.sections "S-01 S-01\.1"\.visible_when/);
  });
  it('accepts objects/arrays/null and ignores _meta', () => {
    expect(() => assertPriorSnapshot({ _meta: { captured_at: 'now' }, 'S-01 k': row({ ui_config: { title: 'T' }, enum_values: ev, lookup: null }), sections: { 'S-01 S-01.1': { visible_when: null } } })).not.toThrow();
  });
  it('loadPriorSnapshot rejects a truncated file on disk with the same message, and names the capture script when the file is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prior-'));
    const p = join(dir, 'x.prior.json');
    writeFileSync(p, JSON.stringify({ 'S-01 k': { ...row(), ui_config: '{"title":"T","colu' } }));
    expect(() => loadPriorSnapshot(p)).toThrow(/"S-01 k"\.ui_config must be an object\/array\/null, got string/);
    expect(() => loadPriorSnapshot(join(dir, 'missing.prior.json'))).toThrow(/missing prior snapshot .*build-prior-snapshot\.mjs/);
  });
});

describe('parseHeaderArgs (CLI)', () => {
  it('parses --gated / --provenance and refuses a trailing flag without a value or an unknown flag', () => {
    expect(parseHeaderArgs([])).toEqual({});
    expect(parseHeaderArgs(['--gated', 'x-G-1', '--provenance', 'PRIOR FROM HARNESS SEED'])).toEqual({ gated: 'x-G-1', provenance: 'PRIOR FROM HARNESS SEED' });
    expect(() => parseHeaderArgs(['--gated'])).toThrow(/--gated needs a value/);
    expect(() => parseHeaderArgs(['--provenance'])).toThrow(/--provenance needs a value/);
    expect(() => parseHeaderArgs(['--gated', '--provenance', 'p'])).toThrow(/--gated needs a value/);
    expect(() => parseHeaderArgs(['--nope', 'v'])).toThrow(/unknown argument --nope/);
  });
});
