import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import { Poppins } from 'next/font/google';
import { locales, type Locale } from '@/lib/i18n/config';
import { ConsentBanner } from '@/components/consent-banner';
import '../globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EKOWAI Wizard',
  description: 'Bemessungsassistent für DWA-A-201 — Kläranlagen-Planung mit deterministischer Berechnung und §-genauen Zitaten.',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const messages = await getMessages();

  return (
    <html lang={locale} className={poppins.variable}>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <ConsentBanner />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
