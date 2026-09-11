import 'server-only';
import { db } from '@/lib/db';
import { emissionFactors } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

/**
 * One emission factor as the Add-activity picker needs it. The picker is fully
 * data-driven: it groups by `category`, searches by `name`, and on selection
 * auto-attaches `scope` / `unit` / `kgCo2e` to the new line. The unit is FIXED
 * by the factor — the engine computes `tCO₂e = amount × kgCo2e / 1000` and
 * trusts `amount` is in this unit, so it must never be user-editable.
 */
export interface CatalogFactor {
  ubaId: string;
  name: string;
  scope: string;
  category: string;
  subcategory: string | null;
  unit: string;
  kgCo2e: number;
  sourceVersion: string;
}

/**
 * Load the full emission-factor catalog (281 rows, prod-verified 2026-07-27 —
 * small enough to ship to the client in one go) ordered by category, name. The
 * client does the curated shortlist + search/filter; this query only selects
 * the columns the picker needs. Rows with no `name` are skipped (the picker
 * keys on a real commodity).
 */
export async function loadEmissionFactorCatalog(): Promise<CatalogFactor[]> {
  const rows = await db
    .select({
      ubaId: emissionFactors.ubaId,
      name: emissionFactors.name,
      scope: emissionFactors.scope,
      category: emissionFactors.category,
      subcategory: emissionFactors.subcategory,
      unit: emissionFactors.unit,
      kgCo2e: emissionFactors.kgCo2e,
      sourceVersion: emissionFactors.sourceVersion,
    })
    .from(emissionFactors)
    .orderBy(asc(emissionFactors.category), asc(emissionFactors.name));

  return rows
    .filter((r): r is typeof r & { name: string } => Boolean(r.name))
    .map((r) => ({
      ubaId: r.ubaId,
      name: r.name,
      scope: r.scope,
      category: r.category,
      subcategory: r.subcategory ?? null,
      unit: r.unit,
      kgCo2e: Number(r.kgCo2e),
      sourceVersion: r.sourceVersion,
    }));
}
