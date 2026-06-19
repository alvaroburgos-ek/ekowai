import { requireExternal } from '@/lib/auth/membership';
import type { Locale } from '@/lib/i18n/config';
import { Footer } from '@/components/layout/footer';

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Redirects staff → /projects, unauthenticated → /login.
  await requireExternal(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4 text-sm font-medium">EKOWAI — Portal</header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-12 pb-24">{children}</main>
      <Footer locale={locale as Locale} />
    </div>
  );
}
