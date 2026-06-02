import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';

/**
 * Compliance section. For every worksheet that has compliance rows,
 * render each verdict:
 *
 *   ✓  pass — condition satisfied
 *   ✗  fail (block-severity) or ⚠ fail (warn-severity) — condition not
 *      satisfied; block-severity gates feasibility
 *   ○  pending — referenced symbols have no value yet (input missing)
 *   §  awaiting engineer sign-off — condition is an attestation
 *      placeholder (`engineer-verified`, `verify Gl. X`) that the
 *      engineer must manually confirm
 *   !  condition not parseable — defect in the rule itself (needs an
 *      engineer ticket, not engineer attestation)
 *
 * The § vs ! split is the affordance the integration-health sweep
 * called out: 12 of the DWA-A 138-1 manual-verify conditions are
 * intentional attestation placeholders, not parser bugs. Without the
 * split they read as identical "?" badges and the engineer cannot tell
 * "I need to sign off" from "the rule is broken."
 */
export function ComplianceSection({ worksheets }: { worksheets: ReportData['worksheets'] }) {
  const withRows = worksheets.filter((w) => w.compliance.length > 0);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Compliance-Übersicht</Text>
      {withRows.length === 0 ? (
        <Text style={styles.note}>Keine Compliance-Regeln auf diesen Arbeitsblättern.</Text>
      ) : (
        withRows.map((w) => (
          <View key={w.instanceId} style={styles.worksheetGroup}>
            <Text style={styles.worksheetTitle}>
              {w.code} · {w.titleDe}
            </Text>
            {w.compliance.map((r) => (
              <ComplianceRow key={r.code} result={r} />
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function ComplianceRow({
  result,
}: {
  result: ReportData['worksheets'][number]['compliance'][number];
}) {
  const { badge, verdict } = renderVerdict(result);
  return (
    <View style={styles.row}>
      <Text style={styles.symbolCell}>
        {badge} {result.code}
      </Text>
      <Text style={styles.labelCell}>{result.titleDe}</Text>
      <Text style={styles.valueCell}>{verdict}</Text>
    </View>
  );
}

function renderVerdict(
  result: ReportData['worksheets'][number]['compliance'][number],
): { badge: string; verdict: string } {
  switch (result.result.kind) {
    case 'pass':
      return { badge: '✓', verdict: 'erfüllt' };
    case 'fail':
      return {
        badge: result.severity === 'warn' ? '⚠' : '✗',
        verdict: result.severity === 'warn' ? 'Empfehlung nicht erfüllt' : 'nicht erfüllt (block)',
      };
    case 'pending':
      return {
        badge: '○',
        verdict: `Eingaben fehlen: ${result.result.missingSymbols.slice(0, 4).join(', ')}`,
      };
    case 'manual':
      if (result.requiresAttestation) {
        return { badge: '§', verdict: 'Ingenieur-Bestätigung ausstehend' };
      }
      return { badge: '!', verdict: 'Bedingung nicht auswertbar — Regel reparieren' };
  }
}
