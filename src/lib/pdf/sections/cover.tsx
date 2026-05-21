import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

export function CoverSection({ project }: { project: ReportData['project'] }) {
  return (
    <View style={styles.coverPage}>
      <Text style={styles.coverMeta}>
        {project.projectCode ?? project.id.slice(0, 8)}
      </Text>
      <Text style={styles.coverTitle}>{project.name}</Text>
      {project.siteLocation && (
        <Text style={styles.coverSubtitle}>{project.siteLocation}</Text>
      )}
      {project.org && (
        <Text style={styles.coverOrg}>{project.org.name}</Text>
      )}
      <Text style={styles.coverDate}>
        Erstellt am {new Date(project.createdAt).toLocaleDateString('de-DE')}
      </Text>
    </View>
  );
}
