import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { renderToBuffer, Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from '@/components/pdf/styles';
import { ReportFooter } from '@/components/pdf/footer';
import { stampPageNumbers, PAGE_NUMBER_STAMP } from '../stamp-page-numbers';

import { pageContents, decodeHexStrings } from './_pdf-text';

function ManyPages({ lines }: { lines: number }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Stamp test</Text>
        <View>
          {Array.from({ length: lines }, (_, i) => (
            <Text key={i}>{`Zeile ${i + 1}`}</Text>
          ))}
        </View>
        <ReportFooter projectCode="P-1" standardCode="DWA-A-138-1" generatedAt="2026-09-30T13:00:00Z" />
      </Page>
    </Document>
  );
}

describe('stampPageNumbers — page numbers drawn with pdf-lib after the react-pdf render', () => {
  it('stamps "Seite i / n" on every page of a ≥ 10-page document, right-aligned in the footer line', async () => {
    const rendered = await renderToBuffer(<ManyPages lines={560} />);
    const stamped = await stampPageNumbers(rendered);
    const before = (await PDFDocument.load(rendered)).getPageCount();
    const pages = await pageContents(stamped);
    expect(before).toBeGreaterThanOrEqual(10);
    expect(pages.length).toBe(before);
    pages.forEach((raw, i) => {
      const text = decodeHexStrings(raw);
      expect(text).toContain(`Seite ${i + 1} / ${pages.length}`);
      expect(text).toContain('P-1');
      // pdf-lib positions our stamp with `… x y Tm` (or `x y Td`) right before the string: the last
      // positioning operator before "Seite" must sit in the footer line, right-aligned at the inset.
      const idx = text.indexOf(`Seite ${i + 1} / `);
      const before = text.slice(Math.max(0, idx - 300), idx);
      const pos = [...before.matchAll(/([\d.]+) ([\d.]+) (?:Tm|Td)/g)].pop();
      expect(pos).toBeDefined();
      expect(Number(pos![2])).toBeCloseTo(PAGE_NUMBER_STAMP.baselineFromBottom, 0);
      expect(Number(pos![1])).toBeLessThan(595.28 - PAGE_NUMBER_STAMP.rightInset);
      expect(Number(pos![1])).toBeGreaterThan(595.28 - PAGE_NUMBER_STAMP.rightInset - 60);
    });
  });

  it('a react-pdf footer without the dynamic page-number text renders a ≥ 10-page document', async () => {
    await expect(renderToBuffer(<ManyPages lines={560} />)).resolves.toBeTruthy();
  });
});
