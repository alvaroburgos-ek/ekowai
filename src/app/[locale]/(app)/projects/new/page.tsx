import { getTranslations } from 'next-intl/server';
import { createProject } from '@/lib/actions/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SiteProfileFields } from '@/components/projects/site-profile-fields';

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('projects');
  return (
    <section className="space-y-10">
      <header className="border-b border-hairline pb-8 mb-2">
        <div className="text-[11px] uppercase tracking-[0.25em] text-subtext mb-3">
          Sektion 01 · Neuer Eintrag
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold text-ink tracking-tight">{t('newProject')}</h1>
      </header>
      <form action={createProject} className="max-w-2xl space-y-10">
        <input type="hidden" name="locale" value={locale} />
        <section className="space-y-4">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-subtext">
            Basisdaten
          </h2>
          <Field label={t('name')} required>
            <Input name="name" required minLength={2} autoFocus />
          </Field>
          <Field label={t('client')}>
            <Input name="clientName" />
          </Field>
          <Field label={t('location')}>
            <Input name="location" />
          </Field>
        </section>
        <section className="border-t border-hairline pt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-subtext mb-6">
            Standortprofil (optional)
          </h2>
          <SiteProfileFields />
        </section>
        <div className="border-t border-hairline pt-6 flex justify-end">
          <Button type="submit">{t('create')}</Button>
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
    <label className="grid grid-cols-12 gap-4 items-baseline rounded-md px-3 py-2 -mx-3 has-[:focus-within]:bg-paper-2/50 transition-colors">
      <span className="col-span-3 text-[10px] uppercase tracking-[0.2em] text-subtext">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </span>
      <div className="col-span-9">{children}</div>
    </label>
  );
}
