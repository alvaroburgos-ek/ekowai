/**
 * Plant reference catalogue — the PURE filter behind GET /api/plant-catalog (2026-10-05).
 *
 * The route loads the visible rows (licence_status guideline | cleared, active) and hands them here; this module
 * applies the query, sorts by name and writes one `recommended` reason per row. Nothing here is normative: the
 * catalogue is a reference layer ("Referenz (nicht normativ)"), it never changes a gate or an FLL value.
 *
 * Filter semantics (documented so the UI and the tests agree):
 * - `q`         case-insensitive substring over scientific / German / English name.
 * - `group`     exact plant_group match.
 * - `maxDepthCm` the zone's water depth: a row passes when its depth_min_cm is null (legend missing — kept, flagged)
 *               or ≤ maxDepthCm (the species can be planted somewhere inside that depth).
 * - `light`     "tolerates at least this much shade": sun ⇒ every known row; partial ⇒ partial | shade; shade ⇒ shade.
 *               Rows with light 'unknown' pass only when no light filter is set.
 * - `aggressive` true ⇒ only aggressive_rhizome rows; false ⇒ only non-aggressive rows; undefined ⇒ both.
 */
import type { PlantCatalogRow } from '@/lib/db/schema';

export const PLANT_GROUPS = ['submerged', 'floating_leaved', 'marsh_small', 'marsh_medium_high', 'bank_terrestrial', 'other'] as const;
export type PlantGroup = (typeof PLANT_GROUPS)[number];
export const LIGHT_LEVELS = ['sun', 'partial', 'shade', 'unknown'] as const;
export type LightLevel = (typeof LIGHT_LEVELS)[number];
export const CATALOG_PAGE_SIZE = 50;

export const PLANT_GROUP_LABELS: Record<PlantGroup, string> = {
  submerged: 'Unterwasserpflanzen',
  floating_leaved: 'Schwimmblattpflanzen',
  marsh_small: 'Sumpfpflanzen, niedrig',
  marsh_medium_high: 'Sumpfpflanzen, mittel bis hoch',
  bank_terrestrial: 'Ufer / terrestrisch',
  other: 'ohne Gruppenzuordnung',
};
export const LIGHT_LABELS: Record<LightLevel, string> = { sun: 'Sonne', partial: 'bis Halbschatten', shade: 'bis Schatten', unknown: 'Licht unbekannt' };

export type CatalogQuery = {
  q?: string;
  group?: PlantGroup;
  maxDepthCm?: number;
  light?: Exclude<LightLevel, 'unknown'>;
  aggressive?: boolean;
};

/** The row shape the API returns (a projection of the table row + the reason). */
export type CatalogHit = {
  id: string;
  scientific_name: string;
  common_name_de: string | null;
  common_name_en: string | null;
  plant_group: PlantGroup;
  depth_zone_code: string | null;
  depth_min_cm: number | null;
  depth_max_cm: number | null;
  light: LightLevel;
  height_cm: number | null;
  bloom: string | null;
  hardiness_zones: string | null;
  water_hardness: string | null;
  nitrogen_demand: string | null;
  origin_regions: string | null;
  planting_codes: string[] | null;
  notes: string | null;
  aggressive_rhizome: boolean;
  aggressive_source: string | null;
  source_kind: 'guideline' | 'reference_book';
  source_ref: string;
  /** Why this row is in the result for THIS query — plain German, "Referenz (nicht normativ)" semantics. */
  recommended: string;
};

/** Parse URL search params into a validated query; unknown values are dropped (never guessed). */
export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const out: CatalogQuery = {};
  const q = params.get('q')?.trim();
  if (q) out.q = q;
  const group = params.get('group');
  if (group && (PLANT_GROUPS as readonly string[]).includes(group)) out.group = group as PlantGroup;
  const depth = params.get('maxDepthCm');
  if (depth != null && depth !== '') { const n = Number(depth); if (Number.isFinite(n) && n >= 0) out.maxDepthCm = n; }
  const light = params.get('light');
  if (light === 'sun' || light === 'partial' || light === 'shade') out.light = light;
  const aggressive = params.get('aggressive');
  if (aggressive === 'true' || aggressive === '1') out.aggressive = true;
  else if (aggressive === 'false' || aggressive === '0') out.aggressive = false;
  return out;
}

const LIGHT_RANK: Record<LightLevel, number> = { sun: 0, partial: 1, shade: 2, unknown: -1 };

function matchesLight(row: LightLevel, wanted: CatalogQuery['light']): boolean {
  if (!wanted) return true;
  if (row === 'unknown') return false;
  return LIGHT_RANK[row] >= LIGHT_RANK[wanted];
}

function matchesQ(r: PlantCatalogRow, q: string): boolean {
  const needle = q.toLowerCase();
  return [r.scientificName, r.commonNameDe, r.commonNameEn].some((s) => !!s && s.toLowerCase().includes(needle));
}

function reasonFor(r: PlantCatalogRow, query: CatalogQuery): string {
  const parts: string[] = [];
  if (query.group) parts.push(`Gruppe ${PLANT_GROUP_LABELS[r.plantGroup as PlantGroup] ?? r.plantGroup}`);
  if (query.maxDepthCm != null) {
    if (r.depthMinCm == null) parts.push(`Tiefenzone ${r.depthZoneCode ?? '—'} (Legende fehlt — nicht gegen ${query.maxDepthCm} cm geprüft)`);
    else parts.push(`Pflanztiefe ${r.depthMinCm}–${r.depthMaxCm ?? '?'} cm ≤ ${query.maxDepthCm} cm Zonentiefe`);
  }
  if (query.light) parts.push(LIGHT_LABELS[r.light as LightLevel] ?? r.light);
  if (r.aggressiveRhizome) parts.push(`aggressiv wurzelnd / rhizombildend (${r.sourceRef})`);
  if (parts.length === 0) parts.push(query.q ? `Namenstreffer „${query.q}“` : 'Referenzeintrag');
  return `${parts.join(' · ')} — Referenz (nicht normativ): ${r.sourceRef}`;
}

function toHit(r: PlantCatalogRow, query: CatalogQuery): CatalogHit {
  return {
    id: r.id,
    scientific_name: r.scientificName,
    common_name_de: r.commonNameDe,
    common_name_en: r.commonNameEn,
    plant_group: r.plantGroup as PlantGroup,
    depth_zone_code: r.depthZoneCode,
    depth_min_cm: r.depthMinCm,
    depth_max_cm: r.depthMaxCm,
    light: r.light as LightLevel,
    height_cm: r.heightCm,
    bloom: r.bloom,
    hardiness_zones: r.hardinessZones,
    water_hardness: r.waterHardness,
    nitrogen_demand: r.nitrogenDemand,
    origin_regions: r.originRegions,
    planting_codes: r.plantingCodes,
    notes: r.notes,
    aggressive_rhizome: r.aggressiveRhizome,
    aggressive_source: r.aggressiveSource,
    source_kind: r.sourceKind as CatalogHit['source_kind'],
    source_ref: r.sourceRef,
    recommended: reasonFor(r, query),
  };
}

/** Rows the API may ever serve: active, licence guideline or cleared. Pending (book) rows are invisible. */
export function isVisible(r: Pick<PlantCatalogRow, 'active' | 'licenceStatus'>): boolean {
  return r.active && (r.licenceStatus === 'guideline' || r.licenceStatus === 'cleared');
}

/** Filter + sort + cap. `rows` may still contain invisible rows — they are dropped here too (belt and braces). */
export function filterCatalog(rows: readonly PlantCatalogRow[], query: CatalogQuery, limit = CATALOG_PAGE_SIZE): { hits: CatalogHit[]; total: number } {
  const matched = rows.filter((r) =>
    isVisible(r)
    && (!query.q || matchesQ(r, query.q))
    && (!query.group || r.plantGroup === query.group)
    && (query.maxDepthCm == null || r.depthMinCm == null || r.depthMinCm <= query.maxDepthCm)
    && matchesLight(r.light as LightLevel, query.light)
    && (query.aggressive === undefined || r.aggressiveRhizome === query.aggressive));
  matched.sort((a, b) => a.scientificName.localeCompare(b.scientificName, 'de'));
  return { hits: matched.slice(0, limit).map((r) => toHit(r, query)), total: matched.length };
}
