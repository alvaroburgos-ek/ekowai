'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { signInWithGoogle, signInWithPassword } from './actions';
import { env } from '@/env';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

const KNOWN_ERROR_KEYS = new Set(['otp_expired', 'access_denied', 'auth_callback']);

export default function LoginPage() {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{
    error?: string;
    message?: string;
  } | null>(null);

  const urlError = searchParams.get('error');
  const urlErrorDesc = searchParams.get('error_description');
  const errorMessageKey =
    urlError && KNOWN_ERROR_KEYS.has(urlError) ? urlError : urlError ? 'generic' : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 min-h-[calc(100vh-12rem)] items-center">
      {/* Left column — editorial hero */}
      <section className="lg:col-span-7 space-y-8">
        <Image
          src="/images/brand/logo-ekowai.svg"
          alt="EKOWAI"
          width={140}
          height={40}
          unoptimized
          priority
          className="object-contain"
        />
        <div className="text-[11px] uppercase tracking-[0.25em] text-subtext">
          DWA-A-201 · v3.2
          <span className="mx-2 text-hairline-strong">/</span>
          Bemessungsassistent
        </div>
        <h1 className="text-5xl lg:text-7xl font-semibold leading-[0.95] text-ink tracking-tight">
          Kläranlagen-
          <br />
          Bemessung,
          <br />
          <span className="italic font-medium text-accent-2">präzise.</span>
        </h1>
        <div className="border-t border-hairline pt-6 max-w-lg space-y-4">
          <p className="text-base text-ink-2 leading-relaxed">
            Ein Werkzeug für Planungsingenieur:innen — deterministische Berechnung,
            §-genaue Zitate, anwaltlich nachvollziehbare Entscheidungsdokumentation.
          </p>
          <ul className="text-[11px] uppercase tracking-[0.18em] text-subtext space-y-1.5">
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
            <div className="text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
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
                const result = await signInWithPassword(formData);
                if (result.ok) {
                  router.push(`/${locale}/verify`);
                } else {
                  setState({ error: result.error, message: result.message });
                }
              });
            }}
            className="space-y-4"
          >
            <input type="hidden" name="locale" value={locale} />
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-subtext">
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
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-subtext">
                {t('password')}
              </span>
              <Input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                minLength={8}
                className="mt-2"
              />
            </label>
            <Button type="submit" disabled={pending} className="w-full">
              {t('signInButton')}
            </Button>
          </form>

          {state && (
            <Alert variant="error">
              <div>
                {state.error === 'invalid_credentials'
                  ? tErr('invalid_credentials')
                  : state.error === 'invalid_input'
                  ? tErr('invalid_input')
                  : tErr('generic')}
              </div>
              {state.message && <div className="mt-1 text-xs opacity-75">{state.message}</div>}
            </Alert>
          )}

          {env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-hairline" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-subtext">
                  {locale === 'de' ? 'oder' : 'or'}
                </span>
                <div className="flex-1 h-px bg-hairline" />
              </div>
              <form action={signInWithGoogle}>
                <input type="hidden" name="locale" value={locale} />
                <Button type="submit" variant="outline" className="w-full flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"/>
                  </svg>
                  {t('googleButton')}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
