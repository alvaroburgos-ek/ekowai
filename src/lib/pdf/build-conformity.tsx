import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { ConformityDocument } from '@/components/pdf/conformity-document';
import { loadConformityData, type ConformityData } from './load-conformity';

export async function buildConformityPdf(data: ConformityData): Promise<Buffer> {
  return renderToBuffer(<ConformityDocument data={data} />);
}

export { loadConformityData };
