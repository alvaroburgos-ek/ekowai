import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { projects, orgMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { buildValuetablePdf, loadValuetableData, ValuetableRenderError } from '@/lib/pdf/build-valuetable';
import { recordDeliverable } from '@/lib/deliverables/record';

/**
 * GET /api/projects/:id/standards/:standardCode/valuetable
 *
 * Wertetabelle PDF for the CAD title block: saved values with unit + source
 * clause, stamped with the latest approve-snapshot id (or an honest
 * "Arbeitsstand" notice when none exists).
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
    const data = await loadValuetableData(id, standardCode);
    const buffer = await buildValuetablePdf(data);
    // Register the emission (AGB §3(2)) — recordDeliverable never throws.
    await recordDeliverable({
      projectId: id,
      standardCode,
      kind: 'wertetabelle',
      title: `Wertetabelle ${standardCode}`,
      snapshotId: data.snapshotId,
      meta: data.snapshotId ? { snapshotId: data.snapshotId } : null,
      userId: user.id,
    });
    const safeCode = standardCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="wertetabelle-${id.slice(0, 8)}-${safeCode}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = /not found/i.test(message) ? 404 : 500;
    if (err instanceof ValuetableRenderError) {
      // Name the rows the renderer cannot draw (readiness run 2026-09-30) so the defect is
      // locatable from the response instead of an opaque PDF-writer message.
      const offendingRows = err.offendingRows.map((r) => ({
        worksheetCode: r.worksheetCode,
        symbol: r.symbol,
        valuePreview: r.value.slice(0, 80),
        valueLength: r.value.length,
        unit: r.unit,
      }));
      console.error('[valuetable] render failed', { projectId: id, standardCode, message, offendingRows });
      return NextResponse.json({ error: message, offendingRows }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status });
  }
}
