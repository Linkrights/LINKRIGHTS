// 모든 페이지를 감싸는 기본 틀입니다. 위쪽 메뉴와 아래쪽 정보가 여기에 들어갑니다.

import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import type { ReactNode } from 'react';
import '../globals.css';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PREFERENCES_INIT_SCRIPT } from '@/components/view-preferences';
import { getSite, resolveOrganizations } from '@/lib/content';
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

/**
 * 방문 통계(Vercel Web Analytics).
 * 쿠키를 쓰지 않고, 누가 봤는지 알 수 없는 익명 집계만 남깁니다. (개인정보 처리방침의 '방문 통계' 항목 참고)
 * Vercel 프로젝트 설정에서 Web Analytics 를 켜 두어야 기록됩니다.
 */
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
  // 모든 페이지 위쪽의 "긴급 112·119" 버튼에 보여줄 연락처. 등록된 기관 정보(content/organizations.json)에서만 가져옵니다.
  const emergencyContacts = resolveOrganizations(['police-112', 'fire-119']).map((org) => ({
    id: org.id,
    name: pick(org.name, locale),
    phone: org.phone,
  }));

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
      <head>
        {/* 저장해 둔 보기 설정(글자 크기·어두운 화면)을 화면이 그려지기 전에 먼저 적용합니다.
            이렇게 해야 어두운 화면을 고른 사람에게 흰 화면이 잠깐 번쩍이지 않습니다. */}
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          {t.common.skipToContent}
        </a>
        <Header locale={locale} emergencyContacts={emergencyContacts} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer locale={locale} />
        <Analytics />
        <script
          type="application/ld+json"
          // 검색엔진이 사이트를 이해하도록 돕는 정보입니다.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
