import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { plantCatalog } from '@/lib/db/schema';
import { filterCatalog, parseCatalogQuery, CATALOG_PAGE_SIZE } from '@/lib/plant-catalog/filter';

/**
 * GET /api/plant-catalog?q=&group=&maxDepthCm=&light=&aggressive=
 *
 * Plant reference catalogue for the register picker (`catalog_pick` column type). Non-normative reference layer:
 * returns ≤ 50 visible rows (licence_status guideline | cleared, active — pending book rows are invisible), sorted by
 * scientific name, each with a `recommended` reason and the aggressive flag. Filter semantics live in
 * src/lib/plant-catalog/filter.ts (pure, tested).
 *
 * Auth: any signed-in user (same guard as the other API routes); the table is a shared reference, not project data.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const query = parseCatalogQuery(new URL(req.url).searchParams);
  try {
    const rows = await db
      .select()
      .from(plantCatalog)
      .where(and(eq(plantCatalog.active, true), inArray(plantCatalog.licenceStatus, ['guideline', 'cleared'])));
    const { hits, total } = filterCatalog(rows, query, CATALOG_PAGE_SIZE);
    return NextResponse.json(
      { rows: hits, total, limit: CATALOG_PAGE_SIZE, query, reference_note: 'Referenz (nicht normativ) — ändert keine Prüfung und keinen FLL-Wert.' },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    // The table is a STAGED migration: until it is applied the query fails with 42P01 — say so instead of a 500 stack.
    const msg = err instanceof Error ? err.message : String(err);
    if (/plant_catalog/.test(msg) && /does not exist|42P01/.test(msg)) {
      return NextResponse.json({ error: 'plant_catalog_not_available', detail: 'Referenzkatalog noch nicht eingerichtet (Migration nicht angewendet).' }, { status: 503 });
    }
    console.error('[plant-catalog] query failed', msg);
    return NextResponse.json({ error: 'catalog_query_failed' }, { status: 500 });
  }
}
