import { Document, Page } from '@react-pdf/renderer';
import { styles } from './styles';
import { Cover } from './sections/cover';
import { Grundlagen } from './sections/grundlagen';
import { Inputs } from './sections/inputs';
import { Computed } from './sections/computed';
import { Compliance } from './sections/compliance';
import { Decisions } from './sections/decisions';
import { Approvals } from './sections/approvals';
import { Watermark } from './sections/watermark';
import { Footer } from './sections/footer';
import type { ReportData } from './load-data';

export function ReportDocument({ data }: { data: ReportData }) {
  const draft = data.calc.status !== 'approved';
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {draft && <Watermark />}
        <Cover data={data} />
        <Grundlagen data={data} />
        <Inputs data={data} />
        <Computed data={data} />
        <Compliance data={data} />
        <Decisions data={data} />
        <Approvals data={data} />
        <Footer data={data} draft={draft} />
      </Page>
    </Document>
  );
}
