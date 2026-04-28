import { redirect } from 'next/navigation';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  // Send everyone to /projects. The (app) layout's auth check kicks unauthenticated
  // users to /login (or to /api/dev/login when DEV_AUTOLOGIN_EMAIL is set).
  redirect(`/${locale}/projects`);
}
