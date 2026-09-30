import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Page numbers are stamped AFTER react-pdf has rendered, with pdf-lib.
 *
 * Why (readiness run 2026-09-30, DWA-A-138-1 Wertetabelle): a `fixed` footer whose page-number
 * `<Text render={({pageNumber,totalPages}) => …}>` is resolved per page makes @react-pdf/renderer
 * 4.5 emit a garbage text coordinate as soon as a document reaches TEN pages — pdfkit then throws
 * "unsupported number: -1.78e+21" and the route answers 500. Reproduced with the project's exact
 * 185-row table (fails from 180 rows = page 10 on; the same rows at a smaller font = 5 pages pass;
 * 120 rows at a larger font = many pages fail). Fixed-width cells, padded strings, minPresenceAhead
 * and wrap flags do not change it; a static fixed footer never fails. So the footer stays static
 * and the "Seite i / n" text is drawn here, right-aligned in the footer line of every page.
 *
 * Geometry mirrors `styles.footer` (bottom 24, paddingTop 6, fontSize 7.5, page lineHeight 1.4,
 * right inset 48 = paddingHorizontal): line box top = 24 + 6 + 10.5 = 40.5 → baseline ≈ 27.3
 * (Helvetica ascent 0.718 · 7.5 + half-leading (10.5 − 0.925 · 7.5) / 2).
 */
export const PAGE_NUMBER_STAMP = {
  fontSize: 7.5,
  rightInset: 48,
  baselineFromBottom: 27.3,
  color: rgb(0x5f / 255, 0x6a / 255, 0x72 / 255), // colors.subtext '#5f6a72'
} as const;

export type PageNumberLabel = (pageNumber: number, totalPages: number) => string;

export const defaultPageNumberLabel: PageNumberLabel = (i, n) => `Seite ${i} / ${n}`;

/** Draws `label(i, n)` on every page of an already rendered PDF; returns the new PDF bytes. */
export async function stampPageNumbers(
  pdf: Buffer | Uint8Array,
  label: PageNumberLabel = defaultPageNumberLabel,
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdf, { updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;
  pages.forEach((page, idx) => {
    const text = label(idx + 1, total);
    const width = font.widthOfTextAtSize(text, PAGE_NUMBER_STAMP.fontSize);
    page.drawText(text, {
      x: page.getWidth() - PAGE_NUMBER_STAMP.rightInset - width,
      y: PAGE_NUMBER_STAMP.baselineFromBottom,
      size: PAGE_NUMBER_STAMP.fontSize,
      font,
      color: PAGE_NUMBER_STAMP.color,
    });
  });
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}
