import 'server-only';
import { renderPdf } from './render-pdf';
import { ConformityDocument } from '@/components/pdf/conformity-document';
import { loadConformityData, type ConformityData } from './load-conformity';

export async function buildConformityPdf(data: ConformityData): Promise<Buffer> {
  return renderPdf(<ConformityDocument data={data} />);
}

export { loadConformityData };
