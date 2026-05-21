import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportDocument } from './document';
import { loadProjectReportData } from './load-data';

export async function buildProjectReport(projectId: string): Promise<Buffer> {
  const data = await loadProjectReportData(projectId);
  return renderToBuffer(<ReportDocument data={data} />);
}
