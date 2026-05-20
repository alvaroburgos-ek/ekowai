import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

export function Approvals({ data }: { data: ReportData }) {
  if (data.approvals.length === 0) return null;
  return (
    <View>
      <Text style={styles.h2}>Freigabe-Verlauf</Text>
      <View style={styles.rule} />
      {data.approvals.map((a) => {
        const actor = a.reviewerId ? data.actors[a.reviewerId] : null;
        const when =
          a.decidedAt instanceof Date
            ? a.decidedAt
            : new Date(a.decidedAt as any);
        return (
          <View key={a.id} wrap={false} style={{ marginBottom: 4 }}>
            <View style={styles.row}>
              <Text style={[styles.cellSym, { width: 100 }]}>
                {a.action.toUpperCase()}
              </Text>
              <Text style={styles.cellDesc}>
                {actor?.fullName ?? actor?.email ?? '—'}
              </Text>
              <Text style={[styles.cellSrc, { width: 110 }]}>
                {when.toLocaleDateString('de-DE')}{' '}
                {when.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {a.comment && (
              <Text style={{ marginLeft: 108, fontSize: 9 }}>{a.comment}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
