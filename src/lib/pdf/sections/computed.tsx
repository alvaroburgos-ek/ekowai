import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';
import { fmtDe } from '../format';

export function Computed({ data }: { data: ReportData }) {
  const { worksheet, result } = data;
  if (worksheet.computed.length === 0) return null;
  return (
    <View>
      <Text style={styles.h2}>Berechnete Größen</Text>
      <View style={styles.rule} />
      {worksheet.computed.map((c) => {
        const v = result.computed[c.id];
        return (
          <View key={c.id} style={styles.row}>
            <Text style={styles.cellSym}>{c.id}</Text>
            <Text style={styles.cellDesc}>{c.labelDe}</Text>
            <Text style={styles.cellVal}>
              {Number.isNaN(v) ? '—' : fmtDe(v)}
            </Text>
            <Text style={styles.cellUnit}>{c.unit ?? ''}</Text>
          </View>
        );
      })}
    </View>
  );
}
