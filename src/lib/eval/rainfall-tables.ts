/**
 * Multi-table rainfall carrier (Piece 2 → 2D KOSTRA grid).
 *
 * A project can hold MULTIPLE rainfall tables (KOSTRA-DWD-2020, local DWA-A 531,
 * different grid cells). Each table is now a 2D grid: rows = duration D, columns =
 * return period T_n. A facility REFERENCES which table it uses by id, and the
 * inherited T_n selects the column; `resolveColumn` slices it back to the 1D rows
 * the unchanged Gl.8 aggregator / iterateGoverningDuration already consume.
 *
 * Selection is of the TABLE (data source) only — never an r_D(n) VALUE. This
 * module is the data-model + resolution boundary; it never touches Gl.8 math.
 */

/** Canonical KOSTRA-DWD-2020 return-period columns (years). */
export const RETURN_PERIODS = [1, 2, 3, 5, 10, 30, 50, 100] as const;
export type ReturnPeriod = typeof RETURN_PERIODS[number]; // 1|2|3|5|10|30|50|100
export type TnKey = `${ReturnPeriod}`;                    // "1"|"2"|…|"100"

export type RainfallSource = 'KOSTRA-DWD-2020' | 'DWA-A-531-local' | 'engineer';

/** Legacy 1D row shape — kept for resolveColumn output and back-compat consumers. */
export type RainfallRow = { D_min: number | null; r_D_n: number | null };

/** A duration row in the 2D grid: r_D for each return-period column.
 *  Missing/empty entries → null.
 *  The private __legacyValue slot is set for rows originating from a 1D legacy
 *  curve; resolveColumn reads it to serve any T_n until the real grid is filled. */
export type RainfallGridRow = {
  D_min: number | null;
  r: Partial<Record<TnKey, number | null>>;
  /** @internal Back-compat: the original r_D_n value from a legacy 1D curve. */
  __legacyValue?: number | null;
};

export type RainfallTable = {
  id: string;
  name: string;
  source: RainfallSource;
  gridCell?: string;
  note?: string;
  /** Which return-period columns this table carries. Defaults to RETURN_PERIODS. */
  columns: ReturnPeriod[];
  rows: RainfallGridRow[];
  /** Back-compat marker: rows came from a legacy 1D table whose single curve is
   *  the project's DESIGN-T_n column (true until the engineer fills the real grid). */
  legacyDesignColumn?: boolean;
};

export type RainfallCarrier = { tables: RainfallTable[] };

const VALID_SOURCES: ReadonlySet<string> = new Set<RainfallSource>([
  'KOSTRA-DWD-2020',
  'DWA-A-531-local',
  'engineer',
]);

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Detect whether a raw row is a native 2D row (has an `r` object, not `r_D_n`). */
function isNative2DRow(r: unknown): r is { D_min?: unknown; r?: unknown } {
  if (r == null || typeof r !== 'object') return false;
  const row = r as Record<string, unknown>;
  return 'r' in row && typeof row['r'] === 'object' && row['r'] !== null;
}

/** Normalize a raw array of rows from a native 2D source. */
function normalizeGridRows(raw: unknown): RainfallGridRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as { D_min?: unknown; r?: unknown };
    const rMap = (typeof row.r === 'object' && row.r !== null ? row.r : {}) as Record<string, unknown>;
    const normalized: Partial<Record<TnKey, number | null>> = {};
    for (const k of Object.keys(rMap) as TnKey[]) {
      normalized[k] = num(rMap[k]);
    }
    return { D_min: num(row.D_min), r: normalized };
  });
}

/** Normalize a raw array of legacy 1D rows into 2D grid rows with __legacyValue. */
function normalizeLegacyRows(raw: unknown): RainfallGridRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as { D_min?: unknown; r_D_n?: unknown };
    const legacyValue = num(row.r_D_n);
    const gridRow: RainfallGridRow = { D_min: num(row.D_min), r: {} };
    if (legacyValue !== null) {
      gridRow.__legacyValue = legacyValue;
    } else {
      gridRow.__legacyValue = null;
    }
    return gridRow;
  });
}

/** Detect if a raw row array is native 2D (first row has `r` object) vs legacy 1D. */
function detectNative2D(rows: unknown[]): boolean {
  if (rows.length === 0) return false;
  return isNative2DRow(rows[0]);
}

function normalizeTable(raw: unknown, index: number): RainfallTable {
  const t = (raw ?? {}) as Partial<{
    id: unknown;
    name: unknown;
    source: unknown;
    gridCell: unknown;
    note: unknown;
    rows: unknown;
    columns: unknown;
    legacyDesignColumn: unknown;
  }>;

  const source = typeof t.source === 'string' && VALID_SOURCES.has(t.source)
    ? (t.source as RainfallSource)
    : 'engineer';

  const rawRows = Array.isArray(t.rows) ? t.rows : [];

  // Detect if this is a native 2D table (row has `r` object) or legacy 1D
  const isNative = detectNative2D(rawRows);

  let rows: RainfallGridRow[];
  let legacyDesignColumn: boolean | undefined;
  let columns: ReturnPeriod[];

  if (isNative) {
    // Native 2D: pass r map through; respect declared columns if present
    rows = normalizeGridRows(rawRows);
    legacyDesignColumn = undefined; // not a legacy table
    if (Array.isArray(t.columns) && t.columns.length > 0) {
      columns = (t.columns as number[]).filter((c): c is ReturnPeriod =>
        (RETURN_PERIODS as readonly number[]).includes(c)
      );
    } else {
      columns = [...RETURN_PERIODS];
    }
  } else {
    // Legacy 1D (r_D_n rows): wrap as design column
    rows = normalizeLegacyRows(rawRows);
    legacyDesignColumn = true;
    columns = [...RETURN_PERIODS];
  }

  const out: RainfallTable = {
    id: typeof t.id === 'string' && t.id ? t.id : `table-${index}`,
    name: typeof t.name === 'string' && t.name ? t.name : `Tabelle ${index + 1}`,
    source,
    columns,
    rows,
  };
  if (legacyDesignColumn !== undefined) out.legacyDesignColumn = legacyDesignColumn;
  if (typeof t.gridCell === 'string' && t.gridCell) out.gridCell = t.gridCell;
  if (typeof t.note === 'string' && t.note) out.note = t.note;
  return out;
}

/**
 * Parse a rainfall carrier into the 2D grid shape. Accepts THREE input shapes:
 * (a) legacy `{ rows: [{D_min, r_D_n}] }` — wrapped as one table, legacyDesignColumn:true
 * (b) Piece-2 `{ tables: [{…, rows:[{D_min,r_D_n}]}] }` — each table upgraded, legacyDesignColumn:true
 * (c) native 2D `{ tables: [{…, columns, rows:[{D_min,r}]}] }` — passed through
 *
 * For (a)+(b), the legacy curve value is carried on each row under __legacyValue
 * (read by resolveColumn to serve any T_n until the real grid is filled).
 * Safe on malformed input → `{ tables: [] }`.
 */
export function normalizeRainfallCarrier(raw: unknown): RainfallCarrier {
  if (raw == null || typeof raw !== 'object') return { tables: [] };

  const obj = raw as { tables?: unknown; rows?: unknown };

  if (Array.isArray(obj.tables)) {
    return { tables: obj.tables.map((t, i) => normalizeTable(t, i)) };
  }
  if (Array.isArray(obj.rows)) {
    // Legacy top-level {rows} shape → one table, id "default"
    const rawRows = obj.rows;
    const isNative = detectNative2D(rawRows);
    let rows: RainfallGridRow[];
    let legacyDesignColumn: boolean | undefined;

    if (isNative) {
      rows = normalizeGridRows(rawRows);
      legacyDesignColumn = undefined;
    } else {
      rows = normalizeLegacyRows(rawRows);
      legacyDesignColumn = true;
    }

    const table: RainfallTable = {
      id: 'default',
      name: 'Standardtabelle',
      source: 'engineer',
      columns: [...RETURN_PERIODS],
      rows,
    };
    if (legacyDesignColumn !== undefined) table.legacyDesignColumn = legacyDesignColumn;
    return { tables: [table] };
  }

  return { tables: [] };
}

/** Resolve which table a facility uses: the one matching `ref`, else the
 * primary (first) table when `ref` is null/unset or stale, else null when the
 * project holds no tables. The selected table's rows feed the column resolver
 * and then the UNCHANGED Gl.8 aggregator — this never selects an r_D(n) value,
 * only the table. */
export function resolveSelectedTable(
  carrier: RainfallCarrier,
  ref: string | null,
): RainfallTable | null {
  if (carrier.tables.length === 0) return null;
  if (ref != null) {
    const match = carrier.tables.find((t) => t.id === ref);
    if (match) return match;
  }
  return carrier.tables[0];
}
