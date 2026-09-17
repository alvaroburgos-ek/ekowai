/**
 * Plan 3 Task 0 (fix round 1) — the pure parts of build-prior-snapshot.mjs:
 * optional-column detection (Plan-1 schema unapplied ⇒ `null as <col>`), the
 * capture queries, and the fold into the exact `PriorSnapshot` shape the
 * emitter accepts (`assertPriorSnapshot` is run on the folded result).
 * No network: main() only runs when the file is the CLI entry.
 */
import { describe, it, expect } from 'vitest';
import { detectColumns, buildQueries, foldSnapshot, OPTIONAL_FIELD_COLUMNS } from '../build-prior-snapshot.mjs';
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
    // both queries always carry the emitter's contract columns and the capture filter
    for (const q of [qa.fields, qp.fields]) {
      expect(q).toContain('f.enum_values, f.data_type, f.consumer_worksheets, ws.code as section_code');
      expect(q).toContain('left join worksheet_sections ws on ws.id = f.section_id');
      expect(q).toContain('where s.code = $1 and f.active');
    }
    expect(qa.sections).toContain('where s.code = $1 and ws.code is not null');
  });
});

describe('foldSnapshot', () => {
  const fieldRows = [
    { worksheet: 'A138-07', symbol: 'A_C', enum_values: null, data_type: 'number', consumer_worksheets: ['A138-12'], section_code: 'A138-07.1', widget: null, ui_config: null, lookup: null, visible_when: null },
    { worksheet: 'A138-07', symbol: 'surface_inventory', enum_values: [{ value: 'a', label_de: 'A', order_index: 0 }], data_type: 'json', consumer_worksheets: null, section_code: null, widget: 'register', ui_config: { title: 'T', columns: [{ key: 'a', label: 'A', type: 'text' }] }, lookup: null, visible_when: "x == 'y'" },
  ];
  const sectionRows = [{ worksheet: 'A138-07', section_code: 'A138-07.1', visible_when: null }];
  it('produces the PriorSnapshot shape (keys "<ws> <sym>", sections, _meta) that assertPriorSnapshot accepts, with full JSON values', () => {
    const snap = foldSnapshot(fieldRows, sectionRows, { standard: 'DWA-A-138-1', slug: 'a138' });
    expect(() => assertPriorSnapshot(snap)).not.toThrow();
    expect(snap._meta).toEqual({ standard: 'DWA-A-138-1', slug: 'a138', field_rows: 2, section_rows: 1 });
    expect(snap['A138-07 A_C']).toEqual({ enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: ['A138-12'], data_type: 'number', section_code: 'A138-07.1' });
    expect(snap['A138-07 surface_inventory'].ui_config).toEqual(fieldRows[1].ui_config); // object, not a string
    expect(snap['A138-07 surface_inventory'].enum_values).toEqual(fieldRows[1].enum_values);
    expect(snap.sections).toEqual({ 'A138-07 A138-07.1': { visible_when: null } });
    // and the emitter consumes it: the rollback restores the captured object byte-for-byte
    const { down } = emitFieldConfigSql('a138', [{ standard: 'DWA-A-138-1', worksheet: 'A138-07', symbol: 'surface_inventory', widget: 'register', ui_config: { title: 'U', columns: [{ key: 'b', label: 'B', type: 'text' }] }, verification_quote: 'q' }], [], snap);
    expect(down).toContain(`ui_config = '${JSON.stringify(fieldRows[1].ui_config)}'::jsonb`);
    expect(down).toContain("visible_when = 'x == ''y'''");
    // and the section-level producer guard sees A_C's consumers through section_code
    expect(() => emitFieldConfigSql('a138', [], [{ standard: 'DWA-A-138-1', worksheet: 'A138-07', section_code: 'A138-07.1', visible_when: 'a == 1', verification_quote: 'q' }], snap)).toThrow(/A_C \(consumed by A138-12\)/);
  });
  it('nulls undefined optional columns and refuses duplicate keys', () => {
    const snap = foldSnapshot([{ worksheet: 'W', symbol: 's', data_type: 'text' }], [], {});
    expect(snap['W s']).toEqual({ enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: null, data_type: 'text', section_code: null });
    expect(() => foldSnapshot([{ worksheet: 'W', symbol: 's' }, { worksheet: 'W', symbol: 's' }], [], {})).toThrow(/duplicate field key W s/);
    expect(() => foldSnapshot([], [{ worksheet: 'W', section_code: 'c' }, { worksheet: 'W', section_code: 'c' }], {})).toThrow(/duplicate section key W c/);
  });
});
