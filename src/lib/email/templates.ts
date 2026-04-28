import 'server-only';

const FOOTER_DE = `\n\n—\nEKOWAI Wizard · Bemessungsassistent für DWA-A-201\nDiese Nachricht wurde automatisch versandt. Antworten an diese Adresse werden nicht gelesen.`;
const FOOTER_EN = `\n\n—\nEKOWAI Wizard · DWA-A-201 sizing assistant\nThis message was sent automatically. Replies to this address are not read.`;

function shell(title: string, lede: string, ctaLabel: string, ctaUrl: string, locale: 'de' | 'en'): string {
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:24px;background:#f8f5ee;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;color:#0d1418;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #d4cfc4;">
    <div style="border-bottom:1px solid #d4cfc4;padding:18px 24px;">
      <span style="font-family:ui-monospace,SF Mono,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#5f6a72;">
        EKOWAI · Wizard
      </span>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:600;letter-spacing:-0.02em;color:#0d1418;">${title}</h1>
      <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#2a3338;">${lede}</p>
      <a href="${ctaUrl}"
         style="display:inline-block;background:#0d1418;color:#f8f5ee;padding:12px 24px;font-size:14px;font-weight:500;text-decoration:none;border:1px solid #0d1418;">
         ${ctaLabel} →
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
  const t =
    input.locale === 'de'
      ? {
          subject: `Zur Prüfung eingereicht: ${input.calcName}`,
          title: 'Eine Berechnung wartet auf Ihre Prüfung.',
          lede: `„${input.calcName}" wurde zur Prüfung eingereicht. Bitte öffnen Sie die Berechnung im Eingang und erteilen Sie Ihre Freigabe oder fordern Sie Änderungen an.`,
          cta: 'Berechnung öffnen',
        }
      : {
          subject: `Submitted for review: ${input.calcName}`,
          title: 'A calculation is awaiting your review.',
          lede: `"${input.calcName}" has been submitted for review. Open the calculation from your inbox to approve, reject, or request changes.`,
          cta: 'Open calculation',
        };
  const text = `${t.title}\n\n${t.lede}\n\n${t.cta}: ${input.calcUrl}${input.locale === 'de' ? FOOTER_DE : FOOTER_EN}`;
  return {
    subject: t.subject,
    html: shell(t.title, t.lede, t.cta, input.calcUrl, input.locale),
    text,
  };
}

export function approvedTemplate(input: ApprovalEmailInput): { subject: string; html: string; text: string } {
  const reviewerLine = input.reviewerName
    ? input.locale === 'de'
      ? `Freigabe erteilt durch ${input.reviewerName}.`
      : `Approved by ${input.reviewerName}.`
    : '';
  const commentBlock = input.comment ? `\n\n„${input.comment}"` : '';
  const t =
    input.locale === 'de'
      ? {
          subject: `Freigegeben: ${input.calcName}`,
          title: 'Ihre Berechnung wurde freigegeben.',
          lede: `„${input.calcName}" ist freigegeben. ${reviewerLine}${commentBlock}`,
          cta: 'Berechnung öffnen',
        }
      : {
          subject: `Approved: ${input.calcName}`,
          title: 'Your calculation has been approved.',
          lede: `"${input.calcName}" is approved. ${reviewerLine}${commentBlock}`,
          cta: 'Open calculation',
        };
  const text = `${t.title}\n\n${t.lede}\n\n${t.cta}: ${input.calcUrl}${input.locale === 'de' ? FOOTER_DE : FOOTER_EN}`;
  return {
    subject: t.subject,
    html: shell(t.title, t.lede, t.cta, input.calcUrl, input.locale),
    text,
  };
}

export function changesRequestedTemplate(
  input: ApprovalEmailInput & { rejected?: boolean },
): { subject: string; html: string; text: string } {
  const reviewerLine = input.reviewerName
    ? input.locale === 'de'
      ? `Anmerkung von ${input.reviewerName}:`
      : `Note from ${input.reviewerName}:`
    : input.locale === 'de'
      ? 'Anmerkung:'
      : 'Note:';
  const commentBlock = input.comment ? `\n\n${reviewerLine}\n„${input.comment}"` : '';
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
          lede: `„${input.calcName}" wurde nicht freigegeben.${commentBlock}`,
          cta: 'Berechnung öffnen',
        }
      : {
          subject: `${subjectVerb}: ${input.calcName}`,
          title: titleVerb,
          lede: `"${input.calcName}" was not approved.${commentBlock}`,
          cta: 'Open calculation',
        };
  const text = `${t.title}\n\n${t.lede}\n\n${t.cta}: ${input.calcUrl}${input.locale === 'de' ? FOOTER_DE : FOOTER_EN}`;
  return {
    subject: t.subject,
    html: shell(t.title, t.lede, t.cta, input.calcUrl, input.locale),
    text,
  };
}
