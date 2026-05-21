import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function Footer({ projectCode }: { projectCode: string | null }) {
  return (
    <View fixed style={styles.footer}>
      <Text>{projectCode ?? 'PROJEKT'}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}
