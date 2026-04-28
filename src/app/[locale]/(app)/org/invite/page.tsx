import { getTranslations } from 'next-intl/server';
import { inviteMember } from '@/lib/actions/org';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('org');

  return (
    <section className="max-w-2xl mx-auto space-y-10">
      <header className="border-b border-hairline pb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
          Organisation · Einladung
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-ink">{t('invite')}</h1>
      </header>

      <form action={inviteMember} className="space-y-8">
        <input type="hidden" name="locale" value={locale} />
        <Field label={t('inviteEmail')} required>
          <Input name="email" type="email" required autoComplete="email" autoFocus />
        </Field>
        <Field label={t('inviteRole')}>
          <select
            name="role"
            defaultValue="engineer"
            className="block w-full rounded-none border-0 border-b border-hairline-strong bg-transparent px-1 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
          >
            <option value="admin">{t('roleAdmin')}</option>
            <option value="engineer">{t('roleEngineer')}</option>
            <option value="viewer">{t('roleViewer')}</option>
          </select>
        </Field>
        <div className="border-t border-hairline pt-6 flex justify-end">
          <Button type="submit">{t('inviteSubmit')}</Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid grid-cols-12 gap-4 items-baseline">
      <span className="col-span-3 font-mono text-[10px] uppercase tracking-[0.2em] text-subtext pt-2">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </span>
      <div className="col-span-9">{children}</div>
    </label>
  );
}
