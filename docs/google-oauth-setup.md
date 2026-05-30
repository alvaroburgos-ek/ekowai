# Google OAuth Setup — Supabase + Google Cloud Console

Code ist fertig (`signInWithGoogle` server action + Login-Button hinter
`NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`). Was bleibt, sind die Konsolen-Klicks.

## Reihenfolge

1. **Google Cloud Console** — OAuth-Client anlegen → Client ID + Secret kopieren
2. **Supabase Dashboard** — Google Provider aktivieren, Client ID + Secret eintragen
3. **Google Cloud Console** — Supabase-Callback als Authorized Redirect URI eintragen
4. **Vercel** — `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=1` in den Production-Env-Vars setzen
5. **Lokal** — gleiche Variable in `.env.local`

---

## 1. Google Cloud Console

URL: <https://console.cloud.google.com/apis/credentials>

- Projekt wählen (oder neues anlegen, z. B. "EKOWAI Wizard").
- "OAuth consent screen" einrichten falls noch nicht passiert (External, Brand-Name "EKOWAI Wizard", Support-E-Mail).
- **Create Credentials → OAuth client ID**
  - Application type: **Web application**
  - Name: `EKOWAI Wizard — Web`
  - Authorized JavaScript origins: *(leer lassen — wird nicht gebraucht für Server-Side-OAuth via Supabase)*
  - Authorized redirect URIs: **`https://<supabase-project-ref>.supabase.co/auth/v1/callback`**
    (exakte URL holst du dir aus Supabase → Authentication → Providers → Google — der Wert steht dort
    als "Callback URL (for OAuth)")
- **Client ID** + **Client Secret** kopieren.

> ⚠️ Die `.env.example`-Doku im Repo sagt fälschlich, man solle `https://<your-domain>/auth/callback`
> whitelisten. Das stimmt für direkten OAuth, **nicht** für den Supabase-Flow. Supabase ist der
> Vermittler — Google redirected zu Supabase, Supabase zu deiner App.

## 2. Supabase Dashboard

URL: <https://supabase.com/dashboard/project/_/auth/providers>

- Provider **Google** öffnen → enable
- Client ID + Client Secret eintragen
- "Callback URL (for OAuth)" oben dort steht der Wert, der in Schritt 1 ins Google-Console-Feld gehört
- Save

## 3. Vercel

URL: <https://vercel.com/dashboard> → Project `ekowai-wizard` → Settings → Environment Variables

Hinzufügen:

```
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED = 1
```

Scope: Production + Preview + Development.

## 4. Lokal

In `C:\ekowai-wizard\.env.local`:

```
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=1
```

(Der Key existiert schon — falls leer, auf `1` setzen.)

## 5. Test

- Lokal: `pnpm dev`, `/de/login` öffnen → Button "Mit Google anmelden" muss erscheinen.
- Klick → Google-OAuth-Flow → zurück nach `/de/verify` (oder `/en/verify`).
- Production: nach Vercel-Deploy auf <https://ekowai-wizard.vercel.app/de/login> testen.

## Troubleshooting

- **redirect_uri_mismatch** → Authorized Redirect URI in Google Console exakt prüfen (kein Trailing-Slash, https, Project-Ref korrekt).
- **Provider not enabled** → Schritt 2 nicht gespeichert.
- **Button nicht sichtbar** → `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` nicht gesetzt oder Build vor dem Env-Set passiert (re-deploy nötig).
