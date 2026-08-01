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

      {/* A_S,m manual provenance notice (A138-12 only, method=manual) */}
      {worksheet.aSmProvenanceLine ? (
        <View
          style={{
            marginTop: 6,
            marginBottom: 2,
            paddingVertical: 5,
            paddingHorizontal: 8,
            borderWidth: 0.75,
            borderColor: '#c8a86b',
            backgroundColor: '#fdf6e8',
          }}
          wrap={false}
        >
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.warning }}>
            {worksheet.aSmProvenanceLine}
          </Text>
        </View>
      ) : null}

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

      {/* Stage-1 (SR-1): used-but-unverified field definitions — the reviewer
          must see this list before a signature rests on these values. */}
      {(worksheet.unverifiedFields ?? []).length > 0 ? (
        <View
          style={{
            marginTop: 6,
            paddingVertical: 5,
            paddingHorizontal: 8,
            borderWidth: 0.75,
            borderColor: '#c8a86b',
            backgroundColor: '#fdf6e8',
          }}
          wrap={false}
        >
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.warning }}>
            Unverifizierte Felddefinitionen (SR-1) — gegen die Norm noch nicht bestätigt:
          </Text>
          {(worksheet.unverifiedFields ?? []).map((f) => (
            <Text key={f.symbol} style={{ fontSize: 8.5, color: colors.warning, marginTop: 1 }}>
              {`• ${f.labelDe} (${f.symbol}) — ${f.status}`}
            </Text>
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
        {field.clientSupplied ? (
          <Text style={{ color: colors.warning, fontSize: 7.5 }}> · Kundenangabe</Text>
        ) : null}
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
    <View wrap={false}>
      <View style={styles.complianceRow}>
        <Text style={styles.complianceCode}>{req.code}</Text>
        <Text style={styles.complianceTitle}>
          {req.titleDe}
          {req.clauseReference ? (
            <Text style={{ color: colors.subtext }}> · {req.clauseReference}</Text>
          ) : null}
        </Text>
        <Text style={[styles.complianceBadge, style]}>{label}</Text>
      </View>
      {/* Stage-3: failed gates explain themselves — actual · required · wouldPass. */}
      {req.explanation && req.explanation.length > 0 ? (
        <View style={{ marginLeft: 42, marginBottom: 3 }}>
          {req.explanation.map((leaf, i) => (
            <Text key={i} style={{ fontSize: 8, color: colors.subtext }}>
              {[leaf.actual, leaf.required, leaf.wouldPass ? `→ ${leaf.wouldPass}` : null]
                .filter(Boolean)
                .join(' · ') || leaf.text}
            </Text>
          ))}
        </View>
      ) : null}
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
