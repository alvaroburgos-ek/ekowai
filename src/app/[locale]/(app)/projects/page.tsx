import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listProjectsForUser } from '@/lib/actions/project';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

export default async function ProjectsPage({
  params,
}: { params: Promise<{ locale: 'de' | 'en' }> }) {
  const { locale } = await params;
  const t = await getTranslations('projects');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const items = user ? await listProjectsForUser(user.id) : [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Link href={`/${locale}/projects/new`}>
          <Button>{t('newProject')}</Button>
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-slate-500">{t('noProjects')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="border rounded p-4 hover:bg-slate-50">
              <Link href={`/${locale}/projects/${p.id}`} className="font-medium">
                {p.name}
              </Link>
              {p.clientName && (
                <p className="text-sm text-slate-500">{p.clientName}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
