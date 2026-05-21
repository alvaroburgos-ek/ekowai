import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function ComputedSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Berechnete Größen</Text>
      <Text style={styles.note}>Phase 2 — automatische Berechnung folgt.</Text>
    </View>
  );
}
