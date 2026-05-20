import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

export function GrundlagenSection({ standards }: { standards: ReportData['standards'] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Anzuwendende Regelwerke</Text>
      <View>
        {standards.map((s) => (
          <View key={s.id} style={styles.row}>
            <Text style={styles.codeCell}>{s.code}</Text>
            <Text style={styles.titleCell}>{s.titleDe}</Text>
            <Text style={styles.versionCell}>{s.version}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
