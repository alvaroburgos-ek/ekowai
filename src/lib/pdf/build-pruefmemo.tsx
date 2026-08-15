import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { PruefmemoDocument } from '@/components/pdf/pruefmemo-document';
import { loadStandardReportData, type StandardReportData } from './load-standard-report';

export async function buildPruefmemoPdf(data: StandardReportData): Promise<Buffer> {
  return renderToBuffer(<PruefmemoDocument data={data} />);
}

export { loadStandardReportData };
