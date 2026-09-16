/** Single accessor for guideline reference tables (invariant rule 4/5). Data is registered
 * from the DB (regulation_tables) by the page; pure modules (tab9.ts, tab6-loading.ts) fall back
 * to their TS constants when nothing is registered, so behaviour is identical with an empty DB. */
export type ValueColumn = { name: string; type: 'number' | 'string' | 'enum' | 'boolean'; unit?: string; values?: string[] };
export type RegulationRow = { row_key: string; keys: Record<string, string>; group_label: string | null; label_de: string; order_index: number; values: Record<string, number | string | boolean | null>; verbatim_quote: string };
export type RegulationTable = { standard_code: string; edition: string; table_code: string; title_de: string; clause_reference: string | null; page_ref: string | null; key_columns: string[]; value_columns: ValueColumn[]; override_policy: 'locked' | 'anhaltswert' | 'kann' | 'messwert'; override_quote: string | null; verification_status: string; rows: RegulationRow[] };

const REGISTRY = new Map<string, RegulationTable>(); // key = std :: edition :: code
const SEP = ' :: ';
const k = (std: string, edition: string, code: string) => std + SEP + edition + SEP + code;

/** row_key = key values joined by '|' in key_columns order; key values must not contain '|'. */
export function rowKeyFor(keys: Record<string, string>, keyColumns: string[]): string {
  return keyColumns.map((c) => keys[c] ?? '').join('|');
}
export function registerTables(tables: RegulationTable[]): void {
  for (const t of tables) REGISTRY.set(k(t.standard_code, t.edition, t.table_code), { ...t, rows: [...t.rows].sort((a, b) => a.order_index - b.order_index) });
}
export function clearTables(): void { REGISTRY.clear(); }
export function getTable(std: string, edition: string | undefined, code: string): RegulationTable | undefined {
  if (edition) return REGISTRY.get(k(std, edition, code));
  let best: RegulationTable | undefined;
  for (const t of REGISTRY.values()) if (t.standard_code === std && t.table_code === code && (!best || t.edition > best.edition)) best = t;
  return best;
}
/** Plan 2a: the table for `code` when exactly ONE registered standard carries it (latest edition);
 * `undefined` when absent or when two standards both register the code (ambiguous → never guess). */
export function findTableByCode(code: string): RegulationTable | undefined {
  let best: RegulationTable | undefined;
  for (const t of REGISTRY.values()) {
    if (t.table_code !== code) continue;
    if (best && best.standard_code !== t.standard_code) return undefined;
    if (!best || t.edition > best.edition) best = t;
  }
  return best;
}
export function lookupRow(std: string, edition: string | undefined, code: string, keys: Record<string, string>): RegulationRow | undefined {
  const t = getTable(std, edition, code);
  if (!t) return undefined;
  const rk = rowKeyFor(keys, t.key_columns);
  return t.rows.find((r) => r.row_key === rk);
}
