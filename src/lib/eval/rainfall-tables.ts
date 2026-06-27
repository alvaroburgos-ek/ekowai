/**
 * Multi-table rainfall carrier (Piece 2). A project can hold MULTIPLE rainfall
 * tables (KOSTRA-DWD-2020, local DWA-A 531, different grid cells), each with a
 * source/provenance tag; each facility REFERENCES which table it uses by id.
 *
 * Selection is of the TABLE (data source) only — never an r_D(n) VALUE. The
 * value a facility uses stays engine-derived (iteration / fixed-D = Piece 1).
 * This module is the data-model + resolution boundary; it never touches the
 * Gl.8 aggregator math.
 */

export type RainfallSource = 'KOSTRA-DWD-2020' | 'DWA-A-531-local' | 'engineer';

export type RainfallRow = { D_min: number | null; r_D_n: number | null };

export type RainfallTable = {
  id: string;
  name: string;
  source: RainfallSource;
  gridCell?: string;
  note?: string;
  rows: RainfallRow[];
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

function normalizeRows(raw: unknown): RainfallRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as { D_min?: unknown; r_D_n?: unknown };
    return { D_min: num(row.D_min), r_D_n: num(row.r_D_n) };
  });
}

function normalizeTable(raw: unknown, index: number): RainfallTable {
  const t = (raw ?? {}) as Partial<RainfallTable> & { source?: unknown };
  const source = typeof t.source === 'string' && VALID_SOURCES.has(t.source)
    ? (t.source as RainfallSource)
    : 'engineer';
  const out: RainfallTable = {
    id: typeof t.id === 'string' && t.id ? t.id : `table-${index}`,
    name: typeof t.name === 'string' && t.name ? t.name : `Tabelle ${index + 1}`,
    source,
    rows: normalizeRows(t.rows),
  };
  if (typeof t.gridCell === 'string' && t.gridCell) out.gridCell = t.gridCell;
  if (typeof t.note === 'string' && t.note) out.note = t.note;
  return out;
}

/** Parse a rainfall carrier. Accepts BOTH the new `{ tables }` shape and the
 * legacy single-table `{ rows }` shape (wrapped as one `engineer` table with
 * id `default`). Safe on malformed input → `{ tables: [] }`. */
export function normalizeRainfallCarrier(raw: unknown): RainfallCarrier {
  const obj = raw as { tables?: unknown; rows?: unknown } | null | undefined;
  if (obj && Array.isArray(obj.tables)) {
    return { tables: obj.tables.map((t, i) => normalizeTable(t, i)) };
  }
  if (obj && Array.isArray(obj.rows)) {
    return {
      tables: [
        { id: 'default', name: 'Standardtabelle', source: 'engineer', rows: normalizeRows(obj.rows) },
      ],
    };
  }
  return { tables: [] };
}

/** Resolve which table a facility uses: the one matching `ref`, else the
 * primary (first) table when `ref` is null/unset or stale, else null when the
 * project holds no tables. The selected table's rows feed the UNCHANGED Gl.8
 * aggregator — this never selects an r_D(n) value, only the table. */
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
