import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Records the engineer's decision on an MCP connector's authorization request.
 *
 * Supabase does the OAuth bookkeeping — generating the authorization code on
 * approval, the error response on denial — and hands back the URL to send the
 * caller to. Posted to by the consent page (src/app/oauth/consent/page.tsx).
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const authorizationId = formData.get('authorization_id');
  const decision = formData.get('decision');

  if (typeof authorizationId !== 'string' || !authorizationId) {
    return NextResponse.json({ error: 'authorization_id fehlt' }, { status: 400 });
  }

  const supabase = await createClient();

  // The decision is only the signed-in engineer's to make — never act on a
  // POST that arrives without a session.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { data, error } =
    decision === 'approve'
      ? await supabase.auth.oauth.approveAuthorization(authorizationId)
      : await supabase.auth.oauth.denyAuthorization(authorizationId);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Entscheidung konnte nicht gespeichert werden' },
      { status: 400 },
    );
  }

  return NextResponse.redirect(data.redirect_url, { status: 303 });
}
