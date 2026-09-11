import { View, Text } from '@react-pdf/renderer';
import { styles, colors } from './styles';
import type { ReportProjectHeader, StandardReportData } from '@/lib/pdf/load-standard-report';

const STATUS_DE: Record<ReportProjectHeader['aggregatedStatus'], string> = {
  draft: 'Entwurf',
  submitted: 'eingereicht',
  final: 'final / freigegeben',
};

const STATUS_COLOR: Record<ReportProjectHeader['aggregatedStatus'], string> = {
  draft: colors.subtext,
  submitted: colors.warning,
  final: colors.success,
};

export function ProjectHeader({
  project,
  standard,
  generatedAt,
}: {
  project: ReportProjectHeader;
  standard: StandardReportData['standard'];
  generatedAt: string;
}) {
  return (
    <View style={styles.projectHeader}>
      <Text style={styles.smallCaps}>Compliance-Bericht · DWA-konform</Text>
      <Text style={styles.h1}>{project.projectName}</Text>
      <Text style={{ fontSize: 11, color: colors.ink2 }}>
        {standard.code} · {standard.titleDe}{' '}
        <Text style={{ color: colors.subtext }}>(Version {standard.version})</Text>
      </Text>
      {standard.supersededBy && (
        <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.warning, marginTop: 2 }}>
          Norm ersetzt — Ausgabe prüfen: Dieser Bericht wurde unter einer inzwischen
          ersetzten Ausgabe des Regelwerks erstellt.
        </Text>
      )}
      <View style={styles.projectMeta}>
        <Cell label="Projektnummer" value={project.projectCode ?? '—'} />
        <Cell label="Bauherr" value={project.clientName ?? '—'} />
        <Cell label="Standort" value={project.location ?? '—'} />
        <Cell label="Berichtsdatum" value={new Date(generatedAt).toLocaleDateString('de-DE')} />
      </View>
      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.smallCaps, { marginRight: 6 }]}>Status</Text>
        <Text
          style={[
            styles.statusBadge,
            { color: STATUS_COLOR[project.aggregatedStatus], borderColor: STATUS_COLOR[project.aggregatedStatus] },
          ]}
        >
          {STATUS_DE[project.aggregatedStatus]}
        </Text>
      </View>
    </View>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.projectMetaCell}>
      <Text style={styles.projectMetaLabel}>{label}</Text>
      <Text style={styles.projectMetaValue}>{value}</Text>
    </View>
  );
}
