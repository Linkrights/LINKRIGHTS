// 자주 묻는 질문 페이지입니다. 내용은 content/faq.json 에서 바꿉니다.

import type { Metadata } from 'next';
import { PageHeader, Section } from '@/components/Section';
import { getFaq } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';

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

  // 검색엔진이 질문·답변을 이해하도록 돕는 정보입니다.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: pick(item.q, locale),
      acceptedAnswer: { '@type': 'Answer', text: pick(item.a, locale) },
    })),
  };

  return (
    <>
      <PageHeader title={t.faq.title} subtitle={t.faq.subtitle} />
      <Section>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <details className="lr-card group p-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-bold text-ink-900">
                  {pick(item.q, locale)}
                  <span className="shrink-0 text-ink-300 transition-transform group-open:rotate-180" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-700">{pick(item.a, locale)}</p>
              </details>
            </li>
          ))}
        </ul>
      </Section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
