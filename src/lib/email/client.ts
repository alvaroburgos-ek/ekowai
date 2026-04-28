import 'server-only';
import { Resend } from 'resend';
import { env } from '@/env';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/**
 * Send a transactional email via Resend.
 *
 * No-ops (returns ok:false / 'not_configured') when RESEND_API_KEY is not set —
 * we never want missing email config to block a calc-state transition.
 */
export async function sendEmail(input: SendEmailInput): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  if (!env.RESEND_API_KEY) {
    return { ok: false, error: 'not_configured' };
  }
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? '' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}
