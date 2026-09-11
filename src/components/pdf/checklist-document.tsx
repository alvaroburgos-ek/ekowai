import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './styles';
import { LetterheadHeader } from './letterhead-header';
import { ReportFooter } from './footer';
import type { ConformityData } from '@/lib/pdf/load-conformity';

/**
 * Behörden-Einreichungs-Checkliste (Stage 4): live readiness checklist for a
 * (project, standard) pair — derived from the same data the
 * Konformitätserklärung uses, so both can never disagree. Each item renders
 * checked/unchecked from actual state; nothing is asserted that isn't live.
 */
export function ChecklistDocument({ data }: { data: ConformityData }) {
  const edition = `${data.standard.version}${data.standard.issuedYear ? ` (${data.standard.issuedYear})` : ''}`;
  const allApproved = data.eligible;
  const gatesClean = data.konform;
  const hasSnapshots = data.snapshots.length > 0;

  const items: Array<{ done: boolean; label: string; detail?: string }> = [
    ...data.worksheets.map((w) => ({
      done: w.status === 'engineer_approved' || w.status === 'final',
      label: `Arbeitsblatt ${w.code} · ${w.titleDe}`,
      detail: w.status ?? 'nicht begonnen',
    })),
    { done: gatesClean, label: 'Alle Block-Anforderungen erfüllt', detail: gatesClean ? undefined : `${data.blocking.length} offen` },
    { done: hasSnapshots, label: 'Genehmigter Berechnungsstand (Snapshot) vorhanden' },
    { done: allApproved, label: 'Berechnungsdossier emittierbar (Bericht-PDF)' },
    { done: allApproved && gatesClean, label: 'Konformitätserklärung emittierbar' },
    { done: hasSnapshots, label: 'Wertetabelle für die Zeichnung emittierbar' },
  ];

  return (
    <Document
      title={`${data.project.projectCode ?? 'Projekt'} · ${data.standard.code} · Einreichungs-Checkliste`}
      author={data.letterhead?.orgName ?? 'EKOWAI Wizard'}
      subject={`Behörden-Einreichungs-Checkliste ${data.standard.code} ${edition}`}
    >
      <Page size="A4" style={styles.page}>
        <LetterheadHeader letterhead={data.letterhead} />
        <Text style={styles.h1}>Behörden-Einreichungs-Checkliste</Text>
        <Text style={styles.note}>
          {`${data.standard.code} — ${data.standard.titleDe}, Ausgabe ${edition} · Projekt: ${data.project.name}${data.project.projectCode ? ` (${data.project.projectCode})` : ''}`}
        </Text>

        <View style={{ marginTop: 12 }}>
          {items.map((it, i) => (
            <View key={i} style={styles.siteRow} wrap={false}>
              <Text style={styles.siteLabel}>
                {`${it.done ? '☑' : '☐'}  ${it.label}`}
              </Text>
              <Text style={styles.siteValue}>{it.detail ?? (it.done ? 'erfüllt' : 'offen')}</Text>
            </View>
          ))}
        </View>

        {!gatesClean && data.blocking.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.h2}>Offene Punkte</Text>
            {data.blocking.map((b, i) => (
              <Text key={i} style={styles.note}>{`• ${b}`}</Text>
            ))}
          </View>
        ) : null}

        <Text style={[styles.note, { marginTop: 14 }]}>
          Diese Checkliste bildet den Live-Zustand im EKOWAI Wizard ab; beizufügende
          externe Unterlagen (Lageplan, Baugrundgutachten, Antragsformulare der
          Behörde) sind projektspezifisch zu ergänzen.
        </Text>

        <ReportFooter
          projectCode={data.project.projectCode}
          standardCode={data.standard.code}
          generatedAt={data.generatedAt}
        />
      </Page>
    </Document>
  );
}
