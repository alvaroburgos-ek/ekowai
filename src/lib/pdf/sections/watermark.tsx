import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function Watermark({ text }: { text: string }) {
  return (
    <View fixed style={styles.watermark}>
      <Text>{text}</Text>
    </View>
  );
}
