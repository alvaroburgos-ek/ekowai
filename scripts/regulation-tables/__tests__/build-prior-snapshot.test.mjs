/**
 * Plan 3 Task 0 (fix rounds 1–2) — the pure parts of build-prior-snapshot.mjs:
 * optional-column detection (Plan-1 schema unapplied ⇒ `null as <col>`), the
 * capture queries (fields incl. section_id; EVERY section with id/parent),
 * the ancestor walk and the fold into the exact `PriorSnapshot` shape the
 * emitter accepts (`assertPriorSnapshot` is run on the folded result); the Task 12c
 * `gates` map is folded with the REAL engine extractor (`extractConditionSymbols`).
 * No network: main() only runs when the file is the CLI entry.
 */
import { describe, it, expect } from 'vitest';
import { detectColumns, buildQueries, foldSnapshot, sectionPath, OPTIONAL_FIELD_COLUMNS } from '../prior-snapshot-fold.mjs';
import { assertPriorSnapshot, emitFieldConfigSql, PRIOR_SQL } from '../emit-field-configs-sql';
import { extractConditionSymbols } from '../../../src/lib/compliance/evaluate';

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
    expect(snap._meta).toEqual({ standard: 'DWA-A-138-1', slug: 'a138', field_rows: 3, section_rows: 3, sections_total: 4, equation_rows: 0, gate_rows: 0 });
    expect(snap.equations).toEqual({});
    expect(snap.gates).toEqual({});
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
    const { down } = emitFieldConfigSql('a138', [{ standard: 'DWA-A-138-1', worksheet: 'A138-07', symbol: 'surface_inventory', widget: 'register', ui_config: { title: 'U', columns: [{ key: 'b', label: 'B', type: 'text' }] }, visible_when: "m == 'a'", verification_quote: 'q' }], [], snap); // a rule-bearing entry: since the sign-off C-1 closure only such an entry restores visible_when
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
  it('equations (Task 3 fix round 1): the query selects id/equation_number/output/inputs per worksheet; the fold keys "<ws> <equation_number>" and the emitter walks the chain transitively', () => {
    const q = buildQueries(detectColumns([]));
    expect(q.equations).toContain('select w.code as worksheet, e.id, e.equation_number, e.output_symbol, e.input_symbols');
    expect(q.equations).toContain('from equations e join worksheet_templates w on w.id = e.worksheet_template_id');
    expect(q.equations).toContain('where s.code = $1 order by w.code, e.equation_number');
    const fields = [
      { worksheet: 'A262-06', symbol: 'm_T_aM', data_type: 'number', consumer_worksheets: null, section_id: 's-B', section_code: 'B' },
      { worksheet: 'A262-06', symbol: 'Q_F_d_aM', data_type: 'number', consumer_worksheets: [], section_id: 's-D', section_code: 'D' },
      { worksheet: 'A262-06', symbol: 'Q_T_d_aM', data_type: 'number', consumer_worksheets: ['A262-07', 'A262-09'], section_id: 's-F', section_code: 'F' },
    ];
    const secs = [
      { worksheet: 'A262-06', id: 's-B', parent_section_id: null, section_code: 'B', parent_code: null, visible_when: null },
      { worksheet: 'A262-06', id: 's-D', parent_section_id: null, section_code: 'D', parent_code: null, visible_when: null },
      { worksheet: 'A262-06', id: 's-F', parent_section_id: null, section_code: 'F', parent_code: null, visible_when: null },
    ];
    const eqs = [
      { worksheet: 'A262-06', id: 'e10', equation_number: '10', output_symbol: 'Q_F_d_aM', input_symbols: ['m_T_aM', 'Q_S_d_aM'] },
      { worksheet: 'A262-06', id: 'e9', equation_number: '9', output_symbol: 'Q_T_d_aM', input_symbols: ['Q_S_d_aM', 'Q_F_d_aM'] },
    ];
    const snap = foldSnapshot(fields, secs, { slug: 'a262e' }, eqs);
    expect(() => assertPriorSnapshot(snap)).not.toThrow();
    expect(snap._meta.equation_rows).toBe(2);
    expect(snap.equations).toEqual({
      'A262-06 10': { id: 'e10', output_symbol: 'Q_F_d_aM', input_symbols: ['m_T_aM', 'Q_S_d_aM'] },
      'A262-06 9': { id: 'e9', output_symbol: 'Q_T_d_aM', input_symbols: ['Q_S_d_aM', 'Q_F_d_aM'] },
    });
    const rule = { standard: 'DWA-A-262E', worksheet: 'A262-06', section_code: 'B', visible_when: 'a == 1', verification_quote: 'q' };
    expect(() => emitFieldConfigSql('a262e', [], [rule], snap)).toThrow("m_T_aM → Gl.10 Q_F_d_aM → Gl.9 Q_T_d_aM (consumed by A262-07, A262-09)");
    expect(() => foldSnapshot([], [], {}, [{ worksheet: 'W', equation_number: '1', output_symbol: 'x', input_symbols: [] }, { worksheet: 'W', equation_number: '1', output_symbol: 'y', input_symbols: [] }])).toThrow(/duplicate equation key W 1/);
    expect(foldSnapshot([], [], {}, [{ worksheet: 'W', equation_number: '1', output_symbol: 'x', input_symbols: null }]).equations['W 1']).toEqual({ id: null, output_symbol: 'x', input_symbols: [] });
  });
  it('gates (Task 12c): the query selects every compliance_requirements row per worksheet; the fold keys "<ws> <req_code>" with the ENGINE-extracted symbols (parse_error for prose), and the emitter refuses through them', () => {
    const q = buildQueries(detectColumns([]));
    expect(q.gates).toContain('select w.code as worksheet, cr.code as req_code, cr.condition, cr.severity');
    expect(q.gates).toContain('from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id');
    expect(q.gates).toContain('where s.code = $1 order by w.code, cr.code');
    expect(q.gates).not.toContain('active'); // the table has no active flag — every row is live
    expect(PRIOR_SQL.gates).toContain('cr.code as req_code, cr.condition, cr.severity from compliance_requirements cr');
    const fields = [
      { worksheet: 'A138-12', symbol: 'A_min', data_type: 'number', consumer_worksheets: null, section_id: 's-B', section_code: 'B' },
      { worksheet: 'A138-12', symbol: 'd_S', data_type: 'number', consumer_worksheets: null, section_id: 's-B', section_code: 'B' },
    ];
    const secs = [{ worksheet: 'A138-12', id: 's-B', parent_section_id: null, section_code: 'B', parent_code: null, visible_when: null }];
    const gates = [
      { worksheet: 'A138-12', req_code: 'CR-01', condition: 'max_d IS NOT NULL AND A_min IS NOT NULL', severity: 'block' },
      { worksheet: 'A138-12', req_code: 'CR-02', condition: "IF shaft_type == 'typ_B' THEN d_S >= 1 AND status == ok", severity: 'warn' },
      { worksheet: 'A138-12', req_code: 'CR-03', condition: 'Engineer attestation', severity: 'block' },
      { worksheet: 'A138-12', req_code: 'CR-04', condition: '', severity: 'info' },
      { worksheet: 'A138-12', req_code: 'CR-05', condition: 'count_rows(reg, v > lim) > 0 AND lookup(t, k) == x', severity: 'block' },
    ];
    const snap = foldSnapshot(fields, secs, { slug: 'a138' }, [], gates, extractConditionSymbols);
    expect(() => assertPriorSnapshot(snap)).not.toThrow();
    expect(snap._meta.gate_rows).toBe(5);
    expect(snap.gates).toEqual({
      'A138-12 CR-01': { condition: 'max_d IS NOT NULL AND A_min IS NOT NULL', severity: 'block', symbols: ['A_min', 'max_d'] },
      'A138-12 CR-02': { condition: "IF shaft_type == 'typ_B' THEN d_S >= 1 AND status == ok", severity: 'warn', symbols: ['d_S', 'shaft_type', 'status'] }, // enum-literal RHS `ok` is not a symbol
      'A138-12 CR-03': { condition: 'Engineer attestation', severity: 'block', symbols: [], parse_error: true },
      'A138-12 CR-04': { condition: '', severity: 'info', symbols: [], parse_error: true },
      'A138-12 CR-05': { condition: 'count_rows(reg, v > lim) > 0 AND lookup(t, k) == x', severity: 'block', symbols: ['k', 'reg', 't'] }, // row-scoped idents are column names (C-2)
    });
    // the emitter consumes it: A_min is refused through CR-01 (and the prose CR-03 conservatively); d_S only through the prose row;
    // the EMPTY-condition CR-04 is captured as parse_error but never refuses (round 2 — `manual` whatever is hidden)
    const rule = (symbol) => ({ standard: 'DWA-A-138-1', worksheet: 'A138-12', symbol, widget: 'scalar', visible_when: "shaft_type == 'typ_B'", verification_quote: 'q' });
    expect(() => emitFieldConfigSql('a138', [rule('A_min')], [], snap)).toThrow('hides A_min read by gate CR-01 (block: "max_d IS NOT NULL AND A_min IS NOT NULL"), CR-03 (block: "Engineer attestation" — parse_error, symbols unknown) — hidden');
    expect(() => emitFieldConfigSql('a138', [rule('A_min')], [], snap)).not.toThrow(/CR-04/);
    expect(() => emitFieldConfigSql('a138', [rule('d_S')], [], snap)).toThrow('hides d_S read by gate CR-03 (block: "Engineer attestation" — parse_error, symbols unknown) — hidden');
    expect(() => emitFieldConfigSql('a138', [rule('d_S')], [], snap)).not.toThrow(/CR-02/);
    // gate rows without the engine extractor are refused (never a re-implemented walk); duplicate keys too
    expect(() => foldSnapshot([], [], {}, [], gates)).toThrow(/gate rows need the engine extractor/);
    expect(() => foldSnapshot([], [], {}, [], [gates[0], gates[0]], extractConditionSymbols)).toThrow(/duplicate gate key A138-12 CR-01/);
  });
});
