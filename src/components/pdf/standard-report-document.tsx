import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './styles';
import { LetterheadHeader } from './letterhead-header';
import { ProjectHeader } from './project-header';
import { SiteProfileSection } from './site-profile-section';
import { WorksheetSection } from './worksheet-section';
import { CitationIndex } from './citation-index';
import { AuditExcerpt } from './audit-excerpt';
import { ReportFooter } from './footer';
import type { StandardReportData } from '@/lib/pdf/load-standard-report';

/**
 * The compliance report Document. One @react-pdf <Page> per logical section
 * with page breaks. The letterhead + footer are `fixed` so they repeat on
 * every page.
 *
 * The three-state contract is preserved through the WorksheetSection →
 * EngineVerdict component chain. The data layer NEVER converts a
 * manual_required / error state into a value — the EngineVerdict renderer
 * is what decides what colour box to draw.
 */
export function StandardReportDocument({ data }: { data: StandardReportData }) {
  return (
    <Document
      title={`${data.project.projectCode ?? 'Projekt'} · ${data.standard.code} · Compliance-Bericht`}
      author={data.letterhead?.orgName ?? 'EKOWAI Wizard'}
      subject={`Compliance-Bericht ${data.standard.code} ${data.standard.titleDe}`}
      keywords={`DWA, Compliance, ${data.standard.code}`}
    >
      {/* Page 1 — cover (project header + site profile) */}
      <Page size="A4" style={styles.page}>
        <LetterheadHeader letterhead={data.letterhead} />
        <ProjectHeader
          project={data.project}
          standard={data.standard}
          generatedAt={data.generatedAt}
        />
        <SiteProfileSection siteProfile={data.siteProfile} />
        {/* Berechnungsstand: the approve-snapshot ids this report refers to. */}
        <View style={{ marginTop: 12 }}>
          <Text style={styles.h2}>Berechnungsstand</Text>
          {(data.approveSnapshots ?? []).length === 0 ? (
            <Text style={styles.note}>
              Kein genehmigter Berechnungsstand — Werte sind Arbeitsstand.
            </Text>
          ) : (
            (data.approveSnapshots ?? []).map((s) => (
              <Text key={s.snapshotId} style={styles.mono}>
                {`${s.worksheetCode}: ${s.snapshotId}${s.takenAt ? ` · ${s.takenAt.slice(0, 10)}` : ''}`}
              </Text>
            ))
          )}
        </View>
        <ReportFooter
          projectCode={data.project.projectCode}
          standardCode={data.standard.code}
          generatedAt={data.generatedAt}
        />
      </Page>

      {/* Page 2..N — one worksheet block per page. @react-pdf flows within
          a Page automatically; we explicitly break per worksheet for
          stronger visual separation when printing. */}
      {data.worksheets.map((ws, i) => (
        <Page key={ws.templateId} size="A4" style={styles.page}>
          <LetterheadHeader letterhead={data.letterhead} />
          <View break={i > 0}>
            <WorksheetSection worksheet={ws} />
          </View>
          <ReportFooter
            projectCode={data.project.projectCode}
            standardCode={data.standard.code}
            generatedAt={data.generatedAt}
          />
        </Page>
      ))}

      {/* Final page — citation index + audit excerpt. */}
      <Page size="A4" style={styles.page}>
        <LetterheadHeader letterhead={data.letterhead} />
        <CitationIndex entries={data.citationIndex} />
        <View style={{ marginTop: 12 }}>
          <AuditExcerpt entries={data.audit} />
        </View>
        <ReportFooter
          projectCode={data.project.projectCode}
          standardCode={data.standard.code}
          generatedAt={data.generatedAt}
        />
      </Page>
    </Document>
  );
}
