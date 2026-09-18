import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth consent screen for the MCP connector.
 *
 * Supabase Auth acts as the authorization server: when the Claude app starts
 * the OAuth flow, Supabase sends the engineer here with an `authorization_id`.
 * This page shows who is asking, and the decision route below approves or
 * denies it. Configured under Authentication → OAuth Server → Authorization
 * Path as `/oauth/consent`.
 *
 * Deliberately outside the `[locale]` segment: Supabase is configured with one
 * fixed authorization path and cannot prefix it per locale.
 */
export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;

  if (!authorizationId) {
    return (
      <Shell title="Ungültige Anfrage">
        <p className="text-sm text-subtext">
          Es fehlt die <code>authorization_id</code>. Starte die Verbindung noch einmal
          aus der Claude-App heraus.
        </p>
      </Shell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/de/login?redirect=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`,
    );
  }

  const { data: details, error } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !details) {
    return (
      <Shell title="Anfrage konnte nicht geladen werden">
        <p className="text-sm text-subtext">
          {error?.message ?? 'Die Autorisierungsanfrage ist ungültig oder abgelaufen.'}
        </p>
      </Shell>
    );
  }

  // Already consented earlier — Supabase hands back a redirect instead of
  // details, and there is nothing to ask.
  if (!('authorization_id' in details)) {
    redirect(details.redirect_url);
  }

  return (
    <Shell title={`${details.client.name} verbinden`}>
      <p className="text-sm text-ink-2">
        Die Anwendung möchte in deinem Namen auf EKOWAI zugreifen — mit deinen
        Rechten, auf deine Projekte. Erteile den Zugriff nur, wenn du die
        Verbindung selbst gestartet hast.
      </p>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-subtext">Anwendung</dt>
          <dd className="text-ink">{details.client.name}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-subtext">Angemeldet als</dt>
          <dd className="text-ink">{details.user.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-subtext">Rückleitung an</dt>
          <dd className="break-all font-mono text-xs text-ink-2">
            {details.redirect_uri}
          </dd>
        </div>
      </dl>

      <form action="/api/oauth/decision" method="POST" className="mt-8 flex gap-3">
        <input type="hidden" name="authorization_id" value={authorizationId} />
        <button
          type="submit"
          name="decision"
          value="approve"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-2"
        >
          Zugriff erlauben
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className="rounded border border-ink/15 px-4 py-2 text-sm font-medium text-ink-2 hover:bg-paper-2"
        >
          Ablehnen
        </button>
      </form>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="rounded-lg border border-ink/10 bg-paper p-8">
        <h1 className="text-lg font-medium text-ink">{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </main>
  );
}
