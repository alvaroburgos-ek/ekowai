import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { orgMembers } from '@/lib/db/schema';
import { listOrgMembers } from '@/lib/actions/org';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default async function OrgPage({
  params,
}: { params: Promise<{ locale: 'de' | 'en' }> }) {
  const { locale } = await params;
  const t = await getTranslations('org');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {canInvite && (
          <Link href={`/${locale}/org/invite`}>
            <Button>{t('invite')}</Button>
          </Link>
        )}
      </div>
      <div>
        <h2 className="text-lg font-medium mb-3">{t('members')}</h2>
        {members.length === 0 ? (
          <p className="text-slate-500">{t('noMembers')}</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.userId} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{m.fullName || m.email}</div>
                  <div className="text-sm text-slate-500">{m.email}</div>
                </div>
                <span className="text-sm text-slate-600 uppercase">{m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
