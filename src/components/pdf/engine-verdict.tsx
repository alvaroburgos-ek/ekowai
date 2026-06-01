import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import type { ReportEquation } from '@/lib/pdf/load-standard-report';

/**
 * Renders the engine's verdict for ONE equation. This component IS the
 * three-state contract enforced on paper. The visual contract:
 *
 *   - computed         : GREEN frame, "rechnerisch bestätigt" caption,
 *                        substituted formula, inputs, final value.
 *   - manual_required  : RED frame, "rechnerisch NICHT bestätigt — manuell
 *                        prüfen" caption, the engine's reason in plain
 *                        German, missing symbols / unit conflicts if any.
 *                        NEVER prints a number where engine said no.
 *   - error            : RED frame, same banner, the error message.
 *   - null             : neutral note "nicht durch Engine geprüft" — used
 *                        for non-whitelisted equations.
 *
 * The frame colour change is what makes this readable from across the desk
 * for a print-out: even at a glance an authority reviewer can spot the
 * red boxes and confirm they carry a manual-review caveat.
 */
export function EngineVerdict({ equation }: { equation: ReportEquation }) {
  const state = equation.evalState;
  const number = equation.equationNumber;
  const outSym = equation.outputSymbol ?? '';
  const outUnit = equation.outputUnit ?? '';

  // No engine eval at all → render a neutral information line.
  if (state == null) {
    return (
      <View style={styles.engineCard}>
        <View style={styles.engineHeader}>
          <Text style={styles.engineEqLabel}>
            Gl. {number}
            {equation.clauseReference ? ` · ${equation.clauseReference}` : ''}
          </Text>
          <Text style={{ ...styles.smallCaps, color: '#5f6a72' }}>
            nicht durch Engine geprüft
          </Text>
        </View>
        <Text style={styles.engineFormula}>{equation.formula}</Text>
        <Text style={styles.noteSubtle}>
          Die Formel ist nicht in der server-seitigen Engine-Whitelist. Werte
          bitte gegen das Regelwerk verifizieren.
        </Text>
      </View>
    );
  }

  // computed → green frame, value, substituted inputs.
  if (state.kind === 'computed') {
    const substitutedEntries = Object.entries(state.substituted);
    return (
      <View style={[styles.engineCard, styles.engineCardOk]} wrap={false}>
        <View style={styles.engineHeader}>
          <Text style={styles.engineEqLabel}>
            Gl. {number}
            {equation.clauseReference ? ` · ${equation.clauseReference}` : ''}
          </Text>
          <Text style={styles.engineVerdictOk}>
            {'✓ rechnerisch bestätigt'}
          </Text>
        </View>
        <Text style={styles.engineFormula}>{equation.formula}</Text>
        {state.rewrite ? (
          <Text style={styles.engineFormula}>
            {'→ '} {state.formulaEvaluated}
          </Text>
        ) : null}
        {substitutedEntries.length > 0 ? (
          <View style={{ marginTop: 3 }}>
            <Text style={styles.smallCaps}>Eingaben</Text>
            {substitutedEntries.map(([sym, v]) => (
              <Text key={sym} style={styles.engineSubsRow}>
                {sym} = {formatNumber(v)}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={styles.engineResult}>
          {outSym} = {formatNumber(state.value)}
          {outUnit ? ` ${outUnit}` : ''}
        </Text>
      </View>
    );
  }

  // manual_required → RED frame with explicit "manuell prüfen" caption.
  // We deliberately surface the engine's reason in plain German. If the
  // engineer entered a manual output value on the field for this equation's
  // output symbol it will still appear on the field row above this card —
  // but the card itself must NOT show a value.
  if (state.kind === 'manual_required') {
    return (
      <View style={[styles.engineCard, styles.engineCardWarn]} wrap={false}>
        <View style={styles.engineHeader}>
          <Text style={styles.engineEqLabel}>
            Gl. {number}
            {equation.clauseReference ? ` · ${equation.clauseReference}` : ''}
          </Text>
          <Text style={styles.engineVerdictWarn}>
            {'⚠ rechnerisch NICHT bestätigt — manuell prüfen'}
          </Text>
        </View>
        <Text style={styles.engineFormula}>{equation.formula}</Text>
        <Text style={styles.engineReason}>{state.reason}</Text>
        {state.missing && state.missing.length > 0 ? (
          <Text style={styles.noteSubtle}>
            Fehlende Symbole: {state.missing.join(', ')}
          </Text>
        ) : null}
        {state.unitConflicts && state.unitConflicts.length > 0 ? (
          <View style={{ marginTop: 2 }}>
            <Text style={styles.smallCaps}>Einheiten-Konflikt</Text>
            {state.unitConflicts.map((u) => (
              <Text key={u.symbol} style={styles.noteSubtle}>
                {u.symbol}: erwartet {u.expected ?? '—'}, geliefert {u.actual ?? '—'}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={[styles.noteSubtle, { marginTop: 4 }]}>
          Engine konnte nicht verifizieren — Wert dieser Größe ist vom
          verantwortlichen Ingenieur manuell zu bestätigen.
        </Text>
      </View>
    );
  }

  // error
  return (
    <View style={[styles.engineCard, styles.engineCardWarn]} wrap={false}>
      <View style={styles.engineHeader}>
        <Text style={styles.engineEqLabel}>
          Gl. {number}
          {equation.clauseReference ? ` · ${equation.clauseReference}` : ''}
        </Text>
        <Text style={styles.engineVerdictWarn}>
          {'⚠ Fehler bei Engine-Auswertung'}
        </Text>
      </View>
      <Text style={styles.engineFormula}>{equation.formula}</Text>
      <Text style={styles.engineReason}>Fehler: {state.message}</Text>
      <Text style={[styles.noteSubtle, { marginTop: 4 }]}>
        Engine konnte nicht verifizieren — Wert dieser Größe ist vom
        verantwortlichen Ingenieur manuell zu bestätigen.
      </Text>
    </View>
  );
}

function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01)) {
    return v.toPrecision(6);
  }
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v);
}
