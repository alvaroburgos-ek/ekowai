import 'server-only';
import { renderPdf } from './render-pdf';
import { ChecklistDocument } from '@/components/pdf/checklist-document';
import { loadConformityData, type ConformityData } from './load-conformity';

export async function buildChecklistPdf(data: ConformityData): Promise<Buffer> {
  return renderPdf(<ChecklistDocument data={data} />);
}

export { loadConformityData };
