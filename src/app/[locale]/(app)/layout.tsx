import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orgMembers } from '@/lib/db/schema';
import { Nav } from '@/components/layout/nav';
import { Footer } from '@/components/layout/footer';
import type { Locale } from '@/lib/i18n/config';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const autoEmail = process.env.DEV_AUTOLOGIN_EMAIL;
    if (autoEmail) {
      redirect(`/api/dev/login?email=${encodeURIComponent(autoEmail)}&locale=${locale}`);
    }
    redirect(`/${locale}/login`);
  }

  // Internal app shell: only org members may enter. External parties
  // (project_collaborators: client/designer) are routed to their portal.
  const membership = await db
    .select({ userId: orgMembers.userId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id))
    .limit(1);
  if (membership.length === 0) redirect(`/${locale}/portal`);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav locale={locale as Locale} />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-16 sm:pb-24 w-full">{children}</main>
      <Footer locale={locale as Locale} />
    </div>
  );
}
