import { redirect } from 'next/navigation';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;
  // Until Task 14, send everyone to login. Authed users will be redirected to projects by middleware/verify flow later.
  redirect(`/${locale}/login`);
}
