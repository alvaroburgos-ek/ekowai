import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './styles';
import { ReportFooter } from './footer';
import type { ValuetableData } from '@/lib/pdf/load-valuetable';

/**
 * Wertetabelle für die Zeichnung: compact symbol/value/unit/clause table,
 * footer-stamped with the latest approve-snapshot id for the CAD title block.
 */
export function ValuetableDocument({ data }: { data: ValuetableData }) {
  return (
    <Document
      title={`${data.project.projectCode ?? 'Projekt'} · ${data.standard.code} · Wertetabelle`}
      subject={`Wertetabelle ${data.standard.code}`}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>
          {`Wertetabelle · ${data.standard.code} (${data.standard.version})`}
        </Text>
        <Text style={styles.note}>
          {`Projekt: ${data.project.name}${data.project.projectCode ? ` (${data.project.projectCode})` : ''}`}
        </Text>
        {data.snapshotId ? (
          <Text style={styles.mono}>
            {`Berechnungsstand: ${data.snapshotId}${data.snapshotTakenAt ? ` · ${data.snapshotTakenAt.slice(0, 10)}` : ''}`}
          </Text>
        ) : (
          <Text style={styles.note}>
            Kein genehmigter Berechnungsstand — Werte sind Arbeitsstand.
          </Text>
        )}

        <View style={{ marginTop: 10 }}>
          {data.rows.length === 0 ? (
            <Text style={styles.note}>Keine gespeicherten Werte.</Text>
          ) : (
            data.rows.map((r, i) => (
              <View
                key={`${r.worksheetCode}-${r.symbol}-${i}`}
                style={[styles.siteRow, { flexDirection: 'row' }]}
                wrap={false}
              >
                <Text style={[styles.mono, { width: '14%' }]}>{r.worksheetCode}</Text>
                <Text style={[styles.mono, { width: '16%' }]}>{r.symbol}</Text>
                <Text style={{ width: '34%' }}>{r.labelDe}</Text>
                <Text style={[styles.mono, { width: '18%', textAlign: 'right' }]}>
                  {r.value}
                  {r.unit ? ` ${r.unit}` : ''}
                </Text>
                <Text style={[styles.note, { width: '18%', textAlign: 'right' }]}>
                  {r.clauseReference ?? ''}
                </Text>
              </View>
            ))
          )}
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
