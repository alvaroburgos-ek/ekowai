import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './styles';
import { LetterheadHeader } from './letterhead-header';
import { ReportFooter } from './footer';
import type { ConformityData } from '@/lib/pdf/load-conformity';

/**
 * Konformitätserklärung — one-page declaration that the project's design was
 * checked against the named standard AND EDITION, bound to the frozen
 * approve-snapshots. Only rendered when data.eligible (route enforces 409
 * otherwise); a non-konform-but-eligible state renders the deviation list so
 * the document never overstates.
 */
export function ConformityDocument({ data }: { data: ConformityData }) {
  const edition = `${data.standard.version}${data.standard.issuedYear ? ` (${data.standard.issuedYear})` : ''}`;
  return (
    <Document
      title={`${data.project.projectCode ?? 'Projekt'} · ${data.standard.code} · Konformitätserklärung`}
      author={data.letterhead?.orgName ?? 'EKOWAI Wizard'}
      subject={`Konformitätserklärung ${data.standard.code} ${edition}`}
    >
      <Page size="A4" style={styles.page}>
        <LetterheadHeader letterhead={data.letterhead} />
        <Text style={styles.h1}>Konformitätserklärung</Text>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.note}>
            {`Projekt: ${data.project.name}${data.project.projectCode ? ` (${data.project.projectCode})` : ''}`}
          </Text>
          {data.project.clientName ? (
            <Text style={styles.note}>{`Auftraggeber: ${data.project.clientName}`}</Text>
          ) : null}
          {data.project.location ? (
            <Text style={styles.note}>{`Standort: ${data.project.location}`}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: 14 }}>
          <Text>
            {data.konform
              ? `Hiermit wird erklärt, dass die im Projekt dokumentierte Planung gegen die Anforderungen der Norm ${data.standard.code} — ${data.standard.titleDe}, Ausgabe ${edition} — geprüft wurde und alle maschinell prüfbaren Block-Anforderungen zum Zeitpunkt der Erklärung erfüllt sind.`
              : `Die Planung wurde gegen ${data.standard.code} — ${data.standard.titleDe}, Ausgabe ${edition} — geprüft. Es bestehen ABWEICHUNGEN (siehe Liste); diese Erklärung stellt KEINE Konformität fest.`}
          </Text>
        </View>

        {!data.konform && data.blocking.length > 0 ? (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.h2}>Abweichungen</Text>
            {data.blocking.map((b, i) => (
              <Text key={i} style={styles.note}>{`• ${b}`}</Text>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 14 }}>
          <Text style={styles.h2}>Arbeitsblätter</Text>
          {data.worksheets.map((w) => (
            <View key={w.code} style={styles.siteRow}>
              <Text style={styles.siteLabel}>{`${w.code} · ${w.titleDe}`}</Text>
              <Text style={styles.siteValue}>{w.status ?? 'nicht begonnen'}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={styles.h2}>Berechnungsstand (Snapshots)</Text>
          {data.snapshots.length === 0 ? (
            <Text style={styles.note}>Keine genehmigten Berechnungsstände vorhanden.</Text>
          ) : (
            data.snapshots.map((s) => (
              <Text key={s.snapshotId} style={styles.mono}>
                {`${s.worksheetCode}: ${s.snapshotId}${s.takenAt ? ` · ${s.takenAt.slice(0, 10)}` : ''}`}
              </Text>
            ))
          )}
        </View>

        <View style={{ marginTop: 28, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '45%' }}>
            <View style={styles.hairline} />
            <Text style={styles.note}>Ort, Datum</Text>
          </View>
          <View style={{ width: '45%' }}>
            <View style={styles.hairline} />
            <Text style={styles.note}>Unterschrift (verantwortliche Fachkraft)</Text>
          </View>
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
