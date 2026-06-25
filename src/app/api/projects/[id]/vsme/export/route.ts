import { NextResponse } from 'next/server';
import { buildStandardReport } from '@/lib/pdf/build-standard-report';
import { loadVsmeExportData } from '@/lib/export/vsme-export-data';
import { buildVsmeXlsx } from '@/lib/export/build-vsme-xlsx';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { projects, orgMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * GET /api/projects/:id/vsme/export?format=xlsx|pdf
 *
 * Returns a VSME export in the requested format:
 *  - format=xlsx (default): 4-sheet ExcelJS workbook with all datapoints,
 *    CO₂ activity lines, GHG totals and citation sources.
 *  - format=pdf: standard compliance-report PDF (reuses buildStandardReport).
 *
 * Auth: same org-membership guard as the standard-report route — db runs as
 * postgres (bypasses RLS) so membership is verified explicitly here.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

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

  const searchParams = new URL(req.url).searchParams;
  const format = searchParams.get('format') ?? 'xlsx';
  const locale = searchParams.get('locale') === 'en' ? 'en' : 'de';

  try {
    if (format === 'pdf') {
      const buffer = await buildStandardReport(id, 'VSME');
      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="vsme-${id.slice(0, 8)}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // default: xlsx
    const data = await loadVsmeExportData(id);
    const buffer = await buildVsmeXlsx(data, locale);
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="vsme-${id.slice(0, 8)}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
