import { Worklist } from '@/components/vsme/worklist';
import { loadWorklist } from '@/lib/db/queries/vsme-worklist';

export default async function VsmeWorklistPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const localeTyped = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';
  const fieldsByOwner = await loadWorklist(id);

  return <Worklist projectId={id} locale={localeTyped} fieldsByOwner={fieldsByOwner} />;
}
