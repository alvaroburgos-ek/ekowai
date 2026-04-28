import { getTranslations } from 'next-intl/server';
import { inviteMember } from '@/lib/actions/org';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default async function InvitePage({
  params,
}: { params: Promise<{ locale: 'de' | 'en' }> }) {
  const { locale } = await params;
  const t = await getTranslations('org');

  return (
    <Card className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">{t('invite')}</h1>
      <form action={inviteMember} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <label className="block">
          <span className="text-sm">{t('inviteEmail')}</span>
          <Input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="block">
          <span className="text-sm">{t('inviteRole')}</span>
          <select
            name="role"
            defaultValue="engineer"
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="admin">{t('roleAdmin')}</option>
            <option value="engineer">{t('roleEngineer')}</option>
            <option value="viewer">{t('roleViewer')}</option>
          </select>
        </label>
        <Button type="submit">{t('inviteSubmit')}</Button>
      </form>
    </Card>
  );
}
