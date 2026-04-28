# Pre-launch checklist

Items the agent can't do for you. Run through before sharing the URL with paying customers.

## Resend — email setup (covers two flows)

The same Resend API key powers both:

### A. Magic-link auth + invite emails (via Supabase SMTP)

Supabase calls Resend's SMTP relay; no app code needed.

1. **Get the Resend API key** from https://resend.com/api-keys.
2. (Recommended) **Verify your domain** in Resend → Domains. Add the DKIM/SPF/DMARC records they show at your DNS registrar. Until verified, you can only send `from` `onboarding@resend.dev`.
3. **Configure Supabase**: Dashboard → Authentication → SMTP Settings → "Enable Custom SMTP":
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (STARTTLS)
   - Username: `resend`
   - Password: `<your Resend API key>`
   - Sender name: `EKOWAI Wizard`
   - Sender email: `noreply@app.ekowai.de` (or `onboarding@resend.dev` if domain not yet verified)
4. **Save**. Supabase sends a test email; if it arrives, you're done.
5. **After it works** in production, **remove `DEV_AUTOLOGIN_EMAIL`** from Vercel:
   ```
   vercel env rm DEV_AUTOLOGIN_EMAIL production
   vercel deploy --prod --yes
   ```
   The dev backdoor is now off; magic-link auth is the real flow.

### B. App-side transactional emails (via Resend SDK)

Approval-status notifications: when a calculation is submitted/approved/rejected/changes-requested, the affected users get an email. Wired into `submitForReview` / `approveCalculation` / `rejectCalculation` / `requestChanges` in `src/lib/actions/approval.ts`.

1. **Set Vercel env vars**:
   ```
   vercel env add RESEND_API_KEY production --value "<your-key>" --yes
   vercel env add RESEND_FROM_EMAIL production --value "noreply@app.ekowai.de" --yes
   ```
   If domain not yet verified, leave `RESEND_FROM_EMAIL` unset — it defaults to `onboarding@resend.dev`.
2. **Redeploy**: `vercel deploy --prod --yes`.
3. **Test**: submit a calc for review → reviewers in your org receive an email with a link to the calculation. Approve it → the calc creator receives a confirmation email.

If `RESEND_API_KEY` is unset, the app silently no-ops the notification path and never blocks an approval-state transition on missing email config.

## Allowed Redirect URLs

In Supabase → Authentication → URL Configuration → "Redirect URLs", add:
- `https://app.ekowai.de/auth/callback`
- `https://*.vercel.app/auth/callback`
- `http://localhost:3000/auth/callback`

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
