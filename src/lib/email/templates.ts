import 'server-only';
import { env } from '@/env';

const FOOTER_DE = `\n\n—\nEKOWAI Wizard · Bemessungsassistent für DWA-A-201\nDiese Nachricht wurde automatisch versandt. Antworten an diese Adresse werden nicht gelesen.`;
const FOOTER_EN = `\n\n—\nEKOWAI Wizard · DWA-A-201 sizing assistant\nThis message was sent automatically. Replies to this address are not read.`;

/** Escape the five characters that close out of HTML attribute and text
 *  contexts. Used on every user-supplied string that lands inside the email
 *  shell — calculation names, reviewer names, comment text. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sanitize the CTA URL before substituting into `href=`. Refuses anything
 *  outside the configured app + Supabase auth origins, blocking
 *  javascript:/data: URLs and off-site redirect oracles. The Supabase
 *  origin is allowed because `inviteTemplate` ships Supabase-minted
 *  `auth/v1/verify` links. Falls back to the app root on rejection. */
function safeCtaUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const appOrigin = new URL(env.NEXT_PUBLIC_APP_URL).origin;
    const supabaseOrigin = new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin;
    if (u.origin === appOrigin || u.origin === supabaseOrigin) return u.toString();
  } catch {
    /* fall through */
  }
  return env.NEXT_PUBLIC_APP_URL;
}

function shell(title: string, ledeHtml: string, ctaLabel: string, ctaUrl: string, locale: 'de' | 'en'): string {
  const logoUrl = `${env.NEXT_PUBLIC_APP_URL}/images/brand/logo-ekowai.svg`;
  const safeUrl = escapeHtml(safeCtaUrl(ctaUrl));
  const safeTitle = escapeHtml(title);
  const safeLabel = escapeHtml(ctaLabel);
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
</head>
<body style="margin:0;padding:24px;background:#f8f5ee;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;color:#0d1418;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #d4cfc4;">
    <div style="border-bottom:1px solid #d4cfc4;padding:18px 24px;">
      <img src="${logoUrl}" alt="EKOWAI" width="120" height="35" style="display:block;border:0;" />
    </div>
    <div style="padding:32px 24px;">
      <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:600;letter-spacing:-0.02em;color:#0d1418;">${safeTitle}</h1>
      <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#2a3338;">${ledeHtml}</p>
      <a href="${safeUrl}"
         style="display:inline-block;background:#0d1418;color:#f8f5ee;padding:12px 24px;font-size:14px;font-weight:500;text-decoration:none;border:1px solid #0d1418;">
         ${safeLabel} →
      </a>
    </div>
    <div style="border-top:1px solid #d4cfc4;padding:14px 24px;font-family:ui-monospace,SF Mono,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#5f6a72;">
      ${locale === 'de' ? 'Bemessung nach DWA-A-201' : 'Sizing per DWA-A-201'}
    </div>
  </div>
</body>
</html>`;
}

export interface ApprovalEmailInput {
  calcName: string;
  calcUrl: string;
  reviewerName?: string | null;
  comment?: string | null;
  locale: 'de' | 'en';
}

export function submittedTemplate(input: ApprovalEmailInput): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(input.calcName);
  const t =
    input.locale === 'de'
      ? {
          subject: `Zur Prüfung eingereicht: ${input.calcName}`,
          title: 'Eine Berechnung wartet auf Ihre Prüfung.',
          ledeText: `„${input.calcName}" wurde zur Prüfung eingereicht. Bitte öffnen Sie die Berechnung im Eingang und erteilen Sie Ihre Freigabe oder fordern Sie Änderungen an.`,
          ledeHtml: `„${safeName}&quot; wurde zur Prüfung eingereicht. Bitte öffnen Sie die Berechnung im Eingang und erteilen Sie Ihre Freigabe oder fordern Sie Änderungen an.`,
          cta: 'Berechnung öffnen',
        }
      : {
          subject: `Submitted for review: ${input.calcName}`,
          title: 'A calculation is awaiting your review.',
          ledeText: `"${input.calcName}" has been submitted for review. Open the calculation from your inbox to approve, reject, or request changes.`,
          ledeHtml: `&quot;${safeName}&quot; has been submitted for review. Open the calculation from your inbox to approve, reject, or request changes.`,
          cta: 'Open calculation',
        };
  const text = `${t.title}\n\n${t.ledeText}\n\n${t.cta}: ${input.calcUrl}${input.locale === 'de' ? FOOTER_DE : FOOTER_EN}`;
  return {
    subject: t.subject,
    html: shell(t.title, t.ledeHtml, t.cta, input.calcUrl, input.locale),
    text,
  };
}

export function approvedTemplate(input: ApprovalEmailInput): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(input.calcName);
  const safeReviewer = input.reviewerName ? escapeHtml(input.reviewerName) : '';
  const reviewerLineText = input.reviewerName
    ? input.locale === 'de'
      ? `Freigabe erteilt durch ${input.reviewerName}.`
      : `Approved by ${input.reviewerName}.`
    : '';
  const reviewerLineHtml = input.reviewerName
    ? input.locale === 'de'
      ? `Freigabe erteilt durch ${safeReviewer}.`
      : `Approved by ${safeReviewer}.`
    : '';
  const commentBlockText = input.comment ? `\n\n„${input.comment}"` : '';
  const commentBlockHtml = input.comment
    ? `<br><br>„${escapeHtml(input.comment)}&quot;`
    : '';
  const t =
    input.locale === 'de'
      ? {
          subject: `Freigegeben: ${input.calcName}`,
          title: 'Ihre Berechnung wurde freigegeben.',
          ledeText: `„${input.calcName}" ist freigegeben. ${reviewerLineText}${commentBlockText}`,
          ledeHtml: `„${safeName}&quot; ist freigegeben. ${reviewerLineHtml}${commentBlockHtml}`,
          cta: 'Berechnung öffnen',
        }
      : {
          subject: `Approved: ${input.calcName}`,
          title: 'Your calculation has been approved.',
          ledeText: `"${input.calcName}" is approved. ${reviewerLineText}${commentBlockText}`,
          ledeHtml: `&quot;${safeName}&quot; is approved. ${reviewerLineHtml}${commentBlockHtml}`,
          cta: 'Open calculation',
        };
  const text = `${t.title}\n\n${t.ledeText}\n\n${t.cta}: ${input.calcUrl}${input.locale === 'de' ? FOOTER_DE : FOOTER_EN}`;
  return {
    subject: t.subject,
    html: shell(t.title, t.ledeHtml, t.cta, input.calcUrl, input.locale),
    text,
  };
}

export interface InviteEmailInput {
  inviteUrl: string;
  locale: 'de' | 'en';
}

export function inviteTemplate(input: InviteEmailInput): { subject: string; html: string; text: string } {
  // The invite URL comes from Supabase's `generateLink` API — Supabase
  // returns its own auth host, NOT our app origin. Bypass the same-origin
  // gate by going through shell()'s already-escaped emission but writing
  // the raw URL on a known-safe path: the invite is sensitive but we trust
  // generateLink's domain by configuration.
  const t =
    input.locale === 'de'
      ? {
          subject: 'Einladung zum EKOWAI Wizard',
          title: 'Sie wurden eingeladen.',
          lede: 'Sie haben eine Einladung zum EKOWAI Wizard erhalten — dem Bemessungsassistenten für DWA-A-201. Klicken Sie auf den Button, um Ihr Konto zu aktivieren und loszulegen.',
          cta: 'Einladung annehmen',
        }
      : {
          subject: 'Invitation to EKOWAI Wizard',
          title: 'You have been invited.',
          lede: 'You have received an invitation to EKOWAI Wizard — the sizing assistant for DWA-A-201. Click the button to activate your account and get started.',
          cta: 'Accept invitation',
        };
  const text = `${t.title}\n\n${t.lede}\n\n${t.cta}: ${input.inviteUrl}${input.locale === 'de' ? FOOTER_DE : FOOTER_EN}`;
  // Invite lede contains no user-supplied input — safe to pass as-is.
  return {
    subject: t.subject,
    html: shell(t.title, t.lede, t.cta, input.inviteUrl, input.locale),
    text,
  };
}

export function changesRequestedTemplate(
  input: ApprovalEmailInput & { rejected?: boolean },
): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(input.calcName);
  const safeReviewer = input.reviewerName ? escapeHtml(input.reviewerName) : '';
  const reviewerLineText = input.reviewerName
    ? input.locale === 'de'
      ? `Anmerkung von ${input.reviewerName}:`
      : `Note from ${input.reviewerName}:`
    : input.locale === 'de'
      ? 'Anmerkung:'
      : 'Note:';
  const reviewerLineHtml = input.reviewerName
    ? input.locale === 'de'
      ? `Anmerkung von ${safeReviewer}:`
      : `Note from ${safeReviewer}:`
    : input.locale === 'de'
      ? 'Anmerkung:'
      : 'Note:';
  const commentBlockText = input.comment ? `\n\n${reviewerLineText}\n„${input.comment}"` : '';
  const commentBlockHtml = input.comment
    ? `<br><br>${reviewerLineHtml}<br>„${escapeHtml(input.comment)}&quot;`
    : '';
  const subjectVerb = input.rejected
    ? input.locale === 'de'
      ? 'Abgelehnt'
      : 'Rejected'
    : input.locale === 'de'
      ? 'Änderungen erbeten'
      : 'Changes requested';
  const titleVerb = input.rejected
    ? input.locale === 'de'
      ? 'Ihre Berechnung wurde abgelehnt.'
      : 'Your calculation was rejected.'
    : input.locale === 'de'
      ? 'Es werden Änderungen erbeten.'
      : 'Changes are being requested.';
  const t =
    input.locale === 'de'
      ? {
          subject: `${subjectVerb}: ${input.calcName}`,
          title: titleVerb,
          ledeText: `„${input.calcName}" wurde nicht freigegeben.${commentBlockText}`,
          ledeHtml: `„${safeName}&quot; wurde nicht freigegeben.${commentBlockHtml}`,
          cta: 'Berechnung öffnen',
        }
      : {
          subject: `${subjectVerb}: ${input.calcName}`,
          title: titleVerb,
          ledeText: `"${input.calcName}" was not approved.${commentBlockText}`,
          ledeHtml: `&quot;${safeName}&quot; was not approved.${commentBlockHtml}`,
          cta: 'Open calculation',
        };
  const text = `${t.title}\n\n${t.ledeText}\n\n${t.cta}: ${input.calcUrl}${input.locale === 'de' ? FOOTER_DE : FOOTER_EN}`;
  return {
    subject: t.subject,
    html: shell(t.title, t.ledeHtml, t.cta, input.calcUrl, input.locale),
    text,
  };
}
