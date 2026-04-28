'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { requestMagicLink } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

const KNOWN_ERROR_KEYS = new Set(['otp_expired', 'access_denied', 'auth_callback']);

export default function LoginPage() {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; error?: string; message?: string } | null>(
    null,
  );

  const urlError = searchParams.get('error');
  const urlErrorDesc = searchParams.get('error_description');
  const errorMessageKey =
    urlError && KNOWN_ERROR_KEYS.has(urlError) ? urlError : urlError ? 'generic' : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 min-h-[calc(100vh-12rem)] items-center">
      {/* Left column — editorial hero */}
      <section className="lg:col-span-7 space-y-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-subtext">
          DWA-A-201 · v3.2
          <span className="mx-2 text-hairline-strong">/</span>
          Bemessungsassistent
        </div>
        <h1
          className="font-display text-5xl lg:text-7xl leading-[0.95] text-ink"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          Kläranlagen-
          <br />
          Bemessung,
          <br />
          <span className="italic text-accent-2">präzise.</span>
        </h1>
        <div className="border-t border-hairline pt-6 max-w-lg space-y-4">
          <p className="text-base text-ink-2 leading-relaxed">
            Ein Werkzeug für Planungsingenieur:innen — deterministische Berechnung,
            §-genaue Zitate, anwaltlich nachvollziehbare Entscheidungsdokumentation.
          </p>
          <ul className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtext space-y-1.5">
            <li>— Bemessung nach DWA-A-201, Arbeitsblatt A201-08</li>
            <li>— KI-gestützter Erläuterungstext, vom Ingenieur kuratiert</li>
            <li>— Querverweise auf DWA-A-131, A-202, M-153</li>
            <li>— Mehrbenutzer-Freigabeworkflow</li>
          </ul>
        </div>
      </section>

      {/* Right column — login form */}
      <section className="lg:col-span-5">
        <div className="border border-hairline bg-paper-2/30 p-8 lg:p-10 space-y-8 relative">
          {/* Corner ticks for engineering-drawing feel */}
          <span aria-hidden className="absolute -top-px -left-px w-4 h-px bg-ink" />
          <span aria-hidden className="absolute -top-px -left-px h-4 w-px bg-ink" />
          <span aria-hidden className="absolute -top-px -right-px w-4 h-px bg-ink" />
          <span aria-hidden className="absolute -top-px -right-px h-4 w-px bg-ink" />
          <span aria-hidden className="absolute -bottom-px -left-px w-4 h-px bg-ink" />
          <span aria-hidden className="absolute -bottom-px -left-px h-4 w-px bg-ink" />
          <span aria-hidden className="absolute -bottom-px -right-px w-4 h-px bg-ink" />
          <span aria-hidden className="absolute -bottom-px -right-px h-4 w-px bg-ink" />

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
              Sektion 01
            </div>
            <h2 className="font-display text-2xl text-ink">{t('signIn')}</h2>
          </div>

          {errorMessageKey && (
            <Alert variant="error">
              <div>{tErr(errorMessageKey)}</div>
              {urlErrorDesc && errorMessageKey === 'generic' && (
                <div className="mt-1 text-xs opacity-75">{urlErrorDesc}</div>
              )}
            </Alert>
          )}

          <form
            action={(formData) => {
              startTransition(async () => {
                const result = await requestMagicLink(formData);
                setState(result);
              });
            }}
            className="space-y-6"
          >
            <input type="hidden" name="locale" value={locale} />
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext">
                {t('email')}
              </span>
              <Input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="ingenieur@bueromustermann.de"
                className="mt-2"
              />
            </label>
            <Button type="submit" disabled={pending} className="w-full">
              {t('magicLinkButton')}
            </Button>
          </form>

          {state?.ok && <Alert variant="success">{t('magicLinkSent')}</Alert>}
          {state && !state.ok && (
            <Alert variant="error">
              <div>{tErr('generic')}</div>
              {state.message && <div className="mt-1 text-xs opacity-75">{state.message}</div>}
            </Alert>
          )}
        </div>
      </section>
    </div>
  );
}
