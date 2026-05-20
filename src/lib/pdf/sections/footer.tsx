import { View, Text } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import type { ReportData } from '../load-data';

export function Footer({
  data,
  draft,
}: {
  data: ReportData;
  draft: boolean;
}) {
  return (
    <View
      fixed
      style={{
        position: 'absolute',
        bottom: 24,
        left: 56,
        right: 56,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 0.5,
        borderColor: colors.hairline,
        paddingTop: 6,
      }}
    >
      <Text style={styles.meta}>{data.project.name}</Text>
      {draft ? (
        <Text style={[styles.meta, { color: colors.warning }]}>
          Bemessungsbericht nicht freigegeben
        </Text>
      ) : (
        <Text style={styles.meta}>
          {data.calc.regulationCode} {data.calc.regulationVersion}
        </Text>
      )}
      <Text
        style={styles.meta}
        render={({ pageNumber, totalPages }) =>
          `Seite ${pageNumber}/${totalPages}`
        }
      />
    </View>
  );
}
