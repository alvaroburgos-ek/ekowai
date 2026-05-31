import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import type { ReportSiteProfile } from '@/lib/pdf/load-standard-report';

export function SiteProfileSection({ siteProfile }: { siteProfile: ReportSiteProfile }) {
  return (
    <View>
      <Text style={styles.h2}>Standortprofil</Text>
      {siteProfile.rows.length === 0 ? (
        <Text style={styles.note}>Kein Standortprofil hinterlegt.</Text>
      ) : (
        siteProfile.rows.map((row) => (
          <View key={row.key} style={styles.siteRow}>
            <Text style={styles.siteLabel}>{row.labelDe}</Text>
            <Text style={styles.siteValue}>
              {row.value}
              {row.unit ? ` ${row.unit}` : ''}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
