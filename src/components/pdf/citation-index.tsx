import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import type { CitationIndexEntry } from '@/lib/pdf/load-standard-report';

const KIND_DE: Record<string, string> = {
  norm: 'Norm / DVGW-Regelwerk',
  guideline: 'Richtlinie',
  permit: 'Genehmigung / Bescheid',
  report: 'Gutachten / Bericht',
  drawing: 'Plan / Zeichnung',
  email: 'E-Mail / Korrespondenz',
  other: 'Sonstige',
};

export function CitationIndex({ entries }: { entries: CitationIndexEntry[] }) {
  return (
    <View>
      <Text style={styles.h2}>Beleg-Verzeichnis</Text>
      {entries.length === 0 ? (
        <Text style={styles.note}>Keine Belege in diesem Standard referenziert.</Text>
      ) : (
        entries.map((entry) => (
          <View key={entry.docId} style={styles.citationIndexRow} wrap={false}>
            <Text style={styles.citationLabelCell}>{entry.citationLabel}</Text>
            <Text style={styles.citationTitleCell}>{entry.title}</Text>
            <Text style={styles.citationKindCell}>
              {entry.kind ? (KIND_DE[entry.kind] ?? entry.kind) : '—'}
            </Text>
            <Text style={styles.citationDateCell}>
              {entry.issuedAt ? new Date(entry.issuedAt).toLocaleDateString('de-DE') : '—'}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
