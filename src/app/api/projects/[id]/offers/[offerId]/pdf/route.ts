import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { projects, orgMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { buildOfferPdf, loadOfferData } from '@/lib/pdf/build-offer';
import { recordDeliverable } from '@/lib/deliverables/record';

/**
 * GET /api/projects/:id/offers/:offerId/pdf
 *
 * Angebots-PDF — the CLIENT document (Slice E1). Carries positions + the
 * Festpreis total only; the loader never selects hours, external costs or
 * margin data (see build-offer.tsx). Auth mirrors the conformity route.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; offerId: string }> },
): Promise<NextResponse> {
  const { id, offerId } = await context.params;

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
    const data = await loadOfferData(id, offerId);
    const buffer = await buildOfferPdf(data);
    // Register the emission (AGB §3(2)) — recordDeliverable never throws.
    await recordDeliverable({
      projectId: id,
      kind: 'angebot',
      title: data.offer.title,
      userId: user.id,
    });
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="angebot-${id.slice(0, 8)}-${offerId.slice(0, 8)}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
