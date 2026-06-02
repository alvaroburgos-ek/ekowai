import { View, Text, Image } from '@react-pdf/renderer';
import { styles } from './styles';
import type { ReportLetterhead } from '@/lib/pdf/load-standard-report';
import { env } from '@/env';

/** Logo URLs must be https AND originate from the project's Supabase
 *  storage host. Without this allowlist an org admin could set logoUrl to
 *  any third-party URL — every PDF render then makes server-side fetches to
 *  attacker-controlled hosts (SSRF + DoS via slow responses). */
function isAllowedLogoUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    const allowedOrigin = new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin;
    return u.origin === allowedOrigin;
  } catch {
    return false;
  }
}

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
        {/* Logo: https-only AND from our Supabase storage host. Anything
            else is silently dropped to block SSRF/DoS during PDF render. */}
        {letterhead.logoUrl && isAllowedLogoUrl(letterhead.logoUrl) ? (
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
