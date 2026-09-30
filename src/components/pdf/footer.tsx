import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';

/**
 * Footer fixed to every page — left: project code, middle: generation time, right: page N / N.
 *
 * The page number is NOT rendered here: a `<Text render={({pageNumber,totalPages})…}>` inside a
 * fixed view makes @react-pdf/renderer 4.5 fail with "unsupported number" once a document reaches
 * ten pages (readiness run 2026-09-30). `renderPdf` stamps "Seite i / n" with pdf-lib into the
 * right-hand slot after rendering; the empty third child keeps the space-between layout so the
 * generation time stays in the middle.
 */
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
      <Text>{' '}</Text>
    </View>
  );
}
