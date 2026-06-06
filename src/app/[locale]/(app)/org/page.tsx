import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { Building2, UserPlus, Users, Mail, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { orgMembers, orgs } from '@/lib/db/schema';
import { listOrgMembers } from '@/lib/actions/org';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { LetterheadForm } from '@/components/org/letterhead-form';

export default async function OrgPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('org');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id))
    .limit(1);
  if (!membership) return null;

  const [org] = await db.select().from(orgs).where(eq(orgs.id, membership.orgId)).limit(1);
  if (!org) return null;

  const members = await listOrgMembers(membership.orgId);
  const canInvite = membership.role === 'owner' || membership.role === 'admin';

  return (
    <article className="space-y-8 sm:space-y-10">
      <header className="flex items-start justify-between gap-4 sm:gap-6 flex-wrap">
        <div className="space-y-2 min-w-0">
          <div className="inline-flex items-center gap-2 text-xs text-subtext">
            <Building2 className="size-4" aria-hidden />
            <span>Organisation · {membership.orgId.slice(0, 8)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-ink">
            {t('title')}
          </h1>
        </div>
        {canInvite && (
          <Link href={`/${locale}/org/invite`}>
            <Button>
              <UserPlus aria-hidden />
              {t('invite')}
            </Button>
          </Link>
        )}
      </header>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="inline-flex items-center gap-2">
            <Users className="size-5 text-accent-2" aria-hidden />
            <h2 className="text-xl font-semibold text-ink">{t('members')}</h2>
          </div>
          <span className="text-xs text-subtext tabular-nums">
            {members.length} {members.length === 1 ? t('memberSingular') : t('memberPlural')}
          </span>
        </div>

        {members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-hairline-strong bg-paper-2/40 p-8 sm:p-12 text-center">
            <p className="text-sm text-subtext">{t('noMembers')}</p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-hairline bg-paper shadow-soft divide-y divide-hairline overflow-hidden">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-paper-2/50 transition-colors"
              >
                <div
                  className="inline-flex items-center justify-center size-9 rounded-full shrink-0 text-sm font-semibold text-accent-2"
                  style={{ background: 'var(--eko-gradient-soft)' }}
                  aria-hidden
                >
                  {(m.fullName || m.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">
                    {m.fullName || m.email}
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-subtext truncate">
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{m.email}</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-paper-2 text-[11px] font-medium text-ink-2 shrink-0">
                  <ShieldCheck className="size-3" aria-hidden />
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canInvite && (
        <section className="pt-2">
          <LetterheadForm
            org={{
              id: org.id,
              logoUrl: org.logoUrl,
              addressLine1: org.addressLine1,
              addressLine2: org.addressLine2,
              postalCode: org.postalCode,
              city: org.city,
              phone: org.phone,
              email: org.email,
              website: org.website,
              vatId: org.vatId,
            }}
          />
        </section>
      )}
    </article>
  );
}
