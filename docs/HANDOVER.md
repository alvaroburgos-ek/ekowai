# EKOWAI Wizard — Handover

Quick orientation for the next person (or AI session) picking this up.

## What it is

A Next.js 16 web app that helps German Planungsingenieur:innen run
**DWA-A-201 sizing calculations** for wastewater pond plants. Multi-tenant
on Supabase with RLS. 22 real DWA-A-201 worksheets imported from the
EKOWAI-Agent Python pipeline. Decisions, compliance gating, multi-stage
approval workflow, optional AI rationale drafting (Mistral, EU),
Resend email notifications.

**Live:** https://ekowai-wizard.vercel.app

## Read first

- `Obsidian SecondBrain/01-Projects/ekowai-agent/2026-04-29-ekowai-wizard-status-snapshot.md`
  — current state, what's done, what's blocked.
- `2026-04-28-ekowai-wizard-mvp1-design.md` — the locked design spec.
- `2026-04-28-ekowai-wizard-mvp1-plan-{1..5}-*.md` — the 5 implementation
  plans. Plans 1–4 are done; Plan 5 is blocked on procurement.
- `docs/PRELAUNCH.md` — user-action checklist (SMTP / lawyer / domain /
  Sentry / CI Supabase).

## Run locally

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

`.env.local` already has the keys (Supabase, Mistral, Resend,
DEV_AUTOLOGIN_EMAIL). The dev autologin signs in as
`leadership@ekowai.com` automatically.

## Re-create the demo data

```bash
pnpm tsx scripts/wipe-test-data.ts --yes
pnpm tsx scripts/seed-demo.ts
```

22 calcs in mixed states (approved / submitted / changes_requested /
draft / draft+violated). Open the project after.

## Re-import worksheets from EKOWAI-Agent

```bash
pnpm tsx scripts/extract-regulation-knowledge.ts   # parses regulation_brief.md
pnpm tsx scripts/import-from-ekowai-agent.ts       # writes wizard JSONs
```

Source: `C:\EKOWAI-Agent\standards\DWA-A-201\` (Python repo). Output:
`src/lib/worksheets/DWA-A-201/v3.1/`. Idempotent — overwrites the
existing 22 worksheet JSONs and the `_knowledge.json` knowledge map.

## Architecture in one screen

```
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│  Next.js App Router                                              │
│  - /[locale]               → marketing landing                   │
│  - /[locale]/(auth)/login  → magic-link form                     │
│  - /[locale]/(app)/...     → projects, calculator, inbox, org    │
│  - Client: Zustand store + LocalStorage offline buffer           │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                  VERCEL — Next.js                                │
│  - Server Components (calc page, project list, inbox, ...)       │
│  - Server Actions (createCalc, submitForReview, approve, ...)    │
│  - Route Handlers (/api/draft-rationale, /api/dev/login,         │
│    /auth/callback, /api/auth/logout)                             │
│  - Routing Middleware (locale + Supabase session refresh +       │
│    public-route allowlist + dev autologin redirect)              │
└──────────┬─────────────────────────┬─────────────┬───────────────┘
           │                         │             │
┌──────────▼──────────┐  ┌───────────▼─────────┐  ┌▼─────────────┐
│ Supabase Frankfurt  │  │ Resend (SDK)        │  │ Mistral (EU) │
│ - Postgres + RLS    │  │ - approval emails   │  │ LLM rationale│
│ - Auth (magic-link) │  │ - SMTP relay for    │  │ via AI SDK   │
│ - 9 tables          │  │   Supabase auth     │  │              │
│   (orgs, projects,  │  │   (USER ACTION:     │  │              │
│   calculations,     │  │    not yet wired)   │  │              │
│   decisions, ...)   │  │                     │  │              │
└─────────────────────┘  └─────────────────────┘  └──────────────┘

      ┌──── BUILD-TIME ────────────────────────────────────────┐
      │  EKOWAI-Agent Python repo                              │
      │  C:\EKOWAI-Agent\standards\DWA-A-201\                  │
      │       (mapping/ + worksheets/ + source/)               │
      │   ↓ scripts/import-from-ekowai-agent.ts                │
      │   ↓ scripts/extract-regulation-knowledge.ts            │
      │  src/lib/worksheets/DWA-A-201/v3.1/A201-NN.json        │
      │      → bundled into Next.js, validated via zod at      │
      │        module load.                                    │
      └────────────────────────────────────────────────────────┘
```

## Hot keys / constraints

- **`status: 'preview'`** on every worksheet until an engineer signs off.
  Visible warning banner + monospace 'Vorschau' chip on the calculator
  masthead. Don't claim regulation-validated content without flipping
  this field per worksheet.
- **No display fonts**. User explicitly vetoed Fraunces / IBM Plex.
  System sans + system mono only. Any future design pass must respect
  this.
- **Engineering Editorial aesthetic.** Mineral palette (paper / ink /
  accent / success / warning / error), hairline rules instead of
  shadows, tabular monospace for every numeric value, monospace
  uppercase tracking for meta. de-DE locale-formatted numbers (1.800,
  not 1,800 or 1800). Don't drift toward generic SaaS.
- **Worksheet contract is the engine's input.** Don't bypass zod
  validation. Don't skip the integrity tests
  (`src/lib/worksheets/DWA-A-201/v3.1/index.test.ts`).
- **Cross-worksheet linking is server-side.** Don't try to do it in the
  client store — the page does it before render.
- **Compliance gate is server-side.** Client UX is helpful, not
  authoritative.
- **Email send fails open.** Approval transitions complete even if
  Resend is unset / down. Don't block on email infra.

## Common operations

```bash
# Apply a Supabase migration
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2-)" \
  pnpm tsx scripts/_apply-supabase-sql.ts supabase/migrations/<file>.sql

# Run the prod-readiness check (fails if dev backdoors live)
pnpm prelaunch:check

# Pull current Vercel env vars
vercel env pull --environment production /tmp/vercel-prod-env

# Deploy
vercel deploy --prod --yes
```

## Things you'll trip over

1. **Magic-link rate limit on Supabase free tier.** ~2 emails/hour
   project-wide. Configure Resend SMTP in Supabase Dashboard to fix.
2. **`vercel env add KEY preview` returns "branch_required"** — Vercel
   CLI v52 quirk. Use `production` scope or pass an explicit `--branch`.
3. **Postgres direct connection (`db.<ref>.supabase.co:5432`) doesn't
   work from Vercel functions** — IPv6-only. Use the pooler URL
   (`aws-1-eu-central-2.pooler.supabase.com:6543`).
4. **`dwa_a_201.md` exists in two places.** `mapping/dwa_a_201.md` is
   the LaTeX-from-Mathpix dump; `source/regulation_brief.md` is the
   structured NotebookLM extraction. The brief is what the knowledge
   extractor uses.
5. **Worksheet IDs vs threshold IDs.** Worksheet inputs derived from
   thresholds use `T_NN` (sanitized threshold ID). Inputs derived from
   formula variables use the symbol name (e.g. `EW`, `EZ`, `EGW`).
   Cross-worksheet derived inputs use the sanitized parameter name from
   `outputs_to`.

## What I'd do next

See the snapshot doc's 'What I'd do next, ranked' section.
