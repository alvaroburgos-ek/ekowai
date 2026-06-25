import { Worklist } from '@/components/vsme/worklist';

export default async function VsmeWorklistPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const localeTyped = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';

  return <Worklist projectId={id} locale={localeTyped} fieldsByOwner={{}} />;
}
