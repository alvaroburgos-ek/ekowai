import 'server-only';
import { renderToBuffer, Document } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import { ReportDocument } from './document';
import { AppendixDivider } from './sections/appendix-divider';
import { loadReportData } from './load-data';
import { ensureFonts } from './fonts';
import { downloadProjectDocument } from '@/lib/storage/documents';
import type { projectDocuments } from '@/lib/db/schema';

type Doc = typeof projectDocuments.$inferSelect;

function DividerOnly({ doc, letter }: { doc: Doc; letter: string }) {
  return (
    <Document>
      <AppendixDivider doc={doc} letter={letter} />
    </Document>
  );
}

export async function buildReport(calcId: string): Promise<Buffer> {
  ensureFonts();
  const data = await loadReportData(calcId);

  const bodyBuf = await renderToBuffer(<ReportDocument data={data} />);
  if (data.citedDocs.length === 0) {
    return bodyBuf;
  }

  // Merge body + per-appendix divider + per-appendix attached PDF (if PDF mime).
  const merged = await PDFDocument.create();
  const body = await PDFDocument.load(bodyBuf);
  const bodyPages = await merged.copyPages(body, body.getPageIndices());
  bodyPages.forEach((p) => merged.addPage(p));

  for (let i = 0; i < data.citedDocs.length; i++) {
    const doc = data.citedDocs[i];
    const letter = String.fromCharCode(65 + i);

    const dividerBuf = await renderToBuffer(<DividerOnly doc={doc} letter={letter} />);
    const divider = await PDFDocument.load(dividerBuf);
    const [dividerPage] = await merged.copyPages(divider, [0]);
    merged.addPage(dividerPage);

    if (doc.mimeType === 'application/pdf') {
      try {
        const attachBytes = await downloadProjectDocument(doc.filePath);
        const attach = await PDFDocument.load(attachBytes, {
          ignoreEncryption: true,
        });
        const pages = await merged.copyPages(attach, attach.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      } catch {
        // soft-fail: divider remains, missing-attachment is footnoted there
      }
    }
  }

  const out = await merged.save();
  return Buffer.from(out);
}
