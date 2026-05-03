import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';
import { fmtDe } from '../format';

export function Inputs({ data }: { data: ReportData }) {
  const { worksheet, cells, citedDocs } = data;
  const docIndex = Object.fromEntries(
    citedDocs.map((d, i) => [d.id, String.fromCharCode(65 + i)]),
  );
  return (
    <View>
      <Text style={styles.h2}>Eingangswerte</Text>
      <View style={styles.rule} />
      {worksheet.inputs.map((inp) => {
        const cell = cells[inp.id];
        const v = cell?.value;
        const src = cell?.source;
        const srcLabel = src
          ? 'docId' in src
            ? `Anh. ${docIndex[src.docId] ?? '?'}`
            : src.label
          : '—';
        return (
          <View key={inp.id} style={styles.row}>
            <Text style={styles.cellSym}>{inp.id}</Text>
            <Text style={styles.cellDesc}>{inp.labelDe}</Text>
            <Text style={styles.cellVal}>{fmtDe(v)}</Text>
            <Text style={styles.cellUnit}>{inp.unit ?? ''}</Text>
            <Text style={styles.cellSrc}>{srcLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}
