// @ts-nocheck — Plan 6 reattachment pending; ReportData is any until then
import { View, Text } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import type { ReportData } from '../load-data';
import { fmtDe } from '../format';

export function Compliance({ data }: { data: ReportData }) {
  const { worksheet, result, cells } = data;
  if (worksheet.thresholds.length === 0) return null;
  const violMap = new Map(
    (result.compliance.violations ?? []).map((v) => [v.thresholdId, v]),
  );
  const computedById = new Map(worksheet.computed.map((c) => [c.id, c]));
  const inputById = new Map(worksheet.inputs.map((i) => [i.id, i]));
  return (
    <View>
      <Text style={styles.h2}>Compliance-Übersicht</Text>
      <View style={styles.rule} />
      {worksheet.thresholds.map((t) => {
        const violation = violMap.get(t.id);
        const status = !violation
          ? 'OK'
          : violation.severity === 'blocking'
            ? 'FAIL'
            : 'WARN';
        const chip = !violation
          ? styles.chipOk
          : violation.severity === 'blocking'
            ? styles.chipErr
            : styles.chipWarn;
        const computedField = computedById.get(t.ref);
        const inputField = inputById.get(t.ref);
        const unit = computedField?.unit ?? inputField?.unit ?? '';
        const actual =
          result.computed[t.ref] ??
          (typeof cells[t.ref]?.value === 'number'
            ? (cells[t.ref]!.value as number)
            : undefined);
        return (
          <View key={t.id} wrap={false}>
            <View style={styles.row}>
              <Text style={[styles.cellSym, chip]}>{status}</Text>
              <Text style={styles.cellDesc}>{t.messageDe}</Text>
              <Text style={styles.cellVal}>
                {actual !== undefined ? fmtDe(actual) : '—'}
              </Text>
              <Text style={styles.cellUnit}>{unit}</Text>
            </View>
            {violation && t.iterationHint && (
              <Text
                style={[
                  styles.meta,
                  { marginLeft: 78, color: colors.warning },
                ]}
              >
                {t.iterationHint}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
