import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { StandardReportDocument } from '@/components/pdf/standard-report-document';
import { loadStandardReportData } from './load-standard-report';

/**
 * Server entry-point: assembles the per-standard data and renders the PDF
 * to a Node Buffer. The route handler then returns the buffer with the
 * application/pdf content type.
 *
 * Intentionally returns Buffer (not Uint8Array / ReadableStream) so the
 * existing Next.js route handler ergonomics from buildProjectReport apply
 * uniformly — `new NextResponse(buffer as unknown as BodyInit, …)`.
 */
export async function buildStandardReport(
  projectId: string,
  standardCode: string,
): Promise<Buffer> {
  const data = await loadStandardReportData(projectId, standardCode);
  return renderToBuffer(<StandardReportDocument data={data} />);
}
