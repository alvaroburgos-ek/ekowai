import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { ValuetableDocument } from '@/components/pdf/valuetable-document';
import { loadValuetableData, type ValuetableData } from './load-valuetable';

export async function buildValuetablePdf(data: ValuetableData): Promise<Buffer> {
  return renderToBuffer(<ValuetableDocument data={data} />);
}

export { loadValuetableData };
