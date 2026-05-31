import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';

/** Footer fixed to every page — left: project code, right: page N / N. */
export function ReportFooter({
  projectCode,
  standardCode,
  generatedAt,
}: {
  projectCode: string | null;
  standardCode: string;
  generatedAt: string;
}) {
  return (
    <View fixed style={styles.footer}>
      <Text>
        {projectCode ?? 'PROJEKT'} · {standardCode}
      </Text>
      <Text>
        {new Date(generatedAt).toLocaleString('de-DE')}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Seite ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}
