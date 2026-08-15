import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './styles';
import { LetterheadHeader } from './letterhead-header';
import { ReportFooter } from './footer';
import type { StandardReportData } from '@/lib/pdf/load-standard-report';

/**
 * Prüf-Memo (Stage 4 — the Plausibilitätsprüfung product): a condensed
 * engineer's memo over one (project, standard) pair — gate results with
 * explanations, verification state, snapshot binding, verdict paragraph,
 * signature block. Derived from the SAME data as the full report.
 */
export function PruefmemoDocument({ data }: { data: StandardReportData }) {
  const allCompliance = data.worksheets.flatMap((w) =>
    w.compliance.map((c) => ({ ws: w.code, ...c })),
  );
  const failed = allCompliance.filter((c) => c.result.kind === 'fail');
  const passed = allCompliance.filter((c) => c.result.kind === 'pass').length;
  const open = allCompliance.length - passed - failed.length;
  const unverified = data.worksheets.flatMap((w) =>
    (w.unverifiedFields ?? []).map((f) => ({ ws: w.code, ...f })),
  );
  const snapshots = data.approveSnapshots ?? [];

  return (
    <Document
      title={`${data.project.projectCode ?? 'Projekt'} · ${data.standard.code} · Prüf-Memo`}
      author={data.letterhead?.orgName ?? 'EKOWAI Wizard'}
      subject={`Prüf-Memo (Plausibilitätsprüfung) ${data.standard.code} ${data.standard.version}`}
    >
      <Page size="A4" style={styles.page}>
        <LetterheadHeader letterhead={data.letterhead} />
        <Text style={styles.h1}>Prüf-Memo — Plausibilitätsprüfung</Text>
        <Text style={styles.note}>
          {`${data.standard.code} — ${data.standard.titleDe} (${data.standard.version}) · Projekt: ${data.project.projectName}${data.project.projectCode ? ` (${data.project.projectCode})` : ''}`}
        </Text>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.h2}>Prüfergebnis</Text>
          <Text>
            {`${passed} von ${allCompliance.length} maschinell prüfbaren Anforderungen erfüllt · ${failed.length} verletzt · ${open} offen/manuell.`}
          </Text>
          <Text style={styles.note}>
            {failed.length === 0
              ? 'Keine verletzte Block- oder Warn-Anforderung zum Prüfzeitpunkt.'
              : 'Verletzte Anforderungen mit Begründung siehe unten.'}
          </Text>
        </View>

        {failed.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.h2}>Verletzte Anforderungen</Text>
            {failed.map((c) => (
              <View key={c.id} wrap={false} style={{ marginBottom: 3 }}>
                <Text>
                  {`${c.ws} · ${c.code} — ${c.titleDe}`}
                  {c.clauseReference ? ` (${c.clauseReference})` : ''}
                  {` [${c.severity}]`}
                </Text>
                {(c.explanation ?? []).map((leaf, i) => (
                  <Text key={i} style={[styles.note, { marginLeft: 10 }]}>
                    {[leaf.actual, leaf.required, leaf.wouldPass ? `→ ${leaf.wouldPass}` : null]
                      .filter(Boolean)
                      .join(' · ') || leaf.text}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 8 }}>
          <Text style={styles.h2}>Verifikationsstand (SR-1)</Text>
          {unverified.length === 0 ? (
            <Text style={styles.note}>
              Alle verwendeten Felddefinitionen sind gegen die Norm verifiziert.
            </Text>
          ) : (
            unverified.map((f, i) => (
              <Text key={i} style={styles.note}>
                {`• ${f.ws}: ${f.labelDe} (${f.symbol}) — ${f.status}`}
              </Text>
            ))
          )}
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={styles.h2}>Berechnungsstand</Text>
          {snapshots.length === 0 ? (
            <Text style={styles.note}>Kein genehmigter Berechnungsstand — Prüfung auf Arbeitsstand.</Text>
          ) : (
            snapshots.map((s) => (
              <Text key={s.snapshotId} style={styles.mono}>
                {`${s.worksheetCode}: ${s.snapshotId}${s.takenAt ? ` · ${s.takenAt.slice(0, 10)}` : ''}`}
              </Text>
            ))
          )}
        </View>

        <Text style={[styles.note, { marginTop: 10 }]}>
          Dieses Memo ist eine Plausibilitätsprüfung auf Basis der im Wizard
          hinterlegten Werte und maschinell prüfbaren Anforderungen; es ersetzt
          keine vollständige Fachprüfung der Eingangsdaten.
        </Text>

        <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '45%' }}>
            <View style={styles.hairline} />
            <Text style={styles.note}>Ort, Datum</Text>
          </View>
          <View style={{ width: '45%' }}>
            <View style={styles.hairline} />
            <Text style={styles.note}>Unterschrift (prüfende Fachkraft)</Text>
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
