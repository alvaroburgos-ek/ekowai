import 'server-only';
import { renderPdf } from './render-pdf';
import { PruefmemoDocument } from '@/components/pdf/pruefmemo-document';
import { loadStandardReportData, type StandardReportData } from './load-standard-report';

export async function buildPruefmemoPdf(data: StandardReportData): Promise<Buffer> {
  return renderPdf(<PruefmemoDocument data={data} />);
}

export { loadStandardReportData };
