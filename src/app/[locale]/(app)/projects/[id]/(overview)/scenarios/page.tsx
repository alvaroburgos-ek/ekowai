import { listScenarios } from '@/lib/actions/scenarios';
import { ScenariosPanel } from '@/components/scenarios/scenarios-panel';

export default async function ScenariosPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const loc = locale === 'en' ? 'en' : 'de';
  const res = await listScenarios(id);
  return (
    <ScenariosPanel
      locale={loc}
      projectId={id}
      initial={res.ok ? { available: res.available, enabled: res.enabled, scenarios: res.scenarios } : { available: true, enabled: false, scenarios: [] }}
      error={res.ok ? null : res.error}
    />
  );
}
