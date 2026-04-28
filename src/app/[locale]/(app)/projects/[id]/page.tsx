import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { archiveProject } from '@/lib/actions/project';

export default async function ProjectDetailPage({
  params,
}: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const localeTyped = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';
  const t = await getTranslations('projects');

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const archiveAction = async () => {
    'use server';
    await archiveProject(id, localeTyped);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <div className="flex gap-2">
          <Link href={`/${localeTyped}/projects/${id}/edit`}>
            <Button variant="ghost">Bearbeiten</Button>
          </Link>
          <form action={archiveAction}>
            <Button type="submit" variant="ghost">Archivieren</Button>
          </form>
        </div>
      </div>
      {project.clientName && <p>{t('client')}: {project.clientName}</p>}
      {project.location && <p>{t('location')}: {project.location}</p>}
      <p className="text-slate-600 text-sm">
        Erstellt: {project.createdAt.toLocaleDateString(localeTyped)}
      </p>
      <div className="border-t pt-6">
        <p className="text-slate-600">
          Berechnungen kommen in MVP-1 Plan 2 (Calculator).
        </p>
      </div>
    </Card>
  );
}
