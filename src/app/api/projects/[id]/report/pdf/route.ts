import { NextResponse } from 'next/server';
import { buildProjectReport } from '@/lib/pdf/build-report';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { projects, orgMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { recordDeliverable } from '@/lib/deliverables/record';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // `db` connects as postgres and bypasses RLS, so verify org-membership here.
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, id), eq(orgMembers.userId, user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    const buffer = await buildProjectReport(id);
    // Register the emission (AGB §3(2)) — recordDeliverable never throws.
    await recordDeliverable({
      projectId: id,
      kind: 'projektbericht',
      title: 'Projektbericht',
      userId: user.id,
    });
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="report-${id.slice(0, 8)}.pdf"`,
        // PDFs contain full project data — block intermediary + browser
        // caches so a logged-out reload or shared proxy never replays them.
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    console.error('[report-pdf] generation failed', err);
    return NextResponse.json({ error: 'report_failed' }, { status: 500 });
  }
}
