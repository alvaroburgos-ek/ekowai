import { NextResponse } from 'next/server';
import { buildStandardReport } from '@/lib/pdf/build-standard-report';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { projects, orgMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * GET /api/projects/:id/standards/:standardCode/report
 *
 * Returns the live compliance-report PDF for one (project, standard) pair.
 * Response is `application/pdf` with inline disposition so the browser
 * renders it in a viewer tab; engineers can save it or print it from there.
 *
 * Route filename is `report` (not `report.pdf`) to keep with Next 16's
 * route-segment naming — the response Content-Disposition supplies the
 * file extension to download dialogs.
 *
 * Access is enforced at the route level: `db` runs as postgres and bypasses
 * RLS, so we verify the caller's org-membership on the project here.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; standardCode: string }> },
): Promise<NextResponse> {
  const { id, standardCode } = await context.params;

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
    const buffer = await buildStandardReport(id, standardCode);
    const safeCode = standardCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="report-${id.slice(0, 8)}-${safeCode}.pdf"`,
        // Don't cache: the underlying data is mutable and stale reports
        // would be misleading.
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
