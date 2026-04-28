import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { orgMembers } from '@/lib/db/schema';
import { listOrgMembers } from '@/lib/actions/org';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

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

  const members = await listOrgMembers(membership.orgId);
  const canInvite = membership.role === 'owner' || membership.role === 'admin';

  return (
    <article className="space-y-12">
      <header className="border-b border-hairline pb-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
              Organisation · {membership.orgId.slice(0, 8)}
            </div>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-ink">
              {t('title')}
            </h1>
          </div>
          {canInvite && (
            <Link href={`/${locale}/org/invite`}>
              <Button>+ {t('invite')}</Button>
            </Link>
          )}
        </div>
      </header>

      <section className="space-y-5">
        <div className="flex items-end justify-between border-b border-hairline pb-3">
          <h2 className="text-2xl font-semibold text-ink">{t('members')}</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext tabular-nums">
            {String(members.length).padStart(2, '0')} ·{' '}
            {members.length === 1 ? t('memberSingular') : t('memberPlural')}
          </span>
        </div>

        {members.length === 0 ? (
          <div className="border border-dashed border-hairline-strong p-12 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtext">
              {t('noMembers')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-hairline border-y border-hairline">
            {members.map((m, i) => (
              <li
                key={m.userId}
                className="grid grid-cols-12 gap-4 px-2 py-4 items-baseline"
              >
                <span className="col-span-1 font-mono text-[11px] tabular-nums text-subtext">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="col-span-5 text-base text-ink">
                  {m.fullName || m.email}
                </span>
                <span className="col-span-4 text-sm text-subtext truncate">{m.email}</span>
                <span className="col-span-2 font-mono text-[10px] uppercase tracking-[0.2em] text-right text-ink-2">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
