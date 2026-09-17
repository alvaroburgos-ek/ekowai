/**
 * `reference` widget configs (Plan 2b, Task 6).
 *
 * A `reference` field picks ONE ROW of another carrier (e.g. a KOSTRA rainfall
 * table of `r_D_n_table`) and stores that row's ID — never a copied value. The
 * option rows come from the carrier field on the same worksheet (inherited or
 * own), so SR-1 holds by construction: nothing is typed.
 *
 * Resolution order (mirrors register-configs.ts): a DB `widget = 'reference'`
 * row's `ui_config` wins; while `widget IS NULL` the symbol-keyed fallback
 * below serves; any other non-null widget ⇒ null.
 */
import { parseFieldConfig, type ReferenceUiConfig } from './field-config';
import { normalizeRainfallCarrier } from './rainfall-tables';

export const REFERENCE_CONFIGS_FALLBACK: Readonly<Record<string, ReferenceUiConfig>> = {
  // Retired by scripts/migrations/20260916150000_a138_rainfall_table_ref_reference.sql
  // (Task 5). Strings = the deleted rainfall-table-selector.tsx (title, aria,
  // SOURCE_BADGE map, placeholder).
  rainfall_table_ref: {
    title: 'Regenspendentabelle (Quelle für r_D(n))',
    aria_label: 'Regenspendentabelle wählen',
    carrier_symbol: 'r_D_n_table',
    rows_path: 'tables',
    id_key: 'id',
    label_key: 'name',
    badge_key: 'source',
    badge_labels: { 'KOSTRA-DWD-2020': 'KOSTRA', 'DWA-A-531-local': 'DWA-A 531', engineer: 'Ingenieur' },
    empty_label: '— Tabelle wählen —',
  },
};

/** Bespoke carrier shapes that need a normaliser before `rows_path` is read
 * (spec §5.3: the KOSTRA grid stays bespoke — a legacy 1-D `{ rows }` carrier
 * becomes `{ tables: [default] }`). */
export const CARRIER_NORMALISERS: Readonly<Record<string, (raw: unknown) => unknown>> = {
  r_D_n_table: (raw) => normalizeRainfallCarrier(raw),
};

export function resolveReferenceConfig(f: { symbol: string; widget?: string | null; uiConfig?: unknown }): ReferenceUiConfig | null {
  if (f.widget != null) {
    if (f.widget !== 'reference') return null;
    try {
      return parseFieldConfig({ widget: 'reference', uiConfig: f.uiConfig ?? null, lookup: null, visibleWhen: null }).ui as ReferenceUiConfig;
    } catch {
      return null;
    }
  }
  return REFERENCE_CONFIGS_FALLBACK[f.symbol] ?? null;
}

export type ReferenceRow = { id: string; label: string; badge: string | null };

/** The carrier's rows as select options: `rows_path` → array; each row needs a
 * non-empty string `id_key`; label falls back to the id; badge via `badge_labels`
 * (unknown badge values pass through raw). Malformed carriers ⇒ `[]`. */
export function resolveReferenceRows(ui: ReferenceUiConfig, carrierRaw: unknown): ReferenceRow[] {
  const carrier = (CARRIER_NORMALISERS[ui.carrier_symbol] ?? ((x: unknown) => x))(carrierRaw);
  const rows = carrier && typeof carrier === 'object' ? (carrier as Record<string, unknown>)[ui.rows_path] : undefined;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((r): ReferenceRow[] => {
    if (!r || typeof r !== 'object') return [];
    const o = r as Record<string, unknown>;
    const id = o[ui.id_key];
    if (typeof id !== 'string' || !id) return [];
    const badgeRaw = ui.badge_key ? o[ui.badge_key] : undefined;
    const badge = badgeRaw == null ? null : (ui.badge_labels?.[String(badgeRaw)] ?? String(badgeRaw));
    return [{ id, label: String(o[ui.label_key] ?? id), badge }];
  });
}
