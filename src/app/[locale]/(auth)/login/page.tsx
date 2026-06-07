'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check } from 'lucide-react';
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
    <div className="relative flex min-h-[100dvh] w-full overflow-hidden lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ───────────────────────── LEFT — animated brand panel (desktop) ── */}
      <BrandPanel
        tagline={t('tagline')}
        brandLine={t('brandLine')}
        features={[t('feature1'), t('feature2'), t('feature3')]}
      />

      {/* ───────────────────────── RIGHT — sign-in form ──────────────────── */}
      <div className="relative flex min-h-[100dvh] items-center justify-center overflow-y-auto px-6 py-10 sm:px-10">
        {/* Soft brand glow behind the form on small screens */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-0 size-72 -translate-x-1/2 rounded-full opacity-60 blur-3xl lg:hidden"
          style={{ background: 'var(--eko-gradient-soft)' }}
        />

        <div className="relative z-10 w-full max-w-sm space-y-7">
          <div className="space-y-4">
            <Image
              src="/images/brand/logo-ekowai.svg"
              alt="EKOWAI"
              width={124}
              height={36}
              unoptimized
              priority
              className="h-9 w-auto object-contain"
            />
            <div className="text-[10px] uppercase tracking-[0.25em] text-subtext">
              {t('tagline')}
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl sm:text-3xl text-ink tracking-tight">
                {t('signIn')}
              </h1>
              <p className="text-sm text-ink-2 leading-relaxed">{t('lede')}</p>
            </div>
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

          <div className="border-t border-hairline pt-4">
            <a
              href="https://ekowai-engineering.de"
              className="text-[10px] uppercase tracking-[0.2em] text-subtext hover:text-ink transition-colors"
            >
              {t('marketing')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Decorative sign-in side panel — drifting aurora, a parallax engineering
 * grid, and the EKOWAI droplet inside two slow-spinning rings. Desktop only;
 * pure CSS, transform/opacity-driven, and disabled under reduced-motion.
 */
function BrandPanel({
  tagline,
  brandLine,
  features,
}: {
  tagline: string;
  brandLine: string;
  features: string[];
}) {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0a130e] p-12 text-white lg:flex xl:p-16">
      {/* Aurora blobs */}
      <div
        className="aurora-blob"
        style={{
          top: '-12%',
          left: '-10%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(0,208,97,0.55), transparent 65%)',
          animation: 'aurora-drift 16s ease-in-out infinite',
        }}
        aria-hidden
      />
      <div
        className="aurora-blob"
        style={{
          bottom: '-18%',
          right: '-12%',
          width: '65%',
          height: '65%',
          background: 'radial-gradient(circle, rgba(0,158,233,0.5), transparent 65%)',
          animation: 'aurora-drift-2 20s ease-in-out infinite',
        }}
        aria-hidden
      />
      <div
        className="aurora-blob"
        style={{
          top: '35%',
          left: '40%',
          width: '40%',
          height: '40%',
          background: 'radial-gradient(circle, rgba(0,208,97,0.25), transparent 70%)',
          animation: 'aurora-drift 24s ease-in-out infinite reverse',
        }}
        aria-hidden
      />

      {/* Engineering grid */}
      <div
        className="login-grid pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, #000 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 80% at 50% 40%, #000 30%, transparent 75%)',
          animation: 'grid-pan 9s linear infinite',
        }}
        aria-hidden
      />

      {/* Vignette + sheen */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(0,0,0,0.4))' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.12), transparent)',
          animation: 'sheen 7s ease-in-out infinite',
        }}
        aria-hidden
      />

      {/* Top — wordmark */}
      <div className="relative z-10 flex items-center gap-3">
        <Image
          src="/images/brand/icon-ekowai.svg"
          alt=""
          width={28}
          height={28}
          unoptimized
          className="size-7"
          aria-hidden
        />
        <span className="font-display text-lg font-semibold tracking-tight">EKOWAI</span>
      </div>

      {/* Center — ringed mark + statement */}
      <div className="relative z-10 my-auto py-10">
        {/* Scrim to keep the statement legible over the moving aurora */}
        <div
          className="pointer-events-none absolute -inset-x-8 -inset-y-4 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 75% 65% at 30% 60%, rgba(5,12,8,0.72), transparent 75%)',
          }}
          aria-hidden
        />
        <div className="relative mb-10 size-44">
          <span
            className="absolute inset-0 rounded-full border border-dashed border-white/20"
            style={{ animation: 'ring-spin 28s linear infinite' }}
            aria-hidden
          />
          <span
            className="absolute inset-5 rounded-full border border-white/10"
            style={{ animation: 'ring-spin 20s linear infinite reverse' }}
            aria-hidden
          />
          <span
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: '0 0 80px 8px rgba(0,208,97,0.25)' }}
            aria-hidden
          />
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ animation: 'float-y 6s ease-in-out infinite' }}
          >
            <Image
              src="/images/brand/icon-ekowai.svg"
              alt=""
              width={84}
              height={84}
              unoptimized
              className="size-20 drop-shadow-[0_8px_24px_rgba(0,158,233,0.45)]"
              aria-hidden
            />
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-[0.32em] text-white/70 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
          {tagline}
        </div>
        <h2 className="mt-4 max-w-md font-display text-3xl font-semibold leading-tight tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.65)] xl:text-4xl">
          {brandLine}
        </h2>
      </div>

      {/* Bottom — feature checklist */}
      <ul className="relative z-10 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-3 text-sm text-white/80">
            <span
              className="grid size-5 shrink-0 place-items-center rounded-full"
              style={{ background: 'var(--eko-gradient)' }}
            >
              <Check className="size-3 text-white" aria-hidden />
            </span>
            {f}
          </li>
        ))}
      </ul>
    </aside>
  );
}
