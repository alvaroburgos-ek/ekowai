import { Co2ActivityTable } from '@/components/vsme/co2-activity-table';

export default async function VsmeEmissionsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const localeTyped = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';

  return (
    <Co2ActivityTable
      projectId={id}
      worksheetInstanceId=""
      locale={localeTyped}
      lines={[]}
      totals={{ scope1: 0, scope2Location: 0, totalLocation: 0, lineCount: 0 }}
    />
  );
}
