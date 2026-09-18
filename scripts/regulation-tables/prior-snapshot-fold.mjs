// Plan 3 Task 0 / Task 12c — the PURE parts of the prior-snapshot capture (no shebang, no network, no
// process access): optional-column detection → the four capture queries, the section ancestor walk and the
// fold into the exact `PriorSnapshot` shape the emitter consumes (scripts/regulation-tables/emit-field-configs-sql.ts).
// The CLI `build-prior-snapshot.mjs` re-exports everything here and adds main() (prod READ ONLY transaction) plus
// the tsx loader for the engine's `extractConditionSymbols`. Split out (Task 12c round 2) so the unit test
// (scripts/regulation-tables/__tests__/build-prior-snapshot.test.mjs) imports a module without a shebang —
// vitest 4.1.5 (happy-dom project) injects an import header ahead of a shebang line and fails to parse it.
// Contract, shape and rules: see the header of build-prior-snapshot.mjs.

export const OPTIONAL_FIELD_COLUMNS = ['widget', 'ui_config', 'lookup', 'visible_when'];
export const OPTIONAL_SECTION_COLUMNS = ['visible_when'];

/** From information_schema rows `{ table_name, column_name }` → which optional columns exist. */
export function detectColumns(informationSchemaRows) {
  const has = (table, col) => informationSchemaRows.some((r) => r.table_name === table && r.column_name === col);
  return {
    fields: Object.fromEntries(OPTIONAL_FIELD_COLUMNS.map((c) => [c, has('fields', c)])),
    worksheet_sections: Object.fromEntries(OPTIONAL_SECTION_COLUMNS.map((c) => [c, has('worksheet_sections', c)])),
  };
}

/** The four capture queries, with `null as <col>` for every optional column prod does not have yet. `$1` = standards.code. */
export function buildQueries(columnsPresent) {
  const fieldSelect = OPTIONAL_FIELD_COLUMNS.map((c) => (columnsPresent.fields[c] ? `f.${c}` : `null as ${c}`)).join(', ');
  const sectionSelect = OPTIONAL_SECTION_COLUMNS.map((c) => (columnsPresent.worksheet_sections[c] ? `ws.${c}` : `null as ${c}`)).join(', ');
  return {
    fields: `select w.code as worksheet, f.symbol, f.enum_values, f.data_type, f.consumer_worksheets, f.section_id, ws.code as section_code, ${fieldSelect}
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
left join worksheet_sections ws on ws.id = f.section_id
where s.code = $1 and f.active order by w.code, f.symbol`,
    sections: `select w.code as worksheet, ws.id, ws.parent_section_id, ws.code as section_code, p.code as parent_code, ${sectionSelect}
from worksheet_sections ws join worksheet_templates w on w.id = ws.worksheet_template_id join standards s on s.id = w.standard_id
left join worksheet_sections p on p.id = ws.parent_section_id
where s.code = $1 order by w.code, ws.order_index, ws.code`,
    equations: `select w.code as worksheet, e.id, e.equation_number, e.output_symbol, e.input_symbols
from equations e join worksheet_templates w on w.id = e.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = $1 order by w.code, e.equation_number`,
    // Task 12c: every gate of the standard (compliance_requirements carries no active flag — all rows are live).
    gates: `select w.code as worksheet, cr.code as req_code, cr.condition, cr.severity
from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = $1 order by w.code, cr.code`,
  };
}

/** Codes of a section's ancestors root → itself, walking `parent_section_id` (a cycle in bad data stops the walk). */
export function sectionPath(sectionId, byId) {
  const path = [];
  const seen = new Set();
  for (let id = sectionId; id != null && byId.has(id) && !seen.has(id); id = byId.get(id).parent_section_id) {
    seen.add(id);
    path.unshift(byId.get(id).section_code ?? null);
  }
  return path;
}

/**
 * Folds the row sets into the `PriorSnapshot` object (throws on a duplicate key). `sectionRows` is EVERY
 * section of the standard (id, parent_section_id, code, parent_code, visible_when); the coded ones become the
 * `sections` map, all of them feed each field's `section_path`. `equationRows` (optional, Task 3 fix round 1)
 * is every equation of the standard → the `equations` map keyed "<worksheet> <equation_number>". `gateRows`
 * (optional, Task 12c) is every compliance_requirements row → the `gates` map keyed "<worksheet> <req_code>",
 * each with the symbols its condition reads per `extractConditionSymbols` (the engine's own walk, injected — a
 * null return = the engine cannot parse the condition ⇒ `symbols: []` + `parse_error: true`). Passing gate rows
 * without the extractor is an error: the map must never be built with a re-implemented symbol walk.
 */
export function foldSnapshot(fieldRows, sectionRows, meta, equationRows = [], gateRows = [], extractConditionSymbols = null) {
  const byId = new Map(sectionRows.filter((r) => r.id != null).map((r) => [r.id, r]));
  const coded = sectionRows.filter((r) => r.section_code != null);
  if (gateRows.length && typeof extractConditionSymbols !== 'function') throw new Error('foldSnapshot: gate rows need the engine extractor (extractConditionSymbols from src/lib/compliance/evaluate.ts)');
  const snapshot = { _meta: { ...meta, field_rows: fieldRows.length, section_rows: coded.length, sections_total: sectionRows.length, equation_rows: equationRows.length, gate_rows: gateRows.length } };
  for (const r of fieldRows) {
    const key = `${r.worksheet} ${r.symbol}`;
    if (snapshot[key]) throw new Error(`duplicate field key ${key}`);
    snapshot[key] = {
      enum_values: r.enum_values ?? null,
      widget: r.widget ?? null,
      ui_config: r.ui_config ?? null,
      lookup: r.lookup ?? null,
      visible_when: r.visible_when ?? null,
      consumer_worksheets: r.consumer_worksheets ?? null,
      data_type: r.data_type,
      section_code: r.section_code ?? null,
      section_id_is_null: r.section_id == null,
      section_path: r.section_id == null ? [] : sectionPath(r.section_id, byId),
    };
  }
  snapshot.sections = {};
  for (const r of coded) {
    const key = `${r.worksheet} ${r.section_code}`;
    if (snapshot.sections[key]) throw new Error(`duplicate section key ${key}`);
    snapshot.sections[key] = { visible_when: r.visible_when ?? null, parent_code: r.parent_code ?? null };
  }
  snapshot.equations = {};
  for (const r of equationRows) {
    const key = `${r.worksheet} ${r.equation_number}`;
    if (snapshot.equations[key]) throw new Error(`duplicate equation key ${key}`);
    snapshot.equations[key] = { id: r.id ?? null, output_symbol: r.output_symbol, input_symbols: Array.isArray(r.input_symbols) ? [...r.input_symbols] : [] };
  }
  snapshot.gates = {};
  for (const r of gateRows) {
    const key = `${r.worksheet} ${r.req_code}`;
    if (snapshot.gates[key]) throw new Error(`duplicate gate key ${key}`);
    const condition = r.condition ?? '';
    if (r.severity == null) console.error(`NOTICE: gate ${key} has a NULL severity — prod has none today; the emitter accepts it, the executor should record it`);
    const symbols = condition.trim() ? extractConditionSymbols(condition) : null;
    snapshot.gates[key] = symbols
      ? { condition, severity: r.severity ?? null, symbols: [...symbols].sort() }
      : { condition, severity: r.severity ?? null, symbols: [], parse_error: true };
  }
  return snapshot;
}
