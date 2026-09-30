import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { stampPageNumbers } from './stamp-page-numbers';

type DocumentElement = Parameters<typeof renderToBuffer>[0];

/**
 * The ONE render entry for every PDF deliverable: react-pdf renders the document with a static
 * footer, then the page numbers are stamped with pdf-lib (see stamp-page-numbers.ts for why a
 * dynamic react-pdf footer cannot be used).
 */
export async function renderPdf(element: DocumentElement): Promise<Buffer> {
  const rendered = await renderToBuffer(element);
  return stampPageNumbers(rendered);
}
