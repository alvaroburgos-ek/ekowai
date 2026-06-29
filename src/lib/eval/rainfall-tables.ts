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

/** Tagged result of a column resolution — tells the caller whether a column
 *  was present, served from the legacy design curve, or absent (withhold). */
export type ColumnResolution =
  | { status: 'ok';      rows: Array<{ id: string; D_min: number | null; r_D_n: number | null }> }
  | { status: 'legacy';  rows: Array<{ id: string; D_min: number | null; r_D_n: number | null }> }
  | { status: 'missing'; rows: [] };

/**
 * Slice a 2D rainfall table to a single T_n column, returning a tagged result.
 *
 * The contract is CONDITIONAL ON TABLE TYPE:
 *
 *  - `table.legacyDesignColumn === true` (un-migrated 1D data, no real columns,
 *    just the __legacyValue curve): serve that curve for ANY T_n — including
 *    T_n=null → `{ status: 'legacy', rows }`.  NEVER returns 'missing'.
 *    Existing projects have no columns and must keep computing for every
 *    facility until the engineer fills a real 2D grid.
 *
 *  - native 2D table (legacyDesignColumn falsy): if the requested column is
 *    populated (`row.r[String(T_n)]` finite for at least one row) →
 *    `{ status: 'ok', rows }`.  If that specific column is empty/absent, or
 *    `T_n === null` → `{ status: 'missing', rows: [] }`.  Never serves a
 *    different/neighbouring column.
 *
 * Each output row gets a stable `id` derived from the table id + row index.
 */
export function resolveColumn(
  table: RainfallTable,
  T_n: number | null,
): ColumnResolution {
  // Legacy / design-column table: serve the single legacy curve for ANY T_n
  // (including null). Withholding would break every existing project.
  if (table.legacyDesignColumn) {
    const rows = table.rows.map((row, i) => {
      const r_D_n = typeof row.__legacyValue === 'number' && Number.isFinite(row.__legacyValue)
        ? row.__legacyValue
        : null;
      return { id: `${table.id}-${i}`, D_min: row.D_min, r_D_n };
    });
    return { status: 'legacy', rows };
  }

  // Native 2D table: T_n=null or absent column → withhold.
  if (T_n === null) return { status: 'missing', rows: [] };

  const key = String(T_n) as TnKey;

  // Check if the exact native column is present (at least one finite value).
  const hasNativeColumn = table.rows.some((row) => {
    const v = row.r[key];
    return typeof v === 'number' && Number.isFinite(v);
  });

  if (hasNativeColumn) {
    const rows = table.rows.map((row, i) => {
      const explicit = row.r[key];
      const r_D_n = typeof explicit === 'number' && Number.isFinite(explicit)
        ? explicit
        : null;
      return { id: `${table.id}-${i}`, D_min: row.D_min, r_D_n };
    });
    return { status: 'ok', rows };
  }

  return { status: 'missing', rows: [] };
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

// =============================================================================
// Per-facility return-period helpers (shared between client and server paths)
// =============================================================================

/** Per-facility local frequency symbol.
 *  Mulde/Rigole/MRE/MRS/Becken have their own n_* field;
 *  basin (A138-13), Flächenversickerung (A138-16), and Schacht (A138-21)
 *  inherit the project n. */
export const FACILITY_FREQUENCY_SYMBOL: Readonly<Record<string, string>> = {
  'A138-17': 'n_M_Bemessung',
  'A138-18': 'n_R_Bemessung',
  'A138-19': 'n_R',
  'A138-20': 'n_R_MRS',
  'A138-22': 'n_B_Bemessung',
};

/** Snap a raw return period to the nearest value in RETURN_PERIODS. */
export function snapToReturnPeriod(raw: number): ReturnPeriod {
  let nearest: ReturnPeriod = RETURN_PERIODS[0];
  let minDist = Math.abs(raw - nearest);
  for (const rp of RETURN_PERIODS) {
    const d = Math.abs(raw - rp);
    if (d < minDist) { minDist = d; nearest = rp; }
  }
  return nearest;
}

/**
 * Resolve the design return-period column key for a facility.
 *
 * Resolution order:
 *  1. If the worksheet has a local n_* field with a finite value → T_n = 1/n_local.
 *  2. Else use the project T_n field value if finite (direct return period).
 *  3. Else use the project n field value → T_n = 1/n.
 *
 * Result is snapped to the nearest RETURN_PERIODS annuity. Returns null if no
 * usable input is available.
 *
 * This is a pure shared helper — the client hook (`use-equation-engine.ts`)
 * builds a `pickNumberBySymbol` closure from its React store and delegates here;
 * the server paths (`evaluate-for-report.ts`, `payload.ts`) build a similar
 * closure from their already-loaded value maps.
 */
export function facilityReturnPeriod(
  worksheetCode: string,
  pickNumberBySymbol: (sym: string) => number | null,
): ReturnPeriod | null {
  // 1. Local facility frequency (Mulde, Rigole, MRE, MRS, Becken)
  const localSym = FACILITY_FREQUENCY_SYMBOL[worksheetCode];
  if (localSym) {
    const nLocal = pickNumberBySymbol(localSym);
    if (nLocal !== null && nLocal > 0) {
      return snapToReturnPeriod(1 / nLocal);
    }
  }

  // 2. Project T_n field (direct return period value)
  const T_n_direct = pickNumberBySymbol('T_n');
  if (T_n_direct !== null && T_n_direct > 0) {
    return snapToReturnPeriod(T_n_direct);
  }

  // 3. Project n field → T_n = 1/n
  const nProject = pickNumberBySymbol('n');
  if (nProject !== null && nProject > 0) {
    return snapToReturnPeriod(1 / nProject);
  }

  return null;
}
