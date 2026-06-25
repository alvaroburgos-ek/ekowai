/**
 * A138-07 surface-inventory carrier: row shape, derivations, and the
 * migrating normalizer. The normalizer is the single shared parse/migration
 * path used by BOTH the editor and (Plan 2) the engine, so they can never
 * diverge. Tab. 9 values flow only through ./tab9 accessors.
 */
import { getTab9Entries, lookupTab9 } from './tab9';

export type SurfaceRow = {
  id: string;
  label: string;
  /** Selected Tab. 9 entry key; null ⇒ engineer must (re)select. */
  tab9_value: string | null;
  area_m2: number | null;
  c_i: number | null;
  c_s: number | null;
  /** true ⇒ engineer adjusted c_i/c_s away from the Tab. 9 pair ("abweichend"). */
  coeff_override: boolean;
};

export type SurfaceInventoryCarrier = { rows: SurfaceRow[] };

/** Explicit coarse-label → Tab. 9 key map for the old surface_type values
 * that have a defined target (per the spec migration note). */
const LEGACY_LABEL_MAP: Readonly<Record<string, string>> = {
  asphalt: 'schwarzdecke_asphalt',
  rasen: 'park_flach',
};

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newSurfaceRow(): SurfaceRow {
  return { id: genId(), label: '', tab9_value: null, area_m2: null, c_i: null, c_s: null, coeff_override: false };
}

export function rowKind(row: SurfaceRow): 'paved' | 'unpaved' | null {
  if (!row.tab9_value) return null;
  return lookupTab9(row.tab9_value)?.kind ?? null;
}

export function rowComplete(row: SurfaceRow): boolean {
  return (
    row.area_m2 != null && Number.isFinite(row.area_m2) &&
    row.tab9_value != null &&
    row.c_i != null && Number.isFinite(row.c_i) &&
    row.c_s != null && Number.isFinite(row.c_s)
  );
}

export function rowMismatch(row: SurfaceRow): boolean {
  if (!row.tab9_value) return false;
  const e = lookupTab9(row.tab9_value);
  return e != null && row.c_i != null && row.c_i !== e.cm;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Find the Tab. 9 key whose (cm,cs) uniquely matches the given pair. Returns
 * null when zero or >1 entries match (ambiguous ⇒ no auto-map). */
function uniqueMatchByPair(c_i: number | null, c_s: number | null): string | null {
  if (c_i == null || c_s == null) return null;
  const hits = getTab9Entries().filter((e) => e.cm === c_i && e.cs === c_s);
  return hits.length === 1 ? hits[0].value : null;
}

function normalizeRow(raw: unknown): SurfaceRow {
  if (!raw || typeof raw !== 'object') return newSurfaceRow();
  const r = raw as Record<string, unknown>;
  const base: SurfaceRow = {
    id: typeof r.id === 'string' && r.id.length > 0 ? r.id : genId(),
    label: typeof r.label === 'string' ? r.label : '',
    tab9_value: null,
    area_m2: num(r.area_m2),
    c_i: num(r.c_i),
    c_s: num(r.c_s),
    coeff_override: false,
  };

  // Already-new shape: has a tab9_value key OR a coeff_override flag.
  if ('tab9_value' in r || 'coeff_override' in r) {
    const tab9_value = typeof r.tab9_value === 'string' && r.tab9_value.length > 0 ? r.tab9_value : null;
    const coeff_override = r.coeff_override === true;
    return { ...base, tab9_value, coeff_override };
  }

  // Legacy shape: migrate from surface_type.
  const surfaceType = typeof r.surface_type === 'string' ? r.surface_type : '';
  const mapped = LEGACY_LABEL_MAP[surfaceType] ?? uniqueMatchByPair(base.c_i, base.c_s);
  if (!mapped) {
    // Unmapped or ambiguous ⇒ reselection; preserve c_i/c_s untouched.
    return base;
  }
  const entry = lookupTab9(mapped);
  if (!entry) return base;
  const c_i = base.c_i ?? entry.cm;               // keep stored c_i; fill only if absent
  const c_s = base.c_s ?? entry.cs;               // backfill missing c_s from the pair
  const coeff_override = c_i !== entry.cm;          // stored c_i differs ⇒ audited override
  return { ...base, tab9_value: mapped, c_i, c_s, coeff_override };
}

export function normalizeSurfaceCarrier(value: unknown): SurfaceInventoryCarrier {
  if (!value || typeof value !== 'object') return { rows: [] };
  const v = value as { rows?: unknown };
  if (!Array.isArray(v.rows)) return { rows: [] };
  return { rows: v.rows.map(normalizeRow) };
}

export type SurfaceSummary = {
  A_C: number | null;
  A_C_sealed: number | null;
  A_C_unsealed: number | null;
  A_E_ba: number | null;
  A_E_nba: number | null;
  C_m: number | null;
  complete: number;
  total: number;
};

/** Single source of the Gl. 2 sums. Operates only on COMPLETE rows. When no
 * row is complete every sum is null (C_m guards ΣA=0). */
export function summarizeSurfaces(carrier: SurfaceInventoryCarrier): SurfaceSummary {
  let sealed = 0;        // Σ(area·c_i) paved
  let unsealed = 0;      // Σ(area·c_i) unpaved
  let areaPaved = 0;     // Σ area paved
  let areaUnpaved = 0;   // Σ area unpaved
  let complete = 0;
  for (const r of carrier.rows) {
    if (!rowComplete(r)) continue;
    complete++;
    const area = r.area_m2 as number;
    const contrib = area * (r.c_i as number);
    if (rowKind(r) === 'paved') { sealed += contrib; areaPaved += area; }
    else { unsealed += contrib; areaUnpaved += area; }
  }
  if (complete === 0) {
    return { A_C: null, A_C_sealed: null, A_C_unsealed: null, A_E_ba: null, A_E_nba: null, C_m: null, complete: 0, total: carrier.rows.length };
  }
  const A_C = sealed + unsealed;
  const areaTotal = areaPaved + areaUnpaved;
  const C_m = areaTotal > 0 ? A_C / areaTotal : null;
  return { A_C, A_C_sealed: sealed, A_C_unsealed: unsealed, A_E_ba: areaPaved, A_E_nba: areaUnpaved, C_m, complete, total: carrier.rows.length };
}
