import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import type { AuditExcerptEntry } from '@/lib/pdf/load-standard-report';

const ACTION_DE: Record<string, string> = {
  submit_for_review: 'eingereicht',
  approve: 'freigegeben',
  reject: 'abgelehnt',
  withdraw: 'zurückgezogen',
  manual_override: 'manuelle Überschreibung',
  citation_added: 'Beleg hinzugefügt',
  citation_removed: 'Beleg entfernt',
  field_changed: 'Wert geändert',
};

/**
 * Last 25 audit events. Approval-event rows preserve their original detail
 * ("draft → submitted · „<Kommentar>"") so an authority can see the comment
 * the engineer attached at submission; manual_override entries from
 * audit_log surface the engineer's reason, which is the contract the
 * tool's three-state design rests on.
 */
export function AuditExcerpt({ entries }: { entries: AuditExcerptEntry[] }) {
  return (
    <View>
      <Text style={styles.h2}>Audit-Trail-Auszug</Text>
      {entries.length === 0 ? (
        <Text style={styles.note}>Noch keine relevanten Aktionen protokolliert.</Text>
      ) : (
        entries.map((entry, i) => (
          <View key={i} style={styles.auditRow} wrap={false}>
            <Text style={styles.auditDate}>
              {new Date(entry.occurredAt).toLocaleString('de-DE')}
            </Text>
            <Text style={styles.auditAction}>
              {ACTION_DE[entry.action] ?? entry.action}
              {entry.worksheetCode ? ` · ${entry.worksheetCode}` : ''}
            </Text>
            <Text style={styles.auditActor}>{entry.actorName ?? '—'}</Text>
            <Text style={styles.auditDetail}>{entry.detail}</Text>
          </View>
        ))
      )}
    </View>
  );
}
