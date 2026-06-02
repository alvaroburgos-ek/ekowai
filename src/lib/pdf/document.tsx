import { Document, Page } from '@react-pdf/renderer';
import { styles } from './styles';
import { CoverSection } from './sections/cover';
import { GrundlagenSection } from './sections/grundlagen';
import { InputsSection } from './sections/inputs';
import { ComputedSection } from './sections/computed';
import { ComplianceSection } from './sections/compliance';
import { ApprovalsSection } from './sections/approvals';
import { Footer } from './sections/footer';
import { Watermark } from './sections/watermark';
import { AppendixDivider } from './sections/appendix-divider';
import type { ReportData } from './load-data';

export function ReportDocument({ data }: { data: ReportData }) {
  const isPreview = data.approvals.length === 0 || !data.approvals.some((a) => a.toStatus === 'final');
  return (
    <Document title={`${data.project.projectCode ?? 'Projekt'} — Bericht`}>
      <Page size="A4" style={styles.page}>
        <CoverSection project={data.project} />
        <Footer projectCode={data.project.projectCode} />
        {isPreview && <Watermark text="VORSCHAU — nicht freigegeben" />}
      </Page>
      <Page size="A4" style={styles.page}>
        <GrundlagenSection standards={data.standards} />
        <InputsSection worksheets={data.worksheets} />
        <Footer projectCode={data.project.projectCode} />
        {isPreview && <Watermark text="VORSCHAU — nicht freigegeben" />}
      </Page>
      <Page size="A4" style={styles.page}>
        <ComputedSection worksheets={data.worksheets} />
        <ComplianceSection worksheets={data.worksheets} />
        <Footer projectCode={data.project.projectCode} />
        {isPreview && <Watermark text="VORSCHAU — nicht freigegeben" />}
      </Page>
      <Page size="A4" style={styles.page}>
        <AppendixDivider title="Anhang · Auditprotokoll" />
        <ApprovalsSection approvals={data.approvals} />
        <Footer projectCode={data.project.projectCode} />
      </Page>
    </Document>
  );
}
