// @ts-nocheck — Plan 6 reattachment pending; ReportData is any until then
import { View, Text } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import type { ReportData } from '../load-data';

export function Decisions({ data }: { data: ReportData }) {
  if (data.decisions.length === 0) return null;
  return (
    <View>
      <Text style={styles.h2}>Entscheidungen</Text>
      <View style={styles.rule} />
      {data.decisions.map((d) => {
        const actor = data.actors[d.madeBy];
        const when = d.madeAt instanceof Date
          ? d.madeAt.toLocaleDateString('de-DE')
          : new Date(d.madeAt as any).toLocaleDateString('de-DE');
        return (
          <View key={d.id} wrap={false} style={{ marginBottom: 6 }}>
            <View style={styles.row}>
              <Text style={styles.cellSym}>{d.decisionPointId}</Text>
              <Text style={styles.cellDesc}>{d.choice}</Text>
              <Text style={[styles.cellSrc, { width: 110 }]}>
                {actor?.fullName ?? actor?.email ?? '—'} · {when}
              </Text>
            </View>
            {d.rationale && (
              <Text
                style={{ marginLeft: 78, color: colors.subtext, fontSize: 9 }}
              >
                {d.rationale}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
