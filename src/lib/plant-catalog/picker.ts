/**
 * `catalog_pick` register column — the PURE picker logic (no React, no fetch). Tested in __tests__/picker.test.ts.
 *
 * Boundaries (brief 2026-10-05, binding):
 * - The picker writes ONLY the scientific name into the register's own text cell. The FLL columns of the row
 *   (§ 10.4.3 group on FLLNT-12, the Tab.-29 lookup on FLL-GAR-24) stay the engineer's own entry; the picker may
 *   PROPOSE a group as visible text next to the cell (`proposeGroupKey`), never write it.
 * - Context filters come from the worksheet: the row's zone text is matched against the FLLNT-06 `zonen` register
 *   (label, case-insensitive) → the zone's water depth (m → cm) and, for a submerged hydrobotanical zone, the
 *   `submerged` group. An emersed zone is NOT narrowed to one marsh group (two printed groups fit — never guess).
 *   The pond type (inherited `natural_pool_type`) is carried for DISPLAY only — no printed mapping from pond type to
 *   species exists, so it never filters.
 * - Everything the picker shows is labelled "Referenz (nicht normativ)".
 */
import type { CatalogHit, PlantGroup } from './filter';
import { PLANT_GROUP_LABELS, LIGHT_LABELS } from './filter';

/** Column config carried by a `catalog_pick` register column (`RegisterColumn.pick`). */
export type CatalogPickConfig = {
  /** Row column holding the zone text (FLLNT-12: `zone`). */
  zone_column?: string;
  /** Worksheet symbol of the zones register whose rows carry `label` / `depth_m` / `technique` (FLLNT-06: `zonen`). */
  zones_symbol?: string;
  /** Row column (lookup_key S10_4_3) the proposal is shown NEXT TO — never written (FLLNT-12: `plant_group`). */
  propose_group_column?: string;
};

export type CatalogPickContext = {
  group?: PlantGroup;
  maxDepthCm?: number;
  /** Matched FLLNT-06 zone label, for the context line. */
  zoneLabel?: string;
  /** Display only. */
  pondType?: string;
};

export type ZoneRow = { label?: unknown; depth_m?: unknown; technique?: unknown; zone?: unknown };

const norm = (s: unknown): string => (typeof s === 'string' ? s.trim().toLowerCase() : '');

/** FLLNT-12 row zone text + FLLNT-06 zones → picker context. Unknown / unmatched ⇒ an empty context (no filter). */
export function contextFromZone(zoneText: unknown, zones: readonly ZoneRow[] | undefined, pondType?: unknown): CatalogPickContext {
  const ctx: CatalogPickContext = {};
  if (typeof pondType === 'string' && pondType !== '') ctx.pondType = pondType;
  const key = norm(zoneText);
  if (!key || !zones?.length) return ctx;
  const hit = zones.find((z) => norm(z.label) === key);
  if (!hit) return ctx;
  if (typeof hit.label === 'string') ctx.zoneLabel = hit.label;
  if (typeof hit.depth_m === 'number' && Number.isFinite(hit.depth_m) && hit.depth_m >= 0) ctx.maxDepthCm = Math.round(hit.depth_m * 100);
  if (hit.technique === 'hydrobotanical_submergent') ctx.group = 'submerged';
  return ctx;
}

/** Rows of a register carrier `{ rows: [...] }` (any other shape ⇒ []). */
export function carrierRows(carrier: unknown): ZoneRow[] {
  if (!carrier || typeof carrier !== 'object' || Array.isArray(carrier)) return [];
  const rows = (carrier as { rows?: unknown }).rows;
  return Array.isArray(rows) ? rows.filter((r): r is ZoneRow => !!r && typeof r === 'object') : [];
}

/** Catalogue group → § 10.4.3 row key of regulation table S10_4_3 (FLL-Naturteich). A PROPOSAL only; null = none. */
export function proposeGroupKey(hit: Pick<CatalogHit, 'plant_group'>): string | null {
  switch (hit.plant_group) {
    case 'submerged': return 'submerged';
    case 'floating_leaved': return 'lilies';
    case 'marsh_small': return 'marsh_small';
    case 'marsh_medium_high': return 'marsh_medium';
    default: return null;
  }
}

export const S10_4_3_LABELS: Record<string, string> = {
  submerged: 'Unterwasserpflanzen (submerged plants)',
  marsh_small: 'halbhohe bis hohe Sumpf- und Wasserpflanzen',
  marsh_medium: 'mittelhohe bis hohe Sumpf- und Wasserpflanzen',
  lilies: 'Seerosen (lilies and lily pads)',
};

/** The request URL for a query + context (empty values omitted; order fixed for testability). */
export function buildCatalogUrl(q: string, ctx: CatalogPickContext, base = '/api/plant-catalog'): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set('q', q.trim());
  if (ctx.group) p.set('group', ctx.group);
  if (ctx.maxDepthCm != null) p.set('maxDepthCm', String(ctx.maxDepthCm));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

/** The context line above the suggestion list ("Kontext: Zone „Regeneration Ost“ · 60 cm · Typ III"). */
export function contextLine(ctx: CatalogPickContext): string | null {
  const parts: string[] = [];
  if (ctx.zoneLabel) parts.push(`Zone „${ctx.zoneLabel}“`);
  if (ctx.maxDepthCm != null) parts.push(`Wassertiefe ${ctx.maxDepthCm} cm`);
  if (ctx.group) parts.push(`Gruppe ${PLANT_GROUP_LABELS[ctx.group]}`);
  if (ctx.pondType) parts.push(`Teichtyp ${ctx.pondType} (nur Anzeige)`);
  return parts.length ? `Kontext: ${parts.join(' · ')}` : null;
}

/** Property lines of a hit for the detail panel — only what the row carries, nothing inferred. */
export function hitProperties(h: CatalogHit): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const names = [h.common_name_de, h.common_name_en].filter(Boolean).join(' / ');
  if (names) out.push(['Name', names]);
  out.push(['Gruppe', PLANT_GROUP_LABELS[h.plant_group] ?? h.plant_group]);
  if (h.depth_min_cm != null || h.depth_max_cm != null) out.push(['Pflanztiefe', `${h.depth_min_cm ?? '?'}–${h.depth_max_cm ?? '?'} cm`]);
  else if (h.depth_zone_code) out.push(['Tiefenzone (Buchcode)', `${h.depth_zone_code} — Legende fehlt`]);
  if (h.light !== 'unknown') out.push(['Licht', LIGHT_LABELS[h.light]]);
  if (h.height_cm != null) out.push(['Höhe', `${h.height_cm} cm`]);
  if (h.bloom) out.push(['Blüte', h.bloom]);
  if (h.hardiness_zones) out.push(['USDA-Zonen', h.hardiness_zones]);
  if (h.water_hardness) out.push(['Wasserhärte', h.water_hardness]);
  if (h.nitrogen_demand) out.push(['Stickstoffbedarf', h.nitrogen_demand]);
  if (h.origin_regions) out.push(['Herkunft', h.origin_regions]);
  if (h.planting_codes?.length) out.push(['Pflanzcodes (Buch)', h.planting_codes.join(', ')]);
  if (h.notes) out.push(['Hinweise', h.notes]);
  out.push(['Quelle', h.source_ref]);
  return out;
}

/** The red badge text for an aggressive hit (Tab. 29 wording when the source is Tab. 29). */
export function aggressiveBadge(h: Pick<CatalogHit, 'aggressive_rhizome' | 'source_ref'>): string | null {
  if (!h.aggressive_rhizome) return null;
  return /Tab\. 29/.test(h.source_ref) ? 'aggressiv wurzelnd / rhizombildend (Tab. 29)' : 'aggressiv wurzelnd / rhizombildend';
}
