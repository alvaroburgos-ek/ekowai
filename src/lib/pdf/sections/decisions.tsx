import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function DecisionsSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Entscheidungen</Text>
      <Text style={styles.note}>Phase 2 — Entscheidungsbaum folgt.</Text>
    </View>
  );
}
