import { NextResponse } from 'next/server';
import { buildStandardReport } from '@/lib/pdf/build-standard-report';

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
 * The route is force-dynamic because the underlying data may change
 * between renders. RLS at the DB layer enforces access — an unauthorised
 * user gets an empty project lookup → 404.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; standardCode: string }> },
): Promise<NextResponse> {
  const { id, standardCode } = await context.params;
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
