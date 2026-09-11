import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { projects, orgMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { buildChecklistPdf, loadConformityData } from '@/lib/pdf/build-checklist';
import { recordDeliverable } from '@/lib/deliverables/record';

/**
 * GET /api/projects/:id/standards/:standardCode/checklist
 * Behörden-Einreichungs-Checkliste PDF — live readiness state, always emittable.
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
    const data = await loadConformityData(id, standardCode);
    const buffer = await buildChecklistPdf(data);
    // Register the emission (AGB §3(2)) — recordDeliverable never throws.
    await recordDeliverable({
      projectId: id,
      standardCode,
      kind: 'einreichungs_checkliste',
      title: `Einreichungs-Checkliste ${standardCode}`,
      userId: user.id,
    });
    const safeCode = standardCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="checkliste-${id.slice(0, 8)}-${safeCode}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
