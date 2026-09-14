// 자주 묻는 질문 페이지입니다. 질문과 답은 content/faq.json 에서 바꿉니다.
// 검색·카테고리·펼치기는 FaqBrowser 에서 처리합니다.
// 질문 목록은 서버에서 모두 그리므로 검색엔진과 자바스크립트가 꺼진 환경에서도 읽을 수 있습니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqBrowser, type FaqCategoryView, type FaqItemView } from '@/components/FaqBrowser';
import { Icon } from '@/components/Icon';
import { PageHeader, Section } from '@/components/Section';
import { getFaq, resolveOrganizations } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';
import { FAQ_CATEGORIES } from '@/lib/types';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  return { title: t.faq.title, description: t.faq.subtitle };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const items = getFaq().items;

  const views: FaqItemView[] = items.map((item) => ({
    id: item.id,
    category: item.category,
    q: pick(item.q, locale),
    a: pick(item.a, locale),
    // 전화 버튼은 등록된 기관(content/organizations.json)의 번호만 씁니다.
    contacts: resolveOrganizations(item.organizations ?? []).map((org) => ({
      id: org.id,
      name: pick(org.name, locale),
      phone: org.phone,
    })),
  }));

  // 질문이 하나라도 있는 카테고리만 정해진 순서대로 보여줍니다.
  const categories: FaqCategoryView[] = FAQ_CATEGORIES.filter((id) => views.some((item) => item.category === id)).map(
    (id) => ({ id, label: t.faq.categories[id], title: t.faq.categoryTitles[id] }),
  );

  // 검색엔진이 질문·답변을 이해하도록 돕는 정보입니다.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: views.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <>
      <PageHeader title={t.faq.title} subtitle={t.faq.subtitle} />

      {/* 긴급 안내: 홈과 같은 얇은 띠 */}
      <div className="border-b border-[var(--color-danger-200)] bg-[var(--color-danger-50)]">
        <div className="lr-container py-2.5">
          <Link
            href={`/${locale}/emergency`}
            className="inline-flex items-start gap-2 text-sm font-semibold leading-snug text-[var(--color-danger-700)] hover:underline"
          >
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" /> <span>{t.home.emergencyBanner}</span>
          </Link>
        </div>
      </div>

      <Section>
        <div className="mx-auto max-w-3xl">
          <FaqBrowser
            items={views}
            categories={categories}
            askHref={`/${locale}/ask`}
            rightsSearchHref={`/${locale}/rights`}
            emergencyHref={`/${locale}/emergency`}
            labels={{
              intro: t.faq.intro,
              searchPlaceholder: t.faq.searchPlaceholder,
              searchHint: t.faq.searchHint,
              rightsSearchNote: t.faq.rightsSearchNote,
              rightsSearch: t.faq.rightsSearch,
              categoriesLabel: t.faq.categoriesLabel,
              filterAll: t.faq.filterAll,
              resultCount: t.faq.resultCount,
              noResultsTitle: t.faq.noResultsTitle,
              noResultsBody: t.faq.noResultsBody,
              clearSearch: t.faq.clearSearch,
              askCta: t.faq.askCta,
              call: t.nav.emergencyCall,
              emergencyMore: t.nav.emergencyMore,
            }}
          />
        </div>
      </Section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
