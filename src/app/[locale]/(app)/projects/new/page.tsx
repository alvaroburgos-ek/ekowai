import { getTranslations } from 'next-intl/server';
import { createProject } from '@/lib/actions/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default async function NewProjectPage({
  params,
}: { params: Promise<{ locale: 'de' | 'en' }> }) {
  const { locale } = await params;
  const t = await getTranslations('projects');
  return (
    <Card className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">{t('newProject')}</h1>
      <form action={createProject} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <label className="block">
          <span className="text-sm">{t('name')}</span>
          <Input name="name" required minLength={2} />
        </label>
        <label className="block">
          <span className="text-sm">{t('client')}</span>
          <Input name="clientName" />
        </label>
        <label className="block">
          <span className="text-sm">{t('location')}</span>
          <Input name="location" />
        </label>
        <Button type="submit">{t('create')}</Button>
      </form>
    </Card>
  );
}
