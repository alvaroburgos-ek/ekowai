import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { updateProject } from '@/lib/actions/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { SiteProfileFields } from '@/components/projects/site-profile-fields';

export default async function EditProjectPage({
  params,
}: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const localeTyped = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';
  const t = await getTranslations('projects');

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">{project.name}</h1>
      <form action={updateProject} className="space-y-10">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="locale" value={localeTyped} />
        <section className="space-y-4">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-subtext">
            Basisdaten
          </h2>
          <label className="block">
            <span className="text-sm">{t('name')}</span>
            <Input name="name" required minLength={2} defaultValue={project.name} />
          </label>
          <label className="block">
            <span className="text-sm">{t('client')}</span>
            <Input name="clientName" defaultValue={project.clientName ?? ''} />
          </label>
          <label className="block">
            <span className="text-sm">{t('location')}</span>
            <Input name="location" defaultValue={project.location ?? ''} />
          </label>
        </section>
        <section className="border-t border-hairline pt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-subtext mb-6">
            Standortprofil
          </h2>
          <SiteProfileFields initial={project.siteProfile} />
        </section>
        <div className="border-t border-hairline pt-6 flex justify-end">
          <Button type="submit">{t('create')}</Button>
        </div>
      </form>
    </Card>
  );
}
