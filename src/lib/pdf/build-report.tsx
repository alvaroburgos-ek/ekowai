import 'server-only';
import { renderPdf } from './render-pdf';
import { ReportDocument } from './document';
import { loadProjectReportData } from './load-data';

export async function buildProjectReport(projectId: string): Promise<Buffer> {
  const data = await loadProjectReportData(projectId);
  return renderPdf(<ReportDocument data={data} />);
}
