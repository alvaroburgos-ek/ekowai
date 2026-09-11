import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { projects, orgMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { buildCostEstimatePdf, loadCostEstimateData } from '@/lib/pdf/build-cost-estimate';
import { recordDeliverable } from '@/lib/deliverables/record';

/**
 * GET /api/projects/:id/estimates/:estimateId/pdf
 *
 * Kostenschätzungs-PDF (Slice E2) — the CLIENT deliverable, labelled
 * "Kostenschätzung (DIN 276)": DIN-276-grouped ranges (low/likely/high),
 * per-line price provenance, structural contingency row, snapshot version
 * lock and the accuracy-class boundary sentence. Auth mirrors the offers
 * route (org membership via project join).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; estimateId: string }> },
): Promise<NextResponse> {
  const { id, estimateId } = await context.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, id), eq(orgMembers.userId, user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    const data = await loadCostEstimateData(id, estimateId);
    const buffer = await buildCostEstimatePdf(data);
    // Register the emission (AGB §3(2)) — recordDeliverable never throws.
    await recordDeliverable({
      projectId: id,
      standardCode: data.estimate.standardCode,
      kind: 'kostenschaetzung',
      title: data.estimate.title,
      snapshotId: data.estimate.snapshotId,
      userId: user.id,
    });
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="kostenschaetzung-${id.slice(0, 8)}-${estimateId.slice(0, 8)}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
