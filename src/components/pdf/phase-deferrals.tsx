import { Text, View } from '@react-pdf/renderer';
import { styles } from './styles';
import { phaseDeferralLines, type PhaseDeferral } from '@/lib/compliance/phase-deferral';

/**
 * C-9 (2026-10-14): „Noch nicht erreichte Phasen — nicht geprüft" — the phases answered „not reached" (phase drivers =
 * Nein) and the duties their guards left unchecked, DE with the EN line below. Renders nothing when no phase is open.
 * Shared by the conformity declaration, the checklist, the standard report and the Prüf-Memo.
 */
export function PhaseDeferralsSection({ deferrals, marginTop = 14 }: { deferrals: readonly PhaseDeferral[] | undefined; marginTop?: number }) {
  if (!deferrals || deferrals.length === 0) return null;
  const t = phaseDeferralLines(deferrals);
  return (
    <View style={{ marginTop }}>
      <Text style={styles.h2}>{`${t.headingDe} / ${t.headingEn}`}</Text>
      <Text style={styles.note}>{t.introDe}</Text>
      <Text style={styles.note}>{`[EN] ${t.introEn}`}</Text>
      {t.items.map((it, i) => (
        <View key={i} wrap={false}>
          <Text style={styles.note}>{`• ${it.de}`}</Text>
          <Text style={[styles.note, { marginLeft: 8 }]}>{`[EN] ${it.en}`}</Text>
        </View>
      ))}
    </View>
  );
}
