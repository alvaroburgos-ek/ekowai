import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

export function ApprovalsSection({ approvals }: { approvals: ReportData['approvals'] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Auditprotokoll · Freigaben</Text>
      {approvals.length === 0 ? (
        <Text style={styles.note}>Noch keine Freigaben.</Text>
      ) : (
        approvals.map((a, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.dateCell}>
              {new Date(a.occurredAt).toLocaleString('de-DE')}
            </Text>
            <Text style={styles.codeCell}>{a.worksheetCode}</Text>
            <Text style={styles.eventCell}>
              {a.fromStatus} → {a.toStatus}
            </Text>
            <Text style={styles.actorCell}>{a.actorName ?? '—'}</Text>
            <Text style={styles.commentCell}>„{a.comment}"</Text>
          </View>
        ))
      )}
    </View>
  );
}
