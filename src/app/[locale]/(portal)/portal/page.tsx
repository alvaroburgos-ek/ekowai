import { requireExternal } from '@/lib/auth/membership';
import { getClientProjectView } from '@/lib/actions/client-portal';

export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { projectId, role } = await requireExternal(locale);

  if (role === 'designer') {
    return (
      <section>
        <h1 className="text-xl font-semibold">Aufgaben</h1>
        <p className="mt-4 text-sm text-gray-600">
          Noch keine Aufgaben. Sobald der Ingenieur einen Task Brief freigibt, erscheint er hier.
        </p>
      </section>
    );
  }

  const view = await getClientProjectView(projectId);
  if (!view) {
    return <p className="text-sm text-gray-600">Projekt nicht verfügbar.</p>;
  }

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">{view.project.name}</h1>
        {view.project.location && (
          <p className="text-sm text-gray-600">{view.project.location}</p>
        )}
      </header>

      <div>
        <h2 className="text-sm font-medium">Fortschritt</h2>
        <p className="mt-1 text-2xl font-semibold">{view.progress.percent}%</p>
        <p className="text-xs text-gray-500">
          {view.progress.worksheetsApproved} / {view.progress.worksheetsTotal} Arbeitsblätter freigegeben
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium">Ergebnisse</h2>
        <ul className="mt-2 divide-y text-sm">
          {view.outcomes.map((o) => (
            <li key={o.label} className="flex justify-between py-2">
              <span className="text-gray-600">{o.label}</span>
              <span className="font-medium">
                {o.value}
                {o.unit ? ` ${o.unit}` : ''}
              </span>
            </li>
          ))}
          {view.outcomes.length === 0 && (
            <li className="py-2 text-gray-500">Noch keine Ergebnisse verfügbar.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
