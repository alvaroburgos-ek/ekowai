'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { requestMagicLink } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

const KNOWN_ERROR_KEYS = new Set([
  'otp_expired',
  'access_denied',
  'auth_callback',
]);

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
    <Card className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{t('signIn')}</h1>
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
        className="space-y-4"
      >
        <input type="hidden" name="locale" value={locale} />
        <label className="block">
          <span className="text-sm text-slate-700">{t('email')}</span>
          <Input name="email" type="email" required autoComplete="email" />
        </label>
        <Button type="submit" disabled={pending} className="w-full">
          {t('magicLinkButton')}
        </Button>
      </form>
      {state?.ok && <Alert variant="success">{t('magicLinkSent')}</Alert>}
      {state && !state.ok && (
        <Alert variant="error">
          <div>{tErr('generic')}</div>
          {state.message && (
            <div className="mt-1 text-xs opacity-75">{state.message}</div>
          )}
        </Alert>
      )}
    </Card>
  );
}
