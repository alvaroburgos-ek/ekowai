import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { ChecklistDocument } from '@/components/pdf/checklist-document';
import { loadConformityData, type ConformityData } from './load-conformity';

export async function buildChecklistPdf(data: ConformityData): Promise<Buffer> {
  return renderToBuffer(<ChecklistDocument data={data} />);
}

export { loadConformityData };
