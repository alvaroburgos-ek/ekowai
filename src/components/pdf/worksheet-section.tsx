import { View, Text } from '@react-pdf/renderer';
import { styles, colors } from './styles';
import { EngineVerdict } from './engine-verdict';
import type {
  ReportWorksheet,
  ReportField,
  ReportCompliance,
} from '@/lib/pdf/load-standard-report';

// @react-pdf doesn't re-export the `Style` type from its own d.ts (it
// internally consumes @react-pdf/types, which isn't a direct dep). We
// derive a structural alias from a sample stylesheet entry.
type PdfStyle = (typeof styles)[keyof typeof styles];

const STATUS_LABELS_DE: Record<string, string> = {
  draft: 'Entwurf',
  in_review: 'in Prüfung',
  submitted: 'eingereicht',
  approved: 'freigegeben',
  final: 'final',
  rejected: 'abgelehnt',
};

/**
 * Renders one worksheet block: header → sectioned fields → equations → compliance.
 *
 * Field rows show value + unit + citation labels (short form). The full
 * document index lives at the end of the report.
 */
export function WorksheetSection({ worksheet }: { worksheet: ReportWorksheet }) {
  const statusLabel = worksheet.status ? (STATUS_LABELS_DE[worksheet.status] ?? worksheet.status) : 'nicht angelegt';
  return (
    <View>
      <View style={styles.worksheetHeader} wrap={false}>
        <View>
          <Text style={styles.worksheetCode}>{worksheet.code}</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.ink, marginTop: 1 }}>
            {worksheet.titleDe}
          </Text>
        </View>
        <Text style={styles.smallCaps}>Status · {statusLabel}</Text>
      </View>

      {/* Sections */}
      {worksheet.sections.length === 0 ? (
        <Text style={styles.note}>Keine Felder definiert.</Text>
      ) : (
        worksheet.sections.map((sec) => (
          <View key={sec.id}>
            <Text style={styles.h3}>{sec.titleDe}</Text>
            {sec.fields.map((f) => (
              <FieldRow key={f.id} field={f} />
            ))}
          </View>
        ))
      )}

      {/* Equations + engine verdicts */}
      {worksheet.equations.length > 0 ? (
        <View>
          <Text style={styles.h3}>Gleichungen</Text>
          {worksheet.equations.map((eq) => (
            <EngineVerdict key={eq.id} equation={eq} />
          ))}
        </View>
      ) : null}

      {/* Compliance */}
      {worksheet.compliance.length > 0 ? (
        <View>
          <Text style={styles.h3}>Compliance-Anforderungen</Text>
          {worksheet.compliance.map((c) => (
            <ComplianceRow key={c.id} req={c} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FieldRow({ field }: { field: ReportField }) {
  const hasValue = field.value != null && field.value !== '';
  const citations = field.citations.map((c) => c.label).join(', ');
  const sourceMarker = sourceMarkerFor(field);
  return (
    <View style={styles.fieldRow} wrap={false}>
      <Text style={styles.fieldRowSymbol}>{field.symbol}</Text>
      <Text style={styles.fieldRowLabel}>
        {field.labelDe}
        {field.isRequired && !hasValue ? <Text style={{ color: colors.error }}> *</Text> : null}
      </Text>
      <Text style={hasValue ? styles.fieldRowValue : [styles.fieldRowValue, styles.fieldMissing]}>
        {hasValue ? field.value : '— fehlt'}
        {sourceMarker ? <Text style={{ color: colors.subtext }}> {sourceMarker}</Text> : null}
      </Text>
      <Text style={styles.fieldRowUnit}>{field.unit ?? ''}</Text>
      <Text style={styles.fieldRowCitations}>{citations || '—'}</Text>
    </View>
  );
}

function sourceMarkerFor(field: ReportField): string | null {
  switch (field.valueSource) {
    case 'site_profile':
      return '↘ Profil';
    case 'inherited':
      return '↘ vererbt';
    case 'computed':
      return '✓ Engine';
    default:
      return null;
  }
}

function ComplianceRow({ req }: { req: ReportCompliance }) {
  const { label, style } = badgeFor(req);
  return (
    <View style={styles.complianceRow} wrap={false}>
      <Text style={styles.complianceCode}>{req.code}</Text>
      <Text style={styles.complianceTitle}>
        {req.titleDe}
        {req.clauseReference ? (
          <Text style={{ color: colors.subtext }}> · {req.clauseReference}</Text>
        ) : null}
      </Text>
      <Text style={[styles.complianceBadge, style]}>{label}</Text>
    </View>
  );
}

function badgeFor(req: ReportCompliance): { label: string; style: PdfStyle } {
  const r = req.result;
  if (r.kind === 'pass') return { label: '✓ erfüllt', style: styles.complianceBadgePass };
  if (r.kind === 'fail') return { label: '✗ nicht erfüllt', style: styles.complianceBadgeFail };
  if (r.kind === 'pending') return { label: '⚠ offen', style: styles.complianceBadgeOpen };
  return { label: 'manuell', style: styles.complianceBadgeOpen };
}
