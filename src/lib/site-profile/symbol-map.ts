/**
 * Mapping from project-level site-profile keys to worksheet field SYMBOLS.
 *
 * When a worksheet renders, fields whose `symbol` appears in this map are
 * pre-filled from `projects.site_profile.<key>` if (and only if) no local
 * `project_parameters` row exists and no upstream inheritance has resolved
 * the value. The pre-fill is RENDER-ONLY — nothing gets written back to the
 * DB until the engineer touches the field, exactly like the inheritance hint.
 *
 * Symbols in this map were verified by reading DB rows for DWA-A 138-1
 * (A138-01 / A138-02 / A138-05). The shape `{ type, key }` lets us coerce on
 * the way out (lat/lon are numbers, KOSTRA cell is text, …).
 *
 * Adding a new standard: only add entries here when the field symbol is
 * confirmed to exist on the target worksheet. Mis-mapped keys silently
 * pre-fill the wrong field; the unit test in __tests__ guards against that
 * for DWA-A 138-1.
 */
export type SiteProfileEntryType = 'text' | 'number' | 'enum' | 'boolean';

export type SiteProfileEntry = {
  /** Key inside `projects.site_profile`. */
  key: string;
  /** Worksheet field symbol the value pre-fills. Must match `fields.symbol`. */
  symbol: string;
  /** Coercion target — must match the field's data_type. */
  type: SiteProfileEntryType;
  /** Engineer-facing label for the new-project form. */
  labelDe: string;
  /** Short hint for the form. */
  hintDe?: string;
  /** Optional unit suffix shown after the input. */
  unit?: string;
};

/**
 * DWA-A 138-1 site-profile mapping. Every `symbol` here was confirmed against
 * the live `fields` table on 2026-05-30 — see the audit query in the PR body.
 */
export const SITE_PROFILE_ENTRIES: SiteProfileEntry[] = [
  // === A138-01 Projektregistrierung ===
  {
    key: 'project_number',
    symbol: 'project_number',
    type: 'text',
    labelDe: 'Projektnummer',
    hintDe: 'Interne Projektnummer des Büros.',
  },
  {
    key: 'planner_firm',
    symbol: 'planner_firm',
    type: 'text',
    labelDe: 'Planungsbüro',
  },
  {
    key: 'planner_name',
    symbol: 'planner_name',
    type: 'text',
    labelDe: 'Verantwortlicher Ingenieur',
  },
  {
    key: 'client_contact',
    symbol: 'client_contact',
    type: 'text',
    labelDe: 'Bauherr Ansprechperson',
  },
  {
    key: 'wasserbehoerde',
    symbol: 'wasserbehoerde',
    type: 'text',
    labelDe: 'Zuständige Wasserbehörde',
  },
  {
    key: 'site_address',
    symbol: 'site_address',
    type: 'text',
    labelDe: 'Standortadresse',
  },
  {
    key: 'site_municipality',
    symbol: 'site_municipality',
    type: 'text',
    labelDe: 'Gemeinde / Kreis',
  },
  {
    key: 'site_bundesland',
    symbol: 'site_bundesland',
    type: 'text',
    labelDe: 'Bundesland',
  },
  {
    key: 'site_lat',
    symbol: 'site_lat',
    type: 'number',
    labelDe: 'Geographische Breite',
    unit: '°N',
    hintDe: 'WGS84, -90…90.',
  },
  {
    key: 'site_lon',
    symbol: 'site_lon',
    type: 'number',
    labelDe: 'Geographische Länge',
    unit: '°E',
    hintDe: 'WGS84, -180…180.',
  },
  {
    key: 'kostra_grid_cell',
    symbol: 'kostra_grid_cell',
    type: 'text',
    labelDe: 'KOSTRA Rasterzelle',
    hintDe: 'KOSTRA-DWD-2020 Rasterzellen-ID. Bestimmt alle r_D(n)-Werte in A138-04.',
  },
  // === A138-05 Boden / Hydrogeologie ===
  {
    key: 'soil_classification',
    symbol: 'soil_classification',
    type: 'text',
    labelDe: 'Bodenklassifikation',
    hintDe: 'BÜK 50 / DIN — projektweit konstant.',
  },
  {
    key: 'k_f',
    symbol: 'k_f',
    type: 'number',
    labelDe: 'k_f',
    unit: 'm/s',
    hintDe: 'Durchlässigkeitsbeiwert nach Anh. A. 1e-9…1e-2.',
  },
  {
    key: 'mhgw',
    symbol: 'mhgw',
    type: 'number',
    labelDe: 'MHGW',
    unit: 'm NHN',
    hintDe: 'Mittlerer höchster Grundwasserstand.',
  },
];

/** symbol → entry — fast lookup for the render path. */
export const SITE_PROFILE_BY_SYMBOL: Map<string, SiteProfileEntry> = new Map(
  SITE_PROFILE_ENTRIES.map((e) => [e.symbol, e]),
);

/**
 * Pull a typed value out of a `site_profile` JSON blob for a given symbol.
 * Returns null when the entry doesn't exist, the key is missing, or coercion
 * fails. Render-only — never writes anything.
 */
export function resolveFromSiteProfile(
  siteProfile: unknown,
  symbol: string,
): { type: 'number' | 'text' | 'enum' | 'boolean'; value: number | string | boolean | null } | null {
  if (!siteProfile || typeof siteProfile !== 'object') return null;
  const entry = SITE_PROFILE_BY_SYMBOL.get(symbol);
  if (!entry) return null;
  const raw = (siteProfile as Record<string, unknown>)[entry.key];
  if (raw == null || raw === '') return null;
  switch (entry.type) {
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(n) ? { type: 'number', value: n } : null;
    }
    case 'text':
      return { type: 'text', value: String(raw) };
    case 'enum':
      return { type: 'enum', value: String(raw) };
    case 'boolean':
      return { type: 'boolean', value: Boolean(raw) };
  }
}
