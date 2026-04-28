import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/layout/nav';
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
    if (autoEmail && process.env.NODE_ENV !== 'production') {
      redirect(`/api/dev/login?email=${encodeURIComponent(autoEmail)}&locale=${locale}`);
    }
    redirect(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen">
      <Nav locale={locale as Locale} />
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}
