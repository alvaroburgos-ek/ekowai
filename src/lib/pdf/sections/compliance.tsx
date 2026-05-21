import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function ComplianceSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Compliance-Übersicht</Text>
      <Text style={styles.note}>Phase 2 — Compliance-Auswertung folgt.</Text>
    </View>
  );
}
