import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

export function Grundlagen({ data }: { data: ReportData }) {
  if (data.citedDocs.length === 0) return null;
  return (
    <View>
      <Text style={styles.h2}>Grundlagen</Text>
      <View style={styles.rule} />
      {data.citedDocs.map((d, i) => (
        <View key={d.id} style={styles.row}>
          <Text style={styles.cellSym}>
            Anhang {String.fromCharCode(65 + i)}
          </Text>
          <Text style={styles.cellDesc}>{d.title}</Text>
          <Text style={styles.cellSrc}>{d.citationLabel}</Text>
        </View>
      ))}
    </View>
  );
}
