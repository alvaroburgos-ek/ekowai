import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function AppendixDivider({ title }: { title: string }) {
  return (
    <View break style={styles.appendixDivider}>
      <Text style={styles.appendixTitle}>{title}</Text>
    </View>
  );
}
