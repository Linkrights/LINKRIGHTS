// 권리정보 상세 페이지입니다. (예: /ko/rights/labor/labor-unpaid-wages)
// 화면 구성: 이동 경로·제목·핵심 요약·출처와 검토일·[읽어주기][저장] → 어려운 말 풀이
//           → ① 이런 상황인가요 ② 알아두어야 할 권리 ③ 이렇게 해보세요 → 확인해 주세요 → 함께 쓰는 체크리스트
//           → ④ 이것도 궁금하실 수 있어요(등록된 관련 권리정보) → ⑤ 도움받을 곳(+ 전화하기 전 도움말)
//           → 출처 → 정보 수정 제안 → 내 상황 물어보기

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { CallScript } from '@/components/CallScript';
import { Glossary } from '@/components/Glossary';
import { Helpful } from '@/components/Helpful';
import { Icon } from '@/components/Icon';
import { ReadAloud } from '@/components/ReadAloud';
import { SaveButton } from '@/components/SaveButton';
import { Notice } from '@/components/Section';
import { OrgCard } from '@/components/OrgCard';
import {
  getArticle,
  getArticles,
  getArticlesByCategory,
  getCategory,
  getChecklists,
  getGlossary,
  getSite,
  isStale,
  isTranslationPending,
  localizeSource,
  resolveArticle,
  resolveOrganizations,
} from '@/lib/content';
import { matchGlossary } from '@/lib/glossary';
import { LOCALES, formatDate, getMessages, pick, toLocale } from '@/lib/i18n';
import type { RightsArticle } from '@/lib/types';

export const dynamicParams = false;

const MAX_RELATED = 3;

export function generateStaticParams() {
  const articles = getArticles();
  return LOCALES.flatMap((locale) =>
    articles.map((article) => ({ locale, category: article.category, slug: article.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = toLocale(rawLocale);
  const article = getArticle(slug);
  if (!article) return {};
  const { body } = resolveArticle(article, locale);
  return {
    title: body.title,
    description: body.summary,
    openGraph: { title: body.title, description: body.summary, type: 'article' },
  };
}

/**
 * 함께 볼 권리정보: 글에 직접 지정한 관련글(related)을 먼저 쓰고, 모자라면 같은 분야의 등록된 글로 채웁니다.
 * 등록·공개된 글만 쓰며, 새로 만들어내지 않습니다.
 */
function relatedArticles(article: RightsArticle): RightsArticle[] {
  const seen = new Set([article.id]);
  const result: RightsArticle[] = [];
  const add = (item: RightsArticle | undefined) => {
    if (!item || seen.has(item.id) || result.length >= MAX_RELATED) return;
    seen.add(item.id);
    result.push(item);
  };
  article.related.forEach((id) => add(getArticle(id)));
  getArticlesByCategory(article.category).forEach(add);
  return result;
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; category: string; slug: string }>;
}) {
  const { locale: rawLocale, category: categoryId, slug } = await params;
  const locale = toLocale(rawLocale);
  const article = getArticle(slug);
  if (!article || article.category !== categoryId) notFound();

  const t = getMessages(locale);
  const site = getSite();
  const { body, fallback } = resolveArticle(article, locale);
  const category = getCategory(article.category);
  const orgs = resolveOrganizations(article.organizations);
  const related = relatedArticles(article);
  const stale = isStale(article.reviewed_at);
  const checklists = getChecklists().filter((checklist) => checklist.based_on.includes(article.id));
  // 제목 아래에 보여줄 출처 기관 (등록된 출처의 발행기관, 없으면 출처 제목)
  const translationPending = isTranslationPending(article, locale);
  // 출처는 화면 언어로 보여줍니다. (번역이 없으면 한국어 원문)
  const sources = article.sources.map((source) => localizeSource(source, locale));
  const publishers = [...new Set(sources.map((source) => source.publisher || source.title))];
  const feedbackHref = `mailto:${site.contactEmail}?subject=${encodeURIComponent(
    t.rightsMeta.feedbackSubject.replace('{title}', body.title),
  )}`;

  // 본문이 실제로 쓰인 언어 (번역이 없어 한국어를 보여줄 때는 한국어로 읽고 찾습니다)
  const textLocale = fallback ? 'ko' : locale;
  const bodyTexts = [
    body.summary,
    ...body.situations,
    ...body.rights.flatMap((item) => [item.title, item.body]),
    ...body.actions.flatMap((item) => [item.title, item.body]),
    body.note ?? '',
  ];
  const glossary = matchGlossary(getGlossary(), bodyTexts, textLocale, locale);
  // 읽어주기: 화면 순서대로. 한국어 본문을 대신 보여줄 때는 다른 언어 소제목을 섞지 않습니다.
  const heading = (text: string) => (fallback ? [] : [text]);
  const readBlocks = [
    body.title,
    body.summary,
    ...heading(t.rights.situationHeading),
    ...body.situations,
    ...heading(t.rights.rightsHeading),
    ...body.rights.map((item) => `${item.title}. ${item.body}`),
    ...heading(t.rights.actionsHeading),
    ...body.actions.map((item, index) => `${index + 1}. ${item.title}. ${item.body}`),
    body.note ?? '',
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: body.title,
    description: body.summary,
    inLanguage: locale,
    dateModified: article.reviewed_at,
    isAccessibleForFree: true,
  };

  const sectionTitle = 'text-xl font-extrabold text-ink-900 sm:text-2xl';

  return (
    <>
      {/* 제목 영역 */}
      <header className="border-b border-[var(--color-line)] bg-white">
        <div className="lr-container-narrow py-8 sm:py-12">
          <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
            <Link href={`/${locale}/rights`} className="hover:text-brand-700 hover:underline">
              {t.rights.title}
            </Link>
            {category && (
              <>
                <Icon name="arrow-right" size={14} className="text-ink-300" />{' '}
                <Link
                  href={`/${locale}/rights/${category.id}`}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  {pick(category.name, locale)}
                </Link>
              </>
            )}
          </nav>

          <h1 className="lr-h1 mt-4">{body.title}</h1>
          <p className="lr-lead mt-4">{body.summary}</p>

          {/* 이 정보가 어디에서 왔는지, 언제 처음 만들고 언제 검토했는지
              최초 작성일(created_at)은 실제로 확인된 자료에만 적혀 있습니다. 없으면 그 줄을 보여주지 않습니다. */}
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-surface-soft px-4 py-3 text-[15px] leading-relaxed">
            {publishers.length > 0 && (
              <>
                <dt className="font-bold text-ink-900">{t.rightsMeta.sourceLabel}</dt>
                <dd className="min-w-0 text-ink-700">
                  {publishers.join(' · ')}{' '}
                  <a href="#sources" className="lr-link whitespace-nowrap text-sm font-semibold">
                    {t.rightsMeta.sourcesMore}
                  </a>
                </dd>
              </>
            )}
            {article.created_at && (
              <>
                <dt className="font-bold text-ink-900">{t.common.createdAt}</dt>
                <dd className="text-ink-700">{formatDate(article.created_at, locale)}</dd>
              </>
            )}
            <dt className="font-bold text-ink-900">{t.common.reviewedAt}</dt>
            <dd className="text-ink-700">{formatDate(article.reviewed_at, locale)}</dd>
            {/* 팀이 옮긴 뒤 아직 검토 전인 번역 (content/rights 의 translation_review) */}
            {translationPending && (
              <dd className="col-span-2 mt-1 border-t border-[var(--color-line)] pt-2 text-sm text-ink-500">
                {t.rightsMeta.translationPending}
              </dd>
            )}
          </dl>

          {/* 읽어주기 · 저장 */}
          <div className="mt-5 flex flex-wrap items-start gap-2">
            <ReadAloud blocks={readBlocks} locale={textLocale} labels={t.readAloud} />
            <SaveButton
              id={article.id}
              label={t.saved.saveLabel.replace('{title}', body.title)}
              saveText={t.saved.save}
              savedText={t.saved.savedText}
            />
          </div>

          {(fallback || stale) && (
            <div className="mt-5 space-y-3">
              {fallback && <Notice title={t.common.notTranslatedTitle} body={t.common.notTranslatedBody} />}
              {stale && <Notice tone="warn" title={t.common.staleTitle} body={t.common.staleBody} />}
            </div>
          )}
        </div>
      </header>

      <article className="lr-container-narrow space-y-12 py-10 sm:space-y-14 sm:py-14">
        {/* 어려운 말 풀이: 본문에 나온 전문 용어만 (content/glossary.json) */}
        <Glossary items={glossary} title={t.glossary.title} />

        {/* ① 이런 상황인가요? */}
        <section>
          <h2 className={sectionTitle}>{t.rights.situationHeading}</h2>
          <ul className="mt-5 space-y-3">
            {body.situations.map((situation) => (
              <li key={situation} className="flex gap-3 text-base leading-relaxed text-ink-900">
                <span className="mt-1 shrink-0 text-brand-600" aria-hidden="true">
                  <Icon name="check" size={18} />
                </span>{' '}
                <span>{situation}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ② 알아두어야 할 권리: 중요한 내용이므로 강조 상자로 보여줍니다 */}
        <section>
          <h2 className={sectionTitle}>{t.rights.rightsHeading}</h2>
          <ul className="mt-5 space-y-3">
            {body.rights.map((item) => (
              <li key={item.title} className="lr-callout">
                <h3 className="text-base font-bold text-ink-900">{item.title}</h3>{' '}
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ③ 이렇게 해보세요: 순서가 보이도록 번호와 선으로 나눕니다 */}
        <section>
          <h2 className={sectionTitle}>{t.rights.actionsHeading}</h2>
          <ol className="mt-5 divide-y divide-[var(--color-line)] rounded-[var(--radius-card)] border-2 border-navy-900 bg-white">
            {body.actions.map((item, index) => (
              <li key={item.title} className="flex gap-4 p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-[15px] font-bold text-white">
                  {index + 1}
                  <span className="sr-only">.</span>
                </span>{' '}
                <div className="min-w-0 pt-1">
                  <h3 className="text-base font-bold text-ink-900">{item.title}</h3>{' '}
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {body.note && <Notice tone="warn" title={t.rights.noteHeading} body={body.note} />}

        {/* 이 정보를 바탕으로 만든 체크리스트 */}
        {checklists.length > 0 && (
          <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink-900">
              <Icon name="check" size={20} className="text-brand-600" /> {t.checklist.relatedTitle}
            </h2>
            <ul className="mt-3 space-y-2">
              {checklists.map((checklist) => (
                <li key={checklist.id}>
                  <Link
                    href={`/${locale}/checklists/${checklist.id}`}
                    className="lr-link inline-flex items-center gap-1.5 text-[15px] font-semibold"
                  >
                    {(checklist.i18n[locale] ?? checklist.i18n.ko).title} <Icon name="arrow-right" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ④ 이것도 궁금하실 수 있어요: 등록된 관련 권리정보만 */}
        {related.length > 0 && (
          <section>
            <h2 className={sectionTitle}>{t.rights.relatedHeading}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.id}>
                  <ArticleCard article={item} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ⑤ 도움받을 수 있는 곳 + 전화하기 전 도움말 */}
        {orgs.length > 0 && (
          <section>
            <h2 className={sectionTitle}>{t.rights.orgsHeading}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {orgs.map((org) => (
                <li key={org.id}>
                  <OrgCard org={org} locale={locale} />
                </li>
              ))}
            </ul>
            <Link
              href={`/${locale}/organizations`}
              className="lr-link mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold"
            >
              <Icon name="map-pin" size={16} /> {t.orgFinder.title}
            </Link>
            {/* 말하기 쉬운 분야 이름만 씁니다 (예: "일·알바 / 근로권" → "일·알바") */}
            <CallScript
              t={t}
              topic={category ? pick(category.name, locale).split(' / ')[0] : undefined}
              className="mt-4"
            />
          </section>
        )}

        {/* 출처: 발행기관 · 제목(공식 링크) · 검토일 */}
        {sources.length > 0 && (
          <section id="sources" className="scroll-mt-24 border-t border-[var(--color-line)] pt-8">
            <h2 className="text-lg font-extrabold text-ink-900 sm:text-xl">{t.rights.sourcesHeading}</h2>
            <ul className="mt-4 space-y-3">
              {sources.map((source) => (
                <li key={source.url} className="text-[15px] leading-relaxed text-ink-700">
                  {source.publisher && <span className="font-bold text-ink-900">{source.publisher}</span>}{' '}
                  {source.publisher && <span className="text-ink-300">·</span>}{' '}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${source.title} (${t.common.openInNew})`}
                    className="underline underline-offset-2 hover:text-brand-700"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[15px] font-semibold text-ink-700">
              {article.created_at && (
                <span>
                  {t.common.createdAt} {formatDate(article.created_at, locale)}
                </span>
              )}
              <span>
                {t.common.reviewedAt} {formatDate(article.reviewed_at, locale)}
              </span>
            </p>
          </section>
        )}

        {/* 이 정보가 도움이 되었나요? — 눌러주신 것만 익명으로 세어 봅니다. */}
        <div className="border-t border-[var(--color-line)] pt-6">
          <Helpful locale={locale} kind="article" id={article.id} topic={article.id} />
        </div>

        {/* 정보 수정 제안: 틀리거나 오래된 정보를 알려주는 창구 (이메일) */}
        <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-surface-soft p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink-900">{t.rightsMeta.feedbackTitle}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{t.rightsMeta.feedbackBody}</p>
          <a href={feedbackHref} className="lr-btn lr-btn-ghost lr-btn-sm lr-press mt-3">
            {t.rightsMeta.feedbackCta}
          </a>
        </section>

        {/* 내 상황 물어보기 */}
        <div className="lr-panel border-brand-100 bg-brand-50 p-6 sm:p-8">
          <p className="text-base font-semibold leading-relaxed text-brand-900">{t.ask.subtitle}</p>
          <Link href={`/${locale}/ask`} className="lr-btn lr-btn-primary lr-press mt-4">
            {t.home.ctaAsk} <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
