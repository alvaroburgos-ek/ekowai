import { getTranslations } from 'next-intl/server';
import { createProject } from '@/lib/actions/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('projects');
  return (
    <section className="max-w-2xl mx-auto space-y-10">
      <header className="border-b border-hairline pb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
          Sektion 01 · Neuer Eintrag
        </div>
        <h1 className="text-4xl font-semibold text-ink tracking-tight">{t('newProject')}</h1>
      </header>
      <form action={createProject} className="space-y-8">
        <input type="hidden" name="locale" value={locale} />
        <Field label={t('name')} required>
          <Input name="name" required minLength={2} autoFocus />
        </Field>
        <Field label={t('client')}>
          <Input name="clientName" />
        </Field>
        <Field label={t('location')}>
          <Input name="location" />
        </Field>
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
    <label className="grid grid-cols-12 gap-4 items-baseline">
      <span className="col-span-3 font-mono text-[10px] uppercase tracking-[0.2em] text-subtext pt-2">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </span>
      <div className="col-span-9">{children}</div>
    </label>
  );
}
