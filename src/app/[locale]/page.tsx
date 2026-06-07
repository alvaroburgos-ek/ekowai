import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LocaleRoot({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en' }>;
}) {
  const { locale } = await params;

  // The wizard root is a pure auth entry — marketing lives on
  // ekowai-engineering.de. Signed-in users hop straight into the app
  // (preserves dev autologin convenience), everyone else lands on login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(`/${locale}/projects`);

  redirect(`/${locale}/login`);
}
