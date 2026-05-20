import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

export function InputsSection({ worksheets }: { worksheets: ReportData['worksheets'] }) {
  const populated = worksheets.filter((w) => w.parameters.some((p) => p.value != null));
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Eingaben</Text>
      {populated.length === 0 ? (
        <Text style={styles.note}>Noch keine Werte eingetragen.</Text>
      ) : (
        populated.map((w) => (
          <View key={w.instanceId} style={styles.worksheetGroup}>
            <Text style={styles.worksheetTitle}>
              {w.code} · {w.titleDe}
            </Text>
            {w.parameters
              .filter((p) => p.value != null)
              .map((p) => (
                <View key={p.symbol} style={styles.row}>
                  <Text style={styles.symbolCell}>{p.symbol}</Text>
                  <Text style={styles.labelCell}>{p.labelDe}</Text>
                  <Text style={styles.valueCell}>
                    {p.value}
                    {p.unit && ` ${p.unit}`}
                  </Text>
                </View>
              ))}
          </View>
        ))
      )}
    </View>
  );
}
