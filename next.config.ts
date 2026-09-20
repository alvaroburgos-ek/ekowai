import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {
  /**
   * The wizard is an internal planning tool and does not belong in search
   * results. Without this header wizard.ekowai-engineering.de was openly
   * crawlable, so a search for "EKOWAI" could land on a sign-in screen
   * instead of the landing page.
   *
   * A header rather than a robots.txt disallow: a disallow only forbids
   * crawling, so Google would never see a noindex and may still list the URL,
   * just without a description. The header works the other way round — crawl
   * yes, index no — and it applies to every response, including the ones no
   * layout with `metadata` renders.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
