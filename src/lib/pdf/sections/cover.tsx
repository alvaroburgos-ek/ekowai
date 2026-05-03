import { View, Text } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import type { ReportData } from '../load-data';

function statusLabel(s: string): string {
  return (
    {
      draft: 'ENTWURF',
      submitted: 'EINGEREICHT',
      approved: 'FREIGEGEBEN',
      rejected: 'ABGELEHNT',
      changes_requested: 'ÄNDERUNGEN ERBETEN',
    } as Record<string, string>
  )[s] ?? s.toUpperCase();
}

function statusStyle(s: string) {
  if (s === 'approved') return styles.chipOk;
  if (s === 'rejected') return styles.chipErr;
  return styles.chipWarn;
}

export function Cover({ data }: { data: ReportData }) {
  const { project, org, calc, worksheet } = data;
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontWeight: 'semibold', fontSize: 11 }}>{org.name}</Text>
          {org.addressLine1 && <Text style={styles.meta}>{org.addressLine1}</Text>}
          {(org.postalCode || org.city) && (
            <Text style={styles.meta}>
              {[org.postalCode, org.city].filter(Boolean).join(' ')}
            </Text>
          )}
          {org.email && <Text style={styles.meta}>{org.email}</Text>}
          {org.website && <Text style={styles.meta}>{org.website}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.meta}>Bemessungsbericht</Text>
          <Text style={styles.meta}>
            nach {calc.regulationCode} {calc.regulationVersion}
          </Text>
          <Text style={[styles.meta, { marginTop: 4 }]}>
            erstellt {new Date().toLocaleDateString('de-DE')}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 36 }}>
        <Text style={styles.h1}>{project.name}</Text>
        {project.clientName && <Text>{project.clientName}</Text>}
        {project.location && (
          <Text style={{ color: colors.subtext }}>{project.location}</Text>
        )}
      </View>

      <View style={{ marginTop: 24 }}>
        <View style={styles.row}>
          <Text style={[styles.meta, { width: 140 }]}>Berechnung</Text>
          <Text>{calc.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.meta, { width: 140 }]}>Arbeitsblatt</Text>
          <Text style={styles.num}>
            {worksheet.id} — {worksheet.titleDe}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.meta, { width: 140 }]}>Status</Text>
          <Text style={statusStyle(calc.status)}>{statusLabel(calc.status)}</Text>
        </View>
      </View>
    </View>
  );
}
