import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ReportData } from '../load-data';
import { fmtDe } from '../format';

/**
 * Computed-equations section. For every worksheet that has whitelisted
 * equations, render each result with a verdict badge:
 *
 *   ✓  computed value (engineer can verify against hand calc)
 *   ?  manual_required — engine cannot compute (missing input, unit
 *      conflict, ambiguous source, incomplete carrier row, …)
 *   ✗  error — evaluator threw (formula unparseable or similar)
 *
 * The PDF surfaces the verdict and the underlying reason so the engineer
 * sees WHY a value is missing rather than a silent blank.
 */
export function ComputedSection({ worksheets }: { worksheets: ReportData['worksheets'] }) {
  const withResults = worksheets.filter((w) => w.equations.length > 0);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Berechnete Größen</Text>
      {withResults.length === 0 ? (
        <Text style={styles.note}>
          Noch keine berechneten Größen — Engine-Whitelist enthält keine
          Gleichung auf diesen Arbeitsblättern.
        </Text>
      ) : (
        withResults.map((w) => (
          <View key={w.instanceId} style={styles.worksheetGroup}>
            <Text style={styles.worksheetTitle}>
              {w.code} · {w.titleDe}
            </Text>
            {w.equations.map((r) => (
              <EquationRow key={r.equationId} result={r} />
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function EquationRow({
  result,
}: {
  result: ReportData['worksheets'][number]['equations'][number];
}) {
  const badge = result.state.kind === 'computed'
    ? '✓'
    : result.state.kind === 'manual_required' ? '?' : '✗';
  const verdict = result.state.kind === 'computed'
    ? formatValue(result.state.value, result.outputUnit)
    : result.state.kind === 'manual_required'
      ? truncate(result.state.reason ?? 'Wert nicht ermittelbar', 80)
      : truncate(result.state.message ?? 'Engine-Fehler', 80);

  return (
    <View style={styles.row}>
      <Text style={styles.symbolCell}>
        {badge} Gl. {result.equationNumber}
      </Text>
      <Text style={styles.labelCell}>
        {result.outputSymbol ?? '—'}
      </Text>
      <Text style={styles.valueCell}>{verdict}</Text>
    </View>
  );
}

function formatValue(v: number, unit: string | null): string {
  return unit ? `${fmtDe(v)} ${unit}` : fmtDe(v);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}
