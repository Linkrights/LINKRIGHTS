// 모든 페이지를 감싸는 기본 틀입니다. 위쪽 메뉴와 아래쪽 정보가 여기에 들어갑니다.

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../globals.css';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { getSite } from '@/lib/content';
import { LOCALES, getMessages, htmlLang, pick, toLocale } from '@/lib/i18n';

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://linkrights.vercel.app';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  const t = getMessages(locale);
  const site = getSite();
  const base = siteUrl();

  return {
    metadataBase: new URL(base),
    title: {
      default: t.meta.homeTitle,
      template: `%s | ${site.siteName}`,
    },
    description: t.meta.homeDescription,
    applicationName: site.siteName,
    alternates: {
      canonical: `${base}/${locale}`,
      languages: Object.fromEntries(LOCALES.map((code) => [htmlLang[code], `${base}/${code}`])),
    },
    openGraph: {
      type: 'website',
      siteName: site.siteName,
      title: t.meta.homeTitle,
      description: t.meta.homeDescription,
      url: `${base}/${locale}`,
      locale: htmlLang[locale],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.meta.homeTitle,
      description: t.meta.homeDescription,
    },
    robots: { index: true, follow: true },
    other: { 'format-detection': 'telephone=yes' },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  const t = getMessages(locale);
  const site = getSite();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.siteName,
    alternateName: site.siteNameKo,
    description: pick(site.description, locale),
    url: `${siteUrl()}/${locale}`,
    email: site.contactEmail,
  };

  return (
    <html lang={htmlLang[locale]}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          {t.common.skipToContent}
        </a>
        <Header locale={locale} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer locale={locale} />
        <script
          type="application/ld+json"
          // 검색엔진이 사이트를 이해하도록 돕는 정보입니다.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
