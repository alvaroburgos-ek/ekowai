import { View, Text, Image } from '@react-pdf/renderer';
import { styles } from './styles';
import type { ReportLetterhead } from '@/lib/pdf/load-standard-report';

/**
 * Letterhead band fixed to every page (top 28pt → 84pt content padding).
 *
 * We do NOT fetch the logo via http — `<Image src=...>` in @react-pdf accepts
 * a URL and downloads it server-side. If the org's logoUrl is missing or
 * fetch fails the component silently omits the image rather than crashing
 * the PDF.
 */
export function LetterheadHeader({ letterhead }: { letterhead: ReportLetterhead | null }) {
  if (!letterhead) {
    return (
      <View fixed style={styles.letterhead}>
        <View style={styles.letterheadLeft}>
          <Text style={styles.letterheadOrg}>Bürobezeichnung folgt</Text>
          <Text style={styles.letterheadAddr}>
            Im Org-Profil hinterlegen, um den Briefkopf zu vervollständigen.
          </Text>
        </View>
        <View style={styles.letterheadRight}></View>
      </View>
    );
  }
  const addrLines = [
    letterhead.addressLine1,
    letterhead.addressLine2,
    [letterhead.postalCode, letterhead.city].filter(Boolean).join(' '),
  ].filter((s): s is string => !!s && s.length > 0);
  const contactLines = [
    letterhead.phone ? `Tel ${letterhead.phone}` : null,
    letterhead.email ?? null,
    letterhead.website ?? null,
  ].filter((s): s is string => !!s);
  return (
    <View fixed style={styles.letterhead}>
      <View style={styles.letterheadLeft}>
        <Text style={styles.letterheadOrg}>{letterhead.orgName}</Text>
        {addrLines.map((line, i) => (
          <Text key={i} style={styles.letterheadAddr}>
            {line}
          </Text>
        ))}
      </View>
      <View style={styles.letterheadRight}>
        {/* Logo rendered only when http(s) URL — @react-pdf rejects relative
            paths in server renders. */}
        {letterhead.logoUrl && /^https?:\/\//.test(letterhead.logoUrl) ? (
          <Image src={letterhead.logoUrl} style={styles.letterheadLogo} />
        ) : null}
        {contactLines.map((line, i) => (
          <Text key={i} style={styles.letterheadAddr}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}
