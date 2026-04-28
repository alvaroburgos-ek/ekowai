# Pre-launch checklist (Plan 4)

Items the agent can't do for you. Run through before sharing the URL with paying customers.

## Auth & email

- [ ] **Custom SMTP in Supabase** (~10 min). Free-tier Supabase limits magic-link
      emails to ~2/hour project-wide. Configure your own SMTP so this stops biting:
      Supabase Dashboard → Authentication → SMTP Settings → enter Resend credentials
      (free tier 3k/mo at https://resend.com).

- [ ] **Allowed Redirect URLs** in Supabase → Authentication → URL Configuration:
      add `https://app.ekowai.de/auth/callback`, `https://*.vercel.app/auth/callback`,
      `http://localhost:3000/auth/callback`.

- [ ] **Remove `DEV_AUTOLOGIN_EMAIL` env var** from Vercel production scope.
      The `/api/dev/login` endpoint and the autologin redirect both gate on this var;
      removing it disables the backdoor and re-enables real magic-link auth.
      ```
      vercel env rm DEV_AUTOLOGIN_EMAIL production
      ```

## Legal

- [ ] **Get AGB / Datenschutzerklärung / Impressum drafted by a lawyer.** Drop the
      content into the placeholders in `src/lib/i18n/messages/{de,en}.json` under
      the `legal.*` namespace. The current placeholders read like
      `[zu ergänzen vom Anwalt]` / `[to be drafted by lawyer]`.

- [ ] **Set `LEGAL_REVIEWED=true`** in Vercel production once content is finalized.
      The amber "draft" banner on the legal pages disappears.

- [ ] **Sign Supabase DPA** in Supabase Dashboard → Settings → Organization → DPA.
      Free with Pro tier (€25/mo).

- [ ] **Trademark check** on "EKOWAI Wizard" — DPMA + EUIPO. Lawyer's job.

## Infrastructure

- [ ] **Custom domain** `app.ekowai.de` in Vercel → Settings → Domains. Add CNAME
      record at your registrar pointing to `cname.vercel-dns.com`.

- [ ] **Sentry project** at https://sentry.io (free tier, EU region). Set:
      - `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (client) in Vercel.

- [ ] **Plausible Analytics** (€9/mo) — optional. Add a `<PlausibleScript />`
      to `src/app/[locale]/layout.tsx` if you want it.

- [ ] **Daily Supabase backup** verification — on Pro tier; download a backup,
      run a restore test in a throwaway project to confirm it actually works.

## CI / RLS

- [ ] **CI Supabase project** for RLS tests. Create a second free-tier Supabase
      project (`ekowai-wizard-ci`), apply migrations, set the three secrets in
      GitHub Actions:
      `CI_SUPABASE_URL`, `CI_SUPABASE_ANON_KEY`, `CI_SUPABASE_SERVICE_ROLE_KEY`.
      Then add an `rls-tests` job to `.github/workflows/ci.yml` that runs
      `pnpm test:rls`.

- [ ] **`prelaunch:check` passes locally with production env**:
      ```
      VERCEL_ENV=production pnpm prelaunch:check
      ```
      Should print `✓ prod readiness OK` with the dev escape hatch removed.

## Tauri Desktop (separate — Plan 5)

Not part of Plan 4. Blocks on:

- Windows OV code-signing cert procurement (~weeks)
- Local Rust toolchain + Tauri CLI install
- The custom-protocol (`ekowai://`) auth handshake — the design spec calls this
  the biggest single integration risk; budget a full week.
