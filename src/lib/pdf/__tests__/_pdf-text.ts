import { inflateSync } from 'node:zlib';
import { PDFDocument, PDFName, PDFRawStream, PDFArray } from 'pdf-lib';

/** Decompressed content stream(s) of every page — text appears as hex strings `<…> Tj/TJ`. */
export async function pageContents(pdf: Buffer): Promise<string[]> {
  const doc = await PDFDocument.load(pdf);
  return doc.getPages().map((p) => {
    const c = p.node.get(PDFName.of('Contents'));
    const refs = c instanceof PDFArray ? c.asArray() : [c];
    return refs
      .map((ref) => {
        const s = doc.context.lookup(ref);
        if (!(s instanceof PDFRawStream)) return '';
        const bytes = Buffer.from(s.contents);
        try { return inflateSync(bytes).toString('latin1'); } catch { return bytes.toString('latin1'); }
      })
      .join('\n');
  });
}

/**
 * Text of a content stream with the string literals decoded: kerned TJ arrays (`[<50> 12 <2d31>] TJ`)
 * are joined first, then hex literals (`<536569>`) are decoded so plain-text assertions work.
 */
export const decodeHexStrings = (s: string) =>
  s
    .replace(/>\s*-?[\d.]+\s*</g, '')
    .replace(/<([0-9a-fA-F]+)>/g, (_m, h: string) => Buffer.from(h, 'hex').toString('latin1'));
