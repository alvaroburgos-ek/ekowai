/**
 * Plan 3 Task 0 (fix rounds 1–2) — the pure parts of build-prior-snapshot.mjs:
 * optional-column detection (Plan-1 schema unapplied ⇒ `null as <col>`), the
 * capture queries (fields incl. section_id; EVERY section with id/parent),
 * the ancestor walk and the fold into the exact `PriorSnapshot` shape the
 * emitter accepts (`assertPriorSnapshot` is run on the folded result).
 * No network: main() only runs when the file is the CLI entry.
 */
import { describe, it, expect } from 'vitest';
import { detectColumns, buildQueries, foldSnapshot, sectionPath, OPTIONAL_FIELD_COLUMNS } from '../build-prior-snapshot.mjs';
import { assertPriorSnapshot, emitFieldConfigSql } from '../emit-field-configs-sql';

const schemaRows = (cols) => cols.map(([table_name, column_name]) => ({ table_name, column_name }));

describe('detectColumns / buildQueries', () => {
  it('Plan-1 columns absent ⇒ selected as null; present ⇒ selected from the table', () => {
    const absent = detectColumns(schemaRows([['fields', 'symbol'], ['fields', 'enum_values'], ['worksheet_sections', 'code']]));
    expect(absent).toEqual({ fields: { widget: false, ui_config: false, lookup: false, visible_when: false }, worksheet_sections: { visible_when: false } });
    const qa = buildQueries(absent);
    expect(qa.fields).toContain('null as widget, null as ui_config, null as lookup, null as visible_when');
    expect(qa.sections).toContain('null as visible_when');
    const present = detectColumns(schemaRows([...OPTIONAL_FIELD_COLUMNS.map((c) => ['fields', c]), ['worksheet_sections', 'visible_when']]));
    const qp = buildQueries(present);
    expect(qp.fields).toContain('f.widget, f.ui_config, f.lookup, f.visible_when');
    expect(qp.sections).toContain('ws.visible_when');
    for (const q of [qa.fields, qp.fields]) {
      expect(q).toContain('f.enum_values, f.data_type, f.consumer_worksheets, f.section_id, ws.code as section_code');
      expect(q).toContain('left join worksheet_sections ws on ws.id = f.section_id');
      expect(q).toContain('where s.code = $1 and f.active');
    }
    // sections: EVERY section (no `code is not null` filter) with id, parent id and the parent's code
    expect(qa.sections).toContain('select w.code as worksheet, ws.id, ws.parent_section_id, ws.code as section_code, p.code as parent_code');
    expect(qa.sections).toContain('left join worksheet_sections p on p.id = ws.parent_section_id');
    expect(qa.sections).toContain('where s.code = $1 order by');
    expect(qa.sections).not.toContain('ws.code is not null');
  });
});

describe('sectionPath / foldSnapshot', () => {
  // hierarchy on A138-07: A (root) ⊃ A.1 ⊃ <null-coded>; B (root)
  const sectionRows = [
    { worksheet: 'A138-07', id: 's-A', parent_section_id: null, section_code: 'A', parent_code: null, visible_when: null },
    { worksheet: 'A138-07', id: 's-A1', parent_section_id: 's-A', section_code: 'A.1', parent_code: 'A', visible_when: "typ == 'x'" },
    { worksheet: 'A138-07', id: 's-A1n', parent_section_id: 's-A1', section_code: null, parent_code: 'A.1', visible_when: null },
    { worksheet: 'A138-07', id: 's-B', parent_section_id: null, section_code: 'B', parent_code: null, visible_when: null },
  ];
  const fieldRows = [
    { worksheet: 'A138-07', symbol: 'A_C', enum_values: null, data_type: 'number', consumer_worksheets: ['A138-12'], section_id: 's-A1n', section_code: null, widget: null, ui_config: null, lookup: null, visible_when: null },
    { worksheet: 'A138-07', symbol: 'surface_inventory', enum_values: [{ value: 'a', label_de: 'A', order_index: 0 }], data_type: 'json', consumer_worksheets: null, section_id: 's-B', section_code: 'B', widget: 'register', ui_config: { title: 'T', columns: [{ key: 'a', label: 'A', type: 'text' }] }, lookup: null, visible_when: "x == 'y'" },
    { worksheet: 'A138-07', symbol: 'orphan', enum_values: null, data_type: 'text', consumer_worksheets: ['A138-12'], section_id: null, section_code: null, widget: null, ui_config: null, lookup: null, visible_when: null },
  ];
  it('sectionPath walks parent_section_id root → own, null for a null-coded section, and stops on a cycle', () => {
    const byId = new Map(sectionRows.map((r) => [r.id, r]));
    expect(sectionPath('s-A1n', byId)).toEqual(['A', 'A.1', null]);
    expect(sectionPath('s-B', byId)).toEqual(['B']);
    expect(sectionPath('unknown', byId)).toEqual([]);
    const cyc = new Map([['x', { parent_section_id: 'y', section_code: 'X' }], ['y', { parent_section_id: 'x', section_code: 'Y' }]]);
    expect(sectionPath('x', cyc)).toEqual(['Y', 'X']);
  });
  it('produces the PriorSnapshot shape (keys "<ws> <sym>", coded sections with parent_code, _meta) that assertPriorSnapshot accepts, with full JSON values and section paths', () => {
    const snap = foldSnapshot(fieldRows, sectionRows, { standard: 'DWA-A-138-1', slug: 'a138' });
    expect(() => assertPriorSnapshot(snap)).not.toThrow();
    expect(snap._meta).toEqual({ standard: 'DWA-A-138-1', slug: 'a138', field_rows: 3, section_rows: 3, sections_total: 4 });
    expect(snap['A138-07 A_C']).toEqual({ enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: ['A138-12'], data_type: 'number', section_code: null, section_id_is_null: false, section_path: ['A', 'A.1', null] });
    expect(snap['A138-07 orphan']).toMatchObject({ section_code: null, section_id_is_null: true, section_path: [] });
    expect(snap['A138-07 surface_inventory']).toMatchObject({ section_code: 'B', section_id_is_null: false, section_path: ['B'] });
    expect(snap['A138-07 surface_inventory'].ui_config).toEqual(fieldRows[1].ui_config); // object, not a string
    expect(snap['A138-07 surface_inventory'].enum_values).toEqual(fieldRows[1].enum_values);
    expect(snap.sections).toEqual({
      'A138-07 A': { visible_when: null, parent_code: null },
      'A138-07 A.1': { visible_when: "typ == 'x'", parent_code: 'A' },
      'A138-07 B': { visible_when: null, parent_code: null },
    });
    // the emitter consumes it: the rollback restores the captured object byte-for-byte
    const { down } = emitFieldConfigSql('a138', [{ standard: 'DWA-A-138-1', worksheet: 'A138-07', symbol: 'surface_inventory', widget: 'register', ui_config: { title: 'U', columns: [{ key: 'b', label: 'B', type: 'text' }] }, verification_quote: 'q' }], [], snap);
    expect(down).toContain(`ui_config = '${JSON.stringify(fieldRows[1].ui_config)}'::jsonb`);
    expect(down).toContain("visible_when = 'x == ''y'''");
    // the section-level producer guard sees A_C (null-coded grandchild of A) through section_path — for A and for A.1
    const sec = (section_code) => ({ standard: 'DWA-A-138-1', worksheet: 'A138-07', section_code, visible_when: 'a == 1', verification_quote: 'q' });
    expect(() => emitFieldConfigSql('a138', [], [sec('A')], snap)).toThrow(/A_C \(consumed by A138-12\)/);
    expect(() => emitFieldConfigSql('a138', [], [sec('A.1')], snap)).toThrow(/A_C \(consumed by A138-12\)/);
    // B holds only a consumer-free register; the orphan producer never trips a section guard
    expect(emitFieldConfigSql('a138', [], [sec('B')], snap).up).toContain("ws.code = 'B'");
  });
  it('nulls undefined optional columns and refuses duplicate keys', () => {
    const snap = foldSnapshot([{ worksheet: 'W', symbol: 's', data_type: 'text' }], [], {});
    expect(snap['W s']).toEqual({ enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: null, data_type: 'text', section_code: null, section_id_is_null: true, section_path: [] });
    expect(() => foldSnapshot([{ worksheet: 'W', symbol: 's' }, { worksheet: 'W', symbol: 's' }], [], {})).toThrow(/duplicate field key W s/);
    expect(() => foldSnapshot([], [{ worksheet: 'W', id: '1', section_code: 'c' }, { worksheet: 'W', id: '2', section_code: 'c' }], {})).toThrow(/duplicate section key W c/);
  });
});
