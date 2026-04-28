'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { requestMagicLink } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors');
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; error?: string } | null>(null);

  return (
    <Card className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">{t('signIn')}</h1>
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
          <span className="text-sm">{t('email')}</span>
          <Input name="email" type="email" required autoComplete="email" />
        </label>
        <Button type="submit" disabled={pending} className="w-full">
          {t('magicLinkButton')}
        </Button>
      </form>
      {state?.ok && <Alert variant="success">{t('magicLinkSent')}</Alert>}
      {state && !state.ok && <Alert variant="error">{tErr('generic')}</Alert>}
    </Card>
  );
}
